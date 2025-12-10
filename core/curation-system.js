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
  VERSION: "2.0.0",

  // ===== STATE =====

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
   * Storage backend adapter
   * @type {Object|null}
   */
  _storage: null,

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
   * Logger reference
   * @type {Object|null}
   */
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
   * Dirty stores (need saving)
   * @type {Set<string>}
   */
  _dirtyStores: new Set(),

  /**
   * Auto-save interval ID
   * @type {number|null}
   */
  _autoSaveInterval: null,

  // ===== INITIALIZATION =====

  /**
   * Initialize the Curation System
   * @param {Object} options - Configuration options
   * @param {Object} options.logger - Logger instance
   * @param {Object} options.apiClient - API client instance
   * @param {Object} options.tokenResolver - Token resolver instance
   * @param {Object} options.storage - Storage backend adapter
   * @param {Object} options.initialSchemas - Initial store schemas
   * @param {boolean} options.autoSave - Enable auto-save (default: true)
   * @param {number} options.autoSaveIntervalMs - Auto-save interval (default: 30000)
   * @returns {CurationSystem}
   */
  init(options = {}) {
    if (this._initialized) {
      this._log("warn", "CurationSystem already initialized");
      return this;
    }

    this._log("info", "Initializing Curation System...");

    // Set dependencies
    this._logger = options.logger || null;
    this._apiClient = options.apiClient || null;
    this._tokenResolver = options.tokenResolver || null;
    this._storage = options.storage || this._createDefaultStorage();

    // Clear existing state
    this.clear();

    // Register default store schemas
    this._registerDefaultSchemas();

    // Register default curation positions
    this._registerDefaultPositions();

    // Register default character pipelines
    this._registerDefaultCharacterPipelines();

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
   * Clear all data
   */
  clear() {
    this._storeSchemas.clear();
    this._stores.clear();
    this._crudPipelines.clear();
    this._ragPipelines.clear();
    this._positions.clear();
    this._dirtyStores.clear();
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

  // ===== DEFAULT STORAGE ADAPTER =====

  /**
   * Create default localStorage adapter
   * @returns {Object} Storage adapter
   */
  _createDefaultStorage() {
    const STORAGE_PREFIX = "council_curation_";

    return {
      async get(key) {
        try {
          const raw = localStorage.getItem(STORAGE_PREFIX + key);
          return raw ? JSON.parse(raw) : null;
        } catch (e) {
          console.error(`Storage get error for ${key}:`, e);
          return null;
        }
      },

      async set(key, value) {
        try {
          localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
          return true;
        } catch (e) {
          console.error(`Storage set error for ${key}:`, e);
          return false;
        }
      },

      async delete(key) {
        try {
          localStorage.removeItem(STORAGE_PREFIX + key);
          return true;
        } catch (e) {
          console.error(`Storage delete error for ${key}:`, e);
          return false;
        }
      },

      async keys(prefix = "") {
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(STORAGE_PREFIX + prefix)) {
            keys.push(key.substring(STORAGE_PREFIX.length));
          }
        }
        return keys;
      },
    };
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
      throw new Error(`Store "${storeId}" not found`);
    }

    if (schema.isSingleton) {
      throw new Error(
        `Cannot create in singleton store "${storeId}" - use update instead`,
      );
    }

    // Validate and normalize data
    const entry = this._validateAndNormalizeEntry(schema, data);

    // Check for duplicate primary key
    const store = this._stores.get(storeId);
    const key = entry[schema.primaryKey];

    if (!key) {
      throw new Error(`Primary key "${schema.primaryKey}" is required`);
    }

    if (store.has(key)) {
      throw new Error(
        `Entry with ${schema.primaryKey}="${key}" already exists`,
      );
    }

    // Add timestamps
    entry.createdAt = Date.now();
    entry.updatedAt = Date.now();

    // Store entry
    store.set(key, entry);
    this._markDirty(storeId);

    this._log("debug", `Created entry in ${storeId}:`, key);
    this._emit("store:created", { storeId, key, entry });

    return entry;
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
      throw new Error(`Store "${storeId}" not found`);
    }

    const store = this._stores.get(storeId);

    // Singleton store
    if (schema.isSingleton) {
      const data = typeof keyOrData === "object" ? keyOrData : updates || {};
      const validated = this._validateAndNormalizeEntry(schema, {
        ...store,
        ...data,
      });
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
      throw new Error(`Entry "${key}" not found in store "${storeId}"`);
    }

    const existing = store.get(key);
    const updated = this._validateAndNormalizeEntry(schema, {
      ...existing,
      ...updates,
      [schema.primaryKey]: key, // Prevent key changes
    });
    updated.updatedAt = Date.now();

    store.set(key, updated);
    this._markDirty(storeId);

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
      throw new Error(`Store "${storeId}" not found`);
    }

    if (schema.isSingleton) {
      throw new Error(
        `Cannot delete from singleton store "${storeId}" - use update to clear fields`,
      );
    }

    const store = this._stores.get(storeId);

    if (!store.has(key)) {
      return false;
    }

    const entry = store.get(key);
    store.delete(key);
    this._markDirty(storeId);

    this._log("debug", `Deleted entry from ${storeId}:`, key);
    this._emit("store:deleted", { storeId, key, entry });

    return true;
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
   * Save a store to persistence
   * @param {string} storeId - Store ID
   * @returns {Promise<boolean>} Success
   */
  async saveStore(storeId) {
    if (!this._storage) {
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

    const success = await this._storage.set(`store_${storeId}`, data);

    if (success) {
      this._dirtyStores.delete(storeId);
      this._log("debug", `Saved store: ${storeId}`);
    }

    return success;
  },

  /**
   * Load a store from persistence
   * @param {string} storeId - Store ID
   * @returns {Promise<boolean>} Success
   */
  async loadStore(storeId) {
    if (!this._storage) {
      return false;
    }

    const schema = this._storeSchemas.get(storeId);
    if (!schema) {
      return false;
    }

    const data = await this._storage.get(`store_${storeId}`);

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
   * Save all pipelines to persistence
   * @returns {Promise<boolean>} Success
   */
  async savePipelines() {
    if (!this._storage) {
      return false;
    }

    const pipelineData = {
      crud: Array.from(this._crudPipelines.values()),
      rag: Array.from(this._ragPipelines.values()),
    };

    const success = await this._storage.set("curation_pipelines", pipelineData);

    if (success) {
      this._log("debug", "Saved curation pipelines");
    }

    return success;
  },

  /**
   * Load all pipelines from persistence
   * @returns {Promise<boolean>} Success
   */
  async loadPipelines() {
    if (!this._storage) {
      return false;
    }

    const data = await this._storage.get("curation_pipelines");

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
      throw new Error(`RAG pipeline "${pipelineId}" not found`);
    }

    this._log("debug", `Executing RAG pipeline: ${pipelineId}`, input);
    this._emit("rag:started", { pipelineId, input });

    try {
      const result = await this._executeRAGPipeline(pipeline, input);
      this._emit("rag:completed", { pipelineId, input, result });
      return result;
    } catch (error) {
      this._emit("rag:error", { pipelineId, input, error });
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

    for (const [storeId, schema] of this._storeSchemas.entries()) {
      storeSummary[storeId] = {
        name: schema.name,
        icon: schema.icon,
        isSingleton: schema.isSingleton,
        count: this.count(storeId),
        isDirty: this._dirtyStores.has(storeId),
      };
    }

    return {
      version: this.VERSION,
      initialized: this._initialized,
      storeCount: this._storeSchemas.size,
      stores: storeSummary,
      crudPipelineCount: this._crudPipelines.size,
      ragPipelineCount: this._ragPipelines.size,
      positionCount: this._positions.size,
      dirtyStoreCount: this._dirtyStores.size,
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
