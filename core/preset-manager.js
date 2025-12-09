/**
 * TheCouncil - Preset Manager
 *
 * Core module for managing unified presets:
 * - Discover presets from data/presets/ directory
 * - Load and parse preset files
 * - Apply presets to all relevant systems (Agents, Pipeline, Curation)
 * - Import/export preset functionality
 * - Preset validation and normalization
 *
 * A unified preset contains:
 * - Pipeline configuration (phases, actions, globals)
 * - Agents configuration (agents by category)
 * - Teams configuration
 * - Threads configuration
 * - Static context settings
 * - Constants
 *
 * @version 1.0.0
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
    const knownFiles = ["default-pipeline.json"];
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
      teams: { success: false, count: 0 },
      pipeline: { success: false, phaseCount: 0 },
      threads: { success: false, count: 0 },
      errors: [],
    };

    try {
      // Apply agents
      if (preset.agents && this._agentsSystem) {
        try {
          results.agents = await this._applyAgents(preset, options);
        } catch (error) {
          results.errors.push(`Agents: ${error.message}`);
          this._log("error", `Failed to apply agents: ${error.message}`);
        }
      }

      // Apply teams
      if (preset.teams && this._agentsSystem) {
        try {
          results.teams = await this._applyTeams(preset, options);
        } catch (error) {
          results.errors.push(`Teams: ${error.message}`);
          this._log("error", `Failed to apply teams: ${error.message}`);
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
   * Apply agents from preset
   * @param {Object} preset - Preset object
   * @param {Object} options - Options
   * @returns {Object} Result
   */
  async _applyAgents(preset, options = {}) {
    const { clearExisting = true } = options;
    let count = 0;

    if (clearExisting) {
      // Clear existing agents
      this._agentsSystem.clear?.();
    }

    // Flatten agents from all categories
    const allAgents = [];
    for (const [category, agents] of Object.entries(preset.agents)) {
      if (Array.isArray(agents)) {
        for (const agent of agents) {
          allAgents.push({
            ...agent,
            category,
          });
        }
      }
    }

    // Register each agent
    for (const agent of allAgents) {
      try {
        this._agentsSystem.addAgent?.(agent);
        count++;
      } catch (error) {
        this._log("warn", `Failed to add agent ${agent.id}: ${error.message}`);
      }
    }

    return { success: true, count };
  },

  /**
   * Apply teams from preset
   * @param {Object} preset - Preset object
   * @param {Object} options - Options
   * @returns {Object} Result
   */
  async _applyTeams(preset, options = {}) {
    const { clearExisting = true } = options;
    let count = 0;

    if (clearExisting && typeof this._agentsSystem.clearTeams === "function") {
      this._agentsSystem.clearTeams();
    }

    for (const team of preset.teams || []) {
      try {
        if (typeof this._agentsSystem.createTeam === "function") {
          this._agentsSystem.createTeam(team);
          count++;
        }
      } catch (error) {
        this._log("warn", `Failed to create team ${team.id}: ${error.message}`);
      }
    }

    return { success: true, count };
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
