/**
 * TheCouncil - Agents System
 *
 * Core module for managing the organizational structure:
 * - Agents (AI configurations)
 * - Positions (roles in the organization)
 * - Teams (groups with leaders and members)
 * - Agent Pools (for random/weighted selection)
 * - Hierarchy (complete organizational structure)
 *
 * @version 2.0.0
 */

const AgentsSystem = {
  // ===== VERSION =====
  VERSION: "2.0.0",

  // ===== STATE =====

  /**
   * All defined agents
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
   * Initialization flag
   * @type {boolean}
   */
  _initialized: false,

  /**
   * Logger reference
   */
  _logger: null,

  /**
   * Event listeners
   * @type {Map<string, Function[]>}
   */
  _listeners: new Map(),

  // ===== INITIALIZATION =====

  /**
   * Initialize the Agents System
   * @param {Object} options - Configuration options
   * @param {Object} options.logger - Logger instance
   * @param {Object} options.initialData - Initial hierarchy data
   * @returns {AgentsSystem}
   */
  init(options = {}) {
    if (options.logger) {
      this._logger = options.logger;
    }

    this._log("info", "Initializing Agents System...");

    // Clear existing state
    this.clear();

    // Load initial data if provided
    if (options.initialData) {
      this.import(options.initialData);
    } else {
      // Set up mandatory positions
      this._setupMandatoryPositions();
    }

    this._initialized = true;
    this._log("info", "Agents System initialized");
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
   * Clear all data
   */
  clear() {
    this._agents.clear();
    this._agentPools.clear();
    this._positions.clear();
    this._teams.clear();
    this._executivePositions.clear();
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

  // ===== AGENT MANAGEMENT =====

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
    this._emit("agent:created", { agent });

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
    this._emit("agent:updated", { agent: updated });

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
    this._emit("agent:deleted", { id, agent });

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

  // ===== AGENT POOL MANAGEMENT =====

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
    this._emit("pool:created", { pool });

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
    this._emit("pool:updated", { pool: updated });

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
    this._emit("pool:deleted", { id, pool });

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

  // ===== POSITION MANAGEMENT =====

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
    if (
      position.assignedAgentId &&
      !this._agents.has(position.assignedAgentId)
    ) {
      throw new Error(`Agent "${position.assignedAgentId}" not found`);
    }
    if (
      position.assignedPoolId &&
      !this._agentPools.has(position.assignedPoolId)
    ) {
      throw new Error(`Agent pool "${position.assignedPoolId}" not found`);
    }

    this._positions.set(position.id, position);

    // Track executive positions separately
    if (position.tier === "executive" || !position.teamId) {
      this._executivePositions.set(position.id, position);
    }

    this._log("info", `Position created: ${position.name} (${position.id})`);
    this._emit("position:created", { position });

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
    if (
      updated.assignedPoolId &&
      !this._agentPools.has(updated.assignedPoolId)
    ) {
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
    this._emit("position:updated", { position: updated });

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
    this._emit("position:deleted", { id, position });

    return true;
  },

  /**
   * Assign an agent to a position
   * @param {string} positionId - Position ID
   * @param {string} agentId - Agent ID (or null to unassign)
   * @returns {Object} Updated position
   */
  assignAgentToPosition(positionId, agentId) {
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

  // ===== TEAM MANAGEMENT =====

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
    this._emit("team:created", { team });

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
    this._emit("team:updated", { team: updated });

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
    this._emit("team:deleted", { id, team });

    return true;
  },

  /**
   * Add a member position to a team
   * @param {string} teamId - Team ID
   * @param {string} positionId - Position ID
   * @returns {Object} Updated team
   */
  addMemberToTeam(teamId, positionId) {
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

    this._emit("team:memberAdded", { teamId, positionId });
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

    this._emit("team:memberRemoved", { teamId, positionId });
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

    this._emit("team:leaderChanged", { teamId, positionId });
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
      icon: data.icon || "👥",
      leaderId: String(data.leaderId),
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

  // ===== HELPER METHODS =====

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

  // ===== EVENT SYSTEM =====

  /**
   * Subscribe to events
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
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
   * Unsubscribe from events
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
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
   * Emit an event
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
          this._log("error", `Event handler error for ${event}:`, e);
        }
      }
    }
  },

  // ===== IMPORT / EXPORT =====

  /**
   * Export the complete hierarchy
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
    };
  },

  /**
   * Import hierarchy data
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

      // Ensure mandatory positions exist
      if (!this._positions.has("publisher")) {
        this._setupMandatoryPositions();
      }

      this._log("info", "Hierarchy imported successfully");
      this._emit("system:imported");
      return true;
    } catch (e) {
      this._log("error", "Import failed:", e);
      return false;
    }
  },

  // ===== SUMMARY / STATUS =====

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
    this._emit("system:companyNameChanged", { name: this._companyName });
  },

  /**
   * Get company name
   * @returns {string} Company name
   */
  getCompanyName() {
    return this._companyName;
  },

  // ===== LOGGING =====

  /**
   * Log a message
   * @param {string} level - Log level
   * @param {string} message - Message
   * @param {...any} args - Additional arguments
   */
  _log(level, message, ...args) {
    if (this._logger && typeof this._logger[level] === "function") {
      this._logger[level](`[AgentsSystem] ${message}`, ...args);
    }
  },
};

// Export for different environments
if (typeof window !== "undefined") {
  window.AgentsSystem = AgentsSystem;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = AgentsSystem;
}
