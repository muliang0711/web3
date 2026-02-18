import { DecodedEvent } from '../models/DecodedEvent.js';
import { logger } from '../utils/logger.js';

/**
 * DispatchService — Event output handler.
 *
 * Current implementation: logs decoded events as formatted JSON to stdout.
 * Rate-limits high-throughput bursts by batching events.
 *
 * // TODO: Replace with Kafka producer in Phase 2
 * // In Phase 2, this class will be refactored to:
 * //   1. Initialize a KafkaJS producer
 * //   2. Serialize DecodedEvent to Avro/JSON
 * //   3. Produce to topic: "crowdfunding.events.{eventName}"
 * //   4. Handle producer errors with DLQ (Dead Letter Queue)
 */
export class DispatchService {
    private eventBuffer: DecodedEvent[] = [];
    private lastFlushTime: number = Date.now();
    private eventCountInWindow: number = 0;
    private windowStart: number = Date.now();

    /** Maximum events per second before batching kicks in */
    private readonly RATE_LIMIT = 100;

    /** Batch size when rate limit is exceeded */
    private readonly BATCH_SIZE = 50;

    /**
     * Dispatch a single decoded event.
     *
     * If the event rate exceeds 100/sec, events are buffered
     * and flushed in batches of 50.
     *
     * @param event - The decoded event to dispatch
     */
    dispatch(event: DecodedEvent): void {
        const now = Date.now();

        // Reset window every second
        if (now - this.windowStart >= 1000) {
            this.windowStart = now;
            this.eventCountInWindow = 0;
        }

        this.eventCountInWindow++;

        if (this.eventCountInWindow > this.RATE_LIMIT) {
            // Buffer mode: accumulate and flush in batches
            this.eventBuffer.push(event);

            if (this.eventBuffer.length >= this.BATCH_SIZE) {
                this.flushBuffer();
            }
        } else {
            // Normal mode: log immediately
            console.log(JSON.stringify(event, null, 2));
        }
    }

    /**
     * Dispatch multiple events at once.
     */
    dispatchBatch(events: DecodedEvent[]): void {
        for (const event of events) {
            this.dispatch(event);
        }
    }

    /**
     * Flush any remaining buffered events.
     * Should be called on graceful shutdown.
     */
    flush(): void {
        if (this.eventBuffer.length > 0) {
            this.flushBuffer();
        }
    }

    private flushBuffer(): void {
        if (this.eventBuffer.length === 0) return;

        logger.info('Flushing event buffer (rate limit active)', {
            batchSize: this.eventBuffer.length,
        });

        console.log(JSON.stringify(this.eventBuffer, null, 2));
        this.eventBuffer = [];
        this.lastFlushTime = Date.now();
    }
}
