import fs from 'node:fs';
import path from 'node:path';
import { ethers, Log, Block } from 'ethers';
import { config } from './config/env.js';
import { logger } from './utils/logger.js';
import { ProviderService } from './services/ProviderService.js';
import { EventDecoderService } from './services/EventDecoderService.js';
import { CheckpointService } from './services/CheckpointService.js';
import { DispatchService } from './services/DispatchService.js';
import { IndexerStatus, DecodedEvent } from './models/DecodedEvent.js';

// ─── Load ABI ─────────────────────────────────────────────────────────────────
const ABI_PATH = path.resolve('abis', 'CrowdfundingPlatform.json');
const abi = JSON.parse(fs.readFileSync(ABI_PATH, 'utf-8'));

// ─── Instantiate Services ────────────────────────────────────────────────────
const providerService = new ProviderService();
const decoder = new EventDecoderService(abi);
const checkpoint = new CheckpointService();
const dispatch = new DispatchService();

// ─── State ───────────────────────────────────────────────────────────────────
let mode: IndexerStatus['mode'] = 'idle';
let startTime = Date.now();
let isShuttingDown = false;

/**
 * Buffer for unconfirmed blocks in live mode.
 * Key = block number, Value = block hash.
 * Blocks are promoted (processed) once they reach CONFIRMATION_DEPTH.
 */
const pendingBlocks = new Map<number, string>();

// ─── Rate Limiter ────────────────────────────────────────────────────────────
let rpcCallsInWindow = 0;
let windowStart = Date.now();

async function rateLimitedCall<T>(fn: () => Promise<T>): Promise<T> {
    const now = Date.now();
    if (now - windowStart >= 1000) {
        windowStart = now;
        rpcCallsInWindow = 0;
    }

    if (rpcCallsInWindow >= config.MAX_RPS) {
        const waitTime = 1000 - (now - windowStart);
        if (waitTime > 0) {
            await sleep(waitTime);
        }
        windowStart = Date.now();
        rpcCallsInWindow = 0;
    }

    rpcCallsInWindow++;
    return fn();
}

// ─── RPC Error Handling ──────────────────────────────────────────────────────
async function retryRpcCall<T>(
    fn: () => Promise<T>,
    retries = 3,
    context = 'RPC call'
): Promise<T> {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            return await rateLimitedCall(fn);
        } catch (err: unknown) {
            const errMsg = err instanceof Error ? err.message : String(err);
            const errCode = (err as { code?: string | number }).code;

            // Handle 429 Too Many Requests
            if (errMsg.includes('429') || errCode === 429) {
                logger.warn('Rate limited by RPC (429), backing off 60s', { context, attempt });
                await sleep(60_000);
                continue;
            }

            // Handle -32000 Server Error (reduce block range)
            if (errCode === -32000 || errMsg.includes('-32000')) {
                logger.warn('Server error (-32000), retrying with backoff', { context, attempt });
                await sleep(attempt * 2000);
                continue;
            }

            // Handle ECONNRESET
            if (errMsg.includes('ECONNRESET')) {
                logger.warn('ECONNRESET — treating as disconnect', { context, attempt });
                throw err; // Let ProviderService handle reconnection
            }

            if (attempt === retries) {
                logger.error(`${context} failed after ${retries} retries`, { error: errMsg });
                throw err;
            }

            logger.warn(`${context} failed, retrying...`, { attempt, retries, error: errMsg });
            await sleep(attempt * 1000);
        }
    }

    throw new Error(`${context} unreachable`);
}

// ─── Block Processing ────────────────────────────────────────────────────────

/**
 * Fetch and process events for a range of blocks.
 * Used during catch-up sync.
 */
async function processBlockRange(fromBlock: number, toBlock: number): Promise<number> {
    const provider = providerService.getProvider();
    let totalEvents = 0;

    // Fetch logs for the entire range
    const logs = await retryRpcCall(
        () =>
            provider.getLogs({
                address: config.CONTRACT_ADDRESS,
                fromBlock,
                toBlock,
            }),
        3,
        `getLogs(${fromBlock}-${toBlock})`
    );

    if (logs.length === 0) {
        // Still need to checkpoint the last block in range
        const block = await retryRpcCall(
            () => provider.getBlock(toBlock),
            3,
            `getBlock(${toBlock})`
        );

        if (block) {
            await checkpoint.updateCheckpoint(toBlock, block.hash!, 0);
        }
        return 0;
    }

    // Group logs by block number
    const logsByBlock = new Map<number, Log[]>();
    for (const log of logs) {
        const blockNum = log.blockNumber;
        if (!logsByBlock.has(blockNum)) {
            logsByBlock.set(blockNum, []);
        }
        logsByBlock.get(blockNum)!.push(log);
    }

    // Process each block's logs
    const blockNumbers = Array.from(logsByBlock.keys()).sort((a, b) => a - b);

    for (const blockNum of blockNumbers) {
        const blockLogs = logsByBlock.get(blockNum)!;

        // Fetch block for timestamp
        let block: Block | null = null;
        try {
            block = await retryRpcCall(
                () => provider.getBlock(blockNum),
                3,
                `getBlock(${blockNum})`
            );
        } catch {
            logger.warn('Failed to fetch block, marking as missing', { blockNum });
            await checkpoint.markMissingBlock(blockNum);
            continue;
        }

        if (!block) {
            await checkpoint.markMissingBlock(blockNum);
            continue;
        }

        const currentBlock = await rateLimitedCall(() => provider.getBlockNumber());
        const confirmations = currentBlock - blockNum;

        const events = decoder.decodeBatch(blockLogs, block.timestamp, confirmations);
        dispatch.dispatchBatch(events);
        totalEvents += events.length;

        await checkpoint.updateCheckpoint(blockNum, block.hash!, events.length);
    }

    // Checkpoint the end of range even if last blocks had no events
    const lastCheckpointed = checkpoint.getLastBlock();
    if (lastCheckpointed < toBlock) {
        const endBlock = await retryRpcCall(
            () => provider.getBlock(toBlock),
            3,
            `getBlock(${toBlock})`
        );
        if (endBlock) {
            await checkpoint.updateCheckpoint(toBlock, endBlock.hash!, 0);
        }
    }

    return totalEvents;
}

// ─── Reorg Detection ─────────────────────────────────────────────────────────

/**
 * Detect chain reorganization by comparing parent hashes.
 * Returns true if reorg is detected and checkpoint was rolled back.
 */
async function detectAndHandleReorg(currentBlockNumber: number): Promise<boolean> {
    const lastHash = checkpoint.getLastBlockHash();
    const lastBlock = checkpoint.getLastBlock();

    if (lastHash === null || lastHash === '' || lastBlock < 0) {
        return false; // No checkpoint to validate against
    }

    try {
        const provider = providerService.getProvider();
        const nextBlock = await retryRpcCall(
            () => provider.getBlock(lastBlock + 1),
            3,
            `getBlock(${lastBlock + 1}) for reorg check`
        );

        if (nextBlock && nextBlock.parentHash !== lastHash) {
            const safeBlock = Math.max(0, currentBlockNumber - config.REORG_SAFE_DEPTH);

            logger.warn('Chain reorganization detected!', {
                expectedParentHash: lastHash.slice(0, 10) + '...',
                actualParentHash: nextBlock.parentHash.slice(0, 10) + '...',
                lastProcessedBlock: lastBlock,
                rollingBackTo: safeBlock,
            });

            await checkpoint.rollbackToBlock(safeBlock);
            return true;
        }
    } catch (err) {
        logger.warn('Reorg check failed, continuing', {
            error: err instanceof Error ? err.message : String(err),
        });
    }

    return false;
}

// ─── Catch-Up Sync ───────────────────────────────────────────────────────────

/**
 * Historical sync: fetch events in batches from last checkpoint to
 * (currentBlock - CONFIRMATION_DEPTH).
 */
async function catchUpSync(): Promise<void> {
    mode = 'catch-up';
    const provider = providerService.getProvider();
    const currentBlock = await retryRpcCall(
        () => provider.getBlockNumber(),
        3,
        'getBlockNumber()'
    );

    const safeBlock = currentBlock - config.CONFIRMATION_DEPTH;

    // Determine start block
    let startBlock: number;
    const lastBlock = checkpoint.getLastBlock();

    if (lastBlock >= 0) {
        startBlock = lastBlock + 1;
    } else {
        startBlock = Math.max(0, currentBlock - config.SYNC_START_OFFSET);
    }

    if (startBlock > safeBlock) {
        logger.info('Already caught up, switching to live mode', {
            lastBlock,
            safeBlock,
        });
        return;
    }

    // Check for reorgs before syncing
    const reorgDetected = await detectAndHandleReorg(currentBlock);
    if (reorgDetected) {
        startBlock = checkpoint.getLastBlock() + 1;
    }

    const totalBlocks = safeBlock - startBlock + 1;
    logger.info('Starting catch-up sync', {
        fromBlock: startBlock,
        toBlock: safeBlock,
        totalBlocks,
        batchSize: config.BATCH_SIZE,
    });

    let totalEvents = 0;
    let processedBlocks = 0;

    for (let from = startBlock; from <= safeBlock; from += config.BATCH_SIZE) {
        if (isShuttingDown) break;

        const to = Math.min(from + config.BATCH_SIZE - 1, safeBlock);
        const batchEvents = await processBlockRange(from, to);
        totalEvents += batchEvents;
        processedBlocks += to - from + 1;

        const progress = ((processedBlocks / totalBlocks) * 100).toFixed(1);
        logger.info('Catch-up progress', {
            progress: `${progress}%`,
            processedBlocks,
            totalBlocks,
            eventsInBatch: batchEvents,
            totalEvents,
            currentRange: `${from}-${to}`,
        });
    }

    logger.info('Catch-up sync complete', {
        totalBlocks: processedBlocks,
        totalEvents,
    });
}

// ─── Live Mode ───────────────────────────────────────────────────────────────

/**
 * Real-time listening: subscribe to new blocks, process after CONFIRMATION_DEPTH.
 */
async function startLiveMode(): Promise<void> {
    mode = 'live';
    const provider = providerService.getProvider();

    logger.info('Switching to live mode', {
        confirmationDepth: config.CONFIRMATION_DEPTH,
    });

    provider.on('block', async (blockNumber: number) => {
        if (isShuttingDown) return;

        try {
            // Buffer the new block
            const block = await retryRpcCall(
                () => provider.getBlock(blockNumber),
                3,
                `getBlock(${blockNumber})`
            );

            if (block) {
                pendingBlocks.set(blockNumber, block.hash!);
            }

            // Process any blocks that now have enough confirmations
            const confirmedBlockNumber = blockNumber - config.CONFIRMATION_DEPTH;

            if (confirmedBlockNumber <= checkpoint.getLastBlock()) {
                return; // Already processed
            }

            // Check for reorgs on confirmed block
            await detectAndHandleReorg(blockNumber);

            // Process from last checkpoint to confirmed block
            const startFrom = checkpoint.getLastBlock() + 1;
            if (startFrom <= confirmedBlockNumber) {
                const events = await processBlockRange(startFrom, confirmedBlockNumber);

                if (events > 0) {
                    logger.info('Live: processed confirmed block(s)', {
                        range: `${startFrom}-${confirmedBlockNumber}`,
                        events,
                    });
                }
            }

            // Clean up old pending blocks
            for (const [num] of pendingBlocks) {
                if (num <= confirmedBlockNumber) {
                    pendingBlocks.delete(num);
                }
            }

            logger.debug('Live: new block', {
                head: blockNumber,
                confirmed: confirmedBlockNumber,
                pending: pendingBlocks.size,
            });
        } catch (err) {
            logger.error('Error processing block in live mode', {
                blockNumber,
                error: err instanceof Error ? err.message : String(err),
            });
        }
    });
}

// ─── Status ──────────────────────────────────────────────────────────────────

/**
 * Get the current runtime status of the indexer.
 */
export function getStatus(): IndexerStatus {
    const state = checkpoint.getState();
    return {
        mode,
        connected: providerService.connected,
        lastBlock: state?.lastProcessedBlock ?? -1,
        totalEvents: state?.totalEventsProcessed ?? 0,
        uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
        reconnectAttempts: providerService.attempts,
    };
}

// ─── Graceful Shutdown ───────────────────────────────────────────────────────

async function shutdown(signal: string): Promise<void> {
    if (isShuttingDown) return;
    isShuttingDown = true;

    logger.info(`Received ${signal}, shutting down gracefully...`);

    // Flush any buffered events
    dispatch.flush();

    // Disconnect provider
    await providerService.disconnect();

    const status = getStatus();
    logger.info('Indexer stopped', {
        totalEvents: status.totalEvents,
        lastBlock: status.lastBlock,
        uptimeSeconds: status.uptimeSeconds,
    });

    process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Handle uncaught errors
process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception', { error: err.message, stack: err.stack });
    shutdown('uncaughtException');
});

process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled rejection', { reason: String(reason) });
});

// ─── Main Entry Point ────────────────────────────────────────────────────────

async function main(): Promise<void> {
    startTime = Date.now();

    logger.info('═══════════════════════════════════════════════');
    logger.info('  CrowdfundingPlatform Event Indexer (PoC)');
    logger.info('═══════════════════════════════════════════════');
    logger.info('Configuration', {
        contract: config.CONTRACT_ADDRESS,
        chainId: config.CHAIN_ID,
        confirmationDepth: config.CONFIRMATION_DEPTH,
        batchSize: config.BATCH_SIZE,
        syncStartOffset: config.SYNC_START_OFFSET,
        logLevel: config.LOG_LEVEL,
    });

    // Connect to Sepolia
    await providerService.connect();

    // Register reconnect handler
    providerService.onReconnect(async () => {
        logger.info('Reconnected — resuming sync...');
        try {
            await catchUpSync();
            await startLiveMode();
        } catch (err) {
            logger.error('Failed to resume after reconnect', {
                error: err instanceof Error ? err.message : String(err),
            });
        }
    });

    // Run catch-up sync, then switch to live mode
    await catchUpSync();

    if (!isShuttingDown) {
        await startLiveMode();
    }

    logger.info('Indexer is running. Press Ctrl+C to stop.');
}

main().catch((err) => {
    logger.error('Fatal error during startup', {
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
    });
    process.exit(1);
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
