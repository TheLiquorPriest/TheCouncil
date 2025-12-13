/**
 * TheCouncil - Curation System
 *
 * Core module for managing data stores and curation pipelines:
 * - Store management (CRUD operations)
 * - Schema definitions and validation
 * - CRUD Pipelines (AI-assisted data operations)
 * - RAG Pipelines (retrieval-augmented generation)
 *
 * The Curation System manages persistent story data like:
 * - Character sheets, development, inventory, positions
 * - Plot lines, scenes, dialogue history
 * - Location sheets, faction sheets
 * - Story draft, outline, synopsis
 * - Current situation tracking
 * - Agent commentary archives
 *
 * @version 2.0.0
 */

const CurationSystem = {
  // ===== VERSION =====
  VERSION: "2.1.0",

  // ===== STATE =====

  /**
   * Curation-specific agents registry (isolated from AgentsSystem)
   * @type {Map<string, Object>}
   */
  _curationAgents: new Map(),

  /**
   * Store schemas registry
   * @type {Map<string, Object>}
   */
  _storeSchemas: new Map(),

  /**
   * Store data (in-memory cache)
   * @type {Map<string, Map|Object>}
   */
  _stores: new Map(),

  /**
   * CRUD Pipelines
   * @type {Map<string, Object>}
   */
  _crudPipelines: new Map(),

  /**
   * RAG Pipelines
   * @type {Map<string, Object>}
   */
  _ragPipelines: new Map(),

  /**
   * Curation team positions (fixed structure)
   * @type {Map<string, Object>}
   */
  _positions: new Map(),

  /**
   * Position to agent assignments
   * @type {Map<string, string>}
   */
  _positionAssignments: new Map(),

  /**
   * Kernel reference
   * @type {Object|null}
   */
  _kernel: null,

  /**
   * Logger reference (from Kernel)
   * @type {Object|null}
   */
  _logger: null,

  /**
   * EventBus reference (from Kernel)
   * @type {Object|null}
   */
  _eventBus: null,

  /**
   * API client reference
   * @type {Object|null}
   */
  _apiClient: null,

  /**
   * Token resolver reference
   * @type {Object|null}
   */
  _tokenResolver: null,

  /**
   * Initialization flag
   * @type {boolean}
   */
  _initialized: false,

  /**
   * Dirty stores (need saving)
   * @type {Set<string>}
   */
  _dirtyStores: new Set(),

  /**
   * Auto-save interval ID
   * @type {number|null}
   */
  _autoSaveInterval: null,

  /**
   * Index cache for fast lookups on indexed fields
   * @type {Map<string, Map<string, Map<string, Set>>>}
   */
  _indexCache: new Map(),

  // ===== VALIDATION ERROR MESSAGES =====

  /**
   * Standardized validation error messages
   */
  ValidationErrors: {
    STORE_NOT_FOUND: (storeId) => `Store "${storeId}" not found`,
    ENTRY_NOT_FOUND: (key, storeId) =>
      `Entry "${key}" not found in store "${storeId}"`,
    SINGLETON_CREATE: (storeId) =>
      `Cannot create in singleton store "${storeId}" - use update instead`,
    SINGLETON_DELETE: (storeId) =>
      `Cannot delete from singleton store "${storeId}" - use update to clear fields`,
    PRIMARY_KEY_REQUIRED: (keyField) => `Primary key "${keyField}" is required`,
    DUPLICATE_ENTRY: (key, keyField) =>
      `Entry with ${keyField}="${key}" already exists`,
    FIELD_REQUIRED: (fieldName) => `Field "${fieldName}" is required`,
    INVALID_TYPE: (fieldName, expected, actual) =>
      `Field "${fieldName}" expected ${expected}, got ${actual}`,
    ENUM_INVALID: (fieldName, value, allowed) =>
      `Field "${fieldName}" value "${value}" not in allowed values: ${allowed.join(", ")}`,
    NUMBER_RANGE: (fieldName, min, max) =>
      `Field "${fieldName}" must be between ${min} and ${max}`,
    PIPELINE_NOT_FOUND: (pipelineId) => `Pipeline "${pipelineId}" not found`,
    AGENT_NOT_FOUND: (agentId) => `Curation agent "${agentId}" not found`,
    POSITION_NOT_FOUND: (positionId) => `Position "${positionId}" not found`,
  },

  // ===== INITIALIZATION =====

  /**
   * Initialize the Curation System (Kernel pattern)
   * @param {Object} kernel - Kernel instance
   * @param {Object} options - Configuration options
   * @param {Object} options.apiClient - API client instance (optional, can use kernel's)
   * @param {Object} options.tokenResolver - Token resolver instance (optional)
   * @param {Object} options.initialSchemas - Initial store schemas
   * @param {boolean} options.autoSave - Enable auto-save (default: true)
   * @param {number} options.autoSaveIntervalMs - Auto-save interval (default: 30000)
   * @returns {CurationSystem}
   */
  init(kernel, options = {}) {
    if (this._initialized) {
      this._log("warn", "CurationSystem already initialized");
      return this;
    }

    // Store Kernel reference
    this._kernel = kernel;

    // Get shared modules from Kernel
    this._logger = kernel.getModule('logger');
    this._eventBus = kernel.getModule('eventBus');
    this._apiClient = options.apiClient || kernel.getModule('apiClient');
    this._tokenResolver = options.tokenResolver || kernel.getModule('tokenResolver');

    this._log("info", "Initializing Curation System...");

    // Clear existing state
    this.clear();

    // Register default store schemas
    this._registerDefaultSchemas();

    // Register default curation positions
    this._registerDefaultPositions();

    // Register default curation agents
    this._registerDefaultCurationAgents();

    // Register default character pipelines
    this._registerDefaultCharacterPipelines();

    // Register default RAG pipelines
    this._registerDefaultRAGPipelines();

    // Register default CRUD pipelines (async)
    this._registerDefaultCRUDPipelines().catch((err) => {
      this._log("warn", `Failed to load default CRUD pipelines: ${err.message}`);
    });

    // Load initial schemas if provided
    if (options.initialSchemas) {
      for (const schema of options.initialSchemas) {
        this.registerStoreSchema(schema);
      }
    }

    // Set up auto-save
    if (options.autoSave !== false) {
      const interval = options.autoSaveIntervalMs || 30000;
      this._startAutoSave(interval);
    }

    this._initialized = true;
    this._log("info", "Curation System initialized");
    this._emit("system:initialized");

    // Register with Kernel
    this._kernel.registerSystem('curation', this);

    // Load persisted data asynchronously
    if (options.loadPersistedData !== false) {
      this.loadPersistedData().catch((err) => {
        this._log("warn", `Failed to load persisted data: ${err.message}`);
      });
    }

    return this;
  },

  /**
   * Load all persisted data (stores and pipelines)
   * @returns {Promise<void>}
   */
  async loadPersistedData() {
    this._log("info", "Loading persisted curation data...");

    try {
      await Promise.all([this.loadAllStores(), this.loadPipelines()]);

      // Initialize index caches after loading data
      this._initializeIndexCaches();

      this._log("info", "Persisted curation data loaded");
    } catch (error) {
      this._log("error", `Error loading persisted data: ${error.message}`);
      throw error;
    }
  },

  /**
   * Check if system is initialized
   * @returns {boolean}
   */
  isInitialized() {
    return this._initialized;
  },

  /**
   * Check if system is ready (for Kernel compatibility)
   * @returns {boolean}
   */
  isReady() {
    return this._initialized;
  },

  /**
   * Initialize index caches for all stores
   */
  _initializeIndexCaches() {
    for (const [storeId, schema] of this._storeSchemas.entries()) {
      if (!schema.isSingleton && schema.indexFields?.length > 0) {
        this._rebuildIndex(storeId);
      }
    }
    this._log(
      "debug",
      `Initialized index caches for ${this._indexCache.size} stores`,
    );
  },

  /**
   * Rebuild index cache for a store
   * @param {string} storeId - Store ID to rebuild index for
   */
  _rebuildIndex(storeId) {
    const schema = this._storeSchemas.get(storeId);
    if (!schema || schema.isSingleton || !schema.indexFields?.length) {
      return;
    }

    const store = this._stores.get(storeId);
    if (!store) return;

    // Create index maps for each indexed field
    const storeIndex = new Map();
    for (const field of schema.indexFields) {
      storeIndex.set(field, new Map());
    }

    // Build indexes
    for (const [key, entry] of store.entries()) {
      for (const field of schema.indexFields) {
        const value = entry[field];
        if (value !== undefined && value !== null) {
          const fieldIndex = storeIndex.get(field);
          const normalizedValue = String(value).toLowerCase();
          if (!fieldIndex.has(normalizedValue)) {
            fieldIndex.set(normalizedValue, new Set());
          }
          fieldIndex.get(normalizedValue).add(key);
        }
      }
    }

    this._indexCache.set(storeId, storeIndex);
    this._log("debug", `Rebuilt index for store ${storeId}`);
  },

  /**
   * Rebuild all indexes
   */
  rebuildAllIndexes() {
    for (const storeId of this._storeSchemas.keys()) {
      this._rebuildIndex(storeId);
    }
    this._log("info", "Rebuilt all store indexes");
  },

  /**
   * Query using index (faster for indexed fields)
   * @param {string} storeId - Store ID
   * @param {string} field - Field to query
   * @param {string} value - Value to match
   * @returns {Array} Matching entries
   */
  queryByIndex(storeId, field, value) {
    const storeIndex = this._indexCache.get(storeId);
    if (!storeIndex) {
      // Fallback to regular query
      return this.read(storeId, { [field]: value });
    }

    const fieldIndex = storeIndex.get(field);
    if (!fieldIndex) {
      return this.read(storeId, { [field]: value });
    }

    const normalizedValue = String(value).toLowerCase();
    const keys = fieldIndex.get(normalizedValue);
    if (!keys || keys.size === 0) {
      return [];
    }

    const store = this._stores.get(storeId);
    return Array.from(keys)
      .map((key) => store.get(key))
      .filter(Boolean);
  },

  /**
   * Validate entry data against schema with detailed errors
   * @param {Object} schema - Store schema
   * @param {Object} data - Entry data
   * @returns {Object} { valid: boolean, errors: string[], warnings: string[] }
   */
  validateEntry(schema, data) {
    const result = {
      valid: true,
      errors: [],
      warnings: [],
    };

    if (!schema || !schema.fields) {
      result.errors.push("Invalid schema - no fields defined");
      result.valid = false;
      return result;
    }

    // Check required fields
    for (const [fieldName, fieldDef] of Object.entries(schema.fields)) {
      const value = data[fieldName];

      if (
        fieldDef.required &&
        (value === undefined || value === null || value === "")
      ) {
        result.errors.push(this.ValidationErrors.FIELD_REQUIRED(fieldName));
        result.valid = false;
        continue;
      }

      if (value === undefined || value === null) {
        continue;
      }

      // Type validation
      const actualType = Array.isArray(value) ? "array" : typeof value;
      const expectedType = fieldDef.type;

      if (expectedType === "enum") {
        if (!fieldDef.enumValues?.includes(value)) {
          result.errors.push(
            this.ValidationErrors.ENUM_INVALID(
              fieldName,
              value,
              fieldDef.enumValues || [],
            ),
          );
          result.valid = false;
        }
      } else if (expectedType === "number") {
        if (actualType !== "number" && isNaN(Number(value))) {
          result.errors.push(
            this.ValidationErrors.INVALID_TYPE(fieldName, "number", actualType),
          );
          result.valid = false;
        } else {
          const numValue = Number(value);
          if (fieldDef.min !== undefined && numValue < fieldDef.min) {
            result.errors.push(
              this.ValidationErrors.NUMBER_RANGE(
                fieldName,
                fieldDef.min,
                fieldDef.max ?? "∞",
              ),
            );
            result.valid = false;
          }
          if (fieldDef.max !== undefined && numValue > fieldDef.max) {
            result.errors.push(
              this.ValidationErrors.NUMBER_RANGE(
                fieldName,
                fieldDef.min ?? "-∞",
                fieldDef.max,
              ),
            );
            result.valid = false;
          }
        }
      } else if (expectedType === "array" && actualType !== "array") {
        result.warnings.push(
          `Field "${fieldName}" expected array, got ${actualType} - will coerce`,
        );
      } else if (expectedType === "boolean" && actualType !== "boolean") {
        result.warnings.push(
          `Field "${fieldName}" expected boolean, got ${actualType} - will coerce`,
        );
      }
    }

    // Check for unknown fields
    for (const fieldName of Object.keys(data)) {
      if (
        !schema.fields[fieldName] &&
        !["createdAt", "updatedAt"].includes(fieldName)
      ) {
        result.warnings.push(`Unknown field "${fieldName}" will be ignored`);
      }
    }

    return result;
  },

  /**
   * Clear all state
   */
  clear() {
    this._storeSchemas.clear();
    this._stores.clear();
    this._indexCache.clear();
    this._crudPipelines.clear();
    this._ragPipelines.clear();
    this._positions.clear();
    this._positionAssignments.clear();
    this._curationAgents.clear();
    this._dirtyStores.clear();
  },

  // ===== CURATION AGENT MANAGEMENT =====

  /**
   * Register default curation agents (isolated from AgentsSystem)
   * @private
   */
  _registerDefaultCurationAgents() {
    const defaultAgents = [
      {
        id: "curation_archivist",
        name: "Archivist Agent",
        description: "Default agent for the Archivist position",
        positionId: "archivist",
        apiConfig: {
          useCurrentConnection: true,
          temperature: 0.3,
          maxTokens: 2000,
        },
        systemPrompt: {
          source: "custom",
          customText: `You are the Archivist, the leader of the Record Keeping team. Your role is to:
- Oversee all data management operations
- Ensure consistency and accuracy across all data stores
- Coordinate the activities of the Topologist team members
- Make final decisions on data organization and structure

When responding, be precise, organized, and thorough. Focus on data integrity and proper categorization.`,
        },
      },
      {
        id: "curation_story_topologist",
        name: "Story Topologist Agent",
        description: "Default agent for story structure analysis",
        positionId: "story_topologist",
        apiConfig: {
          useCurrentConnection: true,
          temperature: 0.5,
          maxTokens: 2000,
        },
        systemPrompt: {
          source: "custom",
          customText: `You are the Story Topologist, specializing in narrative structure. Your expertise includes:
- Plot line tracking and development
- Scene analysis and organization
- Narrative flow and pacing
- Story arc identification

When analyzing content, focus on the structural elements of the narrative and how they connect.`,
        },
      },
      {
        id: "curation_character_topologist",
        name: "Character Topologist Agent",
        description: "Default agent for character analysis",
        positionId: "character_topologist",
        apiConfig: {
          useCurrentConnection: true,
          temperature: 0.5,
          maxTokens: 2000,
        },
        systemPrompt: {
          source: "custom",
          customText: `You are the Character Topologist, specializing in character analysis. Your expertise includes:
- Character traits and personality analysis
- Relationship mapping and dynamics
- Character development tracking
- Dialogue patterns and speech characteristics

When analyzing content, focus on character-related details and interpersonal dynamics.`,
        },
      },
      {
        id: "curation_lore_topologist",
        name: "Lore Topologist Agent",
        description: "Default agent for world-building analysis",
        positionId: "lore_topologist",
        apiConfig: {
          useCurrentConnection: true,
          temperature: 0.5,
          maxTokens: 2000,
        },
        systemPrompt: {
          source: "custom",
          customText: `You are the Lore Topologist, specializing in world-building. Your expertise includes:
- World history and background lore
- Faction and organization tracking
- Cultural and societal elements
- Rules and systems of the story world

When analyzing content, focus on world-building elements and background information.`,
        },
      },
      {
        id: "curation_location_topologist",
        name: "Location Topologist Agent",
        description: "Default agent for location analysis",
        positionId: "location_topologist",
        apiConfig: {
          useCurrentConnection: true,
          temperature: 0.4,
          maxTokens: 1500,
        },
        systemPrompt: {
          source: "custom",
          customText: `You are the Location Topologist, specializing in spatial analysis. Your expertise includes:
- Location descriptions and details
- Spatial relationships between places
- Environmental and atmospheric elements
- Geographic and architectural features

When analyzing content, focus on location-related details and spatial context.`,
        },
      },
      {
        id: "curation_scene_topologist",
        name: "Scene Topologist Agent",
        description: "Default agent for scene analysis",
        positionId: "scene_topologist",
        apiConfig: {
          useCurrentConnection: true,
          temperature: 0.5,
          maxTokens: 1500,
        },
        systemPrompt: {
          source: "custom",
          customText: `You are the Scene Topologist, specializing in scene management. Your expertise includes:
- Scene composition and structure
- Environmental and situational details
- Timing and sequence tracking
- Mood and atmosphere analysis

When analyzing content, focus on scene-specific elements and situational context.`,
        },
      },
    ];

    for (const agent of defaultAgents) {
      this._curationAgents.set(agent.id, {
        ...agent,
        metadata: {
          createdAt: Date.now(),
          updatedAt: Date.now(),
          isDefault: true,
        },
      });

      // Assign to position
      if (agent.positionId) {
        this._positionAssignments.set(agent.positionId, agent.id);
      }
    }

    this._log(
      "debug",
      `Registered ${defaultAgents.length} default curation agents`,
    );
  },

  /**
   * Create a new curation agent (CRUD wrapper for registerCurationAgent)
   * @param {Object} agent - Agent configuration
   * @returns {Object} Created agent
   */
  createCurationAgent(agent) {
    return this.registerCurationAgent(agent);
  },

  /**
   * Register a curation agent
   * @param {Object} agent - Agent configuration
   * @returns {Object} Registered agent
   */
  registerCurationAgent(agent) {
    if (!agent.id) {
      throw new Error("Curation agent requires an id");
    }

    const normalized = {
      id: agent.id,
      name: agent.name || agent.id,
      description: agent.description || "",
      positionId: agent.positionId || null,
      apiConfig: {
        useCurrentConnection: agent.apiConfig?.useCurrentConnection !== false,
        endpoint: agent.apiConfig?.endpoint || "",
        apiKey: agent.apiConfig?.apiKey || "",
        model: agent.apiConfig?.model || "",
        temperature: agent.apiConfig?.temperature ?? 0.5,
        maxTokens: agent.apiConfig?.maxTokens || 2000,
        topP: agent.apiConfig?.topP ?? 1,
        frequencyPenalty: agent.apiConfig?.frequencyPenalty ?? 0,
        presencePenalty: agent.apiConfig?.presencePenalty ?? 0,
      },
      systemPrompt: {
        source: agent.systemPrompt?.source || "custom",
        customText: agent.systemPrompt?.customText || "",
      },
      metadata: {
        createdAt: agent.metadata?.createdAt || Date.now(),
        updatedAt: Date.now(),
        isDefault: agent.metadata?.isDefault || false,
      },
    };

    this._curationAgents.set(normalized.id, normalized);

    // Update position assignment if specified
    if (normalized.positionId) {
      this._positionAssignments.set(normalized.positionId, normalized.id);
    }

    this._emit("agent:registered", { agent: normalized });
    return normalized;
  },

  /**
   * Get a curation agent by ID
   * @param {string} agentId - Agent ID
   * @returns {Object|null} Agent or null
   */
  getCurationAgent(agentId) {
    return this._curationAgents.get(agentId) || null;
  },

  /**
   * Get all curation agents
   * @returns {Object[]} All curation agents
   */
  getAllCurationAgents() {
    return Array.from(this._curationAgents.values());
  },

  /**
   * Get curation agent for a position
   * @param {string} positionId - Position ID
   * @returns {Object|null} Agent or null
   */
  getAgentForPosition(positionId) {
    const agentId = this._positionAssignments.get(positionId);
    if (!agentId) return null;
    return this._curationAgents.get(agentId) || null;
  },

  /**
   * Assign an agent to a position
   * @param {string} positionId - Position ID
   * @param {string} agentId - Agent ID
   */
  assignAgentToPosition(positionId, agentId) {
    if (!this._positions.has(positionId)) {
      throw new Error(`Position ${positionId} not found`);
    }
    if (agentId && !this._curationAgents.has(agentId)) {
      throw new Error(`Agent ${agentId} not found`);
    }

    if (agentId) {
      this._positionAssignments.set(positionId, agentId);
      // Update agent's positionId
      const agent = this._curationAgents.get(agentId);
      if (agent) {
        agent.positionId = positionId;
        agent.metadata.updatedAt = Date.now();
      }
    } else {
      this._positionAssignments.delete(positionId);
    }

    this._emit("position:assigned", { positionId, agentId });
  },

  /**
   * Update a curation agent
   * @param {string} agentId - Agent ID
   * @param {Object} updates - Updates to apply
   * @returns {Object} Updated agent
   */
  updateCurationAgent(agentId, updates) {
    const agent = this._curationAgents.get(agentId);
    if (!agent) {
      throw new Error(`Curation agent ${agentId} not found`);
    }

    const updated = {
      ...agent,
      ...updates,
      id: agent.id, // Preserve ID
      apiConfig: { ...agent.apiConfig, ...updates.apiConfig },
      systemPrompt: { ...agent.systemPrompt, ...updates.systemPrompt },
      metadata: {
        ...agent.metadata,
        ...updates.metadata,
        updatedAt: Date.now(),
      },
    };

    this._curationAgents.set(agentId, updated);
    this._emit("agent:updated", { agent: updated });
    return updated;
  },

  /**
   * Delete a curation agent
   * @param {string} agentId - Agent ID
   * @returns {boolean} True if deleted
   */
  deleteCurationAgent(agentId) {
    const agent = this._curationAgents.get(agentId);
    if (!agent) return false;

    // Remove from position assignments
    if (agent.positionId) {
      this._positionAssignments.delete(agent.positionId);
    }

    this._curationAgents.delete(agentId);
    this._emit("agent:deleted", { agentId });
    return true;
  },

  /**
   * Get curation team summary
   * @returns {Object} Team summary
   */
  getCurationTeamSummary() {
    const positions = Array.from(this._positions.values());
    const agents = Array.from(this._curationAgents.values());

    return {
      positionCount: positions.length,
      agentCount: agents.length,
      assignedPositions: positions.filter((p) =>
        this._positionAssignments.has(p.id),
      ).length,
      positions: positions.map((p) => ({
        id: p.id,
        name: p.name,
        tier: p.tier,
        assignedAgentId: this._positionAssignments.get(p.id) || null,
        assignedAgentName:
          this._curationAgents.get(this._positionAssignments.get(p.id))?.name ||
          null,
      })),
    };
  },

  /**
   * Shutdown the system
   */
  async shutdown() {
    this._log("info", "Shutting down Curation System...");

    // Stop auto-save
    this._stopAutoSave();

    // Save any dirty stores
    await this.saveAllDirty();

    this._initialized = false;
    this._emit("system:shutdown");
  },

  // ===== DEFAULT SCHEMAS =====

  /**
   * Register default store schemas
   */
  _registerDefaultSchemas() {
    const defaults = [
      // Singleton stores (no primary key)
      {
        id: "storyDraft",
        name: "Story Draft",
        description: "Current working draft of the story",
        icon: "📝",
        isSingleton: true,
        fields: {
          content: { type: "string", required: true, default: "" },
          updatedAt: { type: "date" },
        },
      },
      {
        id: "storyOutline",
        name: "Story Outline",
        description: "Current outline of the story structure",
        icon: "📋",
        isSingleton: true,
        fields: {
          content: { type: "string", required: true, default: "" },
          updatedAt: { type: "date" },
        },
      },
      {
        id: "storySynopsis",
        name: "Story Synopsis",
        description: "Detailed synopsis using 5 W's and How",
        icon: "📖",
        isSingleton: true,
        fields: {
          who: { type: "string", default: "" },
          what: { type: "string", default: "" },
          when: { type: "string", default: "" },
          where: { type: "string", default: "" },
          why: { type: "string", default: "" },
          how: { type: "string", default: "" },
          summary: { type: "string", default: "" },
          updatedAt: { type: "date" },
        },
      },
      {
        id: "currentSituation",
        name: "Current Situation",
        description: "Current story situation using 5 W's and How",
        icon: "📌",
        isSingleton: true,
        fields: {
          who: { type: "string", default: "" },
          what: { type: "string", default: "" },
          when: { type: "string", default: "" },
          where: { type: "string", default: "" },
          why: { type: "string", default: "" },
          how: { type: "string", default: "" },
          summary: { type: "string", default: "" },
          updatedAt: { type: "date" },
        },
      },

      // Collection stores (with primary key)
      {
        id: "plotLines",
        name: "Plot Lines",
        description: "Chronological plot line details and tracker",
        icon: "📈",
        primaryKey: "id",
        indexFields: ["name", "status", "type"],
        fields: {
          id: { type: "string", required: true },
          name: { type: "string", required: true },
          description: { type: "string", default: "" },
          status: {
            type: "enum",
            enumValues: ["active", "resolved", "inactive", "stalled"],
            default: "active",
          },
          type: {
            type: "enum",
            enumValues: ["main", "subplot", "background"],
            default: "subplot",
          },
          startedAt: { type: "string", default: "" },
          resolvedAt: { type: "string", default: "" },
          relatedCharacters: { type: "array", default: [] },
          relatedLocations: { type: "array", default: [] },
          timeline: { type: "array", default: [] },
          tension: { type: "number", min: 0, max: 10, default: 5 },
          createdAt: { type: "date" },
          updatedAt: { type: "date" },
        },
      },
      {
        id: "scenes",
        name: "Scenes",
        description: "Chronological scene details and tracker",
        icon: "🎬",
        primaryKey: "id",
        indexFields: ["number", "location"],
        fields: {
          id: { type: "string", required: true },
          number: { type: "number", required: true },
          title: { type: "string", default: "" },
          summary: { type: "string", default: "" },
          timeInStory: { type: "string", default: "" },
          weather: { type: "string", default: "" },
          location: { type: "string", default: "" },
          characters: { type: "array", default: [] },
          props: { type: "array", default: [] },
          environmentDetails: { type: "string", default: "" },
          mood: { type: "string", default: "" },
          tension: { type: "number", min: 0, max: 10, default: 5 },
          timestamp: { type: "date" },
        },
      },
      {
        id: "dialogueHistory",
        name: "Dialogue History",
        description: "Complete chronological in-character dialogue history",
        icon: "💬",
        primaryKey: "id",
        indexFields: ["speaker", "sceneId"],
        fields: {
          id: { type: "string", required: true },
          sceneId: { type: "string", default: "" },
          speaker: { type: "string", required: true },
          dialogue: { type: "string", required: true },
          subtext: { type: "string", default: "" },
          timeInStory: { type: "string", default: "" },
          timestamp: { type: "date" },
        },
      },
      {
        id: "characterSheets",
        name: "Character Sheets",
        description: "Detailed character sheets for all characters",
        icon: "👤",
        primaryKey: "id",
        indexFields: ["name", "type", "isPresent"],
        fields: {
          id: { type: "string", required: true },
          name: { type: "string", required: true },
          type: {
            type: "enum",
            enumValues: [
              "main",
              "main_cast",
              "recurring",
              "recurring_cast",
              "supporting",
              "supporting_cast",
              "minor",
              "background",
              "npc",
            ],
            default: "supporting_cast",
            description:
              "Character importance: main_cast (protagonists), recurring_cast (regular appearances), supporting_cast (occasional), background (extras/NPCs)",
          },
          description: { type: "string", default: "" },
          personality: { type: "string", default: "" },
          appearance: { type: "string", default: "" },
          background: { type: "string", default: "" },
          motivations: { type: "array", default: [] },
          fears: { type: "array", default: [] },
          relationships: { type: "object", default: {} },
          skills: { type: "array", default: [] },
          flaws: { type: "array", default: [] },
          speechPatterns: { type: "string", default: "" },
          isPresent: { type: "boolean", default: true },
          // Character System integration fields
          voicingGuidance: {
            type: "string",
            default: "",
            description:
              "Additional guidance for voicing this character in dialogue",
          },
          mannerisms: {
            type: "array",
            default: [],
            description: "Distinctive mannerisms, gestures, or habits",
          },
          catchphrases: {
            type: "array",
            default: [],
            description: "Signature phrases or expressions the character uses",
          },
          createdAt: { type: "date" },
          updatedAt: { type: "date" },
        },
      },
      {
        id: "characterDevelopment",
        name: "Character Development",
        description: "Chronological character development tracker",
        icon: "📊",
        primaryKey: "characterId",
        fields: {
          characterId: { type: "string", required: true },
          arc: { type: "string", default: "" },
          currentState: { type: "string", default: "" },
          milestones: { type: "array", default: [] },
          changes: { type: "array", default: [] },
          updatedAt: { type: "date" },
        },
      },
      {
        id: "characterInventory",
        name: "Character Inventory",
        description: "Items and possessions for all characters",
        icon: "🎒",
        primaryKey: "characterId",
        fields: {
          characterId: { type: "string", required: true },
          items: { type: "array", default: [] },
          updatedAt: { type: "date" },
        },
      },
      {
        id: "characterPositions",
        name: "Character Positions",
        description: "Current location and position history for characters",
        icon: "📍",
        primaryKey: "characterId",
        fields: {
          characterId: { type: "string", required: true },
          currentLocation: { type: "string", default: "" },
          currentActivity: { type: "string", default: "" },
          history: { type: "array", default: [] },
          updatedAt: { type: "date" },
        },
      },
      {
        id: "locationSheets",
        name: "Location Sheets",
        description: "Detailed location/setting sheets",
        icon: "🗺️",
        primaryKey: "id",
        indexFields: ["name", "type"],
        fields: {
          id: { type: "string", required: true },
          name: { type: "string", required: true },
          type: {
            type: "enum",
            enumValues: ["interior", "exterior", "mixed"],
            default: "mixed",
          },
          description: { type: "string", default: "" },
          features: { type: "array", default: [] },
          connections: { type: "array", default: [] },
          atmosphere: { type: "string", default: "" },
          history: { type: "string", default: "" },
          createdAt: { type: "date" },
          updatedAt: { type: "date" },
        },
      },
      {
        id: "factionSheets",
        name: "Faction Sheets",
        description: "Detailed faction/organization sheets",
        icon: "🏛️",
        primaryKey: "id",
        indexFields: ["name"],
        fields: {
          id: { type: "string", required: true },
          name: { type: "string", required: true },
          description: { type: "string", default: "" },
          goals: { type: "array", default: [] },
          members: { type: "array", default: [] },
          allies: { type: "array", default: [] },
          enemies: { type: "array", default: [] },
          territory: { type: "string", default: "" },
          resources: { type: "array", default: [] },
          createdAt: { type: "date" },
          updatedAt: { type: "date" },
        },
      },
      {
        id: "agentCommentary",
        name: "Agent Commentary",
        description: "Archived commentary from agents",
        icon: "💭",
        primaryKey: "id",
        indexFields: ["agentId", "phaseId"],
        fields: {
          id: { type: "string", required: true },
          agentId: { type: "string", required: true },
          positionId: { type: "string", default: "" },
          phaseId: { type: "string", default: "" },
          content: { type: "string", required: true },
          timestamp: { type: "date" },
        },
      },
    ];

    for (const schema of defaults) {
      this._storeSchemas.set(schema.id, this._normalizeSchema(schema));
      // Initialize empty store
      if (schema.isSingleton) {
        this._stores.set(schema.id, this._createDefaultSingletonData(schema));
      } else {
        this._stores.set(schema.id, new Map());
      }
    }
  },

  /**
   * Register default curation positions
   */
  /**
   * Register default character-related pipelines
   * @private
   */
  _registerDefaultCharacterPipelines() {
    // ===== CHARACTER CRUD PIPELINES =====

    // Character Type Classification Pipeline
    this._crudPipelines.set("character_type_classification", {
      id: "character_type_classification",
      storeId: "characterSheets",
      operation: "update",
      name: "Character Type Classification",
      description:
        "Automatically classify character type based on story role and appearance frequency",
      actions: [
        {
          id: "analyze_character",
          name: "Analyze Character Role",
          description: "Determine character importance from story context",
          positionId: "character_topologist",
          promptTemplate: `Analyze this character and determine their type based on story importance:

## Character:
{{input.name}}

## Description:
{{input.description}}

## Background:
{{input.background}}

## Relationships:
{{JSON.stringify(input.relationships)}}

Classify as one of:
- main_cast: Protagonists, central to the story
- recurring_cast: Appear regularly, important supporting roles
- supporting_cast: Occasional appearances, minor plot involvement
- background: Extras, mentioned briefly, NPCs

Respond with JSON: { "type": "<classification>", "reasoning": "<explanation>" }`,
          inputMapping: {},
          outputMapping: { type: "type" },
        },
      ],
      inputSchema: {
        name: { type: "string", required: true },
        description: { type: "string" },
        background: { type: "string" },
        relationships: { type: "object" },
      },
      outputSchema: {
        type: { type: "string" },
      },
    });

    // Character Sheet Creation Pipeline
    this._crudPipelines.set("character_sheet_create", {
      id: "character_sheet_create",
      storeId: "characterSheets",
      operation: "create",
      name: "Create Character Sheet",
      description: "Create a new character sheet with auto-generated fields",
      actions: [
        {
          id: "generate_character_details",
          name: "Generate Character Details",
          description:
            "Fill in missing character details based on provided info",
          positionId: "character_topologist",
          promptTemplate: `Create a complete character sheet based on the provided information.

## Provided Info:
Name: {{input.name}}
Description: {{input.description || "Not provided"}}
Type: {{input.type || "supporting_cast"}}

Generate the following (if not provided):
- personality: Core personality traits
- appearance: Physical description
- background: Brief history
- motivations: What drives them (array)
- fears: What they fear (array)
- speechPatterns: How they speak
- mannerisms: Distinctive behaviors (array)

Respond with JSON containing all fields.`,
          inputMapping: {},
          outputMapping: {},
        },
      ],
      inputSchema: {
        name: { type: "string", required: true },
        description: { type: "string" },
        type: { type: "string" },
      },
      outputSchema: {},
    });

    // Character Update Pipeline
    this._crudPipelines.set("character_sheet_update", {
      id: "character_sheet_update",
      storeId: "characterSheets",
      operation: "update",
      name: "Update Character Sheet",
      description: "Update character sheet with consistency checking",
      actions: [
        {
          id: "validate_changes",
          name: "Validate Character Changes",
          description:
            "Ensure updates are consistent with established character",
          positionId: "character_topologist",
          promptTemplate: `Review these character updates for consistency:

## Current Character:
{{JSON.stringify(input.current)}}

## Proposed Changes:
{{JSON.stringify(input.changes)}}

Check for:
1. Personality consistency
2. Background contradictions
3. Relationship logic

Respond with JSON: { "valid": true/false, "issues": [], "mergedData": {...} }`,
          inputMapping: {},
          outputMapping: {},
        },
      ],
      inputSchema: {
        current: { type: "object", required: true },
        changes: { type: "object", required: true },
      },
      outputSchema: {
        valid: { type: "boolean" },
        issues: { type: "array" },
        mergedData: { type: "object" },
      },
    });

    // ===== CHARACTER RAG PIPELINES =====

    // Character Search RAG Pipeline
    this._ragPipelines.set("character_search", {
      id: "character_search",
      name: "Character Search",
      description: "Search for characters by name, traits, or relationships",
      targetStores: ["characterSheets", "characterDevelopment"],
      actions: [],
      inputSchema: {
        query: { type: "string", required: true },
        limit: { type: "number", default: 10 },
      },
      outputSchema: {
        results: { type: "array" },
        count: { type: "number" },
      },
      canTriggerFromPipeline: true,
      canTriggerManually: true,
    });

    // Character Context RAG Pipeline (for Character Workshop)
    this._ragPipelines.set("character_context", {
      id: "character_context",
      name: "Character Context",
      description:
        "Retrieve full character context including development and relationships",
      targetStores: [
        "characterSheets",
        "characterDevelopment",
        "characterInventory",
        "characterPositions",
        "dialogueHistory",
      ],
      actions: [
        {
          id: "gather_context",
          name: "Gather Character Context",
          description: "Collect all relevant character information",
          positionId: "character_topologist",
          promptTemplate: `Compile comprehensive context for: {{input.characterName}}

Include:
- Core traits and personality
- Recent development/changes
- Key relationships
- Speech patterns and mannerisms
- Current story position

Format as structured summary for character voicing.`,
          inputMapping: {},
          outputMapping: {},
        },
      ],
      inputSchema: {
        characterName: { type: "string", required: true },
        includeDialogue: { type: "boolean", default: true },
        includeDevelopment: { type: "boolean", default: true },
      },
      outputSchema: {
        context: { type: "string" },
        traits: { type: "object" },
        recentDialogue: { type: "array" },
      },
      canTriggerFromPipeline: true,
      canTriggerManually: true,
    });

    // Character Relationships RAG Pipeline
    this._ragPipelines.set("character_relationships", {
      id: "character_relationships",
      name: "Character Relationships",
      description: "Query character relationships and dynamics",
      targetStores: ["characterSheets", "scenes", "dialogueHistory"],
      actions: [
        {
          id: "map_relationships",
          name: "Map Character Relationships",
          description: "Build relationship map for specified characters",
          positionId: "story_topologist",
          promptTemplate: `Map relationships involving: {{input.characterNames}}

For each relationship, identify:
- Nature (friend, rival, family, romantic, etc.)
- History
- Current status
- Key interactions

Respond with structured relationship data.`,
          inputMapping: {},
          outputMapping: {},
        },
      ],
      inputSchema: {
        characterNames: { type: "array", items: { type: "string" } },
        depth: { type: "number", default: 2 },
      },
      outputSchema: {
        relationships: { type: "array" },
        graph: { type: "object" },
      },
      canTriggerFromPipeline: true,
      canTriggerManually: true,
    });

    // Character Voice RAG Pipeline (for consistency)
    this._ragPipelines.set("character_voice", {
      id: "character_voice",
      name: "Character Voice Reference",
      description:
        "Retrieve character voice samples and speech patterns for consistency",
      targetStores: ["characterSheets", "dialogueHistory"],
      actions: [
        {
          id: "extract_voice",
          name: "Extract Voice Patterns",
          description: "Analyze dialogue to extract voice characteristics",
          positionId: "character_topologist",
          promptTemplate: `Analyze voice patterns for: {{input.characterName}}

From their dialogue history, identify:
- Vocabulary preferences
- Sentence structure patterns
- Common phrases/catchphrases
- Emotional expression style
- Formality level

Provide examples and guidelines for consistent voicing.`,
          inputMapping: {},
          outputMapping: {},
        },
      ],
      inputSchema: {
        characterName: { type: "string", required: true },
        sampleCount: { type: "number", default: 10 },
      },
      outputSchema: {
        voiceProfile: { type: "object" },
        examples: { type: "array" },
        guidelines: { type: "string" },
      },
      canTriggerFromPipeline: true,
      canTriggerManually: true,
    });

    // Scene Characters RAG Pipeline (for dynamic spawning)
    this._ragPipelines.set("scene_characters", {
      id: "scene_characters",
      name: "Scene Characters",
      description:
        "Identify and retrieve characters relevant to a scene or context",
      targetStores: ["characterSheets", "scenes", "characterPositions"],
      actions: [
        {
          id: "identify_characters",
          name: "Identify Scene Characters",
          description: "Determine which characters should be in the scene",
          positionId: "story_topologist",
          promptTemplate: `Identify characters for this scene context:

{{input.sceneContext}}

Consider:
- Explicitly mentioned characters
- Characters likely present based on location
- Characters involved in related plot lines

Return list of character IDs/names with relevance reasoning.`,
          inputMapping: {},
          outputMapping: {},
        },
      ],
      inputSchema: {
        sceneContext: { type: "string", required: true },
        location: { type: "string" },
        plotLines: { type: "array" },
      },
      outputSchema: {
        characters: { type: "array" },
        reasoning: { type: "object" },
      },
      canTriggerFromPipeline: true,
      canTriggerManually: true,
    });

    this._log("debug", "Registered default character pipelines");
  },

  /**
   * Register default RAG pipelines for all stores
   * @private
   */
  _registerDefaultRAGPipelines() {
    // ===== RAG PIPELINES FOR ALL 14 STORES =====

    const ragPipelines = [
      {
        id: "rag-storyDraft",
        name: "Story Draft RAG",
        description: "Retrieval-Augmented Generation for Story Draft",
        targetStores: ["storyDraft"],
        positionId: "story_topologist",
      },
      {
        id: "rag-storyOutline",
        name: "Story Outline RAG",
        description: "Retrieval-Augmented Generation for Story Outline",
        targetStores: ["storyOutline"],
        positionId: "story_topologist",
      },
      {
        id: "rag-storySynopsis",
        name: "Story Synopsis RAG",
        description: "Retrieval-Augmented Generation for Story Synopsis",
        targetStores: ["storySynopsis"],
        positionId: "story_topologist",
      },
      {
        id: "rag-plotLines",
        name: "Plot Lines RAG",
        description: "Retrieval-Augmented Generation for Plot Lines",
        targetStores: ["plotLines"],
        positionId: "plot_topologist",
      },
      {
        id: "rag-scenes",
        name: "Scenes RAG",
        description: "Retrieval-Augmented Generation for Scenes",
        targetStores: ["scenes"],
        positionId: "scene_topologist",
      },
      {
        id: "rag-dialogueHistory",
        name: "Dialogue History RAG",
        description: "Retrieval-Augmented Generation for Dialogue History",
        targetStores: ["dialogueHistory"],
        positionId: "dialogue_topologist",
      },
      {
        id: "rag-characterSheets",
        name: "Character Sheets RAG",
        description: "Retrieval-Augmented Generation for Character Sheets",
        targetStores: ["characterSheets"],
        positionId: "character_topologist",
      },
      {
        id: "rag-characterDevelopment",
        name: "Character Development RAG",
        description: "Retrieval-Augmented Generation for Character Development",
        targetStores: ["characterDevelopment"],
        positionId: "character_topologist",
      },
      {
        id: "rag-characterInventory",
        name: "Character Inventory RAG",
        description: "Retrieval-Augmented Generation for Character Inventory",
        targetStores: ["characterInventory"],
        positionId: "character_topologist",
      },
      {
        id: "rag-characterPositions",
        name: "Character Positions RAG",
        description: "Retrieval-Augmented Generation for Character Positions",
        targetStores: ["characterPositions"],
        positionId: "character_topologist",
      },
      {
        id: "rag-factionSheets",
        name: "Faction Sheets RAG",
        description: "Retrieval-Augmented Generation for Faction Sheets",
        targetStores: ["factionSheets"],
        positionId: "faction_topologist",
      },
      {
        id: "rag-locationSheets",
        name: "Location Sheets RAG",
        description: "Retrieval-Augmented Generation for Location Sheets",
        targetStores: ["locationSheets"],
        positionId: "location_topologist",
      },
      {
        id: "rag-currentSituation",
        name: "Current Situation RAG",
        description: "Retrieval-Augmented Generation for Current Situation",
        targetStores: ["currentSituation"],
        positionId: "story_topologist",
      },
      {
        id: "rag-agentCommentary",
        name: "Agent Commentary RAG",
        description: "Retrieval-Augmented Generation for Agent Commentary",
        targetStores: ["agentCommentary"],
        positionId: "archivist",
      },
    ];

    // Register each RAG pipeline with standard 4-step structure
    for (const pipeline of ragPipelines) {
      this._ragPipelines.set(pipeline.id, {
        id: pipeline.id,
        name: pipeline.name,
        description: pipeline.description,
        targetStores: pipeline.targetStores,
        canTriggerFromPipeline: true,
        canTriggerManually: true,
        actions: [
          {
            id: "parse-query",
            name: "Parse Query",
            positionId: "archivist",
            promptTemplate:
              "Parse the following query to extract search terms:\n{{query}}\n\nIdentify key entities, attributes, and relationships to search for.",
          },
          {
            id: "search-store",
            name: "Search Store",
            positionId: pipeline.positionId,
            promptTemplate: `Search ${pipeline.name.replace(" RAG", "")} for entries matching:\n{{parsedQuery}}\n\nReturn the most relevant results.`,
          },
          {
            id: "rank-results",
            name: "Rank Results",
            positionId: "archivist",
            promptTemplate:
              "Rank the following results by relevance to the original query:\n\nQuery: {{query}}\nResults: {{searchResults}}\n\nReturn top {{maxResults}} results.",
          },
          {
            id: "format-output",
            name: "Format Output",
            positionId: "archivist",
            promptTemplate:
              "Format the ranked results for context injection:\n{{rankedResults}}\n\nProvide clear, concise context.",
          },
        ],
        inputSchema: {
          query: { type: "string", required: true },
          maxResults: { type: "number", default: 5 },
        },
        outputSchema: {
          results: { type: "array" },
          formatted: { type: "string" },
        },
      });
    }

    this._log("debug", `Registered ${ragPipelines.length} default RAG pipelines`);
  },

  /**
   * Register default CRUD pipelines for all stores
   * @private
   */
  async _registerDefaultCRUDPipelines() {
    const pipelineFiles = [
      // Singleton stores
      'crud-storyDraft.json',
      'crud-storyOutline.json',
      'crud-storySynopsis.json',
      'crud-currentSituation.json',
      // Collection stores
      'crud-plotLines.json',
      'crud-scenes.json',
      'crud-dialogueHistory.json',
      'crud-characterSheets.json',
      'crud-characterDevelopment.json',
      'crud-characterInventory.json',
      'crud-characterPositions.json',
      'crud-factionSheets.json',
      'crud-locationSheets.json',
      'crud-agentCommentary.json'
    ];

    for (const filename of pipelineFiles) {
      try {
        const response = await fetch(`scripts/extensions/third-party/TheCouncil/data/pipelines/crud/${filename}`);
        if (!response.ok) {
          this._log('warn', `Failed to load CRUD pipeline: ${filename}`);
          continue;
        }
        const pipeline = await response.json();
        this._crudPipelines.set(pipeline.id, pipeline);
        this._log('debug', `Registered CRUD pipeline: ${pipeline.id}`);
      } catch (error) {
        this._log('error', `Error loading CRUD pipeline ${filename}: ${error.message}`);
      }
    }

    this._log("info", `Registered ${this._crudPipelines.size} default CRUD pipelines`);
  },

  _registerDefaultPositions() {
    const positions = [
      {
        id: "archivist",
        name: "Archivist",
        tier: "leader",
        isMandatory: true,
        promptModifiers: {
          roleDescription:
            "The Archivist oversees all data management operations, ensuring consistency and accuracy across all stores.",
        },
      },
      {
        id: "story_topologist",
        name: "Story Topologist",
        tier: "member",
        isMandatory: true,
        promptModifiers: {
          roleDescription:
            "Specializes in story structure, plot lines, scenes, and narrative flow.",
        },
      },
      {
        id: "lore_topologist",
        name: "Lore Topologist",
        tier: "member",
        isMandatory: true,
        promptModifiers: {
          roleDescription:
            "Specializes in world-building, locations, factions, and background lore.",
        },
      },
      {
        id: "character_topologist",
        name: "Character Topologist",
        tier: "member",
        isMandatory: true,
        promptModifiers: {
          roleDescription:
            "Specializes in character details, development, relationships, and dialogue.",
        },
      },
      {
        id: "scene_topologist",
        name: "Scene Topologist",
        tier: "member",
        isMandatory: true,
        promptModifiers: {
          roleDescription:
            "Specializes in scene management, environment details, and situational tracking.",
        },
      },
      {
        id: "location_topologist",
        name: "Location Topologist",
        tier: "member",
        isMandatory: true,
        promptModifiers: {
          roleDescription:
            "Specializes in location details, spatial relationships, and setting management.",
        },
      },
    ];

    for (const position of positions) {
      this._positions.set(position.id, position);
    }
  },

  /**
   * Create default data for a singleton store
   * @param {Object} schema - Store schema
   * @returns {Object} Default data
   */
  _createDefaultSingletonData(schema) {
    const data = {};
    for (const [fieldName, fieldDef] of Object.entries(schema.fields || {})) {
      if (fieldDef.default !== undefined) {
        data[fieldName] = fieldDef.default;
      } else if (fieldDef.type === "string") {
        data[fieldName] = "";
      } else if (fieldDef.type === "number") {
        data[fieldName] = 0;
      } else if (fieldDef.type === "boolean") {
        data[fieldName] = false;
      } else if (fieldDef.type === "array") {
        data[fieldName] = [];
      } else if (fieldDef.type === "object") {
        data[fieldName] = {};
      } else if (fieldDef.type === "date") {
        data[fieldName] = null;
      }
    }
    return data;
  },

  // ===== SCHEMA MANAGEMENT =====

  /**
   * Register a store schema
   * @param {Object} schema - Schema definition
   * @returns {Object} Normalized schema
   */
  registerStoreSchema(schema) {
    if (!schema.id) {
      throw new Error("Store schema requires an id");
    }

    const normalized = this._normalizeSchema(schema);
    this._storeSchemas.set(schema.id, normalized);

    // Initialize store if not exists
    if (!this._stores.has(schema.id)) {
      if (normalized.isSingleton) {
        this._stores.set(
          schema.id,
          this._createDefaultSingletonData(normalized),
        );
      } else {
        this._stores.set(schema.id, new Map());
      }
    }

    this._log("info", `Store schema registered: ${schema.name} (${schema.id})`);
    this._emit("schema:registered", { schema: normalized });

    return normalized;
  },

  /**
   * Get a store schema
   * @param {string} storeId - Store ID
   * @returns {Object|null} Schema or null
   */
  getStoreSchema(storeId) {
    return this._storeSchemas.get(storeId) || null;
  },

  /**
   * Get all store schemas
   * @returns {Object[]} Array of schemas
   */
  getAllStoreSchemas() {
    return Array.from(this._storeSchemas.values());
  },

  /**
   * Normalize a schema definition
   * @param {Object} schema - Raw schema
   * @returns {Object} Normalized schema
   */
  _normalizeSchema(schema) {
    return {
      id: schema.id,
      name: schema.name || schema.id,
      description: schema.description || "",
      icon: schema.icon || "📦",
      isSingleton: schema.isSingleton || !schema.primaryKey,
      primaryKey: schema.primaryKey || null,
      indexFields: schema.indexFields || [],
      fields: schema.fields || {},
      promptInstructions: schema.promptInstructions || {
        create: "",
        read: "",
        update: "",
        delete: "",
      },
      validationRules: schema.validationRules || {},
    };
  },

  // ===== STORE OPERATIONS (CRUD) =====

  /**
   * Create an entry in a collection store
   * @param {string} storeId - Store ID
   * @param {Object} data - Entry data
   * @returns {Object} Created entry
   */
  create(storeId, data) {
    const schema = this._storeSchemas.get(storeId);
    if (!schema) {
      throw new Error(this.ValidationErrors.STORE_NOT_FOUND(storeId));
    }

    if (schema.isSingleton) {
      throw new Error(this.ValidationErrors.SINGLETON_CREATE(storeId));
    }

    // Validate before processing
    const validation = this.validateEntry(schema, data);
    if (!validation.valid) {
      const error = new Error(
        `Validation failed: ${validation.errors.join("; ")}`,
      );
      error.validationErrors = validation.errors;
      error.validationWarnings = validation.warnings;
      throw error;
    }

    // Log warnings
    if (validation.warnings.length > 0) {
      this._log("warn", `Create warnings for ${storeId}:`, validation.warnings);
    }

    // Validate and normalize data
    const entry = this._validateAndNormalizeEntry(schema, data);

    // Check for duplicate primary key
    const store = this._stores.get(storeId);
    const key = entry[schema.primaryKey];

    if (!key) {
      throw new Error(
        this.ValidationErrors.PRIMARY_KEY_REQUIRED(schema.primaryKey),
      );
    }

    if (store.has(key)) {
      throw new Error(
        this.ValidationErrors.DUPLICATE_ENTRY(key, schema.primaryKey),
      );
    }

    // Add timestamps
    entry.createdAt = Date.now();
    entry.updatedAt = Date.now();

    // Store entry
    store.set(key, entry);
    this._markDirty(storeId);

    // Update index cache
    this._updateIndexForEntry(storeId, key, entry, "add");

    this._log("debug", `Created entry in ${storeId}:`, key);
    this._emit("store:created", { storeId, key, entry });

    return entry;
  },

  /**
   * Update index cache for a single entry
   * @param {string} storeId - Store ID
   * @param {string} key - Entry key
   * @param {Object} entry - Entry data
   * @param {string} operation - "add" or "remove"
   */
  _updateIndexForEntry(storeId, key, entry, operation) {
    const schema = this._storeSchemas.get(storeId);
    if (!schema || !schema.indexFields?.length) return;

    const storeIndex = this._indexCache.get(storeId);
    if (!storeIndex) return;

    for (const field of schema.indexFields) {
      const value = entry[field];
      if (value === undefined || value === null) continue;

      const fieldIndex = storeIndex.get(field);
      if (!fieldIndex) continue;

      const normalizedValue = String(value).toLowerCase();

      if (operation === "add") {
        if (!fieldIndex.has(normalizedValue)) {
          fieldIndex.set(normalizedValue, new Set());
        }
        fieldIndex.get(normalizedValue).add(key);
      } else if (operation === "remove") {
        const keys = fieldIndex.get(normalizedValue);
        if (keys) {
          keys.delete(key);
          if (keys.size === 0) {
            fieldIndex.delete(normalizedValue);
          }
        }
      }
    }
  },

  /**
   * Read entries from a store
   * @param {string} storeId - Store ID
   * @param {string|Object} query - Primary key or query object
   * @returns {Object|Object[]|null} Entry, entries, or null
   */
  read(storeId, query = null) {
    const schema = this._storeSchemas.get(storeId);
    if (!schema) {
      throw new Error(`Store "${storeId}" not found`);
    }

    const store = this._stores.get(storeId);

    // Singleton store - return the object
    if (schema.isSingleton) {
      return store;
    }

    // No query - return all entries
    if (query === null) {
      return Array.from(store.values());
    }

    // String query - treat as primary key lookup
    if (typeof query === "string") {
      return store.get(query) || null;
    }

    // Object query - filter by fields
    if (typeof query === "object") {
      return this._queryStore(store, query);
    }

    return null;
  },

  /**
   * Update an entry or singleton store
   * @param {string} storeId - Store ID
   * @param {string|Object} keyOrData - Primary key (for collections) or data (for singletons)
   * @param {Object} updates - Updates to apply (for collections)
   * @returns {Object} Updated entry
   */
  update(storeId, keyOrData, updates = null) {
    const schema = this._storeSchemas.get(storeId);
    if (!schema) {
      throw new Error(this.ValidationErrors.STORE_NOT_FOUND(storeId));
    }

    const store = this._stores.get(storeId);

    // Singleton store
    if (schema.isSingleton) {
      const data = typeof keyOrData === "object" ? keyOrData : updates || {};
      const mergedData = { ...store, ...data };

      // Validate before processing
      const validation = this.validateEntry(schema, mergedData);
      if (!validation.valid) {
        const error = new Error(
          `Validation failed: ${validation.errors.join("; ")}`,
        );
        error.validationErrors = validation.errors;
        throw error;
      }

      const validated = this._validateAndNormalizeEntry(schema, mergedData);
      validated.updatedAt = Date.now();

      // Update in place
      Object.assign(store, validated);
      this._markDirty(storeId);

      this._log("debug", `Updated singleton store ${storeId}`);
      this._emit("store:updated", { storeId, entry: store });

      return store;
    }

    // Collection store
    const key = keyOrData;
    if (!store.has(key)) {
      throw new Error(this.ValidationErrors.ENTRY_NOT_FOUND(key, storeId));
    }

    const existing = store.get(key);
    const mergedData = {
      ...existing,
      ...updates,
      [schema.primaryKey]: key, // Prevent key changes
    };

    // Validate before processing
    const validation = this.validateEntry(schema, mergedData);
    if (!validation.valid) {
      const error = new Error(
        `Validation failed: ${validation.errors.join("; ")}`,
      );
      error.validationErrors = validation.errors;
      throw error;
    }

    // Remove old entry from index before update
    this._updateIndexForEntry(storeId, key, existing, "remove");

    const updated = this._validateAndNormalizeEntry(schema, mergedData);
    updated.updatedAt = Date.now();

    store.set(key, updated);
    this._markDirty(storeId);

    // Add updated entry to index
    this._updateIndexForEntry(storeId, key, updated, "add");

    this._log("debug", `Updated entry in ${storeId}:`, key);
    this._emit("store:updated", { storeId, key, entry: updated });

    return updated;
  },

  /**
   * Delete an entry from a collection store
   * @param {string} storeId - Store ID
   * @param {string} key - Primary key
   * @returns {boolean} Success
   */
  delete(storeId, key) {
    const schema = this._storeSchemas.get(storeId);
    if (!schema) {
      throw new Error(this.ValidationErrors.STORE_NOT_FOUND(storeId));
    }

    if (schema.isSingleton) {
      throw new Error(this.ValidationErrors.SINGLETON_DELETE(storeId));
    }

    const store = this._stores.get(storeId);

    if (!store.has(key)) {
      this._log(
        "warn",
        `Attempted to delete non-existent entry ${key} from ${storeId}`,
      );
      return false;
    }

    const entry = store.get(key);

    // Remove from index before deleting
    this._updateIndexForEntry(storeId, key, entry, "remove");

    store.delete(key);
    this._markDirty(storeId);

    this._log("debug", `Deleted entry from ${storeId}:`, key);
    this._emit("store:deleted", { storeId, key, entry });

    return true;
  },

  /**
   * Batch create multiple entries (optimized)
   * @param {string} storeId - Store ID
   * @param {Array} entries - Array of entry data objects
   * @returns {Object} { created: Array, errors: Array }
   */
  batchCreate(storeId, entries) {
    const schema = this._storeSchemas.get(storeId);
    if (!schema) {
      throw new Error(this.ValidationErrors.STORE_NOT_FOUND(storeId));
    }

    if (schema.isSingleton) {
      throw new Error(this.ValidationErrors.SINGLETON_CREATE(storeId));
    }

    const results = { created: [], errors: [] };
    const store = this._stores.get(storeId);

    for (let i = 0; i < entries.length; i++) {
      const data = entries[i];
      try {
        const validation = this.validateEntry(schema, data);
        if (!validation.valid) {
          results.errors.push({ index: i, data, errors: validation.errors });
          continue;
        }

        const entry = this._validateAndNormalizeEntry(schema, data);
        const key = entry[schema.primaryKey];

        if (!key) {
          results.errors.push({
            index: i,
            data,
            errors: ["Missing primary key"],
          });
          continue;
        }

        if (store.has(key)) {
          results.errors.push({
            index: i,
            data,
            errors: [`Duplicate key: ${key}`],
          });
          continue;
        }

        entry.createdAt = Date.now();
        entry.updatedAt = Date.now();
        store.set(key, entry);
        this._updateIndexForEntry(storeId, key, entry, "add");
        results.created.push(entry);
      } catch (error) {
        results.errors.push({ index: i, data, errors: [error.message] });
      }
    }

    if (results.created.length > 0) {
      this._markDirty(storeId);
      this._emit("store:batchCreated", {
        storeId,
        count: results.created.length,
      });
    }

    this._log(
      "info",
      `Batch create in ${storeId}: ${results.created.length} created, ${results.errors.length} errors`,
    );
    return results;
  },

  /**
   * Batch delete multiple entries
   * @param {string} storeId - Store ID
   * @param {Array} keys - Array of primary keys to delete
   * @returns {Object} { deleted: number, notFound: Array }
   */
  batchDelete(storeId, keys) {
    const schema = this._storeSchemas.get(storeId);
    if (!schema) {
      throw new Error(this.ValidationErrors.STORE_NOT_FOUND(storeId));
    }

    if (schema.isSingleton) {
      throw new Error(this.ValidationErrors.SINGLETON_DELETE(storeId));
    }

    const results = { deleted: 0, notFound: [] };
    const store = this._stores.get(storeId);

    for (const key of keys) {
      if (!store.has(key)) {
        results.notFound.push(key);
        continue;
      }

      const entry = store.get(key);
      this._updateIndexForEntry(storeId, key, entry, "remove");
      store.delete(key);
      results.deleted++;
    }

    if (results.deleted > 0) {
      this._markDirty(storeId);
      this._emit("store:batchDeleted", { storeId, count: results.deleted });
    }

    this._log(
      "info",
      `Batch delete in ${storeId}: ${results.deleted} deleted, ${results.notFound.length} not found`,
    );
    return results;
  },

  /**
   * Get all entries from a store
   * @param {string} storeId - Store ID
   * @returns {Object[]|Object} Array of entries or singleton object
   */
  getAll(storeId) {
    return this.read(storeId);
  },

  /**
   * Get entry count for a store
   * @param {string} storeId - Store ID
   * @returns {number} Count
   */
  count(storeId) {
    const schema = this._storeSchemas.get(storeId);
    if (!schema) {
      return 0;
    }

    if (schema.isSingleton) {
      return 1;
    }

    const store = this._stores.get(storeId);
    return store ? store.size : 0;
  },

  /**
   * Clear all entries in a store
   * @param {string} storeId - Store ID
   * @returns {boolean} Success
   */
  clearStore(storeId) {
    const schema = this._storeSchemas.get(storeId);
    if (!schema) {
      return false;
    }

    if (schema.isSingleton) {
      const defaultData = this._createDefaultSingletonData(schema);
      this._stores.set(storeId, defaultData);
    } else {
      this._stores.get(storeId).clear();
    }

    this._markDirty(storeId);
    this._log("info", `Cleared store: ${storeId}`);
    this._emit("store:cleared", { storeId });

    return true;
  },

  // ===== QUERY HELPERS =====

  /**
   * Query a store with filter criteria
   * @param {Map} store - Store data
   * @param {Object} query - Query criteria
   * @returns {Object[]} Matching entries
   */
  _queryStore(store, query) {
    const results = [];

    for (const entry of store.values()) {
      if (this._matchesQuery(entry, query)) {
        results.push(entry);
      }
    }

    return results;
  },

  /**
   * Check if an entry matches a query
   * @param {Object} entry - Entry to check
   * @param {Object} query - Query criteria
   * @returns {boolean} Match
   */
  _matchesQuery(entry, query) {
    for (const [field, condition] of Object.entries(query)) {
      const value = entry[field];

      // Direct equality
      if (typeof condition !== "object" || condition === null) {
        if (value !== condition) {
          return false;
        }
        continue;
      }

      // Operators
      if (condition.$eq !== undefined && value !== condition.$eq) return false;
      if (condition.$ne !== undefined && value === condition.$ne) return false;
      if (condition.$gt !== undefined && value <= condition.$gt) return false;
      if (condition.$gte !== undefined && value < condition.$gte) return false;
      if (condition.$lt !== undefined && value >= condition.$lt) return false;
      if (condition.$lte !== undefined && value > condition.$lte) return false;
      if (condition.$in !== undefined && !condition.$in.includes(value))
        return false;
      if (condition.$nin !== undefined && condition.$nin.includes(value))
        return false;
      if (condition.$contains !== undefined) {
        if (Array.isArray(value)) {
          if (!value.includes(condition.$contains)) return false;
        } else if (typeof value === "string") {
          if (!value.toLowerCase().includes(condition.$contains.toLowerCase()))
            return false;
        } else {
          return false;
        }
      }
      if (condition.$regex !== undefined) {
        const regex = new RegExp(
          condition.$regex,
          condition.$regexFlags || "i",
        );
        if (!regex.test(String(value))) return false;
      }
    }

    return true;
  },

  /**
   * Search across multiple stores
   * @param {string[]} storeIds - Store IDs to search (null = all)
   * @param {string} searchText - Text to search for
   * @param {Object} options - Search options
   * @returns {Object[]} Search results with store and entry info
   */
  search(storeIds = null, searchText, options = {}) {
    const results = [];
    const searchLower = searchText.toLowerCase();
    const targetStores = storeIds || Array.from(this._storeSchemas.keys());

    for (const storeId of targetStores) {
      const schema = this._storeSchemas.get(storeId);
      if (!schema) continue;

      const store = this._stores.get(storeId);
      if (!store) continue;

      // Determine which fields to search
      const searchFields =
        options.fields || schema.indexFields || Object.keys(schema.fields);

      if (schema.isSingleton) {
        // Search singleton
        if (this._entryMatchesSearch(store, searchFields, searchLower)) {
          results.push({
            storeId,
            storeName: schema.name,
            entry: store,
            key: null,
          });
        }
      } else {
        // Search collection
        for (const [key, entry] of store.entries()) {
          if (this._entryMatchesSearch(entry, searchFields, searchLower)) {
            results.push({
              storeId,
              storeName: schema.name,
              entry,
              key,
            });
          }
        }
      }
    }

    // Sort by relevance if requested
    if (options.sortByRelevance) {
      // Simple relevance: entries with search term in name/title first
      results.sort((a, b) => {
        const aName = (a.entry.name || a.entry.title || "").toLowerCase();
        const bName = (b.entry.name || b.entry.title || "").toLowerCase();
        const aHasName = aName.includes(searchLower);
        const bHasName = bName.includes(searchLower);
        if (aHasName && !bHasName) return -1;
        if (!aHasName && bHasName) return 1;
        return 0;
      });
    }

    // Limit results
    if (options.limit && results.length > options.limit) {
      return results.slice(0, options.limit);
    }

    return results;
  },

  /**
   * Check if an entry matches search text
   * @param {Object} entry - Entry to check
   * @param {string[]} fields - Fields to search
   * @param {string} searchLower - Lowercase search text
   * @returns {boolean} Match
   */
  _entryMatchesSearch(entry, fields, searchLower) {
    for (const field of fields) {
      const value = entry[field];
      if (value === null || value === undefined) continue;

      if (
        typeof value === "string" &&
        value.toLowerCase().includes(searchLower)
      ) {
        return true;
      }
      if (Array.isArray(value)) {
        for (const item of value) {
          if (
            typeof item === "string" &&
            item.toLowerCase().includes(searchLower)
          ) {
            return true;
          }
        }
      }
    }
    return false;
  },

  // ===== VALIDATION =====

  /**
   * Validate and normalize an entry against schema
   * @param {Object} schema - Store schema
   * @param {Object} data - Entry data
   * @returns {Object} Validated and normalized entry
   */
  _validateAndNormalizeEntry(schema, data) {
    const entry = {};

    for (const [fieldName, fieldDef] of Object.entries(schema.fields || {})) {
      let value = data[fieldName];

      // Handle required fields
      if (fieldDef.required && (value === undefined || value === null)) {
        if (fieldDef.default !== undefined) {
          value = fieldDef.default;
        } else {
          throw new Error(`Field "${fieldName}" is required`);
        }
      }

      // Apply default if undefined
      if (value === undefined) {
        value = fieldDef.default !== undefined ? fieldDef.default : null;
      }

      // Type coercion/validation
      if (value !== null) {
        value = this._coerceValue(value, fieldDef, fieldName);
      }

      entry[fieldName] = value;
    }

    return entry;
  },

  /**
   * Coerce a value to match field definition
   * @param {*} value - Value to coerce
   * @param {Object} fieldDef - Field definition
   * @param {string} fieldName - Field name (for errors)
   * @returns {*} Coerced value
   */
  _coerceValue(value, fieldDef, fieldName) {
    switch (fieldDef.type) {
      case "string":
        return String(value);

      case "number":
        const num = Number(value);
        if (isNaN(num)) {
          throw new Error(`Field "${fieldName}" must be a number`);
        }
        if (fieldDef.min !== undefined && num < fieldDef.min) {
          return fieldDef.min;
        }
        if (fieldDef.max !== undefined && num > fieldDef.max) {
          return fieldDef.max;
        }
        return num;

      case "boolean":
        return Boolean(value);

      case "array":
        if (!Array.isArray(value)) {
          return [value];
        }
        return value;

      case "object":
        if (typeof value !== "object" || value === null) {
          throw new Error(`Field "${fieldName}" must be an object`);
        }
        return value;

      case "enum":
        if (fieldDef.enumValues && !fieldDef.enumValues.includes(value)) {
          throw new Error(
            `Field "${fieldName}" must be one of: ${fieldDef.enumValues.join(", ")}`,
          );
        }
        return value;

      case "date":
        if (value instanceof Date) {
          return value.getTime();
        }
        if (typeof value === "number") {
          return value;
        }
        if (typeof value === "string") {
          const parsed = Date.parse(value);
          if (!isNaN(parsed)) {
            return parsed;
          }
        }
        return null;

      default:
        return value;
    }
  },

  // ===== PERSISTENCE =====

  /**
   * Mark a store as dirty (needs saving)
   * @param {string} storeId - Store ID
   */
  _markDirty(storeId) {
    this._dirtyStores.add(storeId);
  },

  /**
   * Save a store to persistence via Kernel storage
   * @param {string} storeId - Store ID
   * @returns {Promise<boolean>} Success
   */
  async saveStore(storeId) {
    if (!this._kernel) {
      this._log("warn", "Cannot save store - Kernel not available");
      return false;
    }

    const schema = this._storeSchemas.get(storeId);
    if (!schema) {
      return false;
    }

    const store = this._stores.get(storeId);
    let data;

    if (schema.isSingleton) {
      data = store;
    } else {
      data = Array.from(store.values());
    }

    const success = await this._kernel.saveData(`curation_store_${storeId}`, data);

    if (success) {
      this._dirtyStores.delete(storeId);
      this._log("debug", `Saved store: ${storeId}`);
    }

    return success;
  },

  /**
   * Load a store from persistence via Kernel storage
   * @param {string} storeId - Store ID
   * @returns {Promise<boolean>} Success
   */
  async loadStore(storeId) {
    if (!this._kernel) {
      this._log("warn", "Cannot load store - Kernel not available");
      return false;
    }

    const schema = this._storeSchemas.get(storeId);
    if (!schema) {
      return false;
    }

    const data = await this._kernel.loadData(`curation_store_${storeId}`);

    if (data === null) {
      return false;
    }

    if (schema.isSingleton) {
      this._stores.set(storeId, data);
    } else {
      const store = new Map();
      if (Array.isArray(data)) {
        for (const entry of data) {
          const key = entry[schema.primaryKey];
          if (key) {
            store.set(key, entry);
          }
        }
      }
      this._stores.set(storeId, store);
    }

    this._log("debug", `Loaded store: ${storeId}`);
    return true;
  },

  /**
   * Save all dirty stores
   * @returns {Promise<void>}
   */
  async saveAllDirty() {
    const promises = [];

    for (const storeId of this._dirtyStores) {
      promises.push(this.saveStore(storeId));
    }

    await Promise.all(promises);
  },

  /**
   * Load all stores from persistence
   * @returns {Promise<void>}
   */
  async loadAllStores() {
    const promises = [];

    for (const storeId of this._storeSchemas.keys()) {
      promises.push(this.loadStore(storeId));
    }

    await Promise.all(promises);
    this._log("info", "All stores loaded from persistence");
  },

  // ===== PIPELINE PERSISTENCE =====

  /**
   * Save all pipelines to persistence via Kernel storage
   * @returns {Promise<boolean>} Success
   */
  async savePipelines() {
    if (!this._kernel) {
      this._log("warn", "Cannot save pipelines - Kernel not available");
      return false;
    }

    const pipelineData = {
      crud: Array.from(this._crudPipelines.values()),
      rag: Array.from(this._ragPipelines.values()),
    };

    const success = await this._kernel.saveData("curation_pipelines", pipelineData);

    if (success) {
      this._log("debug", "Saved curation pipelines");
    }

    return success;
  },

  /**
   * Load all pipelines from persistence via Kernel storage
   * @returns {Promise<boolean>} Success
   */
  async loadPipelines() {
    if (!this._kernel) {
      this._log("warn", "Cannot load pipelines - Kernel not available");
      return false;
    }

    const data = await this._kernel.loadData("curation_pipelines");

    if (!data) {
      this._log("debug", "No saved pipelines found");
      return false;
    }

    // Load CRUD pipelines
    if (Array.isArray(data.crud)) {
      for (const pipeline of data.crud) {
        if (pipeline.id) {
          this._crudPipelines.set(pipeline.id, pipeline);
        }
      }
      this._log("debug", `Loaded ${data.crud.length} CRUD pipelines`);
    }

    // Load RAG pipelines
    if (Array.isArray(data.rag)) {
      for (const pipeline of data.rag) {
        if (pipeline.id) {
          this._ragPipelines.set(pipeline.id, pipeline);
        }
      }
      this._log("debug", `Loaded ${data.rag.length} RAG pipelines`);
    }

    this._log("info", "All pipelines loaded from persistence");
    return true;
  },

  /**
   * Start auto-save interval
   * @param {number} intervalMs - Interval in milliseconds
   */
  _startAutoSave(intervalMs) {
    this._stopAutoSave();
    this._autoSaveInterval = setInterval(() => {
      if (this._dirtyStores.size > 0) {
        this.saveAllDirty();
      }
    }, intervalMs);
  },

  /**
   * Stop auto-save interval
   */
  _stopAutoSave() {
    if (this._autoSaveInterval) {
      clearInterval(this._autoSaveInterval);
      this._autoSaveInterval = null;
    }
  },

  // ===== RAG PIPELINE =====

  /**
   * Register a RAG pipeline
   * @param {Object} pipeline - Pipeline definition
   * @returns {Object} Registered pipeline
   */
  registerRAGPipeline(pipeline) {
    if (!pipeline.id) {
      throw new Error("RAG pipeline requires an id");
    }

    const normalized = {
      id: pipeline.id,
      name: pipeline.name || pipeline.id,
      description: pipeline.description || "",
      targetStores: pipeline.targetStores || [],
      actions: pipeline.actions || [],
      inputSchema: pipeline.inputSchema || {},
      outputSchema: pipeline.outputSchema || {},
      canTriggerFromPipeline: pipeline.canTriggerFromPipeline !== false,
      canTriggerManually: pipeline.canTriggerManually !== false,
    };

    this._ragPipelines.set(pipeline.id, normalized);
    this._log("info", `RAG pipeline registered: ${normalized.name}`);
    this._emit("ragPipeline:registered", { pipeline: normalized });

    // Auto-save pipelines
    this.savePipelines();

    return normalized;
  },

  /**
   * Get a RAG pipeline
   * @param {string} pipelineId - Pipeline ID
   * @returns {Object|null} Pipeline or null
   */
  getRAGPipeline(pipelineId) {
    return this._ragPipelines.get(pipelineId) || null;
  },

  /**
   * Get all RAG pipelines
   * @returns {Object[]} Array of pipelines
   */
  getAllRAGPipelines() {
    return Array.from(this._ragPipelines.values());
  },

  /**
   * Delete a RAG pipeline
   * @param {string} pipelineId - Pipeline ID
   * @returns {boolean} Success
   */
  deleteRAGPipeline(pipelineId) {
    const deleted = this._ragPipelines.delete(pipelineId);
    if (deleted) {
      this._log("info", `RAG pipeline deleted: ${pipelineId}`);
      this._emit("ragPipeline:deleted", { pipelineId });
      this.savePipelines();
    }
    return deleted;
  },

  /**
   * Execute a RAG query
   * @param {string} pipelineId - Pipeline ID (or null for default search)
   * @param {Object} input - Query input
   * @returns {Promise<Object>} RAG results
   */
  async executeRAG(pipelineId, input) {
    // Default search if no pipeline specified
    if (!pipelineId) {
      return this._defaultRAGSearch(input);
    }

    const pipeline = this._ragPipelines.get(pipelineId);
    if (!pipeline) {
      throw new Error(this.ValidationErrors.PIPELINE_NOT_FOUND(pipelineId));
    }

    // Validate input against pipeline's inputSchema
    if (pipeline.inputSchema) {
      const missingRequired = Object.entries(pipeline.inputSchema)
        .filter(
          ([key, def]) =>
            def.required && (input[key] === undefined || input[key] === null),
        )
        .map(([key]) => key);

      if (missingRequired.length > 0) {
        throw new Error(
          `RAG pipeline ${pipelineId} missing required inputs: ${missingRequired.join(", ")}`,
        );
      }
    }

    this._log("debug", `Executing RAG pipeline: ${pipelineId}`, input);
    this._emit("rag:started", { pipelineId, input });

    const startTime = Date.now();
    try {
      const result = await this._executeRAGPipeline(pipeline, input);
      const duration = Date.now() - startTime;
      this._emit("rag:completed", { pipelineId, input, result, duration });
      this._log(
        "info",
        `RAG pipeline ${pipelineId} completed in ${duration}ms with ${result.count} results`,
      );
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this._emit("rag:error", { pipelineId, input, error, duration });
      this._log(
        "error",
        `RAG pipeline ${pipelineId} failed after ${duration}ms:`,
        error.message,
      );
      throw error;
    }
  },

  /**
   * Default RAG search implementation
   * @param {Object} input - Query input
   * @returns {Object} Search results
   */
  _defaultRAGSearch(input) {
    const query = input.query || input.text || "";
    const stores = input.stores || null;
    const limit = input.limit || 20;

    const results = this.search(stores, query, {
      sortByRelevance: true,
      limit,
    });

    return {
      query,
      results,
      count: results.length,
      timestamp: Date.now(),
    };
  },

  /**
   * Execute a RAG pipeline
   * @param {Object} pipeline - Pipeline definition
   * @param {Object} input - Query input
   * @returns {Promise<Object>} Pipeline result
   */
  async _executeRAGPipeline(pipeline, input) {
    // Get data from target stores
    const storeData = {};
    for (const storeId of pipeline.targetStores) {
      storeData[storeId] = this.read(storeId);
    }

    // For now, use default search if no API client
    if (!this._apiClient) {
      return this._defaultRAGSearch({
        ...input,
        stores: pipeline.targetStores,
      });
    }

    // Execute pipeline actions
    let context = {
      input,
      storeData,
      results: [],
    };

    for (const action of pipeline.actions) {
      context = await this._executeRAGAction(action, context);
    }

    return {
      query: input.query || input.text,
      results: context.results,
      count: context.results.length,
      timestamp: Date.now(),
    };
  },

  /**
   * Execute a single RAG action
   * @param {Object} action - Action definition
   * @param {Object} context - Current context
   * @returns {Promise<Object>} Updated context
   */
  async _executeRAGAction(action, context) {
    // For now, simple pass-through
    // Future: implement action types like search, rank, filter, format
    return context;
  },

  // ===== CRUD PIPELINE =====

  /**
   * Register a CRUD pipeline
   * @param {Object} pipeline - Pipeline definition
   * @returns {Object} Registered pipeline
   */
  registerCRUDPipeline(pipeline) {
    if (!pipeline.id) {
      throw new Error("CRUD pipeline requires an id");
    }

    const normalized = {
      id: pipeline.id,
      storeId: pipeline.storeId,
      operation: pipeline.operation || "create",
      name: pipeline.name || pipeline.id,
      description: pipeline.description || "",
      actions: pipeline.actions || [],
      inputSchema: pipeline.inputSchema || {},
      outputSchema: pipeline.outputSchema || {},
    };

    this._crudPipelines.set(pipeline.id, normalized);
    this._log("info", `CRUD pipeline registered: ${normalized.name}`);
    this._emit("crudPipeline:registered", { pipeline: normalized });

    // Auto-save pipelines
    this.savePipelines();

    return normalized;
  },

  /**
   * Delete a CRUD pipeline
   * @param {string} pipelineId - Pipeline ID
   * @returns {boolean} Success
   */
  deleteCRUDPipeline(pipelineId) {
    const deleted = this._crudPipelines.delete(pipelineId);
    if (deleted) {
      this._log("info", `CRUD pipeline deleted: ${pipelineId}`);
      this._emit("crudPipeline:deleted", { pipelineId });
      this.savePipelines();
    }
    return deleted;
  },

  /**
   * Get a CRUD pipeline
   * @param {string} pipelineId - Pipeline ID
   * @returns {Object|null} Pipeline or null
   */
  getCRUDPipeline(pipelineId) {
    return this._crudPipelines.get(pipelineId) || null;
  },

  /**
   * Get all CRUD pipelines
   * @returns {Object[]} Array of pipelines
   */
  getAllCRUDPipelines() {
    return Array.from(this._crudPipelines.values());
  },

  /**
   * Get all pipelines (both CRUD and RAG)
   * @returns {Object[]} Array of all pipelines with type field
   */
  getAllPipelines() {
    const allPipelines = [];

    // Add CRUD pipelines with type
    for (const pipeline of this._crudPipelines.values()) {
      allPipelines.push({ ...pipeline, type: 'crud' });
    }

    // Add RAG pipelines with type
    for (const pipeline of this._ragPipelines.values()) {
      allPipelines.push({ ...pipeline, type: 'rag' });
    }

    return allPipelines;
  },

  /**
   * Get a pipeline by ID (checks both CRUD and RAG)
   * @param {string} pipelineId - Pipeline ID
   * @returns {Object|null} Pipeline with type field or null
   */
  getPipeline(pipelineId) {
    // Check CRUD pipelines first
    const crudPipeline = this._crudPipelines.get(pipelineId);
    if (crudPipeline) {
      return { ...crudPipeline, type: 'crud' };
    }

    // Check RAG pipelines
    const ragPipeline = this._ragPipelines.get(pipelineId);
    if (ragPipeline) {
      return { ...ragPipeline, type: 'rag' };
    }

    return null;
  },

  /**
   * Execute a pipeline (CRUD or RAG)
   * @param {string} pipelineId - Pipeline ID
   * @param {Object} options - Execution options
   * @param {string} options.source - Execution source ('manual', 'auto', 'pipeline')
   * @param {boolean} options.preview - Preview mode (non-destructive)
   * @param {Object} options.input - Input data for the pipeline
   * @returns {Promise<Object>} Execution result
   */
  async executePipeline(pipelineId, options = {}) {
    const pipeline = this.getPipeline(pipelineId);

    if (!pipeline) {
      throw new Error(this.ValidationErrors.PIPELINE_NOT_FOUND(pipelineId));
    }

    const { source = 'manual', preview = false, input = {} } = options;

    this._log('info', `[CurationSystem] Pipeline executed: ${pipelineId} (type: ${pipeline.type}, source: ${source}, preview: ${preview})`);
    this._emit('pipeline:executing', { pipelineId, type: pipeline.type, source, preview });

    const startTime = Date.now();

    try {
      let result;

      if (pipeline.type === 'crud') {
        // Execute CRUD pipeline
        result = await this._executeCRUDPipeline(pipeline, input, { preview });
      } else if (pipeline.type === 'rag') {
        // Execute RAG pipeline
        result = await this.executeRAG(pipelineId, input);
      } else {
        throw new Error(`Unknown pipeline type: ${pipeline.type}`);
      }

      const duration = Date.now() - startTime;

      this._emit('pipeline:completed', {
        pipelineId,
        type: pipeline.type,
        source,
        preview,
        result,
        duration
      });

      this._log('info', `[CurationSystem] Pipeline ${pipelineId} completed in ${duration}ms`);

      return {
        success: true,
        pipelineId,
        type: pipeline.type,
        duration,
        result,
        preview
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      this._emit('pipeline:error', {
        pipelineId,
        type: pipeline.type,
        source,
        error,
        duration
      });

      this._log('error', `[CurationSystem] Pipeline ${pipelineId} failed:`, error.message);

      return {
        success: false,
        pipelineId,
        type: pipeline.type,
        duration,
        error: error.message,
        preview
      };
    }
  },

  /**
   * Execute a CRUD pipeline
   * @param {Object} pipeline - CRUD pipeline definition
   * @param {Object} input - Input data
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Execution result
   */
  async _executeCRUDPipeline(pipeline, input, options = {}) {
    const { preview = false } = options;

    // For now, simple implementation
    // Future: implement full action execution with agents

    const result = {
      operation: pipeline.operation,
      storeId: pipeline.storeId,
      affectedRecords: [],
      changes: {},
      message: `CRUD pipeline executed: ${pipeline.name}`
    };

    // If preview mode, don't actually modify data
    if (preview) {
      result.message += ' (preview mode - no changes made)';
      result.preview = true;
    }

    return result;
  },

  // ===== CURATION POSITIONS =====

  /**
   * Get all curation positions
   * @returns {Object[]} Array of positions
   */
  getCurationPositions() {
    return Array.from(this._positions.values());
  },

  /**
   * Get a curation position
   * @param {string} positionId - Position ID
   * @returns {Object|null} Position or null
   */
  getCurationPosition(positionId) {
    return this._positions.get(positionId) || null;
  },

  // ===== IMPORT / EXPORT =====

  /**
   * Export all store data
   * @returns {Object} Export data
   */
  exportAllStores() {
    const data = {
      version: this.VERSION,
      exportedAt: Date.now(),
      stores: {},
    };

    for (const [storeId, schema] of this._storeSchemas.entries()) {
      const store = this._stores.get(storeId);

      if (schema.isSingleton) {
        data.stores[storeId] = store;
      } else {
        data.stores[storeId] = Array.from(store.values());
      }
    }

    return data;
  },

  /**
   * Import store data
   * @param {Object} data - Import data
   * @param {boolean} merge - Merge with existing (default: replace)
   * @returns {boolean} Success
   */
  importAllStores(data, merge = false) {
    try {
      if (!data.stores) {
        throw new Error("Invalid import data: missing stores");
      }

      for (const [storeId, storeData] of Object.entries(data.stores)) {
        const schema = this._storeSchemas.get(storeId);
        if (!schema) {
          this._log("warn", `Skipping unknown store: ${storeId}`);
          continue;
        }

        if (schema.isSingleton) {
          if (merge) {
            const existing = this._stores.get(storeId);
            this._stores.set(storeId, { ...existing, ...storeData });
          } else {
            this._stores.set(storeId, storeData);
          }
        } else {
          const store = merge ? this._stores.get(storeId) : new Map();

          if (Array.isArray(storeData)) {
            for (const entry of storeData) {
              const key = entry[schema.primaryKey];
              if (key) {
                store.set(key, entry);
              }
            }
          }

          this._stores.set(storeId, store);
        }

        this._markDirty(storeId);
      }

      this._log("info", "Store data imported successfully");
      this._emit("stores:imported");
      return true;
    } catch (e) {
      this._log("error", "Import failed:", e);
      return false;
    }
  },

  // ===== SUMMARY / STATUS =====

  /**
   * Get system summary
   * @returns {Object} Summary data
   */
  getSummary() {
    const storeSummary = {};
    let totalEntries = 0;

    for (const [id, schema] of this._storeSchemas.entries()) {
      const count = schema.isSingleton ? 1 : this._stores.get(id)?.size || 0;
      totalEntries += count;

      storeSummary[id] = {
        name: schema.name,
        icon: schema.icon,
        isSingleton: schema.isSingleton,
        count,
        isDirty: this._dirtyStores?.has(id) || false,
        hasIndex: this._indexCache.has(id),
        indexFields: schema.indexFields || [],
      };
    }

    // Get curation team summary
    const curationTeam = this.getCurationTeamSummary();

    return {
      version: this.VERSION,
      initialized: this._initialized,
      storeCount: this._storeSchemas.size,
      totalEntries,
      stores: storeSummary,
      crudPipelineCount: this._crudPipelines.size,
      ragPipelineCount: this._ragPipelines.size,
      positionCount: this._positions.size,
      dirtyStoreCount: this._dirtyStores?.size || 0,
      indexedStoreCount: this._indexCache.size,
      curationAgentCount: this._curationAgents.size,
      curationTeam,
    };
  },

  /**
   * Get store statistics
   * @param {string} storeId - Store ID
   * @returns {Object} Store statistics
   */
  getStoreStats(storeId) {
    const schema = this._storeSchemas.get(storeId);
    if (!schema) {
      throw new Error(this.ValidationErrors.STORE_NOT_FOUND(storeId));
    }

    const store = this._stores.get(storeId);
    const entries = schema.isSingleton ? [store] : Array.from(store.values());

    const stats = {
      storeId,
      name: schema.name,
      isSingleton: schema.isSingleton,
      entryCount: entries.length,
      fields: Object.keys(schema.fields),
      indexedFields: schema.indexFields || [],
      hasIndex: this._indexCache.has(storeId),
      isDirty: this._dirtyStores?.has(storeId) || false,
    };

    // Calculate field fill rates for collections
    if (!schema.isSingleton && entries.length > 0) {
      stats.fieldFillRates = {};
      for (const field of Object.keys(schema.fields)) {
        const filledCount = entries.filter((e) => {
          const val = e[field];
          return (
            val !== undefined &&
            val !== null &&
            val !== "" &&
            (!Array.isArray(val) || val.length > 0)
          );
        }).length;
        stats.fieldFillRates[field] = Math.round(
          (filledCount / entries.length) * 100,
        );
      }
    }

    return stats;
  },

  // ===== EVENT SYSTEM =====

  /**
   * Subscribe to curation events via Kernel's EventBus
   * @param {string} event - Event name (will be prefixed with "curation:")
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  on(event, callback) {
    if (!this._kernel) {
      this._log("warn", `Cannot subscribe to event "${event}" - Kernel not available`);
      return () => {};
    }

    // Add curation: namespace prefix if not already present
    const namespacedEvent = event.startsWith('curation:') ? event : `curation:${event}`;

    // Subscribe via Kernel's EventBus
    return this._kernel.on(namespacedEvent, callback);
  },

  /**
   * Unsubscribe from curation events
   * @param {string} event - Event name (will be prefixed with "curation:")
   * @param {Function} callback - Callback function
   */
  off(event, callback) {
    if (!this._kernel) {
      this._log("warn", `Cannot unsubscribe from event "${event}" - Kernel not available`);
      return;
    }

    // Add curation: namespace prefix if not already present
    const namespacedEvent = event.startsWith('curation:') ? event : `curation:${event}`;

    // Unsubscribe via Kernel's EventBus
    this._kernel.off(namespacedEvent, callback);
  },

  /**
   * Emit an event via Kernel's EventBus with curation:* namespacing
   * @param {string} event - Event name (will be prefixed with "curation:")
   * @param {Object} data - Event data
   */
  _emit(event, data = {}) {
    if (!this._kernel) {
      this._log("warn", `Cannot emit event "${event}" - Kernel not available`);
      return;
    }

    // Add curation: namespace prefix if not already present
    const namespacedEvent = event.startsWith('curation:') ? event : `curation:${event}`;

    // Emit via Kernel's EventBus
    this._kernel.emit(namespacedEvent, data);
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
      this._logger[level](`[CurationSystem] ${message}`, ...args);
    }
  },
};

// Export for different environments
if (typeof window !== "undefined") {
  window.CurationSystem = CurationSystem;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = CurationSystem;
}
