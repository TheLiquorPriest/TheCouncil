/**
 * TheCouncil - Pipeline System
 *
 * Core module for managing response pipelines:
 * - Pipeline definitions (phases, actions)
 * - Pipeline execution and lifecycle management
 * - Phase/Action state tracking
 * - Execution flow control
 *
 * Lifecycle States:
 * - Phase: start -> before_actions -> in_progress -> after_actions -> end -> respond
 * - Action: called -> start -> in_progress -> complete -> respond
 *
 * @version 2.0.0
 */

const PipelineSystem = {
  // ===== VERSION =====
  VERSION: "2.0.0",

  // ===== LIFECYCLE CONSTANTS =====

  PhaseLifecycle: {
    START: "start",
    BEFORE_ACTIONS: "before_actions",
    IN_PROGRESS: "in_progress",
    AFTER_ACTIONS: "after_actions",
    END: "end",
    RESPOND: "respond",
  },

  ActionLifecycle: {
    CALLED: "called",
    START: "start",
    IN_PROGRESS: "in_progress",
    COMPLETE: "complete",
    RESPOND: "respond",
  },

  ExecutionMode: {
    SYNC: "sync",
    ASYNC: "async",
  },

  TriggerType: {
    SEQUENTIAL: "sequential",
    AWAIT: "await",
    ON: "on",
    IMMEDIATE: "immediate",
  },

  OrchestrationMode: {
    SEQUENTIAL: "sequential",
    PARALLEL: "parallel",
    ROUND_ROBIN: "round_robin",
    CONSENSUS: "consensus",
  },

  OutputConsolidation: {
    LAST_ACTION: "last_action",
    SYNTHESIZE: "synthesize",
    USER_GAVEL: "user_gavel",
    MERGE: "merge",
    DESIGNATED: "designated",
  },

  // ===== STATE =====

  /**
   * Registered pipelines
   * @type {Map<string, Object>}
   */
  _pipelines: new Map(),

  /**
   * Active pipeline run state
   * @type {Object|null}
   */
  _activeRun: null,

  /**
   * Run history
   * @type {Array<Object>}
   */
  _runHistory: [],

  /**
   * Maximum run history to keep
   * @type {number}
   */
  _maxRunHistory: 10,

  /**
   * Dependencies
   */
  _agentsSystem: null,
  _curationSystem: null,
  _contextManager: null,
  _outputManager: null,
  _threadManager: null,
  _apiClient: null,
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

  /**
   * Abort controller for current run
   * @type {AbortController|null}
   */
  _abortController: null,

  // ===== INITIALIZATION =====

  /**
   * Initialize the Pipeline System
   * @param {Object} options - Configuration options
   * @returns {PipelineSystem}
   */
  init(options = {}) {
    if (this._initialized) {
      this._log("warn", "PipelineSystem already initialized");
      return this;
    }

    this._log("info", "Initializing Pipeline System...");

    // Set dependencies
    this._logger = options.logger || null;
    this._agentsSystem = options.agentsSystem || null;
    this._curationSystem = options.curationSystem || null;
    this._contextManager = options.contextManager || null;
    this._outputManager = options.outputManager || null;
    this._threadManager = options.threadManager || null;
    this._apiClient = options.apiClient || null;
    this._tokenResolver = options.tokenResolver || null;

    // Clear state
    this.clear();

    // Register default pipeline if provided
    if (options.defaultPipeline) {
      this.registerPipeline(options.defaultPipeline);
    }

    this._initialized = true;
    this._log("info", "Pipeline System initialized");
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
   * Clear all state
   */
  clear() {
    this._pipelines.clear();
    this._activeRun = null;
    this._runHistory = [];
    this._abortController = null;
  },

  // ===== PIPELINE MANAGEMENT =====

  /**
   * Register a pipeline
   * @param {Object} pipeline - Pipeline definition
   * @returns {Object} Normalized pipeline
   */
  registerPipeline(pipeline) {
    if (!pipeline.id) {
      throw new Error("Pipeline requires an id");
    }

    const normalized = this._normalizePipeline(pipeline);
    this._pipelines.set(normalized.id, normalized);

    this._log(
      "info",
      `Pipeline registered: ${normalized.name} (${normalized.id})`,
    );
    this._emit("pipeline:registered", { pipeline: normalized });

    return normalized;
  },

  /**
   * Get a pipeline by ID
   * @param {string} pipelineId - Pipeline ID
   * @returns {Object|null} Pipeline or null
   */
  getPipeline(pipelineId) {
    return this._pipelines.get(pipelineId) || null;
  },

  /**
   * Get all pipelines
   * @returns {Object[]} Array of pipelines
   */
  getAllPipelines() {
    return Array.from(this._pipelines.values());
  },

  /**
   * Update a pipeline
   * @param {string} pipelineId - Pipeline ID
   * @param {Object} updates - Updates to apply
   * @returns {Object} Updated pipeline
   */
  updatePipeline(pipelineId, updates) {
    const pipeline = this._pipelines.get(pipelineId);
    if (!pipeline) {
      throw new Error(`Pipeline "${pipelineId}" not found`);
    }

    const updated = this._normalizePipeline({
      ...pipeline,
      ...updates,
      id: pipelineId, // Prevent ID change
      metadata: {
        ...pipeline.metadata,
        updatedAt: Date.now(),
      },
    });

    this._pipelines.set(pipelineId, updated);
    this._log("info", `Pipeline updated: ${updated.name}`);
    this._emit("pipeline:updated", { pipeline: updated });

    return updated;
  },

  /**
   * Delete a pipeline
   * @param {string} pipelineId - Pipeline ID
   * @returns {boolean} Success
   */
  deletePipeline(pipelineId) {
    if (!this._pipelines.has(pipelineId)) {
      return false;
    }

    this._pipelines.delete(pipelineId);
    this._log("info", `Pipeline deleted: ${pipelineId}`);
    this._emit("pipeline:deleted", { pipelineId });

    return true;
  },

  /**
   * Normalize a pipeline definition
   * @param {Object} pipeline - Raw pipeline
   * @returns {Object} Normalized pipeline
   */
  _normalizePipeline(pipeline) {
    return {
      id: pipeline.id,
      name: pipeline.name || pipeline.id,
      description: pipeline.description || "",
      version: pipeline.version || "1.0.0",
      staticContext: {
        includeCharacterCard:
          pipeline.staticContext?.includeCharacterCard !== false,
        includeWorldInfo: pipeline.staticContext?.includeWorldInfo !== false,
        includePersona: pipeline.staticContext?.includePersona !== false,
        includeScenario: pipeline.staticContext?.includeScenario !== false,
        custom: pipeline.staticContext?.custom || {},
      },
      globals: {
        instructions: pipeline.globals?.instructions || "",
        outlineDraft: pipeline.globals?.outlineDraft || "",
        finalOutline: pipeline.globals?.finalOutline || "",
        firstDraft: pipeline.globals?.firstDraft || "",
        secondDraft: pipeline.globals?.secondDraft || "",
        finalDraft: pipeline.globals?.finalDraft || "",
        commentary: pipeline.globals?.commentary || "",
        custom: pipeline.globals?.custom || {},
      },
      constants: pipeline.constants || {},
      phases: (pipeline.phases || []).map((p, i) => this._normalizePhase(p, i)),
      metadata: {
        createdAt: pipeline.metadata?.createdAt || Date.now(),
        updatedAt: pipeline.metadata?.updatedAt || Date.now(),
        author: pipeline.metadata?.author || "",
        tags: pipeline.metadata?.tags || [],
      },
    };
  },

  /**
   * Normalize a phase definition
   * @param {Object} phase - Raw phase
   * @param {number} index - Phase index
   * @returns {Object} Normalized phase
   */
  _normalizePhase(phase, index) {
    return {
      id: phase.id,
      name: phase.name || phase.id,
      description: phase.description || "",
      icon: phase.icon || "📋",
      teams: phase.teams || [],
      threads: {
        phaseThread: this._normalizeThreadConfig(phase.threads?.phaseThread),
        teamThreads: phase.threads?.teamThreads || {},
      },
      context: {
        static: phase.context?.static || [],
        global: phase.context?.global || [],
        phase: phase.context?.phase || [],
        team: phase.context?.team || [],
        stores: phase.context?.stores || [],
      },
      actions: (phase.actions || []).map((a, i) => this._normalizeAction(a, i)),
      output: {
        phaseOutput: this._normalizeOutputConfig(phase.output?.phaseOutput),
        teamOutputs: phase.output?.teamOutputs || {},
        consolidation: phase.output?.consolidation || "last_action",
        consolidationActionId: phase.output?.consolidationActionId || "",
      },
      gavel: {
        enabled: phase.gavel?.enabled || false,
        prompt: phase.gavel?.prompt || "Review and edit if needed:",
        editableFields: phase.gavel?.editableFields || ["output"],
        canSkip: phase.gavel?.canSkip !== false,
      },
      constants: phase.constants || {},
      variables: phase.variables || {},
      displayOrder: phase.displayOrder ?? index,
    };
  },

  /**
   * Normalize an action definition
   * @param {Object} action - Raw action
   * @param {number} index - Action index
   * @returns {Object} Normalized action
   */
  _normalizeAction(action, index) {
    return {
      id: action.id,
      name: action.name || action.id,
      description: action.description || "",
      execution: {
        mode: action.execution?.mode || "sync",
        trigger: {
          type: action.execution?.trigger?.type || "sequential",
          targetActionId: action.execution?.trigger?.targetActionId || "",
          targetState: action.execution?.trigger?.targetState || "complete",
        },
        timeout: action.execution?.timeout || 60000,
        retryCount: action.execution?.retryCount || 0,
      },
      participants: {
        positionIds: action.participants?.positionIds || [],
        teamIds: action.participants?.teamIds || [],
        orchestration: action.participants?.orchestration || "sequential",
        maxRounds: action.participants?.maxRounds || 3,
      },
      threads: {
        actionThread: this._normalizeThreadConfig(action.threads?.actionThread),
        teamTaskThreads: action.threads?.teamTaskThreads || {},
      },
      input: {
        source: action.input?.source || "phaseInput",
        sourceKey: action.input?.sourceKey || "",
        transform: action.input?.transform || "",
      },
      output: this._normalizeOutputConfig(action.output),
      contextOverrides: {
        include: action.contextOverrides?.include || [],
        exclude: action.contextOverrides?.exclude || [],
        priority: action.contextOverrides?.priority || [],
      },
      rag: {
        enabled: action.rag?.enabled || false,
        ragPipelineId: action.rag?.ragPipelineId || "",
        queryTemplate: action.rag?.queryTemplate || "",
        resultTarget: action.rag?.resultTarget || "context",
      },
      promptTemplate: action.promptTemplate || "",
      displayOrder: action.displayOrder ?? index,
    };
  },

  /**
   * Normalize thread config
   * @param {Object} config - Raw config
   * @returns {Object} Normalized config
   */
  _normalizeThreadConfig(config) {
    return {
      enabled: config?.enabled !== false,
      firstMessage: config?.firstMessage || "",
      maxMessages: config?.maxMessages || 100,
    };
  },

  /**
   * Normalize output config
   * @param {Object} config - Raw config
   * @returns {Object} Normalized config
   */
  _normalizeOutputConfig(config) {
    return {
      target: config?.target || "phaseOutput",
      targetKey: config?.targetKey || "",
      append: config?.append || false,
    };
  },

  // ===== PHASE MANAGEMENT =====

  /**
   * Add a phase to a pipeline
   * @param {string} pipelineId - Pipeline ID
   * @param {Object} phase - Phase definition
   * @returns {Object} Updated pipeline
   */
  addPhase(pipelineId, phase) {
    const pipeline = this._pipelines.get(pipelineId);
    if (!pipeline) {
      throw new Error(`Pipeline "${pipelineId}" not found`);
    }

    const normalizedPhase = this._normalizePhase(phase, pipeline.phases.length);
    pipeline.phases.push(normalizedPhase);
    pipeline.metadata.updatedAt = Date.now();

    this._emit("phase:added", { pipelineId, phase: normalizedPhase });
    return pipeline;
  },

  /**
   * Update a phase in a pipeline
   * @param {string} pipelineId - Pipeline ID
   * @param {string} phaseId - Phase ID
   * @param {Object} updates - Updates to apply
   * @returns {Object} Updated phase
   */
  updatePhase(pipelineId, phaseId, updates) {
    const pipeline = this._pipelines.get(pipelineId);
    if (!pipeline) {
      throw new Error(`Pipeline "${pipelineId}" not found`);
    }

    const phaseIndex = pipeline.phases.findIndex((p) => p.id === phaseId);
    if (phaseIndex === -1) {
      throw new Error(
        `Phase "${phaseId}" not found in pipeline "${pipelineId}"`,
      );
    }

    const phase = pipeline.phases[phaseIndex];
    const updated = this._normalizePhase(
      { ...phase, ...updates, id: phaseId },
      phaseIndex,
    );

    pipeline.phases[phaseIndex] = updated;
    pipeline.metadata.updatedAt = Date.now();

    this._emit("phase:updated", { pipelineId, phase: updated });
    return updated;
  },

  /**
   * Remove a phase from a pipeline
   * @param {string} pipelineId - Pipeline ID
   * @param {string} phaseId - Phase ID
   * @returns {boolean} Success
   */
  removePhase(pipelineId, phaseId) {
    const pipeline = this._pipelines.get(pipelineId);
    if (!pipeline) {
      return false;
    }

    const phaseIndex = pipeline.phases.findIndex((p) => p.id === phaseId);
    if (phaseIndex === -1) {
      return false;
    }

    pipeline.phases.splice(phaseIndex, 1);
    pipeline.metadata.updatedAt = Date.now();

    this._emit("phase:removed", { pipelineId, phaseId });
    return true;
  },

  /**
   * Reorder phases in a pipeline
   * @param {string} pipelineId - Pipeline ID
   * @param {string[]} phaseIds - Ordered array of phase IDs
   * @returns {Object} Updated pipeline
   */
  reorderPhases(pipelineId, phaseIds) {
    const pipeline = this._pipelines.get(pipelineId);
    if (!pipeline) {
      throw new Error(`Pipeline "${pipelineId}" not found`);
    }

    const phaseMap = new Map(pipeline.phases.map((p) => [p.id, p]));
    const reordered = [];

    for (const id of phaseIds) {
      const phase = phaseMap.get(id);
      if (phase) {
        phase.displayOrder = reordered.length;
        reordered.push(phase);
      }
    }

    pipeline.phases = reordered;
    pipeline.metadata.updatedAt = Date.now();

    this._emit("phases:reordered", { pipelineId, phaseIds });
    return pipeline;
  },

  // ===== ACTION MANAGEMENT =====

  /**
   * Add an action to a phase
   * @param {string} pipelineId - Pipeline ID
   * @param {string} phaseId - Phase ID
   * @param {Object} action - Action definition
   * @returns {Object} Updated phase
   */
  addAction(pipelineId, phaseId, action) {
    const pipeline = this._pipelines.get(pipelineId);
    if (!pipeline) {
      throw new Error(`Pipeline "${pipelineId}" not found`);
    }

    const phase = pipeline.phases.find((p) => p.id === phaseId);
    if (!phase) {
      throw new Error(`Phase "${phaseId}" not found`);
    }

    const normalizedAction = this._normalizeAction(
      action,
      phase.actions.length,
    );
    phase.actions.push(normalizedAction);
    pipeline.metadata.updatedAt = Date.now();

    this._emit("action:added", {
      pipelineId,
      phaseId,
      action: normalizedAction,
    });
    return phase;
  },

  /**
   * Update an action in a phase
   * @param {string} pipelineId - Pipeline ID
   * @param {string} phaseId - Phase ID
   * @param {string} actionId - Action ID
   * @param {Object} updates - Updates to apply
   * @returns {Object} Updated action
   */
  updateAction(pipelineId, phaseId, actionId, updates) {
    const pipeline = this._pipelines.get(pipelineId);
    if (!pipeline) {
      throw new Error(`Pipeline "${pipelineId}" not found`);
    }

    const phase = pipeline.phases.find((p) => p.id === phaseId);
    if (!phase) {
      throw new Error(`Phase "${phaseId}" not found`);
    }

    const actionIndex = phase.actions.findIndex((a) => a.id === actionId);
    if (actionIndex === -1) {
      throw new Error(`Action "${actionId}" not found`);
    }

    const action = phase.actions[actionIndex];
    const updated = this._normalizeAction(
      { ...action, ...updates, id: actionId },
      actionIndex,
    );

    phase.actions[actionIndex] = updated;
    pipeline.metadata.updatedAt = Date.now();

    this._emit("action:updated", { pipelineId, phaseId, action: updated });
    return updated;
  },

  /**
   * Remove an action from a phase
   * @param {string} pipelineId - Pipeline ID
   * @param {string} phaseId - Phase ID
   * @param {string} actionId - Action ID
   * @returns {boolean} Success
   */
  removeAction(pipelineId, phaseId, actionId) {
    const pipeline = this._pipelines.get(pipelineId);
    if (!pipeline) {
      return false;
    }

    const phase = pipeline.phases.find((p) => p.id === phaseId);
    if (!phase) {
      return false;
    }

    const actionIndex = phase.actions.findIndex((a) => a.id === actionId);
    if (actionIndex === -1) {
      return false;
    }

    phase.actions.splice(actionIndex, 1);
    pipeline.metadata.updatedAt = Date.now();

    this._emit("action:removed", { pipelineId, phaseId, actionId });
    return true;
  },

  // ===== PIPELINE EXECUTION =====

  /**
   * Start a pipeline run
   * @param {string} pipelineId - Pipeline ID
   * @param {Object} input - User input and context
   * @returns {Promise<Object>} Run result
   */
  async startRun(pipelineId, input = {}) {
    if (this._activeRun) {
      throw new Error("A pipeline run is already in progress");
    }

    const pipeline = this._pipelines.get(pipelineId);
    if (!pipeline) {
      throw new Error(`Pipeline "${pipelineId}" not found`);
    }

    // Create abort controller
    this._abortController = new AbortController();

    // Initialize run state
    this._activeRun = this._createRunState(pipeline, input);

    this._log("info", `Starting pipeline run: ${pipeline.name}`);
    this._emit("run:started", { run: this._activeRun });

    try {
      // Execute all phases
      for (const phase of pipeline.phases) {
        // Check for abort
        if (this._abortController.signal.aborted) {
          throw new Error("Pipeline run aborted");
        }

        await this._executePhase(phase);
      }

      // Finalize run
      this._activeRun.status = "completed";
      this._activeRun.endedAt = Date.now();

      this._log("info", `Pipeline run completed: ${pipeline.name}`);
      this._emit("run:completed", { run: this._activeRun });

      // Store in history
      this._addToHistory(this._activeRun);

      const result = this._activeRun;
      this._activeRun = null;
      this._abortController = null;

      return result;
    } catch (error) {
      this._activeRun.status = "error";
      this._activeRun.error = error.message;
      this._activeRun.endedAt = Date.now();

      this._log("error", `Pipeline run failed: ${error.message}`);
      this._emit("run:error", { run: this._activeRun, error });

      this._addToHistory(this._activeRun);

      const result = this._activeRun;
      this._activeRun = null;
      this._abortController = null;

      throw error;
    }
  },

  /**
   * Abort the current pipeline run
   * @returns {boolean} Success
   */
  abortRun() {
    if (!this._activeRun || !this._abortController) {
      return false;
    }

    this._log("info", "Aborting pipeline run...");
    this._abortController.abort();
    this._emit("run:aborting", { run: this._activeRun });

    return true;
  },

  /**
   * Pause the current pipeline run
   * @returns {boolean} Success
   */
  pauseRun() {
    if (!this._activeRun || this._activeRun.status !== "running") {
      return false;
    }

    this._activeRun.status = "paused";
    this._log("info", "Pipeline run paused");
    this._emit("run:paused", { run: this._activeRun });

    return true;
  },

  /**
   * Resume a paused pipeline run
   * @returns {boolean} Success
   */
  resumeRun() {
    if (!this._activeRun || this._activeRun.status !== "paused") {
      return false;
    }

    this._activeRun.status = "running";
    this._log("info", "Pipeline run resumed");
    this._emit("run:resumed", { run: this._activeRun });

    return true;
  },

  /**
   * Create initial run state
   * @param {Object} pipeline - Pipeline definition
   * @param {Object} input - User input
   * @returns {Object} Run state
   */
  _createRunState(pipeline, input) {
    return {
      id: `run_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      pipelineId: pipeline.id,
      pipelineName: pipeline.name,
      status: "running",
      startedAt: Date.now(),
      endedAt: null,
      error: null,

      // Input
      userInput: input.userInput || "",
      context: input.context || {},

      // Globals (copy from pipeline defaults)
      globals: { ...pipeline.globals },

      // Phase states
      phases: {},

      // Current position
      currentPhaseId: null,
      currentPhaseIndex: -1,
      currentActionId: null,
      currentActionIndex: -1,

      // Output
      finalOutput: null,
    };
  },

  /**
   * Execute a single phase
   * @param {Object} phase - Phase definition
   * @returns {Promise<void>}
   */
  async _executePhase(phase) {
    this._log("debug", `Executing phase: ${phase.name}`);

    // Update current position
    this._activeRun.currentPhaseId = phase.id;
    this._activeRun.currentPhaseIndex++;

    // Initialize phase state
    const phaseState = {
      id: phase.id,
      name: phase.name,
      lifecycle: this.PhaseLifecycle.START,
      startedAt: Date.now(),
      endedAt: null,
      actions: {},
      input: null,
      output: null,
      variables: { ...phase.variables },
    };
    this._activeRun.phases[phase.id] = phaseState;

    this._emit("phase:lifecycle", {
      phaseId: phase.id,
      lifecycle: this.PhaseLifecycle.START,
    });

    try {
      // START lifecycle
      await this._onPhaseStart(phase, phaseState);

      // BEFORE_ACTIONS lifecycle
      phaseState.lifecycle = this.PhaseLifecycle.BEFORE_ACTIONS;
      this._emit("phase:lifecycle", {
        phaseId: phase.id,
        lifecycle: this.PhaseLifecycle.BEFORE_ACTIONS,
      });
      await this._onPhaseBeforeActions(phase, phaseState);

      // IN_PROGRESS - Execute actions
      phaseState.lifecycle = this.PhaseLifecycle.IN_PROGRESS;
      this._emit("phase:lifecycle", {
        phaseId: phase.id,
        lifecycle: this.PhaseLifecycle.IN_PROGRESS,
      });

      for (let i = 0; i < phase.actions.length; i++) {
        const action = phase.actions[i];

        // Check for abort
        if (this._abortController?.signal.aborted) {
          throw new Error("Pipeline run aborted");
        }

        // Wait for pause to be lifted
        while (this._activeRun?.status === "paused") {
          await this._sleep(100);
        }

        await this._executeAction(phase, action, phaseState, i);
      }

      // AFTER_ACTIONS lifecycle
      phaseState.lifecycle = this.PhaseLifecycle.AFTER_ACTIONS;
      this._emit("phase:lifecycle", {
        phaseId: phase.id,
        lifecycle: this.PhaseLifecycle.AFTER_ACTIONS,
      });
      await this._onPhaseAfterActions(phase, phaseState);

      // Handle output consolidation
      await this._consolidatePhaseOutput(phase, phaseState);

      // Handle gavel if enabled
      if (phase.gavel?.enabled) {
        phaseState.lifecycle = this.PhaseLifecycle.RESPOND;
        this._emit("phase:lifecycle", {
          phaseId: phase.id,
          lifecycle: this.PhaseLifecycle.RESPOND,
        });

        await this._handleGavel(phase, phaseState);
      }

      // END lifecycle
      phaseState.lifecycle = this.PhaseLifecycle.END;
      phaseState.endedAt = Date.now();
      this._emit("phase:lifecycle", {
        phaseId: phase.id,
        lifecycle: this.PhaseLifecycle.END,
      });
      await this._onPhaseEnd(phase, phaseState);
    } catch (error) {
      phaseState.error = error.message;
      phaseState.endedAt = Date.now();
      this._emit("phase:error", { phaseId: phase.id, error });
      throw error;
    }
  },

  /**
   * Execute a single action
   * @param {Object} phase - Phase definition
   * @param {Object} action - Action definition
   * @param {Object} phaseState - Phase state
   * @param {number} actionIndex - Action index
   * @returns {Promise<void>}
   */
  async _executeAction(phase, action, phaseState, actionIndex) {
    this._log("debug", `Executing action: ${action.name}`);

    // Update current position
    this._activeRun.currentActionId = action.id;
    this._activeRun.currentActionIndex = actionIndex;

    // Initialize action state
    const actionState = {
      id: action.id,
      name: action.name,
      lifecycle: this.ActionLifecycle.CALLED,
      startedAt: Date.now(),
      endedAt: null,
      input: null,
      output: null,
      responses: [],
      error: null,
    };
    phaseState.actions[action.id] = actionState;

    this._emit("action:lifecycle", {
      phaseId: phase.id,
      actionId: action.id,
      lifecycle: this.ActionLifecycle.CALLED,
    });

    try {
      // Handle async trigger if needed
      if (action.execution.mode === "async") {
        await this._waitForTrigger(action, phaseState);
      }

      // START lifecycle
      actionState.lifecycle = this.ActionLifecycle.START;
      this._emit("action:lifecycle", {
        phaseId: phase.id,
        actionId: action.id,
        lifecycle: this.ActionLifecycle.START,
      });

      // Resolve input
      actionState.input = await this._resolveActionInput(action, phaseState);

      // Handle RAG if enabled
      let ragResults = null;
      if (action.rag?.enabled && this._curationSystem) {
        ragResults = await this._executeActionRAG(action, actionState);
      }

      // IN_PROGRESS lifecycle
      actionState.lifecycle = this.ActionLifecycle.IN_PROGRESS;
      this._emit("action:lifecycle", {
        phaseId: phase.id,
        actionId: action.id,
        lifecycle: this.ActionLifecycle.IN_PROGRESS,
      });

      // Execute based on orchestration mode
      const output = await this._executeActionParticipants(
        action,
        actionState,
        ragResults,
      );

      // Store output
      actionState.output = output;

      // Route output
      await this._routeActionOutput(action, actionState, phaseState);

      // COMPLETE lifecycle
      actionState.lifecycle = this.ActionLifecycle.COMPLETE;
      actionState.endedAt = Date.now();
      this._emit("action:lifecycle", {
        phaseId: phase.id,
        actionId: action.id,
        lifecycle: this.ActionLifecycle.COMPLETE,
      });
    } catch (error) {
      actionState.error = error.message;
      actionState.endedAt = Date.now();
      this._emit("action:error", {
        phaseId: phase.id,
        actionId: action.id,
        error,
      });
      throw error;
    }
  },

  /**
   * Wait for action trigger condition
   * @param {Object} action - Action definition
   * @param {Object} phaseState - Phase state
   * @returns {Promise<void>}
   */
  async _waitForTrigger(action, phaseState) {
    const trigger = action.execution.trigger;

    if (trigger.type === "immediate") {
      return; // No waiting
    }

    if (trigger.type === "sequential") {
      return; // Default sequential, already handled by loop
    }

    if (trigger.type === "await" || trigger.type === "on") {
      const targetActionId = trigger.targetActionId;
      const targetState = trigger.targetState;

      if (!targetActionId) return;

      // Wait for target action to reach state
      const maxWait = action.execution.timeout || 60000;
      const startTime = Date.now();

      while (Date.now() - startTime < maxWait) {
        const targetAction = phaseState.actions[targetActionId];
        if (
          targetAction &&
          this._hasReachedState(targetAction.lifecycle, targetState)
        ) {
          return;
        }
        await this._sleep(50);
      }

      throw new Error(
        `Timeout waiting for action "${targetActionId}" to reach "${targetState}"`,
      );
    }
  },

  /**
   * Check if an action has reached a lifecycle state
   * @param {string} current - Current lifecycle state
   * @param {string} target - Target lifecycle state
   * @returns {boolean}
   */
  _hasReachedState(current, target) {
    const order = ["called", "start", "in_progress", "complete", "respond"];
    const currentIdx = order.indexOf(current);
    const targetIdx = order.indexOf(target);
    return currentIdx >= targetIdx;
  },

  /**
   * Resolve action input based on configuration
   * @param {Object} action - Action definition
   * @param {Object} phaseState - Phase state
   * @returns {Promise<*>} Resolved input
   */
  async _resolveActionInput(action, phaseState) {
    const inputConfig = action.input;
    let input = null;

    switch (inputConfig.source) {
      case "phaseInput":
        input = phaseState.input;
        break;

      case "previousAction":
        const prevActionId = inputConfig.sourceKey;
        if (prevActionId && phaseState.actions[prevActionId]) {
          input = phaseState.actions[prevActionId].output;
        }
        break;

      case "global":
        const globalKey = inputConfig.sourceKey;
        if (globalKey && this._activeRun?.globals) {
          input = this._activeRun.globals[globalKey];
        }
        break;

      case "store":
        if (this._curationSystem && inputConfig.sourceKey) {
          input = this._curationSystem.read(inputConfig.sourceKey);
        }
        break;

      case "custom":
        input = inputConfig.sourceKey;
        break;

      default:
        input = phaseState.input || this._activeRun?.userInput;
    }

    // Apply transform if specified
    if (inputConfig.transform && this._tokenResolver) {
      input = await this._tokenResolver.resolve(inputConfig.transform, {
        input,
        phase: phaseState,
        run: this._activeRun,
      });
    }

    return input;
  },

  /**
   * Execute RAG for an action
   * @param {Object} action - Action definition
   * @param {Object} actionState - Action state
   * @returns {Promise<Object>} RAG results
   */
  async _executeActionRAG(action, actionState) {
    if (!this._curationSystem || !action.rag?.enabled) {
      return null;
    }

    try {
      const query = action.rag.queryTemplate || actionState.input;
      const results = await this._curationSystem.executeRAG(
        action.rag.ragPipelineId || null,
        { query, text: query },
      );
      return results;
    } catch (error) {
      this._log("warn", `RAG execution failed for action ${action.id}:`, error);
      return null;
    }
  },

  /**
   * Execute action with participants
   * @param {Object} action - Action definition
   * @param {Object} actionState - Action state
   * @param {Object} ragResults - RAG results (if any)
   * @returns {Promise<string>} Combined output
   */
  async _executeActionParticipants(action, actionState, ragResults) {
    const participants = this._resolveParticipants(action);

    if (participants.length === 0) {
      this._log("warn", `No participants for action ${action.id}`);
      return "";
    }

    const orchestration = action.participants.orchestration || "sequential";
    const responses = [];

    switch (orchestration) {
      case "parallel":
        const promises = participants.map((p) =>
          this._executeForParticipant(action, actionState, p, ragResults),
        );
        const results = await Promise.all(promises);
        responses.push(...results);
        break;

      case "round_robin":
        const maxRounds = action.participants.maxRounds || 3;
        for (let round = 0; round < maxRounds; round++) {
          for (const participant of participants) {
            const response = await this._executeForParticipant(
              action,
              actionState,
              participant,
              ragResults,
              responses,
            );
            responses.push(response);
          }
        }
        break;

      case "consensus":
        // Simplified consensus: iterate until agreement or max rounds
        let consensusReached = false;
        const maxConsensusRounds = action.participants.maxRounds || 3;
        for (
          let round = 0;
          round < maxConsensusRounds && !consensusReached;
          round++
        ) {
          for (const participant of participants) {
            const response = await this._executeForParticipant(
              action,
              actionState,
              participant,
              ragResults,
              responses,
            );
            responses.push(response);
          }
          // Simple consensus check: if all responses are similar, stop
          if (responses.length >= 2) {
            const lastResponses = responses.slice(-participants.length);
            consensusReached = this._checkConsensus(lastResponses);
          }
        }
        break;

      case "sequential":
      default:
        for (const participant of participants) {
          const response = await this._executeForParticipant(
            action,
            actionState,
            participant,
            ragResults,
            responses,
          );
          responses.push(response);
        }
        break;
    }

    actionState.responses = responses;

    // Return last response as output (or combined for some modes)
    return responses.length > 0 ? responses[responses.length - 1].content : "";
  },

  /**
   * Resolve participants for an action
   * @param {Object} action - Action definition
   * @returns {Object[]} Array of participant info
   */
  _resolveParticipants(action) {
    const participants = [];

    // Add specific positions
    for (const positionId of action.participants.positionIds || []) {
      if (this._agentsSystem) {
        const position = this._agentsSystem.getPosition(positionId);
        const agent = this._agentsSystem.getAgentForPosition(positionId);
        if (position && agent) {
          participants.push({ position, agent, positionId });
        }
      }
    }

    // Add all positions from specified teams
    for (const teamId of action.participants.teamIds || []) {
      if (this._agentsSystem) {
        const team = this._agentsSystem.getTeam(teamId);
        if (team) {
          // Add leader
          if (team.leaderId) {
            const leader = this._agentsSystem.getPosition(team.leaderId);
            const agent = this._agentsSystem.getAgentForPosition(team.leaderId);
            if (
              leader &&
              agent &&
              !participants.find((p) => p.positionId === team.leaderId)
            ) {
              participants.push({
                position: leader,
                agent,
                positionId: team.leaderId,
              });
            }
          }
          // Add members
          for (const memberId of team.memberIds || []) {
            const member = this._agentsSystem.getPosition(memberId);
            const agent = this._agentsSystem.getAgentForPosition(memberId);
            if (
              member &&
              agent &&
              !participants.find((p) => p.positionId === memberId)
            ) {
              participants.push({
                position: member,
                agent,
                positionId: memberId,
              });
            }
          }
        }
      }
    }

    return participants;
  },

  /**
   * Execute action for a single participant
   * @param {Object} action - Action definition
   * @param {Object} actionState - Action state
   * @param {Object} participant - Participant info
   * @param {Object} ragResults - RAG results
   * @param {Object[]} previousResponses - Previous responses in this action
   * @returns {Promise<Object>} Response
   */
  async _executeForParticipant(
    action,
    actionState,
    participant,
    ragResults,
    previousResponses = [],
  ) {
    const { position, agent } = participant;

    // Build prompt
    let prompt = action.promptTemplate || "";

    // Resolve tokens in prompt
    if (this._tokenResolver) {
      prompt = await this._tokenResolver.resolve(prompt, {
        action: actionState,
        agent,
        position,
        input: actionState.input,
        rag: ragResults,
        previousResponses,
        run: this._activeRun,
      });
    }

    // Add position modifiers
    if (position.promptModifiers) {
      if (position.promptModifiers.prefix) {
        prompt = position.promptModifiers.prefix + "\n" + prompt;
      }
      if (position.promptModifiers.suffix) {
        prompt = prompt + "\n" + position.promptModifiers.suffix;
      }
    }

    // Execute via API client
    let content = "";
    if (this._apiClient) {
      try {
        content = await this._apiClient.generate(prompt, {
          agent,
          timeout: action.execution.timeout,
        });
      } catch (error) {
        this._log("error", `Generation failed for ${agent.name}:`, error);
        content = `[Error: ${error.message}]`;
      }
    } else {
      content = `[No API client - prompt would be: ${prompt.substring(0, 100)}...]`;
    }

    return {
      participantId: participant.positionId,
      agentId: agent.id,
      agentName: agent.name,
      positionName: position.name,
      content,
      timestamp: Date.now(),
    };
  },

  /**
   * Simple consensus check
   * @param {Object[]} responses - Recent responses
   * @returns {boolean} Whether consensus reached
   */
  _checkConsensus(responses) {
    if (responses.length < 2) return false;
    // Very simple: check if last two responses are similar in length
    const last = responses[responses.length - 1].content;
    const prev = responses[responses.length - 2].content;
    const lenDiff = Math.abs(last.length - prev.length);
    return lenDiff < Math.max(last.length, prev.length) * 0.1;
  },

  /**
   * Route action output to target
   * @param {Object} action - Action definition
   * @param {Object} actionState - Action state
   * @param {Object} phaseState - Phase state
   * @returns {Promise<void>}
   */
  async _routeActionOutput(action, actionState, phaseState) {
    const outputConfig = action.output;
    const output = actionState.output;

    if (!output) return;

    switch (outputConfig.target) {
      case "phaseOutput":
        if (outputConfig.append && phaseState.output) {
          phaseState.output += "\n" + output;
        } else {
          phaseState.output = output;
        }
        break;

      case "global":
        const globalKey = outputConfig.targetKey || "custom";
        if (this._activeRun?.globals) {
          if (globalKey === "custom") {
            this._activeRun.globals.custom[action.id] = output;
          } else {
            this._activeRun.globals[globalKey] = output;
          }
        }
        break;

      case "store":
        if (this._curationSystem && outputConfig.targetKey) {
          try {
            this._curationSystem.update(outputConfig.targetKey, {
              content: output,
            });
          } catch (e) {
            this._log("warn", `Failed to store output: ${e.message}`);
          }
        }
        break;

      case "teamOutput":
        // Store in team-specific output
        if (!phaseState.teamOutputs) phaseState.teamOutputs = {};
        const teamKey = outputConfig.targetKey || "default";
        phaseState.teamOutputs[teamKey] = output;
        break;

      case "nextAction":
        // Will be picked up by next action's input resolution
        break;
    }
  },

  /**
   * Consolidate phase outputs
   * @param {Object} phase - Phase definition
   * @param {Object} phaseState - Phase state
   * @returns {Promise<void>}
   */
  async _consolidatePhaseOutput(phase, phaseState) {
    const consolidation = phase.output?.consolidation || "last_action";

    switch (consolidation) {
      case "last_action":
        // Output already set by last action
        break;

      case "merge":
        // Merge all action outputs
        const outputs = Object.values(phaseState.actions)
          .filter((a) => a.output)
          .map((a) => a.output);
        phaseState.output = outputs.join("\n\n");
        break;

      case "designated":
        const designatedId = phase.output?.consolidationActionId;
        if (designatedId && phaseState.actions[designatedId]) {
          phaseState.output = phaseState.actions[designatedId].output;
        }
        break;

      case "synthesize":
      case "user_gavel":
        // These require additional handling (gavel or synthesis action)
        break;
    }

    // Update global output if configured
    if (phase.output?.phaseOutput?.target === "global" && phaseState.output) {
      const key = phase.output.phaseOutput.targetKey;
      if (key && this._activeRun?.globals) {
        this._activeRun.globals[key] = phaseState.output;
      }
    }
  },

  /**
   * Handle gavel (user review)
   * @param {Object} phase - Phase definition
   * @param {Object} phaseState - Phase state
   * @returns {Promise<void>}
   */
  async _handleGavel(phase, phaseState) {
    if (!phase.gavel?.enabled) return;

    this._log("info", `Gavel requested for phase: ${phase.name}`);
    this._emit("gavel:requested", {
      phaseId: phase.id,
      phaseName: phase.name,
      prompt: phase.gavel.prompt,
      output: phaseState.output,
      editableFields: phase.gavel.editableFields,
      canSkip: phase.gavel.canSkip,
    });

    // Wait for gavel response
    // In a real implementation, this would wait for UI input
    // For now, we'll just continue (the UI module will handle this)
  },

  /**
   * Submit gavel response
   * @param {string} phaseId - Phase ID
   * @param {Object} response - User response
   * @returns {boolean} Success
   */
  submitGavelResponse(phaseId, response) {
    if (!this._activeRun || !this._activeRun.phases[phaseId]) {
      return false;
    }

    const phaseState = this._activeRun.phases[phaseId];

    if (response.edited && response.output) {
      phaseState.output = response.output;
    }

    phaseState.gavelResponse = response;
    this._emit("gavel:submitted", { phaseId, response });

    return true;
  },

  // ===== PHASE LIFECYCLE HOOKS =====

  async _onPhaseStart(phase, phaseState) {
    // Initialize phase input from previous phase or user input
    const phaseIndex = this._activeRun.currentPhaseIndex;
    if (phaseIndex === 0) {
      phaseState.input = this._activeRun.userInput;
    } else {
      const prevPhases = Object.values(this._activeRun.phases);
      if (prevPhases.length > 0) {
        const prevPhase = prevPhases[prevPhases.length - 1];
        phaseState.input = prevPhase.output;
      }
    }
  },

  async _onPhaseBeforeActions(phase, phaseState) {
    // Hook for custom before-actions logic
  },

  async _onPhaseAfterActions(phase, phaseState) {
    // Hook for custom after-actions logic
  },

  async _onPhaseEnd(phase, phaseState) {
    // Update final output if this is the last phase
    const pipeline = this._pipelines.get(this._activeRun.pipelineId);
    if (pipeline) {
      const lastPhase = pipeline.phases[pipeline.phases.length - 1];
      if (lastPhase.id === phase.id) {
        this._activeRun.finalOutput = phaseState.output;
      }
    }
  },

  // ===== HELPER METHODS =====

  _sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  },

  _addToHistory(run) {
    this._runHistory.unshift(run);
    if (this._runHistory.length > this._maxRunHistory) {
      this._runHistory.pop();
    }
  },

  // ===== STATUS / QUERY =====

  /**
   * Get active run state
   * @returns {Object|null}
   */
  getActiveRun() {
    return this._activeRun;
  },

  /**
   * Check if a run is active
   * @returns {boolean}
   */
  isRunning() {
    return this._activeRun !== null && this._activeRun.status === "running";
  },

  /**
   * Get run history
   * @returns {Object[]}
   */
  getRunHistory() {
    return [...this._runHistory];
  },

  /**
   * Get system summary
   * @returns {Object}
   */
  getSummary() {
    return {
      version: this.VERSION,
      initialized: this._initialized,
      pipelineCount: this._pipelines.size,
      pipelines: Array.from(this._pipelines.values()).map((p) => ({
        id: p.id,
        name: p.name,
        phaseCount: p.phases.length,
      })),
      isRunning: this.isRunning(),
      activeRun: this._activeRun
        ? {
            id: this._activeRun.id,
            pipelineId: this._activeRun.pipelineId,
            status: this._activeRun.status,
            currentPhaseId: this._activeRun.currentPhaseId,
            currentActionId: this._activeRun.currentActionId,
          }
        : null,
      runHistoryCount: this._runHistory.length,
    };
  },

  // ===== IMPORT / EXPORT =====

  /**
   * Export all pipelines
   * @returns {Object}
   */
  exportPipelines() {
    return {
      version: this.VERSION,
      exportedAt: Date.now(),
      pipelines: Array.from(this._pipelines.values()),
    };
  },

  /**
   * Import pipelines
   * @param {Object} data - Import data
   * @param {boolean} merge - Merge with existing
   * @returns {boolean}
   */
  importPipelines(data, merge = false) {
    try {
      if (!data.pipelines) {
        throw new Error("Invalid import data");
      }

      if (!merge) {
        this._pipelines.clear();
      }

      for (const pipeline of data.pipelines) {
        if (!merge || !this._pipelines.has(pipeline.id)) {
          this.registerPipeline(pipeline);
        }
      }

      this._log("info", "Pipelines imported successfully");
      this._emit("pipelines:imported");
      return true;
    } catch (e) {
      this._log("error", "Import failed:", e);
      return false;
    }
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
      this._logger[level](`[PipelineSystem] ${message}`, ...args);
    }
  },
};

// Export for different environments
if (typeof window !== "undefined") {
  window.PipelineSystem = PipelineSystem;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = PipelineSystem;
}
