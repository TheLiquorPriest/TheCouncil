/**
 * TheCouncil - Orchestration System
 *
 * The execution engine that determines how Response Pipeline definitions are orchestrated.
 * Provides three distinct operating modes to support different use cases.
 *
 * Responsibilities:
 * - Execute pipeline runs (startRun, pauseRun, resumeRun, abortRun)
 * - Manage run state tracking
 * - Phase execution loop
 * - Action execution with retry/timeout
 * - Progress tracking and events
 * - Output delivery
 *
 * Operating Modes:
 * - Synthesis: Multi-agent workflow produces final response
 * - Compilation: Multi-agent workflow produces optimized prompt for ST's LLM
 * - Injection: Replace ST tokens with Curation RAG outputs (no pipeline required)
 *
 * @version 2.0.0
 */

const OrchestrationSystem = {
  // ===== VERSION =====
  VERSION: "2.0.0",

  // ===== OPERATING MODES =====

  Mode: {
    SYNTHESIS: "synthesis",
    COMPILATION: "compilation",
    INJECTION: "injection",
  },

  // ===== RUN STATUS =====

  RunStatus: {
    IDLE: "idle",
    RUNNING: "running",
    PAUSED: "paused",
    COMPLETED: "completed",
    ERROR: "error",
    ABORTED: "aborted",
  },

  // ===== LIFECYCLE CONSTANTS (mirrored from PipelineBuilderSystem) =====

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

  // ===== STATE =====

  /**
   * Active run state
   * @type {Object|null}
   */
  _runState: null,

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
   * Current operating mode
   * @type {string}
   */
  _mode: "synthesis",

  /**
   * Injection token mappings (for Mode 3)
   * @type {Map<string, string>}
   */
  _injectionMappings: new Map(),

  /**
   * Abort controller for current run
   * @type {AbortController|null}
   */
  _abortController: null,

  /**
   * Active gavel waiting for response
   * @type {Object|null}
   */
  _activeGavel: null,

  /**
   * Gavel response promise resolver
   * @type {Function|null}
   */
  _gavelResolver: null,

  // ===== DEPENDENCIES =====

  /**
   * Kernel reference
   * @type {Object|null}
   */
  _kernel: null,

  /**
   * Logger reference
   * @type {Object|null}
   */
  _logger: null,

  /**
   * API Client reference
   * @type {Object|null}
   */
  _apiClient: null,

  /**
   * Initialization flag
   * @type {boolean}
   */
  _initialized: false,

  // ===== INITIALIZATION =====

  /**
   * Initialize the Orchestration System
   * @param {Object} kernel - TheCouncil Kernel reference
   * @param {Object} options - Configuration options
   * @returns {OrchestrationSystem}
   */
  init(kernel, options = {}) {
    if (this._initialized) {
      this._log("warn", "OrchestrationSystem already initialized");
      return this;
    }

    this._log("info", "Initializing Orchestration System...");

    // Store kernel reference
    this._kernel = kernel;

    // Get modules from kernel
    if (kernel && kernel.getModule) {
      this._logger = kernel.getModule("logger");
      this._apiClient = kernel.getModule("apiClient") || window.ApiClient;
    }

    // Apply options
    if (options.apiClient) {
      this._apiClient = options.apiClient;
    }
    if (options.logger) {
      this._logger = options.logger;
    }
    if (options.mode) {
      this._mode = options.mode;
    }

    // Clear state
    this._runState = null;
    this._runHistory = [];
    this._abortController = null;
    this._activeGavel = null;
    this._gavelResolver = null;
    this._injectionMappings.clear();

    // Register with kernel
    if (kernel && kernel.registerSystem) {
      kernel.registerSystem("orchestration", this);
    }

    this._initialized = true;
    this._log("info", "Orchestration System initialized");
    this._emit("orchestration:initialized");

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
   * Check if system is ready for a run
   * @returns {boolean}
   */
  isReady() {
    return this._initialized && !this.isRunning();
  },

  // ===== MODE MANAGEMENT =====

  /**
   * Set the operating mode
   * @param {string} mode - Mode: 'synthesis' | 'compilation' | 'injection'
   * @returns {boolean} Success
   */
  setMode(mode) {
    if (this.isRunning()) {
      this._log("error", "Cannot change mode during an active run");
      return false;
    }

    if (!Object.values(this.Mode).includes(mode)) {
      this._log("error", `Invalid mode: ${mode}`);
      return false;
    }

    const oldMode = this._mode;
    this._mode = mode;

    this._log("info", `Mode changed from ${oldMode} to ${mode}`);
    this._emit("orchestration:mode:changed", { oldMode, newMode: mode });

    // Update kernel state if available
    if (this._kernel && this._kernel.setState) {
      this._kernel.setState("session.orchestrationMode", mode, true);
    }

    return true;
  },

  /**
   * Get the current operating mode
   * @returns {string}
   */
  getMode() {
    return this._mode;
  },

  /**
   * Configure injection mappings (for Mode 3)
   * @param {Object} mappings - Map of ST token to RAG pipeline ID
   */
  configureInjectionMappings(mappings) {
    this._injectionMappings.clear();
    for (const [token, pipelineId] of Object.entries(mappings)) {
      this._injectionMappings.set(token, pipelineId);
    }
    this._log("info", `Injection mappings configured: ${Object.keys(mappings).length} mappings`);
    this._emit("orchestration:injection:configured", { mappings });
  },

  /**
   * Get injection mappings
   * @returns {Object}
   */
  getInjectionMappings() {
    return Object.fromEntries(this._injectionMappings);
  },

  // ===== PUBLIC ST INTEGRATION API =====

  /**
   * Deliver response to SillyTavern (public API)
   * Delivers response based on current mode
   * @param {string} response - Response or prompt to deliver
   * @returns {Promise<boolean>} Success
   */
  async deliverToST(response) {
    if (!response) {
      this._log("warn", "Cannot deliver empty content to ST");
      return false;
    }

    try {
      switch (this._mode) {
        case this.Mode.SYNTHESIS:
          await this._deliverSynthesizedResponse(response);
          return true;

        case this.Mode.COMPILATION:
          await this._deliverCompiledPrompt(response);
          return true;

        case this.Mode.INJECTION:
          this._log("warn", "Injection mode does not use direct delivery");
          return false;

        default:
          this._log("error", `Unknown mode: ${this._mode}`);
          return false;
      }
    } catch (error) {
      this._log("error", `Failed to deliver to ST: ${error.message}`);
      return false;
    }
  },

  /**
   * Replace ST's prompt with Council-generated prompt (Mode 2)
   * @param {string} prompt - Compiled prompt
   * @returns {Promise<boolean>} Success
   */
  async replaceSTPrompt(prompt) {
    if (this._mode !== this.Mode.COMPILATION) {
      this._log("warn", "replaceSTPrompt should only be called in Compilation mode");
    }
    return this.deliverToST(prompt);
  },

  /**
   * Inject Council context into ST's prompt (Mode 3)
   * @param {Object} promptData - ST's prompt data
   * @returns {Object} Modified prompt data
   */
  injectSTContext(promptData) {
    return this.injectIntoSTPrompt(promptData);
  },

  // ===== RUN MANAGEMENT =====

  /**
   * Start a pipeline run
   * @param {string} pipelineId - Pipeline ID to execute
   * @param {Object} options - Run options
   * @param {string} options.userInput - User input text
   * @param {Object} options.context - Additional context
   * @param {string} options.mode - Override mode for this run
   * @returns {Promise<Object>} Run result
   */
  async startRun(pipelineId, options = {}) {
    if (this._runState && this._runState.status === this.RunStatus.RUNNING) {
      throw new Error("A pipeline run is already in progress");
    }

    // Get pipeline from PipelineBuilderSystem
    const pipelineBuilder = this._getSystem("pipelineBuilder");
    if (!pipelineBuilder) {
      throw new Error("PipelineBuilderSystem not available");
    }

    const pipeline = pipelineBuilder.getPipeline(pipelineId);
    if (!pipeline) {
      throw new Error(`Pipeline "${pipelineId}" not found`);
    }

    // Apply mode override if provided
    const runMode = options.mode || this._mode;

    // Create abort controller
    this._abortController = new AbortController();

    // Initialize run state
    this._runState = this._createRunState(pipeline, options, runMode);

    this._log("info", `Starting pipeline run: ${pipeline.name} (mode: ${runMode})`);
    this._emit("orchestration:run:started", { run: this._runState });

    // Run hooks
    await this._runHooks("beforePipelineRun", { run: this._runState, pipeline });

    try {
      // Execute all phases
      for (let i = 0; i < pipeline.phases.length; i++) {
        const phase = pipeline.phases[i];

        // Check for abort
        if (this._abortController.signal.aborted) {
          throw new Error("Pipeline run aborted");
        }

        // Wait while paused
        while (this._runState.status === this.RunStatus.PAUSED) {
          await this._sleep(100);
          if (this._abortController.signal.aborted) {
            throw new Error("Pipeline run aborted");
          }
        }

        await this._executePhase(phase, pipeline, i);
      }

      // Finalize run
      this._runState.status = this.RunStatus.COMPLETED;
      this._runState.endTime = Date.now();

      // Set final output based on mode
      await this._finalizeOutput(pipeline);

      this._log("info", `Pipeline run completed: ${pipeline.name}`);
      this._emit("orchestration:run:completed", { run: this._runState });

      // Run hooks
      await this._runHooks("afterPipelineRun", { run: this._runState, pipeline });

      // Store in history
      this._addToHistory(this._runState);

      const result = { ...this._runState };
      this._cleanupRun();

      return result;
    } catch (error) {
      this._runState.status = this._abortController.signal.aborted
        ? this.RunStatus.ABORTED
        : this.RunStatus.ERROR;
      this._runState.endTime = Date.now();
      this._runState.errors.push({
        phase: this._runState.currentPhaseId,
        action: this._runState.currentActionId,
        message: error.message,
        stack: error.stack,
        timestamp: Date.now(),
      });

      this._log("error", `Pipeline run failed: ${error.message}`);
      this._emit("orchestration:run:error", { run: this._runState, error });

      this._addToHistory(this._runState);

      const result = { ...this._runState };
      this._cleanupRun();

      throw error;
    }
  },

  /**
   * Pause the current run
   * @returns {boolean} Success
   */
  pauseRun() {
    if (!this._runState || this._runState.status !== this.RunStatus.RUNNING) {
      this._log("warn", "No active run to pause");
      return false;
    }

    this._runState.status = this.RunStatus.PAUSED;
    this._log("info", "Pipeline run paused");
    this._emit("orchestration:run:paused", { run: this._runState });

    return true;
  },

  /**
   * Resume a paused run
   * @returns {boolean} Success
   */
  resumeRun() {
    if (!this._runState || this._runState.status !== this.RunStatus.PAUSED) {
      this._log("warn", "No paused run to resume");
      return false;
    }

    this._runState.status = this.RunStatus.RUNNING;
    this._log("info", "Pipeline run resumed");
    this._emit("orchestration:run:resumed", { run: this._runState });

    return true;
  },

  /**
   * Abort the current run
   * @returns {boolean} Success
   */
  abortRun() {
    if (!this._runState || !this._abortController) {
      this._log("warn", "No active run to abort");
      return false;
    }

    this._log("info", "Aborting pipeline run...");
    this._abortController.abort();
    this._emit("orchestration:run:aborting", { run: this._runState });

    return true;
  },

  /**
   * Retry a failed action
   * @param {string} actionId - Action ID to retry
   * @returns {Promise<Object>} Retry result
   */
  async retryAction(actionId) {
    // This would be implemented to allow retrying a specific action
    // For now, we'll log a placeholder
    this._log("warn", "retryAction not yet fully implemented");
    return { success: false, message: "Not implemented" };
  },

  // ===== STATE QUERIES =====

  /**
   * Get the current run state
   * @returns {Object|null}
   */
  getRunState() {
    if (!this._runState) {
      return null;
    }
    return { ...this._runState };
  },

  /**
   * Get progress information
   * @returns {Object} Progress object
   */
  getProgress() {
    if (!this._runState) {
      return {
        status: this.RunStatus.IDLE,
        percentage: 0,
        currentPhase: null,
        currentAction: null,
        phasesCompleted: 0,
        phasesTotal: 0,
        actionsCompleted: 0,
        actionsTotal: 0,
      };
    }

    const { progress, status, currentPhaseId, currentActionId } = this._runState;

    // Calculate percentage
    let percentage = 0;
    if (progress.totalActions > 0) {
      percentage = Math.round((progress.completedActions / progress.totalActions) * 100);
    } else if (progress.totalPhases > 0) {
      percentage = Math.round((progress.completedPhases / progress.totalPhases) * 100);
    }

    if (status === this.RunStatus.COMPLETED) {
      percentage = 100;
    }

    return {
      status,
      percentage,
      currentPhase: currentPhaseId,
      currentAction: currentActionId,
      phasesCompleted: progress.completedPhases,
      phasesTotal: progress.totalPhases,
      actionsCompleted: progress.completedActions,
      actionsTotal: progress.totalActions,
      startTime: this._runState.startTime,
      elapsedMs: Date.now() - this._runState.startTime,
    };
  },

  /**
   * Get the output from the current or last run
   * @returns {any} Output value
   */
  getOutput() {
    if (this._runState) {
      return this._runState.output;
    }

    // Return from last completed run in history
    const lastRun = this._runHistory.find(r => r.status === this.RunStatus.COMPLETED);
    return lastRun ? lastRun.output : null;
  },

  /**
   * Get run history
   * @returns {Array<Object>}
   */
  getHistory() {
    return [...this._runHistory];
  },

  /**
   * Check if a run is currently active
   * @returns {boolean}
   */
  isRunning() {
    return this._runState !== null &&
      (this._runState.status === this.RunStatus.RUNNING ||
       this._runState.status === this.RunStatus.PAUSED);
  },

  // ===== GAVEL (USER INTERVENTION) =====

  /**
   * Get the active gavel request
   * @returns {Object|null}
   */
  getActiveGavel() {
    return this._activeGavel;
  },

  /**
   * Approve the active gavel with optional modifications
   * @param {string} gavelId - Gavel ID
   * @param {Object} modifications - Optional modifications to output
   * @returns {boolean} Success
   */
  approveGavel(gavelId, modifications = null) {
    if (!this._activeGavel || this._activeGavel.id !== gavelId) {
      this._log("warn", `No active gavel with ID: ${gavelId}`);
      return false;
    }

    const response = {
      approved: true,
      skipped: false,
      modifications,
      output: modifications?.output || this._activeGavel.currentOutput,
    };

    if (this._gavelResolver) {
      this._gavelResolver(response);
    }

    this._emit("orchestration:gavel:approved", { gavelId, modifications });
    this._activeGavel = null;
    this._gavelResolver = null;

    return true;
  },

  /**
   * Reject the active gavel
   * @param {string} gavelId - Gavel ID
   * @returns {boolean} Success
   */
  rejectGavel(gavelId) {
    if (!this._activeGavel || this._activeGavel.id !== gavelId) {
      this._log("warn", `No active gavel with ID: ${gavelId}`);
      return false;
    }

    const response = {
      approved: false,
      skipped: true,
      modifications: null,
      output: this._activeGavel.currentOutput,
    };

    if (this._gavelResolver) {
      this._gavelResolver(response);
    }

    this._emit("orchestration:gavel:rejected", { gavelId });
    this._activeGavel = null;
    this._gavelResolver = null;

    return true;
  },

  // ===== PHASE EXECUTION =====

  /**
   * Execute a single phase
   * @param {Object} phase - Phase definition
   * @param {Object} pipeline - Pipeline definition
   * @param {number} phaseIndex - Phase index
   * @returns {Promise<void>}
   */
  async _executePhase(phase, pipeline, phaseIndex) {
    this._log("debug", `Executing phase: ${phase.name}`);

    // Update run state
    this._runState.currentPhaseId = phase.id;
    this._runState.progress.currentPhase = phaseIndex;

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
      error: null,
    };
    this._runState.phases[phase.id] = phaseState;

    this._emit("orchestration:phase:lifecycle", {
      phaseId: phase.id,
      lifecycle: this.PhaseLifecycle.START,
    });

    try {
      // START lifecycle - resolve phase input
      await this._onPhaseStart(phase, phaseState, phaseIndex);

      // BEFORE_ACTIONS lifecycle
      phaseState.lifecycle = this.PhaseLifecycle.BEFORE_ACTIONS;
      this._emit("orchestration:phase:lifecycle", {
        phaseId: phase.id,
        lifecycle: this.PhaseLifecycle.BEFORE_ACTIONS,
      });

      // IN_PROGRESS - Execute actions
      phaseState.lifecycle = this.PhaseLifecycle.IN_PROGRESS;
      this._emit("orchestration:phase:lifecycle", {
        phaseId: phase.id,
        lifecycle: this.PhaseLifecycle.IN_PROGRESS,
      });

      for (let i = 0; i < phase.actions.length; i++) {
        const action = phase.actions[i];

        // Check for abort
        if (this._abortController?.signal.aborted) {
          throw new Error("Pipeline run aborted");
        }

        // Wait while paused
        while (this._runState?.status === this.RunStatus.PAUSED) {
          await this._sleep(100);
          if (this._abortController?.signal.aborted) {
            throw new Error("Pipeline run aborted");
          }
        }

        await this._executeAction(action, phase, phaseState, i);
      }

      // AFTER_ACTIONS lifecycle
      phaseState.lifecycle = this.PhaseLifecycle.AFTER_ACTIONS;
      this._emit("orchestration:phase:lifecycle", {
        phaseId: phase.id,
        lifecycle: this.PhaseLifecycle.AFTER_ACTIONS,
      });

      // Consolidate phase output
      await this._consolidatePhaseOutput(phase, phaseState);

      // Handle gavel if enabled for this phase
      if (phase.gavel?.enabled) {
        phaseState.lifecycle = this.PhaseLifecycle.RESPOND;
        this._emit("orchestration:phase:lifecycle", {
          phaseId: phase.id,
          lifecycle: this.PhaseLifecycle.RESPOND,
        });

        await this._handlePhaseGavel(phase, phaseState);
      }

      // END lifecycle
      phaseState.lifecycle = this.PhaseLifecycle.END;
      phaseState.endedAt = Date.now();
      this._runState.progress.completedPhases++;

      this._emit("orchestration:phase:lifecycle", {
        phaseId: phase.id,
        lifecycle: this.PhaseLifecycle.END,
      });

      // Update progress
      this._emitProgress();
    } catch (error) {
      phaseState.error = error.message;
      phaseState.endedAt = Date.now();
      this._emit("orchestration:phase:error", { phaseId: phase.id, error });
      throw error;
    }
  },

  // ===== ACTION EXECUTION =====

  /**
   * Execute a single action
   * @param {Object} action - Action definition
   * @param {Object} phase - Phase definition
   * @param {Object} phaseState - Phase state
   * @param {number} actionIndex - Action index
   * @returns {Promise<void>}
   */
  async _executeAction(action, phase, phaseState, actionIndex) {
    this._log("debug", `Executing action: ${action.name}`);

    // Update run state
    this._runState.currentActionId = action.id;

    // Initialize action state
    const actionState = {
      id: action.id,
      name: action.name,
      actionType: action.actionType || "standard",
      lifecycle: this.ActionLifecycle.CALLED,
      startedAt: Date.now(),
      endedAt: null,
      input: null,
      output: null,
      responses: [],
      error: null,
      attempts: 0,
    };
    phaseState.actions[action.id] = actionState;

    this._emit("orchestration:action:lifecycle", {
      phaseId: phase.id,
      actionId: action.id,
      lifecycle: this.ActionLifecycle.CALLED,
    });

    // Retry configuration
    const maxRetries = action.execution?.retryCount || 0;
    const timeout = action.execution?.timeout || 60000;
    let lastError = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        actionState.attempts = attempt + 1;

        if (attempt > 0) {
          this._log("info", `Retrying action ${action.name} (attempt ${attempt + 1}/${maxRetries + 1})`);
          this._emit("orchestration:action:retry", {
            phaseId: phase.id,
            actionId: action.id,
            attempt: attempt + 1,
            maxRetries: maxRetries + 1,
            previousError: lastError?.message,
          });
          await this._sleep(1000 * attempt); // Exponential backoff
        }

        // START lifecycle
        actionState.lifecycle = this.ActionLifecycle.START;
        this._emit("orchestration:action:lifecycle", {
          phaseId: phase.id,
          actionId: action.id,
          lifecycle: this.ActionLifecycle.START,
        });

        // Resolve input
        actionState.input = await this._resolveActionInput(action, phaseState);

        // IN_PROGRESS lifecycle
        actionState.lifecycle = this.ActionLifecycle.IN_PROGRESS;
        this._emit("orchestration:action:lifecycle", {
          phaseId: phase.id,
          actionId: action.id,
          lifecycle: this.ActionLifecycle.IN_PROGRESS,
        });

        // Execute with timeout
        const output = await this._executeActionWithTimeout(action, actionState, phaseState, timeout);

        // Store output
        actionState.output = output;

        // Route output to appropriate target
        await this._routeActionOutput(action, actionState, phaseState);

        // COMPLETE lifecycle
        actionState.lifecycle = this.ActionLifecycle.COMPLETE;
        actionState.endedAt = Date.now();
        this._runState.progress.completedActions++;

        this._emit("orchestration:action:lifecycle", {
          phaseId: phase.id,
          actionId: action.id,
          lifecycle: this.ActionLifecycle.COMPLETE,
        });

        // Update progress
        this._emitProgress();

        // Success - exit retry loop
        return;
      } catch (error) {
        lastError = error;

        // Don't retry on abort
        if (this._abortController?.signal?.aborted || error.message === "Pipeline run aborted") {
          actionState.error = "Aborted";
          actionState.endedAt = Date.now();
          throw error;
        }

        this._log("warn", `Action ${action.name} failed (attempt ${attempt + 1}): ${error.message}`);

        // If exhausted retries, fail
        if (attempt >= maxRetries) {
          actionState.error = error.message;
          actionState.endedAt = Date.now();
          this._emit("orchestration:action:error", {
            phaseId: phase.id,
            actionId: action.id,
            error,
            attempts: attempt + 1,
          });
          throw error;
        }
      }
    }
  },

  /**
   * Execute action with timeout wrapper
   * @param {Object} action - Action definition
   * @param {Object} actionState - Action state
   * @param {Object} phaseState - Phase state
   * @param {number} timeout - Timeout in ms
   * @returns {Promise<*>} Action output
   */
  async _executeActionWithTimeout(action, actionState, phaseState, timeout) {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Action "${action.name}" timed out after ${timeout}ms`));
      }, timeout);
    });

    const executionPromise = this._executeActionByType(action, actionState, phaseState);

    return Promise.race([executionPromise, timeoutPromise]);
  },

  /**
   * Execute action based on type
   * @param {Object} action - Action definition
   * @param {Object} actionState - Action state
   * @param {Object} phaseState - Phase state
   * @returns {Promise<*>} Action output
   */
  async _executeActionByType(action, actionState, phaseState) {
    const actionType = action.actionType || "standard";

    switch (actionType) {
      case "crud_pipeline":
        return this._executeCRUDAction(action, actionState, phaseState);

      case "rag_pipeline":
        return this._executeRAGAction(action, actionState, phaseState);

      case "deliberative_rag":
        return this._executeDeliberativeRAGAction(action, actionState, phaseState);

      case "user_gavel":
        return this._executeUserGavelAction(action, actionState, phaseState);

      case "system":
        return this._executeSystemAction(action, actionState, phaseState);

      case "character_workshop":
        return this._executeCharacterWorkshopAction(action, actionState, phaseState);

      case "standard":
      default:
        return this._executeStandardAction(action, actionState, phaseState);
    }
  },

  // ===== ACTION TYPE EXECUTORS =====

  /**
   * Execute a standard action with participants
   * @param {Object} action - Action definition
   * @param {Object} actionState - Action state
   * @param {Object} phaseState - Phase state
   * @returns {Promise<string>} Output
   */
  async _executeStandardAction(action, actionState, phaseState) {
    // Get participants from PipelineBuilderSystem
    const pipelineBuilder = this._getSystem("pipelineBuilder");
    if (!pipelineBuilder) {
      throw new Error("PipelineBuilderSystem not available");
    }

    // Resolve participants
    const participants = this._resolveParticipants(action, pipelineBuilder);

    if (participants.length === 0) {
      this._log("warn", `No participants for action ${action.id}, using input as output`);
      return actionState.input || "";
    }

    // Execute RAG if enabled
    let ragContext = "";
    if (action.rag?.enabled) {
      ragContext = await this._executeActionRAG(action, actionState);
    }

    // Build context for prompt
    const context = this._buildActionContext(action, actionState, phaseState, ragContext);

    // Execute based on orchestration mode
    const orchestration = action.participants?.orchestration || "sequential";
    let responses = [];

    switch (orchestration) {
      case "parallel":
        responses = await this._executeParallel(participants, action, context);
        break;

      case "round_robin":
        responses = await this._executeRoundRobin(participants, action, context);
        break;

      case "consensus":
        responses = await this._executeConsensus(participants, action, context);
        break;

      case "sequential":
      default:
        responses = await this._executeSequential(participants, action, context);
        break;
    }

    actionState.responses = responses;

    // Consolidate responses
    return this._consolidateResponses(responses, action);
  },

  /**
   * Execute a CRUD pipeline action
   * @param {Object} action - Action definition
   * @param {Object} actionState - Action state
   * @param {Object} phaseState - Phase state
   * @returns {Promise<string>} Output
   */
  async _executeCRUDAction(action, actionState, phaseState) {
    const curationSystem = this._getSystem("curation");
    if (!curationSystem) {
      throw new Error("CurationSystem not available for CRUD action");
    }

    const config = action.crudConfig;
    if (!config?.pipelineId) {
      throw new Error("CRUD action requires crudConfig.pipelineId");
    }

    this._log("debug", `Executing CRUD pipeline: ${config.pipelineId}`);

    const operation = config.operation || "read";
    const storeId = config.storeId;
    let result;

    switch (operation) {
      case "create":
        result = curationSystem.create(storeId, actionState.input);
        break;
      case "read":
        result = curationSystem.read(storeId, actionState.input);
        break;
      case "update":
        result = curationSystem.update(storeId, actionState.input?.id, actionState.input);
        break;
      case "delete":
        result = curationSystem.delete(storeId, actionState.input?.id || actionState.input);
        break;
      default:
        throw new Error(`Unknown CRUD operation: ${operation}`);
    }

    this._emit("orchestration:action:crud:complete", {
      actionId: action.id,
      pipelineId: config.pipelineId,
      operation,
      result,
    });

    return typeof result === "string" ? result : JSON.stringify(result, null, 2);
  },

  /**
   * Execute a RAG pipeline action
   * @param {Object} action - Action definition
   * @param {Object} actionState - Action state
   * @param {Object} phaseState - Phase state
   * @returns {Promise<string>} Output
   */
  async _executeRAGAction(action, actionState, phaseState) {
    const curationSystem = this._getSystem("curation");
    if (!curationSystem) {
      throw new Error("CurationSystem not available for RAG action");
    }

    const config = action.ragConfig;
    if (!config?.pipelineId) {
      throw new Error("RAG action requires ragConfig.pipelineId");
    }

    this._log("debug", `Executing RAG pipeline: ${config.pipelineId}`);

    // Build query
    let query = actionState.input;
    if (config.queryTemplate) {
      query = config.queryTemplate.replace("{{input}}", actionState.input || "");
    }

    // Execute RAG
    const result = await curationSystem.executeRAG(config.pipelineId, {
      query,
      limit: config.maxResults || 5,
    });

    this._emit("orchestration:action:rag:complete", {
      actionId: action.id,
      pipelineId: config.pipelineId,
      query,
      resultCount: result?.count || 0,
    });

    // Format results
    if (result?.results && result.results.length > 0) {
      return result.results
        .map(r => `[${r.storeName}] ${JSON.stringify(r.entry)}`)
        .join("\n\n");
    }

    return "No relevant information found.";
  },

  /**
   * Execute a Deliberative RAG action
   * @param {Object} action - Action definition
   * @param {Object} actionState - Action state
   * @param {Object} phaseState - Phase state
   * @returns {Promise<string>} Output
   */
  async _executeDeliberativeRAGAction(action, actionState, phaseState) {
    // Simplified implementation - full version would involve multi-round Q&A
    this._log("debug", "Executing Deliberative RAG action");

    // For now, delegate to RAG action
    const ragResult = await this._executeRAGAction(action, actionState, phaseState);

    this._emit("orchestration:action:deliberative_rag:complete", {
      actionId: action.id,
    });

    return ragResult;
  },

  /**
   * Execute a User Gavel action
   * @param {Object} action - Action definition
   * @param {Object} actionState - Action state
   * @param {Object} phaseState - Phase state
   * @returns {Promise<string>} Output
   */
  async _executeUserGavelAction(action, actionState, phaseState) {
    const config = action.gavelConfig || {};

    this._log("debug", `User Gavel: ${config.prompt || "Review output"}`);

    // Create gavel request
    const gavelId = `gavel_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    this._activeGavel = {
      id: gavelId,
      actionId: action.id,
      phaseId: phaseState.id,
      prompt: config.prompt || "Review and edit if needed:",
      currentOutput: actionState.input,
      editableFields: config.editableFields || ["output"],
      canSkip: config.canSkip !== false,
      timeout: config.timeout || 0,
    };

    this._emit("orchestration:gavel:requested", {
      gavel: this._activeGavel,
    });

    // Wait for user response
    return new Promise((resolve, reject) => {
      this._gavelResolver = resolve;

      // Handle timeout if set
      if (config.timeout > 0) {
        setTimeout(() => {
          if (this._activeGavel?.id === gavelId) {
            if (config.canSkip) {
              resolve({ output: actionState.input });
            } else {
              reject(new Error("User gavel timed out"));
            }
            this._activeGavel = null;
            this._gavelResolver = null;
          }
        }, config.timeout);
      }
    }).then(response => {
      return response.output || actionState.input;
    });
  },

  /**
   * Execute a System action (no LLM call)
   * @param {Object} action - Action definition
   * @param {Object} actionState - Action state
   * @param {Object} phaseState - Phase state
   * @returns {Promise<string>} Output
   */
  async _executeSystemAction(action, actionState, phaseState) {
    this._log("debug", `System action: ${action.name}`);

    // System actions can transform input without LLM
    if (action.promptTemplate) {
      // Simple token replacement
      let output = action.promptTemplate;
      output = output.replace(/\{\{input\}\}/g, actionState.input || "");
      output = output.replace(/\{\{phase\.output\}\}/g, phaseState.output || "");
      return output;
    }

    // Pass through input
    return actionState.input || "";
  },

  /**
   * Execute a Character Workshop action
   * @param {Object} action - Action definition
   * @param {Object} actionState - Action state
   * @param {Object} phaseState - Phase state
   * @returns {Promise<string>} Output
   */
  async _executeCharacterWorkshopAction(action, actionState, phaseState) {
    const characterSystem = this._getSystem("character");
    if (!characterSystem) {
      throw new Error("CharacterSystem not available for Character Workshop action");
    }

    const config = action.characterWorkshopConfig || {};
    this._log("debug", `Character Workshop: ${action.name} (mode: ${config.mode || "refinement"})`);

    // Get character agents
    let characterAgents = [];
    if (config.characterIds?.length > 0) {
      for (const charId of config.characterIds) {
        const agent = characterSystem.getCharacterAgent(charId);
        if (agent) characterAgents.push(agent);
      }
    } else {
      characterAgents = characterSystem.getSpawnedAgents?.() || [];
    }

    if (characterAgents.length === 0) {
      this._log("warn", "No character agents for workshop");
      return actionState.input || "";
    }

    // Simple workshop: have each character respond
    const responses = [];
    for (const agent of characterAgents) {
      const response = await this._callAgent(agent, actionState.input, {
        role: "character",
        context: `As ${agent.name}, respond in character.`,
      });
      responses.push({
        character: agent.name,
        response,
      });
    }

    this._emit("orchestration:character:workshop:complete", {
      actionId: action.id,
      mode: config.mode,
      characterCount: characterAgents.length,
    });

    // Format output
    return responses
      .map(r => `[${r.character}]: ${r.response}`)
      .join("\n\n");
  },

  // ===== ORCHESTRATION MODES =====

  /**
   * Execute participants sequentially
   * @param {Array} participants - Participant agents
   * @param {Object} action - Action definition
   * @param {Object} context - Execution context
   * @returns {Promise<Array>} Responses
   */
  async _executeSequential(participants, action, context) {
    const responses = [];
    let previousResponse = "";

    for (const participant of participants) {
      const prompt = this._buildParticipantPrompt(action, context, participant, previousResponse);
      const response = await this._callAgent(participant, prompt, context);

      responses.push({
        participantId: participant.id,
        participantName: participant.name,
        response,
        timestamp: Date.now(),
      });

      previousResponse = response;
    }

    return responses;
  },

  /**
   * Execute participants in parallel
   * @param {Array} participants - Participant agents
   * @param {Object} action - Action definition
   * @param {Object} context - Execution context
   * @returns {Promise<Array>} Responses
   */
  async _executeParallel(participants, action, context) {
    const promises = participants.map(async participant => {
      const prompt = this._buildParticipantPrompt(action, context, participant, "");
      const response = await this._callAgent(participant, prompt, context);

      return {
        participantId: participant.id,
        participantName: participant.name,
        response,
        timestamp: Date.now(),
      };
    });

    return Promise.all(promises);
  },

  /**
   * Execute participants in round robin
   * @param {Array} participants - Participant agents
   * @param {Object} action - Action definition
   * @param {Object} context - Execution context
   * @returns {Promise<Array>} Responses
   */
  async _executeRoundRobin(participants, action, context) {
    // For round robin, we just execute sequentially with conversation building
    return this._executeSequential(participants, action, context);
  },

  /**
   * Execute consensus mode
   * @param {Array} participants - Participant agents
   * @param {Object} action - Action definition
   * @param {Object} context - Execution context
   * @returns {Promise<Array>} Responses
   */
  async _executeConsensus(participants, action, context) {
    // Get initial responses in parallel
    const initialResponses = await this._executeParallel(participants, action, context);

    // If only one participant, return immediately
    if (participants.length <= 1) {
      return initialResponses;
    }

    // Have a designated participant synthesize
    const synthesizer = participants[0];
    const synthesizerPrompt = `Review these responses and synthesize a consensus:\n\n${
      initialResponses.map(r => `[${r.participantName}]: ${r.response}`).join("\n\n")
    }\n\nProvide a synthesized response that captures the best elements.`;

    const synthesizedResponse = await this._callAgent(synthesizer, synthesizerPrompt, context);

    return [
      ...initialResponses,
      {
        participantId: synthesizer.id,
        participantName: `${synthesizer.name} (Synthesis)`,
        response: synthesizedResponse,
        timestamp: Date.now(),
        isSynthesis: true,
      },
    ];
  },

  // ===== HELPER METHODS =====

  /**
   * Call an agent with a prompt
   * @param {Object} agent - Agent definition
   * @param {string} prompt - Prompt text
   * @param {Object} context - Additional context
   * @returns {Promise<string>} Response
   */
  async _callAgent(agent, prompt, context = {}) {
    if (!this._apiClient) {
      this._log("warn", "ApiClient not available, returning placeholder");
      return `[${agent.name}]: (API unavailable)`;
    }

    try {
      const systemPrompt = agent.systemPrompt?.customText || agent.systemPrompt || "";

      const result = await this._apiClient.generate({
        systemPrompt,
        userPrompt: prompt,
        apiConfig: agent.apiConfig || {},
        generationConfig: agent.generationConfig || {},
      });

      if (result.success) {
        return result.content || "";
      } else {
        throw new Error(result.error || "Generation failed");
      }
    } catch (error) {
      this._log("error", `Agent call failed for ${agent.name}: ${error.message}`);
      throw error;
    }
  },

  /**
   * Resolve participants for an action
   * @param {Object} action - Action definition
   * @param {Object} pipelineBuilder - PipelineBuilderSystem reference
   * @returns {Array} Resolved participants
   */
  _resolveParticipants(action, pipelineBuilder) {
    const participants = [];
    const config = action.participants || {};

    // Add agents from position IDs
    if (config.positionIds?.length > 0) {
      for (const positionId of config.positionIds) {
        const agent = pipelineBuilder.getAgentForPosition?.(positionId);
        if (agent) {
          participants.push(agent);
        }
      }
    }

    // Add agents from team IDs
    if (config.teamIds?.length > 0) {
      for (const teamId of config.teamIds) {
        const team = pipelineBuilder.getTeam?.(teamId);
        if (team?.positions) {
          for (const positionId of team.positions) {
            const agent = pipelineBuilder.getAgentForPosition?.(positionId);
            if (agent && !participants.find(p => p.id === agent.id)) {
              participants.push(agent);
            }
          }
        }
      }
    }

    return participants;
  },

  /**
   * Build prompt for a participant
   * @param {Object} action - Action definition
   * @param {Object} context - Execution context
   * @param {Object} participant - Participant agent
   * @param {string} previousResponse - Previous response (for sequential)
   * @returns {string} Built prompt
   */
  _buildParticipantPrompt(action, context, participant, previousResponse) {
    let prompt = action.promptTemplate || "{{input}}";

    // Replace tokens
    prompt = prompt.replace(/\{\{input\}\}/g, context.input || "");
    prompt = prompt.replace(/\{\{ragContext\}\}/g, context.ragContext || "");
    prompt = prompt.replace(/\{\{previousResponse\}\}/g, previousResponse || "");
    prompt = prompt.replace(/\{\{participant\.name\}\}/g, participant.name || "");

    return prompt;
  },

  /**
   * Build action context
   * @param {Object} action - Action definition
   * @param {Object} actionState - Action state
   * @param {Object} phaseState - Phase state
   * @param {string} ragContext - RAG context
   * @returns {Object} Context object
   */
  _buildActionContext(action, actionState, phaseState, ragContext) {
    return {
      input: actionState.input,
      ragContext,
      phaseId: phaseState.id,
      phaseName: phaseState.name,
      phaseInput: phaseState.input,
      globals: this._runState?.globals || {},
    };
  },

  /**
   * Execute RAG for an action
   * @param {Object} action - Action definition
   * @param {Object} actionState - Action state
   * @returns {Promise<string>} RAG results
   */
  async _executeActionRAG(action, actionState) {
    const curationSystem = this._getSystem("curation");
    if (!curationSystem) {
      return "";
    }

    try {
      const ragConfig = action.rag;
      const query = ragConfig.queryTemplate?.replace("{{input}}", actionState.input || "") || actionState.input;

      const result = await curationSystem.executeRAG(ragConfig.ragPipelineId, {
        query,
        limit: 5,
      });

      if (result?.results?.length > 0) {
        return result.results.map(r => JSON.stringify(r.entry)).join("\n");
      }
    } catch (error) {
      this._log("warn", `RAG execution failed: ${error.message}`);
    }

    return "";
  },

  /**
   * Consolidate multiple responses into one output
   * @param {Array} responses - Response objects
   * @param {Object} action - Action definition
   * @returns {string} Consolidated output
   */
  _consolidateResponses(responses, action) {
    if (responses.length === 0) {
      return "";
    }

    // Check for synthesis response
    const synthesis = responses.find(r => r.isSynthesis);
    if (synthesis) {
      return synthesis.response;
    }

    // Return last response by default
    return responses[responses.length - 1].response;
  },

  /**
   * Resolve action input based on configuration
   * @param {Object} action - Action definition
   * @param {Object} phaseState - Phase state
   * @returns {Promise<*>} Resolved input
   */
  async _resolveActionInput(action, phaseState) {
    const inputConfig = action.input || {};
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
        if (globalKey && this._runState?.globals) {
          input = this._runState.globals[globalKey];
        }
        break;

      case "custom":
        input = inputConfig.sourceKey;
        break;

      default:
        input = phaseState.input || this._runState?.input?.userInput;
    }

    return input;
  },

  /**
   * Route action output to appropriate target
   * @param {Object} action - Action definition
   * @param {Object} actionState - Action state
   * @param {Object} phaseState - Phase state
   */
  async _routeActionOutput(action, actionState, phaseState) {
    const outputConfig = action.output || {};
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
        if (this._runState?.globals) {
          if (globalKey === "custom") {
            if (!this._runState.globals.custom) {
              this._runState.globals.custom = {};
            }
            this._runState.globals.custom[action.id] = output;
          } else {
            this._runState.globals[globalKey] = output;
          }
        }
        break;

      case "nextAction":
        // Will be picked up by next action's input resolution
        break;

      default:
        phaseState.output = output;
    }
  },

  /**
   * Consolidate phase outputs
   * @param {Object} phase - Phase definition
   * @param {Object} phaseState - Phase state
   */
  async _consolidatePhaseOutput(phase, phaseState) {
    const consolidation = phase.output?.consolidation || "last_action";

    switch (consolidation) {
      case "last_action":
        // Output already set by last action
        break;

      case "merge":
        const outputs = Object.values(phaseState.actions)
          .filter(a => a.output)
          .map(a => a.output);
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
        // These require additional handling
        break;
    }

    // Update global output if configured
    if (phase.output?.phaseOutput?.target === "global" && phaseState.output) {
      const key = phase.output.phaseOutput.targetKey;
      if (key && this._runState?.globals) {
        this._runState.globals[key] = phaseState.output;
      }
    }
  },

  /**
   * Handle phase-level gavel
   * @param {Object} phase - Phase definition
   * @param {Object} phaseState - Phase state
   */
  async _handlePhaseGavel(phase, phaseState) {
    if (!phase.gavel?.enabled) return;

    const gavelId = `phase_gavel_${phase.id}_${Date.now()}`;

    this._activeGavel = {
      id: gavelId,
      phaseId: phase.id,
      prompt: phase.gavel.prompt || "Review phase output:",
      currentOutput: phaseState.output,
      editableFields: phase.gavel.editableFields || ["output"],
      canSkip: phase.gavel.canSkip !== false,
    };

    this._log("info", `Gavel requested for phase: ${phase.name}`);
    this._emit("orchestration:gavel:requested", { gavel: this._activeGavel });

    // Wait for response
    const response = await new Promise(resolve => {
      this._gavelResolver = resolve;
    });

    if (response.output) {
      phaseState.output = response.output;
    }

    this._activeGavel = null;
    this._gavelResolver = null;
  },

  /**
   * Phase start handler - initialize phase input
   * @param {Object} phase - Phase definition
   * @param {Object} phaseState - Phase state
   * @param {number} phaseIndex - Phase index
   */
  async _onPhaseStart(phase, phaseState, phaseIndex) {
    if (phaseIndex === 0) {
      // First phase gets user input
      phaseState.input = this._runState.input?.userInput || "";
    } else {
      // Subsequent phases get previous phase output
      const prevPhases = Object.values(this._runState.phases);
      if (prevPhases.length > 0) {
        const prevPhase = prevPhases[prevPhases.length - 1];
        phaseState.input = prevPhase.output || "";
      }
    }
  },

  /**
   * Finalize output based on mode
   * @param {Object} pipeline - Pipeline definition
   */
  async _finalizeOutput(pipeline) {
    // Get last phase output
    const phases = Object.values(this._runState.phases);
    const lastPhase = phases[phases.length - 1];
    const finalOutput = lastPhase?.output || "";

    // Store in run state
    this._runState.output = finalOutput;

    // Mode-specific handling
    switch (this._mode) {
      case this.Mode.SYNTHESIS:
        // Mode 1: Deliver synthesized response to ST chat
        this._log("info", "Synthesis mode: Delivering final response to ST chat");
        await this._deliverSynthesizedResponse(finalOutput);
        break;

      case this.Mode.COMPILATION:
        // Mode 2: Replace ST's prompt with compiled prompt
        this._log("info", "Compilation mode: Setting compiled prompt for ST LLM");
        await this._deliverCompiledPrompt(finalOutput);
        break;

      case this.Mode.INJECTION:
        // Injection mode doesn't typically use pipelines
        this._log("debug", "Injection mode: output processed");
        break;
    }
  },

  /**
   * Create initial run state
   * @param {Object} pipeline - Pipeline definition
   * @param {Object} options - Run options
   * @param {string} mode - Operating mode
   * @returns {Object} Run state
   */
  _createRunState(pipeline, options, mode) {
    // Count total actions
    let totalActions = 0;
    for (const phase of pipeline.phases) {
      totalActions += phase.actions?.length || 0;
    }

    return {
      id: `run_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      pipelineId: pipeline.id,
      pipelineName: pipeline.name,
      mode,
      status: this.RunStatus.RUNNING,
      startTime: Date.now(),
      endTime: null,

      // Input
      input: {
        userInput: options.userInput || "",
        context: options.context || {},
      },

      // Globals (copy from pipeline defaults)
      globals: { ...pipeline.globals, custom: {} },

      // Phase states
      phases: {},

      // Current position
      currentPhaseId: null,
      currentActionId: null,

      // Progress tracking
      progress: {
        totalPhases: pipeline.phases.length,
        completedPhases: 0,
        currentPhase: -1,
        totalActions,
        completedActions: 0,
      },

      // Output
      output: null,

      // Errors
      errors: [],

      // History
      history: [],
    };
  },

  /**
   * Clean up after a run
   */
  _cleanupRun() {
    this._runState = null;
    this._abortController = null;
    this._activeGavel = null;
    this._gavelResolver = null;
  },

  /**
   * Add run to history
   * @param {Object} run - Run state
   */
  _addToHistory(run) {
    this._runHistory.unshift({ ...run });
    if (this._runHistory.length > this._maxRunHistory) {
      this._runHistory.pop();
    }
  },

  /**
   * Get a system from the kernel
   * @param {string} name - System name
   * @returns {Object|null}
   */
  _getSystem(name) {
    if (this._kernel && this._kernel.getSystem) {
      return this._kernel.getSystem(name);
    }
    return null;
  },

  /**
   * Run hooks via kernel
   * @param {string} hookName - Hook name
   * @param {Object} context - Hook context
   */
  async _runHooks(hookName, context) {
    if (this._kernel && this._kernel.runHooks) {
      await this._kernel.runHooks(hookName, context);
    }
  },

  /**
   * Sleep for specified milliseconds
   * @param {number} ms - Milliseconds
   * @returns {Promise<void>}
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  /**
   * Emit progress update
   */
  _emitProgress() {
    this._emit("orchestration:progress:updated", { progress: this.getProgress() });
  },

  // ===== ST INTEGRATION =====

  /**
   * Deliver synthesized response to ST chat (Mode 1)
   * @param {string} response - Final synthesized response
   * @returns {Promise<void>}
   */
  async _deliverSynthesizedResponse(response) {
    if (!response || response.trim() === "") {
      this._log("warn", "Cannot deliver empty response to ST");
      return;
    }

    try {
      // Get ST context
      const stContext = window.SillyTavern?.getContext?.();
      if (!stContext) {
        this._log("error", "SillyTavern context not available");
        this._emit("orchestration:st:error", {
          mode: "synthesis",
          error: "ST context unavailable"
        });
        return;
      }

      // Add the response as an AI message to chat
      // ST's addOneMessage expects: { mes: string, is_user: boolean, name: string }
      const characterName = stContext.name2 || "Assistant";

      // Use ST's sendMessageAs if available (preferred method)
      if (typeof window.Generate_called === "function") {
        this._log("debug", "Injecting Council response into ST generation");

        // Store the response to be picked up by ST
        window.councilSynthesizedResponse = response;

        // Trigger ST to display the message
        if (typeof window.addOneMessage === "function") {
          await window.addOneMessage({
            mes: response,
            is_user: false,
            name: characterName,
            force_avatar: false,
            extra: {
              type: "council_synthesis",
              pipelineId: this._runState?.pipelineId,
              runId: this._runState?.id,
            }
          });

          this._log("info", "Response delivered to ST chat successfully");
          this._emit("orchestration:st:delivered", {
            mode: "synthesis",
            messageLength: response.length
          });
        }
      } else {
        this._log("warn", "ST message injection API not available");
      }

    } catch (error) {
      this._log("error", `Failed to deliver response to ST: ${error.message}`);
      this._emit("orchestration:st:error", {
        mode: "synthesis",
        error: error.message
      });
    }
  },

  /**
   * Deliver compiled prompt to replace ST's prompt (Mode 2)
   * @param {string} prompt - Compiled prompt
   * @returns {Promise<void>}
   */
  async _deliverCompiledPrompt(prompt) {
    if (!prompt || prompt.trim() === "") {
      this._log("warn", "Cannot deliver empty compiled prompt to ST");
      return;
    }

    try {
      // Store the compiled prompt globally for ST to use
      // This will be picked up by ST's generate interceptor or prompt builder
      window.councilCompiledPrompt = {
        prompt: prompt,
        timestamp: Date.now(),
        pipelineId: this._runState?.pipelineId,
        runId: this._runState?.id,
      };

      this._log("info", `Compiled prompt ready (${prompt.length} chars)`);
      this._log("debug", "Prompt preview:", prompt.substring(0, 200) + "...");

      this._emit("orchestration:st:prompt_ready", {
        mode: "compilation",
        promptLength: prompt.length,
        preview: prompt.substring(0, 100)
      });

      // Notify that ST should now call its LLM with this prompt
      this._log("info", "ST should now generate using the compiled prompt");

      // If ST's generate function is available, we can trigger it
      if (typeof window.Generate === "function") {
        this._log("debug", "Triggering ST generation with compiled prompt");

        // ST will check window.councilCompiledPrompt and use it instead of default prompt
        // This requires integration on the ST side or via generate_interceptor
      }

    } catch (error) {
      this._log("error", `Failed to deliver compiled prompt: ${error.message}`);
      this._emit("orchestration:st:error", {
        mode: "compilation",
        error: error.message
      });
    }
  },

  /**
   * Inject Council data into ST's prompt (Mode 3 support)
   * @param {Object} promptData - ST's prompt data object
   * @returns {Object} Modified prompt data
   */
  injectIntoSTPrompt(promptData) {
    // Mode 3 functionality - replace tokens with RAG results
    if (this._mode !== this.Mode.INJECTION || this._injectionMappings.size === 0) {
      return promptData;
    }

    this._log("debug", "Injecting Council data into ST prompt (Mode 3)");

    try {
      let modifiedPrompt = promptData.prompt || "";

      // Replace each mapped token with RAG results
      for (const [stToken, ragPipelineId] of this._injectionMappings) {
        const tokenRegex = new RegExp(`{{${stToken}}}`, 'g');

        if (tokenRegex.test(modifiedPrompt)) {
          // Get RAG results (this would be executed earlier, we're retrieving cached results)
          const ragResult = this._getCachedRAGResult(ragPipelineId);

          if (ragResult) {
            modifiedPrompt = modifiedPrompt.replace(tokenRegex, ragResult);
            this._log("debug", `Replaced {{${stToken}}} with RAG results from ${ragPipelineId}`);
          }
        }
      }

      promptData.prompt = modifiedPrompt;

      this._emit("orchestration:injection:applied", {
        replacements: this._injectionMappings.size,
      });

      return promptData;
    } catch (error) {
      this._log("error", `Failed to inject into ST prompt: ${error.message}`);
      return promptData;
    }
  },

  /**
   * Get cached RAG result for injection
   * @param {string} ragPipelineId - RAG pipeline ID
   * @returns {string|null} Cached result or null
   */
  _getCachedRAGResult(ragPipelineId) {
    // This would retrieve RAG results that were executed before prompt building
    // For now, return a placeholder
    if (this._runState && this._runState.globals && this._runState.globals.ragResults) {
      return this._runState.globals.ragResults[ragPipelineId] || null;
    }
    return null;
  },

  /**
   * Execute RAG pipelines for injection mode (called before ST prompt building)
   * @param {Object} context - Current ST context
   * @returns {Promise<Object>} RAG results keyed by pipeline ID
   */
  async executeInjectionRAG(context) {
    if (this._mode !== this.Mode.INJECTION || this._injectionMappings.size === 0) {
      return {};
    }

    this._log("info", `Executing ${this._injectionMappings.size} RAG pipelines for injection`);

    const curationSystem = this._getSystem("curation");
    if (!curationSystem) {
      this._log("error", "CurationSystem not available for injection mode");
      return {};
    }

    const ragResults = {};

    try {
      // Execute each RAG pipeline
      for (const [stToken, ragPipelineId] of this._injectionMappings) {
        this._log("debug", `Executing RAG pipeline: ${ragPipelineId} for token {{${stToken}}}`);

        try {
          const result = await curationSystem.executeRAG(ragPipelineId, {
            query: context.userInput || "",
            context: context,
            limit: 5,
          });

          // Format results as string
          if (result?.results && result.results.length > 0) {
            ragResults[ragPipelineId] = result.results
              .map(r => `[${r.storeName}] ${JSON.stringify(r.entry)}`)
              .join("\n\n");

            this._log("debug", `RAG pipeline ${ragPipelineId} returned ${result.results.length} results`);
          } else {
            ragResults[ragPipelineId] = "";
            this._log("debug", `RAG pipeline ${ragPipelineId} returned no results`);
          }

          this._emit("orchestration:injection:rag_complete", {
            token: stToken,
            pipelineId: ragPipelineId,
            resultCount: result?.results?.length || 0,
          });

        } catch (error) {
          this._log("error", `RAG pipeline ${ragPipelineId} failed: ${error.message}`);
          ragResults[ragPipelineId] = "";
        }
      }

      // Cache results for injection
      if (!this._runState) {
        this._runState = {
          globals: { ragResults },
        };
      } else {
        if (!this._runState.globals) {
          this._runState.globals = {};
        }
        this._runState.globals.ragResults = ragResults;
      }

      return ragResults;

    } catch (error) {
      this._log("error", `Failed to execute injection RAG: ${error.message}`);
      return {};
    }
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
      mode: this._mode,
      isRunning: this.isRunning(),
      activeRun: this._runState ? {
        id: this._runState.id,
        pipelineId: this._runState.pipelineId,
        status: this._runState.status,
        progress: this.getProgress(),
      } : null,
      runHistoryCount: this._runHistory.length,
      injectionMappings: Object.keys(this.getInjectionMappings()),
      hasActiveGavel: this._activeGavel !== null,
    };
  },

  // ===== EVENT SYSTEM =====

  /**
   * Emit an event via kernel
   * @param {string} event - Event name
   * @param {Object} data - Event data
   */
  _emit(event, data = {}) {
    if (this._kernel && this._kernel.emit) {
      this._kernel.emit(event, data);
    }
  },

  /**
   * Log a message
   * @param {string} level - Log level
   * @param {string} message - Message
   * @param {...any} args - Additional arguments
   */
  _log(level, message, ...args) {
    if (this._logger && typeof this._logger[level] === "function") {
      this._logger[level](`[OrchestrationSystem] ${message}`, ...args);
    } else {
      const method = level === "error" ? "error" : level === "warn" ? "warn" : "log";
      console[method](`[OrchestrationSystem] ${message}`, ...args);
    }
  },
};

// ===== EXPORT =====

// Expose to window
if (typeof window !== "undefined") {
  window.OrchestrationSystem = OrchestrationSystem;
}

// CommonJS export
if (typeof module !== "undefined" && module.exports) {
  module.exports = OrchestrationSystem;
}
