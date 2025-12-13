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
 * - Macro system (parameterized reusable prompt fragments)
 * - Preset prompts (save/load prompt configurations)
 *
 * @version 2.1.0
 */

const PromptBuilderSystem = {
  // ===== VERSION =====
  VERSION: "2.1.0",

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
   * Macro registry - stores all registered macros
   * @type {Map<string, Object>}
   */
  _macros: new Map(),

  /**
   * Prompt presets registry - stores saved prompt configurations
   * @type {Map<string, Object>}
   */
  _promptPresets: new Map(),

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
   * Macro categories for organization
   */
  MACRO_CATEGORIES: {
    SYSTEM: {
      id: "system",
      name: "System Prompts",
      description: "System prompt macros",
    },
    ROLE: {
      id: "role",
      name: "Role Prompts",
      description: "Role definition macros",
    },
    ACTION: {
      id: "action",
      name: "Action Instructions",
      description: "Action instruction macros",
    },
    COMMON: {
      id: "common",
      name: "Common Fragments",
      description: "Commonly used prompt fragments",
    },
    CUSTOM: {
      id: "custom",
      name: "Custom Macros",
      description: "User-defined custom macros",
    },
  },

  /**
   * Prompt preset categories
   */
  PRESET_CATEGORIES: {
    SYSTEM: {
      id: "system",
      name: "System Prompts",
      description: "System prompt presets",
    },
    ROLE: {
      id: "role",
      name: "Role Prompts",
      description: "Role prompt presets",
    },
    ACTION: {
      id: "action",
      name: "Action Instructions",
      description: "Action instruction presets",
    },
    CUSTOM: {
      id: "custom",
      name: "Custom Presets",
      description: "User-defined presets",
    },
  },

  /**
   * Macro pattern: matches {{macro:id param="value"}}
   */
  MACRO_PATTERN: /\{\{macro:([a-zA-Z_][a-zA-Z0-9_]*)(?:\s+([^}]+))?\}\}/g,

  /**
   * Conditional block pattern: {{#if condition}}...{{else}}...{{/if}}
   */
  CONDITIONAL_PATTERN: /\{\{#(if|unless)\s+([^}]+)\}\}([\s\S]*?)(?:\{\{else\}\}([\s\S]*?))?\{\{\/\1\}\}/g,

  /**
   * Transform pipeline pattern: {{token | transform1 | transform2:arg}}
   */
  TRANSFORM_PATTERN: /\{\{([^|}]+)\s*\|([^}]+)\}\}/g,

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

    // Initialize macro registry with default macros
    this._registerDefaultMacros();

    // Load persisted prompt presets from storage
    this._loadPresets();

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

  // ===== MACRO SYSTEM API =====

  /**
   * Register a macro (reusable prompt fragment)
   * @param {Object} macro - Macro definition
   * @param {string} macro.id - Unique macro identifier
   * @param {string} macro.name - Human-readable name
   * @param {string} macro.description - Macro description
   * @param {string} macro.category - Macro category (system, role, action, common, custom)
   * @param {string} macro.template - Template string with {{param}} placeholders
   * @param {Array} macro.parameters - Array of parameter definitions
   * @param {Object} macro.metadata - Additional metadata
   * @returns {boolean} Success
   */
  registerMacro(macro) {
    if (!macro || !macro.id) {
      this._log("error", "Macro registration failed: missing id");
      return false;
    }

    if (!macro.template) {
      this._log("error", "Macro registration failed: missing template");
      return false;
    }

    const macroDef = {
      id: macro.id,
      name: macro.name || macro.id,
      description: macro.description || "",
      category: macro.category || "custom",
      template: macro.template,
      parameters: this._normalizeParameters(macro.parameters || []),
      metadata: macro.metadata || {},
      registeredAt: Date.now(),
      updatedAt: Date.now(),
    };

    this._macros.set(macro.id, macroDef);
    this._log("debug", `Macro registered: ${macro.id}`);
    this._emit("promptBuilder:macro:registered", { macro: macroDef });

    return true;
  },

  /**
   * Normalize parameter definitions
   * @param {Array} parameters - Raw parameter definitions
   * @returns {Array} Normalized parameters
   */
  _normalizeParameters(parameters) {
    if (!Array.isArray(parameters)) {
      return [];
    }

    return parameters.map((param) => {
      if (typeof param === "string") {
        return { name: param, required: false, default: "" };
      }
      return {
        name: param.name || param.id,
        required: param.required === true,
        default: param.default !== undefined ? param.default : "",
        description: param.description || "",
        type: param.type || "string",
      };
    });
  },

  /**
   * Unregister a macro
   * @param {string} macroId - Macro ID to remove
   * @returns {boolean} Success
   */
  unregisterMacro(macroId) {
    if (!this._macros.has(macroId)) {
      return false;
    }

    this._macros.delete(macroId);
    this._log("debug", `Macro unregistered: ${macroId}`);
    this._emit("promptBuilder:macro:unregistered", { macroId });

    return true;
  },

  /**
   * Get a macro definition by ID
   * @param {string} macroId - Macro ID
   * @returns {Object|null} Macro definition or null
   */
  getMacro(macroId) {
    return this._macros.get(macroId) || null;
  },

  /**
   * Get all macros, optionally filtered by category
   * @param {string} category - Category ID to filter by (optional)
   * @returns {Object[]} Array of macro definitions
   */
  getAllMacros(category = null) {
    const macros = Array.from(this._macros.values());

    if (category) {
      return macros.filter((m) => m.category === category);
    }

    return macros;
  },

  /**
   * Get macros grouped by category
   * @returns {Object} Map of category -> macros[]
   */
  getMacrosByCategory() {
    const result = {};

    for (const macro of this._macros.values()) {
      const cat = macro.category;
      if (!result[cat]) {
        result[cat] = [];
      }
      result[cat].push(macro);
    }

    return result;
  },

  /**
   * Search macros by name, description, or ID
   * @param {string} query - Search query
   * @returns {Object[]} Matching macros
   */
  searchMacros(query) {
    if (!query) {
      return this.getAllMacros();
    }

    const lowerQuery = query.toLowerCase();
    return Array.from(this._macros.values()).filter((macro) => {
      return (
        macro.id.toLowerCase().includes(lowerQuery) ||
        macro.name.toLowerCase().includes(lowerQuery) ||
        macro.description.toLowerCase().includes(lowerQuery)
      );
    });
  },

  /**
   * Check if a macro is registered
   * @param {string} macroId - Macro ID
   * @returns {boolean}
   */
  hasMacro(macroId) {
    return this._macros.has(macroId);
  },

  /**
   * Expand a macro with parameters
   * @param {string} macroId - Macro ID
   * @param {Object} params - Parameter values
   * @param {Object} context - Resolution context for nested tokens
   * @returns {string} Expanded macro or empty string
   */
  expandMacro(macroId, params = {}, context = {}) {
    const macro = this._macros.get(macroId);
    if (!macro) {
      this._log("warn", `Macro not found: ${macroId}`);
      return "";
    }

    let result = macro.template;

    // Apply parameter values
    for (const param of macro.parameters) {
      const value = params[param.name] !== undefined
        ? params[param.name]
        : param.default;

      // Replace {{paramName}} in template
      const paramPattern = new RegExp(`\\{\\{${param.name}\\}\\}`, "g");
      result = result.replace(paramPattern, this._stringify(value));
    }

    // Resolve any remaining tokens in the expanded template
    result = this.resolveTemplate(result, context);

    this._log("debug", `Macro expanded: ${macroId}`);
    this._emit("promptBuilder:macro:expanded", { macroId, params, result });

    return result;
  },

  /**
   * Update an existing macro
   * @param {string} macroId - Macro ID
   * @param {Object} updates - Updates to apply
   * @returns {boolean} Success
   */
  updateMacro(macroId, updates) {
    const macro = this._macros.get(macroId);
    if (!macro) {
      return false;
    }

    const updatedMacro = {
      ...macro,
      ...updates,
      id: macroId, // Prevent ID change
      updatedAt: Date.now(),
    };

    if (updates.parameters) {
      updatedMacro.parameters = this._normalizeParameters(updates.parameters);
    }

    this._macros.set(macroId, updatedMacro);
    this._log("debug", `Macro updated: ${macroId}`);
    this._emit("promptBuilder:macro:updated", { macro: updatedMacro });

    return true;
  },

  // ===== PROMPT PRESET API =====

  /**
   * Save a prompt preset
   * @param {Object} preset - Preset definition
   * @param {string} preset.id - Unique preset identifier (auto-generated if not provided)
   * @param {string} preset.name - Human-readable name
   * @param {string} preset.description - Preset description
   * @param {string} preset.category - Preset category (system, role, action, custom)
   * @param {Object} preset.config - Prompt configuration
   * @param {Object} preset.metadata - Additional metadata
   * @returns {Object|null} Saved preset or null on failure
   */
  savePromptPreset(preset) {
    if (!preset || !preset.name) {
      this._log("error", "Preset save failed: missing name");
      return null;
    }

    const id = preset.id || `preset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const presetDef = {
      id,
      name: preset.name,
      description: preset.description || "",
      category: preset.category || "custom",
      config: preset.config || {
        mode: "custom",
        customPrompt: "",
        tokens: [],
      },
      metadata: {
        ...preset.metadata,
        createdAt: preset.metadata?.createdAt || Date.now(),
        updatedAt: Date.now(),
        tags: preset.metadata?.tags || [],
      },
    };

    this._promptPresets.set(id, presetDef);
    this._log("info", `Prompt preset saved: ${preset.name}`);
    this._emit("promptBuilder:preset:saved", { preset: presetDef });

    // Persist to storage if kernel is available
    this._persistPresets();

    return presetDef;
  },

  /**
   * Load a prompt preset by ID
   * @param {string} presetId - Preset ID
   * @returns {Object|null} Preset definition or null
   */
  loadPromptPreset(presetId) {
    const preset = this._promptPresets.get(presetId);
    if (preset) {
      this._emit("promptBuilder:preset:loaded", { preset });
    }
    return preset || null;
  },

  /**
   * Get all prompt presets, optionally filtered by category
   * @param {string} category - Category ID to filter by (optional)
   * @returns {Object[]} Array of preset definitions
   */
  getAllPromptPresets(category = null) {
    const presets = Array.from(this._promptPresets.values());

    if (category) {
      return presets.filter((p) => p.category === category);
    }

    return presets;
  },

  /**
   * Get prompt presets grouped by category
   * @returns {Object} Map of category -> presets[]
   */
  getPresetsByCategory() {
    const result = {};

    for (const preset of this._promptPresets.values()) {
      const cat = preset.category;
      if (!result[cat]) {
        result[cat] = [];
      }
      result[cat].push(preset);
    }

    return result;
  },

  /**
   * Search prompt presets by name, description, or tags
   * @param {string} query - Search query
   * @returns {Object[]} Matching presets
   */
  searchPresets(query) {
    if (!query) {
      return this.getAllPromptPresets();
    }

    const lowerQuery = query.toLowerCase();
    return Array.from(this._promptPresets.values()).filter((preset) => {
      const matchesName = preset.name.toLowerCase().includes(lowerQuery);
      const matchesDesc = preset.description.toLowerCase().includes(lowerQuery);
      const matchesTags = preset.metadata?.tags?.some(
        (tag) => tag.toLowerCase().includes(lowerQuery)
      );
      return matchesName || matchesDesc || matchesTags;
    });
  },

  /**
   * Update an existing prompt preset
   * @param {string} presetId - Preset ID
   * @param {Object} updates - Updates to apply
   * @returns {boolean} Success
   */
  updatePromptPreset(presetId, updates) {
    const preset = this._promptPresets.get(presetId);
    if (!preset) {
      return false;
    }

    const updatedPreset = {
      ...preset,
      ...updates,
      id: presetId, // Prevent ID change
      metadata: {
        ...preset.metadata,
        ...updates.metadata,
        updatedAt: Date.now(),
      },
    };

    this._promptPresets.set(presetId, updatedPreset);
    this._log("debug", `Preset updated: ${presetId}`);
    this._emit("promptBuilder:preset:updated", { preset: updatedPreset });

    this._persistPresets();

    return true;
  },

  /**
   * Delete a prompt preset
   * @param {string} presetId - Preset ID to delete
   * @returns {boolean} Success
   */
  deletePromptPreset(presetId) {
    if (!this._promptPresets.has(presetId)) {
      return false;
    }

    this._promptPresets.delete(presetId);
    this._log("debug", `Preset deleted: ${presetId}`);
    this._emit("promptBuilder:preset:deleted", { presetId });

    this._persistPresets();

    return true;
  },

  /**
   * Persist presets to storage
   */
  _persistPresets() {
    if (this._kernel && this._kernel.setStorage) {
      const presetsData = Array.from(this._promptPresets.values());
      this._kernel.setStorage("promptBuilder.presets", presetsData);
    }
  },

  /**
   * Load presets from storage
   */
  _loadPresets() {
    if (this._kernel && this._kernel.getStorage) {
      const presetsData = this._kernel.getStorage("promptBuilder.presets");
      if (Array.isArray(presetsData)) {
        for (const preset of presetsData) {
          this._promptPresets.set(preset.id, preset);
        }
        this._log("info", `Loaded ${presetsData.length} prompt presets from storage`);
      }
    }
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
   * Supports: {{token}}, {{macro:id param="value"}}, {{#if}}...{{/if}}, {{token | transform}}
   * @param {string} template - Template string with {{tokens}}
   * @param {Object} context - Resolution context
   * @param {Object} options - Resolution options
   * @param {boolean} options.preserveUnresolved - Keep unresolved tokens as-is (default: true)
   * @param {string} options.unresolvedPlaceholder - Placeholder for unresolved tokens
   * @param {boolean} options.passSTMacros - Pass ST macros through unresolved (default: true)
   * @param {boolean} options.expandMacros - Expand macro invocations (default: true)
   * @param {boolean} options.processConditionals - Process conditional blocks (default: true)
   * @param {boolean} options.applyTransforms - Apply transform pipelines (default: true)
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
      expandMacros: options.expandMacros !== false,
      processConditionals: options.processConditionals !== false,
      applyTransforms: options.applyTransforms !== false,
    };

    let result = template;

    // Step 1: Process conditional blocks {{#if}}...{{else}}...{{/if}}
    if (opts.processConditionals) {
      result = this._processConditionals(result, context, opts);
    }

    // Step 2: Expand macros {{macro:id param="value"}}
    if (opts.expandMacros) {
      result = this._expandMacrosInTemplate(result, context, opts);
    }

    // Step 3: Process transform pipelines {{token | transform}}
    if (opts.applyTransforms) {
      result = this._processTransformPipelines(result, context, opts);
    }

    // Step 4: Resolve standard tokens {{token}}
    result = this._resolveStandardTokens(result, context, opts);

    return result;
  },

  /**
   * Process conditional blocks in template
   * @param {string} template - Template with conditionals
   * @param {Object} context - Resolution context
   * @param {Object} opts - Options
   * @returns {string} Processed template
   */
  _processConditionals(template, context, opts) {
    // Process {{#if condition}}...{{else}}...{{/if}} and {{#unless}}
    const pattern = new RegExp(this.CONDITIONAL_PATTERN.source, "g");

    return template.replace(pattern, (match, type, condition, thenContent, elseContent) => {
      try {
        const conditionResult = this._evaluateConditionExpression(condition.trim(), context);
        const shouldShow = type === "if" ? conditionResult : !conditionResult;

        if (shouldShow) {
          return thenContent ? this.resolveTemplate(thenContent, context, opts) : "";
        } else {
          return elseContent ? this.resolveTemplate(elseContent, context, opts) : "";
        }
      } catch (error) {
        this._log("warn", `Error processing conditional "${condition}":`, error);
        return opts.preserveUnresolved ? match : "";
      }
    });
  },

  /**
   * Evaluate a condition expression
   * Supports: simple token truthiness, comparison operators, boolean operators
   * @param {string} condition - Condition expression
   * @param {Object} context - Resolution context
   * @returns {boolean} Condition result
   */
  _evaluateConditionExpression(condition, context) {
    // Handle comparison operators: ==, !=, <, >, <=, >=
    const comparisonMatch = condition.match(/^(.+?)\s*(==|!=|<=|>=|<|>)\s*(.+)$/);
    if (comparisonMatch) {
      const [, left, operator, right] = comparisonMatch;
      const leftValue = this._resolveConditionValue(left.trim(), context);
      const rightValue = this._resolveConditionValue(right.trim(), context);

      switch (operator) {
        case "==": return leftValue == rightValue;
        case "!=": return leftValue != rightValue;
        case "<": return leftValue < rightValue;
        case ">": return leftValue > rightValue;
        case "<=": return leftValue <= rightValue;
        case ">=": return leftValue >= rightValue;
      }
    }

    // Handle boolean operators: && and ||
    if (condition.includes("&&")) {
      const parts = condition.split("&&").map((p) => p.trim());
      return parts.every((p) => this._evaluateConditionExpression(p, context));
    }

    if (condition.includes("||")) {
      const parts = condition.split("||").map((p) => p.trim());
      return parts.some((p) => this._evaluateConditionExpression(p, context));
    }

    // Handle negation: !condition
    if (condition.startsWith("!")) {
      return !this._evaluateConditionExpression(condition.slice(1).trim(), context);
    }

    // Simple truthiness check
    const value = this._resolveConditionValue(condition, context);
    return !!value;
  },

  /**
   * Resolve a value in condition expression
   * @param {string} expr - Expression (token path or literal)
   * @param {Object} context - Resolution context
   * @returns {any} Resolved value
   */
  _resolveConditionValue(expr, context) {
    // Check for string literals (quoted)
    if ((expr.startsWith('"') && expr.endsWith('"')) ||
        (expr.startsWith("'") && expr.endsWith("'"))) {
      return expr.slice(1, -1);
    }

    // Check for number literals
    const numValue = Number(expr);
    if (!isNaN(numValue)) {
      return numValue;
    }

    // Check for boolean literals
    if (expr === "true") return true;
    if (expr === "false") return false;
    if (expr === "null") return null;
    if (expr === "undefined") return undefined;

    // Treat as token path
    return this._resolveFromContext(expr, context);
  },

  /**
   * Expand macros in template
   * @param {string} template - Template with macros
   * @param {Object} context - Resolution context
   * @param {Object} opts - Options
   * @returns {string} Template with expanded macros
   */
  _expandMacrosInTemplate(template, context, opts) {
    const pattern = new RegExp(this.MACRO_PATTERN.source, "g");

    return template.replace(pattern, (match, macroId, paramsStr) => {
      try {
        const params = this._parseMacroParams(paramsStr || "");
        const expanded = this.expandMacro(macroId, params, context);

        if (!expanded && this.hasMacro(macroId)) {
          return expanded; // Macro exists but returned empty
        } else if (!expanded) {
          return opts.preserveUnresolved ? match : "";
        }

        return expanded;
      } catch (error) {
        this._log("warn", `Error expanding macro "${macroId}":`, error);
        return opts.preserveUnresolved ? match : "";
      }
    });
  },

  /**
   * Parse macro parameters from string
   * @param {string} paramsStr - Parameters string (e.g., 'name="Alice" age=25')
   * @returns {Object} Parsed parameters
   */
  _parseMacroParams(paramsStr) {
    const params = {};
    if (!paramsStr) return params;

    // Match key="value" or key='value' or key=value patterns
    const paramPattern = /(\w+)=(?:"([^"]*)"|'([^']*)'|(\S+))/g;
    let match;

    while ((match = paramPattern.exec(paramsStr)) !== null) {
      const key = match[1];
      const value = match[2] !== undefined ? match[2] :
                    match[3] !== undefined ? match[3] : match[4];
      params[key] = value;
    }

    return params;
  },

  /**
   * Process transform pipelines
   * @param {string} template - Template with transforms
   * @param {Object} context - Resolution context
   * @param {Object} opts - Options
   * @returns {string} Template with transforms applied
   */
  _processTransformPipelines(template, context, opts) {
    const pattern = new RegExp(this.TRANSFORM_PATTERN.source, "g");

    return template.replace(pattern, (match, tokenExpr, transformsStr) => {
      try {
        // Resolve the token first
        const tokenPath = tokenExpr.trim();
        let value = this._resolveFromContext(tokenPath, context);

        if (value === undefined) {
          // Try as a registered token
          value = this.resolveToken(tokenPath, context);
        }

        if (value === undefined) {
          return opts.preserveUnresolved ? match : "";
        }

        // Parse and apply transforms
        const transforms = transformsStr.split("|").map((t) => t.trim());
        let result = this._stringify(value);

        for (const transform of transforms) {
          result = this._applySingleTransform(result, transform);
        }

        return result;
      } catch (error) {
        this._log("warn", `Error processing transform pipeline "${match}":`, error);
        return opts.preserveUnresolved ? match : "";
      }
    });
  },

  /**
   * Apply a single transform to a value
   * @param {string} value - Value to transform
   * @param {string} transformExpr - Transform expression (e.g., "truncate:100")
   * @returns {string} Transformed value
   */
  _applySingleTransform(value, transformExpr) {
    const [name, ...args] = transformExpr.split(":");
    const transformName = name.trim().toLowerCase();
    const arg = args.join(":").trim();

    switch (transformName) {
      case "uppercase":
        return value.toUpperCase();
      case "lowercase":
        return value.toLowerCase();
      case "capitalize":
        return value.charAt(0).toUpperCase() + value.slice(1);
      case "titlecase":
        return value.replace(/\b\w/g, (c) => c.toUpperCase());
      case "trim":
        return value.trim();
      case "truncate":
        const maxLen = parseInt(arg, 10) || 100;
        return value.length > maxLen ? value.substring(0, maxLen) + "..." : value;
      case "wrap":
        const wrapChar = arg || '"';
        return wrapChar + value + wrapChar;
      case "default":
        return value || arg;
      case "replace":
        const [from, to] = arg.split(",").map((s) => s.trim());
        return value.replace(new RegExp(from, "g"), to || "");
      case "json":
        try {
          return JSON.stringify(JSON.parse(value));
        } catch {
          return value;
        }
      case "pretty":
        try {
          return JSON.stringify(JSON.parse(value), null, 2);
        } catch {
          return value;
        }
      case "first":
        try {
          const arr = JSON.parse(value);
          return Array.isArray(arr) ? this._stringify(arr[0]) : value;
        } catch {
          return value.split(",")[0]?.trim() || value;
        }
      case "last":
        try {
          const arr = JSON.parse(value);
          return Array.isArray(arr) ? this._stringify(arr[arr.length - 1]) : value;
        } catch {
          const parts = value.split(",");
          return parts[parts.length - 1]?.trim() || value;
        }
      case "join":
        try {
          const arr = JSON.parse(value);
          return Array.isArray(arr) ? arr.join(arg || ", ") : value;
        } catch {
          return value;
        }
      case "count":
        try {
          const arr = JSON.parse(value);
          return Array.isArray(arr) ? String(arr.length) : String(value.length);
        } catch {
          return String(value.length);
        }
      case "reverse":
        return value.split("").reverse().join("");
      case "base64":
        try {
          return btoa(value);
        } catch {
          return value;
        }
      case "unbase64":
        try {
          return atob(value);
        } catch {
          return value;
        }
      default:
        this._log("debug", `Unknown transform: ${transformName}`);
        return value;
    }
  },

  /**
   * Resolve standard tokens (after macros, conditionals, transforms)
   * @param {string} template - Template with tokens
   * @param {Object} context - Resolution context
   * @param {Object} opts - Options
   * @returns {string} Resolved template
   */
  _resolveStandardTokens(template, context, opts) {
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

  // ===== DEFAULT MACRO REGISTRATION =====

  /**
   * Register default macros on initialization
   */
  _registerDefaultMacros() {
    const defaultMacros = [
      // System prompt macros
      {
        id: "system_base",
        name: "Base System Prompt",
        description: "Standard base system prompt template",
        category: "system",
        template: "You are {{agent.name}}, {{agent.description}}.\n\n{{#if position.roleDescription}}Your role: {{position.roleDescription}}{{/if}}",
        parameters: [],
      },
      {
        id: "system_creative_writer",
        name: "Creative Writer System",
        description: "System prompt for creative writing agents",
        category: "system",
        template: `You are {{name}}, an expert creative writer specializing in {{specialty}}.

Your writing style:
- Voice: {{voice}}
- Tone: {{tone}}
- Focus: {{focus}}

{{#if constraints}}Constraints: {{constraints}}{{/if}}`,
        parameters: [
          { name: "name", required: true, default: "the Writer" },
          { name: "specialty", required: false, default: "narrative fiction" },
          { name: "voice", required: false, default: "engaging and vivid" },
          { name: "tone", required: false, default: "appropriate to the content" },
          { name: "focus", required: false, default: "character and plot development" },
          { name: "constraints", required: false, default: "" },
        ],
      },
      {
        id: "system_analyst",
        name: "Analyst System",
        description: "System prompt for analysis agents",
        category: "system",
        template: `You are {{name}}, a skilled analyst focusing on {{domain}}.

Your approach:
- Methodology: {{methodology}}
- Output format: {{outputFormat}}

{{#if additionalInstructions}}Additional instructions: {{additionalInstructions}}{{/if}}`,
        parameters: [
          { name: "name", required: true, default: "the Analyst" },
          { name: "domain", required: false, default: "content analysis" },
          { name: "methodology", required: false, default: "systematic and thorough" },
          { name: "outputFormat", required: false, default: "structured analysis" },
          { name: "additionalInstructions", required: false, default: "" },
        ],
      },

      // Role prompt macros
      {
        id: "role_team_leader",
        name: "Team Leader Role",
        description: "Role prompt for team leaders",
        category: "role",
        template: `As {{team.name}} Team Leader, you are responsible for:
1. Coordinating team efforts
2. Ensuring quality standards
3. Synthesizing team contributions
4. Making final decisions for your team's output

Your team members: {{team.members | join}}`,
        parameters: [],
      },
      {
        id: "role_reviewer",
        name: "Reviewer Role",
        description: "Role prompt for review/editing positions",
        category: "role",
        template: `As a reviewer, your task is to critically evaluate {{subject}}.

Focus areas:
{{#if focusAreas}}- {{focusAreas}}{{else}}- Quality
- Accuracy
- Coherence
- Style{{/if}}

Provide constructive feedback with specific suggestions for improvement.`,
        parameters: [
          { name: "subject", required: true, default: "the content" },
          { name: "focusAreas", required: false, default: "" },
        ],
      },

      // Action instruction macros
      {
        id: "action_analyze",
        name: "Analysis Action",
        description: "Standard analysis action instruction",
        category: "action",
        template: `Analyze the following {{contentType}}:

{{input}}

Provide a detailed analysis covering:
{{#if analysisPoints}}{{analysisPoints}}{{else}}- Key themes and elements
- Strengths and weaknesses
- Opportunities for improvement{{/if}}`,
        parameters: [
          { name: "contentType", required: false, default: "content" },
          { name: "analysisPoints", required: false, default: "" },
        ],
      },
      {
        id: "action_draft",
        name: "Drafting Action",
        description: "Standard drafting action instruction",
        category: "action",
        template: `Based on the following context:

{{input}}

Write a {{outputType}} that:
{{#if requirements}}- {{requirements}}{{else}}- Is engaging and well-structured
- Maintains consistency with established elements
- Advances the narrative appropriately{{/if}}

{{#if style}}Style notes: {{style}}{{/if}}
{{#if wordCount}}Target length: approximately {{wordCount}} words{{/if}}`,
        parameters: [
          { name: "outputType", required: false, default: "draft" },
          { name: "requirements", required: false, default: "" },
          { name: "style", required: false, default: "" },
          { name: "wordCount", required: false, default: "" },
        ],
      },
      {
        id: "action_revise",
        name: "Revision Action",
        description: "Standard revision action instruction",
        category: "action",
        template: `Revise the following draft based on the feedback provided:

Original Draft:
{{input}}

{{#if feedback}}Feedback:
{{feedback}}{{/if}}

Make improvements while preserving the core content and intent.
{{#if preserveElements}}Elements to preserve: {{preserveElements}}{{/if}}`,
        parameters: [
          { name: "feedback", required: false, default: "" },
          { name: "preserveElements", required: false, default: "" },
        ],
      },

      // Common fragment macros
      {
        id: "context_summary",
        name: "Context Summary Block",
        description: "Formatted context summary",
        category: "common",
        template: `=== Context ===
{{#if char}}Character: {{char}}{{/if}}
{{#if scenario}}Scenario: {{scenario}}{{/if}}
{{#if previousOutput}}Previous output: {{previousOutput | truncate:500}}{{/if}}
===============`,
        parameters: [
          { name: "previousOutput", required: false, default: "" },
        ],
      },
      {
        id: "output_format",
        name: "Output Format Block",
        description: "Standard output format instructions",
        category: "common",
        template: `Output Format:
{{#if format}}{{format}}{{else}}Provide your response in clear, well-organized prose.{{/if}}

{{#if includeReasoning}}Include your reasoning process.{{/if}}
{{#if jsonOutput}}Format as valid JSON.{{/if}}`,
        parameters: [
          { name: "format", required: false, default: "" },
          { name: "includeReasoning", required: false, default: "" },
          { name: "jsonOutput", required: false, default: "" },
        ],
      },
      {
        id: "thinking_block",
        name: "Thinking/Reasoning Block",
        description: "Prompt for explicit reasoning",
        category: "common",
        template: `Before responding, think through the following:
{{#if thinkingPoints}}{{thinkingPoints}}{{else}}1. What is the core objective?
2. What key information do I have?
3. What are the constraints or requirements?
4. What approach will best achieve the goal?{{/if}}

Then provide your response.`,
        parameters: [
          { name: "thinkingPoints", required: false, default: "" },
        ],
      },
    ];

    for (const macro of defaultMacros) {
      this.registerMacro(macro);
    }

    this._log("debug", `Registered ${this._macros.size} default macros`);
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
      presetsLoaded: 0,
    };

    // Register custom tokens from preset
    if (preset.customTokens && Array.isArray(preset.customTokens)) {
      for (const token of preset.customTokens) {
        if (this.registerToken({ ...token, category: "custom" })) {
          result.tokensRegistered++;
        }
      }
    }

    // Register macros from preset
    if (preset.macros && Array.isArray(preset.macros)) {
      for (const macro of preset.macros) {
        if (this.registerMacro({ ...macro, category: macro.category || "custom" })) {
          result.macrosRegistered++;
        }
      }
    }

    // Load prompt presets from preset data
    if (preset.promptPresets && Array.isArray(preset.promptPresets)) {
      for (const promptPreset of preset.promptPresets) {
        if (this.savePromptPreset(promptPreset)) {
          result.presetsLoaded++;
        }
      }
    }

    this._log("info", `Preset applied: ${result.tokensRegistered} tokens, ${result.macrosRegistered} macros, ${result.presetsLoaded} presets`);
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

    // Get custom macros only
    const customMacros = this.getAllMacros("custom").map((m) => ({
      id: m.id,
      name: m.name,
      description: m.description,
      category: m.category,
      template: m.template,
      parameters: m.parameters,
      metadata: m.metadata,
    }));

    // Get all prompt presets
    const promptPresets = this.getAllPromptPresets().map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      category: p.category,
      config: p.config,
      metadata: p.metadata,
    }));

    return {
      customTokens,
      macros: customMacros,
      promptPresets,
    };
  },

  // ===== SUMMARY =====

  /**
   * Get system summary
   * @returns {Object} Summary object
   */
  getSummary() {
    const tokensByCategory = this.getTokensByCategory();
    const tokenCategoryCounts = {};
    for (const [cat, tokens] of Object.entries(tokensByCategory)) {
      tokenCategoryCounts[cat] = tokens.length;
    }

    const macrosByCategory = this.getMacrosByCategory();
    const macroCategoryCounts = {};
    for (const [cat, macros] of Object.entries(macrosByCategory)) {
      macroCategoryCounts[cat] = macros.length;
    }

    const presetsByCategory = this.getPresetsByCategory();
    const presetCategoryCounts = {};
    for (const [cat, presets] of Object.entries(presetsByCategory)) {
      presetCategoryCounts[cat] = presets.length;
    }

    return {
      version: this.VERSION,
      initialized: this._initialized,
      totalTokens: this._tokens.size,
      tokensByCategory: tokenCategoryCounts,
      totalMacros: this._macros.size,
      macrosByCategory: macroCategoryCounts,
      totalPresets: this._promptPresets.size,
      presetsByCategory: presetCategoryCounts,
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
