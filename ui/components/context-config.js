/**
 * TheCouncil - Context Configuration Component
 *
 * A reusable component for configuring action context and I/O:
 * - Context sources (phase, store, thread, previous outputs)
 * - Output targets (next action, thread, store, phase context)
 * - Input/output mapping
 * - Variable extraction and injection
 *
 * @version 2.0.0
 */

const ContextConfig = {
  // ===== VERSION =====
  VERSION: "2.0.0",

  // ===== CONSTANTS =====

  /**
   * Context source types
   */
  SourceType: {
    PHASE_CONTEXT: "phase_context",
    STORE_RAG: "store_rag",
    THREAD_MESSAGES: "thread_messages",
    PREVIOUS_OUTPUT: "previous_output",
    CUSTOM: "custom",
    ST_CONTEXT: "st_context",
  },

  /**
   * Output target types
   */
  TargetType: {
    NEXT_ACTION: "next_action",
    THREAD_POST: "thread_post",
    STORE_WRITE: "store_write",
    PHASE_CONTEXT: "phase_context",
    PIPELINE_OUTPUT: "pipeline_output",
    VARIABLE: "variable",
  },

  /**
   * Source type information
   */
  SOURCE_INFO: {
    phase_context: {
      label: "Phase Context",
      icon: "📋",
      description: "Context accumulated from previous phases",
    },
    store_rag: {
      label: "Store Data (RAG)",
      icon: "🗃️",
      description: "Retrieve relevant data from curation stores",
    },
    thread_messages: {
      label: "Thread Messages",
      icon: "💬",
      description: "Messages from action or phase threads",
    },
    previous_output: {
      label: "Previous Output",
      icon: "⬅️",
      description: "Output from a previous action in this phase",
    },
    custom: {
      label: "Custom Text",
      icon: "✏️",
      description: "Static or templated custom context",
    },
    st_context: {
      label: "SillyTavern Context",
      icon: "🎭",
      description: "Character, chat, and persona information",
    },
  },

  /**
   * Target type information
   */
  TARGET_INFO: {
    next_action: {
      label: "Next Action Input",
      icon: "➡️",
      description: "Pass as input to the next action",
    },
    thread_post: {
      label: "Post to Thread",
      icon: "💬",
      description: "Post output as a thread message",
    },
    store_write: {
      label: "Write to Store",
      icon: "💾",
      description: "Save output to a curation store",
    },
    phase_context: {
      label: "Phase Context",
      icon: "📋",
      description: "Add to phase context for later actions",
    },
    pipeline_output: {
      label: "Pipeline Output",
      icon: "🏁",
      description: "Include in final pipeline output",
    },
    variable: {
      label: "Set Variable",
      icon: "📦",
      description: "Store in a named variable for later use",
    },
  },

  /**
   * ST Context fields available
   */
  ST_CONTEXT_FIELDS: [
    { id: "char_name", label: "Character Name", token: "{{char}}" },
    {
      id: "char_description",
      label: "Character Description",
      token: "{{description}}",
    },
    {
      id: "char_personality",
      label: "Character Personality",
      token: "{{personality}}",
    },
    { id: "char_scenario", label: "Scenario", token: "{{scenario}}" },
    { id: "user_name", label: "User Name", token: "{{user}}" },
    { id: "user_persona", label: "User Persona", token: "{{persona}}" },
    { id: "last_message", label: "Last Message", token: "{{lastMessage}}" },
    { id: "chat_history", label: "Chat History", token: "{{chatHistory}}" },
  ],

  // ===== STATE =====

  /**
   * Reference to CurationSystem
   * @type {Object|null}
   */
  _curationSystem: null,

  /**
   * Reference to PipelineBuilderSystem
   * @type {Object|null}
   */
  _pipelineBuilderSystem: null,

  /**
   * Reference to logger
   * @type {Object|null}
   */
  _logger: null,

  /**
   * Initialization flag
   * @type {boolean}
   */
  _initialized: false,

  // ===== INITIALIZATION =====

  /**
   * Initialize the Context Config component
   * @param {Object} options - Configuration options
   * @returns {ContextConfig}
   */
  init(options = {}) {
    this._curationSystem = options.curationSystem || window.CurationSystem;
    this._pipelineBuilderSystem = options.pipelineBuilderSystem || window.PipelineBuilderSystem;
    this._logger = options.logger || window.Logger;

    this._initialized = true;
    this._log("info", "ContextConfig initialized");

    return this;
  },

  /**
   * Create a new instance for a specific container
   * @param {Object} options - Instance options
   * @returns {Object} Instance with its own state
   */
  createInstance(options = {}) {
    const instance = {
      _config: {
        // Context sources
        sources: options.initialSources || [],
        // Output targets
        targets: options.initialTargets || [],
        // Input configuration
        input: {
          useActionInput: true,
          inputTemplate: "{{input}}",
          prependContext: true,
        },
        // Output configuration
        output: {
          format: "text", // 'text', 'json', 'markdown'
          extractVariables: [],
        },
      },
      _container: null,
      _activeTab: "sources",
      _onChangeCallback: options.onChange || null,
    };

    const boundInstance = {
      render: (container) => this._renderInstance(instance, container),
      getValue: () => this._getInstanceValue(instance),
      setValue: (config) => this._setInstanceValue(instance, config),
      destroy: () => this._destroyInstance(instance),
      refresh: () => this._refreshInstance(instance),
    };

    return boundInstance;
  },

  // ===== LOGGING =====

  /**
   * Log a message
   */
  _log(level, message, ...args) {
    const prefix = "[ContextConfig]";
    if (this._logger?.log) {
      this._logger.log(level, `${prefix} ${message}`, ...args);
    } else {
      const consoleFn =
        level === "error"
          ? console.error
          : level === "warn"
            ? console.warn
            : console.log;
      consoleFn(`${prefix} ${message}`, ...args);
    }
  },

  // ===== DATA ACCESS =====

  /**
   * Get available stores from CurationSystem
   * @returns {Array}
   */
  _getStores() {
    if (!this._curationSystem) return [];
    try {
      const summary = this._curationSystem.getSummary?.();
      return summary?.stores || [];
    } catch (e) {
      this._log("error", "Failed to get stores:", e);
      return [];
    }
  },

  /**
   * Get available threads from ThreadManager
   * @returns {Array}
   */
  _getThreads() {
    if (!this._pipelineBuilderSystem) return [];
    try {
      return this._pipelineBuilderSystem.listThreads?.() || [];
    } catch (e) {
      this._log("error", "Failed to get threads:", e);
      return [];
    }
  },

  // ===== INSTANCE RENDERING =====

  /**
   * Render an instance to a container
   */
  _renderInstance(instance, container) {
    if (!container) {
      this._log("error", "Container element required for render");
      return;
    }

    instance._container = container;
    container.innerHTML = "";
    container.className = "context-config";

    const html = `
      <div class="context-config-tabs">
        <button class="context-config-tab ${instance._activeTab === "sources" ? "active" : ""}" data-tab="sources">
          📥 Context Sources
        </button>
        <button class="context-config-tab ${instance._activeTab === "targets" ? "active" : ""}" data-tab="targets">
          📤 Output Targets
        </button>
        <button class="context-config-tab ${instance._activeTab === "input" ? "active" : ""}" data-tab="input">
          ⚙️ Input Config
        </button>
        <button class="context-config-tab ${instance._activeTab === "output" ? "active" : ""}" data-tab="output">
          📝 Output Config
        </button>
      </div>

      <div class="context-config-content">
        <!-- Tab content rendered here -->
      </div>
    `;

    container.innerHTML = html;

    // Bind tab clicks
    const tabs = container.querySelectorAll(".context-config-tab");
    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        instance._activeTab = tab.dataset.tab;
        tabs.forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
        this._renderTabContent(instance);
      });
    });

    // Render active tab content
    this._renderTabContent(instance);

    // Inject styles
    this._injectStyles();
  },

  /**
   * Render tab content
   */
  _renderTabContent(instance) {
    const contentEl = instance._container?.querySelector(
      ".context-config-content",
    );
    if (!contentEl) return;

    switch (instance._activeTab) {
      case "sources":
        this._renderSourcesTab(instance, contentEl);
        break;
      case "targets":
        this._renderTargetsTab(instance, contentEl);
        break;
      case "input":
        this._renderInputTab(instance, contentEl);
        break;
      case "output":
        this._renderOutputTab(instance, contentEl);
        break;
    }
  },

  /**
   * Render context sources tab
   */
  _renderSourcesTab(instance, contentEl) {
    const stores = this._getStores();
    const threads = this._getThreads();

    let html = `
      <div class="context-config-sources">
        <div class="context-config-section-header">
          <h4>Context Sources</h4>
          <p class="context-config-hint">Configure where this action gets its context from</p>
        </div>

        <div class="context-config-source-list">
          ${
            instance._config.sources.length === 0
              ? `<div class="context-config-empty">No context sources configured. Add sources below.</div>`
              : instance._config.sources
                  .map((source, index) => this._renderSourceItem(source, index))
                  .join("")
          }
        </div>

        <div class="context-config-add-section">
          <h5>Add Context Source</h5>
          <div class="context-config-source-types">
            ${Object.entries(this.SOURCE_INFO)
              .map(
                ([type, info]) => `
              <button class="context-config-add-btn" data-source-type="${type}" title="${info.description}">
                <span class="context-config-add-icon">${info.icon}</span>
                <span class="context-config-add-label">${info.label}</span>
              </button>
            `,
              )
              .join("")}
          </div>
        </div>
      </div>
    `;

    contentEl.innerHTML = html;

    // Bind add source buttons
    contentEl.querySelectorAll(".context-config-add-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const type = btn.dataset.sourceType;
        this._addSource(instance, type);
      });
    });

    // Bind source item actions
    this._bindSourceActions(instance, contentEl);
  },

  /**
   * Render a source item
   */
  _renderSourceItem(source, index) {
    const info = this.SOURCE_INFO[source.type] || {
      icon: "❓",
      label: source.type,
    };

    return `
      <div class="context-config-item" data-index="${index}">
        <div class="context-config-item-header">
          <span class="context-config-item-icon">${info.icon}</span>
          <span class="context-config-item-label">${info.label}</span>
          <div class="context-config-item-actions">
            <button class="context-config-item-btn" data-action="edit" title="Edit">✏️</button>
            <button class="context-config-item-btn" data-action="remove" title="Remove">✕</button>
          </div>
        </div>
        <div class="context-config-item-details">
          ${this._getSourceDetails(source)}
        </div>
      </div>
    `;
  },

  /**
   * Get source details summary
   */
  _getSourceDetails(source) {
    switch (source.type) {
      case "phase_context":
        return `<span class="context-config-detail">Include: ${source.includeAll ? "All" : source.keys?.join(", ") || "None"}</span>`;
      case "store_rag":
        return `<span class="context-config-detail">Store: ${source.storeId || "Not selected"}, Max: ${source.maxResults || 5}</span>`;
      case "thread_messages":
        return `<span class="context-config-detail">Thread: ${source.threadId || "Action thread"}, Last ${source.messageCount || 10} messages</span>`;
      case "previous_output":
        return `<span class="context-config-detail">Action: ${source.actionId || "Previous"}</span>`;
      case "custom":
        return `<span class="context-config-detail">${(source.content || "").substring(0, 50)}${(source.content || "").length > 50 ? "..." : ""}</span>`;
      case "st_context":
        return `<span class="context-config-detail">Fields: ${source.fields?.length || 0} selected</span>`;
      default:
        return "";
    }
  },

  /**
   * Bind source item action buttons
   */
  _bindSourceActions(instance, contentEl) {
    contentEl.querySelectorAll(".context-config-item").forEach((item) => {
      const index = parseInt(item.dataset.index, 10);

      item
        .querySelector('[data-action="edit"]')
        ?.addEventListener("click", () => {
          this._editSource(instance, index);
        });

      item
        .querySelector('[data-action="remove"]')
        ?.addEventListener("click", () => {
          this._removeSource(instance, index);
        });
    });
  },

  /**
   * Add a new source
   */
  _addSource(instance, type) {
    const newSource = this._createDefaultSource(type);
    instance._config.sources.push(newSource);
    this._renderTabContent(instance);
    this._notifyChange(instance);

    // Open editor for the new source
    this._editSource(instance, instance._config.sources.length - 1);
  },

  /**
   * Create default source configuration
   */
  _createDefaultSource(type) {
    const base = { type, enabled: true };

    switch (type) {
      case "phase_context":
        return { ...base, includeAll: true, keys: [] };
      case "store_rag":
        return {
          ...base,
          storeId: null,
          query: "{{input}}",
          maxResults: 5,
          minScore: 0.5,
        };
      case "thread_messages":
        return {
          ...base,
          threadId: null,
          messageCount: 10,
          includeSystem: false,
        };
      case "previous_output":
        return { ...base, actionId: null, useLatest: true };
      case "custom":
        return { ...base, content: "", label: "Custom Context" };
      case "st_context":
        return {
          ...base,
          fields: ["char_name", "char_description", "scenario"],
        };
      default:
        return base;
    }
  },

  /**
   * Remove a source
   */
  _removeSource(instance, index) {
    instance._config.sources.splice(index, 1);
    this._renderTabContent(instance);
    this._notifyChange(instance);
  },

  /**
   * Edit a source
   */
  _editSource(instance, index) {
    const source = instance._config.sources[index];
    if (!source) return;

    this._showSourceEditor(instance, index, source);
  },

  /**
   * Show source editor modal
   */
  _showSourceEditor(instance, index, source) {
    const overlay = document.createElement("div");
    overlay.className = "context-config-editor-overlay";

    const info = this.SOURCE_INFO[source.type] || {
      icon: "❓",
      label: source.type,
    };

    const modal = document.createElement("div");
    modal.className = "context-config-editor-modal";
    modal.innerHTML = `
      <div class="context-config-editor-header">
        <h4>${info.icon} ${info.label}</h4>
        <button class="context-config-editor-close">✕</button>
      </div>
      <div class="context-config-editor-content">
        ${this._getSourceEditorContent(source)}
      </div>
      <div class="context-config-editor-footer">
        <button class="context-config-btn context-config-btn-secondary" data-action="cancel">Cancel</button>
        <button class="context-config-btn context-config-btn-primary" data-action="save">Save</button>
      </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const closeModal = () => overlay.remove();

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeModal();
    });

    modal
      .querySelector(".context-config-editor-close")
      ?.addEventListener("click", closeModal);
    modal
      .querySelector('[data-action="cancel"]')
      ?.addEventListener("click", closeModal);

    modal
      .querySelector('[data-action="save"]')
      ?.addEventListener("click", () => {
        const updatedSource = this._collectSourceEditorValues(modal, source);
        instance._config.sources[index] = updatedSource;
        this._renderTabContent(instance);
        this._notifyChange(instance);
        closeModal();
      });
  },

  /**
   * Get source editor content based on type
   */
  _getSourceEditorContent(source) {
    switch (source.type) {
      case "phase_context":
        return `
          <div class="context-config-field">
            <label class="context-config-checkbox">
              <input type="checkbox" data-field="includeAll" ${source.includeAll ? "checked" : ""}>
              <span>Include all phase context</span>
            </label>
          </div>
          <div class="context-config-field">
            <label>Specific keys (comma-separated):</label>
            <input type="text" class="context-config-input" data-field="keys"
                   value="${(source.keys || []).join(", ")}"
                   placeholder="outline, summary, characters"
                   ${source.includeAll ? "disabled" : ""}>
          </div>
        `;

      case "store_rag":
        const stores = this._getStores();
        return `
          <div class="context-config-field">
            <label>Store:</label>
            <select class="context-config-select" data-field="storeId">
              <option value="">-- Select a store --</option>
              ${stores
                .map(
                  (s) => `
                <option value="${this._escapeHtml(s.id)}" ${source.storeId === s.id ? "selected" : ""}>
                  ${this._escapeHtml(s.name || s.id)}
                </option>
              `,
                )
                .join("")}
            </select>
          </div>
          <div class="context-config-field">
            <label>Query template:</label>
            <input type="text" class="context-config-input" data-field="query"
                   value="${this._escapeHtml(source.query || "{{input}}")}"
                   placeholder="{{input}}">
            <span class="context-config-hint">Use {{input}} for action input, {{context}} for phase context</span>
          </div>
          <div class="context-config-field-row">
            <div class="context-config-field">
              <label>Max results:</label>
              <input type="number" class="context-config-input-sm" data-field="maxResults"
                     value="${source.maxResults || 5}" min="1" max="20">
            </div>
            <div class="context-config-field">
              <label>Min score:</label>
              <input type="number" class="context-config-input-sm" data-field="minScore"
                     value="${source.minScore || 0.5}" min="0" max="1" step="0.1">
            </div>
          </div>
        `;

      case "thread_messages":
        return `
          <div class="context-config-field">
            <label>Thread:</label>
            <select class="context-config-select" data-field="threadId">
              <option value="">Action Thread (default)</option>
              <option value="phase" ${source.threadId === "phase" ? "selected" : ""}>Phase Thread</option>
              <option value="pipeline" ${source.threadId === "pipeline" ? "selected" : ""}>Pipeline Thread</option>
            </select>
          </div>
          <div class="context-config-field">
            <label>Number of messages:</label>
            <input type="number" class="context-config-input-sm" data-field="messageCount"
                   value="${source.messageCount || 10}" min="1" max="100">
          </div>
          <div class="context-config-field">
            <label class="context-config-checkbox">
              <input type="checkbox" data-field="includeSystem" ${source.includeSystem ? "checked" : ""}>
              <span>Include system messages</span>
            </label>
          </div>
        `;

      case "previous_output":
        return `
          <div class="context-config-field">
            <label class="context-config-checkbox">
              <input type="checkbox" data-field="useLatest" ${source.useLatest !== false ? "checked" : ""}>
              <span>Use output from immediately previous action</span>
            </label>
          </div>
          <div class="context-config-field">
            <label>Or specify action ID:</label>
            <input type="text" class="context-config-input" data-field="actionId"
                   value="${this._escapeHtml(source.actionId || "")}"
                   placeholder="action_id"
                   ${source.useLatest !== false ? "disabled" : ""}>
          </div>
        `;

      case "custom":
        return `
          <div class="context-config-field">
            <label>Label:</label>
            <input type="text" class="context-config-input" data-field="label"
                   value="${this._escapeHtml(source.label || "")}"
                   placeholder="Custom Context">
          </div>
          <div class="context-config-field">
            <label>Content:</label>
            <textarea class="context-config-textarea" data-field="content" rows="6"
                      placeholder="Enter custom context text...&#10;You can use {{macros}} here.">${this._escapeHtml(source.content || "")}</textarea>
          </div>
        `;

      case "st_context":
        return `
          <div class="context-config-field">
            <label>Select fields to include:</label>
            <div class="context-config-field-list">
              ${this.ST_CONTEXT_FIELDS.map(
                (field) => `
                <label class="context-config-checkbox">
                  <input type="checkbox" data-st-field="${field.id}"
                         ${(source.fields || []).includes(field.id) ? "checked" : ""}>
                  <span>${field.label}</span>
                  <code>${field.token}</code>
                </label>
              `,
              ).join("")}
            </div>
          </div>
        `;

      default:
        return `<p>No configuration available for this source type.</p>`;
    }
  },

  /**
   * Collect values from source editor
   */
  _collectSourceEditorValues(modal, source) {
    const updated = { ...source };

    switch (source.type) {
      case "phase_context":
        updated.includeAll =
          modal.querySelector('[data-field="includeAll"]')?.checked ?? true;
        const keysInput =
          modal.querySelector('[data-field="keys"]')?.value || "";
        updated.keys = keysInput
          .split(",")
          .map((k) => k.trim())
          .filter((k) => k);
        break;

      case "store_rag":
        updated.storeId =
          modal.querySelector('[data-field="storeId"]')?.value || null;
        updated.query =
          modal.querySelector('[data-field="query"]')?.value || "{{input}}";
        updated.maxResults =
          parseInt(
            modal.querySelector('[data-field="maxResults"]')?.value,
            10,
          ) || 5;
        updated.minScore =
          parseFloat(modal.querySelector('[data-field="minScore"]')?.value) ||
          0.5;
        break;

      case "thread_messages":
        updated.threadId =
          modal.querySelector('[data-field="threadId"]')?.value || null;
        updated.messageCount =
          parseInt(
            modal.querySelector('[data-field="messageCount"]')?.value,
            10,
          ) || 10;
        updated.includeSystem =
          modal.querySelector('[data-field="includeSystem"]')?.checked ?? false;
        break;

      case "previous_output":
        updated.useLatest =
          modal.querySelector('[data-field="useLatest"]')?.checked ?? true;
        updated.actionId =
          modal.querySelector('[data-field="actionId"]')?.value || null;
        break;

      case "custom":
        updated.label =
          modal.querySelector('[data-field="label"]')?.value ||
          "Custom Context";
        updated.content =
          modal.querySelector('[data-field="content"]')?.value || "";
        break;

      case "st_context":
        const checkedFields = modal.querySelectorAll("[data-st-field]:checked");
        updated.fields = Array.from(checkedFields).map(
          (cb) => cb.dataset.stField,
        );
        break;
    }

    return updated;
  },

  /**
   * Render output targets tab
   */
  _renderTargetsTab(instance, contentEl) {
    let html = `
      <div class="context-config-targets">
        <div class="context-config-section-header">
          <h4>Output Targets</h4>
          <p class="context-config-hint">Configure where this action's output goes</p>
        </div>

        <div class="context-config-target-list">
          ${
            instance._config.targets.length === 0
              ? `<div class="context-config-empty">No output targets configured. Add targets below.</div>`
              : instance._config.targets
                  .map((target, index) => this._renderTargetItem(target, index))
                  .join("")
          }
        </div>

        <div class="context-config-add-section">
          <h5>Add Output Target</h5>
          <div class="context-config-target-types">
            ${Object.entries(this.TARGET_INFO)
              .map(
                ([type, info]) => `
              <button class="context-config-add-btn" data-target-type="${type}" title="${info.description}">
                <span class="context-config-add-icon">${info.icon}</span>
                <span class="context-config-add-label">${info.label}</span>
              </button>
            `,
              )
              .join("")}
          </div>
        </div>
      </div>
    `;

    contentEl.innerHTML = html;

    // Bind add target buttons
    contentEl.querySelectorAll(".context-config-add-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const type = btn.dataset.targetType;
        this._addTarget(instance, type);
      });
    });

    // Bind target item actions
    this._bindTargetActions(instance, contentEl);
  },

  /**
   * Render a target item
   */
  _renderTargetItem(target, index) {
    const info = this.TARGET_INFO[target.type] || {
      icon: "❓",
      label: target.type,
    };

    return `
      <div class="context-config-item" data-index="${index}">
        <div class="context-config-item-header">
          <span class="context-config-item-icon">${info.icon}</span>
          <span class="context-config-item-label">${info.label}</span>
          <div class="context-config-item-actions">
            <button class="context-config-item-btn" data-action="edit" title="Edit">✏️</button>
            <button class="context-config-item-btn" data-action="remove" title="Remove">✕</button>
          </div>
        </div>
        <div class="context-config-item-details">
          ${this._getTargetDetails(target)}
        </div>
      </div>
    `;
  },

  /**
   * Get target details summary
   */
  _getTargetDetails(target) {
    switch (target.type) {
      case "next_action":
        return `<span class="context-config-detail">${target.appendToInput ? "Append to existing input" : "Replace input"}</span>`;
      case "thread_post":
        return `<span class="context-config-detail">Thread: ${target.threadId || "Action thread"}</span>`;
      case "store_write":
        return `<span class="context-config-detail">Store: ${target.storeId || "Not selected"}, Mode: ${target.mode || "create"}</span>`;
      case "phase_context":
        return `<span class="context-config-detail">Key: ${target.contextKey || "output"}</span>`;
      case "pipeline_output":
        return `<span class="context-config-detail">Key: ${target.outputKey || "result"}</span>`;
      case "variable":
        return `<span class="context-config-detail">Variable: ${target.variableName || "unnamed"}</span>`;
      default:
        return "";
    }
  },

  /**
   * Bind target item actions
   */
  _bindTargetActions(instance, contentEl) {
    contentEl.querySelectorAll(".context-config-item").forEach((item) => {
      const index = parseInt(item.dataset.index, 10);

      item
        .querySelector('[data-action="edit"]')
        ?.addEventListener("click", () => {
          this._editTarget(instance, index);
        });

      item
        .querySelector('[data-action="remove"]')
        ?.addEventListener("click", () => {
          this._removeTarget(instance, index);
        });
    });
  },

  /**
   * Add a new target
   */
  _addTarget(instance, type) {
    const newTarget = this._createDefaultTarget(type);
    instance._config.targets.push(newTarget);
    this._renderTabContent(instance);
    this._notifyChange(instance);
  },

  /**
   * Create default target configuration
   */
  _createDefaultTarget(type) {
    const base = { type, enabled: true };

    switch (type) {
      case "next_action":
        return { ...base, appendToInput: false };
      case "thread_post":
        return { ...base, threadId: null, format: "message" };
      case "store_write":
        return { ...base, storeId: null, mode: "create", transform: null };
      case "phase_context":
        return { ...base, contextKey: "output" };
      case "pipeline_output":
        return { ...base, outputKey: "result", includeMetadata: false };
      case "variable":
        return { ...base, variableName: "", scope: "phase" };
      default:
        return base;
    }
  },

  /**
   * Remove a target
   */
  _removeTarget(instance, index) {
    instance._config.targets.splice(index, 1);
    this._renderTabContent(instance);
    this._notifyChange(instance);
  },

  /**
   * Edit a target
   */
  _editTarget(instance, index) {
    const target = instance._config.targets[index];
    if (!target) return;

    const overlay = document.createElement("div");
    overlay.className = "context-config-editor-overlay";

    const info = this.TARGET_INFO[target.type] || {
      icon: "❓",
      label: target.type,
    };

    const modal = document.createElement("div");
    modal.className = "context-config-editor-modal";
    modal.innerHTML = `
      <div class="context-config-editor-header">
        <h4>${info.icon} ${info.label}</h4>
        <button class="context-config-editor-close">✕</button>
      </div>
      <div class="context-config-editor-content">
        ${this._getTargetEditorContent(target)}
      </div>
      <div class="context-config-editor-footer">
        <button class="context-config-btn context-config-btn-secondary" data-action="cancel">Cancel</button>
        <button class="context-config-btn context-config-btn-primary" data-action="save">Save</button>
      </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const closeModal = () => overlay.remove();

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeModal();
    });

    modal
      .querySelector(".context-config-editor-close")
      ?.addEventListener("click", closeModal);
    modal
      .querySelector('[data-action="cancel"]')
      ?.addEventListener("click", closeModal);

    modal
      .querySelector('[data-action="save"]')
      ?.addEventListener("click", () => {
        const updated = this._collectTargetEditorValues(modal, target);
        instance._config.targets[index] = updated;
        this._renderTabContent(instance);
        this._notifyChange(instance);
        closeModal();
      });
  },

  /**
   * Get target editor content
   */
  _getTargetEditorContent(target) {
    const stores = this._getStores();

    switch (target.type) {
      case "next_action":
        return `
          <div class="context-config-field">
            <label class="context-config-checkbox">
              <input type="checkbox" data-field="appendToInput" ${target.appendToInput ? "checked" : ""}>
              <span>Append to existing input (instead of replacing)</span>
            </label>
          </div>
        `;

      case "thread_post":
        return `
          <div class="context-config-field">
            <label>Thread:</label>
            <select class="context-config-select" data-field="threadId">
              <option value="">Action Thread (default)</option>
              <option value="phase" ${target.threadId === "phase" ? "selected" : ""}>Phase Thread</option>
              <option value="pipeline" ${target.threadId === "pipeline" ? "selected" : ""}>Pipeline Thread</option>
            </select>
          </div>
          <div class="context-config-field">
            <label>Format:</label>
            <select class="context-config-select" data-field="format">
              <option value="message" ${target.format === "message" ? "selected" : ""}>As Message</option>
              <option value="system" ${target.format === "system" ? "selected" : ""}>As System</option>
            </select>
          </div>
        `;

      case "store_write":
        return `
          <div class="context-config-field">
            <label>Store:</label>
            <select class="context-config-select" data-field="storeId">
              <option value="">-- Select a store --</option>
              ${stores
                .map(
                  (s) => `
                <option value="${this._escapeHtml(s.id)}" ${target.storeId === s.id ? "selected" : ""}>
                  ${this._escapeHtml(s.name || s.id)}
                </option>
              `,
                )
                .join("")}
            </select>
          </div>
          <div class="context-config-field">
            <label>Write mode:</label>
            <select class="context-config-select" data-field="mode">
              <option value="create" ${target.mode === "create" ? "selected" : ""}>Create New Entry</option>
              <option value="update" ${target.mode === "update" ? "selected" : ""}>Update Existing</option>
              <option value="upsert" ${target.mode === "upsert" ? "selected" : ""}>Create or Update</option>
            </select>
          </div>
        `;

      case "phase_context":
        return `
          <div class="context-config-field">
            <label>Context key:</label>
            <input type="text" class="context-config-input" data-field="contextKey"
                   value="${this._escapeHtml(target.contextKey || "output")}"
                   placeholder="output">
            <span class="context-config-hint">Key name to store this output in phase context</span>
          </div>
        `;

      case "pipeline_output":
        return `
          <div class="context-config-field">
            <label>Output key:</label>
            <input type="text" class="context-config-input" data-field="outputKey"
                   value="${this._escapeHtml(target.outputKey || "result")}"
                   placeholder="result">
          </div>
          <div class="context-config-field">
            <label class="context-config-checkbox">
              <input type="checkbox" data-field="includeMetadata" ${target.includeMetadata ? "checked" : ""}>
              <span>Include execution metadata</span>
            </label>
          </div>
        `;

      case "variable":
        return `
          <div class="context-config-field">
            <label>Variable name:</label>
            <input type="text" class="context-config-input" data-field="variableName"
                   value="${this._escapeHtml(target.variableName || "")}"
                   placeholder="myVariable">
          </div>
          <div class="context-config-field">
            <label>Scope:</label>
            <select class="context-config-select" data-field="scope">
              <option value="action" ${target.scope === "action" ? "selected" : ""}>Action only</option>
              <option value="phase" ${target.scope === "phase" ? "selected" : ""}>Phase</option>
              <option value="pipeline" ${target.scope === "pipeline" ? "selected" : ""}>Pipeline</option>
            </select>
          </div>
        `;

      default:
        return `<p>No configuration available for this target type.</p>`;
    }
  },

  /**
   * Collect values from target editor
   */
  _collectTargetEditorValues(modal, target) {
    const updated = { ...target };

    switch (target.type) {
      case "next_action":
        updated.appendToInput =
          modal.querySelector('[data-field="appendToInput"]')?.checked ?? false;
        break;

      case "thread_post":
        updated.threadId =
          modal.querySelector('[data-field="threadId"]')?.value || null;
        updated.format =
          modal.querySelector('[data-field="format"]')?.value || "message";
        break;

      case "store_write":
        updated.storeId =
          modal.querySelector('[data-field="storeId"]')?.value || null;
        updated.mode =
          modal.querySelector('[data-field="mode"]')?.value || "create";
        break;

      case "phase_context":
        updated.contextKey =
          modal.querySelector('[data-field="contextKey"]')?.value || "output";
        break;

      case "pipeline_output":
        updated.outputKey =
          modal.querySelector('[data-field="outputKey"]')?.value || "result";
        updated.includeMetadata =
          modal.querySelector('[data-field="includeMetadata"]')?.checked ??
          false;
        break;

      case "variable":
        updated.variableName =
          modal.querySelector('[data-field="variableName"]')?.value || "";
        updated.scope =
          modal.querySelector('[data-field="scope"]')?.value || "phase";
        break;
    }

    return updated;
  },

  /**
   * Render input configuration tab
   */
  _renderInputTab(instance, contentEl) {
    contentEl.innerHTML = `
      <div class="context-config-input-config">
        <div class="context-config-section-header">
          <h4>Input Configuration</h4>
          <p class="context-config-hint">Configure how input is prepared for this action</p>
        </div>

        <div class="context-config-field">
          <label class="context-config-checkbox">
            <input type="checkbox" data-field="useActionInput"
                   ${instance._config.input.useActionInput ? "checked" : ""}>
            <span>Use action input</span>
          </label>
          <span class="context-config-hint">Include the input passed to this action</span>
        </div>

        <div class="context-config-field">
          <label>Input template:</label>
          <textarea class="context-config-textarea" data-field="inputTemplate" rows="4"
                    placeholder="{{input}}">${this._escapeHtml(instance._config.input.inputTemplate || "{{input}}")}</textarea>
          <span class="context-config-hint">Use {{input}} for action input, {{context}} for gathered context</span>
        </div>

        <div class="context-config-field">
          <label class="context-config-checkbox">
            <input type="checkbox" data-field="prependContext"
                   ${instance._config.input.prependContext ? "checked" : ""}>
            <span>Prepend gathered context to input</span>
          </label>
          <span class="context-config-hint">Add context from configured sources before the input</span>
        </div>
      </div>
    `;

    // Bind changes
    contentEl
      .querySelector('[data-field="useActionInput"]')
      ?.addEventListener("change", (e) => {
        instance._config.input.useActionInput = e.target.checked;
        this._notifyChange(instance);
      });

    contentEl
      .querySelector('[data-field="inputTemplate"]')
      ?.addEventListener("input", (e) => {
        instance._config.input.inputTemplate = e.target.value;
        this._notifyChange(instance);
      });

    contentEl
      .querySelector('[data-field="prependContext"]')
      ?.addEventListener("change", (e) => {
        instance._config.input.prependContext = e.target.checked;
        this._notifyChange(instance);
      });
  },

  /**
   * Render output configuration tab
   */
  _renderOutputTab(instance, contentEl) {
    contentEl.innerHTML = `
      <div class="context-config-output-config">
        <div class="context-config-section-header">
          <h4>Output Configuration</h4>
          <p class="context-config-hint">Configure how output is processed</p>
        </div>

        <div class="context-config-field">
          <label>Output format:</label>
          <select class="context-config-select" data-field="format">
            <option value="text" ${instance._config.output.format === "text" ? "selected" : ""}>Plain Text</option>
            <option value="json" ${instance._config.output.format === "json" ? "selected" : ""}>JSON (parse response)</option>
            <option value="markdown" ${instance._config.output.format === "markdown" ? "selected" : ""}>Markdown</option>
          </select>
        </div>

        <div class="context-config-field">
          <label>Extract variables (JSON paths):</label>
          <div class="context-config-var-list">
            ${(instance._config.output.extractVariables || [])
              .map(
                (v, i) => `
              <div class="context-config-var-item" data-index="${i}">
                <input type="text" class="context-config-input-sm" data-field="varName"
                       value="${this._escapeHtml(v.name || "")}" placeholder="name">
                <span>=</span>
                <input type="text" class="context-config-input" data-field="varPath"
                       value="${this._escapeHtml(v.path || "")}" placeholder="$.data.field">
                <button class="context-config-var-remove" data-index="${i}">✕</button>
              </div>
            `,
              )
              .join("")}
          </div>
          <button class="context-config-btn context-config-add-var">+ Add Variable</button>
          <span class="context-config-hint">Extract values from JSON output using JSONPath</span>
        </div>
      </div>
    `;

    // Bind format change
    contentEl
      .querySelector('[data-field="format"]')
      ?.addEventListener("change", (e) => {
        instance._config.output.format = e.target.value;
        this._notifyChange(instance);
      });

    // Bind add variable
    contentEl
      .querySelector(".context-config-add-var")
      ?.addEventListener("click", () => {
        instance._config.output.extractVariables =
          instance._config.output.extractVariables || [];
        instance._config.output.extractVariables.push({ name: "", path: "" });
        this._renderTabContent(instance);
        this._notifyChange(instance);
      });

    // Bind remove variable
    contentEl.querySelectorAll(".context-config-var-remove").forEach((btn) => {
      btn.addEventListener("click", () => {
        const index = parseInt(btn.dataset.index, 10);
        instance._config.output.extractVariables.splice(index, 1);
        this._renderTabContent(instance);
        this._notifyChange(instance);
      });
    });

    // Bind variable inputs
    contentEl.querySelectorAll(".context-config-var-item").forEach((item) => {
      const index = parseInt(item.dataset.index, 10);

      item
        .querySelector('[data-field="varName"]')
        ?.addEventListener("input", (e) => {
          instance._config.output.extractVariables[index].name = e.target.value;
          this._notifyChange(instance);
        });

      item
        .querySelector('[data-field="varPath"]')
        ?.addEventListener("input", (e) => {
          instance._config.output.extractVariables[index].path = e.target.value;
          this._notifyChange(instance);
        });
    });
  },

  // ===== INSTANCE VALUE MANAGEMENT =====

  /**
   * Get instance value
   */
  _getInstanceValue(instance) {
    return {
      sources: [...instance._config.sources],
      targets: [...instance._config.targets],
      input: { ...instance._config.input },
      output: { ...instance._config.output },
    };
  },

  /**
   * Set instance value
   */
  _setInstanceValue(instance, config) {
    if (config.sources) instance._config.sources = [...config.sources];
    if (config.targets) instance._config.targets = [...config.targets];
    if (config.input)
      instance._config.input = { ...instance._config.input, ...config.input };
    if (config.output)
      instance._config.output = {
        ...instance._config.output,
        ...config.output,
      };

    if (instance._container) {
      this._renderInstance(instance, instance._container);
    }
  },

  /**
   * Destroy instance
   */
  _destroyInstance(instance) {
    if (instance._container) {
      instance._container.innerHTML = "";
    }
    instance._container = null;
  },

  /**
   * Refresh instance display
   */
  _refreshInstance(instance) {
    if (instance._container) {
      this._renderInstance(instance, instance._container);
    }
  },

  /**
   * Notify change callback
   */
  _notifyChange(instance) {
    if (instance._onChangeCallback) {
      instance._onChangeCallback(this._getInstanceValue(instance));
    }
  },

  // ===== UTILITIES =====

  /**
   * Escape HTML special characters
   */
  _escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  },

  // ===== STYLES =====

  /**
   * Inject component styles
   */
  _injectStyles() {
    if (document.getElementById("context-config-styles")) return;

    const styles = document.createElement("style");
    styles.id = "context-config-styles";
    styles.textContent = `
      .context-config {
        font-family: inherit;
        font-size: 14px;
      }

      .context-config-tabs {
        display: flex;
        gap: 5px;
        margin-bottom: 15px;
        border-bottom: 1px solid var(--SmartThemeBorderColor, #444);
        padding-bottom: 10px;
      }

      .context-config-tab {
        padding: 8px 12px;
        border: 1px solid var(--SmartThemeBorderColor, #444);
        border-radius: 4px 4px 0 0;
        background: transparent;
        color: inherit;
        cursor: pointer;
        font-size: 13px;
      }

      .context-config-tab.active {
        background: var(--SmartThemeQuoteColor, #3a3);
        border-color: var(--SmartThemeQuoteColor, #3a3);
        color: #fff;
      }

      .context-config-content {
        min-height: 300px;
      }

      .context-config-section-header {
        margin-bottom: 15px;
      }

      .context-config-section-header h4 {
        margin: 0 0 5px 0;
      }

      .context-config-hint {
        font-size: 12px;
        color: var(--SmartThemeEmColor, #888);
      }

      .context-config-empty {
        text-align: center;
        padding: 30px;
        color: var(--SmartThemeEmColor, #888);
        border: 2px dashed var(--SmartThemeBorderColor, #444);
        border-radius: 8px;
        margin-bottom: 15px;
      }

      .context-config-item {
        background: var(--SmartThemeBlurTintColor, #2a2a2a);
        border: 1px solid var(--SmartThemeBorderColor, #444);
        border-radius: 6px;
        margin-bottom: 10px;
        overflow: hidden;
      }

      .context-config-item-header {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 12px;
        background: var(--SmartThemeBorderColor, #333);
      }

      .context-config-item-icon {
        font-size: 18px;
      }

      .context-config-item-label {
        flex: 1;
        font-weight: 500;
      }

      .context-config-item-actions {
        display: flex;
        gap: 5px;
      }

      .context-config-item-btn {
        padding: 4px 8px;
        border: none;
        background: transparent;
        cursor: pointer;
        opacity: 0.7;
      }

      .context-config-item-btn:hover {
        opacity: 1;
      }

      .context-config-item-details {
        padding: 8px 12px;
      }

      .context-config-detail {
        font-size: 12px;
        color: var(--SmartThemeEmColor, #aaa);
      }

      .context-config-add-section {
        margin-top: 20px;
        padding-top: 15px;
        border-top: 1px solid var(--SmartThemeBorderColor, #444);
      }

      .context-config-add-section h5 {
        margin: 0 0 10px 0;
      }

      .context-config-source-types,
      .context-config-target-types {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .context-config-add-btn {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        padding: 10px 15px;
        border: 1px solid var(--SmartThemeBorderColor, #444);
        border-radius: 6px;
        background: var(--SmartThemeBlurTintColor, #2a2a2a);
        color: inherit;
        cursor: pointer;
        min-width: 100px;
      }

      .context-config-add-btn:hover {
        border-color: var(--SmartThemeQuoteColor, #3a3);
        background: var(--SmartThemeBorderColor, #333);
      }

      .context-config-add-icon {
        font-size: 20px;
      }

      .context-config-add-label {
        font-size: 12px;
      }

      .context-config-field {
        margin-bottom: 15px;
      }

      .context-config-field label {
        display: block;
        margin-bottom: 5px;
        font-weight: 500;
      }

      .context-config-field-row {
        display: flex;
        gap: 15px;
      }

      .context-config-input,
      .context-config-select,
      .context-config-textarea {
        width: 100%;
        padding: 8px;
        border: 1px solid var(--SmartThemeBorderColor, #444);
        border-radius: 4px;
        background: var(--SmartThemeBlurTintColor, #1a1a1a);
        color: inherit;
        font-family: inherit;
      }

      .context-config-input-sm {
        width: 80px;
        padding: 8px;
        border: 1px solid var(--SmartThemeBorderColor, #444);
        border-radius: 4px;
        background: var(--SmartThemeBlurTintColor, #1a1a1a);
        color: inherit;
      }

      .context-config-textarea {
        font-family: monospace;
        resize: vertical;
      }

      .context-config-checkbox {
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
      }

      .context-config-field-list {
        max-height: 200px;
        overflow-y: auto;
        border: 1px solid var(--SmartThemeBorderColor, #444);
        border-radius: 4px;
        padding: 10px;
      }

      .context-config-field-list .context-config-checkbox {
        padding: 6px;
        border-radius: 4px;
      }

      .context-config-field-list .context-config-checkbox:hover {
        background: var(--SmartThemeBorderColor, #333);
      }

      .context-config-field-list code {
        margin-left: auto;
        font-size: 11px;
        color: var(--SmartThemeQuoteColor, #3a3);
      }

      .context-config-var-list {
        margin-bottom: 10px;
      }

      .context-config-var-item {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
      }

      .context-config-var-remove {
        padding: 4px 8px;
        border: none;
        background: transparent;
        color: #f44;
        cursor: pointer;
      }

      .context-config-btn {
        padding: 8px 16px;
        border: 1px solid var(--SmartThemeBorderColor, #444);
        border-radius: 4px;
        background: var(--SmartThemeBlurTintColor, #2a2a2a);
        color: inherit;
        cursor: pointer;
        font-size: 13px;
      }

      .context-config-btn:hover {
        background: var(--SmartThemeBorderColor, #444);
      }

      .context-config-btn-primary {
        background: var(--SmartThemeQuoteColor, #3a3);
        border-color: var(--SmartThemeQuoteColor, #3a3);
        color: #fff;
      }

      .context-config-btn-secondary {
        background: transparent;
      }

      .context-config-editor-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
      }

      .context-config-editor-modal {
        width: 90%;
        max-width: 500px;
        background: var(--SmartThemeBodyColor, #222);
        border: 1px solid var(--SmartThemeBorderColor, #444);
        border-radius: 8px;
        overflow: hidden;
      }

      .context-config-editor-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        background: var(--SmartThemeBlurTintColor, #2a2a2a);
        border-bottom: 1px solid var(--SmartThemeBorderColor, #444);
      }

      .context-config-editor-header h4 {
        margin: 0;
      }

      .context-config-editor-close {
        padding: 4px 8px;
        border: none;
        background: transparent;
        cursor: pointer;
        color: inherit;
        font-size: 16px;
      }

      .context-config-editor-content {
        padding: 16px;
        max-height: 400px;
        overflow-y: auto;
      }

      .context-config-editor-footer {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        padding: 12px 16px;
        background: var(--SmartThemeBlurTintColor, #2a2a2a);
        border-top: 1px solid var(--SmartThemeBorderColor, #444);
      }
    `;

    document.head.appendChild(styles);
  },
};

// ===== EXPORT =====

// Export for browser
if (typeof window !== "undefined") {
  window.ContextConfig = ContextConfig;
}

// Export for module systems
if (typeof module !== "undefined" && module.exports) {
  module.exports = ContextConfig;
}
