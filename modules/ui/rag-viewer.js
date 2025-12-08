// modules/ui/rag-viewer.js - RAG Request Viewer for The Council
// Displays pending and completed RAG requests from Record Keeper integration

const RAGViewer = {
  // ===== VERSION =====
  VERSION: "1.0.0",

  // ===== MODULE REFERENCES =====
  _executor: null,
  _state: null,
  _config: null,
  _threadManager: null,

  // ===== DOM REFERENCES =====
  _container: null,
  _modal: null,
  _isVisible: false,
  _initialized: false,

  // ===== STATE =====
  _requests: new Map(), // All RAG requests
  _pendingRequests: new Map(),
  _completedRequests: new Map(),
  _selectedRequestId: null,
  _filter: {
    status: "all", // 'all', 'pending', 'completed', 'error'
    phase: null,
    team: null,
  },

  // ===== CONSTANTS =====
  STATUS_ICONS: {
    pending: "⏳",
    in_progress: "🔄",
    completed: "✅",
    error: "❌",
    cancelled: "🚫",
  },

  STATUS_LABELS: {
    pending: "Pending",
    in_progress: "In Progress",
    completed: "Completed",
    error: "Error",
    cancelled: "Cancelled",
  },

  SCOPE_ICONS: {
    team: "👥",
    agent: "👤",
    phase: "📋",
  },

  // ===== INITIALIZATION =====

  /**
   * Initialize the RAG viewer
   * @param {Object} modules - Module references
   * @returns {RAGViewer}
   */
  init(modules = {}) {
    console.log("[RAG Viewer] Initializing...");

    this._executor = modules.executor || window.PipelineExecutor || null;
    this._state = modules.state || window.CouncilState || null;
    this._config = modules.config || window.CouncilConfig || null;
    this._threadManager = modules.threadManager || window.ThreadManager || null;

    // Create modal
    this._createModal();

    // Inject styles
    this._injectStyles();

    // Set up event listeners
    this._setupEventListeners();

    this._initialized = true;
    console.log("[RAG Viewer] Initialized");
    return this;
  },

  /**
   * Set up event listeners for real-time updates
   */
  _setupEventListeners() {
    // Listen to executor RAG events if available
    if (this._executor) {
      this._executor.on?.("rag:request", (data) => {
        this._handleRAGRequest(data);
      });

      this._executor.on?.("rag:response", (data) => {
        this._handleRAGResponse(data);
      });

      this._executor.on?.("rag:error", (data) => {
        this._handleRAGError(data);
      });
    }

    // Listen to state events
    if (this._state) {
      this._state.on?.("pipeline:start", () => {
        this._clearRequests();
      });
    }
  },

  // ===== EVENT HANDLERS =====

  /**
   * Handle new RAG request
   * @param {Object} data - Request data
   */
  _handleRAGRequest(data) {
    const request = {
      id:
        data.id ||
        `rag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: "pending",
      scope: data.scope || "team",
      phaseId: data.phaseId,
      teamId: data.teamId,
      agentId: data.agentId,
      query: data.query || "",
      contextManifest: data.contextManifest || null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      response: null,
      error: null,
    };

    this._requests.set(request.id, request);
    this._pendingRequests.set(request.id, request);

    if (this._isVisible) {
      this._render();
    }

    return request.id;
  },

  /**
   * Handle RAG response
   * @param {Object} data - Response data
   */
  _handleRAGResponse(data) {
    const request = this._requests.get(data.requestId);
    if (!request) return;

    request.status = "completed";
    request.response = data.response;
    request.updatedAt = Date.now();
    request.responseTime = request.updatedAt - request.createdAt;

    this._pendingRequests.delete(data.requestId);
    this._completedRequests.set(data.requestId, request);

    if (this._isVisible) {
      this._render();
    }
  },

  /**
   * Handle RAG error
   * @param {Object} data - Error data
   */
  _handleRAGError(data) {
    const request = this._requests.get(data.requestId);
    if (!request) return;

    request.status = "error";
    request.error = data.error;
    request.updatedAt = Date.now();

    this._pendingRequests.delete(data.requestId);
    this._completedRequests.set(data.requestId, request);

    if (this._isVisible) {
      this._render();
    }
  },

  /**
   * Clear all requests
   */
  _clearRequests() {
    this._requests.clear();
    this._pendingRequests.clear();
    this._completedRequests.clear();
    this._selectedRequestId = null;

    if (this._isVisible) {
      this._render();
    }
  },

  // ===== MODAL CREATION =====

  /**
   * Create the viewer modal
   */
  _createModal() {
    if (document.getElementById("council-rag-viewer-modal")) {
      this._modal = document.getElementById("council-rag-viewer-modal");
      return;
    }

    const modalHtml = `
      <div id="council-rag-viewer-modal" class="rag-viewer-modal">
        <div class="rag-viewer-container">
          <div class="rag-viewer-header">
            <h3>🔍 RAG Request Viewer</h3>
            <div class="rag-viewer-header-actions">
              <button class="rv-btn rv-btn-secondary" id="rv-clear-btn" title="Clear All">🗑️ Clear</button>
              <button class="rv-btn-icon" id="rv-close-btn" title="Close">×</button>
            </div>
          </div>

          <div class="rag-viewer-toolbar">
            <div class="rv-filter-group">
              <label>Status:</label>
              <select id="rv-filter-status" class="rv-select">
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="error">Error</option>
              </select>
            </div>
            <div class="rv-filter-group">
              <label>Phase:</label>
              <select id="rv-filter-phase" class="rv-select">
                <option value="">All Phases</option>
              </select>
            </div>
            <div class="rv-stats">
              <span class="rv-stat" id="rv-stat-pending">
                <span class="rv-stat-icon">⏳</span>
                <span class="rv-stat-value">0</span> pending
              </span>
              <span class="rv-stat" id="rv-stat-completed">
                <span class="rv-stat-icon">✅</span>
                <span class="rv-stat-value">0</span> completed
              </span>
              <span class="rv-stat" id="rv-stat-errors">
                <span class="rv-stat-icon">❌</span>
                <span class="rv-stat-value">0</span> errors
              </span>
            </div>
          </div>

          <div class="rag-viewer-body">
            <div class="rag-viewer-list" id="rv-request-list">
              <!-- Request list rendered here -->
            </div>
            <div class="rag-viewer-detail" id="rv-request-detail">
              <div class="rv-no-selection">
                <div class="rv-no-selection-icon">🔍</div>
                <div class="rv-no-selection-text">Select a request to view details</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML("beforeend", modalHtml);
    this._modal = document.getElementById("council-rag-viewer-modal");

    // Bind events
    this._bindModalEvents();
  },

  /**
   * Bind modal events
   */
  _bindModalEvents() {
    // Close button
    document.getElementById("rv-close-btn")?.addEventListener("click", () => {
      this.hide();
    });

    // Clear button
    document.getElementById("rv-clear-btn")?.addEventListener("click", () => {
      if (confirm("Clear all RAG requests?")) {
        this._clearRequests();
      }
    });

    // Status filter
    document
      .getElementById("rv-filter-status")
      ?.addEventListener("change", (e) => {
        this._filter.status = e.target.value;
        this._renderRequestList();
      });

    // Phase filter
    document
      .getElementById("rv-filter-phase")
      ?.addEventListener("change", (e) => {
        this._filter.phase = e.target.value || null;
        this._renderRequestList();
      });

    // Click outside to close
    this._modal?.addEventListener("click", (e) => {
      if (e.target === this._modal) {
        this.hide();
      }
    });

    // Escape key to close
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this._isVisible) {
        this.hide();
      }
    });
  },

  // ===== RENDERING =====

  /**
   * Main render function
   */
  _render() {
    this._updateStats();
    this._updatePhaseFilter();
    this._renderRequestList();
    this._renderRequestDetail();
  },

  /**
   * Update stats display
   */
  _updateStats() {
    let pending = 0;
    let completed = 0;
    let errors = 0;

    for (const request of this._requests.values()) {
      switch (request.status) {
        case "pending":
        case "in_progress":
          pending++;
          break;
        case "completed":
          completed++;
          break;
        case "error":
          errors++;
          break;
      }
    }

    const pendingStat = document.querySelector(
      "#rv-stat-pending .rv-stat-value",
    );
    const completedStat = document.querySelector(
      "#rv-stat-completed .rv-stat-value",
    );
    const errorStat = document.querySelector("#rv-stat-errors .rv-stat-value");

    if (pendingStat) pendingStat.textContent = pending;
    if (completedStat) completedStat.textContent = completed;
    if (errorStat) errorStat.textContent = errors;
  },

  /**
   * Update phase filter dropdown
   */
  _updatePhaseFilter() {
    const select = document.getElementById("rv-filter-phase");
    if (!select) return;

    const phases = new Set();
    for (const request of this._requests.values()) {
      if (request.phaseId) {
        phases.add(request.phaseId);
      }
    }

    const currentValue = select.value;
    select.innerHTML = '<option value="">All Phases</option>';

    for (const phaseId of phases) {
      const option = document.createElement("option");
      option.value = phaseId;
      option.textContent = this._formatPhaseId(phaseId);
      select.appendChild(option);
    }

    select.value = currentValue;
  },

  /**
   * Render request list
   */
  _renderRequestList() {
    const listEl = document.getElementById("rv-request-list");
    if (!listEl) return;

    // Filter requests
    const filtered = this._getFilteredRequests();

    if (filtered.length === 0) {
      listEl.innerHTML = `
        <div class="rv-empty-list">
          <div class="rv-empty-icon">🔍</div>
          <div class="rv-empty-text">No RAG requests</div>
          <div class="rv-empty-hint">Requests will appear here when the pipeline makes RAG calls</div>
        </div>
      `;
      return;
    }

    // Sort by created time (newest first)
    filtered.sort((a, b) => b.createdAt - a.createdAt);

    const html = filtered
      .map((request) => this._renderRequestItem(request))
      .join("");

    listEl.innerHTML = html;

    // Bind click events
    listEl.querySelectorAll(".rv-request-item").forEach((item) => {
      item.addEventListener("click", () => {
        const id = item.dataset.id;
        this._selectRequest(id);
      });
    });
  },

  /**
   * Get filtered requests
   * @returns {Array} Filtered requests
   */
  _getFilteredRequests() {
    const results = [];

    for (const request of this._requests.values()) {
      // Status filter
      if (this._filter.status !== "all") {
        if (this._filter.status === "pending") {
          if (
            request.status !== "pending" &&
            request.status !== "in_progress"
          ) {
            continue;
          }
        } else if (request.status !== this._filter.status) {
          continue;
        }
      }

      // Phase filter
      if (this._filter.phase && request.phaseId !== this._filter.phase) {
        continue;
      }

      results.push(request);
    }

    return results;
  },

  /**
   * Render a single request item
   * @param {Object} request - Request object
   * @returns {string} HTML string
   */
  _renderRequestItem(request) {
    const statusIcon = this.STATUS_ICONS[request.status] || "❓";
    const scopeIcon = this.SCOPE_ICONS[request.scope] || "📋";
    const isSelected = request.id === this._selectedRequestId;
    const time = new Date(request.createdAt).toLocaleTimeString();

    const queryPreview = request.query
      ? request.query.substring(0, 50) +
        (request.query.length > 50 ? "..." : "")
      : "No query";

    return `
      <div class="rv-request-item ${request.status} ${isSelected ? "selected" : ""}"
           data-id="${request.id}">
        <div class="rv-request-item-header">
          <span class="rv-request-status">${statusIcon}</span>
          <span class="rv-request-scope">${scopeIcon} ${request.scope}</span>
          <span class="rv-request-time">${time}</span>
        </div>
        <div class="rv-request-item-body">
          <div class="rv-request-phase">${this._formatPhaseId(request.phaseId)}</div>
          <div class="rv-request-query">${this._escapeHtml(queryPreview)}</div>
        </div>
        ${
          request.responseTime
            ? `
          <div class="rv-request-item-footer">
            <span class="rv-response-time">⏱️ ${request.responseTime}ms</span>
          </div>
        `
            : ""
        }
      </div>
    `;
  },

  /**
   * Render request detail
   */
  _renderRequestDetail() {
    const detailEl = document.getElementById("rv-request-detail");
    if (!detailEl) return;

    if (!this._selectedRequestId) {
      detailEl.innerHTML = `
        <div class="rv-no-selection">
          <div class="rv-no-selection-icon">🔍</div>
          <div class="rv-no-selection-text">Select a request to view details</div>
        </div>
      `;
      return;
    }

    const request = this._requests.get(this._selectedRequestId);
    if (!request) {
      this._selectedRequestId = null;
      this._renderRequestDetail();
      return;
    }

    const statusIcon = this.STATUS_ICONS[request.status] || "❓";
    const statusLabel = this.STATUS_LABELS[request.status] || "Unknown";
    const scopeIcon = this.SCOPE_ICONS[request.scope] || "📋";
    const createdTime = new Date(request.createdAt).toLocaleString();
    const updatedTime = new Date(request.updatedAt).toLocaleString();

    detailEl.innerHTML = `
      <div class="rv-detail-content">
        <div class="rv-detail-header">
          <div class="rv-detail-status ${request.status}">
            ${statusIcon} ${statusLabel}
          </div>
          <div class="rv-detail-scope">
            ${scopeIcon} Scope: ${request.scope}
          </div>
        </div>

        <div class="rv-detail-section">
          <h4>Request Info</h4>
          <div class="rv-detail-grid">
            <div class="rv-detail-label">ID:</div>
            <div class="rv-detail-value">${request.id}</div>

            <div class="rv-detail-label">Phase:</div>
            <div class="rv-detail-value">${this._formatPhaseId(request.phaseId)}</div>

            ${
              request.teamId
                ? `
              <div class="rv-detail-label">Team:</div>
              <div class="rv-detail-value">${request.teamId}</div>
            `
                : ""
            }

            ${
              request.agentId
                ? `
              <div class="rv-detail-label">Agent:</div>
              <div class="rv-detail-value">${request.agentId}</div>
            `
                : ""
            }

            <div class="rv-detail-label">Created:</div>
            <div class="rv-detail-value">${createdTime}</div>

            <div class="rv-detail-label">Updated:</div>
            <div class="rv-detail-value">${updatedTime}</div>

            ${
              request.responseTime
                ? `
              <div class="rv-detail-label">Response Time:</div>
              <div class="rv-detail-value">${request.responseTime}ms</div>
            `
                : ""
            }
          </div>
        </div>

        <div class="rv-detail-section">
          <h4>Query</h4>
          <div class="rv-detail-code">${this._escapeHtml(request.query) || "<em>No query</em>"}</div>
        </div>

        ${
          request.contextManifest
            ? `
          <div class="rv-detail-section">
            <h4>Context Manifest</h4>
            <div class="rv-detail-code">${this._escapeHtml(JSON.stringify(request.contextManifest, null, 2))}</div>
          </div>
        `
            : ""
        }

        ${
          request.response
            ? `
          <div class="rv-detail-section">
            <h4>Response</h4>
            <div class="rv-detail-code">${this._escapeHtml(
              typeof request.response === "string"
                ? request.response
                : JSON.stringify(request.response, null, 2),
            )}</div>
          </div>
        `
            : ""
        }

        ${
          request.error
            ? `
          <div class="rv-detail-section">
            <h4>Error</h4>
            <div class="rv-detail-error">${this._escapeHtml(request.error)}</div>
          </div>
        `
            : ""
        }
      </div>
    `;
  },

  /**
   * Select a request
   * @param {string} requestId - Request ID
   */
  _selectRequest(requestId) {
    this._selectedRequestId = requestId;
    this._renderRequestList();
    this._renderRequestDetail();
  },

  // ===== PUBLIC API =====

  /**
   * Add a RAG request (for manual testing or external use)
   * @param {Object} data - Request data
   * @returns {string} Request ID
   */
  addRequest(data) {
    return this._handleRAGRequest(data);
  },

  /**
   * Complete a RAG request
   * @param {string} requestId - Request ID
   * @param {any} response - Response data
   */
  completeRequest(requestId, response) {
    this._handleRAGResponse({ requestId, response });
  },

  /**
   * Mark a request as error
   * @param {string} requestId - Request ID
   * @param {string} error - Error message
   */
  errorRequest(requestId, error) {
    this._handleRAGError({ requestId, error });
  },

  /**
   * Get all requests
   * @returns {Array} All requests
   */
  getRequests() {
    return Array.from(this._requests.values());
  },

  /**
   * Get pending requests
   * @returns {Array} Pending requests
   */
  getPendingRequests() {
    return Array.from(this._pendingRequests.values());
  },

  /**
   * Get completed requests
   * @returns {Array} Completed requests
   */
  getCompletedRequests() {
    return Array.from(this._completedRequests.values());
  },

  // ===== VISIBILITY =====

  /**
   * Show the viewer modal
   */
  show() {
    this._render();

    if (this._modal) {
      this._modal.classList.add("visible");
    }
    this._isVisible = true;
  },

  /**
   * Hide the viewer modal
   */
  hide() {
    if (this._modal) {
      this._modal.classList.remove("visible");
    }
    this._isVisible = false;
  },

  /**
   * Toggle visibility
   */
  toggle() {
    if (this._isVisible) {
      this.hide();
    } else {
      this.show();
    }
  },

  /**
   * Check if visible
   */
  isVisible() {
    return this._isVisible;
  },

  // ===== HELPERS =====

  /**
   * Format phase ID to display name
   * @param {string} phaseId - Phase identifier
   * @returns {string} Formatted name
   */
  _formatPhaseId(phaseId) {
    if (!phaseId) return "Unknown Phase";
    return phaseId.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  },

  /**
   * Escape HTML
   */
  _escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  },

  /**
   * Check if initialized
   */
  isInitialized() {
    return this._initialized;
  },

  // ===== STYLES =====

  /**
   * Inject styles
   */
  _injectStyles() {
    if (document.getElementById("council-rag-viewer-styles")) return;

    const styles = `
      .rag-viewer-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        display: none;
        align-items: center;
        justify-content: center;
        z-index: 10000;
      }

      .rag-viewer-modal.visible {
        display: flex;
      }

      .rag-viewer-container {
        width: 90%;
        max-width: 1000px;
        height: 80%;
        max-height: 700px;
        background: var(--council-bg, #1a1a2e);
        border: 1px solid var(--council-border, #0f3460);
        border-radius: 8px;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      .rag-viewer-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        background: var(--council-header-bg, #16213e);
        border-bottom: 1px solid var(--council-border, #0f3460);
      }

      .rag-viewer-header h3 {
        margin: 0;
        color: var(--council-text, #e8e8e8);
      }

      .rag-viewer-header-actions {
        display: flex;
        gap: 8px;
      }

      .rag-viewer-toolbar {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 10px 16px;
        background: var(--council-bg-light, #1e2a4a);
        border-bottom: 1px solid var(--council-border, #0f3460);
        flex-wrap: wrap;
      }

      .rv-filter-group {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        color: var(--council-text, #e8e8e8);
      }

      .rv-select {
        padding: 4px 8px;
        background: var(--council-bg, #1a1a2e);
        border: 1px solid var(--council-border, #0f3460);
        border-radius: 4px;
        color: var(--council-text, #e8e8e8);
        font-size: 12px;
      }

      .rv-stats {
        display: flex;
        gap: 16px;
        margin-left: auto;
      }

      .rv-stat {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 12px;
        color: var(--council-text-muted, #a0a0a0);
      }

      .rv-stat-value {
        font-weight: 600;
        color: var(--council-text, #e8e8e8);
      }

      .rag-viewer-body {
        flex: 1;
        display: flex;
        overflow: hidden;
      }

      .rag-viewer-list {
        width: 320px;
        border-right: 1px solid var(--council-border, #0f3460);
        overflow-y: auto;
        padding: 8px;
      }

      .rag-viewer-detail {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
      }

      .rv-empty-list {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        color: var(--council-text-muted, #a0a0a0);
        text-align: center;
        padding: 20px;
      }

      .rv-empty-icon {
        font-size: 36px;
        margin-bottom: 12px;
      }

      .rv-empty-text {
        font-size: 14px;
        margin-bottom: 4px;
      }

      .rv-empty-hint {
        font-size: 11px;
        opacity: 0.7;
      }

      .rv-request-item {
        padding: 10px 12px;
        margin-bottom: 6px;
        border: 1px solid var(--council-border, #0f3460);
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .rv-request-item:hover {
        background: var(--council-hover, #1a2744);
      }

      .rv-request-item.selected {
        background: var(--council-accent, #4a9eff);
        border-color: var(--council-accent, #4a9eff);
      }

      .rv-request-item.pending {
        border-left: 3px solid var(--council-warning, #ffc107);
      }

      .rv-request-item.in_progress {
        border-left: 3px solid var(--council-info, #17a2b8);
      }

      .rv-request-item.completed {
        border-left: 3px solid var(--council-success, #4caf50);
      }

      .rv-request-item.error {
        border-left: 3px solid var(--council-error, #f44336);
      }

      .rv-request-item-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 6px;
        font-size: 11px;
      }

      .rv-request-status {
        font-size: 12px;
      }

      .rv-request-scope {
        color: var(--council-text-muted, #a0a0a0);
      }

      .rv-request-time {
        margin-left: auto;
        color: var(--council-text-muted, #a0a0a0);
      }

      .rv-request-item-body {
        font-size: 12px;
      }

      .rv-request-phase {
        font-weight: 500;
        color: var(--council-text, #e8e8e8);
        margin-bottom: 2px;
      }

      .rv-request-query {
        color: var(--council-text-muted, #a0a0a0);
        font-size: 11px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .rv-request-item-footer {
        margin-top: 6px;
        font-size: 10px;
        color: var(--council-text-muted, #a0a0a0);
      }

      .rv-no-selection {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        color: var(--council-text-muted, #a0a0a0);
      }

      .rv-no-selection-icon {
        font-size: 48px;
        margin-bottom: 16px;
      }

      .rv-no-selection-text {
        font-size: 14px;
      }

      .rv-detail-content {
        max-width: 600px;
      }

      .rv-detail-header {
        display: flex;
        align-items: center;
        gap: 16px;
        margin-bottom: 20px;
      }

      .rv-detail-status {
        font-size: 14px;
        font-weight: 500;
        padding: 6px 12px;
        border-radius: 4px;
        color: var(--council-text, #e8e8e8);
      }

      .rv-detail-status.pending {
        background: rgba(255, 193, 7, 0.2);
      }

      .rv-detail-status.in_progress {
        background: rgba(23, 162, 184, 0.2);
      }

      .rv-detail-status.completed {
        background: rgba(76, 175, 80, 0.2);
      }

      .rv-detail-status.error {
        background: rgba(244, 67, 54, 0.2);
      }

      .rv-detail-scope {
        font-size: 12px;
        color: var(--council-text-muted, #a0a0a0);
      }

      .rv-detail-section {
        margin-bottom: 20px;
      }

      .rv-detail-section h4 {
        font-size: 12px;
        font-weight: 600;
        color: var(--council-text, #e8e8e8);
        margin: 0 0 8px 0;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .rv-detail-grid {
        display: grid;
        grid-template-columns: 100px 1fr;
        gap: 6px 12px;
        font-size: 12px;
      }

      .rv-detail-label {
        color: var(--council-text-muted, #a0a0a0);
      }

      .rv-detail-value {
        color: var(--council-text, #e8e8e8);
        word-break: break-all;
      }

      .rv-detail-code {
        background: var(--council-bg-light, #1e2a4a);
        border: 1px solid var(--council-border, #0f3460);
        border-radius: 4px;
        padding: 12px;
        font-family: monospace;
        font-size: 11px;
        color: var(--council-text, #e8e8e8);
        white-space: pre-wrap;
        word-break: break-word;
        max-height: 200px;
        overflow-y: auto;
      }

      .rv-detail-error {
        background: rgba(244, 67, 54, 0.1);
        border: 1px solid var(--council-error, #f44336);
        border-radius: 4px;
        padding: 12px;
        font-size: 12px;
        color: var(--council-error, #f44336);
      }

      .rv-btn {
        padding: 6px 12px;
        border: 1px solid var(--council-border, #0f3460);
        border-radius: 4px;
        background: transparent;
        color: var(--council-text, #e8e8e8);
        cursor: pointer;
        font-size: 12px;
        transition: all 0.2s;
      }

      .rv-btn:hover {
        background: var(--council-hover, #1a2744);
      }

      .rv-btn-secondary {
        background: var(--council-bg-light, #1e2a4a);
      }

      .rv-btn-icon {
        background: transparent;
        border: none;
        padding: 4px 8px;
        cursor: pointer;
        font-size: 18px;
        color: var(--council-text-muted, #a0a0a0);
      }

      .rv-btn-icon:hover {
        color: var(--council-text, #e8e8e8);
      }

      /* Scrollbar styling */
      .rag-viewer-list::-webkit-scrollbar,
      .rag-viewer-detail::-webkit-scrollbar,
      .rv-detail-code::-webkit-scrollbar {
        width: 6px;
      }

      .rag-viewer-list::-webkit-scrollbar-track,
      .rag-viewer-detail::-webkit-scrollbar-track,
      .rv-detail-code::-webkit-scrollbar-track {
        background: var(--council-bg, #1a1a2e);
      }

      .rag-viewer-list::-webkit-scrollbar-thumb,
      .rag-viewer-detail::-webkit-scrollbar-thumb,
      .rv-detail-code::-webkit-scrollbar-thumb {
        background: var(--council-border, #0f3460);
        border-radius: 3px;
      }

      .rag-viewer-list::-webkit-scrollbar-thumb:hover,
      .rag-viewer-detail::-webkit-scrollbar-thumb:hover,
      .rv-detail-code::-webkit-scrollbar-thumb:hover {
        background: var(--council-accent, #4a9eff);
      }
    `;

    const styleEl = document.createElement("style");
    styleEl.id = "council-rag-viewer-styles";
    styleEl.textContent = styles;
    document.head.appendChild(styleEl);
  },

  /**
   * Destroy and cleanup
   */
  destroy() {
    this._modal?.remove();
    document.getElementById("council-rag-viewer-styles")?.remove();
    this._modal = null;
    this._requests.clear();
    this._pendingRequests.clear();
    this._completedRequests.clear();
    this._initialized = false;
    console.log("[RAG Viewer] Destroyed");
  },
};

// Export for use in other modules
if (typeof window !== "undefined") {
  window.RAGViewer = RAGViewer;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = RAGViewer;
}
