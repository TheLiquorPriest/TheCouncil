// modules/ui/data-viewer.js - Data Viewer UI Component for The Council
// Shows persistent stores, context blocks, and outputs in a browsable interface

const DataViewer = {
  // ===== VERSION =====
  VERSION: "1.0.0",

  // ===== MODULE REFERENCES =====
  _stores: null,
  _contextManager: null,
  _outputManager: null,
  _threadManager: null,

  // ===== STATE =====
  _initialized: false,
  _visible: false,
  _currentTab: "stores",
  _expandedSections: new Set(),
  _searchQuery: "",
  _autoRefresh: false,
  _refreshInterval: null,

  // ===== CONSTANTS =====
  TABS: {
    STORES: "stores",
    CONTEXT: "context",
    OUTPUTS: "outputs",
    THREADS: "threads",
    HISTORY: "history",
  },

  REFRESH_INTERVAL: 5000, // 5 seconds

  // ===== INITIALIZATION =====

  /**
   * Initialize the data viewer
   * @param {Object} modules - Module references
   * @returns {DataViewer}
   */
  init(modules = {}) {
    console.log("[Data Viewer] Initializing...");

    this._stores = modules.stores || window.CouncilStores || null;
    this._contextManager =
      modules.contextManager || window.ContextManager || null;
    this._outputManager = modules.outputManager || window.OutputManager || null;
    this._threadManager = modules.threadManager || window.ThreadManager || null;

    // Create the viewer panel
    this._createViewerPanel();

    // Bind events
    this._bindEvents();

    this._initialized = true;
    console.log("[Data Viewer] Initialized");

    return this;
  },

  /**
   * Check if initialized
   * @returns {boolean}
   */
  isInitialized() {
    return this._initialized;
  },

  // ===== PANEL CREATION =====

  /**
   * Create the data viewer panel
   */
  _createViewerPanel() {
    // Remove existing panel if present
    const existing = document.getElementById("council-data-viewer");
    if (existing) {
      existing.remove();
    }

    const panelHtml = `
      <div id="council-data-viewer" class="council-data-viewer hidden">
        <div class="council-data-viewer-header">
          <h3>📊 Council Data Viewer</h3>
          <div class="council-data-viewer-controls">
            <input type="text"
                   id="council-data-search"
                   class="council-data-search"
                   placeholder="Search..."
                   autocomplete="off">
            <button id="council-data-refresh" class="council-data-btn" title="Refresh">🔄</button>
            <button id="council-data-auto-refresh" class="council-data-btn" title="Auto Refresh">⏱️</button>
            <button id="council-data-export" class="council-data-btn" title="Export">📥</button>
            <button id="council-data-close" class="council-data-btn council-data-close" title="Close">×</button>
          </div>
        </div>

        <div class="council-data-viewer-tabs">
          <button class="council-data-tab active" data-tab="stores">
            💾 Stores
          </button>
          <button class="council-data-tab" data-tab="context">
            📋 Context
          </button>
          <button class="council-data-tab" data-tab="outputs">
            📤 Outputs
          </button>
          <button class="council-data-tab" data-tab="threads">
            💬 Threads
          </button>
          <button class="council-data-tab" data-tab="history">
            📜 History
          </button>
        </div>

        <div class="council-data-viewer-info">
          <span id="council-data-story-id">Story: --</span>
          <span id="council-data-last-updated">Updated: --</span>
          <span id="council-data-item-count">Items: 0</span>
        </div>

        <div class="council-data-viewer-content" id="council-data-content">
          <div class="council-data-loading">Loading...</div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML("beforeend", panelHtml);

    // Inject styles
    this._injectStyles();
  },

  /**
   * Inject CSS styles for data viewer
   */
  _injectStyles() {
    if (document.getElementById("council-data-viewer-styles")) {
      return;
    }

    const styles = `
      .council-data-viewer {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 90vw;
        max-width: 1200px;
        height: 80vh;
        background: var(--SmartThemeChatBG, #1a1a2e);
        border: 1px solid var(--SmartThemeBorderColor, #4a4a6a);
        border-radius: 12px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        z-index: 10001;
        display: flex;
        flex-direction: column;
        font-family: var(--mainFontFamily, system-ui, sans-serif);
        color: var(--SmartThemeBodyColor, #e0e0e0);
      }

      .council-data-viewer.hidden {
        display: none;
      }

      .council-data-viewer-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        background: var(--SmartThemeBlurTint, rgba(0, 0, 0, 0.3));
        border-bottom: 1px solid var(--SmartThemeBorderColor, #4a4a6a);
        border-radius: 12px 12px 0 0;
      }

      .council-data-viewer-header h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
      }

      .council-data-viewer-controls {
        display: flex;
        gap: 8px;
        align-items: center;
      }

      .council-data-search {
        padding: 6px 12px;
        border: 1px solid var(--SmartThemeBorderColor, #4a4a6a);
        border-radius: 6px;
        background: var(--SmartThemeChatBG, #1a1a2e);
        color: var(--SmartThemeBodyColor, #e0e0e0);
        font-size: 13px;
        width: 200px;
      }

      .council-data-search:focus {
        outline: none;
        border-color: var(--SmartThemeQuoteColor, #7c7cff);
      }

      .council-data-btn {
        padding: 6px 10px;
        border: 1px solid var(--SmartThemeBorderColor, #4a4a6a);
        border-radius: 6px;
        background: transparent;
        color: var(--SmartThemeBodyColor, #e0e0e0);
        cursor: pointer;
        font-size: 14px;
        transition: all 0.2s;
      }

      .council-data-btn:hover {
        background: var(--SmartThemeBlurTint, rgba(255, 255, 255, 0.1));
      }

      .council-data-btn.active {
        background: var(--SmartThemeQuoteColor, #7c7cff);
        border-color: var(--SmartThemeQuoteColor, #7c7cff);
      }

      .council-data-close {
        font-size: 18px;
        font-weight: bold;
        padding: 4px 10px;
      }

      .council-data-viewer-tabs {
        display: flex;
        gap: 4px;
        padding: 8px 16px;
        background: var(--SmartThemeBlurTint, rgba(0, 0, 0, 0.2));
        border-bottom: 1px solid var(--SmartThemeBorderColor, #4a4a6a);
      }

      .council-data-tab {
        padding: 8px 16px;
        border: none;
        border-radius: 6px;
        background: transparent;
        color: var(--SmartThemeBodyColor, #e0e0e0);
        cursor: pointer;
        font-size: 13px;
        transition: all 0.2s;
        opacity: 0.7;
      }

      .council-data-tab:hover {
        opacity: 1;
        background: var(--SmartThemeBlurTint, rgba(255, 255, 255, 0.1));
      }

      .council-data-tab.active {
        opacity: 1;
        background: var(--SmartThemeQuoteColor, #7c7cff);
        color: white;
      }

      .council-data-viewer-info {
        display: flex;
        gap: 16px;
        padding: 8px 16px;
        font-size: 12px;
        color: var(--SmartThemeEmColor, #888);
        border-bottom: 1px solid var(--SmartThemeBorderColor, #4a4a6a);
      }

      .council-data-viewer-content {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
      }

      .council-data-loading {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        color: var(--SmartThemeEmColor, #888);
      }

      .council-data-empty {
        text-align: center;
        padding: 40px;
        color: var(--SmartThemeEmColor, #888);
      }

      .council-data-section {
        margin-bottom: 16px;
        border: 1px solid var(--SmartThemeBorderColor, #4a4a6a);
        border-radius: 8px;
        overflow: hidden;
      }

      .council-data-section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 14px;
        background: var(--SmartThemeBlurTint, rgba(0, 0, 0, 0.2));
        cursor: pointer;
        user-select: none;
      }

      .council-data-section-header:hover {
        background: var(--SmartThemeBlurTint, rgba(255, 255, 255, 0.05));
      }

      .council-data-section-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 500;
      }

      .council-data-section-badge {
        background: var(--SmartThemeQuoteColor, #7c7cff);
        color: white;
        padding: 2px 8px;
        border-radius: 10px;
        font-size: 11px;
      }

      .council-data-section-toggle {
        transition: transform 0.2s;
      }

      .council-data-section.expanded .council-data-section-toggle {
        transform: rotate(180deg);
      }

      .council-data-section-content {
        display: none;
        padding: 12px 14px;
        background: var(--SmartThemeChatBG, #1a1a2e);
        border-top: 1px solid var(--SmartThemeBorderColor, #4a4a6a);
      }

      .council-data-section.expanded .council-data-section-content {
        display: block;
      }

      .council-data-item {
        margin-bottom: 8px;
        padding: 8px 12px;
        background: var(--SmartThemeBlurTint, rgba(0, 0, 0, 0.2));
        border-radius: 6px;
        font-size: 13px;
      }

      .council-data-item:last-child {
        margin-bottom: 0;
      }

      .council-data-item-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 4px;
      }

      .council-data-item-key {
        font-weight: 500;
        color: var(--SmartThemeQuoteColor, #7c7cff);
      }

      .council-data-item-type {
        font-size: 11px;
        color: var(--SmartThemeEmColor, #888);
        padding: 2px 6px;
        background: var(--SmartThemeBorderColor, #4a4a6a);
        border-radius: 4px;
      }

      .council-data-item-value {
        word-break: break-word;
        white-space: pre-wrap;
        font-family: var(--monoFontFamily, monospace);
        font-size: 12px;
        max-height: 200px;
        overflow-y: auto;
        background: var(--SmartThemeChatBG, #1a1a2e);
        padding: 8px;
        border-radius: 4px;
        margin-top: 4px;
      }

      .council-data-item-value.collapsed {
        max-height: 60px;
        overflow: hidden;
        position: relative;
      }

      .council-data-item-value.collapsed::after {
        content: "Click to expand...";
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        padding: 8px;
        background: linear-gradient(transparent, var(--SmartThemeChatBG, #1a1a2e));
        text-align: center;
        color: var(--SmartThemeEmColor, #888);
        font-family: var(--mainFontFamily, system-ui, sans-serif);
        font-size: 11px;
        cursor: pointer;
      }

      .council-data-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 12px;
      }

      .council-data-card {
        padding: 12px;
        background: var(--SmartThemeBlurTint, rgba(0, 0, 0, 0.2));
        border-radius: 8px;
        border: 1px solid var(--SmartThemeBorderColor, #4a4a6a);
      }

      .council-data-card-title {
        font-weight: 500;
        margin-bottom: 8px;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .council-data-card-content {
        font-size: 12px;
        color: var(--SmartThemeEmColor, #ccc);
      }

      .council-data-tree {
        font-size: 13px;
      }

      .council-data-tree-node {
        padding-left: 16px;
        border-left: 1px solid var(--SmartThemeBorderColor, #4a4a6a);
        margin-left: 8px;
      }

      .council-data-tree-key {
        color: var(--SmartThemeQuoteColor, #7c7cff);
      }

      .council-data-tree-value {
        color: var(--SmartThemeBodyColor, #e0e0e0);
      }

      .council-data-string { color: #98c379; }
      .council-data-number { color: #d19a66; }
      .council-data-boolean { color: #56b6c2; }
      .council-data-null { color: #e06c75; }

      .council-data-actions {
        display: flex;
        gap: 8px;
        margin-top: 12px;
        padding-top: 12px;
        border-top: 1px solid var(--SmartThemeBorderColor, #4a4a6a);
      }

      .council-data-action-btn {
        padding: 6px 12px;
        border: 1px solid var(--SmartThemeBorderColor, #4a4a6a);
        border-radius: 6px;
        background: transparent;
        color: var(--SmartThemeBodyColor, #e0e0e0);
        cursor: pointer;
        font-size: 12px;
      }

      .council-data-action-btn:hover {
        background: var(--SmartThemeBlurTint, rgba(255, 255, 255, 0.1));
      }

      .council-data-action-btn.danger {
        border-color: #e06c75;
        color: #e06c75;
      }

      .council-data-action-btn.danger:hover {
        background: rgba(224, 108, 117, 0.2);
      }

      /* Highlight matching search terms */
      .council-data-highlight {
        background: rgba(255, 255, 0, 0.3);
        padding: 0 2px;
        border-radius: 2px;
      }
    `;

    const styleElement = document.createElement("style");
    styleElement.id = "council-data-viewer-styles";
    styleElement.textContent = styles;
    document.head.appendChild(styleElement);
  },

  // ===== EVENT BINDING =====

  /**
   * Bind all event handlers
   */
  _bindEvents() {
    // Close button
    const closeBtn = document.getElementById("council-data-close");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => this.hide());
    }

    // Refresh button
    const refreshBtn = document.getElementById("council-data-refresh");
    if (refreshBtn) {
      refreshBtn.addEventListener("click", () => this.refresh());
    }

    // Auto-refresh toggle
    const autoRefreshBtn = document.getElementById("council-data-auto-refresh");
    if (autoRefreshBtn) {
      autoRefreshBtn.addEventListener("click", () => this.toggleAutoRefresh());
    }

    // Export button
    const exportBtn = document.getElementById("council-data-export");
    if (exportBtn) {
      exportBtn.addEventListener("click", () => this.exportData());
    }

    // Tab buttons
    const tabBtns = document.querySelectorAll(".council-data-tab");
    tabBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const tab = btn.dataset.tab;
        this.switchTab(tab);
      });
    });

    // Search input
    const searchInput = document.getElementById("council-data-search");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        this._searchQuery = e.target.value;
        this._renderCurrentTab();
      });
    }

    // Keyboard shortcuts
    document.addEventListener("keydown", (e) => {
      // Escape to close
      if (e.key === "Escape" && this._visible) {
        this.hide();
      }
    });
  },

  // ===== VISIBILITY =====

  /**
   * Show the data viewer
   */
  show() {
    const panel = document.getElementById("council-data-viewer");
    if (panel) {
      panel.classList.remove("hidden");
      this._visible = true;
      this._autoRefresh = true;
      const btn = document.getElementById("council-data-auto-refresh");
      if (btn) btn.classList.add("active");
      this.startAutoRefresh();
      this.refresh();
    }
  },

  /**
   * Hide the data viewer
   */
  hide() {
    const panel = document.getElementById("council-data-viewer");
    if (panel) {
      panel.classList.add("hidden");
      this._visible = false;
      this.stopAutoRefresh();
    }
  },

  /**
   * Toggle visibility
   */
  toggle() {
    if (this._visible) {
      this.hide();
    } else {
      this.show();
    }
  },

  /**
   * Check if visible
   * @returns {boolean}
   */
  isVisible() {
    return this._visible;
  },

  // ===== TAB MANAGEMENT =====

  /**
   * Switch to a tab
   * @param {string} tab - Tab identifier
   */
  switchTab(tab) {
    this._currentTab = tab;

    // Update tab button states
    const tabBtns = document.querySelectorAll(".council-data-tab");
    tabBtns.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.tab === tab);
    });

    // Render tab content
    this._renderCurrentTab();
  },

  /**
   * Render the current tab content
   */
  _renderCurrentTab() {
    switch (this._currentTab) {
      case this.TABS.STORES:
        this._renderStoresTab();
        break;
      case this.TABS.CONTEXT:
        this._renderContextTab();
        break;
      case this.TABS.OUTPUTS:
        this._renderOutputsTab();
        break;
      case this.TABS.THREADS:
        this._renderThreadsTab();
        break;
      case this.TABS.HISTORY:
        this._renderHistoryTab();
        break;
      default:
        this._renderStoresTab();
    }
  },

  // ===== REFRESH =====

  /**
   * Refresh all data
   */
  refresh() {
    this._updateInfoBar();
    this._renderCurrentTab();
  },

  refreshData() {
    this.refresh();
  },

  /**
   * Toggle auto-refresh
   */
  toggleAutoRefresh() {
    this._autoRefresh = !this._autoRefresh;

    const btn = document.getElementById("council-data-auto-refresh");
    if (btn) {
      btn.classList.toggle("active", this._autoRefresh);
    }

    if (this._autoRefresh) {
      this.startAutoRefresh();
    } else {
      this.stopAutoRefresh();
    }
  },

  /**
   * Start auto-refresh interval
   */
  startAutoRefresh() {
    this.stopAutoRefresh();
    this._refreshInterval = setInterval(() => {
      if (this._visible) {
        this.refresh();
      }
    }, this.REFRESH_INTERVAL);
  },

  /**
   * Stop auto-refresh interval
   */
  stopAutoRefresh() {
    if (this._refreshInterval) {
      clearInterval(this._refreshInterval);
      this._refreshInterval = null;
    }
  },

  // ===== INFO BAR =====

  /**
   * Update the info bar
   */
  _updateInfoBar() {
    const storyIdEl = document.getElementById("council-data-story-id");
    const lastUpdatedEl = document.getElementById("council-data-last-updated");
    const itemCountEl = document.getElementById("council-data-item-count");

    if (storyIdEl && this._stores) {
      storyIdEl.textContent = `Story: ${this._stores.getStoryId() || "--"}`;
    }

    if (lastUpdatedEl && this._stores) {
      const stores = this._stores.getAll();
      const updatedAt = stores?._meta?.updatedAt;
      if (updatedAt) {
        lastUpdatedEl.textContent = `Updated: ${new Date(updatedAt).toLocaleString()}`;
      }
    }

    if (itemCountEl) {
      const count = this._getItemCount();
      itemCountEl.textContent = `Items: ${count}`;
    }
  },

  /**
   * Get total item count across all data
   * @returns {number}
   */
  _getItemCount() {
    let count = 0;

    if (this._stores) {
      const stores = this._stores.getAll();
      for (const [key, value] of Object.entries(stores || {})) {
        if (key === "_meta") continue;
        if (Array.isArray(value)) {
          count += value.length;
        } else if (typeof value === "object" && value !== null) {
          count += Object.keys(value).length;
        } else if (value) {
          count += 1;
        }
      }
    }

    return count;
  },

  // ===== TAB RENDERERS =====

  /**
   * Render the stores tab
   */
  _renderStoresTab() {
    const content = document.getElementById("council-data-content");
    if (!content) return;

    if (!this._stores) {
      content.innerHTML =
        '<div class="council-data-empty">Stores not available</div>';
      return;
    }

    const stores = this._stores.getAll();
    if (!stores) {
      content.innerHTML =
        '<div class="council-data-empty">No data loaded</div>';
      return;
    }

    const sections = [
      { key: "storySynopsis", title: "📖 Story Synopsis", icon: "📖" },
      { key: "storyOutline", title: "📝 Story Outline", icon: "📝" },
      { key: "storyDraft", title: "✍️ Story Draft", icon: "✍️" },
      { key: "currentSituation", title: "📍 Current Situation", icon: "📍" },
      { key: "plotLines", title: "📈 Plot Lines", icon: "📈" },
      { key: "scenes", title: "🎬 Scenes", icon: "🎬" },
      { key: "characterSheets", title: "👤 Characters", icon: "👤" },
      {
        key: "characterDevelopment",
        title: "📊 Character Development",
        icon: "📊",
      },
      {
        key: "characterPositions",
        title: "📍 Character Positions",
        icon: "📍",
      },
      {
        key: "characterInventory",
        title: "🎒 Character Inventory",
        icon: "🎒",
      },
      { key: "locationSheets", title: "🗺️ Locations", icon: "🗺️" },
      { key: "factionSheets", title: "⚔️ Factions", icon: "⚔️" },
      { key: "dialogueHistory", title: "💬 Dialogue History", icon: "💬" },
      { key: "agentCommentary", title: "🤖 Agent Commentary", icon: "🤖" },
      { key: "sessionHistory", title: "📜 Session History", icon: "📜" },
      { key: "pipelineState", title: "⚙️ Pipeline State", icon: "⚙️" },
      { key: "_meta", title: "ℹ️ Metadata", icon: "ℹ️" },
    ];

    let html = "";

    for (const section of sections) {
      const data = stores[section.key];
      if (data === undefined) continue;

      const isExpanded = this._expandedSections.has(`stores_${section.key}`);
      const itemCount = this._getDataItemCount(data);
      const matchesSearch = this._matchesSearch(section.title, data);

      if (this._searchQuery && !matchesSearch) continue;

      const titleWithDelete = `${section.title} <button class="council-data-action-btn danger inline" onclick="DataViewer.deleteStore('${section.key}')">🗑️ Delete</button>`;

      html += this._renderSection(
        `stores_${section.key}`,
        titleWithDelete,
        itemCount,
        this._renderDataValue(data, section.key),
        isExpanded,
      );
    }

    if (!html) {
      html = '<div class="council-data-empty">No matching data found</div>';
    }

    // Add actions
    html += `
      <div class="council-data-actions">
        <button class="council-data-action-btn" onclick="DataViewer.exportStores()">📥 Export Stores</button>
        <button class="council-data-action-btn" onclick="DataViewer.importStores()">📤 Import Stores</button>
        <button class="council-data-action-btn" onclick="DataViewer.createBackup()">💾 Create Backup</button>
        <button class="council-data-action-btn danger" onclick="DataViewer.clearStores()">🗑️ Clear All</button>
      </div>
    `;

    content.innerHTML = html;

    // Bind section toggle events
    this._bindSectionEvents();
  },

  /**
   * Render the context tab
   */
  _renderContextTab() {
    const content = document.getElementById("council-data-content");
    if (!content) return;

    if (!this._contextManager) {
      content.innerHTML =
        '<div class="council-data-empty">Context Manager not available</div>';
      return;
    }

    const summary = this._contextManager.getSummary();
    let html = "";

    // Static context
    const staticData = this._contextManager.getAllStatic();
    html += this._renderSection(
      "context_static",
      "🔒 Static Context (Read-Only)",
      Object.keys(staticData).length,
      this._renderDataValue(staticData, "static"),
      this._expandedSections.has("context_static"),
    );

    // Global context
    const globalData = this._contextManager.getAllGlobal();
    html += this._renderSection(
      "context_global",
      "🌐 Global Context",
      Object.keys(globalData).length,
      this._renderDataValue(globalData, "global"),
      this._expandedSections.has("context_global"),
    );

    // Phase context
    const currentPhase = this._contextManager.getCurrentPhaseId();
    if (currentPhase) {
      const phaseData = this._contextManager.getAllPhase(currentPhase);
      html += this._renderSection(
        "context_phase",
        `📋 Phase Context (${currentPhase})`,
        Object.keys(phaseData).length,
        this._renderDataValue(phaseData, "phase"),
        this._expandedSections.has("context_phase"),
      );
    }

    // Team contexts
    const teamBlocks = summary.blockCounts.team || {};
    for (const [teamId, count] of Object.entries(teamBlocks)) {
      const teamData = this._contextManager.getAllTeam(teamId);
      html += this._renderSection(
        `context_team_${teamId}`,
        `👥 Team Context: ${teamId}`,
        count,
        this._renderDataValue(teamData, `team_${teamId}`),
        this._expandedSections.has(`context_team_${teamId}`),
      );
    }

    // Summary
    html += this._renderSection(
      "context_summary",
      "📊 Context Summary",
      0,
      this._renderDataValue(summary, "summary"),
      this._expandedSections.has("context_summary"),
    );

    if (!html) {
      html = '<div class="council-data-empty">No context data</div>';
    }

    content.innerHTML = html;
    this._bindSectionEvents();
  },

  /**
   * Render the outputs tab
   */
  _renderOutputsTab() {
    const content = document.getElementById("council-data-content");
    if (!content) return;

    if (!this._outputManager) {
      content.innerHTML =
        '<div class="council-data-empty">Output Manager not available</div>';
      return;
    }

    let html = "";

    // Permanent outputs
    const permanentBlocks = this._outputManager.getAllPermanentBlocks();
    for (const [blockId, block] of Object.entries(permanentBlocks)) {
      const hasContent = block.content !== null;
      html += this._renderSection(
        `output_${blockId}`,
        `${hasContent ? "✅" : "⏳"} ${block.name}`,
        hasContent ? 1 : 0,
        this._renderOutputBlock(block),
        this._expandedSections.has(`output_${blockId}`),
      );
    }

    // Phase outputs
    const phaseOutputs = this._outputManager.getAllPhaseOutputs();
    if (Object.keys(phaseOutputs).length > 0) {
      html += this._renderSection(
        "output_phases",
        "📋 Phase Outputs",
        Object.keys(phaseOutputs).length,
        this._renderDataValue(phaseOutputs, "phase_outputs"),
        this._expandedSections.has("output_phases"),
      );
    }

    // Summary
    const summary = this._outputManager.getSummary();
    html += this._renderSection(
      "output_summary",
      "📊 Output Summary",
      0,
      this._renderDataValue(summary, "output_summary"),
      this._expandedSections.has("output_summary"),
    );

    if (!html) {
      html = '<div class="council-data-empty">No output data</div>';
    }

    content.innerHTML = html;
    this._bindSectionEvents();
  },

  /**
   * Render the threads tab
   */
  _renderThreadsTab() {
    const content = document.getElementById("council-data-content");
    if (!content) return;

    if (!this._threadManager) {
      content.innerHTML =
        '<div class="council-data-empty">Thread Manager not available</div>';
      return;
    }

    const summary = this._threadManager.getSummary();
    let html = "";

    // Main phase threads
    const mainThreads = summary.mainPhaseThreads || {};
    for (const [phaseId, entryCount] of Object.entries(mainThreads)) {
      const thread = this._threadManager.getMainThread(phaseId);
      html += this._renderSection(
        `thread_main_${phaseId}`,
        `📝 Main Thread: ${phaseId}`,
        entryCount,
        this._renderThreadEntries(thread),
        this._expandedSections.has(`thread_main_${phaseId}`),
      );
    }

    // Global team threads
    const globalTeamThreads = summary.globalTeamThreads || {};
    for (const [teamId, entryCount] of Object.entries(globalTeamThreads)) {
      const thread = this._threadManager.getGlobalTeamThread(teamId);
      html += this._renderSection(
        `thread_team_${teamId}`,
        `👥 Team Thread: ${teamId}`,
        entryCount,
        this._renderThreadEntries(thread),
        this._expandedSections.has(`thread_team_${teamId}`),
      );
    }

    // Summary
    html += this._renderSection(
      "thread_summary",
      "📊 Thread Summary",
      0,
      this._renderDataValue(summary, "thread_summary"),
      this._expandedSections.has("thread_summary"),
    );

    if (!html) {
      html = '<div class="council-data-empty">No thread data</div>';
    }

    content.innerHTML = html;
    this._bindSectionEvents();
  },

  /**
   * Render the history tab
   */
  _renderHistoryTab() {
    const content = document.getElementById("council-data-content");
    if (!content) return;

    let html = "";

    // Session history from stores
    if (this._stores) {
      const sessionHistory = this._stores.get("sessionHistory") || [];
      html += this._renderSection(
        "history_sessions",
        "📜 Session History",
        sessionHistory.length,
        this._renderSessionHistory(sessionHistory),
        this._expandedSections.has("history_sessions"),
      );
    }

    // Stored stories list
    if (this._stores) {
      const storedStories = this._stores.listStoredStories?.() || [];
      html += this._renderSection(
        "history_stories",
        "💾 Stored Stories",
        storedStories.length,
        this._renderStoredStories(storedStories),
        this._expandedSections.has("history_stories"),
      );
    }

    // Context injection history
    if (this._contextManager) {
      const injectionHistory =
        this._contextManager.getInjectionHistory?.(20) || [];
      html += this._renderSection(
        "history_injections",
        "💉 Context Injections",
        injectionHistory.length,
        this._renderDataValue(injectionHistory, "injections"),
        this._expandedSections.has("history_injections"),
      );
    }

    // Output history
    if (this._outputManager) {
      const outputHistory = this._outputManager.getHistory?.(20) || [];
      html += this._renderSection(
        "history_outputs",
        "📤 Output History",
        outputHistory.length,
        this._renderDataValue(outputHistory, "output_history"),
        this._expandedSections.has("history_outputs"),
      );
    }

    if (!html) {
      html = '<div class="council-data-empty">No history data</div>';
    }

    content.innerHTML = html;
    this._bindSectionEvents();
  },

  // ===== RENDER HELPERS =====

  /**
   * Render a collapsible section
   */
  _renderSection(id, title, itemCount, contentHtml, isExpanded) {
    return `
      <div class="council-data-section ${isExpanded ? "expanded" : ""}" data-section="${id}">
        <div class="council-data-section-header">
          <div class="council-data-section-title">
            <span>${title}</span>
            ${itemCount > 0 ? `<span class="council-data-section-badge">${itemCount}</span>` : ""}
          </div>
          <span class="council-data-section-toggle">▼</span>
        </div>
        <div class="council-data-section-content">
          ${contentHtml}
        </div>
      </div>
    `;
  },

  /**
   * Render a data value (handles all types)
   */
  _renderDataValue(data, key) {
    if (data === null || data === undefined) {
      return '<span class="council-data-null">(empty)</span>';
    }

    if (typeof data === "string") {
      if (data.length === 0) {
        return '<span class="council-data-null">(empty string)</span>';
      }
      const highlighted = this._highlightSearch(data);
      return `<div class="council-data-item-value ${data.length > 200 ? "collapsed" : ""}">${this._escapeHtml(highlighted)}</div>`;
    }

    if (typeof data === "number") {
      return `<span class="council-data-number">${data}</span>`;
    }

    if (typeof data === "boolean") {
      return `<span class="council-data-boolean">${data}</span>`;
    }

    if (Array.isArray(data)) {
      if (data.length === 0) {
        return '<span class="council-data-null">(empty array)</span>';
      }
      return this._renderArray(data, key);
    }

    if (typeof data === "object") {
      if (Object.keys(data).length === 0) {
        return '<span class="council-data-null">(empty object)</span>';
      }
      return this._renderObject(data, key);
    }

    return `<span>${String(data)}</span>`;
  },

  /**
   * Render an array
   */
  _renderArray(arr, key) {
    let html = '<div class="council-data-tree">';

    for (let i = 0; i < arr.length; i++) {
      const item = arr[i];
      html += `<div class="council-data-item">`;
      html += `<div class="council-data-item-header">`;
      html += `<span class="council-data-item-key">[${i}]</span>`;
      html += `<span class="council-data-item-type">${typeof item}</span>`;
      html += `</div>`;
      html += this._renderDataValue(item, `${key}_${i}`);
      html += `</div>`;
    }

    html += "</div>";
    return html;
  },

  /**
   * Render an object
   */
  _renderObject(obj, key) {
    let html = '<div class="council-data-tree">';

    for (const [k, v] of Object.entries(obj)) {
      html += `<div class="council-data-item">`;
      html += `<div class="council-data-item-header">`;
      html += `<span class="council-data-item-key">${this._escapeHtml(k)}</span>`;
      html += `<span class="council-data-item-type">${Array.isArray(v) ? "array" : typeof v}</span>`;
      html += `</div>`;
      html += this._renderDataValue(v, `${key}_${k}`);
      html += `</div>`;
    }

    html += "</div>";
    return html;
  },

  /**
   * Render an output block
   */
  _renderOutputBlock(block) {
    let html = '<div class="council-data-card">';
    html += `<div class="council-data-card-content">`;
    html += `<div><strong>Type:</strong> ${block.type}</div>`;
    html += `<div><strong>Version:</strong> ${block.metadata?.version || 1}</div>`;
    html += `<div><strong>Updated:</strong> ${block.metadata?.updatedAt ? new Date(block.metadata.updatedAt).toLocaleString() : "Never"}</div>`;
    html += `<div><strong>Updated By:</strong> ${block.metadata?.updatedBy || "N/A"}</div>`;
    html += `</div>`;

    if (block.content !== null) {
      html += `<div style="margin-top: 8px;"><strong>Content:</strong></div>`;
      html += this._renderDataValue(block.content, `block_${block.id}`);
    }

    html += "</div>";
    return html;
  },

  /**
   * Render thread entries
   */
  _renderThreadEntries(thread) {
    if (!thread || !thread.entries || thread.entries.length === 0) {
      return '<div class="council-data-empty">No entries</div>';
    }

    let html = '<div class="council-data-tree">';

    for (const entry of thread.entries.slice(-20)) {
      const time = new Date(entry.timestamp).toLocaleTimeString();
      html += `<div class="council-data-item">`;
      html += `<div class="council-data-item-header">`;
      html += `<span class="council-data-item-key">[${time}] ${this._escapeHtml(entry.agentName)}</span>`;
      html += `<span class="council-data-item-type">${entry.entryType || "message"}</span>`;
      html += `</div>`;
      html += `<div class="council-data-item-value collapsed">${this._escapeHtml(entry.content)}</div>`;
      html += `</div>`;
    }

    html += "</div>";
    return html;
  },

  /**
   * Render session history
   */
  _renderSessionHistory(sessions) {
    if (!sessions || sessions.length === 0) {
      return '<div class="council-data-empty">No sessions recorded</div>';
    }

    let html = '<div class="council-data-grid">';

    for (const session of sessions.slice(-10).reverse()) {
      const date = new Date(session.timestamp).toLocaleString();
      html += `<div class="council-data-card">`;
      html += `<div class="council-data-card-title">📅 ${date}</div>`;
      html += `<div class="council-data-card-content">`;
      html += `<div><strong>Input:</strong> ${this._escapeHtml((session.userInput || "").substring(0, 100))}...</div>`;
      html += `<div><strong>Duration:</strong> ${session.duration ? Math.round(session.duration / 1000) + "s" : "N/A"}</div>`;
      html += `<div><strong>Phases:</strong> ${session.phasesCompleted || 0}</div>`;
      html += `</div>`;
      html += `</div>`;
    }

    html += "</div>";
    return html;
  },

  /**
   * Render stored stories list
   */
  _renderStoredStories(stories) {
    if (!stories || stories.length === 0) {
      return '<div class="council-data-empty">No stored stories</div>';
    }

    let html = '<div class="council-data-grid">';

    for (const story of stories) {
      const date = story.updatedAt
        ? new Date(story.updatedAt).toLocaleString()
        : "Unknown";
      const isCurrent = story.storyId === this._stores?.getStoryId();

      html += `<div class="council-data-card" style="${isCurrent ? "border-color: var(--SmartThemeQuoteColor, #7c7cff);" : ""}">`;
      html += `<div class="council-data-card-title">`;
      html += `${isCurrent ? "✅ " : ""}📖 ${this._escapeHtml(story.characterName || "Unknown")}`;
      html += `</div>`;
      html += `<div class="council-data-card-content">`;
      html += `<div><strong>ID:</strong> ${this._escapeHtml(story.storyId)}</div>`;
      html += `<div><strong>Updated:</strong> ${date}</div>`;
      html += `<div><strong>Source:</strong> ${story.source}</div>`;
      html += `</div>`;
      if (!isCurrent) {
        html += `<button class="council-data-action-btn" style="margin-top: 8px;" onclick="DataViewer.loadStory('${story.storyId}')">Load</button>`;
        html += `<button class="council-data-action-btn danger" style="margin-top: 8px;" onclick="DataViewer.deleteStory('${story.storyId}')">Delete</button>`;
      }
      html += `</div>`;
    }

    html += "</div>";
    return html;
  },

  /**
   * Bind section toggle events
   */
  _bindSectionEvents() {
    const sections = document.querySelectorAll(".council-data-section-header");
    sections.forEach((header) => {
      header.addEventListener("click", () => {
        const section = header.closest(".council-data-section");
        const sectionId = section.dataset.section;

        if (this._expandedSections.has(sectionId)) {
          this._expandedSections.delete(sectionId);
          section.classList.remove("expanded");
        } else {
          this._expandedSections.add(sectionId);
          section.classList.add("expanded");
        }
      });
    });

    // Bind value expand events
    const collapsedValues = document.querySelectorAll(
      ".council-data-item-value.collapsed",
    );
    collapsedValues.forEach((el) => {
      el.addEventListener("click", () => {
        el.classList.remove("collapsed");
      });
    });
  },

  // ===== UTILITY METHODS =====

  /**
   * Get item count for data
   */
  _getDataItemCount(data) {
    if (data === null || data === undefined) return 0;
    if (typeof data === "string") return data.length > 0 ? 1 : 0;
    if (Array.isArray(data)) return data.length;
    if (typeof data === "object") return Object.keys(data).length;
    return 1;
  },

  /**
   * Check if data matches search query
   */
  _matchesSearch(title, data) {
    if (!this._searchQuery) return true;

    const query = this._searchQuery.toLowerCase();

    if (title.toLowerCase().includes(query)) return true;

    const dataStr = JSON.stringify(data).toLowerCase();
    return dataStr.includes(query);
  },

  /**
   * Highlight search matches in text
   */
  _highlightSearch(text) {
    if (!this._searchQuery || !text) return text;

    const query = this._searchQuery;
    const regex = new RegExp(`(${this._escapeRegex(query)})`, "gi");
    return text.replace(
      regex,
      '<span class="council-data-highlight">$1</span>',
    );
  },

  /**
   * Escape HTML entities
   */
  _escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = String(text);
    return div.innerHTML;
  },

  /**
   * Escape regex special characters
   */
  _escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  },

  // ===== ACTION METHODS =====

  /**
   * Export all data
   */
  exportData() {
    const data = {
      exportedAt: Date.now(),
      stores: this._stores?.getAll(),
      context: this._contextManager?.export?.(),
      outputs: this._outputManager?.export?.(),
      threads: this._threadManager?.export?.(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `council_data_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  /**
   * Export stores only
   */
  exportStores() {
    this._stores?.exportToFile?.();
  },

  /**
   * Import stores
   */
  importStores() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (file && this._stores) {
        const success = await this._stores.importFromFile?.(file);
        if (success) {
          this.refresh();
          alert("Import successful!");
        } else {
          alert("Import failed. Check console for details.");
        }
      }
    };
    input.click();
  },

  /**
   * Create backup
   */
  createBackup() {
    this._stores?.createBackup?.();
    alert("Backup created!");
  },

  /**
   * Clear all stores
   */
  clearStores() {
    if (
      confirm(
        "Are you sure you want to clear all stores? This cannot be undone.",
      )
    ) {
      this._stores?.clear?.();
      this.refresh();
    }
  },

  deleteStore(storeName) {
    if (confirm(`Delete store "${storeName}"? This cannot be undone.`)) {
      if (this._stores?.set) {
        const defaults = this._stores.getEmptyStores?.() || {};
        const emptyValue =
          defaults[storeName] !== undefined ? defaults[storeName] : null;
        this._stores.set(storeName, emptyValue, true);
      }
      this.refresh();
    }
  },

  /**
   * Load a different story
   */
  loadStory(storyId) {
    if (confirm(`Load story "${storyId}"? Current data will be saved first.`)) {
      this._stores?.forceSave?.();
      this._stores?.init?.(storyId);
      this.refresh();
    }
  },

  deleteStory(storyId) {
    if (
      confirm(`Delete story "${storyId}" from storage? This cannot be undone.`)
    ) {
      this._stores?.deleteStory?.(storyId);
      this.refresh();
    }
  },
};

// Export for use in other modules
if (typeof window !== "undefined") {
  window.DataViewer = DataViewer;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = DataViewer;
}
