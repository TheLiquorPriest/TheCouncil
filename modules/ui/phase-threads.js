// modules/ui/phase-threads.js - Phase-Centric Thread View for The Council
// Displays threads organized by phase with real-time updates

const PhaseThreadsView = {
  // ===== VERSION =====
  VERSION: "1.0.0",

  // ===== MODULE REFERENCES =====
  _threadManager: null,
  _state: null,
  _config: null,

  // ===== DOM REFERENCES =====
  _container: null,
  _isVisible: false,
  _initialized: false,

  // ===== STATE =====
  _expandedPhases: new Set(),
  _expandedThreads: new Set(),
  _currentPhaseId: null,
  _phaseOrder: [],

  // ===== CONSTANTS =====
  THREAD_ICONS: {
    main_phase: "📋",
    collaboration: "💬",
    team: "👥",
    global_team: "🌐",
  },

  ENTRY_ICONS: {
    message: "💭",
    system: "⚙️",
    action: "⚡",
    decision: "✅",
    output: "📤",
    rag_request: "🔍",
    rag_response: "📚",
  },

  // ===== INITIALIZATION =====

  /**
   * Initialize the phase threads view
   * @param {Object} modules - Module references
   * @returns {PhaseThreadsView}
   */
  init(modules = {}) {
    console.log("[Phase Threads View] Initializing...");

    this._threadManager = modules.threadManager || window.ThreadManager || null;
    this._state = modules.state || window.CouncilState || null;
    this._config = modules.config || window.CouncilConfig || null;

    // Get phase order from config
    this._loadPhaseOrder();

    // Set up event listeners
    this._setupEventListeners();

    this._initialized = true;
    console.log("[Phase Threads View] Initialized");
    return this;
  },

  /**
   * Load phase order from config
   */
  _loadPhaseOrder() {
    const phases = this._config?.PIPELINE_PHASES || [];
    this._phaseOrder = phases.map((p) => p.id);
  },

  /**
   * Set up event listeners for real-time updates
   */
  _setupEventListeners() {
    // Listen to thread manager events
    if (this._threadManager) {
      this._threadManager.on?.("thread:entry", (data) => {
        this._handleThreadEntry(data);
      });

      this._threadManager.on?.("phase:begin", (data) => {
        this._handlePhaseBegin(data);
      });

      this._threadManager.on?.("phase:end", (data) => {
        this._handlePhaseEnd(data);
      });
    }

    // Listen to state events
    if (this._state) {
      this._state.on?.("phase:start", (data) => {
        this._currentPhaseId = data.phaseId;
        this._expandedPhases.add(data.phaseId);
        this.render();
      });

      this._state.on?.("phase:complete", (data) => {
        this.render();
      });

      this._state.on?.("pipeline:start", () => {
        this._expandedPhases.clear();
        this._expandedThreads.clear();
        this.render();
      });

      this._state.on?.("pipeline:complete", () => {
        this.render();
      });
    }
  },

  // ===== EVENT HANDLERS =====

  /**
   * Handle new thread entry
   * @param {Object} data - Entry data
   */
  _handleThreadEntry(data) {
    if (!this._isVisible) return;

    const { threadType, phaseId, threadId, teamId, entry } = data;

    // Auto-expand the phase with new activity
    if (phaseId) {
      this._expandedPhases.add(phaseId);
    }

    // Update just the affected thread section
    this._updateThreadSection(threadType, phaseId, threadId, teamId);

    // Scroll to new entry if in current phase
    if (phaseId === this._currentPhaseId) {
      this._scrollToLatestEntry(phaseId);
    }
  },

  /**
   * Handle phase begin
   * @param {Object} data - Phase data
   */
  _handlePhaseBegin(data) {
    this._currentPhaseId = data.phaseId;
    this._expandedPhases.add(data.phaseId);
    this.render();
  },

  /**
   * Handle phase end
   * @param {Object} data - Phase data
   */
  _handlePhaseEnd(data) {
    this.render();
  },

  // ===== RENDERING =====

  /**
   * Create the phase threads container
   * @returns {HTMLElement}
   */
  createContainer() {
    const container = document.createElement("div");
    container.id = "council-phase-threads-view";
    container.className = "council-phase-threads-view";
    container.innerHTML = `
      <div class="phase-threads-header">
        <h4>📋 Phase Threads</h4>
        <div class="phase-threads-controls">
          <button class="phase-threads-btn" id="phase-threads-expand-all" title="Expand All">⊞</button>
          <button class="phase-threads-btn" id="phase-threads-collapse-all" title="Collapse All">⊟</button>
          <button class="phase-threads-btn" id="phase-threads-refresh" title="Refresh">🔄</button>
        </div>
      </div>
      <div class="phase-threads-content" id="phase-threads-content">
        <div class="phase-threads-empty">No phases executed yet</div>
      </div>
    `;

    // Bind control events
    container
      .querySelector("#phase-threads-expand-all")
      ?.addEventListener("click", () => this.expandAll());
    container
      .querySelector("#phase-threads-collapse-all")
      ?.addEventListener("click", () => this.collapseAll());
    container
      .querySelector("#phase-threads-refresh")
      ?.addEventListener("click", () => this.render());

    this._container = container;
    return container;
  },

  /**
   * Render the full phase threads view
   */
  render() {
    if (!this._container) return;

    const content = this._container.querySelector("#phase-threads-content");
    if (!content) return;

    // Collect all phases with threads
    const phasesWithThreads = this._collectPhasesWithThreads();

    if (phasesWithThreads.length === 0) {
      content.innerHTML =
        '<div class="phase-threads-empty">No phases executed yet</div>';
      return;
    }

    // Render each phase
    const html = phasesWithThreads
      .map((phase) => this._renderPhaseSection(phase))
      .join("");

    content.innerHTML = html;

    // Bind phase events
    this._bindPhaseEvents(content);
  },

  /**
   * Collect all phases that have threads
   * @returns {Array} Array of phase data objects
   */
  _collectPhasesWithThreads() {
    if (!this._threadManager) return [];

    const phases = [];
    const seenPhases = new Set();

    // Get phases from main phase threads
    const mainThreads = this._threadManager._mainPhaseThreads || new Map();
    for (const [phaseId, thread] of mainThreads) {
      if (!seenPhases.has(phaseId)) {
        seenPhases.add(phaseId);
        phases.push(this._buildPhaseData(phaseId));
      }
    }

    // Sort by phase order
    phases.sort((a, b) => {
      const aIdx = this._phaseOrder.indexOf(a.id);
      const bIdx = this._phaseOrder.indexOf(b.id);
      if (aIdx === -1 && bIdx === -1) return 0;
      if (aIdx === -1) return 1;
      if (bIdx === -1) return -1;
      return aIdx - bIdx;
    });

    return phases;
  },

  /**
   * Build phase data object
   * @param {string} phaseId - Phase identifier
   * @returns {Object} Phase data
   */
  _buildPhaseData(phaseId) {
    const mainThread = this._threadManager.getMainThread(phaseId);
    const collaborationThreads =
      this._threadManager.getAllCollaborationThreads?.(phaseId) || {};
    const teamThreads = this._threadManager.getAllTeamThreads?.(phaseId) || {};

    // Get phase config for display name
    const phaseConfig = this._config?.PIPELINE_PHASES?.find(
      (p) => p.id === phaseId,
    );

    const totalEntries =
      (mainThread?.entries?.length || 0) +
      Object.values(collaborationThreads).reduce(
        (sum, t) => sum + (t.entries?.length || 0),
        0,
      ) +
      Object.values(teamThreads).reduce(
        (sum, t) => sum + (t.entries?.length || 0),
        0,
      );

    return {
      id: phaseId,
      name: phaseConfig?.name || this._formatPhaseId(phaseId),
      icon: phaseConfig?.icon || "📌",
      isCurrent: phaseId === this._currentPhaseId,
      isExpanded: this._expandedPhases.has(phaseId),
      mainThread,
      collaborationThreads,
      teamThreads,
      totalEntries,
    };
  },

  /**
   * Render a single phase section
   * @param {Object} phase - Phase data
   * @returns {string} HTML string
   */
  _renderPhaseSection(phase) {
    const statusClass = phase.isCurrent
      ? "current"
      : phase.totalEntries > 0
        ? "complete"
        : "pending";
    const expandedClass = phase.isExpanded ? "expanded" : "";

    const threadsHtml = phase.isExpanded ? this._renderPhaseThreads(phase) : "";

    return `
      <div class="phase-section ${statusClass} ${expandedClass}" data-phase="${phase.id}">
        <div class="phase-section-header">
          <div class="phase-section-title">
            <span class="phase-section-toggle">${phase.isExpanded ? "▼" : "▶"}</span>
            <span class="phase-section-icon">${phase.icon}</span>
            <span class="phase-section-name">${phase.name}</span>
            ${phase.isCurrent ? '<span class="phase-current-badge">Active</span>' : ""}
          </div>
          <div class="phase-section-meta">
            <span class="phase-entry-count">${phase.totalEntries} entries</span>
          </div>
        </div>
        <div class="phase-section-body">
          ${threadsHtml}
        </div>
      </div>
    `;
  },

  /**
   * Render all threads for a phase
   * @param {Object} phase - Phase data
   * @returns {string} HTML string
   */
  _renderPhaseThreads(phase) {
    const parts = [];

    // Main phase thread
    if (phase.mainThread) {
      parts.push(
        this._renderThread(
          phase.mainThread,
          "main_phase",
          phase.id,
          null,
          "Main Thread",
        ),
      );
    }

    // Collaboration threads
    for (const [threadId, thread] of Object.entries(
      phase.collaborationThreads,
    )) {
      parts.push(
        this._renderThread(
          thread,
          "collaboration",
          phase.id,
          threadId,
          thread.name || `Collaboration: ${threadId}`,
        ),
      );
    }

    // Team threads
    for (const [teamId, thread] of Object.entries(phase.teamThreads)) {
      parts.push(
        this._renderThread(
          thread,
          "team",
          phase.id,
          teamId,
          thread.name || `Team: ${teamId}`,
        ),
      );
    }

    if (parts.length === 0) {
      return '<div class="phase-no-threads">No threads in this phase</div>';
    }

    return parts.join("");
  },

  /**
   * Render a single thread
   * @param {Object} thread - Thread object
   * @param {string} type - Thread type
   * @param {string} phaseId - Phase identifier
   * @param {string} threadId - Thread/Team identifier
   * @param {string} label - Display label
   * @returns {string} HTML string
   */
  _renderThread(thread, type, phaseId, threadId, label) {
    const icon = this.THREAD_ICONS[type] || "📄";
    const entries = thread.entries || [];
    const threadKey = `${phaseId}_${type}_${threadId || "main"}`;
    const isExpanded = this._expandedThreads.has(threadKey);

    const entriesHtml = isExpanded
      ? this._renderThreadEntries(entries)
      : this._renderThreadPreview(entries);

    return `
      <div class="thread-section ${type}" data-thread-key="${threadKey}" data-phase="${phaseId}" data-type="${type}" data-thread-id="${threadId || ""}">
        <div class="thread-section-header">
          <span class="thread-section-toggle">${isExpanded ? "▼" : "▶"}</span>
          <span class="thread-section-icon">${icon}</span>
          <span class="thread-section-label">${label}</span>
          <span class="thread-section-count">(${entries.length})</span>
        </div>
        <div class="thread-section-body ${isExpanded ? "expanded" : "collapsed"}">
          ${entriesHtml}
        </div>
      </div>
    `;
  },

  /**
   * Render thread entries preview (collapsed view)
   * @param {Array} entries - Thread entries
   * @returns {string} HTML string
   */
  _renderThreadPreview(entries) {
    if (entries.length === 0) {
      return '<div class="thread-empty">No messages</div>';
    }

    // Show last 2 entries as preview
    const preview = entries.slice(-2);
    const html = preview
      .map((entry) => this._renderEntryCompact(entry))
      .join("");

    const remaining = entries.length - 2;
    const moreText =
      remaining > 0
        ? `<div class="thread-more">+${remaining} more messages</div>`
        : "";

    return html + moreText;
  },

  /**
   * Render all thread entries (expanded view)
   * @param {Array} entries - Thread entries
   * @returns {string} HTML string
   */
  _renderThreadEntries(entries) {
    if (entries.length === 0) {
      return '<div class="thread-empty">No messages</div>';
    }

    return entries.map((entry) => this._renderEntry(entry)).join("");
  },

  /**
   * Render a compact entry (for preview)
   * @param {Object} entry - Entry object
   * @returns {string} HTML string
   */
  _renderEntryCompact(entry) {
    const preview =
      entry.content.length > 100
        ? entry.content.substring(0, 100) + "..."
        : entry.content;

    return `
      <div class="thread-entry compact ${entry.entryType || "message"}">
        <span class="entry-agent">${this._escapeHtml(entry.agentName)}:</span>
        <span class="entry-preview">${this._escapeHtml(preview)}</span>
      </div>
    `;
  },

  /**
   * Render a full entry
   * @param {Object} entry - Entry object
   * @returns {string} HTML string
   */
  _renderEntry(entry) {
    const icon = this.ENTRY_ICONS[entry.entryType] || "💭";
    const time = new Date(entry.timestamp).toLocaleTimeString();

    return `
      <div class="thread-entry full ${entry.entryType || "message"}" data-entry-id="${entry.id}">
        <div class="entry-header">
          <span class="entry-icon">${icon}</span>
          <span class="entry-agent">${this._escapeHtml(entry.agentName)}</span>
          <span class="entry-time">${time}</span>
          ${entry.entryType && entry.entryType !== "message" ? `<span class="entry-type">${entry.entryType}</span>` : ""}
        </div>
        <div class="entry-content">${this._escapeHtml(entry.content)}</div>
      </div>
    `;
  },

  /**
   * Update a specific thread section
   * @param {string} threadType - Thread type
   * @param {string} phaseId - Phase identifier
   * @param {string} threadId - Thread identifier
   * @param {string} teamId - Team identifier
   */
  _updateThreadSection(threadType, phaseId, threadId, teamId) {
    if (!this._container) return;

    const threadKey = `${phaseId}_${threadType}_${threadId || teamId || "main"}`;
    const section = this._container.querySelector(
      `[data-thread-key="${threadKey}"]`,
    );

    if (!section) {
      // Thread section doesn't exist, need full re-render
      this.render();
      return;
    }

    // Get updated thread
    let thread;
    switch (threadType) {
      case "main_phase":
        thread = this._threadManager.getMainThread(phaseId);
        break;
      case "collaboration":
        thread = this._threadManager.getCollaborationThread(threadId, phaseId);
        break;
      case "team":
        thread = this._threadManager.getTeamThread(teamId, phaseId);
        break;
    }

    if (!thread) return;

    // Update entry count
    const countEl = section.querySelector(".thread-section-count");
    if (countEl) {
      countEl.textContent = `(${thread.entries.length})`;
    }

    // Update entries if expanded
    const isExpanded = this._expandedThreads.has(threadKey);
    const body = section.querySelector(".thread-section-body");
    if (body) {
      body.innerHTML = isExpanded
        ? this._renderThreadEntries(thread.entries)
        : this._renderThreadPreview(thread.entries);
    }

    // Update phase entry count
    this._updatePhaseEntryCount(phaseId);
  },

  /**
   * Update phase entry count
   * @param {string} phaseId - Phase identifier
   */
  _updatePhaseEntryCount(phaseId) {
    const phaseSection = this._container?.querySelector(
      `.phase-section[data-phase="${phaseId}"]`,
    );
    if (!phaseSection) return;

    const phase = this._buildPhaseData(phaseId);
    const countEl = phaseSection.querySelector(".phase-entry-count");
    if (countEl) {
      countEl.textContent = `${phase.totalEntries} entries`;
    }
  },

  /**
   * Bind events to phase sections
   * @param {HTMLElement} content - Content container
   */
  _bindPhaseEvents(content) {
    // Phase toggle
    content.querySelectorAll(".phase-section-header").forEach((header) => {
      header.addEventListener("click", (e) => {
        const section = e.currentTarget.closest(".phase-section");
        const phaseId = section?.dataset?.phase;
        if (phaseId) {
          this.togglePhase(phaseId);
        }
      });
    });

    // Thread toggle
    content.querySelectorAll(".thread-section-header").forEach((header) => {
      header.addEventListener("click", (e) => {
        e.stopPropagation();
        const section = e.currentTarget.closest(".thread-section");
        const threadKey = section?.dataset?.threadKey;
        if (threadKey) {
          this.toggleThread(threadKey);
        }
      });
    });
  },

  // ===== INTERACTION =====

  /**
   * Toggle phase expansion
   * @param {string} phaseId - Phase identifier
   */
  togglePhase(phaseId) {
    if (this._expandedPhases.has(phaseId)) {
      this._expandedPhases.delete(phaseId);
    } else {
      this._expandedPhases.add(phaseId);
    }
    this.render();
  },

  /**
   * Toggle thread expansion
   * @param {string} threadKey - Thread key
   */
  toggleThread(threadKey) {
    if (this._expandedThreads.has(threadKey)) {
      this._expandedThreads.delete(threadKey);
    } else {
      this._expandedThreads.add(threadKey);
    }

    // Just update this thread section
    const section = this._container?.querySelector(
      `[data-thread-key="${threadKey}"]`,
    );
    if (!section) return;

    const phaseId = section.dataset.phase;
    const type = section.dataset.type;
    const threadId = section.dataset.threadId;

    let thread;
    switch (type) {
      case "main_phase":
        thread = this._threadManager?.getMainThread(phaseId);
        break;
      case "collaboration":
        thread = this._threadManager?.getCollaborationThread(threadId, phaseId);
        break;
      case "team":
        thread = this._threadManager?.getTeamThread(threadId, phaseId);
        break;
    }

    if (!thread) return;

    const isExpanded = this._expandedThreads.has(threadKey);
    const toggle = section.querySelector(".thread-section-toggle");
    const body = section.querySelector(".thread-section-body");

    if (toggle) {
      toggle.textContent = isExpanded ? "▼" : "▶";
    }

    if (body) {
      body.className = `thread-section-body ${isExpanded ? "expanded" : "collapsed"}`;
      body.innerHTML = isExpanded
        ? this._renderThreadEntries(thread.entries)
        : this._renderThreadPreview(thread.entries);
    }
  },

  /**
   * Expand all phases and threads
   */
  expandAll() {
    const phases = this._collectPhasesWithThreads();
    for (const phase of phases) {
      this._expandedPhases.add(phase.id);

      // Expand main thread
      this._expandedThreads.add(`${phase.id}_main_phase_main`);

      // Expand collaboration threads
      for (const threadId of Object.keys(phase.collaborationThreads)) {
        this._expandedThreads.add(`${phase.id}_collaboration_${threadId}`);
      }

      // Expand team threads
      for (const teamId of Object.keys(phase.teamThreads)) {
        this._expandedThreads.add(`${phase.id}_team_${teamId}`);
      }
    }
    this.render();
  },

  /**
   * Collapse all phases and threads
   */
  collapseAll() {
    this._expandedPhases.clear();
    this._expandedThreads.clear();
    this.render();
  },

  /**
   * Scroll to latest entry in a phase
   * @param {string} phaseId - Phase identifier
   */
  _scrollToLatestEntry(phaseId) {
    const phaseSection = this._container?.querySelector(
      `.phase-section[data-phase="${phaseId}"]`,
    );
    if (!phaseSection) return;

    const entries = phaseSection.querySelectorAll(".thread-entry");
    if (entries.length > 0) {
      entries[entries.length - 1].scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  },

  // ===== VISIBILITY =====

  /**
   * Show the phase threads view
   */
  show() {
    this._isVisible = true;
    if (this._container) {
      this._container.style.display = "flex";
    }
    this.render();
  },

  /**
   * Hide the phase threads view
   */
  hide() {
    this._isVisible = false;
    if (this._container) {
      this._container.style.display = "none";
    }
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
   * @returns {boolean}
   */
  isVisible() {
    return this._isVisible;
  },

  // ===== UTILITY =====

  /**
   * Format phase ID to display name
   * @param {string} phaseId - Phase identifier
   * @returns {string} Formatted name
   */
  _formatPhaseId(phaseId) {
    return phaseId.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  },

  /**
   * Escape HTML characters
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  _escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  },

  /**
   * Check if initialized
   * @returns {boolean}
   */
  isInitialized() {
    return this._initialized;
  },

  /**
   * Get styles for the component
   * @returns {string} CSS styles
   */
  getStyles() {
    return `
      .council-phase-threads-view {
        display: flex;
        flex-direction: column;
        height: 100%;
        background: var(--council-bg, #1a1a2e);
        border-radius: 8px;
        overflow: hidden;
      }

      .phase-threads-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        background: var(--council-header-bg, #16213e);
        border-bottom: 1px solid var(--council-border, #0f3460);
      }

      .phase-threads-header h4 {
        margin: 0;
        font-size: 14px;
        color: var(--council-text, #e8e8e8);
      }

      .phase-threads-controls {
        display: flex;
        gap: 4px;
      }

      .phase-threads-btn {
        background: transparent;
        border: 1px solid var(--council-border, #0f3460);
        color: var(--council-text-muted, #a0a0a0);
        padding: 4px 8px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        transition: all 0.2s;
      }

      .phase-threads-btn:hover {
        background: var(--council-hover, #0f3460);
        color: var(--council-text, #e8e8e8);
      }

      .phase-threads-content {
        flex: 1;
        overflow-y: auto;
        padding: 8px;
      }

      .phase-threads-empty {
        text-align: center;
        color: var(--council-text-muted, #a0a0a0);
        padding: 40px 20px;
        font-style: italic;
      }

      /* Phase Sections */
      .phase-section {
        margin-bottom: 8px;
        border: 1px solid var(--council-border, #0f3460);
        border-radius: 6px;
        overflow: hidden;
      }

      .phase-section.current {
        border-color: var(--council-accent, #4a9eff);
        box-shadow: 0 0 8px rgba(74, 158, 255, 0.3);
      }

      .phase-section.complete {
        border-color: var(--council-success, #4caf50);
      }

      .phase-section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 12px;
        background: var(--council-header-bg, #16213e);
        cursor: pointer;
        transition: background 0.2s;
      }

      .phase-section-header:hover {
        background: var(--council-hover, #1a2744);
      }

      .phase-section-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 500;
        color: var(--council-text, #e8e8e8);
      }

      .phase-section-toggle {
        font-size: 10px;
        color: var(--council-text-muted, #a0a0a0);
        width: 12px;
      }

      .phase-section-icon {
        font-size: 14px;
      }

      .phase-section-name {
        font-size: 13px;
      }

      .phase-current-badge {
        background: var(--council-accent, #4a9eff);
        color: white;
        padding: 2px 6px;
        border-radius: 10px;
        font-size: 10px;
        font-weight: 600;
      }

      .phase-section-meta {
        display: flex;
        gap: 12px;
        font-size: 11px;
        color: var(--council-text-muted, #a0a0a0);
      }

      .phase-section-body {
        padding: 8px;
        display: none;
      }

      .phase-section.expanded .phase-section-body {
        display: block;
      }

      .phase-no-threads {
        text-align: center;
        color: var(--council-text-muted, #a0a0a0);
        padding: 20px;
        font-style: italic;
        font-size: 12px;
      }

      /* Thread Sections */
      .thread-section {
        margin-bottom: 6px;
        border: 1px solid var(--council-border-light, #2a3a5e);
        border-radius: 4px;
        background: var(--council-bg-light, #1e2a4a);
      }

      .thread-section.main_phase {
        border-left: 3px solid var(--council-accent, #4a9eff);
      }

      .thread-section.collaboration {
        border-left: 3px solid var(--council-info, #17a2b8);
      }

      .thread-section.team {
        border-left: 3px solid var(--council-warning, #ffc107);
      }

      .thread-section-header {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 8px 10px;
        cursor: pointer;
        font-size: 12px;
        color: var(--council-text, #e8e8e8);
        transition: background 0.2s;
      }

      .thread-section-header:hover {
        background: var(--council-hover, #253a5e);
      }

      .thread-section-toggle {
        font-size: 9px;
        color: var(--council-text-muted, #a0a0a0);
        width: 10px;
      }

      .thread-section-icon {
        font-size: 12px;
      }

      .thread-section-label {
        flex: 1;
      }

      .thread-section-count {
        color: var(--council-text-muted, #a0a0a0);
        font-size: 11px;
      }

      .thread-section-body {
        padding: 0;
        max-height: 0;
        overflow: hidden;
        transition: max-height 0.3s, padding 0.3s;
      }

      .thread-section-body.expanded {
        padding: 8px;
        max-height: 500px;
        overflow-y: auto;
      }

      .thread-section-body.collapsed {
        padding: 4px 8px;
        max-height: 80px;
      }

      .thread-empty {
        text-align: center;
        color: var(--council-text-muted, #a0a0a0);
        padding: 12px;
        font-style: italic;
        font-size: 11px;
      }

      .thread-more {
        text-align: center;
        color: var(--council-accent, #4a9eff);
        font-size: 11px;
        padding: 4px;
        cursor: pointer;
      }

      /* Thread Entries */
      .thread-entry {
        padding: 6px 8px;
        margin-bottom: 4px;
        border-radius: 4px;
        background: var(--council-bg, #1a1a2e);
        font-size: 12px;
      }

      .thread-entry.compact {
        padding: 4px 6px;
        display: flex;
        gap: 6px;
        align-items: baseline;
      }

      .thread-entry.full {
        padding: 8px 10px;
      }

      .thread-entry.system {
        background: var(--council-system-bg, #1a2a3e);
        border-left: 2px solid var(--council-info, #17a2b8);
      }

      .thread-entry.decision {
        background: var(--council-decision-bg, #1a3a2e);
        border-left: 2px solid var(--council-success, #4caf50);
      }

      .thread-entry.output {
        background: var(--council-output-bg, #2a2a3e);
        border-left: 2px solid var(--council-accent, #4a9eff);
      }

      .thread-entry.rag_request,
      .thread-entry.rag_response {
        background: var(--council-rag-bg, #2a1a3e);
        border-left: 2px solid var(--council-purple, #9c27b0);
      }

      .entry-header {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-bottom: 4px;
      }

      .entry-icon {
        font-size: 11px;
      }

      .entry-agent {
        font-weight: 600;
        color: var(--council-accent, #4a9eff);
        font-size: 11px;
      }

      .entry-time {
        color: var(--council-text-muted, #a0a0a0);
        font-size: 10px;
        margin-left: auto;
      }

      .entry-type {
        background: var(--council-border, #0f3460);
        padding: 1px 4px;
        border-radius: 3px;
        font-size: 9px;
        text-transform: uppercase;
      }

      .entry-content {
        color: var(--council-text, #e8e8e8);
        line-height: 1.4;
        white-space: pre-wrap;
        word-break: break-word;
      }

      .entry-preview {
        color: var(--council-text-muted, #a0a0a0);
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      /* Scrollbar styling */
      .phase-threads-content::-webkit-scrollbar,
      .thread-section-body::-webkit-scrollbar {
        width: 6px;
      }

      .phase-threads-content::-webkit-scrollbar-track,
      .thread-section-body::-webkit-scrollbar-track {
        background: var(--council-bg, #1a1a2e);
      }

      .phase-threads-content::-webkit-scrollbar-thumb,
      .thread-section-body::-webkit-scrollbar-thumb {
        background: var(--council-border, #0f3460);
        border-radius: 3px;
      }

      .phase-threads-content::-webkit-scrollbar-thumb:hover,
      .thread-section-body::-webkit-scrollbar-thumb:hover {
        background: var(--council-accent, #4a9eff);
      }
    `;
  },

  /**
   * Destroy and cleanup
   */
  destroy() {
    this._container?.remove();
    this._container = null;
    this._isVisible = false;
    this._initialized = false;
    this._expandedPhases.clear();
    this._expandedThreads.clear();
    console.log("[Phase Threads View] Destroyed");
  },
};

// Export for use in other modules
if (typeof window !== "undefined") {
  window.PhaseThreadsView = PhaseThreadsView;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = PhaseThreadsView;
}
