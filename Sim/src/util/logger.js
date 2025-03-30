/**
 * Centralized logging utility to replace direct console.log/warn/error usage.
 * Provides configurable log levels and better control over logging across the application.
 */
export class Logger {
    // Log levels
    static LEVELS = {
        ERROR: 0,
        WARN: 1,
        INFO: 2,
        DEBUG: 3,
        TRACE: 4
    };

    // Current log level (can be changed at runtime)
    static currentLevel = Logger.LEVELS.INFO;

    // Singleton instance
    static _instance = null;

    /**
     * Get the singleton logger instance
     * @returns {Logger} The logger instance
     */
    static getInstance() {
        if (!Logger._instance) {
            Logger._instance = new Logger();
        }
        return Logger._instance;
    }

    /**
     * Set the current log level
     * @param {number} level - The log level to set
     */
    static setLevel(level) {
        if (Object.values(Logger.LEVELS).includes(level)) {
            Logger.currentLevel = level;
        } else {
            console.error(`Invalid log level: ${level}`);
        }
    }

    /**
     * Enable/disable all logging
     * @param {boolean} enabled - Whether logging should be enabled
     */
    static enable(enabled) {
        Logger.currentLevel = enabled ? Logger.LEVELS.INFO : -1;
    }

    /**
     * Log an error message
     * @param {string} message - The error message
     * @param {Error|any} [error] - Optional error object
     */
    error(message, error) {
        if (Logger.currentLevel >= Logger.LEVELS.ERROR) {
            if (error) {
                console.error(`[ERROR] ${message}`, error);
            } else {
                console.error(`[ERROR] ${message}`);
            }
        }
    }

    /**
     * Log a warning message
     * @param {string} message - The warning message
     */
    warn(message) {
        if (Logger.currentLevel >= Logger.LEVELS.WARN) {
            console.warn(`[WARN] ${message}`);
        }
    }

    /**
     * Log an info message
     * @param {string} message - The info message
     */
    info(message) {
        if (Logger.currentLevel >= Logger.LEVELS.INFO) {
            console.log(`[INFO] ${message}`);
        }
    }

    /**
     * Log a debug message
     * @param {string} message - The debug message
     * @param {any} [data] - Optional data to log
     */
    debug(message, data) {
        if (Logger.currentLevel >= Logger.LEVELS.DEBUG) {
            if (data) {
                console.log(`[DEBUG] ${message}`, data);
            } else {
                console.log(`[DEBUG] ${message}`);
            }
        }
    }

    /**
     * Log a trace message (most verbose)
     * @param {string} message - The trace message
     * @param {any} [data] - Optional data to log
     */
    trace(message, data) {
        if (Logger.currentLevel >= Logger.LEVELS.TRACE) {
            if (data) {
                console.log(`[TRACE] ${message}`, data);
            } else {
                console.log(`[TRACE] ${message}`);
            }
        }
    }
}

// Convenience export of the singleton instance
export const logger = Logger.getInstance();

// Usage example:
// import { logger } from "../util/logger.js";
// logger.info("Application started");
// logger.error("Failed to load resource", error);
// logger.debug("Processing item", item); 