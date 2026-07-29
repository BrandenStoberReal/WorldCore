/**
 * Structured logging for WorldCore backend.
 *
 * Usage:
 *   import { log } from './logger';
 *   log.info('boot', 'Database migrations completed');
 *   log.error('ext', 'Failed to install extension', err);
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_ORDER: LogLevel[] = ['debug', 'info', 'warn', 'error'];

const MIN_LEVEL: LogLevel = (process.env.LOG_LEVEL as LogLevel) ?? 'info';

function shouldLog(level: LogLevel): boolean {
  return LEVEL_ORDER.indexOf(level) >= LEVEL_ORDER.indexOf(MIN_LEVEL);
}

function formatTimestamp(): string {
  return new Date().toISOString();
}

function formatMessage(level: LogLevel, context: string, message: string): string {
  const ts = formatTimestamp();
  const tag = context ? `[${context}]` : '';
  return `${ts} ${level.toUpperCase().padEnd(5)} ${tag} ${message}`;
}

export const log = {
  debug(context: string, message: string, ...args: unknown[]): void {
    if (shouldLog('debug')) {
      console.debug(formatMessage('debug', context, message), ...args);
    }
  },

  info(context: string, message: string, ...args: unknown[]): void {
    if (shouldLog('info')) {
      console.log(formatMessage('info', context, message), ...args);
    }
  },

  warn(context: string, message: string, ...args: unknown[]): void {
    if (shouldLog('warn')) {
      console.warn(formatMessage('warn', context, message), ...args);
    }
  },

  error(context: string, message: string, ...args: unknown[]): void {
    if (shouldLog('error')) {
      console.error(formatMessage('error', context, message), ...args);
    }
  },
};
