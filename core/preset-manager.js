/**
 * TheCouncil - Preset Manager
 *
 * ⚠️ DEPRECATED: This module is deprecated as of Task 0.2.
 * All preset management functionality has been migrated into core/kernel.js
 *
 * This file is kept temporarily for reference during migration but will be
 * removed in a future cleanup task (Task 6.2).
 *
 * New code should use:
 * - window.TheCouncil.discoverPresets()
 * - window.TheCouncil.loadPreset(id)
 * - window.TheCouncil.applyPreset(preset)
 * - window.TheCouncil.saveAsPreset(name, options)
 * - window.TheCouncil.importPreset(data)
 * - window.TheCouncil.exportPreset(id)
 *
 * @version 1.0.0
 * @deprecated Use TheCouncilKernel preset management methods instead
 */

const PresetManager = {
  // ===== VERSION =====
  VERSION: "1.0.0",

  // ===== CONSTANTS =====

  /**
   * Extension path - will be set during init
   * @type {string}
   */
  _extensionPath: "",

  /**
   * Presets directory relative to extension
   * @type {string}
   */
  PRESETS_DIR: "data/presets",

  /**
   * Preset file extension
   * @type {string}
   */
  PRESET_EXTENSION: ".json",

  /**
   * Default preset ID
   * @type {string}
   */
  DEFAULT_PRESET_ID: "editorial-board",

  // ===== STATE =====

  /**
   * Loaded presets cache
   * @type {Map<string, Object>}
   */
  _presets: new Map(),

  /**
   * Currently applied preset ID
   * @type {string|null}
   */
  _activePresetId: null,

  /**
   * Dependencies
   */
  _agentsSystem: null,
  _pipelineSystem: null,
  _curationSystem: null,
  _threadManager: null,
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

  /**
   * Loading state
   * @type {boolean}
   */
  _isLoading: false,

  /**
   * Last imported agents (for team creation)
   * @type {Array}
   */
  _lastImportedAgents: [],

  // ===== INITIALIZATION =====

  /**
   * Initialize the Preset Manager
   * @param {Object} options - Configuration options
   * @returns {PresetManager}
   */
  init(options = {}) {
    if (this._initialized) {
      this._log("warn", "PresetManager already initialized");
      return this;
    }

    this._log("info", "Initializing Preset Manager...");

    // Set dependencies
    this._logger = options.logger || null;
    this._agentsSystem = options.agentsSystem || null;
    this._pipelineSystem = options.pipelineSystem || null;
    this._curationSystem = options.curationSystem || null;
    this._threadManager = options.threadManager || null;
    this._extensionPath = options.extensionPath || "";

    // Clear state
    this.clear();

    this._initialized = true;
    this._log("info", "Preset Manager initialized");
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
   * Clear all state
   */
  clear() {
    this._presets.clear();
    this._activePresetId = null;
    this._isLoading = false;
  },

  // ===== PRESET DISCOVERY =====

  /**
   * Discover and load all presets from the presets directory
   * @returns {Promise<Object[]>} Array of loaded presets
   */
  async discoverPresets() {
    if (this._isLoading) {
      this._log("warn", "Already loading presets");
      return this.getAllPresets();
    }

    this._isLoading = true;
    this._log("info", "Discovering presets...");

    try {
      const presetFiles = await this._listPresetFiles();
      this._log("info", `Found ${presetFiles.length} preset file(s)`);

      const loadPromises = presetFiles.map((file) =>
        this._loadPresetFile(file).catch((err) => {
          this._log("error", `Failed to load preset ${file}: ${err.message}`);
          return null;
        }),
      );

      const results = await Promise.all(loadPromises);
      const validPresets = results.filter((p) => p !== null);

      // Register all valid presets
      for (const preset of validPresets) {
        this._presets.set(preset.id, preset);
        this._log("info", `Loaded preset: ${preset.name} (${preset.id})`);
      }

      this._emit("presets:discovered", {
        count: validPresets.length,
        presets: validPresets.map((p) => ({ id: p.id, name: p.name })),
      });

      return this.getAllPresets();
    } catch (error) {
      this._log("error", `Failed to discover presets: ${error.message}`);
      throw error;
    } finally {
      this._isLoading = false;
    }
  },

  /**
   * List preset files in the presets directory
   * @returns {Promise<string[]>} Array of file paths
   */
  async _listPresetFiles() {
    const presetsPath = this._getPresetsPath();

    try {
      // Try to fetch the presets directory listing
      // In SillyTavern, we'll try different approaches

      // Method 1: Try direct fetch of known preset files
      const knownPresets = await this._fetchKnownPresets();
      if (knownPresets.length > 0) {
        return knownPresets;
      }

      // Method 2: Try to fetch default preset directly
      const defaultPresetPath = `${presetsPath}/default-pipeline${this.PRESET_EXTENSION}`;
      const response = await fetch(defaultPresetPath);
      if (response.ok) {
        return [defaultPresetPath];
      }

      this._log("warn", "No presets found in presets directory");
      return [];
    } catch (error) {
      this._log("warn", `Could not list presets: ${error.message}`);
      return [];
    }
  },

  /**
   * Fetch known preset files
   * @returns {Promise<string[]>} Array of preset file paths
   */
  async _fetchKnownPresets() {
    const presetsPath = this._getPresetsPath();
    const knownFiles = [
      "default-pipeline.json",
      "standard-pipeline.json",
      "quick-pipeline.json",
    ];
    const validFiles = [];

    for (const file of knownFiles) {
      const filePath = `${presetsPath}/${file}`;
      try {
        const response = await fetch(filePath, { method: "HEAD" });
        if (response.ok) {
          validFiles.push(filePath);
        }
      } catch (e) {
        // File doesn't exist or fetch failed
      }
    }

    return validFiles;
  },

  /**
   * Load a preset file
   * @param {string} filePath - Path to the preset file
   * @returns {Promise<Object|null>} Loaded and validated preset
   */
  async _loadPresetFile(filePath) {
    try {
      const response = await fetch(filePath);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const preset = await response.json();

      // Validate and normalize the preset
      const validated = this._validatePreset(preset);
      if (!validated.valid) {
        throw new Error(`Validation failed: ${validated.errors.join(", ")}`);
      }

      const normalized = this._normalizePreset(preset);
      normalized._sourceFile = filePath;

      return normalized;
    } catch (error) {
      this._log(
        "error",
        `Error loading preset from ${filePath}: ${error.message}`,
      );
      return null;
    }
  },

  /**
   * Get the full presets directory path
   * @returns {string}
   */
  _getPresetsPath() {
    if (this._extensionPath) {
      return `${this._extensionPath}/${this.PRESETS_DIR}`;
    }
    // Default path for SillyTavern extensions
    return `/scripts/extensions/third-party/TheCouncil/${this.PRESETS_DIR}`;
  },

  // ===== PRESET MANAGEMENT =====

  /**
   * Get a preset by ID
   * @param {string} presetId - Preset ID
   * @returns {Object|null} Preset or null
   */
  getPreset(presetId) {
    return this._presets.get(presetId) || null;
  },

  /**
   * Get all loaded presets
   * @returns {Object[]} Array of presets
   */
  getAllPresets() {
    return Array.from(this._presets.values());
  },

  /**
   * Get preset summaries (for UI display)
   * @returns {Object[]} Array of preset summaries
   */
  getPresetSummaries() {
    return this.getAllPresets().map((preset) => ({
      id: preset.id,
      name: preset.name,
      description: preset.description,
      version: preset.version,
      agentCount: this._countAgents(preset),
      teamCount: preset.teams?.length || 0,
      phaseCount: preset.phases?.length || 0,
      metadata: preset.metadata,
    }));
  },

  /**
   * Count total agents in a preset
   * @param {Object} preset - Preset object
   * @returns {number}
   */
  _countAgents(preset) {
    if (!preset.agents) return 0;
    let count = 0;
    for (const category of Object.values(preset.agents)) {
      if (Array.isArray(category)) {
        count += category.length;
      }
    }
    return count;
  },

  /**
   * Get the currently active preset ID
   * @returns {string|null}
   */
  getActivePresetId() {
    return this._activePresetId;
  },

  /**
   * Check if a preset is currently active
   * @param {string} presetId - Preset ID to check
   * @returns {boolean}
   */
  isPresetActive(presetId) {
    return this._activePresetId === presetId;
  },

  /**
   * Register a preset (add to cache without applying)
   * @param {Object} preset - Preset object
   * @returns {Object} Normalized preset
   */
  registerPreset(preset) {
    const validated = this._validatePreset(preset);
    if (!validated.valid) {
      throw new Error(`Invalid preset: ${validated.errors.join(", ")}`);
    }

    const normalized = this._normalizePreset(preset);
    this._presets.set(normalized.id, normalized);

    this._log(
      "info",
      `Preset registered: ${normalized.name} (${normalized.id})`,
    );
    this._emit("preset:registered", { preset: normalized });

    return normalized;
  },

  /**
   * Remove a preset from cache
   * @param {string} presetId - Preset ID
   */
  removePreset(presetId) {
    if (this._activePresetId === presetId) {
      this._log("warn", "Cannot remove active preset");
      return false;
    }

    const removed = this._presets.delete(presetId);
    if (removed) {
      this._log("info", `Preset removed: ${presetId}`);
      this._emit("preset:removed", { presetId });
    }
    return removed;
  },

  // ===== PRESET APPLICATION =====

  /**
   * Apply a preset to all systems
   * @param {string} presetId - Preset ID to apply
   * @param {Object} options - Application options
   * @returns {Promise<Object>} Application result
   */
  async applyPreset(presetId, options = {}) {
    const preset = this._presets.get(presetId);
    if (!preset) {
      throw new Error(`Preset "${presetId}" not found`);
    }

    this._log("info", `Applying preset: ${preset.name} (${presetId})`);

    const results = {
      presetId,
      presetName: preset.name,
      agents: { success: false, count: 0 },
      positions: { success: false, count: 0 },
      teams: { success: false, count: 0 },
      pipeline: { success: false, phaseCount: 0 },
      threads: { success: false, count: 0 },
      errors: [],
    };

    try {
      // Clear existing state first
      if (options.clearExisting !== false && this._agentsSystem) {
        this._agentsSystem.clear?.();
        this._log("debug", "Cleared existing agents system state");
      }

      // STEP 1: Create agents first (no dependencies)
      if (preset.agents && this._agentsSystem) {
        try {
          results.agents = await this._applyAgentsOnly(preset, options);
        } catch (error) {
          results.errors.push(`Agents: ${error.message}`);
          this._log("error", `Failed to apply agents: ${error.message}`);
        }
      }

      // STEP 2: Create teams (empty structure, no members yet)
      if (preset.teams && this._agentsSystem) {
        try {
          results.teams = await this._applyTeamsStructure(preset, options);
        } catch (error) {
          results.errors.push(`Teams: ${error.message}`);
          this._log("error", `Failed to apply teams: ${error.message}`);
        }
      }

      // STEP 3: Create positions (can now reference teams and agents)
      if (preset.agents && this._agentsSystem) {
        try {
          results.positions = await this._applyPositions(preset, options);
        } catch (error) {
          results.errors.push(`Positions: ${error.message}`);
          this._log("error", `Failed to apply positions: ${error.message}`);
        }
      }

      // STEP 4: Update teams with member position IDs
      if (preset.teams && this._agentsSystem) {
        try {
          await this._updateTeamMembers(preset, options);
        } catch (error) {
          results.errors.push(`Team members: ${error.message}`);
          this._log("error", `Failed to update team members: ${error.message}`);
        }
      }

      // Apply pipeline
      if (preset.phases && this._pipelineSystem) {
        try {
          results.pipeline = await this._applyPipeline(preset, options);
        } catch (error) {
          results.errors.push(`Pipeline: ${error.message}`);
          this._log("error", `Failed to apply pipeline: ${error.message}`);
        }
      }

      // Apply threads
      if (preset.threads && this._threadManager) {
        try {
          results.threads = await this._applyThreads(preset, options);
        } catch (error) {
          results.errors.push(`Threads: ${error.message}`);
          this._log("error", `Failed to apply threads: ${error.message}`);
        }
      }

      // Set as active preset
      this._activePresetId = presetId;

      this._log("info", `Preset applied: ${preset.name}`, results);
      this._emit("preset:applied", { presetId, preset, results });

      return results;
    } catch (error) {
      this._log("error", `Failed to apply preset: ${error.message}`);
      throw error;
    }
  },

  /**
   * STEP 1: Apply agents only (no positions)
   * @param {Object} preset - Preset object
   * @param {Object} options - Options
   * @returns {Object} Result
   */
  async _applyAgentsOnly(preset, options = {}) {
    let agentCount = 0;

    // Map category names to team IDs
    const categoryToTeamId = {
      executive: null,
      proseTeam: "prose_team",
      plotTeam: "plot_team",
      worldTeam: "world_team",
      characterTeam: "character_team",
      environmentTeam: "environment_team",
      curationTeam: "curation_team",
    };

    // Collect all agents with their metadata
    const allAgents = [];

    for (const [category, agents] of Object.entries(preset.agents || {})) {
      if (Array.isArray(agents)) {
        const teamId = categoryToTeamId[category] || null;

        for (const agent of agents) {
          const positionType = agent.position || "member";

          // Determine tier based on position type
          let tier = agent.tier || "member";
          if (positionType === "executive") {
            tier = "executive";
          } else if (positionType.includes("_lead") || tier === "leader") {
            tier = "leader";
          }

          // Determine if this is a leader position for a team
          const isTeamLeader =
            positionType.includes("_lead") || tier === "leader";

          allAgents.push({
            id: agent.id,
            name: agent.name,
            systemPrompt: agent.systemPrompt || "",
            description: agent.description || "",
            category,
            teamId: tier === "executive" ? null : teamId,
            positionType,
            tier,
            isTeamLeader,
          });
        }
      }
    }

    // Create all agents
    for (const agent of allAgents) {
      try {
        if (typeof this._agentsSystem.createAgent === "function") {
          this._agentsSystem.createAgent({
            id: agent.id,
            name: agent.name,
            systemPrompt: agent.systemPrompt,
            description: agent.description,
          });
          agentCount++;
          this._log(
            "debug",
            `Created agent: ${agent.name} (${agent.id}) - position: ${agent.positionType}, tier: ${agent.tier}`,
          );
        }
      } catch (error) {
        this._log(
          "warn",
          `Failed to create agent ${agent.id}: ${error.message}`,
        );
      }
    }

    // Store for later steps
    this._lastImportedAgents = allAgents;

    return { success: true, count: agentCount };
  },

  /**
   * STEP 2: Create team structures (empty, no members yet)
   * @param {Object} preset - Preset object
   * @param {Object} options - Options
   * @returns {Object} Result
   */
  async _applyTeamsStructure(preset, options = {}) {
    let count = 0;
    const importedAgents = this._lastImportedAgents || [];

    for (const team of preset.teams || []) {
      try {
        if (typeof this._agentsSystem.createTeam === "function") {
          // Find the leader agent - leaderId in preset is the agent ID
          const leaderAgent = importedAgents.find(
            (a) => a.id === team.leaderId,
          );

          // Create team with the leader position ID (which equals agent ID)
          this._agentsSystem.createTeam({
            id: team.id,
            name: team.name,
            leaderId: team.leaderId, // Agent ID = Position ID
            leaderPositionId: team.leaderId, // Explicitly set leader position
            memberIds: [], // Empty for now - will be populated in step 4
          });
          count++;
          this._log(
            "debug",
            `Created team structure: ${team.name} (${team.id}), leader: ${team.leaderId}`,
          );
        }
      } catch (error) {
        this._log("warn", `Failed to create team ${team.id}: ${error.message}`);
      }
    }

    return { success: true, count };
  },

  /**
   * STEP 3: Create positions for each agent
   * @param {Object} preset - Preset object
   * @param {Object} options - Options
   * @returns {Object} Result
   */
  async _applyPositions(preset, options = {}) {
    let positionCount = 0;
    const allAgents = this._lastImportedAgents || [];

    // First pass: Create executive positions (no team dependency)
    for (const agent of allAgents.filter((a) => a.tier === "executive")) {
      positionCount += await this._createSinglePosition(agent);
    }

    // Second pass: Create leader positions (teams exist but need positions)
    for (const agent of allAgents.filter(
      (a) => a.tier === "leader" && a.teamId,
    )) {
      positionCount += await this._createSinglePosition(agent);
    }

    // Third pass: Create member positions
    for (const agent of allAgents.filter(
      (a) => a.tier === "member" && a.teamId,
    )) {
      positionCount += await this._createSinglePosition(agent);
    }

    // Fourth pass: Any remaining positions
    const createdIds = new Set(
      allAgents
        .filter(
          (a) =>
            a.tier === "executive" ||
            (a.tier === "leader" && a.teamId) ||
            (a.tier === "member" && a.teamId),
        )
        .map((a) => a.id),
    );

    for (const agent of allAgents.filter((a) => !createdIds.has(a.id))) {
      positionCount += await this._createSinglePosition(agent);
    }

    return { success: true, count: positionCount };
  },

  /**
   * Create a single position from agent data
   * @param {Object} agent - Agent data with position info
   * @returns {number} 1 if created/updated, 0 if failed
   */
  async _createSinglePosition(agent) {
    try {
      if (typeof this._agentsSystem.createPosition === "function") {
        const positionData = {
          id: agent.id,
          name: this._formatPositionName(agent.positionType) || agent.name,
          displayName: agent.name,
          teamId: agent.teamId,
          tier: agent.tier,
          type: agent.positionType, // Store the position type for matching
          assignedAgentId: agent.id,
          promptModifiers: {
            prefix: "",
            suffix: "",
            roleDescription: agent.description || "",
          },
        };

        this._agentsSystem.createPosition(positionData);
        this._log(
          "debug",
          `Created position: ${agent.name} (${agent.id}) - type: ${agent.positionType}, tier: ${agent.tier}, team: ${agent.teamId || "executive"}`,
        );
        return 1;
      }
    } catch (error) {
      // Position might already exist (e.g., publisher is mandatory)
      if (
        error.message.includes("already exists") &&
        typeof this._agentsSystem.updatePosition === "function"
      ) {
        try {
          this._agentsSystem.updatePosition(agent.id, {
            name: this._formatPositionName(agent.positionType) || agent.name,
            displayName: agent.name,
            assignedAgentId: agent.id,
            teamId: agent.teamId,
            tier: agent.tier,
            type: agent.positionType,
          });
          this._log("debug", `Updated existing position: ${agent.id}`);
          return 1;
        } catch (e) {
          this._log(
            "debug",
            `Could not update position ${agent.id}: ${e.message}`,
          );
        }
      } else {
        this._log("debug", `Position ${agent.id}: ${error.message}`);
      }
    }
    return 0;
  },

  /**
   * STEP 4: Update teams with member position IDs
   * @param {Object} preset - Preset object
   * @param {Object} options - Options
   */
  async _updateTeamMembers(preset, options = {}) {
    const importedAgents = this._lastImportedAgents || [];

    for (const team of preset.teams || []) {
      try {
        // Find all agents belonging to this team
        const teamAgents = importedAgents.filter((a) => a.teamId === team.id);

        // Collect member IDs (agents whose positionType matches memberPositions)
        const memberIds = [];
        const memberPositionTypes = team.memberPositions || [];

        // Method 1: Match by position type from memberPositions array
        for (const positionType of memberPositionTypes) {
          const matchingAgents = teamAgents.filter(
            (a) => a.positionType === positionType,
          );
          for (const agent of matchingAgents) {
            if (!memberIds.includes(agent.id)) {
              memberIds.push(agent.id);
            }
          }
        }

        // Method 2: Also include any "member" tier agents in this team not already included
        const memberTierAgents = teamAgents.filter(
          (a) => a.tier === "member" && !memberIds.includes(a.id),
        );
        for (const agent of memberTierAgents) {
          memberIds.push(agent.id);
        }

        // Get leader info
        const leaderId = team.leaderId;
        const leaderAgent = importedAgents.find((a) => a.id === leaderId);

        // Build update object
        const updateData = {
          memberIds: memberIds,
        };

        // Ensure leader is set correctly
        if (leaderId) {
          updateData.leaderId = leaderId;
          updateData.leaderPositionId = leaderId;
        }

        // Update team with members and leader
        if (typeof this._agentsSystem.updateTeam === "function") {
          this._agentsSystem.updateTeam(team.id, updateData);
          this._log(
            "info",
            `Updated team ${team.id}: leader=${leaderId}, members=[${memberIds.join(", ")}]`,
          );
        }
      } catch (error) {
        this._log(
          "warn",
          `Failed to update team members for ${team.id}: ${error.message}`,
        );
      }
    }
  },

  /**
   * Format position ID into readable name
   * @param {string} positionId - Position ID
   * @returns {string} Formatted name
   */
  _formatPositionName(positionId) {
    return positionId
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  },

  /**
   * Apply pipeline from preset
   * @param {Object} preset - Preset object
   * @param {Object} options - Options
   * @returns {Object} Result
   */
  async _applyPipeline(preset, options = {}) {
    // Build pipeline object from preset
    const pipelineObj = {
      id: preset.id,
      name: preset.name,
      description: preset.description,
      version: preset.version,
      staticContext: preset.staticContext,
      globals: preset.globals,
      constants: preset.constants,
      phases: preset.phases,
      metadata: preset.metadata,
    };

    // Register the pipeline
    this._pipelineSystem.registerPipeline(pipelineObj);

    return {
      success: true,
      phaseCount: preset.phases?.length || 0,
    };
  },

  /**
   * Apply threads from preset
   * @param {Object} preset - Preset object
   * @param {Object} options - Options
   * @returns {Object} Result
   */
  async _applyThreads(preset, options = {}) {
    const { clearExisting = true } = options;
    let count = 0;

    if (clearExisting && typeof this._threadManager.clear === "function") {
      this._threadManager.clear();
    }

    // Threads in preset are stored as an object with thread definitions
    const threads = preset.threads || {};
    for (const [threadKey, threadConfig] of Object.entries(threads)) {
      try {
        if (typeof this._threadManager.createThread === "function") {
          this._threadManager.createThread({
            id: threadConfig.id || threadKey,
            name: threadConfig.name,
            description: threadConfig.description,
            visible: threadConfig.visible !== false,
          });
          count++;
        }
      } catch (error) {
        this._log(
          "warn",
          `Failed to create thread ${threadKey}: ${error.message}`,
        );
      }
    }

    return { success: true, count };
  },

  // ===== IMPORT / EXPORT =====

  /**
   * Import a preset from JSON data
   * @param {Object|string} data - Preset data or JSON string
   * @param {Object} options - Import options
   * @returns {Object} Imported preset
   */
  importPreset(data, options = {}) {
    const { applyImmediately = false } = options;

    // Parse if string
    let preset = typeof data === "string" ? JSON.parse(data) : data;

    // Validate
    const validated = this._validatePreset(preset);
    if (!validated.valid) {
      throw new Error(`Invalid preset: ${validated.errors.join(", ")}`);
    }

    // Normalize
    preset = this._normalizePreset(preset);

    // Check for ID conflict
    if (this._presets.has(preset.id) && !options.overwrite) {
      // Generate new ID
      preset.id = `${preset.id}_imported_${Date.now()}`;
      preset.name = `${preset.name} (Imported)`;
    }

    // Register
    this._presets.set(preset.id, preset);

    this._log("info", `Preset imported: ${preset.name} (${preset.id})`);
    this._emit("preset:imported", { preset });

    // Apply if requested
    if (applyImmediately) {
      this.applyPreset(preset.id);
    }

    return preset;
  },

  /**
   * Export a preset to JSON
   * @param {string} presetId - Preset ID to export
   * @returns {string} JSON string
   */
  exportPreset(presetId) {
    const preset = this._presets.get(presetId);
    if (!preset) {
      throw new Error(`Preset "${presetId}" not found`);
    }

    // Remove internal properties
    const exportData = { ...preset };
    delete exportData._sourceFile;

    // Update metadata
    exportData.metadata = {
      ...exportData.metadata,
      exportedAt: new Date().toISOString(),
    };

    return JSON.stringify(exportData, null, 2);
  },

  /**
   * Export preset to downloadable file
   * @param {string} presetId - Preset ID to export
   */
  downloadPreset(presetId) {
    const preset = this._presets.get(presetId);
    if (!preset) {
      throw new Error(`Preset "${presetId}" not found`);
    }

    const json = this.exportPreset(presetId);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${preset.id}-preset.json`;
    a.click();
    URL.revokeObjectURL(url);

    this._emit("preset:exported", { presetId });
  },

  // ===== VALIDATION =====

  /**
   * Validate a preset object
   * @param {Object} preset - Preset to validate
   * @returns {Object} Validation result { valid: boolean, errors: string[] }
   */
  _validatePreset(preset) {
    const errors = [];

    // Required fields
    if (!preset.id) {
      errors.push("Missing required field: id");
    }
    if (!preset.name) {
      errors.push("Missing required field: name");
    }

    // Type checks
    if (preset.agents && typeof preset.agents !== "object") {
      errors.push("Field 'agents' must be an object");
    }
    if (preset.teams && !Array.isArray(preset.teams)) {
      errors.push("Field 'teams' must be an array");
    }
    if (preset.phases && !Array.isArray(preset.phases)) {
      errors.push("Field 'phases' must be an array");
    }
    if (preset.threads && typeof preset.threads !== "object") {
      errors.push("Field 'threads' must be an object");
    }

    // Validate phases structure
    if (Array.isArray(preset.phases)) {
      preset.phases.forEach((phase, idx) => {
        if (!phase.id) {
          errors.push(`Phase at index ${idx} missing 'id'`);
        }
        if (!phase.name) {
          errors.push(`Phase at index ${idx} missing 'name'`);
        }
      });
    }

    // Validate teams structure
    if (Array.isArray(preset.teams)) {
      preset.teams.forEach((team, idx) => {
        if (!team.id) {
          errors.push(`Team at index ${idx} missing 'id'`);
        }
        if (!team.name) {
          errors.push(`Team at index ${idx} missing 'name'`);
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  },

  /**
   * Normalize a preset to ensure consistent structure
   * @param {Object} preset - Preset to normalize
   * @returns {Object} Normalized preset
   */
  _normalizePreset(preset) {
    return {
      id: preset.id,
      name: preset.name,
      description: preset.description || "",
      version: preset.version || "1.0.0",

      // Static context configuration
      staticContext: {
        includeCharacterCard:
          preset.staticContext?.includeCharacterCard ?? true,
        includeWorldInfo: preset.staticContext?.includeWorldInfo ?? true,
        includePersona: preset.staticContext?.includePersona ?? true,
        includeScenario: preset.staticContext?.includeScenario ?? true,
        custom: preset.staticContext?.custom || {},
      },

      // Global variables
      globals: preset.globals || {},

      // Constants
      constants: preset.constants || {},

      // Agents organized by category
      agents: preset.agents || {},

      // Teams
      teams: preset.teams || [],

      // Threads
      threads: preset.threads || {},

      // Pipeline phases
      phases: (preset.phases || []).map((phase) => this._normalizePhase(phase)),

      // Metadata
      metadata: {
        createdAt: preset.metadata?.createdAt || new Date().toISOString(),
        updatedAt: preset.metadata?.updatedAt || new Date().toISOString(),
        author: preset.metadata?.author || "Unknown",
        tags: preset.metadata?.tags || [],
        ...preset.metadata,
      },
    };
  },

  /**
   * Normalize a phase object
   * @param {Object} phase - Phase to normalize
   * @returns {Object} Normalized phase
   */
  _normalizePhase(phase) {
    return {
      id: phase.id,
      name: phase.name,
      description: phase.description || "",
      icon: phase.icon || "🎭",
      teams: phase.teams || [],
      threads: phase.threads || {},
      actions: (phase.actions || []).map((action) =>
        this._normalizeAction(action),
      ),
      output: phase.output || { consolidation: "last_action" },
      gavel: phase.gavel || null,
    };
  },

  /**
   * Normalize an action object
   * @param {Object} action - Action to normalize
   * @returns {Object} Normalized action
   */
  _normalizeAction(action) {
    return {
      id: action.id,
      name: action.name,
      actionType: action.actionType || "standard",
      description: action.description || "",
      execution: action.execution || { mode: "sync" },
      participants: action.participants || {},
      promptTemplate: action.promptTemplate || "",
      crudConfig: action.crudConfig || null,
      ragConfig: action.ragConfig || null,
      deliberativeConfig: action.deliberativeConfig || null,
      gavelConfig: action.gavelConfig || null,
    };
  },

  // ===== CURRENT STATE EXPORT =====

  /**
   * Create a preset from current system state
   * @param {Object} options - Options for creating preset
   * @returns {Object} Created preset
   */
  createPresetFromCurrentState(options = {}) {
    const {
      id = `custom_${Date.now()}`,
      name = "Custom Preset",
      description = "Preset created from current configuration",
    } = options;

    const preset = {
      id,
      name,
      description,
      version: "1.0.0",
      staticContext: {
        includeCharacterCard: true,
        includeWorldInfo: true,
        includePersona: true,
        includeScenario: true,
        custom: {},
      },
      globals: {},
      constants: {},
      agents: {},
      teams: [],
      threads: {},
      phases: [],
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        author: "User",
        tags: ["custom"],
      },
    };

    // Export agents from AgentsSystem
    if (this._agentsSystem) {
      const agents = this._agentsSystem.getAllAgents?.() || [];
      // Group agents by position/category
      for (const agent of agents) {
        const category = agent.category || agent.position || "default";
        if (!preset.agents[category]) {
          preset.agents[category] = [];
        }
        preset.agents[category].push({
          id: agent.id,
          name: agent.name,
          position: agent.position,
          tier: agent.tier,
          description: agent.description,
          systemPrompt: agent.systemPrompt,
        });
      }

      // Export teams
      const teams = this._agentsSystem.getAllTeams?.() || [];
      preset.teams = teams.map((team) => ({
        id: team.id,
        name: team.name,
        leaderId: team.leaderId,
        memberPositions: team.memberPositions || [],
      }));
    }

    // Export pipelines from PipelineSystem
    if (this._pipelineSystem) {
      const pipelines = this._pipelineSystem.getAllPipelines?.() || [];
      if (pipelines.length > 0) {
        const mainPipeline = pipelines[0];
        preset.phases = mainPipeline.phases || [];
        preset.globals = mainPipeline.globals || {};
        preset.constants = mainPipeline.constants || {};
        preset.staticContext =
          mainPipeline.staticContext || preset.staticContext;
      }
    }

    // Export threads from ThreadManager
    if (this._threadManager) {
      const threads = this._threadManager.getAllThreads?.() || [];
      for (const thread of threads) {
        preset.threads[thread.id] = {
          id: thread.id,
          name: thread.name,
          description: thread.description,
          visible: thread.visible !== false,
        };
      }
    }

    // Normalize and register
    const normalized = this._normalizePreset(preset);
    this._presets.set(normalized.id, normalized);

    this._emit("preset:created", { preset: normalized });

    return normalized;
  },

  // ===== EVENT SYSTEM =====

  /**
   * Subscribe to an event
   * @param {string} event - Event name
   * @param {Function} callback - Event callback
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
   * Unsubscribe from an event
   * @param {string} event - Event name
   * @param {Function} callback - Event callback
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
    const listeners = this._listeners.get(event) || [];
    for (const callback of listeners) {
      try {
        callback(data);
      } catch (error) {
        this._log(
          "error",
          `Event listener error for ${event}: ${error.message}`,
        );
      }
    }
  },

  // ===== LOGGING =====

  /**
   * Log a message
   * @param {string} level - Log level
   * @param {string} message - Message
   * @param {*} data - Additional data
   */
  _log(level, message, data = null) {
    const prefix = "[PresetManager]";
    if (this._logger) {
      this._logger.log(level, `${prefix} ${message}`, data);
    } else {
      const fn = console[level] || console.log;
      if (data) {
        fn(`${prefix} ${message}`, data);
      } else {
        fn(`${prefix} ${message}`);
      }
    }
  },
};

// Export for use in other modules
if (typeof window !== "undefined") {
  window.TheCouncilPresetManager = PresetManager;
}
