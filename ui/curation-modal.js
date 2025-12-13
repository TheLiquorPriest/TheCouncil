/**
 * TheCouncil - Curation System Modal UI
 *
 * Comprehensive UI for managing data stores:
 * - Store overview and statistics
 * - Browse/search store entries
 * - View/edit singleton stores
 * - CRUD operations for collection stores
 * - Import/export functionality
 * - RAG pipeline management
 *
 * @version 2.0.0
 */

const CurationModal = {
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
  _activeTab: "overview",

  /**
   * Currently selected store
   * @type {string|null}
   */
  _selectedStore: null,

  /**
   * Currently selected entry (for editing)
   * @type {string|null}
   */
  _selectedEntry: null,

  /**
   * Current search query
   * @type {string}
   */
  _searchQuery: "",

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
   * DOM element references
   * @type {Object}
   */
  _elements: {
    modal: null,
    overlay: null,
    container: null,
    tabs: null,
    content: null,
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
   * Reference to CurationPipelineBuilder instance
   * @type {Object|null}
   */
  _pipelineBuilderInstance: null,

  /**
   * Reference to PromptBuilder instance for agent editing
   * @type {Object|null}
   */
  _promptBuilderInstance: null,

  // ===== INITIALIZATION =====

  /**
   * Initialize the Curation Modal
   * @param {Object} options - Configuration options
   * @param {Object} options.curationSystem - Reference to CurationSystem
   * @param {Object} options.logger - Logger instance
   * @returns {CurationModal}
   */
  init(options = {}) {
    if (this._initialized) {
      this._log("warn", "CurationModal already initialized");
      return this;
    }

    this._kernel = options.kernel || null;
    this._curationSystem = options.curationSystem;
    this._logger = options.logger;

    if (!this._curationSystem) {
      this._log("error", "CurationSystem is required for CurationModal");
      return this;
    }

    this._log("info", "Initializing Curation Modal...");

    // Create modal DOM
    this._createModal();

    // Subscribe to CurationSystem events
    this._subscribeToEvents();

    // Register with Kernel modal system
    if (this._kernel && this._kernel.registerModal) {
      this._kernel.registerModal("curation", this);
      this._log("debug", "Registered with Kernel modal system");
    }

    this._initialized = true;
    this._log("info", "Curation Modal initialized");

    return this;
  },

  /**
   * Destroy the modal and clean up
   */
  destroy() {
    // Clean up pipeline builder instance
    if (this._pipelineBuilderInstance) {
      const CurationPipelineBuilder = window.CurationPipelineBuilder;
      if (CurationPipelineBuilder) {
        CurationPipelineBuilder.destroyInstance(
          this._pipelineBuilderInstance.id,
        );
      }
      this._pipelineBuilderInstance = null;
    }

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
    };

    this._initialized = false;
    this._log("info", "Curation Modal destroyed");
  },

  // ===== MODAL CREATION =====

  /**
   * Create the modal DOM structure
   */
  _createModal() {
    // Create overlay
    this._elements.overlay = document.createElement("div");
    this._elements.overlay.className = "council-curation-overlay";
    this._elements.overlay.addEventListener("click", () => this.hide());

    // Create modal container
    this._elements.modal = document.createElement("div");
    this._elements.modal.className = "council-curation-modal";
    this._elements.modal.innerHTML = this._getModalTemplate();

    // Append to body
    document.body.appendChild(this._elements.overlay);
    document.body.appendChild(this._elements.modal);

    // Cache element references
    this._elements.container = this._elements.modal.querySelector(
      ".council-curation-container",
    );
    this._elements.tabs = this._elements.modal.querySelector(
      ".council-curation-tabs",
    );
    this._elements.content = this._elements.modal.querySelector(
      ".council-curation-content",
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
      <div class="council-curation-container">
        <div class="council-curation-header">
          <h2 class="council-curation-title">
            <span class="council-curation-icon">📚</span>
            Curation System
          </h2>
          <div class="council-curation-header-actions">
            <button class="council-curation-btn council-curation-btn-icon" data-action="import" title="Import Data">
              📥
            </button>
            <button class="council-curation-btn council-curation-btn-icon" data-action="export" title="Export Data">
              📤
            </button>
            <button class="council-curation-btn council-curation-btn-icon" data-action="save-all" title="Save All">
              💾
            </button>
            <button class="council-curation-btn council-curation-btn-icon council-curation-close" data-action="close" title="Close">
              ✕
            </button>
          </div>
        </div>

        <div class="council-curation-tabs">
          <button class="council-curation-tab active" data-tab="overview">
            📊 Overview
          </button>
          <button class="council-curation-tab" data-tab="stores">
            📦 Stores
          </button>
          <button class="council-curation-tab" data-tab="search">
            🔍 Search
          </button>
          <button class="council-curation-tab" data-tab="team">
            🤖 Team
          </button>
          <button class="council-curation-tab" data-tab="pipelines">
            ⚡ Pipelines
          </button>
        </div>

        <div class="council-curation-content">
          <!-- Content rendered dynamically -->
        </div>

        <div class="council-curation-footer">
          <div class="council-curation-status">
            <span class="council-curation-status-text"></span>
          </div>
          <div class="council-curation-footer-actions">
            <button class="council-curation-btn council-curation-btn-secondary" data-action="close">
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
    modal.querySelectorAll(".council-curation-tab").forEach((tab) => {
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
   * Subscribe to CurationSystem events
   */
  _subscribeToEvents() {
    if (!this._curationSystem) return;

    const events = [
      "store:created",
      "store:updated",
      "store:deleted",
      "store:cleared",
      "stores:imported",
      "schema:registered",
    ];

    for (const event of events) {
      const unsubscribe = this._curationSystem.on(event, () => {
        this._refreshCurrentTab();
        this._updateStatus();
      });
      this._cleanupFns.push(unsubscribe);
    }
  },

  // ===== SHOW / HIDE =====

  /**
   * Show the modal
   */
  show() {
    if (!this._initialized) {
      this._log("error", "CurationModal not initialized");
      return;
    }

    this._isVisible = true;
    this._elements.overlay.classList.add("visible");
    this._elements.modal.classList.add("visible");

    // Refresh content
    this._refreshCurrentTab();
    this._updateStatus();

    this._log("info", "Curation Modal shown");
  },

  /**
   * Hide the modal
   */
  hide() {
    this._isVisible = false;
    this._elements.overlay.classList.remove("visible");
    this._elements.modal.classList.remove("visible");
    this._selectedStore = null;
    this._selectedEntry = null;

    this._log("info", "Curation Modal hidden");
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

  // ===== TAB MANAGEMENT =====

  /**
   * Switch to a tab
   * @param {string} tabName - Tab name
   * @param {Object} options - Options
   * @param {boolean} options.preserveStore - Preserve selected store
   * @param {boolean} options.preserveEntry - Preserve selected entry
   */
  _switchTab(tabName, options = {}) {
    this._activeTab = tabName;
    if (!options.preserveStore) {
      this._selectedStore = null;
    }
    if (!options.preserveEntry) {
      this._selectedEntry = null;
    }

    // Update tab buttons
    this._elements.tabs
      .querySelectorAll(".council-curation-tab")
      .forEach((tab) => {
        tab.classList.toggle("active", tab.dataset.tab === tabName);
      });

    // Render tab content
    this._refreshCurrentTab();
  },

  /**
   * Refresh current tab content
   */
  _refreshCurrentTab() {
    switch (this._activeTab) {
      case "overview":
        this._renderOverviewTab();
        break;
      case "stores":
        this._renderStoresTab();
        break;
      case "search":
        this._renderSearchTab();
        break;
      case "team":
        this._renderTeamTab();
        break;
      case "pipelines":
        this._renderPipelinesTab();
        break;
      default:
        this._renderOverviewTab();
    }
  },

  // ===== OVERVIEW TAB =====

  /**
   * Render overview tab
   */
  _renderOverviewTab() {
    const summary = this._curationSystem.getSummary();
    const schemas = this._curationSystem.getAllStoreSchemas();

    // Group stores by type
    const singletons = schemas.filter((s) => s.isSingleton);
    const collections = schemas.filter((s) => !s.isSingleton);

    this._elements.content.innerHTML = `
      <div class="council-curation-overview">
        <div class="council-overview-header">
          <div class="council-overview-stats">
            <div class="council-stat">
              <span class="council-stat-value">${summary.storeCount}</span>
              <span class="council-stat-label">Stores</span>
            </div>
            <div class="council-stat">
              <span class="council-stat-value">${singletons.length}</span>
              <span class="council-stat-label">Singletons</span>
            </div>
            <div class="council-stat">
              <span class="council-stat-value">${collections.length}</span>
              <span class="council-stat-label">Collections</span>
            </div>
            <div class="council-stat ${summary.dirtyStoreCount > 0 ? "warning" : "success"}">
              <span class="council-stat-value">${summary.dirtyStoreCount > 0 ? summary.dirtyStoreCount : "✓"}</span>
              <span class="council-stat-label">${summary.dirtyStoreCount > 0 ? "Unsaved" : "Saved"}</span>
            </div>
          </div>
        </div>

        <div class="council-overview-section">
          <h3 class="council-section-title">📄 Singleton Stores</h3>
          <div class="council-store-grid">
            ${singletons.map((s) => this._renderStoreCard(s, summary.stores[s.id])).join("")}
          </div>
        </div>

        <div class="council-overview-section">
          <h3 class="council-section-title">📦 Collection Stores</h3>
          <div class="council-store-grid">
            ${collections.map((s) => this._renderStoreCard(s, summary.stores[s.id])).join("")}
          </div>
        </div>

        ${
          summary.dirtyStoreCount > 0
            ? `
          <div class="council-curation-warning">
            <div class="council-warning-icon">⚠️</div>
            <div class="council-warning-content">
              <div class="council-warning-title">Unsaved Changes</div>
              <div class="council-warning-text">
                ${summary.dirtyStoreCount} store(s) have unsaved changes.
                <button class="council-curation-btn council-curation-btn-sm council-curation-btn-primary" data-action="save-all">
                  Save All
                </button>
              </div>
            </div>
          </div>
        `
            : ""
        }
      </div>
    `;

    this._bindContentEvents();
  },

  /**
   * Render a store card
   * @param {Object} schema - Store schema
   * @param {Object} info - Store info from summary
   * @returns {string} HTML
   */
  _renderStoreCard(schema, info) {
    return `
      <div class="council-store-card ${info?.isDirty ? "dirty" : ""}" data-store-id="${schema.id}">
        <div class="council-store-card-header">
          <span class="council-store-icon">${schema.icon || "📦"}</span>
          <span class="council-store-name">${this._escapeHtml(schema.name)}</span>
          ${info?.isDirty ? '<span class="council-dirty-badge">●</span>' : ""}
        </div>
        <div class="council-store-card-body">
          <div class="council-store-description">
            ${schema.description ? this._escapeHtml(schema.description) : '<em class="muted">No description</em>'}
          </div>
          <div class="council-store-meta">
            <div class="council-store-meta-item">
              <span class="council-meta-label">Type:</span>
              <span class="council-meta-value">${schema.isSingleton ? "Singleton" : "Collection"}</span>
            </div>
            <div class="council-store-meta-item">
              <span class="council-meta-label">${schema.isSingleton ? "Fields:" : "Entries:"}</span>
              <span class="council-meta-value">${schema.isSingleton ? Object.keys(schema.fields || {}).length : info?.count || 0}</span>
            </div>
          </div>
        </div>
        <div class="council-store-card-actions">
          <button class="council-curation-btn council-curation-btn-sm"
                  data-action="view-store"
                  data-id="${schema.id}">
            View
          </button>
          <button class="council-curation-btn council-curation-btn-sm"
                  data-action="clear-store"
                  data-id="${schema.id}">
            Clear
          </button>
        </div>
      </div>
    `;
  },

  // ===== STORES TAB =====

  /**
   * Render stores tab
   */
  _renderStoresTab() {
    if (this._selectedStore) {
      this._renderStoreDetail();
      return;
    }

    const schemas = this._curationSystem.getAllStoreSchemas();
    const summary = this._curationSystem.getSummary();

    this._elements.content.innerHTML = `
      <div class="council-stores-list-view">
        <div class="council-list-header">
          <h3>All Stores (${schemas.length})</h3>
        </div>

        <div class="council-stores-table">
          <div class="council-table-header">
            <div class="council-table-cell">Store</div>
            <div class="council-table-cell">Type</div>
            <div class="council-table-cell">Entries</div>
            <div class="council-table-cell">Status</div>
            <div class="council-table-cell">Actions</div>
          </div>
          ${schemas
            .map((schema) => {
              const info = summary.stores[schema.id];
              return `
              <div class="council-table-row" data-store-id="${schema.id}">
                <div class="council-table-cell">
                  <span class="council-store-icon">${schema.icon}</span>
                  <span>${this._escapeHtml(schema.name)}</span>
                </div>
                <div class="council-table-cell">
                  <span class="council-type-badge ${schema.isSingleton ? "singleton" : "collection"}">
                    ${schema.isSingleton ? "Singleton" : "Collection"}
                  </span>
                </div>
                <div class="council-table-cell">${info?.count || 0}</div>
                <div class="council-table-cell">
                  ${info?.isDirty ? '<span class="council-status-badge dirty">Unsaved</span>' : '<span class="council-status-badge saved">Saved</span>'}
                </div>
                <div class="council-table-cell">
                  <button class="council-curation-btn council-curation-btn-sm"
                          data-action="view-store"
                          data-id="${schema.id}">
                    View
                  </button>
                  ${
                    !schema.isSingleton
                      ? `
                    <button class="council-curation-btn council-curation-btn-sm council-curation-btn-primary"
                            data-action="create-entry"
                            data-store="${schema.id}">
                      + Add
                    </button>
                  `
                      : ""
                  }
                </div>
              </div>
            `;
            })
            .join("")}
        </div>
      </div>
    `;

    this._bindContentEvents();
  },

  /**
   * Render store detail view
   */
  _renderStoreDetail() {
    const schema = this._curationSystem.getStoreSchema(this._selectedStore);
    if (!schema) {
      this._selectedStore = null;
      this._renderStoresTab();
      return;
    }

    const data = this._curationSystem.read(this._selectedStore);

    if (schema.isSingleton) {
      this._renderSingletonStore(schema, data);
    } else {
      this._renderCollectionStore(schema, data);
    }
  },

  /**
   * Render singleton store view
   * @param {Object} schema - Store schema
   * @param {Object} data - Store data
   */
  _renderSingletonStore(schema, data) {
    this._elements.content.innerHTML = `
      <div class="council-store-detail">
        <div class="council-detail-header">
          <button class="council-curation-btn council-curation-btn-sm" data-action="back-to-stores">
            ← Back
          </button>
          <div class="council-detail-title">
            <span class="council-store-icon">${schema.icon}</span>
            <h3>${this._escapeHtml(schema.name)}</h3>
            <span class="council-type-badge singleton">Singleton</span>
          </div>
          <div class="council-detail-actions">
            <button class="council-curation-btn council-curation-btn-primary"
                    data-action="save-singleton"
                    data-store="${schema.id}">
              💾 Save
            </button>
          </div>
        </div>

        <div class="council-singleton-form">
          ${Object.entries(schema.fields || {})
            .map(([fieldName, fieldDef]) => {
              const value = data[fieldName];
              return this._renderFormField(
                fieldName,
                fieldDef,
                value,
                schema.id,
              );
            })
            .join("")}
        </div>
      </div>
    `;

    this._bindContentEvents();
  },

  /**
   * Render collection store view
   * @param {Object} schema - Store schema
   * @param {Object[]} data - Store entries
   */
  _renderCollectionStore(schema, data) {
    const entries = Array.isArray(data) ? data : [];

    this._elements.content.innerHTML = `
      <div class="council-store-detail">
        <div class="council-detail-header">
          <button class="council-curation-btn council-curation-btn-sm" data-action="back-to-stores">
            ← Back
          </button>
          <div class="council-detail-title">
            <span class="council-store-icon">${schema.icon}</span>
            <h3>${this._escapeHtml(schema.name)}</h3>
            <span class="council-type-badge collection">Collection</span>
            <span class="council-entry-count">${entries.length} entries</span>
          </div>
          <div class="council-detail-actions">
            <button class="council-curation-btn council-curation-btn-primary"
                    data-action="create-entry"
                    data-store="${schema.id}">
              + New Entry
            </button>
          </div>
        </div>

        <div class="council-collection-list">
          ${
            entries.length > 0
              ? entries
                  .map((entry) => this._renderCollectionEntry(schema, entry))
                  .join("")
              : `
              <div class="council-empty-state">
                <div class="council-empty-icon">📭</div>
                <div class="council-empty-text">No entries in this store</div>
                <button class="council-curation-btn council-curation-btn-primary"
                        data-action="create-entry"
                        data-store="${schema.id}">
                  Create First Entry
                </button>
              </div>
            `
          }
        </div>
      </div>
    `;

    this._bindContentEvents();
  },

  /**
   * Render a collection entry row
   * @param {Object} schema - Store schema
   * @param {Object} entry - Entry data
   * @returns {string} HTML
   */
  _renderCollectionEntry(schema, entry) {
    const key = entry[schema.primaryKey];
    const displayName =
      entry.name || entry.title || entry.id || key || "Untitled";
    const description =
      entry.description || entry.summary || entry.content || "";

    return `
      <div class="council-entry-row" data-entry-key="${this._escapeHtml(key)}">
        <div class="council-entry-main">
          <span class="council-entry-name">${this._escapeHtml(displayName)}</span>
          ${description ? `<span class="council-entry-preview">${this._escapeHtml(this._truncate(description, 100))}</span>` : ""}
        </div>
        <div class="council-entry-meta">
          ${entry.type ? `<span class="council-entry-type">${entry.type}</span>` : ""}
          ${entry.status ? `<span class="council-entry-status">${entry.status}</span>` : ""}
        </div>
        <div class="council-entry-actions">
          <button class="council-curation-btn council-curation-btn-sm"
                  data-action="edit-entry"
                  data-store="${schema.id}"
                  data-key="${this._escapeHtml(key)}">
            Edit
          </button>
          <button class="council-curation-btn council-curation-btn-sm council-curation-btn-danger"
                  data-action="delete-entry"
                  data-store="${schema.id}"
                  data-key="${this._escapeHtml(key)}">
            🗑️
          </button>
        </div>
      </div>
    `;
  },

  /**
   * Render a form field
   * @param {string} fieldName - Field name
   * @param {Object} fieldDef - Field definition
   * @param {*} value - Current value
   * @param {string} storeId - Store ID
   * @returns {string} HTML
   */
  _renderFormField(fieldName, fieldDef, value, storeId) {
    const type = fieldDef.type || "string";
    const label =
      fieldDef.label || fieldName.charAt(0).toUpperCase() + fieldName.slice(1);
    const description = fieldDef.description || "";
    const required = fieldDef.required ? "required" : "";

    let inputHtml = "";

    switch (type) {
      case "string":
        if (
          fieldName.includes("content") ||
          fieldName.includes("description") ||
          fieldName.includes("text")
        ) {
          inputHtml = `
            <textarea class="council-form-textarea council-form-textarea-large"
                      name="${fieldName}"
                      data-store="${storeId}"
                      ${required}
                      placeholder="${description}">${this._escapeHtml(value || "")}</textarea>
          `;
        } else {
          inputHtml = `
            <input type="text"
                   class="council-form-input"
                   name="${fieldName}"
                   data-store="${storeId}"
                   value="${this._escapeHtml(value || "")}"
                   ${required}
                   placeholder="${description}">
          `;
        }
        break;

      case "number":
        inputHtml = `
          <input type="number"
                 class="council-form-input"
                 name="${fieldName}"
                 data-store="${storeId}"
                 value="${value ?? ""}"
                 ${fieldDef.min !== undefined ? `min="${fieldDef.min}"` : ""}
                 ${fieldDef.max !== undefined ? `max="${fieldDef.max}"` : ""}
                 ${required}>
        `;
        break;

      case "boolean":
        inputHtml = `
          <label class="council-checkbox-label">
            <input type="checkbox"
                   name="${fieldName}"
                   data-store="${storeId}"
                   ${value ? "checked" : ""}>
            <span>${label}</span>
          </label>
        `;
        break;

      case "enum":
        inputHtml = `
          <select class="council-form-select"
                  name="${fieldName}"
                  data-store="${storeId}"
                  ${required}>
            ${(fieldDef.enumValues || [])
              .map(
                (v) => `
              <option value="${v}" ${value === v ? "selected" : ""}>${v}</option>
            `,
              )
              .join("")}
          </select>
        `;
        break;

      case "array":
        const arrayValue = Array.isArray(value) ? value.join("\n") : "";
        inputHtml = `
          <textarea class="council-form-textarea"
                    name="${fieldName}"
                    data-store="${storeId}"
                    data-type="array"
                    placeholder="One item per line">${this._escapeHtml(arrayValue)}</textarea>
          <div class="council-form-hint">Enter one item per line</div>
        `;
        break;

      case "object":
        inputHtml = `
          <textarea class="council-form-textarea council-form-textarea-large"
                    name="${fieldName}"
                    data-store="${storeId}"
                    data-type="object"
                    placeholder="JSON object">${this._escapeHtml(value ? JSON.stringify(value, null, 2) : "{}")}</textarea>
          <div class="council-form-hint">Enter valid JSON</div>
        `;
        break;

      case "date":
        const dateValue = value
          ? new Date(value).toISOString().slice(0, 16)
          : "";
        inputHtml = `
          <input type="datetime-local"
                 class="council-form-input"
                 name="${fieldName}"
                 data-store="${storeId}"
                 value="${dateValue}">
        `;
        break;

      default:
        inputHtml = `
          <input type="text"
                 class="council-form-input"
                 name="${fieldName}"
                 data-store="${storeId}"
                 value="${this._escapeHtml(String(value || ""))}"
                 ${required}>
        `;
    }

    return `
      <div class="council-form-group">
        <label class="council-form-label">
          ${label}
          ${fieldDef.required ? '<span class="council-required">*</span>' : ""}
        </label>
        ${inputHtml}
        ${description && type !== "boolean" ? `<div class="council-form-hint">${description}</div>` : ""}
      </div>
    `;
  },

  // ===== SEARCH TAB =====

  /**
   * Render search tab
   */
  _renderSearchTab() {
    const schemas = this._curationSystem.getAllStoreSchemas();

    this._elements.content.innerHTML = `
      <div class="council-search-view">
        <div class="council-search-header">
          <div class="council-search-input-row">
            <input type="text"
                   class="council-form-input council-search-input"
                   placeholder="Search across all stores..."
                   value="${this._escapeHtml(this._searchQuery)}">
            <button class="council-curation-btn council-curation-btn-primary" data-action="search">
              🔍 Search
            </button>
          </div>
          <div class="council-search-filters">
            <label class="council-form-label">Filter by store:</label>
            <select class="council-form-select council-search-store-filter">
              <option value="">All Stores</option>
              ${schemas.map((s) => `<option value="${s.id}">${s.icon} ${this._escapeHtml(s.name)}</option>`).join("")}
            </select>
          </div>
        </div>

        <div class="council-search-results">
          ${this._searchQuery ? this._renderSearchResults() : '<div class="council-empty-state"><div class="council-empty-icon">🔍</div><div class="council-empty-text">Enter a search term to find data across all stores</div></div>'}
        </div>
      </div>
    `;

    this._bindContentEvents();
    this._bindSearchEvents();
  },

  /**
   * Render search results
   * @returns {string} HTML
   */
  _renderSearchResults() {
    if (!this._searchQuery) return "";

    const storeFilter =
      this._elements.content?.querySelector(".council-search-store-filter")
        ?.value || null;
    const stores = storeFilter ? [storeFilter] : null;

    const results = this._curationSystem.search(stores, this._searchQuery, {
      sortByRelevance: true,
      limit: 50,
    });

    if (results.length === 0) {
      return `
        <div class="council-empty-state">
          <div class="council-empty-icon">😕</div>
          <div class="council-empty-text">No results found for "${this._escapeHtml(this._searchQuery)}"</div>
        </div>
      `;
    }

    return `
      <div class="council-results-count">${results.length} result(s) found</div>
      <div class="council-results-list">
        ${results.map((r) => this._renderSearchResult(r)).join("")}
      </div>
    `;
  },

  /**
   * Render a single search result
   * @param {Object} result - Search result
   * @returns {string} HTML
   */
  _renderSearchResult(result) {
    const displayName =
      result.entry.name || result.entry.title || result.key || "Untitled";
    const preview =
      result.entry.description ||
      result.entry.summary ||
      result.entry.content ||
      "";

    return `
      <div class="council-search-result" data-store="${result.storeId}" data-key="${result.key || ""}">
        <div class="council-result-header">
          <span class="council-result-store">${result.storeName}</span>
          <span class="council-result-name">${this._escapeHtml(displayName)}</span>
        </div>
        ${preview ? `<div class="council-result-preview">${this._escapeHtml(this._truncate(preview, 200))}</div>` : ""}
        <div class="council-result-actions">
          <button class="council-curation-btn council-curation-btn-sm"
                  data-action="view-result"
                  data-store="${result.storeId}"
                  data-key="${result.key || ""}">
            View
          </button>
        </div>
      </div>
    `;
  },

  /**
   * Bind search-specific events
   */
  _bindSearchEvents() {
    const content = this._elements.content;
    const searchInput = content?.querySelector(".council-search-input");
    const searchBtn = content?.querySelector('[data-action="search"]');
    const storeFilter = content?.querySelector(".council-search-store-filter");

    if (searchInput) {
      searchInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          this._searchQuery = searchInput.value;
          this._refreshCurrentTab();
        }
      });
    }

    if (searchBtn) {
      searchBtn.addEventListener("click", () => {
        this._searchQuery = searchInput?.value || "";
        this._refreshCurrentTab();
      });
    }

    if (storeFilter) {
      storeFilter.addEventListener("change", () => {
        if (this._searchQuery) {
          this._refreshCurrentTab();
        }
      });
    }
  },

  // ===== PIPELINES TAB =====

  /**
   * Render pipelines tab - now uses CurationPipelineBuilder component
   */
  // ===== TEAM TAB =====

  /**
   * Render the Team tab - shows curation agents and positions
   */
  _renderTeamTab() {
    const positions = this._curationSystem.getCurationPositions();
    const agents = this._curationSystem.getAllCurationAgents();
    const teamSummary = this._curationSystem.getCurationTeamSummary();

    this._elements.content.innerHTML = `
      <div class="council-team-view">
        <div class="council-team-header">
          <div class="council-team-stats">
            <div class="council-stat">
              <span class="council-stat-value">${teamSummary.positionCount}</span>
              <span class="council-stat-label">Positions</span>
            </div>
            <div class="council-stat">
              <span class="council-stat-value">${teamSummary.agentCount}</span>
              <span class="council-stat-label">Agents</span>
            </div>
            <div class="council-stat ${teamSummary.assignedPositions === teamSummary.positionCount ? "success" : "warning"}">
              <span class="council-stat-value">${teamSummary.assignedPositions}/${teamSummary.positionCount}</span>
              <span class="council-stat-label">Assigned</span>
            </div>
          </div>
          <div class="council-team-actions">
            <button class="council-curation-btn council-curation-btn-primary" data-action="create-agent">
              ➕ Create Agent
            </button>
          </div>
        </div>

        <div class="council-team-section">
          <h3 class="council-section-title">📋 Curation Positions</h3>
          <p class="council-section-description">
            Positions define roles in the curation workflow. Each position can have an agent assigned.
          </p>
          <div class="council-positions-list">
            ${positions.map((p) => this._renderPositionCard(p, teamSummary)).join("")}
          </div>
        </div>

        <div class="council-team-section">
          <h3 class="council-section-title">🤖 Curation Agents</h3>
          <p class="council-section-description">
            Agents are the AI personas that fulfill curation positions. Edit their prompts and settings.
          </p>
          <div class="council-agents-list">
            ${
              agents.length > 0
                ? agents.map((a) => this._renderAgentCard(a)).join("")
                : '<div class="council-empty-state">No curation agents configured</div>'
            }
          </div>
        </div>
      </div>
    `;

    this._bindContentEvents();
  },

  /**
   * Render a position card
   * @param {Object} position - Position data
   * @param {Object} teamSummary - Team summary data
   * @returns {string} HTML
   */
  _renderPositionCard(position, teamSummary) {
    const positionInfo = teamSummary.positions?.find(
      (p) => p.id === position.id,
    );
    const hasAgent = positionInfo?.assignedAgentId;
    const agentName = positionInfo?.assignedAgentName || "Unassigned";

    return `
      <div class="council-position-card ${hasAgent ? "assigned" : "unassigned"}">
        <div class="council-position-header">
          <div class="council-position-info">
            <span class="council-position-name">${this._escapeHtml(position.name)}</span>
            <span class="council-position-tier council-tier-${position.tier}">${position.tier}</span>
          </div>
          <div class="council-position-status">
            ${
              hasAgent
                ? `<span class="council-status-badge success">✓ Assigned</span>`
                : `<span class="council-status-badge warning">⚠ Unassigned</span>`
            }
          </div>
        </div>
        <div class="council-position-body">
          <div class="council-position-role">
            ${this._escapeHtml(position.promptModifiers?.roleDescription || "No role description")}
          </div>
          <div class="council-position-agent">
            <span class="council-agent-label">Agent:</span>
            <span class="council-agent-name">${this._escapeHtml(agentName)}</span>
          </div>
        </div>
        <div class="council-position-actions">
          <button class="council-curation-btn council-curation-btn-sm"
                  data-action="assign-agent"
                  data-position-id="${position.id}">
            ${hasAgent ? "🔄 Reassign" : "➕ Assign"}
          </button>
        </div>
      </div>
    `;
  },

  /**
   * Render an agent card
   * @param {Object} agent - Agent data
   * @returns {string} HTML
   */
  _renderAgentCard(agent) {
    const isDefault = agent.metadata?.isDefault;
    const positionName = agent.positionId
      ? this._curationSystem.getCurationPosition(agent.positionId)?.name ||
        agent.positionId
      : "Unassigned";

    return `
      <div class="council-agent-card ${isDefault ? "default" : "custom"}">
        <div class="council-agent-header">
          <div class="council-agent-info">
            <span class="council-agent-icon">${isDefault ? "🤖" : "👤"}</span>
            <span class="council-agent-name">${this._escapeHtml(agent.name)}</span>
            ${isDefault ? '<span class="council-badge default">Default</span>' : ""}
          </div>
          <div class="council-agent-position">
            <span class="council-position-label">Position:</span>
            <span class="council-position-value">${this._escapeHtml(positionName)}</span>
          </div>
        </div>
        <div class="council-agent-body">
          <div class="council-agent-description">
            ${this._escapeHtml(agent.description || "No description")}
          </div>
          <div class="council-agent-prompt-preview">
            <span class="council-prompt-label">System Prompt:</span>
            <div class="council-prompt-text">${this._escapeHtml(this._truncate(agent.systemPrompt?.customText || "Using default prompt", 150))}</div>
          </div>
          <div class="council-agent-config">
            <span class="council-config-item">
              <span class="council-config-label">Temp:</span>
              <span class="council-config-value">${agent.apiConfig?.temperature ?? 0.7}</span>
            </span>
            <span class="council-config-item">
              <span class="council-config-label">Max Tokens:</span>
              <span class="council-config-value">${agent.apiConfig?.maxTokens ?? 2048}</span>
            </span>
            <span class="council-config-item">
              <span class="council-config-label">Connection:</span>
              <span class="council-config-value">${agent.apiConfig?.useCurrentConnection ? "Current" : "Custom"}</span>
            </span>
          </div>
        </div>
        <div class="council-agent-actions">
          <button class="council-curation-btn council-curation-btn-sm"
                  data-action="edit-agent"
                  data-agent-id="${agent.id}">
            ✏️ Edit
          </button>
          <button class="council-curation-btn council-curation-btn-sm"
                  data-action="duplicate-agent"
                  data-agent-id="${agent.id}">
            📋 Duplicate
          </button>
          ${
            !isDefault
              ? `
            <button class="council-curation-btn council-curation-btn-sm council-curation-btn-danger"
                    data-action="delete-agent"
                    data-agent-id="${agent.id}">
              🗑️ Delete
            </button>
          `
              : ""
          }
        </div>
      </div>
    `;
  },

  /**
   * Show agent editor dialog
   * @param {string|null} agentId - Agent ID to edit, or null for new
   */
  _showAgentEditor(agentId = null) {
    const agent = agentId
      ? this._curationSystem.getCurationAgent(agentId)
      : null;
    const isEdit = !!agent;
    const positions = this._curationSystem.getCurationPositions();

    // Prepare initial prompt builder config from agent data
    const promptConfig = agent?.systemPrompt || {};
    const initialMode =
      promptConfig.source === "preset"
        ? "preset"
        : promptConfig.source === "tokens"
          ? "tokens"
          : "custom";

    const dialog = document.createElement("div");
    dialog.className = "council-curation-dialog-overlay";
    dialog.innerHTML = `
      <div class="council-curation-dialog council-curation-dialog-lg">
        <div class="council-curation-dialog-header">
          <h3>${isEdit ? "Edit Curation Agent" : "Create Curation Agent"}</h3>
          <button class="council-curation-dialog-close" data-dialog="cancel">✕</button>
        </div>
        <div class="council-curation-dialog-content council-curation-dialog-scrollable">
          <div class="council-curation-dialog-section">
            <h4 class="council-curation-section-title">📝 Basic Information</h4>
            <div class="council-curation-form-row">
              <div class="council-curation-form-group">
                <label>Agent ID</label>
                <input type="text" class="council-form-input" data-field="id"
                       value="${this._escapeHtml(agent?.id || "")}"
                       placeholder="e.g., archivist_expert"
                       ${isEdit ? "disabled" : ""}>
              </div>
              <div class="council-curation-form-group">
                <label>Agent Name *</label>
                <input type="text" class="council-form-input" data-field="name"
                       value="${this._escapeHtml(agent?.name || "")}"
                       placeholder="e.g., Expert Archivist">
              </div>
            </div>

            <div class="council-curation-form-group">
              <label>Description</label>
              <textarea class="council-form-textarea" data-field="description" rows="2"
                        placeholder="Brief description of this agent's expertise...">${this._escapeHtml(agent?.description || "")}</textarea>
            </div>

            <div class="council-curation-form-group">
              <label>Assigned Position</label>
              <select class="council-form-input" data-field="positionId">
                <option value="">-- No Position --</option>
                ${positions
                  .map(
                    (p) => `
                  <option value="${p.id}" ${agent?.positionId === p.id ? "selected" : ""}>
                    ${this._escapeHtml(p.name)} (${p.tier})
                  </option>
                `,
                  )
                  .join("")}
              </select>
              <p class="council-form-hint">Assign this agent to a curation position.</p>
            </div>
          </div>

          <div class="council-curation-dialog-section">
            <h4 class="council-curation-section-title">⚙️ API Configuration</h4>
            <div class="council-curation-form-group">
              <label class="council-checkbox">
                <input type="checkbox" data-field="useCurrentConnection"
                       ${agent?.apiConfig?.useCurrentConnection !== false ? "checked" : ""}>
                Use Current SillyTavern Connection
              </label>
              <p class="council-form-hint">When enabled, uses your active API connection settings.</p>
            </div>

            <div class="council-curation-form-row">
              <div class="council-curation-form-group">
                <label>Temperature</label>
                <input type="number" class="council-form-input" data-field="temperature"
                       value="${agent?.apiConfig?.temperature ?? 0.7}"
                       min="0" max="2" step="0.1">
              </div>
              <div class="council-curation-form-group">
                <label>Max Tokens</label>
                <input type="number" class="council-form-input" data-field="maxTokens"
                       value="${agent?.apiConfig?.maxTokens ?? 2048}"
                       min="100" max="16000">
              </div>
            </div>

            <div class="council-curation-form-row">
              <div class="council-curation-form-group">
                <label>Top P</label>
                <input type="number" class="council-form-input" data-field="topP"
                       value="${agent?.apiConfig?.topP ?? 1}"
                       min="0" max="1" step="0.1">
              </div>
              <div class="council-curation-form-group">
                <label>Frequency Penalty</label>
                <input type="number" class="council-form-input" data-field="frequencyPenalty"
                       value="${agent?.apiConfig?.frequencyPenalty ?? 0}"
                       min="-2" max="2" step="0.1">
              </div>
            </div>
          </div>

          <div class="council-curation-dialog-section">
            <h4 class="council-curation-section-title">💬 System Prompt</h4>
            <div class="council-curation-prompt-builder-container" data-prompt-builder="curation-agent">
              <!-- PromptBuilder will be rendered here -->
            </div>
          </div>
        </div>
        <div class="council-curation-dialog-footer">
          <button class="council-curation-btn council-curation-btn-secondary" data-dialog="cancel">Cancel</button>
          <button class="council-curation-btn council-curation-btn-primary" data-dialog="save">
            ${isEdit ? "Save Changes" : "Create Agent"}
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(dialog);

    // Initialize PromptBuilder in the dialog
    const promptBuilderContainer = dialog.querySelector(
      '[data-prompt-builder="curation-agent"]',
    );
    if (promptBuilderContainer && window.PromptBuilder) {
      this._promptBuilderInstance = window.PromptBuilder.createInstance({
        initialMode: initialMode,
        initialPrompt: promptConfig.customText || "",
        initialPreset: promptConfig.presetName || null,
        initialTokens: promptConfig.tokens || [],
        onChange: (value) => {
          this._log("debug", "PromptBuilder changed:", value);
        },
      });
      this._promptBuilderInstance.render(promptBuilderContainer);
    } else {
      // Fallback to simple textarea if PromptBuilder not available
      promptBuilderContainer.innerHTML = `
        <div class="council-curation-form-group">
          <label>Prompt Source</label>
          <select class="council-form-input" data-field="promptSource">
            <option value="custom" ${(promptConfig.source || "custom") === "custom" ? "selected" : ""}>Custom Text</option>
            <option value="position" ${promptConfig.source === "position" ? "selected" : ""}>From Position</option>
          </select>
        </div>
        <div class="council-curation-form-group">
          <label>System Prompt Text</label>
          <textarea class="council-form-textarea council-form-textarea-large" data-field="systemPrompt" rows="8"
                    placeholder="You are a specialized curation agent...">${this._escapeHtml(promptConfig.customText || "")}</textarea>
          <p class="council-form-hint">The system prompt that defines this agent's behavior and expertise.</p>
        </div>
      `;
    }

    // Handle dialog actions
    const cleanup = () => {
      // Clean up PromptBuilder instance
      if (this._promptBuilderInstance) {
        this._promptBuilderInstance.destroy();
        this._promptBuilderInstance = null;
      }
      dialog.remove();
    };

    dialog.querySelectorAll("[data-dialog]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const action = e.currentTarget.dataset.dialog;

        if (action === "cancel") {
          cleanup();
          return;
        }

        if (action === "save") {
          const name = dialog.querySelector('[data-field="name"]').value.trim();
          if (!name) {
            this._showToast("Agent name is required", "error");
            return;
          }

          // Get system prompt config from PromptBuilder or fallback
          let systemPromptConfig;
          if (this._promptBuilderInstance) {
            const promptValue = this._promptBuilderInstance.getValue();
            systemPromptConfig = {
              source: promptValue.mode,
              customText:
                promptValue.mode === "custom"
                  ? promptValue.customPrompt
                  : promptValue.generatedPrompt || "",
              presetName: promptValue.presetName || null,
              tokens: promptValue.tokens || [],
            };
          } else {
            systemPromptConfig = {
              source:
                dialog.querySelector('[data-field="promptSource"]')?.value ||
                "custom",
              customText:
                dialog
                  .querySelector('[data-field="systemPrompt"]')
                  ?.value.trim() || "",
            };
          }

          const agentData = {
            name,
            description: dialog
              .querySelector('[data-field="description"]')
              .value.trim(),
            positionId:
              dialog.querySelector('[data-field="positionId"]').value || null,
            apiConfig: {
              useCurrentConnection: dialog.querySelector(
                '[data-field="useCurrentConnection"]',
              ).checked,
              temperature:
                parseFloat(
                  dialog.querySelector('[data-field="temperature"]').value,
                ) || 0.7,
              maxTokens:
                parseInt(
                  dialog.querySelector('[data-field="maxTokens"]').value,
                ) || 2048,
              topP:
                parseFloat(dialog.querySelector('[data-field="topP"]').value) ||
                1,
              frequencyPenalty:
                parseFloat(
                  dialog.querySelector('[data-field="frequencyPenalty"]').value,
                ) || 0,
            },
            systemPrompt: systemPromptConfig,
          };

          try {
            if (isEdit) {
              this._curationSystem.updateCurationAgent(agentId, agentData);
              this._showToast("Agent updated successfully", "success");
            } else {
              const newId =
                dialog.querySelector('[data-field="id"]')?.value.trim() ||
                `agent_${Date.now()}`;
              agentData.id = newId;
              this._curationSystem.registerCurationAgent(agentData);
              this._showToast("Agent created successfully", "success");
            }

            // Also assign to position if specified
            if (agentData.positionId) {
              this._curationSystem.assignAgentToPosition(
                agentData.positionId,
                agentData.id || agentId,
              );
            }

            cleanup();
            this._renderTeamTab();
          } catch (err) {
            this._showToast(`Failed to save agent: ${err.message}`, "error");
          }
        }
      });
    });

    // Close on overlay click
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog) cleanup();
    });
  },

  /**
   * Show assign agent dialog for a position
   * @param {string} positionId - Position ID
   */
  _showAssignAgentDialog(positionId) {
    const position = this._curationSystem.getCurationPosition(positionId);
    if (!position) return;

    const agents = this._curationSystem.getAllCurationAgents();
    const currentAgentId =
      this._curationSystem.getAgentForPosition(positionId)?.id;

    const dialog = document.createElement("div");
    dialog.className = "council-curation-dialog-overlay";
    dialog.innerHTML = `
      <div class="council-curation-dialog">
        <div class="council-curation-dialog-header">
          <h3>Assign Agent to ${this._escapeHtml(position.name)}</h3>
          <button class="council-curation-dialog-close" data-dialog="cancel">✕</button>
        </div>
        <div class="council-curation-dialog-content">
          <p>Select an agent to assign to this position:</p>
          <div class="council-curation-form-group">
            <select class="council-form-input" data-field="agentId">
              <option value="">-- No Agent --</option>
              ${agents
                .map(
                  (a) => `
                <option value="${a.id}" ${a.id === currentAgentId ? "selected" : ""}>
                  ${this._escapeHtml(a.name)} ${a.metadata?.isDefault ? "(Default)" : ""}
                </option>
              `,
                )
                .join("")}
            </select>
          </div>
        </div>
        <div class="council-curation-dialog-footer">
          <button class="council-curation-btn council-curation-btn-secondary" data-dialog="cancel">Cancel</button>
          <button class="council-curation-btn council-curation-btn-primary" data-dialog="assign">Assign</button>
        </div>
      </div>
    `;

    document.body.appendChild(dialog);

    const cleanup = () => dialog.remove();

    dialog.querySelectorAll("[data-dialog]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const action = e.currentTarget.dataset.dialog;

        if (action === "cancel") {
          cleanup();
          return;
        }

        if (action === "assign") {
          const agentId = dialog.querySelector('[data-field="agentId"]').value;

          try {
            this._curationSystem.assignAgentToPosition(
              positionId,
              agentId || null,
            );
            this._showToast(
              agentId ? "Agent assigned successfully" : "Agent unassigned",
              "success",
            );
            cleanup();
            this._renderTeamTab();
          } catch (err) {
            this._showToast(`Failed to assign agent: ${err.message}`, "error");
          }
        }
      });
    });

    dialog.addEventListener("click", (e) => {
      if (e.target === dialog) cleanup();
    });
  },

  /**
   * Duplicate an agent
   * @param {string} agentId - Agent ID to duplicate
   */
  _duplicateAgent(agentId) {
    const agent = this._curationSystem.getCurationAgent(agentId);
    if (!agent) return;

    const newAgent = {
      ...agent,
      id: `agent_${Date.now()}`,
      name: `${agent.name} (Copy)`,
      positionId: null, // Don't copy position assignment
      metadata: {
        ...agent.metadata,
        isDefault: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };

    try {
      this._curationSystem.registerCurationAgent(newAgent);
      this._showToast("Agent duplicated successfully", "success");
      this._renderTeamTab();
    } catch (err) {
      this._showToast(`Failed to duplicate agent: ${err.message}`, "error");
    }
  },

  /**
   * Delete an agent
   * @param {string} agentId - Agent ID to delete
   */
  _confirmDeleteAgent(agentId) {
    const agent = this._curationSystem.getCurationAgent(agentId);
    if (!agent) return;

    if (agent.metadata?.isDefault) {
      this._showToast("Cannot delete default agents", "error");
      return;
    }

    if (!confirm(`Are you sure you want to delete agent "${agent.name}"?`)) {
      return;
    }

    try {
      this._curationSystem.deleteCurationAgent(agentId);
      this._showToast("Agent deleted successfully", "success");
      this._renderTeamTab();
    } catch (err) {
      this._showToast(`Failed to delete agent: ${err.message}`, "error");
    }
  },

  // ===== PIPELINES TAB =====

  _renderPipelinesTab() {
    const pipelines = this._curationSystem.getAllPipelines();

    // Group pipelines by type
    const crudPipelines = pipelines.filter(p => p.type === 'crud');
    const ragPipelines = pipelines.filter(p => p.type === 'rag');

    this._elements.content.innerHTML = `
      <div class="council-pipelines-view">
        <!-- Pipeline List Section -->
        <div class="council-pipelines-section">
          <h3 class="council-section-title">⚡ Available Pipelines</h3>
          <p class="council-section-description">
            Execute CRUD and RAG pipelines manually. Results will be displayed below.
          </p>

          ${pipelines.length === 0 ? `
            <div class="council-empty-state">
              <div class="council-empty-icon">📋</div>
              <div class="council-empty-text">No pipelines created yet</div>
              <div class="council-empty-hint">Use the Pipeline Builder below to create your first pipeline</div>
            </div>
          ` : `
            <div class="council-pipeline-lists">
              ${crudPipelines.length > 0 ? `
                <div class="council-pipeline-group">
                  <h4 class="council-pipeline-group-title">CRUD Pipelines (${crudPipelines.length})</h4>
                  <div class="council-pipeline-items">
                    ${crudPipelines.map(pipeline => `
                      <div class="council-pipeline-item" data-pipeline-id="${pipeline.id}">
                        <div class="council-pipeline-info">
                          <div class="council-pipeline-name">${pipeline.name}</div>
                          <div class="council-pipeline-meta">
                            <span class="council-badge council-badge-primary">${pipeline.operation || 'CRUD'}</span>
                            <span class="council-pipeline-store">${pipeline.storeId || 'N/A'}</span>
                            ${pipeline.description ? `<span class="council-pipeline-desc">${pipeline.description}</span>` : ''}
                          </div>
                        </div>
                        <div class="council-pipeline-actions">
                          <button class="council-btn council-btn-secondary council-btn-sm"
                                  data-action="preview-pipeline"
                                  data-pipeline-id="${pipeline.id}"
                                  title="Preview changes without applying">
                            Preview
                          </button>
                          <button class="council-btn council-btn-primary council-btn-sm"
                                  data-action="run-pipeline"
                                  data-pipeline-id="${pipeline.id}"
                                  title="Execute pipeline">
                            ▶ Run
                          </button>
                        </div>
                      </div>
                    `).join('')}
                  </div>
                </div>
              ` : ''}

              ${ragPipelines.length > 0 ? `
                <div class="council-pipeline-group">
                  <h4 class="council-pipeline-group-title">RAG Pipelines (${ragPipelines.length})</h4>
                  <div class="council-pipeline-items">
                    ${ragPipelines.map(pipeline => `
                      <div class="council-pipeline-item" data-pipeline-id="${pipeline.id}">
                        <div class="council-pipeline-info">
                          <div class="council-pipeline-name">${pipeline.name}</div>
                          <div class="council-pipeline-meta">
                            <span class="council-badge council-badge-success">RAG</span>
                            ${pipeline.targetStores && pipeline.targetStores.length > 0 ?
                              `<span class="council-pipeline-store">Stores: ${pipeline.targetStores.join(', ')}</span>` : ''}
                            ${pipeline.description ? `<span class="council-pipeline-desc">${pipeline.description}</span>` : ''}
                          </div>
                        </div>
                        <div class="council-pipeline-actions">
                          <button class="council-btn council-btn-secondary council-btn-sm"
                                  data-action="preview-pipeline"
                                  data-pipeline-id="${pipeline.id}"
                                  title="Preview results (read-only)">
                            Preview
                          </button>
                          <button class="council-btn council-btn-primary council-btn-sm"
                                  data-action="run-pipeline"
                                  data-pipeline-id="${pipeline.id}"
                                  title="Execute pipeline">
                            ▶ Run
                          </button>
                        </div>
                      </div>
                    `).join('')}
                  </div>
                </div>
              ` : ''}
            </div>
          `}
        </div>

        <!-- Execution Results Section -->
        <div id="council-pipeline-execution-results" class="council-pipelines-section" style="display: none;">
          <!-- Results will be rendered here -->
        </div>

        <!-- Pipeline Builder Section -->
        <div class="council-pipelines-section council-pipeline-builder-section">
          <h3 class="council-section-title">📊 Pipeline Builder</h3>
          <p class="council-section-description">
            Create and manage CRUD and RAG pipelines for data operations.
          </p>
          <div id="council-pipeline-builder-container" class="council-pipeline-builder-container">
            <!-- CurationPipelineBuilder will be mounted here -->
          </div>
        </div>
      </div>
    `;

    // Initialize the CurationPipelineBuilder component
    this._initializePipelineBuilder();

    this._bindContentEvents();
  },

  /**
   * Initialize the CurationPipelineBuilder component in the Pipelines tab
   */
  _initializePipelineBuilder() {
    const CurationPipelineBuilder = window.CurationPipelineBuilder;
    if (!CurationPipelineBuilder) {
      this._log("warn", "CurationPipelineBuilder not available");
      const container = document.getElementById(
        "council-pipeline-builder-container",
      );
      if (container) {
        container.innerHTML = `
          <div class="council-empty-state">
            <div class="council-empty-text">Pipeline Builder component not loaded</div>
          </div>
        `;
      }
      return;
    }

    // Create an instance of the pipeline builder
    const instance = CurationPipelineBuilder.createInstance(
      "council-pipeline-builder-container",
      {
        instanceId: "curation-modal-pipeline-builder",
        type: "crud",
        mode: "list",
        onChange: (pipeline) => {
          this._log("debug", "Pipeline changed:", pipeline);
        },
        onSave: (pipeline) => {
          this._log("info", "Pipeline saved:", pipeline);
          this._showToast("Pipeline saved successfully", "success");
        },
        onTest: (pipeline, results) => {
          this._log("info", "Pipeline test results:", results);
        },
      },
    );

    // Store reference for cleanup
    this._pipelineBuilderInstance = instance;
  },

  // ===== CONTENT EVENT BINDING =====

  /**
   * Bind content events
   */
  _bindContentEvents() {
    const content = this._elements.content;

    // Exclude elements inside the pipeline builder (it handles its own events)
    const pipelineBuilderContainer = content.querySelector(
      "#council-pipeline-builder-container",
    );

    content.querySelectorAll("[data-action]").forEach((btn) => {
      // Skip if this button is inside the pipeline builder
      if (pipelineBuilderContainer && pipelineBuilderContainer.contains(btn)) {
        return;
      }

      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const action = e.currentTarget.dataset.action;
        const id = e.currentTarget.dataset.id;
        const store = e.currentTarget.dataset.store;
        const key = e.currentTarget.dataset.key;
        this._handleAction(action, e, { id, store, key });
      });
    });
  },

  // ===== ACTION HANDLERS =====

  /**
   * Handle actions
   * @param {string} action - Action name
   * @param {Event} event - Event object
   * @param {Object} params - Additional parameters
   */
  _handleAction(action, event, params = {}) {
    // Team tab actions
    if (action === "create-agent") {
      this._showAgentEditor(null);
      return;
    }
    if (action === "edit-agent") {
      const agentId = event.currentTarget?.dataset?.agentId || params.agentId;
      this._showAgentEditor(agentId);
      return;
    }
    if (action === "duplicate-agent") {
      const agentId = event.currentTarget?.dataset?.agentId || params.agentId;
      this._duplicateAgent(agentId);
      return;
    }
    if (action === "delete-agent") {
      const agentId = event.currentTarget?.dataset?.agentId || params.agentId;
      this._confirmDeleteAgent(agentId);
      return;
    }
    if (action === "assign-agent") {
      const positionId =
        event.currentTarget?.dataset?.positionId || params.positionId;
      this._showAssignAgentDialog(positionId);
      return;
    }

    this._log("debug", `Action: ${action}`, params);

    switch (action) {
      case "close":
        this.hide();
        break;

      case "import":
        this._handleImport();
        break;

      case "export":
        this._handleExport();
        break;

      case "save-all":
        this._handleSaveAll();
        break;

      case "view-store":
        this._selectedStore = params.id;
        this._switchTab("stores", { preserveStore: true });
        break;

      case "back-to-stores":
        this._selectedStore = null;
        this._renderStoresTab();
        break;

      case "clear-store":
        this._confirmClearStore(params.id);
        break;

      case "create-entry":
        this._showEntryDialog(params.store);
        break;

      case "edit-entry":
        this._showEntryDialog(params.store, params.key);
        break;

      case "delete-entry":
        this._confirmDeleteEntry(params.store, params.key);
        break;

      case "save-singleton":
        this._saveSingleton(params.store);
        break;

      case "view-result":
        this._selectedStore = params.store;
        this._switchTab("stores", { preserveStore: true });
        break;

      case "search":
        const searchInput = this._elements.content?.querySelector(
          ".council-search-input",
        );
        this._searchQuery = searchInput?.value || "";
        this._refreshCurrentTab();
        break;

      case "run-pipeline":
        const pipelineId = event.currentTarget?.dataset?.pipelineId || params.pipelineId;
        this._runPipeline(pipelineId);
        break;

      case "preview-pipeline":
        const previewPipelineId = event.currentTarget?.dataset?.pipelineId || params.pipelineId;
        this._previewPipeline(previewPipelineId);
        break;

      case "apply-preview":
        this._applyPreviewChanges();
        break;

      case "discard-preview":
        this._discardPreviewChanges();
        break;

      default:
        this._log("warn", `Unknown action: ${action}`);
    }
  },

  // ===== PIPELINE EXECUTION =====

  /**
   * Run a pipeline manually
   * @param {string} pipelineId - Pipeline ID
   */
  async _runPipeline(pipelineId) {
    const pipeline = this._curationSystem.getPipeline(pipelineId);
    if (!pipeline) {
      this._showToast(`Pipeline not found: ${pipelineId}`, "error");
      return;
    }

    this._log("info", `Running pipeline: ${pipeline.name} (${pipeline.type})`);

    // Show execution progress
    this._showPipelineExecution(pipeline);

    try {
      // Execute via Curation System
      const result = await this._curationSystem.executePipeline(pipelineId, {
        source: 'manual',
        preview: false,
        input: {} // Could prompt user for input in future
      });

      // Show results
      this._showPipelineResult(result);
      this._showToast(`Pipeline "${pipeline.name}" completed`, "success");
    } catch (error) {
      this._showPipelineError(pipeline, error);
      this._showToast(`Pipeline "${pipeline.name}" failed: ${error.message}`, "error");
    }
  },

  /**
   * Show pipeline execution progress
   * @param {Object} pipeline - Pipeline definition
   */
  _showPipelineExecution(pipeline) {
    const resultsSection = document.getElementById('council-pipeline-execution-results');
    if (!resultsSection) return;

    resultsSection.style.display = 'block';
    resultsSection.innerHTML = `
      <h3 class="council-section-title">⚡ Executing Pipeline</h3>
      <div class="council-pipeline-execution">
        <div class="council-pipeline-exec-header">
          <div class="council-pipeline-exec-name">${pipeline.name}</div>
          <div class="council-pipeline-exec-type">
            <span class="council-badge ${pipeline.type === 'crud' ? 'council-badge-primary' : 'council-badge-success'}">
              ${pipeline.type.toUpperCase()}
            </span>
          </div>
        </div>
        <div class="council-pipeline-exec-progress">
          <div class="council-spinner"></div>
          <div class="council-pipeline-exec-status">Executing pipeline...</div>
        </div>
      </div>
    `;

    // Scroll to results
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  },

  /**
   * Show pipeline execution result
   * @param {Object} result - Execution result
   */
  _showPipelineResult(result) {
    const resultsSection = document.getElementById('council-pipeline-execution-results');
    if (!resultsSection) return;

    const pipeline = this._curationSystem.getPipeline(result.pipelineId);
    const pipelineName = pipeline ? pipeline.name : result.pipelineId;

    resultsSection.innerHTML = `
      <h3 class="council-section-title">✅ Pipeline Completed</h3>
      <div class="council-pipeline-result council-pipeline-result-success">
        <div class="council-pipeline-result-header">
          <div class="council-pipeline-result-name">${pipelineName}</div>
          <div class="council-pipeline-result-meta">
            <span class="council-badge ${result.type === 'crud' ? 'council-badge-primary' : 'council-badge-success'}">
              ${result.type.toUpperCase()}
            </span>
            <span class="council-pipeline-result-time">${result.duration}ms</span>
          </div>
        </div>

        <div class="council-pipeline-result-body">
          ${result.type === 'crud' ? `
            <div class="council-pipeline-result-section">
              <h4>CRUD Operation</h4>
              <p><strong>Operation:</strong> ${result.result.operation}</p>
              <p><strong>Store:</strong> ${result.result.storeId}</p>
              <p><strong>Message:</strong> ${result.result.message}</p>
              ${result.preview ? '<p class="council-warning">⚠️ Preview mode - no changes were made</p>' : ''}
            </div>
          ` : result.type === 'rag' ? `
            <div class="council-pipeline-result-section">
              <h4>RAG Results</h4>
              <p><strong>Query:</strong> ${result.result.query || 'N/A'}</p>
              <p><strong>Results:</strong> ${result.result.count} items found</p>
              ${result.result.results && result.result.results.length > 0 ? `
                <div class="council-pipeline-result-items">
                  ${result.result.results.slice(0, 5).map(item => `
                    <div class="council-result-item">
                      <pre>${JSON.stringify(item, null, 2)}</pre>
                    </div>
                  `).join('')}
                  ${result.result.results.length > 5 ? `
                    <div class="council-result-more">
                      ... and ${result.result.results.length - 5} more results
                    </div>
                  ` : ''}
                </div>
              ` : '<p class="council-info">No results found</p>'}
            </div>
          ` : `
            <div class="council-pipeline-result-section">
              <pre>${JSON.stringify(result.result, null, 2)}</pre>
            </div>
          `}
        </div>

        <div class="council-pipeline-result-actions">
          <button class="council-btn council-btn-secondary"
                  onclick="this.closest('#council-pipeline-execution-results').style.display='none'">
            Close Results
          </button>
        </div>
      </div>
    `;
  },

  /**
   * Show pipeline execution error
   * @param {Object} pipeline - Pipeline definition
   * @param {Error} error - Error object
   */
  _showPipelineError(pipeline, error) {
    const resultsSection = document.getElementById('council-pipeline-execution-results');
    if (!resultsSection) return;

    resultsSection.innerHTML = `
      <h3 class="council-section-title">❌ Pipeline Failed</h3>
      <div class="council-pipeline-result council-pipeline-result-error">
        <div class="council-pipeline-result-header">
          <div class="council-pipeline-result-name">${pipeline.name}</div>
          <div class="council-pipeline-result-meta">
            <span class="council-badge ${pipeline.type === 'crud' ? 'council-badge-primary' : 'council-badge-success'}">
              ${pipeline.type.toUpperCase()}
            </span>
          </div>
        </div>

        <div class="council-pipeline-result-body">
          <div class="council-error-message">
            <strong>Error:</strong> ${error.message}
          </div>
          ${error.stack ? `
            <details class="council-error-details">
              <summary>Stack Trace</summary>
              <pre>${error.stack}</pre>
            </details>
          ` : ''}
        </div>

        <div class="council-pipeline-result-actions">
          <button class="council-btn council-btn-primary"
                  data-action="run-pipeline"
                  data-pipeline-id="${pipeline.id}">
            ↻ Retry
          </button>
          <button class="council-btn council-btn-secondary"
                  onclick="this.closest('#council-pipeline-execution-results').style.display='none'">
            Close
          </button>
        </div>
      </div>
    `;

    // Re-bind event handlers
    this._bindContentEvents();
  },


  // ===== PIPELINE PREVIEW =====

  /**
   * Current preview result for apply/discard
   * @type {Object|null}
   */
  _currentPreviewResult: null,

  /**
   * Preview a pipeline without executing
   * @param {string} pipelineId - Pipeline ID
   */
  async _previewPipeline(pipelineId) {
    const pipeline = this._curationSystem.getPipeline(pipelineId);
    if (!pipeline) {
      this._showToast(`Pipeline not found: ${pipelineId}`, "error");
      return;
    }

    this._log("info", `Previewing pipeline: ${pipeline.name} (${pipeline.type})`);

    // Show preview progress
    this._showPipelinePreviewProgress(pipeline);

    try {
      // Execute preview via Curation System
      const result = await this._curationSystem.executePipelinePreview(pipelineId, {
        input: {} // Could prompt user for input in future
      });

      // Store result for apply/discard
      this._currentPreviewResult = result;

      // Show preview results
      this._showPipelinePreviewResult(result);
      this._showToast(`Pipeline "${pipeline.name}" preview complete`, "success");
    } catch (error) {
      this._showPipelineError(pipeline, error);
      this._showToast(`Pipeline "${pipeline.name}" preview failed: ${error.message}`, "error");
    }
  },

  /**
   * Show pipeline preview progress
   * @param {Object} pipeline - Pipeline definition
   */
  _showPipelinePreviewProgress(pipeline) {
    const resultsSection = document.getElementById('council-pipeline-execution-results');
    if (!resultsSection) return;

    resultsSection.style.display = 'block';
    resultsSection.innerHTML = `
      <h3 class="council-section-title">Previewing Pipeline</h3>
      <div class="council-pipeline-execution">
        <div class="council-pipeline-exec-header">
          <div class="council-pipeline-exec-name">${pipeline.name}</div>
          <div class="council-pipeline-exec-type">
            <span class="council-badge council-badge-warning">PREVIEW</span>
            <span class="council-badge ${pipeline.type === 'crud' ? 'council-badge-primary' : 'council-badge-success'}">
              ${pipeline.type.toUpperCase()}
            </span>
          </div>
        </div>
        <div class="council-pipeline-exec-progress">
          <div class="council-spinner"></div>
          <div class="council-pipeline-exec-status">Calculating preview changes...</div>
        </div>
      </div>
    `;

    // Scroll to results
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  },

  /**
   * Show pipeline preview result with before/after comparison
   * @param {Object} result - Preview result
   */
  _showPipelinePreviewResult(result) {
    const resultsSection = document.getElementById('council-pipeline-execution-results');
    if (!resultsSection) return;

    const pipeline = this._curationSystem.getPipeline(result.pipelineId);
    const pipelineName = pipeline ? pipeline.name : result.pipelineId;

    // Build changes summary HTML
    let changesHtml = '';
    if (result.success && result.changes) {
      const { changes } = result;

      if (changes.totalChanges === 0) {
        changesHtml = `
          <div class="council-preview-no-changes">
            <div class="council-info">No changes would be made by this pipeline.</div>
          </div>
        `;
      } else {
        // Build detailed changes view
        changesHtml = `
          <div class="council-preview-summary">
            <strong>${changes.totalChanges} change(s) detected</strong>
            ${changes.summary.length > 0 ? `<ul>${changes.summary.map(s => `<li>${s}</li>`).join('')}</ul>` : ''}
          </div>
          <div class="council-preview-details">
        `;

        // Show changes for each store
        for (const [storeId, storeDiff] of Object.entries(changes.stores)) {
          const hasChanges = storeDiff.added.length > 0 || storeDiff.modified.length > 0 || storeDiff.deleted.length > 0;

          if (hasChanges) {
            changesHtml += `
              <div class="council-preview-store">
                <h5 class="council-preview-store-title">${storeId}</h5>
            `;

            // Added items
            if (storeDiff.added.length > 0) {
              changesHtml += `
                <div class="council-preview-section council-preview-added">
                  <h6>+ Added (${storeDiff.added.length})</h6>
                  ${storeDiff.added.slice(0, 3).map(item => `
                    <div class="council-preview-item">
                      <code>${item.id}</code>
                      <pre>${JSON.stringify(item.data, null, 2).substring(0, 200)}...</pre>
                    </div>
                  `).join('')}
                  ${storeDiff.added.length > 3 ? `<div class="council-preview-more">...and ${storeDiff.added.length - 3} more</div>` : ''}
                </div>
              `;
            }

            // Modified items
            if (storeDiff.modified.length > 0) {
              changesHtml += `
                <div class="council-preview-section council-preview-modified">
                  <h6>~ Modified (${storeDiff.modified.length})</h6>
                  ${storeDiff.modified.slice(0, 3).map(item => `
                    <div class="council-preview-item">
                      <code>${item.id}</code>
                      ${item.changes ? `
                        <div class="council-preview-diff">
                          ${item.changes.slice(0, 3).map(change => `
                            <div class="council-diff-field">
                              <span class="council-diff-label">${change.field}:</span>
                              <span class="council-diff-before">${JSON.stringify(change.before)}</span>
                              <span class="council-diff-arrow">&rarr;</span>
                              <span class="council-diff-after">${JSON.stringify(change.after)}</span>
                            </div>
                          `).join('')}
                          ${item.changes.length > 3 ? `<div class="council-preview-more">...and ${item.changes.length - 3} more fields</div>` : ''}
                        </div>
                      ` : ''}
                    </div>
                  `).join('')}
                  ${storeDiff.modified.length > 3 ? `<div class="council-preview-more">...and ${storeDiff.modified.length - 3} more</div>` : ''}
                </div>
              `;
            }

            // Deleted items
            if (storeDiff.deleted.length > 0) {
              changesHtml += `
                <div class="council-preview-section council-preview-deleted">
                  <h6>- Deleted (${storeDiff.deleted.length})</h6>
                  ${storeDiff.deleted.slice(0, 3).map(item => `
                    <div class="council-preview-item">
                      <code>${item.id}</code>
                    </div>
                  `).join('')}
                  ${storeDiff.deleted.length > 3 ? `<div class="council-preview-more">...and ${storeDiff.deleted.length - 3} more</div>` : ''}
                </div>
              `;
            }

            changesHtml += `</div>`; // close council-preview-store
          }
        }

        changesHtml += `</div>`; // close council-preview-details
      }
    } else if (!result.success) {
      changesHtml = `
        <div class="council-error-message">
          <strong>Preview failed:</strong> ${result.error}
        </div>
      `;
    }

    resultsSection.innerHTML = `
      <h3 class="council-section-title">Pipeline Preview</h3>
      <div class="council-pipeline-result council-pipeline-result-preview">
        <div class="council-pipeline-result-header">
          <div class="council-pipeline-result-name">${pipelineName}</div>
          <div class="council-pipeline-result-meta">
            <span class="council-badge council-badge-warning">PREVIEW</span>
            <span class="council-badge ${result.type === 'crud' ? 'council-badge-primary' : 'council-badge-success'}">
              ${result.type.toUpperCase()}
            </span>
            <span class="council-pipeline-result-time">${result.duration}ms</span>
          </div>
        </div>

        <div class="council-pipeline-result-body">
          <div class="council-preview-notice">
            <strong>Preview Mode</strong> - No changes have been applied yet.
            Review the changes below and choose to apply or discard.
          </div>
          ${changesHtml}
        </div>

        <div class="council-pipeline-result-actions">
          ${result.success && result.hasChanges ? `
            <button class="council-btn council-btn-success"
                    data-action="apply-preview"
                    title="Apply these changes to the actual stores">
              Apply Changes
            </button>
          ` : ''}
          <button class="council-btn council-btn-secondary"
                  data-action="discard-preview"
                  title="Discard preview and close">
            ${result.hasChanges ? 'Discard' : 'Close'}
          </button>
        </div>
      </div>
    `;

    // Re-bind event handlers
    this._bindContentEvents();
  },

  /**
   * Apply preview changes to actual stores
   */
  async _applyPreviewChanges() {
    if (!this._currentPreviewResult || !this._currentPreviewResult.applyChanges) {
      this._showToast("No preview to apply", "error");
      return;
    }

    const result = this._currentPreviewResult;
    this._log("info", `Applying preview changes for pipeline: ${result.pipelineId}`);

    try {
      const applyResult = await result.applyChanges();

      if (applyResult.success) {
        this._showToast(`Changes applied: ${applyResult.message}`, "success");
        this._currentPreviewResult = null;

        // Close results and refresh view
        const resultsSection = document.getElementById('council-pipeline-execution-results');
        if (resultsSection) {
          resultsSection.style.display = 'none';
        }

        // Refresh to show updated data
        this._refreshCurrentTab();
      } else {
        this._showToast(`Failed to apply changes: ${applyResult.error}`, "error");
      }
    } catch (error) {
      this._showToast(`Error applying changes: ${error.message}`, "error");
    }
  },

  /**
   * Discard preview changes
   */
  _discardPreviewChanges() {
    if (this._currentPreviewResult && this._currentPreviewResult.discardChanges) {
      this._currentPreviewResult.discardChanges();
    }

    this._currentPreviewResult = null;

    // Close results section
    const resultsSection = document.getElementById('council-pipeline-execution-results');
    if (resultsSection) {
      resultsSection.style.display = 'none';
    }

    this._showToast("Preview discarded", "info");
  },

  // ===== IMPORT / EXPORT =====

  /**
   * Handle import
   */
  _handleImport() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";

    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target.result);
          if (this._curationSystem.importAllStores(data)) {
            this._showToast("Data imported successfully", "success");
            this._refreshCurrentTab();
          } else {
            this._showToast("Import failed", "error");
          }
        } catch (e) {
          this._showToast(`Import error: ${e.message}`, "error");
        }
      };
      reader.readAsText(file);
    };

    input.click();
  },

  /**
   * Handle export
   */
  _handleExport() {
    try {
      const data = this._curationSystem.exportAllStores();
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `council-curation-${Date.now()}.json`;
      a.click();

      URL.revokeObjectURL(url);
      this._showToast("Data exported", "success");
    } catch (e) {
      this._showToast(`Export error: ${e.message}`, "error");
    }
  },

  /**
   * Handle save all
   */
  async _handleSaveAll() {
    try {
      await this._curationSystem.saveAllDirty();
      this._showToast("All changes saved", "success");
      this._refreshCurrentTab();
    } catch (e) {
      this._showToast(`Save error: ${e.message}`, "error");
    }
  },

  /**
   * Save singleton store from form
   * @param {string} storeId - Store ID
   */
  _saveSingleton(storeId) {
    const form = this._elements.content?.querySelector(
      ".council-singleton-form",
    );
    if (!form) return;

    const data = {};
    form.querySelectorAll("[name]").forEach((el) => {
      const name = el.name;
      const type = el.dataset.type;

      if (el.type === "checkbox") {
        data[name] = el.checked;
      } else if (type === "array") {
        data[name] = el.value.split("\n").filter((v) => v.trim());
      } else if (type === "object") {
        try {
          data[name] = JSON.parse(el.value || "{}");
        } catch {
          data[name] = {};
        }
      } else if (el.type === "number") {
        data[name] = parseFloat(el.value) || 0;
      } else {
        data[name] = el.value;
      }
    });

    try {
      this._curationSystem.update(storeId, data);
      this._showToast("Store updated", "success");
    } catch (e) {
      this._showToast(`Error: ${e.message}`, "error");
    }
  },

  /**
   * Confirm clear store
   * @param {string} storeId - Store ID
   */
  _confirmClearStore(storeId) {
    const schema = this._curationSystem.getStoreSchema(storeId);
    if (!schema) return;

    if (
      confirm(
        `Are you sure you want to clear all data in "${schema.name}"? This cannot be undone.`,
      )
    ) {
      try {
        this._curationSystem.clearStore(storeId);
        this._showToast(`Store "${schema.name}" cleared`, "success");
        this._refreshCurrentTab();
      } catch (e) {
        this._showToast(`Error: ${e.message}`, "error");
      }
    }
  },

  /**
   * Confirm delete entry
   * @param {string} storeId - Store ID
   * @param {string} key - Entry key
   */
  _confirmDeleteEntry(storeId, key) {
    if (
      confirm(
        `Are you sure you want to delete this entry? This cannot be undone.`,
      )
    ) {
      try {
        this._curationSystem.delete(storeId, key);
        this._showToast("Entry deleted", "success");
        this._refreshCurrentTab();
      } catch (e) {
        this._showToast(`Error: ${e.message}`, "error");
      }
    }
  },

  /**
   * Show entry create/edit dialog
   * @param {string} storeId - Store ID
   * @param {string} key - Entry key (for edit) or null (for create)
   */
  _showEntryDialog(storeId, key = null) {
    const schema = this._curationSystem.getStoreSchema(storeId);
    if (!schema || schema.isSingleton) return;

    const entry = key ? this._curationSystem.read(storeId, key) : null;
    const isEdit = !!entry;

    const dialogHtml = `
      <div class="council-dialog-overlay" data-dialog="entry">
        <div class="council-dialog council-dialog-lg">
          <div class="council-dialog-header">
            <h3>${isEdit ? "Edit" : "Create"} ${schema.name}</h3>
            <button class="council-dialog-close" data-action="dialog-close">✕</button>
          </div>
          <div class="council-dialog-body">
            ${Object.entries(schema.fields || {})
              .map(([fieldName, fieldDef]) => {
                const value = entry ? entry[fieldName] : fieldDef.default;
                return this._renderFormField(
                  fieldName,
                  fieldDef,
                  value,
                  storeId,
                );
              })
              .join("")}
          </div>
          <div class="council-dialog-footer">
            <button class="council-curation-btn council-curation-btn-secondary" data-action="dialog-close">
              Cancel
            </button>
            <button class="council-curation-btn council-curation-btn-primary" data-action="dialog-save">
              ${isEdit ? "Save Changes" : "Create Entry"}
            </button>
          </div>
        </div>
      </div>
    `;

    this._showDialog(dialogHtml, (dialog) => {
      const data = this._getDialogFormData(dialog, schema);

      try {
        if (isEdit) {
          this._curationSystem.update(storeId, key, data);
          this._showToast("Entry updated", "success");
        } else {
          this._curationSystem.create(storeId, data);
          this._showToast("Entry created", "success");
        }
        this._refreshCurrentTab();
        return true;
      } catch (e) {
        this._showToast(`Error: ${e.message}`, "error");
        return false;
      }
    });
  },

  // ===== DIALOG UTILITIES =====

  /**
   * Show a dialog
   * @param {string} html - Dialog HTML
   * @param {Function} onSave - Save handler
   */
  _showDialog(html, onSave) {
    const container = document.createElement("div");
    container.innerHTML = html;
    const overlay = container.firstElementChild;

    document.body.appendChild(overlay);

    const closeDialog = () => {
      overlay.classList.add("closing");
      setTimeout(() => overlay.remove(), 200);
    };

    // Bind close to ALL dialog-close buttons (header X and footer Cancel)
    overlay
      .querySelectorAll('[data-action="dialog-close"]')
      .forEach((btn) => btn.addEventListener("click", closeDialog));
    overlay
      .querySelectorAll(".council-dialog-close")
      .forEach((btn) => btn.addEventListener("click", closeDialog));

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeDialog();
    });

    overlay
      .querySelector('[data-action="dialog-save"]')
      ?.addEventListener("click", () => {
        const result = onSave(overlay);
        if (result !== false) closeDialog();
      });
  },

  /**
   * Get form data from dialog
   * @param {Element} dialog - Dialog element
   * @param {Object} schema - Store schema
   * @returns {Object} Form data
   */
  _getDialogFormData(dialog, schema) {
    const data = {};

    dialog.querySelectorAll("[name]").forEach((el) => {
      const name = el.name;
      const fieldDef = schema.fields?.[name] || {};
      const type = el.dataset.type || fieldDef.type;

      if (el.type === "checkbox") {
        data[name] = el.checked;
      } else if (type === "array") {
        data[name] = el.value.split("\n").filter((v) => v.trim());
      } else if (type === "object") {
        try {
          data[name] = JSON.parse(el.value || "{}");
        } catch {
          data[name] = {};
        }
      } else if (type === "number") {
        data[name] = parseFloat(el.value) || 0;
      } else {
        data[name] = el.value;
      }
    });

    return data;
  },

  // ===== STATUS & TOAST =====

  /**
   * Update status bar
   */
  _updateStatus() {
    const statusText = this._elements.modal?.querySelector(
      ".council-curation-status-text",
    );
    if (!statusText) return;

    const summary = this._curationSystem.getSummary();
    statusText.textContent =
      summary.dirtyStoreCount > 0
        ? `⚠️ ${summary.dirtyStoreCount} store(s) have unsaved changes`
        : `✓ All changes saved`;
  },

  /**
   * Show toast message
   * @param {string} message - Message
   * @param {string} type - Type (success, error, info)
   */
  _showToast(message, type = "info") {
    const toast = document.createElement("div");
    toast.className = `council-toast council-toast-${type}`;
    toast.textContent = message;

    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add("visible"), 10);
    setTimeout(() => {
      toast.classList.remove("visible");
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  },

  // ===== UTILITIES =====

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
   * Truncate text
   * @param {string} str - String to truncate
   * @param {number} maxLength - Max length
   * @returns {string} Truncated string
   */
  _truncate(str, maxLength) {
    if (!str || str.length <= maxLength) return str || "";
    return str.substring(0, maxLength) + "...";
  },

  /**
   * Log a message
   * @param {string} level - Log level
   * @param {string} message - Message
   * @param {...any} args - Additional arguments
   */
  _log(level, message, ...args) {
    if (this._logger && typeof this._logger[level] === "function") {
      this._logger[level](`[CurationModal] ${message}`, ...args);
    }
  },

  // ===== STYLES =====

  /**
   * Inject modal styles
   */
  _injectStyles() {
    if (document.getElementById("council-curation-modal-styles")) {
      return;
    }

    const style = document.createElement("style");
    style.id = "council-curation-modal-styles";
    style.textContent = `
      .council-curation-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        z-index: 9998;
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.2s ease, visibility 0.2s ease;
      }

      .council-curation-overlay.visible {
        opacity: 1;
        visibility: visible;
      }

      .council-curation-modal {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) scale(0.95);
        width: 90%;
        max-width: 1100px;
        max-height: 90vh;
        background: var(--council-bg-primary, #1a1a2e);
        border: 1px solid var(--council-border, #444);
        border-radius: var(--council-radius-xl, 12px);
        box-shadow: var(--council-shadow-lg, 0 16px 64px rgba(0, 0, 0, 0.5));
        z-index: 9999;
        opacity: 0;
        visibility: hidden;
        transition: all 0.2s ease;
        display: flex;
        flex-direction: column;
      }

      .council-curation-modal.visible {
        opacity: 1;
        visibility: visible;
        transform: translate(-50%, -50%) scale(1);
      }

      .council-curation-container {
        display: flex;
        flex-direction: column;
        height: 100%;
        max-height: 90vh;
      }

      .council-curation-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 20px;
        border-bottom: 1px solid var(--council-border, #444);
      }

      .council-curation-title {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 1.25rem;
        font-weight: 600;
        margin: 0;
        color: var(--council-text, #eee);
      }

      .council-curation-tabs {
        display: flex;
        gap: 4px;
        padding: 12px 20px;
        border-bottom: 1px solid var(--council-border, #444);
      }

      .council-curation-tab {
        padding: 8px 16px;
        background: transparent;
        border: 1px solid transparent;
        border-radius: var(--council-radius-md, 6px);
        color: var(--council-text-muted, rgba(255, 255, 255, 0.6));
        cursor: pointer;
        transition: all 0.15s ease;
      }

      .council-curation-tab:hover {
        background: var(--council-bg-hover, rgba(255, 255, 255, 0.1));
        color: var(--council-text, #eee);
      }

      .council-curation-tab.active {
        background: var(--council-bg-active, rgba(102, 126, 234, 0.2));
        border-color: var(--council-primary, #667eea);
        color: var(--council-primary, #667eea);
      }

      .council-curation-content {
        flex: 1;
        overflow-y: auto;
        padding: 20px;
      }

      .council-curation-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 20px;
        border-top: 1px solid var(--council-border, #444);
      }

      .council-curation-btn {
        padding: 8px 16px;
        border: 1px solid var(--council-border, #444);
        border-radius: var(--council-radius-md, 6px);
        background: var(--council-bg-secondary, rgba(255, 255, 255, 0.05));
        color: var(--council-text, #eee);
        cursor: pointer;
        transition: all 0.15s ease;
        font-size: 0.875rem;
      }

      .council-curation-btn:hover {
        background: var(--council-bg-hover, rgba(255, 255, 255, 0.1));
      }

      .council-curation-btn-sm { padding: 4px 8px; font-size: 0.75rem; }
      .council-curation-btn-icon { padding: 8px; min-width: 36px; }

      .council-curation-btn-primary {
        background: var(--council-primary, #667eea);
        border-color: var(--council-primary, #667eea);
        color: white;
      }

      .council-curation-btn-danger {
        background: var(--council-error, #f87171);
        border-color: var(--council-error, #f87171);
        color: white;
      }

      .council-store-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
        gap: 16px;
      }

      .council-store-card {
        background: var(--council-bg-secondary, rgba(255, 255, 255, 0.05));
        border: 1px solid var(--council-border, #444);
        border-radius: var(--council-radius-lg, 8px);
        overflow: hidden;
        transition: border-color 0.15s ease;
      }

      .council-store-card.dirty {
        border-color: var(--council-warning, #fbbf24);
      }

      .council-store-card:hover {
        border-color: var(--council-primary, #667eea);
      }

      .council-store-card-header {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px;
        background: var(--council-bg-hover, rgba(255, 255, 255, 0.1));
      }

      .council-dirty-badge {
        color: var(--council-warning, #fbbf24);
        margin-left: auto;
      }

      .council-store-card-body { padding: 12px; }
      .council-store-card-actions {
        display: flex;
        gap: 8px;
        padding: 12px;
        border-top: 1px solid var(--council-border, #444);
        justify-content: flex-end;
      }

      .council-stores-table { display: flex; flex-direction: column; }
      .council-table-header {
        display: grid;
        grid-template-columns: 2fr 1fr 1fr 1fr 2fr;
        gap: 12px;
        padding: 12px;
        background: var(--council-bg-hover, rgba(255, 255, 255, 0.1));
        font-weight: 600;
        border-radius: var(--council-radius-md, 6px);
      }

      .council-table-row {
        display: grid;
        grid-template-columns: 2fr 1fr 1fr 1fr 2fr;
        gap: 12px;
        padding: 12px;
        border-bottom: 1px solid var(--council-border, #444);
        align-items: center;
      }

      .council-type-badge {
        font-size: 0.7rem;
        padding: 2px 8px;
        border-radius: 4px;
        background: var(--council-bg-hover);
      }

      .council-status-badge.dirty { color: var(--council-warning, #fbbf24); }
      .council-status-badge.saved { color: var(--council-success, #4ade80); }

      .council-detail-header {
        display: flex;
        align-items: center;
        gap: 16px;
        margin-bottom: 20px;
        flex-wrap: wrap;
      }

      .council-detail-title {
        display: flex;
        align-items: center;
        gap: 8px;
        flex: 1;
      }

      .council-entry-count {
        font-size: 0.85rem;
        color: var(--council-text-muted);
      }

      .council-collection-list { display: flex; flex-direction: column; gap: 8px; }

      .council-entry-row {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        background: var(--council-bg-secondary);
        border-radius: var(--council-radius-md, 6px);
      }

      .council-entry-main { flex: 2; }
      .council-entry-name { font-weight: 600; display: block; }
      .council-entry-preview { font-size: 0.85rem; color: var(--council-text-muted); }
      .council-entry-meta { flex: 1; display: flex; gap: 8px; }
      .council-entry-actions { display: flex; gap: 6px; }

      .council-search-header { margin-bottom: 20px; }
      .council-search-input-row { display: flex; gap: 8px; margin-bottom: 12px; }
      .council-search-input { flex: 1; }
      .council-results-count { margin-bottom: 12px; color: var(--council-text-muted); }
      .council-results-list { display: flex; flex-direction: column; gap: 8px; }

      .council-search-result {
        padding: 12px;
        background: var(--council-bg-secondary);
        border-radius: var(--council-radius-md, 6px);
        border: 1px solid var(--council-border, #444);
      }

      .council-result-header { display: flex; gap: 8px; margin-bottom: 4px; }
      .council-result-store { font-size: 0.75rem; color: var(--council-primary); }
      .council-result-name { font-weight: 600; }
      .council-result-preview { font-size: 0.85rem; color: var(--council-text-muted); margin-bottom: 8px; }

      .council-section-title { margin-bottom: 12px; font-size: 1rem; color: var(--council-text); }
      .council-overview-section { margin-bottom: 24px; }
      .council-overview-stats { display: flex; gap: 16px; margin-bottom: 20px; }

      .council-stat {
        text-align: center;
        padding: 12px 20px;
        background: var(--council-bg-secondary);
        border-radius: var(--council-radius-md, 6px);
      }

      .council-stat.warning { border: 1px solid var(--council-warning, #fbbf24); }
      .council-stat.success { border: 1px solid var(--council-success, #4ade80); }
      .council-stat-value { display: block; font-size: 1.5rem; font-weight: 600; }
      .council-stat-label { font-size: 0.75rem; color: var(--council-text-muted); }

      .council-positions-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px; }
      .council-position-card { padding: 12px; background: var(--council-bg-secondary); border-radius: var(--council-radius-md); }
      .council-position-name { font-weight: 600; }
      .council-position-tier { font-size: 0.75rem; color: var(--council-text-muted); }

      .council-pipelines-list { display: flex; flex-direction: column; gap: 8px; }
      .council-pipeline-row { display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--council-bg-secondary); border-radius: var(--council-radius-md); }
      .council-pipeline-name { flex: 1; font-weight: 600; }

      .council-empty-state { text-align: center; padding: 40px 20px; }
      .council-empty-icon { font-size: 3rem; margin-bottom: 16px; }
      .council-empty-text { color: var(--council-text-muted); margin-bottom: 16px; }

      .council-curation-warning {
        display: flex;
        gap: 12px;
        padding: 16px;
        background: rgba(251, 191, 36, 0.1);
        border: 1px solid var(--council-warning, #fbbf24);
        border-radius: var(--council-radius-md, 6px);
        margin-top: 16px;
      }

      .council-dialog-overlay {
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0, 0, 0, 0.8);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .council-dialog {
        width: 90%;
        max-width: 500px;
        max-height: 80vh;
        background: var(--council-bg-primary, #1a1a2e);
        border: 1px solid var(--council-border, #444);
        border-radius: var(--council-radius-lg, 8px);
        display: flex;
        flex-direction: column;
      }

      .council-dialog-lg { max-width: 700px; }
      .council-dialog-header { display: flex; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid var(--council-border); }
      .council-dialog-body { flex: 1; overflow-y: auto; padding: 20px; }
      .council-dialog-footer { display: flex; justify-content: flex-end; gap: 8px; padding: 16px 20px; border-top: 1px solid var(--council-border); }

      .council-form-group { margin-bottom: 16px; }
      .council-form-label { display: block; margin-bottom: 6px; color: var(--council-text); }
      .council-required { color: var(--council-error); }

      .council-form-input, .council-form-select, .council-form-textarea {
        width: 100%;
        padding: 10px 12px;
        background: var(--council-bg-secondary);
        border: 1px solid var(--council-border);
        border-radius: var(--council-radius-md);
        color: var(--council-text);
        font-family: inherit;
      }

      .council-form-input:focus, .council-form-textarea:focus {
        outline: none;
        border-color: var(--council-primary);
      }

      .council-form-textarea { min-height: 80px; resize: vertical; }
      .council-form-textarea-large { min-height: 150px; }
      .council-form-hint { font-size: 0.75rem; color: var(--council-text-muted); margin-top: 4px; }

      .muted { color: var(--council-text-muted); }

      /* Team Tab Styles */
      .council-team-view {
        display: flex;
        flex-direction: column;
        gap: 24px;
      }

      .council-team-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px;
        background: var(--council-surface);
        border-radius: var(--council-radius-lg);
      }

      .council-team-stats {
        display: flex;
        gap: 24px;
      }

      .council-team-section {
        background: var(--council-surface);
        border-radius: var(--council-radius-lg);
        padding: 16px;
      }

      .council-section-description {
        color: var(--council-text-muted);
        font-size: 0.875rem;
        margin-bottom: 16px;
      }

      .council-positions-list,
      .council-agents-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .council-position-card {
        background: var(--council-bg);
        border: 1px solid var(--council-border);
        border-radius: var(--council-radius-md);
        padding: 12px 16px;
      }

      .council-position-card.assigned {
        border-left: 3px solid var(--council-success);
      }

      .council-position-card.unassigned {
        border-left: 3px solid var(--council-warning);
      }

      .council-position-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      }

      .council-position-info {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .council-position-name {
        font-weight: 600;
        color: var(--council-text);
      }

      .council-position-tier {
        font-size: 0.75rem;
        padding: 2px 8px;
        border-radius: 12px;
        background: var(--council-surface);
        color: var(--council-text-muted);
      }

      .council-tier-core { background: var(--council-primary); color: white; }
      .council-tier-specialized { background: var(--council-secondary); color: white; }
      .council-tier-support { background: var(--council-surface); }

      .council-status-badge {
        font-size: 0.75rem;
        padding: 2px 8px;
        border-radius: 12px;
      }

      .council-status-badge.success {
        background: rgba(34, 197, 94, 0.2);
        color: var(--council-success);
      }

      .council-status-badge.warning {
        background: rgba(234, 179, 8, 0.2);
        color: var(--council-warning);
      }

      .council-position-body {
        margin-bottom: 12px;
      }

      .council-position-role {
        font-size: 0.875rem;
        color: var(--council-text-muted);
        margin-bottom: 8px;
      }

      .council-position-agent {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 0.875rem;
      }

      .council-agent-label,
      .council-position-label {
        color: var(--council-text-muted);
      }

      .council-position-actions {
        display: flex;
        gap: 8px;
      }

      /* Agent Card Styles */
      .council-agent-card {
        background: var(--council-bg, var(--SmartThemeBlurTintColor, #1a1a2e));
        border: 1px solid var(--council-border, var(--SmartThemeBorderColor, #333));
        border-radius: var(--council-radius-md, 8px);
        padding: 16px;
      }

      .council-agent-card.default {
        border-left: 3px solid var(--council-primary, #3b82f6);
      }

      .council-agent-card.custom {
        border-left: 3px solid var(--council-secondary, #8b5cf6);
      }

      .council-agent-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
      }

      .council-agent-info {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .council-agent-icon {
        font-size: 1.25rem;
      }

      .council-agent-name {
        font-weight: 600;
        color: var(--council-text, var(--SmartThemeBodyColor, #fff));
      }

      .council-badge {
        font-size: 0.625rem;
        padding: 2px 6px;
        border-radius: 8px;
        text-transform: uppercase;
        font-weight: 600;
      }

      .council-badge.default {
        background: var(--council-primary, #3b82f6);
        color: white;
      }

      .council-agent-position {
        font-size: 0.875rem;
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .council-agent-body {
        margin-bottom: 12px;
      }

      .council-agent-description {
        font-size: 0.875rem;
        color: var(--council-text-muted, #888);
        margin-bottom: 12px;
      }

      .council-agent-prompt-preview {
        background: var(--council-surface, rgba(0,0,0,0.2));
        border-radius: var(--council-radius-sm, 4px);
        padding: 8px 12px;
        margin-bottom: 12px;
      }

      .council-prompt-label {
        font-size: 0.75rem;
        color: var(--council-text-muted, #888);
        display: block;
        margin-bottom: 4px;
      }

      .council-prompt-text {
        font-size: 0.8125rem;
        color: var(--council-text, #fff);
        font-family: monospace;
        white-space: pre-wrap;
        word-break: break-word;
      }

      .council-agent-config {
        display: flex;
        gap: 16px;
        flex-wrap: wrap;
      }

      .council-config-item {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 0.75rem;
      }

      .council-config-label {
        color: var(--council-text-muted, #888);
      }

      .council-config-value {
        font-weight: 500;
        color: var(--council-text, #fff);
      }

      .council-agent-actions {
        display: flex;
        gap: 8px;
        padding-top: 12px;
        border-top: 1px solid var(--council-border, #333);
      }

      /* Dialog Styles - Solid Background Fix */
      .council-curation-dialog-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10002;
      }

      .council-curation-dialog {
        background: var(--SmartThemeBlurTintColor, #1a1a2e);
        border: 1px solid var(--SmartThemeBorderColor, #444);
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
        width: 90%;
        max-width: 500px;
        max-height: 90vh;
        display: flex;
        flex-direction: column;
      }

      .council-curation-dialog-lg {
        max-width: 800px;
      }

      .council-curation-dialog-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 20px;
        border-bottom: 1px solid var(--SmartThemeBorderColor, #444);
        background: rgba(0, 0, 0, 0.2);
        border-radius: 12px 12px 0 0;
      }

      .council-curation-dialog-header h3 {
        margin: 0;
        font-size: 1.125rem;
        color: var(--SmartThemeBodyColor, #fff);
      }

      .council-curation-dialog-close {
        background: none;
        border: none;
        font-size: 1.25rem;
        cursor: pointer;
        color: var(--SmartThemeBodyColor, #888);
        padding: 4px 8px;
        border-radius: 4px;
        transition: background 0.15s;
      }

      .council-curation-dialog-close:hover {
        color: var(--SmartThemeBodyColor, #fff);
        background: rgba(255, 255, 255, 0.1);
      }

      .council-curation-dialog-content {
        padding: 20px;
        overflow-y: auto;
        flex: 1;
        background: var(--SmartThemeBlurTintColor, #1a1a2e);
      }

      .council-curation-dialog-scrollable {
        max-height: calc(90vh - 140px);
      }

      .council-curation-dialog-section {
        margin-bottom: 24px;
        padding-bottom: 20px;
        border-bottom: 1px solid var(--SmartThemeBorderColor, #333);
      }

      .council-curation-dialog-section:last-child {
        border-bottom: none;
        margin-bottom: 0;
      }

      .council-curation-section-title {
        margin: 0 0 16px 0;
        font-size: 1rem;
        font-weight: 600;
        color: var(--SmartThemeBodyColor, #fff);
      }

      .council-curation-dialog-footer {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        padding: 16px 20px;
        border-top: 1px solid var(--SmartThemeBorderColor, #444);
        background: rgba(0, 0, 0, 0.2);
        border-radius: 0 0 12px 12px;
      }

      .council-curation-form-group {
        margin-bottom: 16px;
      }

      .council-curation-form-group label {
        display: block;
        margin-bottom: 6px;
        font-size: 0.875rem;
        font-weight: 500;
        color: var(--SmartThemeBodyColor, #ccc);
      }

      .council-curation-form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
      }

      .council-form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
      }

      .council-checkbox {
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
      }

      .council-checkbox input {
        width: 16px;
        height: 16px;
      }

      .council-curation-btn-danger {
        background: var(--council-error, #ef4444);
        color: white;
      }

      .council-curation-btn-danger:hover {
        background: #dc2626;
      }

      /* PromptBuilder container inside dialog */
      .council-curation-prompt-builder-container {
        background: rgba(0, 0, 0, 0.15);
        border: 1px solid var(--SmartThemeBorderColor, #333);
        border-radius: 8px;
        padding: 16px;
        min-height: 200px;
      }
    `;

    document.head.appendChild(style);
  },
};

// Export for different environments
if (typeof window !== "undefined") {
  window.CurationModal = CurationModal;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = CurationModal;
}
