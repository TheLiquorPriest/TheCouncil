/**
 * TheCouncil - Execution Monitor Component
 *
 * A real-time monitoring component for pipeline execution:
 * - Live progress tracking for phases and actions
 * - Output streaming from agents
 * - Timing and performance metrics
 * - Pause/resume/cancel controls
 * - Error and warning display
 * - Execution history
 *
 * @version 2.0.0
 */

const ExecutionMonitor = {
  // ===== VERSION =====
  VERSION: "2.0.0",

  // ===== CONSTANTS =====

  /**
   * Execution states
   */
  State: {
    IDLE: "idle",
    RUNNING: "running",
    PAUSED: "paused",
    COMPLETED: "completed",
    FAILED: "failed",
    CANCELLED: "cancelled",
  },

  /**
   * Log levels
   */
  LogLevel: {
    DEBUG: "debug",
    INFO: "info",
    WARN: "warn",
    ERROR: "error",
    SUCCESS: "success",
  },

  /**
   * Update interval for timing display (ms)
   */
  TIMER_INTERVAL: 100,

  // ===== STATE =====

  /**
   * Active instances
   * @type {Map<string, Object>}
   */
  _instances: new Map(),

  /**
   * Instance ID counter
   * @type {number}
   */
  _instanceCounter: 0,

  /**
   * Logger reference
   */
  _logger: null,

  /**
   * Pipeline system reference
   */
  _pipelineSystem: null,

  // ===== INITIALIZATION =====

  /**
   * Initialize the ExecutionMonitor
   * @param {Object} options - Configuration options
   * @param {Object} options.logger - Logger instance
   * @param {Object} options.pipelineSystem - Pipeline system instance
   */
  init(options = {}) {
    this._logger = options.logger || null;
    this._pipelineSystem =
      options.pipelineSystem || window.PipelineSystem || null;
    this._injectStyles();
    this._log("info", "ExecutionMonitor initialized");
  },

  // ===== INSTANCE MANAGEMENT =====

  /**
   * Create a new ExecutionMonitor instance
   * @param {Object} config - Instance configuration
   * @param {string} config.pipelineId - Pipeline ID to monitor
   * @param {boolean} config.autoScroll - Auto-scroll log output (default: true)
   * @param {boolean} config.showTiming - Show timing information (default: true)
   * @param {boolean} config.showLogs - Show execution logs (default: true)
   * @param {boolean} config.compactMode - Use compact display (default: false)
   * @param {Function} config.onStateChange - Callback when execution state changes
   * @param {Function} config.onComplete - Callback when execution completes
   * @param {Function} config.onError - Callback when error occurs
   * @returns {Object} Instance object
   */
  createInstance(config = {}) {
    const id = `exec-monitor-${++this._instanceCounter}`;

    const instance = {
      id,
      _config: {
        pipelineId: config.pipelineId || null,
        autoScroll: config.autoScroll !== false,
        showTiming: config.showTiming !== false,
        showLogs: config.showLogs !== false,
        compactMode: config.compactMode || false,
        onStateChange: config.onStateChange || null,
        onComplete: config.onComplete || null,
        onError: config.onError || null,
      },
      _container: null,
      _state: this.State.IDLE,
      _executionData: {
        pipelineId: null,
        pipelineName: "",
        startTime: null,
        endTime: null,
        currentPhaseIndex: -1,
        currentActionIndex: -1,
        phases: [],
        logs: [],
        errors: [],
        outputs: {},
      },
      _timerInterval: null,
      _eventUnsubscribers: [],

      // Public methods bound to this instance
      render: (container) => this._renderInstance(instance, container),
      startMonitoring: (pipelineId) =>
        this._startMonitoring(instance, pipelineId),
      stopMonitoring: () => this._stopMonitoring(instance),
      pause: () => this._pauseExecution(instance),
      resume: () => this._resumeExecution(instance),
      cancel: () => this._cancelExecution(instance),
      clear: () => this._clearInstance(instance),
      getState: () => instance._state,
      getExecutionData: () => ({ ...instance._executionData }),
      destroy: () => this._destroyInstance(instance),
    };

    this._instances.set(id, instance);
    return instance;
  },

  /**
   * Destroy an instance
   * @param {Object} instance - Instance to destroy
   */
  _destroyInstance(instance) {
    this._stopMonitoring(instance);
    if (instance._container) {
      instance._container.innerHTML = "";
    }
    this._instances.delete(instance.id);
  },

  // ===== RENDERING =====

  /**
   * Render instance to container
   * @param {Object} instance - Instance state
   * @param {HTMLElement} container - Container element
   */
  _renderInstance(instance, container) {
    instance._container = container;
    this._renderMonitor(instance);
  },

  /**
   * Render the monitor UI
   * @param {Object} instance - Instance state
   */
  _renderMonitor(instance) {
    if (!instance._container) return;

    const config = instance._config;
    const data = instance._executionData;
    const state = instance._state;
    const isRunning = state === this.State.RUNNING;
    const isPaused = state === this.State.PAUSED;
    const isComplete =
      state === this.State.COMPLETED ||
      state === this.State.FAILED ||
      state === this.State.CANCELLED;

    let html = `
      <div class="exec-monitor ${config.compactMode ? "compact" : ""}" data-instance="${instance.id}">
        <!-- Header -->
        <div class="exec-monitor-header">
          <div class="exec-monitor-title">
            <span class="exec-monitor-icon">${this._getStateIcon(state)}</span>
            <span class="exec-monitor-name">${this._escapeHtml(data.pipelineName || "Pipeline Execution")}</span>
            <span class="exec-monitor-state-badge ${state}">${this._formatState(state)}</span>
          </div>
          <div class="exec-monitor-controls">
            ${
              isRunning
                ? `
              <button class="exec-monitor-btn" data-action="pause" title="Pause">⏸️</button>
            `
                : ""
            }
            ${
              isPaused
                ? `
              <button class="exec-monitor-btn" data-action="resume" title="Resume">▶️</button>
            `
                : ""
            }
            ${
              isRunning || isPaused
                ? `
              <button class="exec-monitor-btn exec-monitor-btn-danger" data-action="cancel" title="Cancel">⏹️</button>
            `
                : ""
            }
            ${
              isComplete
                ? `
              <button class="exec-monitor-btn" data-action="clear" title="Clear">🗑️</button>
            `
                : ""
            }
          </div>
        </div>

        <!-- Timing -->
        ${config.showTiming ? this._renderTiming(instance) : ""}

        <!-- Progress -->
        <div class="exec-monitor-progress">
          ${this._renderProgressBar(instance)}
        </div>

        <!-- Phases -->
        <div class="exec-monitor-phases">
          ${this._renderPhases(instance)}
        </div>

        <!-- Logs -->
        ${config.showLogs ? this._renderLogs(instance) : ""}

        <!-- Errors -->
        ${data.errors.length > 0 ? this._renderErrors(instance) : ""}
      </div>
    `;

    instance._container.innerHTML = html;
    this._bindInstanceEvents(instance);

    // Auto-scroll logs
    if (config.autoScroll) {
      const logsContainer = instance._container.querySelector(
        ".exec-monitor-logs-content",
      );
      if (logsContainer) {
        logsContainer.scrollTop = logsContainer.scrollHeight;
      }
    }
  },

  /**
   * Render timing information
   * @param {Object} instance - Instance state
   * @returns {string} HTML
   */
  _renderTiming(instance) {
    const data = instance._executionData;
    const elapsed = this._getElapsedTime(instance);
    const estimatedTotal = this._estimateTotalTime(instance);

    return `
      <div class="exec-monitor-timing">
        <div class="exec-monitor-timing-item">
          <span class="exec-monitor-timing-label">Elapsed:</span>
          <span class="exec-monitor-timing-value">${this._formatDuration(elapsed)}</span>
        </div>
        ${
          estimatedTotal > 0
            ? `
          <div class="exec-monitor-timing-item">
            <span class="exec-monitor-timing-label">Est. Total:</span>
            <span class="exec-monitor-timing-value">${this._formatDuration(estimatedTotal)}</span>
          </div>
          <div class="exec-monitor-timing-item">
            <span class="exec-monitor-timing-label">Remaining:</span>
            <span class="exec-monitor-timing-value">${this._formatDuration(Math.max(0, estimatedTotal - elapsed))}</span>
          </div>
        `
            : ""
        }
      </div>
    `;
  },

  /**
   * Render progress bar
   * @param {Object} instance - Instance state
   * @returns {string} HTML
   */
  _renderProgressBar(instance) {
    const data = instance._executionData;
    const totalPhases = data.phases.length || 1;
    const completedPhases = data.phases.filter(
      (p) => p.status === "completed",
    ).length;
    const currentPhase = data.phases[data.currentPhaseIndex];
    const currentActions = currentPhase?.actions?.length || 0;
    const completedActions =
      currentPhase?.actions?.filter((a) => a.status === "completed").length ||
      0;

    const phaseProgress = (completedPhases / totalPhases) * 100;
    const actionProgress =
      currentActions > 0 ? (completedActions / currentActions) * 100 : 0;
    const overallProgress =
      totalPhases > 0
        ? ((completedPhases + actionProgress / 100) / totalPhases) * 100
        : 0;

    return `
      <div class="exec-monitor-progress-bar">
        <div class="exec-monitor-progress-fill" style="width: ${overallProgress}%"></div>
        <div class="exec-monitor-progress-text">
          Phase ${data.currentPhaseIndex + 1}/${totalPhases}
          ${currentActions > 0 ? `• Action ${completedActions}/${currentActions}` : ""}
          (${Math.round(overallProgress)}%)
        </div>
      </div>
    `;
  },

  /**
   * Render phases list
   * @param {Object} instance - Instance state
   * @returns {string} HTML
   */
  _renderPhases(instance) {
    const data = instance._executionData;
    const config = instance._config;

    if (data.phases.length === 0) {
      return `<div class="exec-monitor-empty">No phases loaded</div>`;
    }

    return `
      <div class="exec-monitor-phases-list">
        ${data.phases
          .map((phase, index) => {
            const isCurrent = index === data.currentPhaseIndex;
            const isCompleted = phase.status === "completed";
            const isFailed = phase.status === "failed";
            const isPending = phase.status === "pending";

            return `
            <div class="exec-monitor-phase ${isCurrent ? "current" : ""} ${phase.status}" data-phase-index="${index}">
              <div class="exec-monitor-phase-header" data-action="toggle-phase">
                <span class="exec-monitor-phase-status">
                  ${isCompleted ? "✅" : isFailed ? "❌" : isCurrent ? "🔄" : "⏳"}
                </span>
                <span class="exec-monitor-phase-name">${this._escapeHtml(phase.name)}</span>
                ${
                  phase.duration
                    ? `
                  <span class="exec-monitor-phase-duration">${this._formatDuration(phase.duration)}</span>
                `
                    : ""
                }
                <span class="exec-monitor-phase-toggle">${phase.expanded ? "▼" : "▶"}</span>
              </div>
              ${
                phase.expanded || isCurrent
                  ? `
                <div class="exec-monitor-phase-content">
                  ${this._renderActions(instance, phase, index)}
                </div>
              `
                  : ""
              }
            </div>
          `;
          })
          .join("")}
      </div>
    `;
  },

  /**
   * Render actions for a phase
   * @param {Object} instance - Instance state
   * @param {Object} phase - Phase data
   * @param {number} phaseIndex - Phase index
   * @returns {string} HTML
   */
  _renderActions(instance, phase, phaseIndex) {
    if (!phase.actions || phase.actions.length === 0) {
      return `<div class="exec-monitor-no-actions">No actions</div>`;
    }

    const data = instance._executionData;
    const isCurrent = phaseIndex === data.currentPhaseIndex;

    return `
      <div class="exec-monitor-actions-list">
        ${phase.actions
          .map((action, actionIndex) => {
            const isCurrentAction =
              isCurrent && actionIndex === data.currentActionIndex;
            const isCompleted = action.status === "completed";
            const isFailed = action.status === "failed";

            return `
            <div class="exec-monitor-action ${isCurrentAction ? "current" : ""} ${action.status}">
              <span class="exec-monitor-action-status">
                ${isCompleted ? "✓" : isFailed ? "✗" : isCurrentAction ? "●" : "○"}
              </span>
              <span class="exec-monitor-action-name">${this._escapeHtml(action.name)}</span>
              ${
                action.participant
                  ? `
                <span class="exec-monitor-action-participant">
                  🤖 ${this._escapeHtml(action.participant)}
                </span>
              `
                  : ""
              }
              ${
                action.duration
                  ? `
                <span class="exec-monitor-action-duration">${this._formatDuration(action.duration)}</span>
              `
                  : ""
              }
            </div>
            ${
              action.output && isCompleted
                ? `
              <div class="exec-monitor-action-output">
                <pre>${this._escapeHtml(this._truncateOutput(action.output))}</pre>
              </div>
            `
                : ""
            }
          `;
          })
          .join("")}
      </div>
    `;
  },

  /**
   * Render logs section
   * @param {Object} instance - Instance state
   * @returns {string} HTML
   */
  _renderLogs(instance) {
    const data = instance._executionData;

    return `
      <div class="exec-monitor-logs">
        <div class="exec-monitor-logs-header">
          <span>Execution Log</span>
          <span class="exec-monitor-logs-count">${data.logs.length} entries</span>
        </div>
        <div class="exec-monitor-logs-content">
          ${
            data.logs.length === 0
              ? `
            <div class="exec-monitor-logs-empty">No log entries yet</div>
          `
              : data.logs
                  .map(
                    (log) => `
            <div class="exec-monitor-log-entry ${log.level}">
              <span class="exec-monitor-log-time">${this._formatTime(log.timestamp)}</span>
              <span class="exec-monitor-log-level">${log.level.toUpperCase()}</span>
              <span class="exec-monitor-log-message">${this._escapeHtml(log.message)}</span>
            </div>
          `,
                  )
                  .join("")
          }
        </div>
      </div>
    `;
  },

  /**
   * Render errors section
   * @param {Object} instance - Instance state
   * @returns {string} HTML
   */
  _renderErrors(instance) {
    const data = instance._executionData;

    return `
      <div class="exec-monitor-errors">
        <div class="exec-monitor-errors-header">
          <span>⚠️ Errors (${data.errors.length})</span>
        </div>
        <div class="exec-monitor-errors-list">
          ${data.errors
            .map(
              (error) => `
            <div class="exec-monitor-error-item">
              <div class="exec-monitor-error-message">${this._escapeHtml(error.message)}</div>
              ${
                error.phase
                  ? `
                <div class="exec-monitor-error-context">
                  Phase: ${this._escapeHtml(error.phase)}
                  ${error.action ? `• Action: ${this._escapeHtml(error.action)}` : ""}
                </div>
              `
                  : ""
              }
            </div>
          `,
            )
            .join("")}
        </div>
      </div>
    `;
  },

  /**
   * Bind events to instance
   * @param {Object} instance - Instance state
   */
  _bindInstanceEvents(instance) {
    const container = instance._container;
    if (!container) return;

    // Control buttons
    container.querySelectorAll(".exec-monitor-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const action = btn.dataset.action;
        switch (action) {
          case "pause":
            this._pauseExecution(instance);
            break;
          case "resume":
            this._resumeExecution(instance);
            break;
          case "cancel":
            this._cancelExecution(instance);
            break;
          case "clear":
            this._clearInstance(instance);
            break;
        }
      });
    });

    // Phase toggles
    container
      .querySelectorAll('[data-action="toggle-phase"]')
      .forEach((header) => {
        header.addEventListener("click", () => {
          const phaseEl = header.closest(".exec-monitor-phase");
          const phaseIndex = parseInt(phaseEl.dataset.phaseIndex, 10);
          if (
            !isNaN(phaseIndex) &&
            instance._executionData.phases[phaseIndex]
          ) {
            instance._executionData.phases[phaseIndex].expanded =
              !instance._executionData.phases[phaseIndex].expanded;
            this._renderMonitor(instance);
          }
        });
      });
  },

  // ===== MONITORING =====

  /**
   * Start monitoring a pipeline execution
   * @param {Object} instance - Instance state
   * @param {string} pipelineId - Pipeline ID to monitor
   */
  _startMonitoring(instance, pipelineId) {
    this._stopMonitoring(instance);

    instance._config.pipelineId = pipelineId;
    instance._executionData.pipelineId = pipelineId;
    instance._executionData.startTime = Date.now();
    instance._executionData.endTime = null;
    instance._executionData.logs = [];
    instance._executionData.errors = [];
    instance._executionData.currentPhaseIndex = -1;
    instance._executionData.currentActionIndex = -1;

    // Get pipeline info
    if (this._pipelineSystem) {
      const pipeline = this._pipelineSystem.getPipeline?.(pipelineId);
      if (pipeline) {
        instance._executionData.pipelineName = pipeline.name || pipelineId;
        instance._executionData.phases = (pipeline.phases || []).map(
          (phase) => ({
            id: phase.id,
            name: phase.name,
            status: "pending",
            expanded: false,
            startTime: null,
            endTime: null,
            duration: null,
            actions: (phase.actions || []).map((action) => ({
              id: action.id,
              name: action.name,
              status: "pending",
              participant: null,
              startTime: null,
              endTime: null,
              duration: null,
              output: null,
            })),
          }),
        );
      }
    }

    // Subscribe to pipeline events
    this._subscribeToPipelineEvents(instance);

    // Start timer
    this._startTimer(instance);

    // Update state
    this._setState(instance, this.State.RUNNING);
    this._addLog(
      instance,
      this.LogLevel.INFO,
      `Started monitoring pipeline: ${pipelineId}`,
    );
    this._renderMonitor(instance);
  },

  /**
   * Stop monitoring
   * @param {Object} instance - Instance state
   */
  _stopMonitoring(instance) {
    this._stopTimer(instance);
    this._unsubscribeFromPipelineEvents(instance);
  },

  /**
   * Subscribe to pipeline system events
   * @param {Object} instance - Instance state
   */
  _subscribeToPipelineEvents(instance) {
    if (!this._pipelineSystem) return;

    const events = [
      {
        event: "phase:started",
        handler: (data) => this._onPhaseStarted(instance, data),
      },
      {
        event: "phase:completed",
        handler: (data) => this._onPhaseCompleted(instance, data),
      },
      {
        event: "phase:failed",
        handler: (data) => this._onPhaseFailed(instance, data),
      },
      {
        event: "action:started",
        handler: (data) => this._onActionStarted(instance, data),
      },
      {
        event: "action:completed",
        handler: (data) => this._onActionCompleted(instance, data),
      },
      {
        event: "action:failed",
        handler: (data) => this._onActionFailed(instance, data),
      },
      {
        event: "pipeline:completed",
        handler: (data) => this._onPipelineCompleted(instance, data),
      },
      {
        event: "pipeline:failed",
        handler: (data) => this._onPipelineFailed(instance, data),
      },
      {
        event: "pipeline:paused",
        handler: () => this._onPipelinePaused(instance),
      },
      {
        event: "pipeline:resumed",
        handler: () => this._onPipelineResumed(instance),
      },
      {
        event: "pipeline:cancelled",
        handler: () => this._onPipelineCancelled(instance),
      },
    ];

    events.forEach(({ event, handler }) => {
      if (typeof this._pipelineSystem.on === "function") {
        this._pipelineSystem.on(event, handler);
        instance._eventUnsubscribers.push(() => {
          if (typeof this._pipelineSystem.off === "function") {
            this._pipelineSystem.off(event, handler);
          }
        });
      }
    });
  },

  /**
   * Unsubscribe from pipeline events
   * @param {Object} instance - Instance state
   */
  _unsubscribeFromPipelineEvents(instance) {
    instance._eventUnsubscribers.forEach((unsub) => unsub());
    instance._eventUnsubscribers = [];
  },

  // ===== EVENT HANDLERS =====

  /**
   * Handle phase started event
   * @param {Object} instance - Instance state
   * @param {Object} data - Event data
   */
  _onPhaseStarted(instance, data) {
    const phaseIndex = instance._executionData.phases.findIndex(
      (p) => p.id === data.phaseId,
    );
    if (phaseIndex !== -1) {
      instance._executionData.currentPhaseIndex = phaseIndex;
      instance._executionData.currentActionIndex = -1;
      instance._executionData.phases[phaseIndex].status = "running";
      instance._executionData.phases[phaseIndex].startTime = Date.now();
      instance._executionData.phases[phaseIndex].expanded = true;
      this._addLog(
        instance,
        this.LogLevel.INFO,
        `Phase started: ${data.phaseName || data.phaseId}`,
      );
      this._renderMonitor(instance);
    }
  },

  /**
   * Handle phase completed event
   * @param {Object} instance - Instance state
   * @param {Object} data - Event data
   */
  _onPhaseCompleted(instance, data) {
    const phaseIndex = instance._executionData.phases.findIndex(
      (p) => p.id === data.phaseId,
    );
    if (phaseIndex !== -1) {
      const phase = instance._executionData.phases[phaseIndex];
      phase.status = "completed";
      phase.endTime = Date.now();
      phase.duration = phase.endTime - phase.startTime;
      phase.expanded = false;
      this._addLog(
        instance,
        this.LogLevel.SUCCESS,
        `Phase completed: ${data.phaseName || data.phaseId}`,
      );
      this._renderMonitor(instance);
    }
  },

  /**
   * Handle phase failed event
   * @param {Object} instance - Instance state
   * @param {Object} data - Event data
   */
  _onPhaseFailed(instance, data) {
    const phaseIndex = instance._executionData.phases.findIndex(
      (p) => p.id === data.phaseId,
    );
    if (phaseIndex !== -1) {
      const phase = instance._executionData.phases[phaseIndex];
      phase.status = "failed";
      phase.endTime = Date.now();
      phase.duration = phase.endTime - phase.startTime;
      this._addLog(
        instance,
        this.LogLevel.ERROR,
        `Phase failed: ${data.phaseName || data.phaseId}`,
      );
      this._addError(
        instance,
        data.error?.message || "Unknown error",
        data.phaseName,
      );
      this._renderMonitor(instance);
    }
  },

  /**
   * Handle action started event
   * @param {Object} instance - Instance state
   * @param {Object} data - Event data
   */
  _onActionStarted(instance, data) {
    const phaseIndex = instance._executionData.currentPhaseIndex;
    if (phaseIndex !== -1) {
      const phase = instance._executionData.phases[phaseIndex];
      const actionIndex = phase.actions.findIndex(
        (a) => a.id === data.actionId,
      );
      if (actionIndex !== -1) {
        instance._executionData.currentActionIndex = actionIndex;
        phase.actions[actionIndex].status = "running";
        phase.actions[actionIndex].startTime = Date.now();
        phase.actions[actionIndex].participant =
          data.participant?.name || data.participant?.id || null;
        this._addLog(
          instance,
          this.LogLevel.DEBUG,
          `Action started: ${data.actionName || data.actionId}`,
        );
        this._renderMonitor(instance);
      }
    }
  },

  /**
   * Handle action completed event
   * @param {Object} instance - Instance state
   * @param {Object} data - Event data
   */
  _onActionCompleted(instance, data) {
    const phaseIndex = instance._executionData.currentPhaseIndex;
    if (phaseIndex !== -1) {
      const phase = instance._executionData.phases[phaseIndex];
      const actionIndex = phase.actions.findIndex(
        (a) => a.id === data.actionId,
      );
      if (actionIndex !== -1) {
        const action = phase.actions[actionIndex];
        action.status = "completed";
        action.endTime = Date.now();
        action.duration = action.endTime - action.startTime;
        action.output = data.output || null;
        this._addLog(
          instance,
          this.LogLevel.DEBUG,
          `Action completed: ${data.actionName || data.actionId}`,
        );
        this._renderMonitor(instance);
      }
    }
  },

  /**
   * Handle action failed event
   * @param {Object} instance - Instance state
   * @param {Object} data - Event data
   */
  _onActionFailed(instance, data) {
    const phaseIndex = instance._executionData.currentPhaseIndex;
    if (phaseIndex !== -1) {
      const phase = instance._executionData.phases[phaseIndex];
      const actionIndex = phase.actions.findIndex(
        (a) => a.id === data.actionId,
      );
      if (actionIndex !== -1) {
        const action = phase.actions[actionIndex];
        action.status = "failed";
        action.endTime = Date.now();
        action.duration = action.endTime - action.startTime;
        this._addLog(
          instance,
          this.LogLevel.ERROR,
          `Action failed: ${data.actionName || data.actionId}`,
        );
        this._addError(
          instance,
          data.error?.message || "Unknown error",
          phase.name,
          action.name,
        );
        this._renderMonitor(instance);
      }
    }
  },

  /**
   * Handle pipeline completed event
   * @param {Object} instance - Instance state
   * @param {Object} data - Event data
   */
  _onPipelineCompleted(instance, data) {
    instance._executionData.endTime = Date.now();
    this._stopTimer(instance);
    this._setState(instance, this.State.COMPLETED);
    this._addLog(
      instance,
      this.LogLevel.SUCCESS,
      "Pipeline completed successfully",
    );
    this._renderMonitor(instance);

    if (instance._config.onComplete) {
      instance._config.onComplete(instance._executionData);
    }
  },

  /**
   * Handle pipeline failed event
   * @param {Object} instance - Instance state
   * @param {Object} data - Event data
   */
  _onPipelineFailed(instance, data) {
    instance._executionData.endTime = Date.now();
    this._stopTimer(instance);
    this._setState(instance, this.State.FAILED);
    this._addLog(
      instance,
      this.LogLevel.ERROR,
      `Pipeline failed: ${data.error?.message || "Unknown error"}`,
    );
    this._addError(
      instance,
      data.error?.message || "Pipeline execution failed",
    );
    this._renderMonitor(instance);

    if (instance._config.onError) {
      instance._config.onError(data.error);
    }
  },

  /**
   * Handle pipeline paused event
   * @param {Object} instance - Instance state
   */
  _onPipelinePaused(instance) {
    this._setState(instance, this.State.PAUSED);
    this._addLog(instance, this.LogLevel.WARN, "Pipeline paused");
    this._renderMonitor(instance);
  },

  /**
   * Handle pipeline resumed event
   * @param {Object} instance - Instance state
   */
  _onPipelineResumed(instance) {
    this._setState(instance, this.State.RUNNING);
    this._addLog(instance, this.LogLevel.INFO, "Pipeline resumed");
    this._renderMonitor(instance);
  },

  /**
   * Handle pipeline cancelled event
   * @param {Object} instance - Instance state
   */
  _onPipelineCancelled(instance) {
    instance._executionData.endTime = Date.now();
    this._stopTimer(instance);
    this._setState(instance, this.State.CANCELLED);
    this._addLog(instance, this.LogLevel.WARN, "Pipeline cancelled by user");
    this._renderMonitor(instance);
  },

  // ===== CONTROLS =====

  /**
   * Pause execution
   * @param {Object} instance - Instance state
   */
  _pauseExecution(instance) {
    if (
      this._pipelineSystem &&
      typeof this._pipelineSystem.pause === "function"
    ) {
      this._pipelineSystem.pause();
    }
  },

  /**
   * Resume execution
   * @param {Object} instance - Instance state
   */
  _resumeExecution(instance) {
    if (
      this._pipelineSystem &&
      typeof this._pipelineSystem.resume === "function"
    ) {
      this._pipelineSystem.resume();
    }
  },

  /**
   * Cancel execution
   * @param {Object} instance - Instance state
   */
  _cancelExecution(instance) {
    if (
      this._pipelineSystem &&
      typeof this._pipelineSystem.cancel === "function"
    ) {
      this._pipelineSystem.cancel();
    }
  },

  /**
   * Clear instance data
   * @param {Object} instance - Instance state
   */
  _clearInstance(instance) {
    this._stopMonitoring(instance);
    instance._state = this.State.IDLE;
    instance._executionData = {
      pipelineId: null,
      pipelineName: "",
      startTime: null,
      endTime: null,
      currentPhaseIndex: -1,
      currentActionIndex: -1,
      phases: [],
      logs: [],
      errors: [],
      outputs: {},
    };
    this._renderMonitor(instance);
  },

  // ===== STATE MANAGEMENT =====

  /**
   * Set instance state
   * @param {Object} instance - Instance state
   * @param {string} state - New state
   */
  _setState(instance, state) {
    const oldState = instance._state;
    instance._state = state;

    if (instance._config.onStateChange) {
      instance._config.onStateChange(state, oldState);
    }
  },

  /**
   * Add log entry
   * @param {Object} instance - Instance state
   * @param {string} level - Log level
   * @param {string} message - Log message
   */
  _addLog(instance, level, message) {
    instance._executionData.logs.push({
      timestamp: Date.now(),
      level,
      message,
    });

    // Keep logs limited
    if (instance._executionData.logs.length > 500) {
      instance._executionData.logs = instance._executionData.logs.slice(-500);
    }
  },

  /**
   * Add error entry
   * @param {Object} instance - Instance state
   * @param {string} message - Error message
   * @param {string} phase - Phase name (optional)
   * @param {string} action - Action name (optional)
   */
  _addError(instance, message, phase = null, action = null) {
    instance._executionData.errors.push({
      timestamp: Date.now(),
      message,
      phase,
      action,
    });
  },

  // ===== TIMER =====

  /**
   * Start timer for elapsed time display
   * @param {Object} instance - Instance state
   */
  _startTimer(instance) {
    this._stopTimer(instance);
    instance._timerInterval = setInterval(() => {
      // Update timing display without full re-render
      const timingEl = instance._container?.querySelector(
        ".exec-monitor-timing",
      );
      if (timingEl) {
        timingEl.outerHTML = this._renderTiming(instance);
      }
    }, this.TIMER_INTERVAL);
  },

  /**
   * Stop timer
   * @param {Object} instance - Instance state
   */
  _stopTimer(instance) {
    if (instance._timerInterval) {
      clearInterval(instance._timerInterval);
      instance._timerInterval = null;
    }
  },

  // ===== HELPERS =====

  /**
   * Get elapsed time in ms
   * @param {Object} instance - Instance state
   * @returns {number} Elapsed ms
   */
  _getElapsedTime(instance) {
    const data = instance._executionData;
    if (!data.startTime) return 0;
    const end = data.endTime || Date.now();
    return end - data.startTime;
  },

  /**
   * Estimate total execution time
   * @param {Object} instance - Instance state
   * @returns {number} Estimated total ms
   */
  _estimateTotalTime(instance) {
    const data = instance._executionData;
    const completedPhases = data.phases.filter((p) => p.status === "completed");
    if (completedPhases.length === 0) return 0;

    const avgPhaseTime =
      completedPhases.reduce((sum, p) => sum + (p.duration || 0), 0) /
      completedPhases.length;
    return avgPhaseTime * data.phases.length;
  },

  /**
   * Format duration in ms to human readable
   * @param {number} ms - Duration in milliseconds
   * @returns {string} Formatted duration
   */
  _formatDuration(ms) {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    return `${mins}m ${secs}s`;
  },

  /**
   * Format timestamp to time string
   * @param {number} timestamp - Timestamp in ms
   * @returns {string} Formatted time
   */
  _formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  },

  /**
   * Format state to display text
   * @param {string} state - State constant
   * @returns {string} Display text
   */
  _formatState(state) {
    const stateMap = {
      [this.State.IDLE]: "Idle",
      [this.State.RUNNING]: "Running",
      [this.State.PAUSED]: "Paused",
      [this.State.COMPLETED]: "Completed",
      [this.State.FAILED]: "Failed",
      [this.State.CANCELLED]: "Cancelled",
    };
    return stateMap[state] || state;
  },

  /**
   * Get state icon
   * @param {string} state - State constant
   * @returns {string} Icon emoji
   */
  _getStateIcon(state) {
    const iconMap = {
      [this.State.IDLE]: "⏸️",
      [this.State.RUNNING]: "▶️",
      [this.State.PAUSED]: "⏸️",
      [this.State.COMPLETED]: "✅",
      [this.State.FAILED]: "❌",
      [this.State.CANCELLED]: "⏹️",
    };
    return iconMap[state] || "❓";
  },

  /**
   * Truncate output for display
   * @param {string} output - Output text
   * @param {number} maxLength - Max length
   * @returns {string} Truncated output
   */
  _truncateOutput(output, maxLength = 200) {
    if (!output) return "";
    if (output.length <= maxLength) return output;
    return output.substring(0, maxLength) + "...";
  },

  /**
   * Escape HTML
   * @param {string} str - String to escape
   * @returns {string} Escaped string
   */
  _escapeHtml(str) {
    if (!str) return "";
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  },

  /**
   * Log message
   * @param {string} level - Log level
   * @param {string} message - Message
   * @param {...any} args - Additional arguments
   */
  _log(level, message, ...args) {
    if (this._logger && typeof this._logger[level] === "function") {
      this._logger[level](`[ExecutionMonitor] ${message}`, ...args);
    }
  },

  // ===== STYLES =====

  /**
   * Inject component styles
   */
  _injectStyles() {
    if (document.getElementById("council-exec-monitor-styles")) return;

    const style = document.createElement("style");
    style.id = "council-exec-monitor-styles";
    style.textContent = `
      /* Execution Monitor Container */
      .exec-monitor {
        font-family: var(--council-font-family, sans-serif);
        font-size: 0.875rem;
        color: var(--council-text, #eee);
        background: var(--council-bg-secondary, rgba(255, 255, 255, 0.05));
        border: 1px solid var(--council-border, #444);
        border-radius: var(--council-radius-lg, 8px);
        overflow: hidden;
      }

      .exec-monitor.compact {
        font-size: 0.8rem;
      }

      /* Header */
      .exec-monitor-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        background: var(--council-bg-hover, rgba(255, 255, 255, 0.1));
        border-bottom: 1px solid var(--council-border, #444);
      }

      .exec-monitor-title {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .exec-monitor-icon {
        font-size: 1.25rem;
      }

      .exec-monitor-name {
        font-weight: 600;
      }

      .exec-monitor-state-badge {
        font-size: 0.7rem;
        padding: 3px 8px;
        border-radius: 12px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .exec-monitor-state-badge.idle { background: var(--council-bg-hover, rgba(255, 255, 255, 0.1)); }
      .exec-monitor-state-badge.running { background: var(--council-info, #60a5fa); color: white; }
      .exec-monitor-state-badge.paused { background: var(--council-warning, #fbbf24); color: black; }
      .exec-monitor-state-badge.completed { background: var(--council-success, #4ade80); color: black; }
      .exec-monitor-state-badge.failed { background: var(--council-error, #f87171); color: white; }
      .exec-monitor-state-badge.cancelled { background: var(--council-text-muted, rgba(255, 255, 255, 0.6)); }

      .exec-monitor-controls {
        display: flex;
        gap: 6px;
      }

      .exec-monitor-btn {
        padding: 6px 10px;
        background: var(--council-bg-secondary, rgba(255, 255, 255, 0.05));
        border: 1px solid var(--council-border, #444);
        border-radius: var(--council-radius-sm, 4px);
        color: var(--council-text, #eee);
        cursor: pointer;
        transition: all 0.15s ease;
      }

      .exec-monitor-btn:hover {
        background: var(--council-bg-hover, rgba(255, 255, 255, 0.1));
      }

      .exec-monitor-btn-danger:hover {
        background: var(--council-error, #f87171);
        border-color: var(--council-error, #f87171);
      }

      /* Timing */
      .exec-monitor-timing {
        display: flex;
        gap: 24px;
        padding: 10px 16px;
        background: var(--council-bg-primary, #1a1a2e);
        border-bottom: 1px solid var(--council-border, #444);
      }

      .exec-monitor-timing-item {
        display: flex;
        gap: 6px;
      }

      .exec-monitor-timing-label {
        color: var(--council-text-muted, rgba(255, 255, 255, 0.6));
      }

      .exec-monitor-timing-value {
        font-family: var(--council-font-mono, monospace);
        color: var(--council-primary, #667eea);
      }

      /* Progress Bar */
      .exec-monitor-progress {
        padding: 12px 16px;
      }

      .exec-monitor-progress-bar {
        position: relative;
        height: 24px;
        background: var(--council-bg-primary, #1a1a2e);
        border-radius: var(--council-radius-sm, 4px);
        overflow: hidden;
      }

      .exec-monitor-progress-fill {
        position: absolute;
        top: 0;
        left: 0;
        height: 100%;
        background: linear-gradient(90deg, var(--council-primary, #667eea), var(--council-secondary, #764ba2));
        transition: width 0.3s ease;
      }

      .exec-monitor-progress-text {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 0.75rem;
        font-weight: 500;
        color: white;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
        white-space: nowrap;
      }

      /* Phases */
      .exec-monitor-phases {
        padding: 12px 16px;
        max-height: 300px;
        overflow-y: auto;
      }

      .exec-monitor-phases-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .exec-monitor-phase {
        background: var(--council-bg-primary, #1a1a2e);
        border: 1px solid var(--council-border, #444);
        border-radius: var(--council-radius-md, 6px);
        overflow: hidden;
      }

      .exec-monitor-phase.current {
        border-color: var(--council-primary, #667eea);
        box-shadow: 0 0 10px rgba(102, 126, 234, 0.3);
      }

      .exec-monitor-phase.completed {
        opacity: 0.7;
      }

      .exec-monitor-phase.failed {
        border-color: var(--council-error, #f87171);
      }

      .exec-monitor-phase-header {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 12px;
        cursor: pointer;
        transition: background 0.15s ease;
      }

      .exec-monitor-phase-header:hover {
        background: var(--council-bg-hover, rgba(255, 255, 255, 0.1));
      }

      .exec-monitor-phase-name {
        flex: 1;
        font-weight: 500;
      }

      .exec-monitor-phase-duration {
        font-size: 0.75rem;
        color: var(--council-text-muted, rgba(255, 255, 255, 0.6));
        font-family: var(--council-font-mono, monospace);
      }

      .exec-monitor-phase-toggle {
        font-size: 0.7rem;
        color: var(--council-text-muted, rgba(255, 255, 255, 0.6));
      }

      .exec-monitor-phase-content {
        padding: 8px 12px;
        border-top: 1px solid var(--council-border, #444);
        background: var(--council-bg-secondary, rgba(255, 255, 255, 0.05));
      }

      /* Actions */
      .exec-monitor-actions-list {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .exec-monitor-action {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 8px;
        border-radius: var(--council-radius-sm, 4px);
      }

      .exec-monitor-action.current {
        background: var(--council-bg-active, rgba(102, 126, 234, 0.2));
      }

      .exec-monitor-action-status {
        font-size: 0.8rem;
      }

      .exec-monitor-action.running .exec-monitor-action-status {
        animation: pulse 1s infinite;
      }

      .exec-monitor-action-name {
        flex: 1;
      }

      .exec-monitor-action-participant {
        font-size: 0.75rem;
        color: var(--council-text-muted, rgba(255, 255, 255, 0.6));
      }

      .exec-monitor-action-duration {
        font-size: 0.7rem;
        color: var(--council-text-muted, rgba(255, 255, 255, 0.6));
        font-family: var(--council-font-mono, monospace);
      }

      .exec-monitor-action-output {
        margin: 4px 0 4px 24px;
        padding: 8px;
        background: var(--council-bg-primary, #1a1a2e);
        border-radius: var(--council-radius-sm, 4px);
        font-size: 0.75rem;
      }

      .exec-monitor-action-output pre {
        margin: 0;
        white-space: pre-wrap;
        word-break: break-word;
        font-family: var(--council-font-mono, monospace);
        color: var(--council-text-muted, rgba(255, 255, 255, 0.6));
      }

      /* Logs */
      .exec-monitor-logs {
        border-top: 1px solid var(--council-border, #444);
      }

      .exec-monitor-logs-header {
        display: flex;
        justify-content: space-between;
        padding: 8px 16px;
        background: var(--council-bg-hover, rgba(255, 255, 255, 0.1));
        font-weight: 500;
      }

      .exec-monitor-logs-count {
        font-size: 0.75rem;
        color: var(--council-text-muted, rgba(255, 255, 255, 0.6));
      }

      .exec-monitor-logs-content {
        max-height: 150px;
        overflow-y: auto;
        padding: 8px 16px;
        background: var(--council-bg-primary, #1a1a2e);
        font-family: var(--council-font-mono, monospace);
        font-size: 0.75rem;
      }

      .exec-monitor-logs-empty {
        color: var(--council-text-muted, rgba(255, 255, 255, 0.6));
        font-style: italic;
      }

      .exec-monitor-log-entry {
        display: flex;
        gap: 8px;
        padding: 2px 0;
      }

      .exec-monitor-log-time {
        color: var(--council-text-muted, rgba(255, 255, 255, 0.6));
      }

      .exec-monitor-log-level {
        width: 50px;
        font-weight: 500;
      }

      .exec-monitor-log-entry.debug .exec-monitor-log-level { color: var(--council-text-muted, rgba(255, 255, 255, 0.6)); }
      .exec-monitor-log-entry.info .exec-monitor-log-level { color: var(--council-info, #60a5fa); }
      .exec-monitor-log-entry.warn .exec-monitor-log-level { color: var(--council-warning, #fbbf24); }
      .exec-monitor-log-entry.error .exec-monitor-log-level { color: var(--council-error, #f87171); }
      .exec-monitor-log-entry.success .exec-monitor-log-level { color: var(--council-success, #4ade80); }

      .exec-monitor-log-message {
        flex: 1;
      }

      /* Errors */
      .exec-monitor-errors {
        border-top: 1px solid var(--council-error, #f87171);
        background: rgba(248, 113, 113, 0.1);
      }

      .exec-monitor-errors-header {
        padding: 8px 16px;
        font-weight: 500;
        color: var(--council-error, #f87171);
      }

      .exec-monitor-errors-list {
        padding: 8px 16px;
      }

      .exec-monitor-error-item {
        padding: 8px;
        margin-bottom: 8px;
        background: var(--council-bg-primary, #1a1a2e);
        border-radius: var(--council-radius-sm, 4px);
        border-left: 3px solid var(--council-error, #f87171);
      }

      .exec-monitor-error-item:last-child {
        margin-bottom: 0;
      }

      .exec-monitor-error-message {
        color: var(--council-error, #f87171);
      }

      .exec-monitor-error-context {
        margin-top: 4px;
        font-size: 0.75rem;
        color: var(--council-text-muted, rgba(255, 255, 255, 0.6));
      }

      /* Empty State */
      .exec-monitor-empty {
        padding: 24px;
        text-align: center;
        color: var(--council-text-muted, rgba(255, 255, 255, 0.6));
      }

      /* Animation */
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }

      /* Compact Mode Adjustments */
      .exec-monitor.compact .exec-monitor-header {
        padding: 8px 12px;
      }

      .exec-monitor.compact .exec-monitor-timing {
        padding: 6px 12px;
        gap: 16px;
      }

      .exec-monitor.compact .exec-monitor-progress {
        padding: 8px 12px;
      }

      .exec-monitor.compact .exec-monitor-phases {
        padding: 8px 12px;
        max-height: 200px;
      }

      .exec-monitor.compact .exec-monitor-logs-content {
        max-height: 100px;
      }
    `;

    document.head.appendChild(style);
  },
};

// Export for different environments
if (typeof window !== "undefined") {
  window.ExecutionMonitor = ExecutionMonitor;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = ExecutionMonitor;
}
