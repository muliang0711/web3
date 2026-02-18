import dotenv from 'dotenv';

dotenv.config();

/**
 * Environment variable validation and defaults.
 * Throws on missing required variables at startup.
 */

function requireEnv(name: string): string {
    const value = process.env[name];
    if (!value || value.trim() === '') {
        throw new Error(
            `Missing required environment variable: ${name}. ` +
            `Copy .env.example to .env and fill in the values.`
        );
    }
    return value.trim();
}

function optionalEnv(name: string, defaultValue: string): string {
    const value = process.env[name];
    return value && value.trim() !== '' ? value.trim() : defaultValue;
}

function optionalInt(name: string, defaultValue: number): number {
    const raw = process.env[name];
    if (!raw || raw.trim() === '') return defaultValue;
    const parsed = parseInt(raw.trim(), 10);
    if (isNaN(parsed)) {
        throw new Error(`Environment variable ${name} must be a number, got: "${raw}"`);
    }
    return parsed;
}

export const config = {
    /** Infura project ID for WebSocket endpoint */
    INFURA_PROJECT_ID: requireEnv('INFURA_PROJECT_ID'),

    /** Deployed contract address on Sepolia */
    CONTRACT_ADDRESS: requireEnv('CONTRACT_ADDRESS'),

    /** Number of block confirmations before processing (default: 12) */
    CONFIRMATION_DEPTH: optionalInt('CONFIRMATION_DEPTH', 12),

    /** Number of blocks per batch during catch-up sync (default: 100) */
    BATCH_SIZE: optionalInt('BATCH_SIZE', 100),

    /** How many blocks behind current to start syncing when no checkpoint exists (default: 1000) */
    SYNC_START_OFFSET: optionalInt('SYNC_START_OFFSET', 1000),

    /** Winston log level (default: "info") */
    LOG_LEVEL: optionalEnv('LOG_LEVEL', 'info'),

    /** Computed WebSocket URL */
    get WS_URL(): string {
        return `wss://sepolia.infura.io/ws/v3/${this.INFURA_PROJECT_ID}`;
    },

    /** Sepolia chain ID */
    CHAIN_ID: 11155111,

    /** Max RPC requests per second (Infura free tier) */
    MAX_RPS: 10,

    /** Max reconnection attempts */
    MAX_RECONNECT_ATTEMPTS: 5,

    /** Reorg safe depth — rollback target during detected reorgs */
    REORG_SAFE_DEPTH: 50,
} as const;

export type Config = typeof config;
