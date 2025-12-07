// modules/ui.js - UI Components and DOM Management for The Council
// Handles all user interface elements, rendering, and DOM interactions

const CouncilUI = {
  // ===== MODULE REFERENCES =====
  _config: null,
  _state: null,
  _pipeline: null,

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
  },

  // ===== STATE =====
  _initialized: false,
  _styleInjected: false,

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

    // Set up event listeners
    this.setupEventListeners();

    this._initialized = true;
    console.log("[Council UI] Initialized");
    return this;
  },

  // ===== STYLE INJECTION =====

  /**
   * Inject CSS styles into the document
   */
  injectStyles() {
    if (this._styleInjected || document.getElementById("council-styles")) {
      return;
    }

    const styles = `
      /* ===== COUNCIL PIPELINE PANEL ===== */
      .council-pipeline-panel {
        position: fixed;
        top: 50px;
        right: 10px;
        width: 480px;
        max-height: 85vh;
        background: var(--SmartThemeBlurTintColor, #1a1a2e);
        border: 1px solid var(--SmartThemeBorderColor, #444);
        border-radius: 12px;
        display: flex;
        flex-direction: column;
        z-index: 9999;
        box-shadow: 0 8px 32px rgba(0,0,0,0.6);
        font-family: var(--mainFontFamily, sans-serif);
        transition: opacity 0.2s ease, transform 0.2s ease;
      }

      .council-pipeline-panel.hidden {
        display: none;
      }

      .council-pipeline-panel.minimized {
        max-height: 60px;
        overflow: hidden;
      }

      /* Header */
      .council-pipeline-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        border-bottom: 1px solid var(--SmartThemeBorderColor, #444);
        background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
        border-radius: 12px 12px 0 0;
      }

      .council-pipeline-header h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
        color: var(--SmartThemeBodyColor, #eee);
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .council-header-buttons {
        display: flex;
        gap: 8px;
      }

      .council-header-btn {
        background: rgba(255,255,255,0.1);
        border: none;
        color: var(--SmartThemeBodyColor, #ccc);
        font-size: 16px;
        width: 28px;
        height: 28px;
        border-radius: 6px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.15s ease;
      }

      .council-header-btn:hover {
        background: rgba(255,255,255,0.2);
        color: #fff;
      }

      /* Progress Section */
      .council-pipeline-progress {
        padding: 12px 16px;
        border-bottom: 1px solid var(--SmartThemeBorderColor, #333);
      }

      .council-status-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      }

      .council-pipeline-status {
        font-size: 13px;
        color: var(--SmartThemeBodyColor, #ccc);
        flex: 1;
      }

      .council-phase-counter {
        font-size: 12px;
        color: var(--SmartThemeBodyColor, #888);
        background: rgba(255,255,255,0.05);
        padding: 4px 8px;
        border-radius: 4px;
      }

      .council-progress-track {
        height: 6px;
        background: rgba(255,255,255,0.1);
        border-radius: 3px;
        overflow: hidden;
      }

      .council-progress-bar {
        height: 100%;
        background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
        border-radius: 3px;
        width: 0%;
        transition: width 0.4s ease;
      }

      /* Threads Container */
      .council-threads-container {
        flex: 1;
        overflow-y: auto;
        padding: 8px;
        max-height: calc(85vh - 150px);
      }

      /* Thread Tab */
      .council-thread-tab {
        margin-bottom: 6px;
        border: 1px solid var(--SmartThemeBorderColor, #333);
        border-radius: 8px;
        overflow: hidden;
        background: rgba(255,255,255,0.02);
        transition: border-color 0.15s ease;
      }

      .council-thread-tab:hover {
        border-color: var(--SmartThemeBorderColor, #555);
      }

      .council-thread-tab.has-new {
        border-color: #667eea;
      }

      .council-thread-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 12px;
        background: rgba(255,255,255,0.03);
        cursor: pointer;
        user-select: none;
        transition: background 0.15s ease;
      }

      .council-thread-header:hover {
        background: rgba(255,255,255,0.06);
      }

      .council-thread-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        font-weight: 500;
        color: var(--SmartThemeBodyColor, #ddd);
      }

      .council-thread-icon {
        font-size: 14px;
      }

      .council-thread-badge {
        background: #667eea;
        color: white;
        font-size: 10px;
        padding: 2px 6px;
        border-radius: 10px;
        min-width: 18px;
        text-align: center;
      }

      .council-thread-toggle {
        font-size: 12px;
        color: var(--SmartThemeBodyColor, #888);
        transition: transform 0.2s ease;
      }

      .council-thread-tab.expanded .council-thread-toggle {
        transform: rotate(180deg);
      }

      .council-thread-body {
        max-height: 0;
        overflow: hidden;
        transition: max-height 0.3s ease;
        background: rgba(0,0,0,0.2);
      }

      .council-thread-tab.expanded .council-thread-body {
        max-height: 400px;
        overflow-y: auto;
      }

      .council-thread-content {
        padding: 8px 12px;
        min-height: 40px;
      }

      /* Thread Entries */
      .council-thread-entry {
        padding: 10px 12px;
        border-bottom: 1px solid rgba(255,255,255,0.05);
        font-size: 12px;
        line-height: 1.5;
        animation: council-fadeIn 0.2s ease;
      }

      .council-thread-entry:last-child {
        border-bottom: none;
      }

      .council-thread-entry.phase-marker {
        background: linear-gradient(90deg, rgba(102,126,234,0.15) 0%, rgba(118,75,162,0.15) 100%);
        font-weight: 600;
        text-align: center;
        color: #a5b4fc;
        padding: 8px;
        font-size: 11px;
        letter-spacing: 0.5px;
      }

      .council-entry-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 6px;
      }

      .council-entry-agent {
        color: #667eea;
        font-weight: 600;
        font-size: 11px;
      }

      .council-entry-time {
        color: var(--SmartThemeBodyColor, #666);
        font-size: 10px;
      }

      .council-entry-content {
        color: var(--SmartThemeBodyColor, #bbb);
        white-space: pre-wrap;
        word-break: break-word;
      }

      .council-thread-empty {
        color: var(--SmartThemeBodyColor, #666);
        font-style: italic;
        text-align: center;
        padding: 20px;
        font-size: 12px;
      }

      /* ===== GAVEL MODAL ===== */
      .council-gavel-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.85);
        z-index: 10001;
        display: flex;
        justify-content: center;
        align-items: center;
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.2s ease, visibility 0.2s ease;
      }

      .council-gavel-modal.visible {
        opacity: 1;
        visibility: visible;
      }

      .council-gavel-container {
        background: var(--SmartThemeBlurTintColor, #1a1a2e);
        border: 1px solid var(--SmartThemeBorderColor, #444);
        border-radius: 12px;
        width: 90%;
        max-width: 900px;
        max-height: 90vh;
        display: flex;
        flex-direction: column;
        box-shadow: 0 16px 64px rgba(0,0,0,0.5);
        animation: council-slideUp 0.3s ease;
      }

      @keyframes council-slideUp {
        from { transform: translateY(20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }

      .council-gavel-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 20px;
        border-bottom: 1px solid var(--SmartThemeBorderColor, #444);
      }

      .council-gavel-header h3 {
        margin: 0;
        font-size: 18px;
        color: var(--SmartThemeBodyColor, #eee);
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .council-gavel-phase {
        font-size: 12px;
        color: var(--SmartThemeBodyColor, #888);
        background: rgba(255,255,255,0.05);
        padding: 4px 10px;
        border-radius: 4px;
      }

      .council-gavel-body {
        flex: 1;
        padding: 20px;
        overflow-y: auto;
      }

      .council-gavel-prompt {
        font-size: 14px;
        color: var(--SmartThemeBodyColor, #ccc);
        margin-bottom: 16px;
        line-height: 1.5;
      }

      .council-gavel-textarea {
        width: 100%;
        min-height: 300px;
        background: rgba(0,0,0,0.3);
        border: 1px solid var(--SmartThemeBorderColor, #444);
        color: var(--SmartThemeBodyColor, #eee);
        padding: 16px;
        border-radius: 8px;
        font-family: var(--monoFontFamily, monospace);
        font-size: 13px;
        line-height: 1.6;
        resize: vertical;
      }

      .council-gavel-textarea:focus {
        outline: none;
        border-color: #667eea;
        box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
      }

      .council-gavel-footer {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        padding: 16px 20px;
        border-top: 1px solid var(--SmartThemeBorderColor, #444);
        background: rgba(0,0,0,0.2);
        border-radius: 0 0 12px 12px;
      }

      .council-gavel-btn {
        padding: 10px 20px;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.15s ease;
      }

      .council-gavel-btn.skip {
        background: rgba(255,255,255,0.1);
        border: 1px solid var(--SmartThemeBorderColor, #555);
        color: var(--SmartThemeBodyColor, #ccc);
      }

      .council-gavel-btn.skip:hover {
        background: rgba(255,255,255,0.15);
      }

      .council-gavel-btn.submit {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border: none;
        color: white;
      }

      .council-gavel-btn.submit:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
      }

      /* ===== COUNCIL BUTTONS ===== */
      #council-button {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border: none;
        border-radius: 6px;
        color: white;
        padding: 8px 14px;
        cursor: pointer;
        font-size: 13px;
        font-weight: 500;
        margin-left: 5px;
        transition: all 0.15s ease;
        display: flex;
        align-items: center;
        gap: 6px;
      }

      #council-button:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
      }

      #council-button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        transform: none;
        box-shadow: none;
      }

      #council-button.processing {
        animation: council-pulse 1.5s infinite;
      }

      @keyframes council-pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.7; }
      }

      @keyframes council-fadeIn {
        from { opacity: 0; transform: translateY(-5px); }
        to { opacity: 1; transform: translateY(0); }
      }

      #council-toggle {
        background: var(--SmartThemeBlurTintColor, #2a2a4e);
        border: 1px solid var(--SmartThemeBorderColor, #444);
        border-radius: 6px;
        color: var(--SmartThemeBodyColor, #ccc);
        padding: 8px 10px;
        cursor: pointer;
        font-size: 14px;
        margin-left: 3px;
        transition: all 0.15s ease;
      }

      #council-toggle:hover {
        border-color: #667eea;
        color: #667eea;
      }

      #council-toggle.active {
        background: rgba(102, 126, 234, 0.2);
        border-color: #667eea;
        color: #667eea;
      }

      /* ===== SETTINGS PANEL ===== */
      .council-settings-panel {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 90%;
        max-width: 700px;
        max-height: 80vh;
        background: var(--SmartThemeBlurTintColor, #1a1a2e);
        border: 1px solid var(--SmartThemeBorderColor, #444);
        border-radius: 12px;
        z-index: 10002;
        display: none;
        flex-direction: column;
        box-shadow: 0 16px 64px rgba(0,0,0,0.5);
      }

      .council-settings-panel.visible {
        display: flex;
      }

      .council-settings-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 20px;
        border-bottom: 1px solid var(--SmartThemeBorderColor, #444);
      }

      .council-settings-header h3 {
        margin: 0;
        font-size: 16px;
        color: var(--SmartThemeBodyColor, #eee);
      }

      .council-settings-body {
        flex: 1;
        overflow-y: auto;
        padding: 20px;
      }

      .council-settings-section {
        margin-bottom: 24px;
      }

      .council-settings-section h4 {
        font-size: 14px;
        color: var(--SmartThemeBodyColor, #ddd);
        margin: 0 0 12px 0;
        padding-bottom: 8px;
        border-bottom: 1px solid var(--SmartThemeBorderColor, #333);
      }

      .council-setting-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 0;
      }

      .council-setting-label {
        font-size: 13px;
        color: var(--SmartThemeBodyColor, #bbb);
      }

      .council-setting-input {
        background: rgba(0,0,0,0.3);
        border: 1px solid var(--SmartThemeBorderColor, #444);
        color: var(--SmartThemeBodyColor, #eee);
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 13px;
        width: 200px;
      }

      .council-setting-input:focus {
        outline: none;
        border-color: #667eea;
      }

      /* ===== SCROLLBAR ===== */
      .council-threads-container::-webkit-scrollbar,
      .council-thread-body::-webkit-scrollbar,
      .council-gavel-body::-webkit-scrollbar,
      .council-settings-body::-webkit-scrollbar {
        width: 6px;
      }

      .council-threads-container::-webkit-scrollbar-track,
      .council-thread-body::-webkit-scrollbar-track,
      .council-gavel-body::-webkit-scrollbar-track,
      .council-settings-body::-webkit-scrollbar-track {
        background: rgba(0,0,0,0.2);
        border-radius: 3px;
      }

      .council-threads-container::-webkit-scrollbar-thumb,
      .council-thread-body::-webkit-scrollbar-thumb,
      .council-gavel-body::-webkit-scrollbar-thumb,
      .council-settings-body::-webkit-scrollbar-thumb {
        background: rgba(255,255,255,0.2);
        border-radius: 3px;
      }

      .council-threads-container::-webkit-scrollbar-thumb:hover,
      .council-thread-body::-webkit-scrollbar-thumb:hover,
      .council-gavel-body::-webkit-scrollbar-thumb:hover,
      .council-settings-body::-webkit-scrollbar-thumb:hover {
        background: rgba(255,255,255,0.3);
      }

      /* ===== TOAST NOTIFICATIONS ===== */
      .council-toast {
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: var(--SmartThemeBlurTintColor, #1a1a2e);
        border: 1px solid var(--SmartThemeBorderColor, #444);
        border-radius: 8px;
        padding: 12px 16px;
        color: var(--SmartThemeBodyColor, #eee);
        font-size: 13px;
        z-index: 10003;
        animation: council-slideIn 0.3s ease;
        max-width: 300px;
      }

      @keyframes council-slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }

      .council-toast.success {
        border-color: #4ade80;
      }

      .council-toast.error {
        border-color: #f87171;
      }
    `;

    const styleElement = document.createElement("style");
    styleElement.id = "council-styles";
    styleElement.textContent = styles;
    document.head.appendChild(styleElement);

    this._styleInjected = true;
    console.log("[Council UI] Styles injected");
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

    const threadTabsHtml = Object.entries(threads)
      .sort((a, b) => (a[1].priority || 99) - (b[1].priority || 99))
      .map(
        ([id, thread]) => `
        <div class="council-thread-tab ${thread.expanded ? "expanded" : ""}" data-thread="${id}">
          <div class="council-thread-header">
            <div class="council-thread-title">
              <span class="council-thread-icon">${thread.icon || "📄"}</span>
              <span>${thread.name}</span>
              <span class="council-thread-badge" style="display: none;">0</span>
            </div>
            <span class="council-thread-toggle">▼</span>
          </div>
          <div class="council-thread-body">
            <div class="council-thread-content" id="council-thread-content-${id}">
              <div class="council-thread-empty">No content yet</div>
            </div>
          </div>
        </div>
      `,
      )
      .join("");

    const panelHtml = `
      <div id="council-pipeline-panel" class="council-pipeline-panel hidden">
        <div class="council-pipeline-header">
          <h3>⚖️ The Council</h3>
          <div class="council-header-buttons">
            <button class="council-header-btn" id="council-settings-btn" title="Settings">⚙️</button>
            <button class="council-header-btn" id="council-minimize-btn" title="Minimize">─</button>
            <button class="council-header-btn" id="council-close-btn" title="Close">×</button>
          </div>
        </div>
        <div class="council-pipeline-progress">
          <div class="council-status-row">
            <div class="council-pipeline-status" id="council-status">Ready</div>
            <div class="council-phase-counter" id="council-phase-counter">0 / 0</div>
          </div>
          <div class="council-progress-track">
            <div class="council-progress-bar" id="council-progress-bar"></div>
          </div>
        </div>
        <div class="council-threads-container" id="council-threads-container">
          ${threadTabsHtml}
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
      "council-threads-container",
    );

    // Bind panel events
    this.bindPanelEvents();

    console.log("[Council UI] Pipeline panel created");
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

    // Settings button
    const settingsBtn = document.getElementById("council-settings-btn");
    if (settingsBtn) {
      settingsBtn.addEventListener("click", () => this.toggleSettings());
    }

    // Thread toggles
    const threadHeaders = document.querySelectorAll(".council-thread-header");
    threadHeaders.forEach((header) => {
      header.addEventListener("click", (e) => {
        const tab = e.currentTarget.closest(".council-thread-tab");
        const threadId = tab?.dataset?.thread;
        if (threadId) {
          this.toggleThread(threadId);
        }
      });
    });
  },

  /**
   * Get default thread definitions
   */
  getDefaultThreads() {
    return {
      main: { name: "Main", icon: "🏛️", expanded: true, priority: 1 },
      context: { name: "Context", icon: "📚", expanded: false, priority: 2 },
      instructions: {
        name: "Instructions",
        icon: "📋",
        expanded: false,
        priority: 3,
      },
      outline: { name: "Outline", icon: "📝", expanded: true, priority: 4 },
      drafting: { name: "Drafting", icon: "📄", expanded: true, priority: 5 },
      final: { name: "Final", icon: "✅", expanded: true, priority: 6 },
      prose: { name: "Prose Team", icon: "✍️", expanded: false, priority: 10 },
      plot: { name: "Plot Team", icon: "🗺️", expanded: false, priority: 11 },
      world: { name: "World Team", icon: "🌍", expanded: false, priority: 12 },
      characters: {
        name: "Characters",
        icon: "👥",
        expanded: false,
        priority: 13,
      },
      environment: {
        name: "Environment",
        icon: "🏞️",
        expanded: false,
        priority: 14,
      },
      recordkeeping: {
        name: "Records",
        icon: "📁",
        expanded: false,
        priority: 15,
      },
    };
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
   * Update the status text
   */
  updateStatus(text) {
    if (this._elements.statusText) {
      this._elements.statusText.textContent = text;
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
   * Toggle a thread's expanded state
   */
  toggleThread(threadId) {
    const tab = document.querySelector(
      `.council-thread-tab[data-thread="${threadId}"]`,
    );
    if (tab) {
      tab.classList.toggle("expanded");
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

    // Auto-scroll
    const body = contentEl.closest(".council-thread-body");
    if (body) {
      body.scrollTop = body.scrollHeight;
    }

    // Flash the thread tab
    const tab = document.querySelector(
      `.council-thread-tab[data-thread="${threadId}"]`,
    );
    if (tab && !tab.classList.contains("expanded")) {
      tab.classList.add("has-new");
      setTimeout(() => tab.classList.remove("has-new"), 2000);
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
    const tab = document.querySelector(
      `.council-thread-tab[data-thread="${threadId}"]`,
    );
    const badge = tab?.querySelector(".council-thread-badge");
    if (badge) {
      badge.textContent = count;
      badge.style.display = count > 0 ? "inline" : "none";
    }
  },

  /**
   * Clear all thread content
   */
  clearAllThreads() {
    const contentEls = document.querySelectorAll(
      '[id^="council-thread-content-"]',
    );
    contentEls.forEach((el) => {
      el.innerHTML = '<div class="council-thread-empty">No content yet</div>';
    });

    const badges = document.querySelectorAll(".council-thread-badge");
    badges.forEach((badge) => {
      badge.textContent = "0";
      badge.style.display = "none";
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
      this.updateStatus("Starting pipeline...");
      this.updateProgress(0, 1);
    });

    this._state.on("pipeline:phase", ({ phaseIndex, phase }) => {
      const total = this._pipeline?.getPhases()?.length || 14;
      this.updateStatus(`Phase ${phaseIndex + 1}: ${phase.name}`);
      this.updateProgress(phaseIndex + 1, total);
    });

    this._state.on("pipeline:complete", () => {
      this.setButtonProcessing(false);
      this.updateStatus("✅ Pipeline complete!");
      this.showToast("The Council has spoken.", "success");
    });

    this._state.on("pipeline:error", ({ error }) => {
      this.setButtonProcessing(false);
      this.updateStatus(`❌ Error: ${error}`);
      this.showToast(`Pipeline failed: ${error}`, "error");
    });

    // Thread events
    this._state.on("thread:entry", ({ threadId, entry }) => {
      this.addThreadEntry(threadId, entry);
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
