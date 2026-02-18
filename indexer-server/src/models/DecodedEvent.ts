/**
 * Decoded event output structure
 * Represents a fully decoded and enriched blockchain event
 */
export interface DecodedEvent {
    /** Name of the emitted event (e.g. "CampaignCreated") */
    eventName: string;

    /** Contract address that emitted the event */
    contractAddress: string;

    /** Decoded event arguments with BigInt values converted to strings */
    args: Record<string, string>;

    /** Block number where the event was emitted */
    blockNumber: number;

    /** Hash of the block containing the event */
    blockHash: string;

    /** Transaction hash that produced the event */
    transactionHash: string;

    /** Log index within the block */
    logIndex: number;

    /** Unix timestamp of the block */
    timestamp: number;

    /** Number of confirmations at the time of processing */
    confirmations: number;
}

/**
 * Checkpoint state persisted to data/state.json
 * Tracks sync progress for crash recovery
 */
export interface CheckpointState {
    /** Last fully processed block number */
    lastProcessedBlock: number;

    /** Hash of the last processed block (used for reorg detection) */
    lastProcessedBlockHash: string;

    /** ISO 8601 timestamp of the last checkpoint update */
    lastUpdatedAt: string;

    /** Running total of events processed since genesis */
    totalEventsProcessed: number;

    /** Block numbers that failed to fetch after all retries */
    missingBlocks?: number[];
}

/**
 * Indexer runtime status
 * Returned by listener.getStatus()
 */
export interface IndexerStatus {
    /** Current operating mode */
    mode: 'catch-up' | 'live' | 'idle' | 'stopped';

    /** Current WebSocket connection state */
    connected: boolean;

    /** Last processed block number */
    lastBlock: number;

    /** Total events processed */
    totalEvents: number;

    /** Server uptime in seconds */
    uptimeSeconds: number;

    /** Number of reconnection attempts */
    reconnectAttempts: number;
}
