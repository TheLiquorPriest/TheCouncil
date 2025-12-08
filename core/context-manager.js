/**
 * TheCouncil - Context Manager
 *
 * Core module for managing context assembly and routing:
 * - Static context (character card, world info, persona, scenario)
 * - Global context (pipeline-level variables)
 * - Phase context (phase-scoped data)
 * - Team context (team-specific data)
 * - Store context (data from curation stores)
 *
 * Context is assembled based on configuration and passed to actions
 * during pipeline execution.
 *
 * @version 2.0.0
 */

const ContextManager = {
  // ===== VERSION =====
  VERSION: "2.0.0",

  // ===== CONTEXT BLOCK TYPES =====
  BlockType: {
    STATIC: "static",
    GLOBAL: "global",
    PHASE: "phase",
    TEAM: "team",
    STORE: "store",
    RAG: "rag",
    CUSTOM: "custom",
  },

  // ===== STATE =====

  /**
   * Static context cache
   * @type {Object}
   */
  _staticContext: {},

  /**
   * Custom context blocks
   * @type {Map<string, Object>}
   */
  _customBlocks: new Map(),

  /**
   * Dependencies
   */
  _curationSystem: null,
  _tokenResolver: null,
  _logger: null,

  /**
   * SillyTavern integration helpers
   * @type {Object}
   */
  _stHelpers: null,

  /**
   * Event listeners
   * @type {Map<string, Function[]>}
   */
  _listeners: new Map(),

  /**
   * Initialization flag
   * @type {boolean}
   */
  _initialized: false,

  // ===== INITIALIZATION =====

  /**
   * Initialize the Context Manager
   * @param {Object} options - Configuration options
   * @returns {ContextManager}
   */
  init(options = {}) {
    if (this._initialized) {
      this._log("warn", "ContextManager already initialized");
      return this;
    }

    this._log("info", "Initializing Context Manager...");

    this._logger = options.logger || null;
    this._curationSystem = options.curationSystem || null;
    this._tokenResolver = options.tokenResolver || null;
    this._stHelpers = options.stHelpers || null;

    this.clear();

    this._initialized = true;
    this._log("info", "Context Manager initialized");
    this._emit("system:initialized");

    return this;
  },

  /**
   * Check if system is initialized
   * @returns {boolean}
   */
  isInitialized() {
    return this._initialized;
  },

  /**
   * Clear all cached context
   */
  clear() {
    this._staticContext = {};
    this._customBlocks.clear();
  },

  // ===== STATIC CONTEXT =====

  /**
   * Load static context from SillyTavern
   * @param {Object} config - Static context configuration
   * @returns {Object} Static context
   */
  async loadStaticContext(config = {}) {
    const context = {};

    // Character card
    if (config.includeCharacterCard !== false) {
      context.characterCard = await this._getCharacterCard();
    }

    // World info
    if (config.includeWorldInfo !== false) {
      context.worldInfo = await this._getWorldInfo();
    }

    // Persona
    if (config.includePersona !== false) {
      context.persona = await this._getPersona();
    }

    // Scenario
    if (config.includeScenario !== false) {
      context.scenario = await this._getScenario();
    }

    // Custom static entries
    if (config.custom) {
      context.custom = { ...config.custom };
    }

    this._staticContext = context;
    this._emit("static:loaded", { context });

    return context;
  },

  /**
   * Get character card from ST
   * @returns {Promise<Object>}
   */
  async _getCharacterCard() {
    if (this._stHelpers?.getCharacterCard) {
      return await this._stHelpers.getCharacterCard();
    }
    // Fallback to global ST context if available
    if (typeof SillyTavern !== "undefined" && SillyTavern.getContext) {
      const ctx = SillyTavern.getContext();
      return {
        name: ctx.name2 || "",
        description: ctx.description || "",
        personality: ctx.personality || "",
        scenario: ctx.scenario || "",
        firstMessage: ctx.first_mes || "",
        mesExamples: ctx.mes_example || "",
      };
    }
    return {};
  },

  /**
   * Get world info from ST
   * @returns {Promise<Object>}
   */
  async _getWorldInfo() {
    if (this._stHelpers?.getWorldInfo) {
      return await this._stHelpers.getWorldInfo();
    }
    return {};
  },

  /**
   * Get user persona from ST
   * @returns {Promise<Object>}
   */
  async _getPersona() {
    if (this._stHelpers?.getPersona) {
      return await this._stHelpers.getPersona();
    }
    if (typeof SillyTavern !== "undefined" && SillyTavern.getContext) {
      const ctx = SillyTavern.getContext();
      return {
        name: ctx.name1 || "User",
        description: ctx.persona || "",
      };
    }
    return { name: "User", description: "" };
  },

  /**
   * Get scenario from ST
   * @returns {Promise<string>}
   */
  async _getScenario() {
    if (this._stHelpers?.getScenario) {
      return await this._stHelpers.getScenario();
    }
    if (typeof SillyTavern !== "undefined" && SillyTavern.getContext) {
      return SillyTavern.getContext().scenario || "";
    }
    return "";
  },

  /**
   * Get cached static context
   * @returns {Object}
   */
  getStaticContext() {
    return { ...this._staticContext };
  },

  /**
   * Update static context entry
   * @param {string} key - Entry key
   * @param {*} value - Entry value
   */
  setStaticEntry(key, value) {
    this._staticContext[key] = value;
    this._emit("static:updated", { key, value });
  },

  // ===== CONTEXT ASSEMBLY =====

  /**
   * Build context for an action
   * @param {Object} options - Build options
   * @returns {Promise<Object>} Assembled context
   */
  async buildContext(options = {}) {
    const {
      config = {},
      phase = null,
      action = null,
      globals = {},
      teamId = null,
      runState = null,
    } = options;

    const context = {
      static: {},
      global: {},
      phase: {},
      team: {},
      stores: {},
      rag: {},
      custom: {},
    };

    // Static context
    if (config.static && config.static.length > 0) {
      for (const key of config.static) {
        if (this._staticContext[key] !== undefined) {
          context.static[key] = this._staticContext[key];
        }
      }
    } else {
      context.static = { ...this._staticContext };
    }

    // Global context
    if (config.global && config.global.length > 0) {
      for (const key of config.global) {
        if (globals[key] !== undefined) {
          context.global[key] = globals[key];
        }
      }
    } else {
      context.global = { ...globals };
    }

    // Phase context
    if (phase && config.phase && config.phase.length > 0) {
      for (const key of config.phase) {
        if (phase[key] !== undefined) {
          context.phase[key] = phase[key];
        }
      }
    }

    // Team context
    if (teamId && runState?.teamContext?.[teamId]) {
      context.team = { ...runState.teamContext[teamId] };
    }

    // Store context
    if (config.stores && config.stores.length > 0 && this._curationSystem) {
      for (const storeId of config.stores) {
        try {
          context.stores[storeId] = this._curationSystem.read(storeId);
        } catch (e) {
          this._log("warn", `Failed to load store ${storeId}:`, e.message);
        }
      }
    }

    // Apply action context overrides
    if (action?.contextOverrides) {
      this._applyOverrides(context, action.contextOverrides);
    }

    // Custom blocks
    for (const [key, block] of this._customBlocks) {
      context.custom[key] = block.data;
    }

    this._emit("context:built", { context, options });

    return context;
  },

  /**
   * Apply context overrides from action config
   * @param {Object} context - Context object
   * @param {Object} overrides - Override config
   */
  _applyOverrides(context, overrides) {
    // Exclude specified keys
    if (overrides.exclude && overrides.exclude.length > 0) {
      for (const key of overrides.exclude) {
        const [section, subKey] = key.split(".");
        if (section && context[section]) {
          if (subKey) {
            delete context[section][subKey];
          } else {
            context[section] = {};
          }
        }
      }
    }

    // Include additional keys (already handled in buildContext)
    // Priority keys are for ordering in prompt (handled in formatting)
  },

  // ===== CONTEXT FORMATTING =====

  /**
   * Format context for prompt injection
   * @param {Object} context - Assembled context
   * @param {Object} options - Formatting options
   * @returns {string} Formatted context string
   */
  formatContext(context, options = {}) {
    const {
      format = "markdown",
      sections = ["static", "global", "phase", "team", "stores"],
      priority = [],
      maxLength = null,
    } = options;

    const parts = [];

    // Process priority items first
    for (const key of priority) {
      const value = this._getNestedValue(context, key);
      if (value !== undefined) {
        parts.push(this._formatValue(key, value, format));
      }
    }

    // Process sections
    for (const section of sections) {
      if (!context[section] || typeof context[section] !== "object") continue;

      for (const [key, value] of Object.entries(context[section])) {
        const fullKey = `${section}.${key}`;
        if (
          !priority.includes(fullKey) &&
          value !== undefined &&
          value !== null
        ) {
          parts.push(this._formatValue(key, value, format));
        }
      }
    }

    let result = parts.join("\n\n");

    // Truncate if needed
    if (maxLength && result.length > maxLength) {
      result = result.substring(0, maxLength - 3) + "...";
    }

    return result;
  },

  /**
   * Get nested value from object
   * @param {Object} obj - Object to search
   * @param {string} path - Dot-separated path
   * @returns {*} Value or undefined
   */
  _getNestedValue(obj, path) {
    const parts = path.split(".");
    let current = obj;
    for (const part of parts) {
      if (current === undefined || current === null) return undefined;
      current = current[part];
    }
    return current;
  },

  /**
   * Format a single value for context
   * @param {string} key - Value key
   * @param {*} value - Value to format
   * @param {string} format - Output format
   * @returns {string} Formatted value
   */
  _formatValue(key, value, format) {
    const label = this._formatLabel(key);

    if (typeof value === "string") {
      if (format === "markdown") {
        return `### ${label}\n${value}`;
      }
      return `[${label}]\n${value}`;
    }

    if (Array.isArray(value)) {
      const items = value.map((v) =>
        typeof v === "object" ? JSON.stringify(v) : String(v),
      );
      if (format === "markdown") {
        return `### ${label}\n${items.map((i) => `- ${i}`).join("\n")}`;
      }
      return `[${label}]\n${items.join("\n")}`;
    }

    if (typeof value === "object") {
      if (format === "markdown") {
        return `### ${label}\n\`\`\`json\n${JSON.stringify(value, null, 2)}\n\`\`\``;
      }
      return `[${label}]\n${JSON.stringify(value, null, 2)}`;
    }

    return `${label}: ${value}`;
  },

  /**
   * Format a key into a readable label
   * @param {string} key - Key to format
   * @returns {string} Formatted label
   */
  _formatLabel(key) {
    return key
      .replace(/([A-Z])/g, " $1")
      .replace(/[._-]/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .trim();
  },

  // ===== CUSTOM BLOCKS =====

  /**
   * Register a custom context block
   * @param {string} id - Block ID
   * @param {Object} block - Block definition
   */
  registerBlock(id, block) {
    this._customBlocks.set(id, {
      id,
      name: block.name || id,
      type: block.type || this.BlockType.CUSTOM,
      data: block.data || {},
      updatedAt: Date.now(),
    });
    this._emit("block:registered", { id, block });
  },

  /**
   * Update a custom block's data
   * @param {string} id - Block ID
   * @param {*} data - New data
   */
  updateBlock(id, data) {
    const block = this._customBlocks.get(id);
    if (block) {
      block.data = data;
      block.updatedAt = Date.now();
      this._emit("block:updated", { id, data });
    }
  },

  /**
   * Remove a custom block
   * @param {string} id - Block ID
   * @returns {boolean} Success
   */
  removeBlock(id) {
    const result = this._customBlocks.delete(id);
    if (result) {
      this._emit("block:removed", { id });
    }
    return result;
  },

  /**
   * Get a custom block
   * @param {string} id - Block ID
   * @returns {Object|null}
   */
  getBlock(id) {
    return this._customBlocks.get(id) || null;
  },

  /**
   * Get all custom blocks
   * @returns {Object[]}
   */
  getAllBlocks() {
    return Array.from(this._customBlocks.values());
  },

  // ===== RAG CONTEXT =====

  /**
   * Add RAG results to context
   * @param {Object} context - Context object
   * @param {Object} ragResults - RAG query results
   * @param {Object} options - Options
   * @returns {Object} Updated context
   */
  addRAGContext(context, ragResults, options = {}) {
    if (!ragResults || !ragResults.results) {
      return context;
    }

    const { maxResults = 10, formatAsText = true } = options;

    const results = ragResults.results.slice(0, maxResults);

    if (formatAsText) {
      context.rag = {
        query: ragResults.query,
        summary: results
          .map((r) => {
            const name = r.entry?.name || r.entry?.title || r.key || "Item";
            const content =
              r.entry?.description ||
              r.entry?.summary ||
              r.entry?.content ||
              "";
            return `[${r.storeName}] ${name}: ${content}`;
          })
          .join("\n\n"),
        count: results.length,
      };
    } else {
      context.rag = ragResults;
    }

    return context;
  },

  // ===== CONTEXT ROUTING =====

  /**
   * Route context to appropriate targets
   * @param {Object} context - Context object
   * @param {Object} routingConfig - Routing configuration
   * @returns {Object} Routed context map
   */
  routeContext(context, routingConfig = {}) {
    const routed = {};

    // Route to teams
    if (routingConfig.teams) {
      for (const teamId of routingConfig.teams) {
        routed[`team:${teamId}`] = {
          ...context,
          team: context.team?.[teamId] || {},
        };
      }
    }

    // Route to positions
    if (routingConfig.positions) {
      for (const positionId of routingConfig.positions) {
        routed[`position:${positionId}`] = { ...context };
      }
    }

    // Default route
    routed.default = context;

    return routed;
  },

  // ===== SUMMARY =====

  /**
   * Get system summary
   * @returns {Object}
   */
  getSummary() {
    return {
      version: this.VERSION,
      initialized: this._initialized,
      staticContextKeys: Object.keys(this._staticContext),
      customBlockCount: this._customBlocks.size,
      customBlocks: Array.from(this._customBlocks.keys()),
    };
  },

  // ===== EVENT SYSTEM =====

  on(event, callback) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, []);
    }
    this._listeners.get(event).push(callback);
    return () => this.off(event, callback);
  },

  off(event, callback) {
    const listeners = this._listeners.get(event);
    if (listeners) {
      const idx = listeners.indexOf(callback);
      if (idx > -1) listeners.splice(idx, 1);
    }
  },

  _emit(event, data = {}) {
    const listeners = this._listeners.get(event);
    if (listeners) {
      for (const callback of listeners) {
        try {
          callback(data);
        } catch (e) {
          this._log("error", `Event handler error for ${event}:`, e);
        }
      }
    }
  },

  // ===== LOGGING =====

  _log(level, message, ...args) {
    if (this._logger && typeof this._logger[level] === "function") {
      this._logger[level](`[ContextManager] ${message}`, ...args);
    }
  },
};

// Export for different environments
if (typeof window !== "undefined") {
  window.ContextManager = ContextManager;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = ContextManager;
}
