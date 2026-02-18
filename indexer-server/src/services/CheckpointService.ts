import fs from 'node:fs';
import path from 'node:path';
import { CheckpointState } from '../models/DecodedEvent.js';
import { logger } from '../utils/logger.js';

const DATA_DIR = path.resolve('data');
const STATE_FILE = path.join(DATA_DIR, 'state.json');
const STATE_TEMP = path.join(DATA_DIR, 'state.json.tmp');

/**
 * CheckpointService — file-based persistence for sync progress.
 *
 * Writes to data/state.json with atomic rename to prevent corruption.
 * Supports rollback for chain reorganization handling.
 */
export class CheckpointService {
    private state: CheckpointState | null = null;

    constructor() {
        this.ensureDataDir();
        this.load();
    }

    /** Ensure data/ directory exists */
    private ensureDataDir(): void {
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
            logger.info('Created data directory', { path: DATA_DIR });
        }
    }

    /** Load checkpoint from disk */
    private load(): void {
        try {
            if (fs.existsSync(STATE_FILE)) {
                const raw = fs.readFileSync(STATE_FILE, 'utf-8');
                this.state = JSON.parse(raw) as CheckpointState;
                logger.info('Loaded checkpoint from disk', {
                    lastProcessedBlock: this.state.lastProcessedBlock,
                    totalEventsProcessed: this.state.totalEventsProcessed,
                });
            } else {
                logger.info('No checkpoint file found, will start fresh');
            }
        } catch (err) {
            logger.error('Failed to load checkpoint file, starting fresh', { error: err });
            this.state = null;
        }
    }

    /**
     * Get the last fully processed block number.
     * Returns -1 if no checkpoint exists.
     */
    getLastBlock(): number {
        return this.state?.lastProcessedBlock ?? -1;
    }

    /**
     * Get the hash of the last processed block.
     * Used for reorg detection.
     */
    getLastBlockHash(): string | null {
        return this.state?.lastProcessedBlockHash ?? null;
    }

    /**
     * Get the full checkpoint state (or null if none).
     */
    getState(): CheckpointState | null {
        return this.state ? { ...this.state } : null;
    }

    /**
     * Update checkpoint after processing a block.
     * Uses atomic write (temp file + rename) to prevent corruption.
     *
     * @param block - Block number that was just processed
     * @param hash - Block hash for reorg detection
     * @param eventCount - Number of events decoded in this block
     */
    async updateCheckpoint(block: number, hash: string, eventCount: number): Promise<void> {
        const previousTotal = this.state?.totalEventsProcessed ?? 0;

        this.state = {
            lastProcessedBlock: block,
            lastProcessedBlockHash: hash,
            lastUpdatedAt: new Date().toISOString(),
            totalEventsProcessed: previousTotal + eventCount,
            missingBlocks: this.state?.missingBlocks,
        };

        await this.writeToDisk();

        logger.debug('Checkpoint updated', {
            block,
            hash: hash.slice(0, 10) + '...',
            totalEvents: this.state.totalEventsProcessed,
        });
    }

    /**
     * Rollback checkpoint to a specific block.
     * Used when chain reorganization is detected.
     *
     * @param block - Target block number to rollback to
     */
    async rollbackToBlock(block: number): Promise<void> {
        if (this.state) {
            logger.warn('Rolling back checkpoint', {
                from: this.state.lastProcessedBlock,
                to: block,
            });

            this.state.lastProcessedBlock = block;
            this.state.lastProcessedBlockHash = '';   // Will be re-validated on next sync
            this.state.lastUpdatedAt = new Date().toISOString();

            await this.writeToDisk();
        }
    }

    /**
     * Mark a block as missing (failed to fetch after all retries).
     */
    async markMissingBlock(block: number): Promise<void> {
        if (!this.state) return;
        if (!this.state.missingBlocks) {
            this.state.missingBlocks = [];
        }
        if (!this.state.missingBlocks.includes(block)) {
            this.state.missingBlocks.push(block);
            await this.writeToDisk();
            logger.warn('Marked block as missing', { block });
        }
    }

    /** Atomic write: write to temp file, then rename */
    private async writeToDisk(): Promise<void> {
        const json = JSON.stringify(this.state, null, 2);
        fs.writeFileSync(STATE_TEMP, json, 'utf-8');
        fs.renameSync(STATE_TEMP, STATE_FILE);
    }
}
