// modules/threads/manager.js - Thread Manager for The Council
// Handles main phase threads, collaboration threads, and team threads

const ThreadManager = {
  // ===== VERSION =====
  VERSION: "1.0.0",

  // ===== THREAD STORAGE =====

  /**
   * Main Phase Threads
   * - One per phase (replaces centralized main thread)
   * - Global to all agents assigned to a phase
   * - Structure: Map<phaseId, Thread>
   */
  _mainPhaseThreads: new Map(),

  /**
   * Collaboration Threads
   * - Per phase, defined in phase definition
   * - For workshopping and discussion between agents
   * - Structure: Map<phaseId, Map<threadId, Thread>>
   */
  _collaborationThreads: new Map(),

  /**
   * Team Threads
   * - Per team, per phase
   * - For team-specific discussions
   * - Structure: Map<phaseId, Map<teamId, Thread>>
   */
  _teamThreads: new Map(),

  /**
   * Global Team Threads
   * - Per team, persistent across phases
   * - For ongoing team coordination
   * - Structure: Map<teamId, Thread>
   */
  _globalTeamThreads: new Map(),

  // ===== CONSTANTS =====

  /**
   * Thread types
   */
  THREAD_TYPES: {
    MAIN_PHASE: "main_phase",
    COLLABORATION: "collaboration",
    TEAM: "team",
    GLOBAL_TEAM: "global_team",
  },

  /**
   * Entry types for thread messages
   */
  ENTRY_TYPES: {
    MESSAGE: "message",
    SYSTEM: "system",
    ACTION: "action",
    DECISION: "decision",
    OUTPUT: "output",
    RAG_REQUEST: "rag_request",
    RAG_RESPONSE: "rag_response",
  },

  // ===== STATE =====

  /**
   * Current phase tracking
   */
  _currentPhaseId: null,

  /**
   * Initialization flag
   */
  _initialized: false,

  /**
   * Event listeners
   */
  _listeners: new Map(),

  // ===== INITIALIZATION =====

  /**
   * Initialize the thread manager
   * @param {Object} options - Initialization options
   * @returns {ThreadManager}
   */
  init(options = {}) {
    console.log("[Thread Manager] Initializing...");

    this.clear();
    this._initialized = true;

    // Initialize global team threads if teams provided
    if (options.teams) {
      for (const teamId of options.teams) {
        this._initGlobalTeamThread(teamId);
      }
    }

    console.log("[Thread Manager] Initialized successfully");
    return this;
  },

  /**
   * Clear all threads
   */
  clear() {
    this._mainPhaseThreads.clear();
    this._collaborationThreads.clear();
    this._teamThreads.clear();
    this._globalTeamThreads.clear();
    this._currentPhaseId = null;
  },

  /**
   * Reset for new pipeline run (preserves global team threads structure)
   */
  reset() {
    this._mainPhaseThreads.clear();
    this._collaborationThreads.clear();
    this._teamThreads.clear();
    this._currentPhaseId = null;

    // Clear entries in global team threads but keep structure
    for (const [teamId, thread] of this._globalTeamThreads) {
      thread.entries = [];
      thread.metadata.entryCount = 0;
      thread.metadata.updatedAt = null;
    }

    console.log("[Thread Manager] Reset for new pipeline run");
  },

  // ===== PHASE LIFECYCLE =====

  /**
   * Begin a new phase
   * @param {string} phaseId - Phase identifier
   * @param {Object} phaseConfig - Phase configuration with thread definitions
   */
  beginPhase(phaseId, phaseConfig = {}) {
    console.log(`[Thread Manager] Beginning phase "${phaseId}"`);
    this._currentPhaseId = phaseId;

    // Initialize main phase thread
    this._initMainPhaseThread(phaseId, phaseConfig);

    // Initialize collaboration threads if defined
    if (phaseConfig.threads?.collaboration) {
      for (const threadId of phaseConfig.threads.collaboration) {
        this._initCollaborationThread(phaseId, threadId);
      }
    }

    // Initialize team threads if defined
    if (phaseConfig.threads?.team) {
      for (const teamId of phaseConfig.threads.team) {
        this._initTeamThread(phaseId, teamId);
      }
    }

    this._emit("phase:begin", { phaseId, phaseConfig });
  },

  /**
   * End current phase
   * @param {string} phaseId - Phase identifier (optional, uses current)
   * @param {boolean} preserveThreads - Keep thread data for debugging
   */
  endPhase(phaseId = null, preserveThreads = false) {
    const targetPhaseId = phaseId || this._currentPhaseId;
    console.log(`[Thread Manager] Ending phase "${targetPhaseId}"`);

    if (!preserveThreads) {
      // Optionally archive threads before clearing
      // For now, we keep them for the duration of the pipeline run
    }

    if (targetPhaseId === this._currentPhaseId) {
      this._currentPhaseId = null;
    }

    this._emit("phase:end", { phaseId: targetPhaseId });
  },

  // ===== THREAD INITIALIZATION =====

  /**
   * Initialize a main phase thread
   * @param {string} phaseId - Phase identifier
   * @param {Object} config - Thread configuration
   */
  _initMainPhaseThread(phaseId, config = {}) {
    if (this._mainPhaseThreads.has(phaseId)) {
      return; // Already initialized
    }

    const thread = this._createThread({
      id: `main_${phaseId}`,
      type: this.THREAD_TYPES.MAIN_PHASE,
      name: config.threads?.main?.name || `Main Thread: ${phaseId}`,
      phaseId,
      initialPrompt: config.threads?.main?.initialPrompt || null,
    });

    this._mainPhaseThreads.set(phaseId, thread);
    console.log(
      `[Thread Manager] Main phase thread initialized for "${phaseId}"`,
    );
  },

  /**
   * Initialize a collaboration thread
   * @param {string} phaseId - Phase identifier
   * @param {string} threadId - Thread identifier
   * @param {Object} config - Thread configuration
   */
  _initCollaborationThread(phaseId, threadId, config = {}) {
    if (!this._collaborationThreads.has(phaseId)) {
      this._collaborationThreads.set(phaseId, new Map());
    }

    const phaseThreads = this._collaborationThreads.get(phaseId);
    if (phaseThreads.has(threadId)) {
      return; // Already initialized
    }

    const thread = this._createThread({
      id: threadId,
      type: this.THREAD_TYPES.COLLABORATION,
      name: config.name || `Collaboration: ${threadId}`,
      phaseId,
      initialPrompt: config.initialPrompt || null,
    });

    phaseThreads.set(threadId, thread);
    console.log(
      `[Thread Manager] Collaboration thread "${threadId}" initialized for phase "${phaseId}"`,
    );
  },

  /**
   * Initialize a team thread for a phase
   * @param {string} phaseId - Phase identifier
   * @param {string} teamId - Team identifier
   * @param {Object} config - Thread configuration
   */
  _initTeamThread(phaseId, teamId, config = {}) {
    if (!this._teamThreads.has(phaseId)) {
      this._teamThreads.set(phaseId, new Map());
    }

    const phaseTeamThreads = this._teamThreads.get(phaseId);
    if (phaseTeamThreads.has(teamId)) {
      return; // Already initialized
    }

    const thread = this._createThread({
      id: `team_${teamId}_${phaseId}`,
      type: this.THREAD_TYPES.TEAM,
      name: config.name || `Team Thread: ${teamId}`,
      phaseId,
      teamId,
      initialPrompt: config.initialPrompt || null,
    });

    phaseTeamThreads.set(teamId, thread);
    console.log(
      `[Thread Manager] Team thread for "${teamId}" initialized for phase "${phaseId}"`,
    );
  },

  /**
   * Initialize a global team thread
   * @param {string} teamId - Team identifier
   * @param {Object} config - Thread configuration
   */
  _initGlobalTeamThread(teamId, config = {}) {
    if (this._globalTeamThreads.has(teamId)) {
      return; // Already initialized
    }

    const thread = this._createThread({
      id: `global_team_${teamId}`,
      type: this.THREAD_TYPES.GLOBAL_TEAM,
      name: config.name || `Global Team: ${teamId}`,
      teamId,
    });

    this._globalTeamThreads.set(teamId, thread);
    console.log(
      `[Thread Manager] Global team thread initialized for "${teamId}"`,
    );
  },

  // ===== MAIN PHASE THREAD METHODS =====

  /**
   * Add entry to main phase thread
   * @param {string} agentId - Agent identifier
   * @param {string} agentName - Agent display name
   * @param {string} content - Entry content
   * @param {Object} options - Additional options
   * @param {string} phaseId - Phase identifier (optional, uses current)
   * @returns {Object} Created entry
   */
  addToMainThread(agentId, agentName, content, options = {}, phaseId = null) {
    const targetPhaseId = phaseId || this._currentPhaseId;

    if (!targetPhaseId) {
      console.error(
        "[Thread Manager] Cannot add to main thread - no phase active",
      );
      return null;
    }

    // Ensure thread exists
    if (!this._mainPhaseThreads.has(targetPhaseId)) {
      this._initMainPhaseThread(targetPhaseId);
    }

    const thread = this._mainPhaseThreads.get(targetPhaseId);
    const entry = this._createEntry(agentId, agentName, content, options);

    thread.entries.push(entry);
    thread.metadata.entryCount = thread.entries.length;
    thread.metadata.updatedAt = Date.now();
    thread.metadata.lastAgentId = agentId;

    this._emit("thread:entry", {
      threadType: this.THREAD_TYPES.MAIN_PHASE,
      phaseId: targetPhaseId,
      entry,
    });

    return entry;
  },

  /**
   * Get main phase thread
   * @param {string} phaseId - Phase identifier
   * @returns {Object} Thread object or null
   */
  getMainThread(phaseId = null) {
    const targetPhaseId = phaseId || this._currentPhaseId;
    return this._mainPhaseThreads.get(targetPhaseId) || null;
  },

  /**
   * Get main phase thread entries
   * @param {string} phaseId - Phase identifier
   * @param {number} limit - Max entries to return (0 = all)
   * @returns {Array} Thread entries
   */
  getMainThreadEntries(phaseId = null, limit = 0) {
    const thread = this.getMainThread(phaseId);
    if (!thread) return [];

    if (limit > 0) {
      return thread.entries.slice(-limit);
    }
    return [...thread.entries];
  },

  // ===== COLLABORATION THREAD METHODS =====

  /**
   * Add entry to collaboration thread
   * @param {string} threadId - Collaboration thread identifier
   * @param {string} agentId - Agent identifier
   * @param {string} agentName - Agent display name
   * @param {string} content - Entry content
   * @param {Object} options - Additional options
   * @param {string} phaseId - Phase identifier (optional, uses current)
   * @returns {Object} Created entry
   */
  addToCollaborationThread(
    threadId,
    agentId,
    agentName,
    content,
    options = {},
    phaseId = null,
  ) {
    const targetPhaseId = phaseId || this._currentPhaseId;

    if (!targetPhaseId) {
      console.error(
        "[Thread Manager] Cannot add to collaboration thread - no phase active",
      );
      return null;
    }

    // Ensure thread exists
    if (!this._collaborationThreads.has(targetPhaseId)) {
      this._collaborationThreads.set(targetPhaseId, new Map());
    }

    const phaseThreads = this._collaborationThreads.get(targetPhaseId);
    if (!phaseThreads.has(threadId)) {
      this._initCollaborationThread(targetPhaseId, threadId);
    }

    const thread = phaseThreads.get(threadId);
    const entry = this._createEntry(agentId, agentName, content, options);

    thread.entries.push(entry);
    thread.metadata.entryCount = thread.entries.length;
    thread.metadata.updatedAt = Date.now();
    thread.metadata.lastAgentId = agentId;

    this._emit("thread:entry", {
      threadType: this.THREAD_TYPES.COLLABORATION,
      phaseId: targetPhaseId,
      threadId,
      entry,
    });

    return entry;
  },

  /**
   * Get collaboration thread
   * @param {string} threadId - Thread identifier
   * @param {string} phaseId - Phase identifier
   * @returns {Object} Thread object or null
   */
  getCollaborationThread(threadId, phaseId = null) {
    const targetPhaseId = phaseId || this._currentPhaseId;

    if (!this._collaborationThreads.has(targetPhaseId)) {
      return null;
    }

    return this._collaborationThreads.get(targetPhaseId).get(threadId) || null;
  },

  /**
   * Get all collaboration threads for a phase
   * @param {string} phaseId - Phase identifier
   * @returns {Object} Map of threadId to thread
   */
  getAllCollaborationThreads(phaseId = null) {
    const targetPhaseId = phaseId || this._currentPhaseId;

    if (!this._collaborationThreads.has(targetPhaseId)) {
      return {};
    }

    const result = {};
    for (const [threadId, thread] of this._collaborationThreads.get(
      targetPhaseId,
    )) {
      result[threadId] = thread;
    }
    return result;
  },

  // ===== TEAM THREAD METHODS =====

  /**
   * Add entry to team thread
   * @param {string} teamId - Team identifier
   * @param {string} agentId - Agent identifier
   * @param {string} agentName - Agent display name
   * @param {string} content - Entry content
   * @param {Object} options - Additional options
   * @param {string} phaseId - Phase identifier (optional, uses current)
   * @returns {Object} Created entry
   */
  addToTeamThread(
    teamId,
    agentId,
    agentName,
    content,
    options = {},
    phaseId = null,
  ) {
    const targetPhaseId = phaseId || this._currentPhaseId;

    if (!targetPhaseId) {
      console.error(
        "[Thread Manager] Cannot add to team thread - no phase active",
      );
      return null;
    }

    // Ensure thread exists
    if (!this._teamThreads.has(targetPhaseId)) {
      this._teamThreads.set(targetPhaseId, new Map());
    }

    const phaseTeamThreads = this._teamThreads.get(targetPhaseId);
    if (!phaseTeamThreads.has(teamId)) {
      this._initTeamThread(targetPhaseId, teamId);
    }

    const thread = phaseTeamThreads.get(teamId);
    const entry = this._createEntry(agentId, agentName, content, options);

    thread.entries.push(entry);
    thread.metadata.entryCount = thread.entries.length;
    thread.metadata.updatedAt = Date.now();
    thread.metadata.lastAgentId = agentId;

    this._emit("thread:entry", {
      threadType: this.THREAD_TYPES.TEAM,
      phaseId: targetPhaseId,
      teamId,
      entry,
    });

    return entry;
  },

  /**
   * Get team thread for a phase
   * @param {string} teamId - Team identifier
   * @param {string} phaseId - Phase identifier
   * @returns {Object} Thread object or null
   */
  getTeamThread(teamId, phaseId = null) {
    const targetPhaseId = phaseId || this._currentPhaseId;

    if (!this._teamThreads.has(targetPhaseId)) {
      return null;
    }

    return this._teamThreads.get(targetPhaseId).get(teamId) || null;
  },

  /**
   * Get all team threads for a phase
   * @param {string} phaseId - Phase identifier
   * @returns {Object} Map of teamId to thread
   */
  getAllTeamThreads(phaseId = null) {
    const targetPhaseId = phaseId || this._currentPhaseId;

    if (!this._teamThreads.has(targetPhaseId)) {
      return {};
    }

    const result = {};
    for (const [teamId, thread] of this._teamThreads.get(targetPhaseId)) {
      result[teamId] = thread;
    }
    return result;
  },

  // ===== GLOBAL TEAM THREAD METHODS =====

  /**
   * Add entry to global team thread
   * @param {string} teamId - Team identifier
   * @param {string} agentId - Agent identifier
   * @param {string} agentName - Agent display name
   * @param {string} content - Entry content
   * @param {Object} options - Additional options
   * @returns {Object} Created entry
   */
  addToGlobalTeamThread(teamId, agentId, agentName, content, options = {}) {
    // Ensure thread exists
    if (!this._globalTeamThreads.has(teamId)) {
      this._initGlobalTeamThread(teamId);
    }

    const thread = this._globalTeamThreads.get(teamId);
    const entry = this._createEntry(agentId, agentName, content, {
      ...options,
      phaseId: this._currentPhaseId, // Track which phase this was added in
    });

    thread.entries.push(entry);
    thread.metadata.entryCount = thread.entries.length;
    thread.metadata.updatedAt = Date.now();
    thread.metadata.lastAgentId = agentId;

    this._emit("thread:entry", {
      threadType: this.THREAD_TYPES.GLOBAL_TEAM,
      teamId,
      entry,
    });

    return entry;
  },

  /**
   * Get global team thread
   * @param {string} teamId - Team identifier
   * @returns {Object} Thread object or null
   */
  getGlobalTeamThread(teamId) {
    return this._globalTeamThreads.get(teamId) || null;
  },

  /**
   * Get all global team threads
   * @returns {Object} Map of teamId to thread
   */
  getAllGlobalTeamThreads() {
    const result = {};
    for (const [teamId, thread] of this._globalTeamThreads) {
      result[teamId] = thread;
    }
    return result;
  },

  // ===== UNIFIED ENTRY METHODS =====

  /**
   * Add entry to any thread type
   * @param {string} threadType - Thread type
   * @param {Object} identifiers - Thread identifiers { phaseId, threadId, teamId }
   * @param {string} agentId - Agent identifier
   * @param {string} agentName - Agent display name
   * @param {string} content - Entry content
   * @param {Object} options - Additional options
   * @returns {Object} Created entry or null
   */
  addEntry(threadType, identifiers, agentId, agentName, content, options = {}) {
    switch (threadType) {
      case this.THREAD_TYPES.MAIN_PHASE:
        return this.addToMainThread(
          agentId,
          agentName,
          content,
          options,
          identifiers.phaseId,
        );

      case this.THREAD_TYPES.COLLABORATION:
        return this.addToCollaborationThread(
          identifiers.threadId,
          agentId,
          agentName,
          content,
          options,
          identifiers.phaseId,
        );

      case this.THREAD_TYPES.TEAM:
        return this.addToTeamThread(
          identifiers.teamId,
          agentId,
          agentName,
          content,
          options,
          identifiers.phaseId,
        );

      case this.THREAD_TYPES.GLOBAL_TEAM:
        return this.addToGlobalTeamThread(
          identifiers.teamId,
          agentId,
          agentName,
          content,
          options,
        );

      default:
        console.error(`[Thread Manager] Unknown thread type: ${threadType}`);
        return null;
    }
  },

  /**
   * Add system message to thread
   * @param {string} threadType - Thread type
   * @param {Object} identifiers - Thread identifiers
   * @param {string} content - System message content
   * @param {Object} options - Additional options
   * @returns {Object} Created entry
   */
  addSystemMessage(threadType, identifiers, content, options = {}) {
    return this.addEntry(threadType, identifiers, "system", "System", content, {
      ...options,
      entryType: this.ENTRY_TYPES.SYSTEM,
    });
  },

  /**
   * Add decision marker to thread
   * @param {string} threadType - Thread type
   * @param {Object} identifiers - Thread identifiers
   * @param {string} agentId - Agent that made the decision
   * @param {string} agentName - Agent display name
   * @param {string} decision - Decision content
   * @param {Object} options - Additional options
   * @returns {Object} Created entry
   */
  addDecision(
    threadType,
    identifiers,
    agentId,
    agentName,
    decision,
    options = {},
  ) {
    return this.addEntry(
      threadType,
      identifiers,
      agentId,
      agentName,
      decision,
      {
        ...options,
        entryType: this.ENTRY_TYPES.DECISION,
        isDecision: true,
      },
    );
  },

  /**
   * Add output reference to thread
   * @param {string} threadType - Thread type
   * @param {Object} identifiers - Thread identifiers
   * @param {string} outputType - Type of output produced
   * @param {string} outputSummary - Brief summary of output
   * @param {Object} options - Additional options
   * @returns {Object} Created entry
   */
  addOutputReference(
    threadType,
    identifiers,
    outputType,
    outputSummary,
    options = {},
  ) {
    const content = `[Output: ${outputType}] ${outputSummary}`;
    return this.addEntry(threadType, identifiers, "system", "Output", content, {
      ...options,
      entryType: this.ENTRY_TYPES.OUTPUT,
      outputType,
    });
  },

  // ===== FORMATTING METHODS =====

  /**
   * Format thread for prompt injection
   * @param {Object} thread - Thread object
   * @param {Object} options - Formatting options
   * @returns {string} Formatted thread content
   */
  formatThreadForPrompt(thread, options = {}) {
    if (!thread || !thread.entries || thread.entries.length === 0) {
      return "";
    }

    const {
      maxEntries = 20,
      maxLength = 4000,
      includeTimestamps = false,
      includeTypes = false,
      separator = "\n\n",
    } = options;

    const entries = thread.entries.slice(-maxEntries);
    const parts = [];
    let totalLength = 0;

    for (const entry of entries) {
      const formatted = this._formatEntry(entry, {
        includeTimestamps,
        includeTypes,
      });

      if (totalLength + formatted.length > maxLength) {
        parts.push("[...earlier discussion truncated...]");
        break;
      }

      parts.push(formatted);
      totalLength += formatted.length;
    }

    return parts.join(separator);
  },

  /**
   * Format a single entry
   * @param {Object} entry - Entry object
   * @param {Object} options - Formatting options
   * @returns {string} Formatted entry
   */
  _formatEntry(entry, options = {}) {
    const { includeTimestamps = false, includeTypes = false } = options;

    let prefix = `[${entry.agentName}]`;

    if (includeTimestamps) {
      const time = new Date(entry.timestamp).toLocaleTimeString();
      prefix = `[${time}] ${prefix}`;
    }

    if (
      includeTypes &&
      entry.entryType &&
      entry.entryType !== this.ENTRY_TYPES.MESSAGE
    ) {
      prefix = `${prefix} (${entry.entryType})`;
    }

    return `${prefix}: ${entry.content}`;
  },

  /**
   * Format multiple threads for prompt injection
   * @param {Array} threads - Array of { thread, label } objects
   * @param {Object} options - Formatting options
   * @returns {string} Combined formatted output
   */
  formatMultipleThreads(threads, options = {}) {
    const { maxTotalLength = 8000, threadSeparator = "\n\n---\n\n" } = options;

    const parts = [];
    let totalLength = 0;
    const perThreadLimit = Math.floor(maxTotalLength / threads.length);

    for (const { thread, label } of threads) {
      if (!thread) continue;

      const formatted = this.formatThreadForPrompt(thread, {
        ...options,
        maxLength: perThreadLimit,
      });

      if (formatted) {
        const section = label ? `=== ${label} ===\n${formatted}` : formatted;

        if (totalLength + section.length <= maxTotalLength) {
          parts.push(section);
          totalLength += section.length;
        }
      }
    }

    return parts.join(threadSeparator);
  },

  /**
   * Get thread summary (for context/debugging)
   * @param {Object} thread - Thread object
   * @param {number} recentCount - Number of recent entries to summarize
   * @returns {Object} Thread summary
   */
  getThreadSummary(thread, recentCount = 5) {
    if (!thread) {
      return { exists: false };
    }

    const recentEntries = thread.entries.slice(-recentCount);
    const agentParticipation = {};

    for (const entry of thread.entries) {
      agentParticipation[entry.agentId] =
        (agentParticipation[entry.agentId] || 0) + 1;
    }

    return {
      exists: true,
      id: thread.id,
      type: thread.type,
      name: thread.name,
      entryCount: thread.entries.length,
      agentParticipation,
      recentSummary: recentEntries.map((e) => ({
        agent: e.agentName,
        preview:
          e.content.substring(0, 100) + (e.content.length > 100 ? "..." : ""),
        type: e.entryType,
      })),
      lastUpdated: thread.metadata.updatedAt,
    };
  },

  // ===== HELPER METHODS =====

  /**
   * Create a new thread object
   * @param {Object} config - Thread configuration
   * @returns {Object} Thread object
   */
  _createThread(config) {
    return {
      id: config.id,
      type: config.type,
      name: config.name,
      phaseId: config.phaseId || null,
      teamId: config.teamId || null,
      entries: [],
      initialPrompt: config.initialPrompt || null,
      metadata: {
        createdAt: Date.now(),
        updatedAt: null,
        entryCount: 0,
        lastAgentId: null,
      },
    };
  },

  /**
   * Create a new thread entry
   * @param {string} agentId - Agent identifier
   * @param {string} agentName - Agent display name
   * @param {string} content - Entry content
   * @param {Object} options - Additional options
   * @returns {Object} Entry object
   */
  _createEntry(agentId, agentName, content, options = {}) {
    return {
      id: this._generateId(),
      timestamp: Date.now(),
      agentId,
      agentName,
      content,
      entryType: options.entryType || this.ENTRY_TYPES.MESSAGE,
      phaseId: options.phaseId || this._currentPhaseId,
      ...options,
    };
  },

  /**
   * Generate unique ID
   * @returns {string}
   */
  _generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  },

  // ===== EVENT SYSTEM =====

  /**
   * Subscribe to thread events
   * @param {string} event - Event name
   * @param {Function} callback - Event handler
   * @returns {Function} Unsubscribe function
   */
  on(event, callback) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, []);
    }
    this._listeners.get(event).push(callback);
    return () => this.off(event, callback);
  },

  /**
   * Unsubscribe from thread events
   * @param {string} event - Event name
   * @param {Function} callback - Event handler
   */
  off(event, callback) {
    const listeners = this._listeners.get(event);
    if (listeners) {
      const idx = listeners.indexOf(callback);
      if (idx > -1) {
        listeners.splice(idx, 1);
      }
    }
  },

  /**
   * Emit a thread event
   * @param {string} event - Event name
   * @param {Object} data - Event data
   */
  _emit(event, data = {}) {
    const listeners = this._listeners.get(event);
    if (listeners) {
      for (const callback of listeners) {
        try {
          callback(data);
        } catch (e) {
          console.error(
            `[Thread Manager] Event handler error for ${event}:`,
            e,
          );
        }
      }
    }
  },

  // ===== DIAGNOSTICS & DEBUGGING =====

  /**
   * Get summary of all threads
   * @returns {Object} Summary statistics
   */
  getSummary() {
    const mainPhaseThreads = {};
    for (const [phaseId, thread] of this._mainPhaseThreads) {
      mainPhaseThreads[phaseId] = thread.entries.length;
    }

    const collaborationThreads = {};
    for (const [phaseId, threads] of this._collaborationThreads) {
      collaborationThreads[phaseId] = {};
      for (const [threadId, thread] of threads) {
        collaborationThreads[phaseId][threadId] = thread.entries.length;
      }
    }

    const teamThreads = {};
    for (const [phaseId, teams] of this._teamThreads) {
      teamThreads[phaseId] = {};
      for (const [teamId, thread] of teams) {
        teamThreads[phaseId][teamId] = thread.entries.length;
      }
    }

    const globalTeamThreads = {};
    for (const [teamId, thread] of this._globalTeamThreads) {
      globalTeamThreads[teamId] = thread.entries.length;
    }

    return {
      initialized: this._initialized,
      currentPhase: this._currentPhaseId,
      mainPhaseThreads,
      collaborationThreads,
      teamThreads,
      globalTeamThreads,
    };
  },

  /**
   * Get debug snapshot
   * @returns {Object} Full state for debugging
   */
  getDebugSnapshot() {
    const mainPhaseThreads = {};
    for (const [phaseId, thread] of this._mainPhaseThreads) {
      mainPhaseThreads[phaseId] = this.getThreadSummary(thread);
    }

    const collaborationThreads = {};
    for (const [phaseId, threads] of this._collaborationThreads) {
      collaborationThreads[phaseId] = {};
      for (const [threadId, thread] of threads) {
        collaborationThreads[phaseId][threadId] = this.getThreadSummary(thread);
      }
    }

    const teamThreads = {};
    for (const [phaseId, teams] of this._teamThreads) {
      teamThreads[phaseId] = {};
      for (const [teamId, thread] of teams) {
        teamThreads[phaseId][teamId] = this.getThreadSummary(thread);
      }
    }

    const globalTeamThreads = {};
    for (const [teamId, thread] of this._globalTeamThreads) {
      globalTeamThreads[teamId] = this.getThreadSummary(thread);
    }

    return {
      summary: this.getSummary(),
      mainPhaseThreads,
      collaborationThreads,
      teamThreads,
      globalTeamThreads,
    };
  },

  /**
   * Check if manager is initialized
   * @returns {boolean}
   */
  isInitialized() {
    return this._initialized;
  },

  /**
   * Get current phase ID
   * @returns {string|null}
   */
  getCurrentPhaseId() {
    return this._currentPhaseId;
  },

  /**
   * Get total entry count across all threads
   * @returns {number}
   */
  getTotalEntryCount() {
    let total = 0;

    for (const thread of this._mainPhaseThreads.values()) {
      total += thread.entries.length;
    }

    for (const threads of this._collaborationThreads.values()) {
      for (const thread of threads.values()) {
        total += thread.entries.length;
      }
    }

    for (const teams of this._teamThreads.values()) {
      for (const thread of teams.values()) {
        total += thread.entries.length;
      }
    }

    for (const thread of this._globalTeamThreads.values()) {
      total += thread.entries.length;
    }

    return total;
  },

  // ===== EXPORT / IMPORT =====

  /**
   * Export all threads for persistence
   * @returns {Object} Exportable state
   */
  export() {
    const mainPhaseThreads = {};
    for (const [phaseId, thread] of this._mainPhaseThreads) {
      mainPhaseThreads[phaseId] = thread;
    }

    const collaborationThreads = {};
    for (const [phaseId, threads] of this._collaborationThreads) {
      collaborationThreads[phaseId] = {};
      for (const [threadId, thread] of threads) {
        collaborationThreads[phaseId][threadId] = thread;
      }
    }

    const teamThreads = {};
    for (const [phaseId, teams] of this._teamThreads) {
      teamThreads[phaseId] = {};
      for (const [teamId, thread] of teams) {
        teamThreads[phaseId][teamId] = thread;
      }
    }

    const globalTeamThreads = {};
    for (const [teamId, thread] of this._globalTeamThreads) {
      globalTeamThreads[teamId] = thread;
    }

    return {
      version: this.VERSION,
      exportedAt: Date.now(),
      mainPhaseThreads,
      collaborationThreads,
      teamThreads,
      globalTeamThreads,
    };
  },

  /**
   * Import threads from exported state
   * @param {Object} data - Exported data
   * @returns {boolean} Success status
   */
  import(data) {
    try {
      if (!data || !data.version) {
        console.error("[Thread Manager] Invalid import data");
        return false;
      }

      // Clear existing
      this._mainPhaseThreads.clear();
      this._collaborationThreads.clear();
      this._teamThreads.clear();
      this._globalTeamThreads.clear();

      // Import main phase threads
      if (data.mainPhaseThreads) {
        for (const [phaseId, thread] of Object.entries(data.mainPhaseThreads)) {
          this._mainPhaseThreads.set(phaseId, thread);
        }
      }

      // Import collaboration threads
      if (data.collaborationThreads) {
        for (const [phaseId, threads] of Object.entries(
          data.collaborationThreads,
        )) {
          this._collaborationThreads.set(
            phaseId,
            new Map(Object.entries(threads)),
          );
        }
      }

      // Import team threads
      if (data.teamThreads) {
        for (const [phaseId, teams] of Object.entries(data.teamThreads)) {
          this._teamThreads.set(phaseId, new Map(Object.entries(teams)));
        }
      }

      // Import global team threads
      if (data.globalTeamThreads) {
        for (const [teamId, thread] of Object.entries(data.globalTeamThreads)) {
          this._globalTeamThreads.set(teamId, thread);
        }
      }

      console.log("[Thread Manager] Import successful");
      return true;
    } catch (e) {
      console.error("[Thread Manager] Import failed:", e);
      return false;
    }
  },
};

// Export for use in other modules
if (typeof window !== "undefined") {
  window.ThreadManager = ThreadManager;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = ThreadManager;
}
