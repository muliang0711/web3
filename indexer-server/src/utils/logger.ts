import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { config } from '../config/env.js';

/**
 * Winston logger configuration
 *
 * Transports:
 *   - Console: colorized for development
 *   - logs/combined.log: all levels, rotated daily, 7-day retention
 *   - logs/error.log: errors only, rotated daily, 7-day retention
 *
 * Format: JSON with timestamp, level, message, and metadata
 */

const jsonFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
);

const consoleFormat = winston.format.combine(
    winston.format.timestamp({ format: 'HH:mm:ss' }),
    winston.format.colorize(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
        return `${timestamp} ${level}: ${message}${metaStr}`;
    })
);

const combinedRotateTransport = new DailyRotateFile({
    dirname: 'logs',
    filename: 'combined-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    maxFiles: '7d',
    level: config.LOG_LEVEL,
    format: jsonFormat,
});

const errorRotateTransport = new DailyRotateFile({
    dirname: 'logs',
    filename: 'error-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    maxFiles: '7d',
    level: 'error',
    format: jsonFormat,
});

export const logger = winston.createLogger({
    level: config.LOG_LEVEL,
    defaultMeta: { service: 'indexer-poc' },
    transports: [
        new winston.transports.Console({ format: consoleFormat }),
        combinedRotateTransport,
        errorRotateTransport,
    ],
});
