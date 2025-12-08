// modules/ui.js - UI Components and DOM Management for The Council
// Handles all user interface elements, rendering, and DOM interactions

const CouncilUI = {
  // ===== MODULE REFERENCES =====
  _config: null,
  _state: null,
  _pipeline: null,
  _phaseThreadsView: null,
  _pipelineVisualizer: null,

  // ===== DOM ELEMENT REFERENCES =====
  _elements: {
    panel: null,
    statusText: null,
    progressBar: null,
    threadsContainer: null,
    gavelModal: null,
    gavelContent: null,
    councilButton: null,
    toggleButton: null,
    settingsPanel: null,
    viewTabs: null,
    legacyView: null,
    phaseThreadsView: null,
    phaseThreadsContainer: null,
    flowContainer: null,
    flowView: null,
  },

  // ===== STATE =====
  _initialized: false,
  _styleInjected: false,
  _currentView: "legacy", // 'legacy' or 'phase-threads'

  // ===== INITIALIZATION =====

  /**
   * Initialize the UI module
   */
  init(modules = {}) {
    this._config =
      modules.config ||
      (typeof window !== "undefined" ? window.CouncilConfig : null);
    this._state =
      modules.state ||
      (typeof window !== "undefined" ? window.CouncilState : null);
    this._pipeline =
      modules.pipeline ||
      (typeof window !== "undefined" ? window.CouncilPipeline : null);

    // Inject styles
    this.injectStyles();

    // Create UI elements
    this.createPipelinePanel();
    this.createGavelModal();
    this.createSettingsPanel();
    this.injectButtons();

    // Initialize Phase Threads View
    this._initPhaseThreadsView();

    // Set up event listeners
    this.setupEventListeners();

    this._initialized = true;
    console.log("[Council UI] Initialized");
    return this;
  },

  /**
   * Initialize the Phase Threads View component
   */
  _initPhaseThreadsView() {
    // Guard against re-initialization
    if (this._phaseThreadsView?.isInitialized?.()) {
      return;
    }

    const PhaseView = window.PhaseThreadsView;
    if (typeof PhaseView === "undefined") {
      console.warn("[Council UI] Phase Threads View not available");
      return;
    }

    this._phaseThreadsView = PhaseView;

    if (!this._phaseThreadsView.isInitialized?.()) {
      this._phaseThreadsView.init({
        threadManager: window.ThreadManager,
        state: this._state,
        config: this._config,
      });
    }

    // Add styles for Phase Threads View
    const styles = this._phaseThreadsView.getStyles?.();
    if (styles && !document.getElementById("council-phase-threads-styles")) {
      const styleEl = document.createElement("style");
      styleEl.id = "council-phase-threads-styles";
      styleEl.textContent = styles;
      document.head.appendChild(styleEl);
    }

    // Initial render in case we’re already in the phase view
    if (typeof this._phaseThreadsView.render === "function") {
      this._phaseThreadsView.render();
    }

    console.log("[Council UI] Phase Threads View initialized");
  },

  /**
   * Initialize the Pipeline Visualizer component
   */
  _initPipelineVisualizer() {
    if (this._pipelineVisualizer?.isInitialized?.()) {
      return;
    }

    const Visualizer = window.PipelineVisualizer;
    if (typeof Visualizer === "undefined") {
      console.warn("[Council UI] Pipeline Visualizer not available");
      return;
    }

    this._pipelineVisualizer = Visualizer;

    if (!this._pipelineVisualizer.isInitialized?.()) {
      this._pipelineVisualizer.init({
        executor: window.PipelineExecutor,
        state: this._state,
        threadManager: window.ThreadManager,
        outputManager: window.OutputManager,
      });
    }

    const styles = this._pipelineVisualizer.getStyles?.();
    if (
      styles &&
      !document.getElementById("council-pipeline-visualizer-styles")
    ) {
      const styleEl = document.createElement("style");
      styleEl.id = "council-pipeline-visualizer-styles";
      styleEl.textContent = styles;
      document.head.appendChild(styleEl);
    }

    if (typeof this._pipelineVisualizer.render === "function") {
      this._pipelineVisualizer.render();
    }

    console.log("[Council UI] Pipeline Visualizer initialized");
  },

  // ===== STYLE INJECTION =====

  /**
   * Inject minimal fallback CSS styles into the document
   * Main styles are loaded from styles/main.css
   */
  injectStyles() {
    if (this._styleInjected || document.getElementById("council-styles")) {
      return;
    }

    // Minimal fallback styles - main styles come from external CSS file
    const styles = `
      /* Fallback styles for Council UI - main styles in styles/main.css */
      .council-pipeline-panel.hidden { display: none; }
      .council-gavel-modal { opacity: 0; visibility: hidden; }
      .council-gavel-modal.visible { opacity: 1; visibility: visible; }
      .council-settings-panel { display: none; }
      .council-settings-panel.visible { display: flex; }
      .council-thread-panel-badge.hidden,
      .council-team-thread-badge.hidden { display: none; }

      /* View tabs */
      .council-view-tabs {
        display: flex;
        gap: 4px;
        padding: 8px 12px;
        background: var(--council-header-bg, #16213e);
        border-bottom: 1px solid var(--council-border, #0f3460);
      }

      .council-view-tab {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 6px 12px;
        border: 1px solid var(--council-border, #0f3460);
        border-radius: 4px;
        background: transparent;
        color: var(--council-text-muted, #a0a0a0);
        cursor: pointer;
        font-size: 12px;
        transition: all 0.2s;
      }

      .council-view-tab:hover {
        background: var(--council-hover, #1a2744);
        color: var(--council-text, #e8e8e8);
      }

      .council-view-tab.active {
        background: var(--council-accent, #4a9eff);
        border-color: var(--council-accent, #4a9eff);
        color: white;
      }

      .council-views-container {
        flex: 1;
        display: flex;
        overflow: hidden;
      }

      .council-view {
        display: none;
        flex: 1;
        flex-direction: column;
        overflow: hidden;
      }

      .council-view.active {
        display: flex;
      }

      .council-legacy-view .council-threads-wrapper {
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      .council-phase-threads-container {
        padding: 8px;
      }

      .council-flow-container {
        padding: 8px;
        display: flex;
        flex: 1;
        overflow: hidden;
      }
    `;

    const styleElement = document.createElement("style");
    styleElement.id = "council-styles";
    styleElement.textContent = styles;
    document.head.appendChild(styleElement);

    this._styleInjected = true;
    console.log(
      "[Council UI] Fallback styles injected (main styles from external CSS)",
    );
  },

  // ===== PIPELINE PANEL =====

  /**
   * Create the main pipeline panel
   */
  createPipelinePanel() {
    if (document.getElementById("council-pipeline-panel")) {
      this._elements.panel = document.getElementById("council-pipeline-panel");
      return;
    }

    const threads = this._config?.THREADS || this.getDefaultThreads();
    const phases = this.getDefaultPhases();

    // Separate threads into team (top row) and main (bottom row)
    const teamThreads = Object.entries(threads)
      .filter(([_, t]) => t.isTeamThread)
      .sort((a, b) => (a[1].priority || 99) - (b[1].priority || 99));

    const mainThreads = Object.entries(threads)
      .filter(([_, t]) => t.isMainThread)
      .sort((a, b) => (a[1].priority || 99) - (b[1].priority || 99));

    // Generate phase indicator bar HTML
    const phaseBarHtml = phases
      .map(
        (phase, idx) => `
      <div class="council-phase-item pending" data-phase="${phase.id}">
        <span class="council-phase-dot"></span>
        <span>${phase.icon} ${phase.name}</span>
      </div>
      ${idx < phases.length - 1 ? '<div class="council-phase-connector"></div>' : ""}
    `,
      )
      .join("");

    // Generate team threads HTML (collapsed cards in top row)
    const teamThreadsHtml = teamThreads
      .map(
        ([id, thread]) => `
      <div class="council-team-thread ${thread.expanded ? "expanded" : ""}" data-thread="${id}">
        <div class="council-team-thread-header">
          <div class="council-team-thread-title">
            <span class="council-team-thread-icon">${thread.icon || "📄"}</span>
            <span>${thread.name}</span>
            <span class="council-team-thread-badge hidden">0</span>
          </div>
          <span class="council-team-thread-toggle">▼</span>
        </div>
        <div class="council-team-thread-body">
          <div class="council-team-thread-content" id="council-thread-content-${id}">
            <div class="council-thread-empty">No activity</div>
          </div>
        </div>
      </div>
    `,
      )
      .join("");

    // Generate main threads HTML (large panels in bottom row)
    // Order: Instructions, Main (largest), Context (larger), Outline
    const mainThreadsHtml = mainThreads
      .map(
        ([id, thread]) => `
      <div class="council-thread-panel" data-thread="${id}">
        <div class="council-thread-panel-header">
          <div class="council-thread-panel-title">
            <span class="council-thread-panel-icon">${thread.icon || "📄"}</span>
            <span>${thread.name}</span>
          </div>
          <span class="council-thread-panel-badge hidden">0</span>
        </div>
        <div class="council-thread-panel-body" id="council-thread-content-${id}">
          <div class="council-thread-empty">Waiting for pipeline...</div>
        </div>
      </div>
    `,
      )
      .join("");

    const panelHtml = `
      <div id="council-pipeline-panel" class="council-pipeline-panel hidden">
        <div class="council-pipeline-header">
          <h3>⚖️ The Council Pipeline</h3>
          <div class="council-header-buttons">
            <button class="council-header-btn" id="council-pipeline-editor-btn" title="Pipeline Editor">🔧</button>
            <button class="council-header-btn" id="council-agent-editor-btn" title="Agent Editor">🧑‍💻</button>
            <button class="council-header-btn" id="council-rag-viewer-btn" title="RAG Requests">🔍</button>
            <button class="council-header-btn" id="council-data-viewer-btn" title="Data Viewer">📊</button>
            <button class="council-header-btn" id="council-curation-btn" title="Curation Pipeline">🧭</button>
            <button class="council-header-btn" id="council-settings-btn" title="Settings">⚙️</button>
            <button class="council-header-btn" id="council-stop-btn" title="Stop / Abort Pipeline">🛑</button>
            <button class="council-header-btn" id="council-minimize-btn" title="Minimize">─</button>
            <button class="council-header-btn" id="council-close-btn" title="Close">×</button>
          </div>
        </div>

        <div class="council-phase-bar" id="council-phase-bar">
          ${phaseBarHtml}
        </div>

        <div class="council-pipeline-progress">
          <div class="council-status-row">
            <div class="council-pipeline-status" id="council-status">
              <span class="status-icon">⏳</span>
              <span class="status-text">Ready</span>
            </div>
            <div class="council-current-action" id="council-current-action"></div>
            <div class="council-phase-counter" id="council-phase-counter">0 / ${phases.length}</div>
          </div>
          <div class="council-progress-track">
            <div class="council-progress-bar" id="council-progress-bar"></div>
          </div>
        </div>

        <div class="council-view-tabs" id="council-view-tabs">
          <button class="council-view-tab active" data-view="legacy" title="Thread Panel View">
            <span>📜</span> Threads
          </button>
          <button class="council-view-tab" data-view="phase-threads" title="Phase-Centric View">
            <span>📋</span> By Phase
          </button>
          <button class="council-view-tab" data-view="flow" title="Pipeline Flow Visualization">
            <span>🗺️</span> Flow
          </button>
        </div>

        <div class="council-views-container">
          <div class="council-view council-legacy-view active" id="council-legacy-view">
            <div class="council-threads-wrapper">
              <div class="council-team-threads-row" id="council-team-threads">
                ${teamThreadsHtml}
              </div>
              <div class="council-main-threads-row" id="council-main-threads">
                ${mainThreadsHtml}
              </div>
            </div>
          </div>
          <div class="council-view council-phase-threads-container" id="council-phase-threads-container">
            <!-- Phase Threads View will be mounted here -->
          </div>
          <div class="council-view council-flow-container" id="council-flow-container">
            <!-- Pipeline Visualizer will be mounted here -->
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML("beforeend", panelHtml);

    // Store references
    this._elements.panel = document.getElementById("council-pipeline-panel");
    this._elements.statusText = document.getElementById("council-status");
    this._elements.progressBar = document.getElementById(
      "council-progress-bar",
    );
    this._elements.threadsContainer = document.getElementById(
      "council-main-threads",
    );
    this._elements.phaseBar = document.getElementById("council-phase-bar");
    this._elements.viewTabs = document.getElementById("council-view-tabs");
    this._elements.legacyView = document.getElementById("council-legacy-view");
    this._elements.phaseThreadsContainer = document.getElementById(
      "council-phase-threads-container",
    );
    this._elements.flowContainer = document.getElementById(
      "council-flow-container",
    );

    // Bind panel events
    this.bindPanelEvents();

    // Mount Phase Threads View if available
    this._mountPhaseThreadsView();

    // Mount Pipeline Visualizer if available and view requested
    if (this._currentView === "flow") {
      this._mountPipelineVisualizer();
    }

    // Ensure default view selection is applied (legacy by default)
    this.switchView(this._currentView);

    console.log("[Council UI] Pipeline panel created with redesigned layout");
  },

  /**
   * Mount the Phase Threads View component
   */
  _mountPhaseThreadsView() {
    if (this._phaseThreadsView && this._elements.phaseThreadsContainer) {
      const container = this._phaseThreadsView.createContainer();
      this._elements.phaseThreadsContainer.appendChild(container);
      this._elements.phaseThreadsView = container;

      // Initial render and visibility respecting current view
      if (typeof this._phaseThreadsView.render === "function") {
        this._phaseThreadsView.render();
      }
      if (this._currentView === "phase-threads") {
        this._phaseThreadsView.show?.();
      } else {
        this._phaseThreadsView.hide?.();
      }

      console.log("[Council UI] Phase Threads View mounted");
    }
  },

  /**
   * Mount the Pipeline Visualizer component
   */
  _mountPipelineVisualizer() {
    if (this._pipelineVisualizer && this._elements.flowContainer) {
      const container = this._pipelineVisualizer.createContainer();
      this._elements.flowContainer.appendChild(container);
      this._elements.flowView = container;

      if (typeof this._pipelineVisualizer.render === "function") {
        this._pipelineVisualizer.render();
      }
      if (this._currentView === "flow") {
        this._pipelineVisualizer.show?.();
      } else {
        this._pipelineVisualizer.hide?.();
      }

      console.log("[Council UI] Pipeline Visualizer mounted");
    }
  },

  /**
   * Bind events for the pipeline panel
   */
  bindPanelEvents() {
    // Close button
    const closeBtn = document.getElementById("council-close-btn");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => this.hidePanel());
    }

    // Minimize button
    const minBtn = document.getElementById("council-minimize-btn");
    if (minBtn) {
      minBtn.addEventListener("click", () => this.toggleMinimize());
    }

    // Stop button
    const stopBtn = document.getElementById("council-stop-btn");
    if (stopBtn) {
      stopBtn.addEventListener("click", () => {
        this._pipeline?.abort?.();
      });
    }

    // Curation Editor button
    const curationBtn = document.getElementById("council-curation-btn");
    if (curationBtn) {
      curationBtn.addEventListener("click", () => {
        if (typeof window.CurationEditor !== "undefined") {
          if (!window.CurationEditor.isInitialized()) {
            window.CurationEditor.init({
              curation: window.CurationPipeline,
              stores: window.CouncilStores,
              outputManager: window.OutputManager,
              threadManager: window.ThreadManager,
              state: this._state,
            });
          }
          window.CurationEditor.toggle();
        } else {
          console.warn("[Council UI] Curation Editor not available");
        }
      });
    }

    // Pipeline Editor button
    const pipelineEditorBtn = document.getElementById(
      "council-pipeline-editor-btn",
    );
    if (pipelineEditorBtn) {
      pipelineEditorBtn.addEventListener("click", () => {
        try {
          const pe = window.PipelineEditor;
          if (!pe) {
            console.warn("[Council UI] Pipeline Editor not available");
            return;
          }
          if (!pe.isInitialized?.()) {
            pe.init?.({
              config: this._config,
              state: this._state,
              schemas: window.PipelineSchemas,
              executor: window.PipelineExecutor,
            });
          }
          pe.show?.();
        } catch (err) {
          console.error("[Council UI] Failed to open Pipeline Editor:", err);
        }
      });
    }

    // Agent Editor button
    const agentEditorBtn = document.getElementById("council-agent-editor-btn");
    if (agentEditorBtn) {
      agentEditorBtn.addEventListener("click", () => {
        if (typeof window.AgentEditor !== "undefined") {
          if (!window.AgentEditor.isInitialized?.()) {
            window.AgentEditor.init?.({
              config: this._config,
              state: this._state,
              agents: window.CouncilAgents,
            });
          }
          window.AgentEditor.toggle?.();
        } else {
          console.warn("[Council UI] Agent Editor not available");
        }
      });
    }

    // RAG Viewer button
    const ragViewerBtn = document.getElementById("council-rag-viewer-btn");
    if (ragViewerBtn) {
      ragViewerBtn.addEventListener("click", () => {
        if (typeof window.RAGViewer !== "undefined") {
          if (!window.RAGViewer.isInitialized()) {
            window.RAGViewer.init({
              executor: window.PipelineExecutor,
              state: this._state,
              config: this._config,
              threadManager: window.ThreadManager,
            });
          }
          window.RAGViewer.toggle();
        } else {
          console.warn("[Council UI] RAG Viewer not available");
        }
      });
    }

    // Data Viewer button
    const dataViewerBtn = document.getElementById("council-data-viewer-btn");
    if (dataViewerBtn) {
      dataViewerBtn.addEventListener("click", () => {
        if (typeof window.DataViewer !== "undefined") {
          window.DataViewer.toggle();
        } else {
          console.warn("[Council UI] Data Viewer not available");
        }
      });
    }

    // Settings button
    const settingsBtn = document.getElementById("council-settings-btn");
    if (settingsBtn) {
      settingsBtn.addEventListener("click", () => this.toggleSettings());
    }

    // View tabs
    const viewTabs = document.querySelectorAll(".council-view-tab");
    viewTabs.forEach((tab) => {
      tab.addEventListener("click", (e) => {
        const view = e.currentTarget.dataset.view;
        if (view) {
          this.switchView(view);
        }
      });
    });

    // Team thread toggles (collapsible cards in top row)
    const teamThreadHeaders = document.querySelectorAll(
      ".council-team-thread-header",
    );
    teamThreadHeaders.forEach((header) => {
      header.addEventListener("click", (e) => {
        const card = e.currentTarget.closest(".council-team-thread");
        const threadId = card?.dataset?.thread;
        if (threadId) {
          this.toggleTeamThread(threadId);
        }
      });
    });
  },

  /**
   * Switch between views (legacy threads or phase-centric)
   * @param {string} viewName - 'legacy' or 'phase-threads'
   */
  switchView(viewName) {
    if (this._currentView === viewName) return;

    // Lazy init/mount Phase Threads View when first requested
    if (viewName === "phase-threads") {
      if (!this._phaseThreadsView) {
        this._initPhaseThreadsView();
      }
      if (this._phaseThreadsView && !this._elements.phaseThreadsView) {
        this._mountPhaseThreadsView();
      }
    }

    // Lazy init/mount Pipeline Visualizer when first requested
    if (viewName === "flow") {
      if (!this._pipelineVisualizer) {
        this._initPipelineVisualizer();
      }
      if (this._pipelineVisualizer && !this._elements.flowView) {
        this._mountPipelineVisualizer();
      }
    }

    this._currentView = viewName;

    // Update tab states
    document.querySelectorAll(".council-view-tab").forEach((tab) => {
      tab.classList.toggle("active", tab.dataset.view === viewName);
    });

    // Update view visibility
    if (this._elements.legacyView) {
      this._elements.legacyView.classList.toggle(
        "active",
        viewName === "legacy",
      );
    }

    if (this._elements.phaseThreadsContainer) {
      this._elements.phaseThreadsContainer.classList.toggle(
        "active",
        viewName === "phase-threads",
      );
    }

    if (this._elements.flowContainer) {
      this._elements.flowContainer.classList.toggle(
        "active",
        viewName === "flow",
      );
    }

    // Show/hide Phase Threads View only when mounted; no-op otherwise
    if (this._phaseThreadsView && this._elements.phaseThreadsView) {
      if (viewName === "phase-threads") {
        this._phaseThreadsView.render?.();
        this._phaseThreadsView.show?.();
      } else {
        this._phaseThreadsView.hide?.();
      }
    }

    // Show/hide Pipeline Visualizer only when mounted; no-op otherwise
    if (this._pipelineVisualizer && this._elements.flowView) {
      if (viewName === "flow") {
        this._pipelineVisualizer.render?.();
        this._pipelineVisualizer.show?.();
      } else {
        this._pipelineVisualizer.hide?.();
      }
    }

    console.log(`[Council UI] Switched to ${viewName} view`);
  },

  /**
   * Get current view
   * @returns {string} Current view name
   */
  getCurrentView() {
    return this._currentView;
  },

  /**
   * Toggle a team thread's expanded state
   */
  toggleTeamThread(threadId) {
    const card = document.querySelector(
      `.council-team-thread[data-thread="${threadId}"]`,
    );
    if (card) {
      card.classList.toggle("expanded");
      this._state?.toggleThread(threadId);
    }
  },

  /**
   * Set the active phase in the phase bar
   */
  setActivePhase(phaseId) {
    const phaseItems = document.querySelectorAll(".council-phase-item");
    const connectors = document.querySelectorAll(".council-phase-connector");
    let foundActive = false;
    let connectorIdx = 0;

    phaseItems.forEach((item) => {
      const itemPhaseId = item.dataset.phase;

      if (itemPhaseId === phaseId) {
        item.classList.remove("pending", "complete", "error");
        item.classList.add("active");
        foundActive = true;
      } else if (!foundActive) {
        // Phases before active are complete
        item.classList.remove("pending", "active", "error");
        item.classList.add("complete");
        if (connectorIdx < connectors.length) {
          connectors[connectorIdx].classList.add("complete");
        }
        connectorIdx++;
      } else {
        // Phases after active are pending
        item.classList.remove("active", "complete", "error");
        item.classList.add("pending");
      }
    });
  },

  /**
   * Mark a phase as complete
   */
  completePhase(phaseId) {
    const phaseItem = document.querySelector(
      `.council-phase-item[data-phase="${phaseId}"]`,
    );
    if (phaseItem) {
      phaseItem.classList.remove("pending", "active", "error");
      phaseItem.classList.add("complete");
    }
  },

  /**
   * Mark a phase as having an error
   */
  setPhaseError(phaseId) {
    const phaseItem = document.querySelector(
      `.council-phase-item[data-phase="${phaseId}"]`,
    );
    if (phaseItem) {
      phaseItem.classList.remove("pending", "active", "complete");
      phaseItem.classList.add("error");
    }
  },

  /**
   * Reset all phases to pending
   */
  resetPhases() {
    const phaseItems = document.querySelectorAll(".council-phase-item");
    const connectors = document.querySelectorAll(".council-phase-connector");

    phaseItems.forEach((item) => {
      item.classList.remove("active", "complete", "error");
      item.classList.add("pending");
    });

    connectors.forEach((conn) => {
      conn.classList.remove("complete");
    });
  },

  /**
   * Update the current action text
   */
  setCurrentAction(text) {
    const actionEl = document.getElementById("council-current-action");
    if (actionEl) {
      actionEl.textContent = text || "";
    }
  },

  /**
   * Set the active thread panel (highlight it)
   */
  setActiveThread(threadId) {
    // Remove active from all panels
    document
      .querySelectorAll(".council-thread-panel, .council-team-thread")
      .forEach((el) => {
        el.classList.remove("active");
      });

    // Add active to the specified thread
    const panel = document.querySelector(
      `.council-thread-panel[data-thread="${threadId}"]`,
    );
    const teamCard = document.querySelector(
      `.council-team-thread[data-thread="${threadId}"]`,
    );

    if (panel) {
      panel.classList.add("active");
    }
    if (teamCard) {
      teamCard.classList.add("active");
    }
  },

  /**
   * Get default thread definitions
   */
  getDefaultThreads() {
    return {
      // Main threads (bottom row) - order: Instructions, Main, Context, Outline
      instructions: {
        name: "Instructions",
        icon: "📋",
        expanded: true,
        priority: 1,
        isMainThread: true,
      },
      main: {
        name: "Main",
        icon: "🏛️",
        expanded: true,
        priority: 2,
        isMainThread: true,
      },
      context: {
        name: "Context",
        icon: "📚",
        expanded: true,
        priority: 3,
        isMainThread: true,
      },
      outline: {
        name: "Outline",
        icon: "📝",
        expanded: true,
        priority: 4,
        isMainThread: true,
      },
      // Team threads (top row, collapsed by default)
      prose: {
        name: "Prose",
        icon: "✍️",
        expanded: false,
        priority: 10,
        isTeamThread: true,
      },
      plot: {
        name: "Plot",
        icon: "🗺️",
        expanded: false,
        priority: 11,
        isTeamThread: true,
      },
      world: {
        name: "World",
        icon: "🌍",
        expanded: false,
        priority: 12,
        isTeamThread: true,
      },
      characters: {
        name: "Characters",
        icon: "👥",
        expanded: false,
        priority: 13,
        isTeamThread: true,
      },
      environment: {
        name: "Environment",
        icon: "🏞️",
        expanded: false,
        priority: 14,
        isTeamThread: true,
      },
      recordkeeping: {
        name: "Records",
        icon: "📁",
        expanded: false,
        priority: 15,
        isTeamThread: true,
      },
      // Other threads
      drafting: {
        name: "Drafting",
        icon: "📄",
        expanded: false,
        priority: 20,
        isTeamThread: true,
      },
      final: {
        name: "Final",
        icon: "✅",
        expanded: false,
        priority: 21,
        isTeamThread: true,
      },
    };
  },

  /**
   * Get pipeline phases for the phase indicator bar
   */
  getDefaultPhases() {
    return [
      { id: "init", name: "Initialize", icon: "🚀" },
      { id: "context", name: "Context", icon: "📚" },
      { id: "instructions", name: "Instructions", icon: "📋" },
      { id: "team-consult", name: "Team Consult", icon: "👥" },
      { id: "outline", name: "Outline", icon: "📝" },
      { id: "drafting", name: "Drafting", icon: "✍️" },
      { id: "review", name: "Review", icon: "🔍" },
      { id: "final", name: "Final", icon: "✅" },
    ];
  },

  // ===== PANEL VISIBILITY =====

  /**
   * Show the pipeline panel
   */
  showPanel() {
    if (this._elements.panel) {
      this._elements.panel.classList.remove("hidden");
      this._state?.showPanel();
    }
    this.updateToggleButton(true);
  },

  /**
   * Hide the pipeline panel
   */
  hidePanel() {
    if (this._elements.panel) {
      this._elements.panel.classList.add("hidden");
      this._state?.hidePanel();
    }
    this.updateToggleButton(false);
  },

  /**
   * Toggle panel visibility
   */
  togglePanel() {
    if (this._elements.panel?.classList.contains("hidden")) {
      this.showPanel();
    } else {
      this.hidePanel();
    }
  },

  /**
   * Toggle panel minimization
   */
  toggleMinimize() {
    if (this._elements.panel) {
      this._elements.panel.classList.toggle("minimized");
    }
  },

  /**
   * Update toggle button state
   */
  updateToggleButton(isActive) {
    if (this._elements.toggleButton) {
      if (isActive) {
        this._elements.toggleButton.classList.add("active");
      } else {
        this._elements.toggleButton.classList.remove("active");
      }
    }
  },

  // ===== STATUS AND PROGRESS =====

  /**
   * Update the status text and icon
   */
  updateStatus(text, isProcessing = false) {
    if (this._elements.statusText) {
      const statusIcon =
        this._elements.statusText.querySelector(".status-icon");
      const statusText =
        this._elements.statusText.querySelector(".status-text");

      if (statusText) {
        statusText.textContent = text;
      } else {
        this._elements.statusText.textContent = text;
      }

      if (statusIcon) {
        statusIcon.textContent = isProcessing ? "⚙️" : "⏳";
      }

      if (isProcessing) {
        this._elements.statusText.classList.add("processing");
        this._elements.progressBar?.classList.add("active");
      } else {
        this._elements.statusText.classList.remove("processing");
        this._elements.progressBar?.classList.remove("active");
      }
    }
  },

  /**
   * Update progress bar
   */
  updateProgress(current, total) {
    if (this._elements.progressBar) {
      const percent = total > 0 ? (current / total) * 100 : 0;
      this._elements.progressBar.style.width = `${percent}%`;
    }

    const counter = document.getElementById("council-phase-counter");
    if (counter) {
      counter.textContent = `${current} / ${total}`;
    }
  },

  // ===== THREAD MANAGEMENT =====

  /**
   * Toggle a thread's expanded state (legacy support)
   */
  toggleThread(threadId) {
    // Check for main thread panel first
    const panel = document.querySelector(
      `.council-thread-panel[data-thread="${threadId}"]`,
    );
    if (panel) {
      // Main panels don't collapse, but we can still track state
      this._state?.toggleThread(threadId);
      return;
    }

    // Check for team thread
    const teamCard = document.querySelector(
      `.council-team-thread[data-thread="${threadId}"]`,
    );
    if (teamCard) {
      teamCard.classList.toggle("expanded");
      this._state?.toggleThread(threadId);
    }
  },

  /**
   * Update thread content
   */
  updateThread(threadId, entries) {
    const contentEl = document.getElementById(
      `council-thread-content-${threadId}`,
    );
    if (!contentEl) return;

    if (!entries || entries.length === 0) {
      contentEl.innerHTML =
        '<div class="council-thread-empty">No content yet</div>';
      return;
    }

    const entriesHtml = entries
      .map((entry) => this.renderThreadEntry(entry))
      .join("");

    contentEl.innerHTML = entriesHtml;

    // Auto-scroll to bottom
    const body = contentEl.closest(".council-thread-body");
    if (body) {
      body.scrollTop = body.scrollHeight;
    }

    // Update badge
    this.updateThreadBadge(threadId, entries.length);
  },

  /**
   * Add a single entry to a thread
   */
  addThreadEntry(threadId, entry) {
    const contentEl = document.getElementById(
      `council-thread-content-${threadId}`,
    );
    if (!contentEl) return;

    // Remove empty message if present
    const emptyMsg = contentEl.querySelector(".council-thread-empty");
    if (emptyMsg) {
      emptyMsg.remove();
    }

    // Add new entry
    const entryHtml = this.renderThreadEntry(entry);
    contentEl.insertAdjacentHTML("beforeend", entryHtml);

    // Auto-scroll - check for both panel body types
    const body =
      contentEl.closest(".council-thread-panel-body") ||
      contentEl.closest(".council-team-thread-body");
    if (body) {
      body.scrollTop = body.scrollHeight;
    }

    // Flash indicators for team threads when they have new content
    const teamCard = document.querySelector(
      `.council-team-thread[data-thread="${threadId}"]`,
    );
    if (teamCard && !teamCard.classList.contains("expanded")) {
      teamCard.classList.add("has-new");
      setTimeout(() => teamCard.classList.remove("has-new"), 2000);
    }

    // Flash main thread panel
    const panel = document.querySelector(
      `.council-thread-panel[data-thread="${threadId}"]`,
    );
    if (panel) {
      panel.classList.add("has-new");
      setTimeout(() => panel.classList.remove("has-new"), 1500);
    }

    // Update badge
    const currentCount = contentEl.querySelectorAll(
      ".council-thread-entry",
    ).length;
    this.updateThreadBadge(threadId, currentCount);
  },

  /**
   * Render a single thread entry
   */
  renderThreadEntry(entry) {
    if (entry.isPhaseMarker) {
      return `<div class="council-thread-entry phase-marker">${entry.content}</div>`;
    }

    const timeStr = new Date(entry.timestamp).toLocaleTimeString();

    return `
      <div class="council-thread-entry">
        <div class="council-entry-header">
          <span class="council-entry-agent">${entry.agentName || entry.agentId}</span>
          <span class="council-entry-time">${timeStr}</span>
        </div>
        <div class="council-entry-content">${this.escapeHtml(entry.content)}</div>
      </div>
    `;
  },

  /**
   * Update thread badge count
   */
  updateThreadBadge(threadId, count) {
    // Check main thread panel
    const panel = document.querySelector(
      `.council-thread-panel[data-thread="${threadId}"]`,
    );
    const panelBadge = panel?.querySelector(".council-thread-panel-badge");
    if (panelBadge) {
      panelBadge.textContent = count;
      panelBadge.classList.toggle("hidden", count === 0);
    }

    // Check team thread card
    const teamCard = document.querySelector(
      `.council-team-thread[data-thread="${threadId}"]`,
    );
    const teamBadge = teamCard?.querySelector(".council-team-thread-badge");
    if (teamBadge) {
      teamBadge.textContent = count;
      teamBadge.classList.toggle("hidden", count === 0);
    }
  },

  /**
   * Clear all thread content
   */
  clearAllThreads() {
    // Clear main thread panels
    const mainContentEls = document.querySelectorAll(
      ".council-thread-panel-body",
    );
    mainContentEls.forEach((el) => {
      el.innerHTML =
        '<div class="council-thread-empty">Waiting for pipeline...</div>';
    });

    // Clear team thread cards
    const teamContentEls = document.querySelectorAll(
      ".council-team-thread-content",
    );
    teamContentEls.forEach((el) => {
      el.innerHTML = '<div class="council-thread-empty">No activity</div>';
    });

    // Reset all badges
    const panelBadges = document.querySelectorAll(
      ".council-thread-panel-badge",
    );
    panelBadges.forEach((badge) => {
      badge.textContent = "0";
      badge.classList.add("hidden");
    });

    const teamBadges = document.querySelectorAll(".council-team-thread-badge");
    teamBadges.forEach((badge) => {
      badge.textContent = "0";
      badge.classList.add("hidden");
    });

    // Reset phases
    this.resetPhases();

    // Clear current action
    this.setCurrentAction("");

    // Remove active states
    document
      .querySelectorAll(".council-thread-panel, .council-team-thread")
      .forEach((el) => {
        el.classList.remove("active", "has-new");
      });
  },

  // ===== GAVEL MODAL =====

  /**
   * Create the gavel modal
   */
  createGavelModal() {
    if (document.getElementById("council-gavel-modal")) {
      this._elements.gavelModal = document.getElementById(
        "council-gavel-modal",
      );
      return;
    }

    const modalHtml = `
      <div id="council-gavel-modal" class="council-gavel-modal">
        <div class="council-gavel-container">
          <div class="council-gavel-header">
            <h3>🔨 User Gavel</h3>
            <span class="council-gavel-phase" id="council-gavel-phase">Phase</span>
          </div>
          <div class="council-gavel-body">
            <div class="council-gavel-prompt" id="council-gavel-prompt">
              Review and edit the content below:
            </div>
            <textarea class="council-gavel-textarea" id="council-gavel-textarea"></textarea>
          </div>
          <div class="council-gavel-footer">
            <button class="council-gavel-btn skip" id="council-gavel-skip">Skip (Accept as-is)</button>
            <button class="council-gavel-btn submit" id="council-gavel-submit">Apply Edits</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML("beforeend", modalHtml);

    this._elements.gavelModal = document.getElementById("council-gavel-modal");
    this._elements.gavelContent = document.getElementById(
      "council-gavel-textarea",
    );

    // Bind events
    document
      .getElementById("council-gavel-skip")
      ?.addEventListener("click", () => {
        this._state?.skipGavel();
        this.hideGavel();
      });

    document
      .getElementById("council-gavel-submit")
      ?.addEventListener("click", () => {
        const content = this._elements.gavelContent?.value || "";
        this._state?.submitGavel(content);
        this.hideGavel();
      });

    console.log("[Council UI] Gavel modal created");
  },

  /**
   * Show the gavel modal
   */
  showGavel(phaseId, prompt, content) {
    const modal = this._elements.gavelModal;
    if (!modal) return;

    const phaseEl = document.getElementById("council-gavel-phase");
    const promptEl = document.getElementById("council-gavel-prompt");
    const textarea = this._elements.gavelContent;

    if (phaseEl) phaseEl.textContent = phaseId;
    if (promptEl) promptEl.textContent = prompt;
    if (textarea) textarea.value = content;

    modal.classList.add("visible");
  },

  /**
   * Hide the gavel modal
   */
  hideGavel() {
    if (this._elements.gavelModal) {
      this._elements.gavelModal.classList.remove("visible");
    }
  },

  // ===== SETTINGS PANEL =====

  /**
   * Create the settings panel
   */
  createSettingsPanel() {
    if (document.getElementById("council-settings-panel")) {
      this._elements.settingsPanel = document.getElementById(
        "council-settings-panel",
      );
      return;
    }

    const settingsHtml = `
      <div id="council-settings-panel" class="council-settings-panel">
        <div class="council-settings-header">
          <h3>⚙️ Council Settings</h3>
          <button class="council-header-btn" id="council-settings-close">×</button>
        </div>
        <div class="council-settings-body">
          <div class="council-settings-section">
            <h4>Pipeline Settings</h4>
            <div class="council-setting-row">
              <span class="council-setting-label">Delay between API calls (ms)</span>
              <input type="number" class="council-setting-input" id="council-setting-delay" value="500">
            </div>
            <div class="council-setting-row">
              <span class="council-setting-label">Auto-save stores</span>
              <input type="checkbox" id="council-setting-autosave" checked>
            </div>
            <div class="council-setting-row">
              <span class="council-setting-label">Show team threads</span>
              <input type="checkbox" id="council-setting-teamthreads">
            </div>
          </div>
          <div class="council-settings-section">
            <h4>Context Settings</h4>
            <div class="council-setting-row">
              <span class="council-setting-label">Max context tokens</span>
              <input type="number" class="council-setting-input" id="council-setting-maxtokens" value="8000">
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML("beforeend", settingsHtml);

    this._elements.settingsPanel = document.getElementById(
      "council-settings-panel",
    );

    // Bind close
    document
      .getElementById("council-settings-close")
      ?.addEventListener("click", () => {
        this.hideSettings();
      });

    console.log("[Council UI] Settings panel created");
  },

  /**
   * Toggle settings panel
   */
  toggleSettings() {
    if (this._elements.settingsPanel?.classList.contains("visible")) {
      this.hideSettings();
    } else {
      this.showSettings();
    }
  },

  /**
   * Show settings panel
   */
  showSettings() {
    if (this._elements.settingsPanel) {
      this._elements.settingsPanel.classList.add("visible");
    }
  },

  /**
   * Hide settings panel
   */
  hideSettings() {
    if (this._elements.settingsPanel) {
      this._elements.settingsPanel.classList.remove("visible");
    }
  },

  // ===== BUTTONS =====

  /**
   * Inject Council buttons into ST interface
   */
  injectButtons() {
    if (document.getElementById("council-button")) {
      this._elements.councilButton = document.getElementById("council-button");
      this._elements.toggleButton = document.getElementById("council-toggle");
      return;
    }

    const sendForm = document.getElementById("send_form");
    if (!sendForm) {
      console.warn("[Council UI] send_form not found, retrying in 1s...");
      setTimeout(() => this.injectButtons(), 1000);
      return;
    }

    // Create Council button
    const councilBtn = document.createElement("button");
    councilBtn.id = "council-button";
    councilBtn.type = "button";
    councilBtn.innerHTML = "⚖️ Council";
    councilBtn.title = "Run the Council Pipeline";

    // Create toggle button
    const toggleBtn = document.createElement("button");
    toggleBtn.id = "council-toggle";
    toggleBtn.type = "button";
    toggleBtn.textContent = "📜";
    toggleBtn.title = "Toggle Pipeline Panel";

    // Insert buttons
    const sendButton = document.getElementById("send_but");
    if (sendButton) {
      sendButton.parentNode.insertBefore(councilBtn, sendButton);
      sendButton.parentNode.insertBefore(toggleBtn, sendButton);
    } else {
      sendForm.appendChild(councilBtn);
      sendForm.appendChild(toggleBtn);
    }

    this._elements.councilButton = councilBtn;
    this._elements.toggleButton = toggleBtn;

    // Bind events
    councilBtn.addEventListener("click", () => this.handleCouncilClick());
    toggleBtn.addEventListener("click", () => this.togglePanel());

    console.log("[Council UI] Buttons injected");
  },

  /**
   * Handle Council button click
   */
  async handleCouncilClick() {
    const inputField = document.getElementById("send_textarea");
    const userInput = inputField?.value?.trim() || "";

    if (!userInput) {
      this.showToast("Type a message first.", "error");
      return;
    }

    if (this._pipeline?.isRunning()) {
      this.showToast("Pipeline is already running.", "error");
      return;
    }

    // Clear input
    inputField.value = "";
    inputField.dispatchEvent(new Event("input", { bubbles: true }));

    // Update button state
    this.setButtonProcessing(true);

    // Show panel
    this.showPanel();

    // Clear previous threads
    this.clearAllThreads();

    // Emit event for pipeline to handle
    this._state?.emit("council:run", { userInput });
  },

  /**
   * Set button to processing state
   */
  setButtonProcessing(isProcessing) {
    const btn = this._elements.councilButton;
    if (!btn) return;

    if (isProcessing) {
      btn.disabled = true;
      btn.classList.add("processing");
      btn.innerHTML = "⚖️ Running...";
    } else {
      btn.disabled = false;
      btn.classList.remove("processing");
      btn.innerHTML = "⚖️ Council";
    }
  },

  // ===== EVENT LISTENERS =====

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    if (!this._state) return;

    // Pipeline events
    this._state.on("pipeline:start", () => {
      this.setButtonProcessing(true);
      this.clearAllThreads();
      this.resetPhases();
      window.DataViewer?.refreshData?.();
      if (this._pipelineVisualizer?.reset) {
        this._pipelineVisualizer.reset();
      }
      this.updateStatus("Initializing pipeline...", true);
      this.setCurrentAction("Preparing context and agents");
      this.updateProgress(0, 1);
      this.setActivePhase("init");
    });

    this._state.on("pipeline:phase", ({ phaseIndex, phase, phaseId }) => {
      const total = this._pipeline?.getPhases()?.length || 8;
      const phaseName = phase?.name || `Phase ${phaseIndex + 1}`;
      const normalizedPhaseId = phaseId || this.normalizePhaseId(phaseName);

      this.updateStatus(`${phaseName}`, true);
      this.setCurrentAction(phase?.description || `Processing ${phaseName}...`);
      this.updateProgress(phaseIndex + 1, total);
      this.setActivePhase(normalizedPhaseId);
      if (this._pipelineVisualizer?.render) {
        this._pipelineVisualizer.render();
      }

      // Highlight the relevant thread for this phase
      if (normalizedPhaseId === "context") {
        this.setActiveThread("context");
      } else if (normalizedPhaseId === "instructions") {
        this.setActiveThread("instructions");
      } else if (normalizedPhaseId === "outline") {
        this.setActiveThread("outline");
      } else if (normalizedPhaseId === "team-consult") {
        // Multiple team threads may be active
        this.setActiveThread("prose");
      } else {
        this.setActiveThread("main");
      }
    });

    this._state.on("pipeline:phase:complete", ({ phaseId }) => {
      if (phaseId) {
        this.completePhase(phaseId);
      }
    });

    this._state.on("pipeline:complete", () => {
      this.setButtonProcessing(false);
      this.updateStatus("Pipeline complete!", false);
      this.setCurrentAction("");
      this.setActivePhase("final");
      setTimeout(() => this.completePhase("final"), 500);
      window.DataViewer?.refreshData?.();
      this.showToast("The Council has spoken.", "success");
    });

    this._state.on("pipeline:error", ({ error, phaseId }) => {
      this.setButtonProcessing(false);
      this.updateStatus(`Error: ${error}`, false);
      this.setCurrentAction("");
      if (phaseId) {
        this.setPhaseError(phaseId);
      }
      window.DataViewer?.refreshData?.();
      this.showToast(`Pipeline failed: ${error}`, "error");
    });

    // Thread events
    this._state.on("thread:entry", ({ threadId, entry }) => {
      this.addThreadEntry(threadId, entry);
      // Briefly highlight the thread receiving content
      this.setActiveThread(threadId);
    });

    // Action update events (for showing current activity)
    this._state.on("action:update", ({ action }) => {
      this.setCurrentAction(action);
    });

    // Pipeline abort
    this._state.on("pipeline:abort", ({ reason }) => {
      this.setButtonProcessing(false);
      this.updateStatus(
        reason ? `Pipeline aborted: ${reason}` : "Pipeline aborted",
        false,
      );
      this.setCurrentAction("");
      window.DataViewer?.refreshData?.();
      this.showToast(
        reason ? `Pipeline aborted: ${reason}` : "Pipeline aborted",
        "error",
      );
    });

    // Gavel events
    this._state.on("gavel:await", ({ phaseId, prompt, content }) => {
      this.showGavel(phaseId, prompt, content);
    });

    // UI events
    this._state.on("ui:panel", ({ visible }) => {
      if (visible) {
        this.showPanel();
      } else {
        this.hidePanel();
      }
    });

    console.log("[Council UI] Event listeners set up");
  },

  /**
   * Normalize a phase name to a phase ID for the phase bar
   */
  normalizePhaseId(phaseName) {
    const name = phaseName.toLowerCase();
    if (name.includes("init") || name.includes("start")) return "init";
    if (name.includes("context")) return "context";
    if (name.includes("instruct")) return "instructions";
    if (
      name.includes("team") ||
      name.includes("consult") ||
      name.includes("sme")
    )
      return "team-consult";
    if (name.includes("outline")) return "outline";
    if (name.includes("draft")) return "drafting";
    if (name.includes("review") || name.includes("refine")) return "review";
    if (name.includes("final") || name.includes("complete")) return "final";
    return "init";
  },

  // ===== TOAST NOTIFICATIONS =====

  /**
   * Show a toast notification
   */
  showToast(message, type = "info") {
    // Try to use ST's toastr if available
    if (typeof toastr !== "undefined") {
      switch (type) {
        case "success":
          toastr.success(message, "The Council");
          break;
        case "error":
          toastr.error(message, "The Council");
          break;
        default:
          toastr.info(message, "The Council");
      }
      return;
    }

    // Fallback to custom toast
    const toast = document.createElement("div");
    toast.className = `council-toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 3000);
  },

  // ===== UTILITY =====

  /**
   * Escape HTML characters
   */
  escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  },

  /**
   * Check if UI is initialized
   */
  isInitialized() {
    return this._initialized;
  },

  /**
   * Destroy UI (cleanup)
   */
  destroy() {
    // Remove elements
    this._elements.panel?.remove();
    this._elements.gavelModal?.remove();
    this._elements.settingsPanel?.remove();
    this._elements.councilButton?.remove();
    this._elements.toggleButton?.remove();

    // Remove styles
    document.getElementById("council-styles")?.remove();

    this._initialized = false;
    this._styleInjected = false;

    console.log("[Council UI] Destroyed");
  },
};

// Export for use in other modules
if (typeof window !== "undefined") {
  window.CouncilUI = CouncilUI;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = CouncilUI;
}
