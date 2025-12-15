/**
 * TheCouncil - Character System Modal UI
 *
 * Comprehensive UI for managing character avatar agents:
 * - Character list view (from Curation data)
 * - Character agent configuration
 * - Character Director management
 * - Voicing guidance and overrides
 *
 * @version 2.0.0
 */

const CharacterModal = {
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
  _activeTab: "characters",

  /**
   * Currently selected character
   * @type {string|null}
   */
  _selectedCharacter: null,

  /**
   * Filter state
   * @type {Object}
   */
  _filters: {
    type: "all",
    status: "all",
    search: "",
  },

  /**
   * Reference to CharacterSystem
   * @type {Object|null}
   */
  _characterSystem: null,

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
    statusBar: null,
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
   * Reference to PromptBuilder instance for Director editing
   * @type {Object|null}
   */
  _promptBuilderInstance: null,

  // ===== INITIALIZATION =====

  /**
   * Initialize the Character Modal
   * @param {Object} options - Configuration options
   * @returns {CharacterModal}
   */
  init(options = {}) {
    if (this._initialized) {
      this._log("warn", "CharacterModal already initialized");
      return this;
    }

    this._kernel = options.kernel || null;
    this._characterSystem = options.characterSystem;
    this._curationSystem = options.curationSystem;
    this._logger = options.logger;

    if (!this._characterSystem) {
      this._log("error", "CharacterSystem is required for CharacterModal");
      return this;
    }

    this._log("info", "Initializing Character Modal...");

    // Create modal DOM
    this._createModal();

    // Subscribe to system events
    this._subscribeToEvents();

    // Register with Kernel modal system
    if (this._kernel && this._kernel.registerModal) {
      this._kernel.registerModal("character", this);
      this._log("debug", "Registered with Kernel modal system");
    }

    this._initialized = true;
    this._log("info", "Character Modal initialized");

    return this;
  },

  /**
   * Destroy the modal and clean up
   */
  destroy() {
    // Clean up PromptBuilder instance
    if (this._promptBuilderInstance) {
      this._promptBuilderInstance.destroy();
      this._promptBuilderInstance = null;
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

    // Remove modal from DOM
    if (this._elements.overlay) {
      this._elements.overlay.remove();
    }

    this._initialized = false;
    this._log("info", "Character Modal destroyed");
  },

  // ===== MODAL CREATION =====

  /**
   * Create the modal DOM structure
   */
  _createModal() {
    // Create overlay
    const overlay = document.createElement("div");
    overlay.className = "council-modal-overlay council-character-modal-overlay";
    overlay.style.display = "none";

    // Create modal container
    const modal = document.createElement("div");
    modal.className = "council-modal council-character-modal";
    modal.innerHTML = `
      <div class="council-modal-header">
        <div class="council-modal-title">
          <span class="council-modal-icon">🎭</span>
          <h2>Character System</h2>
        </div>
        <div class="council-modal-actions">
          <button class="council-modal-btn council-modal-btn-icon" data-action="sync" title="Sync with Curation">
            🔄
          </button>
          <button class="council-modal-btn council-modal-btn-icon" data-action="close" title="Close">
            ✕
          </button>
        </div>
      </div>

      <div class="council-modal-tabs council-character-tabs">
        <button class="council-modal-tab active" data-tab="characters">
          👥 Characters
        </button>
        <button class="council-modal-tab" data-tab="director">
          🎬 Director
        </button>
        <button class="council-modal-tab" data-tab="settings">
          ⚙️ Settings
        </button>
      </div>

      <div class="council-modal-content council-character-content">
        <!-- Content rendered dynamically -->
      </div>

      <div class="council-modal-status-bar council-character-status">
        <span class="council-character-status-text">Ready</span>
      </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Store references
    this._elements.overlay = overlay;
    this._elements.modal = modal;
    this._elements.container = modal;
    this._elements.tabs = modal.querySelector(".council-character-tabs");
    this._elements.content = modal.querySelector(".council-character-content");
    this._elements.statusBar = modal.querySelector(".council-character-status");

    // Bind events
    this._bindModalEvents();

    // Inject styles
    this._injectStyles();
  },

  /**
   * Bind modal event handlers
   */
  _bindModalEvents() {
    const overlay = this._elements.overlay;
    const modal = this._elements.modal;

    // Close on overlay click
    const overlayClickHandler = (e) => {
      if (e.target === overlay) {
        this._kernel.hideModal("character");
      }
    };
    overlay.addEventListener("click", overlayClickHandler);
    this._cleanupFns.push(() =>
      overlay.removeEventListener("click", overlayClickHandler),
    );

    // Tab switching
    const tabClickHandler = (e) => {
      const tab = e.target.closest(".council-modal-tab");
      if (tab) {
        this._switchTab(tab.dataset.tab);
      }
    };
    this._elements.tabs.addEventListener("click", tabClickHandler);
    this._cleanupFns.push(() =>
      this._elements.tabs.removeEventListener("click", tabClickHandler),
    );

    // Header actions
    const headerClickHandler = (e) => {
      const action = e.target.closest("[data-action]")?.dataset.action;
      if (action === "close") {
        this._kernel.hideModal("character");
      } else if (action === "sync") {
        this._syncWithCuration();
      }
    };
    modal
      .querySelector(".council-modal-header")
      .addEventListener("click", headerClickHandler);

    // Content clicks (delegated)
    const contentClickHandler = (e) => {
      this._handleContentClick(e);
    };
    this._elements.content.addEventListener("click", contentClickHandler);
    this._cleanupFns.push(() =>
      this._elements.content.removeEventListener("click", contentClickHandler),
    );

    // Content input changes
    const contentInputHandler = (e) => {
      this._handleContentInput(e);
    };
    this._elements.content.addEventListener("input", contentInputHandler);
    this._cleanupFns.push(() =>
      this._elements.content.removeEventListener("input", contentInputHandler),
    );

    // Content change events (for selects)
    const contentChangeHandler = (e) => {
      this._handleContentChange(e);
    };
    this._elements.content.addEventListener("change", contentChangeHandler);
    this._cleanupFns.push(() =>
      this._elements.content.removeEventListener(
        "change",
        contentChangeHandler,
      ),
    );

    // Keyboard shortcuts
    const keyHandler = (e) => {
      if (!this._isVisible) return;
      if (e.key === "Escape") {
        this._kernel.hideModal("character");
      }
    };
    document.addEventListener("keydown", keyHandler);
    this._cleanupFns.push(() =>
      document.removeEventListener("keydown", keyHandler),
    );
  },

  /**
   * Subscribe to CharacterSystem events
   */
  _subscribeToEvents() {
    if (!this._characterSystem) return;

    const refreshHandler = () => {
      if (this._isVisible) {
        this._renderContent();
      }
    };

    this._characterSystem.on("agent:created", refreshHandler);
    this._characterSystem.on("agent:updated", refreshHandler);
    this._characterSystem.on("agent:deleted", refreshHandler);
    this._characterSystem.on("agents:spawned", refreshHandler);
    this._characterSystem.on("agents:despawned", refreshHandler);
    this._characterSystem.on("director:updated", refreshHandler);

    this._cleanupFns.push(() => {
      this._characterSystem.off("agent:created", refreshHandler);
      this._characterSystem.off("agent:updated", refreshHandler);
      this._characterSystem.off("agent:deleted", refreshHandler);
      this._characterSystem.off("agents:spawned", refreshHandler);
      this._characterSystem.off("agents:despawned", refreshHandler);
      this._characterSystem.off("director:updated", refreshHandler);
    });
  },

  // ===== VISIBILITY =====

  /**
   * Show the modal
   * @param {Object} options - Show options
   */
  show(options = {}) {
    if (!this._initialized) {
      this._log("error", "CharacterModal not initialized");
      return;
    }

    this._elements.overlay.style.display = "flex";
    this._isVisible = true;

    // Switch to specified tab if provided
    if (options.tab) {
      this._switchTab(options.tab);
    } else {
      this._renderContent();
    }

    // Select specific character if provided
    if (options.characterId) {
      this._selectedCharacter = options.characterId;
      this._renderContent();
    }

    this._log("debug", "Character Modal shown");
  },

  /**
   * Hide the modal
   */
  hide() {
    this._elements.overlay.style.display = "none";
    this._isVisible = false;
    this._log("debug", "Character Modal hidden");
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
   * @param {string} tabId - Tab ID
   */
  _switchTab(tabId) {
    this._activeTab = tabId;

    // Update tab buttons
    const tabs = this._elements.tabs.querySelectorAll(".council-modal-tab");
    tabs.forEach((tab) => {
      tab.classList.toggle("active", tab.dataset.tab === tabId);
    });

    // Render content
    this._renderContent();
  },

  // ===== CONTENT RENDERING =====

  /**
   * Render content based on active tab
   */
  _renderContent() {
    // Clean up PromptBuilder instance when switching tabs (unless going to director tab)
    if (this._activeTab !== "director" && this._promptBuilderInstance) {
      this._promptBuilderInstance.destroy();
      this._promptBuilderInstance = null;
    }

    switch (this._activeTab) {
      case "characters":
        this._renderCharactersTab();
        break;
      case "director":
        this._renderDirectorTab();
        break;
      case "settings":
        this._renderSettingsTab();
        break;
      default:
        this._renderCharactersTab();
    }

    this._updateStatusBar();
  },

  /**
   * Render Characters tab
   */
  _renderCharactersTab() {
    const characters = this._getCharactersWithAgentStatus();

    let html = `
      <div class="council-character-tab-content">
        <div class="council-character-toolbar">
          <div class="council-character-search">
            <input type="text" class="council-character-search-input"
                   placeholder="Search characters..."
                   value="${this._escapeHtml(this._filters.search)}"
                   data-filter="search">
          </div>
          <div class="council-character-filters">
            <select class="council-character-filter" data-filter="type">
              <option value="all" ${this._filters.type === "all" ? "selected" : ""}>All Types</option>
              <option value="main_cast" ${this._filters.type === "main_cast" ? "selected" : ""}>Main Cast</option>
              <option value="recurring_cast" ${this._filters.type === "recurring_cast" ? "selected" : ""}>Recurring Cast</option>
              <option value="supporting_cast" ${this._filters.type === "supporting_cast" ? "selected" : ""}>Supporting Cast</option>
              <option value="background" ${this._filters.type === "background" ? "selected" : ""}>Background</option>
            </select>
            <select class="council-character-filter" data-filter="status">
              <option value="all" ${this._filters.status === "all" ? "selected" : ""}>All Status</option>
              <option value="configured" ${this._filters.status === "configured" ? "selected" : ""}>Configured</option>
              <option value="unconfigured" ${this._filters.status === "unconfigured" ? "selected" : ""}>Unconfigured</option>
              <option value="active" ${this._filters.status === "active" ? "selected" : ""}>Active</option>
              <option value="spawned" ${this._filters.status === "spawned" ? "selected" : ""}>Spawned</option>
            </select>
          </div>
          <div class="council-character-actions">
            <button class="council-character-btn council-character-btn-primary" data-action="create-all">
              ➕ Create All Agents
            </button>
          </div>
        </div>

        <div class="council-character-list-container">
          <div class="council-character-list">
            ${this._renderCharacterList(characters)}
          </div>

          <div class="council-character-detail">
            ${
              this._selectedCharacter
                ? this._renderCharacterDetail(this._selectedCharacter)
                : '<div class="council-character-empty">Select a character to view details</div>'
            }
          </div>
        </div>
      </div>
    `;

    this._elements.content.innerHTML = html;
  },

  /**
   * Get characters from Curation with agent status
   * @returns {Object[]} Characters with status
   */
  _getCharactersWithAgentStatus() {
    // Get all characters from Curation
    const curationCharacters =
      this._characterSystem?.getAllCharactersFromCuration() || [];

    // Get all character agents
    const agents = this._characterSystem?.getAllCharacterAgents() || [];
    const agentMap = new Map(agents.map((a) => [a.characterId, a]));

    // Merge and add status
    const characters = curationCharacters.map((char) => {
      const characterId =
        char.id || char.name.toLowerCase().replace(/\s+/g, "_");
      const agent = agentMap.get(characterId);

      return {
        ...char,
        characterId,
        agent,
        hasAgent: !!agent,
        agentStatus: agent?.status || "unassigned",
        type: this._resolveCharacterType(char),
      };
    });

    // Apply filters
    return this._applyFilters(characters);
  },

  /**
   * Resolve character type
   * @param {Object} character - Character data
   * @returns {string} Character type
   */
  _resolveCharacterType(character) {
    if (character.type) {
      const typeMap = {
        main: "main_cast",
        main_cast: "main_cast",
        recurring: "recurring_cast",
        recurring_cast: "recurring_cast",
        supporting: "supporting_cast",
        supporting_cast: "supporting_cast",
        background: "background",
        npc: "background",
      };
      return typeMap[character.type.toLowerCase()] || "supporting_cast";
    }
    return "supporting_cast";
  },

  /**
   * Apply filters to character list
   * @param {Object[]} characters - Characters to filter
   * @returns {Object[]} Filtered characters
   */
  _applyFilters(characters) {
    let filtered = [...characters];

    // Type filter
    if (this._filters.type !== "all") {
      filtered = filtered.filter((c) => c.type === this._filters.type);
    }

    // Status filter
    if (this._filters.status !== "all") {
      switch (this._filters.status) {
        case "configured":
          filtered = filtered.filter((c) => c.hasAgent);
          break;
        case "unconfigured":
          filtered = filtered.filter((c) => !c.hasAgent);
          break;
        case "active":
          filtered = filtered.filter((c) => c.agentStatus === "active");
          break;
        case "spawned":
          filtered = filtered.filter((c) => c.agentStatus === "spawned");
          break;
      }
    }

    // Search filter
    if (this._filters.search) {
      const search = this._filters.search.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.name?.toLowerCase().includes(search) ||
          c.description?.toLowerCase().includes(search) ||
          c.personality?.toLowerCase().includes(search),
      );
    }

    return filtered;
  },

  /**
   * Render character list
   * @param {Object[]} characters - Characters to render
   * @returns {string} HTML string
   */
  _renderCharacterList(characters) {
    if (characters.length === 0) {
      return `
        <div class="council-character-empty">
          <p>No characters found.</p>
          <p class="council-character-hint">Characters are loaded from the Curation system's characterSheets store.</p>
        </div>
      `;
    }

    return characters
      .map((char) => {
        const isSelected = this._selectedCharacter === char.characterId;
        const typeLabel = this._getTypeLabel(char.type);
        const typeIcon = this._getTypeIcon(char.type);
        const statusIcon = this._getStatusIcon(char.agentStatus);

        return `
          <div class="council-character-list-item ${isSelected ? "selected" : ""} ${char.hasAgent ? "has-agent" : ""}"
               data-character-id="${char.characterId}"
               data-action="select-character">
            <div class="council-character-list-item-header">
              <span class="council-character-list-item-name">${this._escapeHtml(char.name)}</span>
              <span class="council-character-list-item-status" title="${char.agentStatus}">${statusIcon}</span>
            </div>
            <div class="council-character-list-item-meta">
              <span class="council-character-type-badge ${char.type}" title="${typeLabel}">
                ${typeIcon} ${typeLabel}
              </span>
            </div>
            ${
              char.personality
                ? `<div class="council-character-list-item-desc">${this._escapeHtml(this._truncate(char.personality, 60))}</div>`
                : ""
            }
          </div>
        `;
      })
      .join("");
  },

  /**
   * Render character detail panel
   * @param {string} characterId - Character ID
   * @returns {string} HTML string
   */
  _renderCharacterDetail(characterId) {
    const characters = this._getCharactersWithAgentStatus();
    const char = characters.find((c) => c.characterId === characterId);

    if (!char) {
      return '<div class="council-character-empty">Character not found</div>';
    }

    const agent = char.agent;
    const typeLabel = this._getTypeLabel(char.type);
    const statusLabel = this._getStatusLabel(char.agentStatus);

    // Get user overrides
    const overrides =
      this._characterSystem?.getUserOverrides(characterId) || {};

    return `
      <div class="council-character-detail-content">
        <div class="council-character-detail-header">
          <h3>${this._escapeHtml(char.name)}</h3>
          <span class="council-character-type-badge ${char.type}">${typeLabel}</span>
        </div>

        <!-- Character Data (from Curation - Read Only) -->
        <div class="council-character-section">
          <div class="council-character-section-header">
            <h4>📋 Character Data</h4>
            <span class="council-character-section-hint">From Curation (read-only)</span>
          </div>

          ${
            char.personality
              ? `<div class="council-character-field">
                <label>Personality</label>
                <div class="council-character-field-value">${this._escapeHtml(char.personality)}</div>
              </div>`
              : ""
          }

          ${
            char.background
              ? `<div class="council-character-field">
                <label>Background</label>
                <div class="council-character-field-value">${this._escapeHtml(char.background)}</div>
              </div>`
              : ""
          }

          ${
            char.speechPatterns
              ? `<div class="council-character-field">
                <label>Speech Patterns</label>
                <div class="council-character-field-value">${this._escapeHtml(char.speechPatterns)}</div>
              </div>`
              : ""
          }

          ${
            char.appearance
              ? `<div class="council-character-field">
                <label>Appearance</label>
                <div class="council-character-field-value">${this._escapeHtml(char.appearance)}</div>
              </div>`
              : ""
          }

          <div class="council-character-curation-link">
            <span class="council-character-hint">To edit character data, go to the Curation system.</span>
          </div>
        </div>

        <!-- Agent Configuration -->
        <div class="council-character-section">
          <div class="council-character-section-header">
            <h4>🤖 Agent Configuration</h4>
            <span class="council-character-status-badge ${char.hasAgent ? "configured" : "unconfigured"}">
              ${char.hasAgent ? "Configured" : "Not Configured"}
            </span>
          </div>

          ${
            char.hasAgent
              ? this._renderAgentConfig(char, agent, overrides)
              : this._renderCreateAgentPrompt(char)
          }
        </div>

        <!-- Actions -->
        <div class="council-character-detail-actions">
          ${
            char.hasAgent
              ? `
              <button class="council-character-btn council-character-btn-secondary" data-action="sync-agent" data-character-id="${characterId}">
                🔄 Sync from Curation
              </button>
              <button class="council-character-btn council-character-btn-secondary" data-action="preview-prompt" data-character-id="${characterId}">
                👁️ Preview Prompt
              </button>
              <button class="council-character-btn council-character-btn-danger" data-action="delete-agent" data-character-id="${characterId}">
                🗑️ Delete Agent
              </button>
            `
              : `
              <button class="council-character-btn council-character-btn-primary" data-action="create-agent" data-character-id="${characterId}">
                ➕ Create Agent
              </button>
            `
          }
        </div>
      </div>
    `;
  },

  /**
   * Render agent configuration form
   * @param {Object} char - Character data
   * @param {Object} agent - Agent data
   * @param {Object} overrides - User overrides
   * @returns {string} HTML string
   */
  _renderAgentConfig(char, agent, overrides) {
    const config = agent.systemPromptConfig || {};

    return `
      <div class="council-character-agent-config">
        <div class="council-character-field">
          <label>Voicing Guidance</label>
          <textarea class="council-character-input"
                    data-config="voicingGuidance"
                    data-character-id="${char.characterId}"
                    rows="3"
                    placeholder="How should this character be voiced? Special considerations?"
          >${this._escapeHtml(config.voicingGuidance || "")}</textarea>
          <span class="council-character-hint">Additional guidance for how this character should speak and act.</span>
        </div>

        <div class="council-character-field">
          <label>Prompt Prefix</label>
          <textarea class="council-character-input"
                    data-config="prefix"
                    data-character-id="${char.characterId}"
                    rows="2"
                    placeholder="Injected before the auto-generated prompt"
          >${this._escapeHtml(config.prefix || "")}</textarea>
        </div>

        <div class="council-character-field">
          <label>Prompt Suffix</label>
          <textarea class="council-character-input"
                    data-config="suffix"
                    data-character-id="${char.characterId}"
                    rows="2"
                    placeholder="Injected after the auto-generated prompt"
          >${this._escapeHtml(config.suffix || "")}</textarea>
        </div>

        <div class="council-character-field council-character-field-inline">
          <label>
            <input type="checkbox"
                   data-config="autoGenerate"
                   data-character-id="${char.characterId}"
                   ${config.autoGenerate !== false ? "checked" : ""}>
            Auto-generate prompt from character data
          </label>
        </div>

        <div class="council-character-field">
          <label>Status</label>
          <select class="council-character-input"
                  data-config="status"
                  data-character-id="${char.characterId}">
            <option value="inactive" ${agent.status === "inactive" ? "selected" : ""}>Inactive</option>
            <option value="active" ${agent.status === "active" ? "selected" : ""}>Active</option>
          </select>
        </div>

        <div class="council-character-api-config">
          <details>
            <summary>API Configuration</summary>
            <div class="council-character-api-fields">
              <div class="council-character-field council-character-field-inline">
                <label>
                  <input type="checkbox"
                         data-config="useCurrentConnection"
                         data-character-id="${char.characterId}"
                         ${agent.apiConfig?.useCurrentConnection !== false ? "checked" : ""}>
                  Use current ST connection
                </label>
              </div>

              <div class="council-character-field">
                <label>Temperature</label>
                <input type="number"
                       class="council-character-input"
                       data-config="temperature"
                       data-character-id="${char.characterId}"
                       value="${agent.apiConfig?.temperature ?? 0.8}"
                       min="0" max="2" step="0.1">
              </div>

              <div class="council-character-field">
                <label>Max Tokens</label>
                <input type="number"
                       class="council-character-input"
                       data-config="maxTokens"
                       data-character-id="${char.characterId}"
                       value="${agent.apiConfig?.maxTokens ?? 1500}"
                       min="100" max="8000" step="100">
              </div>
            </div>
          </details>
        </div>
      </div>
    `;
  },

  /**
   * Render create agent prompt
   * @param {Object} char - Character data
   * @returns {string} HTML string
   */
  _renderCreateAgentPrompt(char) {
    return `
      <div class="council-character-create-prompt">
        <p>No agent has been created for this character yet.</p>
        <p class="council-character-hint">
          Creating an agent will allow this character to participate in pipeline actions
          and speak with their own voice.
        </p>
      </div>
    `;
  },

  /**
   * Render Director tab
   */
  _renderDirectorTab() {
    const director = this._characterSystem?.getCharacterDirector();

    if (!director) {
      this._elements.content.innerHTML = `
        <div class="council-character-tab-content">
          <div class="council-character-empty">
            <p>Character Director not available.</p>
          </div>
        </div>
      `;
      return;
    }

    // Prepare initial prompt builder config from director data
    const promptConfig = director?.systemPrompt || {};
    const initialMode =
      promptConfig.source === "preset"
        ? "preset"
        : promptConfig.source === "tokens"
          ? "tokens"
          : "custom";

    this._elements.content.innerHTML = `
      <div class="council-character-tab-content">
        <div class="council-character-director-panel">
          <div class="council-character-section">
            <div class="council-character-section-header">
              <h4>🎬 Character Director</h4>
              <span class="council-character-section-hint">Coordinates character agents</span>
            </div>

            <div class="council-character-field">
              <label>Name</label>
              <input type="text"
                     class="council-character-input"
                     data-director="name"
                     value="${this._escapeHtml(director.name || "Character Director")}">
            </div>

            <div class="council-character-field">
              <label>Description</label>
              <textarea class="council-character-input"
                        data-director="description"
                        rows="2"
              >${this._escapeHtml(director.description || "")}</textarea>
            </div>
          </div>

          <div class="council-character-section">
            <div class="council-character-section-header">
              <h4>⚙️ API Configuration</h4>
            </div>

            <div class="council-character-field council-character-field-inline">
              <label>
                <input type="checkbox"
                       data-director="useCurrentConnection"
                       ${director.apiConfig?.useCurrentConnection !== false ? "checked" : ""}>
                Use current ST connection
              </label>
            </div>

            <div class="council-character-form-row">
              <div class="council-character-field">
                <label>Temperature</label>
                <input type="number"
                       class="council-character-input"
                       data-director="temperature"
                       value="${director.apiConfig?.temperature ?? 0.7}"
                       min="0" max="2" step="0.1">
              </div>
              <div class="council-character-field">
                <label>Max Tokens</label>
                <input type="number"
                       class="council-character-input"
                       data-director="maxTokens"
                       value="${director.apiConfig?.maxTokens ?? 2000}"
                       min="100" max="8000" step="100">
              </div>
            </div>
          </div>

          <div class="council-character-section">
            <div class="council-character-section-header">
              <h4>💬 System Prompt</h4>
              <span class="council-character-section-hint">Use custom text, ST presets, or token-based prompts</span>
            </div>
            <div class="council-character-prompt-builder-container" data-prompt-builder="director">
              <!-- PromptBuilder will be rendered here -->
            </div>
          </div>

          <div class="council-character-detail-actions">
            <button class="council-character-btn council-character-btn-primary" data-action="save-director">
              💾 Save Changes
            </button>
            <button class="council-character-btn council-character-btn-secondary" data-action="reset-director">
              ↩️ Reset to Default
            </button>
          </div>
        </div>
      </div>
    `;

    // Initialize PromptBuilder in the director panel
    this._initDirectorPromptBuilder(promptConfig, initialMode);
  },

  /**
   * Initialize PromptBuilder for Director tab
   * @param {Object} promptConfig - Current prompt configuration
   * @param {string} initialMode - Initial mode (custom, preset, tokens)
   */
  _initDirectorPromptBuilder(promptConfig, initialMode) {
    // Clean up existing instance
    if (this._promptBuilderInstance) {
      this._promptBuilderInstance.destroy();
      this._promptBuilderInstance = null;
    }

    const promptBuilderContainer = this._elements.content.querySelector(
      '[data-prompt-builder="director"]',
    );

    if (promptBuilderContainer && window.PromptBuilder) {
      this._promptBuilderInstance = window.PromptBuilder.createInstance({
        initialMode: initialMode,
        initialPrompt: promptConfig.customText || "",
        initialPreset: promptConfig.presetName || null,
        initialTokens: promptConfig.tokens || [],
        onChange: (value) => {
          this._log("debug", "Director PromptBuilder changed:", value);
        },
      });
      this._promptBuilderInstance.render(promptBuilderContainer);
    } else {
      // Fallback to simple textarea if PromptBuilder not available
      promptBuilderContainer.innerHTML = `
        <div class="council-character-field">
          <label>System Prompt</label>
          <textarea class="council-character-input council-character-code"
                    data-director="systemPrompt"
                    rows="10"
          >${this._escapeHtml(promptConfig.customText || "")}</textarea>
        </div>
      `;
    }
  },

  /**
   * Render Settings tab
   */
  _renderSettingsTab() {
    const summary = this._characterSystem?.getSummary() || {};

    this._elements.content.innerHTML = `
      <div class="council-character-tab-content">
        <div class="council-character-settings-panel">
          <div class="council-character-section">
            <div class="council-character-section-header">
              <h4>📊 System Status</h4>
            </div>

            <div class="council-character-stats">
              <div class="council-character-stat">
                <span class="council-character-stat-value">${summary.counts?.totalAgents || 0}</span>
                <span class="council-character-stat-label">Total Agents</span>
              </div>
              <div class="council-character-stat">
                <span class="council-character-stat-value">${summary.counts?.spawnedAgents || 0}</span>
                <span class="council-character-stat-label">Spawned</span>
              </div>
              <div class="council-character-stat">
                <span class="council-character-stat-value">${summary.counts?.positions || 0}</span>
                <span class="council-character-stat-label">Positions</span>
              </div>
            </div>

            <div class="council-character-type-breakdown">
              <h5>By Type</h5>
              <ul>
                <li>Main Cast: ${summary.byType?.main_cast || 0}</li>
                <li>Recurring Cast: ${summary.byType?.recurring_cast || 0}</li>
                <li>Supporting Cast: ${summary.byType?.supporting_cast || 0}</li>
                <li>Background: ${summary.byType?.background || 0}</li>
              </ul>
            </div>
          </div>

          <div class="council-character-section">
            <div class="council-character-section-header">
              <h4>🔧 Actions</h4>
            </div>

            <div class="council-character-settings-actions">
              <button class="council-character-btn council-character-btn-secondary" data-action="sync-all">
                🔄 Sync All with Curation
              </button>
              <button class="council-character-btn council-character-btn-secondary" data-action="despawn-all">
                ⏹️ Despawn All Characters
              </button>
              <button class="council-character-btn council-character-btn-secondary" data-action="export">
                📤 Export Character Data
              </button>
              <button class="council-character-btn council-character-btn-secondary" data-action="import">
                📥 Import Character Data
              </button>
            </div>
          </div>

          <div class="council-character-section">
            <div class="council-character-section-header">
              <h4>⚠️ Danger Zone</h4>
            </div>

            <div class="council-character-danger-actions">
              <button class="council-character-btn council-character-btn-danger" data-action="delete-all">
                🗑️ Delete All Character Agents
              </button>
              <button class="council-character-btn council-character-btn-danger" data-action="clear-overrides">
                🧹 Clear All User Overrides
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  // ===== EVENT HANDLERS =====

  /**
   * Handle content area clicks
   * @param {Event} e - Click event
   */
  _handleContentClick(e) {
    const target = e.target.closest("[data-action]");
    if (!target) return;

    const action = target.dataset.action;
    const characterId = target.dataset.characterId;

    switch (action) {
      case "select-character":
        this._selectedCharacter = target.closest(
          "[data-character-id]",
        )?.dataset.characterId;
        this._renderContent();
        break;

      case "create-agent":
        this._createAgent(characterId);
        break;

      case "delete-agent":
        this._deleteAgent(characterId);
        break;

      case "sync-agent":
        this._syncAgent(characterId);
        break;

      case "preview-prompt":
        this._previewPrompt(characterId);
        break;

      case "create-all":
        this._createAllAgents();
        break;

      case "sync-all":
        this._syncAllAgents();
        break;

      case "despawn-all":
        this._despawnAll();
        break;

      case "delete-all":
        this._deleteAllAgents();
        break;

      case "clear-overrides":
        this._clearAllOverrides();
        break;

      case "save-director":
        this._saveDirector();
        break;

      case "reset-director":
        this._resetDirector();
        break;

      case "export":
        this._exportData();
        break;

      case "import":
        this._importData();
        break;
    }
  },

  /**
   * Handle content input events
   * @param {Event} e - Input event
   */
  _handleContentInput(e) {
    const target = e.target;

    // Filter inputs
    if (target.dataset.filter) {
      this._filters[target.dataset.filter] = target.value;
      this._renderContent();
      return;
    }

    // Character config inputs (debounced save)
    if (target.dataset.config && target.dataset.characterId) {
      this._scheduleAgentSave(target.dataset.characterId);
    }

    // Director inputs (debounced save)
    if (target.dataset.director) {
      this._scheduleDirectorSave();
    }
  },

  /**
   * Handle content change events (selects, checkboxes)
   * @param {Event} e - Change event
   */
  _handleContentChange(e) {
    const target = e.target;

    // Filter selects
    if (target.dataset.filter) {
      this._filters[target.dataset.filter] = target.value;
      this._renderContent();
      return;
    }

    // Character config
    if (target.dataset.config && target.dataset.characterId) {
      this._saveAgentConfig(target.dataset.characterId);
    }

    // Director config
    if (target.dataset.director) {
      this._saveDirectorConfig();
    }
  },

  // ===== AGENT ACTIONS =====

  _saveTimeout: null,
  _directorSaveTimeout: null,

  /**
   * Schedule agent config save (debounced)
   * @param {string} characterId - Character ID
   */
  _scheduleAgentSave(characterId) {
    clearTimeout(this._saveTimeout);
    this._saveTimeout = setTimeout(() => {
      this._saveAgentConfig(characterId);
    }, 500);
  },

  /**
   * Save agent configuration from form
   * @param {string} characterId - Character ID
   */
  _saveAgentConfig(characterId) {
    const agent = this._characterSystem?.getAgentByCharacterId(characterId);
    if (!agent) return;

    const content = this._elements.content;

    // Gather form values
    const updates = {
      systemPromptConfig: {
        voicingGuidance:
          content.querySelector(
            `[data-config="voicingGuidance"][data-character-id="${characterId}"]`,
          )?.value || "",
        prefix:
          content.querySelector(
            `[data-config="prefix"][data-character-id="${characterId}"]`,
          )?.value || "",
        suffix:
          content.querySelector(
            `[data-config="suffix"][data-character-id="${characterId}"]`,
          )?.value || "",
        autoGenerate:
          content.querySelector(
            `[data-config="autoGenerate"][data-character-id="${characterId}"]`,
          )?.checked !== false,
      },
      status:
        content.querySelector(
          `[data-config="status"][data-character-id="${characterId}"]`,
        )?.value || agent.status,
      apiConfig: {
        ...agent.apiConfig,
        useCurrentConnection:
          content.querySelector(
            `[data-config="useCurrentConnection"][data-character-id="${characterId}"]`,
          )?.checked !== false,
        temperature:
          parseFloat(
            content.querySelector(
              `[data-config="temperature"][data-character-id="${characterId}"]`,
            )?.value,
          ) || 0.8,
        maxTokens:
          parseInt(
            content.querySelector(
              `[data-config="maxTokens"][data-character-id="${characterId}"]`,
            )?.value,
          ) || 1500,
      },
    };

    this._characterSystem.updateCharacterAgent(agent.id, updates);
    this._setStatus("Saved agent configuration");
  },

  /**
   * Schedule director config save (debounced)
   */
  _scheduleDirectorSave() {
    clearTimeout(this._directorSaveTimeout);
    this._directorSaveTimeout = setTimeout(() => {
      this._saveDirectorConfig();
    }, 500);
  },

  /**
   * Save director configuration
   */
  _saveDirectorConfig() {
    const content = this._elements.content;

    // Get system prompt config from PromptBuilder or fallback to textarea
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
        source: "custom",
        customText:
          content.querySelector('[data-director="systemPrompt"]')?.value || "",
      };
    }

    const updates = {
      name:
        content.querySelector('[data-director="name"]')?.value ||
        "Character Director",
      description:
        content.querySelector('[data-director="description"]')?.value || "",
      systemPrompt: systemPromptConfig,
      apiConfig: {
        useCurrentConnection:
          content.querySelector('[data-director="useCurrentConnection"]')
            ?.checked !== false,
        temperature:
          parseFloat(
            content.querySelector('[data-director="temperature"]')?.value,
          ) || 0.7,
        maxTokens:
          parseInt(
            content.querySelector('[data-director="maxTokens"]')?.value,
          ) || 2000,
      },
    };

    this._characterSystem?.updateCharacterDirector(updates);
    this._setStatus("Saved director configuration");
  },

  /**
   * Create agent for character
   * @param {string} characterId - Character ID
   */
  _createAgent(characterId) {
    try {
      this._characterSystem?.createCharacterAgent(characterId);
      this._setStatus(`Created agent for character`);
      this._renderContent();
    } catch (error) {
      this._log("error", "Failed to create agent:", error);
      this._setStatus(`Error: ${error.message}`);
    }
  },

  /**
   * Delete agent for character
   * @param {string} characterId - Character ID
   */
  _deleteAgent(characterId) {
    if (!confirm("Are you sure you want to delete this character agent?")) {
      return;
    }

    const agent = this._characterSystem?.getAgentByCharacterId(characterId);
    if (agent) {
      this._characterSystem.deleteCharacterAgent(agent.id);
      this._setStatus("Deleted character agent");
      this._selectedCharacter = null;
      this._renderContent();
    }
  },

  /**
   * Sync agent with Curation data
   * @param {string} characterId - Character ID
   */
  _syncAgent(characterId) {
    const agent = this._characterSystem?.getAgentByCharacterId(characterId);
    if (agent) {
      this._characterSystem.syncWithCuration(agent.id);
      this._setStatus("Synced with Curation data");
      this._renderContent();
    }
  },

  /**
   * Preview generated system prompt
   * @param {string} characterId - Character ID
   */
  _previewPrompt(characterId) {
    const agent = this._characterSystem?.getAgentByCharacterId(characterId);
    if (!agent) return;

    const prompt = this._characterSystem.generateSystemPrompt(agent.id);

    // Show in a dialog
    const dialog = document.createElement("div");
    dialog.className = "council-character-dialog-overlay";
    dialog.innerHTML = `
      <div class="council-character-dialog">
        <div class="council-character-dialog-header">
          <h3>System Prompt Preview: ${this._escapeHtml(agent.name)}</h3>
          <button class="council-character-dialog-close" data-close>✕</button>
        </div>
        <div class="council-character-dialog-content">
          <pre class="council-character-prompt-preview">${this._escapeHtml(prompt)}</pre>
        </div>
        <div class="council-character-dialog-actions">
          <button class="council-character-btn council-character-btn-secondary" data-close>Close</button>
        </div>
      </div>
    `;

    dialog.addEventListener("click", (e) => {
      if (e.target.hasAttribute("data-close") || e.target === dialog) {
        dialog.remove();
      }
    });

    document.body.appendChild(dialog);
  },

  /**
   * Create agents for all characters
   */
  _createAllAgents() {
    if (!confirm("Create agents for all characters from Curation?")) {
      return;
    }

    const created = this._characterSystem?.createAgentsFromCuration() || [];
    this._setStatus(`Created ${created.length} character agents`);
    this._renderContent();
  },

  /**
   * Sync all agents with Curation
   */
  _syncAllAgents() {
    this._characterSystem?.syncAllWithCuration();
    this._setStatus("Synced all agents with Curation");
    this._renderContent();
  },

  /**
   * Sync with Curation (header button)
   */
  _syncWithCuration() {
    this._syncAllAgents();
  },

  /**
   * Despawn all characters
   */
  _despawnAll() {
    this._characterSystem?.despawnAll();
    this._setStatus("Despawned all characters");
    this._renderContent();
  },

  /**
   * Delete all character agents
   */
  _deleteAllAgents() {
    if (
      !confirm(
        "Are you sure you want to delete ALL character agents? This cannot be undone.",
      )
    ) {
      return;
    }

    const agents = this._characterSystem?.getAllCharacterAgents() || [];
    for (const agent of agents) {
      this._characterSystem.deleteCharacterAgent(agent.id);
    }

    this._selectedCharacter = null;
    this._setStatus(`Deleted ${agents.length} character agents`);
    this._renderContent();
  },

  /**
   * Clear all user overrides
   */
  _clearAllOverrides() {
    if (!confirm("Clear all user overrides for character agents?")) {
      return;
    }

    const agents = this._characterSystem?.getAllCharacterAgents() || [];
    for (const agent of agents) {
      this._characterSystem.clearUserOverrides(agent.characterId);
    }

    this._setStatus("Cleared all user overrides");
    this._renderContent();
  },

  /**
   * Save director changes
   */
  _saveDirector() {
    this._saveDirectorConfig();
  },

  /**
   * Reset director to default
   */
  _resetDirector() {
    if (!confirm("Reset Character Director to default configuration?")) {
      return;
    }

    // Re-initialize with defaults
    this._characterSystem?.updateCharacterDirector(
      this._characterSystem._createDefaultCharacterDirector(),
    );
    this._setStatus("Reset director to defaults");
    this._renderContent();
  },

  /**
   * Export character data
   */
  _exportData() {
    const data = this._characterSystem?.export();
    if (!data) return;

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `council-characters-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    this._setStatus("Exported character data");
  },

  /**
   * Import character data
   */
  _importData() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";

    input.onchange = (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (re) => {
        try {
          const data = JSON.parse(re.target.result);
          this._characterSystem?.import(data, { merge: true });
          this._setStatus("Imported character data");
          this._renderContent();
        } catch (err) {
          this._log("error", "Import failed:", err);
          this._setStatus(`Import error: ${err.message}`);
        }
      };
      reader.readAsText(file);
    };

    input.click();
  },

  // ===== HELPERS =====

  /**
   * Update status bar
   */
  _updateStatusBar() {
    const summary = this._characterSystem?.getSummary() || {};
    const text = `${summary.counts?.totalAgents || 0} agents | ${summary.counts?.spawnedAgents || 0} spawned | Curation: ${summary.curationConnected ? "Connected" : "Disconnected"}`;
    this._elements.statusBar.querySelector(
      ".council-character-status-text",
    ).textContent = text;
  },

  /**
   * Set status message
   * @param {string} message - Status message
   */
  _setStatus(message) {
    this._elements.statusBar.querySelector(
      ".council-character-status-text",
    ).textContent = message;
    setTimeout(() => this._updateStatusBar(), 3000);
  },

  /**
   * Get type label
   * @param {string} type - Character type
   * @returns {string} Label
   */
  _getTypeLabel(type) {
    const labels = {
      main_cast: "Main Cast",
      recurring_cast: "Recurring",
      supporting_cast: "Supporting",
      background: "Background",
    };
    return labels[type] || "Unknown";
  },

  /**
   * Get type icon
   * @param {string} type - Character type
   * @returns {string} Icon
   */
  _getTypeIcon(type) {
    const icons = {
      main_cast: "⭐",
      recurring_cast: "🔄",
      supporting_cast: "👤",
      background: "👥",
    };
    return icons[type] || "❓";
  },

  /**
   * Get status icon
   * @param {string} status - Agent status
   * @returns {string} Icon
   */
  _getStatusIcon(status) {
    const icons = {
      active: "🟢",
      inactive: "⚪",
      spawned: "🔵",
      unassigned: "⚫",
    };
    return icons[status] || "❓";
  },

  /**
   * Get status label
   * @param {string} status - Agent status
   * @returns {string} Label
   */
  _getStatusLabel(status) {
    const labels = {
      active: "Active",
      inactive: "Inactive",
      spawned: "Spawned",
      unassigned: "Not Configured",
    };
    return labels[status] || "Unknown";
  },

  /**
   * Truncate string
   * @param {string} str - String to truncate
   * @param {number} length - Max length
   * @returns {string} Truncated string
   */
  _truncate(str, length) {
    if (!str) return "";
    return str.length > length ? str.substring(0, length) + "..." : str;
  },

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
   * Log a message
   * @param {string} level - Log level
   * @param {string} message - Message
   * @param {...any} args - Additional arguments
   */
  _log(level, message, ...args) {
    const prefix = "[CharacterModal]";
    if (this._logger && typeof this._logger[level] === "function") {
      this._logger[level](prefix, message, ...args);
    } else {
      const fn =
        level === "error"
          ? console.error
          : level === "warn"
            ? console.warn
            : console.log;
      fn(prefix, message, ...args);
    }
  },

  // ===== STYLES =====

  /**
   * Inject modal styles
   */
  _injectStyles() {
    if (document.getElementById("council-character-modal-styles")) return;

    const styles = document.createElement("style");
    styles.id = "council-character-modal-styles";
    styles.textContent = `
      .council-character-modal-overlay {
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

      .council-character-modal {
        background: var(--SmartThemeBotMesBlurTintColor, #1a1a2e);
        border-radius: 12px;
        width: 90%;
        max-width: 1000px;
        max-height: 85vh;
        display: flex;
        flex-direction: column;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
      }

      .council-character-modal .council-modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 20px;
        border-bottom: 1px solid var(--SmartThemeBorderColor, #333);
      }

      .council-character-modal .council-modal-title {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .council-character-modal .council-modal-icon {
        font-size: 24px;
      }

      .council-character-modal h2 {
        margin: 0;
        font-size: 18px;
        color: var(--SmartThemeBodyColor, #eee);
      }

      .council-character-tabs {
        display: flex;
        gap: 4px;
        padding: 8px 16px;
        border-bottom: 1px solid var(--SmartThemeBorderColor, #333);
        background: rgba(0, 0, 0, 0.2);
      }

      .council-character-tabs .council-modal-tab {
        padding: 8px 16px;
        border: none;
        background: transparent;
        color: var(--SmartThemeBodyColor, #ccc);
        cursor: pointer;
        border-radius: 6px;
        transition: all 0.2s;
      }

      .council-character-tabs .council-modal-tab:hover {
        background: rgba(255, 255, 255, 0.1);
      }

      .council-character-tabs .council-modal-tab.active {
        background: var(--SmartThemeQuoteColor, #4a4a6a);
        color: #fff;
      }

      .council-character-content {
        flex: 1;
        overflow: auto;
        padding: 16px;
      }

      .council-character-status {
        padding: 8px 16px;
        border-top: 1px solid var(--SmartThemeBorderColor, #333);
        font-size: 12px;
        color: var(--SmartThemeBodyColor, #888);
      }

      .council-character-toolbar {
        display: flex;
        gap: 12px;
        margin-bottom: 16px;
        flex-wrap: wrap;
        align-items: center;
      }

      .council-character-search {
        flex: 1;
        min-width: 200px;
      }

      .council-character-search-input {
        width: 100%;
        padding: 8px 12px;
        border: 1px solid var(--SmartThemeBorderColor, #444);
        border-radius: 6px;
        background: var(--SmartThemeBlurTintColor, #2a2a4a);
        color: var(--SmartThemeBodyColor, #eee);
      }

      .council-character-filters {
        display: flex;
        gap: 8px;
      }

      .council-character-filter {
        padding: 8px 12px;
        border: 1px solid var(--SmartThemeBorderColor, #444);
        border-radius: 6px;
        background: var(--SmartThemeBlurTintColor, #2a2a4a);
        color: var(--SmartThemeBodyColor, #eee);
      }

      .council-character-list-container {
        display: grid;
        grid-template-columns: 300px 1fr;
        gap: 16px;
        min-height: 400px;
      }

      .council-character-list {
        border: 1px solid var(--SmartThemeBorderColor, #333);
        border-radius: 8px;
        overflow: auto;
        max-height: 500px;
      }

      .council-character-list-item {
        padding: 12px;
        border-bottom: 1px solid var(--SmartThemeBorderColor, #333);
        cursor: pointer;
        transition: background 0.2s;
      }

      .council-character-list-item:hover {
        background: rgba(255, 255, 255, 0.05);
      }

      .council-character-list-item.selected {
        background: var(--SmartThemeQuoteColor, #3a3a5a);
      }

      .council-character-list-item.has-agent {
        border-left: 3px solid var(--SmartThemeQuoteColor, #6a6aca);
      }

      .council-character-list-item-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 4px;
      }

      .council-character-list-item-name {
        font-weight: 600;
        color: var(--SmartThemeBodyColor, #eee);
      }

      .council-character-list-item-meta {
        font-size: 12px;
        color: var(--SmartThemeBodyColor, #888);
      }

      .council-character-list-item-desc {
        font-size: 12px;
        color: var(--SmartThemeBodyColor, #888);
        margin-top: 4px;
      }

      .council-character-type-badge {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 11px;
        background: rgba(100, 100, 200, 0.3);
      }

      .council-character-type-badge.main_cast { background: rgba(255, 215, 0, 0.3); }
      .council-character-type-badge.recurring_cast { background: rgba(100, 200, 255, 0.3); }
      .council-character-type-badge.supporting_cast { background: rgba(150, 150, 200, 0.3); }
      .council-character-type-badge.background { background: rgba(100, 100, 100, 0.3); }

      .council-character-detail {
        border: 1px solid var(--SmartThemeBorderColor, #333);
        border-radius: 8px;
        padding: 16px;
        overflow: auto;
      }

      .council-character-detail-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
        padding-bottom: 12px;
        border-bottom: 1px solid var(--SmartThemeBorderColor, #333);
      }

      .council-character-detail-header h3 {
        margin: 0;
        color: var(--SmartThemeBodyColor, #eee);
      }

      .council-character-section {
        margin-bottom: 20px;
        padding: 12px;
        background: rgba(0, 0, 0, 0.2);
        border-radius: 8px;
      }

      .council-character-section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
      }

      .council-character-section-header h4 {
        margin: 0;
        font-size: 14px;
        color: var(--SmartThemeBodyColor, #ddd);
      }

      .council-character-section-hint {
        font-size: 11px;
        color: var(--SmartThemeBodyColor, #888);
      }

      .council-character-field {
        margin-bottom: 12px;
      }

      .council-character-field label {
        display: block;
        margin-bottom: 4px;
        font-size: 12px;
        color: var(--SmartThemeBodyColor, #aaa);
      }

      .council-character-field-value {
        padding: 8px;
        background: rgba(0, 0, 0, 0.2);
        border-radius: 4px;
        font-size: 13px;
        color: var(--SmartThemeBodyColor, #ccc);
      }

      .council-character-input {
        width: 100%;
        padding: 8px 12px;
        border: 1px solid var(--SmartThemeBorderColor, #444);
        border-radius: 6px;
        background: var(--SmartThemeBlurTintColor, #2a2a4a);
        color: var(--SmartThemeBodyColor, #eee);
        font-size: 13px;
      }

      .council-character-input:focus {
        outline: none;
        border-color: var(--SmartThemeQuoteColor, #6a6aca);
      }

      .council-character-code {
        font-family: monospace;
        font-size: 12px;
      }

      .council-character-hint {
        font-size: 11px;
        color: var(--SmartThemeBodyColor, #888);
        margin-top: 4px;
      }

      .council-character-field-inline {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .council-character-field-inline label {
        display: flex;
        align-items: center;
        gap: 6px;
        margin: 0;
      }

      .council-character-form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }

      .council-character-detail-actions {
        display: flex;
        gap: 8px;
        margin-top: 16px;
        padding-top: 16px;
        border-top: 1px solid var(--SmartThemeBorderColor, #333);
      }

      .council-character-btn {
        padding: 8px 16px;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 13px;
        transition: all 0.2s;
      }

      .council-character-btn-primary {
        background: var(--SmartThemeQuoteColor, #5a5a8a);
        color: #fff;
      }

      .council-character-btn-primary:hover {
        background: var(--SmartThemeQuoteColor, #6a6a9a);
      }

      .council-character-btn-secondary {
        background: rgba(100, 100, 100, 0.3);
        color: var(--SmartThemeBodyColor, #ddd);
      }

      .council-character-btn-secondary:hover {
        background: rgba(100, 100, 100, 0.5);
      }

      .council-character-btn-danger {
        background: rgba(200, 50, 50, 0.3);
        color: #ff6b6b;
      }

      .council-character-btn-danger:hover {
        background: rgba(200, 50, 50, 0.5);
      }

      .council-character-empty {
        text-align: center;
        padding: 40px 20px;
        color: var(--SmartThemeBodyColor, #888);
      }

      .council-character-stats {
        display: flex;
        gap: 20px;
        margin-bottom: 16px;
      }

      .council-character-stat {
        text-align: center;
      }

      .council-character-stat-value {
        display: block;
        font-size: 24px;
        font-weight: bold;
        color: var(--SmartThemeQuoteColor, #8a8aca);
      }

      .council-character-stat-label {
        font-size: 12px;
        color: var(--SmartThemeBodyColor, #888);
      }

      .council-character-settings-actions,
      .council-character-danger-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .council-character-api-config details {
        margin-top: 12px;
      }

      .council-character-api-config summary {
        cursor: pointer;
        color: var(--SmartThemeBodyColor, #aaa);
        font-size: 13px;
      }

      .council-character-api-fields {
        padding: 12px;
        margin-top: 8px;
        background: rgba(0, 0, 0, 0.1);
        border-radius: 6px;
      }

      .council-character-status-badge {
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 11px;
      }

      .council-character-status-badge.configured {
        background: rgba(100, 200, 100, 0.3);
        color: #8f8;
      }

      .council-character-status-badge.unconfigured {
        background: rgba(200, 200, 100, 0.3);
        color: #ff8;
      }

      .council-character-create-prompt {
        text-align: center;
        padding: 20px;
        color: var(--SmartThemeBodyColor, #888);
      }

      .council-character-curation-link {
        margin-top: 12px;
        padding: 8px;
        background: rgba(100, 100, 200, 0.1);
        border-radius: 6px;
        text-align: center;
      }

      .council-character-dialog-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10001;
      }

      .council-character-dialog {
        background: var(--SmartThemeBotMesBlurTintColor, #1a1a2e);
        border-radius: 12px;
        width: 90%;
        max-width: 700px;
        max-height: 80vh;
        display: flex;
        flex-direction: column;
      }

      .council-character-dialog-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px;
        border-bottom: 1px solid var(--SmartThemeBorderColor, #333);
      }

      .council-character-dialog-header h3 {
        margin: 0;
        font-size: 16px;
      }

      .council-character-dialog-close {
        background: none;
        border: none;
        color: var(--SmartThemeBodyColor, #888);
        cursor: pointer;
        font-size: 18px;
      }

      .council-character-dialog-content {
        flex: 1;
        overflow: auto;
        padding: 16px;
      }

      .council-character-dialog-actions {
        padding: 12px 16px;
        border-top: 1px solid var(--SmartThemeBorderColor, #333);
        display: flex;
        justify-content: flex-end;
        gap: 8px;
      }

      .council-character-prompt-preview {
        white-space: pre-wrap;
        font-family: monospace;
        font-size: 12px;
        background: rgba(0, 0, 0, 0.3);
        padding: 16px;
        border-radius: 6px;
        max-height: 400px;
        overflow: auto;
      }

      /* Prompt Builder Container */
      .council-character-prompt-builder-container {
        background: rgba(0, 0, 0, 0.15);
        border: 1px solid var(--SmartThemeBorderColor, #333);
        border-radius: 8px;
        padding: 16px;
        min-height: 200px;
      }

      .council-character-prompt-builder-container .prompt-builder {
        background: transparent;
      }

      .council-character-prompt-builder-container .prompt-builder-mode-selector {
        margin-bottom: 12px;
      }

      .council-character-prompt-builder-container textarea {
        background: var(--SmartThemeBlurTintColor, #1a1a2e);
        border: 1px solid var(--SmartThemeBorderColor, #444);
        color: var(--SmartThemeBodyColor, #fff);
        border-radius: 6px;
        padding: 12px;
        width: 100%;
        min-height: 150px;
        font-family: monospace;
        font-size: 13px;
        resize: vertical;
      }

      .council-character-prompt-builder-container select {
        background: var(--SmartThemeBlurTintColor, #1a1a2e);
        border: 1px solid var(--SmartThemeBorderColor, #444);
        color: var(--SmartThemeBodyColor, #fff);
        border-radius: 6px;
        padding: 8px 12px;
      }

      /* Mobile Responsive */
      @media (max-width: 768px) {
        .council-character-modal {
          width: 100%;
          height: 100%;
          max-width: none;
          max-height: none;
          border-radius: 0;
        }

        .council-character-list-container {
          grid-template-columns: 1fr;
        }

        .council-character-list {
          max-height: 200px;
        }

        .council-character-toolbar {
          flex-direction: column;
        }

        .council-character-search {
          width: 100%;
        }

        .council-character-form-row {
          grid-template-columns: 1fr;
        }
      }
    `;

    document.head.appendChild(styles);
  },
};

// ===== MODULE EXPORT =====
if (typeof window !== "undefined") {
  window.CharacterModal = CharacterModal;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = CharacterModal;
}
