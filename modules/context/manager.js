// modules/context/manager.js - Context Block Manager for The Council
// Handles all five context block types with lifecycle management
// Types: Static, Global, Phase, Team, Persistent Store

const ContextManager = {
  // ===== VERSION =====
  VERSION: "1.0.0",

  // ===== CONTEXT BLOCK STORAGE =====

  /**
   * Static Context Blocks
   * - Shared across all phases and all agents
   * - Set once at pipeline initialization, never updates
   * - Read-only after initialization
   */
  _static: new Map(),

  /**
   * Global Context Blocks
   * - Shared across all phases and all agents
   * - Can be updated at the end of phases
   * - Data can be completely different across phases
   */
  _global: new Map(),

  /**
   * Phase Context Blocks
   * - Lifespan of a single phase
   * - Injected to listed participating agents within a phase
   * - Cleared when phase ends
   * - Structure: Map<phaseId, Map<blockId, blockData>>
   */
  _phase: new Map(),

  /**
   * Team Context Blocks
   * - Scoped per team, injected for all team members
   * - Can be updated per phase
   * - Structure: Map<teamId, Map<blockId, blockData>>
   */
  _team: new Map(),

  /**
   * Persistent Store References
   * - Direct references to objects in persistent storage
   * - Resolved at injection time from CouncilStores
   * - Structure: Map<referenceId, { storeKey, path?, transform? }>
   */
  _persistentRefs: new Map(),

  // ===== METADATA TRACKING =====

  /**
   * Tracks what context has been provided to whom
   * Used for Record Keeper awareness
   */
  _injectionHistory: [],

  /**
   * Current phase tracking
   */
  _currentPhaseId: null,

  /**
   * Initialization flag
   */
  _initialized: false,

  // ===== SCHEMA DEFINITIONS =====

  /**
   * Context block schema for validation
   */
  BLOCK_SCHEMA: {
    id: { type: "string", required: true },
    type: {
      type: "string",
      enum: ["static", "global", "phase", "team", "persistent"],
      required: true,
    },
    name: { type: "string", required: true },
    description: { type: "string", required: false },
    data: { type: "any", required: true },
    metadata: {
      createdAt: { type: "number" },
      updatedAt: { type: "number" },
      createdBy: { type: "string" },
      updatedBy: { type: "string" },
      version: { type: "number" },
      scope: { type: "object" }, // For phase/team scoping info
    },
  },

  // ===== INITIALIZATION =====

  /**
   * Initialize the context manager
   * @param {Object} options - Initialization options
   * @returns {ContextManager}
   */
  init(options = {}) {
    console.log("[Context Manager] Initializing...");

    this.clear();
    this._initialized = true;

    // Set up default static context if provided
    if (options.staticContext) {
      for (const [key, value] of Object.entries(options.staticContext)) {
        this.setStatic(key, value.data, value.name, value.description);
      }
    }

    // Set up default global context if provided
    if (options.globalContext) {
      for (const [key, value] of Object.entries(options.globalContext)) {
        this.setGlobal(key, value.data, value.name, value.description);
      }
    }

    // Register persistent store references if provided
    if (options.persistentRefs) {
      for (const [key, ref] of Object.entries(options.persistentRefs)) {
        this.registerPersistentRef(key, ref.storeKey, ref.path, ref.transform);
      }
    }

    console.log("[Context Manager] Initialized successfully");
    return this;
  },

  /**
   * Clear all context blocks
   */
  clear() {
    this._static.clear();
    this._global.clear();
    this._phase.clear();
    this._team.clear();
    this._persistentRefs.clear();
    this._injectionHistory = [];
    this._currentPhaseId = null;
  },

  // ===== STATIC CONTEXT METHODS =====

  /**
   * Set a static context block (can only be set once)
   * @param {string} id - Block identifier
   * @param {any} data - Block data
   * @param {string} name - Human-readable name
   * @param {string} description - Block description
   * @returns {boolean} Success status
   */
  setStatic(id, data, name = id, description = "") {
    if (this._static.has(id)) {
      console.warn(
        `[Context Manager] Static block "${id}" already exists and cannot be overwritten`,
      );
      return false;
    }

    this._static.set(
      id,
      this._createBlock("static", id, data, name, description),
    );
    console.log(`[Context Manager] Static block "${id}" set`);
    return true;
  },

  /**
   * Get a static context block
   * @param {string} id - Block identifier
   * @returns {any} Block data or null
   */
  getStatic(id) {
    const block = this._static.get(id);
    return block ? block.data : null;
  },

  /**
   * Get all static context blocks
   * @returns {Object} All static blocks as key-value pairs
   */
  getAllStatic() {
    const result = {};
    for (const [id, block] of this._static) {
      result[id] = block.data;
    }
    return result;
  },

  /**
   * Check if static block exists
   * @param {string} id - Block identifier
   * @returns {boolean}
   */
  hasStatic(id) {
    return this._static.has(id);
  },

  // ===== GLOBAL CONTEXT METHODS =====

  /**
   * Set or update a global context block
   * @param {string} id - Block identifier
   * @param {any} data - Block data
   * @param {string} name - Human-readable name
   * @param {string} description - Block description
   * @returns {boolean} Success status
   */
  setGlobal(id, data, name = id, description = "") {
    const existing = this._global.get(id);

    if (existing) {
      // Update existing block
      existing.data = data;
      existing.metadata.updatedAt = Date.now();
      existing.metadata.version = (existing.metadata.version || 0) + 1;
      console.log(
        `[Context Manager] Global block "${id}" updated (v${existing.metadata.version})`,
      );
    } else {
      // Create new block
      this._global.set(
        id,
        this._createBlock("global", id, data, name, description),
      );
      console.log(`[Context Manager] Global block "${id}" created`);
    }

    return true;
  },

  /**
   * Get a global context block
   * @param {string} id - Block identifier
   * @returns {any} Block data or null
   */
  getGlobal(id) {
    const block = this._global.get(id);
    return block ? block.data : null;
  },

  /**
   * Get all global context blocks
   * @returns {Object} All global blocks as key-value pairs
   */
  getAllGlobal() {
    const result = {};
    for (const [id, block] of this._global) {
      result[id] = block.data;
    }
    return result;
  },

  /**
   * Update global context at end of phase
   * @param {string} phaseId - Completed phase ID
   * @param {Object} updates - Updates to apply { blockId: newData }
   */
  updateGlobalAfterPhase(phaseId, updates = {}) {
    console.log(
      `[Context Manager] Updating global context after phase "${phaseId}"`,
    );

    for (const [id, data] of Object.entries(updates)) {
      const existing = this._global.get(id);
      if (existing) {
        existing.data = data;
        existing.metadata.updatedAt = Date.now();
        existing.metadata.updatedBy = phaseId;
        existing.metadata.version = (existing.metadata.version || 0) + 1;
      } else {
        this.setGlobal(id, data, id, `Created after phase ${phaseId}`);
      }
    }
  },

  // ===== PHASE CONTEXT METHODS =====

  /**
   * Set current phase (called when phase begins)
   * @param {string} phaseId - Phase identifier
   */
  beginPhase(phaseId) {
    console.log(`[Context Manager] Beginning phase "${phaseId}"`);
    this._currentPhaseId = phaseId;

    // Initialize phase context map if not exists
    if (!this._phase.has(phaseId)) {
      this._phase.set(phaseId, new Map());
    }
  },

  /**
   * End current phase (clears phase context)
   * @param {string} phaseId - Phase identifier (optional, uses current if not provided)
   * @param {boolean} preserveForDebug - Keep phase context for debugging
   */
  endPhase(phaseId = null, preserveForDebug = false) {
    const targetPhaseId = phaseId || this._currentPhaseId;
    console.log(`[Context Manager] Ending phase "${targetPhaseId}"`);

    if (!preserveForDebug && this._phase.has(targetPhaseId)) {
      this._phase.delete(targetPhaseId);
    }

    if (targetPhaseId === this._currentPhaseId) {
      this._currentPhaseId = null;
    }
  },

  /**
   * Set a phase context block
   * @param {string} id - Block identifier
   * @param {any} data - Block data
   * @param {string} name - Human-readable name
   * @param {string} description - Block description
   * @param {string} phaseId - Phase ID (optional, uses current)
   * @param {Array<string>} participantAgents - Agents that should receive this block
   * @returns {boolean} Success status
   */
  setPhase(
    id,
    data,
    name = id,
    description = "",
    phaseId = null,
    participantAgents = [],
  ) {
    const targetPhaseId = phaseId || this._currentPhaseId;

    if (!targetPhaseId) {
      console.error(
        "[Context Manager] Cannot set phase context - no active phase",
      );
      return false;
    }

    if (!this._phase.has(targetPhaseId)) {
      this._phase.set(targetPhaseId, new Map());
    }

    const block = this._createBlock("phase", id, data, name, description, {
      phaseId: targetPhaseId,
      participantAgents,
    });

    this._phase.get(targetPhaseId).set(id, block);
    console.log(
      `[Context Manager] Phase block "${id}" set for phase "${targetPhaseId}"`,
    );
    return true;
  },

  /**
   * Get a phase context block
   * @param {string} id - Block identifier
   * @param {string} phaseId - Phase ID (optional, uses current)
   * @returns {any} Block data or null
   */
  getPhase(id, phaseId = null) {
    const targetPhaseId = phaseId || this._currentPhaseId;

    if (!targetPhaseId || !this._phase.has(targetPhaseId)) {
      return null;
    }

    const block = this._phase.get(targetPhaseId).get(id);
    return block ? block.data : null;
  },

  /**
   * Get all phase context blocks for current phase
   * @param {string} phaseId - Phase ID (optional, uses current)
   * @returns {Object} All phase blocks as key-value pairs
   */
  getAllPhase(phaseId = null) {
    const targetPhaseId = phaseId || this._currentPhaseId;

    if (!targetPhaseId || !this._phase.has(targetPhaseId)) {
      return {};
    }

    const result = {};
    for (const [id, block] of this._phase.get(targetPhaseId)) {
      result[id] = block.data;
    }
    return result;
  },

  /**
   * Update a phase context block
   * @param {string} id - Block identifier
   * @param {any} data - New data
   * @param {string} phaseId - Phase ID (optional, uses current)
   * @returns {boolean} Success status
   */
  updatePhase(id, data, phaseId = null) {
    const targetPhaseId = phaseId || this._currentPhaseId;

    if (!targetPhaseId || !this._phase.has(targetPhaseId)) {
      return false;
    }

    const phaseBlocks = this._phase.get(targetPhaseId);
    const existing = phaseBlocks.get(id);

    if (existing) {
      existing.data = data;
      existing.metadata.updatedAt = Date.now();
      existing.metadata.version = (existing.metadata.version || 0) + 1;
      return true;
    }

    return false;
  },

  // ===== TEAM CONTEXT METHODS =====

  /**
   * Set or update a team context block
   * @param {string} teamId - Team identifier
   * @param {string} id - Block identifier
   * @param {any} data - Block data
   * @param {string} name - Human-readable name
   * @param {string} description - Block description
   * @returns {boolean} Success status
   */
  setTeam(teamId, id, data, name = id, description = "") {
    if (!this._team.has(teamId)) {
      this._team.set(teamId, new Map());
    }

    const teamBlocks = this._team.get(teamId);
    const existing = teamBlocks.get(id);

    if (existing) {
      existing.data = data;
      existing.metadata.updatedAt = Date.now();
      existing.metadata.version = (existing.metadata.version || 0) + 1;
      console.log(
        `[Context Manager] Team block "${id}" updated for team "${teamId}" (v${existing.metadata.version})`,
      );
    } else {
      const block = this._createBlock("team", id, data, name, description, {
        teamId,
      });
      teamBlocks.set(id, block);
      console.log(
        `[Context Manager] Team block "${id}" created for team "${teamId}"`,
      );
    }

    return true;
  },

  /**
   * Get a team context block
   * @param {string} teamId - Team identifier
   * @param {string} id - Block identifier
   * @returns {any} Block data or null
   */
  getTeam(teamId, id) {
    if (!this._team.has(teamId)) {
      return null;
    }

    const block = this._team.get(teamId).get(id);
    return block ? block.data : null;
  },

  /**
   * Get all team context blocks for a team
   * @param {string} teamId - Team identifier
   * @returns {Object} All team blocks as key-value pairs
   */
  getAllTeam(teamId) {
    if (!this._team.has(teamId)) {
      return {};
    }

    const result = {};
    for (const [id, block] of this._team.get(teamId)) {
      result[id] = block.data;
    }
    return result;
  },

  /**
   * Clear team context for a specific team
   * @param {string} teamId - Team identifier
   */
  clearTeam(teamId) {
    if (this._team.has(teamId)) {
      this._team.get(teamId).clear();
      console.log(
        `[Context Manager] Team context cleared for team "${teamId}"`,
      );
    }
  },

  // ===== PERSISTENT STORE REFERENCE METHODS =====

  /**
   * Register a persistent store reference
   * @param {string} refId - Reference identifier
   * @param {string} storeKey - Key in CouncilStores
   * @param {string} path - Optional dot-path to specific data
   * @param {Function} transform - Optional transform function
   */
  registerPersistentRef(refId, storeKey, path = null, transform = null) {
    this._persistentRefs.set(refId, {
      storeKey,
      path,
      transform,
      registeredAt: Date.now(),
    });
    console.log(
      `[Context Manager] Persistent reference "${refId}" registered -> ${storeKey}${path ? "." + path : ""}`,
    );
  },

  /**
   * Resolve a persistent store reference
   * @param {string} refId - Reference identifier
   * @param {Object} stores - CouncilStores instance
   * @returns {any} Resolved data or null
   */
  resolvePersistentRef(refId, stores) {
    const ref = this._persistentRefs.get(refId);
    if (!ref) {
      console.warn(
        `[Context Manager] Persistent reference "${refId}" not found`,
      );
      return null;
    }

    let data = stores.get(ref.storeKey);

    // Navigate path if specified
    if (data && ref.path) {
      const pathParts = ref.path.split(".");
      for (const part of pathParts) {
        if (data && typeof data === "object") {
          data = data[part];
        } else {
          data = null;
          break;
        }
      }
    }

    // Apply transform if specified
    if (data && ref.transform && typeof ref.transform === "function") {
      try {
        data = ref.transform(data);
      } catch (e) {
        console.error(`[Context Manager] Transform failed for "${refId}":`, e);
      }
    }

    return data;
  },

  /**
   * Get all persistent references resolved
   * @param {Object} stores - CouncilStores instance
   * @returns {Object} All resolved references
   */
  resolveAllPersistentRefs(stores) {
    const result = {};
    for (const [refId] of this._persistentRefs) {
      result[refId] = this.resolvePersistentRef(refId, stores);
    }
    return result;
  },

  // ===== CONTEXT INJECTION =====

  /**
   * Build context for a specific agent in a phase
   * @param {string} agentId - Agent identifier
   * @param {string} teamId - Agent's team
   * @param {string} phaseId - Current phase
   * @param {Object} stores - CouncilStores instance
   * @param {Object} options - Additional options
   * @returns {Object} Compiled context for the agent
   */
  buildContextForAgent(agentId, teamId, phaseId, stores, options = {}) {
    const context = {
      _meta: {
        agentId,
        teamId,
        phaseId,
        builtAt: Date.now(),
        blockTypes: [],
      },
      static: {},
      global: {},
      phase: {},
      team: {},
      persistent: {},
    };

    // 1. Inject all static context (always included for all agents)
    for (const [id, block] of this._static) {
      context.static[id] = block.data;
    }
    if (this._static.size > 0) {
      context._meta.blockTypes.push("static");
    }

    // 2. Inject all global context (always included for all agents)
    for (const [id, block] of this._global) {
      context.global[id] = block.data;
    }
    if (this._global.size > 0) {
      context._meta.blockTypes.push("global");
    }

    // 3. Inject phase context (only for participating agents)
    if (phaseId && this._phase.has(phaseId)) {
      for (const [id, block] of this._phase.get(phaseId)) {
        const participants = block.metadata.scope?.participantAgents || [];
        // Include if no specific participants listed, or agent is listed
        if (participants.length === 0 || participants.includes(agentId)) {
          context.phase[id] = block.data;
        }
      }
      if (Object.keys(context.phase).length > 0) {
        context._meta.blockTypes.push("phase");
      }
    }

    // 4. Inject team context (for team members only)
    if (teamId && this._team.has(teamId)) {
      for (const [id, block] of this._team.get(teamId)) {
        context.team[id] = block.data;
      }
      if (Object.keys(context.team).length > 0) {
        context._meta.blockTypes.push("team");
      }
    }

    // 5. Resolve persistent store references
    if (stores && this._persistentRefs.size > 0) {
      context.persistent = this.resolveAllPersistentRefs(stores);
      if (Object.keys(context.persistent).length > 0) {
        context._meta.blockTypes.push("persistent");
      }
    }

    // Record injection for tracking
    this._recordInjection(agentId, teamId, phaseId, context._meta.blockTypes);

    return context;
  },

  /**
   * Build context for an entire team
   * @param {string} teamId - Team identifier
   * @param {string} phaseId - Current phase
   * @param {Object} stores - CouncilStores instance
   * @returns {Object} Compiled context for the team
   */
  buildContextForTeam(teamId, phaseId, stores) {
    // Team context is the same as agent context but without agent-specific filtering
    return this.buildContextForAgent(null, teamId, phaseId, stores);
  },

  // ===== RECORD KEEPER SUPPORT =====

  /**
   * Generate a context manifest for Record Keeper RAG requests
   * Shows what context has already been provided
   * @param {string} requestingAgentId - Agent making the request
   * @param {string} teamId - Agent's team
   * @param {string} phaseId - Current phase
   * @returns {Object} Context manifest
   */
  generateContextManifest(requestingAgentId, teamId, phaseId) {
    const manifest = {
      alreadyProvided: {
        static: Array.from(this._static.keys()),
        global: Array.from(this._global.keys()),
        phase:
          phaseId && this._phase.has(phaseId)
            ? Array.from(this._phase.get(phaseId).keys())
            : [],
        team: {},
        persistent: Array.from(this._persistentRefs.keys()),
      },
      currentPhase: phaseId,
      requestingAgent: requestingAgentId,
      requestingTeam: teamId,
      timestamp: Date.now(),
    };

    // Add team context info
    for (const [tId, blocks] of this._team) {
      manifest.alreadyProvided.team[tId] = Array.from(blocks.keys());
    }

    // Add block summaries for smarter RAG
    manifest.blockSummaries = this._generateBlockSummaries();

    return manifest;
  },

  /**
   * Generate summaries of all context blocks for RAG awareness
   * @returns {Object} Block summaries by type
   */
  _generateBlockSummaries() {
    const summaries = {
      static: {},
      global: {},
      phase: {},
      team: {},
    };

    // Static summaries
    for (const [id, block] of this._static) {
      summaries.static[id] = {
        name: block.name,
        description: block.description,
        dataType: typeof block.data,
        hasContent: !!block.data,
      };
    }

    // Global summaries
    for (const [id, block] of this._global) {
      summaries.global[id] = {
        name: block.name,
        description: block.description,
        dataType: typeof block.data,
        hasContent: !!block.data,
        version: block.metadata.version,
      };
    }

    // Phase summaries (current phase only)
    if (this._currentPhaseId && this._phase.has(this._currentPhaseId)) {
      for (const [id, block] of this._phase.get(this._currentPhaseId)) {
        summaries.phase[id] = {
          name: block.name,
          description: block.description,
          dataType: typeof block.data,
          hasContent: !!block.data,
          participants: block.metadata.scope?.participantAgents || [],
        };
      }
    }

    // Team summaries
    for (const [teamId, blocks] of this._team) {
      summaries.team[teamId] = {};
      for (const [id, block] of blocks) {
        summaries.team[teamId][id] = {
          name: block.name,
          description: block.description,
          dataType: typeof block.data,
          hasContent: !!block.data,
        };
      }
    }

    return summaries;
  },

  // ===== CONTEXT FORMATTING =====

  /**
   * Format context object into a string for prompt injection
   * @param {Object} context - Context object from buildContextForAgent
   * @param {Object} options - Formatting options
   * @returns {string} Formatted context string
   */
  formatContextForPrompt(context, options = {}) {
    const {
      maxLength = 8000,
      includeHeaders = true,
      priorityOrder = ["static", "global", "team", "phase", "persistent"],
    } = options;

    const parts = [];
    let totalLength = 0;

    for (const type of priorityOrder) {
      const data = context[type];
      if (!data || Object.keys(data).length === 0) continue;

      if (includeHeaders) {
        parts.push(`\n=== ${type.toUpperCase()} CONTEXT ===\n`);
      }

      for (const [key, value] of Object.entries(data)) {
        const formatted = this._formatValue(key, value);
        if (totalLength + formatted.length <= maxLength) {
          parts.push(formatted);
          totalLength += formatted.length;
        } else {
          parts.push(`[${key}: truncated due to length]`);
          break;
        }
      }
    }

    return parts.join("\n");
  },

  /**
   * Format a single value for prompt injection
   * @param {string} key - Value key
   * @param {any} value - Value to format
   * @returns {string} Formatted string
   */
  _formatValue(key, value) {
    const header = `[${this._formatKey(key)}]`;

    if (value === null || value === undefined) {
      return `${header}\n(empty)`;
    }

    if (typeof value === "string") {
      return `${header}\n${value}`;
    }

    if (Array.isArray(value)) {
      if (value.length === 0) return `${header}\n(empty list)`;
      return `${header}\n${value
        .map((item, i) =>
          typeof item === "object"
            ? `${i + 1}. ${JSON.stringify(item)}`
            : `${i + 1}. ${item}`,
        )
        .join("\n")}`;
    }

    if (typeof value === "object") {
      return `${header}\n${JSON.stringify(value, null, 2)}`;
    }

    return `${header}\n${String(value)}`;
  },

  /**
   * Format a key into human-readable form
   * @param {string} key - Key to format
   * @returns {string} Formatted key
   */
  _formatKey(key) {
    return key
      .replace(/_/g, " ")
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  },

  // ===== HELPER METHODS =====

  /**
   * Create a context block with metadata
   * @param {string} type - Block type
   * @param {string} id - Block identifier
   * @param {any} data - Block data
   * @param {string} name - Human-readable name
   * @param {string} description - Block description
   * @param {Object} scope - Scope information
   * @returns {Object} Context block
   */
  _createBlock(type, id, data, name, description, scope = {}) {
    return {
      id,
      type,
      name,
      description,
      data,
      metadata: {
        createdAt: Date.now(),
        updatedAt: Date.now(),
        version: 1,
        scope,
      },
    };
  },

  /**
   * Record an injection event for tracking
   * @param {string} agentId - Agent identifier
   * @param {string} teamId - Team identifier
   * @param {string} phaseId - Phase identifier
   * @param {Array<string>} blockTypes - Types of blocks injected
   */
  _recordInjection(agentId, teamId, phaseId, blockTypes) {
    this._injectionHistory.push({
      timestamp: Date.now(),
      agentId,
      teamId,
      phaseId,
      blockTypes,
    });

    // Keep history manageable
    if (this._injectionHistory.length > 1000) {
      this._injectionHistory = this._injectionHistory.slice(-500);
    }
  },

  // ===== DIAGNOSTICS & DEBUGGING =====

  /**
   * Get summary of all context blocks
   * @returns {Object} Summary statistics
   */
  getSummary() {
    const phaseBlocks = {};
    for (const [phaseId, blocks] of this._phase) {
      phaseBlocks[phaseId] = blocks.size;
    }

    const teamBlocks = {};
    for (const [teamId, blocks] of this._team) {
      teamBlocks[teamId] = blocks.size;
    }

    return {
      initialized: this._initialized,
      currentPhase: this._currentPhaseId,
      blockCounts: {
        static: this._static.size,
        global: this._global.size,
        phase: phaseBlocks,
        team: teamBlocks,
        persistentRefs: this._persistentRefs.size,
      },
      injectionCount: this._injectionHistory.length,
    };
  },

  /**
   * Get full state for debugging
   * @returns {Object} Full state snapshot
   */
  getDebugSnapshot() {
    const phaseData = {};
    for (const [phaseId, blocks] of this._phase) {
      phaseData[phaseId] = Object.fromEntries(blocks);
    }

    const teamData = {};
    for (const [teamId, blocks] of this._team) {
      teamData[teamId] = Object.fromEntries(blocks);
    }

    return {
      summary: this.getSummary(),
      static: Object.fromEntries(this._static),
      global: Object.fromEntries(this._global),
      phase: phaseData,
      team: teamData,
      persistentRefs: Object.fromEntries(this._persistentRefs),
      recentInjections: this._injectionHistory.slice(-20),
    };
  },

  /**
   * Validate a context block against schema
   * @param {Object} block - Block to validate
   * @returns {Object} Validation result { valid: boolean, errors: string[] }
   */
  validateBlock(block) {
    const errors = [];

    if (!block.id || typeof block.id !== "string") {
      errors.push("Block must have a string id");
    }

    if (
      !block.type ||
      !["static", "global", "phase", "team", "persistent"].includes(block.type)
    ) {
      errors.push(
        "Block must have a valid type (static, global, phase, team, persistent)",
      );
    }

    if (!block.name || typeof block.name !== "string") {
      errors.push("Block must have a string name");
    }

    if (block.data === undefined) {
      errors.push("Block must have data property");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  },

  /**
   * Export all context for persistence
   * @returns {Object} Exportable context state
   */
  export() {
    const phaseData = {};
    for (const [phaseId, blocks] of this._phase) {
      phaseData[phaseId] = Object.fromEntries(blocks);
    }

    const teamData = {};
    for (const [teamId, blocks] of this._team) {
      teamData[teamId] = Object.fromEntries(blocks);
    }

    return {
      version: this.VERSION,
      exportedAt: Date.now(),
      static: Object.fromEntries(this._static),
      global: Object.fromEntries(this._global),
      phase: phaseData,
      team: teamData,
      persistentRefs: Object.fromEntries(this._persistentRefs),
    };
  },

  /**
   * Import context from exported state
   * @param {Object} data - Exported context data
   * @returns {boolean} Success status
   */
  import(data) {
    try {
      if (!data || !data.version) {
        console.error("[Context Manager] Invalid import data");
        return false;
      }

      // Clear existing state
      this.clear();

      // Import static (as new, since they're normally immutable)
      if (data.static) {
        for (const [id, block] of Object.entries(data.static)) {
          this._static.set(id, block);
        }
      }

      // Import global
      if (data.global) {
        for (const [id, block] of Object.entries(data.global)) {
          this._global.set(id, block);
        }
      }

      // Import phase
      if (data.phase) {
        for (const [phaseId, blocks] of Object.entries(data.phase)) {
          this._phase.set(phaseId, new Map(Object.entries(blocks)));
        }
      }

      // Import team
      if (data.team) {
        for (const [teamId, blocks] of Object.entries(data.team)) {
          this._team.set(teamId, new Map(Object.entries(blocks)));
        }
      }

      // Import persistent refs (without functions - those need to be re-registered)
      if (data.persistentRefs) {
        for (const [refId, ref] of Object.entries(data.persistentRefs)) {
          this._persistentRefs.set(refId, {
            storeKey: ref.storeKey,
            path: ref.path,
            transform: null, // Functions can't be serialized
            registeredAt: ref.registeredAt,
          });
        }
      }

      console.log("[Context Manager] Import successful");
      return true;
    } catch (e) {
      console.error("[Context Manager] Import failed:", e);
      return false;
    }
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
   * Get injection history (for debugging/analytics)
   * @param {number} limit - Max entries to return
   * @returns {Array} Recent injection records
   */
  getInjectionHistory(limit = 50) {
    return this._injectionHistory.slice(-limit);
  },
};

// Export for use in other modules
if (typeof window !== "undefined") {
  window.ContextManager = ContextManager;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = ContextManager;
}
