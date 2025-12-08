/**
 * TheCouncil - Prompt Builder Component
 *
 * A reusable component for building agent prompts with:
 * - Three modes: Custom, ST Preset, Token Builder
 * - SillyTavern macro support
 * - Drag-and-drop token ordering
 * - Live preview with token resolution
 * - Import/export functionality
 *
 * @version 2.0.0
 */

const PromptBuilder = {
  // ===== VERSION =====
  VERSION: "2.0.0",

  // ===== CONSTANTS =====

  /**
   * Prompt building modes
   */
  Mode: {
    CUSTOM: "custom",
    PRESET: "preset",
    TOKENS: "tokens",
  },

  /**
   * SillyTavern macros available for use
   */
  ST_MACROS: [
    // Character & User
    { token: "{{char}}", label: "Character Name", category: "identity" },
    { token: "{{user}}", label: "User Name", category: "identity" },
    { token: "{{persona}}", label: "User Persona", category: "identity" },

    // Character Details
    {
      token: "{{description}}",
      label: "Character Description",
      category: "character",
    },
    {
      token: "{{personality}}",
      label: "Character Personality",
      category: "character",
    },
    { token: "{{scenario}}", label: "Scenario", category: "character" },
    {
      token: "{{mes_examples}}",
      label: "Example Messages",
      category: "character",
    },
    {
      token: "{{char_version}}",
      label: "Character Version",
      category: "character",
    },
    {
      token: "{{creatorcomment}}",
      label: "Creator Comment",
      category: "character",
    },

    // System & Prompts
    { token: "{{system}}", label: "System Prompt", category: "system" },
    { token: "{{jailbreak}}", label: "Jailbreak Prompt", category: "system" },
    { token: "{{main}}", label: "Main Prompt", category: "system" },
    { token: "{{nsfw}}", label: "NSFW Prompt", category: "system" },
    {
      token: "{{wiBefore}}",
      label: "World Info (Before)",
      category: "system",
    },
    { token: "{{wiAfter}}", label: "World Info (After)", category: "system" },

    // Chat Context
    {
      token: "{{lastMessage}}",
      label: "Last Message",
      category: "chat",
    },
    {
      token: "{{lastMessageId}}",
      label: "Last Message ID",
      category: "chat",
    },
    {
      token: "{{lastUserMessage}}",
      label: "Last User Message",
      category: "chat",
    },
    {
      token: "{{lastCharMessage}}",
      label: "Last Char Message",
      category: "chat",
    },
    { token: "{{chatHistory}}", label: "Chat History", category: "chat" },

    // Model & Generation
    { token: "{{model}}", label: "Model Name", category: "model" },
    { token: "{{maxPrompt}}", label: "Max Prompt Length", category: "model" },
    {
      token: "{{exampleSeparator}}",
      label: "Example Separator",
      category: "model",
    },
    {
      token: "{{chatStart}}",
      label: "Chat Start Marker",
      category: "model",
    },

    // Time & Date
    { token: "{{time}}", label: "Current Time", category: "time" },
    { token: "{{date}}", label: "Current Date", category: "time" },
    { token: "{{weekday}}", label: "Day of Week", category: "time" },
    { token: "{{isotime}}", label: "ISO Timestamp", category: "time" },

    // Misc
    {
      token: "{{trim}}",
      label: "Trim Whitespace",
      category: "utility",
    },
    {
      token: "{{roll:XdY}}",
      label: "Dice Roll",
      category: "utility",
    },
    {
      token: "{{random:a,b,c}}",
      label: "Random Choice",
      category: "utility",
    },
    {
      token: "{{input}}",
      label: "User Input",
      category: "utility",
    },
    {
      token: "{{idle_duration}}",
      label: "Idle Duration",
      category: "utility",
    },
    {
      token: "{{bias}}",
      label: "Token Bias",
      category: "utility",
    },
  ],

  /**
   * Macro categories for organization
   */
  MACRO_CATEGORIES: {
    identity: { label: "Identity", icon: "👤" },
    character: { label: "Character", icon: "🎭" },
    system: { label: "System", icon: "⚙️" },
    chat: { label: "Chat", icon: "💬" },
    model: { label: "Model", icon: "🤖" },
    time: { label: "Time", icon: "🕐" },
    utility: { label: "Utility", icon: "🔧" },
  },

  // ===== STATE =====

  /**
   * Current configuration
   * @type {Object}
   */
  _config: {
    mode: "custom",
    customPrompt: "",
    presetName: null,
    tokens: [],
  },

  /**
   * Available ST presets
   * @type {Array}
   */
  _stPresets: [],

  /**
   * Container element
   * @type {HTMLElement|null}
   */
  _container: null,

  /**
   * Callback for value changes
   * @type {Function|null}
   */
  _onChangeCallback: null,

  /**
   * Reference to token resolver
   * @type {Object|null}
   */
  _tokenResolver: null,

  /**
   * Reference to logger
   * @type {Object|null}
   */
  _logger: null,

  /**
   * Drag state
   * @type {Object}
   */
  _dragState: {
    dragging: false,
    draggedIndex: null,
    draggedElement: null,
  },

  /**
   * Preview update debounce timer
   * @type {number|null}
   */
  _previewDebounce: null,

  /**
   * Initialization flag
   * @type {boolean}
   */
  _initialized: false,

  // ===== INITIALIZATION =====

  /**
   * Initialize the Prompt Builder
   * @param {Object} options - Configuration options
   * @param {Object} options.tokenResolver - Token resolver reference
   * @param {Object} options.logger - Logger instance
   * @returns {PromptBuilder}
   */
  init(options = {}) {
    this._tokenResolver = options.tokenResolver || window.TokenResolver;
    this._logger = options.logger || window.Logger;

    // Load ST presets
    this._loadSTPresets();

    this._initialized = true;
    this._log("info", "PromptBuilder initialized");

    return this;
  },

  /**
   * Create a new instance for a specific container
   * @param {Object} options - Instance options
   * @returns {Object} Instance with its own state
   */
  createInstance(options = {}) {
    // Create a new instance with isolated state
    const instance = {
      _config: {
        mode: options.initialMode || "custom",
        customPrompt: options.initialPrompt || "",
        presetName: options.initialPreset || null,
        tokens: options.initialTokens ? [...options.initialTokens] : [],
      },
      _container: null,
      _onChangeCallback: options.onChange || null,
      _dragState: {
        dragging: false,
        draggedIndex: null,
        draggedElement: null,
      },
      _previewDebounce: null,
    };

    // Bind methods to instance
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
   * @param {string} level - Log level
   * @param {string} message - Message
   * @param {...any} args - Additional arguments
   */
  _log(level, message, ...args) {
    const prefix = "[PromptBuilder]";
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

  // ===== ST PRESET LOADING =====

  /**
   * Load available SillyTavern presets
   */
  async _loadSTPresets() {
    try {
      // Try to get presets from ST's context
      const context = window.getContext?.();
      if (!context) {
        this._log("warn", "SillyTavern context not available");
        return;
      }

      // Check for preset data in various locations
      // ST stores presets in different places depending on version
      const presets = [];

      // Try to get instruct presets
      if (window.instruct_presets) {
        for (const preset of window.instruct_presets) {
          presets.push({
            type: "instruct",
            name: preset.name,
            data: preset,
          });
        }
      }

      // Try to get context presets
      if (window.context_presets) {
        for (const preset of window.context_presets) {
          presets.push({
            type: "context",
            name: preset.name,
            data: preset,
          });
        }
      }

      // Try to fetch from API if not found in global scope
      if (presets.length === 0) {
        try {
          const headers = window.getRequestHeaders?.() || {};
          const response = await fetch("/api/settings/get", {
            method: "POST",
            headers,
            body: JSON.stringify({}),
          });
          if (response.ok) {
            const settings = await response.json();
            if (settings.instruct_presets) {
              for (const name of Object.keys(settings.instruct_presets)) {
                presets.push({
                  type: "instruct",
                  name: name,
                  data: settings.instruct_presets[name],
                });
              }
            }
          }
        } catch (e) {
          this._log("debug", "Could not fetch presets from API:", e);
        }
      }

      this._stPresets = presets;
      this._log("info", `Loaded ${presets.length} ST presets`);
    } catch (e) {
      this._log("error", "Failed to load ST presets:", e);
      this._stPresets = [];
    }
  },

  /**
   * Get available presets
   * @returns {Array}
   */
  getAvailablePresets() {
    return [...this._stPresets];
  },

  /**
   * Apply an ST preset
   * @param {string} presetName - Preset name
   * @returns {Object|null} Preset data
   */
  _applySTPreset(presetName) {
    const preset = this._stPresets.find((p) => p.name === presetName);
    if (!preset) {
      this._log("warn", `Preset not found: ${presetName}`);
      return null;
    }

    return preset.data;
  },

  // ===== INSTANCE RENDERING =====

  /**
   * Render an instance to a container
   * @param {Object} instance - Instance state
   * @param {HTMLElement} container - Container element
   */
  _renderInstance(instance, container) {
    if (!container) {
      this._log("error", "Container element required for render");
      return;
    }

    instance._container = container;
    container.innerHTML = "";
    container.className = "prompt-builder";

    // Create main structure
    const html = `
      <div class="prompt-builder-mode-selector">
        <label class="prompt-builder-mode">
          <input type="radio" name="prompt-mode-${Date.now()}" value="custom"
                 ${instance._config.mode === "custom" ? "checked" : ""}>
          <span class="prompt-builder-mode-label">
            <span class="prompt-builder-mode-icon">✏️</span>
            Custom Prompt
          </span>
        </label>
        <label class="prompt-builder-mode">
          <input type="radio" name="prompt-mode-${Date.now()}" value="preset"
                 ${instance._config.mode === "preset" ? "checked" : ""}>
          <span class="prompt-builder-mode-label">
            <span class="prompt-builder-mode-icon">📋</span>
            ST Preset
          </span>
        </label>
        <label class="prompt-builder-mode">
          <input type="radio" name="prompt-mode-${Date.now()}" value="tokens"
                 ${instance._config.mode === "tokens" ? "checked" : ""}>
          <span class="prompt-builder-mode-label">
            <span class="prompt-builder-mode-icon">🧩</span>
            Build from Tokens
          </span>
        </label>
      </div>

      <div class="prompt-builder-content">
        <!-- Mode-specific content rendered here -->
      </div>

      <div class="prompt-builder-preview">
        <div class="prompt-builder-preview-header">
          <span class="prompt-builder-preview-title">📝 Preview</span>
          <button class="prompt-builder-preview-toggle" title="Toggle Preview">
            ▼
          </button>
        </div>
        <div class="prompt-builder-preview-content">
          <pre class="prompt-builder-preview-text"></pre>
        </div>
      </div>
    `;

    container.innerHTML = html;

    // Bind mode change events
    const modeInputs = container.querySelectorAll('input[type="radio"]');
    modeInputs.forEach((input) => {
      input.addEventListener("change", (e) => {
        if (e.target.checked) {
          instance._config.mode = e.target.value;
          this._renderModeContent(instance);
          this._notifyChange(instance);
        }
      });
    });

    // Bind preview toggle
    const previewToggle = container.querySelector(
      ".prompt-builder-preview-toggle",
    );
    const previewContent = container.querySelector(
      ".prompt-builder-preview-content",
    );
    previewToggle?.addEventListener("click", () => {
      previewContent.classList.toggle("collapsed");
      previewToggle.textContent = previewContent.classList.contains("collapsed")
        ? "▶"
        : "▼";
    });

    // Render mode-specific content
    this._renderModeContent(instance);

    // Inject styles
    this._injectStyles();
  },

  /**
   * Render mode-specific content
   * @param {Object} instance - Instance state
   */
  _renderModeContent(instance) {
    const contentEl = instance._container?.querySelector(
      ".prompt-builder-content",
    );
    if (!contentEl) return;

    switch (instance._config.mode) {
      case "custom":
        this._renderCustomMode(instance, contentEl);
        break;
      case "preset":
        this._renderPresetMode(instance, contentEl);
        break;
      case "tokens":
        this._renderTokensMode(instance, contentEl);
        break;
    }

    this._updatePreview(instance);
  },

  /**
   * Render custom prompt mode
   * @param {Object} instance - Instance state
   * @param {HTMLElement} contentEl - Content container
   */
  _renderCustomMode(instance, contentEl) {
    contentEl.innerHTML = `
      <div class="prompt-builder-custom">
        <div class="prompt-builder-textarea-wrapper">
          <textarea class="prompt-builder-textarea"
                    placeholder="Enter your custom system prompt here...&#10;&#10;You can use SillyTavern macros like {{char}}, {{user}}, etc."
                    rows="12">${this._escapeHtml(instance._config.customPrompt)}</textarea>
        </div>
        <div class="prompt-builder-macro-hint">
          <button class="prompt-builder-insert-macro-btn">+ Insert Macro</button>
          <span class="prompt-builder-hint-text">
            Click to insert SillyTavern macros at cursor position
          </span>
        </div>
      </div>
    `;

    const textarea = contentEl.querySelector(".prompt-builder-textarea");
    textarea?.addEventListener("input", (e) => {
      instance._config.customPrompt = e.target.value;
      this._schedulePreviewUpdate(instance);
      this._notifyChange(instance);
    });

    // Macro insert button
    const insertBtn = contentEl.querySelector(
      ".prompt-builder-insert-macro-btn",
    );
    insertBtn?.addEventListener("click", () => {
      this._showMacroPicker(instance, textarea);
    });
  },

  /**
   * Render ST preset mode
   * @param {Object} instance - Instance state
   * @param {HTMLElement} contentEl - Content container
   */
  _renderPresetMode(instance, contentEl) {
    const presetOptions = this._stPresets
      .map(
        (p) => `
        <option value="${this._escapeHtml(p.name)}"
                ${instance._config.presetName === p.name ? "selected" : ""}>
          ${this._escapeHtml(p.name)} (${p.type})
        </option>
      `,
      )
      .join("");

    contentEl.innerHTML = `
      <div class="prompt-builder-preset">
        <div class="prompt-builder-preset-selector">
          <label class="prompt-builder-label">Select ST Preset:</label>
          <select class="prompt-builder-select">
            <option value="">-- Choose a preset --</option>
            ${presetOptions}
          </select>
          <button class="prompt-builder-refresh-btn" title="Refresh Presets">🔄</button>
        </div>
        ${
          this._stPresets.length === 0
            ? `
          <div class="prompt-builder-preset-empty">
            <p>No SillyTavern presets found.</p>
            <p class="prompt-builder-hint-text">
              Presets are loaded from SillyTavern's instruct and context preset configurations.
            </p>
          </div>
        `
            : ""
        }
        <div class="prompt-builder-preset-info">
          <!-- Preset details shown here when selected -->
        </div>
      </div>
    `;

    const select = contentEl.querySelector(".prompt-builder-select");
    select?.addEventListener("change", (e) => {
      instance._config.presetName = e.target.value || null;
      this._showPresetInfo(instance, contentEl);
      this._updatePreview(instance);
      this._notifyChange(instance);
    });

    const refreshBtn = contentEl.querySelector(".prompt-builder-refresh-btn");
    refreshBtn?.addEventListener("click", async () => {
      await this._loadSTPresets();
      this._renderModeContent(instance);
    });

    // Show preset info if one is selected
    if (instance._config.presetName) {
      this._showPresetInfo(instance, contentEl);
    }
  },

  /**
   * Show preset information
   * @param {Object} instance - Instance state
   * @param {HTMLElement} contentEl - Content container
   */
  _showPresetInfo(instance, contentEl) {
    const infoEl = contentEl.querySelector(".prompt-builder-preset-info");
    if (!infoEl || !instance._config.presetName) {
      if (infoEl) infoEl.innerHTML = "";
      return;
    }

    const preset = this._stPresets.find(
      (p) => p.name === instance._config.presetName,
    );
    if (!preset) {
      infoEl.innerHTML = `<p class="prompt-builder-error">Preset not found</p>`;
      return;
    }

    infoEl.innerHTML = `
      <div class="prompt-builder-preset-details">
        <h4>${this._escapeHtml(preset.name)}</h4>
        <p><strong>Type:</strong> ${preset.type}</p>
        ${
          preset.data.system_prompt
            ? `
          <div class="prompt-builder-preset-preview">
            <strong>System Prompt:</strong>
            <pre>${this._escapeHtml(preset.data.system_prompt.substring(0, 500))}${preset.data.system_prompt.length > 500 ? "..." : ""}</pre>
          </div>
        `
            : ""
        }
      </div>
    `;
  },

  /**
   * Render token builder mode
   * @param {Object} instance - Instance state
   * @param {HTMLElement} contentEl - Content container
   */
  _renderTokensMode(instance, contentEl) {
    contentEl.innerHTML = `
      <div class="prompt-builder-tokens">
        <div class="prompt-builder-tokens-layout">
          <div class="prompt-builder-available-tokens">
            <h4>Available Tokens</h4>
            <div class="prompt-builder-token-categories">
              ${this._renderTokenCategories()}
            </div>
          </div>
          <div class="prompt-builder-token-stack">
            <h4>Prompt Stack <span class="prompt-builder-stack-count">(${instance._config.tokens.length} items)</span></h4>
            <div class="prompt-builder-stack-list" data-dropzone="true">
              ${this._renderTokenStack(instance)}
            </div>
            <div class="prompt-builder-stack-actions">
              <button class="prompt-builder-btn prompt-builder-add-custom">
                + Add Custom Block
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Bind category expansion
    const categoryHeaders = contentEl.querySelectorAll(
      ".prompt-builder-category-header",
    );
    categoryHeaders.forEach((header) => {
      header.addEventListener("click", () => {
        const category = header.closest(".prompt-builder-category");
        category?.classList.toggle("expanded");
      });
    });

    // Bind available token clicks (to add)
    const availableTokens = contentEl.querySelectorAll(
      ".prompt-builder-available-token",
    );
    availableTokens.forEach((tokenEl) => {
      tokenEl.addEventListener("click", () => {
        const token = tokenEl.dataset.token;
        const label = tokenEl.dataset.label;
        this._addTokenToStack(instance, { type: "macro", token, label });
      });
    });

    // Bind add custom block
    const addCustomBtn = contentEl.querySelector(".prompt-builder-add-custom");
    addCustomBtn?.addEventListener("click", () => {
      this._showCustomBlockEditor(instance);
    });

    // Bind stack item actions
    this._bindStackActions(instance, contentEl);

    // Initialize drag-drop
    this._initDragDrop(instance, contentEl);
  },

  /**
   * Render token categories
   * @returns {string} HTML
   */
  _renderTokenCategories() {
    let html = "";

    for (const [catId, catInfo] of Object.entries(this.MACRO_CATEGORIES)) {
      const tokens = this.ST_MACROS.filter((m) => m.category === catId);
      html += `
        <div class="prompt-builder-category" data-category="${catId}">
          <div class="prompt-builder-category-header">
            <span class="prompt-builder-category-icon">${catInfo.icon}</span>
            <span class="prompt-builder-category-label">${catInfo.label}</span>
            <span class="prompt-builder-category-toggle">▶</span>
          </div>
          <div class="prompt-builder-category-tokens">
            ${tokens
              .map(
                (t) => `
              <div class="prompt-builder-available-token"
                   data-token="${this._escapeHtml(t.token)}"
                   data-label="${this._escapeHtml(t.label)}"
                   draggable="true"
                   title="${this._escapeHtml(t.token)}">
                <span class="prompt-builder-token-label">${this._escapeHtml(t.label)}</span>
                <code class="prompt-builder-token-code">${this._escapeHtml(t.token)}</code>
              </div>
            `,
              )
              .join("")}
          </div>
        </div>
      `;
    }

    return html;
  },

  /**
   * Render token stack
   * @param {Object} instance - Instance state
   * @returns {string} HTML
   */
  _renderTokenStack(instance) {
    if (instance._config.tokens.length === 0) {
      return `
        <div class="prompt-builder-stack-empty">
          <p>Drag tokens here or click to add</p>
          <p class="prompt-builder-hint-text">Tokens will be concatenated in order</p>
        </div>
      `;
    }

    return instance._config.tokens
      .map(
        (item, index) => `
        <div class="prompt-builder-stack-item" data-index="${index}" draggable="true">
          <div class="prompt-builder-stack-item-handle">⋮⋮</div>
          <div class="prompt-builder-stack-item-content">
            ${
              item.type === "macro"
                ? `
              <span class="prompt-builder-stack-item-label">${this._escapeHtml(item.label || item.token)}</span>
              <code class="prompt-builder-stack-item-code">${this._escapeHtml(item.token)}</code>
            `
                : `
              <span class="prompt-builder-stack-item-label">📝 Custom Block</span>
              <span class="prompt-builder-stack-item-preview">${this._escapeHtml(item.content?.substring(0, 50) || "")}${(item.content?.length || 0) > 50 ? "..." : ""}</span>
            `
            }
          </div>
          <div class="prompt-builder-stack-item-options">
            ${
              item.prefix || item.suffix
                ? `<span class="prompt-builder-has-modifiers" title="Has prefix/suffix">⚡</span>`
                : ""
            }
          </div>
          <div class="prompt-builder-stack-item-actions">
            <button class="prompt-builder-stack-btn" data-action="edit" title="Edit">✏️</button>
            <button class="prompt-builder-stack-btn" data-action="remove" title="Remove">✕</button>
          </div>
        </div>
      `,
      )
      .join("");
  },

  /**
   * Bind stack item actions
   * @param {Object} instance - Instance state
   * @param {HTMLElement} contentEl - Content element
   */
  _bindStackActions(instance, contentEl) {
    const stackList = contentEl.querySelector(".prompt-builder-stack-list");
    if (!stackList) return;

    stackList.addEventListener("click", (e) => {
      const btn = e.target.closest(".prompt-builder-stack-btn");
      if (!btn) return;

      const item = btn.closest(".prompt-builder-stack-item");
      const index = parseInt(item?.dataset.index, 10);
      if (isNaN(index)) return;

      const action = btn.dataset.action;
      if (action === "remove") {
        this._removeTokenFromStack(instance, index);
      } else if (action === "edit") {
        this._editStackItem(instance, index);
      }
    });
  },

  /**
   * Add token to stack
   * @param {Object} instance - Instance state
   * @param {Object} tokenConfig - Token configuration
   */
  _addTokenToStack(instance, tokenConfig) {
    instance._config.tokens.push({
      ...tokenConfig,
      prefix: "",
      suffix: "",
    });
    this._refreshStackDisplay(instance);
    this._updatePreview(instance);
    this._notifyChange(instance);
  },

  /**
   * Remove token from stack
   * @param {Object} instance - Instance state
   * @param {number} index - Token index
   */
  _removeTokenFromStack(instance, index) {
    instance._config.tokens.splice(index, 1);
    this._refreshStackDisplay(instance);
    this._updatePreview(instance);
    this._notifyChange(instance);
  },

  /**
   * Reorder tokens in stack
   * @param {Object} instance - Instance state
   * @param {number} fromIndex - Source index
   * @param {number} toIndex - Target index
   */
  _reorderTokens(instance, fromIndex, toIndex) {
    const tokens = instance._config.tokens;
    const [moved] = tokens.splice(fromIndex, 1);
    tokens.splice(toIndex, 0, moved);
    this._refreshStackDisplay(instance);
    this._updatePreview(instance);
    this._notifyChange(instance);
  },

  /**
   * Refresh stack display
   * @param {Object} instance - Instance state
   */
  _refreshStackDisplay(instance) {
    const stackList = instance._container?.querySelector(
      ".prompt-builder-stack-list",
    );
    const stackCount = instance._container?.querySelector(
      ".prompt-builder-stack-count",
    );

    if (stackList) {
      stackList.innerHTML = this._renderTokenStack(instance);
      this._bindStackActions(instance, instance._container);
      this._initDragDrop(instance, instance._container);
    }

    if (stackCount) {
      stackCount.textContent = `(${instance._config.tokens.length} items)`;
    }
  },

  /**
   * Edit a stack item
   * @param {Object} instance - Instance state
   * @param {number} index - Item index
   */
  _editStackItem(instance, index) {
    const item = instance._config.tokens[index];
    if (!item) return;

    this._showItemEditor(instance, index, item);
  },

  /**
   * Show item editor modal
   * @param {Object} instance - Instance state
   * @param {number} index - Item index
   * @param {Object} item - Item to edit
   */
  _showItemEditor(instance, index, item) {
    const overlay = document.createElement("div");
    overlay.className = "prompt-builder-editor-overlay";

    const modal = document.createElement("div");
    modal.className = "prompt-builder-editor-modal";
    modal.innerHTML = `
      <div class="prompt-builder-editor-header">
        <h4>${item.type === "macro" ? "Edit Token" : "Edit Custom Block"}</h4>
        <button class="prompt-builder-editor-close">✕</button>
      </div>
      <div class="prompt-builder-editor-content">
        ${
          item.type === "macro"
            ? `
          <div class="prompt-builder-editor-field">
            <label>Token:</label>
            <code>${this._escapeHtml(item.token)}</code>
          </div>
        `
            : `
          <div class="prompt-builder-editor-field">
            <label>Content:</label>
            <textarea class="prompt-builder-editor-textarea" rows="6">${this._escapeHtml(item.content || "")}</textarea>
          </div>
        `
        }
        <div class="prompt-builder-editor-field">
          <label>Prefix (added before):</label>
          <input type="text" class="prompt-builder-editor-input" data-field="prefix"
                 value="${this._escapeHtml(item.prefix || "")}"
                 placeholder="Text to add before this token">
        </div>
        <div class="prompt-builder-editor-field">
          <label>Suffix (added after):</label>
          <input type="text" class="prompt-builder-editor-input" data-field="suffix"
                 value="${this._escapeHtml(item.suffix || "")}"
                 placeholder="Text to add after this token">
        </div>
      </div>
      <div class="prompt-builder-editor-footer">
        <button class="prompt-builder-btn prompt-builder-btn-secondary" data-action="cancel">Cancel</button>
        <button class="prompt-builder-btn prompt-builder-btn-primary" data-action="save">Save</button>
      </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Close handlers
    const closeModal = () => overlay.remove();

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeModal();
    });

    modal
      .querySelector(".prompt-builder-editor-close")
      ?.addEventListener("click", closeModal);
    modal
      .querySelector('[data-action="cancel"]')
      ?.addEventListener("click", closeModal);

    // Save handler
    modal
      .querySelector('[data-action="save"]')
      ?.addEventListener("click", () => {
        const prefixInput = modal.querySelector('[data-field="prefix"]');
        const suffixInput = modal.querySelector('[data-field="suffix"]');
        const contentTextarea = modal.querySelector(
          ".prompt-builder-editor-textarea",
        );

        instance._config.tokens[index] = {
          ...item,
          prefix: prefixInput?.value || "",
          suffix: suffixInput?.value || "",
          ...(item.type === "custom" && contentTextarea
            ? { content: contentTextarea.value }
            : {}),
        };

        this._refreshStackDisplay(instance);
        this._updatePreview(instance);
        this._notifyChange(instance);
        closeModal();
      });
  },

  /**
   * Show custom block editor
   * @param {Object} instance - Instance state
   */
  _showCustomBlockEditor(instance) {
    const overlay = document.createElement("div");
    overlay.className = "prompt-builder-editor-overlay";

    const modal = document.createElement("div");
    modal.className = "prompt-builder-editor-modal";
    modal.innerHTML = `
      <div class="prompt-builder-editor-header">
        <h4>Add Custom Block</h4>
        <button class="prompt-builder-editor-close">✕</button>
      </div>
      <div class="prompt-builder-editor-content">
        <div class="prompt-builder-editor-field">
          <label>Custom Text:</label>
          <textarea class="prompt-builder-editor-textarea" rows="8"
                    placeholder="Enter custom prompt text...&#10;&#10;You can use {{macros}} here too."></textarea>
        </div>
        <div class="prompt-builder-editor-field">
          <label>Prefix:</label>
          <input type="text" class="prompt-builder-editor-input" data-field="prefix"
                 placeholder="Optional prefix">
        </div>
        <div class="prompt-builder-editor-field">
          <label>Suffix:</label>
          <input type="text" class="prompt-builder-editor-input" data-field="suffix"
                 placeholder="Optional suffix">
        </div>
      </div>
      <div class="prompt-builder-editor-footer">
        <button class="prompt-builder-btn prompt-builder-btn-secondary" data-action="cancel">Cancel</button>
        <button class="prompt-builder-btn prompt-builder-btn-primary" data-action="add">Add Block</button>
      </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const closeModal = () => overlay.remove();

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeModal();
    });

    modal
      .querySelector(".prompt-builder-editor-close")
      ?.addEventListener("click", closeModal);
    modal
      .querySelector('[data-action="cancel"]')
      ?.addEventListener("click", closeModal);

    modal
      .querySelector('[data-action="add"]')
      ?.addEventListener("click", () => {
        const textarea = modal.querySelector(".prompt-builder-editor-textarea");
        const prefixInput = modal.querySelector('[data-field="prefix"]');
        const suffixInput = modal.querySelector('[data-field="suffix"]');

        const content = textarea?.value?.trim();
        if (!content) {
          textarea?.focus();
          return;
        }

        this._addTokenToStack(instance, {
          type: "custom",
          content,
          prefix: prefixInput?.value || "",
          suffix: suffixInput?.value || "",
        });

        closeModal();
      });

    // Focus textarea
    setTimeout(() => {
      modal.querySelector(".prompt-builder-editor-textarea")?.focus();
    }, 100);
  },

  /**
   * Show macro picker popup
   * @param {Object} instance - Instance state
   * @param {HTMLTextAreaElement} textarea - Target textarea
   */
  _showMacroPicker(instance, textarea) {
    // Remove existing picker
    document.querySelector(".prompt-builder-macro-picker")?.remove();

    const picker = document.createElement("div");
    picker.className = "prompt-builder-macro-picker";

    let html = `<div class="prompt-builder-macro-picker-header">
      <span>Insert Macro</span>
      <button class="prompt-builder-macro-picker-close">✕</button>
    </div>
    <div class="prompt-builder-macro-picker-search">
      <input type="text" placeholder="Search macros..." class="prompt-builder-macro-search-input">
    </div>
    <div class="prompt-builder-macro-picker-list">`;

    for (const [catId, catInfo] of Object.entries(this.MACRO_CATEGORIES)) {
      const tokens = this.ST_MACROS.filter((m) => m.category === catId);
      html += `
        <div class="prompt-builder-macro-picker-category">
          <div class="prompt-builder-macro-picker-cat-header">
            ${catInfo.icon} ${catInfo.label}
          </div>
          ${tokens
            .map(
              (t) => `
            <div class="prompt-builder-macro-picker-item" data-token="${this._escapeHtml(t.token)}">
              <span class="prompt-builder-macro-picker-label">${this._escapeHtml(t.label)}</span>
              <code>${this._escapeHtml(t.token)}</code>
            </div>
          `,
            )
            .join("")}
        </div>
      `;
    }

    html += `</div>`;
    picker.innerHTML = html;

    // Position near textarea
    const rect = textarea.getBoundingClientRect();
    picker.style.position = "fixed";
    picker.style.top = `${Math.min(rect.bottom + 5, window.innerHeight - 400)}px`;
    picker.style.left = `${rect.left}px`;
    picker.style.maxHeight = "350px";

    document.body.appendChild(picker);

    // Close handler
    const closePicker = () => picker.remove();

    picker
      .querySelector(".prompt-builder-macro-picker-close")
      ?.addEventListener("click", closePicker);

    // Click outside to close
    setTimeout(() => {
      document.addEventListener("click", function closeOnOutside(e) {
        if (!picker.contains(e.target)) {
          closePicker();
          document.removeEventListener("click", closeOnOutside);
        }
      });
    }, 100);

    // Search filter
    const searchInput = picker.querySelector(
      ".prompt-builder-macro-search-input",
    );
    searchInput?.addEventListener("input", (e) => {
      const query = e.target.value.toLowerCase();
      picker
        .querySelectorAll(".prompt-builder-macro-picker-item")
        .forEach((item) => {
          const label =
            item
              .querySelector(".prompt-builder-macro-picker-label")
              ?.textContent?.toLowerCase() || "";
          const token = item.dataset.token?.toLowerCase() || "";
          item.style.display =
            label.includes(query) || token.includes(query) ? "" : "none";
        });
    });

    // Insert macro on click
    picker
      .querySelectorAll(".prompt-builder-macro-picker-item")
      .forEach((item) => {
        item.addEventListener("click", () => {
          const token = item.dataset.token;
          const start = textarea.selectionStart;
          const end = textarea.selectionEnd;
          const text = textarea.value;

          textarea.value =
            text.substring(0, start) + token + text.substring(end);
          textarea.selectionStart = textarea.selectionEnd =
            start + token.length;
          textarea.focus();

          instance._config.customPrompt = textarea.value;
          this._schedulePreviewUpdate(instance);
          this._notifyChange(instance);

          closePicker();
        });
      });

    searchInput?.focus();
  },

  // ===== DRAG AND DROP =====

  /**
   * Initialize drag and drop for token stack
   * @param {Object} instance - Instance state
   * @param {HTMLElement} contentEl - Content element
   */
  _initDragDrop(instance, contentEl) {
    const stackList = contentEl?.querySelector(".prompt-builder-stack-list");
    if (!stackList) return;

    const items = stackList.querySelectorAll(".prompt-builder-stack-item");

    items.forEach((item) => {
      item.addEventListener("dragstart", (e) => {
        instance._dragState.dragging = true;
        instance._dragState.draggedIndex = parseInt(item.dataset.index, 10);
        instance._dragState.draggedElement = item;
        item.classList.add("dragging");
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", item.dataset.index);
      });

      item.addEventListener("dragend", () => {
        instance._dragState.dragging = false;
        instance._dragState.draggedIndex = null;
        instance._dragState.draggedElement = null;
        item.classList.remove("dragging");
        stackList
          .querySelectorAll(".prompt-builder-stack-item")
          .forEach((el) => {
            el.classList.remove("drag-over");
          });
      });

      item.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        if (!item.classList.contains("dragging")) {
          item.classList.add("drag-over");
        }
      });

      item.addEventListener("dragleave", () => {
        item.classList.remove("drag-over");
      });

      item.addEventListener("drop", (e) => {
        e.preventDefault();
        item.classList.remove("drag-over");

        const fromIndex = instance._dragState.draggedIndex;
        const toIndex = parseInt(item.dataset.index, 10);

        if (fromIndex !== null && fromIndex !== toIndex) {
          this._reorderTokens(instance, fromIndex, toIndex);
        }
      });
    });

    // Allow drop on empty stack
    stackList.addEventListener("dragover", (e) => {
      e.preventDefault();
    });

    stackList.addEventListener("drop", (e) => {
      if (e.target === stackList && instance._config.tokens.length === 0) {
        // Handle drop from available tokens
      }
    });
  },

  // ===== PREVIEW =====

  /**
   * Schedule preview update with debounce
   * @param {Object} instance - Instance state
   */
  _schedulePreviewUpdate(instance) {
    if (instance._previewDebounce) {
      clearTimeout(instance._previewDebounce);
    }
    instance._previewDebounce = setTimeout(() => {
      this._updatePreview(instance);
    }, 300);
  },

  /**
   * Update preview display
   * @param {Object} instance - Instance state
   */
  _updatePreview(instance) {
    const previewEl = instance._container?.querySelector(
      ".prompt-builder-preview-text",
    );
    if (!previewEl) return;

    const prompt = this._generatePrompt(instance);
    const resolved = this._resolveTokensForPreview(prompt);

    previewEl.textContent = resolved || "(Empty prompt)";
  },

  /**
   * Generate prompt from current configuration
   * @param {Object} instance - Instance state
   * @returns {string} Generated prompt
   */
  _generatePrompt(instance) {
    const config = instance._config;

    switch (config.mode) {
      case "custom":
        return config.customPrompt || "";

      case "preset":
        if (config.presetName) {
          const preset = this._stPresets.find(
            (p) => p.name === config.presetName,
          );
          return (
            preset?.data?.system_prompt || `[Preset: ${config.presetName}]`
          );
        }
        return "";

      case "tokens":
        return config.tokens
          .map((item) => {
            const prefix = item.prefix || "";
            const suffix = item.suffix || "";
            const content =
              item.type === "macro" ? item.token : item.content || "";
            return prefix + content + suffix;
          })
          .join("\n");

      default:
        return "";
    }
  },

  /**
   * Resolve tokens for preview display
   * @param {string} prompt - Prompt with tokens
   * @returns {string} Resolved preview
   */
  _resolveTokensForPreview(prompt) {
    if (!prompt) return "";

    // Try to use TokenResolver if available
    if (this._tokenResolver?.resolve) {
      try {
        return this._tokenResolver.resolve(prompt);
      } catch (e) {
        this._log("debug", "Token resolution failed:", e);
      }
    }

    // Fallback: show tokens as placeholders
    return prompt.replace(/\{\{(\w+)\}\}/g, (match, name) => {
      return `[${name}]`;
    });
  },

  // ===== INSTANCE VALUE MANAGEMENT =====

  /**
   * Get instance value
   * @param {Object} instance - Instance state
   * @returns {Object} Current configuration
   */
  _getInstanceValue(instance) {
    return {
      mode: instance._config.mode,
      customPrompt: instance._config.customPrompt,
      presetName: instance._config.presetName,
      tokens: [...instance._config.tokens],
      generatedPrompt: this._generatePrompt(instance),
    };
  },

  /**
   * Set instance value
   * @param {Object} instance - Instance state
   * @param {Object} config - Configuration to set
   */
  _setInstanceValue(instance, config) {
    if (config.mode) instance._config.mode = config.mode;
    if (config.customPrompt !== undefined)
      instance._config.customPrompt = config.customPrompt;
    if (config.presetName !== undefined)
      instance._config.presetName = config.presetName;
    if (config.tokens) instance._config.tokens = [...config.tokens];

    if (instance._container) {
      // Update mode radio buttons
      const modeInput = instance._container.querySelector(
        `input[value="${instance._config.mode}"]`,
      );
      if (modeInput) modeInput.checked = true;

      this._renderModeContent(instance);
    }
  },

  /**
   * Destroy instance
   * @param {Object} instance - Instance state
   */
  _destroyInstance(instance) {
    if (instance._previewDebounce) {
      clearTimeout(instance._previewDebounce);
    }
    if (instance._container) {
      instance._container.innerHTML = "";
    }
    instance._container = null;
  },

  /**
   * Refresh instance display
   * @param {Object} instance - Instance state
   */
  _refreshInstance(instance) {
    if (instance._container) {
      this._renderInstance(instance, instance._container);
    }
  },

  /**
   * Notify change callback
   * @param {Object} instance - Instance state
   */
  _notifyChange(instance) {
    if (instance._onChangeCallback) {
      instance._onChangeCallback(this._getInstanceValue(instance));
    }
  },

  // ===== UTILITIES =====

  /**
   * Escape HTML special characters
   * @param {string} str - String to escape
   * @returns {string} Escaped string
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
    if (document.getElementById("prompt-builder-styles")) return;

    const styles = document.createElement("style");
    styles.id = "prompt-builder-styles";
    styles.textContent = `
      .prompt-builder {
        font-family: inherit;
        font-size: 14px;
      }

      .prompt-builder-mode-selector {
        display: flex;
        gap: 10px;
        margin-bottom: 15px;
        flex-wrap: wrap;
      }

      .prompt-builder-mode {
        display: flex;
        align-items: center;
        cursor: pointer;
      }

      .prompt-builder-mode input {
        margin-right: 6px;
      }

      .prompt-builder-mode-label {
        display: flex;
        align-items: center;
        gap: 5px;
        padding: 8px 12px;
        border: 1px solid var(--SmartThemeBorderColor, #444);
        border-radius: 6px;
        transition: all 0.2s;
      }

      .prompt-builder-mode input:checked + .prompt-builder-mode-label {
        background: var(--SmartThemeQuoteColor, #3a3);
        border-color: var(--SmartThemeQuoteColor, #3a3);
        color: #fff;
      }

      .prompt-builder-mode-icon {
        font-size: 16px;
      }

      .prompt-builder-content {
        min-height: 200px;
        margin-bottom: 15px;
      }

      /* Custom mode */
      .prompt-builder-textarea {
        width: 100%;
        min-height: 180px;
        padding: 10px;
        border: 1px solid var(--SmartThemeBorderColor, #444);
        border-radius: 6px;
        background: var(--SmartThemeBlurTintColor, #1a1a1a);
        color: inherit;
        font-family: monospace;
        font-size: 13px;
        resize: vertical;
      }

      .prompt-builder-textarea:focus {
        outline: none;
        border-color: var(--SmartThemeQuoteColor, #3a3);
      }

      .prompt-builder-macro-hint {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-top: 8px;
      }

      .prompt-builder-insert-macro-btn {
        padding: 6px 12px;
        border: 1px solid var(--SmartThemeBorderColor, #444);
        border-radius: 4px;
        background: var(--SmartThemeBlurTintColor, #2a2a2a);
        color: inherit;
        cursor: pointer;
        font-size: 13px;
      }

      .prompt-builder-insert-macro-btn:hover {
        background: var(--SmartThemeBorderColor, #444);
      }

      .prompt-builder-hint-text {
        color: var(--SmartThemeEmColor, #888);
        font-size: 12px;
      }

      /* Preset mode */
      .prompt-builder-preset-selector {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 15px;
      }

      .prompt-builder-label {
        font-weight: 500;
      }

      .prompt-builder-select {
        flex: 1;
        padding: 8px;
        border: 1px solid var(--SmartThemeBorderColor, #444);
        border-radius: 4px;
        background: var(--SmartThemeBlurTintColor, #1a1a1a);
        color: inherit;
      }

      .prompt-builder-refresh-btn {
        padding: 8px;
        border: 1px solid var(--SmartThemeBorderColor, #444);
        border-radius: 4px;
        background: transparent;
        cursor: pointer;
        font-size: 16px;
      }

      .prompt-builder-preset-empty {
        text-align: center;
        padding: 30px;
        color: var(--SmartThemeEmColor, #888);
      }

      .prompt-builder-preset-details {
        padding: 15px;
        background: var(--SmartThemeBlurTintColor, #1a1a1a);
        border-radius: 6px;
      }

      .prompt-builder-preset-details h4 {
        margin: 0 0 10px 0;
      }

      .prompt-builder-preset-preview pre {
        margin-top: 10px;
        padding: 10px;
        background: var(--SmartThemeBorderColor, #333);
        border-radius: 4px;
        overflow: auto;
        max-height: 150px;
        font-size: 12px;
      }

      /* Tokens mode */
      .prompt-builder-tokens-layout {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 15px;
      }

      @media (max-width: 700px) {
        .prompt-builder-tokens-layout {
          grid-template-columns: 1fr;
        }
      }

      .prompt-builder-available-tokens h4,
      .prompt-builder-token-stack h4 {
        margin: 0 0 10px 0;
        font-size: 14px;
      }

      .prompt-builder-stack-count {
        color: var(--SmartThemeEmColor, #888);
        font-weight: normal;
      }

      .prompt-builder-category {
        margin-bottom: 5px;
        border: 1px solid var(--SmartThemeBorderColor, #444);
        border-radius: 4px;
        overflow: hidden;
      }

      .prompt-builder-category-header {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 10px;
        background: var(--SmartThemeBlurTintColor, #2a2a2a);
        cursor: pointer;
      }

      .prompt-builder-category-toggle {
        margin-left: auto;
        font-size: 10px;
        transition: transform 0.2s;
      }

      .prompt-builder-category.expanded .prompt-builder-category-toggle {
        transform: rotate(90deg);
      }

      .prompt-builder-category-tokens {
        display: none;
        padding: 5px;
      }

      .prompt-builder-category.expanded .prompt-builder-category-tokens {
        display: block;
      }

      .prompt-builder-available-token {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 6px 8px;
        margin: 2px 0;
        border-radius: 4px;
        cursor: pointer;
        transition: background 0.2s;
      }

      .prompt-builder-available-token:hover {
        background: var(--SmartThemeBorderColor, #444);
      }

      .prompt-builder-token-label {
        font-size: 13px;
      }

      .prompt-builder-token-code {
        font-size: 11px;
        color: var(--SmartThemeQuoteColor, #3a3);
        background: var(--SmartThemeBlurTintColor, #1a1a1a);
        padding: 2px 4px;
        border-radius: 3px;
      }

      .prompt-builder-stack-list {
        min-height: 150px;
        padding: 10px;
        border: 2px dashed var(--SmartThemeBorderColor, #444);
        border-radius: 6px;
        background: var(--SmartThemeBlurTintColor, #1a1a1a);
      }

      .prompt-builder-stack-empty {
        text-align: center;
        padding: 40px 20px;
        color: var(--SmartThemeEmColor, #888);
      }

      .prompt-builder-stack-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px;
        margin-bottom: 5px;
        background: var(--SmartThemeBlurTintColor, #2a2a2a);
        border: 1px solid var(--SmartThemeBorderColor, #444);
        border-radius: 4px;
        cursor: grab;
      }

      .prompt-builder-stack-item.dragging {
        opacity: 0.5;
      }

      .prompt-builder-stack-item.drag-over {
        border-color: var(--SmartThemeQuoteColor, #3a3);
        border-style: dashed;
      }

      .prompt-builder-stack-item-handle {
        color: var(--SmartThemeEmColor, #888);
        cursor: grab;
      }

      .prompt-builder-stack-item-content {
        flex: 1;
        min-width: 0;
      }

      .prompt-builder-stack-item-label {
        display: block;
        font-weight: 500;
        font-size: 13px;
      }

      .prompt-builder-stack-item-code,
      .prompt-builder-stack-item-preview {
        font-size: 11px;
        color: var(--SmartThemeEmColor, #888);
      }

      .prompt-builder-stack-item-actions {
        display: flex;
        gap: 4px;
      }

      .prompt-builder-stack-btn {
        padding: 4px 6px;
        border: none;
        background: transparent;
        cursor: pointer;
        font-size: 12px;
        opacity: 0.7;
      }

      .prompt-builder-stack-btn:hover {
        opacity: 1;
      }

      .prompt-builder-has-modifiers {
        font-size: 12px;
      }

      .prompt-builder-stack-actions {
        margin-top: 10px;
      }

      .prompt-builder-btn {
        padding: 8px 16px;
        border: 1px solid var(--SmartThemeBorderColor, #444);
        border-radius: 4px;
        background: var(--SmartThemeBlurTintColor, #2a2a2a);
        color: inherit;
        cursor: pointer;
        font-size: 13px;
      }

      .prompt-builder-btn:hover {
        background: var(--SmartThemeBorderColor, #444);
      }

      .prompt-builder-btn-primary {
        background: var(--SmartThemeQuoteColor, #3a3);
        border-color: var(--SmartThemeQuoteColor, #3a3);
        color: #fff;
      }

      .prompt-builder-btn-secondary {
        background: transparent;
      }

      /* Preview */
      .prompt-builder-preview {
        border: 1px solid var(--SmartThemeBorderColor, #444);
        border-radius: 6px;
        overflow: hidden;
      }

      .prompt-builder-preview-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 12px;
        background: var(--SmartThemeBlurTintColor, #2a2a2a);
      }

      .prompt-builder-preview-title {
        font-weight: 500;
      }

      .prompt-builder-preview-toggle {
        padding: 2px 8px;
        border: none;
        background: transparent;
        cursor: pointer;
        color: inherit;
      }

      .prompt-builder-preview-content {
        max-height: 200px;
        overflow: auto;
        transition: max-height 0.3s;
      }

      .prompt-builder-preview-content.collapsed {
        max-height: 0;
        overflow: hidden;
      }

      .prompt-builder-preview-text {
        margin: 0;
        padding: 12px;
        font-family: monospace;
        font-size: 12px;
        white-space: pre-wrap;
        word-break: break-word;
        color: var(--SmartThemeEmColor, #aaa);
      }

      /* Editor Modal */
      .prompt-builder-editor-overlay {
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

      .prompt-builder-editor-modal {
        width: 90%;
        max-width: 500px;
        background: var(--SmartThemeBodyColor, #222);
        border: 1px solid var(--SmartThemeBorderColor, #444);
        border-radius: 8px;
        overflow: hidden;
      }

      .prompt-builder-editor-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        background: var(--SmartThemeBlurTintColor, #2a2a2a);
        border-bottom: 1px solid var(--SmartThemeBorderColor, #444);
      }

      .prompt-builder-editor-header h4 {
        margin: 0;
      }

      .prompt-builder-editor-close {
        padding: 4px 8px;
        border: none;
        background: transparent;
        cursor: pointer;
        color: inherit;
        font-size: 16px;
      }

      .prompt-builder-editor-content {
        padding: 16px;
      }

      .prompt-builder-editor-field {
        margin-bottom: 15px;
      }

      .prompt-builder-editor-field label {
        display: block;
        margin-bottom: 5px;
        font-weight: 500;
      }

      .prompt-builder-editor-field code {
        display: inline-block;
        padding: 4px 8px;
        background: var(--SmartThemeBlurTintColor, #1a1a1a);
        border-radius: 4px;
        color: var(--SmartThemeQuoteColor, #3a3);
      }

      .prompt-builder-editor-input,
      .prompt-builder-editor-textarea {
        width: 100%;
        padding: 8px;
        border: 1px solid var(--SmartThemeBorderColor, #444);
        border-radius: 4px;
        background: var(--SmartThemeBlurTintColor, #1a1a1a);
        color: inherit;
        font-family: inherit;
      }

      .prompt-builder-editor-textarea {
        font-family: monospace;
        resize: vertical;
      }

      .prompt-builder-editor-footer {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        padding: 12px 16px;
        background: var(--SmartThemeBlurTintColor, #2a2a2a);
        border-top: 1px solid var(--SmartThemeBorderColor, #444);
      }

      /* Macro Picker */
      .prompt-builder-macro-picker {
        width: 350px;
        max-height: 350px;
        background: var(--SmartThemeBodyColor, #222);
        border: 1px solid var(--SmartThemeBorderColor, #444);
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
        overflow: hidden;
        z-index: 10001;
      }

      .prompt-builder-macro-picker-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 12px;
        background: var(--SmartThemeBlurTintColor, #2a2a2a);
        border-bottom: 1px solid var(--SmartThemeBorderColor, #444);
        font-weight: 500;
      }

      .prompt-builder-macro-picker-close {
        padding: 2px 6px;
        border: none;
        background: transparent;
        cursor: pointer;
        color: inherit;
      }

      .prompt-builder-macro-picker-search {
        padding: 8px;
        border-bottom: 1px solid var(--SmartThemeBorderColor, #444);
      }

      .prompt-builder-macro-search-input {
        width: 100%;
        padding: 6px 10px;
        border: 1px solid var(--SmartThemeBorderColor, #444);
        border-radius: 4px;
        background: var(--SmartThemeBlurTintColor, #1a1a1a);
        color: inherit;
      }

      .prompt-builder-macro-picker-list {
        max-height: 250px;
        overflow-y: auto;
        padding: 5px;
      }

      .prompt-builder-macro-picker-category {
        margin-bottom: 5px;
      }

      .prompt-builder-macro-picker-cat-header {
        padding: 6px 8px;
        font-size: 12px;
        font-weight: 500;
        color: var(--SmartThemeEmColor, #888);
        text-transform: uppercase;
      }

      .prompt-builder-macro-picker-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 6px 10px;
        border-radius: 4px;
        cursor: pointer;
      }

      .prompt-builder-macro-picker-item:hover {
        background: var(--SmartThemeBorderColor, #444);
      }

      .prompt-builder-macro-picker-label {
        font-size: 13px;
      }

      .prompt-builder-macro-picker-item code {
        font-size: 11px;
        color: var(--SmartThemeQuoteColor, #3a3);
      }

      .prompt-builder-error {
        color: #f44;
        padding: 10px;
        text-align: center;
      }
    `;

    document.head.appendChild(styles);
  },
};

// ===== EXPORT =====

// Export for browser
if (typeof window !== "undefined") {
  window.PromptBuilder = PromptBuilder;
}

// Export for module systems
if (typeof module !== "undefined" && module.exports) {
  module.exports = PromptBuilder;
}
