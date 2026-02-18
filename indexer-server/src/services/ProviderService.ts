import { WebSocketProvider } from 'ethers';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

/**
 * ProviderService — WebSocket connection management with auto-reconnect.
 *
 * Features:
 *   - Exponential backoff reconnection (1s, 2s, 4s, 8s, 16s)
 *   - Max 5 reconnection attempts before process exit
 *   - Connection state change logging
 *   - Event emitter pattern for reconnect hooks
 */
export class ProviderService {
    private provider: WebSocketProvider | null = null;
    private reconnectAttempts = 0;
    private isReconnecting = false;
    private isShuttingDown = false;
    private onReconnectCallback: (() => Promise<void>) | null = null;

    get connected(): boolean {
        return this.provider !== null && !this.isReconnecting;
    }

    get attempts(): number {
        return this.reconnectAttempts;
    }

    /**
     * Register a callback to be invoked after a successful reconnection.
     * The listener uses this to re-attach block listeners and resume sync.
     */
    onReconnect(callback: () => Promise<void>): void {
        this.onReconnectCallback = callback;
    }

    /**
     * Establish initial WebSocket connection to Infura.
     * @returns The connected WebSocketProvider
     */
    async connect(): Promise<WebSocketProvider> {
        logger.info('Connecting to Sepolia via Infura WebSocket...', { url: maskUrl(config.WS_URL) });

        this.provider = await this.createProvider();
        this.reconnectAttempts = 0;

        logger.info('WebSocket connected', {
            chainId: config.CHAIN_ID,
            url: maskUrl(config.WS_URL),
        });

        return this.provider;
    }

    /**
     * Get the current provider instance.
     * Throws if not connected.
     */
    getProvider(): WebSocketProvider {
        if (!this.provider) {
            throw new Error('Provider not connected. Call connect() first.');
        }
        return this.provider;
    }

    /**
     * Gracefully disconnect the WebSocket.
     */
    async disconnect(): Promise<void> {
        this.isShuttingDown = true;
        if (this.provider) {
            logger.info('Disconnecting WebSocket provider...');
            await this.provider.destroy();
            this.provider = null;
            logger.info('WebSocket disconnected');
        }
    }

    /**
     * Create a new WebSocketProvider and attach error/close handlers.
     */
    private async createProvider(): Promise<WebSocketProvider> {
        const provider = new WebSocketProvider(config.WS_URL, config.CHAIN_ID);

        // Wait for first successful network call to confirm connection
        await provider.getBlockNumber();

        // Monitor the underlying WebSocket for errors and close events
        const ws = provider.websocket as unknown as import('events').EventEmitter;

        ws.on('error', (err: Error) => {
            logger.error('WebSocket error', {
                message: err?.message ?? 'Unknown WebSocket error',
            });
            this.handleDisconnect();
        });

        ws.on('close', (code?: number, reason?: string) => {
            logger.warn('WebSocket closed', {
                code: code ?? 'unknown',
                reason: reason ?? 'unknown',
            });
            this.handleDisconnect();
        });

        return provider;
    }

    /**
     * Handle WebSocket disconnect with exponential backoff reconnection.
     */
    private async handleDisconnect(): Promise<void> {
        if (this.isShuttingDown || this.isReconnecting) return;

        this.isReconnecting = true;

        while (this.reconnectAttempts < config.MAX_RECONNECT_ATTEMPTS) {
            this.reconnectAttempts++;
            const delay = Math.pow(2, this.reconnectAttempts - 1) * 1000; // 1s, 2s, 4s, 8s, 16s

            logger.info('Attempting reconnection...', {
                attempt: this.reconnectAttempts,
                maxAttempts: config.MAX_RECONNECT_ATTEMPTS,
                delayMs: delay,
            });

            await sleep(delay);

            try {
                // Destroy old provider
                if (this.provider) {
                    try {
                        await this.provider.destroy();
                    } catch {
                        // Ignore destruction errors on broken socket
                    }
                }

                this.provider = await this.createProvider();
                this.reconnectAttempts = 0;
                this.isReconnecting = false;

                logger.info('Reconnected successfully');

                // Invoke reconnect callback so listener can resume
                if (this.onReconnectCallback) {
                    await this.onReconnectCallback();
                }

                return;
            } catch (err) {
                logger.error('Reconnection attempt failed', {
                    attempt: this.reconnectAttempts,
                    error: err instanceof Error ? err.message : String(err),
                });
            }
        }

        // Exhausted all retries
        logger.error('Max reconnection attempts reached. Exiting process.', {
            attempts: this.reconnectAttempts,
        });
        process.exit(1);
    }
}

/** Mask the Infura API key in logs */
function maskUrl(url: string): string {
    return url.replace(/\/v3\/(.{4}).*/, '/v3/$1****');
}

/** Promise-based sleep */
function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
