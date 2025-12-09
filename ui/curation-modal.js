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
    if (!this._isVisible) return;

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
  _renderPipelinesTab() {
    const positions = this._curationSystem.getCurationPositions();

    this._elements.content.innerHTML = `
      <div class="council-pipelines-view">
        <div class="council-pipelines-section council-pipelines-team">
          <h3 class="council-section-title">🤖 Curation Team</h3>
          <div class="council-positions-grid">
            ${positions
              .map(
                (p) => `
              <div class="council-position-card">
                <div class="council-position-name">${this._escapeHtml(p.name)}</div>
                <div class="council-position-tier">${p.tier}</div>
              </div>
            `,
              )
              .join("")}
          </div>
        </div>

        <div class="council-pipelines-section council-pipeline-builder-section">
          <h3 class="council-section-title">📊 Pipeline Builder</h3>
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

      default:
        this._log("warn", `Unknown action: ${action}`);
    }
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
