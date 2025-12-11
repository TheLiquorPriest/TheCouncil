/**
 * TheCouncil - Pipeline Builder Modal UI
 *
 * Comprehensive UI for managing the organizational structure:
 * - Agents (AI configurations)
 * - Agent Pools (selection groups)
 * - Positions (roles in the organization)
 * - Teams (groups with leaders and members)
 * - Pipelines (workflow definitions)
 * - Hierarchy overview
 *
 * Uses PipelineBuilderSystem for all operations.
 *
 * @version 2.0.0
 */

const PipelineBuilderModal = {
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
  _activeTab: "hierarchy",

  /**
   * Reference to Kernel
   * @type {Object|null}
   */
  _kernel: null,

  /**
   * Reference to PipelineBuilderSystem
   * @type {Object|null}
   */
  _pipelineBuilder: null,

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
   * Active PromptBuilder instance for agent editing
   * @type {Object|null}
   */
  _promptBuilderInstance: null,

  /**
   * Currently selected item for editing
   * @type {Object|null}
   */
  _selectedItem: null,

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
   * Initialize the Pipeline Builder Modal
   * @param {Object} kernel - Kernel reference
   * @returns {PipelineBuilderModal}
   */
  init(kernel) {
    if (this._initialized) {
      this._log("warn", "PipelineBuilderModal already initialized");
      return this;
    }

    this._kernel = kernel;
    this._logger = kernel.getModule("logger");
    this._pipelineBuilder = kernel.getSystem("pipelineBuilder");

    if (!this._pipelineBuilder) {
      this._log("error", "PipelineBuilderSystem not available in Kernel");
      return this;
    }

    this._log("info", "Initializing Pipeline Builder Modal...");

    // Create modal DOM
    this._createModal();

    // Subscribe to PipelineBuilderSystem events
    this._subscribeToEvents();

    // Register with Kernel modal system
    if (this._kernel && this._kernel.registerModal) {
      this._kernel.registerModal("agents", this);
      this._log("debug", "Registered with Kernel modal system");
    }

    this._initialized = true;
    this._log("info", "Pipeline Builder Modal initialized");

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
    this._log("info", "Agents Modal destroyed");
  },

  // ===== MODAL CREATION =====

  /**
   * Create the modal DOM structure
   */
  _createModal() {
    // Create overlay
    this._elements.overlay = document.createElement("div");
    this._elements.overlay.className = "council-agents-overlay";
    this._elements.overlay.addEventListener("click", () => this.hide());

    // Create modal container
    this._elements.modal = document.createElement("div");
    this._elements.modal.className = "council-agents-modal";
    this._elements.modal.innerHTML = this._getModalTemplate();

    // Append to body
    document.body.appendChild(this._elements.overlay);
    document.body.appendChild(this._elements.modal);

    // Cache element references
    this._elements.container = this._elements.modal.querySelector(
      ".council-agents-container",
    );
    this._elements.tabs = this._elements.modal.querySelector(
      ".council-agents-tabs",
    );
    this._elements.content = this._elements.modal.querySelector(
      ".council-agents-content",
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
      <div class="council-agents-container">
        <div class="council-agents-header">
          <h2 class="council-agents-title">
            <span class="council-agents-icon">📋</span>
            Pipeline Builder
          </h2>
          <div class="council-agents-header-actions">
            <button class="council-agents-btn council-agents-btn-icon" data-action="import" title="Import Hierarchy">
              📥
            </button>
            <button class="council-agents-btn council-agents-btn-icon" data-action="export" title="Export Hierarchy">
              📤
            </button>
            <button class="council-agents-btn council-agents-btn-icon council-agents-close" data-action="close" title="Close">
              ✕
            </button>
          </div>
        </div>

        <div class="council-agents-tabs">
          <button class="council-agents-tab active" data-tab="hierarchy">
            🏛️ Hierarchy
          </button>
          <button class="council-agents-tab" data-tab="agents">
            🤖 Agents
          </button>
          <button class="council-agents-tab" data-tab="pools">
            🎱 Pools
          </button>
          <button class="council-agents-tab" data-tab="positions">
            💼 Positions
          </button>
          <button class="council-agents-tab" data-tab="teams">
            👥 Teams
          </button>
          <button class="council-agents-tab" data-tab="pipelines">
            ⚙️ Pipelines
          </button>
        </div>

        <div class="council-agents-content">
          <!-- Content rendered dynamically -->
        </div>

        <div class="council-agents-footer">
          <div class="council-agents-status">
            <span class="council-agents-status-text"></span>
          </div>
          <div class="council-agents-footer-actions">
            <button class="council-agents-btn council-agents-btn-secondary" data-action="close">
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
    modal.querySelectorAll(".council-agents-tab").forEach((tab) => {
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
   * Subscribe to PipelineBuilderSystem events
   */
  _subscribeToEvents() {
    if (!this._kernel || !this._pipelineBuilder) return;

    const events = [
      "pipelineBuilder:agent:created",
      "pipelineBuilder:agent:updated",
      "pipelineBuilder:agent:deleted",
      "pipelineBuilder:pool:created",
      "pipelineBuilder:pool:updated",
      "pipelineBuilder:pool:deleted",
      "pipelineBuilder:position:created",
      "pipelineBuilder:position:updated",
      "pipelineBuilder:position:deleted",
      "pipelineBuilder:team:created",
      "pipelineBuilder:team:updated",
      "pipelineBuilder:team:deleted",
      "pipelineBuilder:pipeline:created",
      "pipelineBuilder:pipeline:updated",
      "pipelineBuilder:pipeline:deleted",
      "pipelineBuilder:imported",
      "pipelineBuilder:companyNameChanged",
    ];

    for (const event of events) {
      const handler = () => {
        this._refreshCurrentTab();
        this._updateStatus();
      };
      this._kernel.on(event, handler);
      this._cleanupFns.push(() => this._kernel.off(event, handler));
    }
  },

  // ===== SHOW / HIDE =====

  /**
   * Show the modal
   */
  show() {
    if (!this._initialized) {
      this._log("error", "PipelineBuilderModal not initialized");
      return;
    }

    this._isVisible = true;
    this._elements.overlay.classList.add("visible");
    this._elements.modal.classList.add("visible");

    // Refresh content
    this._refreshCurrentTab();
    this._updateStatus();

    this._log("info", "Pipeline Builder Modal shown");
  },

  /**
   * Hide the modal
   */
  hide() {
    this._isVisible = false;
    this._elements.overlay.classList.remove("visible");
    this._elements.modal.classList.remove("visible");
    this._selectedItem = null;

    this._log("info", "Pipeline Builder Modal hidden");
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
   */
  _switchTab(tabName) {
    this._activeTab = tabName;
    this._selectedItem = null;

    // Update tab buttons
    this._elements.tabs
      .querySelectorAll(".council-agents-tab")
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
      case "hierarchy":
        this._renderHierarchyTab();
        break;
      case "agents":
        this._renderAgentsTab();
        break;
      case "pools":
        this._renderPoolsTab();
        break;
      case "positions":
        this._renderPositionsTab();
        break;
      case "teams":
        this._renderTeamsTab();
        break;
      case "pipelines":
        this._renderPipelinesTab();
        break;
      default:
        this._renderHierarchyTab();
    }
  },

  // ===== HIERARCHY TAB =====

  /**
   * Render hierarchy tab
   */
  _renderHierarchyTab() {
    const hierarchy = this._pipelineBuilder.getHierarchy();
    const summary = this._pipelineBuilder.getSummary();

    this._elements.content.innerHTML = `
      <div class="council-agents-hierarchy">
        <div class="council-hierarchy-header">
          <div class="council-company-name-section">
            <label class="council-form-label">Company Name</label>
            <div class="council-company-name-input-row">
              <input type="text"
                     class="council-form-input council-company-name-input"
                     value="${this._escapeHtml(hierarchy.companyName)}"
                     placeholder="Enter company name...">
              <button class="council-agents-btn council-agents-btn-primary" data-action="save-company-name">
                Save
              </button>
            </div>
          </div>
          <div class="council-hierarchy-stats">
            <div class="council-stat">
              <span class="council-stat-value">${summary.counts.agents}</span>
              <span class="council-stat-label">Agents</span>
            </div>
            <div class="council-stat">
              <span class="council-stat-value">${summary.counts.teams}</span>
              <span class="council-stat-label">Teams</span>
            </div>
            <div class="council-stat">
              <span class="council-stat-value">${summary.counts.positions}</span>
              <span class="council-stat-label">Positions</span>
            </div>
            <div class="council-stat ${summary.allPositionsFilled ? "success" : "warning"}">
              <span class="council-stat-value">${summary.allPositionsFilled ? "✓" : summary.unfilled.length}</span>
              <span class="council-stat-label">${summary.allPositionsFilled ? "Ready" : "Unfilled"}</span>
            </div>
          </div>
        </div>

        <div class="council-hierarchy-org-chart">
          ${this._renderOrgChart(hierarchy)}
        </div>

        ${!summary.allPositionsFilled ? this._renderUnfilledWarning(summary.unfilled) : ""}
      </div>
    `;

    // Bind hierarchy-specific events
    this._bindHierarchyEvents();
  },

  /**
   * Render org chart visualization
   * @param {Object} hierarchy - Hierarchy data
   * @returns {string} HTML
   */
  _renderOrgChart(hierarchy) {
    let html = '<div class="council-org-chart">';

    // Executive level
    if (hierarchy.executivePositions.length > 0) {
      html += '<div class="council-org-level council-org-executive">';
      html += '<div class="council-org-level-label">Executive</div>';
      html += '<div class="council-org-positions">';
      for (const position of hierarchy.executivePositions) {
        html += this._renderPositionCard(position, "executive");
      }
      html += "</div></div>";
    }

    // Teams
    if (hierarchy.teams.length > 0) {
      html += '<div class="council-org-level council-org-teams">';
      html += '<div class="council-org-level-label">Teams</div>';
      html += '<div class="council-org-teams-grid">';
      for (const team of hierarchy.teams) {
        html += this._renderTeamCard(team);
      }
      html += "</div></div>";
    }

    html += "</div>";
    return html;
  },

  /**
   * Render a position card
   * @param {Object} position - Position data
   * @param {string} context - Context (executive, leader, member)
   * @returns {string} HTML
   */
  _renderPositionCard(position, context = "member") {
    const agent = position.assignedAgentId
      ? this._pipelineBuilder.getAgent(position.assignedAgentId)
      : null;
    const pool = position.assignedPoolId
      ? this._pipelineBuilder.getAgentPool(position.assignedPoolId)
      : null;
    const filled = !!(agent || pool);

    return `
      <div class="council-position-card ${context} ${filled ? "filled" : "unfilled"}"
           data-position-id="${position.id}">
        <div class="council-position-card-header">
          <span class="council-position-tier-badge ${context}">${context}</span>
          <span class="council-position-name">${this._escapeHtml(position.name)}</span>
        </div>
        <div class="council-position-card-body">
          ${
            agent
              ? `<div class="council-position-agent">
                  <span class="council-agent-indicator">🤖</span>
                  <span>${this._escapeHtml(agent.name)}</span>
                </div>`
              : pool
                ? `<div class="council-position-pool">
                    <span class="council-pool-indicator">🎱</span>
                    <span>${this._escapeHtml(pool.name)}</span>
                  </div>`
                : `<div class="council-position-empty">
                    <span>No agent assigned</span>
                  </div>`
          }
        </div>
        <div class="council-position-card-actions">
          <button class="council-agents-btn council-agents-btn-sm"
                  data-action="edit-position"
                  data-id="${position.id}">
            Edit
          </button>
          <button class="council-agents-btn council-agents-btn-sm council-agents-btn-primary"
                  data-action="assign-position"
                  data-id="${position.id}">
            Assign
          </button>
        </div>
      </div>
    `;
  },

  /**
   * Render a team card in hierarchy view
   * @param {Object} team - Team with leader and members
   * @returns {string} HTML
   */
  _renderTeamCard(team) {
    return `
      <div class="council-team-card" data-team-id="${team.id}">
        <div class="council-team-card-header">
          <span class="council-team-icon">${team.icon || "👥"}</span>
          <span class="council-team-name">${this._escapeHtml(team.name)}</span>
        </div>
        <div class="council-team-card-body">
          <div class="council-team-leader">
            <div class="council-team-section-label">Leader</div>
            ${team.leader ? this._renderPositionCard(team.leader, "leader") : '<div class="council-empty-state">No leader assigned</div>'}
          </div>
          ${
            team.members.length > 0
              ? `
            <div class="council-team-members">
              <div class="council-team-section-label">Members (${team.members.length})</div>
              <div class="council-team-members-list">
                ${team.members.map((m) => this._renderPositionCard(m, "member")).join("")}
              </div>
            </div>
          `
              : ""
          }
        </div>
        <div class="council-team-card-actions">
          <button class="council-agents-btn council-agents-btn-sm"
                  data-action="edit-team"
                  data-id="${team.id}">
            Edit Team
          </button>
        </div>
      </div>
    `;
  },

  /**
   * Render unfilled positions warning
   * @param {string[]} unfilled - Unfilled position names
   * @returns {string} HTML
   */
  _renderUnfilledWarning(unfilled) {
    return `
      <div class="council-agents-warning">
        <div class="council-warning-icon">⚠️</div>
        <div class="council-warning-content">
          <div class="council-warning-title">Unfilled Positions</div>
          <div class="council-warning-text">
            The following positions need agents assigned:
            <strong>${unfilled.join(", ")}</strong>
          </div>
        </div>
      </div>
    `;
  },

  /**
   * Bind hierarchy tab events
   */
  _bindHierarchyEvents() {
    const content = this._elements.content;

    // Company name save
    const saveBtn = content.querySelector('[data-action="save-company-name"]');
    if (saveBtn) {
      saveBtn.addEventListener("click", () => {
        const input = content.querySelector(".council-company-name-input");
        if (input) {
          this._pipelineBuilder.setCompanyName(input.value);
          this._showToast("Company name updated", "success");
        }
      });
    }

    // Position/Team edit buttons
    content.querySelectorAll("[data-action]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const action = e.currentTarget.dataset.action;
        const id = e.currentTarget.dataset.id;
        this._handleAction(action, e, id);
      });
    });
  },

  // ===== AGENTS TAB =====

  /**
   * Render agents tab
   */
  _renderAgentsTab() {
    const agents = this._pipelineBuilder.getAllAgents();

    this._elements.content.innerHTML = `
      <div class="council-agents-list-view">
        <div class="council-list-header">
          <h3>Agents (${agents.length})</h3>
          <button class="council-agents-btn council-agents-btn-primary" data-action="create-agent">
            + New Agent
          </button>
        </div>

        <div class="council-list-container">
          ${
            agents.length > 0
              ? `
            <div class="council-agents-grid">
              ${agents.map((agent) => this._renderAgentCard(agent)).join("")}
            </div>
          `
              : `
            <div class="council-empty-state">
              <div class="council-empty-icon">🤖</div>
              <div class="council-empty-text">No agents defined yet</div>
              <button class="council-agents-btn council-agents-btn-primary" data-action="create-agent">
                Create Your First Agent
              </button>
            </div>
          `
          }
        </div>
      </div>
    `;

    this._bindListEvents();
  },

  /**
   * Render an agent card
   * @param {Object} agent - Agent data
   * @returns {string} HTML
   */
  _renderAgentCard(agent) {
    const positions = this._pipelineBuilder
      .getAllPositions()
      .filter((p) => p.assignedAgentId === agent.id);

    return `
      <div class="council-agent-card" data-agent-id="${agent.id}">
        <div class="council-agent-card-header">
          <span class="council-agent-icon">🤖</span>
          <span class="council-agent-name">${this._escapeHtml(agent.name)}</span>
        </div>
        <div class="council-agent-card-body">
          <div class="council-agent-description">
            ${agent.description ? this._escapeHtml(agent.description) : '<em class="muted">No description</em>'}
          </div>
          <div class="council-agent-meta">
            <div class="council-agent-meta-item">
              <span class="council-meta-label">API:</span>
              <span class="council-meta-value">${agent.apiConfig.useCurrentConnection ? "ST Connection" : "Custom"}</span>
            </div>
            <div class="council-agent-meta-item">
              <span class="council-meta-label">Reasoning:</span>
              <span class="council-meta-value">${agent.reasoning.enabled ? "✓ Enabled" : "Disabled"}</span>
            </div>
            <div class="council-agent-meta-item">
              <span class="council-meta-label">Positions:</span>
              <span class="council-meta-value">${positions.length > 0 ? positions.map((p) => p.name).join(", ") : "None"}</span>
            </div>
          </div>
        </div>
        <div class="council-agent-card-actions">
          <button class="council-agents-btn council-agents-btn-sm"
                  data-action="duplicate-agent"
                  data-id="${agent.id}">
            📋
          </button>
          <button class="council-agents-btn council-agents-btn-sm"
                  data-action="edit-agent"
                  data-id="${agent.id}">
            Edit
          </button>
          <button class="council-agents-btn council-agents-btn-sm council-agents-btn-danger"
                  data-action="delete-agent"
                  data-id="${agent.id}">
            🗑️
          </button>
        </div>
      </div>
    `;
  },

  // ===== POOLS TAB =====

  /**
   * Render pools tab
   */
  _renderPoolsTab() {
    const pools = this._pipelineBuilder.getAllAgentPools();

    this._elements.content.innerHTML = `
      <div class="council-agents-list-view">
        <div class="council-list-header">
          <h3>Agent Pools (${pools.length})</h3>
          <button class="council-agents-btn council-agents-btn-primary" data-action="create-pool">
            + New Pool
          </button>
        </div>

        <div class="council-list-container">
          ${
            pools.length > 0
              ? `
            <div class="council-pools-grid">
              ${pools.map((pool) => this._renderPoolCard(pool)).join("")}
            </div>
          `
              : `
            <div class="council-empty-state">
              <div class="council-empty-icon">🎱</div>
              <div class="council-empty-text">No agent pools defined yet</div>
              <div class="council-empty-description">
                Pools let you randomly or weighted-randomly select from multiple agents for a position.
              </div>
              <button class="council-agents-btn council-agents-btn-primary" data-action="create-pool">
                Create Your First Pool
              </button>
            </div>
          `
          }
        </div>
      </div>
    `;

    this._bindListEvents();
  },

  /**
   * Render a pool card
   * @param {Object} pool - Pool data
   * @returns {string} HTML
   */
  _renderPoolCard(pool) {
    const agents = pool.agentIds
      .map((id) => this._pipelineBuilder.getAgent(id))
      .filter(Boolean);
    const positions = this._pipelineBuilder
      .getAllPositions()
      .filter((p) => p.assignedPoolId === pool.id);

    return `
      <div class="council-pool-card" data-pool-id="${pool.id}">
        <div class="council-pool-card-header">
          <span class="council-pool-icon">🎱</span>
          <span class="council-pool-name">${this._escapeHtml(pool.name)}</span>
          <span class="council-pool-mode-badge">${pool.selectionMode}</span>
        </div>
        <div class="council-pool-card-body">
          <div class="council-pool-agents">
            <div class="council-pool-section-label">Agents (${agents.length})</div>
            <div class="council-pool-agents-list">
              ${agents
                .map(
                  (agent) => `
                <div class="council-pool-agent-item">
                  <span class="council-agent-indicator">🤖</span>
                  <span>${this._escapeHtml(agent.name)}</span>
                  ${pool.selectionMode === "weighted" && pool.weights[agent.id] ? `<span class="council-weight-badge">w:${pool.weights[agent.id]}</span>` : ""}
                </div>
              `,
                )
                .join("")}
            </div>
          </div>
          ${
            positions.length > 0
              ? `
            <div class="council-pool-positions">
              <div class="council-pool-section-label">Used in Positions</div>
              <div class="council-pool-positions-text">${positions.map((p) => p.name).join(", ")}</div>
            </div>
          `
              : ""
          }
        </div>
        <div class="council-pool-card-actions">
          <button class="council-agents-btn council-agents-btn-sm"
                  data-action="edit-pool"
                  data-id="${pool.id}">
            Edit
          </button>
          <button class="council-agents-btn council-agents-btn-sm council-agents-btn-danger"
                  data-action="delete-pool"
                  data-id="${pool.id}">
            🗑️
          </button>
        </div>
      </div>
    `;
  },

  // ===== POSITIONS TAB =====

  /**
   * Check if a team is a curation/record-keeping team
   * @param {Object} team - Team object
   * @returns {boolean}
   */
  _isCurationTeam(team) {
    if (!team) return false;
    const id = (team.id || "").toLowerCase();
    const name = (team.name || "").toLowerCase();
    return (
      id.includes("curation") ||
      id.includes("record") ||
      name.includes("curation") ||
      name.includes("record keeping") ||
      name.includes("record-keeping")
    );
  },

  /**
   * Render positions tab
   */
  _renderPositionsTab() {
    const positions = this._pipelineBuilder.getAllPositions();
    const teams = this._pipelineBuilder.getAllTeams();

    // Separate curation and pipeline teams
    const curationTeams = teams.filter((t) => this._isCurationTeam(t));
    const pipelineTeams = teams.filter((t) => !this._isCurationTeam(t));

    // Group positions by team
    const grouped = {
      executive: positions.filter((p) => p.tier === "executive" || !p.teamId),
      curation: {},
      pipeline: {},
    };

    for (const team of curationTeams) {
      grouped.curation[team.id] = {
        team,
        positions: positions.filter((p) => p.teamId === team.id),
      };
    }

    for (const team of pipelineTeams) {
      grouped.pipeline[team.id] = {
        team,
        positions: positions.filter((p) => p.teamId === team.id),
      };
    }

    this._elements.content.innerHTML = `
      <div class="council-agents-list-view">
        <div class="council-list-header">
          <h3>Positions (${positions.length})</h3>
          <button class="council-agents-btn council-agents-btn-primary" data-action="create-position">
            + New Position
          </button>
        </div>

        <div class="council-list-container">
          ${
            positions.length > 0
              ? `
            <div class="council-positions-grouped">
              ${
                grouped.executive.length > 0
                  ? `
                <div class="council-position-group">
                  <div class="council-group-header">
                    <span class="council-group-icon">🏛️</span>
                    <span class="council-group-name">Executive Positions</span>
                    <span class="council-group-count">${grouped.executive.length}</span>
                  </div>
                  <div class="council-positions-list">
                    ${grouped.executive.map((p) => this._renderPositionRow(p)).join("")}
                  </div>
                </div>
              `
                  : ""
              }
              ${
                Object.keys(grouped.pipeline).length > 0
                  ? `
                <div class="council-position-section">
                  <div class="council-section-header">
                    <span class="council-section-title">📝 Pipeline Teams</span>
                  </div>
                  ${Object.values(grouped.pipeline)
                    .map(
                      ({ team, positions: teamPositions }) => `
                    <div class="council-position-group">
                      <div class="council-group-header">
                        <span class="council-group-icon">${team.icon || "👥"}</span>
                        <span class="council-group-name">${this._escapeHtml(team.name)}</span>
                        <span class="council-group-count">${teamPositions.length}</span>
                      </div>
                      <div class="council-positions-list">
                        ${teamPositions.map((p) => this._renderPositionRow(p)).join("")}
                      </div>
                    </div>
                  `,
                    )
                    .join("")}
                </div>
              `
                  : ""
              }
              ${
                Object.keys(grouped.curation).length > 0
                  ? `
                <div class="council-position-section council-curation-section">
                  <div class="council-section-header">
                    <span class="council-section-title">📚 Curation Teams</span>
                    <span class="council-section-badge curation">Data Management</span>
                  </div>
                  ${Object.values(grouped.curation)
                    .map(
                      ({ team, positions: teamPositions }) => `
                    <div class="council-position-group curation-team">
                      <div class="council-group-header">
                        <span class="council-group-icon">${team.icon || "📁"}</span>
                        <span class="council-group-name">${this._escapeHtml(team.name)}</span>
                        <span class="council-group-count">${teamPositions.length}</span>
                      </div>
                      <div class="council-positions-list">
                        ${teamPositions.map((p) => this._renderPositionRow(p)).join("")}
                      </div>
                    </div>
                  `,
                    )
                    .join("")}
                </div>
              `
                  : ""
              }
            </div>
          `
              : `
            <div class="council-empty-state">
              <div class="council-empty-icon">💼</div>
              <div class="council-empty-text">No positions defined yet</div>
              <button class="council-agents-btn council-agents-btn-primary" data-action="create-position">
                Create Your First Position
              </button>
            </div>
          `
          }
        </div>
      </div>
    `;

    this._bindListEvents();
  },

  /**
   * Render a position row
   * @param {Object} position - Position data
   * @returns {string} HTML
   */
  _renderPositionRow(position) {
    const agent = position.assignedAgentId
      ? this._pipelineBuilder.getAgent(position.assignedAgentId)
      : null;
    const pool = position.assignedPoolId
      ? this._pipelineBuilder.getAgentPool(position.assignedPoolId)
      : null;
    const filled = !!(agent || pool);

    return `
      <div class="council-position-row ${filled ? "filled" : "unfilled"}" data-position-id="${position.id}">
        <div class="council-position-row-main">
          <span class="council-position-tier-badge ${position.tier}">${position.tier}</span>
          <span class="council-position-name">${this._escapeHtml(position.name)}</span>
          ${position.isMandatory ? '<span class="council-mandatory-badge">Required</span>' : ""}
        </div>
        <div class="council-position-row-assignment">
          ${
            agent
              ? `<span class="council-agent-indicator">🤖</span> ${this._escapeHtml(agent.name)}`
              : pool
                ? `<span class="council-pool-indicator">🎱</span> ${this._escapeHtml(pool.name)}`
                : '<span class="council-empty-assignment">Not assigned</span>'
          }
        </div>
        <div class="council-position-row-actions">
          <button class="council-agents-btn council-agents-btn-sm"
                  data-action="assign-position"
                  data-id="${position.id}">
            Assign
          </button>
          <button class="council-agents-btn council-agents-btn-sm"
                  data-action="edit-position"
                  data-id="${position.id}">
            Edit
          </button>
          ${
            !position.isMandatory
              ? `
            <button class="council-agents-btn council-agents-btn-sm council-agents-btn-danger"
                    data-action="delete-position"
                    data-id="${position.id}">
              🗑️
            </button>
          `
              : ""
          }
        </div>
      </div>
    `;
  },

  // ===== TEAMS TAB =====

  /**
   * Render teams tab
   */
  _renderTeamsTab() {
    const teams = this._pipelineBuilder.getAllTeams();
    const curationTeams = teams.filter((t) => this._isCurationTeam(t));
    const pipelineTeams = teams.filter((t) => !this._isCurationTeam(t));

    this._elements.content.innerHTML = `
      <div class="council-agents-list-view">
        <div class="council-list-header">
          <h3>Teams (${teams.length})</h3>
          <button class="council-agents-btn council-agents-btn-primary" data-action="create-team">
            + New Team
          </button>
        </div>

        <div class="council-list-container">
          ${
            teams.length > 0
              ? `
            ${
              pipelineTeams.length > 0
                ? `
              <div class="council-teams-section">
                <div class="council-section-header">
                  <span class="council-section-title">📝 Pipeline Teams</span>
                  <span class="council-section-count">${pipelineTeams.length}</span>
                </div>
                <div class="council-teams-list">
                  ${pipelineTeams.map((team) => this._renderTeamRow(team, false)).join("")}
                </div>
              </div>
            `
                : ""
            }
            ${
              curationTeams.length > 0
                ? `
              <div class="council-teams-section council-curation-section">
                <div class="council-section-header">
                  <span class="council-section-title">📚 Curation Teams</span>
                  <span class="council-section-badge curation">Data Management</span>
                  <span class="council-section-count">${curationTeams.length}</span>
                </div>
                <div class="council-teams-list">
                  ${curationTeams.map((team) => this._renderTeamRow(team, true)).join("")}
                </div>
              </div>
            `
                : ""
            }
          `
              : `
            <div class="council-empty-state">
              <div class="council-empty-icon">👥</div>
              <div class="council-empty-text">No teams defined yet</div>
              <button class="council-agents-btn council-agents-btn-primary" data-action="create-team">
                Create Your First Team
              </button>
            </div>
          `
          }
        </div>
      </div>
    `;

    this._bindListEvents();
  },

  /**
   * Render a single team row
   * @param {Object} team - Team data
   * @param {boolean} isCuration - Whether this is a curation team
   * @returns {string} HTML
   */
  _renderTeamRow(team, isCuration = false) {
    const leader = team.leaderId
      ? this._pipelineBuilder.getPosition(team.leaderId)
      : null;
    const memberCount = team.memberIds.length;

    return `
      <div class="council-team-row ${isCuration ? "curation-team" : ""}" data-team-id="${team.id}">
        <div class="council-team-row-main">
          <span class="council-team-icon">${team.icon || "👥"}</span>
          <span class="council-team-name">${this._escapeHtml(team.name)}</span>
        </div>
        <div class="council-team-row-info">
          <div class="council-team-leader-info">
            <span class="council-meta-label">Leader:</span>
            <span class="council-meta-value">${leader ? this._escapeHtml(leader.name) : "Not set"}</span>
          </div>
          <div class="council-team-member-count">
            <span class="council-meta-label">Members:</span>
            <span class="council-meta-value">${memberCount}</span>
          </div>
        </div>
        <div class="council-team-row-actions">
          <button class="council-agents-btn council-agents-btn-sm"
                  data-action="edit-team"
                  data-id="${team.id}">
            Edit
          </button>
          <button class="council-agents-btn council-agents-btn-sm council-agents-btn-danger"
                  data-action="delete-team"
                  data-id="${team.id}">
            🗑️
          </button>
        </div>
      </div>
    `;
  },

  // ===== LIST EVENT BINDING =====

  /**
   * Bind list view events
   */
  _bindListEvents() {
    const content = this._elements.content;

    content.querySelectorAll("[data-action]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const action = e.currentTarget.dataset.action;
        const id = e.currentTarget.dataset.id;
        this._handleAction(action, e, id);
      });
    });
  },

  // ===== ACTION HANDLERS =====

  /**
   * Handle actions
   * @param {string} action - Action name
   * @param {Event} event - Event object
   * @param {string} id - Item ID (optional)
   */
  _handleAction(action, event, id = null) {
    this._log("debug", `Action: ${action}`, { id });

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

      // Agent actions
      case "create-agent":
        this._showAgentDialog();
        break;

      case "edit-agent":
        this._showAgentDialog(id);
        break;

      case "duplicate-agent":
        this._duplicateAgent(id);
        break;

      case "delete-agent":
        this._confirmDelete("agent", id);
        break;

      // Pool actions
      case "create-pool":
        this._showPoolDialog();
        break;

      case "edit-pool":
        this._showPoolDialog(id);
        break;

      case "delete-pool":
        this._confirmDelete("pool", id);
        break;

      // Position actions
      case "create-position":
        this._showPositionDialog();
        break;

      case "edit-position":
        this._showPositionDialog(id);
        break;

      case "assign-position":
        this._showAssignmentDialog(id);
        break;

      case "delete-position":
        this._confirmDelete("position", id);
        break;

      // Team actions
      case "create-team":
        this._showTeamDialog();
        break;

      case "edit-team":
        this._showTeamDialog(id);
        break;

      case "delete-team":
        this._confirmDelete("team", id);
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
          if (this._pipelineBuilder.import(data)) {
            this._showToast("Hierarchy imported successfully", "success");
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
      const data = this._pipelineBuilder.export();
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `council-hierarchy-${Date.now()}.json`;
      a.click();

      URL.revokeObjectURL(url);
      this._showToast("Hierarchy exported", "success");
    } catch (e) {
      this._showToast(`Export error: ${e.message}`, "error");
    }
  },

  // ===== DIALOGS =====

  /**
   * Show agent create/edit dialog
   * @param {string} id - Agent ID (for edit) or null (for create)
   */
  _showAgentDialog(id = null) {
    const agent = id ? this._pipelineBuilder.getAgent(id) : null;
    const isEdit = !!agent;

    // Prepare initial prompt builder config from agent data
    const promptConfig = agent?.systemPrompt || {};
    const initialMode =
      promptConfig.source === "preset"
        ? "preset"
        : promptConfig.source === "tokens"
          ? "tokens"
          : "custom";

    const dialogHtml = `
      <div class="council-dialog-overlay" data-dialog="agent">
        <div class="council-dialog council-dialog-lg">
          <div class="council-dialog-header">
            <h3>${isEdit ? "Edit Agent" : "Create Agent"}</h3>
            <button class="council-dialog-close" data-action="dialog-close">✕</button>
          </div>
          <div class="council-dialog-body council-dialog-body-scroll">
            <div class="council-dialog-section">
              <h4 class="council-dialog-section-title">Basic Information</h4>
              <div class="council-form-row">
                <div class="council-form-group council-form-group-sm">
                  <label class="council-form-label">ID</label>
                  <input type="text"
                         class="council-form-input"
                         name="id"
                         value="${agent?.id || ""}"
                         ${isEdit ? "disabled" : ""}
                         placeholder="unique-agent-id">
                </div>
                <div class="council-form-group">
                  <label class="council-form-label">Name</label>
                  <input type="text"
                         class="council-form-input"
                         name="name"
                         value="${agent ? this._escapeHtml(agent.name) : ""}"
                         placeholder="Agent Name">
                </div>
              </div>
              <div class="council-form-group">
                <label class="council-form-label">Description</label>
                <textarea class="council-form-textarea"
                          name="description"
                          rows="2"
                          placeholder="Agent description...">${agent ? this._escapeHtml(agent.description) : ""}</textarea>
              </div>
            </div>

            <div class="council-dialog-section">
              <h4 class="council-dialog-section-title">API Configuration</h4>
              <div class="council-form-group">
                <label class="council-form-label">
                  <input type="checkbox"
                         name="useCurrentConnection"
                         ${agent?.apiConfig?.useCurrentConnection !== false ? "checked" : ""}>
                  Use SillyTavern's Current Connection
                </label>
              </div>
              <div class="council-form-row">
                <div class="council-form-group">
                  <label class="council-form-label">Temperature</label>
                  <input type="number"
                         class="council-form-input"
                         name="temperature"
                         value="${agent?.apiConfig?.temperature ?? 0.7}"
                         min="0"
                         max="2"
                         step="0.1">
                </div>
                <div class="council-form-group">
                  <label class="council-form-label">Max Tokens</label>
                  <input type="number"
                         class="council-form-input"
                         name="maxTokens"
                         value="${agent?.apiConfig?.maxTokens ?? 2048}"
                         min="1">
                </div>
              </div>
              <div class="council-form-group">
                <label class="council-form-label">
                  <input type="checkbox"
                         name="reasoningEnabled"
                         ${agent?.reasoning?.enabled ? "checked" : ""}>
                  Enable Reasoning/Chain-of-Thought
                </label>
              </div>
            </div>

            <div class="council-dialog-section">
              <h4 class="council-dialog-section-title">System Prompt</h4>
              <div class="council-prompt-builder-container" data-prompt-builder="agent">
                <!-- PromptBuilder will be rendered here -->
              </div>
            </div>
          </div>
          <div class="council-dialog-footer">
            <button class="council-agents-btn council-agents-btn-secondary" data-action="dialog-close">
              Cancel
            </button>
            <button class="council-agents-btn council-agents-btn-primary" data-action="dialog-save">
              ${isEdit ? "Save Changes" : "Create Agent"}
            </button>
          </div>
        </div>
      </div>
    `;

    // Show dialog first
    const container = document.createElement("div");
    container.innerHTML = dialogHtml;
    const overlay = container.firstElementChild;
    document.body.appendChild(overlay);

    // Initialize PromptBuilder in the dialog
    const promptBuilderContainer = overlay.querySelector(
      '[data-prompt-builder="agent"]',
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
        <textarea class="council-form-textarea council-form-textarea-large"
                  name="systemPrompt"
                  placeholder="Custom system prompt...">${promptConfig.customText ? this._escapeHtml(promptConfig.customText) : ""}</textarea>
      `;
    }

    // Bind dialog events
    const closeDialog = () => {
      // Clean up PromptBuilder instance
      if (this._promptBuilderInstance) {
        this._promptBuilderInstance.destroy();
        this._promptBuilderInstance = null;
      }
      overlay.classList.add("closing");
      setTimeout(() => overlay.remove(), 200);
    };

    // Bind close to ALL dialog-close buttons (header X and footer Cancel)
    overlay.querySelectorAll('[data-action="dialog-close"]').forEach((btn) =>
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        closeDialog();
      }),
    );
    overlay.querySelectorAll(".council-dialog-close").forEach((btn) =>
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        closeDialog();
      }),
    );

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        closeDialog();
      }
    });

    overlay
      .querySelector('[data-action="dialog-save"]')
      ?.addEventListener("click", () => {
        const formData = this._getDialogFormData(overlay);

        // Get prompt configuration from PromptBuilder
        let systemPromptConfig;
        if (this._promptBuilderInstance) {
          const promptValue = this._promptBuilderInstance.getValue();
          systemPromptConfig = {
            source: promptValue.mode,
            customText:
              promptValue.mode === "custom"
                ? promptValue.customPrompt
                : promptValue.generatedPrompt,
            presetName: promptValue.presetName,
            tokens: promptValue.tokens,
          };
        } else {
          // Fallback for simple textarea
          systemPromptConfig = {
            source: "custom",
            customText: formData.systemPrompt || "",
          };
        }

        try {
          if (isEdit) {
            this._pipelineBuilder.updateAgent(id, {
              name: formData.name,
              description: formData.description,
              apiConfig: {
                useCurrentConnection: formData.useCurrentConnection,
                temperature: parseFloat(formData.temperature),
                maxTokens: parseInt(formData.maxTokens),
              },
              reasoning: {
                enabled: formData.reasoningEnabled,
              },
              systemPrompt: systemPromptConfig,
            });
            this._showToast("Agent updated", "success");
          } else {
            this._pipelineBuilder.createAgent({
              id: formData.id,
              name: formData.name,
              description: formData.description,
              apiConfig: {
                useCurrentConnection: formData.useCurrentConnection,
                temperature: parseFloat(formData.temperature),
                maxTokens: parseInt(formData.maxTokens),
              },
              reasoning: {
                enabled: formData.reasoningEnabled,
              },
              systemPrompt: systemPromptConfig,
            });
            this._showToast("Agent created", "success");
          }
          closeDialog();
          this._refreshCurrentTab();
        } catch (e) {
          this._showToast(`Error: ${e.message}`, "error");
        }
      });

    // Focus first input
    setTimeout(() => {
      const firstInput = overlay.querySelector(
        "input:not([disabled]), textarea:not([disabled])",
      );
      if (firstInput) {
        firstInput.focus();
      }
    }, 100);
  },

  /**
   * Show pool create/edit dialog
   * @param {string} id - Pool ID (for edit) or null (for create)
   */
  _showPoolDialog(id = null) {
    const pool = id ? this._pipelineBuilder.getAgentPool(id) : null;
    const isEdit = !!pool;
    const agents = this._pipelineBuilder.getAllAgents();

    const dialogHtml = `
      <div class="council-dialog-overlay" data-dialog="pool">
        <div class="council-dialog">
          <div class="council-dialog-header">
            <h3>${isEdit ? "Edit Pool" : "Create Pool"}</h3>
            <button class="council-dialog-close" data-action="dialog-close">✕</button>
          </div>
          <div class="council-dialog-body">
            <div class="council-form-group">
              <label class="council-form-label">ID</label>
              <input type="text"
                     class="council-form-input"
                     name="id"
                     value="${pool?.id || ""}"
                     ${isEdit ? "disabled" : ""}
                     placeholder="unique-pool-id">
            </div>
            <div class="council-form-group">
              <label class="council-form-label">Name</label>
              <input type="text"
                     class="council-form-input"
                     name="name"
                     value="${pool ? this._escapeHtml(pool.name) : ""}"
                     placeholder="Pool Name">
            </div>
            <div class="council-form-group">
              <label class="council-form-label">Selection Mode</label>
              <select class="council-form-select" name="selectionMode">
                <option value="random" ${pool?.selectionMode === "random" ? "selected" : ""}>Random</option>
                <option value="round_robin" ${pool?.selectionMode === "round_robin" ? "selected" : ""}>Round Robin</option>
                <option value="weighted" ${pool?.selectionMode === "weighted" ? "selected" : ""}>Weighted</option>
              </select>
            </div>
            <div class="council-form-group">
              <label class="council-form-label">Agents</label>
              <div class="council-checkbox-list">
                ${agents
                  .map(
                    (agent) => `
                  <label class="council-checkbox-item">
                    <input type="checkbox"
                           name="agentIds"
                           value="${agent.id}"
                           ${pool?.agentIds?.includes(agent.id) ? "checked" : ""}>
                    <span>${this._escapeHtml(agent.name)}</span>
                  </label>
                `,
                  )
                  .join("")}
              </div>
              ${agents.length === 0 ? '<div class="council-form-hint">No agents available. Create agents first.</div>' : ""}
            </div>
          </div>
          <div class="council-dialog-footer">
            <button class="council-agents-btn council-agents-btn-secondary" data-action="dialog-close">
              Cancel
            </button>
            <button class="council-agents-btn council-agents-btn-primary" data-action="dialog-save">
              ${isEdit ? "Save Changes" : "Create Pool"}
            </button>
          </div>
        </div>
      </div>
    `;

    this._showDialog(dialogHtml, (dialog) => {
      const formData = this._getDialogFormData(dialog);
      const agentIds = Array.from(
        dialog.querySelectorAll('input[name="agentIds"]:checked'),
      ).map((cb) => cb.value);

      try {
        if (isEdit) {
          this._pipelineBuilder.updateAgentPool(id, {
            name: formData.name,
            selectionMode: formData.selectionMode,
            agentIds,
          });
          this._showToast("Pool updated", "success");
        } else {
          this._pipelineBuilder.createAgentPool({
            id: formData.id,
            name: formData.name,
            selectionMode: formData.selectionMode,
            agentIds,
          });
          this._showToast("Pool created", "success");
        }
        return true;
      } catch (e) {
        this._showToast(`Error: ${e.message}`, "error");
        return false;
      }
    });
  },

  /**
   * Show position create/edit dialog
   * @param {string} id - Position ID (for edit) or null (for create)
   */
  _showPositionDialog(id = null) {
    const position = id ? this._pipelineBuilder.getPosition(id) : null;
    const isEdit = !!position;
    const teams = this._pipelineBuilder.getAllTeams();

    const dialogHtml = `
      <div class="council-dialog-overlay" data-dialog="position">
        <div class="council-dialog">
          <div class="council-dialog-header">
            <h3>${isEdit ? "Edit Position" : "Create Position"}</h3>
            <button class="council-dialog-close" data-action="dialog-close">✕</button>
          </div>
          <div class="council-dialog-body">
            <div class="council-form-group">
              <label class="council-form-label">ID</label>
              <input type="text"
                     class="council-form-input"
                     name="id"
                     value="${position?.id || ""}"
                     ${isEdit ? "disabled" : ""}
                     placeholder="unique-position-id">
            </div>
            <div class="council-form-group">
              <label class="council-form-label">Name</label>
              <input type="text"
                     class="council-form-input"
                     name="name"
                     value="${position ? this._escapeHtml(position.name) : ""}"
                     placeholder="Position Name">
            </div>
            <div class="council-form-group">
              <label class="council-form-label">Tier</label>
              <select class="council-form-select" name="tier" ${position?.isMandatory ? "disabled" : ""}>
                <option value="executive" ${position?.tier === "executive" ? "selected" : ""}>Executive</option>
                <option value="leader" ${position?.tier === "leader" ? "selected" : ""}>Leader</option>
                <option value="member" ${position?.tier === "member" || !position ? "selected" : ""}>Member</option>
              </select>
            </div>
            <div class="council-form-group">
              <label class="council-form-label">Team</label>
              <select class="council-form-select" name="teamId">
                <option value="">None (Executive/Unassigned)</option>
                ${teams
                  .map(
                    (team) => `
                  <option value="${team.id}" ${position?.teamId === team.id ? "selected" : ""}>
                    ${this._escapeHtml(team.name)}
                  </option>
                `,
                  )
                  .join("")}
              </select>
            </div>
            <div class="council-form-group">
              <label class="council-form-label">Role Description</label>
              <textarea class="council-form-textarea"
                        name="roleDescription"
                        placeholder="Role description for this position...">${position?.promptModifiers?.roleDescription ? this._escapeHtml(position.promptModifiers.roleDescription) : ""}</textarea>
            </div>
            <div class="council-form-group">
              <label class="council-form-label">Prompt Prefix</label>
              <textarea class="council-form-textarea"
                        name="promptPrefix"
                        placeholder="Text to prepend to agent prompts...">${position?.promptModifiers?.prefix ? this._escapeHtml(position.promptModifiers.prefix) : ""}</textarea>
            </div>
            <div class="council-form-group">
              <label class="council-form-label">Prompt Suffix</label>
              <textarea class="council-form-textarea"
                        name="promptSuffix"
                        placeholder="Text to append to agent prompts...">${position?.promptModifiers?.suffix ? this._escapeHtml(position.promptModifiers.suffix) : ""}</textarea>
            </div>
          </div>
          <div class="council-dialog-footer">
            <button class="council-agents-btn council-agents-btn-secondary" data-action="dialog-close">
              Cancel
            </button>
            <button class="council-agents-btn council-agents-btn-primary" data-action="dialog-save">
              ${isEdit ? "Save Changes" : "Create Position"}
            </button>
          </div>
        </div>
      </div>
    `;

    this._showDialog(dialogHtml, (dialog) => {
      const formData = this._getDialogFormData(dialog);

      try {
        if (isEdit) {
          this._pipelineBuilder.updatePosition(id, {
            name: formData.name,
            tier: formData.tier,
            teamId: formData.teamId || null,
            promptModifiers: {
              prefix: formData.promptPrefix,
              suffix: formData.promptSuffix,
              roleDescription: formData.roleDescription,
            },
          });
          this._showToast("Position updated", "success");
        } else {
          this._pipelineBuilder.createPosition({
            id: formData.id,
            name: formData.name,
            tier: formData.tier,
            teamId: formData.teamId || null,
            promptModifiers: {
              prefix: formData.promptPrefix,
              suffix: formData.promptSuffix,
              roleDescription: formData.roleDescription,
            },
          });
          this._showToast("Position created", "success");
        }
        return true;
      } catch (e) {
        this._showToast(`Error: ${e.message}`, "error");
        return false;
      }
    });
  },

  /**
   * Show assignment dialog for a position
   * @param {string} positionId - Position ID
   */
  _showAssignmentDialog(positionId) {
    const position = this._pipelineBuilder.getPosition(positionId);
    if (!position) {
      this._showToast("Position not found", "error");
      return;
    }

    const agents = this._pipelineBuilder.getAllAgents();
    const pools = this._pipelineBuilder.getAllAgentPools();

    const dialogHtml = `
      <div class="council-dialog-overlay" data-dialog="assignment">
        <div class="council-dialog">
          <div class="council-dialog-header">
            <h3>Assign to ${this._escapeHtml(position.name)}</h3>
            <button class="council-dialog-close" data-action="dialog-close">✕</button>
          </div>
          <div class="council-dialog-body">
            <div class="council-form-group">
              <label class="council-form-label">Assignment Type</label>
              <select class="council-form-select" name="assignmentType">
                <option value="none" ${!position.assignedAgentId && !position.assignedPoolId ? "selected" : ""}>None</option>
                <option value="agent" ${position.assignedAgentId ? "selected" : ""}>Agent</option>
                <option value="pool" ${position.assignedPoolId ? "selected" : ""}>Pool</option>
              </select>
            </div>
            <div class="council-form-group" data-show-for="agent">
              <label class="council-form-label">Select Agent</label>
              <select class="council-form-select" name="agentId">
                <option value="">-- Select Agent --</option>
                ${agents
                  .map(
                    (agent) => `
                  <option value="${agent.id}" ${position.assignedAgentId === agent.id ? "selected" : ""}>
                    ${this._escapeHtml(agent.name)}
                  </option>
                `,
                  )
                  .join("")}
              </select>
              ${agents.length === 0 ? '<div class="council-form-hint">No agents available. Create agents first.</div>' : ""}
            </div>
            <div class="council-form-group" data-show-for="pool">
              <label class="council-form-label">Select Pool</label>
              <select class="council-form-select" name="poolId">
                <option value="">-- Select Pool --</option>
                ${pools
                  .map(
                    (pool) => `
                  <option value="${pool.id}" ${position.assignedPoolId === pool.id ? "selected" : ""}>
                    ${this._escapeHtml(pool.name)} (${pool.agentIds.length} agents)
                  </option>
                `,
                  )
                  .join("")}
              </select>
              ${pools.length === 0 ? '<div class="council-form-hint">No pools available. Create pools first.</div>' : ""}
            </div>
          </div>
          <div class="council-dialog-footer">
            <button class="council-agents-btn council-agents-btn-secondary" data-action="dialog-close">
              Cancel
            </button>
            <button class="council-agents-btn council-agents-btn-primary" data-action="dialog-save">
              Save Assignment
            </button>
          </div>
        </div>
      </div>
    `;

    this._showDialog(dialogHtml, (dialog) => {
      const formData = this._getDialogFormData(dialog);

      try {
        switch (formData.assignmentType) {
          case "agent":
            if (formData.agentId) {
              this._pipelineBuilder.assignAgentToPosition(
                positionId,
                formData.agentId,
              );
            } else {
              this._pipelineBuilder.assignAgentToPosition(positionId, null);
            }
            break;
          case "pool":
            if (formData.poolId) {
              this._pipelineBuilder.assignPoolToPosition(
                positionId,
                formData.poolId,
              );
            } else {
              this._pipelineBuilder.assignPoolToPosition(positionId, null);
            }
            break;
          default:
            this._pipelineBuilder.assignAgentToPosition(positionId, null);
        }
        this._showToast("Assignment updated", "success");
        return true;
      } catch (e) {
        this._showToast(`Error: ${e.message}`, "error");
        return false;
      }
    });

    // Add assignment type toggle logic
    setTimeout(() => {
      const dialog = document.querySelector('[data-dialog="assignment"]');
      if (!dialog) return;

      const typeSelect = dialog.querySelector('[name="assignmentType"]');
      const updateVisibility = () => {
        const type = typeSelect.value;
        dialog.querySelectorAll("[data-show-for]").forEach((el) => {
          el.style.display = el.dataset.showFor === type ? "" : "none";
        });
      };

      typeSelect.addEventListener("change", updateVisibility);
      updateVisibility();
    }, 0);
  },

  /**
   * Show team create/edit dialog
   * @param {string} id - Team ID (for edit) or null (for create)
   */
  _showTeamDialog(id = null) {
    const team = id ? this._pipelineBuilder.getTeam(id) : null;
    const isEdit = !!team;
    const positions = this._pipelineBuilder.getAllPositions();

    const dialogHtml = `
      <div class="council-dialog-overlay" data-dialog="team">
        <div class="council-dialog">
          <div class="council-dialog-header">
            <h3>${isEdit ? "Edit Team" : "Create Team"}</h3>
            <button class="council-dialog-close" data-action="dialog-close">✕</button>
          </div>
          <div class="council-dialog-body">
            <div class="council-form-group">
              <label class="council-form-label">ID</label>
              <input type="text"
                     class="council-form-input"
                     name="id"
                     value="${team?.id || ""}"
                     ${isEdit ? "disabled" : ""}
                     placeholder="unique-team-id">
            </div>
            <div class="council-form-group">
              <label class="council-form-label">Name</label>
              <input type="text"
                     class="council-form-input"
                     name="name"
                     value="${team ? this._escapeHtml(team.name) : ""}"
                     placeholder="Team Name">
            </div>
            <div class="council-form-group">
              <label class="council-form-label">Icon (emoji)</label>
              <input type="text"
                     class="council-form-input"
                     name="icon"
                     value="${team?.icon || "👥"}"
                     placeholder="👥">
            </div>
            <div class="council-form-group">
              <label class="council-form-label">Description</label>
              <textarea class="council-form-textarea"
                        name="description"
                        placeholder="Team description...">${team ? this._escapeHtml(team.description || "") : ""}</textarea>
            </div>
            <div class="council-form-group">
              <label class="council-form-label">Leader Position ID</label>
              <input type="text"
                     class="council-form-input"
                     name="leaderId"
                     value="${team?.leaderId || ""}"
                     placeholder="leader-position-id">
              <div class="council-form-hint">
                This position will be created if it doesn't exist.
              </div>
            </div>
          </div>
          <div class="council-dialog-footer">
            <button class="council-agents-btn council-agents-btn-secondary" data-action="dialog-close">
              Cancel
            </button>
            <button class="council-agents-btn council-agents-btn-primary" data-action="dialog-save">
              ${isEdit ? "Save Changes" : "Create Team"}
            </button>
          </div>
        </div>
      </div>
    `;

    this._showDialog(dialogHtml, (dialog) => {
      const formData = this._getDialogFormData(dialog);

      try {
        if (isEdit) {
          this._pipelineBuilder.updateTeam(id, {
            name: formData.name,
            icon: formData.icon,
            description: formData.description,
          });
          this._showToast("Team updated", "success");
        } else {
          this._pipelineBuilder.createTeam({
            id: formData.id,
            name: formData.name,
            icon: formData.icon,
            description: formData.description,
            leaderId: formData.leaderId,
            createLeaderPosition: true,
            leaderName: `${formData.name} Lead`,
          });
          this._showToast("Team created", "success");
        }
        return true;
      } catch (e) {
        this._showToast(`Error: ${e.message}`, "error");
        return false;
      }
    });
  },

  /**
   * Duplicate an agent
   * @param {string} id - Agent ID
   */
  _duplicateAgent(id) {
    try {
      const newAgent = this._pipelineBuilder.duplicateAgent(id);
      this._showToast(`Agent duplicated: ${newAgent.name}`, "success");
      this._refreshCurrentTab();
    } catch (e) {
      this._showToast(`Error: ${e.message}`, "error");
    }
  },

  /**
   * Confirm deletion
   * @param {string} type - Item type
   * @param {string} id - Item ID
   */
  _confirmDelete(type, id) {
    const names = {
      agent: "agent",
      pool: "pool",
      position: "position",
      team: "team",
    };

    const dialogHtml = `
      <div class="council-dialog-overlay" data-dialog="confirm">
        <div class="council-dialog council-dialog-sm">
          <div class="council-dialog-header">
            <h3>Confirm Delete</h3>
            <button class="council-dialog-close" data-action="dialog-close">✕</button>
          </div>
          <div class="council-dialog-body">
            <p>Are you sure you want to delete this ${names[type]}?</p>
            <p class="council-warning-text">This action cannot be undone.</p>
          </div>
          <div class="council-dialog-footer">
            <button class="council-agents-btn council-agents-btn-secondary" data-action="dialog-close">
              Cancel
            </button>
            <button class="council-agents-btn council-agents-btn-danger" data-action="dialog-save">
              Delete
            </button>
          </div>
        </div>
      </div>
    `;

    this._showDialog(dialogHtml, () => {
      try {
        switch (type) {
          case "agent":
            this._pipelineBuilder.deleteAgent(id);
            break;
          case "pool":
            this._pipelineBuilder.deleteAgentPool(id);
            break;
          case "position":
            this._pipelineBuilder.deletePosition(id);
            break;
          case "team":
            this._pipelineBuilder.deleteTeam(id, false);
            break;
        }
        this._showToast(`${names[type]} deleted`, "success");
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

    // Bind events
    const closeDialog = () => {
      overlay.classList.add("closing");
      setTimeout(() => overlay.remove(), 200);
    };

    // Bind close to ALL dialog-close buttons (header X and footer Cancel)
    overlay.querySelectorAll('[data-action="dialog-close"]').forEach((btn) =>
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        closeDialog();
      }),
    );
    overlay.querySelectorAll(".council-dialog-close").forEach((btn) =>
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        closeDialog();
      }),
    );

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        closeDialog();
      }
    });

    overlay
      .querySelector('[data-action="dialog-save"]')
      ?.addEventListener("click", () => {
        const result = onSave(overlay);
        if (result !== false) {
          closeDialog();
        }
      });

    // Focus first input
    setTimeout(() => {
      const firstInput = overlay.querySelector(
        "input:not([disabled]), textarea:not([disabled])",
      );
      if (firstInput) {
        firstInput.focus();
      }
    }, 100);
  },

  /**
   * Get form data from dialog
   * @param {Element} dialog - Dialog element
   * @returns {Object} Form data
   */
  _getDialogFormData(dialog) {
    const data = {};

    dialog.querySelectorAll("input, textarea, select").forEach((el) => {
      if (!el.name) return;

      if (el.type === "checkbox") {
        data[el.name] = el.checked;
      } else {
        data[el.name] = el.value;
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
      ".council-agents-status-text",
    );
    if (!statusText) return;

    const summary = this._pipelineBuilder?.getSummary?.();
    if (!summary) {
      statusText.textContent = "System not ready";
      return;
    }

    const unfilled = summary.unfilledPositions || [];
    statusText.textContent = summary.allPositionsFilled
      ? "✓ All positions filled"
      : `⚠️ ${unfilled.length} unfilled position(s)`;
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

  // ===== PIPELINES TAB =====

  /**
   * Render pipelines tab
   */
  _renderPipelinesTab() {
    const pipelines = this._pipelineBuilder.getAllPipelines();

    this._elements.content.innerHTML = `
      <div class="council-agents-pipelines">
        <div class="council-list-header">
          <h3>Pipelines</h3>
          <button class="council-agents-btn council-agents-btn-primary" data-action="create-pipeline">
            + Create Pipeline
          </button>
        </div>

        <div class="council-pipelines-list">
          ${pipelines.map((pipeline) => `
            <div class="council-pipeline-item" data-pipeline-id="${this._escapeHtml(pipeline.id)}">
              <div class="council-pipeline-info">
                <h4 class="council-pipeline-name">${this._escapeHtml(pipeline.name || pipeline.id)}</h4>
                <p class="council-pipeline-description">${this._escapeHtml(pipeline.description || "No description")}</p>
                <div class="council-pipeline-meta">
                  <span class="council-badge">${pipeline.phases?.length || 0} phases</span>
                  <span class="council-badge">${pipeline.phases?.reduce((sum, p) => sum + (p.actions?.length || 0), 0) || 0} actions</span>
                </div>
              </div>
              <div class="council-pipeline-actions">
                <button class="council-agents-btn council-agents-btn-small" data-action="edit-pipeline" data-pipeline-id="${this._escapeHtml(pipeline.id)}">
                  Edit
                </button>
                <button class="council-agents-btn council-agents-btn-small council-agents-btn-danger" data-action="delete-pipeline" data-pipeline-id="${this._escapeHtml(pipeline.id)}">
                  Delete
                </button>
              </div>
            </div>
          `).join("")}
        </div>

        ${pipelines.length === 0 ? `
          <div class="council-empty-state">
            <p>No pipelines defined yet</p>
            <button class="council-agents-btn council-agents-btn-primary" data-action="create-pipeline">
              Create First Pipeline
            </button>
          </div>
        ` : ""}
      </div>
    `;

    // Bind pipeline actions
    this._elements.content.querySelectorAll('[data-action="create-pipeline"]').forEach((btn) => {
      btn.addEventListener("click", () => this._createPipeline());
    });

    this._elements.content.querySelectorAll('[data-action="edit-pipeline"]').forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const pipelineId = e.target.dataset.pipelineId;
        this._editPipeline(pipelineId);
      });
    });

    this._elements.content.querySelectorAll('[data-action="delete-pipeline"]').forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const pipelineId = e.target.dataset.pipelineId;
        if (confirm(`Delete pipeline "${pipelineId}"?`)) {
          this._pipelineBuilder.deletePipeline(pipelineId);
          this._refreshCurrentTab();
        }
      });
    });
  },

  /**
   * Create a new pipeline
   */
  _createPipeline() {
    const name = prompt("Pipeline name:");
    if (!name) return;

    try {
      const pipeline = this._pipelineBuilder.createPipeline({
        id: name.toLowerCase().replace(/\s+/g, "-"),
        name: name,
        description: "",
        phases: [],
      });
      this._log("info", "Pipeline created:", pipeline.id);
      this._refreshCurrentTab();
    } catch (error) {
      alert(`Error creating pipeline: ${error.message}`);
      this._log("error", "Failed to create pipeline:", error);
    }
  },

  /**
   * Edit a pipeline
   * @param {string} pipelineId - Pipeline ID
   */
  _editPipeline(pipelineId) {
    const pipeline = this._pipelineBuilder.getPipeline(pipelineId);
    if (!pipeline) {
      alert("Pipeline not found");
      return;
    }

    // Show pipeline editor (basic for now)
    const description = prompt("Pipeline description:", pipeline.description || "");
    if (description !== null) {
      this._pipelineBuilder.updatePipeline(pipelineId, { description });
      this._refreshCurrentTab();
    }
  },

  /**
   * Log a message
   * @param {string} level - Log level
   * @param {string} message - Message
   * @param {...any} args - Additional arguments
   */
  _log(level, message, ...args) {
    if (this._logger && typeof this._logger[level] === "function") {
      this._logger[level](`[PipelineBuilderModal] ${message}`, ...args);
    }
  },

  // ===== STYLES =====

  /**
   * Inject modal styles
   */
  _injectStyles() {
    if (document.getElementById("council-agents-modal-styles")) {
      return;
    }

    const style = document.createElement("style");
    style.id = "council-agents-modal-styles";
    style.textContent = `
      /* Overlay */
      .council-agents-overlay {
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

      .council-agents-overlay.visible {
        opacity: 1;
        visibility: visible;
      }

      /* Modal */
      .council-agents-modal {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) scale(0.95);
        width: 90%;
        max-width: 1000px;
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

      .council-agents-modal.visible {
        opacity: 1;
        visibility: visible;
        transform: translate(-50%, -50%) scale(1);
      }

      .council-agents-container {
        display: flex;
        flex-direction: column;
        height: 100%;
        max-height: 90vh;
      }

      /* Header */
      .council-agents-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 20px;
        border-bottom: 1px solid var(--council-border, #444);
      }

      .council-agents-title {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 1.25rem;
        font-weight: 600;
        margin: 0;
        color: var(--council-text, #eee);
      }

      .council-agents-icon {
        font-size: 1.5rem;
      }

      .council-agents-header-actions {
        display: flex;
        gap: 8px;
      }

      /* Tabs */
      .council-agents-tabs {
        display: flex;
        gap: 4px;
        padding: 12px 20px;
        border-bottom: 1px solid var(--council-border, #444);
        overflow-x: auto;
      }

      .council-agents-tab {
        padding: 8px 16px;
        background: transparent;
        border: 1px solid transparent;
        border-radius: var(--council-radius-md, 6px);
        color: var(--council-text-muted, rgba(255, 255, 255, 0.6));
        cursor: pointer;
        white-space: nowrap;
        transition: all 0.15s ease;
      }

      .council-agents-tab:hover {
        background: var(--council-bg-hover, rgba(255, 255, 255, 0.1));
        color: var(--council-text, #eee);
      }

      .council-agents-tab.active {
        background: var(--council-bg-active, rgba(102, 126, 234, 0.2));
        border-color: var(--council-primary, #667eea);
        color: var(--council-primary, #667eea);
      }

      /* Content */
      .council-agents-content {
        flex: 1;
        overflow-y: auto;
        padding: 20px;
      }

      /* Footer */
      .council-agents-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 20px;
        border-top: 1px solid var(--council-border, #444);
      }

      .council-agents-status-text {
        font-size: 0.875rem;
        color: var(--council-text-muted, rgba(255, 255, 255, 0.6));
      }

      /* Buttons */
      .council-agents-btn {
        padding: 8px 16px;
        border: 1px solid var(--council-border, #444);
        border-radius: var(--council-radius-md, 6px);
        background: var(--council-bg-secondary, rgba(255, 255, 255, 0.05));
        color: var(--council-text, #eee);
        cursor: pointer;
        transition: all 0.15s ease;
        font-size: 0.875rem;
      }

      .council-agents-btn:hover {
        background: var(--council-bg-hover, rgba(255, 255, 255, 0.1));
      }

      .council-agents-btn-sm {
        padding: 4px 8px;
        font-size: 0.75rem;
      }

      .council-agents-btn-icon {
        padding: 8px;
        min-width: 36px;
      }

      .council-agents-btn-primary {
        background: var(--council-primary, #667eea);
        border-color: var(--council-primary, #667eea);
        color: white;
      }

      .council-agents-btn-primary:hover {
        background: var(--council-primary-dark, #5a6fd6);
      }

      .council-agents-btn-secondary {
        background: transparent;
      }

      .council-agents-btn-danger {
        background: var(--council-error, #f87171);
        border-color: var(--council-error, #f87171);
        color: white;
      }

      .council-agents-btn-danger:hover {
        opacity: 0.9;
      }

      /* Lists */
      .council-agents-list-view {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .council-list-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .council-list-header h3 {
        margin: 0;
        font-size: 1.1rem;
        color: var(--council-text, #eee);
      }

      .council-list-container {
        min-height: 200px;
      }

      /* Grids */
      .council-agents-grid,
      .council-pools-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 16px;
      }

      /* Cards */
      .council-agent-card,
      .council-pool-card,
      .council-team-card,
      .council-position-card {
        background: var(--council-bg-secondary, rgba(255, 255, 255, 0.05));
        border: 1px solid var(--council-border, #444);
        border-radius: var(--council-radius-lg, 8px);
        overflow: hidden;
        transition: border-color 0.15s ease;
      }

      .council-agent-card:hover,
      .council-pool-card:hover,
      .council-team-card:hover {
        border-color: var(--council-primary, #667eea);
      }

      .council-agent-card-header,
      .council-pool-card-header,
      .council-team-card-header,
      .council-position-card-header {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px;
        background: var(--council-bg-hover, rgba(255, 255, 255, 0.1));
        border-bottom: 1px solid var(--council-border, #444);
      }

      .council-agent-name,
      .council-pool-name,
      .council-team-name,
      .council-position-name {
        font-weight: 600;
        color: var(--council-text, #eee);
      }

      .council-agent-card-body,
      .council-pool-card-body,
      .council-team-card-body,
      .council-position-card-body {
        padding: 12px;
      }

      .council-agent-card-actions,
      .council-pool-card-actions,
      .council-team-card-actions,
      .council-position-card-actions {
        display: flex;
        gap: 8px;
        padding: 12px;
        border-top: 1px solid var(--council-border, #444);
        justify-content: flex-end;
      }

      .council-agent-description {
        font-size: 0.875rem;
        color: var(--council-text-muted, rgba(255, 255, 255, 0.6));
        margin-bottom: 12px;
      }

      .council-agent-meta,
      .council-pool-agents {
        font-size: 0.8rem;
      }

      .council-agent-meta-item {
        display: flex;
        gap: 8px;
        padding: 4px 0;
      }

      .council-meta-label {
        color: var(--council-text-muted, rgba(255, 255, 255, 0.6));
      }

      .council-meta-value {
        color: var(--council-text, #eee);
      }

      /* Pool badges */
      .council-pool-mode-badge,
      .council-weight-badge {
        font-size: 0.7rem;
        padding: 2px 6px;
        border-radius: 4px;
        background: var(--council-primary, #667eea);
        color: white;
        margin-left: auto;
      }

      .council-pool-section-label,
      .council-team-section-label {
        font-size: 0.75rem;
        color: var(--council-text-muted, rgba(255, 255, 255, 0.6));
        margin-bottom: 8px;
        text-transform: uppercase;
      }

      .council-pool-agent-item {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 4px 0;
        font-size: 0.85rem;
      }

      /* Position cards in hierarchy */
      .council-position-card {
        min-width: 200px;
      }

      .council-position-card.unfilled {
        border-color: var(--council-warning, #fbbf24);
      }

      .council-position-tier-badge {
        font-size: 0.65rem;
        padding: 2px 6px;
        border-radius: 4px;
        text-transform: uppercase;
      }

      .council-position-tier-badge.executive {
        background: var(--council-secondary, #764ba2);
        color: white;
      }

      .council-position-tier-badge.leader {
        background: var(--council-primary, #667eea);
        color: white;
      }

      .council-position-tier-badge.member {
        background: var(--council-bg-hover, rgba(255, 255, 255, 0.1));
        color: var(--council-text-muted);
      }

      .council-position-empty {
        color: var(--council-warning, #fbbf24);
        font-size: 0.85rem;
        font-style: italic;
      }

      /* Hierarchy view */
      .council-hierarchy-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 20px;
        margin-bottom: 24px;
        flex-wrap: wrap;
      }

      .council-company-name-section {
        flex: 1;
        min-width: 250px;
      }

      .council-company-name-input-row {
        display: flex;
        gap: 8px;
      }

      .council-company-name-input {
        flex: 1;
      }

      .council-hierarchy-stats {
        display: flex;
        gap: 16px;
      }

      .council-stat {
        text-align: center;
        padding: 8px 16px;
        background: var(--council-bg-secondary, rgba(255, 255, 255, 0.05));
        border-radius: var(--council-radius-md, 6px);
      }

      .council-stat.success {
        border: 1px solid var(--council-success, #4ade80);
      }

      .council-stat.warning {
        border: 1px solid var(--council-warning, #fbbf24);
      }

      .council-stat-value {
        display: block;
        font-size: 1.5rem;
        font-weight: 600;
        color: var(--council-text, #eee);
      }

      .council-stat-label {
        font-size: 0.75rem;
        color: var(--council-text-muted, rgba(255, 255, 255, 0.6));
      }

      /* Org chart */
      .council-org-chart {
        display: flex;
        flex-direction: column;
        gap: 24px;
      }

      .council-org-level {
        padding: 16px;
        background: var(--council-bg-secondary, rgba(255, 255, 255, 0.05));
        border-radius: var(--council-radius-lg, 8px);
      }

      .council-org-level-label {
        font-size: 0.8rem;
        text-transform: uppercase;
        color: var(--council-text-muted, rgba(255, 255, 255, 0.6));
        margin-bottom: 12px;
      }

      .council-org-positions {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
      }

      .council-org-teams-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 16px;
      }

      /* Team cards in hierarchy */
      .council-team-card {
        background: var(--council-bg-primary, #1a1a2e);
      }

      .council-team-leader,
      .council-team-members {
        margin-bottom: 12px;
      }

      .council-team-members-list {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      /* Position rows */
      .council-positions-grouped {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .council-position-group {
        background: var(--council-bg-secondary, rgba(255, 255, 255, 0.05));
        border-radius: var(--council-radius-lg, 8px);
        overflow: hidden;
      }

      .council-group-header {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px;
        background: var(--council-bg-hover, rgba(255, 255, 255, 0.1));
      }

      .council-group-name {
        font-weight: 600;
        color: var(--council-text, #eee);
      }

      .council-group-count {
        margin-left: auto;
        font-size: 0.8rem;
        color: var(--council-text-muted, rgba(255, 255, 255, 0.6));
      }

      .council-positions-list {
        padding: 8px;
      }

      .council-position-row {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 12px;
        border-radius: var(--council-radius-md, 6px);
        transition: background 0.15s ease;
      }

      .council-position-row:hover {
        background: var(--council-bg-hover, rgba(255, 255, 255, 0.1));
      }

      .council-position-row.unfilled {
        border-left: 3px solid var(--council-warning, #fbbf24);
      }

      .council-position-row-main {
        display: flex;
        align-items: center;
        gap: 8px;
        flex: 1;
      }

      .council-position-row-assignment {
        flex: 1;
        font-size: 0.85rem;
        color: var(--council-text-muted, rgba(255, 255, 255, 0.6));
      }

      .council-position-row-actions {
        display: flex;
        gap: 6px;
      }

      .council-mandatory-badge {
        font-size: 0.65rem;
        padding: 2px 6px;
        background: var(--council-info, #60a5fa);
        border-radius: 4px;
        color: white;
      }

      .council-empty-assignment {
        font-style: italic;
        color: var(--council-warning, #fbbf24);
      }

      /* Team rows */
      .council-teams-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .council-team-row {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 12px 16px;
        background: var(--council-bg-secondary, rgba(255, 255, 255, 0.05));
        border-radius: var(--council-radius-md, 6px);
        transition: background 0.15s ease;
      }

      .council-team-row:hover {
        background: var(--council-bg-hover, rgba(255, 255, 255, 0.1));
      }

      .council-team-row-main {
        display: flex;
        align-items: center;
        gap: 8px;
        flex: 1;
      }

      .council-team-row-info {
        display: flex;
        gap: 24px;
      }

      .council-team-row-actions {
        display: flex;
        gap: 6px;
      }

      /* Empty states */
      .council-empty-state {
        text-align: center;
        padding: 40px 20px;
      }

      .council-empty-icon {
        font-size: 3rem;
        margin-bottom: 16px;
      }

      .council-empty-text {
        font-size: 1.1rem;
        color: var(--council-text, #eee);
        margin-bottom: 8px;
      }

      .council-empty-description {
        font-size: 0.9rem;
        color: var(--council-text-muted, rgba(255, 255, 255, 0.6));
        margin-bottom: 16px;
      }

      /* Warning */
      .council-agents-warning {
        display: flex;
        gap: 12px;
        padding: 16px;
        background: rgba(251, 191, 36, 0.1);
        border: 1px solid var(--council-warning, #fbbf24);
        border-radius: var(--council-radius-md, 6px);
        margin-top: 16px;
      }

      .council-warning-icon {
        font-size: 1.5rem;
      }

      .council-warning-title {
        font-weight: 600;
        color: var(--council-warning, #fbbf24);
        margin-bottom: 4px;
      }

      .council-warning-text {
        font-size: 0.9rem;
        color: var(--council-text, #eee);
      }

      /* Dialogs */
      .council-dialog-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.8);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        animation: council-fadeIn 0.2s ease;
      }

      .council-dialog-overlay.closing {
        opacity: 0;
        transition: opacity 0.2s ease;
      }

      .council-dialog {
        width: 90%;
        max-width: 500px;
        max-height: 80vh;
        background: var(--council-bg-primary, #1a1a2e);
        border: 1px solid var(--council-border, #444);
        border-radius: var(--council-radius-lg, 8px);
        box-shadow: var(--council-shadow-lg, 0 16px 64px rgba(0, 0, 0, 0.5));
        display: flex;
        flex-direction: column;
        animation: council-slideUp 0.2s ease;
      }

      .council-dialog-sm {
        max-width: 400px;
      }

      .council-dialog-lg {
        max-width: 800px;
        max-height: 90vh;
      }

      .council-dialog-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 20px;
        border-bottom: 1px solid var(--council-border, #444);
      }

      .council-dialog-header h3 {
        margin: 0;
        font-size: 1.1rem;
        color: var(--council-text, #eee);
      }

      .council-dialog-close {
        background: transparent;
        border: none;
        font-size: 1.25rem;
        color: var(--council-text-muted, rgba(255, 255, 255, 0.6));
        cursor: pointer;
        padding: 4px;
        line-height: 1;
      }

      .council-dialog-close:hover {
        color: var(--council-text, #eee);
      }

      .council-dialog-body {
        flex: 1;
        overflow-y: auto;
        padding: 20px;
      }

      .council-dialog-body-scroll {
        max-height: 60vh;
      }

      .council-dialog-section {
        margin-bottom: 24px;
        padding-bottom: 20px;
        border-bottom: 1px solid var(--council-border, #444);
      }

      .council-dialog-section:last-child {
        margin-bottom: 0;
        padding-bottom: 0;
        border-bottom: none;
      }

      .council-dialog-section-title {
        font-size: 0.9rem;
        font-weight: 600;
        color: var(--council-primary, #667eea);
        margin: 0 0 16px 0;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .council-dialog-footer {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        padding: 16px 20px;
        border-top: 1px solid var(--council-border, #444);
      }

      /* Form elements */
      .council-form-group {
        margin-bottom: 16px;
      }

      .council-form-group:last-child {
        margin-bottom: 0;
      }

      .council-form-group-sm {
        flex: 0 0 150px;
      }

      .council-form-row {
        display: flex;
        gap: 16px;
      }

      .council-form-row .council-form-group {
        flex: 1;
      }

      .council-prompt-builder-container {
        min-height: 300px;
      }

      .council-form-label {
        display: block;
        font-size: 0.875rem;
        color: var(--council-text, #eee);
        margin-bottom: 6px;
      }

      .council-form-input,
      .council-form-select,
      .council-form-textarea {
        width: 100%;
        padding: 10px 12px;
        background: var(--council-bg-secondary, rgba(255, 255, 255, 0.05));
        border: 1px solid var(--council-border, #444);
        border-radius: var(--council-radius-md, 6px);
        color: var(--council-text, #eee);
        font-size: 0.9rem;
        font-family: inherit;
        transition: border-color 0.15s ease;
      }

      .council-form-input:focus,
      .council-form-select:focus,
      .council-form-textarea:focus {
        outline: none;
        border-color: var(--council-primary, #667eea);
      }

      .council-form-input:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      .council-form-textarea {
        min-height: 80px;
        resize: vertical;
      }

      .council-form-textarea-large {
        min-height: 150px;
      }

      .council-form-select {
        appearance: none;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23999' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: right 12px center;
        padding-right: 32px;
      }

      .council-form-hint {
        font-size: 0.75rem;
        color: var(--council-text-muted, rgba(255, 255, 255, 0.6));
        margin-top: 4px;
      }

      .council-checkbox-list {
        max-height: 200px;
        overflow-y: auto;
        padding: 8px;
        background: var(--council-bg-secondary, rgba(255, 255, 255, 0.05));
        border: 1px solid var(--council-border, #444);
        border-radius: var(--council-radius-md, 6px);
      }

      .council-checkbox-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 0;
        cursor: pointer;
      }

      .council-checkbox-item:hover {
        color: var(--council-primary, #667eea);
      }

      .council-checkbox-item input[type="checkbox"] {
        width: 16px;
        height: 16px;
        cursor: pointer;
      }

      /* Toast notifications */
      .council-toast {
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 12px 20px;
        background: var(--council-bg-primary, #1a1a2e);
        border: 1px solid var(--council-border, #444);
        border-radius: var(--council-radius-md, 6px);
        box-shadow: var(--council-shadow, 0 8px 32px rgba(0, 0, 0, 0.6));
        color: var(--council-text, #eee);
        font-size: 0.9rem;
        z-index: 10001;
        opacity: 0;
        transform: translateY(10px);
        transition: all 0.3s ease;
      }

      .council-toast.visible {
        opacity: 1;
        transform: translateY(0);
      }

      .council-toast-success {
        border-color: var(--council-success, #4ade80);
      }

      .council-toast-error {
        border-color: var(--council-error, #f87171);
      }

      .council-toast-info {
        border-color: var(--council-info, #60a5fa);
      }

      /* Utility classes */
      .muted {
        color: var(--council-text-muted, rgba(255, 255, 255, 0.6));
      }

      /* Section headers for grouping Pipeline vs Curation */
      .council-section-header {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px 16px;
        margin-bottom: 12px;
        background: var(--council-bg-hover, rgba(255, 255, 255, 0.1));
        border-radius: var(--council-radius-md, 6px);
        border-left: 3px solid var(--council-primary, #667eea);
      }

      .council-section-title {
        font-size: 0.95rem;
        font-weight: 600;
        color: var(--council-text, #eee);
      }

      .council-section-badge {
        font-size: 0.7rem;
        padding: 3px 8px;
        border-radius: 12px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .council-section-badge.curation {
        background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
        color: white;
      }

      .council-section-count {
        margin-left: auto;
        font-size: 0.8rem;
        color: var(--council-text-muted, rgba(255, 255, 255, 0.6));
      }

      /* Curation section styling */
      .council-curation-section {
        margin-top: 24px;
        padding-top: 20px;
        border-top: 1px dashed var(--council-border, #444);
      }

      .council-curation-section .council-section-header {
        border-left-color: #8b5cf6;
        background: linear-gradient(90deg, rgba(139, 92, 246, 0.15) 0%, transparent 100%);
      }

      .council-position-group.curation-team,
      .council-team-row.curation-team {
        border: 1px solid rgba(139, 92, 246, 0.3);
        background: linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(99, 102, 241, 0.05) 100%);
      }

      .council-position-group.curation-team .council-group-header {
        background: linear-gradient(90deg, rgba(139, 92, 246, 0.2) 0%, rgba(139, 92, 246, 0.1) 100%);
      }

      .council-team-row.curation-team::before {
        content: '📚';
        margin-right: 4px;
      }

      /* Position section containers */
      .council-position-section,
      .council-teams-section {
        margin-bottom: 20px;
      }

      .council-position-section:last-child,
      .council-teams-section:last-child {
        margin-bottom: 0;
      }

      /* Animations */
      @keyframes council-fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      @keyframes council-slideUp {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      /* Responsive - Tablet */
      @media (max-width: 900px) {
        .council-agents-modal {
          width: 95%;
          max-width: 95%;
        }

        .council-org-teams-grid {
          grid-template-columns: repeat(2, 1fr);
        }
      }

      /* Responsive - Mobile */
      @media (max-width: 768px) {
        .council-agents-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          width: 100% !important;
          max-width: 100% !important;
          height: 100% !important;
          max-height: 100% !important;
          border-radius: 0;
          transform: none;
        }

        .council-agents-modal.visible {
          transform: none;
        }

        .council-agents-header {
          padding: 12px 14px;
          flex-wrap: wrap;
          gap: 8px;
        }

        .council-agents-title {
          font-size: 1rem;
          flex: 1 1 100%;
          justify-content: center;
        }

        .council-agents-header-actions {
          flex: 1 1 100%;
          justify-content: center;
        }

        .council-agents-tabs {
          padding: 8px 12px;
          gap: 4px;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }

        .council-agents-tabs::-webkit-scrollbar {
          display: none;
        }

        .council-agents-tab {
          padding: 8px 12px;
          font-size: 0.8rem;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .council-agents-content {
          padding: 12px;
        }

        .council-agents-footer {
          padding: 10px 14px;
          flex-wrap: wrap;
          gap: 8px;
        }

        .council-agents-btn {
          min-height: 44px;
          padding: 10px 14px;
        }

        .council-agents-btn-sm {
          min-height: 36px;
          padding: 8px 10px;
        }

        .council-hierarchy-header {
          flex-direction: column;
          gap: 12px;
          text-align: center;
        }

        .council-hierarchy-stats {
          width: 100%;
          justify-content: center;
          flex-wrap: wrap;
          gap: 12px;
        }

        .council-stat-item {
          min-width: 70px;
        }

        .council-org-executive {
          padding: 12px;
        }

        .council-org-teams-grid {
          grid-template-columns: 1fr;
          gap: 12px;
        }

        .council-team-card {
          padding: 12px;
        }

        .council-agents-grid,
        .council-pools-grid {
          grid-template-columns: 1fr;
          gap: 10px;
        }

        .council-agent-card,
        .council-pool-card {
          padding: 12px;
        }

        .council-position-row {
          flex-direction: column;
          align-items: flex-start;
          gap: 10px;
          padding: 12px;
        }

        .council-position-row-main {
          width: 100%;
          flex-wrap: wrap;
        }

        .council-position-row-assignment {
          width: 100%;
          padding: 6px 0;
        }

        .council-position-row-actions {
          width: 100%;
          justify-content: flex-end;
          padding-top: 8px;
          border-top: 1px solid var(--council-border, #444);
        }

        .council-team-row {
          flex-direction: column;
          align-items: flex-start;
          gap: 10px;
          padding: 12px;
        }

        .council-team-row-main {
          width: 100%;
        }

        .council-team-row-info {
          width: 100%;
          flex-direction: column;
          gap: 6px;
        }

        .council-team-row-actions {
          width: 100%;
          justify-content: flex-end;
          padding-top: 8px;
          border-top: 1px solid var(--council-border, #444);
        }

        /* Section headers - mobile */
        .council-section-header {
          flex-wrap: wrap;
          padding: 10px 12px;
          gap: 8px;
        }

        .council-section-title {
          font-size: 0.85rem;
        }

        .council-position-section,
        .council-teams-section {
          margin-bottom: 16px;
        }

        /* Dialogs - Mobile full screen */
        .council-dialog-overlay[data-dialog] {
          padding: 0;
          align-items: flex-end;
        }

        .council-dialog {
          width: 100% !important;
          max-width: 100% !important;
          max-height: 90vh;
          margin: 0;
          border-radius: 12px 12px 0 0;
        }

        .council-dialog-header {
          padding: 14px 16px;
        }

        .council-dialog-header h3 {
          font-size: 1rem;
        }

        .council-dialog-body {
          padding: 14px 16px;
          max-height: calc(90vh - 130px);
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
        }

        .council-dialog-footer {
          padding: 12px 16px;
          flex-wrap: wrap;
          gap: 8px;
        }

        .council-dialog-footer .council-agents-btn {
          flex: 1 1 calc(50% - 4px);
        }

        /* Form elements - Mobile */
        .council-form-input,
        .council-form-select,
        .council-form-textarea {
          min-height: 44px;
          padding: 12px;
          font-size: 16px;
        }

        .council-form-row {
          flex-direction: column;
        }

        .council-form-row .council-form-group {
          flex: 1 1 100%;
        }

        .council-prompt-builder-container {
          min-height: 250px;
        }

        /* Empty states - Mobile */
        .council-empty-state {
          padding: 30px 16px;
        }

        .council-empty-icon {
          font-size: 2.5rem;
        }
      }

      /* Small Mobile */
      @media (max-width: 480px) {
        .council-agents-header {
          padding: 10px 12px;
        }

        .council-agents-title {
          font-size: 0.9rem;
        }

        .council-agents-tab {
          padding: 6px 10px;
          font-size: 0.75rem;
        }

        .council-dialog-footer .council-agents-btn {
          flex: 1 1 100%;
        }

        .council-position-tier-badge {
          font-size: 0.6rem;
          padding: 2px 5px;
        }
      }

      /* Touch devices */
      @media (hover: none) and (pointer: coarse) {
        .council-agents-btn {
          min-height: 44px;
        }

        .council-position-row-actions,
        .council-team-row-actions {
          opacity: 1;
        }

        .council-agents-btn:active {
          transform: scale(0.98);
          opacity: 0.9;
        }
      }

      /* Safe area for notched phones */
      @supports (padding: max(0px)) {
        @media (max-width: 768px) {
          .council-agents-modal {
            padding-bottom: env(safe-area-inset-bottom);
          }

          .council-dialog-footer {
            padding-bottom: max(12px, env(safe-area-inset-bottom));
          }
        }
      }
    `;

    document.head.appendChild(style);
  },
};

// Export for different environments
if (typeof window !== "undefined") {
  window.PipelineBuilderModal = PipelineBuilderModal;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = PipelineBuilderModal;
}
