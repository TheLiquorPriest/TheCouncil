// modules/core/index.js - Core Module Index for The Council
// Provides unified interface for the new modular architecture
// Integrates: ContextManager, OutputManager, ThreadManager, PipelineSchemas

const CouncilCore = {
  // ===== VERSION =====
  VERSION: "1.0.0",

  // ===== MODULE REFERENCES =====
  _modules: {
    contextManager: null,
    outputManager: null,
    threadManager: null,
    pipelineSchemas: null,
  },

  // ===== STATE =====
  _initialized: false,
  _currentPhaseId: null,
  _pipelineRunning: false,

  // ===== INITIALIZATION =====

  /**
   * Initialize the core module system
   * @param {Object} options - Initialization options
   * @returns {CouncilCore}
   */
  init(options = {}) {
    console.log("[Council Core] Initializing modular architecture...");

    // Get module references
    this._modules.contextManager =
      options.contextManager || window.ContextManager || null;
    this._modules.outputManager =
      options.outputManager || window.OutputManager || null;
    this._modules.threadManager =
      options.threadManager || window.ThreadManager || null;
    this._modules.pipelineSchemas =
      options.pipelineSchemas || window.PipelineSchemas || null;

    // Initialize each module
    if (this._modules.contextManager) {
      this._modules.contextManager.init(options.context || {});
    }

    if (this._modules.outputManager) {
      this._modules.outputManager.init(options.output || {});
    }

    if (this._modules.threadManager) {
      this._modules.threadManager.init(options.threads || {});
    }

    this._initialized = true;
    console.log("[Council Core] Initialization complete");

    return this;
  },

  /**
   * Check if core is initialized
   * @returns {boolean}
   */
  isInitialized() {
    return this._initialized;
  },

  /**
   * Check if all modules are available
   * @returns {Object} Module availability status
   */
  getModuleStatus() {
    return {
      contextManager: !!this._modules.contextManager,
      outputManager: !!this._modules.outputManager,
      threadManager: !!this._modules.threadManager,
      pipelineSchemas: !!this._modules.pipelineSchemas,
    };
  },

  // ===== PIPELINE LIFECYCLE =====

  /**
   * Start a new pipeline run
   * @param {Object} options - Pipeline options
   * @returns {boolean} Success status
   */
  startPipeline(options = {}) {
    if (this._pipelineRunning) {
      console.warn("[Council Core] Pipeline already running");
      return false;
    }

    console.log("[Council Core] Starting pipeline run...");

    // Reset all modules for new run
    if (this._modules.contextManager) {
      this._modules.contextManager.clear();
    }

    if (this._modules.outputManager) {
      this._modules.outputManager.reset();
    }

    if (this._modules.threadManager) {
      this._modules.threadManager.reset();
    }

    // Set up static context if provided
    if (options.staticContext && this._modules.contextManager) {
      for (const [key, value] of Object.entries(options.staticContext)) {
        this._modules.contextManager.setStatic(
          key,
          value.data || value,
          value.name || key,
          value.description || "",
        );
      }
    }

    // Set up initial global context if provided
    if (options.globalContext && this._modules.contextManager) {
      for (const [key, value] of Object.entries(options.globalContext)) {
        this._modules.contextManager.setGlobal(
          key,
          value.data || value,
          value.name || key,
          value.description || "",
        );
      }
    }

    // Register persistent store references if provided
    if (options.persistentRefs && this._modules.contextManager) {
      for (const [key, ref] of Object.entries(options.persistentRefs)) {
        this._modules.contextManager.registerPersistentRef(
          key,
          ref.storeKey,
          ref.path,
          ref.transform,
        );
      }
    }

    this._pipelineRunning = true;
    return true;
  },

  /**
   * End the current pipeline run
   * @param {Object} results - Pipeline results
   */
  endPipeline(results = {}) {
    console.log("[Council Core] Ending pipeline run...");

    this._pipelineRunning = false;
    this._currentPhaseId = null;

    // Don't clear modules - preserve data for inspection
    // The next startPipeline will reset them
  },

  /**
   * Check if pipeline is running
   * @returns {boolean}
   */
  isPipelineRunning() {
    return this._pipelineRunning;
  },

  // ===== PHASE LIFECYCLE =====

  /**
   * Begin a pipeline phase
   * @param {string} phaseId - Phase identifier
   * @param {Object} phaseConfig - Phase configuration
   */
  beginPhase(phaseId, phaseConfig = {}) {
    console.log(`[Council Core] Beginning phase "${phaseId}"`);

    this._currentPhaseId = phaseId;

    // Notify all modules of phase start
    if (this._modules.contextManager) {
      this._modules.contextManager.beginPhase(phaseId);
    }

    if (this._modules.outputManager) {
      this._modules.outputManager.beginPhase(phaseId);
    }

    if (this._modules.threadManager) {
      this._modules.threadManager.beginPhase(phaseId, phaseConfig);
    }
  },

  /**
   * End the current pipeline phase
   * @param {string} phaseId - Phase identifier (optional, uses current)
   * @param {Object} options - End phase options
   */
  endPhase(phaseId = null, options = {}) {
    const targetPhaseId = phaseId || this._currentPhaseId;
    console.log(`[Council Core] Ending phase "${targetPhaseId}"`);

    // Update global context if provided
    if (options.globalContextUpdates && this._modules.contextManager) {
      this._modules.contextManager.updateGlobalAfterPhase(
        targetPhaseId,
        options.globalContextUpdates,
      );
    }

    // Notify all modules of phase end
    if (this._modules.contextManager) {
      this._modules.contextManager.endPhase(
        targetPhaseId,
        options.preserveContext,
      );
    }

    if (this._modules.outputManager) {
      this._modules.outputManager.endPhase(
        targetPhaseId,
        options.preserveOutputs,
      );
    }

    if (this._modules.threadManager) {
      this._modules.threadManager.endPhase(
        targetPhaseId,
        options.preserveThreads,
      );
    }

    if (targetPhaseId === this._currentPhaseId) {
      this._currentPhaseId = null;
    }
  },

  /**
   * Get current phase ID
   * @returns {string|null}
   */
  getCurrentPhaseId() {
    return this._currentPhaseId;
  },

  // ===== CONTEXT SHORTCUTS =====

  /**
   * Get context manager
   * @returns {Object} ContextManager instance
   */
  get context() {
    return this._modules.contextManager;
  },

  /**
   * Build context for an agent
   * @param {string} agentId - Agent identifier
   * @param {string} teamId - Team identifier
   * @param {Object} stores - CouncilStores instance
   * @returns {Object} Built context
   */
  buildAgentContext(agentId, teamId, stores) {
    if (!this._modules.contextManager) {
      console.error("[Council Core] ContextManager not available");
      return null;
    }

    return this._modules.contextManager.buildContextForAgent(
      agentId,
      teamId,
      this._currentPhaseId,
      stores,
    );
  },

  /**
   * Get context manifest for RAG requests
   * @param {string} agentId - Requesting agent
   * @param {string} teamId - Agent's team
   * @returns {Object} Context manifest
   */
  getContextManifest(agentId, teamId) {
    if (!this._modules.contextManager) {
      return null;
    }

    return this._modules.contextManager.generateContextManifest(
      agentId,
      teamId,
      this._currentPhaseId,
    );
  },

  // ===== OUTPUT SHORTCUTS =====

  /**
   * Get output manager
   * @returns {Object} OutputManager instance
   */
  get outputs() {
    return this._modules.outputManager;
  },

  /**
   * Set phase output
   * @param {any} content - Output content
   * @param {string} createdBy - Creator identifier
   * @returns {Object} Created output block
   */
  setPhaseOutput(content, createdBy = null) {
    if (!this._modules.outputManager) {
      console.error("[Council Core] OutputManager not available");
      return null;
    }

    return this._modules.outputManager.setPhaseOutput(
      this._currentPhaseId,
      content,
      createdBy,
    );
  },

  /**
   * Get phase output
   * @param {string} phaseId - Phase identifier (optional)
   * @returns {any} Output content
   */
  getPhaseOutput(phaseId = null) {
    if (!this._modules.outputManager) {
      return null;
    }

    return this._modules.outputManager.getPhaseOutput(
      phaseId || this._currentPhaseId,
    );
  },

  /**
   * Route output based on phase configuration
   * @param {Object} phaseConfig - Phase configuration
   * @param {any} content - Content to route
   * @param {string} agentId - Agent that produced output
   * @param {string} teamId - Agent's team
   * @returns {Object} Routing results
   */
  routeOutput(phaseConfig, content, agentId, teamId = null) {
    if (!this._modules.outputManager) {
      return null;
    }

    return this._modules.outputManager.routeOutput(
      phaseConfig,
      content,
      agentId,
      teamId,
    );
  },

  // ===== THREAD SHORTCUTS =====

  /**
   * Get thread manager
   * @returns {Object} ThreadManager instance
   */
  get threads() {
    return this._modules.threadManager;
  },

  /**
   * Add entry to main phase thread
   * @param {string} agentId - Agent identifier
   * @param {string} agentName - Agent display name
   * @param {string} content - Entry content
   * @param {Object} options - Additional options
   * @returns {Object} Created entry
   */
  addToMainThread(agentId, agentName, content, options = {}) {
    if (!this._modules.threadManager) {
      console.error("[Council Core] ThreadManager not available");
      return null;
    }

    return this._modules.threadManager.addToMainThread(
      agentId,
      agentName,
      content,
      options,
      this._currentPhaseId,
    );
  },

  /**
   * Add entry to team thread
   * @param {string} teamId - Team identifier
   * @param {string} agentId - Agent identifier
   * @param {string} agentName - Agent display name
   * @param {string} content - Entry content
   * @param {Object} options - Additional options
   * @returns {Object} Created entry
   */
  addToTeamThread(teamId, agentId, agentName, content, options = {}) {
    if (!this._modules.threadManager) {
      console.error("[Council Core] ThreadManager not available");
      return null;
    }

    return this._modules.threadManager.addToTeamThread(
      teamId,
      agentId,
      agentName,
      content,
      options,
      this._currentPhaseId,
    );
  },

  /**
   * Get formatted main thread for prompt
   * @param {Object} options - Formatting options
   * @returns {string} Formatted thread content
   */
  getFormattedMainThread(options = {}) {
    if (!this._modules.threadManager) {
      return "";
    }

    const thread = this._modules.threadManager.getMainThread(
      this._currentPhaseId,
    );
    return this._modules.threadManager.formatThreadForPrompt(thread, options);
  },

  // ===== SCHEMA SHORTCUTS =====

  /**
   * Get pipeline schemas
   * @returns {Object} PipelineSchemas instance
   */
  get schemas() {
    return this._modules.pipelineSchemas;
  },

  /**
   * Create a new phase definition with defaults
   * @param {Object} config - Phase configuration
   * @returns {Object} Complete phase definition
   */
  createPhaseDefinition(config) {
    if (!this._modules.pipelineSchemas) {
      console.error("[Council Core] PipelineSchemas not available");
      return null;
    }

    return this._modules.pipelineSchemas.createPhaseDefinition(config);
  },

  /**
   * Validate a phase definition
   * @param {Object} phase - Phase to validate
   * @returns {Object} Validation result
   */
  validatePhase(phase) {
    if (!this._modules.pipelineSchemas) {
      return { valid: false, errors: ["PipelineSchemas not available"] };
    }

    return this._modules.pipelineSchemas.validatePhaseDefinition(phase);
  },

  /**
   * Migrate old phase definition to new format
   * @param {Object} oldPhase - Old format phase
   * @returns {Object} New format phase
   */
  migratePhase(oldPhase) {
    if (!this._modules.pipelineSchemas) {
      return null;
    }

    return this._modules.pipelineSchemas.migratePhaseDefinition(oldPhase);
  },

  // ===== DIAGNOSTICS =====

  /**
   * Get comprehensive summary of all modules
   * @returns {Object} Combined summary
   */
  getSummary() {
    return {
      version: this.VERSION,
      initialized: this._initialized,
      pipelineRunning: this._pipelineRunning,
      currentPhase: this._currentPhaseId,
      modules: this.getModuleStatus(),
      context: this._modules.contextManager?.getSummary() || null,
      outputs: this._modules.outputManager?.getSummary() || null,
      threads: this._modules.threadManager?.getSummary() || null,
    };
  },

  /**
   * Get debug snapshot of all modules
   * @returns {Object} Combined debug data
   */
  getDebugSnapshot() {
    return {
      summary: this.getSummary(),
      context: this._modules.contextManager?.getDebugSnapshot() || null,
      outputs: this._modules.outputManager?.getDebugSnapshot() || null,
      threads: this._modules.threadManager?.getDebugSnapshot() || null,
    };
  },

  // ===== EXPORT / IMPORT =====

  /**
   * Export all module state for persistence
   * @returns {Object} Exportable state
   */
  export() {
    return {
      version: this.VERSION,
      exportedAt: Date.now(),
      currentPhase: this._currentPhaseId,
      context: this._modules.contextManager?.export() || null,
      outputs: this._modules.outputManager?.export() || null,
      threads: this._modules.threadManager?.export() || null,
    };
  },

  /**
   * Import module state from export
   * @param {Object} data - Exported data
   * @returns {boolean} Success status
   */
  import(data) {
    try {
      if (!data || !data.version) {
        console.error("[Council Core] Invalid import data");
        return false;
      }

      if (data.context && this._modules.contextManager) {
        this._modules.contextManager.import(data.context);
      }

      if (data.outputs && this._modules.outputManager) {
        this._modules.outputManager.import(data.outputs);
      }

      if (data.threads && this._modules.threadManager) {
        this._modules.threadManager.import(data.threads);
      }

      this._currentPhaseId = data.currentPhase || null;

      console.log("[Council Core] Import successful");
      return true;
    } catch (e) {
      console.error("[Council Core] Import failed:", e);
      return false;
    }
  },

  // ===== CLEANUP =====

  /**
   * Clear all module state
   */
  clear() {
    if (this._modules.contextManager) {
      this._modules.contextManager.clear();
    }

    if (this._modules.outputManager) {
      this._modules.outputManager.clear();
    }

    if (this._modules.threadManager) {
      this._modules.threadManager.clear();
    }

    this._currentPhaseId = null;
    this._pipelineRunning = false;

    console.log("[Council Core] All modules cleared");
  },

  /**
   * Destroy the core instance
   */
  destroy() {
    this.clear();
    this._initialized = false;
    this._modules = {
      contextManager: null,
      outputManager: null,
      threadManager: null,
      pipelineSchemas: null,
    };

    console.log("[Council Core] Destroyed");
  },
};

// Export for use in other modules
if (typeof window !== "undefined") {
  window.CouncilCore = CouncilCore;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = CouncilCore;
}
