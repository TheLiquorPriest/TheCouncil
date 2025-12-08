/**
 * TheCouncil - Pipeline System Modal UI
 *
 * Comprehensive UI for managing and monitoring pipeline execution:
 * - Pipeline list and management
 * - Phase configuration
 * - Action configuration
 * - Live execution monitoring
 * - Thread visualization
 * - Output viewing
 *
 * @version 2.0.0
 */

const PipelineModal = {
  // ===== VERSION =====
  VERSION: "2.0.0",

  // ===== STATE =====

  /**
   * Modal visibility state
   * @type {boolean}
   */
  _isVisible: false,

  /**
   * Current active tab
   * @type {string}
   */
  _activeTab: "pipelines",

  /**
   * Currently selected pipeline
   * @type {string|null}
   */
  _selectedPipeline: null,

  /**
   * Currently selected phase
   * @type {string|null}
   */
  _selectedPhase: null,

  /**
   * Currently selected action
   * @type {string|null}
   */
  _selectedAction: null,

  /**
   * Live execution view mode
   * @type {boolean}
   */
  _isLiveMode: false,

  /**
   * Auto-scroll threads
   * @type {boolean}
   */
  _autoScrollThreads: true,

  /**
   * Reference to PipelineSystem
   * @type {Object|null}
   */
  _pipelineSystem: null,

  /**
   * Reference to AgentsSystem
   * @type {Object|null}
   */
  _agentsSystem: null,

  /**
   * Reference to ContextManager
   * @type {Object|null}
   */
  _contextManager: null,

  /**
   * Reference to OutputManager
   * @type {Object|null}
   */
  _outputManager: null,

  /**
   * Reference to ThreadManager
   * @type {Object|null}
   */
  _threadManager: null,

  /**
   * Reference to Logger
   * @type {Object|null}
   */
  _logger: null,

  /**
   * DOM element references
   * @type {Object}
   */
  _elements: {
    modal: null,
    overlay: null,
    container: null,
    tabs: null,
    content: null,
    statusBar: null,
  },

  /**
   * Initialization flag
   * @type {boolean}
   */
  _initialized: false,

  /**
   * Event listener cleanup functions
   * @type {Function[]}
   */
  _cleanupFns: [],

  /**
   * Refresh interval for live mode
   * @type {number|null}
   */
  _refreshInterval: null,

  // ===== INITIALIZATION =====

  /**
   * Initialize the Pipeline Modal
   * @param {Object} options - Configuration options
   * @param {Object} options.pipelineSystem - Reference to PipelineSystem
   * @param {Object} options.agentsSystem - Reference to AgentsSystem
   * @param {Object} options.contextManager - Reference to ContextManager
   * @param {Object} options.outputManager - Reference to OutputManager
   * @param {Object} options.threadManager - Reference to ThreadManager
   * @param {Object} options.logger - Logger instance
   * @returns {PipelineModal}
   */
  init(options = {}) {
    if (this._initialized) {
      this._log("warn", "PipelineModal already initialized");
      return this;
    }

    this._pipelineSystem = options.pipelineSystem;
    this._agentsSystem = options.agentsSystem;
    this._contextManager = options.contextManager;
    this._outputManager = options.outputManager;
    this._threadManager = options.threadManager;
    this._logger = options.logger;

    if (!this._pipelineSystem) {
      this._log("error", "PipelineSystem is required for PipelineModal");
      return this;
    }

    this._log("info", "Initializing Pipeline Modal...");

    // Create modal DOM
    this._createModal();

    // Subscribe to system events
    this._subscribeToEvents();

    this._initialized = true;
    this._log("info", "Pipeline Modal initialized");

    return this;
  },

  /**
   * Destroy the modal and clean up
   */
  destroy() {
    // Stop live refresh
    this._stopLiveRefresh();

    // Run cleanup functions
    for (const cleanup of this._cleanupFns) {
      try {
        cleanup();
      } catch (e) {
        this._log("error", "Cleanup error:", e);
      }
    }
    this._cleanupFns = [];

    // Remove DOM elements
    if (this._elements.modal) {
      this._elements.modal.remove();
    }
    if (this._elements.overlay) {
      this._elements.overlay.remove();
    }

    this._elements = {
      modal: null,
      overlay: null,
      container: null,
      tabs: null,
      content: null,
      statusBar: null,
    };

    this._initialized = false;
    this._log("info", "Pipeline Modal destroyed");
  },

  // ===== MODAL CREATION =====

  /**
   * Create the modal DOM structure
   */
  _createModal() {
    // Create overlay
    this._elements.overlay = document.createElement("div");
    this._elements.overlay.className = "council-pipeline-overlay";
    this._elements.overlay.addEventListener("click", () => this.hide());

    // Create modal container
    this._elements.modal = document.createElement("div");
    this._elements.modal.className = "council-pipeline-modal";
    this._elements.modal.innerHTML = this._getModalTemplate();

    // Append to body
    document.body.appendChild(this._elements.overlay);
    document.body.appendChild(this._elements.modal);

    // Cache element references
    this._elements.container = this._elements.modal.querySelector(
      ".council-pipeline-container",
    );
    this._elements.tabs = this._elements.modal.querySelector(
      ".council-pipeline-tabs",
    );
    this._elements.content = this._elements.modal.querySelector(
      ".council-pipeline-content",
    );
    this._elements.statusBar = this._elements.modal.querySelector(
      ".council-pipeline-status",
    );

    // Bind event handlers
    this._bindEvents();

    // Inject styles if not present
    this._injectStyles();
  },

  /**
   * Get modal template HTML
   * @returns {string}
   */
  _getModalTemplate() {
    return `
      <div class="council-pipeline-container">
        <div class="council-pipeline-header">
          <h2 class="council-pipeline-title">
            <span class="council-pipeline-icon">🔄</span>
            Response Pipeline
          </h2>
          <div class="council-pipeline-header-actions">
            <button class="council-pipeline-btn council-pipeline-btn-icon" data-action="import" title="Import Pipeline">
              📥
            </button>
            <button class="council-pipeline-btn council-pipeline-btn-icon" data-action="export" title="Export Pipeline">
              📤
            </button>
            <button class="council-pipeline-btn council-pipeline-btn-icon" data-action="live-toggle" title="Toggle Live Mode">
              📡
            </button>
            <button class="council-pipeline-btn council-pipeline-btn-icon council-pipeline-close" data-action="close" title="Close">
              ✕
            </button>
          </div>
        </div>

        <div class="council-pipeline-tabs">
          <button class="council-pipeline-tab active" data-tab="pipelines">
            📋 Pipelines
          </button>
          <button class="council-pipeline-tab" data-tab="phases">
            🎭 Phases
          </button>
          <button class="council-pipeline-tab" data-tab="actions">
            ⚡ Actions
          </button>
          <button class="council-pipeline-tab" data-tab="execution">
            ▶️ Execution
          </button>
          <button class="council-pipeline-tab" data-tab="threads">
            💬 Threads
          </button>
          <button class="council-pipeline-tab" data-tab="outputs">
            📤 Outputs
          </button>
        </div>

        <div class="council-pipeline-content">
          <!-- Content rendered dynamically -->
        </div>

        <div class="council-pipeline-footer">
          <div class="council-pipeline-status">
            <span class="council-pipeline-status-indicator"></span>
            <span class="council-pipeline-status-text">Ready</span>
          </div>
          <div class="council-pipeline-footer-actions">
            <button class="council-pipeline-btn council-pipeline-btn-primary" data-action="run" title="Run Pipeline">
              ▶️ Run
            </button>
            <button class="council-pipeline-btn council-pipeline-btn-warning" data-action="pause" title="Pause" disabled>
              ⏸️ Pause
            </button>
            <button class="council-pipeline-btn council-pipeline-btn-danger" data-action="abort" title="Abort" disabled>
              ⏹️ Abort
            </button>
            <button class="council-pipeline-btn council-pipeline-btn-secondary" data-action="close">
              Close
            </button>
          </div>
        </div>
      </div>
    `;
  },

  /**
   * Bind event handlers
   */
  _bindEvents() {
    const modal = this._elements.modal;

    // Tab clicks
    modal.querySelectorAll(".council-pipeline-tab").forEach((tab) => {
      tab.addEventListener("click", (e) => {
        const tabName = e.currentTarget.dataset.tab;
        this._switchTab(tabName);
      });
    });

    // Button clicks
    modal.querySelectorAll("[data-action]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const action = e.currentTarget.dataset.action;
        this._handleAction(action, e);
      });
    });

    // Content delegation
    this._elements.content.addEventListener("click", (e) => {
      this._handleContentClick(e);
    });

    this._elements.content.addEventListener("change", (e) => {
      this._handleContentChange(e);
    });

    this._elements.content.addEventListener("input", (e) => {
      this._handleContentInput(e);
    });

    // Close on escape
    const escHandler = (e) => {
      if (e.key === "Escape" && this._isVisible) {
        this.hide();
      }
    };
    document.addEventListener("keydown", escHandler);
    this._cleanupFns.push(() =>
      document.removeEventListener("keydown", escHandler),
    );
  },

  /**
   * Subscribe to PipelineSystem events
   */
  _subscribeToEvents() {
    if (!this._pipelineSystem) return;

    const events = [
      "pipeline:registered",
      "pipeline:updated",
      "pipeline:deleted",
      "run:started",
      "run:paused",
      "run:resumed",
      "run:aborted",
      "run:completed",
      "run:failed",
      "phase:started",
      "phase:completed",
      "action:started",
      "action:completed",
      "gavel:requested",
    ];

    for (const event of events) {
      const handler = (data) => {
        this._handleSystemEvent(event, data);
      };
      this._pipelineSystem.on(event, handler);
      this._cleanupFns.push(() => this._pipelineSystem.off(event, handler));
    }
  },

  /**
   * Handle system events
   * @param {string} event - Event name
   * @param {*} data - Event data
   */
  _handleSystemEvent(event, data) {
    this._log("debug", `System event: ${event}`, data);

    // Update execution state buttons
    this._updateExecutionButtons();

    // Refresh current view if relevant
    if (this._isVisible) {
      if (
        event.startsWith("run:") ||
        event.startsWith("phase:") ||
        event.startsWith("action:")
      ) {
        if (this._activeTab === "execution") {
          this._renderExecutionTab();
        } else if (this._activeTab === "threads") {
          this._renderThreadsTab();
        } else if (this._activeTab === "outputs") {
          this._renderOutputsTab();
        }
      }

      if (event === "gavel:requested") {
        // Switch to execution tab and show gavel prompt
        this._switchTab("execution");
        this._showGavelPrompt(data);
      }

      this._updateStatus();
    }
  },

  // ===== SHOW / HIDE =====

  /**
   * Show the modal
   * @param {Object} options - Display options
   * @param {string} options.tab - Initial tab to show
   * @param {string} options.pipelineId - Pipeline to select
   */
  show(options = {}) {
    if (!this._initialized) {
      this._log("error", "PipelineModal not initialized");
      return;
    }

    this._isVisible = true;
    this._elements.overlay.classList.add("visible");
    this._elements.modal.classList.add("visible");

    // Set initial selections
    if (options.pipelineId) {
      this._selectedPipeline = options.pipelineId;
    }
    if (options.tab) {
      this._activeTab = options.tab;
      this._updateTabUI();
    }

    // Refresh content
    this._refreshCurrentTab();
    this._updateStatus();
    this._updateExecutionButtons();

    // Start live refresh if running
    if (this._pipelineSystem && this._pipelineSystem.isRunning()) {
      this._startLiveRefresh();
    }

    this._log("info", "Pipeline Modal shown");
  },

  /**
   * Hide the modal
   */
  hide() {
    this._isVisible = false;
    this._elements.overlay.classList.remove("visible");
    this._elements.modal.classList.remove("visible");

    // Stop live refresh
    this._stopLiveRefresh();

    this._log("info", "Pipeline Modal hidden");
  },

  /**
   * Toggle modal visibility
   */
  toggle() {
    if (this._isVisible) {
      this.hide();
    } else {
      this.show();
    }
  },

  /**
   * Check if modal is visible
   * @returns {boolean}
   */
  isVisible() {
    return this._isVisible;
  },

  // ===== LIVE MODE =====

  /**
   * Start live refresh interval
   */
  _startLiveRefresh() {
    if (this._refreshInterval) return;

    this._isLiveMode = true;
    this._refreshInterval = setInterval(() => {
      if (this._isVisible && this._pipelineSystem?.isRunning()) {
        this._refreshCurrentTab();
      } else {
        this._stopLiveRefresh();
      }
    }, 500);

    this._updateLiveModeUI();
  },

  /**
   * Stop live refresh interval
   */
  _stopLiveRefresh() {
    if (this._refreshInterval) {
      clearInterval(this._refreshInterval);
      this._refreshInterval = null;
    }
    this._isLiveMode = false;
    this._updateLiveModeUI();
  },

  /**
   * Update live mode UI indicator
   */
  _updateLiveModeUI() {
    const liveBtn = this._elements.modal.querySelector(
      '[data-action="live-toggle"]',
    );
    if (liveBtn) {
      liveBtn.classList.toggle("active", this._isLiveMode);
      liveBtn.title = this._isLiveMode ? "Live Mode ON" : "Live Mode OFF";
    }
  },

  // ===== TAB MANAGEMENT =====

  /**
   * Switch to a tab
   * @param {string} tabName - Tab name
   */
  _switchTab(tabName) {
    this._activeTab = tabName;
    this._updateTabUI();
    this._refreshCurrentTab();
  },

  /**
   * Update tab UI to reflect active tab
   */
  _updateTabUI() {
    this._elements.tabs
      .querySelectorAll(".council-pipeline-tab")
      .forEach((tab) => {
        tab.classList.toggle("active", tab.dataset.tab === this._activeTab);
      });
  },

  /**
   * Refresh current tab content
   */
  _refreshCurrentTab() {
    if (!this._isVisible) return;

    switch (this._activeTab) {
      case "pipelines":
        this._renderPipelinesTab();
        break;
      case "phases":
        this._renderPhasesTab();
        break;
      case "actions":
        this._renderActionsTab();
        break;
      case "execution":
        this._renderExecutionTab();
        break;
      case "threads":
        this._renderThreadsTab();
        break;
      case "outputs":
        this._renderOutputsTab();
        break;
      default:
        this._renderPipelinesTab();
    }
  },

  // ===== TAB RENDERERS =====

  /**
   * Render Pipelines tab
   */
  _renderPipelinesTab() {
    const pipelines = this._pipelineSystem?.getAllPipelines() || {};
    const pipelineList = Object.values(pipelines);

    let html = `
      <div class="council-pipeline-pipelines-tab">
        <div class="council-pipeline-toolbar">
          <button class="council-pipeline-btn council-pipeline-btn-primary" data-action="create-pipeline">
            ➕ New Pipeline
          </button>
          <button class="council-pipeline-btn council-pipeline-btn-secondary" data-action="duplicate-pipeline" ${!this._selectedPipeline ? "disabled" : ""}>
            📋 Duplicate
          </button>
          <button class="council-pipeline-btn council-pipeline-btn-danger" data-action="delete-pipeline" ${!this._selectedPipeline ? "disabled" : ""}>
            🗑️ Delete
          </button>
        </div>

        <div class="council-pipeline-list-container">
          <div class="council-pipeline-list">
            ${
              pipelineList.length === 0
                ? '<div class="council-pipeline-empty">No pipelines defined. Create one to get started.</div>'
                : pipelineList
                    .map((p) => this._renderPipelineListItem(p))
                    .join("")
            }
          </div>

          <div class="council-pipeline-detail">
            ${
              this._selectedPipeline
                ? this._renderPipelineDetail(pipelines[this._selectedPipeline])
                : '<div class="council-pipeline-empty">Select a pipeline to view details</div>'
            }
          </div>
        </div>
      </div>
    `;

    this._elements.content.innerHTML = html;
  },

  /**
   * Render a pipeline list item
   * @param {Object} pipeline - Pipeline object
   * @returns {string} HTML string
   */
  _renderPipelineListItem(pipeline) {
    const isSelected = pipeline.id === this._selectedPipeline;
    const phaseCount = pipeline.phases?.length || 0;
    const actionCount =
      pipeline.phases?.reduce((sum, p) => sum + (p.actions?.length || 0), 0) ||
      0;

    return `
      <div class="council-pipeline-list-item ${isSelected ? "selected" : ""}"
           data-pipeline-id="${pipeline.id}"
           data-action="select-pipeline">
        <div class="council-pipeline-list-item-header">
          <span class="council-pipeline-list-item-name">${this._escapeHtml(pipeline.name)}</span>
          <span class="council-pipeline-list-item-version">v${pipeline.version || "1.0"}</span>
        </div>
        <div class="council-pipeline-list-item-meta">
          <span title="Phases">🎭 ${phaseCount}</span>
          <span title="Actions">⚡ ${actionCount}</span>
        </div>
        ${
          pipeline.description
            ? `<div class="council-pipeline-list-item-desc">${this._escapeHtml(pipeline.description)}</div>`
            : ""
        }
      </div>
    `;
  },

  /**
   * Render pipeline detail view
   * @param {Object} pipeline - Pipeline object
   * @returns {string} HTML string
   */
  _renderPipelineDetail(pipeline) {
    if (!pipeline)
      return '<div class="council-pipeline-empty">Pipeline not found</div>';

    return `
      <div class="council-pipeline-detail-content">
        <div class="council-pipeline-detail-header">
          <h3>${this._escapeHtml(pipeline.name)}</h3>
          <button class="council-pipeline-btn council-pipeline-btn-icon" data-action="edit-pipeline" data-pipeline-id="${pipeline.id}" title="Edit">
            ✏️
          </button>
        </div>

        <div class="council-pipeline-detail-section">
          <label>Description</label>
          <div class="council-pipeline-detail-value">${this._escapeHtml(pipeline.description || "No description")}</div>
        </div>

        <div class="council-pipeline-detail-section">
          <label>Version</label>
          <div class="council-pipeline-detail-value">${pipeline.version || "1.0.0"}</div>
        </div>

        <div class="council-pipeline-detail-section">
          <label>Static Context</label>
          <div class="council-pipeline-detail-tags">
            ${pipeline.staticContext?.includeCharacterCard ? '<span class="council-pipeline-tag">Character Card</span>' : ""}
            ${pipeline.staticContext?.includeWorldInfo ? '<span class="council-pipeline-tag">World Info</span>' : ""}
            ${pipeline.staticContext?.includePersona ? '<span class="council-pipeline-tag">Persona</span>' : ""}
            ${pipeline.staticContext?.includeScenario ? '<span class="council-pipeline-tag">Scenario</span>' : ""}
          </div>
        </div>

        <div class="council-pipeline-detail-section">
          <label>Phases (${pipeline.phases?.length || 0})</label>
          <div class="council-pipeline-phase-list">
            ${(pipeline.phases || [])
              .map(
                (phase, idx) => `
              <div class="council-pipeline-phase-item" data-phase-id="${phase.id}" data-action="select-phase-from-detail">
                <span class="council-pipeline-phase-icon">${phase.icon || "🎭"}</span>
                <span class="council-pipeline-phase-order">${idx + 1}.</span>
                <span class="council-pipeline-phase-name">${this._escapeHtml(phase.name)}</span>
                <span class="council-pipeline-phase-actions">${phase.actions?.length || 0} actions</span>
              </div>
            `,
              )
              .join("")}
          </div>
        </div>

        <div class="council-pipeline-detail-section">
          <label>Metadata</label>
          <div class="council-pipeline-detail-meta">
            <div>Created: ${pipeline.metadata?.createdAt ? new Date(pipeline.metadata.createdAt).toLocaleString() : "N/A"}</div>
            <div>Updated: ${pipeline.metadata?.updatedAt ? new Date(pipeline.metadata.updatedAt).toLocaleString() : "N/A"}</div>
            <div>Author: ${this._escapeHtml(pipeline.metadata?.author || "Unknown")}</div>
          </div>
        </div>
      </div>
    `;
  },

  /**
   * Render Phases tab
   */
  _renderPhasesTab() {
    const pipeline = this._selectedPipeline
      ? this._pipelineSystem?.getPipeline(this._selectedPipeline)
      : null;

    if (!pipeline) {
      this._elements.content.innerHTML = `
        <div class="council-pipeline-phases-tab">
          <div class="council-pipeline-empty">
            <p>Select a pipeline first to view its phases.</p>
            <button class="council-pipeline-btn council-pipeline-btn-secondary" data-action="go-to-pipelines">
              Go to Pipelines
            </button>
          </div>
        </div>
      `;
      return;
    }

    const phases = pipeline.phases || [];

    let html = `
      <div class="council-pipeline-phases-tab">
        <div class="council-pipeline-breadcrumb">
          <span data-action="go-to-pipelines" class="council-pipeline-breadcrumb-link">Pipelines</span>
          <span class="council-pipeline-breadcrumb-sep">›</span>
          <span class="council-pipeline-breadcrumb-current">${this._escapeHtml(pipeline.name)}</span>
        </div>

        <div class="council-pipeline-toolbar">
          <button class="council-pipeline-btn council-pipeline-btn-primary" data-action="create-phase">
            ➕ Add Phase
          </button>
          <button class="council-pipeline-btn council-pipeline-btn-secondary" data-action="reorder-phases">
            ↕️ Reorder
          </button>
        </div>

        <div class="council-pipeline-list-container">
          <div class="council-pipeline-list">
            ${
              phases.length === 0
                ? '<div class="council-pipeline-empty">No phases defined. Add one to get started.</div>'
                : phases
                    .map((p, idx) => this._renderPhaseListItem(p, idx))
                    .join("")
            }
          </div>

          <div class="council-pipeline-detail">
            ${
              this._selectedPhase
                ? this._renderPhaseDetail(
                    phases.find((p) => p.id === this._selectedPhase),
                  )
                : '<div class="council-pipeline-empty">Select a phase to view details</div>'
            }
          </div>
        </div>
      </div>
    `;

    this._elements.content.innerHTML = html;
  },

  /**
   * Render a phase list item
   * @param {Object} phase - Phase object
   * @param {number} index - Phase index
   * @returns {string} HTML string
   */
  _renderPhaseListItem(phase, index) {
    const isSelected = phase.id === this._selectedPhase;
    const actionCount = phase.actions?.length || 0;

    return `
      <div class="council-pipeline-list-item ${isSelected ? "selected" : ""}"
           data-phase-id="${phase.id}"
           data-action="select-phase">
        <div class="council-pipeline-list-item-header">
          <span class="council-pipeline-list-item-icon">${phase.icon || "🎭"}</span>
          <span class="council-pipeline-list-item-order">${index + 1}.</span>
          <span class="council-pipeline-list-item-name">${this._escapeHtml(phase.name)}</span>
        </div>
        <div class="council-pipeline-list-item-meta">
          <span title="Actions">⚡ ${actionCount}</span>
          <span title="Teams">${(phase.teams || []).length} teams</span>
          ${phase.gavel?.enabled ? '<span title="Gavel enabled">⚖️</span>' : ""}
        </div>
        ${
          phase.description
            ? `<div class="council-pipeline-list-item-desc">${this._escapeHtml(phase.description)}</div>`
            : ""
        }
      </div>
    `;
  },

  /**
   * Render phase detail view
   * @param {Object} phase - Phase object
   * @returns {string} HTML string
   */
  _renderPhaseDetail(phase) {
    if (!phase)
      return '<div class="council-pipeline-empty">Phase not found</div>';

    return `
      <div class="council-pipeline-detail-content">
        <div class="council-pipeline-detail-header">
          <span class="council-pipeline-detail-icon">${phase.icon || "🎭"}</span>
          <h3>${this._escapeHtml(phase.name)}</h3>
          <div class="council-pipeline-detail-header-actions">
            <button class="council-pipeline-btn council-pipeline-btn-icon" data-action="edit-phase" data-phase-id="${phase.id}" title="Edit">
              ✏️
            </button>
            <button class="council-pipeline-btn council-pipeline-btn-icon" data-action="delete-phase" data-phase-id="${phase.id}" title="Delete">
              🗑️
            </button>
          </div>
        </div>

        <div class="council-pipeline-detail-section">
          <label>Description</label>
          <div class="council-pipeline-detail-value">${this._escapeHtml(phase.description || "No description")}</div>
        </div>

        <div class="council-pipeline-detail-section">
          <label>Teams</label>
          <div class="council-pipeline-detail-tags">
            ${(phase.teams || []).map((t) => `<span class="council-pipeline-tag">${this._escapeHtml(t)}</span>`).join("") || "All teams"}
          </div>
        </div>

        <div class="council-pipeline-detail-section">
          <label>Context Configuration</label>
          <div class="council-pipeline-context-config">
            <div><strong>Static:</strong> ${(phase.context?.static || []).join(", ") || "Default"}</div>
            <div><strong>Global:</strong> ${(phase.context?.global || []).join(", ") || "None"}</div>
            <div><strong>Phase:</strong> ${(phase.context?.phase || []).join(", ") || "None"}</div>
            <div><strong>Stores:</strong> ${(phase.context?.stores || []).join(", ") || "None"}</div>
          </div>
        </div>

        <div class="council-pipeline-detail-section">
          <label>Threads</label>
          <div class="council-pipeline-thread-config">
            <div>Phase Thread: ${phase.threads?.phaseThread?.enabled ? "✅ Enabled" : "❌ Disabled"}</div>
          </div>
        </div>

        <div class="council-pipeline-detail-section">
          <label>Output Configuration</label>
          <div class="council-pipeline-output-config">
            <div><strong>Consolidation:</strong> ${phase.output?.consolidation || "last_action"}</div>
            ${
              phase.output?.consolidationActionId
                ? `<div><strong>Designated Action:</strong> ${phase.output.consolidationActionId}</div>`
                : ""
            }
          </div>
        </div>

        <div class="council-pipeline-detail-section">
          <label>Gavel (User Review)</label>
          <div class="council-pipeline-gavel-config">
            <div>Enabled: ${phase.gavel?.enabled ? "✅ Yes" : "❌ No"}</div>
            ${
              phase.gavel?.enabled
                ? `
              <div>Can Skip: ${phase.gavel.canSkip ? "Yes" : "No"}</div>
              <div>Editable Fields: ${(phase.gavel.editableFields || []).join(", ") || "All"}</div>
            `
                : ""
            }
          </div>
        </div>

        <div class="council-pipeline-detail-section">
          <label>Actions (${phase.actions?.length || 0})</label>
          <div class="council-pipeline-action-list">
            ${
              (phase.actions || [])
                .map(
                  (action, idx) => `
              <div class="council-pipeline-action-item" data-action-id="${action.id}" data-action="select-action-from-detail">
                <span class="council-pipeline-action-order">${idx + 1}.</span>
                <span class="council-pipeline-action-name">${this._escapeHtml(action.name)}</span>
                <span class="council-pipeline-action-mode">${action.execution?.mode || "sync"}</span>
              </div>
            `,
                )
                .join("") ||
              '<div class="council-pipeline-empty-small">No actions</div>'
            }
          </div>
          <button class="council-pipeline-btn council-pipeline-btn-secondary council-pipeline-btn-small"
                  data-action="view-actions" data-phase-id="${phase.id}">
            View All Actions →
          </button>
        </div>
      </div>
    `;
  },

  /**
   * Render Actions tab
   */
  _renderActionsTab() {
    const pipeline = this._selectedPipeline
      ? this._pipelineSystem?.getPipeline(this._selectedPipeline)
      : null;

    const phase =
      pipeline && this._selectedPhase
        ? pipeline.phases?.find((p) => p.id === this._selectedPhase)
        : null;

    if (!pipeline || !phase) {
      this._elements.content.innerHTML = `
        <div class="council-pipeline-actions-tab">
          <div class="council-pipeline-empty">
            <p>Select a pipeline and phase first to view actions.</p>
            <button class="council-pipeline-btn council-pipeline-btn-secondary" data-action="go-to-phases">
              Go to Phases
            </button>
          </div>
        </div>
      `;
      return;
    }

    const actions = phase.actions || [];

    let html = `
      <div class="council-pipeline-actions-tab">
        <div class="council-pipeline-breadcrumb">
          <span data-action="go-to-pipelines" class="council-pipeline-breadcrumb-link">Pipelines</span>
          <span class="council-pipeline-breadcrumb-sep">›</span>
          <span data-action="go-to-phases" class="council-pipeline-breadcrumb-link">${this._escapeHtml(pipeline.name)}</span>
          <span class="council-pipeline-breadcrumb-sep">›</span>
          <span class="council-pipeline-breadcrumb-current">${phase.icon || "🎭"} ${this._escapeHtml(phase.name)}</span>
        </div>

        <div class="council-pipeline-toolbar">
          <button class="council-pipeline-btn council-pipeline-btn-primary" data-action="create-action">
            ➕ Add Action
          </button>
          <button class="council-pipeline-btn council-pipeline-btn-secondary" data-action="reorder-actions">
            ↕️ Reorder
          </button>
        </div>

        <div class="council-pipeline-list-container">
          <div class="council-pipeline-list">
            ${
              actions.length === 0
                ? '<div class="council-pipeline-empty">No actions defined. Add one to get started.</div>'
                : actions
                    .map((a, idx) => this._renderActionListItem(a, idx))
                    .join("")
            }
          </div>

          <div class="council-pipeline-detail">
            ${
              this._selectedAction
                ? this._renderActionDetail(
                    actions.find((a) => a.id === this._selectedAction),
                  )
                : '<div class="council-pipeline-empty">Select an action to view details</div>'
            }
          </div>
        </div>
      </div>
    `;

    this._elements.content.innerHTML = html;
  },

  /**
   * Render an action list item
   * @param {Object} action - Action object
   * @param {number} index - Action index
   * @returns {string} HTML string
   */
  _renderActionListItem(action, index) {
    const isSelected = action.id === this._selectedAction;
    const mode = action.execution?.mode || "sync";
    const trigger = action.execution?.trigger?.type || "sequential";

    return `
      <div class="council-pipeline-list-item ${isSelected ? "selected" : ""}"
           data-action-id="${action.id}"
           data-action="select-action">
        <div class="council-pipeline-list-item-header">
          <span class="council-pipeline-list-item-order">${index + 1}.</span>
          <span class="council-pipeline-list-item-name">${this._escapeHtml(action.name)}</span>
        </div>
        <div class="council-pipeline-list-item-meta">
          <span class="council-pipeline-tag council-pipeline-tag-${mode}" title="Mode">${mode}</span>
          <span class="council-pipeline-tag" title="Trigger">${trigger}</span>
          ${action.rag?.enabled ? '<span title="RAG enabled">🔍</span>' : ""}
        </div>
        ${
          action.description
            ? `<div class="council-pipeline-list-item-desc">${this._escapeHtml(action.description)}</div>`
            : ""
        }
      </div>
    `;
  },

  /**
   * Render action detail view
   * @param {Object} action - Action object
   * @returns {string} HTML string
   */
  _renderActionDetail(action) {
    if (!action)
      return '<div class="council-pipeline-empty">Action not found</div>';

    const participants = action.participants || {};
    const execution = action.execution || {};
    const input = action.input || {};
    const output = action.output || {};

    return `
      <div class="council-pipeline-detail-content">
        <div class="council-pipeline-detail-header">
          <h3>${this._escapeHtml(action.name)}</h3>
          <div class="council-pipeline-detail-header-actions">
            <button class="council-pipeline-btn council-pipeline-btn-icon" data-action="edit-action" data-action-id="${action.id}" title="Edit">
              ✏️
            </button>
            <button class="council-pipeline-btn council-pipeline-btn-icon" data-action="delete-action" data-action-id="${action.id}" title="Delete">
              🗑️
            </button>
          </div>
        </div>

        <div class="council-pipeline-detail-section">
          <label>Description</label>
          <div class="council-pipeline-detail-value">${this._escapeHtml(action.description || "No description")}</div>
        </div>

        <div class="council-pipeline-detail-section">
          <label>Execution</label>
          <div class="council-pipeline-execution-config">
            <div><strong>Mode:</strong> ${execution.mode || "sync"}</div>
            <div><strong>Trigger:</strong> ${execution.trigger?.type || "sequential"}</div>
            ${
              execution.trigger?.targetActionId
                ? `<div><strong>Target Action:</strong> ${execution.trigger.targetActionId}</div>`
                : ""
            }
            ${
              execution.trigger?.targetState
                ? `<div><strong>Target State:</strong> ${execution.trigger.targetState}</div>`
                : ""
            }
            <div><strong>Timeout:</strong> ${execution.timeout || 30000}ms</div>
            <div><strong>Retry Count:</strong> ${execution.retryCount || 0}</div>
          </div>
        </div>

        <div class="council-pipeline-detail-section">
          <label>Participants</label>
          <div class="council-pipeline-participants-config">
            <div><strong>Positions:</strong> ${(participants.positionIds || []).join(", ") || "None specified"}</div>
            <div><strong>Teams:</strong> ${(participants.teamIds || []).join(", ") || "None specified"}</div>
            <div><strong>Orchestration:</strong> ${participants.orchestration || "sequential"}</div>
            ${participants.maxRounds ? `<div><strong>Max Rounds:</strong> ${participants.maxRounds}</div>` : ""}
          </div>
        </div>

        <div class="council-pipeline-detail-section">
          <label>Input</label>
          <div class="council-pipeline-io-config">
            <div><strong>Source:</strong> ${input.source || "phaseInput"}</div>
            ${input.sourceKey ? `<div><strong>Source Key:</strong> ${input.sourceKey}</div>` : ""}
            ${input.transform ? `<div><strong>Transform:</strong> ${input.transform}</div>` : ""}
          </div>
        </div>

        <div class="council-pipeline-detail-section">
          <label>Output</label>
          <div class="council-pipeline-io-config">
            <div><strong>Target:</strong> ${output.target || "phaseOutput"}</div>
            ${output.targetKey ? `<div><strong>Target Key:</strong> ${output.targetKey}</div>` : ""}
            <div><strong>Append:</strong> ${output.append ? "Yes" : "No"}</div>
          </div>
        </div>

        ${
          action.rag?.enabled
            ? `
          <div class="council-pipeline-detail-section">
            <label>RAG Configuration</label>
            <div class="council-pipeline-rag-config">
              <div><strong>Pipeline:</strong> ${action.rag.ragPipelineId || "Default"}</div>
              <div><strong>Result Target:</strong> ${action.rag.resultTarget || "context"}</div>
            </div>
          </div>
        `
            : ""
        }

        <div class="council-pipeline-detail-section">
          <label>Prompt Template</label>
          <div class="council-pipeline-prompt-preview">
            <pre>${this._escapeHtml(action.promptTemplate || "No template defined")}</pre>
          </div>
        </div>
      </div>
    `;
  },

  /**
   * Render Execution tab - live run monitoring
   */
  _renderExecutionTab() {
    const activeRun = this._pipelineSystem?.getActiveRun();
    const isRunning = this._pipelineSystem?.isRunning() || false;

    let html = `
      <div class="council-pipeline-execution-tab">
        <div class="council-pipeline-execution-header">
          <h3>Pipeline Execution</h3>
          ${isRunning ? '<span class="council-pipeline-running-indicator">● Running</span>' : ""}
        </div>
    `;

    if (!activeRun) {
      html += `
        <div class="council-pipeline-execution-empty">
          <div class="council-pipeline-empty">
            <p>No active pipeline run.</p>
            ${
              this._selectedPipeline
                ? `<button class="council-pipeline-btn council-pipeline-btn-primary" data-action="run">
                  ▶️ Run ${this._escapeHtml(this._pipelineSystem?.getPipeline(this._selectedPipeline)?.name || "Pipeline")}
                </button>`
                : `<p>Select a pipeline first, then click Run.</p>`
            }
          </div>
        </div>
      `;
    } else {
      html += this._renderActiveRunView(activeRun);
    }

    html += `</div>`;
    this._elements.content.innerHTML = html;
  },

  /**
   * Render active run view
   * @param {Object} run - Run state object
   * @returns {string} HTML string
   */
  _renderActiveRunView(run) {
    const statusColors = {
      running: "blue",
      paused: "yellow",
      completed: "green",
      failed: "red",
      aborted: "orange",
    };

    return `
      <div class="council-pipeline-run-view">
        <div class="council-pipeline-run-header">
          <div class="council-pipeline-run-info">
            <div class="council-pipeline-run-name">${this._escapeHtml(run.pipelineName)}</div>
            <div class="council-pipeline-run-id">Run ID: ${run.id}</div>
          </div>
          <div class="council-pipeline-run-status council-pipeline-status-${statusColors[run.status] || "gray"}">
            ${run.status?.toUpperCase() || "UNKNOWN"}
          </div>
        </div>

        <div class="council-pipeline-run-progress">
          <div class="council-pipeline-progress-bar">
            <div class="council-pipeline-progress-fill" style="width: ${this._calculateRunProgress(run)}%"></div>
          </div>
          <div class="council-pipeline-progress-text">
            Phase ${(run.currentPhaseIndex || 0) + 1} of ${Object.keys(run.phases || {}).length}
            ${run.currentPhaseId ? `- ${this._escapeHtml(run.phases?.[run.currentPhaseId]?.name || run.currentPhaseId)}` : ""}
          </div>
        </div>

        <div class="council-pipeline-run-phases">
          ${this._renderRunPhases(run)}
        </div>

        ${
          run.error
            ? `
          <div class="council-pipeline-run-error">
            <strong>Error:</strong> ${this._escapeHtml(run.error)}
          </div>
        `
            : ""
        }

        <div class="council-pipeline-run-timing">
          <div>Started: ${run.startedAt ? new Date(run.startedAt).toLocaleTimeString() : "N/A"}</div>
          ${run.endedAt ? `<div>Ended: ${new Date(run.endedAt).toLocaleTimeString()}</div>` : ""}
        </div>
      </div>
    `;
  },

  /**
   * Render run phases
   * @param {Object} run - Run state object
   * @returns {string} HTML string
   */
  _renderRunPhases(run) {
    const phases = run.phases || {};
    const phaseIds = Object.keys(phases);

    if (phaseIds.length === 0) {
      return '<div class="council-pipeline-empty-small">No phases yet</div>';
    }

    return phaseIds
      .map((phaseId) => {
        const phase = phases[phaseId];
        const isCurrent = phaseId === run.currentPhaseId;
        const statusIcon = this._getPhaseStatusIcon(phase.lifecycle);

        return `
        <div class="council-pipeline-run-phase ${isCurrent ? "current" : ""} council-pipeline-phase-${phase.lifecycle || "pending"}">
          <div class="council-pipeline-run-phase-header">
            <span class="council-pipeline-run-phase-status">${statusIcon}</span>
            <span class="council-pipeline-run-phase-name">${this._escapeHtml(phase.name)}</span>
            <span class="council-pipeline-run-phase-lifecycle">${phase.lifecycle || "pending"}</span>
          </div>
          ${
            phase.actions && Object.keys(phase.actions).length > 0
              ? `
            <div class="council-pipeline-run-actions">
              ${Object.entries(phase.actions)
                .map(
                  ([actionId, action]) => `
                <div class="council-pipeline-run-action council-pipeline-action-${action.lifecycle || "pending"}">
                  <span class="council-pipeline-run-action-status">${this._getActionStatusIcon(action.lifecycle)}</span>
                  <span class="council-pipeline-run-action-name">${this._escapeHtml(action.name)}</span>
                </div>
              `,
                )
                .join("")}
            </div>
          `
              : ""
          }
        </div>
      `;
      })
      .join("");
  },

  /**
   * Get phase status icon
   * @param {string} lifecycle - Phase lifecycle state
   * @returns {string} Icon
   */
  _getPhaseStatusIcon(lifecycle) {
    const icons = {
      start: "🔵",
      before_actions: "🔵",
      in_progress: "🔄",
      after_actions: "🔵",
      end: "✅",
      respond: "✅",
    };
    return icons[lifecycle] || "⚪";
  },

  /**
   * Get action status icon
   * @param {string} lifecycle - Action lifecycle state
   * @returns {string} Icon
   */
  _getActionStatusIcon(lifecycle) {
    const icons = {
      called: "📞",
      start: "🔵",
      in_progress: "🔄",
      complete: "✅",
      respond: "✅",
    };
    return icons[lifecycle] || "⚪";
  },

  /**
   * Calculate run progress percentage
   * @param {Object} run - Run state
   * @returns {number} Progress percentage
   */
  _calculateRunProgress(run) {
    const totalPhases = Object.keys(run.phases || {}).length;
    if (totalPhases === 0) return 0;

    const currentIndex = run.currentPhaseIndex || 0;
    return Math.round((currentIndex / totalPhases) * 100);
  },

  /**
   * Render Threads tab
   */
  _renderThreadsTab() {
    const threads = this._threadManager?.getAllThreads?.() || [];

    let html = `
      <div class="council-pipeline-threads-tab">
        <div class="council-pipeline-toolbar">
          <label class="council-pipeline-checkbox">
            <input type="checkbox" data-setting="auto-scroll" ${this._autoScrollThreads ? "checked" : ""}>
            Auto-scroll
          </label>
          <button class="council-pipeline-btn council-pipeline-btn-secondary" data-action="clear-threads">
            🗑️ Clear All
          </button>
        </div>

        <div class="council-pipeline-threads-container">
          ${
            threads.length === 0
              ? '<div class="council-pipeline-empty">No active threads. Threads will appear here during pipeline execution.</div>'
              : threads.map((t) => this._renderThread(t)).join("")
          }
        </div>
      </div>
    `;

    this._elements.content.innerHTML = html;

    // Auto-scroll if enabled
    if (this._autoScrollThreads) {
      const container = this._elements.content.querySelector(
        ".council-pipeline-threads-container",
      );
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }
  },

  /**
   * Render a thread
   * @param {Object} thread - Thread object
   * @returns {string} HTML string
   */
  _renderThread(thread) {
    const messages = thread.messages || [];

    return `
      <div class="council-pipeline-thread" data-thread-id="${thread.id}">
        <div class="council-pipeline-thread-header">
          <span class="council-pipeline-thread-type">${thread.type || "thread"}</span>
          <span class="council-pipeline-thread-id">${thread.id}</span>
          <span class="council-pipeline-thread-count">${messages.length} messages</span>
        </div>
        <div class="council-pipeline-thread-messages">
          ${messages
            .map(
              (m) => `
            <div class="council-pipeline-message council-pipeline-message-${m.role || "user"}">
              <div class="council-pipeline-message-header">
                <span class="council-pipeline-message-role">${m.role || "user"}</span>
                ${m.timestamp ? `<span class="council-pipeline-message-time">${new Date(m.timestamp).toLocaleTimeString()}</span>` : ""}
              </div>
              <div class="council-pipeline-message-content">${this._escapeHtml(m.content || "")}</div>
            </div>
          `,
            )
            .join("")}
        </div>
      </div>
    `;
  },

  /**
   * Render Outputs tab
   */
  _renderOutputsTab() {
    const globals = this._outputManager?.getGlobals?.() || {};
    const phaseOutputs = this._outputManager?.getAllPhaseOutputs?.() || {};
    const finalOutput = this._outputManager?.getFinalOutput?.() || null;

    let html = `
      <div class="council-pipeline-outputs-tab">
        <div class="council-pipeline-toolbar">
          <button class="council-pipeline-btn council-pipeline-btn-secondary" data-action="copy-final-output" ${!finalOutput ? "disabled" : ""}>
            📋 Copy Final Output
          </button>
          <button class="council-pipeline-btn council-pipeline-btn-secondary" data-action="export-outputs">
            📤 Export All
          </button>
        </div>

        <div class="council-pipeline-outputs-container">
          ${
            finalOutput
              ? `
            <div class="council-pipeline-output-section">
              <h4>📤 Final Output</h4>
              <div class="council-pipeline-output-content council-pipeline-final-output">
                <pre>${this._escapeHtml(typeof finalOutput === "string" ? finalOutput : JSON.stringify(finalOutput, null, 2))}</pre>
              </div>
            </div>
          `
              : ""
          }

          <div class="council-pipeline-output-section">
            <h4>🌐 Global Variables</h4>
            <div class="council-pipeline-output-content">
              ${
                Object.keys(globals).length === 0
                  ? '<div class="council-pipeline-empty-small">No global variables set</div>'
                  : `<pre>${this._escapeHtml(JSON.stringify(globals, null, 2))}</pre>`
              }
            </div>
          </div>

          <div class="council-pipeline-output-section">
            <h4>🎭 Phase Outputs</h4>
            <div class="council-pipeline-phase-outputs">
              ${
                Object.keys(phaseOutputs).length === 0
                  ? '<div class="council-pipeline-empty-small">No phase outputs yet</div>'
                  : Object.entries(phaseOutputs)
                      .map(
                        ([phaseId, output]) => `
                    <div class="council-pipeline-phase-output">
                      <div class="council-pipeline-phase-output-header">${this._escapeHtml(phaseId)}</div>
                      <div class="council-pipeline-output-content">
                        <pre>${this._escapeHtml(typeof output === "string" ? output : JSON.stringify(output, null, 2))}</pre>
                      </div>
                    </div>
                  `,
                      )
                      .join("")
              }
            </div>
          </div>
        </div>
      </div>
    `;

    this._elements.content.innerHTML = html;
  },

  // ===== ACTION HANDLERS =====

  /**
   * Handle action button clicks
   * @param {string} action - Action name
   * @param {Event} e - Click event
   */
  _handleAction(action, e) {
    this._log("debug", `Action: ${action}`);

    switch (action) {
      case "close":
        this.hide();
        break;
      case "import":
        this._showImportDialog();
        break;
      case "export":
        this._exportPipeline();
        break;
      case "live-toggle":
        if (this._isLiveMode) {
          this._stopLiveRefresh();
        } else {
          this._startLiveRefresh();
        }
        break;
      case "run":
        this._runPipeline();
        break;
      case "pause":
        this._pausePipeline();
        break;
      case "abort":
        this._abortPipeline();
        break;
      case "create-pipeline":
        this._showPipelineEditor();
        break;
      case "duplicate-pipeline":
        this._duplicatePipeline();
        break;
      case "delete-pipeline":
        this._deletePipeline();
        break;
      case "create-phase":
        this._showPhaseEditor();
        break;
      case "create-action":
        this._showActionEditor();
        break;
      case "go-to-pipelines":
        this._switchTab("pipelines");
        break;
      case "go-to-phases":
        this._switchTab("phases");
        break;
      case "copy-final-output":
        this._copyFinalOutput();
        break;
      case "export-outputs":
        this._exportOutputs();
        break;
      case "clear-threads":
        this._clearThreads();
        break;
      default:
        this._log("debug", `Unhandled action: ${action}`);
    }
  },

  /**
   * Handle clicks within content area
   * @param {Event} e - Click event
   */
  _handleContentClick(e) {
    const target = e.target.closest("[data-action]");
    if (!target) return;

    const action = target.dataset.action;

    switch (action) {
      case "select-pipeline":
        this._selectedPipeline = target.dataset.pipelineId;
        this._selectedPhase = null;
        this._selectedAction = null;
        this._refreshCurrentTab();
        break;
      case "select-phase":
      case "select-phase-from-detail":
        this._selectedPhase = target.dataset.phaseId;
        this._selectedAction = null;
        if (action === "select-phase-from-detail") {
          this._switchTab("phases");
        } else {
          this._refreshCurrentTab();
        }
        break;
      case "select-action":
      case "select-action-from-detail":
        this._selectedAction = target.dataset.actionId;
        if (action === "select-action-from-detail") {
          this._switchTab("actions");
        } else {
          this._refreshCurrentTab();
        }
        break;
      case "view-actions":
        this._selectedPhase = target.dataset.phaseId;
        this._switchTab("actions");
        break;
      case "edit-pipeline":
        this._showPipelineEditor(target.dataset.pipelineId);
        break;
      case "edit-phase":
        this._showPhaseEditor(target.dataset.phaseId);
        break;
      case "edit-action":
        this._showActionEditor(target.dataset.actionId);
        break;
      case "delete-phase":
        this._deletePhase(target.dataset.phaseId);
        break;
      case "delete-action":
        this._deleteAction(target.dataset.actionId);
        break;
      default:
        this._handleAction(action, e);
    }
  },

  /**
   * Handle change events in content
   * @param {Event} e - Change event
   */
  _handleContentChange(e) {
    const target = e.target;

    if (target.dataset.setting === "auto-scroll") {
      this._autoScrollThreads = target.checked;
    }
  },

  /**
   * Handle input events in content
   * @param {Event} e - Input event
   */
  _handleContentInput(e) {
    // Reserved for form inputs
  },

  // ===== PIPELINE OPERATIONS =====

  /**
   * Run the selected pipeline
   */
  async _runPipeline() {
    if (!this._selectedPipeline) {
      this._showNotification("Please select a pipeline first", "warning");
      return;
    }

    try {
      // Show input dialog
      const userInput = await this._showInputDialog();
      if (userInput === null) return; // Cancelled

      this._log("info", `Starting pipeline: ${this._selectedPipeline}`);
      await this._pipelineSystem.startRun(this._selectedPipeline, {
        userInput,
      });

      this._startLiveRefresh();
      this._switchTab("execution");
    } catch (error) {
      this._log("error", "Failed to start pipeline:", error);
      this._showNotification(
        `Failed to start pipeline: ${error.message}`,
        "error",
      );
    }
  },

  /**
   * Pause the running pipeline
   */
  _pausePipeline() {
    try {
      this._pipelineSystem.pauseRun();
      this._updateExecutionButtons();
    } catch (error) {
      this._log("error", "Failed to pause pipeline:", error);
    }
  },

  /**
   * Abort the running pipeline
   */
  _abortPipeline() {
    if (!confirm("Are you sure you want to abort the pipeline?")) return;

    try {
      this._pipelineSystem.abortRun();
      this._stopLiveRefresh();
      this._updateExecutionButtons();
    } catch (error) {
      this._log("error", "Failed to abort pipeline:", error);
    }
  },

  /**
   * Update execution control buttons
   */
  _updateExecutionButtons() {
    const isRunning = this._pipelineSystem?.isRunning() || false;
    const activeRun = this._pipelineSystem?.getActiveRun();
    const isPaused = activeRun?.status === "paused";

    const runBtn = this._elements.modal.querySelector('[data-action="run"]');
    const pauseBtn = this._elements.modal.querySelector(
      '[data-action="pause"]',
    );
    const abortBtn = this._elements.modal.querySelector(
      '[data-action="abort"]',
    );

    if (runBtn) runBtn.disabled = isRunning;
    if (pauseBtn) {
      pauseBtn.disabled = !isRunning || isPaused;
      pauseBtn.textContent = isPaused ? "▶️ Resume" : "⏸️ Pause";
      if (isPaused) {
        pauseBtn.dataset.action = "resume";
      } else {
        pauseBtn.dataset.action = "pause";
      }
    }
    if (abortBtn) abortBtn.disabled = !isRunning;
  },

  // ===== DIALOGS =====

  /**
   * Show user input dialog for pipeline run
   * @returns {Promise<string|null>} User input or null if cancelled
   */
  async _showInputDialog() {
    return new Promise((resolve) => {
      const dialog = document.createElement("div");
      dialog.className = "council-pipeline-dialog-overlay";
      dialog.innerHTML = `
        <div class="council-pipeline-dialog">
          <div class="council-pipeline-dialog-header">
            <h3>Pipeline Input</h3>
          </div>
          <div class="council-pipeline-dialog-content">
            <label>Enter your message or prompt:</label>
            <textarea class="council-pipeline-dialog-input" rows="5" placeholder="Type your input here..."></textarea>
          </div>
          <div class="council-pipeline-dialog-actions">
            <button class="council-pipeline-btn council-pipeline-btn-secondary" data-dialog="cancel">Cancel</button>
            <button class="council-pipeline-btn council-pipeline-btn-primary" data-dialog="confirm">Run Pipeline</button>
          </div>
        </div>
      `;

      document.body.appendChild(dialog);

      const input = dialog.querySelector(".council-pipeline-dialog-input");
      input.focus();

      const cleanup = () => {
        dialog.remove();
      };

      dialog
        .querySelector('[data-dialog="cancel"]')
        .addEventListener("click", () => {
          cleanup();
          resolve(null);
        });

      dialog
        .querySelector('[data-dialog="confirm"]')
        .addEventListener("click", () => {
          const value = input.value.trim();
          cleanup();
          resolve(value);
        });

      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && e.ctrlKey) {
          const value = input.value.trim();
          cleanup();
          resolve(value);
        }
      });
    });
  },

  /**
   * Show import dialog
   */
  _showImportDialog() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";

    input.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);
        this._pipelineSystem.importPipelines(data);
        this._showNotification("Pipelines imported successfully", "success");
        this._refreshCurrentTab();
      } catch (error) {
        this._log("error", "Import failed:", error);
        this._showNotification(`Import failed: ${error.message}`, "error");
      }
    });

    input.click();
  },

  /**
   * Export pipeline(s)
   */
  _exportPipeline() {
    try {
      const data = this._pipelineSystem.exportPipelines();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `council-pipelines-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      this._showNotification("Pipelines exported", "success");
    } catch (error) {
      this._log("error", "Export failed:", error);
      this._showNotification(`Export failed: ${error.message}`, "error");
    }
  },

  /**
   * Show pipeline editor dialog
   * @param {string} [pipelineId] - Pipeline ID for editing, null for create
   */
  _showPipelineEditor(pipelineId = null) {
    const pipeline = pipelineId
      ? this._pipelineSystem.getPipeline(pipelineId)
      : null;
    const isEdit = !!pipeline;

    const dialog = document.createElement("div");
    dialog.className = "council-pipeline-dialog-overlay";
    dialog.innerHTML = `
      <div class="council-pipeline-dialog council-pipeline-dialog-large">
        <div class="council-pipeline-dialog-header">
          <h3>${isEdit ? "Edit Pipeline" : "Create Pipeline"}</h3>
        </div>
        <div class="council-pipeline-dialog-content">
          <div class="council-pipeline-form-group">
            <label>Name *</label>
            <input type="text" class="council-pipeline-input" data-field="name" value="${this._escapeHtml(pipeline?.name || "")}" required>
          </div>
          <div class="council-pipeline-form-group">
            <label>Description</label>
            <textarea class="council-pipeline-input" data-field="description" rows="3">${this._escapeHtml(pipeline?.description || "")}</textarea>
          </div>
          <div class="council-pipeline-form-group">
            <label>Version</label>
            <input type="text" class="council-pipeline-input" data-field="version" value="${pipeline?.version || "1.0.0"}">
          </div>
          <div class="council-pipeline-form-group">
            <label>Static Context</label>
            <div class="council-pipeline-checkbox-group">
              <label><input type="checkbox" data-field="includeCharacterCard" ${pipeline?.staticContext?.includeCharacterCard !== false ? "checked" : ""}> Character Card</label>
              <label><input type="checkbox" data-field="includeWorldInfo" ${pipeline?.staticContext?.includeWorldInfo ? "checked" : ""}> World Info</label>
              <label><input type="checkbox" data-field="includePersona" ${pipeline?.staticContext?.includePersona ? "checked" : ""}> Persona</label>
              <label><input type="checkbox" data-field="includeScenario" ${pipeline?.staticContext?.includeScenario ? "checked" : ""}> Scenario</label>
            </div>
          </div>
        </div>
        <div class="council-pipeline-dialog-actions">
          <button class="council-pipeline-btn council-pipeline-btn-secondary" data-dialog="cancel">Cancel</button>
          <button class="council-pipeline-btn council-pipeline-btn-primary" data-dialog="save">${isEdit ? "Save" : "Create"}</button>
        </div>
      </div>
    `;

    document.body.appendChild(dialog);

    const cleanup = () => dialog.remove();

    dialog
      .querySelector('[data-dialog="cancel"]')
      .addEventListener("click", cleanup);

    dialog
      .querySelector('[data-dialog="save"]')
      .addEventListener("click", () => {
        const name = dialog.querySelector('[data-field="name"]').value.trim();
        if (!name) {
          this._showNotification("Name is required", "error");
          return;
        }

        const data = {
          name,
          description: dialog
            .querySelector('[data-field="description"]')
            .value.trim(),
          version:
            dialog.querySelector('[data-field="version"]').value.trim() ||
            "1.0.0",
          staticContext: {
            includeCharacterCard: dialog.querySelector(
              '[data-field="includeCharacterCard"]',
            ).checked,
            includeWorldInfo: dialog.querySelector(
              '[data-field="includeWorldInfo"]',
            ).checked,
            includePersona: dialog.querySelector(
              '[data-field="includePersona"]',
            ).checked,
            includeScenario: dialog.querySelector(
              '[data-field="includeScenario"]',
            ).checked,
          },
        };

        try {
          if (isEdit) {
            this._pipelineSystem.updatePipeline(pipelineId, data);
            this._showNotification("Pipeline updated", "success");
          } else {
            const id = `pipeline_${Date.now()}`;
            this._pipelineSystem.registerPipeline({ id, ...data });
            this._selectedPipeline = id;
            this._showNotification("Pipeline created", "success");
          }
          cleanup();
          this._refreshCurrentTab();
        } catch (error) {
          this._showNotification(`Failed: ${error.message}`, "error");
        }
      });
  },

  /**
   * Duplicate selected pipeline
   */
  _duplicatePipeline() {
    if (!this._selectedPipeline) return;

    const pipeline = this._pipelineSystem.getPipeline(this._selectedPipeline);
    if (!pipeline) return;

    const newId = `pipeline_${Date.now()}`;
    const newPipeline = {
      ...JSON.parse(JSON.stringify(pipeline)),
      id: newId,
      name: `${pipeline.name} (Copy)`,
      metadata: {
        ...pipeline.metadata,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };

    try {
      this._pipelineSystem.registerPipeline(newPipeline);
      this._selectedPipeline = newId;
      this._showNotification("Pipeline duplicated", "success");
      this._refreshCurrentTab();
    } catch (error) {
      this._showNotification(`Failed to duplicate: ${error.message}`, "error");
    }
  },

  /**
   * Delete selected pipeline
   */
  _deletePipeline() {
    if (!this._selectedPipeline) return;
    if (!confirm("Are you sure you want to delete this pipeline?")) return;

    try {
      this._pipelineSystem.deletePipeline(this._selectedPipeline);
      this._selectedPipeline = null;
      this._selectedPhase = null;
      this._selectedAction = null;
      this._showNotification("Pipeline deleted", "success");
      this._refreshCurrentTab();
    } catch (error) {
      this._showNotification(`Failed to delete: ${error.message}`, "error");
    }
  },

  /**
   * Show phase editor dialog
   * @param {string} [phaseId] - Phase ID for editing, null for create
   */
  _showPhaseEditor(phaseId = null) {
    const pipeline = this._pipelineSystem.getPipeline(this._selectedPipeline);
    if (!pipeline) return;

    const phase = phaseId
      ? pipeline.phases?.find((p) => p.id === phaseId)
      : null;
    const isEdit = !!phase;

    const dialog = document.createElement("div");
    dialog.className = "council-pipeline-dialog-overlay";
    dialog.innerHTML = `
      <div class="council-pipeline-dialog council-pipeline-dialog-large">
        <div class="council-pipeline-dialog-header">
          <h3>${isEdit ? "Edit Phase" : "Create Phase"}</h3>
        </div>
        <div class="council-pipeline-dialog-content">
          <div class="council-pipeline-form-group">
            <label>Name *</label>
            <input type="text" class="council-pipeline-input" data-field="name" value="${this._escapeHtml(phase?.name || "")}" required>
          </div>
          <div class="council-pipeline-form-group">
            <label>Description</label>
            <textarea class="council-pipeline-input" data-field="description" rows="2">${this._escapeHtml(phase?.description || "")}</textarea>
          </div>
          <div class="council-pipeline-form-group">
            <label>Icon</label>
            <input type="text" class="council-pipeline-input" data-field="icon" value="${phase?.icon || "🎭"}" maxlength="4">
          </div>
          <div class="council-pipeline-form-group">
            <label>Output Consolidation</label>
            <select class="council-pipeline-input" data-field="consolidation">
              <option value="last_action" ${phase?.output?.consolidation === "last_action" ? "selected" : ""}>Last Action</option>
              <option value="synthesize" ${phase?.output?.consolidation === "synthesize" ? "selected" : ""}>Synthesize</option>
              <option value="user_gavel" ${phase?.output?.consolidation === "user_gavel" ? "selected" : ""}>User Gavel</option>
              <option value="merge" ${phase?.output?.consolidation === "merge" ? "selected" : ""}>Merge</option>
              <option value="designated" ${phase?.output?.consolidation === "designated" ? "selected" : ""}>Designated Action</option>
            </select>
          </div>
          <div class="council-pipeline-form-group">
            <label>Gavel (User Review)</label>
            <label class="council-pipeline-checkbox">
              <input type="checkbox" data-field="gavelEnabled" ${phase?.gavel?.enabled ? "checked" : ""}>
              Enable user review at end of phase
            </label>
          </div>
        </div>
        <div class="council-pipeline-dialog-actions">
          <button class="council-pipeline-btn council-pipeline-btn-secondary" data-dialog="cancel">Cancel</button>
          <button class="council-pipeline-btn council-pipeline-btn-primary" data-dialog="save">${isEdit ? "Save" : "Create"}</button>
        </div>
      </div>
    `;

    document.body.appendChild(dialog);

    const cleanup = () => dialog.remove();

    dialog
      .querySelector('[data-dialog="cancel"]')
      .addEventListener("click", cleanup);

    dialog
      .querySelector('[data-dialog="save"]')
      .addEventListener("click", () => {
        const name = dialog.querySelector('[data-field="name"]').value.trim();
        if (!name) {
          this._showNotification("Name is required", "error");
          return;
        }

        const data = {
          name,
          description: dialog
            .querySelector('[data-field="description"]')
            .value.trim(),
          icon: dialog.querySelector('[data-field="icon"]').value || "🎭",
          output: {
            consolidation: dialog.querySelector('[data-field="consolidation"]')
              .value,
          },
          gavel: {
            enabled: dialog.querySelector('[data-field="gavelEnabled"]')
              .checked,
            canSkip: true,
          },
        };

        try {
          if (isEdit) {
            this._pipelineSystem.updatePhase(
              this._selectedPipeline,
              phaseId,
              data,
            );
            this._showNotification("Phase updated", "success");
          } else {
            const id = `phase_${Date.now()}`;
            this._pipelineSystem.addPhase(this._selectedPipeline, {
              id,
              ...data,
            });
            this._selectedPhase = id;
            this._showNotification("Phase created", "success");
          }
          cleanup();
          this._refreshCurrentTab();
        } catch (error) {
          this._showNotification(`Failed: ${error.message}`, "error");
        }
      });
  },

  /**
   * Delete a phase
   * @param {string} phaseId - Phase ID
   */
  _deletePhase(phaseId) {
    if (!confirm("Are you sure you want to delete this phase?")) return;

    try {
      this._pipelineSystem.removePhase(this._selectedPipeline, phaseId);
      if (this._selectedPhase === phaseId) {
        this._selectedPhase = null;
        this._selectedAction = null;
      }
      this._showNotification("Phase deleted", "success");
      this._refreshCurrentTab();
    } catch (error) {
      this._showNotification(`Failed to delete: ${error.message}`, "error");
    }
  },

  /**
   * Show action editor dialog
   * @param {string} [actionId] - Action ID for editing, null for create
   */
  _showActionEditor(actionId = null) {
    const pipeline = this._pipelineSystem.getPipeline(this._selectedPipeline);
    const phase = pipeline?.phases?.find((p) => p.id === this._selectedPhase);
    if (!pipeline || !phase) return;

    const action = actionId
      ? phase.actions?.find((a) => a.id === actionId)
      : null;
    const isEdit = !!action;

    const dialog = document.createElement("div");
    dialog.className = "council-pipeline-dialog-overlay";
    dialog.innerHTML = `
      <div class="council-pipeline-dialog council-pipeline-dialog-large">
        <div class="council-pipeline-dialog-header">
          <h3>${isEdit ? "Edit Action" : "Create Action"}</h3>
        </div>
        <div class="council-pipeline-dialog-content council-pipeline-dialog-scrollable">
          <div class="council-pipeline-form-group">
            <label>Name *</label>
            <input type="text" class="council-pipeline-input" data-field="name" value="${this._escapeHtml(action?.name || "")}" required>
          </div>
          <div class="council-pipeline-form-group">
            <label>Description</label>
            <textarea class="council-pipeline-input" data-field="description" rows="2">${this._escapeHtml(action?.description || "")}</textarea>
          </div>

          <h4>Execution</h4>
          <div class="council-pipeline-form-row">
            <div class="council-pipeline-form-group">
              <label>Mode</label>
              <select class="council-pipeline-input" data-field="mode">
                <option value="sync" ${action?.execution?.mode === "sync" ? "selected" : ""}>Synchronous</option>
                <option value="async" ${action?.execution?.mode === "async" ? "selected" : ""}>Asynchronous</option>
              </select>
            </div>
            <div class="council-pipeline-form-group">
              <label>Trigger</label>
              <select class="council-pipeline-input" data-field="trigger">
                <option value="sequential" ${action?.execution?.trigger?.type === "sequential" ? "selected" : ""}>Sequential</option>
                <option value="await" ${action?.execution?.trigger?.type === "await" ? "selected" : ""}>Await</option>
                <option value="on" ${action?.execution?.trigger?.type === "on" ? "selected" : ""}>On Event</option>
                <option value="immediate" ${action?.execution?.trigger?.type === "immediate" ? "selected" : ""}>Immediate</option>
              </select>
            </div>
          </div>

          <h4>Participants</h4>
          <div class="council-pipeline-form-group">
            <label>Orchestration</label>
            <select class="council-pipeline-input" data-field="orchestration">
              <option value="sequential" ${action?.participants?.orchestration === "sequential" ? "selected" : ""}>Sequential</option>
              <option value="parallel" ${action?.participants?.orchestration === "parallel" ? "selected" : ""}>Parallel</option>
              <option value="round_robin" ${action?.participants?.orchestration === "round_robin" ? "selected" : ""}>Round Robin</option>
              <option value="consensus" ${action?.participants?.orchestration === "consensus" ? "selected" : ""}>Consensus</option>
            </select>
          </div>

          <h4>Prompt Template</h4>
          <div class="council-pipeline-form-group">
            <label>Template (supports tokens)</label>
            <textarea class="council-pipeline-input council-pipeline-code" data-field="promptTemplate" rows="6">${this._escapeHtml(action?.promptTemplate || "")}</textarea>
          </div>
        </div>
        <div class="council-pipeline-dialog-actions">
          <button class="council-pipeline-btn council-pipeline-btn-secondary" data-dialog="cancel">Cancel</button>
          <button class="council-pipeline-btn council-pipeline-btn-primary" data-dialog="save">${isEdit ? "Save" : "Create"}</button>
        </div>
      </div>
    `;

    document.body.appendChild(dialog);

    const cleanup = () => dialog.remove();

    dialog
      .querySelector('[data-dialog="cancel"]')
      .addEventListener("click", cleanup);

    dialog
      .querySelector('[data-dialog="save"]')
      .addEventListener("click", () => {
        const name = dialog.querySelector('[data-field="name"]').value.trim();
        if (!name) {
          this._showNotification("Name is required", "error");
          return;
        }

        const data = {
          name,
          description: dialog
            .querySelector('[data-field="description"]')
            .value.trim(),
          execution: {
            mode: dialog.querySelector('[data-field="mode"]').value,
            trigger: {
              type: dialog.querySelector('[data-field="trigger"]').value,
            },
          },
          participants: {
            orchestration: dialog.querySelector('[data-field="orchestration"]')
              .value,
          },
          promptTemplate: dialog.querySelector('[data-field="promptTemplate"]')
            .value,
        };

        try {
          if (isEdit) {
            this._pipelineSystem.updateAction(
              this._selectedPipeline,
              this._selectedPhase,
              actionId,
              data,
            );
            this._showNotification("Action updated", "success");
          } else {
            const id = `action_${Date.now()}`;
            this._pipelineSystem.addAction(
              this._selectedPipeline,
              this._selectedPhase,
              { id, ...data },
            );
            this._selectedAction = id;
            this._showNotification("Action created", "success");
          }
          cleanup();
          this._refreshCurrentTab();
        } catch (error) {
          this._showNotification(`Failed: ${error.message}`, "error");
        }
      });
  },

  /**
   * Delete an action
   * @param {string} actionId - Action ID
   */
  _deleteAction(actionId) {
    if (!confirm("Are you sure you want to delete this action?")) return;

    try {
      this._pipelineSystem.removeAction(
        this._selectedPipeline,
        this._selectedPhase,
        actionId,
      );
      if (this._selectedAction === actionId) {
        this._selectedAction = null;
      }
      this._showNotification("Action deleted", "success");
      this._refreshCurrentTab();
    } catch (error) {
      this._showNotification(`Failed to delete: ${error.message}`, "error");
    }
  },

  /**
   * Show gavel prompt from system event
   * @param {Object} data - Gavel request data
   */
  _showGavelPrompt(data) {
    // Delegate to GavelModal if available
    if (window.GavelModal) {
      window.GavelModal.show(data);
    } else {
      this._log("warn", "GavelModal not available, showing inline prompt");
      // Show inline notification
      this._showNotification(
        "User review requested - check Execution tab",
        "info",
      );
    }
  },

  // ===== OUTPUT OPERATIONS =====

  /**
   * Copy final output to clipboard
   */
  async _copyFinalOutput() {
    const finalOutput = this._outputManager?.getFinalOutput?.();
    if (!finalOutput) return;

    try {
      const text =
        typeof finalOutput === "string"
          ? finalOutput
          : JSON.stringify(finalOutput, null, 2);
      await navigator.clipboard.writeText(text);
      this._showNotification("Copied to clipboard", "success");
    } catch (error) {
      this._log("error", "Failed to copy:", error);
      this._showNotification("Failed to copy", "error");
    }
  },

  /**
   * Export all outputs
   */
  _exportOutputs() {
    const data = {
      globals: this._outputManager?.getGlobals?.() || {},
      phaseOutputs: this._outputManager?.getAllPhaseOutputs?.() || {},
      finalOutput: this._outputManager?.getFinalOutput?.() || null,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `council-outputs-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this._showNotification("Outputs exported", "success");
  },

  /**
   * Clear all threads
   */
  _clearThreads() {
    if (!confirm("Clear all threads?")) return;

    this._threadManager?.clear?.();
    this._refreshCurrentTab();
    this._showNotification("Threads cleared", "success");
  },

  // ===== STATUS AND NOTIFICATIONS =====

  /**
   * Update status bar
   */
  _updateStatus() {
    const statusText = this._elements.statusBar?.querySelector(
      ".council-pipeline-status-text",
    );
    const statusIndicator = this._elements.statusBar?.querySelector(
      ".council-pipeline-status-indicator",
    );

    if (!statusText || !statusIndicator) return;

    const isRunning = this._pipelineSystem?.isRunning() || false;
    const activeRun = this._pipelineSystem?.getActiveRun();
    const pipelineCount = Object.keys(
      this._pipelineSystem?.getAllPipelines() || {},
    ).length;

    if (isRunning && activeRun) {
      statusText.textContent = `Running: ${activeRun.pipelineName} - Phase ${(activeRun.currentPhaseIndex || 0) + 1}`;
      statusIndicator.className = "council-pipeline-status-indicator running";
    } else if (activeRun?.status === "completed") {
      statusText.textContent = "Last run completed successfully";
      statusIndicator.className = "council-pipeline-status-indicator success";
    } else if (activeRun?.status === "failed") {
      statusText.textContent = "Last run failed";
      statusIndicator.className = "council-pipeline-status-indicator error";
    } else {
      statusText.textContent = `Ready | ${pipelineCount} pipeline(s)`;
      statusIndicator.className = "council-pipeline-status-indicator idle";
    }
  },

  /**
   * Show notification
   * @param {string} message - Notification message
   * @param {string} type - Notification type (success, error, warning, info)
   */
  _showNotification(message, type = "info") {
    const notification = document.createElement("div");
    notification.className = `council-pipeline-notification council-pipeline-notification-${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    // Animate in
    requestAnimationFrame(() => {
      notification.classList.add("visible");
    });

    // Remove after delay
    setTimeout(() => {
      notification.classList.remove("visible");
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  },

  // ===== STYLES =====

  /**
   * Inject modal styles
   */
  _injectStyles() {
    if (document.getElementById("council-pipeline-styles")) return;

    const style = document.createElement("style");
    style.id = "council-pipeline-styles";
    style.textContent = `
      /* Pipeline Modal Overlay */
      .council-pipeline-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.6);
        z-index: 9998;
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.2s, visibility 0.2s;
      }
      .council-pipeline-overlay.visible {
        opacity: 1;
        visibility: visible;
      }

      /* Pipeline Modal */
      .council-pipeline-modal {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) scale(0.95);
        width: 90vw;
        max-width: 1200px;
        height: 85vh;
        background: var(--SmartThemeBlurTintColor, #1a1a2e);
        border: 1px solid var(--SmartThemeBorderColor, #333);
        border-radius: 12px;
        z-index: 9999;
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.2s, visibility 0.2s, transform 0.2s;
        display: flex;
        flex-direction: column;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
      }
      .council-pipeline-modal.visible {
        opacity: 1;
        visibility: visible;
        transform: translate(-50%, -50%) scale(1);
      }

      .council-pipeline-container {
        display: flex;
        flex-direction: column;
        height: 100%;
      }

      /* Header */
      .council-pipeline-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 20px;
        border-bottom: 1px solid var(--SmartThemeBorderColor, #333);
      }
      .council-pipeline-title {
        margin: 0;
        font-size: 1.4em;
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .council-pipeline-icon {
        font-size: 1.2em;
      }
      .council-pipeline-header-actions {
        display: flex;
        gap: 8px;
      }

      /* Tabs */
      .council-pipeline-tabs {
        display: flex;
        gap: 4px;
        padding: 8px 16px;
        border-bottom: 1px solid var(--SmartThemeBorderColor, #333);
        background: rgba(0, 0, 0, 0.2);
        flex-wrap: wrap;
      }
      .council-pipeline-tab {
        padding: 8px 16px;
        border: none;
        background: transparent;
        color: var(--SmartThemeBodyColor, #ccc);
        cursor: pointer;
        border-radius: 6px;
        transition: background 0.2s, color 0.2s;
      }
      .council-pipeline-tab:hover {
        background: rgba(255, 255, 255, 0.1);
      }
      .council-pipeline-tab.active {
        background: var(--SmartThemeQuoteColor, #4a90d9);
        color: white;
      }

      /* Content */
      .council-pipeline-content {
        flex: 1;
        overflow: auto;
        padding: 16px;
      }

      /* Footer */
      .council-pipeline-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 20px;
        border-top: 1px solid var(--SmartThemeBorderColor, #333);
        background: rgba(0, 0, 0, 0.2);
      }
      .council-pipeline-status {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 0.9em;
        color: var(--SmartThemeBodyColor, #aaa);
      }
      .council-pipeline-status-indicator {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #666;
      }
      .council-pipeline-status-indicator.running {
        background: #4a90d9;
        animation: pulse 1s infinite;
      }
      .council-pipeline-status-indicator.success {
        background: #4caf50;
      }
      .council-pipeline-status-indicator.error {
        background: #f44336;
      }
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
      .council-pipeline-footer-actions {
        display: flex;
        gap: 8px;
      }

      /* Buttons */
      .council-pipeline-btn {
        padding: 8px 16px;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.9em;
        transition: background 0.2s, opacity 0.2s;
      }
      .council-pipeline-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .council-pipeline-btn-primary {
        background: var(--SmartThemeQuoteColor, #4a90d9);
        color: white;
      }
      .council-pipeline-btn-primary:hover:not(:disabled) {
        background: #3a7bc8;
      }
      .council-pipeline-btn-secondary {
        background: rgba(255, 255, 255, 0.1);
        color: var(--SmartThemeBodyColor, #ccc);
      }
      .council-pipeline-btn-secondary:hover:not(:disabled) {
        background: rgba(255, 255, 255, 0.2);
      }
      .council-pipeline-btn-danger {
        background: #f44336;
        color: white;
      }
      .council-pipeline-btn-danger:hover:not(:disabled) {
        background: #d32f2f;
      }
      .council-pipeline-btn-warning {
        background: #ff9800;
        color: white;
      }
      .council-pipeline-btn-warning:hover:not(:disabled) {
        background: #f57c00;
      }
      .council-pipeline-btn-icon {
        padding: 8px;
        min-width: 36px;
      }
      .council-pipeline-btn-small {
        padding: 4px 8px;
        font-size: 0.85em;
      }

      /* List and Detail Layout */
      .council-pipeline-list-container {
        display: grid;
        grid-template-columns: 350px 1fr;
        gap: 16px;
        height: calc(100% - 60px);
      }
      .council-pipeline-list {
        overflow-y: auto;
        border: 1px solid var(--SmartThemeBorderColor, #333);
        border-radius: 8px;
        background: rgba(0, 0, 0, 0.2);
      }
      .council-pipeline-detail {
        overflow-y: auto;
        border: 1px solid var(--SmartThemeBorderColor, #333);
        border-radius: 8px;
        background: rgba(0, 0, 0, 0.2);
        padding: 16px;
      }

      /* List Items */
      .council-pipeline-list-item {
        padding: 12px 16px;
        border-bottom: 1px solid var(--SmartThemeBorderColor, #333);
        cursor: pointer;
        transition: background 0.2s;
      }
      .council-pipeline-list-item:hover {
        background: rgba(255, 255, 255, 0.05);
      }
      .council-pipeline-list-item.selected {
        background: rgba(74, 144, 217, 0.2);
        border-left: 3px solid var(--SmartThemeQuoteColor, #4a90d9);
      }
      .council-pipeline-list-item-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 4px;
      }
      .council-pipeline-list-item-name {
        font-weight: 600;
        flex: 1;
      }
      .council-pipeline-list-item-version,
      .council-pipeline-list-item-order {
        font-size: 0.85em;
        color: var(--SmartThemeBodyColor, #888);
      }
      .council-pipeline-list-item-meta {
        display: flex;
        gap: 12px;
        font-size: 0.85em;
        color: var(--SmartThemeBodyColor, #888);
      }
      .council-pipeline-list-item-desc {
        font-size: 0.85em;
        color: var(--SmartThemeBodyColor, #888);
        margin-top: 4px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      /* Tags */
      .council-pipeline-tag {
        display: inline-block;
        padding: 2px 8px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 4px;
        font-size: 0.8em;
        margin: 2px;
      }
      .council-pipeline-tag-sync {
        background: rgba(76, 175, 80, 0.3);
      }
      .council-pipeline-tag-async {
        background: rgba(255, 152, 0, 0.3);
      }

      /* Detail View */
      .council-pipeline-detail-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 16px;
        padding-bottom: 12px;
        border-bottom: 1px solid var(--SmartThemeBorderColor, #333);
      }
      .council-pipeline-detail-header h3 {
        margin: 0;
        flex: 1;
      }
      .council-pipeline-detail-icon {
        font-size: 1.5em;
      }
      .council-pipeline-detail-section {
        margin-bottom: 16px;
      }
      .council-pipeline-detail-section label {
        display: block;
        font-weight: 600;
        margin-bottom: 4px;
        color: var(--SmartThemeQuoteColor, #4a90d9);
      }
      .council-pipeline-detail-value {
        color: var(--SmartThemeBodyColor, #ccc);
      }
      .council-pipeline-detail-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
      }

      /* Phase/Action Items in Detail */
      .council-pipeline-phase-item,
      .council-pipeline-action-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        background: rgba(0, 0, 0, 0.2);
        border-radius: 6px;
        margin-bottom: 4px;
        cursor: pointer;
        transition: background 0.2s;
      }
      .council-pipeline-phase-item:hover,
      .council-pipeline-action-item:hover {
        background: rgba(255, 255, 255, 0.1);
      }
      .council-pipeline-phase-actions,
      .council-pipeline-action-mode {
        margin-left: auto;
        font-size: 0.85em;
        color: var(--SmartThemeBodyColor, #888);
      }

      /* Toolbar */
      .council-pipeline-toolbar {
        display: flex;
        gap: 8px;
        margin-bottom: 16px;
        flex-wrap: wrap;
        align-items: center;
      }

      /* Breadcrumb */
      .council-pipeline-breadcrumb {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 16px;
        font-size: 0.9em;
      }
      .council-pipeline-breadcrumb-link {
        color: var(--SmartThemeQuoteColor, #4a90d9);
        cursor: pointer;
      }
      .council-pipeline-breadcrumb-link:hover {
        text-decoration: underline;
      }
      .council-pipeline-breadcrumb-sep {
        color: var(--SmartThemeBodyColor, #666);
      }
      .council-pipeline-breadcrumb-current {
        color: var(--SmartThemeBodyColor, #ccc);
      }

      /* Execution Tab */
      .council-pipeline-execution-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 16px;
      }
      .council-pipeline-running-indicator {
        color: #4a90d9;
        animation: pulse 1s infinite;
      }
      .council-pipeline-run-view {
        background: rgba(0, 0, 0, 0.2);
        border-radius: 8px;
        padding: 16px;
      }
      .council-pipeline-run-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 16px;
      }
      .council-pipeline-run-name {
        font-size: 1.2em;
        font-weight: 600;
      }
      .council-pipeline-run-id {
        font-size: 0.85em;
        color: var(--SmartThemeBodyColor, #888);
      }
      .council-pipeline-run-status {
        padding: 4px 12px;
        border-radius: 4px;
        font-weight: 600;
        font-size: 0.85em;
      }
      .council-pipeline-status-blue { background: rgba(74, 144, 217, 0.3); color: #4a90d9; }
      .council-pipeline-status-green { background: rgba(76, 175, 80, 0.3); color: #4caf50; }
      .council-pipeline-status-red { background: rgba(244, 67, 54, 0.3); color: #f44336; }
      .council-pipeline-status-yellow { background: rgba(255, 152, 0, 0.3); color: #ff9800; }
      .council-pipeline-status-orange { background: rgba(255, 87, 34, 0.3); color: #ff5722; }

      .council-pipeline-run-progress {
        margin-bottom: 16px;
      }
      .council-pipeline-progress-bar {
        height: 8px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 4px;
        overflow: hidden;
        margin-bottom: 4px;
      }
      .council-pipeline-progress-fill {
        height: 100%;
        background: var(--SmartThemeQuoteColor, #4a90d9);
        transition: width 0.3s;
      }
      .council-pipeline-progress-text {
        font-size: 0.85em;
        color: var(--SmartThemeBodyColor, #888);
      }

      .council-pipeline-run-phases {
        margin-bottom: 16px;
      }
      .council-pipeline-run-phase {
        background: rgba(0, 0, 0, 0.2);
        border-radius: 6px;
        margin-bottom: 8px;
        padding: 12px;
      }
      .council-pipeline-run-phase.current {
        border-left: 3px solid #4a90d9;
      }
      .council-pipeline-run-phase-header {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .council-pipeline-run-phase-name {
        flex: 1;
        font-weight: 600;
      }
      .council-pipeline-run-phase-lifecycle {
        font-size: 0.85em;
        color: var(--SmartThemeBodyColor, #888);
      }
      .council-pipeline-run-actions {
        margin-top: 8px;
        padding-left: 24px;
      }
      .council-pipeline-run-action {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 4px 0;
        font-size: 0.9em;
      }
      .council-pipeline-run-error {
        background: rgba(244, 67, 54, 0.2);
        border: 1px solid #f44336;
        border-radius: 6px;
        padding: 12px;
        margin-bottom: 16px;
        color: #f44336;
      }
      .council-pipeline-run-timing {
        font-size: 0.85em;
        color: var(--SmartThemeBodyColor, #888);
        display: flex;
        gap: 16px;
      }

      /* Threads Tab */
      .council-pipeline-threads-container {
        max-height: calc(100% - 60px);
        overflow-y: auto;
      }
      .council-pipeline-thread {
        background: rgba(0, 0, 0, 0.2);
        border-radius: 8px;
        margin-bottom: 12px;
        overflow: hidden;
      }
      .council-pipeline-thread-header {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        background: rgba(0, 0, 0, 0.2);
        font-size: 0.85em;
      }
      .council-pipeline-thread-type {
        text-transform: uppercase;
        font-weight: 600;
        color: var(--SmartThemeQuoteColor, #4a90d9);
      }
      .council-pipeline-thread-messages {
        padding: 12px;
        max-height: 300px;
        overflow-y: auto;
      }
      .council-pipeline-message {
        margin-bottom: 12px;
        padding: 8px 12px;
        border-radius: 6px;
        background: rgba(255, 255, 255, 0.05);
      }
      .council-pipeline-message-user {
        background: rgba(74, 144, 217, 0.1);
        border-left: 3px solid #4a90d9;
      }
      .council-pipeline-message-assistant {
        background: rgba(76, 175, 80, 0.1);
        border-left: 3px solid #4caf50;
      }
      .council-pipeline-message-header {
        display: flex;
        justify-content: space-between;
        margin-bottom: 4px;
        font-size: 0.85em;
      }
      .council-pipeline-message-role {
        font-weight: 600;
        text-transform: capitalize;
      }
      .council-pipeline-message-time {
        color: var(--SmartThemeBodyColor, #888);
      }
      .council-pipeline-message-content {
        white-space: pre-wrap;
        word-break: break-word;
      }

      /* Outputs Tab */
      .council-pipeline-outputs-container {
        max-height: calc(100% - 60px);
        overflow-y: auto;
      }
      .council-pipeline-output-section {
        margin-bottom: 20px;
      }
      .council-pipeline-output-section h4 {
        margin: 0 0 8px 0;
        padding-bottom: 8px;
        border-bottom: 1px solid var(--SmartThemeBorderColor, #333);
      }
      .council-pipeline-output-content {
        background: rgba(0, 0, 0, 0.2);
        border-radius: 6px;
        padding: 12px;
        overflow-x: auto;
      }
      .council-pipeline-output-content pre {
        margin: 0;
        white-space: pre-wrap;
        word-break: break-word;
      }
      .council-pipeline-final-output {
        border: 2px solid var(--SmartThemeQuoteColor, #4a90d9);
      }
      .council-pipeline-phase-output {
        margin-bottom: 12px;
      }
      .council-pipeline-phase-output-header {
        font-weight: 600;
        margin-bottom: 4px;
      }

      /* Dialogs */
      .council-pipeline-dialog-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .council-pipeline-dialog {
        background: var(--SmartThemeBlurTintColor, #1a1a2e);
        border: 1px solid var(--SmartThemeBorderColor, #333);
        border-radius: 12px;
        width: 90%;
        max-width: 500px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
      }
      .council-pipeline-dialog-large {
        max-width: 700px;
      }
      .council-pipeline-dialog-header {
        padding: 16px 20px;
        border-bottom: 1px solid var(--SmartThemeBorderColor, #333);
      }
      .council-pipeline-dialog-header h3 {
        margin: 0;
      }
      .council-pipeline-dialog-content {
        padding: 20px;
      }
      .council-pipeline-dialog-scrollable {
        max-height: 60vh;
        overflow-y: auto;
      }
      .council-pipeline-dialog-actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        padding: 16px 20px;
        border-top: 1px solid var(--SmartThemeBorderColor, #333);
      }
      .council-pipeline-dialog-input {
        width: 100%;
        padding: 10px;
        background: rgba(0, 0, 0, 0.3);
        border: 1px solid var(--SmartThemeBorderColor, #333);
        border-radius: 6px;
        color: var(--SmartThemeBodyColor, #ccc);
        font-family: inherit;
        resize: vertical;
      }
      .council-pipeline-dialog-input:focus {
        outline: none;
        border-color: var(--SmartThemeQuoteColor, #4a90d9);
      }

      /* Forms */
      .council-pipeline-form-group {
        margin-bottom: 16px;
      }
      .council-pipeline-form-group label {
        display: block;
        margin-bottom: 4px;
        font-weight: 500;
      }
      .council-pipeline-form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
      }
      .council-pipeline-input {
        width: 100%;
        padding: 8px 12px;
        background: rgba(0, 0, 0, 0.3);
        border: 1px solid var(--SmartThemeBorderColor, #333);
        border-radius: 6px;
        color: var(--SmartThemeBodyColor, #ccc);
        font-family: inherit;
      }
      .council-pipeline-input:focus {
        outline: none;
        border-color: var(--SmartThemeQuoteColor, #4a90d9);
      }
      .council-pipeline-code {
        font-family: monospace;
        font-size: 0.9em;
      }
      .council-pipeline-checkbox {
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
      }
      .council-pipeline-checkbox-group {
        display: flex;
        flex-wrap: wrap;
        gap: 16px;
      }

      /* Notifications */
      .council-pipeline-notification {
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 8px;
        background: var(--SmartThemeBlurTintColor, #1a1a2e);
        border: 1px solid var(--SmartThemeBorderColor, #333);
        z-index: 10001;
        opacity: 0;
        transform: translateY(20px);
        transition: opacity 0.3s, transform 0.3s;
      }
      .council-pipeline-notification.visible {
        opacity: 1;
        transform: translateY(0);
      }
      .council-pipeline-notification-success {
        border-color: #4caf50;
        background: rgba(76, 175, 80, 0.2);
      }
      .council-pipeline-notification-error {
        border-color: #f44336;
        background: rgba(244, 67, 54, 0.2);
      }
      .council-pipeline-notification-warning {
        border-color: #ff9800;
        background: rgba(255, 152, 0, 0.2);
      }
      .council-pipeline-notification-info {
        border-color: #2196f3;
        background: rgba(33, 150, 243, 0.2);
      }

      /* Empty States */
      .council-pipeline-empty {
        text-align: center;
        padding: 40px;
        color: var(--SmartThemeBodyColor, #888);
      }
      .council-pipeline-empty-small {
        padding: 16px;
        color: var(--SmartThemeBodyColor, #888);
        font-style: italic;
      }

      /* Prompt Preview */
      .council-pipeline-prompt-preview {
        background: rgba(0, 0, 0, 0.3);
        border-radius: 6px;
        padding: 12px;
        max-height: 200px;
        overflow-y: auto;
      }
      .council-pipeline-prompt-preview pre {
        margin: 0;
        white-space: pre-wrap;
        word-break: break-word;
        font-family: monospace;
        font-size: 0.9em;
      }
    `;
    document.head.appendChild(style);
  },

  // ===== UTILITIES =====

  /**
   * Escape HTML entities
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
   * Log a message
   * @param {string} level - Log level
   * @param {...*} args - Arguments
   */
  _log(level, ...args) {
    if (this._logger) {
      this._logger.log(level, "[PipelineModal]", ...args);
    } else if (level !== "debug") {
      console[level === "error" ? "error" : level === "warn" ? "warn" : "log"](
        "[PipelineModal]",
        ...args,
      );
    }
  },
};

// Export for different environments
if (typeof window !== "undefined") {
  window.PipelineModal = PipelineModal;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = { PipelineModal };
}
