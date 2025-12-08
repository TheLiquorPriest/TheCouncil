/**
 * TheCouncil - Centralized Logging Utility
 *
 * Provides consistent logging across all modules with configurable levels.
 *
 * @version 2.0.0
 */

const Logger = {
  // ===== CONFIGURATION =====

  /**
   * Extension name for log prefixes
   */
  EXTENSION_NAME: "The_Council",

  /**
   * Log levels
   */
  LEVELS: {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
    NONE: 4,
  },

  /**
   * Current log level (can be changed at runtime)
   */
  _level: 1, // Default: INFO

  /**
   * Whether to include timestamps in logs
   */
  _showTimestamps: false,

  /**
   * Whether to include module names in logs
   */
  _showModule: true,

  /**
   * Log history for debugging
   */
  _history: [],

  /**
   * Maximum history size
   */
  _maxHistorySize: 500,

  /**
   * Whether to store history
   */
  _storeHistory: true,

  // ===== CONFIGURATION METHODS =====

  /**
   * Initialize the logger (alias for configure for consistency with other modules)
   * @param {Object} options - Configuration options
   * @param {string} options.prefix - Log prefix (extension name)
   * @param {string|number} options.level - Log level ("debug", "info", "warn", "error" or LEVELS constant)
   * @param {boolean} options.showTimestamps - Include timestamps
   * @param {boolean} options.showModule - Include module names
   * @param {boolean} options.storeHistory - Store log history
   * @param {number} options.maxHistorySize - Maximum history entries
   * @returns {Object} Logger instance
   */
  init(options = {}) {
    if (options.prefix) {
      this.EXTENSION_NAME = options.prefix;
    }

    // Convert string level to number
    if (typeof options.level === "string") {
      const levelMap = {
        debug: this.LEVELS.DEBUG,
        info: this.LEVELS.INFO,
        warn: this.LEVELS.WARN,
        error: this.LEVELS.ERROR,
        none: this.LEVELS.NONE,
      };
      options.level = levelMap[options.level.toLowerCase()] ?? this.LEVELS.INFO;
    }

    this.configure(options);
    return this;
  },

  /**
   * Configure the logger
   * @param {Object} options - Configuration options
   * @param {number} options.level - Log level (use LEVELS constants)
   * @param {boolean} options.showTimestamps - Include timestamps
   * @param {boolean} options.showModule - Include module names
   * @param {boolean} options.storeHistory - Store log history
   * @param {number} options.maxHistorySize - Maximum history entries
   */
  configure(options = {}) {
    if (typeof options.level === "number") {
      this._level = options.level;
    }
    if (typeof options.showTimestamps === "boolean") {
      this._showTimestamps = options.showTimestamps;
    }
    if (typeof options.showModule === "boolean") {
      this._showModule = options.showModule;
    }
    if (typeof options.storeHistory === "boolean") {
      this._storeHistory = options.storeHistory;
    }
    if (typeof options.maxHistorySize === "number") {
      this._maxHistorySize = options.maxHistorySize;
    }
  },

  /**
   * Set log level
   * @param {number} level - Log level
   */
  setLevel(level) {
    this._level = level;
  },

  /**
   * Enable debug mode (sets level to DEBUG)
   */
  enableDebug() {
    this._level = this.LEVELS.DEBUG;
  },

  /**
   * Disable debug mode (sets level to INFO)
   */
  disableDebug() {
    this._level = this.LEVELS.INFO;
  },

  /**
   * Check if debug mode is enabled
   * @returns {boolean}
   */
  isDebugEnabled() {
    return this._level <= this.LEVELS.DEBUG;
  },

  // ===== FORMATTING =====

  /**
   * Format a log message
   * @param {string} level - Level name
   * @param {string} module - Module name (optional)
   * @param {string} message - Log message
   * @returns {string} Formatted message
   */
  _format(level, module, message) {
    const parts = [];

    // Timestamp
    if (this._showTimestamps) {
      const now = new Date();
      const time = now.toTimeString().split(" ")[0];
      const ms = String(now.getMilliseconds()).padStart(3, "0");
      parts.push(`[${time}.${ms}]`);
    }

    // Extension name
    parts.push(`[${this.EXTENSION_NAME}]`);

    // Level
    if (level !== "INFO") {
      parts.push(`[${level}]`);
    }

    // Module
    if (this._showModule && module) {
      parts.push(`[${module}]`);
    }

    // Message
    parts.push(message);

    return parts.join(" ");
  },

  /**
   * Store a log entry in history
   * @param {string} level - Level name
   * @param {string} module - Module name
   * @param {string} message - Log message
   * @param {Array} args - Additional arguments
   */
  _store(level, module, message, args) {
    if (!this._storeHistory) return;

    this._history.push({
      timestamp: Date.now(),
      level,
      module,
      message,
      args: args.length > 0 ? args : undefined,
    });

    // Trim history if needed
    if (this._history.length > this._maxHistorySize) {
      this._history = this._history.slice(-this._maxHistorySize);
    }
  },

  // ===== LOGGING METHODS =====

  /**
   * Log a debug message
   * @param {string} message - Log message
   * @param {...any} args - Additional arguments
   */
  debug(message, ...args) {
    if (this._level <= this.LEVELS.DEBUG) {
      const formatted = this._format("DEBUG", null, message);
      console.log(formatted, ...args);
      this._store("DEBUG", null, message, args);
    }
  },

  /**
   * Log a debug message with module name
   * @param {string} module - Module name
   * @param {string} message - Log message
   * @param {...any} args - Additional arguments
   */
  debugModule(module, message, ...args) {
    if (this._level <= this.LEVELS.DEBUG) {
      const formatted = this._format("DEBUG", module, message);
      console.log(formatted, ...args);
      this._store("DEBUG", module, message, args);
    }
  },

  /**
   * Log an info message
   * @param {string} message - Log message
   * @param {...any} args - Additional arguments
   */
  info(message, ...args) {
    if (this._level <= this.LEVELS.INFO) {
      const formatted = this._format("INFO", null, message);
      console.log(formatted, ...args);
      this._store("INFO", null, message, args);
    }
  },

  /**
   * Log an info message with module name
   * @param {string} module - Module name
   * @param {string} message - Log message
   * @param {...any} args - Additional arguments
   */
  infoModule(module, message, ...args) {
    if (this._level <= this.LEVELS.INFO) {
      const formatted = this._format("INFO", module, message);
      console.log(formatted, ...args);
      this._store("INFO", module, message, args);
    }
  },

  /**
   * Log a warning message
   * @param {string} message - Log message
   * @param {...any} args - Additional arguments
   */
  warn(message, ...args) {
    if (this._level <= this.LEVELS.WARN) {
      const formatted = this._format("WARN", null, message);
      console.warn(formatted, ...args);
      this._store("WARN", null, message, args);
    }
  },

  /**
   * Log a warning message with module name
   * @param {string} module - Module name
   * @param {string} message - Log message
   * @param {...any} args - Additional arguments
   */
  warnModule(module, message, ...args) {
    if (this._level <= this.LEVELS.WARN) {
      const formatted = this._format("WARN", module, message);
      console.warn(formatted, ...args);
      this._store("WARN", module, message, args);
    }
  },

  /**
   * Log an error message
   * @param {string} message - Log message
   * @param {...any} args - Additional arguments
   */
  error(message, ...args) {
    if (this._level <= this.LEVELS.ERROR) {
      const formatted = this._format("ERROR", null, message);
      console.error(formatted, ...args);
      this._store("ERROR", null, message, args);
    }
  },

  /**
   * Log an error message with module name
   * @param {string} module - Module name
   * @param {string} message - Log message
   * @param {...any} args - Additional arguments
   */
  errorModule(module, message, ...args) {
    if (this._level <= this.LEVELS.ERROR) {
      const formatted = this._format("ERROR", module, message);
      console.error(formatted, ...args);
      this._store("ERROR", module, message, args);
    }
  },

  /**
   * Unified log method - routes to appropriate level method
   * @param {string} level - Log level ("debug", "info", "warn", "error")
   * @param {string} message - Log message
   * @param {...any} args - Additional arguments
   */
  log(level, message, ...args) {
    const levelLower = (level || "info").toLowerCase();
    switch (levelLower) {
      case "debug":
        this.debug(message, ...args);
        break;
      case "info":
        this.info(message, ...args);
        break;
      case "warn":
      case "warning":
        this.warn(message, ...args);
        break;
      case "error":
        this.error(message, ...args);
        break;
      default:
        this.info(message, ...args);
    }
  },

  /**
   * Log a message (alias for info)
   * @param {string} message - Log message
   * @param {...any} args - Additional arguments
   */
  log(message, ...args) {
    this.info(message, ...args);
  },

  // ===== MODULE LOGGER FACTORY =====

  /**
   * Create a logger instance scoped to a specific module
   * @param {string} moduleName - Module name
   * @returns {Object} Module-scoped logger
   */
  createModuleLogger(moduleName) {
    const self = this;
    return {
      debug(message, ...args) {
        self.debugModule(moduleName, message, ...args);
      },
      info(message, ...args) {
        self.infoModule(moduleName, message, ...args);
      },
      warn(message, ...args) {
        self.warnModule(moduleName, message, ...args);
      },
      error(message, ...args) {
        self.errorModule(moduleName, message, ...args);
      },
      log(message, ...args) {
        self.infoModule(moduleName, message, ...args);
      },
    };
  },

  // ===== HISTORY METHODS =====

  /**
   * Get log history
   * @param {Object} options - Filter options
   * @param {string} options.level - Filter by level
   * @param {string} options.module - Filter by module
   * @param {number} options.limit - Maximum entries to return
   * @param {number} options.since - Only entries after this timestamp
   * @returns {Array} Log entries
   */
  getHistory(options = {}) {
    let entries = [...this._history];

    // Filter by level
    if (options.level) {
      entries = entries.filter((e) => e.level === options.level);
    }

    // Filter by module
    if (options.module) {
      entries = entries.filter((e) => e.module === options.module);
    }

    // Filter by time
    if (options.since) {
      entries = entries.filter((e) => e.timestamp >= options.since);
    }

    // Limit
    if (options.limit && options.limit > 0) {
      entries = entries.slice(-options.limit);
    }

    return entries;
  },

  /**
   * Clear log history
   */
  clearHistory() {
    this._history = [];
  },

  /**
   * Export log history as formatted string
   * @returns {string} Formatted log history
   */
  exportHistory() {
    return this._history
      .map((entry) => {
        const date = new Date(entry.timestamp).toISOString();
        const module = entry.module ? `[${entry.module}] ` : "";
        const args = entry.args ? " " + JSON.stringify(entry.args) : "";
        return `${date} [${entry.level}] ${module}${entry.message}${args}`;
      })
      .join("\n");
  },

  // ===== UTILITY METHODS =====

  /**
   * Log a group of related messages
   * @param {string} title - Group title
   * @param {Function} callback - Function that contains log calls
   */
  group(title, callback) {
    if (this._level <= this.LEVELS.DEBUG) {
      console.group(`[${this.EXTENSION_NAME}] ${title}`);
      callback();
      console.groupEnd();
    }
  },

  /**
   * Log a collapsed group of related messages
   * @param {string} title - Group title
   * @param {Function} callback - Function that contains log calls
   */
  groupCollapsed(title, callback) {
    if (this._level <= this.LEVELS.DEBUG) {
      console.groupCollapsed(`[${this.EXTENSION_NAME}] ${title}`);
      callback();
      console.groupEnd();
    }
  },

  /**
   * Log a table (for debugging data structures)
   * @param {any} data - Data to display as table
   * @param {string} label - Optional label
   */
  table(data, label = null) {
    if (this._level <= this.LEVELS.DEBUG) {
      if (label) {
        console.log(`[${this.EXTENSION_NAME}][DEBUG] ${label}:`);
      }
      console.table(data);
    }
  },

  /**
   * Time a function execution
   * @param {string} label - Timer label
   * @param {Function} fn - Function to time
   * @returns {any} Function result
   */
  time(label, fn) {
    if (this._level <= this.LEVELS.DEBUG) {
      const start = performance.now();
      const result = fn();
      const duration = (performance.now() - start).toFixed(2);
      this.debug(`${label}: ${duration}ms`);
      return result;
    }
    return fn();
  },

  /**
   * Time an async function execution
   * @param {string} label - Timer label
   * @param {Function} fn - Async function to time
   * @returns {Promise<any>} Function result
   */
  async timeAsync(label, fn) {
    if (this._level <= this.LEVELS.DEBUG) {
      const start = performance.now();
      const result = await fn();
      const duration = (performance.now() - start).toFixed(2);
      this.debug(`${label}: ${duration}ms`);
      return result;
    }
    return fn();
  },

  /**
   * Assert a condition and log if false
   * @param {boolean} condition - Condition to check
   * @param {string} message - Message if assertion fails
   */
  assert(condition, message) {
    if (!condition) {
      this.error(`Assertion failed: ${message}`);
      console.trace();
    }
  },
};

// Export for different environments
if (typeof window !== "undefined") {
  window.Logger = Logger;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = Logger;
}
