/**
 * TheCouncil - Token Picker Component
 *
 * A reusable component for browsing and inserting tokens into text fields:
 * - Organized token categories (ST Native, Pipeline, Phase, Action, Store, etc.)
 * - Search/filter functionality
 * - Click-to-insert or drag-and-drop support
 * - Token preview with descriptions
 * - Recent tokens history
 *
 * @version 2.0.0
 */

const TokenPicker = {
  // ===== VERSION =====
  VERSION: "1.1.0",

  // ===== CONSTANTS =====

  /**
   * Token categories
   */
  CATEGORIES: {
    ST_NATIVE: {
      id: "st_native",
      name: "SillyTavern Macros",
      icon: "🎭",
      description: "Built-in SillyTavern macros",
    },
    PIPELINE: {
      id: "pipeline",
      name: "Pipeline Scope",
      icon: "🔄",
      description: "Pipeline-level variables and globals",
    },
    PHASE: {
      id: "phase",
      name: "Phase Scope",
      icon: "📍",
      description: "Current phase variables",
    },
    ACTION: {
      id: "action",
      name: "Action Scope",
      icon: "⚡",
      description: "Current action variables",
    },
    STORE: {
      id: "store",
      name: "Store Access",
      icon: "🗄️",
      description: "Access Curation store data",
    },
    AGENT: {
      id: "agent",
      name: "Agent/Position",
      icon: "🤖",
      description: "Agent and position information",
    },
    TEAM: {
      id: "team",
      name: "Team Scope",
      icon: "👥",
      description: "Team-level variables",
    },
  },

  /**
   * Pre-defined tokens by category
   */
  TOKENS: {
    st_native: [
      {
        token: "{{char}}",
        name: "Character Name",
        description: "The AI character's name",
      },
      {
        token: "{{user}}",
        name: "User Name",
        description: "The user's persona name",
      },
      {
        token: "{{persona}}",
        name: "Persona",
        description: "User's persona description",
      },
      {
        token: "{{description}}",
        name: "Character Description",
        description: "AI character's description",
      },
      {
        token: "{{personality}}",
        name: "Personality",
        description: "AI character's personality",
      },
      {
        token: "{{scenario}}",
        name: "Scenario",
        description: "Current scenario/context",
      },
      {
        token: "{{mesExamples}}",
        name: "Message Examples",
        description: "Example messages",
      },
      {
        token: "{{system}}",
        name: "System Prompt",
        description: "System prompt content",
      },
      {
        token: "{{jailbreak}}",
        name: "Jailbreak",
        description: "Jailbreak prompt",
      },
      {
        token: "{{lastMessage}}",
        name: "Last Message",
        description: "The last message in chat",
      },
      {
        token: "{{lastUserMessage}}",
        name: "Last User Message",
        description: "Last message from user",
      },
      {
        token: "{{lastCharMessage}}",
        name: "Last Char Message",
        description: "Last message from character",
      },
      { token: "{{time}}", name: "Current Time", description: "Current time" },
      { token: "{{date}}", name: "Current Date", description: "Current date" },
      {
        token: "{{idle_duration}}",
        name: "Idle Duration",
        description: "Time since last message",
      },
      {
        token: "{{random:1,100}}",
        name: "Random Number",
        description: "Random number in range",
      },
      {
        token: "{{roll:d20}}",
        name: "Dice Roll",
        description: "Roll dice (e.g., d20, 2d6)",
      },
      {
        token: "{{getvar::varname}}",
        name: "Get Variable",
        description: "Get a chat variable",
      },
      {
        token: "{{setvar::varname::value}}",
        name: "Set Variable",
        description: "Set a chat variable",
      },
    ],
    pipeline: [
      {
        token: "{{pipeline.id}}",
        name: "Pipeline ID",
        description: "Current pipeline identifier",
      },
      {
        token: "{{pipeline.name}}",
        name: "Pipeline Name",
        description: "Current pipeline name",
      },
      {
        token: "{{globals.instructions}}",
        name: "Instructions",
        description: "User instructions global",
      },
      {
        token: "{{globals.outlineDraft}}",
        name: "Outline Draft",
        description: "Current outline draft",
      },
      {
        token: "{{globals.finalOutline}}",
        name: "Final Outline",
        description: "Approved outline",
      },
      {
        token: "{{globals.firstDraft}}",
        name: "First Draft",
        description: "First draft content",
      },
      {
        token: "{{globals.secondDraft}}",
        name: "Second Draft",
        description: "Second draft content",
      },
      {
        token: "{{globals.finalDraft}}",
        name: "Final Draft",
        description: "Final draft content",
      },
      {
        token: "{{globals.commentary}}",
        name: "Commentary",
        description: "Team commentary",
      },
      {
        token: "{{globals.custom}}",
        name: "Custom Global",
        description: "Custom global variable",
      },
      {
        token: "{{constants.maxSMEs}}",
        name: "Max SMEs",
        description: "Maximum SME count",
      },
      {
        token: "{{constants.defaultTimeout}}",
        name: "Default Timeout",
        description: "Default timeout in ms",
      },
    ],
    phase: [
      {
        token: "{{phase.id}}",
        name: "Phase ID",
        description: "Current phase identifier",
      },
      {
        token: "{{phase.name}}",
        name: "Phase Name",
        description: "Current phase name",
      },
      {
        token: "{{phase.index}}",
        name: "Phase Index",
        description: "Current phase number (0-based)",
      },
      {
        token: "{{phase.input}}",
        name: "Phase Input",
        description: "Input to this phase",
      },
      {
        token: "{{phase.output}}",
        name: "Phase Output",
        description: "Output from this phase",
      },
      {
        token: "{{phase.context}}",
        name: "Phase Context",
        description: "Accumulated phase context",
      },
      {
        token: "{{previousPhase.output}}",
        name: "Previous Phase Output",
        description: "Output from previous phase",
      },
    ],
    action: [
      {
        token: "{{action.id}}",
        name: "Action ID",
        description: "Current action identifier",
      },
      {
        token: "{{action.name}}",
        name: "Action Name",
        description: "Current action name",
      },
      {
        token: "{{action.index}}",
        name: "Action Index",
        description: "Current action number in phase",
      },
      {
        token: "{{input}}",
        name: "Action Input",
        description: "Input to this action",
      },
      {
        token: "{{output}}",
        name: "Action Output",
        description: "Output from this action",
      },
      {
        token: "{{context}}",
        name: "Action Context",
        description: "Combined context for this action",
      },
      {
        token: "{{previousAction.output}}",
        name: "Previous Action Output",
        description: "Output from previous action",
      },
      {
        token: "{{rag.results}}",
        name: "RAG Results",
        description: "Retrieved RAG context",
      },
    ],
    store: [
      {
        token: "{{store.characterSheets}}",
        name: "Character Sheets",
        description: "All character sheet entries",
      },
      {
        token: "{{store.characterSheets[id]}}",
        name: "Character by ID",
        description: "Specific character sheet",
      },
      {
        token: "{{store.plotPoints}}",
        name: "Plot Points",
        description: "All plot point entries",
      },
      {
        token: "{{store.worldState}}",
        name: "World State",
        description: "Current world state (singleton)",
      },
      {
        token: "{{store.scenes}}",
        name: "Scenes",
        description: "All scene entries",
      },
      {
        token: "{{store.locations}}",
        name: "Locations",
        description: "All location entries",
      },
      {
        token: "{{store.customStore}}",
        name: "Custom Store",
        description: "Access custom store by name",
      },
    ],
    agent: [
      {
        token: "{{agent.id}}",
        name: "Agent ID",
        description: "Current agent identifier",
      },
      {
        token: "{{agent.name}}",
        name: "Agent Name",
        description: "Current agent name",
      },
      {
        token: "{{agent.systemPrompt}}",
        name: "Agent System Prompt",
        description: "Agent's system prompt",
      },
      {
        token: "{{position.id}}",
        name: "Position ID",
        description: "Current position identifier",
      },
      {
        token: "{{position.name}}",
        name: "Position Name",
        description: "Current position name",
      },
      {
        token: "{{position.tier}}",
        name: "Position Tier",
        description: "Position tier (executive/leader/member)",
      },
      {
        token: "{{position.roleDescription}}",
        name: "Role Description",
        description: "Position's role description",
      },
    ],
    team: [
      {
        token: "{{team.id}}",
        name: "Team ID",
        description: "Current team identifier",
      },
      {
        token: "{{team.name}}",
        name: "Team Name",
        description: "Current team name",
      },
      {
        token: "{{team.leader}}",
        name: "Team Leader",
        description: "Team leader information",
      },
      {
        token: "{{team.members}}",
        name: "Team Members",
        description: "List of team members",
      },
      {
        token: "{{team.output}}",
        name: "Team Output",
        description: "Team's consolidated output",
      },
      {
        token: "{{team.context}}",
        name: "Team Context",
        description: "Team-specific context",
      },
    ],
  },

  // ===== STATE =====

  /**
   * Active instances
   * @type {Map<string, Object>}
   */
  _instances: new Map(),

  /**
   * Instance ID counter
   * @type {number}
   */
  _instanceCounter: 0,

  /**
   * Logger reference
   */
  _logger: null,

  /**
   * Recent tokens (persisted in localStorage)
   * @type {string[]}
   */
  _recentTokens: [],

  /**
   * Max recent tokens to store
   */
  MAX_RECENT: 10,

  /**
   * Current context for suggestions
   * @type {Object}
   */
  _currentContext: {
    type: null, // 'phase', 'action', 'prompt', 'curation', 'character'
    phaseId: null,
    actionId: null,
    actionType: null,
  },

  /**
   * Context-aware token suggestions
   */
  CONTEXT_SUGGESTIONS: {
    phase: [
      "{{phase.name}}",
      "{{phase.output}}",
      "{{phase.variables}}",
      "{{globals}}",
      "{{input}}",
    ],
    action: [
      "{{action.input}}",
      "{{action.output}}",
      "{{input}}",
      "{{context}}",
      "{{char}}",
      "{{user}}",
    ],
    prompt: [
      "{{char}}",
      "{{user}}",
      "{{input}}",
      "{{context}}",
      "{{scenario}}",
      "{{persona}}",
    ],
    curation: [
      "{{store.data}}",
      "{{store.query}}",
      "{{store.results}}",
      "{{rag.context}}",
    ],
    character: [
      "{{character.name}}",
      "{{character.personality}}",
      "{{character.voice}}",
      "{{character.background}}",
    ],
    standard: [
      "{{input}}",
      "{{context}}",
      "{{char}}",
      "{{user}}",
      "{{scenario}}",
    ],
  },

  // ===== INITIALIZATION =====

  /**
   * Initialize the TokenPicker
   * @param {Object} options - Configuration options
   * @param {Object} options.logger - Logger instance
   */
  init(options = {}) {
    this._logger = options.logger || null;
    this._loadRecentTokens();
    this._injectStyles();
    this._log("info", "TokenPicker initialized");
  },

  /**
   * Set current context for suggestions
   * @param {Object} context - Context object
   * @param {string} context.type - Context type (phase, action, prompt, curation, character)
   * @param {string} context.phaseId - Current phase ID
   * @param {string} context.actionId - Current action ID
   * @param {string} context.actionType - Current action type
   */
  setContext(context = {}) {
    this._currentContext = {
      type: context.type || null,
      phaseId: context.phaseId || null,
      actionId: context.actionId || null,
      actionType: context.actionType || null,
    };
    this._log("debug", "TokenPicker context set:", this._currentContext);
  },

  /**
   * Get suggested tokens based on current context
   * @returns {Array} Array of suggested token objects
   */
  getSuggestedTokens() {
    const contextType = this._currentContext.type || "standard";
    const suggestions =
      this.CONTEXT_SUGGESTIONS[contextType] ||
      this.CONTEXT_SUGGESTIONS.standard;

    // Combine with recent tokens, removing duplicates
    const recentSet = new Set(this._recentTokens.slice(0, 5));
    const combined = [...suggestions];

    for (const recent of recentSet) {
      if (!combined.includes(recent)) {
        combined.push(recent);
      }
    }

    // Convert to token objects
    return combined.slice(0, 10).map((token) => {
      const tokenInfo = this._findTokenInfo(token);
      return {
        token,
        name: tokenInfo?.name || token.replace(/\{\{|\}\}/g, ""),
        description: tokenInfo?.description || "Recently used or suggested",
        isSuggested: suggestions.includes(token),
        isRecent: recentSet.has(token),
      };
    });
  },

  /**
   * Find token info from TOKENS registry
   * @param {string} token - Token string
   * @returns {Object|null} Token info or null
   */
  _findTokenInfo(token) {
    for (const category of Object.keys(this.TOKENS)) {
      const found = this.TOKENS[category].find((t) => t.token === token);
      if (found) return found;
    }
    return null;
  },

  /**
   * Load recent tokens from localStorage
   */
  _loadRecentTokens() {
    try {
      const stored = localStorage.getItem("council_recent_tokens");
      if (stored) {
        this._recentTokens = JSON.parse(stored);
      }
    } catch (e) {
      this._recentTokens = [];
    }
  },

  /**
   * Save recent tokens to localStorage
   */
  _saveRecentTokens() {
    try {
      localStorage.setItem(
        "council_recent_tokens",
        JSON.stringify(this._recentTokens),
      );
    } catch (e) {
      this._log("warn", "Failed to save recent tokens:", e);
    }
  },

  /**
   * Add token to recent list
   * @param {string} token - Token string
   */
  _addToRecent(token) {
    // Remove if already exists
    this._recentTokens = this._recentTokens.filter((t) => t !== token);
    // Add to front
    this._recentTokens.unshift(token);
    // Trim to max
    if (this._recentTokens.length > this.MAX_RECENT) {
      this._recentTokens = this._recentTokens.slice(0, this.MAX_RECENT);
    }
    this._saveRecentTokens();
  },

  // ===== INSTANCE MANAGEMENT =====

  /**
   * Create a new TokenPicker instance
   * @param {Object} config - Instance configuration
   * @param {HTMLElement} config.targetInput - Input/textarea to insert tokens into
   * @param {Function} config.onInsert - Callback when token is inserted
   * @param {Function} config.onSelect - Callback when token is selected (before insert)
   * @param {string[]} config.categories - Categories to show (default: all)
   * @param {Object[]} config.customTokens - Additional custom tokens
   * @param {boolean} config.showRecent - Show recent tokens section (default: true)
   * @param {boolean} config.showSearch - Show search box (default: true)
   * @param {string} config.mode - 'popup' | 'inline' | 'dropdown' (default: 'popup')
   * @returns {Object} Instance object
   */
  createInstance(config = {}) {
    const id = `token-picker-${++this._instanceCounter}`;

    const instance = {
      id,
      _config: {
        targetInput: config.targetInput || null,
        onInsert: config.onInsert || null,
        onSelect: config.onSelect || null,
        categories: config.categories || Object.keys(this.CATEGORIES),
        customTokens: config.customTokens || [],
        showRecent: config.showRecent !== false,
        showSearch: config.showSearch !== false,
        mode: config.mode || "popup",
      },
      _container: null,
      _searchQuery: "",
      _selectedCategory: null,
      _isOpen: false,

      // Public methods bound to this instance
      render: (container) => this._renderInstance(instance, container),
      open: () => this._openPicker(instance),
      close: () => this._closePicker(instance),
      toggle: () => this._togglePicker(instance),
      destroy: () => this._destroyInstance(instance),
      insertToken: (token) => this._insertToken(instance, token),
    };

    this._instances.set(id, instance);
    return instance;
  },

  /**
   * Destroy an instance
   * @param {Object} instance - Instance to destroy
   */
  _destroyInstance(instance) {
    if (instance._container) {
      instance._container.remove();
    }
    this._instances.delete(instance.id);
  },

  // ===== RENDERING =====

  /**
   * Render instance to container
   * @param {Object} instance - Instance state
   * @param {HTMLElement} container - Container element
   */
  _renderInstance(instance, container) {
    instance._container = container;
    this._renderPicker(instance);
  },

  /**
   * Render the picker UI
   * @param {Object} instance - Instance state
   */
  _renderPicker(instance) {
    if (!instance._container) return;

    const config = instance._config;
    const mode = config.mode;

    let html = `
      <div class="token-picker token-picker-${mode}" data-instance="${instance.id}">
    `;

    // Search box
    if (config.showSearch) {
      html += `
        <div class="token-picker-search">
          <input type="text"
                 class="token-picker-search-input"
                 placeholder="Search tokens..."
                 value="${this._escapeHtml(instance._searchQuery)}">
          ${instance._searchQuery ? '<button class="token-picker-search-clear">✕</button>' : ""}
        </div>
      `;
    }

    // Suggested tokens (context-aware)
    if (!instance._searchQuery) {
      const suggestedTokens = this.getSuggestedTokens();
      if (suggestedTokens.length > 0) {
        const contextType = this._currentContext.type || "standard";
        html += `
          <div class="council-token-suggested">
            <div class="council-token-suggested-header">
              <span class="council-token-suggested-icon">💡</span>
              <span class="council-token-suggested-title">Suggested</span>
              <span class="council-token-context-badge">${this._escapeHtml(contextType)}</span>
            </div>
            <div class="council-token-suggested-list">
              ${suggestedTokens
                .map(
                  (t) => `
                <button class="council-token-suggested-item ${t.isRecent ? "recent" : ""}"
                        data-token="${this._escapeHtml(t.token)}"
                        title="${this._escapeHtml(t.description)}">
                  <span class="council-token-text">${this._escapeHtml(this._truncateToken(t.token))}</span>
                  ${t.isRecent ? '<span class="council-token-recent-badge">🕐</span>' : ""}
                </button>
              `,
                )
                .join("")}
            </div>
          </div>
        `;
      }
    }

    // Recent tokens
    if (
      config.showRecent &&
      this._recentTokens.length > 0 &&
      !instance._searchQuery
    ) {
      html += `
        <div class="token-picker-section token-picker-recent">
          <div class="token-picker-section-header">
            <span class="token-picker-section-icon">🕐</span>
            <span class="token-picker-section-title">Recent</span>
          </div>
          <div class="token-picker-tokens token-picker-tokens-horizontal">
            ${this._recentTokens
              .map(
                (token) => `
              <button class="token-picker-token token-picker-token-recent"
                      data-token="${this._escapeHtml(token)}"
                      title="${this._escapeHtml(token)}">
                ${this._escapeHtml(this._truncateToken(token))}
              </button>
            `,
              )
              .join("")}
          </div>
        </div>
      `;
    }

    // Categories and tokens
    const filteredCategories = this._getFilteredCategories(instance);

    html += `<div class="token-picker-categories">`;

    for (const catId of filteredCategories) {
      const category = this.CATEGORIES[catId.toUpperCase()] || {
        id: catId,
        name: catId,
        icon: "📝",
      };
      const tokens = this._getFilteredTokens(instance, catId);

      if (tokens.length === 0) continue;

      const isExpanded =
        instance._selectedCategory === catId || instance._searchQuery;

      html += `
        <div class="token-picker-category ${isExpanded ? "expanded" : ""}" data-category="${catId}">
          <div class="token-picker-category-header">
            <span class="token-picker-category-icon">${category.icon}</span>
            <span class="token-picker-category-name">${this._escapeHtml(category.name)}</span>
            <span class="token-picker-category-count">${tokens.length}</span>
            <span class="token-picker-category-toggle">${isExpanded ? "▼" : "▶"}</span>
          </div>
          <div class="token-picker-category-content" style="display: ${isExpanded ? "block" : "none"};">
            <div class="token-picker-tokens">
              ${tokens
                .map(
                  (t) => `
                <div class="token-picker-token-item" data-token="${this._escapeHtml(t.token)}">
                  <code class="token-picker-token-code">${this._escapeHtml(t.token)}</code>
                  <div class="token-picker-token-info">
                    <span class="token-picker-token-name">${this._escapeHtml(t.name)}</span>
                    <span class="token-picker-token-desc">${this._escapeHtml(t.description)}</span>
                  </div>
                  <button class="token-picker-token-insert" data-token="${this._escapeHtml(t.token)}">
                    Insert
                  </button>
                </div>
              `,
                )
                .join("")}
            </div>
          </div>
        </div>
      `;
    }

    // Custom tokens
    if (config.customTokens.length > 0) {
      const customTokens = this._filterTokens(
        config.customTokens,
        instance._searchQuery,
      );
      if (customTokens.length > 0) {
        html += `
          <div class="token-picker-category expanded" data-category="custom">
            <div class="token-picker-category-header">
              <span class="token-picker-category-icon">⚙️</span>
              <span class="token-picker-category-name">Custom Tokens</span>
              <span class="token-picker-category-count">${customTokens.length}</span>
            </div>
            <div class="token-picker-category-content">
              <div class="token-picker-tokens">
                ${customTokens
                  .map(
                    (t) => `
                  <div class="token-picker-token-item" data-token="${this._escapeHtml(t.token)}">
                    <code class="token-picker-token-code">${this._escapeHtml(t.token)}</code>
                    <div class="token-picker-token-info">
                      <span class="token-picker-token-name">${this._escapeHtml(t.name || t.token)}</span>
                      <span class="token-picker-token-desc">${this._escapeHtml(t.description || "")}</span>
                    </div>
                    <button class="token-picker-token-insert" data-token="${this._escapeHtml(t.token)}">
                      Insert
                    </button>
                  </div>
                `,
                  )
                  .join("")}
              </div>
            </div>
          </div>
        `;
      }
    }

    html += `</div></div>`;

    instance._container.innerHTML = html;
    this._bindInstanceEvents(instance);
  },

  /**
   * Get filtered categories based on config and search
   * @param {Object} instance - Instance state
   * @returns {string[]} Category IDs
   */
  _getFilteredCategories(instance) {
    return instance._config.categories.filter((catId) => {
      const tokens = this._getFilteredTokens(instance, catId);
      return tokens.length > 0;
    });
  },

  /**
   * Get filtered tokens for a category
   * @param {Object} instance - Instance state
   * @param {string} categoryId - Category ID
   * @returns {Object[]} Filtered tokens
   */
  _getFilteredTokens(instance, categoryId) {
    const tokens = this.TOKENS[categoryId] || [];
    return this._filterTokens(tokens, instance._searchQuery);
  },

  /**
   * Filter tokens by search query
   * @param {Object[]} tokens - Token list
   * @param {string} query - Search query
   * @returns {Object[]} Filtered tokens
   */
  _filterTokens(tokens, query) {
    if (!query) return tokens;

    const lowerQuery = query.toLowerCase();
    return tokens.filter((t) => {
      return (
        t.token.toLowerCase().includes(lowerQuery) ||
        t.name.toLowerCase().includes(lowerQuery) ||
        (t.description && t.description.toLowerCase().includes(lowerQuery))
      );
    });
  },

  /**
   * Bind events to instance
   * @param {Object} instance - Instance state
   */
  _bindInstanceEvents(instance) {
    const container = instance._container;
    if (!container) return;

    // Search input
    const searchInput = container.querySelector(".token-picker-search-input");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        instance._searchQuery = e.target.value;
        this._renderPicker(instance);
        // Re-focus search input after render
        const newInput = instance._container.querySelector(
          ".token-picker-search-input",
        );
        if (newInput) {
          newInput.focus();
          newInput.setSelectionRange(
            newInput.value.length,
            newInput.value.length,
          );
        }
      });
    }

    // Search clear
    const searchClear = container.querySelector(".token-picker-search-clear");
    if (searchClear) {
      searchClear.addEventListener("click", () => {
        instance._searchQuery = "";
        this._renderPicker(instance);
      });
    }

    // Category headers (toggle expand)
    container
      .querySelectorAll(".token-picker-category-header")
      .forEach((header) => {
        header.addEventListener("click", () => {
          const category = header.closest(".token-picker-category");
          const catId = category.dataset.category;

          if (instance._selectedCategory === catId) {
            instance._selectedCategory = null;
          } else {
            instance._selectedCategory = catId;
          }
          this._renderPicker(instance);
        });
      });

    // Token insert buttons
    container.querySelectorAll(".token-picker-token-insert").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const token = btn.dataset.token;
        this._insertToken(instance, token);
      });
    });

    // Token items (click to insert)
    container.querySelectorAll(".token-picker-token-item").forEach((item) => {
      item.addEventListener("dblclick", () => {
        const token = item.dataset.token;
        this._insertToken(instance, token);
      });
    });

    // Recent token buttons
    container.querySelectorAll(".token-picker-token-recent").forEach((btn) => {
      btn.addEventListener("click", () => {
        const token = btn.dataset.token;
        this._insertToken(instance, token);
      });
    });
  },

  // ===== TOKEN INSERTION =====

  /**
   * Insert a token
   * @param {Object} instance - Instance state
   * @param {string} token - Token to insert
   */
  _insertToken(instance, token) {
    const config = instance._config;

    // Call onSelect callback first
    if (config.onSelect) {
      const proceed = config.onSelect(token);
      if (proceed === false) return;
    }

    // Insert into target input if specified
    if (config.targetInput) {
      this._insertIntoInput(config.targetInput, token);
    }

    // Call onInsert callback
    if (config.onInsert) {
      config.onInsert(token);
    }

    // Add to recent
    this._addToRecent(token);

    // Close popup mode
    if (config.mode === "popup") {
      this._closePicker(instance);
    }

    this._log("debug", `Inserted token: ${token}`);
  },

  /**
   * Insert text into an input/textarea at cursor position
   * @param {HTMLElement} input - Input element
   * @param {string} text - Text to insert
   */
  _insertIntoInput(input, text) {
    if (!input) return;

    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;
    const value = input.value || "";

    // Insert at cursor position
    input.value = value.substring(0, start) + text + value.substring(end);

    // Move cursor to end of inserted text
    const newPos = start + text.length;
    input.setSelectionRange(newPos, newPos);

    // Trigger input event for reactive frameworks
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.focus();
  },

  // ===== POPUP MODE =====

  /**
   * Open picker (popup mode)
   * @param {Object} instance - Instance state
   */
  _openPicker(instance) {
    if (instance._config.mode !== "popup") return;
    instance._isOpen = true;

    // Create popup container if not exists
    if (!instance._container) {
      const popup = document.createElement("div");
      popup.className = "token-picker-popup-overlay";
      popup.innerHTML = `
        <div class="token-picker-popup">
          <div class="token-picker-popup-header">
            <h4>Insert Token</h4>
            <button class="token-picker-popup-close">✕</button>
          </div>
          <div class="token-picker-popup-body"></div>
        </div>
      `;
      document.body.appendChild(popup);

      // Close on overlay click
      popup.addEventListener("click", (e) => {
        if (e.target === popup) {
          this._closePicker(instance);
        }
      });

      // Close button
      popup
        .querySelector(".token-picker-popup-close")
        .addEventListener("click", () => {
          this._closePicker(instance);
        });

      instance._container = popup.querySelector(".token-picker-popup-body");
      instance._popupOverlay = popup;
    }

    instance._popupOverlay.classList.add("visible");
    this._renderPicker(instance);

    // Focus search input
    setTimeout(() => {
      const searchInput = instance._container.querySelector(
        ".token-picker-search-input",
      );
      if (searchInput) searchInput.focus();
    }, 50);
  },

  /**
   * Close picker (popup mode)
   * @param {Object} instance - Instance state
   */
  _closePicker(instance) {
    if (instance._popupOverlay) {
      instance._popupOverlay.classList.remove("visible");
    }
    instance._isOpen = false;
  },

  /**
   * Toggle picker (popup mode)
   * @param {Object} instance - Instance state
   */
  _togglePicker(instance) {
    if (instance._isOpen) {
      this._closePicker(instance);
    } else {
      this._openPicker(instance);
    }
  },

  // ===== HELPER METHODS =====

  /**
   * Truncate token for display
   * @param {string} token - Token string
   * @param {number} maxLength - Max length
   * @returns {string} Truncated token
   */
  _truncateToken(token, maxLength = 20) {
    if (token.length <= maxLength) return token;
    return token.substring(0, maxLength - 2) + "..";
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
   * Log message
   * @param {string} level - Log level
   * @param {string} message - Message
   * @param {...any} args - Additional arguments
   */
  _log(level, message, ...args) {
    if (this._logger && typeof this._logger[level] === "function") {
      this._logger[level](`[TokenPicker] ${message}`, ...args);
    }
  },

  // ===== STYLES =====

  /**
   * Inject component styles
   */
  _injectStyles() {
    if (document.getElementById("council-token-picker-styles")) return;

    const style = document.createElement("style");
    // Add suggested tokens styles at the beginning
    const suggestedStyles = `
      .council-token-suggested {
        padding: 8px 12px;
        border-bottom: 1px solid var(--SmartThemeBorderColor, #444);
        background: linear-gradient(180deg, rgba(59, 130, 246, 0.1), transparent);
      }

      .council-token-suggested-header {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-bottom: 8px;
        font-size: 0.8rem;
        color: var(--SmartThemeBodyColor, #ccc);
      }

      .council-token-suggested-icon {
        font-size: 0.9rem;
      }

      .council-token-suggested-title {
        font-weight: 600;
      }

      .council-token-context-badge {
        font-size: 0.65rem;
        padding: 2px 6px;
        border-radius: 8px;
        background: var(--SmartThemeQuoteColor, #666);
        color: white;
        text-transform: uppercase;
        margin-left: auto;
      }

      .council-token-suggested-list {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }

      .council-token-suggested-item {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 4px 8px;
        font-size: 0.75rem;
        border: 1px solid var(--SmartThemeBorderColor, #444);
        border-radius: 4px;
        background: var(--SmartThemeBlurTintColor, #2a2a3a);
        color: var(--SmartThemeBodyColor, #ddd);
        cursor: pointer;
        transition: all 0.15s ease;
      }

      .council-token-suggested-item:hover {
        background: var(--SmartThemeQuoteColor, #3a3a4a);
        border-color: var(--SmartThemeBorderColor, #555);
      }

      .council-token-suggested-item.recent {
        border-color: rgba(234, 179, 8, 0.3);
      }

      .council-token-recent-badge {
        font-size: 0.6rem;
        opacity: 0.7;
      }

      .council-token-text {
        font-family: monospace;
      }
    `;
    style.id = "council-token-picker-styles";
    style.textContent = `
      /* Token Picker Container */
      .token-picker {
        font-family: var(--council-font-family, sans-serif);
        font-size: 0.875rem;
        color: var(--council-text, #eee);
      }

      /* Search */
      .token-picker-search {
        display: flex;
        gap: 8px;
        margin-bottom: 12px;
      }

      .token-picker-search-input {
        flex: 1;
        padding: 8px 12px;
        background: var(--council-bg-secondary, rgba(255, 255, 255, 0.05));
        border: 1px solid var(--council-border, #444);
        border-radius: var(--council-radius-md, 6px);
        color: var(--council-text, #eee);
        font-size: 0.875rem;
      }

      .token-picker-search-input:focus {
        outline: none;
        border-color: var(--council-primary, #667eea);
      }

      .token-picker-search-clear {
        padding: 8px 12px;
        background: transparent;
        border: 1px solid var(--council-border, #444);
        border-radius: var(--council-radius-md, 6px);
        color: var(--council-text-muted, rgba(255, 255, 255, 0.6));
        cursor: pointer;
      }

      .token-picker-search-clear:hover {
        color: var(--council-text, #eee);
      }

      /* Recent Section */
      .token-picker-recent {
        margin-bottom: 16px;
        padding-bottom: 12px;
        border-bottom: 1px solid var(--council-border, #444);
      }

      .token-picker-section-header {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-bottom: 8px;
        font-size: 0.8rem;
        color: var(--council-text-muted, rgba(255, 255, 255, 0.6));
      }

      .token-picker-tokens-horizontal {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }

      .token-picker-token-recent {
        padding: 4px 10px;
        background: var(--council-bg-secondary, rgba(255, 255, 255, 0.05));
        border: 1px solid var(--council-border, #444);
        border-radius: var(--council-radius-sm, 4px);
        color: var(--council-primary, #667eea);
        font-family: var(--council-font-mono, monospace);
        font-size: 0.75rem;
        cursor: pointer;
        transition: all 0.15s ease;
      }

      .token-picker-token-recent:hover {
        background: var(--council-primary, #667eea);
        color: white;
        border-color: var(--council-primary, #667eea);
      }

      /* Categories */
      .token-picker-categories {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .token-picker-category {
        background: var(--council-bg-secondary, rgba(255, 255, 255, 0.05));
        border: 1px solid var(--council-border, #444);
        border-radius: var(--council-radius-md, 6px);
        overflow: hidden;
      }

      .token-picker-category-header {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 12px;
        cursor: pointer;
        transition: background 0.15s ease;
      }

      .token-picker-category-header:hover {
        background: var(--council-bg-hover, rgba(255, 255, 255, 0.1));
      }

      .token-picker-category-name {
        flex: 1;
        font-weight: 500;
      }

      .token-picker-category-count {
        font-size: 0.75rem;
        color: var(--council-text-muted, rgba(255, 255, 255, 0.6));
        background: var(--council-bg-hover, rgba(255, 255, 255, 0.1));
        padding: 2px 8px;
        border-radius: 10px;
      }

      .token-picker-category-toggle {
        font-size: 0.7rem;
        color: var(--council-text-muted, rgba(255, 255, 255, 0.6));
      }

      .token-picker-category-content {
        border-top: 1px solid var(--council-border, #444);
      }

      /* Token Items */
      .token-picker-tokens {
        padding: 8px;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .token-picker-token-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 8px 10px;
        border-radius: var(--council-radius-sm, 4px);
        cursor: pointer;
        transition: background 0.15s ease;
      }

      .token-picker-token-item:hover {
        background: var(--council-bg-hover, rgba(255, 255, 255, 0.1));
      }

      .token-picker-token-code {
        font-family: var(--council-font-mono, monospace);
        font-size: 0.8rem;
        color: var(--council-primary, #667eea);
        background: var(--council-bg-primary, #1a1a2e);
        padding: 2px 6px;
        border-radius: 3px;
        white-space: nowrap;
      }

      .token-picker-token-info {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-width: 0;
      }

      .token-picker-token-name {
        font-size: 0.85rem;
        color: var(--council-text, #eee);
      }

      .token-picker-token-desc {
        font-size: 0.75rem;
        color: var(--council-text-muted, rgba(255, 255, 255, 0.6));
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .token-picker-token-insert {
        padding: 4px 12px;
        background: var(--council-primary, #667eea);
        border: none;
        border-radius: var(--council-radius-sm, 4px);
        color: white;
        font-size: 0.75rem;
        cursor: pointer;
        opacity: 0;
        transition: opacity 0.15s ease;
      }

      .token-picker-token-item:hover .token-picker-token-insert {
        opacity: 1;
      }

      .token-picker-token-insert:hover {
        background: var(--council-primary-dark, #5a6fd6);
      }

      /* Popup Mode */
      .token-picker-popup-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        visibility: hidden;
        transition: all 0.2s ease;
      }

      .token-picker-popup-overlay.visible {
        opacity: 1;
        visibility: visible;
      }

      .token-picker-popup {
        width: 90%;
        max-width: 600px;
        max-height: 80vh;
        background: var(--council-bg-primary, #1a1a2e);
        border: 1px solid var(--council-border, #444);
        border-radius: var(--council-radius-lg, 8px);
        box-shadow: var(--council-shadow-lg, 0 16px 64px rgba(0, 0, 0, 0.5));
        display: flex;
        flex-direction: column;
      }

      .token-picker-popup-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        border-bottom: 1px solid var(--council-border, #444);
      }

      .token-picker-popup-header h4 {
        margin: 0;
        font-size: 1rem;
        color: var(--council-text, #eee);
      }

      .token-picker-popup-close {
        background: transparent;
        border: none;
        font-size: 1.25rem;
        color: var(--council-text-muted, rgba(255, 255, 255, 0.6));
        cursor: pointer;
      }

      .token-picker-popup-close:hover {
        color: var(--council-text, #eee);
      }

      .token-picker-popup-body {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
      }

      /* Inline Mode */
      .token-picker-inline {
        max-height: 300px;
        overflow-y: auto;
        border: 1px solid var(--council-border, #444);
        border-radius: var(--council-radius-md, 6px);
        padding: 12px;
      }

      /* Dropdown Mode */
      .token-picker-dropdown {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        max-height: 300px;
        overflow-y: auto;
        background: var(--council-bg-primary, #1a1a2e);
        border: 1px solid var(--council-border, #444);
        border-radius: var(--council-radius-md, 6px);
        box-shadow: var(--council-shadow, 0 8px 32px rgba(0, 0, 0, 0.6));
        z-index: 100;
        padding: 12px;
      }
    `;

    document.head.appendChild(style);
  },
};

// Export for different environments
if (typeof window !== "undefined") {
  window.TokenPicker = TokenPicker;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = TokenPicker;
}
