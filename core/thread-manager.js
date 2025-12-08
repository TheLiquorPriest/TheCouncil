/**
 * TheCouncil - Thread Manager
 *
 * Core module for managing conversation threads:
 * - Phase threads (global phase discussion)
 * - Team threads (team-specific discussion)
 * - Action threads (action-level conversation)
 * - Task threads (team task threads)
 * - RAG threads (retrieval context)
 *
 * Threads store conversation history and can be injected into
 * context during pipeline execution.
 *
 * @version 2.0.0
 */

const ThreadManager = {
  // ===== VERSION =====
  VERSION: "2.0.0",

  // ===== THREAD TYPES =====
  ThreadType: {
    PHASE: "phase",
    TEAM: "team",
    ACTION: "action",
    TASK: "task",
    RAG: "rag",
    CUSTOM: "custom",
  },

  // ===== MESSAGE ROLES =====
  Role: {
    SYSTEM: "system",
    USER: "user",
    ASSISTANT: "assistant",
    AGENT: "agent",
    NARRATOR: "narrator",
  },

  // ===== STATE =====

  /**
   * All threads
   * @type {Map<string, Object>}
   */
  _threads: new Map(),

  /**
   * Thread index by type
   * @type {Map<string, Set<string>>}
   */
  _threadsByType: new Map(),

  /**
   * Thread index by run
   * @type {Map<string, Set<string>>}
   */
  _threadsByRun: new Map(),

  /**
   * Default max messages per thread
   * @type {number}
   */
  _defaultMaxMessages: 100,

  /**
   * Dependencies
   */
  _tokenResolver: null,
  _logger: null,

  /**
   * Event listeners
   * @type {Map<string, Function[]>}
   */
  _listeners: new Map(),

  /**
   * Initialization flag
   * @type {boolean}
   */
  _initialized: false,

  // ===== INITIALIZATION =====

  /**
   * Initialize the Thread Manager
   * @param {Object} options - Configuration options
   * @returns {ThreadManager}
   */
  init(options = {}) {
    if (this._initialized) {
      this._log("warn", "ThreadManager already initialized");
      return this;
    }

    this._log("info", "Initializing Thread Manager...");

    this._logger = options.logger || null;
    this._tokenResolver = options.tokenResolver || null;
    this._defaultMaxMessages = options.defaultMaxMessages || 100;

    this.clear();

    // Initialize type indices
    for (const type of Object.values(this.ThreadType)) {
      this._threadsByType.set(type, new Set());
    }

    this._initialized = true;
    this._log("info", "Thread Manager initialized");
    this._emit("system:initialized");

    return this;
  },

  /**
   * Check if system is initialized
   * @returns {boolean}
   */
  isInitialized() {
    return this._initialized;
  },

  /**
   * Clear all threads
   */
  clear() {
    this._threads.clear();
    this._threadsByType.clear();
    this._threadsByRun.clear();
  },

  // ===== THREAD MANAGEMENT =====

  /**
   * Create a new thread
   * @param {Object} options - Thread options
   * @returns {Object} Created thread
   */
  createThread(options = {}) {
    const id = options.id || this._generateThreadId(options.type);

    if (this._threads.has(id)) {
      throw new Error(`Thread "${id}" already exists`);
    }

    const thread = {
      id,
      type: options.type || this.ThreadType.CUSTOM,
      name: options.name || id,
      runId: options.runId || null,
      phaseId: options.phaseId || null,
      teamId: options.teamId || null,
      actionId: options.actionId || null,
      maxMessages: options.maxMessages || this._defaultMaxMessages,
      messages: [],
      metadata: {
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messageCount: 0,
        ...options.metadata,
      },
      config: {
        firstMessage: options.firstMessage || "",
        preserveFirst: options.preserveFirst !== false,
        ...options.config,
      },
    };

    // Add first message if configured
    if (thread.config.firstMessage) {
      this._addMessageInternal(thread, {
        role: this.Role.SYSTEM,
        content: thread.config.firstMessage,
        isFirst: true,
      });
    }

    this._threads.set(id, thread);

    // Index by type
    if (!this._threadsByType.has(thread.type)) {
      this._threadsByType.set(thread.type, new Set());
    }
    this._threadsByType.get(thread.type).add(id);

    // Index by run
    if (thread.runId) {
      if (!this._threadsByRun.has(thread.runId)) {
        this._threadsByRun.set(thread.runId, new Set());
      }
      this._threadsByRun.get(thread.runId).add(id);
    }

    this._log("debug", `Thread created: ${id} (${thread.type})`);
    this._emit("thread:created", { thread });

    return thread;
  },

  /**
   * Get a thread by ID
   * @param {string} id - Thread ID
   * @returns {Object|null} Thread or null
   */
  getThread(id) {
    return this._threads.get(id) || null;
  },

  /**
   * Get or create a thread
   * @param {string} id - Thread ID
   * @param {Object} options - Creation options if thread doesn't exist
   * @returns {Object} Thread
   */
  getOrCreateThread(id, options = {}) {
    let thread = this._threads.get(id);
    if (!thread) {
      thread = this.createThread({ ...options, id });
    }
    return thread;
  },

  /**
   * Delete a thread
   * @param {string} id - Thread ID
   * @returns {boolean} Success
   */
  deleteThread(id) {
    const thread = this._threads.get(id);
    if (!thread) {
      return false;
    }

    // Remove from indices
    const typeSet = this._threadsByType.get(thread.type);
    if (typeSet) {
      typeSet.delete(id);
    }

    if (thread.runId) {
      const runSet = this._threadsByRun.get(thread.runId);
      if (runSet) {
        runSet.delete(id);
      }
    }

    this._threads.delete(id);

    this._log("debug", `Thread deleted: ${id}`);
    this._emit("thread:deleted", { id, thread });

    return true;
  },

  /**
   * Clear a thread's messages
   * @param {string} id - Thread ID
   * @param {boolean} keepFirst - Keep first message
   * @returns {boolean} Success
   */
  clearThread(id, keepFirst = true) {
    const thread = this._threads.get(id);
    if (!thread) {
      return false;
    }

    if (keepFirst && thread.messages.length > 0 && thread.messages[0].isFirst) {
      const first = thread.messages[0];
      thread.messages = [first];
      thread.metadata.messageCount = 1;
    } else {
      thread.messages = [];
      thread.metadata.messageCount = 0;
    }

    thread.metadata.updatedAt = Date.now();

    this._log("debug", `Thread cleared: ${id}`);
    this._emit("thread:cleared", { id, thread });

    return true;
  },

  /**
   * Generate a thread ID
   * @param {string} type - Thread type
   * @returns {string} Generated ID
   */
  _generateThreadId(type = "custom") {
    return `${type}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  },

  // ===== MESSAGE MANAGEMENT =====

  /**
   * Add a message to a thread
   * @param {string} threadId - Thread ID
   * @param {Object} message - Message object
   * @returns {Object|null} Added message or null
   */
  addMessage(threadId, message) {
    const thread = this._threads.get(threadId);
    if (!thread) {
      this._log("warn", `Thread "${threadId}" not found`);
      return null;
    }

    return this._addMessageInternal(thread, message);
  },

  /**
   * Internal message addition
   * @param {Object} thread - Thread object
   * @param {Object} message - Message object
   * @returns {Object} Added message
   */
  _addMessageInternal(thread, message) {
    const normalizedMessage = {
      id:
        message.id ||
        `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      role: message.role || this.Role.ASSISTANT,
      content: message.content || "",
      agentId: message.agentId || null,
      agentName: message.agentName || null,
      positionId: message.positionId || null,
      positionName: message.positionName || null,
      timestamp: message.timestamp || Date.now(),
      isFirst: message.isFirst || false,
      metadata: message.metadata || {},
    };

    thread.messages.push(normalizedMessage);
    thread.metadata.messageCount++;
    thread.metadata.updatedAt = Date.now();

    // Enforce max messages
    this._enforceMaxMessages(thread);

    this._emit("message:added", {
      threadId: thread.id,
      message: normalizedMessage,
    });

    return normalizedMessage;
  },

  /**
   * Enforce max messages limit
   * @param {Object} thread - Thread object
   */
  _enforceMaxMessages(thread) {
    if (thread.messages.length <= thread.maxMessages) {
      return;
    }

    const overflow = thread.messages.length - thread.maxMessages;

    // If preserving first message, keep it
    if (
      thread.config.preserveFirst &&
      thread.messages.length > 0 &&
      thread.messages[0].isFirst
    ) {
      // Remove from position 1
      thread.messages.splice(1, overflow);
    } else {
      // Remove from beginning
      thread.messages.splice(0, overflow);
    }

    thread.metadata.messageCount = thread.messages.length;
  },

  /**
   * Get messages from a thread
   * @param {string} threadId - Thread ID
   * @param {Object} options - Retrieval options
   * @returns {Object[]} Messages
   */
  getMessages(threadId, options = {}) {
    const thread = this._threads.get(threadId);
    if (!thread) {
      return [];
    }

    let messages = [...thread.messages];

    // Filter by role
    if (options.role) {
      messages = messages.filter((m) => m.role === options.role);
    }

    // Filter by agent
    if (options.agentId) {
      messages = messages.filter((m) => m.agentId === options.agentId);
    }

    // Limit
    if (options.limit && options.limit > 0) {
      if (options.fromEnd) {
        messages = messages.slice(-options.limit);
      } else {
        messages = messages.slice(0, options.limit);
      }
    }

    // Skip first
    if (options.skipFirst && messages.length > 0 && messages[0].isFirst) {
      messages = messages.slice(1);
    }

    return messages;
  },

  /**
   * Get last N messages from a thread
   * @param {string} threadId - Thread ID
   * @param {number} count - Number of messages
   * @returns {Object[]} Messages
   */
  getLastMessages(threadId, count = 10) {
    return this.getMessages(threadId, { limit: count, fromEnd: true });
  },

  /**
   * Get message count
   * @param {string} threadId - Thread ID
   * @returns {number} Message count
   */
  getMessageCount(threadId) {
    const thread = this._threads.get(threadId);
    return thread ? thread.metadata.messageCount : 0;
  },

  // ===== THREAD QUERIES =====

  /**
   * Get threads by type
   * @param {string} type - Thread type
   * @returns {Object[]} Threads
   */
  getThreadsByType(type) {
    const ids = this._threadsByType.get(type);
    if (!ids) return [];
    return Array.from(ids)
      .map((id) => this._threads.get(id))
      .filter(Boolean);
  },

  /**
   * Get threads by run ID
   * @param {string} runId - Run ID
   * @returns {Object[]} Threads
   */
  getThreadsByRun(runId) {
    const ids = this._threadsByRun.get(runId);
    if (!ids) return [];
    return Array.from(ids)
      .map((id) => this._threads.get(id))
      .filter(Boolean);
  },

  /**
   * Get thread for phase
   * @param {string} phaseId - Phase ID
   * @param {string} runId - Run ID (optional)
   * @returns {Object|null} Thread or null
   */
  getPhaseThread(phaseId, runId = null) {
    for (const thread of this._threads.values()) {
      if (thread.type === this.ThreadType.PHASE && thread.phaseId === phaseId) {
        if (!runId || thread.runId === runId) {
          return thread;
        }
      }
    }
    return null;
  },

  /**
   * Get thread for team in phase
   * @param {string} teamId - Team ID
   * @param {string} phaseId - Phase ID (optional)
   * @returns {Object|null} Thread or null
   */
  getTeamThread(teamId, phaseId = null) {
    for (const thread of this._threads.values()) {
      if (thread.type === this.ThreadType.TEAM && thread.teamId === teamId) {
        if (!phaseId || thread.phaseId === phaseId) {
          return thread;
        }
      }
    }
    return null;
  },

  /**
   * Get thread for action
   * @param {string} actionId - Action ID
   * @returns {Object|null} Thread or null
   */
  getActionThread(actionId) {
    for (const thread of this._threads.values()) {
      if (
        thread.type === this.ThreadType.ACTION &&
        thread.actionId === actionId
      ) {
        return thread;
      }
    }
    return null;
  },

  /**
   * Get all threads
   * @returns {Object[]} All threads
   */
  getAllThreads() {
    return Array.from(this._threads.values());
  },

  // ===== THREAD FORMATTING =====

  /**
   * Format thread as conversation string
   * @param {string} threadId - Thread ID
   * @param {Object} options - Formatting options
   * @returns {string} Formatted conversation
   */
  formatThread(threadId, options = {}) {
    const messages = this.getMessages(threadId, {
      skipFirst: options.skipFirst,
      limit: options.limit,
      fromEnd: options.fromEnd,
    });

    if (messages.length === 0) {
      return "";
    }

    const format = options.format || "dialogue";
    const parts = [];

    for (const msg of messages) {
      parts.push(this._formatMessage(msg, format, options));
    }

    return parts.join("\n\n");
  },

  /**
   * Format a single message
   * @param {Object} message - Message object
   * @param {string} format - Format type
   * @param {Object} options - Formatting options
   * @returns {string} Formatted message
   */
  _formatMessage(message, format, options = {}) {
    const speaker = message.agentName || message.positionName || message.role;

    switch (format) {
      case "dialogue":
        return `${speaker}: ${message.content}`;

      case "chat":
        return `[${speaker}]\n${message.content}`;

      case "markdown":
        return `**${speaker}:**\n${message.content}`;

      case "xml":
        return `<message role="${message.role}" speaker="${speaker}">\n${message.content}\n</message>`;

      case "plain":
        return message.content;

      default:
        return `${speaker}: ${message.content}`;
    }
  },

  /**
   * Format thread for context injection
   * @param {string} threadId - Thread ID
   * @param {Object} options - Options
   * @returns {Object} Context block
   */
  formatForContext(threadId, options = {}) {
    const thread = this._threads.get(threadId);
    if (!thread) {
      return { content: "", messageCount: 0 };
    }

    const content = this.formatThread(threadId, options);

    return {
      threadId,
      threadName: thread.name,
      threadType: thread.type,
      content,
      messageCount: thread.metadata.messageCount,
    };
  },

  // ===== RUN LIFECYCLE =====

  /**
   * Create threads for a pipeline run
   * @param {string} runId - Run ID
   * @param {Object} pipeline - Pipeline definition
   * @returns {Object} Created thread IDs
   */
  createRunThreads(runId, pipeline) {
    const threadIds = {
      phases: {},
      teams: {},
      actions: {},
    };

    for (const phase of pipeline.phases || []) {
      // Phase thread
      if (phase.threads?.phaseThread?.enabled !== false) {
        const phaseThread = this.createThread({
          id: `${runId}_phase_${phase.id}`,
          type: this.ThreadType.PHASE,
          name: `${phase.name} Thread`,
          runId,
          phaseId: phase.id,
          firstMessage: phase.threads?.phaseThread?.firstMessage || "",
          maxMessages: phase.threads?.phaseThread?.maxMessages,
        });
        threadIds.phases[phase.id] = phaseThread.id;
      }

      // Team threads
      for (const teamId of phase.teams || []) {
        const teamConfig = phase.threads?.teamThreads?.[teamId] || {};
        if (teamConfig.enabled !== false) {
          const teamThread = this.createThread({
            id: `${runId}_team_${phase.id}_${teamId}`,
            type: this.ThreadType.TEAM,
            name: `Team ${teamId} Thread`,
            runId,
            phaseId: phase.id,
            teamId,
            firstMessage: teamConfig.firstMessage || "",
            maxMessages: teamConfig.maxMessages,
          });
          if (!threadIds.teams[phase.id]) {
            threadIds.teams[phase.id] = {};
          }
          threadIds.teams[phase.id][teamId] = teamThread.id;
        }
      }

      // Action threads
      for (const action of phase.actions || []) {
        if (action.threads?.actionThread?.enabled !== false) {
          const actionThread = this.createThread({
            id: `${runId}_action_${phase.id}_${action.id}`,
            type: this.ThreadType.ACTION,
            name: `${action.name} Thread`,
            runId,
            phaseId: phase.id,
            actionId: action.id,
            firstMessage: action.threads?.actionThread?.firstMessage || "",
            maxMessages: action.threads?.actionThread?.maxMessages,
          });
          if (!threadIds.actions[phase.id]) {
            threadIds.actions[phase.id] = {};
          }
          threadIds.actions[phase.id][action.id] = actionThread.id;
        }
      }
    }

    this._log("info", `Created threads for run: ${runId}`);
    this._emit("run:threadsCreated", { runId, threadIds });

    return threadIds;
  },

  /**
   * Delete all threads for a run
   * @param {string} runId - Run ID
   * @returns {number} Number of threads deleted
   */
  deleteRunThreads(runId) {
    const threadIds = this._threadsByRun.get(runId);
    if (!threadIds) {
      return 0;
    }

    let count = 0;
    for (const id of Array.from(threadIds)) {
      if (this.deleteThread(id)) {
        count++;
      }
    }

    this._threadsByRun.delete(runId);

    this._log("info", `Deleted ${count} threads for run: ${runId}`);
    this._emit("run:threadsDeleted", { runId, count });

    return count;
  },

  // ===== EXPORT / IMPORT =====

  /**
   * Export a thread
   * @param {string} threadId - Thread ID
   * @returns {Object|null} Exported thread data
   */
  exportThread(threadId) {
    const thread = this._threads.get(threadId);
    if (!thread) {
      return null;
    }

    return {
      ...thread,
      exportedAt: Date.now(),
    };
  },

  /**
   * Export all threads
   * @returns {Object} Exported data
   */
  exportAll() {
    return {
      version: this.VERSION,
      exportedAt: Date.now(),
      threads: Array.from(this._threads.values()),
    };
  },

  /**
   * Import threads
   * @param {Object} data - Import data
   * @param {boolean} merge - Merge with existing
   * @returns {number} Number of threads imported
   */
  importThreads(data, merge = false) {
    if (!data.threads) {
      return 0;
    }

    if (!merge) {
      this.clear();
    }

    let count = 0;
    for (const thread of data.threads) {
      if (!merge || !this._threads.has(thread.id)) {
        this._threads.set(thread.id, thread);

        // Update indices
        if (!this._threadsByType.has(thread.type)) {
          this._threadsByType.set(thread.type, new Set());
        }
        this._threadsByType.get(thread.type).add(thread.id);

        if (thread.runId) {
          if (!this._threadsByRun.has(thread.runId)) {
            this._threadsByRun.set(thread.runId, new Set());
          }
          this._threadsByRun.get(thread.runId).add(thread.id);
        }

        count++;
      }
    }

    this._log("info", `Imported ${count} threads`);
    this._emit("threads:imported", { count });

    return count;
  },

  // ===== SUMMARY =====

  /**
   * Get system summary
   * @returns {Object}
   */
  getSummary() {
    const typeCounts = {};
    for (const [type, ids] of this._threadsByType) {
      typeCounts[type] = ids.size;
    }

    return {
      version: this.VERSION,
      initialized: this._initialized,
      threadCount: this._threads.size,
      threadsByType: typeCounts,
      runCount: this._threadsByRun.size,
      defaultMaxMessages: this._defaultMaxMessages,
    };
  },

  // ===== EVENT SYSTEM =====

  on(event, callback) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, []);
    }
    this._listeners.get(event).push(callback);
    return () => this.off(event, callback);
  },

  off(event, callback) {
    const listeners = this._listeners.get(event);
    if (listeners) {
      const idx = listeners.indexOf(callback);
      if (idx > -1) listeners.splice(idx, 1);
    }
  },

  _emit(event, data = {}) {
    const listeners = this._listeners.get(event);
    if (listeners) {
      for (const callback of listeners) {
        try {
          callback(data);
        } catch (e) {
          this._log("error", `Event handler error for ${event}:`, e);
        }
      }
    }
  },

  // ===== LOGGING =====

  _log(level, message, ...args) {
    if (this._logger && typeof this._logger[level] === "function") {
      this._logger[level](`[ThreadManager] ${message}`, ...args);
    }
  },
};

// Export for different environments
if (typeof window !== "undefined") {
  window.ThreadManager = ThreadManager;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = ThreadManager;
}
