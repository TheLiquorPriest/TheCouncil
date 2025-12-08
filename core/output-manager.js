/**
 * TheCouncil - Output Manager
 *
 * Core module for managing output routing and consolidation:
 * - Route action outputs to appropriate targets
 * - Consolidate phase outputs from multiple actions
 * - Manage global variable updates
 * - Store output persistence
 * - Output transformation and formatting
 *
 * @version 2.0.0
 */

const OutputManager = {
  // ===== VERSION =====
  VERSION: "2.0.0",

  // ===== OUTPUT TARGETS =====
  Target: {
    PHASE_OUTPUT: "phaseOutput",
    TEAM_OUTPUT: "teamOutput",
    GLOBAL: "global",
    STORE: "store",
    NEXT_ACTION: "nextAction",
    THREAD: "thread",
    FINAL: "final",
  },

  // ===== CONSOLIDATION MODES =====
  Consolidation: {
    LAST_ACTION: "last_action",
    SYNTHESIZE: "synthesize",
    USER_GAVEL: "user_gavel",
    MERGE: "merge",
    DESIGNATED: "designated",
    FIRST_ACTION: "first_action",
  },

  // ===== STATE =====

  /**
   * Output buffer for current run
   * @type {Object}
   */
  _outputBuffer: {},

  /**
   * Global outputs
   * @type {Object}
   */
  _globals: {},

  /**
   * Phase outputs
   * @type {Map<string, Object>}
   */
  _phaseOutputs: new Map(),

  /**
   * Team outputs
   * @type {Map<string, Map<string, *>>}
   */
  _teamOutputs: new Map(),

  /**
   * Action outputs
   * @type {Map<string, *>}
   */
  _actionOutputs: new Map(),

  /**
   * Final output
   * @type {*}
   */
  _finalOutput: null,

  /**
   * Dependencies
   */
  _curationSystem: null,
  _threadManager: null,
  _tokenResolver: null,
  _logger: null,

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
   * Initialize the Output Manager
   * @param {Object} options - Configuration options
   * @returns {OutputManager}
   */
  init(options = {}) {
    if (this._initialized) {
      this._log("warn", "OutputManager already initialized");
      return this;
    }

    this._log("info", "Initializing Output Manager...");

    this._logger = options.logger || null;
    this._curationSystem = options.curationSystem || null;
    this._threadManager = options.threadManager || null;
    this._tokenResolver = options.tokenResolver || null;

    this.clear();

    this._initialized = true;
    this._log("info", "Output Manager initialized");
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
   * Clear all output state
   */
  clear() {
    this._outputBuffer = {};
    this._globals = {};
    this._phaseOutputs.clear();
    this._teamOutputs.clear();
    this._actionOutputs.clear();
    this._finalOutput = null;
  },

  /**
   * Start a new run (clear state)
   * @param {Object} initialGlobals - Initial global values
   */
  startRun(initialGlobals = {}) {
    this.clear();
    this._globals = { ...initialGlobals };
    this._emit("run:started", { globals: this._globals });
  },

  /**
   * End the current run
   * @returns {Object} Final output and state
   */
  endRun() {
    const result = {
      finalOutput: this._finalOutput,
      globals: { ...this._globals },
      phaseOutputs: Object.fromEntries(this._phaseOutputs),
      actionOutputs: Object.fromEntries(this._actionOutputs),
    };

    this._emit("run:ended", result);
    return result;
  },

  // ===== OUTPUT ROUTING =====

  /**
   * Route output to specified target
   * @param {*} output - Output value
   * @param {Object} config - Routing configuration
   * @param {Object} context - Current context (phase, action, etc.)
   * @returns {Promise<boolean>} Success
   */
  async routeOutput(output, config, context = {}) {
    if (output === undefined || output === null) {
      return false;
    }

    const target = config.target || this.Target.PHASE_OUTPUT;
    const targetKey = config.targetKey || "";
    const append = config.append || false;

    this._log("debug", `Routing output to ${target}:${targetKey}`);

    try {
      switch (target) {
        case this.Target.PHASE_OUTPUT:
          this._setPhaseOutput(context.phaseId, output, append);
          break;

        case this.Target.TEAM_OUTPUT:
          this._setTeamOutput(context.phaseId, targetKey, output, append);
          break;

        case this.Target.GLOBAL:
          this._setGlobal(targetKey, output, append);
          break;

        case this.Target.STORE:
          await this._setStoreOutput(targetKey, output, config);
          break;

        case this.Target.NEXT_ACTION:
          this._setActionOutput(context.actionId, output);
          break;

        case this.Target.THREAD:
          this._addToThread(targetKey, output, context);
          break;

        case this.Target.FINAL:
          this._finalOutput = output;
          break;

        default:
          this._log("warn", `Unknown output target: ${target}`);
          return false;
      }

      this._emit("output:routed", { target, targetKey, output, context });
      return true;
    } catch (error) {
      this._log("error", `Failed to route output: ${error.message}`);
      this._emit("output:error", { target, targetKey, error });
      return false;
    }
  },

  /**
   * Set phase output
   * @param {string} phaseId - Phase ID
   * @param {*} output - Output value
   * @param {boolean} append - Append or replace
   */
  _setPhaseOutput(phaseId, output, append = false) {
    if (!phaseId) return;

    if (append && this._phaseOutputs.has(phaseId)) {
      const existing = this._phaseOutputs.get(phaseId);
      if (typeof existing === "string" && typeof output === "string") {
        this._phaseOutputs.set(phaseId, existing + "\n" + output);
      } else if (Array.isArray(existing)) {
        existing.push(output);
      } else {
        this._phaseOutputs.set(phaseId, [existing, output]);
      }
    } else {
      this._phaseOutputs.set(phaseId, output);
    }
  },

  /**
   * Set team output
   * @param {string} phaseId - Phase ID
   * @param {string} teamId - Team ID
   * @param {*} output - Output value
   * @param {boolean} append - Append or replace
   */
  _setTeamOutput(phaseId, teamId, output, append = false) {
    if (!phaseId || !teamId) return;

    if (!this._teamOutputs.has(phaseId)) {
      this._teamOutputs.set(phaseId, new Map());
    }

    const phaseTeamOutputs = this._teamOutputs.get(phaseId);

    if (append && phaseTeamOutputs.has(teamId)) {
      const existing = phaseTeamOutputs.get(teamId);
      if (typeof existing === "string" && typeof output === "string") {
        phaseTeamOutputs.set(teamId, existing + "\n" + output);
      } else if (Array.isArray(existing)) {
        existing.push(output);
      } else {
        phaseTeamOutputs.set(teamId, [existing, output]);
      }
    } else {
      phaseTeamOutputs.set(teamId, output);
    }
  },

  /**
   * Set global variable
   * @param {string} key - Global key
   * @param {*} value - Value
   * @param {boolean} append - Append or replace
   */
  _setGlobal(key, value, append = false) {
    if (!key) return;

    // Handle nested keys (e.g., "custom.myVar")
    const parts = key.split(".");
    let target = this._globals;

    for (let i = 0; i < parts.length - 1; i++) {
      if (!target[parts[i]]) {
        target[parts[i]] = {};
      }
      target = target[parts[i]];
    }

    const finalKey = parts[parts.length - 1];

    if (append && target[finalKey] !== undefined) {
      if (typeof target[finalKey] === "string" && typeof value === "string") {
        target[finalKey] += "\n" + value;
      } else if (Array.isArray(target[finalKey])) {
        target[finalKey].push(value);
      } else {
        target[finalKey] = [target[finalKey], value];
      }
    } else {
      target[finalKey] = value;
    }

    this._emit("global:updated", { key, value: target[finalKey] });
  },

  /**
   * Set store output
   * @param {string} storeId - Store ID
   * @param {*} output - Output value
   * @param {Object} config - Additional config
   */
  async _setStoreOutput(storeId, output, config = {}) {
    if (!this._curationSystem || !storeId) return;

    try {
      const schema = this._curationSystem.getStoreSchema(storeId);
      if (!schema) {
        this._log("warn", `Store "${storeId}" not found`);
        return;
      }

      if (schema.isSingleton) {
        // Update singleton store
        const data = typeof output === "object" ? output : { content: output };
        this._curationSystem.update(storeId, data);
      } else {
        // Create or update collection entry
        if (config.entryId) {
          this._curationSystem.update(storeId, config.entryId, output);
        } else if (typeof output === "object" && output.id) {
          try {
            this._curationSystem.create(storeId, output);
          } catch {
            this._curationSystem.update(storeId, output.id, output);
          }
        }
      }
    } catch (error) {
      this._log("error", `Failed to set store output: ${error.message}`);
    }
  },

  /**
   * Set action output (for next action input)
   * @param {string} actionId - Action ID
   * @param {*} output - Output value
   */
  _setActionOutput(actionId, output) {
    if (actionId) {
      this._actionOutputs.set(actionId, output);
    }
  },

  /**
   * Add output to thread
   * @param {string} threadId - Thread ID
   * @param {*} output - Output value
   * @param {Object} context - Context with agent info
   */
  _addToThread(threadId, output, context = {}) {
    if (!this._threadManager) return;

    this._threadManager.addMessage(threadId, {
      role: "assistant",
      content: typeof output === "string" ? output : JSON.stringify(output),
      agentId: context.agentId,
      agentName: context.agentName,
      timestamp: Date.now(),
    });
  },

  // ===== OUTPUT RETRIEVAL =====

  /**
   * Get phase output
   * @param {string} phaseId - Phase ID
   * @returns {*} Output value
   */
  getPhaseOutput(phaseId) {
    return this._phaseOutputs.get(phaseId);
  },

  /**
   * Get all phase outputs
   * @returns {Object} Map of phase outputs
   */
  getAllPhaseOutputs() {
    return Object.fromEntries(this._phaseOutputs);
  },

  /**
   * Get team output
   * @param {string} phaseId - Phase ID
   * @param {string} teamId - Team ID
   * @returns {*} Output value
   */
  getTeamOutput(phaseId, teamId) {
    const phaseTeamOutputs = this._teamOutputs.get(phaseId);
    return phaseTeamOutputs?.get(teamId);
  },

  /**
   * Get all team outputs for a phase
   * @param {string} phaseId - Phase ID
   * @returns {Object} Map of team outputs
   */
  getPhaseTeamOutputs(phaseId) {
    const phaseTeamOutputs = this._teamOutputs.get(phaseId);
    return phaseTeamOutputs ? Object.fromEntries(phaseTeamOutputs) : {};
  },

  /**
   * Get global value
   * @param {string} key - Global key (dot notation supported)
   * @returns {*} Global value
   */
  getGlobal(key) {
    if (!key) return this._globals;

    const parts = key.split(".");
    let value = this._globals;

    for (const part of parts) {
      if (value === undefined || value === null) return undefined;
      value = value[part];
    }

    return value;
  },

  /**
   * Get all globals
   * @returns {Object} All global values
   */
  getAllGlobals() {
    return { ...this._globals };
  },

  /**
   * Get action output
   * @param {string} actionId - Action ID
   * @returns {*} Output value
   */
  getActionOutput(actionId) {
    return this._actionOutputs.get(actionId);
  },

  /**
   * Get final output
   * @returns {*} Final output
   */
  getFinalOutput() {
    return this._finalOutput;
  },

  // ===== OUTPUT CONSOLIDATION =====

  /**
   * Consolidate phase outputs
   * @param {string} phaseId - Phase ID
   * @param {Object} config - Consolidation configuration
   * @param {Object[]} actionOutputs - Array of action outputs
   * @returns {Promise<*>} Consolidated output
   */
  async consolidatePhaseOutputs(phaseId, config, actionOutputs = []) {
    const mode = config.consolidation || this.Consolidation.LAST_ACTION;
    const outputs = actionOutputs.filter((o) => o !== undefined && o !== null);

    if (outputs.length === 0) {
      return null;
    }

    let result;

    switch (mode) {
      case this.Consolidation.LAST_ACTION:
        result = outputs[outputs.length - 1];
        break;

      case this.Consolidation.FIRST_ACTION:
        result = outputs[0];
        break;

      case this.Consolidation.MERGE:
        result = this._mergeOutputs(outputs);
        break;

      case this.Consolidation.DESIGNATED:
        if (config.consolidationActionId) {
          result = this._actionOutputs.get(config.consolidationActionId);
        }
        break;

      case this.Consolidation.SYNTHESIZE:
        result = await this._synthesizeOutputs(outputs, config);
        break;

      case this.Consolidation.USER_GAVEL:
        // Return all outputs for user review
        result = {
          requiresGavel: true,
          outputs,
          merged: this._mergeOutputs(outputs),
        };
        break;

      default:
        result = outputs[outputs.length - 1];
    }

    // Store the consolidated output
    this._setPhaseOutput(phaseId, result);

    this._emit("output:consolidated", { phaseId, mode, result });

    return result;
  },

  /**
   * Merge multiple outputs
   * @param {*[]} outputs - Outputs to merge
   * @returns {*} Merged output
   */
  _mergeOutputs(outputs) {
    if (outputs.length === 0) return null;
    if (outputs.length === 1) return outputs[0];

    // String outputs: join with newlines
    if (outputs.every((o) => typeof o === "string")) {
      return outputs.join("\n\n---\n\n");
    }

    // Array outputs: concatenate
    if (outputs.every((o) => Array.isArray(o))) {
      return outputs.flat();
    }

    // Object outputs: merge
    if (outputs.every((o) => typeof o === "object" && o !== null)) {
      return outputs.reduce((acc, o) => ({ ...acc, ...o }), {});
    }

    // Mixed: return as array
    return outputs;
  },

  /**
   * Synthesize outputs using AI
   * @param {*[]} outputs - Outputs to synthesize
   * @param {Object} config - Synthesis configuration
   * @returns {Promise<*>} Synthesized output
   */
  async _synthesizeOutputs(outputs, config) {
    // For now, just merge
    // In full implementation, this would call an AI agent to synthesize
    return this._mergeOutputs(outputs);
  },

  // ===== OUTPUT TRANSFORMATION =====

  /**
   * Transform output before routing
   * @param {*} output - Output value
   * @param {Object} transform - Transform configuration
   * @returns {Promise<*>} Transformed output
   */
  async transformOutput(output, transform = {}) {
    if (!transform || Object.keys(transform).length === 0) {
      return output;
    }

    let result = output;

    // Apply template transformation
    if (transform.template && this._tokenResolver) {
      result = await this._tokenResolver.resolve(transform.template, {
        output: result,
      });
    }

    // Apply format transformation
    if (transform.format) {
      result = this._formatOutput(result, transform.format);
    }

    // Apply extraction
    if (transform.extract) {
      result = this._extractFromOutput(result, transform.extract);
    }

    return result;
  },

  /**
   * Format output
   * @param {*} output - Output value
   * @param {string} format - Format type
   * @returns {*} Formatted output
   */
  _formatOutput(output, format) {
    switch (format) {
      case "string":
        return typeof output === "string" ? output : JSON.stringify(output);

      case "json":
        return typeof output === "object" ? output : { content: output };

      case "markdown":
        if (typeof output === "string") return output;
        return "```json\n" + JSON.stringify(output, null, 2) + "\n```";

      case "plain":
        if (typeof output === "string") {
          return output.replace(/```[\s\S]*?```/g, "").trim();
        }
        return String(output);

      default:
        return output;
    }
  },

  /**
   * Extract value from output
   * @param {*} output - Output value
   * @param {Object} extractConfig - Extraction configuration
   * @returns {*} Extracted value
   */
  _extractFromOutput(output, extractConfig) {
    if (!extractConfig) return output;

    // Extract by path
    if (extractConfig.path) {
      const parts = extractConfig.path.split(".");
      let value = output;
      for (const part of parts) {
        if (value === undefined || value === null) return undefined;
        value = value[part];
      }
      return value;
    }

    // Extract by regex
    if (extractConfig.regex && typeof output === "string") {
      const regex = new RegExp(extractConfig.regex, extractConfig.flags || "");
      const match = output.match(regex);
      return match
        ? extractConfig.group
          ? match[extractConfig.group]
          : match[0]
        : null;
    }

    // Extract code block
    if (extractConfig.codeBlock && typeof output === "string") {
      const lang = extractConfig.codeBlock;
      const regex = new RegExp(`\`\`\`${lang}\\n([\\s\\S]*?)\\n\`\`\``, "i");
      const match = output.match(regex);
      return match ? match[1].trim() : null;
    }

    return output;
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
      phaseOutputCount: this._phaseOutputs.size,
      teamOutputPhases: this._teamOutputs.size,
      actionOutputCount: this._actionOutputs.size,
      globalKeys: Object.keys(this._globals),
      hasFinalOutput: this._finalOutput !== null,
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
      this._logger[level](`[OutputManager] ${message}`, ...args);
    }
  },
};

// Export for different environments
if (typeof window !== "undefined") {
  window.OutputManager = OutputManager;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = OutputManager;
}
