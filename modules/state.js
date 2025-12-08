// modules/state.js - Global State Management for The Council
// Centralized state management for pipeline execution, threads, and runtime data

const CouncilState = {
  // ===== VERSION =====
  VERSION: "0.2.0",

  // ===== PIPELINE STATE =====
  pipeline: {
    isProcessing: false,
    currentPhaseIndex: -1,
    currentPhase: null,
    startedAt: null,
    completedAt: null,
    error: null,
    userInput: "",
    outline: "",
    drafts: {
      first: "",
      second: "",
      final: "",
    },
    activeSMEs: [],
    phaseResults: {},
  },

  // ===== STORY STATE =====
  story: {
    storyId: null,
    characterName: null,
    userName: null,
    chatId: null,
  },

  // ===== THREAD STATE =====
  threads: {},

  // ===== USER GAVEL STATE =====
  gavel: {
    isAwaiting: false,
    currentPhaseId: null,
    prompt: "",
    content: "",
    resolver: null,
  },

  // ===== AGENT STATE =====
  agents: {
    activeAgents: new Set(),
    dynamicCharacterAgents: new Map(), // Character-specific agents
    activeSMEs: new Map(), // Active subject matter experts
    callHistory: [], // Track API calls for debugging
    totalCalls: 0,
    totalTokens: 0,
  },

  // ===== CONTEXT STATE =====
  context: {
    isLoaded: false,
    lastRetrieved: null,
    lastProcessed: null,
    tokenBudget: 8000,
    usedTokens: 0,
  },

  // ===== UI STATE =====
  ui: {
    isPanelVisible: false,
    expandedThreads: new Set(),
    activeTab: "main",
    lastUpdate: null,
  },

  // ===== SETTINGS REFERENCE =====
  settings: null, // Will be populated from ST extension settings

  // ===== INITIALIZATION =====

  /**
   * Initialize state with default values
   */
  init(settings = null) {
    this.settings = settings;
    this.resetPipeline();
    this.resetThreads();
    this.resetAgents();
    this.resetContext();
    console.log("[Council State] Initialized");
    return this;
  },

  /**
   * Set story context
   */
  setStoryContext(storyId, characterName, userName, chatId) {
    this.story.storyId = storyId;
    this.story.characterName = characterName;
    this.story.userName = userName;
    this.story.chatId = chatId;
  },

  // ===== PIPELINE STATE MANAGEMENT =====

  /**
   * Reset pipeline state for a new run
   */
  resetPipeline() {
    this.pipeline = {
      isProcessing: false,
      currentPhaseIndex: -1,
      currentPhase: null,
      startedAt: null,
      completedAt: null,
      error: null,
      userInput: "",
      outline: "",
      drafts: {
        first: "",
        second: "",
        final: "",
      },
      activeSMEs: [],
      phaseResults: {},
    };
  },

  /**
   * Start pipeline processing
   */
  startPipeline(userInput) {
    this.resetPipeline();
    this.pipeline.isProcessing = true;
    this.pipeline.startedAt = Date.now();
    this.pipeline.userInput = userInput;
    this.emit("pipeline:start", { userInput });
  },

  /**
   * Set current phase
   */
  setPhase(phaseIndex, phase) {
    this.pipeline.currentPhaseIndex = phaseIndex;
    this.pipeline.currentPhase = phase;
    this.emit("pipeline:phase", { phaseIndex, phase });
  },

  /**
   * Record phase result
   */
  setPhaseResult(phaseId, result) {
    this.pipeline.phaseResults[phaseId] = {
      result,
      completedAt: Date.now(),
    };
  },

  /**
   * Set outline
   */
  setOutline(outline) {
    this.pipeline.outline = outline;
  },

  /**
   * Set draft
   */
  setDraft(version, content) {
    if (version === "first" || version === "second" || version === "final") {
      this.pipeline.drafts[version] = content;
      this.emit("pipeline:draft", { version, content });
    }
  },

  /**
   * Complete pipeline successfully
   */
  completePipeline() {
    this.pipeline.isProcessing = false;
    this.pipeline.completedAt = Date.now();
    this.emit("pipeline:complete", {
      duration: this.pipeline.completedAt - this.pipeline.startedAt,
    });
  },

  /**
   * Fail pipeline with error
   */
  failPipeline(error) {
    this.pipeline.isProcessing = false;
    this.pipeline.completedAt = Date.now();
    this.pipeline.error = error;
    this.emit("pipeline:error", { error });
  },

  /**
   * Abort pipeline safely
   */
  abortPipeline(reason = "User aborted") {
    if (!this.pipeline.isProcessing) return;
    this.pipeline.isProcessing = false;
    this.pipeline.abortedAt = Date.now();
    this.pipeline.error = reason;
    this.emit("pipeline:abort", { reason });
  },

  /**
   * Get pipeline progress (0-100)
   */
  getPipelineProgress(totalPhases) {
    if (this.pipeline.currentPhaseIndex < 0) return 0;
    return Math.round(
      ((this.pipeline.currentPhaseIndex + 1) / totalPhases) * 100,
    );
  },

  // ===== THREAD STATE MANAGEMENT =====

  /**
   * Reset all threads
   */
  resetThreads() {
    this.threads = {};
  },

  /**
   * Initialize a thread
   */
  initThread(threadId) {
    if (!this.threads[threadId]) {
      this.threads[threadId] = [];
    }
  },

  /**
   * Add entry to a thread
   */
  addToThread(threadId, agentId, agentName, content, metadata = {}) {
    this.initThread(threadId);

    const entry = {
      id: this.generateId(),
      timestamp: Date.now(),
      agentId,
      agentName,
      content,
      ...metadata,
    };

    this.threads[threadId].push(entry);
    this.emit("thread:entry", { threadId, entry });

    return entry;
  },

  /**
   * Get thread contents
   */
  getThread(threadId) {
    return this.threads[threadId] || [];
  },

  /**
   * Get all threads
   */
  getAllThreads() {
    return this.threads;
  },

  /**
   * Clear a specific thread
   */
  clearThread(threadId) {
    this.threads[threadId] = [];
    this.emit("thread:clear", { threadId });
  },

  /**
   * Get thread summary (for context)
   */
  getThreadSummary(threadId, maxEntries = 10) {
    const thread = this.threads[threadId] || [];
    const recent = thread.slice(-maxEntries);
    return recent.map((e) => `[${e.agentName}]: ${e.content}`).join("\n\n");
  },

  // ===== GAVEL STATE MANAGEMENT =====

  /**
   * Enter gavel awaiting state
   */
  awaitGavel(phaseId, prompt, content) {
    return new Promise((resolve) => {
      this.gavel = {
        isAwaiting: true,
        currentPhaseId: phaseId,
        prompt,
        content,
        resolver: resolve,
      };
      this.emit("gavel:await", { phaseId, prompt, content });
    });
  },

  /**
   * Submit gavel (user approved/edited)
   */
  submitGavel(editedContent) {
    if (this.gavel.resolver) {
      this.gavel.resolver(editedContent);
    }
    const phaseId = this.gavel.currentPhaseId;
    this.gavel = {
      isAwaiting: false,
      currentPhaseId: null,
      prompt: "",
      content: "",
      resolver: null,
    };
    this.emit("gavel:submit", { phaseId, editedContent });
  },

  /**
   * Skip gavel (use current content)
   */
  skipGavel() {
    const content = this.gavel.content;
    this.submitGavel(content);
  },

  // ===== AGENT STATE MANAGEMENT =====

  /**
   * Reset agent state
   */
  resetAgents() {
    this.agents = {
      activeAgents: new Set(),
      dynamicCharacterAgents: new Map(),
      activeSMEs: new Map(),
      callHistory: [],
      totalCalls: 0,
      totalTokens: 0,
    };
  },

  /**
   * Activate an agent
   */
  activateAgent(agentId) {
    this.agents.activeAgents.add(agentId);
  },

  /**
   * Deactivate an agent
   */
  deactivateAgent(agentId) {
    this.agents.activeAgents.delete(agentId);
  },

  /**
   * Add a dynamic character agent
   */
  addCharacterAgent(characterId, characterData) {
    const agentId = `character_${characterId}`;
    this.agents.dynamicCharacterAgents.set(agentId, {
      characterId,
      ...characterData,
      createdAt: Date.now(),
    });
    return agentId;
  },

  /**
   * Remove a dynamic character agent
   */
  removeCharacterAgent(agentId) {
    this.agents.dynamicCharacterAgents.delete(agentId);
  },

  /**
   * Activate an SME
   */
  activateSME(smeId, smeData) {
    this.agents.activeSMEs.set(smeId, {
      ...smeData,
      activatedAt: Date.now(),
    });
    this.pipeline.activeSMEs.push(smeId);
    this.emit("sme:activate", { smeId, smeData });
  },

  /**
   * Deactivate an SME
   */
  deactivateSME(smeId) {
    this.agents.activeSMEs.delete(smeId);
    const idx = this.pipeline.activeSMEs.indexOf(smeId);
    if (idx > -1) {
      this.pipeline.activeSMEs.splice(idx, 1);
    }
  },

  /**
   * Record an agent API call
   */
  recordAgentCall(agentId, promptTokens, responseTokens, duration, success) {
    this.agents.callHistory.push({
      agentId,
      promptTokens,
      responseTokens,
      duration,
      success,
      timestamp: Date.now(),
    });
    this.agents.totalCalls++;
    this.agents.totalTokens += (promptTokens || 0) + (responseTokens || 0);
  },

  /**
   * Get agent stats
   */
  getAgentStats() {
    return {
      totalCalls: this.agents.totalCalls,
      totalTokens: this.agents.totalTokens,
      activeAgents: this.agents.activeAgents.size,
      activeSMEs: this.agents.activeSMEs.size,
      dynamicCharacterAgents: this.agents.dynamicCharacterAgents.size,
      recentCalls: this.agents.callHistory.slice(-10),
    };
  },

  // ===== CONTEXT STATE MANAGEMENT =====

  /**
   * Reset context state
   */
  resetContext() {
    this.context = {
      isLoaded: false,
      lastRetrieved: null,
      lastProcessed: null,
      tokenBudget: 8000,
      usedTokens: 0,
    };
  },

  /**
   * Mark context as loaded
   */
  setContextLoaded(tokenEstimate = 0) {
    this.context.isLoaded = true;
    this.context.lastRetrieved = Date.now();
    this.context.usedTokens = tokenEstimate;
  },

  /**
   * Mark context as processed
   */
  setContextProcessed() {
    this.context.lastProcessed = Date.now();
  },

  /**
   * Get remaining token budget
   */
  getRemainingTokenBudget() {
    return Math.max(0, this.context.tokenBudget - this.context.usedTokens);
  },

  // ===== UI STATE MANAGEMENT =====

  /**
   * Toggle panel visibility
   */
  togglePanel() {
    this.ui.isPanelVisible = !this.ui.isPanelVisible;
    this.emit("ui:panel", { visible: this.ui.isPanelVisible });
  },

  /**
   * Show panel
   */
  showPanel() {
    this.ui.isPanelVisible = true;
    this.emit("ui:panel", { visible: true });
  },

  /**
   * Hide panel
   */
  hidePanel() {
    this.ui.isPanelVisible = false;
    this.emit("ui:panel", { visible: false });
  },

  /**
   * Toggle thread expansion
   */
  toggleThread(threadId) {
    if (this.ui.expandedThreads.has(threadId)) {
      this.ui.expandedThreads.delete(threadId);
    } else {
      this.ui.expandedThreads.add(threadId);
    }
    this.emit("ui:thread:toggle", {
      threadId,
      expanded: this.ui.expandedThreads.has(threadId),
    });
  },

  /**
   * Set active tab
   */
  setActiveTab(tabId) {
    this.ui.activeTab = tabId;
    this.emit("ui:tab", { tabId });
  },

  // ===== EVENT SYSTEM =====
  _listeners: new Map(),

  /**
   * Subscribe to state events
   */
  on(event, callback) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, []);
    }
    this._listeners.get(event).push(callback);
    return () => this.off(event, callback);
  },

  /**
   * Unsubscribe from state events
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
   * Emit a state event
   */
  emit(event, data = {}) {
    const listeners = this._listeners.get(event);
    if (listeners) {
      for (const callback of listeners) {
        try {
          callback(data);
        } catch (e) {
          console.error(`[Council State] Event handler error for ${event}:`, e);
        }
      }
    }

    // Also emit wildcard
    const wildcardListeners = this._listeners.get("*");
    if (wildcardListeners) {
      for (const callback of wildcardListeners) {
        try {
          callback({ event, ...data });
        } catch (e) {
          console.error(`[Council State] Wildcard handler error:`, e);
        }
      }
    }
  },

  // ===== UTILITY =====

  /**
   * Generate unique ID
   */
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  },

  /**
   * Get full state snapshot (for debugging)
   */
  getSnapshot() {
    return {
      version: this.VERSION,
      pipeline: { ...this.pipeline },
      story: { ...this.story },
      threadCounts: Object.fromEntries(
        Object.entries(this.threads).map(([k, v]) => [k, v.length]),
      ),
      gavel: {
        isAwaiting: this.gavel.isAwaiting,
        currentPhaseId: this.gavel.currentPhaseId,
      },
      agents: this.getAgentStats(),
      context: { ...this.context },
      ui: {
        isPanelVisible: this.ui.isPanelVisible,
        expandedThreads: Array.from(this.ui.expandedThreads),
        activeTab: this.ui.activeTab,
      },
    };
  },

  /**
   * Export state for persistence
   */
  exportState() {
    return JSON.stringify({
      pipeline: this.pipeline,
      threads: this.threads,
      story: this.story,
    });
  },

  /**
   * Import state from persistence
   */
  importState(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (data.pipeline) this.pipeline = { ...this.pipeline, ...data.pipeline };
      if (data.threads) this.threads = data.threads;
      if (data.story) this.story = data.story;
      return true;
    } catch (e) {
      console.error("[Council State] Import failed:", e);
      return false;
    }
  },
};

// Export for use in other modules
if (typeof window !== "undefined") {
  window.CouncilState = CouncilState;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = CouncilState;
}
