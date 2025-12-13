/**
 * TheCouncil - Injection Modal UI
 *
 * UI for configuring Mode 3 (Injection) token mappings:
 * - Map ST tokens to RAG pipelines
 * - Configure injection settings
 * - Enable/disable injection mode
 * - View injection status and history
 *
 * @version 2.0.0
 */

const InjectionModal = {
  // ===== VERSION =====
  VERSION: "2.0.0",

  // ===== STATE =====

  /**
   * Modal visibility state
   * @type {boolean}
   */
  _isVisible: false,

  /**
   * DOM element references
   * @type {Object}
   */
  _elements: {
    container: null,
    backdrop: null,
    content: null,
    mappingsList: null,
    enableToggle: null,
    statusIndicator: null,
  },

  /**
   * Reference to OrchestrationSystem
   * @type {Object|null}
   */
  _orchestrationSystem: null,

  /**
   * Reference to CurationSystem
   * @type {Object|null}
   */
  _curationSystem: null,

  /**
   * Reference to Logger
   * @type {Object|null}
   */
  _logger: null,

  /**
   * Reference to Kernel
   * @type {Object|null}
   */
  _kernel: null,

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

  // ===== INITIALIZATION =====

  /**
   * Initialize the Injection Modal
   * @param {Object} options - Configuration options
   * @param {Object} options.kernel - Kernel instance
   * @param {Object} options.orchestrationSystem - OrchestrationSystem reference
   * @param {Object} options.curationSystem - CurationSystem reference
   * @param {Object} options.logger - Logger instance
   * @returns {InjectionModal}
   */
  init(options = {}) {
    if (this._initialized) {
      this._log("warn", "InjectionModal already initialized");
      return this;
    }

    this._kernel = options.kernel || null;
    this._orchestrationSystem = options.orchestrationSystem ||
      (this._kernel && this._kernel.getSystem("orchestration")) ||
      window.OrchestrationSystem;
    this._curationSystem = options.curationSystem ||
      (this._kernel && this._kernel.getSystem("curation")) ||
      window.CurationSystem;

    // Get logger
    if (this._kernel && !options.logger) {
      this._logger = this._kernel.getModule("logger");
    } else {
      this._logger = options.logger;
    }

    this._log("info", "Initializing Injection Modal...");

    // Create modal DOM
    this._createModal();

    // Subscribe to events
    this._subscribeToEvents();

    // Register with Kernel modal system
    if (this._kernel && this._kernel.registerModal) {
      this._kernel.registerModal("injection", this);
      this._log("debug", "Registered with Kernel modal system");
    }

    this._initialized = true;
    this._log("info", "Injection Modal initialized");

    return this;
  },

  /**
   * Destroy the modal and clean up
   */
  destroy() {
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
      backdrop: null,
      content: null,
      mappingsList: null,
      enableToggle: null,
      statusIndicator: null,
    };

    this._initialized = false;
    this._log("info", "Injection Modal destroyed");
  },

  // ===== MODAL CREATION =====

  /**
   * Create the modal DOM structure
   */
  _createModal() {
    // Create container
    const container = document.createElement("div");
    container.id = "council-injection-modal";
    container.className = "council-modal council-injection-modal";
    container.style.display = "none";

    // Create backdrop
    const backdrop = document.createElement("div");
    backdrop.className = "council-modal-backdrop";
    backdrop.addEventListener("click", () => this.hide());

    // Create content wrapper
    const content = document.createElement("div");
    content.className = "council-modal-content council-injection-content";

    content.innerHTML = `
      <div class="council-modal-header">
        <h2>Context Injection (Mode 3)</h2>
        <div class="council-modal-header-actions">
          <label class="council-toggle-label">
            <input type="checkbox" id="council-injection-enable-toggle" />
            <span class="council-toggle-slider"></span>
            <span class="council-toggle-text">Enable Injection</span>
          </label>
          <button class="council-modal-close" title="Close">&times;</button>
        </div>
      </div>

      <div class="council-modal-body">
        <div class="council-injection-status" id="council-injection-status">
          <div class="council-status-indicator" id="council-injection-status-indicator">
            <span class="status-dot"></span>
            <span class="status-text">Injection Disabled</span>
          </div>
          <div class="council-status-info">
            <span id="council-injection-mapping-count">0 mappings configured</span>
          </div>
        </div>

        <div class="council-injection-description">
          <p>Map SillyTavern tokens to Curation RAG pipelines. When injection is enabled,
          the mapped tokens will be replaced with relevant data from your knowledge base
          before each generation.</p>
        </div>

        <div class="council-injection-mappings-section">
          <div class="council-section-header">
            <h3>Token Mappings</h3>
            <button class="council-btn council-btn-primary" id="council-add-mapping-btn">
              <i class="fa fa-plus"></i> Add Mapping
            </button>
          </div>

          <div class="council-mappings-list" id="council-mappings-list">
            <!-- Mappings will be rendered here -->
            <div class="council-empty-state" id="council-mappings-empty">
              <i class="fa fa-link-slash"></i>
              <p>No token mappings configured</p>
              <p class="council-empty-hint">Click "Add Mapping" to map ST tokens to RAG pipelines</p>
            </div>
          </div>
        </div>

        <div class="council-injection-quick-add">
          <h4>Quick Add Common Mappings</h4>
          <div class="council-quick-add-buttons" id="council-quick-add-buttons">
            <!-- Quick add buttons will be rendered here -->
          </div>
        </div>
      </div>

      <div class="council-modal-footer">
        <div class="council-footer-info">
          <span id="council-injection-last-run">Last injection: Never</span>
        </div>
        <div class="council-footer-actions">
          <button class="council-btn council-btn-secondary" id="council-injection-test-btn">
            <i class="fa fa-flask"></i> Test Injection
          </button>
          <button class="council-btn council-btn-secondary" id="council-injection-clear-btn">
            <i class="fa fa-trash"></i> Clear All
          </button>
        </div>
      </div>
    `;

    // Append elements
    container.appendChild(backdrop);
    container.appendChild(content);
    document.body.appendChild(container);

    // Store references
    this._elements.container = container;
    this._elements.backdrop = backdrop;
    this._elements.content = content;
    this._elements.mappingsList = content.querySelector("#council-mappings-list");
    this._elements.enableToggle = content.querySelector("#council-injection-enable-toggle");
    this._elements.statusIndicator = content.querySelector("#council-injection-status-indicator");

    // Bind event handlers
    this._bindEventHandlers(content);

    // Inject styles
    this._injectStyles();
  },

  /**
   * Bind event handlers to modal elements
   * @param {HTMLElement} content - Modal content element
   */
  _bindEventHandlers(content) {
    // Close button
    const closeBtn = content.querySelector(".council-modal-close");
    closeBtn.addEventListener("click", () => this.hide());

    // Enable toggle
    this._elements.enableToggle.addEventListener("change", (e) => {
      this._onEnableToggle(e.target.checked);
    });

    // Add mapping button
    const addMappingBtn = content.querySelector("#council-add-mapping-btn");
    addMappingBtn.addEventListener("click", () => this._showAddMappingDialog());

    // Test injection button
    const testBtn = content.querySelector("#council-injection-test-btn");
    testBtn.addEventListener("click", () => this._testInjection());

    // Clear all button
    const clearBtn = content.querySelector("#council-injection-clear-btn");
    clearBtn.addEventListener("click", () => this._clearAllMappings());

    // Escape key to close
    const escHandler = (e) => {
      if (e.key === "Escape" && this._isVisible) {
        this.hide();
      }
    };
    document.addEventListener("keydown", escHandler);
    this._cleanupFns.push(() => document.removeEventListener("keydown", escHandler));
  },

  /**
   * Inject modal styles
   */
  _injectStyles() {
    if (document.getElementById("council-injection-modal-styles")) return;

    const style = document.createElement("style");
    style.id = "council-injection-modal-styles";
    style.textContent = `
      .council-injection-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .council-injection-content {
        background: var(--SmartThemeBlurTintColor, #1a1a2e);
        border-radius: 12px;
        width: 90%;
        max-width: 700px;
        max-height: 85vh;
        display: flex;
        flex-direction: column;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        border: 1px solid var(--SmartThemeBorderColor, #333);
      }

      .council-injection-modal .council-modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 20px;
        border-bottom: 1px solid var(--SmartThemeBorderColor, #333);
      }

      .council-injection-modal .council-modal-header h2 {
        margin: 0;
        font-size: 1.3em;
        color: var(--SmartThemeBodyColor, #eee);
      }

      .council-modal-header-actions {
        display: flex;
        align-items: center;
        gap: 16px;
      }

      .council-toggle-label {
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        user-select: none;
      }

      .council-toggle-label input {
        display: none;
      }

      .council-toggle-slider {
        width: 44px;
        height: 24px;
        background: var(--SmartThemeBorderColor, #444);
        border-radius: 12px;
        position: relative;
        transition: background 0.2s;
      }

      .council-toggle-slider::after {
        content: '';
        position: absolute;
        width: 20px;
        height: 20px;
        background: white;
        border-radius: 50%;
        top: 2px;
        left: 2px;
        transition: transform 0.2s;
      }

      .council-toggle-label input:checked + .council-toggle-slider {
        background: var(--SmartThemeQuoteColor, #4a90d9);
      }

      .council-toggle-label input:checked + .council-toggle-slider::after {
        transform: translateX(20px);
      }

      .council-toggle-text {
        color: var(--SmartThemeBodyColor, #ccc);
        font-size: 0.9em;
      }

      .council-injection-modal .council-modal-body {
        flex: 1;
        overflow-y: auto;
        padding: 20px;
      }

      .council-injection-status {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        background: var(--SmartThemeBlurTintColor, rgba(0,0,0,0.2));
        border-radius: 8px;
        margin-bottom: 16px;
      }

      .council-status-indicator {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .council-status-indicator .status-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: #666;
      }

      .council-status-indicator.enabled .status-dot {
        background: #4caf50;
        box-shadow: 0 0 8px #4caf50;
      }

      .council-injection-description {
        color: var(--SmartThemeBodyColor, #aaa);
        font-size: 0.9em;
        margin-bottom: 20px;
        line-height: 1.5;
      }

      .council-injection-description p {
        margin: 0;
      }

      .council-section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
      }

      .council-section-header h3 {
        margin: 0;
        font-size: 1.1em;
        color: var(--SmartThemeBodyColor, #eee);
      }

      .council-mappings-list {
        min-height: 150px;
        border: 1px solid var(--SmartThemeBorderColor, #333);
        border-radius: 8px;
        padding: 12px;
        margin-bottom: 20px;
      }

      .council-empty-state {
        text-align: center;
        padding: 30px;
        color: var(--SmartThemeBodyColor, #888);
      }

      .council-empty-state i {
        font-size: 2em;
        margin-bottom: 12px;
        opacity: 0.5;
      }

      .council-empty-state p {
        margin: 4px 0;
      }

      .council-empty-hint {
        font-size: 0.85em;
        opacity: 0.7;
      }

      .council-mapping-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px;
        background: var(--SmartThemeBlurTintColor, rgba(0,0,0,0.2));
        border-radius: 6px;
        margin-bottom: 8px;
      }

      .council-mapping-item:last-child {
        margin-bottom: 0;
      }

      .council-mapping-info {
        flex: 1;
      }

      .council-mapping-token {
        font-family: monospace;
        font-size: 1em;
        color: var(--SmartThemeQuoteColor, #4a90d9);
        margin-bottom: 4px;
      }

      .council-mapping-pipeline {
        font-size: 0.85em;
        color: var(--SmartThemeBodyColor, #aaa);
      }

      .council-mapping-actions {
        display: flex;
        gap: 8px;
      }

      .council-mapping-actions button {
        padding: 6px 10px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        background: var(--SmartThemeBorderColor, #444);
        color: var(--SmartThemeBodyColor, #ccc);
        transition: background 0.2s;
      }

      .council-mapping-actions button:hover {
        background: var(--SmartThemeQuoteColor, #4a90d9);
        color: white;
      }

      .council-mapping-actions button.delete:hover {
        background: #f44336;
      }

      .council-injection-quick-add {
        margin-top: 20px;
      }

      .council-injection-quick-add h4 {
        font-size: 0.95em;
        color: var(--SmartThemeBodyColor, #ccc);
        margin-bottom: 10px;
      }

      .council-quick-add-buttons {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .council-quick-add-btn {
        padding: 6px 12px;
        border: 1px solid var(--SmartThemeBorderColor, #444);
        border-radius: 4px;
        background: transparent;
        color: var(--SmartThemeBodyColor, #ccc);
        cursor: pointer;
        font-size: 0.85em;
        transition: all 0.2s;
      }

      .council-quick-add-btn:hover {
        background: var(--SmartThemeQuoteColor, #4a90d9);
        border-color: var(--SmartThemeQuoteColor, #4a90d9);
        color: white;
      }

      .council-quick-add-btn.mapped {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .council-injection-modal .council-modal-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 20px;
        border-top: 1px solid var(--SmartThemeBorderColor, #333);
      }

      .council-footer-info {
        font-size: 0.85em;
        color: var(--SmartThemeBodyColor, #888);
      }

      .council-footer-actions {
        display: flex;
        gap: 10px;
      }

      /* Add mapping dialog */
      .council-add-mapping-dialog {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: var(--SmartThemeBlurTintColor, #1a1a2e);
        border: 1px solid var(--SmartThemeBorderColor, #333);
        border-radius: 8px;
        padding: 20px;
        z-index: 10001;
        min-width: 400px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
      }

      .council-add-mapping-dialog h4 {
        margin: 0 0 16px 0;
        color: var(--SmartThemeBodyColor, #eee);
      }

      .council-dialog-field {
        margin-bottom: 16px;
      }

      .council-dialog-field label {
        display: block;
        margin-bottom: 6px;
        color: var(--SmartThemeBodyColor, #ccc);
        font-size: 0.9em;
      }

      .council-dialog-field select,
      .council-dialog-field input {
        width: 100%;
        padding: 8px 12px;
        border: 1px solid var(--SmartThemeBorderColor, #444);
        border-radius: 4px;
        background: var(--SmartThemeBlurTintColor, #222);
        color: var(--SmartThemeBodyColor, #eee);
        font-size: 0.95em;
      }

      .council-dialog-actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        margin-top: 20px;
      }
    `;
    document.head.appendChild(style);
  },

  // ===== EVENT SUBSCRIPTIONS =====

  /**
   * Subscribe to system events
   */
  _subscribeToEvents() {
    if (this._kernel) {
      // Listen for injection configuration changes
      this._kernel.on("orchestration:injection:configured", () => this._refreshMappings());
      this._kernel.on("orchestration:injection:token_mapped", () => this._refreshMappings());
      this._kernel.on("orchestration:injection:token_unmapped", () => this._refreshMappings());
      this._kernel.on("orchestration:injection:enabled_changed", () => this._updateStatus());
      this._kernel.on("orchestration:interceptor:complete", () => this._updateLastRun());
    }
  },

  // ===== PUBLIC METHODS =====

  /**
   * Show the modal
   */
  show() {
    if (!this._elements.container) return;

    this._elements.container.style.display = "flex";
    this._isVisible = true;

    // Refresh data
    this._refreshMappings();
    this._updateStatus();
    this._renderQuickAddButtons();
    this._updateLastRun();

    this._log("debug", "Injection Modal shown");
  },

  /**
   * Hide the modal
   */
  hide() {
    if (!this._elements.container) return;

    this._elements.container.style.display = "none";
    this._isVisible = false;

    this._log("debug", "Injection Modal hidden");
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

  // ===== UI UPDATE METHODS =====

  /**
   * Refresh the mappings list
   */
  _refreshMappings() {
    if (!this._orchestrationSystem || !this._elements.mappingsList) return;

    const mappings = this._orchestrationSystem.getInjectionMappings();
    const mappingKeys = Object.keys(mappings);

    // Update count
    const countEl = document.getElementById("council-injection-mapping-count");
    if (countEl) {
      countEl.textContent = `${mappingKeys.length} mapping${mappingKeys.length !== 1 ? 's' : ''} configured`;
    }

    // Clear list
    this._elements.mappingsList.innerHTML = "";

    if (mappingKeys.length === 0) {
      this._elements.mappingsList.innerHTML = `
        <div class="council-empty-state" id="council-mappings-empty">
          <i class="fa fa-link-slash"></i>
          <p>No token mappings configured</p>
          <p class="council-empty-hint">Click "Add Mapping" to map ST tokens to RAG pipelines</p>
        </div>
      `;
      return;
    }

    // Render each mapping
    for (const [token, config] of Object.entries(mappings)) {
      const item = this._createMappingItem(token, config);
      this._elements.mappingsList.appendChild(item);
    }
  },

  /**
   * Create a mapping item element
   * @param {string} token - Token name
   * @param {Object} config - Mapping configuration
   * @returns {HTMLElement}
   */
  _createMappingItem(token, config) {
    const item = document.createElement("div");
    item.className = "council-mapping-item";
    item.dataset.token = token;

    item.innerHTML = `
      <div class="council-mapping-info">
        <div class="council-mapping-token">{{${token}}}</div>
        <div class="council-mapping-pipeline">
          <i class="fa fa-arrow-right"></i> ${config.ragPipelineId}
          <span class="council-mapping-meta">(max: ${config.maxResults}, format: ${config.format})</span>
        </div>
      </div>
      <div class="council-mapping-actions">
        <button class="edit" title="Edit mapping"><i class="fa fa-edit"></i></button>
        <button class="delete" title="Remove mapping"><i class="fa fa-trash"></i></button>
      </div>
    `;

    // Bind actions
    item.querySelector(".edit").addEventListener("click", () => this._editMapping(token));
    item.querySelector(".delete").addEventListener("click", () => this._deleteMapping(token));

    return item;
  },

  /**
   * Update status indicator
   */
  _updateStatus() {
    if (!this._orchestrationSystem) return;

    const enabled = this._orchestrationSystem.isInjectionEnabled();

    // Update toggle
    if (this._elements.enableToggle) {
      this._elements.enableToggle.checked = enabled;
    }

    // Update status indicator
    if (this._elements.statusIndicator) {
      this._elements.statusIndicator.classList.toggle("enabled", enabled);
      const statusText = this._elements.statusIndicator.querySelector(".status-text");
      if (statusText) {
        statusText.textContent = enabled ? "Injection Active" : "Injection Disabled";
      }
    }
  },

  /**
   * Update last run time
   */
  _updateLastRun() {
    const lastRunEl = document.getElementById("council-injection-last-run");
    if (!lastRunEl || !this._orchestrationSystem) return;

    const summary = this._orchestrationSystem.getSummary();
    const lastTime = summary.injection?.lastInjectionTime;

    if (lastTime) {
      const date = new Date(lastTime);
      lastRunEl.textContent = `Last injection: ${date.toLocaleTimeString()}`;
    } else {
      lastRunEl.textContent = "Last injection: Never";
    }
  },

  /**
   * Render quick add buttons for common tokens
   */
  _renderQuickAddButtons() {
    const container = document.getElementById("council-quick-add-buttons");
    if (!container || !this._orchestrationSystem) return;

    container.innerHTML = "";

    const commonTokens = this._orchestrationSystem.getCommonSTTokens();
    const currentMappings = this._orchestrationSystem.getInjectionMappings();

    for (const { token, description } of commonTokens) {
      const btn = document.createElement("button");
      btn.className = "council-quick-add-btn";
      btn.title = description;
      btn.textContent = `{{${token}}}`;

      if (currentMappings[token]) {
        btn.classList.add("mapped");
        btn.title = `Already mapped to ${currentMappings[token].ragPipelineId}`;
      } else {
        btn.addEventListener("click", () => this._quickAddMapping(token));
      }

      container.appendChild(btn);
    }
  },

  // ===== ACTION HANDLERS =====

  /**
   * Handle enable toggle change
   * @param {boolean} enabled - New enabled state
   */
  _onEnableToggle(enabled) {
    if (this._orchestrationSystem) {
      this._orchestrationSystem.setInjectionEnabled(enabled);
      this._updateStatus();
    }
  },

  /**
   * Show add mapping dialog
   * @param {Object} preFill - Optional pre-fill data for editing
   * @param {string} preFill.token - Token name
   * @param {string} preFill.ragPipelineId - RAG pipeline ID
   * @param {number} preFill.maxResults - Max results
   * @param {string} preFill.format - Output format
   * @param {boolean} preFill.isEdit - Whether this is an edit operation
   */
  _showAddMappingDialog(preFill = {}) {
    // Get available RAG pipelines
    const ragPipelines = this._orchestrationSystem?.getAvailableRAGPipelines() || [];
    const commonTokens = this._orchestrationSystem?.getCommonSTTokens() || [];

    const isEdit = preFill.isEdit || false;
    const dialogTitle = isEdit ? "Edit Token Mapping" : "Add Token Mapping";
    const saveButtonText = isEdit ? "Save Changes" : "Add Mapping";

    // Create dialog
    const dialog = document.createElement("div");
    dialog.className = "council-add-mapping-dialog";
    dialog.innerHTML = `
      <h4>${dialogTitle}</h4>
      <div class="council-dialog-field">
        <label for="council-dialog-token">ST Token</label>
        <select id="council-dialog-token" ${isEdit ? 'disabled' : ''}>
          <option value="">-- Select or enter token --</option>
          ${commonTokens.map(t => `<option value="${t.token}"${preFill.token === t.token ? ' selected' : ''}>${t.token} - ${t.description}</option>`).join('')}
        </select>
      </div>
      <div class="council-dialog-field">
        <label for="council-dialog-custom-token">Or enter custom token</label>
        <input type="text" id="council-dialog-custom-token" placeholder="e.g., my_custom_token" value="${preFill.token && !commonTokens.find(t => t.token === preFill.token) ? preFill.token : ''}" ${isEdit ? 'disabled' : ''} />
      </div>
      <div class="council-dialog-field">
        <label for="council-dialog-pipeline">RAG Pipeline</label>
        <select id="council-dialog-pipeline">
          <option value="">-- Select RAG pipeline --</option>
          ${ragPipelines.map(p => `<option value="${p.id}"${preFill.ragPipelineId === p.id ? ' selected' : ''}>${p.name}</option>`).join('')}
          ${ragPipelines.length === 0 ? '<option value="" disabled>No RAG pipelines available</option>' : ''}
        </select>
      </div>
      <div class="council-dialog-field">
        <label for="council-dialog-max-results">Max Results</label>
        <input type="number" id="council-dialog-max-results" value="${preFill.maxResults || 5}" min="1" max="50" />
      </div>
      <div class="council-dialog-field">
        <label for="council-dialog-format">Output Format</label>
        <select id="council-dialog-format">
          <option value="default"${preFill.format === 'default' || !preFill.format ? ' selected' : ''}>Default (JSON)</option>
          <option value="compact"${preFill.format === 'compact' ? ' selected' : ''}>Compact (Summary)</option>
          <option value="detailed"${preFill.format === 'detailed' ? ' selected' : ''}>Detailed (Formatted)</option>
          <option value="json"${preFill.format === 'json' ? ' selected' : ''}>Raw JSON</option>
        </select>
      </div>
      <div class="council-dialog-actions">
        <button class="council-btn council-btn-secondary" id="council-dialog-cancel">Cancel</button>
        <button class="council-btn council-btn-primary" id="council-dialog-save">${saveButtonText}</button>
      </div>
    `;

    // Add backdrop
    const dialogBackdrop = document.createElement("div");
    dialogBackdrop.className = "council-modal-backdrop";
    dialogBackdrop.style.zIndex = "10000";
    document.body.appendChild(dialogBackdrop);
    document.body.appendChild(dialog);

    // Bind events
    dialog.querySelector("#council-dialog-cancel").addEventListener("click", () => {
      dialog.remove();
      dialogBackdrop.remove();
    });

    dialogBackdrop.addEventListener("click", () => {
      dialog.remove();
      dialogBackdrop.remove();
    });

    dialog.querySelector("#council-dialog-save").addEventListener("click", () => {
      const tokenSelect = dialog.querySelector("#council-dialog-token").value;
      const customToken = dialog.querySelector("#council-dialog-custom-token").value.trim();
      const token = isEdit ? preFill.token : (customToken || tokenSelect);
      const pipelineId = dialog.querySelector("#council-dialog-pipeline").value;
      const maxResults = parseInt(dialog.querySelector("#council-dialog-max-results").value) || 5;
      const format = dialog.querySelector("#council-dialog-format").value;

      if (!token) {
        alert("Please select or enter a token name");
        return;
      }

      if (!pipelineId) {
        alert("Please select a RAG pipeline");
        return;
      }

      // Add or update the mapping
      this._orchestrationSystem.mapToken(token, {
        ragPipelineId: pipelineId,
        maxResults,
        format,
        enabled: true,
      });

      this._log("info", `${isEdit ? 'Updated' : 'Added'} mapping for token: ${token}`);

      // Close dialog
      dialog.remove();
      dialogBackdrop.remove();

      // Refresh
      this._refreshMappings();
      this._renderQuickAddButtons();
    });
  },

  /**
   * Quick add a mapping (with dialog for pipeline selection)
   * @param {string} token - Token to map
   */
  _quickAddMapping(token) {
    const ragPipelines = this._orchestrationSystem?.getAvailableRAGPipelines() || [];

    if (ragPipelines.length === 0) {
      alert("No RAG pipelines available. Please create one in the Curation System first.");
      return;
    }

    if (ragPipelines.length === 1) {
      // Auto-map to the only available pipeline
      this._orchestrationSystem.mapToken(token, {
        ragPipelineId: ragPipelines[0].id,
        maxResults: 5,
        format: 'default',
        enabled: true,
      });
      this._refreshMappings();
      this._renderQuickAddButtons();
    } else {
      // Show dialog with token pre-selected
      this._showAddMappingDialog();
      // Pre-select the token
      setTimeout(() => {
        const tokenSelect = document.querySelector("#council-dialog-token");
        if (tokenSelect) {
          tokenSelect.value = token;
        }
      }, 100);
    }
  },

  /**
   * Edit an existing mapping
   * @param {string} token - Token to edit
   */
  _editMapping(token) {
    if (!this._orchestrationSystem) return;

    // Get existing mapping configuration
    const mappings = this._orchestrationSystem.getInjectionMappings();
    const existingConfig = mappings[token];

    if (!existingConfig) {
      this._log("warn", `No mapping found for token: ${token}`);
      return;
    }

    this._log("info", `Editing mapping for token: ${token}`);

    // Show dialog with pre-filled values
    this._showAddMappingDialog({
      token: token,
      ragPipelineId: existingConfig.ragPipelineId,
      maxResults: existingConfig.maxResults || 5,
      format: existingConfig.format || 'default',
      isEdit: true
    });
  },

  /**
   * Delete a mapping
   * @param {string} token - Token to delete
   */
  _deleteMapping(token) {
    if (!this._orchestrationSystem) return;

    // Show confirmation dialog
    if (!confirm(`Are you sure you want to delete the mapping for {{${token}}}?`)) {
      this._log("debug", `Delete cancelled for token: ${token}`);
      return;
    }

    this._log("info", `Deleting mapping for token: ${token}`);
    this._orchestrationSystem.unmapToken(token);
    this._refreshMappings();
    this._renderQuickAddButtons();
  },

  /**
   * Clear all mappings
   */
  _clearAllMappings() {
    if (!confirm("Are you sure you want to clear all token mappings?")) {
      return;
    }

    if (this._orchestrationSystem) {
      this._orchestrationSystem.configureInjectionMappings({});
      this._refreshMappings();
      this._renderQuickAddButtons();
    }
  },

  /**
   * Test injection with a sample query
   */
  async _testInjection() {
    if (!this._orchestrationSystem) {
      alert("Orchestration System not available");
      return;
    }

    const mappings = this._orchestrationSystem.getInjectionMappings();
    if (Object.keys(mappings).length === 0) {
      alert("No token mappings configured. Add mappings first.");
      return;
    }

    const testQuery = prompt("Enter a test query for injection:", "What happened in the story?");
    if (!testQuery) return;

    this._log("info", "Testing injection with query:", testQuery);

    try {
      // Show loading state
      const testBtn = document.getElementById("council-injection-test-btn");
      if (testBtn) {
        testBtn.disabled = true;
        testBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Testing...';
      }

      // Execute injection RAG
      const context = { userInput: testQuery };
      const results = await this._orchestrationSystem.executeInjectionRAG(context);

      // Show results
      const resultText = Object.entries(results)
        .map(([pipelineId, result]) => `\n--- ${pipelineId} ---\n${result || '(no results)'}`)
        .join('\n');

      alert(`Injection Test Results:\n${resultText || 'No results returned'}`);

      // Reset button
      if (testBtn) {
        testBtn.disabled = false;
        testBtn.innerHTML = '<i class="fa fa-flask"></i> Test Injection';
      }

    } catch (error) {
      this._log("error", "Injection test failed:", error);
      alert(`Test failed: ${error.message}`);
    }
  },

  // ===== LOGGING =====

  /**
   * Log a message
   * @param {string} level - Log level
   * @param {...any} args - Arguments
   */
  _log(level, ...args) {
    if (this._logger) {
      this._logger.log(level, "[InjectionModal]", ...args);
    } else if (level !== "debug") {
      const method = level === "error" ? "error" : level === "warn" ? "warn" : "log";
      console[method]("[InjectionModal]", ...args);
    }
  },

  // ===== SUMMARY =====

  /**
   * Get modal summary
   * @returns {Object}
   */
  getSummary() {
    return {
      version: this.VERSION,
      initialized: this._initialized,
      visible: this._isVisible,
    };
  },
};

// ===== EXPORT =====

if (typeof window !== "undefined") {
  window.InjectionModal = InjectionModal;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = InjectionModal;
}
