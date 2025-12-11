/**
 * TheCouncil - Navigation Modal UI
 *
 * Floating navigation component for quick access to all systems:
 * - Agents System access
 * - Curation System access
 * - Pipeline System access
 * - Pipeline execution controls
 * - Quick status indicator
 *
 * @version 2.0.0
 */

const NavModal = {
  // ===== VERSION =====
  VERSION: "2.0.0",

  // ===== STATE =====

  /**
   * Modal visibility state
   * @type {boolean}
   */
  _isVisible: false,

  /**
   * Expanded state
   * @type {boolean}
   */
  _isExpanded: true,

  /**
   * Position state
   * @type {{x: number, y: number}}
   */
  _position: { x: 20, y: 100 },

  /**
   * Dragging state
   * @type {boolean}
   */
  _isDragging: false,

  /**
   * Drag offset
   * @type {{x: number, y: number}}
   */
  _dragOffset: { x: 0, y: 0 },

  /**
   * Reference to system modals
   * @type {Object}
   */
  _modals: {
    agents: null,
    curation: null,
    character: null,
    pipeline: null,
    gavel: null,
  },

  /**
   * Reference to PipelineSystem
   * @type {Object|null}
   */
  _pipelineSystem: null,

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
    container: null,
    toggleBtn: null,
    navButtons: null,
    statusIndicator: null,
  },

  /**
   * Initialization flag
   * @type {boolean}
   */
  _initialized: false,

  /**
   * Kernel reference
   * @type {Object|null}
   */
  _kernel: null,

  /**
   * Event listener cleanup functions
   * @type {Function[]}
   */
  _cleanupFns: [],

  /**
   * Status update interval
   * @type {number|null}
   */
  _statusInterval: null,

  // ===== INITIALIZATION =====

  /**
   * Initialize the Navigation Modal
   * @param {Object} options - Configuration options
   * @param {Object} options.kernel - Kernel instance (optional)
   * @param {Object} options.agentsModal - Reference to AgentsModal
   * @param {Object} options.curationModal - Reference to CurationModal
   * @param {Object} options.characterModal - Reference to CharacterModal
   * @param {Object} options.pipelineModal - Reference to PipelineModal
   * @param {Object} options.gavelModal - Reference to GavelModal
   * @param {Object} options.pipelineSystem - Reference to PipelineSystem
   * @param {Object} options.logger - Logger instance
   * @returns {NavModal}
   */
  init(options = {}) {
    if (this._initialized) {
      this._log("warn", "NavModal already initialized");
      return this;
    }

    // Set kernel reference
    this._kernel = options.kernel || null;

    // Get logger from kernel if available
    if (this._kernel && !options.logger) {
      this._logger = this._kernel.getModule("logger");
    } else {
      this._logger = options.logger;
    }

    this._modals.agents = options.agentsModal;
    this._modals.curation = options.curationModal;
    this._modals.character = options.characterModal;
    this._modals.pipeline = options.pipelineModal;
    this._modals.gavel = options.gavelModal;
    this._pipelineSystem = options.pipelineSystem;

    this._log("info", "Initializing Navigation Modal...");

    // Load saved position
    this._loadPosition();

    // Create modal DOM
    this._createModal();

    // Subscribe to system events
    this._subscribeToEvents();

    // Start status updates
    this._startStatusUpdates();

    this._initialized = true;
    this._log("info", "Navigation Modal initialized");

    return this;
  },

  /**
   * Destroy the modal and clean up
   */
  destroy() {
    // Stop status updates
    this._stopStatusUpdates();

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
    if (this._elements.container) {
      this._elements.container.remove();
    }

    this._elements = {
      container: null,
      toggleBtn: null,
      navButtons: null,
      statusIndicator: null,
    };

    this._initialized = false;
    this._log("info", "Navigation Modal destroyed");
  },

  // ===== MODAL CREATION =====

  /**
   * Create the modal DOM structure
   */
  _createModal() {
    // Create container
    this._elements.container = document.createElement("div");
    this._elements.container.className = "council-nav-container";
    this._elements.container.innerHTML = this._getModalTemplate();

    // Apply position
    this._applyPosition();

    // Append to body
    document.body.appendChild(this._elements.container);

    // Cache element references
    this._elements.toggleBtn = this._elements.container.querySelector(
      ".council-nav-toggle",
    );
    this._elements.navButtons = this._elements.container.querySelector(
      ".council-nav-buttons",
    );
    this._elements.statusIndicator = this._elements.container.querySelector(
      ".council-nav-status-indicator",
    );

    // Bind event handlers
    this._bindEvents();

    // Inject styles if not present
    this._injectStyles();

    // Register with Kernel if available
    if (this._kernel) {
      this._kernel.registerModal("nav", this);
      this._log("debug", "Registered with Kernel modal system");

      // Listen to Kernel UI events
      this._subscribeToKernelEvents();
    }

    // Show by default
    this.show();
  },

  /**
   * Get modal template HTML
   * @returns {string}
   */
  _getModalTemplate() {
    return `
      <div class="council-nav-header" data-drag-handle>
        <div class="council-nav-title">
          <span class="council-nav-icon">🏛️</span>
          <span class="council-nav-label">Council</span>
        </div>
        <div class="council-nav-status">
          <span class="council-nav-status-indicator"></span>
        </div>
        <button class="council-nav-toggle" data-action="toggle-expand" title="Toggle">
          ▼
        </button>
      </div>

      <div class="council-nav-buttons">
        <button class="council-nav-btn" data-action="open-agents" title="Agents System">
          <span class="council-nav-btn-icon">👥</span>
          <span class="council-nav-btn-label">Agents</span>
        </button>
        <button class="council-nav-btn" data-action="open-curation" title="Curation System">
          <span class="council-nav-btn-icon">📚</span>
          <span class="council-nav-btn-label">Curation</span>
        </button>
        <button class="council-nav-btn" data-action="open-character" title="Character System">
          <span class="council-nav-btn-icon">🎭</span>
          <span class="council-nav-btn-label">Characters</span>
        </button>
        <button class="council-nav-btn" data-action="open-pipeline" title="Pipeline System">
          <span class="council-nav-btn-icon">🔄</span>
          <span class="council-nav-btn-label">Pipeline</span>
        </button>

        <div class="council-nav-divider"></div>

        <button class="council-nav-btn council-nav-btn-run" data-action="run-pipeline" title="Run Pipeline">
          <span class="council-nav-btn-icon">▶️</span>
          <span class="council-nav-btn-label">Run</span>
        </button>
        <button class="council-nav-btn council-nav-btn-stop" data-action="stop-pipeline" title="Stop Pipeline" disabled>
          <span class="council-nav-btn-icon">⏹️</span>
          <span class="council-nav-btn-label">Stop</span>
        </button>
      </div>

      <div class="council-nav-footer">
        <span class="council-nav-status-text">Ready</span>
      </div>
    `;
  },

  /**
   * Bind event handlers
   */
  _bindEvents() {
    const container = this._elements.container;

    // Button clicks
    container.querySelectorAll("[data-action]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const action = e.currentTarget.dataset.action;
        this._handleAction(action);
      });
    });

    // Drag functionality
    const header = container.querySelector("[data-drag-handle]");
    if (header) {
      header.addEventListener("mousedown", (e) => this._onDragStart(e));
    }

    const mouseMoveHandler = (e) => this._onDragMove(e);
    const mouseUpHandler = (e) => this._onDragEnd(e);

    document.addEventListener("mousemove", mouseMoveHandler);
    document.addEventListener("mouseup", mouseUpHandler);

    this._cleanupFns.push(() => {
      document.removeEventListener("mousemove", mouseMoveHandler);
      document.removeEventListener("mouseup", mouseUpHandler);
    });

    // Keyboard shortcut to toggle nav (Ctrl/Cmd + Shift + C)
    const keyHandler = (e) => {
      if (e.key === "C" && (e.ctrlKey || e.metaKey) && e.shiftKey) {
        e.preventDefault();
        this.toggle();
      }
    };
    document.addEventListener("keydown", keyHandler);
    this._cleanupFns.push(() =>
      document.removeEventListener("keydown", keyHandler),
    );
  },

  /**
   * Subscribe to PipelineSystem events
   */
  _subscribeToEvents() {
    if (!this._pipelineSystem) return;

    const events = [
      "run:started",
      "run:paused",
      "run:resumed",
      "run:aborted",
      "run:completed",
      "run:failed",
      "phase:started",
      "phase:completed",
    ];

    for (const event of events) {
      const handler = () => this._updateStatus();
      this._pipelineSystem.on(event, handler);
      this._cleanupFns.push(() => this._pipelineSystem.off(event, handler));
    }
  },

  /**
   * Subscribe to Kernel UI events
   */
  _subscribeToKernelEvents() {
    if (!this._kernel) return;

    // Listen to ui:show events
    const showHandler = (data) => {
      if (data.modalName === "nav") {
        this.show();
      }
    };
    this._kernel.on("ui:show", showHandler);
    this._cleanupFns.push(() => this._kernel.off("ui:show", showHandler));

    // Listen to ui:hide events
    const hideHandler = (data) => {
      if (data.modalName === "nav") {
        this.hide();
      }
    };
    this._kernel.on("ui:hide", hideHandler);
    this._cleanupFns.push(() => this._kernel.off("ui:hide", hideHandler));

    // Listen to ui:toggle events
    const toggleHandler = (data) => {
      if (data.modalName === "nav") {
        this.toggle();
      }
    };
    this._kernel.on("ui:toggle", toggleHandler);
    this._cleanupFns.push(() => this._kernel.off("ui:toggle", toggleHandler));
  },

  // ===== SHOW / HIDE =====

  /**
   * Show the navigation modal
   */
  show() {
    if (!this._initialized) return;

    this._isVisible = true;
    this._elements.container.classList.add("visible");
    this._updateStatus();

    // Update Kernel state if available
    if (this._kernel) {
      this._kernel.setState("ui.activeModal", "nav");
    }

    this._log("info", "Navigation Modal shown");
  },

  /**
   * Hide the navigation modal
   */
  hide() {
    this._isVisible = false;
    this._elements.container.classList.remove("visible");

    // Clear Kernel state if this was the active modal
    if (this._kernel && this._kernel.getState("ui.activeModal") === "nav") {
      this._kernel.setState("ui.activeModal", null);
    }

    this._log("info", "Navigation Modal hidden");
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

  /**
   * Toggle expanded state
   */
  toggleExpanded() {
    this._isExpanded = !this._isExpanded;
    this._elements.container.classList.toggle("collapsed", !this._isExpanded);

    // Update toggle button
    if (this._elements.toggleBtn) {
      this._elements.toggleBtn.textContent = this._isExpanded ? "▼" : "▶";
    }
  },

  // ===== DRAG FUNCTIONALITY =====

  /**
   * Handle drag start
   * @param {MouseEvent} e - Mouse event
   */
  _onDragStart(e) {
    if (e.target.closest("[data-action]")) return; // Don't drag when clicking buttons

    this._isDragging = true;
    this._dragOffset = {
      x: e.clientX - this._position.x,
      y: e.clientY - this._position.y,
    };

    this._elements.container.classList.add("dragging");
  },

  /**
   * Handle drag move
   * @param {MouseEvent} e - Mouse event
   */
  _onDragMove(e) {
    if (!this._isDragging) return;

    const x = e.clientX - this._dragOffset.x;
    const y = e.clientY - this._dragOffset.y;

    // Constrain to viewport
    const rect = this._elements.container.getBoundingClientRect();
    const maxX = window.innerWidth - rect.width;
    const maxY = window.innerHeight - rect.height;

    this._position.x = Math.max(0, Math.min(x, maxX));
    this._position.y = Math.max(0, Math.min(y, maxY));

    this._applyPosition();
  },

  /**
   * Handle drag end
   * @param {MouseEvent} e - Mouse event
   */
  _onDragEnd(e) {
    if (!this._isDragging) return;

    this._isDragging = false;
    this._elements.container.classList.remove("dragging");

    // Save position
    this._savePosition();
  },

  /**
   * Apply current position to element
   */
  _applyPosition() {
    if (!this._elements.container) return;

    this._elements.container.style.left = `${this._position.x}px`;
    this._elements.container.style.top = `${this._position.y}px`;
  },

  /**
   * Load position from storage
   */
  _loadPosition() {
    try {
      const stored = localStorage.getItem("council_nav_position");
      if (stored) {
        this._position = JSON.parse(stored);
      }
    } catch (error) {
      this._log("warn", "Failed to load nav position:", error);
    }
  },

  /**
   * Save position to storage
   */
  _savePosition() {
    try {
      localStorage.setItem(
        "council_nav_position",
        JSON.stringify(this._position),
      );
    } catch (error) {
      this._log("warn", "Failed to save nav position:", error);
    }
  },

  // ===== ACTION HANDLERS =====

  /**
   * Handle action button clicks
   * @param {string} action - Action name
   */
  _handleAction(action) {
    this._log("debug", `Nav action: ${action}`);

    switch (action) {
      case "toggle-expand":
        this.toggleExpanded();
        break;
      case "open-agents":
        this._openModal("agents");
        break;
      case "open-curation":
        this._openModal("curation");
        break;
      case "open-character":
        this._openModal("character");
        break;
      case "open-pipeline":
        this._openModal("pipeline");
        break;
      case "run-pipeline":
        this._runPipeline();
        break;
      case "stop-pipeline":
        this._stopPipeline();
        break;
    }
  },

  /**
   * Open a system modal
   * @param {string} modalName - Modal name
   */
  _openModal(modalName) {
    // Try to use Kernel's modal system first
    if (this._kernel) {
      const success = this._kernel.showModal(modalName);
      if (success) {
        return;
      }
    }

    // Fallback to direct modal reference
    const modal = this._modals[modalName];
    if (!modal) {
      this._log("warn", `Modal not available: ${modalName}`);
      return;
    }

    if (modal.toggle) {
      modal.toggle();
    } else if (modal.show) {
      modal.show();
    }
  },

  /**
   * Run the pipeline
   */
  async _runPipeline() {
    // Open pipeline modal in execution mode
    if (this._modals.pipeline) {
      this._modals.pipeline.show({ tab: "execution" });
    }
  },

  /**
   * Stop the running pipeline
   */
  _stopPipeline() {
    if (!this._pipelineSystem) return;

    try {
      this._pipelineSystem.abortRun();
      this._updateStatus();
    } catch (error) {
      this._log("error", "Failed to stop pipeline:", error);
    }
  },

  // ===== STATUS UPDATES =====

  /**
   * Start status update interval
   */
  _startStatusUpdates() {
    this._statusInterval = setInterval(() => {
      this._updateStatus();
    }, 1000);
  },

  /**
   * Stop status update interval
   */
  _stopStatusUpdates() {
    if (this._statusInterval) {
      clearInterval(this._statusInterval);
      this._statusInterval = null;
    }
  },

  /**
   * Update status display
   */
  _updateStatus() {
    const isRunning = this._pipelineSystem?.isRunning() || false;
    const activeRun = this._pipelineSystem?.getActiveRun();

    // Update indicator
    const indicator = this._elements.statusIndicator;
    if (indicator) {
      indicator.className = "council-nav-status-indicator";
      if (isRunning) {
        indicator.classList.add("running");
      } else if (activeRun?.status === "completed") {
        indicator.classList.add("success");
      } else if (activeRun?.status === "failed") {
        indicator.classList.add("error");
      }
    }

    // Update status text
    const statusText = this._elements.container?.querySelector(
      ".council-nav-status-text",
    );
    if (statusText) {
      if (isRunning && activeRun) {
        const phaseIndex = (activeRun.currentPhaseIndex || 0) + 1;
        statusText.textContent = `Running Phase ${phaseIndex}...`;
      } else if (activeRun?.status === "completed") {
        statusText.textContent = "Completed";
      } else if (activeRun?.status === "failed") {
        statusText.textContent = "Failed";
      } else if (activeRun?.status === "aborted") {
        statusText.textContent = "Aborted";
      } else {
        statusText.textContent = "Ready";
      }
    }

    // Update buttons
    const runBtn = this._elements.container?.querySelector(
      '[data-action="run-pipeline"]',
    );
    const stopBtn = this._elements.container?.querySelector(
      '[data-action="stop-pipeline"]',
    );

    if (runBtn) runBtn.disabled = isRunning;
    if (stopBtn) stopBtn.disabled = !isRunning;

    // Update container class
    this._elements.container?.classList.toggle("running", isRunning);
  },

  // ===== STYLES =====

  /**
   * Inject modal styles
   */
  _injectStyles() {
    if (document.getElementById("council-nav-styles")) return;

    const style = document.createElement("style");
    style.id = "council-nav-styles";
    style.textContent = `
      /* Navigation Container */
      .council-nav-container {
        position: fixed;
        z-index: 9990;
        background: var(--SmartThemeBlurTintColor, #1a1a2e);
        border: 1px solid var(--SmartThemeBorderColor, #333);
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.2s, visibility 0.2s, box-shadow 0.2s;
        min-width: 180px;
        user-select: none;
      }
      .council-nav-container.visible {
        opacity: 1;
        visibility: visible;
      }
      .council-nav-container.dragging {
        opacity: 0.8;
        cursor: grabbing;
      }
      .council-nav-container.running {
        border-color: var(--SmartThemeQuoteColor, #4a90d9);
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4), 0 0 10px rgba(74, 144, 217, 0.3);
      }
      .council-nav-container.collapsed .council-nav-buttons,
      .council-nav-container.collapsed .council-nav-footer {
        display: none;
      }
      .council-nav-container.collapsed {
        min-width: auto;
      }

      /* Header */
      .council-nav-header {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 12px;
        cursor: grab;
        border-bottom: 1px solid var(--SmartThemeBorderColor, #333);
        background: rgba(0, 0, 0, 0.2);
        border-radius: 12px 12px 0 0;
      }
      .council-nav-container.collapsed .council-nav-header {
        border-bottom: none;
        border-radius: 12px;
      }
      .council-nav-title {
        display: flex;
        align-items: center;
        gap: 6px;
        flex: 1;
      }
      .council-nav-icon {
        font-size: 1.2em;
      }
      .council-nav-label {
        font-weight: 600;
        font-size: 0.95em;
      }
      .council-nav-status {
        display: flex;
        align-items: center;
      }
      .council-nav-status-indicator {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #666;
        transition: background 0.2s;
      }
      .council-nav-status-indicator.running {
        background: #4a90d9;
        animation: navPulse 1s infinite;
      }
      .council-nav-status-indicator.success {
        background: #4caf50;
      }
      .council-nav-status-indicator.error {
        background: #f44336;
      }
      @keyframes navPulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.6; transform: scale(1.2); }
      }
      .council-nav-toggle {
        background: none;
        border: none;
        color: var(--SmartThemeBodyColor, #aaa);
        cursor: pointer;
        padding: 2px 6px;
        font-size: 0.8em;
        transition: color 0.2s;
      }
      .council-nav-toggle:hover {
        color: var(--SmartThemeQuoteColor, #4a90d9);
      }

      /* Buttons */
      .council-nav-buttons {
        padding: 8px;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .council-nav-btn {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        background: rgba(255, 255, 255, 0.05);
        border: none;
        border-radius: 6px;
        color: var(--SmartThemeBodyColor, #ccc);
        cursor: pointer;
        transition: background 0.2s, color 0.2s;
        text-align: left;
      }
      .council-nav-btn:hover:not(:disabled) {
        background: rgba(255, 255, 255, 0.1);
        color: white;
      }
      .council-nav-btn:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }
      .council-nav-btn-icon {
        font-size: 1.1em;
        width: 24px;
        text-align: center;
      }
      .council-nav-btn-label {
        font-size: 0.9em;
      }
      .council-nav-btn-run {
        background: rgba(76, 175, 80, 0.2);
      }
      .council-nav-btn-run:hover:not(:disabled) {
        background: rgba(76, 175, 80, 0.3);
        color: #4caf50;
      }
      .council-nav-btn-stop {
        background: rgba(244, 67, 54, 0.2);
      }
      .council-nav-btn-stop:hover:not(:disabled) {
        background: rgba(244, 67, 54, 0.3);
        color: #f44336;
      }
      .council-nav-divider {
        height: 1px;
        background: var(--SmartThemeBorderColor, #333);
        margin: 4px 0;
      }

      /* Footer */
      .council-nav-footer {
        padding: 6px 12px;
        border-top: 1px solid var(--SmartThemeBorderColor, #333);
        background: rgba(0, 0, 0, 0.2);
        border-radius: 0 0 12px 12px;
      }
      .council-nav-status-text {
        font-size: 0.8em;
        color: var(--SmartThemeBodyColor, #888);
      }
      .council-nav-container.running .council-nav-status-text {
        color: var(--SmartThemeQuoteColor, #4a90d9);
      }

      /* Responsive */
      @media (max-width: 600px) {
        .council-nav-container {
          min-width: auto;
        }
        .council-nav-btn-label {
          display: none;
        }
        .council-nav-btn {
          justify-content: center;
          padding: 10px;
        }
        .council-nav-btn-icon {
          width: auto;
        }
      }
    `;
    document.head.appendChild(style);
  },

  // ===== UTILITIES =====

  /**
   * Log a message
   * @param {string} level - Log level
   * @param {...*} args - Arguments
   */
  _log(level, ...args) {
    if (this._logger) {
      this._logger.log(level, "[NavModal]", ...args);
    } else if (level !== "debug") {
      console[level === "error" ? "error" : level === "warn" ? "warn" : "log"](
        "[NavModal]",
        ...args,
      );
    }
  },

  // ===== PUBLIC API =====

  /**
   * Reset position to default
   */
  resetPosition() {
    this._position = { x: 20, y: 100 };
    this._applyPosition();
    this._savePosition();
  },

  /**
   * Set position programmatically
   * @param {number} x - X position
   * @param {number} y - Y position
   */
  setPosition(x, y) {
    this._position = { x, y };
    this._applyPosition();
    this._savePosition();
  },

  /**
   * Get current position
   * @returns {{x: number, y: number}} Position
   */
  getPosition() {
    return { ...this._position };
  },

  /**
   * Expand the nav
   */
  expand() {
    if (!this._isExpanded) {
      this.toggleExpanded();
    }
  },

  /**
   * Collapse the nav
   */
  collapse() {
    if (this._isExpanded) {
      this.toggleExpanded();
    }
  },

  /**
   * Get summary of nav modal state
   * @returns {Object} Summary
   */
  getSummary() {
    return {
      version: this.VERSION,
      initialized: this._initialized,
      isVisible: this._isVisible,
      isExpanded: this._isExpanded,
      position: { ...this._position },
      modalsAvailable: {
        agents: !!this._modals.agents,
        curation: !!this._modals.curation,
        pipeline: !!this._modals.pipeline,
        gavel: !!this._modals.gavel,
      },
      pipelineRunning: this._pipelineSystem?.isRunning() || false,
    };
  },
};

// Export for different environments
if (typeof window !== "undefined") {
  window.NavModal = NavModal;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = { NavModal };
}
