/**
 * TheCouncil - Prompt Builder Component
 *
 * A reusable component for building agent prompts with:
 * - Three modes: Custom, ST Preset, Token Builder
 * - SillyTavern macro support
 * - Council Macros with parameterization
 * - Conditional blocks (if/unless/else)
 * - Transform pipelines (uppercase, truncate, etc.)
 * - Drag-and-drop token ordering
 * - Live preview with token resolution
 * - Validation feedback
 * - Import/export functionality
 *
 * @version 2.1.0
 */

const PromptBuilder = {
  // ===== VERSION =====
  VERSION: "2.1.0",

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
    isFromAvailable: false,
    tokenData: null,
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
   * @param {Object} options.promptBuilderSystem - PromptBuilderSystem reference
   * @param {Object} options.kernel - Kernel reference for accessing the system
   * @param {Object} options.tokenResolver - Token resolver reference (fallback)
   * @param {Object} options.logger - Logger instance
   * @returns {PromptBuilder}
   */
  init(options = {}) {
    // Get PromptBuilderSystem from options or kernel
    if (options.promptBuilderSystem) {
      this._promptBuilderSystem = options.promptBuilderSystem;
    } else if (options.kernel) {
      this._promptBuilderSystem = options.kernel.getSystem("promptBuilder");
    } else if (window.TheCouncil) {
      this._promptBuilderSystem = window.TheCouncil.getSystem("promptBuilder");
    }

    this._logger = options.logger || window.Logger;

    // Ensure _stPresets is initialized even if loading fails
    if (!this._stPresets) {
      this._stPresets = [];
    }

    // Try to load ST presets (may fail if ST not ready yet)
    this._loadSTPresets().catch(() => {
      this._log("debug", "Initial preset load failed, will retry on demand");
    });

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
        isFromAvailable: false,
        tokenData: null,
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
   * Load available SillyTavern presets using multiple methods
   */
  async _loadSTPresets(forceReload = false) {
    // Ensure _stPresets is initialized
    if (!this._stPresets) {
      this._stPresets = [];
    }

    // Skip if already loaded and not forcing reload
    if (this._stPresets.length > 0 && !forceReload) {
      this._log("debug", "Presets already loaded, skipping");
      return;
    }

    try {
      const presets = [];

      // Method 1: Try SillyTavern.getContext().getPresetManager() (preferred)
      const context = window.SillyTavern?.getContext?.();
      const getPresetManager = context?.getPresetManager;

      if (typeof getPresetManager === "function") {
        this._log("debug", "Using getPresetManager from context");
        await this._loadPresetsViaManager(presets, getPresetManager);
      } else {
        this._log(
          "debug",
          "getPresetManager not available, trying direct globals",
        );
      }

      // Method 2: Try direct globals if getPresetManager didn't work or found nothing
      if (presets.length === 0) {
        await this._loadPresetsFromGlobals(presets);
      }

      this._stPresets = presets;
      this._log("info", `Loaded ${presets.length} ST presets total`);

      // Log available preset types for debugging
      const types = [...new Set(presets.map((p) => p.type))];
      if (types.length > 0) {
        this._log("debug", `Preset types found: ${types.join(", ")}`);
      }
    } catch (e) {
      this._log("error", "Failed to load ST presets:", e);
      this._stPresets = [];
    }
  },

  /**
   * Load presets via ST's PresetManager
   * @param {Array} presets - Array to populate
   * @param {Function} getPresetManager - The getPresetManager function
   */
  async _loadPresetsViaManager(presets, getPresetManager) {
    // Only load Chat Completion presets (OpenAI/Claude/etc)
    try {
      const manager = getPresetManager("openai");
      if (manager) {
        const presetNames = manager.getAllPresets();
        this._log(
          "debug",
          `Found ${presetNames.length} Chat Completion presets`,
        );
        for (const name of presetNames) {
          presets.push({
            type: "chat-completion",
            name: name,
            data: null,
            manager: manager,
          });
        }
      }
    } catch (e) {
      this._log("debug", "Could not load chat completion presets:", e);
    }
  },

  /**
   * Load presets directly from ST global variables
   * @param {Array} presets - Array to populate
   */
  async _loadPresetsFromGlobals(presets) {
    // Chat Completion / OpenAI presets only
    if (window.oai_settings) {
      this._log("debug", "Found oai_settings global");
      // The openai_settings array contains preset data
      if (window.openai_settings && Array.isArray(window.openai_settings)) {
        const names = window.openai_setting_names || {};
        for (const [name, index] of Object.entries(names)) {
          presets.push({
            type: "chat-completion",
            name: name,
            data: window.openai_settings[index] || null,
            manager: null,
          });
        }
        this._log(
          "debug",
          `Loaded ${Object.keys(names).length} Chat Completion presets from globals`,
        );
      }
    }
  },

  /**
   * Get debug info about available ST preset sources
   * @returns {Array<{name: string, status: string}>}
   */
  _getSTDebugInfo() {
    const context = window.SillyTavern?.getContext?.();
    const getPresetManager = context?.getPresetManager;

    const checks = [
      {
        name: "SillyTavern.getContext()",
        check: () => (context ? "✅ Available" : "❌ Not found"),
      },
      {
        name: "getPresetManager('openai')",
        check: () => {
          if (typeof getPresetManager !== "function") return "❌ No manager";
          try {
            const mgr = getPresetManager("openai");
            if (!mgr) return "❌ Not found";
            const presets = mgr.getAllPresets();
            return `✅ ${presets.length} presets`;
          } catch (e) {
            return "❌ Error";
          }
        },
      },
      {
        name: "oai_settings (fallback)",
        check: () => {
          if (window.oai_settings) {
            const names = window.openai_setting_names;
            if (names) return `✅ ${Object.keys(names).length} presets`;
            return "✅ Settings exist";
          }
          return "❌ Not found";
        },
      },
    ];

    return checks.map((c) => {
      try {
        return {
          name: c.name,
          status: c.check(),
        };
      } catch (e) {
        return { name: c.name, status: `❌ Error: ${e.message}` };
      }
    });
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

    // If we have a manager reference, get the actual preset data
    if (preset.manager) {
      try {
        const data = preset.manager.getPresetSettings(presetName);
        preset.data = data;
        return data;
      } catch (e) {
        this._log("error", `Failed to get preset data for ${presetName}:`, e);
        return null;
      }
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

    // Create unique ID for radio group (stable per instance)
    const instanceId =
      instance._instanceId ||
      (instance._instanceId = `pb-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);

    // Create main structure
    const html = `
      <div class="prompt-builder-mode-selector">
        <label class="prompt-builder-mode">
          <input type="radio" name="prompt-mode-${instanceId}" value="custom"
                 ${instance._config.mode === "custom" ? "checked" : ""}>
          <span class="prompt-builder-mode-label">
            <span class="prompt-builder-mode-icon">✏️</span>
            Custom Prompt
          </span>
        </label>
        <label class="prompt-builder-mode">
          <input type="radio" name="prompt-mode-${instanceId}" value="preset"
                 ${instance._config.mode === "preset" ? "checked" : ""}>
          <span class="prompt-builder-mode-label">
            <span class="prompt-builder-mode-icon">📋</span>
            ST Preset
          </span>
        </label>
        <label class="prompt-builder-mode">
          <input type="radio" name="prompt-mode-${instanceId}" value="tokens"
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
          this._renderModeContent(instance).catch((e) =>
            this._log("error", "Error rendering mode content:", e),
          );
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
    this._renderModeContent(instance).catch((e) =>
      this._log("error", "Error rendering mode content:", e),
    );

    // Inject styles
    this._injectStyles();
  },

  /**
   * Render mode-specific content
   * @param {Object} instance - Instance state
   */
  async _renderModeContent(instance) {
    const contentEl = instance._container?.querySelector(
      ".prompt-builder-content",
    );
    if (!contentEl) return;

    switch (instance._config.mode) {
      case "custom":
        this._renderCustomMode(instance, contentEl);
        break;
      case "preset":
        await this._renderPresetMode(instance, contentEl);
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
  async _renderPresetMode(instance, contentEl) {
    // Defensive check: ensure _stPresets is initialized
    if (!this._stPresets) {
      this._stPresets = [];
    }

    // Try to load presets if not loaded yet
    if (this._stPresets.length === 0) {
      this._log("debug", "No presets loaded, attempting to load now...");
      try {
        await this._loadSTPresets(true);
      } catch (error) {
        this._log("warn", "Failed to load ST presets:", error);
      }
    }

    const presetOptions = this._stPresets
      .map(
        (p) => `
        <option value="${this._escapeHtml(p.name)}"
                ${instance._config.presetName === p.name ? "selected" : ""}>
          ${this._escapeHtml(p.name)}
        </option>
      `,
      )
      .join("");

    // Debug info about available ST globals
    const debugInfo = this._getSTDebugInfo();

    contentEl.innerHTML = `
      <div class="prompt-builder-preset">
        <div class="prompt-builder-preset-selector">
          <label class="prompt-builder-label">Chat Completion Preset:</label>
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
            <p>No Chat Completion presets found.</p>
            <p class="prompt-builder-hint-text">
              <strong>Try clicking the refresh button (🔄)</strong> - ST may not have been fully loaded yet.
            </p>
            <details class="prompt-builder-debug-details">
              <summary>Debug Info</summary>
              <div class="prompt-builder-debug-content">
                <ul>
                  ${debugInfo.map((d) => `<li>${d.name}: ${d.status}</li>`).join("")}
                </ul>
              </div>
            </details>
          </div>
        `
            : `
          <div class="prompt-builder-preset-summary">
            <small>${this._stPresets.length} Chat Completion preset${this._stPresets.length !== 1 ? "s" : ""} available</small>
          </div>
        `
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
      refreshBtn.textContent = "⏳";
      refreshBtn.disabled = true;
      try {
        await this._loadSTPresets(true); // Force reload
        await this._renderModeContent(instance);
      } finally {
        refreshBtn.textContent = "🔄";
        refreshBtn.disabled = false;
      }
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

    // Load preset data if we have a manager
    let presetData = preset.data;
    if (!presetData && preset.manager) {
      try {
        presetData = preset.manager.getPresetSettings(preset.name);
        preset.data = presetData; // Cache it
      } catch (e) {
        this._log("error", `Failed to load preset data for ${preset.name}:`, e);
      }
    }

    // Build info display based on preset type and available data
    let detailsHtml = "";

    if (presetData) {
      // Show system prompt if available (common in chat completion presets)
      if (presetData.system_prompt) {
        const truncated = presetData.system_prompt.substring(0, 500);
        detailsHtml += `
          <div class="prompt-builder-preset-preview">
            <strong>System Prompt:</strong>
            <pre>${this._escapeHtml(truncated)}${presetData.system_prompt.length > 500 ? "..." : ""}</pre>
          </div>
        `;
      }

      // Show instruct sequences if available
      if (presetData.input_sequence || presetData.output_sequence) {
        detailsHtml += `
          <div class="prompt-builder-preset-preview">
            <strong>Instruct Format:</strong>
            <pre>Input: ${this._escapeHtml(presetData.input_sequence || "N/A")}
Output: ${this._escapeHtml(presetData.output_sequence || "N/A")}</pre>
          </div>
        `;
      }

      // Show context/story string if available
      if (presetData.story_string) {
        const truncated = presetData.story_string.substring(0, 300);
        detailsHtml += `
          <div class="prompt-builder-preset-preview">
            <strong>Story String:</strong>
            <pre>${this._escapeHtml(truncated)}${presetData.story_string.length > 300 ? "..." : ""}</pre>
          </div>
        `;
      }

      // Show content for system prompts
      if (presetData.content && preset.type === "sysprompt") {
        const truncated = presetData.content.substring(0, 500);
        detailsHtml += `
          <div class="prompt-builder-preset-preview">
            <strong>Content:</strong>
            <pre>${this._escapeHtml(truncated)}${presetData.content.length > 500 ? "..." : ""}</pre>
          </div>
        `;
      }

      // Show some generation settings for completion presets
      if (
        presetData.temp !== undefined ||
        presetData.max_tokens !== undefined
      ) {
        detailsHtml += `
          <div class="prompt-builder-preset-settings">
            <strong>Settings:</strong>
            <ul>
              ${presetData.temp !== undefined ? `<li>Temperature: ${presetData.temp}</li>` : ""}
              ${presetData.top_p !== undefined ? `<li>Top P: ${presetData.top_p}</li>` : ""}
              ${presetData.max_tokens !== undefined ? `<li>Max Tokens: ${presetData.max_tokens}</li>` : ""}
              ${presetData.frequency_penalty !== undefined ? `<li>Freq Penalty: ${presetData.frequency_penalty}</li>` : ""}
              ${presetData.presence_penalty !== undefined ? `<li>Pres Penalty: ${presetData.presence_penalty}</li>` : ""}
            </ul>
          </div>
        `;
      }
    }

    if (!detailsHtml) {
      detailsHtml = `<p class="prompt-builder-hint-text">Preset loaded. Settings will be applied when this agent is used.</p>`;
    }

    infoEl.innerHTML = `
      <div class="prompt-builder-preset-details">
        <h4>${this._escapeHtml(preset.name)}</h4>
        <p><strong>Type:</strong> ${this._getPresetTypeLabel(preset.type)}</p>
        ${detailsHtml}
      </div>
    `;
  },

  /**
   * Get human-readable label for preset type
   * @param {string} type - Preset type
   * @returns {string} Human-readable label
   */
  _getPresetTypeLabel(type) {
    const labels = {
      "chat-completion": "Chat Completion",
    };
    return labels[type] || type;
  },

  /**
   * Render token builder mode
   * @param {Object} instance - Instance state
   * @param {HTMLElement} contentEl - Content container
   */
  _renderTokensMode(instance, contentEl) {
    // Defensive: ensure tokens array exists
    if (!instance._config.tokens) {
      instance._config.tokens = [];
    }

    contentEl.innerHTML = `
      <div class="prompt-builder-tokens">
        <div class="prompt-builder-tokens-layout">
          <div class="prompt-builder-available-tokens">
            <div class="prompt-builder-tokens-tabs">
              <button class="prompt-builder-tab active" data-tab="st-macros">ST Macros</button>
              <button class="prompt-builder-tab" data-tab="council-macros">Council Macros</button>
              <button class="prompt-builder-tab" data-tab="conditionals">Conditionals</button>
            </div>
            <div class="prompt-builder-tab-content" data-content="st-macros">
              <h4>SillyTavern Macros</h4>
              <div class="prompt-builder-token-categories">
                ${this._renderTokenCategories()}
              </div>
            </div>
            <div class="prompt-builder-tab-content hidden" data-content="council-macros">
              <h4>Council Macros</h4>
              <div class="prompt-builder-macros-list">
                ${this._renderCouncilMacros()}
              </div>
            </div>
            <div class="prompt-builder-tab-content hidden" data-content="conditionals">
              <h4>Conditional Blocks</h4>
              <div class="prompt-builder-conditionals-list">
                ${this._renderConditionalHelpers()}
              </div>
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
              <button class="prompt-builder-btn prompt-builder-add-conditional">
                + Add Conditional
              </button>
              <button class="prompt-builder-btn prompt-builder-add-macro">
                + Insert Macro
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Bind tab switching
    const tabs = contentEl.querySelectorAll(".prompt-builder-tab");
    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        // Update active tab
        tabs.forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");

        // Show corresponding content
        const tabName = tab.dataset.tab;
        const contents = contentEl.querySelectorAll(
          ".prompt-builder-tab-content",
        );
        contents.forEach((c) => {
          c.classList.toggle("hidden", c.dataset.content !== tabName);
        });
      });
    });

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

    // Bind Council macro clicks
    const macroItems = contentEl.querySelectorAll(".prompt-builder-macro-item");
    macroItems.forEach((macroEl) => {
      macroEl.addEventListener("click", () => {
        const macroId = macroEl.dataset.macroId;
        this._showMacroInsertDialog(instance, macroId);
      });
    });

    // Bind conditional helper clicks
    const conditionalItems = contentEl.querySelectorAll(
      ".prompt-builder-conditional-item",
    );
    conditionalItems.forEach((condEl) => {
      condEl.addEventListener("click", () => {
        const condType = condEl.dataset.condType;
        this._showConditionalEditor(instance, condType);
      });
    });

    // Bind add custom block
    const addCustomBtn = contentEl.querySelector(".prompt-builder-add-custom");
    addCustomBtn?.addEventListener("click", () => {
      this._showCustomBlockEditor(instance);
    });

    // Bind add conditional
    const addConditionalBtn = contentEl.querySelector(
      ".prompt-builder-add-conditional",
    );
    addConditionalBtn?.addEventListener("click", () => {
      this._showConditionalEditor(instance);
    });

    // Bind add macro
    const addMacroBtn = contentEl.querySelector(".prompt-builder-add-macro");
    addMacroBtn?.addEventListener("click", () => {
      this._showMacroPickerDialog(instance);
    });

    // Bind stack item actions
    this._bindStackActions(instance, contentEl);

    // Initialize drag-drop for available tokens
    this._initAvailableTokenDrag(instance, contentEl);

    // Initialize drag-drop for stack reordering
    this._initDragDrop(instance, contentEl);
  },

  /**
   * Initialize drag events for available tokens (drag to stack)
   * @param {Object} instance - Instance state
   * @param {HTMLElement} contentEl - Content element
   */
  _initAvailableTokenDrag(instance, contentEl) {
    const availableTokens = contentEl.querySelectorAll(
      ".prompt-builder-available-token",
    );

    availableTokens.forEach((tokenEl) => {
      tokenEl.addEventListener("dragstart", (e) => {
        instance._dragState.dragging = true;
        instance._dragState.draggedIndex = null; // Not from stack
        instance._dragState.draggedElement = tokenEl;
        instance._dragState.isFromAvailable = true;
        instance._dragState.tokenData = {
          type: "macro",
          token: tokenEl.dataset.token,
          label: tokenEl.dataset.label,
        };
        tokenEl.classList.add("dragging");
        e.dataTransfer.effectAllowed = "copy";
        e.dataTransfer.setData(
          "application/json",
          JSON.stringify(instance._dragState.tokenData),
        );
      });

      tokenEl.addEventListener("dragend", () => {
        instance._dragState.dragging = false;
        instance._dragState.draggedIndex = null;
        instance._dragState.draggedElement = null;
        instance._dragState.isFromAvailable = false;
        instance._dragState.tokenData = null;
        tokenEl.classList.remove("dragging");

        // Clean up drop indicators
        const stackList = contentEl.querySelector(".prompt-builder-stack-list");
        stackList?.classList.remove("drag-over");
        contentEl
          .querySelectorAll(".prompt-builder-stack-item")
          .forEach((el) => {
            el.classList.remove(
              "drag-over",
              "drag-over-top",
              "drag-over-bottom",
            );
          });
      });
    });
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
   * Render Council macros from PromptBuilderSystem
   * @returns {string} HTML
   */
  _renderCouncilMacros() {
    if (!this._promptBuilderSystem) {
      return `<p class="prompt-builder-hint-text">PromptBuilderSystem not available</p>`;
    }

    // Defensive checks for PromptBuilderSystem methods
    if (typeof this._promptBuilderSystem.getMacrosByCategory !== 'function') {
      return `<p class="prompt-builder-hint-text">PromptBuilderSystem.getMacrosByCategory not available</p>`;
    }

    const macrosByCategory = this._promptBuilderSystem.getMacrosByCategory();
    const categories = this._promptBuilderSystem.MACRO_CATEGORIES;

    if (!macrosByCategory || !categories) {
      return `<p class="prompt-builder-hint-text">Unable to load macro categories</p>`;
    }

    if (Object.keys(macrosByCategory).length === 0) {
      return `<p class="prompt-builder-hint-text">No macros registered</p>`;
    }

    let html = "";

    for (const [catId, catInfo] of Object.entries(categories)) {
      const macros = macrosByCategory[catId] || [];
      if (macros.length === 0) continue;

      html += `
        <div class="prompt-builder-category expanded" data-category="macro-${catId}">
          <div class="prompt-builder-category-header">
            <span class="prompt-builder-category-icon">📦</span>
            <span class="prompt-builder-category-label">${this._escapeHtml(catInfo.name)}</span>
            <span class="prompt-builder-category-count">${macros.length}</span>
          </div>
          <div class="prompt-builder-category-tokens">
            ${macros
              .map(
                (macro) => `
              <div class="prompt-builder-macro-item"
                   data-macro-id="${this._escapeHtml(macro.id)}"
                   title="${this._escapeHtml(macro.description || macro.name)}">
                <span class="prompt-builder-macro-name">${this._escapeHtml(macro.name)}</span>
                <span class="prompt-builder-macro-params">
                  ${
                    macro.parameters?.length > 0
                      ? `(${macro.parameters.map((p) => p.name).join(", ")})`
                      : "(no params)"
                  }
                </span>
              </div>
            `,
              )
              .join("")}
          </div>
        </div>
      `;
    }

    return (
      html || `<p class="prompt-builder-hint-text">No macros in categories</p>`
    );
  },

  /**
   * Render conditional block helpers
   * @returns {string} HTML
   */
  _renderConditionalHelpers() {
    const conditionalTypes = [
      {
        type: "if",
        name: "If Block",
        syntax: "{{#if condition}}...{{/if}}",
        description: "Show content if condition is true",
      },
      {
        type: "unless",
        name: "Unless Block",
        syntax: "{{#unless condition}}...{{/unless}}",
        description: "Show content if condition is false",
      },
      {
        type: "if-else",
        name: "If-Else Block",
        syntax: "{{#if condition}}...{{else}}...{{/if}}",
        description: "Show different content based on condition",
      },
    ];

    const transformHelpers = [
      {
        type: "transform",
        name: "Transform Pipeline",
        syntax: "{{token | transform}}",
        description: "Apply transforms to token values",
        examples: ["uppercase", "lowercase", "truncate:100", "default:value"],
      },
    ];

    let html = `
      <div class="prompt-builder-conditionals-section">
        <h5>Conditional Blocks</h5>
        ${conditionalTypes
          .map(
            (cond) => `
          <div class="prompt-builder-conditional-item" data-cond-type="${cond.type}">
            <div class="prompt-builder-conditional-name">${this._escapeHtml(cond.name)}</div>
            <code class="prompt-builder-conditional-syntax">${this._escapeHtml(cond.syntax)}</code>
            <div class="prompt-builder-conditional-desc">${this._escapeHtml(cond.description)}</div>
          </div>
        `,
          )
          .join("")}
      </div>

      <div class="prompt-builder-conditionals-section">
        <h5>Transform Pipelines</h5>
        ${transformHelpers
          .map(
            (helper) => `
          <div class="prompt-builder-conditional-item" data-cond-type="${helper.type}">
            <div class="prompt-builder-conditional-name">${this._escapeHtml(helper.name)}</div>
            <code class="prompt-builder-conditional-syntax">${this._escapeHtml(helper.syntax)}</code>
            <div class="prompt-builder-conditional-desc">${this._escapeHtml(helper.description)}</div>
            ${
              helper.examples
                ? `
              <div class="prompt-builder-transform-examples">
                Available: ${helper.examples.map((e) => `<code>${this._escapeHtml(e)}</code>`).join(", ")}
              </div>
            `
                : ""
            }
          </div>
        `,
          )
          .join("")}
      </div>

      <div class="prompt-builder-conditionals-help">
        <h5>Condition Examples</h5>
        <ul>
          <li><code>phase.isFirst</code> - Check if first phase</li>
          <li><code>input</code> - Check if input exists</li>
          <li><code>agent.name == "Writer"</code> - String comparison</li>
          <li><code>phase.index > 0</code> - Number comparison</li>
          <li><code>!phase.isLast</code> - Negation</li>
          <li><code>input && context</code> - AND logic</li>
          <li><code>error || fallback</code> - OR logic</li>
        </ul>
      </div>
    `;

    return html;
  },

  /**
   * Show macro insert dialog with parameter inputs
   * @param {Object} instance - Instance state
   * @param {string} macroId - Macro ID to insert
   */
  _showMacroInsertDialog(instance, macroId) {
    if (!this._promptBuilderSystem) {
      this._log("warn", "PromptBuilderSystem not available");
      return;
    }

    const macro = this._promptBuilderSystem.getMacro(macroId);
    if (!macro) {
      this._log("warn", `Macro not found: ${macroId}`);
      return;
    }

    const hasParams = macro.parameters && macro.parameters.length > 0;

    // Create dialog HTML
    const dialogHtml = `
      <div class="prompt-builder-dialog-overlay">
        <div class="prompt-builder-dialog">
          <div class="prompt-builder-dialog-header">
            <h4>Insert Macro: ${this._escapeHtml(macro.name)}</h4>
            <button class="prompt-builder-dialog-close">✕</button>
          </div>
          <div class="prompt-builder-dialog-content">
            <p class="prompt-builder-dialog-desc">${this._escapeHtml(macro.description || "")}</p>

            ${
              hasParams
                ? `
              <div class="prompt-builder-macro-params-form">
                <h5>Parameters</h5>
                ${macro.parameters
                  .map(
                    (param) => `
                  <div class="prompt-builder-param-row">
                    <label>
                      <span class="prompt-builder-param-name">
                        ${this._escapeHtml(param.name)}
                        ${param.required ? '<span class="required">*</span>' : ""}
                      </span>
                      <input type="text"
                             class="prompt-builder-param-input"
                             data-param="${this._escapeHtml(param.name)}"
                             value="${this._escapeHtml(param.default || "")}"
                             placeholder="${this._escapeHtml(param.description || param.name)}">
                    </label>
                  </div>
                `,
                  )
                  .join("")}
              </div>
            `
                : `
              <p class="prompt-builder-hint-text">This macro has no parameters</p>
            `
            }

            <div class="prompt-builder-macro-preview">
              <h5>Preview</h5>
              <pre class="prompt-builder-macro-preview-text">${this._escapeHtml(macro.template)}</pre>
            </div>
          </div>
          <div class="prompt-builder-dialog-actions">
            <button class="prompt-builder-btn prompt-builder-dialog-cancel">Cancel</button>
            <button class="prompt-builder-btn prompt-builder-btn-primary prompt-builder-dialog-insert">Insert</button>
          </div>
        </div>
      </div>
    `;

    // Append dialog to body
    const dialogContainer = document.createElement("div");
    dialogContainer.innerHTML = dialogHtml;
    const dialog = dialogContainer.firstElementChild;
    document.body.appendChild(dialog);

    // Bind events
    const closeBtn = dialog.querySelector(".prompt-builder-dialog-close");
    const cancelBtn = dialog.querySelector(".prompt-builder-dialog-cancel");
    const insertBtn = dialog.querySelector(".prompt-builder-dialog-insert");

    const closeDialog = () => dialog.remove();

    closeBtn?.addEventListener("click", closeDialog);
    cancelBtn?.addEventListener("click", closeDialog);
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog) closeDialog();
    });

    insertBtn?.addEventListener("click", () => {
      // Gather params
      const params = {};
      dialog
        .querySelectorAll(".prompt-builder-param-input")
        .forEach((input) => {
          const paramName = input.dataset.param;
          params[paramName] = input.value;
        });

      // Build macro syntax
      const paramStr = Object.entries(params)
        .filter(([, v]) => v)
        .map(([k, v]) => `${k}="${v}"`)
        .join(" ");

      const macroSyntax = paramStr
        ? `{{macro:${macroId} ${paramStr}}}`
        : `{{macro:${macroId}}}`;

      // Add to stack
      this._addTokenToStack(instance, {
        type: "council-macro",
        token: macroSyntax,
        label: macro.name,
        macroId: macroId,
        params: params,
      });

      closeDialog();
    });

    // Update preview when params change
    const paramInputs = dialog.querySelectorAll(".prompt-builder-param-input");
    const previewEl = dialog.querySelector(
      ".prompt-builder-macro-preview-text",
    );

    paramInputs.forEach((input) => {
      input.addEventListener("input", () => {
        // Simple preview - just show the template
        let preview = macro.template;
        paramInputs.forEach((inp) => {
          const paramName = inp.dataset.param;
          const value = inp.value || `{{${paramName}}}`;
          preview = preview.replace(
            new RegExp(`\\{\\{${paramName}\\}\\}`, "g"),
            value,
          );
        });
        if (previewEl) {
          previewEl.textContent = preview;
        }
      });
    });
  },

  /**
   * Show conditional block editor
   * @param {Object} instance - Instance state
   * @param {string} condType - Conditional type (if, unless, if-else, transform)
   */
  _showConditionalEditor(instance, condType = "if") {
    const dialogHtml = `
      <div class="prompt-builder-dialog-overlay">
        <div class="prompt-builder-dialog">
          <div class="prompt-builder-dialog-header">
            <h4>Add Conditional Block</h4>
            <button class="prompt-builder-dialog-close">✕</button>
          </div>
          <div class="prompt-builder-dialog-content">
            <div class="prompt-builder-form-row">
              <label>Type</label>
              <select class="prompt-builder-select prompt-builder-cond-type">
                <option value="if" ${condType === "if" ? "selected" : ""}>If (show when true)</option>
                <option value="unless" ${condType === "unless" ? "selected" : ""}>Unless (show when false)</option>
                <option value="if-else" ${condType === "if-else" ? "selected" : ""}>If-Else (both branches)</option>
              </select>
            </div>

            <div class="prompt-builder-form-row">
              <label>Condition</label>
              <input type="text"
                     class="prompt-builder-input prompt-builder-cond-expr"
                     placeholder="e.g., phase.isFirst, input, agent.name == 'Writer'"
                     value="">
            </div>

            <div class="prompt-builder-form-row">
              <label>Content (when true)</label>
              <textarea class="prompt-builder-textarea prompt-builder-cond-then"
                        rows="3"
                        placeholder="Content to show when condition is true"></textarea>
            </div>

            <div class="prompt-builder-form-row prompt-builder-else-row" style="display: none;">
              <label>Content (when false)</label>
              <textarea class="prompt-builder-textarea prompt-builder-cond-else"
                        rows="3"
                        placeholder="Content to show when condition is false"></textarea>
            </div>

            <div class="prompt-builder-cond-preview">
              <h5>Preview</h5>
              <pre class="prompt-builder-cond-preview-text"></pre>
            </div>
          </div>
          <div class="prompt-builder-dialog-actions">
            <button class="prompt-builder-btn prompt-builder-dialog-cancel">Cancel</button>
            <button class="prompt-builder-btn prompt-builder-btn-primary prompt-builder-dialog-insert">Insert</button>
          </div>
        </div>
      </div>
    `;

    const dialogContainer = document.createElement("div");
    dialogContainer.innerHTML = dialogHtml;
    const dialog = dialogContainer.firstElementChild;
    document.body.appendChild(dialog);

    const closeDialog = () => dialog.remove();

    // Elements
    const typeSelect = dialog.querySelector(".prompt-builder-cond-type");
    const exprInput = dialog.querySelector(".prompt-builder-cond-expr");
    const thenTextarea = dialog.querySelector(".prompt-builder-cond-then");
    const elseTextarea = dialog.querySelector(".prompt-builder-cond-else");
    const elseRow = dialog.querySelector(".prompt-builder-else-row");
    const previewEl = dialog.querySelector(".prompt-builder-cond-preview-text");

    // Update preview
    const updatePreview = () => {
      const type = typeSelect.value;
      const expr = exprInput.value || "condition";
      const thenContent = thenTextarea.value || "...";
      const elseContent = elseTextarea.value || "...";

      let preview = "";
      if (type === "if") {
        preview = `{{#if ${expr}}}${thenContent}{{/if}}`;
      } else if (type === "unless") {
        preview = `{{#unless ${expr}}}${thenContent}{{/unless}}`;
      } else if (type === "if-else") {
        preview = `{{#if ${expr}}}${thenContent}{{else}}${elseContent}{{/if}}`;
      }

      if (previewEl) previewEl.textContent = preview;
    };

    // Toggle else row visibility
    typeSelect.addEventListener("change", () => {
      elseRow.style.display = typeSelect.value === "if-else" ? "block" : "none";
      updatePreview();
    });

    exprInput.addEventListener("input", updatePreview);
    thenTextarea.addEventListener("input", updatePreview);
    elseTextarea.addEventListener("input", updatePreview);

    // Initial update
    updatePreview();

    // Bind close events
    dialog
      .querySelector(".prompt-builder-dialog-close")
      ?.addEventListener("click", closeDialog);
    dialog
      .querySelector(".prompt-builder-dialog-cancel")
      ?.addEventListener("click", closeDialog);
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog) closeDialog();
    });

    // Insert
    dialog
      .querySelector(".prompt-builder-dialog-insert")
      ?.addEventListener("click", () => {
        const type = typeSelect.value;
        const expr = exprInput.value;
        const thenContent = thenTextarea.value;
        const elseContent = elseTextarea.value;

        if (!expr) {
          alert("Please enter a condition expression");
          return;
        }

        let content = "";
        if (type === "if") {
          content = `{{#if ${expr}}}${thenContent}{{/if}}`;
        } else if (type === "unless") {
          content = `{{#unless ${expr}}}${thenContent}{{/unless}}`;
        } else if (type === "if-else") {
          content = `{{#if ${expr}}}${thenContent}{{else}}${elseContent}{{/if}}`;
        }

        this._addTokenToStack(instance, {
          type: "conditional",
          content: content,
          label: `Conditional: ${type}`,
          condType: type,
          condition: expr,
        });

        closeDialog();
      });
  },

  /**
   * Show macro picker dialog (list all macros)
   * @param {Object} instance - Instance state
   */
  _showMacroPickerDialog(instance) {
    if (!this._promptBuilderSystem) {
      this._log("warn", "PromptBuilderSystem not available");
      return;
    }

    const allMacros = this._promptBuilderSystem.getAllMacros();

    const dialogHtml = `
      <div class="prompt-builder-dialog-overlay">
        <div class="prompt-builder-dialog prompt-builder-dialog-wide">
          <div class="prompt-builder-dialog-header">
            <h4>Select Macro</h4>
            <button class="prompt-builder-dialog-close">✕</button>
          </div>
          <div class="prompt-builder-dialog-content">
            <input type="text"
                   class="prompt-builder-input prompt-builder-macro-search"
                   placeholder="Search macros...">
            <div class="prompt-builder-macro-list">
              ${allMacros
                .map(
                  (macro) => `
                <div class="prompt-builder-macro-list-item" data-macro-id="${this._escapeHtml(macro.id)}">
                  <div class="prompt-builder-macro-list-name">${this._escapeHtml(macro.name)}</div>
                  <div class="prompt-builder-macro-list-category">${this._escapeHtml(macro.category)}</div>
                  <div class="prompt-builder-macro-list-desc">${this._escapeHtml(macro.description || "")}</div>
                </div>
              `,
                )
                .join("")}
            </div>
          </div>
        </div>
      </div>
    `;

    const dialogContainer = document.createElement("div");
    dialogContainer.innerHTML = dialogHtml;
    const dialog = dialogContainer.firstElementChild;
    document.body.appendChild(dialog);

    const closeDialog = () => dialog.remove();

    // Bind close events
    dialog
      .querySelector(".prompt-builder-dialog-close")
      ?.addEventListener("click", closeDialog);
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog) closeDialog();
    });

    // Search
    const searchInput = dialog.querySelector(".prompt-builder-macro-search");
    searchInput?.addEventListener("input", (e) => {
      const query = e.target.value.toLowerCase();
      dialog
        .querySelectorAll(".prompt-builder-macro-list-item")
        .forEach((item) => {
          const name =
            item
              .querySelector(".prompt-builder-macro-list-name")
              ?.textContent?.toLowerCase() || "";
          const desc =
            item
              .querySelector(".prompt-builder-macro-list-desc")
              ?.textContent?.toLowerCase() || "";
          item.style.display =
            name.includes(query) || desc.includes(query) ? "block" : "none";
        });
    });

    // Select macro
    dialog
      .querySelectorAll(".prompt-builder-macro-list-item")
      .forEach((item) => {
        item.addEventListener("click", () => {
          const macroId = item.dataset.macroId;
          closeDialog();
          this._showMacroInsertDialog(instance, macroId);
        });
      });
  },

  /**
   * Render token stack
   * @param {Object} instance - Instance state
   * @returns {string} HTML
   */
  _renderTokenStack(instance) {
    // Defensive: ensure tokens array exists
    if (!instance._config.tokens || instance._config.tokens.length === 0) {
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
        <div class="prompt-builder-stack-item" data-index="${index}" data-type="${item.type}" draggable="true">
          <div class="prompt-builder-stack-item-handle">⋮⋮</div>
          <div class="prompt-builder-stack-item-content">
            ${this._renderStackItemContent(item)}
          </div>
          <div class="prompt-builder-stack-item-options">
            ${
              item.prefix || item.suffix
                ? `<span class="prompt-builder-has-modifiers" title="Has prefix/suffix">⚡</span>`
                : ""
            }
            ${
              item.type === "conditional"
                ? `<span class="prompt-builder-item-type-badge" title="Conditional Block">🔀</span>`
                : ""
            }
            ${
              item.type === "council-macro"
                ? `<span class="prompt-builder-item-type-badge" title="Council Macro">📦</span>`
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
   * Render content for a stack item based on type
   * @param {Object} item - Stack item
   * @returns {string} HTML
   */
  _renderStackItemContent(item) {
    switch (item.type) {
      case "macro":
        return `
          <span class="prompt-builder-stack-item-label">${this._escapeHtml(item.label || item.token)}</span>
          <code class="prompt-builder-stack-item-code">${this._escapeHtml(item.token)}</code>
        `;

      case "council-macro":
        return `
          <span class="prompt-builder-stack-item-label">📦 ${this._escapeHtml(item.label || item.macroId)}</span>
          <code class="prompt-builder-stack-item-code">${this._escapeHtml(item.token)}</code>
        `;

      case "conditional":
        const condLabel = item.condition
          ? `${item.condType}: ${item.condition.substring(0, 20)}${item.condition.length > 20 ? "..." : ""}`
          : item.label;
        return `
          <span class="prompt-builder-stack-item-label">🔀 ${this._escapeHtml(condLabel)}</span>
          <span class="prompt-builder-stack-item-preview">${this._escapeHtml(item.content?.substring(0, 50) || "")}${(item.content?.length || 0) > 50 ? "..." : ""}</span>
        `;

      case "custom":
      default:
        return `
          <span class="prompt-builder-stack-item-label">📝 Custom Block</span>
          <span class="prompt-builder-stack-item-preview">${this._escapeHtml(item.content?.substring(0, 50) || "")}${(item.content?.length || 0) > 50 ? "..." : ""}</span>
        `;
    }
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
      // Preserve scroll positions of all scrollable ancestors
      const scrollPositions = [];
      let parent = stackList.parentElement;
      while (parent) {
        if (parent.scrollTop > 0 || parent.scrollLeft > 0) {
          scrollPositions.push({
            element: parent,
            top: parent.scrollTop,
            left: parent.scrollLeft,
          });
        }
        parent = parent.parentElement;
      }

      stackList.innerHTML = this._renderTokenStack(instance);
      this._bindStackActions(instance, instance._container);
      this._initDragDrop(instance, instance._container);

      // Restore scroll positions
      scrollPositions.forEach(({ element, top, left }) => {
        element.scrollTop = top;
        element.scrollLeft = left;
      });
    }

    if (stackCount) {
      const tokenCount = instance._config.tokens?.length || 0;
      stackCount.textContent = `(${tokenCount} items)`;
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

    // Prevent duplicate listener registration
    // Check if listeners are already attached to stackList
    if (stackList.dataset.dragListenersAttached === "true") {
      return;
    }

    // Mark that listeners have been attached
    stackList.dataset.dragListenersAttached = "true";

    const items = stackList.querySelectorAll(".prompt-builder-stack-item");

    items.forEach((item) => {
      item.addEventListener("dragstart", (e) => {
        instance._dragState.dragging = true;
        instance._dragState.draggedIndex = parseInt(item.dataset.index, 10);
        instance._dragState.draggedElement = item;
        instance._dragState.isFromAvailable = false;
        item.classList.add("dragging");
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", item.dataset.index);
      });

      item.addEventListener("dragend", () => {
        instance._dragState.dragging = false;
        instance._dragState.draggedIndex = null;
        instance._dragState.draggedElement = null;
        instance._dragState.isFromAvailable = false;
        item.classList.remove("dragging");
        stackList
          .querySelectorAll(".prompt-builder-stack-item")
          .forEach((el) => {
            el.classList.remove(
              "drag-over",
              "drag-over-top",
              "drag-over-bottom",
            );
          });
        stackList.classList.remove("drag-over");
      });

      item.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.stopPropagation();

        // Determine if dragging from available tokens or reordering
        if (instance._dragState.isFromAvailable) {
          e.dataTransfer.dropEffect = "copy";
        } else {
          e.dataTransfer.dropEffect = "move";
        }

        if (!item.classList.contains("dragging")) {
          // Calculate if drop would be above or below this item
          const rect = item.getBoundingClientRect();
          const midY = rect.top + rect.height / 2;

          item.classList.remove("drag-over-top", "drag-over-bottom");
          if (e.clientY < midY) {
            item.classList.add("drag-over-top");
          } else {
            item.classList.add("drag-over-bottom");
          }
          item.classList.add("drag-over");
        }
      });

      item.addEventListener("dragleave", (e) => {
        // Only remove if actually leaving the item
        if (!item.contains(e.relatedTarget)) {
          item.classList.remove(
            "drag-over",
            "drag-over-top",
            "drag-over-bottom",
          );
        }
      });

      item.addEventListener("drop", (e) => {
        e.preventDefault();
        e.stopPropagation();
        item.classList.remove("drag-over", "drag-over-top", "drag-over-bottom");

        const toIndex = parseInt(item.dataset.index, 10);

        // Check if dropping from available tokens
        if (
          instance._dragState.isFromAvailable &&
          instance._dragState.tokenData
        ) {
          // Calculate insert position based on drop location
          const rect = item.getBoundingClientRect();
          const midY = rect.top + rect.height / 2;
          const insertIndex = e.clientY < midY ? toIndex : toIndex + 1;

          this._insertTokenAtIndex(
            instance,
            instance._dragState.tokenData,
            insertIndex,
          );
        } else if (instance._dragState.draggedIndex !== null) {
          // Reordering within stack
          const fromIndex = instance._dragState.draggedIndex;
          if (fromIndex !== toIndex) {
            // Calculate actual target index based on drop position
            const rect = item.getBoundingClientRect();
            const midY = rect.top + rect.height / 2;
            let targetIndex = e.clientY < midY ? toIndex : toIndex + 1;

            // Adjust if moving down (since we'll remove from fromIndex first)
            if (fromIndex < targetIndex) {
              targetIndex--;
            }

            this._reorderTokens(instance, fromIndex, targetIndex);
          }
        }
      });
    });

    // Stack list drop zone (for empty stack or dropping at end)
    stackList.addEventListener("dragover", (e) => {
      e.preventDefault();
      if (instance._dragState.isFromAvailable) {
        e.dataTransfer.dropEffect = "copy";
      } else {
        e.dataTransfer.dropEffect = "move";
      }

      // Show drag-over on the list itself, empty div, or children of empty div
      const isEmptyOrChild =
        e.target === stackList ||
        e.target.classList.contains("prompt-builder-stack-empty") ||
        e.target.closest(".prompt-builder-stack-empty");
      if (isEmptyOrChild) {
        stackList.classList.add("drag-over");
      }
    });

    stackList.addEventListener("dragleave", (e) => {
      if (!stackList.contains(e.relatedTarget)) {
        stackList.classList.remove("drag-over");
      }
    });

    stackList.addEventListener("drop", (e) => {
      // Handle if dropping on stackList, empty div, or children of empty div
      const isEmptyOrChild =
        e.target === stackList ||
        e.target.classList.contains("prompt-builder-stack-empty") ||
        e.target.closest(".prompt-builder-stack-empty");

      if (isEmptyOrChild) {
        e.preventDefault();
        e.stopPropagation();
        stackList.classList.remove("drag-over");

        // Handle drop from available tokens
        if (
          instance._dragState.isFromAvailable &&
          instance._dragState.tokenData
        ) {
          this._addTokenToStack(instance, instance._dragState.tokenData);
        } else if (instance._dragState.draggedIndex !== null) {
          // Moving to end of stack
          const fromIndex = instance._dragState.draggedIndex;
          const toIndex = instance._config.tokens.length - 1;
          if (fromIndex !== toIndex) {
            this._reorderTokens(instance, fromIndex, toIndex);
          }
        }
      }
    });
  },

  /**
   * Insert token at specific index
   * @param {Object} instance - Instance state
   * @param {Object} tokenConfig - Token configuration
   * @param {number} index - Insert index
   */
  _insertTokenAtIndex(instance, tokenConfig, index) {
    const newToken = {
      ...tokenConfig,
      prefix: "",
      suffix: "",
    };
    instance._config.tokens.splice(index, 0, newToken);
    this._refreshStackDisplay(instance);
    this._updatePreview(instance);
    this._notifyChange(instance);
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
   * Update preview display with validation
   * @param {Object} instance - Instance state
   */
  _updatePreview(instance) {
    const previewEl = instance._container?.querySelector(
      ".prompt-builder-preview-text",
    );
    if (!previewEl) return;

    const prompt = this._generatePrompt(instance);
    const { resolved, validation } = this._resolveAndValidate(prompt);

    // Update preview text
    previewEl.textContent = resolved || "(Empty prompt)";

    // Update validation feedback
    this._updateValidationFeedback(instance, validation);
  },

  /**
   * Resolve template and validate tokens
   * @param {string} prompt - Prompt to resolve
   * @returns {Object} { resolved, validation }
   */
  _resolveAndValidate(prompt) {
    if (!prompt) {
      return {
        resolved: "",
        validation: {
          valid: true,
          tokens: [],
          unresolvedTokens: [],
          macros: [],
          conditionals: [],
          transforms: [],
        },
      };
    }

    const validation = {
      valid: true,
      tokens: [],
      unresolvedTokens: [],
      macros: [],
      conditionals: [],
      transforms: [],
    };

    // Extract all tokens
    const tokenPattern = /\{\{([^}|]+)(?:\|[^}]+)?\}\}/g;
    let match;
    while ((match = tokenPattern.exec(prompt)) !== null) {
      const tokenName = match[1].trim();
      validation.tokens.push({ token: tokenName, position: match.index });
    }

    // Extract macros
    const macroPattern = /\{\{macro:([a-zA-Z_][a-zA-Z0-9_]*)(?:\s+[^}]+)?\}\}/g;
    while ((match = macroPattern.exec(prompt)) !== null) {
      const macroId = match[1];
      const exists = this._promptBuilderSystem?.hasMacro?.(macroId) || false;
      validation.macros.push({ id: macroId, position: match.index, exists });
      if (!exists) {
        validation.unresolvedTokens.push({
          token: `macro:${macroId}`,
          reason: "Macro not found",
        });
        validation.valid = false;
      }
    }

    // Extract conditionals
    const conditionalPattern = /\{\{#(if|unless)\s+([^}]+)\}\}/g;
    while ((match = conditionalPattern.exec(prompt)) !== null) {
      validation.conditionals.push({
        type: match[1],
        condition: match[2].trim(),
        position: match.index,
      });
    }

    // Extract transforms
    const transformPattern = /\{\{[^|}]+\|([^}]+)\}\}/g;
    while ((match = transformPattern.exec(prompt)) !== null) {
      validation.transforms.push({
        transforms: match[1].trim(),
        position: match.index,
      });
    }

    // Resolve the prompt
    let resolved = prompt;
    if (this._promptBuilderSystem?.resolveTemplate) {
      try {
        const previewContext = {
          pipeline: { id: "[Pipeline]", name: "[Pipeline]" },
          phase: {
            id: "[Phase]",
            name: "[Phase]",
            index: 0,
            isFirst: true,
            isLast: false,
          },
          action: { id: "[Action]", name: "[Action]", index: 0 },
          input: "[Input]",
          output: "[Output]",
          context: "[Context]",
          char: "[Character]",
          user: "[User]",
          agent: {
            id: "[Agent]",
            name: "[Agent]",
            description: "[Agent Description]",
          },
          position: {
            id: "[Position]",
            name: "[Position]",
            roleDescription: "[Role]",
          },
          team: {
            id: "[Team]",
            name: "[Team]",
            members: ["[Member1]", "[Member2]"],
          },
        };
        resolved = this._promptBuilderSystem.resolveTemplate(
          prompt,
          previewContext,
          {
            preserveUnresolved: true,
            passSTMacros: true,
          },
        );

        // Check for remaining unresolved tokens (excluding ST macros)
        const unresolvedPattern =
          /\{\{([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)(?::([^}]*))?\}\}/g;
        while ((match = unresolvedPattern.exec(resolved)) !== null) {
          const tokenName = match[1];
          // Check if it's an ST macro (should be preserved)
          if (
            !this._promptBuilderSystem?.ST_NATIVE_MACROS?.includes(
              tokenName.split(".")[0],
            )
          ) {
            // It's unresolved if still in template syntax
            validation.unresolvedTokens.push({
              token: tokenName,
              reason: "Not resolved",
            });
          }
        }
      } catch (e) {
        this._log("debug", "PromptBuilderSystem resolution failed:", e);
        resolved = prompt.replace(
          /\{\{(\w+)\}\}/g,
          (match, name) => `[${name}]`,
        );
      }
    } else {
      resolved = prompt.replace(/\{\{(\w+)\}\}/g, (match, name) => `[${name}]`);
    }

    return { resolved, validation };
  },

  /**
   * Update validation feedback UI
   * @param {Object} instance - Instance state
   * @param {Object} validation - Validation results
   */
  _updateValidationFeedback(instance, validation) {
    const container = instance._container;
    if (!container) return;

    // Find or create validation container
    let validationEl = container.querySelector(".prompt-builder-validation");
    const previewHeader = container.querySelector(
      ".prompt-builder-preview-header",
    );

    if (!validationEl && previewHeader) {
      validationEl = document.createElement("div");
      validationEl.className = "prompt-builder-validation";
      previewHeader.parentNode.insertBefore(
        validationEl,
        previewHeader.nextSibling,
      );
    }

    if (!validationEl) return;

    // Generate validation feedback
    const issues = [];

    if (validation.unresolvedTokens.length > 0) {
      issues.push({
        type: "warning",
        message: `${validation.unresolvedTokens.length} unresolved token(s)`,
        details: validation.unresolvedTokens
          .map((t) => `{{${t.token}}}`)
          .join(", "),
      });
    }

    const missingMacros = validation.macros.filter((m) => !m.exists);
    if (missingMacros.length > 0) {
      issues.push({
        type: "error",
        message: `${missingMacros.length} missing macro(s)`,
        details: missingMacros.map((m) => m.id).join(", "),
      });
    }

    // Update UI
    if (issues.length === 0) {
      const stats = [];
      if (validation.tokens.length)
        stats.push(
          `${validation.tokens.length} token${validation.tokens.length !== 1 ? "s" : ""}`,
        );
      if (validation.macros.length)
        stats.push(
          `${validation.macros.length} macro${validation.macros.length !== 1 ? "s" : ""}`,
        );
      if (validation.conditionals.length)
        stats.push(
          `${validation.conditionals.length} conditional${validation.conditionals.length !== 1 ? "s" : ""}`,
        );
      if (validation.transforms.length)
        stats.push(
          `${validation.transforms.length} transform${validation.transforms.length !== 1 ? "s" : ""}`,
        );
      const summary = stats.length > 0 ? stats.join(", ") : "No tokens";
      validationEl.innerHTML = `
        <div class="prompt-builder-validation-success">
          <span class="prompt-builder-validation-icon">✓</span>
          <span>Valid — ${summary}</span>
        </div>
      `;
    } else {
      validationEl.innerHTML = `
        <div class="prompt-builder-validation-issues">
          ${issues
            .map(
              (issue) => `
            <div class="prompt-builder-validation-${issue.type}">
              <span class="prompt-builder-validation-icon">${issue.type === "error" ? "✕" : "⚠"}</span>
              <span class="prompt-builder-validation-message">${this._escapeHtml(issue.message)}</span>
              <span class="prompt-builder-validation-details" title="${this._escapeHtml(issue.details)}">${this._escapeHtml(issue.details.substring(0, 50))}${issue.details.length > 50 ? "..." : ""}</span>
            </div>
          `,
            )
            .join("")}
        </div>
      `;
    }
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
        // Defensive: ensure tokens array exists
        if (!config.tokens) return "";
        return config.tokens
          .map((item) => {
            const prefix = item.prefix || "";
            const suffix = item.suffix || "";
            let content = "";

            switch (item.type) {
              case "macro":
                content = item.token;
                break;
              case "council-macro":
                content = item.token;
                break;
              case "conditional":
                content = item.content || "";
                break;
              case "custom":
              default:
                content = item.content || "";
                break;
            }

            return prefix + content + suffix;
          })
          .join("\n");

      default:
        return "";
    }
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
      tokens: [...(instance._config.tokens || [])],
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

      this._renderModeContent(instance).catch((e) =>
        this._log("error", "Error rendering mode content:", e),
      );
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

      .prompt-builder-preset-summary {
        padding: 8px 12px;
        background: var(--SmartThemeBlurTintColor, rgba(0,0,0,0.2));
        border-radius: 4px;
        margin-bottom: 10px;
      }

      .prompt-builder-preset-summary small {
        color: var(--SmartThemeEmColor, #888);
      }

      .prompt-builder-debug-details {
        margin-top: 15px;
        text-align: left;
      }

      .prompt-builder-debug-details summary {
        cursor: pointer;
        color: var(--SmartThemeQuoteColor, #4a9eff);
        font-size: 12px;
      }

      .prompt-builder-debug-content {
        margin-top: 10px;
        padding: 10px;
        background: var(--SmartThemeBlurTintColor, rgba(0,0,0,0.3));
        border-radius: 4px;
        font-size: 12px;
      }

      .prompt-builder-debug-content ul {
        margin: 5px 0;
        padding-left: 20px;
      }

      .prompt-builder-debug-content li {
        margin: 3px 0;
        font-family: monospace;
        font-size: 11px;
      }

      .prompt-builder-preset-details {
        padding: 15px;
        background: var(--SmartThemeBlurTintColor, #1a1a1a);
        border-radius: 6px;
      }

      .prompt-builder-preset-details h4 {
        margin: 0 0 10px 0;
      }

      .prompt-builder-preset-preview {
        margin-top: 10px;
      }

      .prompt-builder-preset-preview strong {
        display: block;
        margin-bottom: 5px;
        color: var(--SmartThemeEmColor, #aaa);
      }

      .prompt-builder-preset-preview pre {
        margin-top: 5px;
        padding: 10px;
        background: var(--SmartThemeBorderColor, #333);
        border-radius: 4px;
        overflow: auto;
        max-height: 150px;
        font-size: 12px;
        white-space: pre-wrap;
        word-break: break-word;
      }

      .prompt-builder-preset-settings {
        margin-top: 10px;
      }

      .prompt-builder-preset-settings strong {
        display: block;
        margin-bottom: 5px;
        color: var(--SmartThemeEmColor, #aaa);
      }

      .prompt-builder-preset-settings ul {
        margin: 0;
        padding-left: 20px;
        font-size: 12px;
      }

      .prompt-builder-preset-settings li {
        margin: 3px 0;
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

      .prompt-builder-stack-item.drag-over-top {
        border-top: 3px solid var(--SmartThemeQuoteColor, #3a3);
        margin-top: -2px;
      }

      .prompt-builder-stack-item.drag-over-bottom {
        border-bottom: 3px solid var(--SmartThemeQuoteColor, #3a3);
        margin-bottom: -2px;
      }

      .prompt-builder-stack-list.drag-over {
        border-color: var(--SmartThemeQuoteColor, #3a3);
        background: rgba(58, 170, 58, 0.1);
      }

      .prompt-builder-available-token {
        cursor: grab;
      }

      .prompt-builder-available-token.dragging {
        opacity: 0.5;
        cursor: grabbing;
      }

      .prompt-builder-available-token[draggable="true"]:hover {
        background: var(--SmartThemeBorderColor, #444);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
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
        z-index: 11000;
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

      /* === NEW: Tabs === */
      .prompt-builder-tokens-tabs {
        display: flex;
        gap: 5px;
        margin-bottom: 10px;
        border-bottom: 1px solid var(--SmartThemeBorderColor, #444);
        padding-bottom: 10px;
      }

      .prompt-builder-tab {
        padding: 6px 12px;
        border: 1px solid var(--SmartThemeBorderColor, #444);
        border-radius: 4px 4px 0 0;
        background: transparent;
        color: inherit;
        cursor: pointer;
        font-size: 12px;
        transition: all 0.2s;
      }

      .prompt-builder-tab:hover {
        background: var(--SmartThemeBorderColor, #444);
      }

      .prompt-builder-tab.active {
        background: var(--SmartThemeQuoteColor, #3a3);
        border-color: var(--SmartThemeQuoteColor, #3a3);
        color: #fff;
      }

      .prompt-builder-tab-content {
        max-height: 350px;
        overflow-y: auto;
      }

      .prompt-builder-tab-content.hidden {
        display: none;
      }

      /* === NEW: Council Macros === */
      .prompt-builder-macro-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 12px;
        margin-bottom: 4px;
        border: 1px solid var(--SmartThemeBorderColor, #333);
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .prompt-builder-macro-item:hover {
        background: var(--SmartThemeBorderColor, #444);
        border-color: var(--SmartThemeQuoteColor, #3a3);
      }

      .prompt-builder-macro-name {
        font-weight: 500;
      }

      .prompt-builder-macro-params {
        font-size: 11px;
        color: var(--SmartThemeEmColor, #888);
      }

      .prompt-builder-category-count {
        margin-left: auto;
        padding: 2px 6px;
        background: var(--SmartThemeBorderColor, #444);
        border-radius: 10px;
        font-size: 10px;
      }

      /* === NEW: Conditionals === */
      .prompt-builder-conditionals-section {
        margin-bottom: 15px;
      }

      .prompt-builder-conditionals-section h5 {
        margin: 0 0 8px 0;
        color: var(--SmartThemeEmColor, #aaa);
        font-size: 12px;
      }

      .prompt-builder-conditional-item {
        padding: 10px;
        margin-bottom: 8px;
        border: 1px solid var(--SmartThemeBorderColor, #333);
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .prompt-builder-conditional-item:hover {
        background: var(--SmartThemeBorderColor, #444);
        border-color: var(--SmartThemeQuoteColor, #3a3);
      }

      .prompt-builder-conditional-name {
        font-weight: 500;
        margin-bottom: 4px;
      }

      .prompt-builder-conditional-syntax {
        display: block;
        padding: 4px 8px;
        background: var(--SmartThemeBlurTintColor, #1a1a1a);
        border-radius: 4px;
        font-size: 11px;
        color: var(--SmartThemeQuoteColor, #3a3);
        margin-bottom: 4px;
      }

      .prompt-builder-conditional-desc {
        font-size: 11px;
        color: var(--SmartThemeEmColor, #888);
      }

      .prompt-builder-transform-examples {
        margin-top: 6px;
        font-size: 11px;
        color: var(--SmartThemeEmColor, #888);
      }

      .prompt-builder-transform-examples code {
        margin-right: 5px;
        padding: 2px 4px;
        background: var(--SmartThemeBlurTintColor, #2a2a2a);
        border-radius: 3px;
      }

      .prompt-builder-conditionals-help {
        padding: 10px;
        background: var(--SmartThemeBlurTintColor, rgba(0,0,0,0.2));
        border-radius: 4px;
        margin-top: 10px;
      }

      .prompt-builder-conditionals-help h5 {
        margin: 0 0 8px 0;
        font-size: 12px;
      }

      .prompt-builder-conditionals-help ul {
        margin: 0;
        padding-left: 20px;
        font-size: 11px;
      }

      .prompt-builder-conditionals-help li {
        margin: 4px 0;
      }

      .prompt-builder-conditionals-help code {
        padding: 2px 4px;
        background: var(--SmartThemeBlurTintColor, #2a2a2a);
        border-radius: 3px;
        color: var(--SmartThemeQuoteColor, #3a3);
      }

      /* === NEW: Dialog Overlay === */
      .prompt-builder-dialog-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 11000;
      }

      .prompt-builder-dialog {
        width: 90%;
        max-width: 500px;
        max-height: 80vh;
        background: var(--SmartThemeBodyColor, #222);
        border: 1px solid var(--SmartThemeBorderColor, #444);
        border-radius: 8px;
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }

      .prompt-builder-dialog-wide {
        max-width: 600px;
      }

      .prompt-builder-dialog-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        background: var(--SmartThemeBlurTintColor, #2a2a2a);
        border-bottom: 1px solid var(--SmartThemeBorderColor, #444);
      }

      .prompt-builder-dialog-header h4 {
        margin: 0;
      }

      .prompt-builder-dialog-close {
        padding: 4px 8px;
        border: none;
        background: transparent;
        cursor: pointer;
        color: inherit;
        font-size: 18px;
      }

      .prompt-builder-dialog-content {
        padding: 16px;
        overflow-y: auto;
        flex: 1;
      }

      .prompt-builder-dialog-desc {
        color: var(--SmartThemeEmColor, #888);
        margin-bottom: 15px;
      }

      .prompt-builder-dialog-actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        padding: 12px 16px;
        background: var(--SmartThemeBlurTintColor, #2a2a2a);
        border-top: 1px solid var(--SmartThemeBorderColor, #444);
      }

      /* === NEW: Form Rows === */
      .prompt-builder-form-row {
        margin-bottom: 15px;
      }

      .prompt-builder-form-row label {
        display: block;
        margin-bottom: 5px;
        font-weight: 500;
      }

      .prompt-builder-input {
        width: 100%;
        padding: 8px;
        border: 1px solid var(--SmartThemeBorderColor, #444);
        border-radius: 4px;
        background: var(--SmartThemeBlurTintColor, #1a1a1a);
        color: inherit;
      }

      /* === NEW: Macro Params Form === */
      .prompt-builder-macro-params-form h5 {
        margin: 0 0 10px 0;
        font-size: 13px;
      }

      .prompt-builder-param-row {
        margin-bottom: 10px;
      }

      .prompt-builder-param-row label {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .prompt-builder-param-name {
        font-weight: 500;
        font-size: 13px;
      }

      .prompt-builder-param-name .required {
        color: #f44;
      }

      .prompt-builder-param-input {
        width: 100%;
        padding: 6px 8px;
        border: 1px solid var(--SmartThemeBorderColor, #444);
        border-radius: 4px;
        background: var(--SmartThemeBlurTintColor, #1a1a1a);
        color: inherit;
      }

      /* === NEW: Macro Preview === */
      .prompt-builder-macro-preview,
      .prompt-builder-cond-preview {
        margin-top: 15px;
        padding: 10px;
        background: var(--SmartThemeBlurTintColor, rgba(0,0,0,0.2));
        border-radius: 4px;
      }

      .prompt-builder-macro-preview h5,
      .prompt-builder-cond-preview h5 {
        margin: 0 0 8px 0;
        font-size: 12px;
        color: var(--SmartThemeEmColor, #888);
      }

      .prompt-builder-macro-preview-text,
      .prompt-builder-cond-preview-text {
        margin: 0;
        padding: 8px;
        background: var(--SmartThemeBlurTintColor, #1a1a1a);
        border-radius: 4px;
        font-family: monospace;
        font-size: 11px;
        white-space: pre-wrap;
        word-break: break-all;
        max-height: 150px;
        overflow-y: auto;
      }

      /* === NEW: Macro List (Picker Dialog) === */
      .prompt-builder-macro-list {
        max-height: 300px;
        overflow-y: auto;
      }

      .prompt-builder-macro-list-item {
        padding: 10px;
        border-bottom: 1px solid var(--SmartThemeBorderColor, #333);
        cursor: pointer;
        transition: background 0.2s;
      }

      .prompt-builder-macro-list-item:hover {
        background: var(--SmartThemeBorderColor, #444);
      }

      .prompt-builder-macro-list-name {
        font-weight: 500;
      }

      .prompt-builder-macro-list-category {
        display: inline-block;
        padding: 2px 6px;
        margin-left: 8px;
        background: var(--SmartThemeBorderColor, #444);
        border-radius: 10px;
        font-size: 10px;
        color: var(--SmartThemeEmColor, #888);
      }

      .prompt-builder-macro-list-desc {
        font-size: 12px;
        color: var(--SmartThemeEmColor, #888);
        margin-top: 4px;
      }

      /* === NEW: Stack Item Type Badge === */
      .prompt-builder-item-type-badge {
        font-size: 12px;
        margin-left: 4px;
      }

      /* === NEW: Stack Actions (multiple buttons) === */
      .prompt-builder-stack-actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        margin-top: 10px;
      }

      /* === NEW: Validation Feedback === */
      .prompt-builder-validation {
        padding: 8px 12px;
        font-size: 12px;
      }

      .prompt-builder-validation-success {
        display: flex;
        align-items: center;
        gap: 8px;
        color: var(--SmartThemeQuoteColor, #3a3);
      }

      .prompt-builder-validation-success .prompt-builder-validation-icon {
        font-weight: bold;
      }

      .prompt-builder-validation-issues {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .prompt-builder-validation-warning {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #f90;
      }

      .prompt-builder-validation-error {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #f44;
      }

      .prompt-builder-validation-icon {
        font-weight: bold;
      }

      .prompt-builder-validation-message {
        font-weight: 500;
      }

      .prompt-builder-validation-details {
        color: var(--SmartThemeEmColor, #888);
        font-family: monospace;
        font-size: 11px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        max-width: 200px;
      }

      /* === NEW: Import/Export Toolbar === */
      .prompt-builder-toolbar {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        margin-bottom: 10px;
      }

      .prompt-builder-toolbar-btn {
        padding: 4px 10px;
        border: 1px solid var(--SmartThemeBorderColor, #444);
        border-radius: 4px;
        background: transparent;
        color: inherit;
        cursor: pointer;
        font-size: 12px;
      }

      .prompt-builder-toolbar-btn:hover {
        background: var(--SmartThemeBorderColor, #444);
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
