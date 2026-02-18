import { ethers, Log, LogDescription, Interface } from 'ethers';
import { DecodedEvent } from '../models/DecodedEvent.js';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

/**
 * EventDecoderService — ABI-based log parsing.
 *
 * Uses ethers.js v6 Interface to decode raw logs into structured DecodedEvent objects.
 * Converts all BigInt values to strings for JSON serialization safety.
 */
export class EventDecoderService {
    private iface: Interface;

    constructor(abi: ethers.InterfaceAbi) {
        this.iface = new Interface(abi);
        logger.info('EventDecoderService initialized', {
            eventCount: this.iface.fragments.filter((f) => f.type === 'event').length,
        });
    }

    /**
     * Get the contract Interface (used by listener for topic filtering).
     */
    getInterface(): Interface {
        return this.iface;
    }

    /**
     * Decode a single raw log into a DecodedEvent.
     *
     * @param log - Raw log from provider.getLogs()
     * @param blockTimestamp - Unix timestamp of the block
     * @param confirmations - Number of confirmations at processing time
     * @returns DecodedEvent or null if decoding fails
     */
    decodeLog(log: Log, blockTimestamp: number, confirmations: number): DecodedEvent | null {
        try {
            const parsed: LogDescription | null = this.iface.parseLog({
                topics: log.topics as string[],
                data: log.data,
            });

            if (!parsed) {
                logger.warn('Could not parse log — unknown event signature', {
                    address: log.address,
                    topics: log.topics,
                    txHash: log.transactionHash,
                });
                return null;
            }

            // Convert args: BigInt → string, preserve all other types as string
            const args: Record<string, string> = {};
            for (const [key, value] of Object.entries(parsed.args.toObject())) {
                if (typeof key === 'string' && isNaN(Number(key))) {
                    args[key] = typeof value === 'bigint' ? value.toString() : String(value);
                }
            }

            const decoded: DecodedEvent = {
                eventName: parsed.name,
                contractAddress: log.address,
                args,
                blockNumber: log.blockNumber,
                blockHash: log.blockHash,
                transactionHash: log.transactionHash,
                logIndex: log.index,
                timestamp: blockTimestamp,
                confirmations,
            };

            logger.debug('Decoded event', {
                eventName: decoded.eventName,
                block: decoded.blockNumber,
                txHash: decoded.transactionHash.slice(0, 10) + '...',
            });

            return decoded;
        } catch (err) {
            logger.warn('Failed to decode log', {
                error: err instanceof Error ? err.message : String(err),
                address: log.address,
                topics: log.topics,
                data: log.data.slice(0, 66) + '...',
                txHash: log.transactionHash,
            });
            return null;
        }
    }

    /**
     * Decode a batch of raw logs.
     *
     * @param logs - Array of raw logs
     * @param blockTimestamp - Unix timestamp of the block
     * @param confirmations - Number of confirmations at processing time
     * @returns Array of successfully decoded events (nulls filtered out)
     */
    decodeBatch(logs: Log[], blockTimestamp: number, confirmations: number): DecodedEvent[] {
        const decoded: DecodedEvent[] = [];
        for (const log of logs) {
            const event = this.decodeLog(log, blockTimestamp, confirmations);
            if (event) {
                decoded.push(event);
            }
        }
        return decoded;
    }
}
