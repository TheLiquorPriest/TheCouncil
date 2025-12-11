/**
 * TheCouncil - Pipeline Builder System
 *
 * Consolidated system for:
 * - Editorial Agent management (absorbed from agents-system.js)
 * - Position management (roles in the organization)
 * - Team management (groups with leaders and members)
 * - Agent Pool management (for random/weighted selection)
 * - Pipeline definition management
 * - Phase and Action management
 * - Validation
 *
 * This system DEFINES workflows - execution is handled by OrchestrationSystem.
 *
 * @version 2.0.0
 */

const PipelineBuilderSystem = {
  // ===== VERSION =====
  VERSION: "2.0.0",

  // ===== LIFECYCLE CONSTANTS (from pipeline-system.js) =====

  PhaseLifecycle: {
    START: "start",
    BEFORE_ACTIONS: "before_actions",
    IN_PROGRESS: "in_progress",
    AFTER_ACTIONS: "after_actions",
    END: "end",
    RESPOND: "respond",
  },

  ActionLifecycle: {
    CALLED: "called",
    START: "start",
    IN_PROGRESS: "in_progress",
    COMPLETE: "complete",
    RESPOND: "respond",
  },

  ExecutionMode: {
    SYNC: "sync",
    ASYNC: "async",
  },

  TriggerType: {
    SEQUENTIAL: "sequential",
    AWAIT: "await",
    ON: "on",
    IMMEDIATE: "immediate",
  },

  OrchestrationMode: {
    SEQUENTIAL: "sequential",
    PARALLEL: "parallel",
    ROUND_ROBIN: "round_robin",
    CONSENSUS: "consensus",
  },

  OutputConsolidation: {
    LAST_ACTION: "last_action",
    SYNTHESIZE: "synthesize",
    USER_GAVEL: "user_gavel",
    MERGE: "merge",
    DESIGNATED: "designated",
  },

  ActionType: {
    STANDARD: "standard",
    CRUD_PIPELINE: "crud_pipeline",
    RAG_PIPELINE: "rag_pipeline",
    DELIBERATIVE_RAG: "deliberative_rag",
    USER_GAVEL: "user_gavel",
    SYSTEM: "system",
    CHARACTER_WORKSHOP: "character_workshop",
  },

  PositionTier: {
    EXECUTIVE: "executive",
    LEADER: "leader",
    MEMBER: "member",
  },

  // ===== STATE =====

  /**
   * All defined agents (editorial agents)
   * @type {Map<string, Object>}
   */
  _agents: new Map(),

  /**
   * All defined agent pools
   * @type {Map<string, Object>}
   */
  _agentPools: new Map(),

  /**
   * All defined positions
   * @type {Map<string, Object>}
   */
  _positions: new Map(),

  /**
   * All defined teams
   * @type {Map<string, Object>}
   */
  _teams: new Map(),

  /**
   * Executive positions (above all teams)
   * @type {Map<string, Object>}
   */
  _executivePositions: new Map(),

  /**
   * Registered pipelines
   * @type {Map<string, Object>}
   */
  _pipelines: new Map(),

  /**
   * Company name
   * @type {string}
   */
  _companyName: "The Council",

  /**
   * Pool selection tracking (for round_robin)
   * @type {Map<string, number>}
   */
  _poolSelectionIndex: new Map(),

  /**
   * Kernel reference
   * @type {Object|null}
   */
  _kernel: null,

  /**
   * Logger reference
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
   * Initialize the Pipeline Builder System
   * @param {Object} kernel - TheCouncil Kernel reference
   * @param {Object} options - Configuration options
   * @returns {PipelineBuilderSystem}
   */
  init(kernel, options = {}) {
    if (this._initialized) {
      this._log("warn", "PipelineBuilderSystem already initialized");
      return this;
    }

    this._log("info", "Initializing Pipeline Builder System...");

    // Store kernel reference
    this._kernel = kernel;

    // Get logger from kernel
    if (kernel && kernel.getModule) {
      this._logger = kernel.getModule("logger");
    } else if (options.logger) {
      this._logger = options.logger;
    }

    // Clear existing state
    this.clear();

    // Load initial data if provided
    if (options.initialData) {
      this.import(options.initialData);
    } else {
      // Set up mandatory positions
      this._setupMandatoryPositions();
    }

    // Register with kernel
    if (kernel && kernel.registerSystem) {
      kernel.registerSystem("pipelineBuilder", this);
    }

    this._initialized = true;
    this._log("info", "Pipeline Builder System initialized");
    this._emit("pipelineBuilder:initialized");

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
   * Check if system is ready (alias for isInitialized)
   * @returns {boolean}
   */
  isReady() {
    return this._initialized;
  },

  /**
   * Clear all data
   */
  clear() {
    this._agents.clear();
    this._agentPools.clear();
    this._positions.clear();
    this._teams.clear();
    this._executivePositions.clear();
    this._pipelines.clear();
    this._poolSelectionIndex.clear();
    this._companyName = "The Council";
  },

  /**
   * Set up mandatory positions
   */
  _setupMandatoryPositions() {
    // Publisher is always required
    this.createPosition({
      id: "publisher",
      name: "Publisher",
      teamId: null, // Executive level
      tier: "executive",
      isMandatory: true,
      promptModifiers: {
        prefix: "",
        suffix: "",
        roleDescription:
          "The Publisher oversees the entire creative operation, ensuring the final output meets quality standards and aligns with the user's vision. You have final authority on all creative decisions and can approve or deny requests from team leads.",
      },
    });
  },

  // =========================================================================
  // AGENT MANAGEMENT
  // =========================================================================

  /**
   * Create a new agent
   * @param {Object} data - Agent data
   * @returns {Object} Created agent
   */
  createAgent(data) {
    const agent = this._validateAndNormalizeAgent(data);

    if (this._agents.has(agent.id)) {
      throw new Error(`Agent with ID "${agent.id}" already exists`);
    }

    agent.metadata = {
      ...agent.metadata,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this._agents.set(agent.id, agent);
    this._log("info", `Agent created: ${agent.name} (${agent.id})`);
    this._emit("pipelineBuilder:agent:created", { agent });

    // Persist
    this._persist();

    return agent;
  },

  /**
   * Get an agent by ID
   * @param {string} id - Agent ID
   * @returns {Object|null} Agent or null
   */
  getAgent(id) {
    return this._agents.get(id) || null;
  },

  /**
   * Get all agents
   * @returns {Object[]} Array of agents
   */
  getAllAgents() {
    return Array.from(this._agents.values());
  },

  /**
   * Update an agent
   * @param {string} id - Agent ID
   * @param {Object} updates - Fields to update
   * @returns {Object} Updated agent
   */
  updateAgent(id, updates) {
    const agent = this._agents.get(id);
    if (!agent) {
      throw new Error(`Agent "${id}" not found`);
    }

    // Prevent ID changes
    delete updates.id;

    const updated = this._validateAndNormalizeAgent({
      ...agent,
      ...updates,
      metadata: {
        ...agent.metadata,
        updatedAt: Date.now(),
      },
    });

    this._agents.set(id, updated);
    this._log("info", `Agent updated: ${updated.name} (${id})`);
    this._emit("pipelineBuilder:agent:updated", { agent: updated });

    // Persist
    this._persist();

    return updated;
  },

  /**
   * Delete an agent
   * @param {string} id - Agent ID
   * @returns {boolean} Success
   */
  deleteAgent(id) {
    const agent = this._agents.get(id);
    if (!agent) {
      return false;
    }

    // Check if agent is assigned to any positions
    const assignedPositions = this._getPositionsWithAgent(id);
    if (assignedPositions.length > 0) {
      throw new Error(
        `Cannot delete agent "${id}" - assigned to positions: ${assignedPositions.map((p) => p.name).join(", ")}`,
      );
    }

    // Check if agent is in any pools
    const containingPools = this._getPoolsWithAgent(id);
    if (containingPools.length > 0) {
      throw new Error(
        `Cannot delete agent "${id}" - in pools: ${containingPools.map((p) => p.name).join(", ")}`,
      );
    }

    this._agents.delete(id);
    this._log("info", `Agent deleted: ${agent.name} (${id})`);
    this._emit("pipelineBuilder:agent:deleted", { id, agent });

    // Persist
    this._persist();

    return true;
  },

  /**
   * Duplicate an agent
   * @param {string} id - Agent ID to duplicate
   * @param {string} newId - New agent ID (optional, auto-generated if not provided)
   * @returns {Object} New agent
   */
  duplicateAgent(id, newId = null) {
    const original = this._agents.get(id);
    if (!original) {
      throw new Error(`Agent "${id}" not found`);
    }

    const duplicateId = newId || `${id}_copy_${Date.now()}`;
    const duplicate = {
      ...JSON.parse(JSON.stringify(original)),
      id: duplicateId,
      name: `${original.name} (Copy)`,
    };

    return this.createAgent(duplicate);
  },

  /**
   * Validate and normalize agent data
   * @param {Object} data - Agent data
   * @returns {Object} Normalized agent
   */
  _validateAndNormalizeAgent(data) {
    if (!data.id) {
      throw new Error("Agent ID is required");
    }
    if (!data.name) {
      throw new Error("Agent name is required");
    }

    return {
      id: String(data.id),
      name: String(data.name),
      description: data.description || "",
      apiConfig: {
        useCurrentConnection: data.apiConfig?.useCurrentConnection ?? true,
        endpoint: data.apiConfig?.endpoint || "",
        apiKey: data.apiConfig?.apiKey || "",
        model: data.apiConfig?.model || "",
        temperature: data.apiConfig?.temperature ?? 0.7,
        maxTokens: data.apiConfig?.maxTokens ?? 2048,
        topP: data.apiConfig?.topP ?? 1,
        frequencyPenalty: data.apiConfig?.frequencyPenalty ?? 0,
        presencePenalty: data.apiConfig?.presencePenalty ?? 0,
      },
      systemPrompt: {
        source: data.systemPrompt?.source || "custom",
        presetName: data.systemPrompt?.presetName || "",
        customText: data.systemPrompt?.customText || "",
        builderTokens: data.systemPrompt?.builderTokens || [],
      },
      reasoning: {
        enabled: data.reasoning?.enabled ?? false,
        prefix: data.reasoning?.prefix || "<thinking>",
        suffix: data.reasoning?.suffix || "</thinking>",
        hideFromOutput: data.reasoning?.hideFromOutput ?? true,
      },
      metadata: {
        createdAt: data.metadata?.createdAt || Date.now(),
        updatedAt: data.metadata?.updatedAt || Date.now(),
        tags: data.metadata?.tags || [],
      },
    };
  },

  // =========================================================================
  // AGENT POOL MANAGEMENT
  // =========================================================================

  /**
   * Create a new agent pool
   * @param {Object} data - Pool data
   * @returns {Object} Created pool
   */
  createAgentPool(data) {
    const pool = this._validateAndNormalizePool(data);

    if (this._agentPools.has(pool.id)) {
      throw new Error(`Agent pool with ID "${pool.id}" already exists`);
    }

    // Verify all agents exist
    for (const agentId of pool.agentIds) {
      if (!this._agents.has(agentId)) {
        throw new Error(`Agent "${agentId}" not found for pool`);
      }
    }

    this._agentPools.set(pool.id, pool);
    this._poolSelectionIndex.set(pool.id, 0);
    this._log("info", `Agent pool created: ${pool.name} (${pool.id})`);
    this._emit("pipelineBuilder:pool:created", { pool });

    // Persist
    this._persist();

    return pool;
  },

  /**
   * Get an agent pool by ID
   * @param {string} id - Pool ID
   * @returns {Object|null} Pool or null
   */
  getAgentPool(id) {
    return this._agentPools.get(id) || null;
  },

  /**
   * Get all agent pools
   * @returns {Object[]} Array of pools
   */
  getAllAgentPools() {
    return Array.from(this._agentPools.values());
  },

  /**
   * Update an agent pool
   * @param {string} id - Pool ID
   * @param {Object} updates - Fields to update
   * @returns {Object} Updated pool
   */
  updateAgentPool(id, updates) {
    const pool = this._agentPools.get(id);
    if (!pool) {
      throw new Error(`Agent pool "${id}" not found`);
    }

    delete updates.id;

    const updated = this._validateAndNormalizePool({
      ...pool,
      ...updates,
    });

    // Verify all agents exist
    for (const agentId of updated.agentIds) {
      if (!this._agents.has(agentId)) {
        throw new Error(`Agent "${agentId}" not found for pool`);
      }
    }

    this._agentPools.set(id, updated);
    this._log("info", `Agent pool updated: ${updated.name} (${id})`);
    this._emit("pipelineBuilder:pool:updated", { pool: updated });

    // Persist
    this._persist();

    return updated;
  },

  /**
   * Delete an agent pool
   * @param {string} id - Pool ID
   * @returns {boolean} Success
   */
  deleteAgentPool(id) {
    const pool = this._agentPools.get(id);
    if (!pool) {
      return false;
    }

    // Check if pool is assigned to any positions
    const assignedPositions = this._getPositionsWithPool(id);
    if (assignedPositions.length > 0) {
      throw new Error(
        `Cannot delete pool "${id}" - assigned to positions: ${assignedPositions.map((p) => p.name).join(", ")}`,
      );
    }

    this._agentPools.delete(id);
    this._poolSelectionIndex.delete(id);
    this._log("info", `Agent pool deleted: ${pool.name} (${id})`);
    this._emit("pipelineBuilder:pool:deleted", { id, pool });

    // Persist
    this._persist();

    return true;
  },

  /**
   * Select an agent from a pool
   * @param {string} poolId - Pool ID
   * @returns {Object|null} Selected agent or null
   */
  selectFromPool(poolId) {
    const pool = this._agentPools.get(poolId);
    if (!pool || pool.agentIds.length === 0) {
      return null;
    }

    let selectedId;

    switch (pool.selectionMode) {
      case "random":
        const randomIndex = Math.floor(Math.random() * pool.agentIds.length);
        selectedId = pool.agentIds[randomIndex];
        break;

      case "round_robin":
        const currentIndex = this._poolSelectionIndex.get(poolId) || 0;
        selectedId = pool.agentIds[currentIndex % pool.agentIds.length];
        this._poolSelectionIndex.set(poolId, currentIndex + 1);
        break;

      case "weighted":
        selectedId = this._selectWeighted(pool);
        break;

      default:
        selectedId = pool.agentIds[0];
    }

    return this._agents.get(selectedId) || null;
  },

  /**
   * Select an agent using weighted random selection
   * @param {Object} pool - Pool object
   * @returns {string} Selected agent ID
   */
  _selectWeighted(pool) {
    const weights = pool.weights || {};
    const totalWeight = pool.agentIds.reduce(
      (sum, id) => sum + (weights[id] || 1),
      0,
    );

    let random = Math.random() * totalWeight;

    for (const agentId of pool.agentIds) {
      random -= weights[agentId] || 1;
      if (random <= 0) {
        return agentId;
      }
    }

    return pool.agentIds[pool.agentIds.length - 1];
  },

  /**
   * Validate and normalize pool data
   * @param {Object} data - Pool data
   * @returns {Object} Normalized pool
   */
  _validateAndNormalizePool(data) {
    if (!data.id) {
      throw new Error("Pool ID is required");
    }
    if (!data.name) {
      throw new Error("Pool name is required");
    }
    if (!data.agentIds || data.agentIds.length === 0) {
      throw new Error("Pool must have at least one agent");
    }

    return {
      id: String(data.id),
      name: String(data.name),
      agentIds: [...data.agentIds],
      selectionMode: data.selectionMode || "random",
      weights: data.weights || {},
    };
  },

  // =========================================================================
  // POSITION MANAGEMENT
  // =========================================================================

  /**
   * Create a new position
   * @param {Object} data - Position data
   * @returns {Object} Created position
   */
  createPosition(data) {
    const position = this._validateAndNormalizePosition(data);

    if (this._positions.has(position.id)) {
      throw new Error(`Position with ID "${position.id}" already exists`);
    }

    // Validate team exists (unless executive)
    if (position.teamId && !this._teams.has(position.teamId)) {
      throw new Error(`Team "${position.teamId}" not found`);
    }

    // Validate assigned agent/pool exists
    if (position.assignedAgentId && !this._agents.has(position.assignedAgentId)) {
      throw new Error(`Agent "${position.assignedAgentId}" not found`);
    }
    if (position.assignedPoolId && !this._agentPools.has(position.assignedPoolId)) {
      throw new Error(`Agent pool "${position.assignedPoolId}" not found`);
    }

    this._positions.set(position.id, position);

    // Track executive positions separately
    if (position.tier === "executive" || !position.teamId) {
      this._executivePositions.set(position.id, position);
    }

    this._log("info", `Position created: ${position.name} (${position.id})`);
    this._emit("pipelineBuilder:position:created", { position });

    // Persist
    this._persist();

    return position;
  },

  /**
   * Get a position by ID
   * @param {string} id - Position ID
   * @returns {Object|null} Position or null
   */
  getPosition(id) {
    return this._positions.get(id) || null;
  },

  /**
   * Get all positions
   * @returns {Object[]} Array of positions
   */
  getAllPositions() {
    return Array.from(this._positions.values());
  },

  /**
   * Get executive positions
   * @returns {Object[]} Array of executive positions
   */
  getExecutivePositions() {
    return Array.from(this._executivePositions.values());
  },

  /**
   * Get positions for a team
   * @param {string} teamId - Team ID
   * @returns {Object[]} Array of positions
   */
  getTeamPositions(teamId) {
    return Array.from(this._positions.values()).filter(
      (p) => p.teamId === teamId,
    );
  },

  /**
   * Update a position
   * @param {string} id - Position ID
   * @param {Object} updates - Fields to update
   * @returns {Object} Updated position
   */
  updatePosition(id, updates) {
    const position = this._positions.get(id);
    if (!position) {
      throw new Error(`Position "${id}" not found`);
    }

    // Prevent changes to mandatory positions' core properties
    if (position.isMandatory) {
      delete updates.id;
      delete updates.isMandatory;
      delete updates.tier;
    }

    const updated = this._validateAndNormalizePosition({
      ...position,
      ...updates,
    });

    // Validate assigned agent/pool exists
    if (updated.assignedAgentId && !this._agents.has(updated.assignedAgentId)) {
      throw new Error(`Agent "${updated.assignedAgentId}" not found`);
    }
    if (updated.assignedPoolId && !this._agentPools.has(updated.assignedPoolId)) {
      throw new Error(`Agent pool "${updated.assignedPoolId}" not found`);
    }

    this._positions.set(id, updated);

    // Update executive tracking
    if (updated.tier === "executive" || !updated.teamId) {
      this._executivePositions.set(id, updated);
    } else {
      this._executivePositions.delete(id);
    }

    this._log("info", `Position updated: ${updated.name} (${id})`);
    this._emit("pipelineBuilder:position:updated", { position: updated });

    // Persist
    this._persist();

    return updated;
  },

  /**
   * Delete a position
   * @param {string} id - Position ID
   * @returns {boolean} Success
   */
  deletePosition(id) {
    const position = this._positions.get(id);
    if (!position) {
      return false;
    }

    if (position.isMandatory) {
      throw new Error(`Cannot delete mandatory position "${id}"`);
    }

    // Remove from team if applicable
    if (position.teamId) {
      const team = this._teams.get(position.teamId);
      if (team) {
        if (team.leaderId === id) {
          throw new Error(
            `Cannot delete position "${id}" - it is the team leader for "${team.name}"`,
          );
        }
        team.memberIds = team.memberIds.filter((mid) => mid !== id);
      }
    }

    this._positions.delete(id);
    this._executivePositions.delete(id);

    this._log("info", `Position deleted: ${position.name} (${id})`);
    this._emit("pipelineBuilder:position:deleted", { id, position });

    // Persist
    this._persist();

    return true;
  },

  /**
   * Assign an agent to a position
   * @param {string} agentId - Agent ID (or null to unassign)
   * @param {string} positionId - Position ID
   * @returns {Object} Updated position
   */
  assignAgentToPosition(agentId, positionId) {
    const position = this._positions.get(positionId);
    if (!position) {
      throw new Error(`Position "${positionId}" not found`);
    }

    if (agentId && !this._agents.has(agentId)) {
      throw new Error(`Agent "${agentId}" not found`);
    }

    return this.updatePosition(positionId, {
      assignedAgentId: agentId,
      assignedPoolId: null, // Clear pool assignment
    });
  },

  /**
   * Assign a pool to a position
   * @param {string} positionId - Position ID
   * @param {string} poolId - Pool ID (or null to unassign)
   * @returns {Object} Updated position
   */
  assignPoolToPosition(positionId, poolId) {
    const position = this._positions.get(positionId);
    if (!position) {
      throw new Error(`Position "${positionId}" not found`);
    }

    if (poolId && !this._agentPools.has(poolId)) {
      throw new Error(`Agent pool "${poolId}" not found`);
    }

    return this.updatePosition(positionId, {
      assignedAgentId: null, // Clear agent assignment
      assignedPoolId: poolId,
    });
  },

  /**
   * Get the agent for a position (resolves pools)
   * @param {string} positionId - Position ID
   * @returns {Object|null} Agent or null
   */
  getAgentForPosition(positionId) {
    const position = this._positions.get(positionId);
    if (!position) {
      return null;
    }

    if (position.assignedAgentId) {
      return this._agents.get(position.assignedAgentId) || null;
    }

    if (position.assignedPoolId) {
      return this.selectFromPool(position.assignedPoolId);
    }

    return null;
  },

  /**
   * Check if a position is filled
   * @param {string} positionId - Position ID
   * @returns {boolean} True if position has an agent or pool assigned
   */
  isPositionFilled(positionId) {
    const position = this._positions.get(positionId);
    if (!position) {
      return false;
    }
    return !!(position.assignedAgentId || position.assignedPoolId);
  },

  /**
   * Validate and normalize position data
   * @param {Object} data - Position data
   * @returns {Object} Normalized position
   */
  _validateAndNormalizePosition(data) {
    if (!data.id) {
      throw new Error("Position ID is required");
    }
    if (!data.name) {
      throw new Error("Position name is required");
    }

    const tier = data.tier || "member";
    if (!["executive", "leader", "member"].includes(tier)) {
      throw new Error(`Invalid position tier: ${tier}`);
    }

    return {
      id: String(data.id),
      name: String(data.name),
      displayName: data.displayName || data.name || null,
      type: data.type || null,
      teamId: data.teamId || null,
      tier,
      assignedAgentId: data.assignedAgentId || null,
      assignedPoolId: data.assignedPoolId || null,
      promptModifiers: {
        prefix: data.promptModifiers?.prefix || "",
        suffix: data.promptModifiers?.suffix || "",
        roleDescription: data.promptModifiers?.roleDescription || "",
      },
      isMandatory: data.isMandatory || false,
      isSME: data.isSME || false,
      smeKeywords: data.smeKeywords || [],
    };
  },

  // =========================================================================
  // TEAM MANAGEMENT
  // =========================================================================

  /**
   * Create a new team
   * @param {Object} data - Team data
   * @returns {Object} Created team
   */
  createTeam(data) {
    const team = this._validateAndNormalizeTeam(data);

    if (this._teams.has(team.id)) {
      throw new Error(`Team with ID "${team.id}" already exists`);
    }

    this._teams.set(team.id, team);

    // Create leader position if specified
    if (data.createLeaderPosition && !this._positions.has(team.leaderId)) {
      this.createPosition({
        id: team.leaderId,
        name: data.leaderName || `${team.name} Lead`,
        teamId: team.id,
        tier: "leader",
        promptModifiers: data.leaderPromptModifiers || {},
      });
    }

    this._log("info", `Team created: ${team.name} (${team.id})`);
    this._emit("pipelineBuilder:team:created", { team });

    // Persist
    this._persist();

    return team;
  },

  /**
   * Get a team by ID
   * @param {string} id - Team ID
   * @returns {Object|null} Team or null
   */
  getTeam(id) {
    return this._teams.get(id) || null;
  },

  /**
   * Get all teams
   * @returns {Object[]} Array of teams
   */
  getAllTeams() {
    return Array.from(this._teams.values());
  },

  /**
   * Update a team
   * @param {string} id - Team ID
   * @param {Object} updates - Fields to update
   * @returns {Object} Updated team
   */
  updateTeam(id, updates) {
    const team = this._teams.get(id);
    if (!team) {
      throw new Error(`Team "${id}" not found`);
    }

    delete updates.id;

    const updated = this._validateAndNormalizeTeam({
      ...team,
      ...updates,
    });

    // Validate leader exists
    if (updated.leaderId && !this._positions.has(updated.leaderId)) {
      throw new Error(`Leader position "${updated.leaderId}" not found`);
    }

    // Validate all members exist
    for (const memberId of updated.memberIds) {
      if (!this._positions.has(memberId)) {
        throw new Error(`Member position "${memberId}" not found`);
      }
    }

    this._teams.set(id, updated);
    this._log("info", `Team updated: ${updated.name} (${id})`);
    this._emit("pipelineBuilder:team:updated", { team: updated });

    // Persist
    this._persist();

    return updated;
  },

  /**
   * Delete a team
   * @param {string} id - Team ID
   * @param {boolean} deletePositions - Also delete team positions
   * @returns {boolean} Success
   */
  deleteTeam(id, deletePositions = false) {
    const team = this._teams.get(id);
    if (!team) {
      return false;
    }

    if (deletePositions) {
      // Delete all positions in this team
      const positions = this.getTeamPositions(id);
      for (const position of positions) {
        if (!position.isMandatory) {
          this._positions.delete(position.id);
        }
      }
    } else {
      // Just unassign positions from team
      const positions = this.getTeamPositions(id);
      for (const position of positions) {
        position.teamId = null;
      }
    }

    this._teams.delete(id);
    this._log("info", `Team deleted: ${team.name} (${id})`);
    this._emit("pipelineBuilder:team:deleted", { id, team });

    // Persist
    this._persist();

    return true;
  },

  /**
   * Add a position to a team (as member)
   * @param {string} positionId - Position ID
   * @param {string} teamId - Team ID
   * @returns {Object} Updated team
   */
  addPositionToTeam(positionId, teamId) {
    const team = this._teams.get(teamId);
    if (!team) {
      throw new Error(`Team "${teamId}" not found`);
    }

    const position = this._positions.get(positionId);
    if (!position) {
      throw new Error(`Position "${positionId}" not found`);
    }

    // Update position's team reference
    position.teamId = teamId;
    if (position.tier === "executive") {
      position.tier = "member"; // Demote from executive
      this._executivePositions.delete(positionId);
    }

    // Add to team's member list
    if (!team.memberIds.includes(positionId)) {
      team.memberIds.push(positionId);
    }

    this._emit("pipelineBuilder:team:memberAdded", { teamId, positionId });

    // Persist
    this._persist();

    return team;
  },

  /**
   * Remove a member position from a team
   * @param {string} teamId - Team ID
   * @param {string} positionId - Position ID
   * @returns {Object} Updated team
   */
  removeMemberFromTeam(teamId, positionId) {
    const team = this._teams.get(teamId);
    if (!team) {
      throw new Error(`Team "${teamId}" not found`);
    }

    if (team.leaderId === positionId) {
      throw new Error(
        `Cannot remove leader from team - assign a new leader first`,
      );
    }

    const position = this._positions.get(positionId);
    if (position && position.teamId === teamId) {
      position.teamId = null;
    }

    team.memberIds = team.memberIds.filter((id) => id !== positionId);

    this._emit("pipelineBuilder:team:memberRemoved", { teamId, positionId });

    // Persist
    this._persist();

    return team;
  },

  /**
   * Set team leader
   * @param {string} teamId - Team ID
   * @param {string} positionId - Position ID for new leader
   * @returns {Object} Updated team
   */
  setTeamLeader(teamId, positionId) {
    const team = this._teams.get(teamId);
    if (!team) {
      throw new Error(`Team "${teamId}" not found`);
    }

    const position = this._positions.get(positionId);
    if (!position) {
      throw new Error(`Position "${positionId}" not found`);
    }

    // Demote current leader to member
    if (team.leaderId) {
      const oldLeader = this._positions.get(team.leaderId);
      if (oldLeader) {
        oldLeader.tier = "member";
        if (!team.memberIds.includes(team.leaderId)) {
          team.memberIds.push(team.leaderId);
        }
      }
    }

    // Promote new leader
    position.tier = "leader";
    position.teamId = teamId;
    team.memberIds = team.memberIds.filter((id) => id !== positionId);
    team.leaderId = positionId;

    this._emit("pipelineBuilder:team:leaderChanged", { teamId, positionId });

    // Persist
    this._persist();

    return team;
  },

  /**
   * Get team leader agent
   * @param {string} teamId - Team ID
   * @returns {Object|null} Leader's agent or null
   */
  getTeamLeaderAgent(teamId) {
    const team = this._teams.get(teamId);
    if (!team || !team.leaderId) {
      return null;
    }
    return this.getAgentForPosition(team.leaderId);
  },

  /**
   * Validate and normalize team data
   * @param {Object} data - Team data
   * @returns {Object} Normalized team
   */
  _validateAndNormalizeTeam(data) {
    if (!data.id) {
      throw new Error("Team ID is required");
    }
    if (!data.name) {
      throw new Error("Team name is required");
    }
    if (!data.leaderId) {
      throw new Error("Team leader ID is required");
    }

    return {
      id: String(data.id),
      name: String(data.name),
      description: data.description || "",
      icon: data.icon || "e",
      leaderId: String(data.leaderId),
      leaderPositionId: data.leaderPositionId
        ? String(data.leaderPositionId)
        : String(data.leaderId),
      memberIds: (data.memberIds || []).map(String),
      settings: {
        outputObjectName: data.settings?.outputObjectName || "",
        contextObjectName: data.settings?.contextObjectName || "",
        threadFirstMessage: data.settings?.threadFirstMessage || "",
        taskThreadFirstMessage: data.settings?.taskThreadFirstMessage || "",
      },
      displayOrder: data.displayOrder || 0,
    };
  },

  // =========================================================================
  // PIPELINE MANAGEMENT
  // =========================================================================

  /**
   * Create a new pipeline
   * @param {Object} config - Pipeline configuration
   * @returns {Object} Created pipeline
   */
  createPipeline(config) {
    const validation = this._validatePipeline(config);
    if (!validation.valid) {
      throw new Error(`Invalid pipeline: ${validation.errors.join(", ")}`);
    }

    const pipeline = this._normalizePipeline(config);

    if (this._pipelines.has(pipeline.id)) {
      throw new Error(`Pipeline with ID "${pipeline.id}" already exists`);
    }

    this._pipelines.set(pipeline.id, pipeline);

    this._log("info", `Pipeline created: ${pipeline.name} (${pipeline.id})`);
    this._emit("pipelineBuilder:pipeline:created", { pipeline });

    // Persist
    this._persist();

    return pipeline;
  },

  /**
   * Get a pipeline by ID
   * @param {string} pipelineId - Pipeline ID
   * @returns {Object|null} Pipeline or null
   */
  getPipeline(pipelineId) {
    return this._pipelines.get(pipelineId) || null;
  },

  /**
   * Get all pipelines
   * @returns {Object[]} Array of pipelines
   */
  getAllPipelines() {
    return Array.from(this._pipelines.values());
  },

  /**
   * Update a pipeline
   * @param {string} pipelineId - Pipeline ID
   * @param {Object} updates - Updates to apply
   * @returns {Object} Updated pipeline
   */
  updatePipeline(pipelineId, updates) {
    const pipeline = this._pipelines.get(pipelineId);
    if (!pipeline) {
      throw new Error(`Pipeline "${pipelineId}" not found`);
    }

    const updated = this._normalizePipeline({
      ...pipeline,
      ...updates,
      id: pipelineId, // Prevent ID change
      metadata: {
        ...pipeline.metadata,
        updatedAt: Date.now(),
      },
    });

    this._pipelines.set(pipelineId, updated);
    this._log("info", `Pipeline updated: ${updated.name}`);
    this._emit("pipelineBuilder:pipeline:updated", { pipeline: updated });

    // Persist
    this._persist();

    return updated;
  },

  /**
   * Delete a pipeline
   * @param {string} pipelineId - Pipeline ID
   * @returns {boolean} Success
   */
  deletePipeline(pipelineId) {
    if (!this._pipelines.has(pipelineId)) {
      return false;
    }

    this._pipelines.delete(pipelineId);
    this._log("info", `Pipeline deleted: ${pipelineId}`);
    this._emit("pipelineBuilder:pipeline:deleted", { pipelineId });

    // Persist
    this._persist();

    return true;
  },

  /**
   * Clone a pipeline
   * @param {string} pipelineId - Pipeline ID to clone
   * @param {string} newId - New pipeline ID (optional)
   * @returns {Object} Cloned pipeline
   */
  clonePipeline(pipelineId, newId = null) {
    const original = this._pipelines.get(pipelineId);
    if (!original) {
      throw new Error(`Pipeline "${pipelineId}" not found`);
    }

    const cloneId = newId || `${pipelineId}_clone_${Date.now()}`;
    const clone = {
      ...JSON.parse(JSON.stringify(original)),
      id: cloneId,
      name: `${original.name} (Clone)`,
      metadata: {
        ...original.metadata,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    };

    return this.createPipeline(clone);
  },

  /**
   * Validate a pipeline configuration
   * @param {string|Object} pipelineIdOrConfig - Pipeline ID or config object
   * @returns {Object} Validation result { valid: boolean, errors: string[], warnings: string[] }
   */
  validatePipeline(pipelineIdOrConfig) {
    let config;
    if (typeof pipelineIdOrConfig === "string") {
      config = this._pipelines.get(pipelineIdOrConfig);
      if (!config) {
        return {
          valid: false,
          errors: [`Pipeline "${pipelineIdOrConfig}" not found`],
          warnings: [],
        };
      }
    } else {
      config = pipelineIdOrConfig;
    }

    return this._validatePipeline(config);
  },

  /**
   * Internal pipeline validation
   * @param {Object} pipeline - Pipeline to validate
   * @returns {Object} Validation result
   */
  _validatePipeline(pipeline) {
    const errors = [];
    const warnings = [];

    // Required fields
    if (!pipeline.id) {
      errors.push("Pipeline requires an id");
    } else if (typeof pipeline.id !== "string") {
      errors.push("Pipeline id must be a string");
    } else if (!/^[a-zA-Z0-9_-]+$/.test(pipeline.id)) {
      errors.push(
        "Pipeline id must contain only alphanumeric characters, underscores, and hyphens",
      );
    }

    if (!pipeline.name) {
      warnings.push("Pipeline should have a name (using id as fallback)");
    }

    // Phases validation
    if (pipeline.phases) {
      if (!Array.isArray(pipeline.phases)) {
        errors.push("Pipeline phases must be an array");
      } else {
        const phaseIds = new Set();
        pipeline.phases.forEach((phase, index) => {
          if (!phase.id) {
            errors.push(`Phase at index ${index} requires an id`);
          } else if (phaseIds.has(phase.id)) {
            errors.push(`Duplicate phase id: ${phase.id}`);
          } else {
            phaseIds.add(phase.id);
          }

          // Validate actions within phase
          if (phase.actions && Array.isArray(phase.actions)) {
            const actionIds = new Set();
            phase.actions.forEach((action, actionIndex) => {
              if (!action.id) {
                errors.push(
                  `Action at index ${actionIndex} in phase ${phase.id || index} requires an id`,
                );
              } else if (actionIds.has(action.id)) {
                errors.push(
                  `Duplicate action id in phase ${phase.id}: ${action.id}`,
                );
              } else {
                actionIds.add(action.id);
              }

              // Validate action type
              if (action.actionType) {
                const validTypes = Object.values(this.ActionType);
                if (!validTypes.includes(action.actionType)) {
                  warnings.push(
                    `Unknown action type "${action.actionType}" in action ${action.id}`,
                  );
                }
              }

              // Validate participants
              if (
                action.participants?.positionIds?.length === 0 &&
                action.participants?.teamIds?.length === 0 &&
                !action.participants?.characters?.enabled &&
                action.actionType !== this.ActionType.SYSTEM &&
                action.actionType !== this.ActionType.USER_GAVEL
              ) {
                warnings.push(
                  `Action ${action.id} has no participants configured`,
                );
              }
            });
          }
        });
      }
    } else {
      warnings.push("Pipeline has no phases defined");
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  },

  /**
   * Normalize a pipeline definition
   * @param {Object} pipeline - Raw pipeline
   * @returns {Object} Normalized pipeline
   */
  _normalizePipeline(pipeline) {
    return {
      id: pipeline.id,
      name: pipeline.name || pipeline.id,
      description: pipeline.description || "",
      version: pipeline.version || "1.0.0",
      staticContext: {
        includeCharacterCard:
          pipeline.staticContext?.includeCharacterCard !== false,
        includeWorldInfo: pipeline.staticContext?.includeWorldInfo !== false,
        includePersona: pipeline.staticContext?.includePersona !== false,
        includeScenario: pipeline.staticContext?.includeScenario !== false,
        custom: pipeline.staticContext?.custom || {},
      },
      globals: {
        instructions: pipeline.globals?.instructions || "",
        outlineDraft: pipeline.globals?.outlineDraft || "",
        finalOutline: pipeline.globals?.finalOutline || "",
        firstDraft: pipeline.globals?.firstDraft || "",
        secondDraft: pipeline.globals?.secondDraft || "",
        finalDraft: pipeline.globals?.finalDraft || "",
        commentary: pipeline.globals?.commentary || "",
        custom: pipeline.globals?.custom || {},
      },
      constants: pipeline.constants || {},
      phases: (pipeline.phases || []).map((p, i) => this._normalizePhase(p, i)),
      metadata: {
        createdAt: pipeline.metadata?.createdAt || Date.now(),
        updatedAt: pipeline.metadata?.updatedAt || Date.now(),
        author: pipeline.metadata?.author || "",
        tags: pipeline.metadata?.tags || [],
      },
    };
  },

  // =========================================================================
  // PHASE MANAGEMENT
  // =========================================================================

  /**
   * Create a phase (add to pipeline)
   * @param {string} pipelineId - Pipeline ID
   * @param {Object} phaseConfig - Phase configuration
   * @returns {Object} Created phase
   */
  createPhase(pipelineId, phaseConfig) {
    const pipeline = this._pipelines.get(pipelineId);
    if (!pipeline) {
      throw new Error(`Pipeline "${pipelineId}" not found`);
    }

    const phase = this._normalizePhase(phaseConfig, pipeline.phases.length);

    // Check for duplicate ID
    if (pipeline.phases.some((p) => p.id === phase.id)) {
      throw new Error(`Phase with ID "${phase.id}" already exists in pipeline`);
    }

    pipeline.phases.push(phase);
    pipeline.metadata.updatedAt = Date.now();

    this._emit("pipelineBuilder:phase:created", { pipelineId, phase });

    // Persist
    this._persist();

    return phase;
  },

  /**
   * Get a phase by ID
   * @param {string} pipelineIdOrPhaseId - Pipeline ID or Phase ID (if single param)
   * @param {string} phaseId - Phase ID (optional if first param is phase ID)
   * @returns {Object|null} Phase or null
   */
  getPhase(pipelineIdOrPhaseId, phaseId = null) {
    // If phaseId is provided, use standard two-param syntax
    if (phaseId !== null) {
      const pipeline = this._pipelines.get(pipelineIdOrPhaseId);
      if (!pipeline) {
        return null;
      }
      return pipeline.phases.find((p) => p.id === phaseId) || null;
    }

    // Single param syntax: search all pipelines for phase by ID
    for (const pipeline of this._pipelines.values()) {
      const phase = pipeline.phases.find((p) => p.id === pipelineIdOrPhaseId);
      if (phase) {
        return phase;
      }
    }
    return null;
  },

  /**
   * Update a phase
   * @param {string} pipelineId - Pipeline ID
   * @param {string} phaseId - Phase ID
   * @param {Object} updates - Updates to apply
   * @returns {Object} Updated phase
   */
  updatePhase(pipelineId, phaseId, updates) {
    const pipeline = this._pipelines.get(pipelineId);
    if (!pipeline) {
      throw new Error(`Pipeline "${pipelineId}" not found`);
    }

    const phaseIndex = pipeline.phases.findIndex((p) => p.id === phaseId);
    if (phaseIndex === -1) {
      throw new Error(
        `Phase "${phaseId}" not found in pipeline "${pipelineId}"`,
      );
    }

    const phase = pipeline.phases[phaseIndex];
    const updated = this._normalizePhase(
      { ...phase, ...updates, id: phaseId },
      phaseIndex,
    );

    pipeline.phases[phaseIndex] = updated;
    pipeline.metadata.updatedAt = Date.now();

    this._emit("pipelineBuilder:phase:updated", { pipelineId, phase: updated });

    // Persist
    this._persist();

    return updated;
  },

  /**
   * Delete a phase
   * @param {string} pipelineId - Pipeline ID
   * @param {string} phaseId - Phase ID
   * @returns {boolean} Success
   */
  deletePhase(pipelineId, phaseId) {
    const pipeline = this._pipelines.get(pipelineId);
    if (!pipeline) {
      return false;
    }

    const phaseIndex = pipeline.phases.findIndex((p) => p.id === phaseId);
    if (phaseIndex === -1) {
      return false;
    }

    pipeline.phases.splice(phaseIndex, 1);
    pipeline.metadata.updatedAt = Date.now();

    this._emit("pipelineBuilder:phase:deleted", { pipelineId, phaseId });

    // Persist
    this._persist();

    return true;
  },

  /**
   * Reorder phases in a pipeline
   * @param {string} pipelineId - Pipeline ID
   * @param {string[]} phaseIds - Ordered array of phase IDs
   * @returns {Object} Updated pipeline
   */
  reorderPhases(pipelineId, phaseIds) {
    const pipeline = this._pipelines.get(pipelineId);
    if (!pipeline) {
      throw new Error(`Pipeline "${pipelineId}" not found`);
    }

    const phaseMap = new Map(pipeline.phases.map((p) => [p.id, p]));
    const reordered = [];

    for (const id of phaseIds) {
      const phase = phaseMap.get(id);
      if (phase) {
        phase.displayOrder = reordered.length;
        reordered.push(phase);
      }
    }

    pipeline.phases = reordered;
    pipeline.metadata.updatedAt = Date.now();

    this._emit("pipelineBuilder:phases:reordered", { pipelineId, phaseIds });

    // Persist
    this._persist();

    return pipeline;
  },

  /**
   * Normalize a phase definition
   * @param {Object} phase - Raw phase
   * @param {number} index - Phase index
   * @returns {Object} Normalized phase
   */
  _normalizePhase(phase, index) {
    return {
      id: phase.id,
      name: phase.name || phase.id,
      description: phase.description || "",
      icon: phase.icon || "o",
      teams: phase.teams || [],
      threads: {
        phaseThread: this._normalizeThreadConfig(phase.threads?.phaseThread),
        teamThreads: phase.threads?.teamThreads || {},
      },
      context: {
        static: phase.context?.static || [],
        global: phase.context?.global || [],
        phase: phase.context?.phase || [],
        team: phase.context?.team || [],
        stores: phase.context?.stores || [],
      },
      actions: (phase.actions || []).map((a, i) => this._normalizeAction(a, i)),
      output: {
        phaseOutput: this._normalizeOutputConfig(phase.output?.phaseOutput),
        teamOutputs: phase.output?.teamOutputs || {},
        consolidation: phase.output?.consolidation || "last_action",
        consolidationActionId: phase.output?.consolidationActionId || "",
      },
      gavel: {
        enabled: phase.gavel?.enabled || false,
        prompt: phase.gavel?.prompt || "Review and edit if needed:",
        editableFields: phase.gavel?.editableFields || ["output"],
        canSkip: phase.gavel?.canSkip !== false,
      },
      constants: phase.constants || {},
      variables: phase.variables || {},
      displayOrder: phase.displayOrder ?? index,
    };
  },

  // =========================================================================
  // ACTION MANAGEMENT
  // =========================================================================

  /**
   * Create an action (add to phase)
   * @param {string} pipelineId - Pipeline ID
   * @param {string} phaseId - Phase ID
   * @param {Object} actionConfig - Action configuration
   * @returns {Object} Created action
   */
  createAction(pipelineId, phaseId, actionConfig) {
    const pipeline = this._pipelines.get(pipelineId);
    if (!pipeline) {
      throw new Error(`Pipeline "${pipelineId}" not found`);
    }

    const phase = pipeline.phases.find((p) => p.id === phaseId);
    if (!phase) {
      throw new Error(`Phase "${phaseId}" not found in pipeline "${pipelineId}"`);
    }

    const action = this._normalizeAction(actionConfig, phase.actions.length);

    // Check for duplicate ID
    if (phase.actions.some((a) => a.id === action.id)) {
      throw new Error(`Action with ID "${action.id}" already exists in phase`);
    }

    phase.actions.push(action);
    pipeline.metadata.updatedAt = Date.now();

    this._emit("pipelineBuilder:action:created", { pipelineId, phaseId, action });

    // Persist
    this._persist();

    return action;
  },

  /**
   * Get an action by ID
   * @param {string} pipelineIdOrActionId - Pipeline ID or Action ID (if single param)
   * @param {string} phaseId - Phase ID (optional)
   * @param {string} actionId - Action ID (optional)
   * @returns {Object|null} Action or null
   */
  getAction(pipelineIdOrActionId, phaseId = null, actionId = null) {
    // If all three params provided, use standard syntax
    if (phaseId !== null && actionId !== null) {
      const phase = this.getPhase(pipelineIdOrActionId, phaseId);
      if (!phase) {
        return null;
      }
      return phase.actions.find((a) => a.id === actionId) || null;
    }

    // Single param syntax: search all pipelines/phases for action by ID
    for (const pipeline of this._pipelines.values()) {
      for (const phase of pipeline.phases) {
        const action = phase.actions.find((a) => a.id === pipelineIdOrActionId);
        if (action) {
          return action;
        }
      }
    }
    return null;
  },

  /**
   * Update an action
   * @param {string} pipelineId - Pipeline ID
   * @param {string} phaseId - Phase ID
   * @param {string} actionId - Action ID
   * @param {Object} updates - Updates to apply
   * @returns {Object} Updated action
   */
  updateAction(pipelineId, phaseId, actionId, updates) {
    const pipeline = this._pipelines.get(pipelineId);
    if (!pipeline) {
      throw new Error(`Pipeline "${pipelineId}" not found`);
    }

    const phase = pipeline.phases.find((p) => p.id === phaseId);
    if (!phase) {
      throw new Error(`Phase "${phaseId}" not found`);
    }

    const actionIndex = phase.actions.findIndex((a) => a.id === actionId);
    if (actionIndex === -1) {
      throw new Error(`Action "${actionId}" not found`);
    }

    const action = phase.actions[actionIndex];
    const updated = this._normalizeAction(
      { ...action, ...updates, id: actionId },
      actionIndex,
    );

    phase.actions[actionIndex] = updated;
    pipeline.metadata.updatedAt = Date.now();

    this._emit("pipelineBuilder:action:updated", { pipelineId, phaseId, action: updated });

    // Persist
    this._persist();

    return updated;
  },

  /**
   * Delete an action
   * @param {string} pipelineId - Pipeline ID
   * @param {string} phaseId - Phase ID
   * @param {string} actionId - Action ID
   * @returns {boolean} Success
   */
  deleteAction(pipelineId, phaseId, actionId) {
    const pipeline = this._pipelines.get(pipelineId);
    if (!pipeline) {
      return false;
    }

    const phase = pipeline.phases.find((p) => p.id === phaseId);
    if (!phase) {
      return false;
    }

    const actionIndex = phase.actions.findIndex((a) => a.id === actionId);
    if (actionIndex === -1) {
      return false;
    }

    phase.actions.splice(actionIndex, 1);
    pipeline.metadata.updatedAt = Date.now();

    this._emit("pipelineBuilder:action:deleted", { pipelineId, phaseId, actionId });

    // Persist
    this._persist();

    return true;
  },

  /**
   * Reorder actions in a phase
   * @param {string} pipelineId - Pipeline ID
   * @param {string} phaseId - Phase ID
   * @param {string[]} actionIds - Ordered array of action IDs
   * @returns {Object} Updated phase
   */
  reorderActions(pipelineId, phaseId, actionIds) {
    const pipeline = this._pipelines.get(pipelineId);
    if (!pipeline) {
      throw new Error(`Pipeline "${pipelineId}" not found`);
    }

    const phase = pipeline.phases.find((p) => p.id === phaseId);
    if (!phase) {
      throw new Error(`Phase "${phaseId}" not found`);
    }

    const actionMap = new Map(phase.actions.map((a) => [a.id, a]));
    const reordered = [];

    for (const id of actionIds) {
      const action = actionMap.get(id);
      if (action) {
        action.displayOrder = reordered.length;
        reordered.push(action);
      }
    }

    phase.actions = reordered;
    pipeline.metadata.updatedAt = Date.now();

    this._emit("pipelineBuilder:actions:reordered", { pipelineId, phaseId, actionIds });

    // Persist
    this._persist();

    return phase;
  },

  /**
   * Normalize an action definition
   * @param {Object} action - Raw action
   * @param {number} index - Action index
   * @returns {Object} Normalized action
   */
  _normalizeAction(action, index) {
    const actionType = action.actionType || this.ActionType.STANDARD;

    const normalized = {
      id: action.id,
      name: action.name || action.id,
      description: action.description || "",
      actionType: actionType,
      execution: {
        mode: action.execution?.mode || "sync",
        trigger: {
          type: action.execution?.trigger?.type || "sequential",
          targetActionId: action.execution?.trigger?.targetActionId || "",
          targetState: action.execution?.trigger?.targetState || "complete",
        },
        timeout: action.execution?.timeout || 60000,
        retryCount: action.execution?.retryCount || 0,
      },
      participants: {
        positionIds: action.participants?.positionIds || [],
        teamIds: action.participants?.teamIds || [],
        orchestration: action.participants?.orchestration || "sequential",
        maxRounds: action.participants?.maxRounds || 3,
        characters: {
          enabled: action.participants?.characters?.enabled || false,
          mode: action.participants?.characters?.mode || "dynamic",
          characterIds: action.participants?.characters?.characterIds || [],
          characterTypes: action.participants?.characters?.characterTypes || [],
          includeDirector: action.participants?.characters?.includeDirector || false,
          voicingGuidance: action.participants?.characters?.voicingGuidance || "",
          ragContext: {
            enabled: action.participants?.characters?.ragContext?.enabled || false,
            pipelineId: action.participants?.characters?.ragContext?.pipelineId || "",
            queryTemplate: action.participants?.characters?.ragContext?.queryTemplate || "",
          },
        },
      },
      threads: {
        actionThread: this._normalizeThreadConfig(action.threads?.actionThread),
        teamTaskThreads: action.threads?.teamTaskThreads || {},
      },
      input: {
        source: action.input?.source || "phaseInput",
        sourceKey: action.input?.sourceKey || "",
        transform: action.input?.transform || "",
      },
      output: this._normalizeOutputConfig(action.output),
      contextOverrides: {
        include: action.contextOverrides?.include || [],
        exclude: action.contextOverrides?.exclude || [],
        priority: action.contextOverrides?.priority || [],
      },
      rag: {
        enabled: action.rag?.enabled || false,
        ragPipelineId: action.rag?.ragPipelineId || "",
        queryTemplate: action.rag?.queryTemplate || "",
        resultTarget: action.rag?.resultTarget || "context",
      },
      promptTemplate: action.promptTemplate || "",
      displayOrder: action.displayOrder ?? index,
    };

    // Add type-specific configuration
    if (actionType === this.ActionType.CRUD_PIPELINE) {
      normalized.crudConfig = {
        pipelineId: action.crudConfig?.pipelineId || "",
        operation: action.crudConfig?.operation || "create",
        storeId: action.crudConfig?.storeId || "",
        inputMapping: action.crudConfig?.inputMapping || {},
        outputMapping: action.crudConfig?.outputMapping || {},
      };
    }

    if (actionType === this.ActionType.RAG_PIPELINE) {
      normalized.ragConfig = {
        pipelineId: action.ragConfig?.pipelineId || "",
        querySource: action.ragConfig?.querySource || "input",
        queryTemplate: action.ragConfig?.queryTemplate || "{{input}}",
        resultTarget: action.ragConfig?.resultTarget || "context",
        maxResults: action.ragConfig?.maxResults || 5,
      };
    }

    if (actionType === this.ActionType.DELIBERATIVE_RAG) {
      normalized.deliberativeConfig = {
        queryParticipants: action.deliberativeConfig?.queryParticipants || [],
        curationPositions: action.deliberativeConfig?.curationPositions || [
          "archivist",
          "story_topologist",
          "lore_topologist",
          "character_topologist",
        ],
        maxRounds: action.deliberativeConfig?.maxRounds || 3,
        availableRAGPipelines: action.deliberativeConfig?.availableRAGPipelines || [],
        availableStores: action.deliberativeConfig?.availableStores || [],
        deliberationThread: action.deliberativeConfig?.deliberationThread || {
          enabled: true,
          name: "Deliberative RAG",
        },
        consolidation: action.deliberativeConfig?.consolidation || "synthesize",
        curationPrompt:
          action.deliberativeConfig?.curationPrompt ||
          "You are a member of the Record Keeping team with access to story data. Answer questions accurately based on stored information.",
      };
    }

    if (actionType === this.ActionType.USER_GAVEL) {
      normalized.gavelConfig = {
        prompt: action.gavelConfig?.prompt || "Review and edit if needed:",
        editableFields: action.gavelConfig?.editableFields || ["output"],
        canSkip: action.gavelConfig?.canSkip !== false,
        timeout: action.gavelConfig?.timeout || 0,
      };
    }

    if (actionType === this.ActionType.CHARACTER_WORKSHOP) {
      normalized.characterWorkshopConfig = {
        mode: action.characterWorkshopConfig?.mode || "refinement",
        characterIds: action.characterWorkshopConfig?.characterIds || [],
        includeDirector: action.characterWorkshopConfig?.includeDirector !== false,
        editorialPositions: action.characterWorkshopConfig?.editorialPositions || [],
        ragConfig: {
          enabled: action.characterWorkshopConfig?.ragConfig?.enabled || true,
          pipelineId: action.characterWorkshopConfig?.ragConfig?.pipelineId || "",
          storeIds: action.characterWorkshopConfig?.ragConfig?.storeIds || ["characterSheets"],
        },
        prompts: {
          director:
            action.characterWorkshopConfig?.prompts?.director ||
            "As Character Director, guide this workshop to refine character voices and ensure consistency.",
          refinement:
            action.characterWorkshopConfig?.prompts?.refinement ||
            "Analyze and refine this character's voice, mannerisms, and speech patterns based on the provided context.",
          consistency:
            action.characterWorkshopConfig?.prompts?.consistency ||
            "Check this character's portrayal for consistency with established traits and history.",
        },
        consolidation: action.characterWorkshopConfig?.consolidation || "synthesize",
        workshopThread: {
          enabled: action.characterWorkshopConfig?.workshopThread?.enabled !== false,
          name: action.characterWorkshopConfig?.workshopThread?.name || "Character Workshop",
        },
      };
    }

    return normalized;
  },

  /**
   * Normalize thread config
   * @param {Object} config - Raw config
   * @returns {Object} Normalized config
   */
  _normalizeThreadConfig(config) {
    return {
      enabled: config?.enabled !== false,
      firstMessage: config?.firstMessage || "",
      maxMessages: config?.maxMessages || 100,
    };
  },

  /**
   * Normalize output config
   * @param {Object} config - Raw config
   * @returns {Object} Normalized config
   */
  _normalizeOutputConfig(config) {
    return {
      target: config?.target || "phaseOutput",
      targetKey: config?.targetKey || "",
      append: config?.append || false,
    };
  },

  // =========================================================================
  // THREAD CONFIGURATION (absorbed from thread-manager.js)
  // =========================================================================

  /**
   * Get thread configuration for a phase
   * @param {string} pipelineId - Pipeline ID
   * @param {string} phaseId - Phase ID
   * @returns {Object|null} Thread configuration
   */
  getPhaseThreadConfig(pipelineId, phaseId) {
    const phase = this.getPhase(pipelineId, phaseId);
    if (!phase) {
      return null;
    }
    return phase.threads || null;
  },

  /**
   * Get thread configuration for an action
   * @param {string} pipelineId - Pipeline ID
   * @param {string} phaseId - Phase ID
   * @param {string} actionId - Action ID
   * @returns {Object|null} Thread configuration
   */
  getActionThreadConfig(pipelineId, phaseId, actionId) {
    const action = this.getAction(pipelineId, phaseId, actionId);
    if (!action) {
      return null;
    }
    return action.threads || null;
  },

  /**
   * Update thread configuration for a phase
   * @param {string} pipelineId - Pipeline ID
   * @param {string} phaseId - Phase ID
   * @param {Object} threadConfig - Updated thread configuration
   * @returns {Object} Updated phase
   */
  updatePhaseThreadConfig(pipelineId, phaseId, threadConfig) {
    const phase = this.getPhase(pipelineId, phaseId);
    if (!phase) {
      throw new Error(`Phase "${phaseId}" not found in pipeline "${pipelineId}"`);
    }

    return this.updatePhase(pipelineId, phaseId, {
      threads: {
        phaseThread: this._normalizeThreadConfig(threadConfig.phaseThread || phase.threads?.phaseThread),
        teamThreads: {
          ...phase.threads?.teamThreads,
          ...threadConfig.teamThreads,
        },
      },
    });
  },

  /**
   * Update thread configuration for an action
   * @param {string} pipelineId - Pipeline ID
   * @param {string} phaseId - Phase ID
   * @param {string} actionId - Action ID
   * @param {Object} threadConfig - Updated thread configuration
   * @returns {Object} Updated action
   */
  updateActionThreadConfig(pipelineId, phaseId, actionId, threadConfig) {
    const action = this.getAction(pipelineId, phaseId, actionId);
    if (!action) {
      throw new Error(`Action "${actionId}" not found`);
    }

    return this.updateAction(pipelineId, phaseId, actionId, {
      threads: {
        actionThread: this._normalizeThreadConfig(threadConfig.actionThread || action.threads?.actionThread),
        teamTaskThreads: {
          ...action.threads?.teamTaskThreads,
          ...threadConfig.teamTaskThreads,
        },
      },
    });
  },

  /**
   * Create a thread configuration schema for a team
   * @param {string} teamId - Team ID
   * @param {Object} config - Thread configuration
   * @returns {Object} Normalized thread config
   */
  createTeamThreadConfig(teamId, config = {}) {
    return {
      [teamId]: this._normalizeThreadConfig(config),
    };
  },

  // =========================================================================
  // CONTEXT CONFIGURATION (absorbed from context-manager.js)
  // =========================================================================

  /**
   * Context block types
   * @type {Object}
   */
  ContextBlockType: {
    STATIC: "static",
    GLOBAL: "global",
    PHASE: "phase",
    TEAM: "team",
    STORE: "store",
    RAG: "rag",
    CUSTOM: "custom",
  },

  /**
   * Get context configuration for a phase
   * @param {string} pipelineId - Pipeline ID
   * @param {string} phaseId - Phase ID
   * @returns {Object|null} Context configuration
   */
  getPhaseContextConfig(pipelineId, phaseId) {
    const phase = this.getPhase(pipelineId, phaseId);
    if (!phase) {
      return null;
    }
    return phase.context || null;
  },

  /**
   * Get context overrides for an action
   * @param {string} pipelineId - Pipeline ID
   * @param {string} phaseId - Phase ID
   * @param {string} actionId - Action ID
   * @returns {Object|null} Context overrides
   */
  getActionContextOverrides(pipelineId, phaseId, actionId) {
    const action = this.getAction(pipelineId, phaseId, actionId);
    if (!action) {
      return null;
    }
    return action.contextOverrides || null;
  },

  /**
   * Update context configuration for a phase
   * @param {string} pipelineId - Pipeline ID
   * @param {string} phaseId - Phase ID
   * @param {Object} contextConfig - Updated context configuration
   * @returns {Object} Updated phase
   */
  updatePhaseContextConfig(pipelineId, phaseId, contextConfig) {
    const phase = this.getPhase(pipelineId, phaseId);
    if (!phase) {
      throw new Error(`Phase "${phaseId}" not found in pipeline "${pipelineId}"`);
    }

    const updated = {
      static: contextConfig.static || phase.context?.static || [],
      global: contextConfig.global || phase.context?.global || [],
      phase: contextConfig.phase || phase.context?.phase || [],
      team: contextConfig.team || phase.context?.team || [],
      stores: contextConfig.stores || phase.context?.stores || [],
    };

    return this.updatePhase(pipelineId, phaseId, { context: updated });
  },

  /**
   * Update context overrides for an action
   * @param {string} pipelineId - Pipeline ID
   * @param {string} phaseId - Phase ID
   * @param {string} actionId - Action ID
   * @param {Object} contextOverrides - Updated context overrides
   * @returns {Object} Updated action
   */
  updateActionContextOverrides(pipelineId, phaseId, actionId, contextOverrides) {
    const action = this.getAction(pipelineId, phaseId, actionId);
    if (!action) {
      throw new Error(`Action "${actionId}" not found`);
    }

    const updated = {
      include: contextOverrides.include || action.contextOverrides?.include || [],
      exclude: contextOverrides.exclude || action.contextOverrides?.exclude || [],
      priority: contextOverrides.priority || action.contextOverrides?.priority || [],
    };

    return this.updateAction(pipelineId, phaseId, actionId, { contextOverrides: updated });
  },

  /**
   * Validate context block definition
   * @param {Object} block - Context block definition
   * @returns {Object} Validation result
   */
  validateContextBlock(block) {
    const errors = [];
    const warnings = [];

    if (!block.type) {
      errors.push("Context block requires a type");
    } else if (!Object.values(this.ContextBlockType).includes(block.type)) {
      warnings.push(`Unknown context block type: ${block.type}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  },

  // =========================================================================
  // VARIABLE I/O SCHEMAS
  // =========================================================================

  /**
   * Variable scope types
   * @type {Object}
   */
  VariableScope: {
    ACTION: "action",
    PHASE: "phase",
    PIPELINE: "pipeline",
  },

  /**
   * Variable source types
   * @type {Object}
   */
  VariableSource: {
    USER_INPUT: "userInput",
    PREVIOUS_ACTION: "previousAction",
    PREVIOUS_PHASE: "previousPhase",
    GLOBAL: "global",
    STORE: "store",
    RAG: "rag",
    CUSTOM: "custom",
  },

  /**
   * Variable target types
   * @type {Object}
   */
  VariableTarget: {
    NEXT_ACTION: "nextAction",
    PHASE_OUTPUT: "phaseOutput",
    GLOBAL: "global",
    STORE: "store",
    CONTEXT: "context",
  },

  /**
   * Get input/output configuration for an action
   * @param {string} pipelineId - Pipeline ID
   * @param {string} phaseId - Phase ID
   * @param {string} actionId - Action ID
   * @returns {Object|null} I/O configuration
   */
  getActionIO(pipelineId, phaseId, actionId) {
    const action = this.getAction(pipelineId, phaseId, actionId);
    if (!action) {
      return null;
    }
    return {
      input: action.input || {},
      output: action.output || {},
    };
  },

  /**
   * Update input configuration for an action
   * @param {string} pipelineId - Pipeline ID
   * @param {string} phaseId - Phase ID
   * @param {string} actionId - Action ID
   * @param {Object} inputConfig - Updated input configuration
   * @returns {Object} Updated action
   */
  updateActionInput(pipelineId, phaseId, actionId, inputConfig) {
    const action = this.getAction(pipelineId, phaseId, actionId);
    if (!action) {
      throw new Error(`Action "${actionId}" not found`);
    }

    const updated = {
      source: inputConfig.source || action.input?.source || "phaseInput",
      sourceKey: inputConfig.sourceKey || action.input?.sourceKey || "",
      transform: inputConfig.transform || action.input?.transform || "",
    };

    return this.updateAction(pipelineId, phaseId, actionId, { input: updated });
  },

  /**
   * Update output configuration for an action
   * @param {string} pipelineId - Pipeline ID
   * @param {string} phaseId - Phase ID
   * @param {string} actionId - Action ID
   * @param {Object} outputConfig - Updated output configuration
   * @returns {Object} Updated action
   */
  updateActionOutput(pipelineId, phaseId, actionId, outputConfig) {
    return this.updateAction(pipelineId, phaseId, actionId, {
      output: this._normalizeOutputConfig(outputConfig),
    });
  },

  /**
   * Get global variables for a pipeline
   * @param {string} pipelineId - Pipeline ID
   * @returns {Object|null} Global variables
   */
  getGlobalVariables(pipelineId) {
    const pipeline = this.getPipeline(pipelineId);
    if (!pipeline) {
      return null;
    }
    return pipeline.globals || {};
  },

  /**
   * Update global variables for a pipeline
   * @param {string} pipelineId - Pipeline ID
   * @param {Object} updates - Updated variables
   * @returns {Object} Updated pipeline
   */
  updateGlobalVariables(pipelineId, updates) {
    const pipeline = this.getPipeline(pipelineId);
    if (!pipeline) {
      throw new Error(`Pipeline "${pipelineId}" not found`);
    }

    return this.updatePipeline(pipelineId, {
      globals: {
        ...pipeline.globals,
        ...updates,
      },
    });
  },

  /**
   * Set a global variable for a pipeline
   * @param {string} pipelineId - Pipeline ID
   * @param {string} key - Variable key
   * @param {*} value - Variable value
   * @returns {Object} Updated pipeline
   */
  setGlobalVariable(pipelineId, key, value) {
    return this.updateGlobalVariables(pipelineId, { [key]: value });
  },

  /**
   * Get phase variables
   * @param {string} pipelineId - Pipeline ID
   * @param {string} phaseId - Phase ID
   * @returns {Object|null} Phase variables
   */
  getPhaseVariables(pipelineId, phaseId) {
    const phase = this.getPhase(pipelineId, phaseId);
    if (!phase) {
      return null;
    }
    return phase.variables || {};
  },

  /**
   * Update phase variables
   * @param {string} pipelineId - Pipeline ID
   * @param {string} phaseId - Phase ID
   * @param {Object} updates - Updated variables
   * @returns {Object} Updated phase
   */
  updatePhaseVariables(pipelineId, phaseId, updates) {
    const phase = this.getPhase(pipelineId, phaseId);
    if (!phase) {
      throw new Error(`Phase "${phaseId}" not found in pipeline "${pipelineId}"`);
    }

    return this.updatePhase(pipelineId, phaseId, {
      variables: {
        ...phase.variables,
        ...updates,
      },
    });
  },

  /**
   * Validate variable I/O configuration
   * @param {Object} ioConfig - I/O configuration
   * @returns {Object} Validation result
   */
  validateVariableIO(ioConfig) {
    const errors = [];
    const warnings = [];

    if (ioConfig.input) {
      if (ioConfig.input.source && !Object.values(this.VariableSource).includes(ioConfig.input.source)) {
        warnings.push(`Unknown input source: ${ioConfig.input.source}`);
      }
    }

    if (ioConfig.output) {
      if (ioConfig.output.target && !Object.values(this.VariableTarget).includes(ioConfig.output.target)) {
        warnings.push(`Unknown output target: ${ioConfig.output.target}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  },

  // =========================================================================
  // HELPER METHODS
  // =========================================================================

  /**
   * Get positions that have a specific agent assigned
   * @param {string} agentId - Agent ID
   * @returns {Object[]} Array of positions
   */
  _getPositionsWithAgent(agentId) {
    return Array.from(this._positions.values()).filter(
      (p) => p.assignedAgentId === agentId,
    );
  },

  /**
   * Get pools that contain a specific agent
   * @param {string} agentId - Agent ID
   * @returns {Object[]} Array of pools
   */
  _getPoolsWithAgent(agentId) {
    return Array.from(this._agentPools.values()).filter((p) =>
      p.agentIds.includes(agentId),
    );
  },

  /**
   * Get positions that have a specific pool assigned
   * @param {string} poolId - Pool ID
   * @returns {Object[]} Array of positions
   */
  _getPositionsWithPool(poolId) {
    return Array.from(this._positions.values()).filter(
      (p) => p.assignedPoolId === poolId,
    );
  },

  /**
   * Check if all mandatory positions are filled
   * @returns {Object} Validation result { valid: boolean, unfilled: string[] }
   */
  validateAllPositionsFilled() {
    const unfilled = [];

    for (const position of this._positions.values()) {
      if (!this.isPositionFilled(position.id)) {
        unfilled.push(position.name);
      }
    }

    return {
      valid: unfilled.length === 0,
      unfilled,
    };
  },

  // =========================================================================
  // IMPORT / EXPORT
  // =========================================================================

  /**
   * Export all data
   * @returns {Object} Exportable data
   */
  export() {
    return {
      version: this.VERSION,
      exportedAt: Date.now(),
      companyName: this._companyName,
      agents: Array.from(this._agents.values()),
      agentPools: Array.from(this._agentPools.values()),
      positions: Array.from(this._positions.values()),
      teams: Array.from(this._teams.values()),
      pipelines: Array.from(this._pipelines.values()),
    };
  },

  /**
   * Import data
   * @param {Object} data - Data to import
   * @param {boolean} merge - Merge with existing data (default: replace)
   * @returns {boolean} Success
   */
  import(data, merge = false) {
    try {
      if (!merge) {
        this.clear();
      }

      if (data.companyName) {
        this._companyName = data.companyName;
      }

      // Import agents first (no dependencies)
      if (data.agents) {
        for (const agent of data.agents) {
          if (merge && this._agents.has(agent.id)) {
            continue;
          }
          this._agents.set(agent.id, this._validateAndNormalizeAgent(agent));
        }
      }

      // Import pools (depend on agents)
      if (data.agentPools) {
        for (const pool of data.agentPools) {
          if (merge && this._agentPools.has(pool.id)) {
            continue;
          }
          this._agentPools.set(pool.id, this._validateAndNormalizePool(pool));
          this._poolSelectionIndex.set(pool.id, 0);
        }
      }

      // Import teams (before positions to allow team reference)
      if (data.teams) {
        for (const team of data.teams) {
          if (merge && this._teams.has(team.id)) {
            continue;
          }
          // Temporarily set without validation
          this._teams.set(team.id, {
            ...team,
            memberIds: team.memberIds || [],
          });
        }
      }

      // Import positions (may reference teams, agents, pools)
      if (data.positions) {
        for (const position of data.positions) {
          if (merge && this._positions.has(position.id)) {
            continue;
          }
          const normalized = this._validateAndNormalizePosition(position);
          this._positions.set(position.id, normalized);
          if (normalized.tier === "executive" || !normalized.teamId) {
            this._executivePositions.set(position.id, normalized);
          }
        }
      }

      // Re-validate teams now that positions exist
      if (data.teams) {
        for (const team of data.teams) {
          const existing = this._teams.get(team.id);
          if (existing) {
            this._teams.set(team.id, this._validateAndNormalizeTeam(existing));
          }
        }
      }

      // Import pipelines
      if (data.pipelines) {
        for (const pipeline of data.pipelines) {
          if (merge && this._pipelines.has(pipeline.id)) {
            continue;
          }
          this._pipelines.set(pipeline.id, this._normalizePipeline(pipeline));
        }
      }

      // Ensure mandatory positions exist
      if (!this._positions.has("publisher")) {
        this._setupMandatoryPositions();
      }

      this._log("info", "Data imported successfully");
      this._emit("pipelineBuilder:imported");

      // Persist
      this._persist();

      return true;
    } catch (e) {
      this._log("error", "Import failed:", e);
      return false;
    }
  },

  /**
   * Export preset data (for Kernel preset management)
   * @returns {Object} Preset data
   */
  exportPresetData() {
    return {
      pipelineBuilder: {
        agents: Array.from(this._agents.values()),
        agentPools: Array.from(this._agentPools.values()),
        positions: Array.from(this._positions.values()),
        teams: Array.from(this._teams.values()),
        pipelines: Array.from(this._pipelines.values()),
      },
    };
  },

  /**
   * Apply preset data (called by Kernel)
   * @param {Object} preset - Preset containing pipelineBuilder data
   * @param {Object} options - Application options
   * @returns {Object} Application result
   */
  applyPreset(preset, options = {}) {
    const data = preset.pipelineBuilder || preset;
    return this.import(data, options.merge || false);
  },

  // =========================================================================
  // PERSISTENCE
  // =========================================================================

  /**
   * Persist data via Kernel
   */
  async _persist() {
    if (!this._kernel || !this._kernel.saveData) {
      return;
    }

    try {
      await this._kernel.saveData("pipelineBuilder", this.export(), { scope: "chat" });
    } catch (error) {
      this._log("error", "Failed to persist data:", error);
    }
  },

  /**
   * Load persisted data via Kernel
   */
  async loadPersistedData() {
    if (!this._kernel || !this._kernel.loadData) {
      return;
    }

    try {
      const data = await this._kernel.loadData("pipelineBuilder", { scope: "chat" });
      if (data) {
        this.import(data, false);
        this._log("info", "Loaded persisted data");
      }
    } catch (error) {
      this._log("error", "Failed to load persisted data:", error);
    }
  },

  // =========================================================================
  // SUMMARY / STATUS
  // =========================================================================

  /**
   * Get complete hierarchy structure
   * @returns {Object} Hierarchy data
   */
  getHierarchy() {
    return {
      companyName: this._companyName,
      executivePositions: this.getExecutivePositions(),
      teams: this.getAllTeams().map((team) => ({
        ...team,
        leader: this.getPosition(team.leaderId),
        members: team.memberIds
          .map((id) => this.getPosition(id))
          .filter(Boolean),
      })),
    };
  },

  /**
   * Get system summary
   * @returns {Object} Summary data
   */
  getSummary() {
    const validation = this.validateAllPositionsFilled();

    return {
      version: this.VERSION,
      initialized: this._initialized,
      companyName: this._companyName,
      counts: {
        agents: this._agents.size,
        agentPools: this._agentPools.size,
        positions: this._positions.size,
        executivePositions: this._executivePositions.size,
        teams: this._teams.size,
        pipelines: this._pipelines.size,
      },
      allPositionsFilled: validation.valid,
      unfilledPositions: validation.unfilled,
    };
  },

  /**
   * Set company name
   * @param {string} name - Company name
   */
  setCompanyName(name) {
    this._companyName = name || "The Council";
    this._emit("pipelineBuilder:companyNameChanged", { name: this._companyName });
    this._persist();
  },

  /**
   * Get company name
   * @returns {string} Company name
   */
  getCompanyName() {
    return this._companyName;
  },

  // =========================================================================
  // LOGGING & EVENTS
  // =========================================================================

  /**
   * Log a message
   * @param {string} level - Log level
   * @param {string} message - Message
   * @param {...any} args - Additional arguments
   */
  _log(level, message, ...args) {
    if (this._logger && typeof this._logger[level] === "function") {
      this._logger[level](`[PipelineBuilderSystem] ${message}`, ...args);
    } else {
      const method = level === "error" ? "error" : level === "warn" ? "warn" : "log";
      console[method](`[The_Council][PipelineBuilderSystem] ${message}`, ...args);
    }
  },

  /**
   * Emit an event via Kernel
   * @param {string} event - Event name
   * @param {Object} data - Event data
   */
  _emit(event, data = {}) {
    if (this._kernel && this._kernel.emit) {
      this._kernel.emit(event, data);
    }
  },
};

// ===== EXPORT =====

// Expose to window
if (typeof window !== "undefined") {
  window.PipelineBuilderSystem = PipelineBuilderSystem;
}

// CommonJS export
if (typeof module !== "undefined" && module.exports) {
  module.exports = PipelineBuilderSystem;
}
