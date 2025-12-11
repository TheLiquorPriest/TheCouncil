/**
 * TheCouncil - Prompt Builder System
 *
 * A robust prompt construction system with UI and feature parity (plus enhancements)
 * over the built-in ST prompt builder, designed for superior performance and user experience.
 *
 * Provides:
 * - Token registry (centralized management of all available tokens)
 * - Template resolution ({{token}} syntax with nested support)
 * - Stack-based prompt assembly
 * - Agent prompt building
 * - Macro system (future)
 * - Preset prompts (future)
 *
 * @version 2.0.0
 */

const PromptBuilderSystem = {
  // ===== VERSION =====
  VERSION: "2.0.0",

  // ===== STATE =====
  _initialized: false,
  _kernel: null,
  _logger: null,
  _eventBus: null,

  // ===== TOKEN REGISTRY =====

  /**
   * Token pattern: matches {{token.path}} or {{token}}
   * Also supports {{token:args}} for parameterized tokens
   */
  TOKEN_PATTERN: /\{\{([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)(?::([^}]*))?\}\}/g,

  /**
   * Token registry - stores all registered tokens
   * @type {Map<string, Object>}
   */
  _tokens: new Map(),

  /**
   * Token categories for organization
   */
  TOKEN_CATEGORIES: {
    ST_NATIVE: {
      id: "st_native",
      name: "SillyTavern Macros",
      description: "Built-in SillyTavern macros",
      priority: 1,
    },
    PIPELINE: {
      id: "pipeline",
      name: "Pipeline Scope",
      description: "Pipeline-level variables and globals",
      priority: 2,
    },
    PHASE: {
      id: "phase",
      name: "Phase Scope",
      description: "Current phase variables",
      priority: 3,
    },
    ACTION: {
      id: "action",
      name: "Action Scope",
      description: "Current action variables",
      priority: 4,
    },
    STORE: {
      id: "store",
      name: "Store Access",
      description: "Access Curation store data",
      priority: 5,
    },
    AGENT: {
      id: "agent",
      name: "Agent/Position",
      description: "Agent and position information",
      priority: 6,
    },
    TEAM: {
      id: "team",
      name: "Team Scope",
      description: "Team-level variables",
      priority: 7,
    },
    GLOBAL: {
      id: "global",
      name: "Global Variables",
      description: "Global pipeline variables",
      priority: 8,
    },
    CUSTOM: {
      id: "custom",
      name: "Custom Tokens",
      description: "User-defined custom tokens",
      priority: 100,
    },
  },

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

  // ===== INITIALIZATION =====

  /**
   * Initialize the Prompt Builder System
   * @param {Object} kernel - TheCouncil Kernel reference
   * @returns {Object} PromptBuilderSystem instance
   */
  init(kernel) {
    if (this._initialized) {
      this._log("warn", "PromptBuilderSystem already initialized");
      return this;
    }

    this._kernel = kernel;
    this._logger = kernel.getModule("logger");
    this._eventBus = kernel;

    // Register with kernel
    kernel.registerSystem("promptBuilder", this);

    // Initialize token registry with default tokens
    this._registerDefaultTokens();

    this._initialized = true;
    this._log("info", `PromptBuilderSystem v${this.VERSION} initialized`);
    this._emit("promptBuilder:ready", { version: this.VERSION });

    return this;
  },

  /**
   * Check if system is ready
   * @returns {boolean}
   */
  isReady() {
    return this._initialized;
  },

  // ===== TOKEN REGISTRY API =====

  /**
   * Register a token
   * @param {Object} token - Token definition
   * @param {string} token.id - Unique token identifier (e.g., "pipeline.input")
   * @param {string} token.name - Human-readable name
   * @param {string} token.description - Token description
   * @param {string} token.category - Token category ID
   * @param {Function} token.resolver - Function to resolve token value (optional)
   * @param {string} token.syntax - Display syntax (e.g., "{{pipeline.input}}")
   * @param {Object} token.metadata - Additional metadata (optional)
   * @returns {boolean} Success
   */
  registerToken(token) {
    if (!token || !token.id) {
      this._log("error", "Token registration failed: missing id");
      return false;
    }

    // Validate token structure
    const tokenDef = {
      id: token.id,
      name: token.name || token.id,
      description: token.description || "",
      category: token.category || "custom",
      resolver: token.resolver || null,
      syntax: token.syntax || `{{${token.id}}}`,
      metadata: token.metadata || {},
      registeredAt: Date.now(),
    };

    this._tokens.set(token.id, tokenDef);
    this._log("debug", `Token registered: ${token.id}`);
    this._emit("promptBuilder:token:registered", { token: tokenDef });

    return true;
  },

  /**
   * Unregister a token
   * @param {string} tokenId - Token ID to remove
   * @returns {boolean} Success
   */
  unregisterToken(tokenId) {
    if (!this._tokens.has(tokenId)) {
      return false;
    }

    this._tokens.delete(tokenId);
    this._log("debug", `Token unregistered: ${tokenId}`);
    this._emit("promptBuilder:token:unregistered", { tokenId });

    return true;
  },

  /**
   * Get a token definition by ID
   * @param {string} tokenId - Token ID
   * @returns {Object|null} Token definition or null
   */
  getToken(tokenId) {
    return this._tokens.get(tokenId) || null;
  },

  /**
   * Get all tokens, optionally filtered by category
   * @param {string} category - Category ID to filter by (optional)
   * @returns {Object[]} Array of token definitions
   */
  getAllTokens(category = null) {
    const tokens = Array.from(this._tokens.values());

    if (category) {
      return tokens.filter((t) => t.category === category);
    }

    return tokens;
  },

  /**
   * Get tokens grouped by category
   * @returns {Object} Map of category -> tokens[]
   */
  getTokensByCategory() {
    const result = {};

    for (const token of this._tokens.values()) {
      const cat = token.category;
      if (!result[cat]) {
        result[cat] = [];
      }
      result[cat].push(token);
    }

    return result;
  },

  /**
   * Search tokens by name, description, or ID
   * @param {string} query - Search query
   * @returns {Object[]} Matching tokens
   */
  searchTokens(query) {
    if (!query) {
      return this.getAllTokens();
    }

    const lowerQuery = query.toLowerCase();
    return Array.from(this._tokens.values()).filter((token) => {
      return (
        token.id.toLowerCase().includes(lowerQuery) ||
        token.name.toLowerCase().includes(lowerQuery) ||
        token.description.toLowerCase().includes(lowerQuery)
      );
    });
  },

  /**
   * Check if a token is registered
   * @param {string} tokenId - Token ID
   * @returns {boolean}
   */
  hasToken(tokenId) {
    return this._tokens.has(tokenId);
  },

  // ===== TOKEN RESOLUTION =====

  /**
   * Resolve a single token by ID
   * @param {string} tokenId - Token ID to resolve
   * @param {Object} context - Resolution context
   * @returns {any} Resolved value or undefined
   */
  resolveToken(tokenId, context = {}) {
    // Check if it's a registered token with custom resolver
    const token = this._tokens.get(tokenId);
    if (token && token.resolver && typeof token.resolver === "function") {
      try {
        return token.resolver(context);
      } catch (error) {
        this._log("warn", `Token resolver error for "${tokenId}":`, error);
        return undefined;
      }
    }

    // Fall back to context path resolution
    return this._resolveFromContext(tokenId, context);
  },

  /**
   * Resolve all tokens in a template string
   * @param {string} template - Template string with {{tokens}}
   * @param {Object} context - Resolution context
   * @param {Object} options - Resolution options
   * @param {boolean} options.preserveUnresolved - Keep unresolved tokens as-is (default: true)
   * @param {string} options.unresolvedPlaceholder - Placeholder for unresolved tokens
   * @param {boolean} options.passSTMacros - Pass ST macros through unresolved (default: true)
   * @returns {string} Resolved template
   */
  resolveTemplate(template, context = {}, options = {}) {
    if (!template || typeof template !== "string") {
      return template || "";
    }

    const opts = {
      preserveUnresolved: options.preserveUnresolved !== false,
      unresolvedPlaceholder: options.unresolvedPlaceholder || "",
      passSTMacros: options.passSTMacros !== false,
    };

    // Use fresh regex instance for each call (global flag requires this)
    const pattern = new RegExp(this.TOKEN_PATTERN.source, "g");

    return template.replace(pattern, (match, tokenPath, args) => {
      try {
        // Check if it's an ST native macro that should be passed through
        const scope = tokenPath.split(".")[0];
        if (opts.passSTMacros && this.ST_NATIVE_MACROS.includes(scope)) {
          return match; // Pass through to ST
        }

        // Try to resolve the token
        const resolved = this._resolveTokenPath(tokenPath, context, args);

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
   * Resolve a token path from context
   * @param {string} tokenPath - Token path (e.g., "phase.input")
   * @param {Object} context - Resolution context
   * @param {string} args - Optional arguments for the token
   * @returns {any} Resolved value or undefined
   */
  _resolveTokenPath(tokenPath, context, args) {
    // First check if there's a registered token with this ID
    const registeredToken = this._tokens.get(tokenPath);
    if (registeredToken && registeredToken.resolver) {
      try {
        return registeredToken.resolver(context, args);
      } catch (error) {
        this._log("warn", `Token resolver error for "${tokenPath}":`, error);
      }
    }

    // Parse the path and resolve from context
    const parts = tokenPath.split(".");
    const scope = parts[0];
    const path = parts.slice(1);

    return this._resolveFromContext(tokenPath, context);
  },

  /**
   * Resolve a token path from context object
   * @param {string} tokenPath - Full token path
   * @param {Object} context - Context object
   * @returns {any} Resolved value or undefined
   */
  _resolveFromContext(tokenPath, context) {
    const parts = tokenPath.split(".");
    const scope = parts[0];
    const path = parts.slice(1);

    // Scope-based resolution
    switch (scope) {
      case "pipeline":
        return this._resolvePath(context.pipeline, path);

      case "phase":
        return this._resolvePath(context.phase, path);

      case "action":
        return this._resolvePath(context.action, path);

      case "global":
      case "globals":
        return this._resolvePath(context.global || context.globals, path);

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

      case "previousPhase":
        return this._resolvePath(context.previousPhase, path);

      case "previousAction":
        return this._resolvePath(context.previousAction, path);

      case "rag":
        return this._resolvePath(context.rag, path);

      case "constants":
        return this._resolvePath(context.constants, path);

      case "input":
        // Special shorthand for action.input
        if (path.length === 0) {
          return context.input || context.action?.input;
        }
        return this._resolvePath(context.input, path);

      case "output":
        // Special shorthand for action.output
        if (path.length === 0) {
          return context.output || context.action?.output;
        }
        return this._resolvePath(context.output, path);

      case "context":
        // Special shorthand for combined context
        if (path.length === 0) {
          return context.combinedContext || context.context;
        }
        return this._resolvePath(context.combinedContext || context.context, path);

      default:
        // Try direct lookup in context root
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

  // ===== PROMPT BUILDING =====

  /**
   * Build a prompt from a configuration object
   * @param {Object} config - Prompt configuration
   * @param {Array} config.stack - Array of prompt stack items
   * @param {string} config.separator - Item separator (default: "\n\n")
   * @param {boolean} config.trim - Trim whitespace (default: true)
   * @param {Object} context - Resolution context
   * @returns {string} Built prompt
   */
  buildPrompt(config, context = {}) {
    const {
      stack = [],
      separator = "\n\n",
      trim = true,
    } = config;

    const parts = [];

    for (const item of stack) {
      if (!item.enabled) continue;

      let content = null;

      // Handle different item types
      if (typeof item === "string") {
        content = item;
      } else if (item.type === "text" || item.type === "static") {
        content = item.content || item.text || "";
      } else if (item.type === "token") {
        content = this.resolveToken(item.tokenId, context);
      } else if (item.type === "template") {
        content = this.resolveTemplate(item.template, context);
      } else if (item.type === "conditional") {
        // Conditional block - only include if condition is truthy
        const condition = this._evaluateCondition(item.condition, context);
        if (condition) {
          content = item.content
            ? this.resolveTemplate(item.content, context)
            : null;
        }
      } else if (item.content) {
        // Default: treat content as template
        content = this.resolveTemplate(item.content, context);
      }

      // Apply transforms if specified
      if (content && item.transforms) {
        content = this._applyTransforms(content, item.transforms);
      }

      if (content) {
        parts.push(trim ? content.trim() : content);
      }
    }

    const result = parts.join(separator);
    return trim ? result.trim() : result;
  },

  /**
   * Build prompt from a stack array
   * @param {Array} stack - Prompt stack
   * @param {Object} context - Resolution context
   * @param {Object} options - Build options
   * @returns {string} Built prompt
   */
  buildFromStack(stack, context = {}, options = {}) {
    return this.buildPrompt({ stack, ...options }, context);
  },

  /**
   * Build an agent prompt with position context
   * @param {Object} agent - Agent definition
   * @param {Object} position - Position definition
   * @param {Object} actionContext - Action context (input, output, etc.)
   * @returns {string} Built agent prompt
   */
  buildAgentPrompt(agent, position, actionContext = {}) {
    const context = {
      ...actionContext,
      agent: {
        id: agent.id,
        name: agent.name,
        systemPrompt: agent.systemPrompt,
        ...agent,
      },
      position: {
        id: position?.id,
        name: position?.name,
        tier: position?.tier,
        roleDescription: position?.roleDescription,
        ...position,
      },
    };

    // Build the agent prompt from components
    const stack = [];

    // 1. Position role description (if available)
    if (position?.roleDescription) {
      stack.push({
        type: "template",
        template: position.roleDescription,
        enabled: true,
      });
    }

    // 2. Agent system prompt
    if (agent.systemPrompt) {
      stack.push({
        type: "template",
        template: agent.systemPrompt,
        enabled: true,
      });
    }

    // 3. Agent-specific prompt prefix
    if (agent.promptPrefix) {
      stack.push({
        type: "template",
        template: agent.promptPrefix,
        enabled: true,
      });
    }

    // 4. Action instructions (if provided)
    if (actionContext.instructions) {
      stack.push({
        type: "template",
        template: actionContext.instructions,
        enabled: true,
      });
    }

    // 5. Action-specific context
    if (actionContext.actionPrompt) {
      stack.push({
        type: "template",
        template: actionContext.actionPrompt,
        enabled: true,
      });
    }

    // 6. Agent-specific prompt suffix
    if (agent.promptSuffix) {
      stack.push({
        type: "template",
        template: agent.promptSuffix,
        enabled: true,
      });
    }

    return this.buildPrompt({ stack, separator: "\n\n" }, context);
  },

  // ===== VALIDATION =====

  /**
   * Validate that all tokens in a template can be resolved
   * @param {string} template - Template string
   * @param {Object} context - Resolution context (optional)
   * @returns {Object} Validation result { valid: boolean, tokens: string[], missing: string[] }
   */
  validateTemplate(template, context = {}) {
    const tokens = this.getTemplateTokens(template);
    const missing = [];

    for (const tokenPath of tokens) {
      const resolved = this._resolveTokenPath(tokenPath, context);
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
      tokens,
      missing,
    };
  },

  /**
   * Extract all token paths from a template
   * @param {string} template - Template string
   * @returns {string[]} Array of token paths (unique)
   */
  getTemplateTokens(template) {
    if (!template || typeof template !== "string") {
      return [];
    }

    const tokens = [];
    const pattern = new RegExp(this.TOKEN_PATTERN.source, "g");
    let match;

    while ((match = pattern.exec(template)) !== null) {
      tokens.push(match[1]);
    }

    return [...new Set(tokens)];
  },

  /**
   * Check if a template contains any tokens
   * @param {string} template - Template string
   * @returns {boolean}
   */
  hasTokens(template) {
    if (!template || typeof template !== "string") {
      return false;
    }
    return this.TOKEN_PATTERN.test(template);
  },

  // ===== CONTEXT BUILDERS =====

  /**
   * Build a complete resolution context
   * @param {Object} options - Context components
   * @returns {Object} Complete context
   */
  buildContext(options = {}) {
    return {
      pipeline: options.pipeline || {},
      phase: options.phase || {},
      action: options.action || {},
      global: options.global || options.globals || {},
      globals: options.globals || options.global || {},
      team: options.team || {},
      store: options.store || {},
      agent: options.agent || {},
      position: options.position || {},
      st: options.st || this._getSTContext(),
      previousPhase: options.previousPhase || {},
      previousAction: options.previousAction || {},
      rag: options.rag || {},
      constants: options.constants || {},
      input: options.input || options.action?.input || "",
      output: options.output || options.action?.output || "",
      combinedContext: options.combinedContext || options.context || "",
      ...options.custom,
    };
  },

  /**
   * Get SillyTavern context
   * @returns {Object|null}
   */
  _getSTContext() {
    if (typeof SillyTavern !== "undefined") {
      return SillyTavern.getContext?.() || null;
    }
    return null;
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
      (item) => String(item).length > 50 || String(item).includes("\n")
    );
    return arr.map(String).join(hasLongItems ? "\n" : ", ");
  },

  /**
   * Format an object for template insertion
   * @param {Object} obj - Object to format
   * @returns {string} Formatted string
   */
  _formatObject(obj) {
    // Check for custom toString method
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
      ([, v]) => typeof v !== "object" || v === null
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

  /**
   * Evaluate a condition for conditional blocks
   * @param {string|Function} condition - Condition to evaluate
   * @param {Object} context - Resolution context
   * @returns {boolean} Condition result
   */
  _evaluateCondition(condition, context) {
    if (typeof condition === "function") {
      return !!condition(context);
    }

    if (typeof condition === "string") {
      // Simple token check - resolve and check truthiness
      const resolved = this._resolveFromContext(condition, context);
      return !!resolved;
    }

    return !!condition;
  },

  /**
   * Apply transforms to a string
   * @param {string} content - Content to transform
   * @param {Array} transforms - Array of transform names
   * @returns {string} Transformed content
   */
  _applyTransforms(content, transforms) {
    if (!transforms || !Array.isArray(transforms)) {
      return content;
    }

    let result = content;
    for (const transform of transforms) {
      switch (transform) {
        case "uppercase":
          result = result.toUpperCase();
          break;
        case "lowercase":
          result = result.toLowerCase();
          break;
        case "capitalize":
          result = result.charAt(0).toUpperCase() + result.slice(1);
          break;
        case "trim":
          result = result.trim();
          break;
        case "truncate":
          if (result.length > 100) {
            result = result.substring(0, 100) + "...";
          }
          break;
        default:
          // Unknown transform - check for parameterized format (e.g., "truncate:200")
          if (transform.includes(":")) {
            const [name, param] = transform.split(":");
            if (name === "truncate" && param) {
              const maxLen = parseInt(param, 10);
              if (!isNaN(maxLen) && result.length > maxLen) {
                result = result.substring(0, maxLen) + "...";
              }
            }
          }
      }
    }

    return result;
  },

  // ===== DEFAULT TOKEN REGISTRATION =====

  /**
   * Register default tokens on initialization
   */
  _registerDefaultTokens() {
    // ST Native tokens (for documentation/UI purposes - resolution handled specially)
    const stNativeTokens = [
      { id: "char", name: "Character Name", description: "The AI character's name" },
      { id: "user", name: "User Name", description: "The user's persona name" },
      { id: "persona", name: "Persona", description: "User's persona description" },
      { id: "description", name: "Character Description", description: "AI character's description" },
      { id: "personality", name: "Personality", description: "AI character's personality" },
      { id: "scenario", name: "Scenario", description: "Current scenario/context" },
      { id: "mesExamples", name: "Message Examples", description: "Example messages" },
      { id: "system", name: "System Prompt", description: "System prompt content" },
      { id: "jailbreak", name: "Jailbreak", description: "Jailbreak prompt" },
      { id: "lastMessage", name: "Last Message", description: "The last message in chat" },
      { id: "time", name: "Current Time", description: "Current time" },
      { id: "date", name: "Current Date", description: "Current date" },
    ];

    for (const token of stNativeTokens) {
      this.registerToken({
        id: token.id,
        name: token.name,
        description: token.description,
        category: "st_native",
        syntax: `{{${token.id}}}`,
      });
    }

    // Pipeline scope tokens
    const pipelineTokens = [
      { id: "pipeline.id", name: "Pipeline ID", description: "Current pipeline identifier" },
      { id: "pipeline.name", name: "Pipeline Name", description: "Current pipeline name" },
      { id: "pipeline.userInput", name: "User Input", description: "Original user input" },
      { id: "pipeline.startedAt", name: "Started At", description: "Pipeline start timestamp" },
    ];

    for (const token of pipelineTokens) {
      this.registerToken({
        ...token,
        category: "pipeline",
        syntax: `{{${token.id}}}`,
      });
    }

    // Phase scope tokens
    const phaseTokens = [
      { id: "phase.id", name: "Phase ID", description: "Current phase identifier" },
      { id: "phase.name", name: "Phase Name", description: "Current phase name" },
      { id: "phase.index", name: "Phase Index", description: "Current phase number (0-based)" },
      { id: "phase.input", name: "Phase Input", description: "Input to this phase" },
      { id: "phase.output", name: "Phase Output", description: "Output from this phase" },
      { id: "previousPhase.output", name: "Previous Phase Output", description: "Output from previous phase" },
    ];

    for (const token of phaseTokens) {
      this.registerToken({
        ...token,
        category: "phase",
        syntax: `{{${token.id}}}`,
      });
    }

    // Action scope tokens
    const actionTokens = [
      { id: "action.id", name: "Action ID", description: "Current action identifier" },
      { id: "action.name", name: "Action Name", description: "Current action name" },
      { id: "action.index", name: "Action Index", description: "Current action number in phase" },
      { id: "input", name: "Action Input", description: "Input to this action" },
      { id: "output", name: "Action Output", description: "Output from this action" },
      { id: "context", name: "Action Context", description: "Combined context for this action" },
      { id: "previousAction.output", name: "Previous Action Output", description: "Output from previous action" },
      { id: "rag.results", name: "RAG Results", description: "Retrieved RAG context" },
    ];

    for (const token of actionTokens) {
      this.registerToken({
        ...token,
        category: "action",
        syntax: `{{${token.id}}}`,
      });
    }

    // Global scope tokens
    const globalTokens = [
      { id: "globals.instructions", name: "Instructions", description: "User instructions global" },
      { id: "globals.outlineDraft", name: "Outline Draft", description: "Current outline draft" },
      { id: "globals.finalOutline", name: "Final Outline", description: "Approved outline" },
      { id: "globals.firstDraft", name: "First Draft", description: "First draft content" },
      { id: "globals.secondDraft", name: "Second Draft", description: "Second draft content" },
      { id: "globals.finalDraft", name: "Final Draft", description: "Final draft content" },
      { id: "globals.commentary", name: "Commentary", description: "Team commentary" },
    ];

    for (const token of globalTokens) {
      this.registerToken({
        ...token,
        category: "global",
        syntax: `{{${token.id}}}`,
      });
    }

    // Agent/Position tokens
    const agentTokens = [
      { id: "agent.id", name: "Agent ID", description: "Current agent identifier" },
      { id: "agent.name", name: "Agent Name", description: "Current agent name" },
      { id: "agent.systemPrompt", name: "Agent System Prompt", description: "Agent's system prompt" },
      { id: "position.id", name: "Position ID", description: "Current position identifier" },
      { id: "position.name", name: "Position Name", description: "Current position name" },
      { id: "position.tier", name: "Position Tier", description: "Position tier (executive/leader/member)" },
      { id: "position.roleDescription", name: "Role Description", description: "Position's role description" },
    ];

    for (const token of agentTokens) {
      this.registerToken({
        ...token,
        category: "agent",
        syntax: `{{${token.id}}}`,
      });
    }

    // Team tokens
    const teamTokens = [
      { id: "team.id", name: "Team ID", description: "Current team identifier" },
      { id: "team.name", name: "Team Name", description: "Current team name" },
      { id: "team.leader", name: "Team Leader", description: "Team leader information" },
      { id: "team.members", name: "Team Members", description: "List of team members" },
      { id: "team.output", name: "Team Output", description: "Team's consolidated output" },
    ];

    for (const token of teamTokens) {
      this.registerToken({
        ...token,
        category: "team",
        syntax: `{{${token.id}}}`,
      });
    }

    // Store tokens
    const storeTokens = [
      { id: "store.characterSheets", name: "Character Sheets", description: "All character sheet entries" },
      { id: "store.plotPoints", name: "Plot Points", description: "All plot point entries" },
      { id: "store.worldState", name: "World State", description: "Current world state (singleton)" },
      { id: "store.scenes", name: "Scenes", description: "All scene entries" },
      { id: "store.locations", name: "Locations", description: "All location entries" },
    ];

    for (const token of storeTokens) {
      this.registerToken({
        ...token,
        category: "store",
        syntax: `{{${token.id}}}`,
      });
    }

    this._log("debug", `Registered ${this._tokens.size} default tokens`);
  },

  // ===== PRESET INTEGRATION =====

  /**
   * Apply preset data to the system
   * @param {Object} preset - Preset object
   * @param {Object} options - Application options
   * @returns {Object} Result
   */
  applyPreset(preset, options = {}) {
    const result = {
      tokensRegistered: 0,
      macrosRegistered: 0,
    };

    // Register custom tokens from preset
    if (preset.customTokens && Array.isArray(preset.customTokens)) {
      for (const token of preset.customTokens) {
        if (this.registerToken({ ...token, category: "custom" })) {
          result.tokensRegistered++;
        }
      }
    }

    // Future: Register macros from preset
    if (preset.macros && Array.isArray(preset.macros)) {
      // TODO: Implement macro registration
      result.macrosRegistered = preset.macros.length;
    }

    this._log("info", `Preset applied: ${result.tokensRegistered} tokens registered`);
    return result;
  },

  /**
   * Export preset data from current state
   * @returns {Object} Preset data
   */
  exportPresetData() {
    // Get custom tokens only
    const customTokens = this.getAllTokens("custom").map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      syntax: t.syntax,
      metadata: t.metadata,
    }));

    return {
      customTokens,
      // Future: macros, presets, etc.
    };
  },

  // ===== SUMMARY =====

  /**
   * Get system summary
   * @returns {Object} Summary object
   */
  getSummary() {
    const tokensByCategory = this.getTokensByCategory();
    const categoryCounts = {};
    for (const [cat, tokens] of Object.entries(tokensByCategory)) {
      categoryCounts[cat] = tokens.length;
    }

    return {
      version: this.VERSION,
      initialized: this._initialized,
      totalTokens: this._tokens.size,
      tokensByCategory: categoryCounts,
    };
  },

  // ===== LOGGING & EVENTS =====

  /**
   * Log a message
   * @param {string} level - Log level
   * @param {string} message - Message
   * @param {...any} args - Additional arguments
   */
  _log(level, message, ...args) {
    if (this._logger && typeof this._logger[level] === "function") {
      this._logger[level](`[PromptBuilder] ${message}`, ...args);
    } else if (this._kernel) {
      const logger = this._kernel.getModule("logger");
      if (logger && typeof logger[level] === "function") {
        logger[level](`[PromptBuilder] ${message}`, ...args);
      } else {
        console[level === "error" ? "error" : level === "warn" ? "warn" : "log"](
          `[The_Council][PromptBuilder] ${message}`,
          ...args
        );
      }
    } else {
      console[level === "error" ? "error" : level === "warn" ? "warn" : "log"](
        `[The_Council][PromptBuilder] ${message}`,
        ...args
      );
    }
  },

  /**
   * Emit an event via Kernel
   * @param {string} event - Event name
   * @param {any} data - Event data
   */
  _emit(event, data) {
    if (this._eventBus && typeof this._eventBus.emit === "function") {
      this._eventBus.emit(event, data);
    } else if (this._kernel && typeof this._kernel.emit === "function") {
      this._kernel.emit(event, data);
    }
  },
};

// ===== EXPORT =====

// Expose to window
if (typeof window !== "undefined") {
  window.PromptBuilderSystem = PromptBuilderSystem;
}

// CommonJS export
if (typeof module !== "undefined" && module.exports) {
  module.exports = PromptBuilderSystem;
}
