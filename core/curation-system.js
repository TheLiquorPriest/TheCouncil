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

// ===== PIPELINE ERROR HANDLING =====

/**
 * Error type categories for pipeline execution
 */
const PipelineErrorTypes = {
  VALIDATION: 'validation',
  AGENT: 'agent',
  PROMPT: 'prompt',
  LLM: 'llm',
  PARSE: 'parse',
  STORE: 'store',
  TIMEOUT: 'timeout',
  CANCELLED: 'cancelled',
  UNKNOWN: 'unknown'
};

/**
 * Custom error class for pipeline errors
 * Categorizes errors and determines if they are recoverable/retryable
 */
class PipelineError extends Error {
  constructor(type, message, details = {}) {
    super(message);
    this.name = 'PipelineError';
    this.type = type;
    this.details = details;
    this.recoverable = this._isRecoverable(type);
    this.retryable = this._isRetryable(type);
  }

  _isRecoverable(type) {
    return [
      PipelineErrorTypes.PROMPT,
      PipelineErrorTypes.LLM,
      PipelineErrorTypes.PARSE
    ].includes(type);
  }

  _isRetryable(type) {
    return [
      PipelineErrorTypes.LLM,
      PipelineErrorTypes.TIMEOUT
    ].includes(type);
  }
}

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

  /**
   * Promise for default CRUD pipelines loading
   * Used to ensure saved pipelines load AFTER defaults
   * @type {Promise|null}
   */
  _defaultPipelinesPromise: null,

  /**
   * Active pipeline executions for cancellation support
   * Map<executionId, { pipelineId, cancelled, cancelledAt }>
   * @type {Map<string, Object>}
   */
  _activeExecutions: new Map(),

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

    // Register default CRUD pipelines (async) - store promise for loadPersistedData to wait on
    this._defaultPipelinesPromise = this._registerDefaultCRUDPipelines().catch((err) => {
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
      // Wait for default CRUD pipelines to load first, so saved versions can overwrite them
      if (this._defaultPipelinesPromise) {
        await this._defaultPipelinesPromise;
        this._log("debug", "Default pipelines loaded, now loading saved pipelines");
      }

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

    // Use global scope - pipelines are system-wide definitions, not chat-specific
    const success = await this._kernel.saveData("curation_pipelines", pipelineData, { scope: "global" });

    if (success) {
      this._log("debug", "Saved curation pipelines (global scope)");
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

    // Use global scope - pipelines are system-wide definitions, not chat-specific
    const data = await this._kernel.loadData("curation_pipelines", { scope: "global" });

    if (!data) {
      this._log("debug", "No saved pipelines found (global scope)");
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
   * Execute a CRUD pipeline with full step execution
   * @param {Object} pipeline - CRUD pipeline definition
   * @param {Object} input - Input data
   * @param {Object} options - Execution options
   * @param {boolean} options.preview - Preview mode (non-destructive)
   * @param {boolean} options.verbose - Verbose logging
   * @param {boolean} options.continueOnError - Continue execution on step error
   * @returns {Promise<Object>} Execution result with step results
   */
  async _executeCRUDPipeline(pipeline, input, options = {}) {
    // Generate execution ID for tracking and cancellation
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Build execution context with all necessary state
    const executionContext = {
      // Execution tracking
      executionId,

      // Pipeline metadata
      pipeline: {
        id: pipeline.id,
        name: pipeline.name,
        storeId: pipeline.storeId,
        operation: pipeline.operation
      },

      // Original input to pipeline
      pipelineInput: input,

      // Step tracking
      currentStepIndex: 0,
      totalSteps: pipeline.steps?.length || 0,
      steps: pipeline.steps || [],

      // Data flow between steps
      previousStepOutput: null,
      variables: {},  // Named variables from steps with outputTarget: "variable"

      // Store references
      targetStore: this._stores.get(pipeline.storeId),
      targetStoreSchema: this._storeSchemas.get(pipeline.storeId),

      // Execution results
      stepResults: [],
      errors: [],
      warnings: [],

      // Options
      preview: options.preview || false,
      verbose: options.verbose || false,
      continueOnError: options.continueOnError || false,

      // Timing
      startTime: Date.now(),
      stepTimings: []
    };

    // Register execution for cancellation support
    this._activeExecutions.set(executionId, {
      pipelineId: pipeline.id,
      cancelled: false,
      cancelledAt: null
    });

    try {
      this._log('info', `[CurationSystem] Executing CRUD pipeline: ${pipeline.name} (${executionContext.totalSteps} steps, preview: ${executionContext.preview})`);

      // Emit pipeline start event
      this._emit('pipeline:execution:start', {
        executionId,
        pipelineId: pipeline.id,
        pipelineName: pipeline.name,
        totalSteps: executionContext.totalSteps,
        preview: executionContext.preview
      });

      // Execute steps in sequence
      for (let i = 0; i < executionContext.steps.length; i++) {
        executionContext.currentStepIndex = i;
        const step = executionContext.steps[i];
        const stepStartTime = Date.now();

        try {
          // Emit step start event
          this._emit('pipeline:step:start', {
            executionId,
            pipelineId: pipeline.id,
            stepIndex: i,
            stepId: step.id,
            stepName: step.name,
            totalSteps: executionContext.totalSteps
          });

          if (executionContext.verbose) {
            this._log('debug', `[CurationSystem] Step ${i + 1}/${executionContext.totalSteps}: ${step.name}`);
          }

          // Execute the step with retry logic (calls methods from 5.7.2-5.7.4)
          const stepResult = await this._executeStepWithRetry(step, executionContext);

          const stepDuration = Date.now() - stepStartTime;
          executionContext.stepTimings.push(stepDuration);

          // Record successful result
          executionContext.stepResults.push({
            stepId: step.id,
            stepIndex: i,
            stepName: step.name,
            success: true,
            output: stepResult.output,
            duration: stepDuration
          });

          // Handle output routing (implemented in 5.7.4)
          await this._routeStepOutput(step, stepResult, executionContext);

          // Emit step complete progress
          this._emitProgress(executionContext, 'step_complete');

          // Emit step complete event
          this._emit('pipeline:step:complete', {
            executionId,
            pipelineId: pipeline.id,
            stepIndex: i,
            stepId: step.id,
            stepName: step.name,
            success: true,
            duration: stepDuration
          });

        } catch (error) {
          const stepDuration = Date.now() - stepStartTime;
          executionContext.stepTimings.push(stepDuration);

          // Normalize error to PipelineError
          const normalizedError = this._normalizeError(error, step, i);

          // Record error in context (with type information)
          executionContext.errors.push({
            stepIndex: i,
            stepId: step.id,
            stepName: step.name,
            error: normalizedError.message,
            type: normalizedError.type,
            recoverable: normalizedError.recoverable,
            retryable: normalizedError.retryable,
            stack: normalizedError.stack,
            details: normalizedError.details
          });

          // Record failed result
          executionContext.stepResults.push({
            stepId: step.id,
            stepIndex: i,
            stepName: step.name,
            success: false,
            error: normalizedError.message,
            errorType: normalizedError.type,
            duration: stepDuration
          });

          this._log('error', `[CurationSystem] Step ${step.name} failed: ${normalizedError.message}`);

          // Emit step error event
          this._emit('pipeline:step:error', {
            executionId,
            pipelineId: pipeline.id,
            stepIndex: i,
            stepId: step.id,
            stepName: step.name,
            error: normalizedError.message,
            errorType: normalizedError.type
          });

          // Decide whether to continue or abort using new helper
          if (!this._shouldContinueAfterError(normalizedError, executionContext)) {
            break;
          }
        }
      }

    } finally {
      // Always clean up execution tracking
      this._activeExecutions.delete(executionId);
    }

    // Build final result
    const totalDuration = Date.now() - executionContext.startTime;
    const hasErrors = executionContext.errors.length > 0;

    const result = {
      operation: pipeline.operation,
      storeId: pipeline.storeId,
      preview: executionContext.preview,
      totalSteps: executionContext.totalSteps,
      completedSteps: executionContext.stepResults.filter(r => r.success).length,
      stepResults: executionContext.stepResults,
      variables: executionContext.variables,
      errors: executionContext.errors,
      warnings: executionContext.warnings,
      timing: {
        totalDuration,
        stepTimings: executionContext.stepTimings
      },
      message: hasErrors
        ? `CRUD pipeline ${pipeline.name}: ${executionContext.errors.length} error(s)`
        : `CRUD pipeline ${pipeline.name} completed successfully`,
      success: !hasErrors
    };

    if (executionContext.preview) {
      result.message += ' (preview mode)';
    }

    // Emit pipeline completion or error event
    if (hasErrors) {
      this._emit('pipeline:execution:error', {
        pipelineId: pipeline.id,
        pipelineName: pipeline.name,
        error: executionContext.errors[0]?.error,
        stepsCompleted: executionContext.stepResults.length,
        totalSteps: executionContext.totalSteps
      });
    } else {
      this._emit('pipeline:execution:complete', {
        pipelineId: pipeline.id,
        pipelineName: pipeline.name,
        success: true,
        duration: totalDuration,
        stepsCompleted: executionContext.stepResults.filter(r => r.success).length,
        totalSteps: executionContext.totalSteps
      });
    }

    return result;
  },

  /**
   * Emit detailed progress event with percentage calculation
   * @param {Object} executionContext - Current execution context
   * @param {string} phase - Current phase (prompt_resolving, llm_calling, etc.)
   * @param {Object} details - Additional details for the phase
   */
  _emitProgress(executionContext, phase, details = {}) {
    const { currentStepIndex, totalSteps, pipeline } = executionContext;

    // Calculate progress percentage
    let baseProgress = (currentStepIndex / totalSteps) * 100;
    let phaseProgress = 0;

    switch (phase) {
      case 'prompt_resolving':
        phaseProgress = 5;
        break;
      case 'llm_calling':
        phaseProgress = 10;
        break;
      case 'llm_streaming':
        phaseProgress = 10 + (details.streamProgress || 0) * 60;
        break;
      case 'output_parsing':
        phaseProgress = 80;
        break;
      case 'store_writing':
        phaseProgress = 90;
        break;
      case 'step_complete':
        phaseProgress = 100;
        break;
    }

    const stepProgress = phaseProgress / 100;
    const totalProgress = baseProgress + (stepProgress * (100 / totalSteps));

    this._emit('pipeline:progress', {
      pipelineId: pipeline.id,
      pipelineName: pipeline.name,
      currentStep: currentStepIndex + 1,
      totalSteps,
      currentStepName: executionContext.steps[currentStepIndex]?.name,
      phase,
      phaseLabel: this._getPhaseLabel(phase),
      progress: Math.min(Math.round(totalProgress), 100),
      details
    });
  },

  /**
   * Get human-readable label for execution phase
   * @param {string} phase - Phase identifier
   * @returns {string} Human-readable label
   */
  _getPhaseLabel(phase) {
    const labels = {
      'prompt_resolving': 'Resolving prompt...',
      'llm_calling': 'Calling LLM...',
      'llm_streaming': 'Receiving response...',
      'output_parsing': 'Parsing output...',
      'store_writing': 'Writing to store...',
      'step_complete': 'Step complete'
    };
    return labels[phase] || phase;
  },

  /**
   * Resolve the input for a step based on its inputSource configuration
   * @param {Object} step - Step configuration
   * @param {Object} executionContext - Current execution context
   * @returns {*} Resolved input for the step
   */
  _resolveStepInput(step, executionContext) {
    switch (step.inputSource) {
      case 'pipeline_input':
        return executionContext.pipelineInput;

      case 'previous_step':
        return executionContext.previousStepOutput;

      case 'store_data':
        // Get data from the target store
        if (executionContext.targetStore) {
          const schema = executionContext.targetStoreSchema;
          if (schema?.isSingleton) {
            return executionContext.targetStore;
          } else {
            // Return all entries as array
            return Array.from(executionContext.targetStore.values());
          }
        }
        return null;

      case 'step_prompt':
        // The step's prompt template serves as the input
        return step.promptTemplate || '';

      case 'custom':
        // Use custom input defined in step configuration
        return step.customInput || step.inputMapping || {};

      default:
        this._log('warn', `[CurationSystem] Unknown inputSource: ${step.inputSource}, using pipeline_input`);
        return executionContext.pipelineInput;
    }
  },

  /**
   * Execute a single pipeline step
   * Integrates: input resolution (5.7.1), prompt building (5.7.2),
   * agent/LLM calls (5.7.3), and output parsing (5.7.4)
   * @param {Object} step - Step configuration
   * @param {Object} executionContext - Current execution context
   * @returns {Promise<Object>} Step execution result
   */
  async _executeStep(step, executionContext) {
    // 1. Resolve step input (5.7.1)
    const stepInput = this._resolveStepInput(step, executionContext);

    // 2. Resolve agent - validates inside _callAgentLLM (5.7.3)
    const agent = step.agentId ? this.getCurationAgent(step.agentId) : null;

    // 3. Build prompt context (5.7.2)
    const promptContext = this._buildStepPromptContext(step, stepInput, executionContext);

    // 4. Resolve prompt with token substitution (5.7.2)
    this._emitProgress(executionContext, 'prompt_resolving');
    const resolvedPrompt = await this._resolveStepPrompt(step, promptContext);

    // 5. If preview mode, generate comprehensive preview without LLM call
    if (executionContext.preview) {
      return this._generatePreviewResult(step, resolvedPrompt, promptContext, executionContext);
    }

    // 6. Call LLM with agent configuration (5.7.3)
    // Validation happens inside _callAgentLLM
    this._emitProgress(executionContext, 'llm_calling');
    const llmResponse = await this._callAgentLLM(agent, resolvedPrompt, step, executionContext);

    // 7. Parse response based on expected format (5.7.4 will implement full parsing)
    this._emitProgress(executionContext, 'output_parsing');
    const parsedOutput = this._parseStepOutput(step, llmResponse);

    return {
      input: stepInput,
      prompt: resolvedPrompt,
      rawResponse: llmResponse,
      output: parsedOutput,
      agent: agent ? {
        id: agent.id,
        name: agent.name,
        positionId: agent.positionId
      } : null
    };
  },

  /**
   * Build prompt context for a step
   * Creates comprehensive context with all data needed for token resolution
   * @param {Object} step - Step configuration
   * @param {*} stepInput - Resolved input for the step
   * @param {Object} executionContext - Current execution context
   * @returns {Object} Prompt context for token resolution
   */
  _buildStepPromptContext(step, stepInput, executionContext) {
    const pipeline = executionContext.pipeline || {};
    const currentStepIndex = executionContext.currentStep || 0;

    // Build store data for context
    const storeData = this._getStoreDataForContext(
      executionContext.targetStore,
      executionContext.targetStoreSchema,
      step
    );

    // Build comprehensive context
    const context = {
      // Current step's input (JSON stringified if object)
      input: stepInput,

      // Previous step output
      previousOutput: executionContext.previousStepOutput,

      // All named variables from prior steps
      variables: executionContext.variables || {},

      // Pipeline metadata
      pipeline: {
        id: pipeline.id,
        name: pipeline.name,
        operation: pipeline.operation,
        storeId: pipeline.storeId,
        description: pipeline.description
      },

      // Step metadata
      step: {
        id: step.id,
        name: step.name,
        index: currentStepIndex,
        totalSteps: executionContext.totalSteps || 0,
        inputSource: step.inputSource,
        outputTarget: step.outputTarget
      },

      // Store data for RAG operations
      store: storeData,

      // Step results from previous steps
      stepResults: executionContext.stepResults || [],

      // Timing information
      timing: {
        startTime: executionContext.startTime,
        elapsed: Date.now() - (executionContext.startTime || Date.now())
      },

      // ST context tokens (available through PromptBuilder)
      st: this._getSTContext(),

      // Global context from pipeline configuration
      global: pipeline.globalContext || {},
      globals: pipeline.globalContext || {},

      // Execution mode flags
      preview: executionContext.preview || false,
      verbose: executionContext.verbose || false
    };

    return context;
  },

  /**
   * Get SillyTavern context for token resolution
   * @returns {Object|null} ST context or null
   */
  _getSTContext() {
    if (typeof SillyTavern !== 'undefined' && SillyTavern.getContext) {
      return SillyTavern.getContext();
    }
    return null;
  },

  /**
   * Extract store data for prompt context
   * @param {Map|Object} store - Store data
   * @param {Object} schema - Store schema
   * @param {Object} step - Step configuration
   * @returns {Object} Store data context
   */
  _getStoreDataForContext(store, schema, step) {
    if (!store) {
      return { count: 0, keys: [], data: null };
    }

    if (schema?.isSingleton) {
      return {
        count: 1,
        keys: Object.keys(store || {}),
        data: store,
        isSingleton: true
      };
    }

    // Collection store
    const entries = store instanceof Map ? Array.from(store.values()) : [];
    const keys = store instanceof Map ? Array.from(store.keys()) : [];

    return {
      count: entries.length,
      keys: keys,
      data: entries,
      isSingleton: false
    };
  },

  /**
   * Resolve step prompt with token substitution
   * Integrates with PromptBuilder system for full token resolution
   * @param {Object} step - Step configuration
   * @param {Object} promptContext - Context for token resolution
   * @returns {Promise<string>} Resolved prompt string
   */
  async _resolveStepPrompt(step, promptContext) {
    // Get PromptBuilder from kernel
    const promptBuilder = this._kernel?.getModule('promptBuilder');

    // Determine prompt config mode
    const promptConfig = step.promptConfig || {};
    const mode = promptConfig.mode || 'custom';

    let resolvedPrompt = '';

    try {
      switch (mode) {
        case 'preset':
          // Load preset prompt and resolve
          resolvedPrompt = await this._resolvePresetPrompt(
            promptConfig.presetName || promptConfig.presetId,
            promptContext,
            promptBuilder
          );
          break;

        case 'tokens':
          // Build from token stack
          resolvedPrompt = await this._resolveTokenStackPrompt(
            promptConfig.tokens || [],
            promptContext,
            promptBuilder
          );
          break;

        case 'custom':
        default:
          // Custom text with embedded tokens
          const customPrompt = promptConfig.customPrompt || step.promptTemplate || '';
          resolvedPrompt = await this._resolveCustomPrompt(
            customPrompt,
            promptContext,
            promptBuilder
          );
          break;
      }

      // If prompt is empty, try legacy promptTemplate field
      if (!resolvedPrompt && step.promptTemplate) {
        resolvedPrompt = await this._resolveCustomPrompt(
          step.promptTemplate,
          promptContext,
          promptBuilder
        );
      }

    } catch (error) {
      this._log('warn', `[CurationSystem] Error resolving prompt for step "${step.name}": ${error.message}`);
      // Fall back to basic template resolution
      resolvedPrompt = this._resolveTemplateTokens(
        promptConfig.customPrompt || step.promptTemplate || '',
        promptContext
      );
    }

    return resolvedPrompt;
  },

  /**
   * Resolve a custom prompt with embedded tokens
   * @param {string} customPrompt - Custom prompt text with tokens
   * @param {Object} context - Prompt context
   * @param {Object} promptBuilder - PromptBuilder system reference
   * @returns {Promise<string>} Resolved prompt
   */
  async _resolveCustomPrompt(customPrompt, context, promptBuilder) {
    if (!customPrompt) {
      return '';
    }

    // First, resolve context-specific variables ({{input}}, {{variables.x}}, etc.)
    let resolved = this._resolveContextVariables(customPrompt, context);

    // Then use PromptBuilder for full token resolution if available
    if (promptBuilder && promptBuilder.resolveTemplate) {
      resolved = promptBuilder.resolveTemplate(resolved, context, {
        preserveUnresolved: false, // Remove unresolved tokens
        passSTMacros: true         // Pass ST macros through for later resolution
      });
    }

    return resolved;
  },

  /**
   * Resolve context-specific variables in prompt text
   * Handles {{input}}, {{previousOutput}}, {{variables.x}}, {{pipeline.x}}, {{step.x}}, {{store.x}}
   * @param {string} text - Text with placeholders
   * @param {Object} context - Prompt context
   * @returns {string} Text with variables replaced
   */
  _resolveContextVariables(text, context) {
    if (!text || typeof text !== 'string') {
      return text || '';
    }

    let result = text;

    // {{input}} - Step input (JSON stringified if object)
    if (context.input !== undefined) {
      const inputStr = typeof context.input === 'string'
        ? context.input
        : JSON.stringify(context.input, null, 2);
      result = result.replace(/\{\{input\}\}/g, inputStr);
    }

    // {{previousOutput}} - Previous step's output
    if (context.previousOutput !== undefined) {
      const prevStr = typeof context.previousOutput === 'string'
        ? context.previousOutput
        : JSON.stringify(context.previousOutput, null, 2);
      result = result.replace(/\{\{previousOutput\}\}/g, prevStr);
    }

    // {{variables.name}} - Named variables
    result = result.replace(/\{\{variables\.([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g, (match, varName) => {
      const value = context.variables?.[varName];
      if (value === undefined) {
        this._log('debug', `[CurationSystem] Variable "${varName}" not found in context`);
        return match; // Keep placeholder if not found
      }
      return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
    });

    // {{pipeline.name}}, {{pipeline.operation}}, etc.
    result = result.replace(/\{\{pipeline\.([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g, (match, field) => {
      const value = context.pipeline?.[field];
      if (value === undefined) {
        return '';
      }
      return typeof value === 'string' ? value : String(value);
    });

    // {{step.name}}, {{step.index}}, etc.
    result = result.replace(/\{\{step\.([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g, (match, field) => {
      const value = context.step?.[field];
      if (value === undefined) {
        return '';
      }
      return typeof value === 'string' ? value : String(value);
    });

    // {{store.count}}, {{store.keys}}, {{store.data}}
    result = result.replace(/\{\{store\.([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g, (match, field) => {
      const value = context.store?.[field];
      if (value === undefined) {
        return '';
      }
      if (Array.isArray(value)) {
        return JSON.stringify(value, null, 2);
      }
      return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
    });

    // {{globals.name}} or {{global.name}}
    result = result.replace(/\{\{globals?\.([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g, (match, field) => {
      const value = context.globals?.[field] || context.global?.[field];
      if (value === undefined) {
        return '';
      }
      return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
    });

    return result;
  },

  /**
   * Resolve a preset prompt
   * @param {string} presetName - Name or ID of the preset
   * @param {Object} context - Prompt context
   * @param {Object} promptBuilder - PromptBuilder system reference
   * @returns {Promise<string>} Resolved preset prompt
   */
  async _resolvePresetPrompt(presetName, context, promptBuilder) {
    if (!presetName) {
      this._log('warn', '[CurationSystem] No preset name provided for preset mode');
      return '';
    }

    if (!promptBuilder) {
      this._log('warn', '[CurationSystem] PromptBuilder not available for preset resolution');
      return '';
    }

    // Try to load the preset
    const preset = promptBuilder.loadPromptPreset
      ? promptBuilder.loadPromptPreset(presetName)
      : promptBuilder.getPreset?.(presetName);

    if (!preset) {
      this._log('warn', `[CurationSystem] Preset "${presetName}" not found`);
      return '';
    }

    // Resolve based on preset config
    const presetConfig = preset.config || preset;

    if (presetConfig.stack && Array.isArray(presetConfig.stack)) {
      // Token stack preset
      return this._resolveTokenStackPrompt(presetConfig.stack, context, promptBuilder);
    } else if (presetConfig.customPrompt) {
      // Custom prompt preset
      return this._resolveCustomPrompt(presetConfig.customPrompt, context, promptBuilder);
    }

    this._log('warn', `[CurationSystem] Preset "${presetName}" has no resolvable content`);
    return '';
  },

  /**
   * Build prompt from token stack
   * @param {Array} tokens - Array of token configurations
   * @param {Object} context - Prompt context
   * @param {Object} promptBuilder - PromptBuilder system reference
   * @returns {Promise<string>} Built prompt
   */
  async _resolveTokenStackPrompt(tokens, context, promptBuilder) {
    if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
      return '';
    }

    // Use PromptBuilder's buildPrompt if available
    if (promptBuilder && promptBuilder.buildPrompt) {
      try {
        // Build configuration for PromptBuilder
        const buildConfig = {
          stack: tokens.map(token => {
            // Normalize token format
            if (typeof token === 'string') {
              return { type: 'text', content: token, enabled: true };
            }
            return {
              type: token.type || 'token',
              content: token.content || token.value || token.text,
              tokenId: token.tokenId || token.id,
              template: token.template,
              enabled: token.enabled !== false,
              transforms: token.transforms
            };
          }),
          separator: '\n\n',
          trim: true
        };

        return promptBuilder.buildPrompt(buildConfig, context);
      } catch (error) {
        this._log('warn', `[CurationSystem] Error building from token stack: ${error.message}`);
      }
    }

    // Fallback: simple concatenation
    const parts = [];
    for (const token of tokens) {
      if (token.enabled === false) continue;

      let content = '';
      if (typeof token === 'string') {
        content = token;
      } else if (token.content || token.value || token.text) {
        content = token.content || token.value || token.text;
      } else if (token.tokenId || token.id) {
        // Try to resolve token ID
        const tokenId = token.tokenId || token.id;
        if (promptBuilder && promptBuilder.resolveToken) {
          content = promptBuilder.resolveToken(tokenId, context) || '';
        } else {
          content = `{{${tokenId}}}`;
        }
      }

      if (content) {
        // Resolve any context variables in the content
        content = this._resolveContextVariables(content, context);
        parts.push(content.trim());
      }
    }

    return parts.join('\n\n');
  },

  /**
   * Legacy template token resolution (fallback)
   * @param {string} template - Template with tokens
   * @param {Object} context - Context object
   * @returns {string} Resolved template
   */
  _resolveTemplateTokens(template, context) {
    if (!template || typeof template !== 'string') {
      return '';
    }

    let result = template;

    // Simple token pattern: {{token.path}}
    result = result.replace(/\{\{([a-zA-Z_][a-zA-Z0-9_.]*)\}\}/g, (match, path) => {
      const parts = path.split('.');
      let value = context;

      for (const part of parts) {
        if (value && typeof value === 'object' && part in value) {
          value = value[part];
        } else {
          return match; // Keep placeholder if path doesn't resolve
        }
      }

      if (value === undefined || value === null) {
        return '';
      }

      return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
    });

    return result;
  },

  /**
   * Generate comprehensive preview result without calling LLM
   * Shows what would happen during execution without actually making LLM calls
   * @param {Object} step - Step configuration
   * @param {string} resolvedPrompt - The resolved prompt
   * @param {Object} promptContext - Prompt context
   * @param {Object} executionContext - Full execution context
   * @returns {Object} Comprehensive preview result
   */
  _generatePreviewResult(step, resolvedPrompt, promptContext, executionContext) {
    // Get agent configuration for preview
    const agent = step.agentId ? this.getCurationAgent(step.agentId) : null;

    // Validate agent (same validation as real execution)
    const agentValidation = this._validateAgentForExecution(agent, step);

    // Estimate token count for the prompt
    const promptTokenEstimate = this._estimateTokenCount(resolvedPrompt);

    // Build agent info for preview
    const agentInfo = agent ? {
      id: agent.id,
      name: agent.name,
      positionId: agent.positionId,
      hasSystemPrompt: !!agent.systemPrompt,
      systemPromptSource: agent.systemPrompt?.source || 'none',
      apiConfig: {
        useCurrentConnection: agent.apiConfig?.useCurrentConnection !== false,
        model: agent.apiConfig?.model || '(default)',
        temperature: agent.apiConfig?.temperature ?? 0.7,
        maxTokens: agent.apiConfig?.maxTokens || 2000
      }
    } : {
      id: null,
      name: '(default ST connection)',
      useCurrentConnection: true
    };

    // Generate simulated response structure
    const simulatedResponse = this._generateSimulatedResponse(step, promptContext);

    // Build comprehensive preview result
    return {
      // Standard step result fields
      input: promptContext.input,
      prompt: resolvedPrompt,
      rawResponse: simulatedResponse.raw,
      output: simulatedResponse.output,

      // Preview-specific metadata
      preview: {
        isPreview: true,
        stepName: step.name,
        stepId: step.id,
        stepIndex: executionContext?.currentStepIndex ?? promptContext.step?.index,

        // Prompt analysis
        promptAnalysis: {
          length: resolvedPrompt.length,
          estimatedTokens: promptTokenEstimate,
          truncated: this._truncateForPreview(resolvedPrompt, 500),
          hasTokens: /\{\{[^}]+\}\}/.test(step.promptTemplate || ''),
          resolvedTokenCount: (resolvedPrompt.match(/\{\{[^}]+\}\}/g) || []).length
        },

        // Input analysis
        inputAnalysis: {
          type: Array.isArray(promptContext.input) ? 'array' : typeof promptContext.input,
          summary: this._truncateForPreview(
            typeof promptContext.input === 'string'
              ? promptContext.input
              : JSON.stringify(promptContext.input, null, 2),
            300
          ),
          size: typeof promptContext.input === 'string'
            ? promptContext.input.length
            : JSON.stringify(promptContext.input).length
        },

        // Agent configuration
        agent: agentInfo,
        agentValidation: {
          valid: agentValidation.valid,
          errors: agentValidation.errors,
          warnings: agentValidation.warnings
        },

        // Output routing preview
        outputRouting: {
          target: step.outputTarget || 'next_step',
          variableName: step.variableName || null,
          expectJson: step.outputTarget === 'store' || step.expectJson === true,
          wouldWriteToStore: step.outputTarget === 'store'
        },

        // Cost estimate (rough)
        costEstimate: this._estimateStepCost(promptTokenEstimate, agentInfo)
      },

      // Agent info for result compatibility
      agent: agent ? {
        id: agent.id,
        name: agent.name,
        positionId: agent.positionId
      } : null
    };
  },

  /**
   * Truncate text for preview display
   * @param {string} text - Text to truncate
   * @param {number} maxLength - Maximum length
   * @returns {string} Truncated text with ellipsis if needed
   */
  _truncateForPreview(text, maxLength = 200) {
    if (!text) return '';
    const str = String(text);
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength) + '...';
  },

  /**
   * Estimate token count for text (rough approximation)
   * Uses ~4 characters per token as a rough estimate
   * @param {string} text - Text to estimate
   * @returns {number} Estimated token count
   */
  _estimateTokenCount(text) {
    if (!text) return 0;
    // Rough estimate: ~4 chars per token for English text
    // This is a simplification; actual tokenization varies by model
    return Math.ceil(String(text).length / 4);
  },

  /**
   * Estimate cost for a step based on token count and agent config
   * @param {number} promptTokens - Estimated prompt tokens
   * @param {Object} agentInfo - Agent configuration info
   * @returns {Object} Cost estimate
   */
  _estimateStepCost(promptTokens, agentInfo) {
    // Rough cost estimates per 1K tokens (varies greatly by model/provider)
    // These are placeholder values for preview purposes
    const estimatedResponseTokens = agentInfo.apiConfig?.maxTokens || 2000;

    return {
      estimatedPromptTokens: promptTokens,
      estimatedResponseTokens: Math.min(estimatedResponseTokens, promptTokens * 2),
      estimatedTotalTokens: promptTokens + Math.min(estimatedResponseTokens, promptTokens * 2),
      note: 'Token estimates are approximate. Actual usage depends on model and response length.'
    };
  },

  /**
   * Generate simulated response structure for preview
   * Creates a placeholder response showing what format would be returned
   * @param {Object} step - Step configuration
   * @param {Object} promptContext - Prompt context
   * @returns {Object} Simulated response with raw and output
   */
  _generateSimulatedResponse(step, promptContext) {
    const expectJson = step.outputTarget === 'store' || step.expectJson === true;

    if (expectJson) {
      // Generate example JSON structure based on store schema if available
      const storeId = promptContext.pipeline?.storeId;
      const schema = storeId ? this._storeSchemas.get(storeId) : null;

      let exampleData = { _preview: true, _note: 'This is simulated output' };

      if (schema && schema.fields) {
        // Build example based on schema fields
        for (const [fieldName, fieldDef] of Object.entries(schema.fields)) {
          if (fieldDef.type === 'string') {
            exampleData[fieldName] = `[${fieldName} would be generated here]`;
          } else if (fieldDef.type === 'number') {
            exampleData[fieldName] = 0;
          } else if (fieldDef.type === 'boolean') {
            exampleData[fieldName] = false;
          } else if (fieldDef.type === 'array') {
            exampleData[fieldName] = [];
          } else if (fieldDef.type === 'enum' && fieldDef.enumValues?.length) {
            exampleData[fieldName] = fieldDef.enumValues[0];
          }
        }
      }

      return {
        raw: '[PREVIEW MODE - No LLM call made]\n```json\n' + JSON.stringify(exampleData, null, 2) + '\n```',
        output: {
          raw: JSON.stringify(exampleData),
          parsed: exampleData,
          type: 'json',
          preview: true
        }
      };
    }

    // Text output
    return {
      raw: '[PREVIEW MODE - No LLM call made]\n\n[Text response would be generated here based on the prompt above]',
      output: {
        raw: '[Preview: Text response would appear here]',
        parsed: '[Preview: Text response would appear here]',
        type: 'text',
        preview: true
      }
    };
  },

  /**
   * Validate agent configuration for pipeline execution
   * @param {Object} agent - Agent configuration (may be null)
   * @param {Object} step - Step configuration
   * @returns {Object} { valid: boolean, errors: string[], warnings: string[] }
   */
  _validateAgentForExecution(agent, step) {
    const result = {
      valid: true,
      errors: [],
      warnings: []
    };

    // Check if step requires an agent
    if (step.agentId && !agent) {
      result.errors.push(this.ValidationErrors.AGENT_NOT_FOUND(step.agentId));
      result.valid = false;
      return result;
    }

    // If no agent specified, that's okay - we'll use default connection
    if (!agent) {
      result.warnings.push(`Step "${step.name}" has no agent - will use default ST connection`);
      return result;
    }

    // Validate agent has required configuration
    if (!agent.apiConfig) {
      result.errors.push(`Agent "${agent.id}" missing apiConfig`);
      result.valid = false;
    }

    // Validate system prompt configuration
    if (!agent.systemPrompt) {
      result.warnings.push(`Agent "${agent.id}" has no systemPrompt configuration`);
    } else {
      const source = agent.systemPrompt.source;
      if (source === 'custom' && !agent.systemPrompt.customText) {
        result.warnings.push(`Agent "${agent.id}" has custom prompt source but no customText`);
      }
      if (source === 'preset' && !agent.systemPrompt.presetName) {
        result.warnings.push(`Agent "${agent.id}" has preset prompt source but no presetName`);
      }
      if (source === 'tokens' && (!agent.systemPrompt.tokens || agent.systemPrompt.tokens.length === 0)) {
        result.warnings.push(`Agent "${agent.id}" has tokens prompt source but no tokens defined`);
      }
    }

    // Validate apiConfig specifics
    if (agent.apiConfig.useCurrentConnection === false) {
      // Custom API endpoint required
      if (!agent.apiConfig.endpoint) {
        result.errors.push(`Agent "${agent.id}" requires endpoint when not using current ST connection`);
        result.valid = false;
      }
    }

    return result;
  },

  /**
   * Build system prompt from agent's systemPrompt configuration
   * @param {Object} agent - Agent configuration
   * @param {Object} context - Execution context for token resolution
   * @returns {Promise<string>} Resolved system prompt
   */
  async _buildAgentSystemPrompt(agent, context) {
    if (!agent || !agent.systemPrompt) {
      return '';
    }

    const promptBuilder = this._kernel?.getModule('promptBuilder');
    const systemPromptConfig = agent.systemPrompt;
    const source = systemPromptConfig.source || 'custom';

    try {
      switch (source) {
        case 'preset':
          // Load preset and resolve
          return await this._resolvePresetPrompt(
            systemPromptConfig.presetName || systemPromptConfig.presetId,
            context,
            promptBuilder
          );

        case 'tokens':
          // Build from token stack
          return await this._resolveTokenStackPrompt(
            systemPromptConfig.tokens || [],
            context,
            promptBuilder
          );

        case 'custom':
        default:
          // Custom text with embedded tokens
          return await this._resolveCustomPrompt(
            systemPromptConfig.customText || '',
            context,
            promptBuilder
          );
      }
    } catch (error) {
      this._log('warn', `[CurationSystem] Error building agent system prompt: ${error.message}`);
      // Fallback to raw custom text if available
      return systemPromptConfig.customText || '';
    }
  },

  /**
   * Build LLM configuration from agent's apiConfig
   * @param {Object} agent - Agent configuration (may be null)
   * @param {Object} executionContext - Execution context
   * @returns {Object} { apiConfig, generationConfig }
   */
  _buildLLMConfig(agent, executionContext) {
    const pipeline = executionContext.pipeline || {};

    // Default configuration
    const defaultConfig = {
      apiConfig: {
        useCurrentConnection: true
      },
      generationConfig: {
        temperature: 0.7,
        maxTokens: 2000,
        topP: 1,
        frequencyPenalty: 0,
        presencePenalty: 0
      }
    };

    // If no agent, use defaults
    if (!agent || !agent.apiConfig) {
      return defaultConfig;
    }

    const agentApiConfig = agent.apiConfig;

    // Build API configuration
    const apiConfig = {
      useCurrentConnection: agentApiConfig.useCurrentConnection !== false,
      endpoint: agentApiConfig.endpoint || '',
      apiKey: agentApiConfig.apiKey || '',
      model: agentApiConfig.model || ''
    };

    // Build generation configuration
    const generationConfig = {
      temperature: agentApiConfig.temperature ?? 0.7,
      maxTokens: agentApiConfig.maxTokens || 2000,
      topP: agentApiConfig.topP ?? 1,
      topK: agentApiConfig.topK, // May be undefined
      frequencyPenalty: agentApiConfig.frequencyPenalty ?? 0,
      presencePenalty: agentApiConfig.presencePenalty ?? 0
    };

    // Remove undefined values from generationConfig
    Object.keys(generationConfig).forEach(key => {
      if (generationConfig[key] === undefined) {
        delete generationConfig[key];
      }
    });

    return {
      apiConfig,
      generationConfig,
      metadata: {
        agentId: agent.id,
        agentName: agent.name,
        pipelineId: pipeline.id,
        pipelineName: pipeline.name
      }
    };
  },

  /**
   * Call LLM with agent configuration
   * Full implementation for pipeline step execution
   * @param {Object} agent - Agent configuration (may be null)
   * @param {string} userPrompt - Resolved user prompt
   * @param {Object} step - Step configuration
   * @param {Object} executionContext - Execution context
   * @returns {Promise<string>} LLM response content
   */
  async _callAgentLLM(agent, userPrompt, step, executionContext) {
    const startTime = performance.now();
    const stepId = step.id || step.name || 'unknown';

    // Emit start event
    this._emit('pipeline:llm:start', {
      stepId,
      stepName: step.name,
      agentId: agent?.id || null,
      pipelineId: executionContext.pipeline?.id,
      promptLength: userPrompt?.length || 0
    });

    try {
      // Validate agent configuration
      const validation = this._validateAgentForExecution(agent, step);
      if (!validation.valid) {
        const errorMsg = `Agent validation failed: ${validation.errors.join('; ')}`;
        this._log('error', `[CurationSystem] ${errorMsg}`);
        throw new Error(errorMsg);
      }

      // Log any warnings
      for (const warning of validation.warnings) {
        this._log('warn', `[CurationSystem] ${warning}`);
      }

      // Build system prompt from agent configuration
      const systemPrompt = await this._buildAgentSystemPrompt(agent, {
        ...executionContext,
        step,
        input: executionContext.pipelineInput
      });

      // Build LLM configuration
      const { apiConfig, generationConfig, metadata } = this._buildLLMConfig(agent, executionContext);

      // Get ApiClient
      const apiClient = this._apiClient || this._kernel?.getModule('apiClient');
      if (!apiClient) {
        throw new Error('ApiClient not available - cannot make LLM calls');
      }

      this._log('debug', `[CurationSystem] Calling LLM for step "${step.name}"`, {
        agentId: agent?.id,
        systemPromptLength: systemPrompt?.length || 0,
        userPromptLength: userPrompt?.length || 0,
        useCurrentConnection: apiConfig.useCurrentConnection
      });

      // Make the LLM call
      const result = await apiClient.generate({
        systemPrompt,
        userPrompt,
        apiConfig,
        generationConfig
      });

      const duration = performance.now() - startTime;

      // Check for errors
      if (!result.success) {
        const errorMsg = result.error || 'Unknown LLM error';
        this._log('error', `[CurationSystem] LLM call failed: ${errorMsg}`);

        this._emit('pipeline:llm:error', {
          stepId,
          stepName: step.name,
          agentId: agent?.id || null,
          pipelineId: executionContext.pipeline?.id,
          error: errorMsg,
          duration
        });

        throw new Error(`LLM call failed: ${errorMsg}`);
      }

      // Log success
      this._log('info', `[CurationSystem] LLM call completed for step "${step.name}"`, {
        duration: Math.round(duration),
        model: result.model,
        promptTokens: result.promptTokens,
        responseTokens: result.responseTokens,
        responseLength: result.content?.length || 0
      });

      // Emit completion event
      this._emit('pipeline:llm:complete', {
        stepId,
        stepName: step.name,
        agentId: agent?.id || null,
        pipelineId: executionContext.pipeline?.id,
        model: result.model,
        promptTokens: result.promptTokens,
        responseTokens: result.responseTokens,
        duration
      });

      // Store LLM metadata in execution context for debugging/monitoring
      if (!executionContext.llmCalls) {
        executionContext.llmCalls = [];
      }
      executionContext.llmCalls.push({
        stepId,
        stepName: step.name,
        agentId: agent?.id || null,
        model: result.model,
        promptTokens: result.promptTokens,
        responseTokens: result.responseTokens,
        duration,
        timestamp: Date.now()
      });

      return result.content || '';

    } catch (error) {
      const duration = performance.now() - startTime;

      this._emit('pipeline:llm:error', {
        stepId,
        stepName: step.name,
        agentId: agent?.id || null,
        pipelineId: executionContext.pipeline?.id,
        error: error.message,
        duration
      });

      throw error;
    }
  },

  /**
   * Parse step output based on expected format
   * @param {Object} step - Step configuration
   * @param {Object} llmResponse - LLM response object
   * @returns {Object} Parsed output with raw, parsed, and type properties
   */
  _parseStepOutput(step, llmResponse) {
    const content = llmResponse?.content || llmResponse;

    if (!content) {
      return { raw: '', parsed: null, type: 'empty' };
    }

    // Check if output should be JSON
    const expectJson = step.outputTarget === 'store' || step.expectJson === true;

    if (expectJson) {
      return this._parseJsonOutput(content, step);
    }

    // Text output
    return {
      raw: content,
      parsed: typeof content === 'string' ? content.trim() : content,
      type: 'text'
    };
  },

  /**
   * Parse JSON output from LLM response
   * Handles markdown code blocks and raw JSON
   * @param {string} content - Raw content to parse
   * @param {Object} step - Step configuration
   * @returns {Object} Parsed JSON output
   */
  _parseJsonOutput(content, step) {
    // Handle non-string content
    if (typeof content !== 'string') {
      if (typeof content === 'object') {
        return {
          raw: JSON.stringify(content),
          parsed: content,
          type: 'json'
        };
      }
      return {
        raw: String(content),
        parsed: null,
        type: 'json_error',
        error: 'Content is not a string or object'
      };
    }

    let jsonStr = content;

    // Try extracting from code block
    const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1].trim();
    }

    // Try extracting from raw JSON bounds (object or array)
    const jsonMatch = content.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (!codeBlockMatch && jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    try {
      const parsed = JSON.parse(jsonStr);
      return {
        raw: content,
        parsed,
        type: 'json'
      };
    } catch (error) {
      this._log('warn', `Failed to parse JSON output for step ${step.id}: ${error.message}`);
      return {
        raw: content,
        parsed: null,
        type: 'json_error',
        error: error.message
      };
    }
  },

  /**
   * Route step output to appropriate destination
   * @param {Object} step - Step configuration
   * @param {Object} stepResult - Result from step execution
   * @param {Object} executionContext - Current execution context
   * @returns {Promise<void>}
   */
  async _routeStepOutput(step, stepResult, executionContext) {
    const { outputTarget, variableName } = step;
    const output = stepResult.output;

    switch (outputTarget) {
      case 'next_step':
        // Store for next step's input
        executionContext.previousStepOutput = output.parsed !== undefined ? output.parsed : output.raw;
        this._log('debug', `Step ${step.id} output routed to next step`);
        break;

      case 'store':
        // Write to curation store
        if (!executionContext.preview) {
          await this._writeToStore(output, executionContext);
        } else {
          // Record what would be written for preview
          executionContext.previewWrites = executionContext.previewWrites || [];
          executionContext.previewWrites.push({
            stepId: step.id,
            stepName: step.name,
            storeId: executionContext.pipeline.storeId,
            operation: executionContext.pipeline.operation,
            data: output.parsed
          });
        }
        // Also pass to next step
        executionContext.previousStepOutput = output.parsed !== undefined ? output.parsed : output.raw;
        break;

      case 'variable':
        // Store in named variable
        if (variableName) {
          executionContext.variables[variableName] = output.parsed !== undefined ? output.parsed : output.raw;
          this._log('debug', `Step ${step.id} output stored in variable: ${variableName}`);
        } else {
          this._log('warn', `Step ${step.id} has variable output but no variableName`);
        }
        // Also pass to next step
        executionContext.previousStepOutput = output.parsed !== undefined ? output.parsed : output.raw;
        break;

      default:
        this._log('warn', `Unknown outputTarget: ${outputTarget}, defaulting to next_step`);
        executionContext.previousStepOutput = output.parsed !== undefined ? output.parsed : output.raw;
    }
  },

  // ===== STORE WRITE OPERATIONS (Pipeline Integration) =====

  /**
   * Write parsed output to the target store
   * Routes to appropriate CRUD operation based on pipeline configuration
   * @param {Object} output - Parsed output from step
   * @param {Object} executionContext - Current execution context
   * @returns {Promise<Object>} Write operation result
   */
  async _writeToStore(output, executionContext) {
    const { storeId, operation } = executionContext.pipeline;
    const store = executionContext.targetStore;
    const schema = executionContext.targetStoreSchema;

    if (!store) {
      throw new Error(`Target store not found: ${storeId}`);
    }

    const data = output.parsed;
    if (!data) {
      throw new Error('No valid data to write to store (JSON parse failed or empty)');
    }

    this._log('debug', `Writing to store ${storeId} with operation ${operation}:`, this._summarizeData(data));

    // Emit store write start event
    this._emit('pipeline:store:write:start', {
      pipelineId: executionContext.pipeline.id,
      storeId,
      operation,
      dataPreview: this._summarizeData(data)
    });

    try {
      let result;

      switch (operation) {
        case 'create':
          result = await this._storeCreate(store, schema, data, executionContext);
          break;

        case 'update':
          result = await this._storeUpdate(store, schema, data, executionContext);
          break;

        case 'delete':
          result = await this._storeDelete(store, schema, data, executionContext);
          break;

        case 'upsert':
          result = await this._storeUpsert(store, schema, data, executionContext);
          break;

        default:
          throw new Error(`Unknown store operation: ${operation}`);
      }

      // Record affected records
      executionContext.affectedRecords = executionContext.affectedRecords || [];
      executionContext.affectedRecords.push(...(result.affectedRecords || []));

      // Emit store write complete event
      this._emit('pipeline:store:write:complete', {
        pipelineId: executionContext.pipeline.id,
        storeId,
        operation,
        affectedCount: result.affectedRecords?.length || 0
      });

      return result;

    } catch (error) {
      // Emit store write error event
      this._emit('pipeline:store:write:error', {
        pipelineId: executionContext.pipeline.id,
        storeId,
        operation,
        error: error.message
      });

      throw error;
    }
  },

  /**
   * Create new records in store
   * @param {Map|Object} store - Target store
   * @param {Object} schema - Store schema
   * @param {Object|Array} data - Data to create
   * @param {Object} executionContext - Execution context
   * @returns {Promise<Object>} Result with affected records
   */
  async _storeCreate(store, schema, data, executionContext) {
    const records = Array.isArray(data) ? data : [data];
    const affectedRecords = [];

    for (const record of records) {
      // Validate against schema if available
      if (schema) {
        this._validateRecordAgainstSchema(record, schema);
      }

      // Generate key if not provided - use schema's primaryKey field
      const primaryKey = schema?.primaryKey || 'id';
      const key = record[primaryKey] || record.key || record.id || this._generateRecordKey(record);

      // Check if key already exists
      const exists = store instanceof Map ? store.has(key) : (key in store);
      if (exists) {
        throw new Error(`Record with key ${key} already exists. Use 'update' or 'upsert' operation.`);
      }

      // Add metadata
      const enrichedRecord = {
        ...record,
        [primaryKey]: key,  // Ensure primary key is set
        _meta: {
          createdAt: new Date().toISOString(),
          createdBy: executionContext.pipeline.id,
          version: 1
        }
      };

      // Write to store
      if (store instanceof Map) {
        store.set(key, enrichedRecord);
      } else {
        store[key] = enrichedRecord;
      }

      affectedRecords.push({ key, operation: 'create', record: enrichedRecord });
    }

    // Trigger persistence
    await this._persistStore(executionContext.pipeline.storeId);

    return { affectedRecords };
  },

  /**
   * Update existing records in store
   * @param {Map|Object} store - Target store
   * @param {Object} schema - Store schema
   * @param {Object|Array} data - Data to update
   * @param {Object} executionContext - Execution context
   * @returns {Promise<Object>} Result with affected records
   */
  async _storeUpdate(store, schema, data, executionContext) {
    const records = Array.isArray(data) ? data : [data];
    const affectedRecords = [];

    for (const record of records) {
      const primaryKey = schema?.primaryKey || 'id';
      const key = record[primaryKey] || record.key || record.id;
      if (!key) {
        throw new Error('Update operation requires a key or id field');
      }

      // Get existing record
      const existing = store instanceof Map ? store.get(key) : store[key];
      if (!existing) {
        throw new Error(`Record with key ${key} not found for update`);
      }

      // Merge with existing
      const updated = {
        ...existing,
        ...record,
        _meta: {
          ...existing._meta,
          updatedAt: new Date().toISOString(),
          updatedBy: executionContext.pipeline.id,
          version: (existing._meta?.version || 0) + 1
        }
      };

      // Validate
      if (schema) {
        this._validateRecordAgainstSchema(updated, schema);
      }

      // Write
      if (store instanceof Map) {
        store.set(key, updated);
      } else {
        store[key] = updated;
      }

      affectedRecords.push({ key, operation: 'update', record: updated, previousRecord: existing });
    }

    await this._persistStore(executionContext.pipeline.storeId);

    return { affectedRecords };
  },

  /**
   * Delete records from store
   * @param {Map|Object} store - Target store
   * @param {Object} schema - Store schema
   * @param {Object|Array|string} data - Keys or objects with keys to delete
   * @param {Object} executionContext - Execution context
   * @returns {Promise<Object>} Result with affected records
   */
  async _storeDelete(store, schema, data, executionContext) {
    const primaryKey = schema?.primaryKey || 'id';

    // Extract keys from data - handle various formats
    let keys;
    if (Array.isArray(data)) {
      keys = data.map(d => {
        if (typeof d === 'string') return d;
        return d[primaryKey] || d.key || d.id || d;
      });
    } else if (typeof data === 'object') {
      keys = [data[primaryKey] || data.key || data.id];
    } else {
      keys = [data];
    }

    const affectedRecords = [];

    for (const key of keys) {
      if (!key) continue;

      const existing = store instanceof Map ? store.get(key) : store[key];

      if (!existing) {
        this._log('warn', `Record with key ${key} not found for delete`);
        continue;
      }

      // Delete
      if (store instanceof Map) {
        store.delete(key);
      } else {
        delete store[key];
      }

      affectedRecords.push({ key, operation: 'delete', previousRecord: existing });
    }

    await this._persistStore(executionContext.pipeline.storeId);

    return { affectedRecords };
  },

  /**
   * Upsert records in store (create or update)
   * @param {Map|Object} store - Target store
   * @param {Object} schema - Store schema
   * @param {Object|Array} data - Data to upsert
   * @param {Object} executionContext - Execution context
   * @returns {Promise<Object>} Result with affected records
   */
  async _storeUpsert(store, schema, data, executionContext) {
    const records = Array.isArray(data) ? data : [data];
    const affectedRecords = [];

    for (const record of records) {
      const primaryKey = schema?.primaryKey || 'id';
      const key = record[primaryKey] || record.key || record.id || this._generateRecordKey(record);
      const existing = store instanceof Map ? store.get(key) : store[key];

      if (existing) {
        // Update
        const updated = {
          ...existing,
          ...record,
          [primaryKey]: key,
          _meta: {
            ...existing._meta,
            updatedAt: new Date().toISOString(),
            updatedBy: executionContext.pipeline.id,
            version: (existing._meta?.version || 0) + 1
          }
        };

        if (schema) this._validateRecordAgainstSchema(updated, schema);

        if (store instanceof Map) {
          store.set(key, updated);
        } else {
          store[key] = updated;
        }

        affectedRecords.push({ key, operation: 'update', record: updated, previousRecord: existing });
      } else {
        // Create
        const newRecord = {
          ...record,
          [primaryKey]: key,
          _meta: {
            createdAt: new Date().toISOString(),
            createdBy: executionContext.pipeline.id,
            version: 1
          }
        };

        if (schema) this._validateRecordAgainstSchema(newRecord, schema);

        if (store instanceof Map) {
          store.set(key, newRecord);
        } else {
          store[key] = newRecord;
        }

        affectedRecords.push({ key, operation: 'create', record: newRecord });
      }
    }

    await this._persistStore(executionContext.pipeline.storeId);

    return { affectedRecords };
  },

  /**
   * Generate a unique key for a record
   * @param {Object} record - Record to generate key for
   * @returns {string} Generated key
   */
  _generateRecordKey(record) {
    const timestamp = Date.now();
    const hash = this._simpleHash(JSON.stringify(record));
    return `record_${timestamp}_${hash}`;
  },

  /**
   * Simple hash function for key generation
   * @param {string} str - String to hash
   * @returns {string} Hash as base36 string
   */
  _simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  },

  /**
   * Validate record against schema
   * Basic validation for required fields
   * @param {Object} record - Record to validate
   * @param {Object} schema - Schema to validate against
   * @returns {boolean} True if valid
   * @throws {Error} If validation fails
   */
  _validateRecordAgainstSchema(record, schema) {
    // Check required fields from schema
    if (schema.required) {
      for (const field of schema.required) {
        if (!(field in record)) {
          throw new Error(`Required field missing: ${field}`);
        }
      }
    }

    // Also check fields marked as required in field definitions
    if (schema.fields) {
      for (const [fieldName, fieldDef] of Object.entries(schema.fields)) {
        if (fieldDef.required && !(fieldName in record)) {
          throw new Error(`Required field missing: ${fieldName}`);
        }
      }
    }

    return true;
  },

  /**
   * Persist store changes to settings
   * Triggers debounced save via SillyTavern context
   * @param {string} storeId - Store ID to persist
   * @returns {Promise<void>}
   */
  async _persistStore(storeId) {
    // Mark store as dirty
    this._markDirty(storeId);

    // Trigger Kernel settings save
    const stContext = this._kernel.getModule('stContext');
    if (stContext?.saveSettingsDebounced) {
      stContext.saveSettingsDebounced();
    }

    // Emit persistence event
    this._emit('store:persisted', { storeId });
  },

  /**
   * Summarize data for logging
   * @param {*} data - Data to summarize
   * @returns {string} Summary string
   */
  _summarizeData(data) {
    if (Array.isArray(data)) {
      return `Array with ${data.length} items`;
    }
    if (typeof data === 'object' && data !== null) {
      const keys = Object.keys(data);
      const preview = keys.slice(0, 5).join(', ');
      return `Object with keys: ${preview}${keys.length > 5 ? '...' : ''}`;
    }
    return String(data).slice(0, 100);
  },

  /**
   * Assemble final pipeline execution result
   * @param {Object} executionContext - Execution context with all results
   * @returns {Object} Final result object
   */
  _assembleFinalResult(executionContext) {
    const { pipeline, stepResults, errors, affectedRecords, previewWrites, warnings, variables } = executionContext;

    // Format errors for user-friendly display
    const formattedErrors = errors.length > 0
      ? errors.map(err => ({
          ...err,
          userMessage: this._formatErrorForUser(err)
        }))
      : undefined;

    // Generate error summary
    const errorSummary = errors.length > 0 ? this._summarizeErrors(errors) : null;

    return {
      success: errors.length === 0,
      pipeline: {
        id: pipeline.id,
        name: pipeline.name,
        operation: pipeline.operation,
        storeId: pipeline.storeId
      },
      execution: {
        startTime: executionContext.startTime,
        endTime: Date.now(),
        duration: Date.now() - executionContext.startTime,
        stepsExecuted: stepResults.length,
        totalSteps: executionContext.totalSteps,
        preview: executionContext.preview
      },
      stepResults: stepResults.map(r => ({
        stepId: r.stepId,
        stepName: r.stepName,
        success: r.success,
        duration: r.duration,
        outputType: r.output?.type,
        outputLength: r.output?.raw?.length,
        error: r.error,
        errorType: r.errorType
      })),
      affectedRecords: affectedRecords || [],
      previewWrites: executionContext.preview ? previewWrites : undefined,
      errors: formattedErrors,
      errorSummary: errorSummary,
      warnings: warnings?.length > 0 ? warnings : undefined,
      variables: Object.keys(variables || {}).length > 0 ? variables : undefined
    };
  },

  // ===== PIPELINE PREVIEW MODE =====

  /**
   * Execute pipeline in preview mode (non-destructive)
   * Creates temporary in-memory store clones
   * @param {string} pipelineId - Pipeline ID
   * @param {Object} options - Execution options
   * @param {Object} options.input - Input data for the pipeline
   * @returns {Promise<Object>} Preview result with changes diff
   */
  async executePipelinePreview(pipelineId, options = {}) {
    const pipeline = this.getPipeline(pipelineId);
    if (!pipeline) {
      throw new Error(this.ValidationErrors.PIPELINE_NOT_FOUND(pipelineId));
    }

    this._log('info', `[CurationSystem] Pipeline preview: ${pipelineId}`);
    this._emit('pipeline:preview:start', { pipelineId, type: pipeline.type });

    const startTime = Date.now();

    try {
      // Get stores affected by this pipeline
      const targetStoreIds = pipeline.type === 'rag'
        ? (pipeline.targetStores || [])
        : [pipeline.storeId].filter(Boolean);

      // Create deep clones of affected stores for preview
      const originalStoreSnapshots = new Map();
      const previewStores = new Map();

      for (const storeId of targetStoreIds) {
        const schema = this._storeSchemas.get(storeId);
        const store = this._stores.get(storeId);

        if (!store || !schema) continue;

        // Create deep clone for preview
        const clonedData = this._deepCloneStore(store, schema.isSingleton);
        previewStores.set(storeId, clonedData);

        // Create snapshot for diff comparison
        originalStoreSnapshots.set(storeId, this._deepCloneStore(store, schema.isSingleton));
      }

      // Execute pipeline logic in preview mode
      let executionResult;
      if (pipeline.type === 'crud') {
        executionResult = await this._executeCRUDPipelinePreview(
          pipeline,
          options.input || {},
          previewStores
        );
      } else if (pipeline.type === 'rag') {
        // RAG pipelines are read-only, so preview is same as execution
        executionResult = await this.executeRAG(pipelineId, options.input || {});
      } else {
        throw new Error(`Unknown pipeline type: ${pipeline.type}`);
      }

      // Calculate changes (what would be different)
      const changes = this._calculatePreviewDiff(
        originalStoreSnapshots,
        previewStores,
        targetStoreIds
      );

      const duration = Date.now() - startTime;

      this._emit('pipeline:preview:complete', {
        pipelineId,
        type: pipeline.type,
        changes,
        duration
      });

      // Create result with apply/discard functions
      const result = {
        success: true,
        pipelineId,
        pipelineName: pipeline.name,
        type: pipeline.type,
        preview: true,
        duration,
        executionResult,
        changes,
        hasChanges: changes.totalChanges > 0,
        previewStores, // Keep reference for potential apply

        /**
         * Apply the previewed changes to actual stores
         */
        applyChanges: async () => {
          return this._applyPreviewChanges(previewStores, targetStoreIds);
        },

        /**
         * Discard the preview (no-op, just for clarity)
         */
        discardChanges: () => {
          this._log('info', `[CurationSystem] Preview discarded: ${pipelineId}`);
          this._emit('pipeline:preview:discarded', { pipelineId });
          return { discarded: true };
        }
      };

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      this._emit('pipeline:preview:error', {
        pipelineId,
        type: pipeline.type,
        error: error.message,
        duration
      });

      this._log('error', `[CurationSystem] Pipeline preview failed: ${pipelineId}`, error.message);

      return {
        success: false,
        pipelineId,
        pipelineName: pipeline.name,
        type: pipeline.type,
        preview: true,
        duration,
        error: error.message
      };
    }
  },

  /**
  /**
   * Execute CRUD pipeline in preview mode using cloned stores
   * Runs through the full pipeline execution with preview=true, showing what would happen
   * @param {Object} pipeline - Pipeline definition
   * @param {Object} input - Input data
   * @param {Map} previewStores - Cloned stores for preview
   * @returns {Promise<Object>} Comprehensive preview execution result
   */
  async _executeCRUDPipelinePreview(pipeline, input, previewStores) {
    // Execute the pipeline with preview mode enabled
    // This runs through all the step execution logic but skips LLM calls
    const executionResult = await this._executeCRUDPipeline(pipeline, input, {
      preview: true,
      verbose: true
    });

    // Build comprehensive preview summary
    return this._assemblePreviewResult(pipeline, input, executionResult, previewStores);
  },

  /**
   * Assemble comprehensive preview result from execution
   * @param {Object} pipeline - Pipeline definition
   * @param {Object} input - Original input
   * @param {Object} executionResult - Result from _executeCRUDPipeline with preview=true
   * @param {Map} previewStores - Preview store references
   * @returns {Object} Comprehensive preview result
   */
  _assemblePreviewResult(pipeline, input, executionResult, previewStores) {
    const steps = pipeline.steps || [];

    // Collect all preview data from step results
    const stepPreviews = executionResult.stepResults.map((stepResult, index) => {
      const step = steps[index] || {};
      const previewData = stepResult.output?.preview || {};

      return {
        stepIndex: index,
        stepId: step.id || `step_${index}`,
        stepName: stepResult.stepName || step.name || `Step ${index + 1}`,
        success: stepResult.success,

        // Prompt info
        prompt: {
          resolved: previewData.promptAnalysis?.truncated || '[No prompt]',
          fullLength: previewData.promptAnalysis?.length || 0,
          estimatedTokens: previewData.promptAnalysis?.estimatedTokens || 0,
          hasUnresolvedTokens: (previewData.promptAnalysis?.resolvedTokenCount || 0) > 0
        },

        // Input info
        input: {
          type: previewData.inputAnalysis?.type || typeof stepResult.input,
          summary: previewData.inputAnalysis?.summary || this._truncateForPreview(
            JSON.stringify(stepResult.input), 200
          )
        },

        // Agent info
        agent: previewData.agent || {
          name: '(default ST connection)',
          useCurrentConnection: true
        },

        // Validation
        validation: previewData.agentValidation || { valid: true, errors: [], warnings: [] },

        // Output routing
        outputRouting: previewData.outputRouting || {
          target: step.outputTarget || 'next_step',
          variableName: step.variableName
        },

        // Cost estimate
        costEstimate: previewData.costEstimate || { estimatedTotalTokens: 0 },

        // Timing
        duration: stepResult.duration || 0
      };
    });

    // Calculate totals
    const totalTokenEstimate = this._calculateTotalTokenEstimate(stepPreviews);
    const costEstimate = this._estimateTotalCost(totalTokenEstimate, stepPreviews);

    // Generate preview summary
    const summary = this._generatePreviewSummary(pipeline, stepPreviews);

    // Summarize store changes
    const storeChangesSummary = this._summarizePreviewStoreChanges(executionResult, pipeline);

    // Collect all warnings
    const allWarnings = [];
    for (const stepPreview of stepPreviews) {
      if (stepPreview.validation?.warnings) {
        allWarnings.push(...stepPreview.validation.warnings.map(w => ({
          step: stepPreview.stepName,
          warning: w
        })));
      }
    }
    if (executionResult.warnings) {
      allWarnings.push(...executionResult.warnings.map(w => ({
        step: 'pipeline',
        warning: typeof w === 'string' ? w : w.message
      })));
    }

    return {
      // Pipeline metadata
      pipeline: {
        id: pipeline.id,
        name: pipeline.name,
        operation: pipeline.operation,
        storeId: pipeline.storeId,
        description: pipeline.description
      },

      // Summary of what would happen
      summary,

      // Step-by-step preview details
      steps: stepPreviews,

      // Data flow tracking
      dataFlow: {
        input: {
          type: typeof input,
          summary: this._truncateForPreview(JSON.stringify(input), 300)
        },
        variables: executionResult.variables || {},
        previewWrites: executionResult.previewWrites || []
      },

      // Store changes summary
      storeChanges: storeChangesSummary,

      // Token and cost estimates
      tokenEstimate: totalTokenEstimate,
      costEstimate,

      // Warnings collected during preview
      warnings: allWarnings.length > 0 ? allWarnings : undefined,

      // Execution metadata
      execution: {
        totalSteps: steps.length,
        previewedSteps: stepPreviews.length,
        successfulPreviews: stepPreviews.filter(s => s.success).length,
        timing: executionResult.timing
      },

      // Result status
      success: executionResult.success,
      message: `Preview: ${pipeline.name} would execute ${steps.length} step(s) with estimated ${totalTokenEstimate.total} tokens`,
      preview: true
    };
  },

  /**
   * Generate human-readable preview summary
   * @param {Object} pipeline - Pipeline definition
   * @param {Array} stepPreviews - Preview data for each step
   * @returns {Object} Summary with description and highlights
   */
  _generatePreviewSummary(pipeline, stepPreviews) {
    const stepsWithStoreWrite = stepPreviews.filter(s => s.outputRouting?.target === 'store');
    const stepsWithVariables = stepPreviews.filter(s => s.outputRouting?.target === 'variable');
    const stepsWithWarnings = stepPreviews.filter(s => s.validation?.warnings?.length > 0);
    const stepsWithErrors = stepPreviews.filter(s => !s.validation?.valid);

    const highlights = [];

    if (stepsWithStoreWrite.length > 0) {
      highlights.push(`${stepsWithStoreWrite.length} step(s) would write to store "${pipeline.storeId}"`);
    }
    if (stepsWithVariables.length > 0) {
      const varNames = stepsWithVariables.map(s => s.outputRouting.variableName).filter(Boolean);
      highlights.push(`${stepsWithVariables.length} step(s) would set variables: ${varNames.join(', ') || '(unnamed)'}`);
    }
    if (stepsWithWarnings.length > 0) {
      highlights.push(`${stepsWithWarnings.length} step(s) have configuration warnings`);
    }
    if (stepsWithErrors.length > 0) {
      highlights.push(`WARNING: ${stepsWithErrors.length} step(s) have validation errors`);
    }

    return {
      description: `Pipeline "${pipeline.name}" (${pipeline.operation}) would execute ${stepPreviews.length} step(s)`,
      storeTarget: pipeline.storeId,
      operation: pipeline.operation,
      totalLLMCalls: stepPreviews.length,
      highlights,
      wouldModifyStore: stepsWithStoreWrite.length > 0,
      hasWarnings: stepsWithWarnings.length > 0,
      hasErrors: stepsWithErrors.length > 0
    };
  },

  /**
   * Summarize what store changes would occur
   * @param {Object} executionResult - Execution result with previewWrites
   * @param {Object} pipeline - Pipeline definition
   * @returns {Object} Store changes summary
   */
  _summarizePreviewStoreChanges(executionResult, pipeline) {
    const previewWrites = executionResult.previewWrites || [];

    if (previewWrites.length === 0) {
      return {
        wouldModify: false,
        storeId: pipeline.storeId,
        operation: pipeline.operation,
        changeCount: 0,
        changes: []
      };
    }

    return {
      wouldModify: true,
      storeId: pipeline.storeId,
      operation: pipeline.operation,
      changeCount: previewWrites.length,
      changes: previewWrites.map(write => ({
        stepId: write.stepId,
        stepName: write.stepName,
        operation: write.operation,
        dataPreview: this._truncateForPreview(JSON.stringify(write.data), 200)
      }))
    };
  },

  /**
   * Calculate total token estimate from all steps
   * @param {Array} stepPreviews - Preview data for each step
   * @returns {Object} Total token estimates
   */
  _calculateTotalTokenEstimate(stepPreviews) {
    let promptTokens = 0;
    let responseTokens = 0;

    for (const step of stepPreviews) {
      const estimate = step.costEstimate || {};
      promptTokens += estimate.estimatedPromptTokens || 0;
      responseTokens += estimate.estimatedResponseTokens || 0;
    }

    return {
      promptTokens,
      responseTokens,
      total: promptTokens + responseTokens,
      perStep: stepPreviews.map(s => ({
        stepName: s.stepName,
        tokens: s.costEstimate?.estimatedTotalTokens || 0
      }))
    };
  },

  /**
   * Estimate total cost for pipeline execution
   * @param {Object} tokenEstimate - Token estimates
   * @param {Array} stepPreviews - Step preview data
   * @returns {Object} Cost estimate with notes
   */
  _estimateTotalCost(tokenEstimate, stepPreviews) {
    // Check if any steps use non-default models
    const modelsUsed = new Set();
    for (const step of stepPreviews) {
      const model = step.agent?.apiConfig?.model || '(default)';
      modelsUsed.add(model);
    }

    return {
      totalTokens: tokenEstimate.total,
      modelsUsed: Array.from(modelsUsed),
      llmCalls: stepPreviews.length,
      note: `Cost depends on model pricing. ${tokenEstimate.total} tokens across ${stepPreviews.length} LLM call(s).`,
      disclaimer: 'Token estimates are approximate. Actual usage varies by model and response length.'
    };
  },

  _deepCloneStore(store, isSingleton) {
    if (isSingleton) {
      // Deep clone singleton object
      return JSON.parse(JSON.stringify(store));
    } else {
      // Clone Map with deep-cloned values
      const clonedMap = new Map();
      for (const [key, value] of store.entries()) {
        clonedMap.set(key, JSON.parse(JSON.stringify(value)));
      }
      return clonedMap;
    }
  },

  /**
   * Calculate diff between original and preview stores
   * @param {Map} originalSnapshots - Original store snapshots
   * @param {Map} previewStores - Modified preview stores
   * @param {string[]} storeIds - Store IDs to compare
   * @returns {Object} Diff summary
   */
  _calculatePreviewDiff(originalSnapshots, previewStores, storeIds) {
    const diff = {
      stores: {},
      totalChanges: 0,
      summary: []
    };

    for (const storeId of storeIds) {
      const original = originalSnapshots.get(storeId);
      const preview = previewStores.get(storeId);
      const schema = this._storeSchemas.get(storeId);

      if (!original || !preview) continue;

      const storeDiff = {
        storeId,
        isSingleton: schema?.isSingleton || false,
        added: [],
        modified: [],
        deleted: [],
        unchanged: 0
      };

      if (schema?.isSingleton) {
        // Compare singleton objects
        const changes = this._compareObjects(original, preview);
        if (changes.hasChanges) {
          storeDiff.modified.push({
            id: storeId,
            changes: changes.differences
          });
          diff.totalChanges++;
          diff.summary.push(`${storeId}: modified`);
        } else {
          storeDiff.unchanged = 1;
        }
      } else {
        // Compare collection Maps
        const originalKeys = new Set(original.keys());
        const previewKeys = new Set(preview.keys());

        // Find added items
        for (const key of previewKeys) {
          if (!originalKeys.has(key)) {
            storeDiff.added.push({
              id: key,
              data: preview.get(key)
            });
            diff.totalChanges++;
          }
        }

        // Find deleted items
        for (const key of originalKeys) {
          if (!previewKeys.has(key)) {
            storeDiff.deleted.push({
              id: key,
              data: original.get(key)
            });
            diff.totalChanges++;
          }
        }

        // Find modified items
        for (const key of originalKeys) {
          if (previewKeys.has(key)) {
            const origItem = original.get(key);
            const prevItem = preview.get(key);
            const changes = this._compareObjects(origItem, prevItem);

            if (changes.hasChanges) {
              storeDiff.modified.push({
                id: key,
                before: origItem,
                after: prevItem,
                changes: changes.differences
              });
              diff.totalChanges++;
            } else {
              storeDiff.unchanged++;
            }
          }
        }

        // Generate summary
        if (storeDiff.added.length > 0) {
          diff.summary.push(`${storeId}: +${storeDiff.added.length} added`);
        }
        if (storeDiff.modified.length > 0) {
          diff.summary.push(`${storeId}: ${storeDiff.modified.length} modified`);
        }
        if (storeDiff.deleted.length > 0) {
          diff.summary.push(`${storeId}: -${storeDiff.deleted.length} deleted`);
        }
      }

      diff.stores[storeId] = storeDiff;
    }

    return diff;
  },

  /**
   * Compare two objects and return differences
   * @param {Object} obj1 - First object
   * @param {Object} obj2 - Second object
   * @returns {Object} Comparison result
   */
  _compareObjects(obj1, obj2) {
    const differences = [];
    const allKeys = new Set([...Object.keys(obj1 || {}), ...Object.keys(obj2 || {})]);

    for (const key of allKeys) {
      const val1 = obj1?.[key];
      const val2 = obj2?.[key];

      // Skip internal/metadata fields
      if (key.startsWith('_')) continue;

      const val1Str = JSON.stringify(val1);
      const val2Str = JSON.stringify(val2);

      if (val1Str !== val2Str) {
        differences.push({
          field: key,
          before: val1,
          after: val2
        });
      }
    }

    return {
      hasChanges: differences.length > 0,
      differences
    };
  },

  /**
   * Apply preview changes to actual stores
   * @param {Map} previewStores - Preview stores with changes
   * @param {string[]} storeIds - Store IDs to apply
   * @returns {Promise<Object>} Apply result
   */
  async _applyPreviewChanges(previewStores, storeIds) {
    this._log('info', `[CurationSystem] Applying preview changes to ${storeIds.length} stores`);

    const applied = [];

    try {
      for (const storeId of storeIds) {
        const previewStore = previewStores.get(storeId);
        const schema = this._storeSchemas.get(storeId);

        if (!previewStore) continue;

        if (schema?.isSingleton) {
          // Replace singleton with preview data
          this._stores.set(storeId, previewStore);
        } else {
          // Replace collection with preview Map
          this._stores.set(storeId, previewStore);
        }

        applied.push(storeId);
        this._emit('store:updated', { storeId, source: 'preview-apply' });
      }

      this._log('info', `[CurationSystem] Preview changes applied to: ${applied.join(', ')}`);
      this._emit('pipeline:preview:applied', { storeIds: applied });

      return {
        success: true,
        appliedStores: applied,
        message: `Changes applied to ${applied.length} store(s)`
      };
    } catch (error) {
      this._log('error', `[CurationSystem] Failed to apply preview changes:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
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

  // ===== ERROR HANDLING & RECOVERY =====

  /**
   * Normalize any error to a PipelineError
   * @param {Error} error - Original error
   * @param {Object} step - Step that failed
   * @param {number} stepIndex - Step index
   * @returns {PipelineError} Normalized error
   */
  _normalizeError(error, step, stepIndex) {
    // Already a PipelineError
    if (error instanceof PipelineError) {
      return error;
    }

    // Categorize based on error message
    let type = PipelineErrorTypes.UNKNOWN;
    const message = error.message || String(error);

    if (message.includes('agent') || message.includes('Agent')) {
      type = PipelineErrorTypes.AGENT;
    } else if (message.includes('prompt') || message.includes('resolve')) {
      type = PipelineErrorTypes.PROMPT;
    } else if (message.includes('API') || message.includes('LLM') || message.includes('timeout')) {
      type = PipelineErrorTypes.LLM;
    } else if (message.includes('parse') || message.includes('JSON')) {
      type = PipelineErrorTypes.PARSE;
    } else if (message.includes('store') || message.includes('Store')) {
      type = PipelineErrorTypes.STORE;
    } else if (message.includes('timeout')) {
      type = PipelineErrorTypes.TIMEOUT;
    } else if (message.includes('validat')) {
      type = PipelineErrorTypes.VALIDATION;
    }

    return new PipelineError(type, message, {
      originalError: error,
      step: {
        id: step.id,
        name: step.name,
        index: stepIndex
      },
      stack: error.stack
    });
  },

  /**
   * Execute a step with retry logic for transient failures
   * @param {Object} step - Step configuration
   * @param {Object} executionContext - Execution context
   * @returns {Promise<Object>} Step result
   */
  async _executeStepWithRetry(step, executionContext) {
    const maxRetries = 3;
    const retryDelayMs = [1000, 2000, 4000]; // Exponential backoff
    let lastError = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Check for cancellation
        if (executionContext.executionId) {
          const execution = this._activeExecutions.get(executionContext.executionId);
          if (execution?.cancelled) {
            throw new PipelineError(
              PipelineErrorTypes.CANCELLED,
              'Pipeline execution was cancelled',
              { cancelledAt: execution.cancelledAt }
            );
          }
        }

        // Execute the step
        const result = await this._executeStep(step, executionContext);

        // Success - return result
        if (attempt > 0) {
          this._log('info', `[CurationSystem] Step ${step.name} succeeded after ${attempt} retries`);
        }
        return result;

      } catch (error) {
        lastError = this._normalizeError(error, step, executionContext.currentStepIndex);

        // Don't retry non-retryable errors
        if (!lastError.retryable || attempt >= maxRetries) {
          throw lastError;
        }

        // Log retry attempt
        const delay = retryDelayMs[attempt] || 4000;
        this._log('warn', `[CurationSystem] Step ${step.name} failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms: ${lastError.message}`);

        // Emit retry event
        this._emit('pipeline:step:retry', {
          pipelineId: executionContext.pipeline.id,
          stepIndex: executionContext.currentStepIndex,
          stepId: step.id,
          stepName: step.name,
          attempt: attempt + 1,
          maxRetries: maxRetries + 1,
          error: lastError.message,
          retryDelay: delay
        });

        // Wait before retry
        await this._sleep(delay);
      }
    }

    // All retries exhausted
    throw lastError;
  },

  /**
   * Check if execution should continue after error
   * @param {PipelineError} error - The error that occurred
   * @param {Object} executionContext - Execution context
   * @returns {boolean} True if should continue
   */
  _shouldContinueAfterError(error, executionContext) {
    // Never continue after cancellation
    if (error.type === PipelineErrorTypes.CANCELLED) {
      return false;
    }

    // Check continueOnError flag
    if (!executionContext.continueOnError) {
      return false;
    }

    // Continue only for recoverable errors
    return error.recoverable;
  },

  /**
   * Simple sleep helper
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  /**
   * Cancel a running pipeline execution
   * @param {string} executionId - Execution ID to cancel
   * @returns {boolean} True if execution was found and cancelled
   */
  cancelExecution(executionId) {
    const execution = this._activeExecutions.get(executionId);
    if (!execution) {
      this._log('warn', `[CurationSystem] Cannot cancel execution ${executionId}: not found`);
      return false;
    }

    execution.cancelled = true;
    execution.cancelledAt = Date.now();

    this._log('info', `[CurationSystem] Cancelled execution ${executionId} for pipeline ${execution.pipelineId}`);
    this._emit('pipeline:execution:cancelled', {
      executionId,
      pipelineId: execution.pipelineId,
      cancelledAt: execution.cancelledAt
    });

    return true;
  },

  /**
   * Cancel all executions for a specific pipeline
   * @param {string} pipelineId - Pipeline ID
   * @returns {number} Number of executions cancelled
   */
  cancelPipelineExecutions(pipelineId) {
    let cancelledCount = 0;

    for (const [executionId, execution] of this._activeExecutions.entries()) {
      if (execution.pipelineId === pipelineId && !execution.cancelled) {
        execution.cancelled = true;
        execution.cancelledAt = Date.now();
        cancelledCount++;

        this._emit('pipeline:execution:cancelled', {
          executionId,
          pipelineId: execution.pipelineId,
          cancelledAt: execution.cancelledAt
        });
      }
    }

    if (cancelledCount > 0) {
      this._log('info', `[CurationSystem] Cancelled ${cancelledCount} executions for pipeline ${pipelineId}`);
    }

    return cancelledCount;
  },

  /**
   * Format error for user-friendly display
   * @param {Object} error - Error object from executionContext
   * @returns {string} User-friendly error message
   */
  _formatErrorForUser(error) {
    const stepInfo = error.stepName ? ` in step "${error.stepName}"` : '';

    // If it's a PipelineError with details, provide specific guidance
    if (error.type) {
      switch (error.type) {
        case PipelineErrorTypes.AGENT:
          return `Agent error${stepInfo}: ${error.error}. Check that the agent is properly configured.`;
        case PipelineErrorTypes.PROMPT:
          return `Prompt resolution failed${stepInfo}: ${error.error}. Check your token syntax and variable names.`;
        case PipelineErrorTypes.LLM:
          return `LLM call failed${stepInfo}: ${error.error}. Check your API connection and rate limits.`;
        case PipelineErrorTypes.PARSE:
          return `Failed to parse LLM response${stepInfo}: ${error.error}. The LLM may have returned invalid JSON.`;
        case PipelineErrorTypes.STORE:
          return `Store operation failed${stepInfo}: ${error.error}. Check store configuration and data schema.`;
        case PipelineErrorTypes.TIMEOUT:
          return `Operation timed out${stepInfo}: ${error.error}. Try again or increase timeout settings.`;
        case PipelineErrorTypes.CANCELLED:
          return `Execution cancelled${stepInfo}.`;
        case PipelineErrorTypes.VALIDATION:
          return `Validation error${stepInfo}: ${error.error}. Check your pipeline configuration.`;
        default:
          return `Error${stepInfo}: ${error.error}`;
      }
    }

    // Fallback for plain error objects
    return `Error${stepInfo}: ${error.error || error.message || 'Unknown error'}`;
  },

  /**
   * Summarize errors for final result
   * @param {Array<Object>} errors - Array of error objects
   * @returns {string} Summary string
   */
  _summarizeErrors(errors) {
    if (!errors || errors.length === 0) return '';

    const errorCounts = {};
    for (const error of errors) {
      const type = error.type || 'unknown';
      errorCounts[type] = (errorCounts[type] || 0) + 1;
    }

    const parts = Object.entries(errorCounts).map(([type, count]) =>
      `${count} ${type} error${count > 1 ? 's' : ''}`
    );

    return parts.join(', ');
  },

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
