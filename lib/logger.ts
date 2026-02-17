export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

class Logger {
    private log(level: LogLevel, message: string, meta?: Record<string, any>) {
        const timestamp = new Date().toISOString();
        const logData = {
            timestamp,
            level,
            message,
            environment: process.env.NODE_ENV,
            ...meta,
        };

        if (process.env.NODE_ENV === 'development') {
            // Pretty print for development
            const color =
                level === 'error'
                    ? '\x1b[31m' // Red
                    : level === 'warn'
                        ? '\x1b[33m' // Yellow
                        : level === 'info'
                            ? '\x1b[36m' // Cyan
                            : '\x1b[90m'; // Gray for debug

            console.log(
                `${color}[${level.toUpperCase()}]\x1b[0m ${message}`,
                meta ? meta : ''
            );
        } else {
            // JSON for production
            console.log(JSON.stringify(logData));
        }
    }

    info(message: string, meta?: Record<string, any>) {
        this.log('info', message, meta);
    }

    warn(message: string, meta?: Record<string, any>) {
        this.log('warn', message, meta);
    }

    error(message: string, meta?: Record<string, any>) {
        this.log('error', message, meta);
    }

    debug(message: string, meta?: Record<string, any>) {
        this.log('debug', message, meta);
    }
}

export const logger = new Logger();
