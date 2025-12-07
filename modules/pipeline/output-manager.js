// modules/pipeline/output-manager.js - Output Manager for The Council
// Handles phase outputs, team outputs, and permanent output blocks

const OutputManager = {
  // ===== VERSION =====
  VERSION: "1.0.0",

  // ===== OUTPUT STORAGE =====

  /**
   * Phase Outputs
   * - Max one per phase
   * - Cleared when phase ends (unless preserved)
   * - Structure: Map<phaseId, OutputBlock>
   */
  _phaseOutputs: new Map(),

  /**
   * Team Outputs
   * - Per team, per phase
   * - Structure: Map<phaseId, Map<teamId, OutputBlock>>
   */
  _teamOutputs: new Map(),

  /**
   * Permanent Output Blocks
   * - Persist across entire pipeline run
   * - Predefined block types
   * - Structure: Map<blockId, OutputBlock>
   */
  _permanentOutputs: new Map(),

  /**
   * Output History
   * - Tracks all output changes for debugging/rollback
   * - Structure: Array<OutputHistoryEntry>
   */
  _history: [],

  // ===== CONSTANTS =====

  /**
   * Permanent output block identifiers
   */
  PERMANENT_BLOCKS: {
    GLOBAL_CONTEXT: "global_context",
    INSTRUCTIONS: "instructions",
    OUTLINE_DRAFT: "outline_draft",
    FINAL_OUTLINE: "final_outline",
    FIRST_DRAFT: "first_draft",
    SECOND_DRAFT: "second_draft",
    FINAL_DRAFT: "final_draft",
    COMMENTARY: "commentary",
  },

  /**
   * Output types
   */
  OUTPUT_TYPES: {
    PHASE: "phase_output",
    TEAM: "team_output",
    PERMANENT: "permanent",
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

  // ===== INITIALIZATION =====

  /**
   * Initialize the output manager
   * @param {Object} options - Initialization options
   * @returns {OutputManager}
   */
  init(options = {}) {
    console.log("[Output Manager] Initializing...");

    this.clear();
    this._initialized = true;

    // Initialize permanent output blocks
    this._initializePermanentBlocks();

    // Apply any initial values from options
    if (options.permanentOutputs) {
      for (const [blockId, content] of Object.entries(
        options.permanentOutputs,
      )) {
        if (this._permanentOutputs.has(blockId)) {
          this.setPermanent(blockId, content, options.createdBy || "init");
        }
      }
    }

    console.log("[Output Manager] Initialized successfully");
    return this;
  },

  /**
   * Initialize permanent output blocks with empty content
   */
  _initializePermanentBlocks() {
    const blockConfigs = {
      [this.PERMANENT_BLOCKS.GLOBAL_CONTEXT]: {
        name: "Global Context",
        description: "Record Keeper maintained global context for all phases",
      },
      [this.PERMANENT_BLOCKS.INSTRUCTIONS]: {
        name: "Instructions",
        description: "Interpreted user instructions",
      },
      [this.PERMANENT_BLOCKS.OUTLINE_DRAFT]: {
        name: "Outline Draft",
        description: "Initial story outline draft",
      },
      [this.PERMANENT_BLOCKS.FINAL_OUTLINE]: {
        name: "Final Outline",
        description: "Approved final story outline",
      },
      [this.PERMANENT_BLOCKS.FIRST_DRAFT]: {
        name: "First Draft",
        description: "Initial prose draft",
      },
      [this.PERMANENT_BLOCKS.SECOND_DRAFT]: {
        name: "Second Draft",
        description: "Revised prose draft",
      },
      [this.PERMANENT_BLOCKS.FINAL_DRAFT]: {
        name: "Final Draft",
        description: "Final polished prose",
      },
      [this.PERMANENT_BLOCKS.COMMENTARY]: {
        name: "Commentary",
        description: "Team commentary and notes",
      },
    };

    for (const [blockId, config] of Object.entries(blockConfigs)) {
      this._permanentOutputs.set(
        blockId,
        this._createOutputBlock({
          id: blockId,
          type: this.OUTPUT_TYPES.PERMANENT,
          name: config.name,
          description: config.description,
          content: null,
        }),
      );
    }
  },

  /**
   * Clear all outputs
   */
  clear() {
    this._phaseOutputs.clear();
    this._teamOutputs.clear();
    this._permanentOutputs.clear();
    this._history = [];
    this._currentPhaseId = null;
  },

  /**
   * Reset for new pipeline run (preserves permanent block structure)
   */
  reset() {
    this._phaseOutputs.clear();
    this._teamOutputs.clear();
    this._history = [];
    this._currentPhaseId = null;

    // Reset permanent blocks to empty
    for (const [blockId, block] of this._permanentOutputs) {
      block.content = null;
      block.metadata.version = 0;
      block.metadata.updatedAt = null;
      block.metadata.updatedBy = null;
    }

    console.log("[Output Manager] Reset for new pipeline run");
  },

  // ===== PHASE LIFECYCLE =====

  /**
   * Begin a new phase
   * @param {string} phaseId - Phase identifier
   */
  beginPhase(phaseId) {
    console.log(`[Output Manager] Beginning phase "${phaseId}"`);
    this._currentPhaseId = phaseId;

    // Initialize team outputs map for this phase
    if (!this._teamOutputs.has(phaseId)) {
      this._teamOutputs.set(phaseId, new Map());
    }
  },

  /**
   * End current phase
   * @param {string} phaseId - Phase identifier (optional, uses current)
   * @param {boolean} preserveOutputs - Keep outputs for debugging
   */
  endPhase(phaseId = null, preserveOutputs = false) {
    const targetPhaseId = phaseId || this._currentPhaseId;
    console.log(`[Output Manager] Ending phase "${targetPhaseId}"`);

    if (!preserveOutputs) {
      // Phase outputs are typically consumed/transferred, not deleted
      // But team outputs for the phase can be cleared if not needed
    }

    if (targetPhaseId === this._currentPhaseId) {
      this._currentPhaseId = null;
    }
  },

  // ===== PHASE OUTPUT METHODS =====

  /**
   * Set the phase output (max one per phase)
   * @param {string} phaseId - Phase identifier
   * @param {any} content - Output content
   * @param {string} createdBy - Agent or process that created this
   * @param {Object} options - Additional options
   * @returns {Object} Created output block
   */
  setPhaseOutput(phaseId, content, createdBy = null, options = {}) {
    const targetPhaseId = phaseId || this._currentPhaseId;

    if (!targetPhaseId) {
      console.error(
        "[Output Manager] Cannot set phase output - no phase specified",
      );
      return null;
    }

    // Check if output already exists
    if (this._phaseOutputs.has(targetPhaseId) && !options.overwrite) {
      console.warn(
        `[Output Manager] Phase output for "${targetPhaseId}" already exists. Use overwrite option to replace.`,
      );
      return this._phaseOutputs.get(targetPhaseId);
    }

    const outputBlock = this._createOutputBlock({
      id: `phase_output_${targetPhaseId}`,
      type: this.OUTPUT_TYPES.PHASE,
      name: options.name || `Phase Output: ${targetPhaseId}`,
      description: options.description || "",
      content,
      phaseId: targetPhaseId,
      createdBy,
    });

    this._phaseOutputs.set(targetPhaseId, outputBlock);
    this._recordHistory("set_phase_output", targetPhaseId, null, outputBlock);

    console.log(`[Output Manager] Phase output set for "${targetPhaseId}"`);
    return outputBlock;
  },

  /**
   * Get phase output
   * @param {string} phaseId - Phase identifier
   * @returns {any} Output content or null
   */
  getPhaseOutput(phaseId) {
    const targetPhaseId = phaseId || this._currentPhaseId;
    const block = this._phaseOutputs.get(targetPhaseId);
    return block ? block.content : null;
  },

  /**
   * Get phase output block (with metadata)
   * @param {string} phaseId - Phase identifier
   * @returns {Object} Output block or null
   */
  getPhaseOutputBlock(phaseId) {
    const targetPhaseId = phaseId || this._currentPhaseId;
    return this._phaseOutputs.get(targetPhaseId) || null;
  },

  /**
   * Check if phase has output
   * @param {string} phaseId - Phase identifier
   * @returns {boolean}
   */
  hasPhaseOutput(phaseId) {
    const targetPhaseId = phaseId || this._currentPhaseId;
    const block = this._phaseOutputs.get(targetPhaseId);
    return block && block.content !== null;
  },

  /**
   * Get all phase outputs
   * @returns {Object} Map of phaseId to content
   */
  getAllPhaseOutputs() {
    const result = {};
    for (const [phaseId, block] of this._phaseOutputs) {
      result[phaseId] = block.content;
    }
    return result;
  },

  // ===== TEAM OUTPUT METHODS =====

  /**
   * Set a team output for a phase
   * @param {string} teamId - Team identifier
   * @param {any} content - Output content
   * @param {string} createdBy - Agent that created this
   * @param {string} phaseId - Phase identifier (optional, uses current)
   * @param {Object} options - Additional options
   * @returns {Object} Created output block
   */
  setTeamOutput(
    teamId,
    content,
    createdBy = null,
    phaseId = null,
    options = {},
  ) {
    const targetPhaseId = phaseId || this._currentPhaseId;

    if (!targetPhaseId) {
      console.error(
        "[Output Manager] Cannot set team output - no phase specified",
      );
      return null;
    }

    if (!teamId) {
      console.error(
        "[Output Manager] Cannot set team output - no team specified",
      );
      return null;
    }

    // Ensure phase has a team outputs map
    if (!this._teamOutputs.has(targetPhaseId)) {
      this._teamOutputs.set(targetPhaseId, new Map());
    }

    const phaseTeamOutputs = this._teamOutputs.get(targetPhaseId);

    // Check if output already exists
    if (phaseTeamOutputs.has(teamId) && !options.overwrite) {
      const existing = phaseTeamOutputs.get(teamId);
      // Update existing
      existing.content = content;
      existing.metadata.updatedAt = Date.now();
      existing.metadata.updatedBy = createdBy;
      existing.metadata.version = (existing.metadata.version || 0) + 1;

      this._recordHistory(
        "update_team_output",
        targetPhaseId,
        teamId,
        existing,
      );
      console.log(
        `[Output Manager] Team output updated for "${teamId}" in phase "${targetPhaseId}"`,
      );
      return existing;
    }

    const outputBlock = this._createOutputBlock({
      id: `team_output_${targetPhaseId}_${teamId}`,
      type: this.OUTPUT_TYPES.TEAM,
      name: options.name || `Team Output: ${teamId}`,
      description: options.description || "",
      content,
      phaseId: targetPhaseId,
      teamId,
      createdBy,
    });

    phaseTeamOutputs.set(teamId, outputBlock);
    this._recordHistory("set_team_output", targetPhaseId, teamId, outputBlock);

    console.log(
      `[Output Manager] Team output set for "${teamId}" in phase "${targetPhaseId}"`,
    );
    return outputBlock;
  },

  /**
   * Get team output for a phase
   * @param {string} teamId - Team identifier
   * @param {string} phaseId - Phase identifier (optional, uses current)
   * @returns {any} Output content or null
   */
  getTeamOutput(teamId, phaseId = null) {
    const targetPhaseId = phaseId || this._currentPhaseId;

    if (!this._teamOutputs.has(targetPhaseId)) {
      return null;
    }

    const block = this._teamOutputs.get(targetPhaseId).get(teamId);
    return block ? block.content : null;
  },

  /**
   * Get team output block (with metadata)
   * @param {string} teamId - Team identifier
   * @param {string} phaseId - Phase identifier
   * @returns {Object} Output block or null
   */
  getTeamOutputBlock(teamId, phaseId = null) {
    const targetPhaseId = phaseId || this._currentPhaseId;

    if (!this._teamOutputs.has(targetPhaseId)) {
      return null;
    }

    return this._teamOutputs.get(targetPhaseId).get(teamId) || null;
  },

  /**
   * Get all team outputs for a phase
   * @param {string} phaseId - Phase identifier
   * @returns {Object} Map of teamId to content
   */
  getAllTeamOutputs(phaseId = null) {
    const targetPhaseId = phaseId || this._currentPhaseId;

    if (!this._teamOutputs.has(targetPhaseId)) {
      return {};
    }

    const result = {};
    for (const [teamId, block] of this._teamOutputs.get(targetPhaseId)) {
      result[teamId] = block.content;
    }
    return result;
  },

  /**
   * Get all outputs for a specific team across all phases
   * @param {string} teamId - Team identifier
   * @returns {Object} Map of phaseId to content
   */
  getTeamOutputHistory(teamId) {
    const result = {};

    for (const [phaseId, teamOutputs] of this._teamOutputs) {
      if (teamOutputs.has(teamId)) {
        result[phaseId] = teamOutputs.get(teamId).content;
      }
    }

    return result;
  },

  // ===== PERMANENT OUTPUT METHODS =====

  /**
   * Set a permanent output block
   * @param {string} blockId - Block identifier (from PERMANENT_BLOCKS)
   * @param {any} content - Output content
   * @param {string} updatedBy - Agent or phase that updated this
   * @param {Object} options - Additional options
   * @returns {Object} Updated output block or null
   */
  setPermanent(blockId, content, updatedBy = null, options = {}) {
    if (!this._permanentOutputs.has(blockId)) {
      console.error(`[Output Manager] Unknown permanent block: ${blockId}`);
      return null;
    }

    const block = this._permanentOutputs.get(blockId);
    const previousContent = block.content;

    block.content = content;
    block.metadata.updatedAt = Date.now();
    block.metadata.updatedBy = updatedBy;
    block.metadata.version = (block.metadata.version || 0) + 1;

    if (options.phaseId) {
      block.metadata.lastPhaseId = options.phaseId;
    }

    this._recordHistory("set_permanent", blockId, null, block, previousContent);

    console.log(
      `[Output Manager] Permanent block "${blockId}" updated (v${block.metadata.version})`,
    );
    return block;
  },

  /**
   * Get permanent output content
   * @param {string} blockId - Block identifier
   * @returns {any} Output content or null
   */
  getPermanent(blockId) {
    const block = this._permanentOutputs.get(blockId);
    return block ? block.content : null;
  },

  /**
   * Get permanent output block (with metadata)
   * @param {string} blockId - Block identifier
   * @returns {Object} Output block or null
   */
  getPermanentBlock(blockId) {
    return this._permanentOutputs.get(blockId) || null;
  },

  /**
   * Check if permanent block has content
   * @param {string} blockId - Block identifier
   * @returns {boolean}
   */
  hasPermanent(blockId) {
    const block = this._permanentOutputs.get(blockId);
    return block && block.content !== null;
  },

  /**
   * Get all permanent outputs
   * @returns {Object} Map of blockId to content
   */
  getAllPermanent() {
    const result = {};
    for (const [blockId, block] of this._permanentOutputs) {
      result[blockId] = block.content;
    }
    return result;
  },

  /**
   * Get all permanent output blocks (with metadata)
   * @returns {Object} Map of blockId to block
   */
  getAllPermanentBlocks() {
    const result = {};
    for (const [blockId, block] of this._permanentOutputs) {
      result[blockId] = { ...block };
    }
    return result;
  },

  // ===== CONVENIENCE METHODS FOR COMMON OUTPUTS =====

  /**
   * Set instructions output
   * @param {string} content - Instructions content
   * @param {string} updatedBy - Who set this
   * @returns {Object} Output block
   */
  setInstructions(content, updatedBy = null) {
    return this.setPermanent(
      this.PERMANENT_BLOCKS.INSTRUCTIONS,
      content,
      updatedBy,
    );
  },

  /**
   * Get instructions
   * @returns {string} Instructions content
   */
  getInstructions() {
    return this.getPermanent(this.PERMANENT_BLOCKS.INSTRUCTIONS);
  },

  /**
   * Set outline draft
   * @param {string} content - Outline content
   * @param {string} updatedBy - Who set this
   * @returns {Object} Output block
   */
  setOutlineDraft(content, updatedBy = null) {
    return this.setPermanent(
      this.PERMANENT_BLOCKS.OUTLINE_DRAFT,
      content,
      updatedBy,
    );
  },

  /**
   * Get outline draft
   * @returns {string} Outline content
   */
  getOutlineDraft() {
    return this.getPermanent(this.PERMANENT_BLOCKS.OUTLINE_DRAFT);
  },

  /**
   * Set final outline
   * @param {string} content - Outline content
   * @param {string} updatedBy - Who set this
   * @returns {Object} Output block
   */
  setFinalOutline(content, updatedBy = null) {
    return this.setPermanent(
      this.PERMANENT_BLOCKS.FINAL_OUTLINE,
      content,
      updatedBy,
    );
  },

  /**
   * Get final outline
   * @returns {string} Outline content
   */
  getFinalOutline() {
    return this.getPermanent(this.PERMANENT_BLOCKS.FINAL_OUTLINE);
  },

  /**
   * Set first draft
   * @param {string} content - Draft content
   * @param {string} updatedBy - Who set this
   * @returns {Object} Output block
   */
  setFirstDraft(content, updatedBy = null) {
    return this.setPermanent(
      this.PERMANENT_BLOCKS.FIRST_DRAFT,
      content,
      updatedBy,
    );
  },

  /**
   * Get first draft
   * @returns {string} Draft content
   */
  getFirstDraft() {
    return this.getPermanent(this.PERMANENT_BLOCKS.FIRST_DRAFT);
  },

  /**
   * Set second draft
   * @param {string} content - Draft content
   * @param {string} updatedBy - Who set this
   * @returns {Object} Output block
   */
  setSecondDraft(content, updatedBy = null) {
    return this.setPermanent(
      this.PERMANENT_BLOCKS.SECOND_DRAFT,
      content,
      updatedBy,
    );
  },

  /**
   * Get second draft
   * @returns {string} Draft content
   */
  getSecondDraft() {
    return this.getPermanent(this.PERMANENT_BLOCKS.SECOND_DRAFT);
  },

  /**
   * Set final draft
   * @param {string} content - Draft content
   * @param {string} updatedBy - Who set this
   * @returns {Object} Output block
   */
  setFinalDraft(content, updatedBy = null) {
    return this.setPermanent(
      this.PERMANENT_BLOCKS.FINAL_DRAFT,
      content,
      updatedBy,
    );
  },

  /**
   * Get final draft
   * @returns {string} Draft content
   */
  getFinalDraft() {
    return this.getPermanent(this.PERMANENT_BLOCKS.FINAL_DRAFT);
  },

  /**
   * Set commentary
   * @param {any} content - Commentary content (can be array or object)
   * @param {string} updatedBy - Who set this
   * @returns {Object} Output block
   */
  setCommentary(content, updatedBy = null) {
    return this.setPermanent(
      this.PERMANENT_BLOCKS.COMMENTARY,
      content,
      updatedBy,
    );
  },

  /**
   * Append to commentary
   * @param {Object} entry - Commentary entry to append
   * @param {string} updatedBy - Who added this
   * @returns {Object} Output block
   */
  appendCommentary(entry, updatedBy = null) {
    let current = this.getPermanent(this.PERMANENT_BLOCKS.COMMENTARY);

    if (!Array.isArray(current)) {
      current = current ? [current] : [];
    }

    current.push({
      ...entry,
      timestamp: Date.now(),
    });

    return this.setPermanent(
      this.PERMANENT_BLOCKS.COMMENTARY,
      current,
      updatedBy,
    );
  },

  /**
   * Get commentary
   * @returns {any} Commentary content
   */
  getCommentary() {
    return this.getPermanent(this.PERMANENT_BLOCKS.COMMENTARY);
  },

  /**
   * Set global context output
   * @param {any} content - Global context content
   * @param {string} updatedBy - Who set this
   * @returns {Object} Output block
   */
  setGlobalContext(content, updatedBy = null) {
    return this.setPermanent(
      this.PERMANENT_BLOCKS.GLOBAL_CONTEXT,
      content,
      updatedBy,
    );
  },

  /**
   * Get global context
   * @returns {any} Global context content
   */
  getGlobalContext() {
    return this.getPermanent(this.PERMANENT_BLOCKS.GLOBAL_CONTEXT);
  },

  // ===== OUTPUT ROUTING =====

  /**
   * Route output to appropriate destination based on phase config
   * @param {Object} phaseConfig - Phase configuration with output routing
   * @param {any} content - Content to route
   * @param {string} agentId - Agent that produced the output
   * @param {string} teamId - Team the agent belongs to
   * @returns {Object} Routing result
   */
  routeOutput(phaseConfig, content, agentId, teamId = null) {
    const results = {
      phaseOutput: null,
      teamOutput: null,
      permanentOutput: null,
    };

    const phaseId = phaseConfig.id;

    // Route to phase output if configured
    if (phaseConfig.outputs?.phase?.target) {
      results.phaseOutput = this.setPhaseOutput(phaseId, content, agentId, {
        name: phaseConfig.outputs.phase.target,
      });
    }

    // Route to team output if configured and team specified
    if (teamId && phaseConfig.outputs?.team?.[teamId]) {
      results.teamOutput = this.setTeamOutput(
        teamId,
        content,
        agentId,
        phaseId,
        {
          name: phaseConfig.outputs.team[teamId],
        },
      );
    }

    // Route to permanent output if configured
    if (phaseConfig.outputs?.permanent) {
      results.permanentOutput = this.setPermanent(
        phaseConfig.outputs.permanent,
        content,
        agentId,
        { phaseId },
      );
    }

    return results;
  },

  // ===== HELPER METHODS =====

  /**
   * Create an output block with metadata
   * @param {Object} config - Block configuration
   * @returns {Object} Output block
   */
  _createOutputBlock(config) {
    return {
      id: config.id,
      type: config.type,
      name: config.name,
      description: config.description || "",
      content: config.content !== undefined ? config.content : null,
      metadata: {
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdBy: config.createdBy || null,
        updatedBy: config.createdBy || null,
        phaseId: config.phaseId || null,
        teamId: config.teamId || null,
        version: 1,
      },
    };
  },

  /**
   * Record an output change in history
   * @param {string} action - Action type
   * @param {string} phaseId - Phase identifier
   * @param {string} teamId - Team identifier
   * @param {Object} block - Output block
   * @param {any} previousContent - Previous content (for updates)
   */
  _recordHistory(action, phaseId, teamId, block, previousContent = null) {
    this._history.push({
      timestamp: Date.now(),
      action,
      phaseId,
      teamId,
      blockId: block.id,
      blockType: block.type,
      version: block.metadata.version,
      hasContent: block.content !== null,
      previousContentSnapshot:
        previousContent !== null
          ? typeof previousContent === "string"
            ? previousContent.substring(0, 100)
            : "[object]"
          : null,
    });

    // Keep history manageable
    if (this._history.length > 500) {
      this._history = this._history.slice(-250);
    }
  },

  // ===== DIAGNOSTICS & DEBUGGING =====

  /**
   * Get summary of all outputs
   * @returns {Object} Summary statistics
   */
  getSummary() {
    const teamOutputsByPhase = {};
    for (const [phaseId, teamOutputs] of this._teamOutputs) {
      teamOutputsByPhase[phaseId] = teamOutputs.size;
    }

    const permanentStatus = {};
    for (const [blockId, block] of this._permanentOutputs) {
      permanentStatus[blockId] = {
        hasContent: block.content !== null,
        version: block.metadata.version,
      };
    }

    return {
      initialized: this._initialized,
      currentPhase: this._currentPhaseId,
      phaseOutputCount: this._phaseOutputs.size,
      teamOutputsByPhase,
      permanentStatus,
      historyCount: this._history.length,
    };
  },

  /**
   * Get debug snapshot
   * @returns {Object} Full state for debugging
   */
  getDebugSnapshot() {
    const phaseOutputs = {};
    for (const [phaseId, block] of this._phaseOutputs) {
      phaseOutputs[phaseId] = { ...block };
    }

    const teamOutputs = {};
    for (const [phaseId, teams] of this._teamOutputs) {
      teamOutputs[phaseId] = {};
      for (const [teamId, block] of teams) {
        teamOutputs[phaseId][teamId] = { ...block };
      }
    }

    const permanentOutputs = {};
    for (const [blockId, block] of this._permanentOutputs) {
      permanentOutputs[blockId] = { ...block };
    }

    return {
      summary: this.getSummary(),
      phaseOutputs,
      teamOutputs,
      permanentOutputs,
      recentHistory: this._history.slice(-20),
    };
  },

  /**
   * Get output history
   * @param {number} limit - Max entries to return
   * @returns {Array} History entries
   */
  getHistory(limit = 50) {
    return this._history.slice(-limit);
  },

  // ===== EXPORT / IMPORT =====

  /**
   * Export all outputs for persistence
   * @returns {Object} Exportable state
   */
  export() {
    const phaseOutputs = {};
    for (const [phaseId, block] of this._phaseOutputs) {
      phaseOutputs[phaseId] = block;
    }

    const teamOutputs = {};
    for (const [phaseId, teams] of this._teamOutputs) {
      teamOutputs[phaseId] = {};
      for (const [teamId, block] of teams) {
        teamOutputs[phaseId][teamId] = block;
      }
    }

    const permanentOutputs = {};
    for (const [blockId, block] of this._permanentOutputs) {
      permanentOutputs[blockId] = block;
    }

    return {
      version: this.VERSION,
      exportedAt: Date.now(),
      phaseOutputs,
      teamOutputs,
      permanentOutputs,
    };
  },

  /**
   * Import outputs from exported state
   * @param {Object} data - Exported data
   * @returns {boolean} Success status
   */
  import(data) {
    try {
      if (!data || !data.version) {
        console.error("[Output Manager] Invalid import data");
        return false;
      }

      // Clear existing (but preserve permanent block structure)
      this._phaseOutputs.clear();
      this._teamOutputs.clear();

      // Import phase outputs
      if (data.phaseOutputs) {
        for (const [phaseId, block] of Object.entries(data.phaseOutputs)) {
          this._phaseOutputs.set(phaseId, block);
        }
      }

      // Import team outputs
      if (data.teamOutputs) {
        for (const [phaseId, teams] of Object.entries(data.teamOutputs)) {
          this._teamOutputs.set(phaseId, new Map(Object.entries(teams)));
        }
      }

      // Import permanent outputs
      if (data.permanentOutputs) {
        for (const [blockId, block] of Object.entries(data.permanentOutputs)) {
          if (this._permanentOutputs.has(blockId)) {
            this._permanentOutputs.set(blockId, block);
          }
        }
      }

      console.log("[Output Manager] Import successful");
      return true;
    } catch (e) {
      console.error("[Output Manager] Import failed:", e);
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
   * Check if any drafts exist
   * @returns {Object} Draft status
   */
  getDraftStatus() {
    return {
      hasOutlineDraft: this.hasPermanent(this.PERMANENT_BLOCKS.OUTLINE_DRAFT),
      hasFinalOutline: this.hasPermanent(this.PERMANENT_BLOCKS.FINAL_OUTLINE),
      hasFirstDraft: this.hasPermanent(this.PERMANENT_BLOCKS.FIRST_DRAFT),
      hasSecondDraft: this.hasPermanent(this.PERMANENT_BLOCKS.SECOND_DRAFT),
      hasFinalDraft: this.hasPermanent(this.PERMANENT_BLOCKS.FINAL_DRAFT),
    };
  },

  /**
   * Get the latest draft content (final > second > first)
   * @returns {string|null} Latest draft content
   */
  getLatestDraft() {
    if (this.hasPermanent(this.PERMANENT_BLOCKS.FINAL_DRAFT)) {
      return this.getFinalDraft();
    }
    if (this.hasPermanent(this.PERMANENT_BLOCKS.SECOND_DRAFT)) {
      return this.getSecondDraft();
    }
    if (this.hasPermanent(this.PERMANENT_BLOCKS.FIRST_DRAFT)) {
      return this.getFirstDraft();
    }
    return null;
  },

  /**
   * Get the latest outline (final > draft)
   * @returns {string|null} Latest outline content
   */
  getLatestOutline() {
    if (this.hasPermanent(this.PERMANENT_BLOCKS.FINAL_OUTLINE)) {
      return this.getFinalOutline();
    }
    if (this.hasPermanent(this.PERMANENT_BLOCKS.OUTLINE_DRAFT)) {
      return this.getOutlineDraft();
    }
    return null;
  },
};

// Export for use in other modules
if (typeof window !== "undefined") {
  window.OutputManager = OutputManager;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = OutputManager;
}
