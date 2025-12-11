/**
 * TheCouncil - Participant Selector Component
 *
 * A reusable component for configuring action participants with:
 * - Multiple selection modes (single, multiple, team, dynamic)
 * - Position and team selection
 * - SME (Subject Matter Expert) dynamic selection
 * - Orchestration mode configuration
 * - Participant preview
 *
 * @version 2.0.0
 */

const ParticipantSelector = {
  // ===== VERSION =====
  VERSION: "2.0.0",

  // ===== CONSTANTS =====

  /**
   * Participant selection modes
   */
  Mode: {
    SINGLE: "single",
    MULTIPLE: "multiple",
    TEAM: "team",
    DYNAMIC: "dynamic",
  },

  /**
   * Orchestration modes for multiple participants
   */
  Orchestration: {
    SEQUENTIAL: "sequential",
    PARALLEL: "parallel",
    ROUND_ROBIN: "round_robin",
    CONSENSUS: "consensus",
  },

  /**
   * Mode descriptions
   */
  MODE_INFO: {
    single: {
      label: "Single Position",
      icon: "👤",
      description: "One specific position handles this action",
    },
    multiple: {
      label: "Multiple Positions",
      icon: "👥",
      description: "Select specific positions to participate",
    },
    team: {
      label: "Entire Team(s)",
      icon: "🏢",
      description: "All members of selected teams participate",
    },
    dynamic: {
      label: "Dynamic (SME)",
      icon: "🎯",
      description: "Dynamically select based on expertise",
    },
  },

  /**
   * Orchestration descriptions
   */
  ORCHESTRATION_INFO: {
    sequential: {
      label: "Sequential",
      icon: "➡️",
      description: "Participants respond one after another",
    },
    parallel: {
      label: "Parallel",
      icon: "⚡",
      description: "All participants respond simultaneously",
    },
    round_robin: {
      label: "Round Robin",
      icon: "🔄",
      description: "Take turns until consensus or max rounds",
    },
    consensus: {
      label: "Consensus",
      icon: "🤝",
      description: "Iterate until agreement threshold reached",
    },
  },

  // ===== STATE =====

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
   * Initialize the Participant Selector
   * @param {Object} options - Configuration options
   * @param {Object} options.pipelineBuilderSystem - Reference to PipelineBuilderSystem
   * @param {Object} options.logger - Logger instance
   * @returns {ParticipantSelector}
   */
  init(options = {}) {
    this._pipelineBuilderSystem = options.pipelineBuilderSystem || window.PipelineBuilderSystem;
    this._logger = options.logger || window.Logger;

    this._initialized = true;
    this._log("info", "ParticipantSelector initialized");

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
        mode: options.initialMode || "single",
        selectedPosition: options.initialPosition || null,
        selectedPositions: options.initialPositions || [],
        selectedTeams: options.initialTeams || [],
        teamOptions: {
          includeLeaders: true,
          includeMembers: true,
        },
        dynamicConfig: {
          keywordSource: "input", // 'input' or 'context'
          maxSMEs: 3,
          fallbackPosition: null,
        },
        orchestration: options.initialOrchestration || "sequential",
        orchestrationConfig: {
          maxRounds: 3,
          consensusThreshold: 80,
        },
      },
      _container: null,
      _onChangeCallback: options.onChange || null,
    };

    const boundInstance = {
      render: (container) => this._renderInstance(instance, container),
      getValue: () => this._getInstanceValue(instance),
      setValue: (config) => this._setInstanceValue(instance, config),
      destroy: () => this._destroyInstance(instance),
      refresh: () => this._refreshInstance(instance),
      getResolvedParticipants: () => this._getResolvedParticipants(instance),
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
    const prefix = "[ParticipantSelector]";
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
   * Get all positions from PipelineBuilderSystem
   * @returns {Array}
   */
  _getPositions() {
    if (!this._pipelineBuilderSystem) return [];
    try {
      // Use getAllPositions() directly
      if (typeof this._pipelineBuilderSystem.getAllPositions === "function") {
        return this._pipelineBuilderSystem.getAllPositions() || [];
      }
      return [];
    } catch (e) {
      this._log("error", "Failed to get positions:", e);
      return [];
    }
  },

  /**
   * Get all teams from PipelineBuilderSystem
   * @returns {Array}
   */
  _getTeams() {
    if (!this._pipelineBuilderSystem) return [];
    try {
      // Use getAllTeams() directly
      if (typeof this._pipelineBuilderSystem.getAllTeams === "function") {
        return this._pipelineBuilderSystem.getAllTeams() || [];
      }
      return [];
    } catch (e) {
      this._log("error", "Failed to get teams:", e);
      return [];
    }
  },

  /**
   * Get position by ID
   * @param {string} id - Position ID
   * @returns {Object|null}
   */
  _getPosition(id) {
    if (!this._pipelineBuilderSystem) return null;
    return this._pipelineBuilderSystem.getPosition?.(id) || null;
  },

  /**
   * Get team by ID
   * @param {string} id - Team ID
   * @returns {Object|null}
   */
  _getTeam(id) {
    if (!this._pipelineBuilderSystem) return null;
    return this._pipelineBuilderSystem.getTeam?.(id) || null;
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
    container.className = "participant-selector";

    const uniqueId = Date.now();

    const html = `
      <div class="participant-selector-modes">
        ${Object.entries(this.MODE_INFO)
          .map(
            ([mode, info]) => `
          <label class="participant-selector-mode">
            <input type="radio" name="participant-mode-${uniqueId}" value="${mode}"
                   ${instance._config.mode === mode ? "checked" : ""}>
            <span class="participant-selector-mode-card">
              <span class="participant-selector-mode-icon">${info.icon}</span>
              <span class="participant-selector-mode-label">${info.label}</span>
              <span class="participant-selector-mode-desc">${info.description}</span>
            </span>
          </label>
        `,
          )
          .join("")}
      </div>

      <div class="participant-selector-content">
        <!-- Mode-specific content rendered here -->
      </div>

      <div class="participant-selector-orchestration">
        <h4 class="participant-selector-section-title">Orchestration</h4>
        <div class="participant-selector-orchestration-modes">
          ${Object.entries(this.ORCHESTRATION_INFO)
            .map(
              ([mode, info]) => `
            <label class="participant-selector-orch-mode">
              <input type="radio" name="orchestration-${uniqueId}" value="${mode}"
                     ${instance._config.orchestration === mode ? "checked" : ""}>
              <span class="participant-selector-orch-card">
                <span class="participant-selector-orch-icon">${info.icon}</span>
                <span class="participant-selector-orch-label">${info.label}</span>
              </span>
            </label>
          `,
            )
            .join("")}
        </div>
        <div class="participant-selector-orch-config">
          <!-- Orchestration config rendered here -->
        </div>
      </div>

      <div class="participant-selector-preview">
        <h4 class="participant-selector-section-title">
          👁️ Participant Preview
          <span class="participant-selector-preview-count"></span>
        </h4>
        <div class="participant-selector-preview-list">
          <!-- Preview rendered here -->
        </div>
      </div>
    `;

    container.innerHTML = html;

    // Bind mode change events
    const modeInputs = container.querySelectorAll(
      'input[name^="participant-mode"]',
    );
    modeInputs.forEach((input) => {
      input.addEventListener("change", (e) => {
        if (e.target.checked) {
          instance._config.mode = e.target.value;
          this._renderModeContent(instance);
          this._updatePreview(instance);
          this._notifyChange(instance);
        }
      });
    });

    // Bind orchestration change events
    const orchInputs = container.querySelectorAll(
      'input[name^="orchestration"]',
    );
    orchInputs.forEach((input) => {
      input.addEventListener("change", (e) => {
        if (e.target.checked) {
          instance._config.orchestration = e.target.value;
          this._renderOrchestrationConfig(instance);
          this._notifyChange(instance);
        }
      });
    });

    // Render mode-specific content
    this._renderModeContent(instance);
    this._renderOrchestrationConfig(instance);
    this._updatePreview(instance);

    // Inject styles
    this._injectStyles();
  },

  /**
   * Render mode-specific content
   * @param {Object} instance - Instance state
   */
  _renderModeContent(instance) {
    const contentEl = instance._container?.querySelector(
      ".participant-selector-content",
    );
    if (!contentEl) return;

    switch (instance._config.mode) {
      case "single":
        this._renderSingleMode(instance, contentEl);
        break;
      case "multiple":
        this._renderMultipleMode(instance, contentEl);
        break;
      case "team":
        this._renderTeamMode(instance, contentEl);
        break;
      case "dynamic":
        this._renderDynamicMode(instance, contentEl);
        break;
    }

    // Update orchestration visibility
    const orchSection = instance._container?.querySelector(
      ".participant-selector-orchestration",
    );
    if (orchSection) {
      orchSection.style.display =
        instance._config.mode === "single" ? "none" : "";
    }
  },

  /**
   * Render single position mode
   * @param {Object} instance - Instance state
   * @param {HTMLElement} contentEl - Content container
   */
  _renderSingleMode(instance, contentEl) {
    const positions = this._getPositions();

    contentEl.innerHTML = `
      <div class="participant-selector-single">
        <label class="participant-selector-label">Select Position:</label>
        <select class="participant-selector-select">
          <option value="">-- Choose a position --</option>
          ${positions
            .map(
              (p) => `
            <option value="${this._escapeHtml(p.id)}"
                    ${instance._config.selectedPosition === p.id ? "selected" : ""}>
              ${this._escapeHtml(p.name)}${p.teamId ? ` (${this._getTeam(p.teamId)?.name || "No Team"})` : ""}
            </option>
          `,
            )
            .join("")}
        </select>
        ${
          positions.length === 0
            ? `
          <p class="participant-selector-empty">
            No positions defined. Create positions in the Agents System first.
          </p>
        `
            : ""
        }
      </div>
    `;

    const select = contentEl.querySelector(".participant-selector-select");
    select?.addEventListener("change", (e) => {
      instance._config.selectedPosition = e.target.value || null;
      this._updatePreview(instance);
      this._notifyChange(instance);
    });
  },

  /**
   * Render multiple positions mode
   * @param {Object} instance - Instance state
   * @param {HTMLElement} contentEl - Content container
   */
  _renderMultipleMode(instance, contentEl) {
    const positions = this._getPositions();
    const teams = this._getTeams();

    // Group positions by team
    const grouped = {};
    grouped["ungrouped"] = positions.filter((p) => !p.teamId);

    for (const team of teams) {
      grouped[team.id] = positions.filter((p) => p.teamId === team.id);
    }

    let html = `
      <div class="participant-selector-multiple">
        <label class="participant-selector-label">Select Positions:</label>
        <div class="participant-selector-position-list">
    `;

    // Ungrouped first
    if (grouped["ungrouped"]?.length > 0) {
      html += `
        <div class="participant-selector-group">
          <div class="participant-selector-group-header">📌 Ungrouped</div>
          ${grouped["ungrouped"]
            .map(
              (p) => `
            <label class="participant-selector-checkbox">
              <input type="checkbox" value="${this._escapeHtml(p.id)}"
                     ${instance._config.selectedPositions.includes(p.id) ? "checked" : ""}>
              <span>${this._escapeHtml(p.name)}</span>
            </label>
          `,
            )
            .join("")}
        </div>
      `;
    }

    // Then by team
    for (const team of teams) {
      const teamPositions = grouped[team.id] || [];
      if (teamPositions.length > 0) {
        html += `
          <div class="participant-selector-group">
            <div class="participant-selector-group-header">
              ${this._escapeHtml(team.name || team.id)}
            </div>
            ${teamPositions
              .map(
                (p) => `
              <label class="participant-selector-checkbox">
                <input type="checkbox" value="${this._escapeHtml(p.id)}"
                       ${instance._config.selectedPositions.includes(p.id) ? "checked" : ""}>
                <span>${this._escapeHtml(p.name)}</span>
              </label>
            `,
              )
              .join("")}
          </div>
        `;
      }
    }

    html += `
        </div>
        <div class="participant-selector-actions">
          <button class="participant-selector-btn" data-action="select-all">Select All</button>
          <button class="participant-selector-btn" data-action="select-none">Clear</button>
        </div>
      </div>
    `;

    contentEl.innerHTML = html;

    // Bind checkbox changes
    const checkboxes = contentEl.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach((cb) => {
      cb.addEventListener("change", () => {
        this._updateSelectedPositions(instance, contentEl);
      });
    });

    // Bind action buttons
    contentEl
      .querySelector('[data-action="select-all"]')
      ?.addEventListener("click", () => {
        checkboxes.forEach((cb) => (cb.checked = true));
        this._updateSelectedPositions(instance, contentEl);
      });

    contentEl
      .querySelector('[data-action="select-none"]')
      ?.addEventListener("click", () => {
        checkboxes.forEach((cb) => (cb.checked = false));
        this._updateSelectedPositions(instance, contentEl);
      });
  },

  /**
   * Update selected positions from checkboxes
   * @param {Object} instance - Instance state
   * @param {HTMLElement} contentEl - Content container
   */
  _updateSelectedPositions(instance, contentEl) {
    const checked = contentEl.querySelectorAll(
      'input[type="checkbox"]:checked',
    );
    instance._config.selectedPositions = Array.from(checked).map(
      (cb) => cb.value,
    );
    this._updatePreview(instance);
    this._notifyChange(instance);
  },

  /**
   * Render team selection mode
   * @param {Object} instance - Instance state
   * @param {HTMLElement} contentEl - Content container
   */
  _renderTeamMode(instance, contentEl) {
    const teams = this._getTeams();

    contentEl.innerHTML = `
      <div class="participant-selector-team">
        <label class="participant-selector-label">Select Teams:</label>
        <div class="participant-selector-team-list">
          ${teams
            .map((team) => {
              const positions = this._getPositions().filter(
                (p) => p.teamId === team.id,
              );
              return `
              <label class="participant-selector-team-item">
                <input type="checkbox" value="${this._escapeHtml(team.id)}"
                       ${instance._config.selectedTeams.includes(team.id) ? "checked" : ""}>
                <span class="participant-selector-team-info">
                  <span class="participant-selector-team-name">${this._escapeHtml(team.name || team.id)}</span>
                  <span class="participant-selector-team-count">${positions.length} position(s)</span>
                </span>
              </label>
            `;
            })
            .join("")}
        </div>
        ${
          teams.length === 0
            ? `
          <p class="participant-selector-empty">
            No teams defined. Create teams in the Agents System first.
          </p>
        `
            : ""
        }
        <div class="participant-selector-team-options">
          <label class="participant-selector-checkbox">
            <input type="checkbox" data-option="includeLeaders"
                   ${instance._config.teamOptions.includeLeaders ? "checked" : ""}>
            <span>Include Team Leaders</span>
          </label>
          <label class="participant-selector-checkbox">
            <input type="checkbox" data-option="includeMembers"
                   ${instance._config.teamOptions.includeMembers ? "checked" : ""}>
            <span>Include Team Members</span>
          </label>
        </div>
      </div>
    `;

    // Bind team checkboxes
    const teamCheckboxes = contentEl.querySelectorAll(
      '.participant-selector-team-list input[type="checkbox"]',
    );
    teamCheckboxes.forEach((cb) => {
      cb.addEventListener("change", () => {
        const checked = contentEl.querySelectorAll(
          '.participant-selector-team-list input[type="checkbox"]:checked',
        );
        instance._config.selectedTeams = Array.from(checked).map(
          (c) => c.value,
        );
        this._updatePreview(instance);
        this._notifyChange(instance);
      });
    });

    // Bind option checkboxes
    const optionCheckboxes = contentEl.querySelectorAll("[data-option]");
    optionCheckboxes.forEach((cb) => {
      cb.addEventListener("change", () => {
        instance._config.teamOptions[cb.dataset.option] = cb.checked;
        this._updatePreview(instance);
        this._notifyChange(instance);
      });
    });
  },

  /**
   * Render dynamic/SME mode
   * @param {Object} instance - Instance state
   * @param {HTMLElement} contentEl - Content container
   */
  _renderDynamicMode(instance, contentEl) {
    const positions = this._getPositions();

    contentEl.innerHTML = `
      <div class="participant-selector-dynamic">
        <div class="participant-selector-field">
          <label class="participant-selector-label">Keyword Source:</label>
          <div class="participant-selector-radio-group">
            <label class="participant-selector-radio">
              <input type="radio" name="keyword-source" value="input"
                     ${instance._config.dynamicConfig.keywordSource === "input" ? "checked" : ""}>
              <span>Action Input</span>
            </label>
            <label class="participant-selector-radio">
              <input type="radio" name="keyword-source" value="context"
                     ${instance._config.dynamicConfig.keywordSource === "context" ? "checked" : ""}>
              <span>Phase Context</span>
            </label>
          </div>
          <p class="participant-selector-hint">
            Keywords will be extracted and matched against agent expertise
          </p>
        </div>

        <div class="participant-selector-field">
          <label class="participant-selector-label">Maximum SMEs:</label>
          <input type="number" class="participant-selector-input" data-field="maxSMEs"
                 value="${instance._config.dynamicConfig.maxSMEs}" min="1" max="10">
        </div>

        <div class="participant-selector-field">
          <label class="participant-selector-label">Fallback Position:</label>
          <select class="participant-selector-select" data-field="fallbackPosition">
            <option value="">-- No fallback (fail if no SME found) --</option>
            ${positions
              .map(
                (p) => `
              <option value="${this._escapeHtml(p.id)}"
                      ${instance._config.dynamicConfig.fallbackPosition === p.id ? "selected" : ""}>
                ${this._escapeHtml(p.name)}
              </option>
            `,
              )
              .join("")}
          </select>
          <p class="participant-selector-hint">
            Used when no matching SMEs are found
          </p>
        </div>
      </div>
    `;

    // Bind keyword source
    const sourceRadios = contentEl.querySelectorAll(
      'input[name="keyword-source"]',
    );
    sourceRadios.forEach((radio) => {
      radio.addEventListener("change", (e) => {
        if (e.target.checked) {
          instance._config.dynamicConfig.keywordSource = e.target.value;
          this._notifyChange(instance);
        }
      });
    });

    // Bind max SMEs
    const maxInput = contentEl.querySelector('[data-field="maxSMEs"]');
    maxInput?.addEventListener("change", (e) => {
      instance._config.dynamicConfig.maxSMEs =
        parseInt(e.target.value, 10) || 3;
      this._notifyChange(instance);
    });

    // Bind fallback
    const fallbackSelect = contentEl.querySelector(
      '[data-field="fallbackPosition"]',
    );
    fallbackSelect?.addEventListener("change", (e) => {
      instance._config.dynamicConfig.fallbackPosition = e.target.value || null;
      this._notifyChange(instance);
    });
  },

  /**
   * Render orchestration configuration
   * @param {Object} instance - Instance state
   */
  _renderOrchestrationConfig(instance) {
    const configEl = instance._container?.querySelector(
      ".participant-selector-orch-config",
    );
    if (!configEl) return;

    const orch = instance._config.orchestration;

    if (orch === "round_robin" || orch === "consensus") {
      configEl.innerHTML = `
        <div class="participant-selector-orch-options">
          <div class="participant-selector-field-inline">
            <label>Max Rounds:</label>
            <input type="number" class="participant-selector-input-sm" data-field="maxRounds"
                   value="${instance._config.orchestrationConfig.maxRounds}" min="1" max="20">
          </div>
          ${
            orch === "consensus"
              ? `
            <div class="participant-selector-field-inline">
              <label>Consensus Threshold:</label>
              <input type="number" class="participant-selector-input-sm" data-field="consensusThreshold"
                     value="${instance._config.orchestrationConfig.consensusThreshold}" min="50" max="100">
              <span>%</span>
            </div>
          `
              : ""
          }
        </div>
      `;

      // Bind inputs
      const maxRoundsInput = configEl.querySelector('[data-field="maxRounds"]');
      maxRoundsInput?.addEventListener("change", (e) => {
        instance._config.orchestrationConfig.maxRounds =
          parseInt(e.target.value, 10) || 3;
        this._notifyChange(instance);
      });

      const thresholdInput = configEl.querySelector(
        '[data-field="consensusThreshold"]',
      );
      thresholdInput?.addEventListener("change", (e) => {
        instance._config.orchestrationConfig.consensusThreshold =
          parseInt(e.target.value, 10) || 80;
        this._notifyChange(instance);
      });
    } else {
      configEl.innerHTML = "";
    }
  },

  /**
   * Update participant preview
   * @param {Object} instance - Instance state
   */
  _updatePreview(instance) {
    const previewList = instance._container?.querySelector(
      ".participant-selector-preview-list",
    );
    const previewCount = instance._container?.querySelector(
      ".participant-selector-preview-count",
    );
    if (!previewList) return;

    const participants = this._getResolvedParticipants(instance);

    if (previewCount) {
      previewCount.textContent = `(${participants.length} participant${participants.length !== 1 ? "s" : ""})`;
    }

    if (participants.length === 0) {
      previewList.innerHTML = `
        <div class="participant-selector-preview-empty">
          No participants selected
        </div>
      `;
      return;
    }

    previewList.innerHTML = participants
      .map(
        (p, i) => `
        <div class="participant-selector-preview-item">
          <span class="participant-selector-preview-num">${i + 1}</span>
          <span class="participant-selector-preview-name">${this._escapeHtml(p.name)}</span>
          ${p.teamName ? `<span class="participant-selector-preview-team">${this._escapeHtml(p.teamName)}</span>` : ""}
          ${p.agentName ? `<span class="participant-selector-preview-agent">→ ${this._escapeHtml(p.agentName)}</span>` : ""}
        </div>
      `,
      )
      .join("");
  },

  /**
   * Get resolved participants based on current configuration
   * @param {Object} instance - Instance state
   * @returns {Array} Resolved participant list
   */
  _getResolvedParticipants(instance) {
    const config = instance._config;
    const participants = [];

    switch (config.mode) {
      case "single": {
        if (config.selectedPosition) {
          const pos = this._getPosition(config.selectedPosition);
          if (pos) {
            const agent = pos.assignedAgentId
              ? this._pipelineBuilderSystem?.getAgent?.(pos.assignedAgentId)
              : null;
            participants.push({
              positionId: pos.id,
              name: pos.name,
              teamName: pos.teamId
                ? this._getTeam(pos.teamId)?.name || null
                : null,
              agentId: pos.assignedAgentId,
              agentName: agent?.name || null,
            });
          }
        }
        break;
      }

      case "multiple": {
        for (const posId of config.selectedPositions) {
          const pos = this._getPosition(posId);
          if (pos) {
            const agent = pos.assignedAgentId
              ? this._pipelineBuilderSystem?.getAgent?.(pos.assignedAgentId)
              : null;
            participants.push({
              positionId: pos.id,
              name: pos.name,
              teamName: pos.teamId
                ? this._getTeam(pos.teamId)?.name || null
                : null,
              agentId: pos.assignedAgentId,
              agentName: agent?.name || null,
            });
          }
        }
        break;
      }

      case "team": {
        for (const teamId of config.selectedTeams) {
          const team = this._getTeam(teamId);
          if (!team) continue;

          const positions = this._getPositions().filter(
            (p) => p.teamId === teamId,
          );
          for (const pos of positions) {
            // Check if should include based on leader/member setting
            const isLeader = team.leaderPositionId === pos.id;
            if (isLeader && !config.teamOptions.includeLeaders) continue;
            if (!isLeader && !config.teamOptions.includeMembers) continue;

            const agent = pos.assignedAgentId
              ? this._pipelineBuilderSystem?.getAgent?.(pos.assignedAgentId)
              : null;
            participants.push({
              positionId: pos.id,
              name: pos.name,
              teamName: team.name,
              agentId: pos.assignedAgentId,
              agentName: agent?.name || null,
              isLeader,
            });
          }
        }
        break;
      }

      case "dynamic": {
        // For dynamic mode, we can't resolve participants until runtime
        // Return a placeholder
        participants.push({
          positionId: null,
          name: `[Dynamic: up to ${config.dynamicConfig.maxSMEs} SME(s)]`,
          teamName: null,
          agentId: null,
          agentName: null,
          isDynamic: true,
        });

        if (config.dynamicConfig.fallbackPosition) {
          const fallback = this._getPosition(
            config.dynamicConfig.fallbackPosition,
          );
          if (fallback) {
            participants.push({
              positionId: fallback.id,
              name: `[Fallback: ${fallback.name}]`,
              teamName: null,
              agentId: null,
              agentName: null,
              isFallback: true,
            });
          }
        }
        break;
      }
    }

    return participants;
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
      selectedPosition: instance._config.selectedPosition,
      selectedPositions: [...instance._config.selectedPositions],
      selectedTeams: [...instance._config.selectedTeams],
      teamOptions: { ...instance._config.teamOptions },
      dynamicConfig: { ...instance._config.dynamicConfig },
      orchestration: instance._config.orchestration,
      orchestrationConfig: { ...instance._config.orchestrationConfig },
    };
  },

  /**
   * Set instance value
   * @param {Object} instance - Instance state
   * @param {Object} config - Configuration to set
   */
  _setInstanceValue(instance, config) {
    if (config.mode) instance._config.mode = config.mode;
    if (config.selectedPosition !== undefined)
      instance._config.selectedPosition = config.selectedPosition;
    if (config.selectedPositions)
      instance._config.selectedPositions = [...config.selectedPositions];
    if (config.selectedTeams)
      instance._config.selectedTeams = [...config.selectedTeams];
    if (config.teamOptions)
      instance._config.teamOptions = {
        ...instance._config.teamOptions,
        ...config.teamOptions,
      };
    if (config.dynamicConfig)
      instance._config.dynamicConfig = {
        ...instance._config.dynamicConfig,
        ...config.dynamicConfig,
      };
    if (config.orchestration)
      instance._config.orchestration = config.orchestration;
    if (config.orchestrationConfig)
      instance._config.orchestrationConfig = {
        ...instance._config.orchestrationConfig,
        ...config.orchestrationConfig,
      };

    if (instance._container) {
      this._renderInstance(instance, instance._container);
    }
  },

  /**
   * Destroy instance
   * @param {Object} instance - Instance state
   */
  _destroyInstance(instance) {
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
    if (document.getElementById("participant-selector-styles")) return;

    const styles = document.createElement("style");
    styles.id = "participant-selector-styles";
    styles.textContent = `
      .participant-selector {
        font-family: inherit;
        font-size: 14px;
      }

      .participant-selector-modes {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 10px;
        margin-bottom: 20px;
      }

      .participant-selector-mode {
        cursor: pointer;
      }

      .participant-selector-mode input {
        display: none;
      }

      .participant-selector-mode-card {
        display: flex;
        flex-direction: column;
        padding: 12px;
        border: 2px solid var(--SmartThemeBorderColor, #444);
        border-radius: 8px;
        transition: all 0.2s;
      }

      .participant-selector-mode input:checked + .participant-selector-mode-card {
        border-color: var(--SmartThemeQuoteColor, #3a3);
        background: rgba(51, 170, 51, 0.1);
      }

      .participant-selector-mode-card:hover {
        border-color: var(--SmartThemeQuoteColor, #3a3);
      }

      .participant-selector-mode-icon {
        font-size: 24px;
        margin-bottom: 5px;
      }

      .participant-selector-mode-label {
        font-weight: 600;
        margin-bottom: 3px;
      }

      .participant-selector-mode-desc {
        font-size: 12px;
        color: var(--SmartThemeEmColor, #888);
      }

      .participant-selector-content {
        margin-bottom: 20px;
        padding: 15px;
        background: var(--SmartThemeBlurTintColor, #1a1a1a);
        border-radius: 8px;
      }

      .participant-selector-label {
        display: block;
        margin-bottom: 8px;
        font-weight: 500;
      }

      .participant-selector-select {
        width: 100%;
        padding: 10px;
        border: 1px solid var(--SmartThemeBorderColor, #444);
        border-radius: 4px;
        background: var(--SmartThemeBlurTintColor, #2a2a2a);
        color: inherit;
        font-size: 14px;
      }

      .participant-selector-empty {
        text-align: center;
        padding: 20px;
        color: var(--SmartThemeEmColor, #888);
        font-style: italic;
      }

      .participant-selector-position-list,
      .participant-selector-team-list {
        max-height: 250px;
        overflow-y: auto;
        border: 1px solid var(--SmartThemeBorderColor, #444);
        border-radius: 4px;
        padding: 10px;
      }

      .participant-selector-group {
        margin-bottom: 10px;
      }

      .participant-selector-group-header {
        font-weight: 600;
        padding: 5px 0;
        color: var(--SmartThemeEmColor, #aaa);
        font-size: 13px;
      }

      .participant-selector-checkbox,
      .participant-selector-radio {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 10px;
        border-radius: 4px;
        cursor: pointer;
      }

      .participant-selector-checkbox:hover,
      .participant-selector-radio:hover {
        background: var(--SmartThemeBorderColor, #333);
      }

      .participant-selector-team-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px;
        border-bottom: 1px solid var(--SmartThemeBorderColor, #333);
        cursor: pointer;
      }

      .participant-selector-team-item:last-child {
        border-bottom: none;
      }

      .participant-selector-team-info {
        display: flex;
        flex-direction: column;
      }

      .participant-selector-team-name {
        font-weight: 500;
      }

      .participant-selector-team-count {
        font-size: 12px;
        color: var(--SmartThemeEmColor, #888);
      }

      .participant-selector-team-options {
        margin-top: 15px;
        padding-top: 15px;
        border-top: 1px solid var(--SmartThemeBorderColor, #444);
      }

      .participant-selector-actions {
        display: flex;
        gap: 10px;
        margin-top: 10px;
      }

      .participant-selector-btn {
        padding: 6px 12px;
        border: 1px solid var(--SmartThemeBorderColor, #444);
        border-radius: 4px;
        background: var(--SmartThemeBlurTintColor, #2a2a2a);
        color: inherit;
        cursor: pointer;
        font-size: 13px;
      }

      .participant-selector-btn:hover {
        background: var(--SmartThemeBorderColor, #444);
      }

      .participant-selector-field {
        margin-bottom: 15px;
      }

      .participant-selector-radio-group {
        display: flex;
        gap: 15px;
        margin-bottom: 5px;
      }

      .participant-selector-hint {
        font-size: 12px;
        color: var(--SmartThemeEmColor, #888);
        margin-top: 5px;
      }

      .participant-selector-input {
        width: 100px;
        padding: 8px;
        border: 1px solid var(--SmartThemeBorderColor, #444);
        border-radius: 4px;
        background: var(--SmartThemeBlurTintColor, #2a2a2a);
        color: inherit;
      }

      .participant-selector-section-title {
        margin: 0 0 10px 0;
        font-size: 14px;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .participant-selector-orchestration {
        margin-bottom: 20px;
        padding: 15px;
        background: var(--SmartThemeBlurTintColor, #1a1a1a);
        border-radius: 8px;
      }

      .participant-selector-orchestration-modes {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin-bottom: 10px;
      }

      .participant-selector-orch-mode {
        cursor: pointer;
      }

      .participant-selector-orch-mode input {
        display: none;
      }

      .participant-selector-orch-card {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 8px 12px;
        border: 1px solid var(--SmartThemeBorderColor, #444);
        border-radius: 4px;
        transition: all 0.2s;
      }

      .participant-selector-orch-mode input:checked + .participant-selector-orch-card {
        border-color: var(--SmartThemeQuoteColor, #3a3);
        background: rgba(51, 170, 51, 0.1);
      }

      .participant-selector-orch-icon {
        font-size: 16px;
      }

      .participant-selector-orch-label {
        font-size: 13px;
      }

      .participant-selector-orch-options {
        display: flex;
        gap: 20px;
        flex-wrap: wrap;
        padding: 10px;
        background: var(--SmartThemeBorderColor, #333);
        border-radius: 4px;
      }

      .participant-selector-field-inline {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .participant-selector-input-sm {
        width: 60px;
        padding: 6px;
        border: 1px solid var(--SmartThemeBorderColor, #444);
        border-radius: 4px;
        background: var(--SmartThemeBlurTintColor, #2a2a2a);
        color: inherit;
        text-align: center;
      }

      .participant-selector-preview {
        padding: 15px;
        background: var(--SmartThemeBlurTintColor, #1a1a1a);
        border-radius: 8px;
      }

      .participant-selector-preview-count {
        font-weight: normal;
        color: var(--SmartThemeEmColor, #888);
      }

      .participant-selector-preview-list {
        max-height: 200px;
        overflow-y: auto;
      }

      .participant-selector-preview-empty {
        text-align: center;
        padding: 30px;
        color: var(--SmartThemeEmColor, #888);
      }

      .participant-selector-preview-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 10px;
        border-bottom: 1px solid var(--SmartThemeBorderColor, #333);
      }

      .participant-selector-preview-item:last-child {
        border-bottom: none;
      }

      .participant-selector-preview-num {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        background: var(--SmartThemeQuoteColor, #3a3);
        color: #fff;
        border-radius: 50%;
        font-size: 12px;
        font-weight: bold;
      }

      .participant-selector-preview-name {
        font-weight: 500;
      }

      .participant-selector-preview-team {
        font-size: 12px;
        color: var(--SmartThemeEmColor, #888);
        padding: 2px 6px;
        background: var(--SmartThemeBorderColor, #333);
        border-radius: 3px;
      }

      .participant-selector-preview-agent {
        font-size: 12px;
        color: var(--SmartThemeQuoteColor, #3a3);
        margin-left: auto;
      }
    `;

    document.head.appendChild(styles);
  },
};

// ===== EXPORT =====

// Export for browser
if (typeof window !== "undefined") {
  window.ParticipantSelector = ParticipantSelector;
}

// Export for module systems
if (typeof module !== "undefined" && module.exports) {
  module.exports = ParticipantSelector;
}
