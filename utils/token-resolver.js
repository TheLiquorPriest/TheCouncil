/**
 * TheCouncil - Token Resolution Utility
 *
 * @deprecated This module is deprecated and will be removed in a future version.
 * Use PromptBuilderSystem instead:
 *
 *   const pb = window.TheCouncil.getSystem('promptBuilder');
 *   pb.resolveTemplate(template, context);
 *   pb.resolveToken(tokenId, context);
 *   pb.getAllTokens(category);
 *
 * This file is kept temporarily for backward compatibility.
 * All token resolution logic has been migrated to core/prompt-builder-system.js
 *
 * @see core/prompt-builder-system.js - New source of truth for token resolution
 *
 * Resolves tokens/macros in prompts, templates, and first messages.
 * Supports ST native macros, pipeline/phase/action scope tokens,
 * global variables, team context, store access, and more.
 *
 * @version 2.0.0
 * @deprecated Use PromptBuilderSystem instead
 */

const TokenResolver = {
  // ===== CONFIGURATION =====

  /**
   * Token pattern: matches {{token.path}} or {{token}}
   */
  TOKEN_PATTERN:
    /\{\{([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)\}\}/g,

  /**
   * ST native macros that should be passed through to ST's resolver
   */
  ST_NATIVE_MACROS: [
    "char",
    "user",
    "persona",
    "scenario",
    "personality",
    "system",
    "jailbreak",
    "mesExamples",
    "description",
    "char_version",
    "model",
    "lastMessage",
    "lastMessageId",
    "firstIncludedMessageId",
    "currentSwipeId",
    "lastSwipeId",
    "original",
    "time",
    "date",
    "weekday",
    "isotime",
    "isodate",
    "idle_duration",
    "random",
    "roll",
    "pick",
    "ban",
    "newline",
    "trim",
    "inject",
    "button",
    "input",
    "comment",
    "hidden",
    "note",
    "setvar",
    "getvar",
    "addvar",
    "incvar",
    "decvar",
    "mulvar",
    "divvar",
    "modvar",
    "powvar",
    "minvar",
    "maxvar",
    "setglobalvar",
    "getglobalvar",
    "addglobalvar",
  ],

  /**
   * Logger reference (will be set during init)
   */
  _logger: null,

  // ===== INITIALIZATION =====

  /**
   * Initialize the token resolver
   * @param {Object} options - Configuration options
   * @param {Object} options.logger - Logger instance
   */
  init(options = {}) {
    this._logger = options.logger || console;
    return this;
  },

  // ===== MAIN RESOLUTION =====

  /**
   * Resolve all tokens in a template string
   * @param {string} template - Template string with tokens
   * @param {Object} context - Resolution context
   * @param {Object} context.pipeline - Pipeline scope data
   * @param {Object} context.phase - Phase scope data
   * @param {Object} context.action - Action scope data
   * @param {Object} context.global - Global variables
   * @param {Object} context.team - Team scope data
   * @param {Object} context.store - Store data
   * @param {Object} context.agent - Agent data
   * @param {Object} context.position - Position data
   * @param {Object} context.st - SillyTavern context
   * @param {Object} options - Resolution options
   * @param {boolean} options.preserveUnresolved - Keep unresolved tokens as-is
   * @param {string} options.unresolvedPlaceholder - Placeholder for unresolved tokens
   * @param {boolean} options.passSTMacros - Pass ST macros through unresolved
   * @returns {string} Resolved template
   */
  resolve(template, context = {}, options = {}) {
    if (!template || typeof template !== "string") {
      return template || "";
    }

    const opts = {
      preserveUnresolved: options.preserveUnresolved ?? true,
      unresolvedPlaceholder: options.unresolvedPlaceholder ?? "",
      passSTMacros: options.passSTMacros ?? true,
    };

    return template.replace(this.TOKEN_PATTERN, (match, tokenPath) => {
      try {
        const resolved = this._resolveToken(tokenPath, context, opts);
        if (resolved === undefined) {
          if (opts.preserveUnresolved) {
            return match; // Keep original token
          }
          return opts.unresolvedPlaceholder;
        }
        return this._stringify(resolved);
      } catch (error) {
        this._log("warn", `Error resolving token "${tokenPath}":`, error);
        return opts.preserveUnresolved ? match : opts.unresolvedPlaceholder;
      }
    });
  },

  /**
   * Resolve a single token path
   * @param {string} tokenPath - Token path (e.g., "phase.input")
   * @param {Object} context - Resolution context
   * @param {Object} options - Resolution options
   * @returns {any} Resolved value or undefined
   */
  _resolveToken(tokenPath, context, options) {
    const parts = tokenPath.split(".");
    const scope = parts[0];
    const path = parts.slice(1);

    // Check if it's an ST native macro
    if (this.ST_NATIVE_MACROS.includes(scope) && options.passSTMacros) {
      return undefined; // Pass through to ST
    }

    // Resolve based on scope
    switch (scope) {
      case "pipeline":
        return this._resolvePath(context.pipeline, path);

      case "phase":
        return this._resolvePath(context.phase, path);

      case "action":
        return this._resolvePath(context.action, path);

      case "global":
        return this._resolvePath(context.global, path);

      case "team":
        return this._resolvePath(context.team, path);

      case "store":
        return this._resolveStore(path, context.store);

      case "agent":
        return this._resolvePath(context.agent, path);

      case "position":
        return this._resolvePath(context.position, path);

      case "st":
        return this._resolveSTContext(path, context.st);

      case "char":
      case "user":
      case "persona":
      case "scenario":
      case "personality":
      case "description":
        // ST macros without dot paths - pass through
        if (options.passSTMacros) {
          return undefined;
        }
        return this._resolveSTMacro(scope, context.st);

      default:
        // Unknown scope - check if it's in context root
        if (context[scope] !== undefined) {
          return path.length > 0
            ? this._resolvePath(context[scope], path)
            : context[scope];
        }
        return undefined;
    }
  },

  /**
   * Resolve a path within an object
   * @param {Object} obj - Object to traverse
   * @param {string[]} path - Path parts
   * @returns {any} Resolved value or undefined
   */
  _resolvePath(obj, path) {
    if (obj === null || obj === undefined) {
      return undefined;
    }

    if (path.length === 0) {
      return obj;
    }

    let current = obj;
    for (const part of path) {
      if (current === null || current === undefined) {
        return undefined;
      }
      if (typeof current !== "object") {
        return undefined;
      }
      current = current[part];
    }

    return current;
  },

  /**
   * Resolve store access
   * @param {string[]} path - Path parts (store name, then field path)
   * @param {Object} stores - Store data object
   * @returns {any} Resolved value or undefined
   */
  _resolveStore(path, stores) {
    if (!stores || path.length === 0) {
      return undefined;
    }

    const storeName = path[0];
    const fieldPath = path.slice(1);

    const storeData = stores[storeName];
    if (storeData === undefined) {
      return undefined;
    }

    if (fieldPath.length === 0) {
      return storeData;
    }

    return this._resolvePath(storeData, fieldPath);
  },

  /**
   * Resolve ST context values
   * @param {string[]} path - Path parts
   * @param {Object} stContext - SillyTavern context object
   * @returns {any} Resolved value or undefined
   */
  _resolveSTContext(path, stContext) {
    if (!stContext) {
      // Try to get ST context directly
      if (typeof SillyTavern !== "undefined") {
        stContext = SillyTavern.getContext?.();
      }
      if (!stContext) {
        return undefined;
      }
    }

    return this._resolvePath(stContext, path);
  },

  /**
   * Resolve ST macro to value
   * @param {string} macro - Macro name
   * @param {Object} stContext - SillyTavern context
   * @returns {any} Resolved value or undefined
   */
  _resolveSTMacro(macro, stContext) {
    if (!stContext) {
      if (typeof SillyTavern !== "undefined") {
        stContext = SillyTavern.getContext?.();
      }
      if (!stContext) {
        return undefined;
      }
    }

    switch (macro) {
      case "char":
        return stContext.name2 || stContext.characterName;
      case "user":
        return stContext.name1 || stContext.userName;
      case "persona":
        return stContext.persona;
      case "scenario":
        return stContext.scenario;
      case "personality":
        return stContext.personality;
      case "description":
        return stContext.description;
      default:
        return undefined;
    }
  },

  // ===== UTILITY METHODS =====

  /**
   * Convert a value to string for template insertion
   * @param {any} value - Value to stringify
   * @returns {string} String representation
   */
  _stringify(value) {
    if (value === null || value === undefined) {
      return "";
    }
    if (typeof value === "string") {
      return value;
    }
    if (typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }
    if (Array.isArray(value)) {
      return this._formatArray(value);
    }
    if (typeof value === "object") {
      return this._formatObject(value);
    }
    return String(value);
  },

  /**
   * Format an array for template insertion
   * @param {Array} arr - Array to format
   * @returns {string} Formatted string
   */
  _formatArray(arr) {
    if (arr.length === 0) {
      return "";
    }

    // Check if array contains objects
    if (arr.some((item) => typeof item === "object" && item !== null)) {
      return JSON.stringify(arr, null, 2);
    }

    // Simple array - join with newlines or commas based on content
    const hasLongItems = arr.some(
      (item) => String(item).length > 50 || String(item).includes("\n"),
    );
    return arr.map(String).join(hasLongItems ? "\n" : ", ");
  },

  /**
   * Format an object for template insertion
   * @param {Object} obj - Object to format
   * @returns {string} Formatted string
   */
  _formatObject(obj) {
    // Check for common formatting methods
    if (
      typeof obj.toString === "function" &&
      obj.toString !== Object.prototype.toString
    ) {
      return obj.toString();
    }

    // Try to format as readable key-value pairs
    const entries = Object.entries(obj);
    if (entries.length === 0) {
      return "";
    }

    // Simple objects - format as key: value pairs
    const isSimple = entries.every(
      ([, v]) => typeof v !== "object" || v === null,
    );
    if (isSimple && entries.length <= 10) {
      return entries
        .map(([k, v]) => `${this._formatKey(k)}: ${v ?? ""}`)
        .join("\n");
    }

    // Complex objects - use JSON
    return JSON.stringify(obj, null, 2);
  },

  /**
   * Format a key name for display
   * @param {string} key - Key name
   * @returns {string} Formatted key
   */
  _formatKey(key) {
    // Convert camelCase/snake_case to Title Case
    return key
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  },

  // ===== TOKEN EXTRACTION =====

  /**
   * Extract all tokens from a template
   * @param {string} template - Template string
   * @returns {string[]} Array of token paths found
   */
  extractTokens(template) {
    if (!template || typeof template !== "string") {
      return [];
    }

    const tokens = [];
    let match;
    const pattern = new RegExp(this.TOKEN_PATTERN.source, "g");

    while ((match = pattern.exec(template)) !== null) {
      tokens.push(match[1]);
    }

    return [...new Set(tokens)]; // Remove duplicates
  },

  /**
   * Check if a template contains any tokens
   * @param {string} template - Template string
   * @returns {boolean} True if tokens found
   */
  hasTokens(template) {
    if (!template || typeof template !== "string") {
      return false;
    }
    return this.TOKEN_PATTERN.test(template);
  },

  /**
   * Get token scopes used in a template
   * @param {string} template - Template string
   * @returns {string[]} Array of scope names
   */
  getTokenScopes(template) {
    const tokens = this.extractTokens(template);
    const scopes = tokens.map((token) => token.split(".")[0]);
    return [...new Set(scopes)];
  },

  /**
   * Validate that all required tokens can be resolved
   * @param {string} template - Template string
   * @param {Object} context - Resolution context
   * @returns {Object} Validation result { valid: boolean, missing: string[] }
   */
  validate(template, context = {}) {
    const tokens = this.extractTokens(template);
    const missing = [];

    for (const tokenPath of tokens) {
      const resolved = this._resolveToken(tokenPath, context, {
        passSTMacros: true,
      });
      if (resolved === undefined) {
        // Check if it's an ST macro that will be resolved later
        const scope = tokenPath.split(".")[0];
        if (!this.ST_NATIVE_MACROS.includes(scope)) {
          missing.push(tokenPath);
        }
      }
    }

    return {
      valid: missing.length === 0,
      missing,
    };
  },

  // ===== CONTEXT BUILDERS =====

  /**
   * Build a pipeline context object
   * @param {Object} data - Pipeline data
   * @returns {Object} Pipeline context
   */
  buildPipelineContext(data = {}) {
    return {
      userInput: data.userInput || "",
      ragThread: data.ragThread || "",
      ragInput: data.ragInput || "",
      startedAt: data.startedAt || Date.now(),
      ...data,
    };
  },

  /**
   * Build a phase context object
   * @param {Object} data - Phase data
   * @returns {Object} Phase context
   */
  buildPhaseContext(data = {}) {
    return {
      id: data.id || "",
      name: data.name || "",
      input: data.input || "",
      output: data.output || "",
      thread: data.thread || "",
      ragThread: data.ragThread || "",
      ragInput: data.ragInput || "",
      ...data,
    };
  },

  /**
   * Build an action context object
   * @param {Object} data - Action data
   * @returns {Object} Action context
   */
  buildActionContext(data = {}) {
    return {
      id: data.id || "",
      name: data.name || "",
      input: data.input || "",
      output: data.output || "",
      thread: data.thread || "",
      ragThread: data.ragThread || "",
      ragInput: data.ragInput || "",
      ...data,
    };
  },

  /**
   * Build a team context object
   * @param {Object} data - Team data
   * @returns {Object} Team context
   */
  buildTeamContext(data = {}) {
    return {
      id: data.id || "",
      name: data.name || "",
      thread: data.thread || "",
      taskThread: data.taskThread || "",
      input: data.input || "",
      output: data.output || "",
      ...data,
    };
  },

  /**
   * Build default global variables context
   * @param {Object} data - Global data
   * @returns {Object} Global context
   */
  buildGlobalContext(data = {}) {
    return {
      instructions: data.instructions || "",
      outlineDraft: data.outlineDraft || "",
      finalOutline: data.finalOutline || "",
      firstDraft: data.firstDraft || "",
      secondDraft: data.secondDraft || "",
      finalDraft: data.finalDraft || "",
      commentary: data.commentary || "",
      ...data,
    };
  },

  /**
   * Build a complete resolution context
   * @param {Object} options - Context components
   * @returns {Object} Complete context
   */
  buildContext(options = {}) {
    return {
      pipeline: options.pipeline
        ? this.buildPipelineContext(options.pipeline)
        : {},
      phase: options.phase ? this.buildPhaseContext(options.phase) : {},
      action: options.action ? this.buildActionContext(options.action) : {},
      global: options.global ? this.buildGlobalContext(options.global) : {},
      team: options.team ? this.buildTeamContext(options.team) : {},
      store: options.store || {},
      agent: options.agent || {},
      position: options.position || {},
      st: options.st || null,
    };
  },

  // ===== LOGGING =====

  /**
   * Log a message
   * @param {string} level - Log level
   * @param {string} message - Message
   * @param {...any} args - Additional arguments
   */
  _log(level, message, ...args) {
    if (this._logger && typeof this._logger[level] === "function") {
      this._logger[level](`[TokenResolver] ${message}`, ...args);
    }
  },
};

// Export for different environments
if (typeof window !== "undefined") {
  window.TokenResolver = TokenResolver;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = TokenResolver;
}
