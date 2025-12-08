/**
 * modules/pipeline/curation.js - Isolated Curation Pipeline for Persistent Stores
 *
 * This module provides a fully isolated pipeline to curate persistent stores
 * without touching the editorial pipeline state. It can be run standalone
 * or embedded as a delegated phase inside the main pipeline.
 */

const CurationPipeline = {
  VERSION: "0.1.0",

  // Dependencies (injected)
  _stores: null,
  _contextManager: null,
  _outputManager: null,
  _threadManager: null,
  _pipelineSchemas: null,
  _state: null,
  _agents: null,
  _generation: null,
  _config: null,

  // Internal state
  _phases: [],
  _running: false,
  _aborted: false,
  _currentPhaseIndex: -1,
  _phaseResults: new Map(),
  _listeners: new Map(),

  /**
   * Initialize the curation pipeline
   * @param {Object} modules
   * @returns {CurationPipeline}
   */
  init(modules = {}) {
    this._stores = modules.stores || null;
    this._contextManager = modules.contextManager || null;
    this._outputManager = modules.outputManager || null;
    this._threadManager = modules.threadManager || null;
    this._pipelineSchemas = modules.pipelineSchemas || null;
    this._state = modules.state || null;
    this._agents = modules.agents || null;
    this._generation = modules.generation || null;
    this._config = modules.config || null;

    // Default phases (can be overridden via setPhases)
    this._phases = this._buildDefaultPhases();

    return this;
  },

  /**
   * Override phases with a custom definition
   * @param {Array<Object>} phases
   */
  setPhases(phases = []) {
    this._phases = Array.isArray(phases) ? phases : [];
  },

  /**
   * Get current phases
   * @returns {Array<Object>}
   */
  getPhases() {
    return this._phases;
  },

  /**
   * Run the curation pipeline (standalone)
   * @param {Object} options
   * @returns {Promise<Object>} result
   */
  async run(options = {}) {
    if (this._running) {
      throw new Error("Curation pipeline is already running");
    }

    this._running = true;
    this._aborted = false;
    this._currentPhaseIndex = -1;
    this._phaseResults.clear();

    const phases = this._phases;
    const total = phases.length;

    this._emit("pipeline:start", { phases });

    try {
      for (let i = 0; i < phases.length; i++) {
        if (this._aborted) break;

        const phase = phases[i];
        this._currentPhaseIndex = i;

        this._emit("phase:start", { phase, index: i, total });

        // Initialize isolated threads for curation namespace
        if (this._threadManager) {
          this._threadManager.beginPhase(`curation_${phase.id}`, {
            threads: {
              main: { enabled: true, name: `Curation: ${phase.name}` },
              collaboration: [],
              team: [],
            },
          });
        }

        const result = await this._executePhase(phase, options);

        this._phaseResults.set(phase.id, result);
        this._emit("phase:complete", { phase, result, index: i, total });

        // Close out the phase threads
        if (this._threadManager) {
          this._threadManager.endPhase(`curation_${phase.id}`, true);
        }
      }

      const success = !this._aborted;
      const res = this._buildResult(success);
      if (success) {
        this._emit("pipeline:complete", res);
      } else {
        this._emit("pipeline:abort", res);
      }
      this._running = false;
      return res;
    } catch (err) {
      const res = this._buildResult(false, err);
      this._emit("pipeline:error", res);
      this._running = false;
      return res;
    }
  },

  /**
   * Abort execution (safe)
   */
  abort(reason = "User aborted curation") {
    if (!this._running) return;
    this._aborted = true;
    this._emit("pipeline:abort", { reason });
  },

  /**
   * Is pipeline running
   */
  isRunning() {
    return this._running;
  },

  /**
   * Execute a single curation phase
   * @private
   */
  async _executePhase(phase, options) {
    // Basic scaffold – extend as needed with real curation logic
    const contextSummary = this._stores?.getSummary?.() || {};
    const allStores = this._stores?.getAll?.() || {};

    // Placeholder: invoke agent(s) or generation if configured
    let generated = null;
    if (this._generation && this._agents && phase.agents?.length) {
      // Minimal scaffold: just echo the summary for now
      generated = JSON.stringify({ contextSummary, phase: phase.id }, null, 2);
    }

    // Route outputs to a curation-only namespace
    if (this._outputManager) {
      const payload =
        generated ||
        phase.outputTemplate ||
        `Curation phase ${phase.id} completed.`;

      // Use phase outputs with a namespaced phase id
      this._outputManager.setPhaseOutput(
        `curation_${phase.id}`,
        payload,
        "curation_pipeline",
      );
    }

    return {
      summary: contextSummary,
      stores: allStores,
    };
  },

  /**
   * Build default phases for curation
   * @private
   */
  _buildDefaultPhases() {
    // These are intentionally minimal; they can be overridden via setPhases().
    return [
      {
        id: "collect_inputs",
        name: "Collect Inputs",
        description: "Gather current store summaries and pending deltas.",
        agents: [],
      },
      {
        id: "analyze_changes",
        name: "Analyze Changes",
        description: "Detect required updates to persistent stores.",
        agents: [],
      },
      {
        id: "apply_updates",
        name: "Apply Updates",
        description: "Apply curated updates to stores in a controlled manner.",
        agents: [],
      },
      {
        id: "verify_integrity",
        name: "Verify Integrity",
        description: "Verify store integrity and backups after curation.",
        agents: [],
      },
    ];
  },

  /**
   * Build pipeline result object
   * @private
   */
  _buildResult(success, error = null) {
    return {
      success,
      aborted: this._aborted,
      error: error ? error.message || String(error) : null,
      phasesCompleted: this._currentPhaseIndex + 1,
      totalPhases: this._phases.length,
      phaseResults: Object.fromEntries(this._phaseResults),
      timestamp: Date.now(),
    };
  },

  /**
   * Emit an event
   * @private
   */
  _emit(event, data = {}) {
    const listeners = this._listeners.get(event);
    if (listeners) {
      for (const cb of listeners) {
        try {
          cb(data);
        } catch (e) {
          console.error("[Curation Pipeline] Event handler error:", e);
        }
      }
    }
  },

  /**
   * Subscribe to events
   */
  on(event, callback) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, []);
    }
    this._listeners.get(event).push(callback);
    return () => this.off(event, callback);
  },

  /**
   * Unsubscribe
   */
  off(event, callback) {
    const listeners = this._listeners.get(event);
    if (!listeners) return;
    const idx = listeners.indexOf(callback);
    if (idx >= 0) listeners.splice(idx, 1);
  },
};

// Export
if (typeof window !== "undefined") {
  window.CurationPipeline = CurationPipeline;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = CurationPipeline;
}
