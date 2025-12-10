/**
 * TheCouncil - Character System
 *
 * Core module for managing character avatar agents:
 * - Character Director (static leader position)
 * - Character Agents (avatars of story characters)
 * - Integration with Curation system (read-only)
 * - Integration with Pipeline system (participation)
 *
 * Key Principles:
 * - Self-contained system (own agents, positions, teams)
 * - Reads character data from Curation's characterSheets
 * - User overrides are at AGENT level, not character data level
 * - Character agents embody and voice story characters
 *
 * @version 2.0.0
 */

const CharacterSystem = {
  // ===== VERSION =====
  VERSION: "2.0.0",

  // ===== CHARACTER TYPES =====
  CharacterType: {
    MAIN_CAST: "main_cast",
    RECURRING_CAST: "recurring_cast",
    SUPPORTING_CAST: "supporting_cast",
    BACKGROUND: "background",
  },

  // ===== AGENT STATUS =====
  AgentStatus: {
    ACTIVE: "active",
    INACTIVE: "inactive",
    SPAWNED: "spawned", // Dynamically spawned for scene
    UNASSIGNED: "unassigned", // Character exists but no agent configured
  },

  // ===== STATE =====

  /**
   * Character agents registry
   * @type {Map<string, Object>}
   */
  _characterAgents: new Map(),

  /**
   * Character positions (one per character agent)
   * @type {Map<string, Object>}
   */
  _positions: new Map(),

  /**
   * Character Director configuration
   * @type {Object|null}
   */
  _characterDirector: null,

  /**
   * Character Director position
   * @type {Object|null}
   */
  _characterDirectorPosition: null,

  /**
   * User overrides for character agents (keyed by characterId)
   * @type {Map<string, Object>}
   */
  _userOverrides: new Map(),

  /**
   * Dynamically spawned agents for current scene
   * @type {Set<string>}
   */
  _spawnedAgents: new Set(),

  /**
   * Reference to CurationSystem for character data
   * @type {Object|null}
   */
  _curationSystem: null,

  /**
   * Reference to storage system
   * @type {Object|null}
   */
  _storage: null,

  /**
   * Logger instance
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

  // ===== INITIALIZATION =====

  /**
   * Initialize the Character System
   * @param {Object} options - Configuration options
   * @param {Object} options.curationSystem - Reference to CurationSystem
   * @param {Object} options.logger - Logger instance
   * @returns {CharacterSystem}
   */
  init(options = {}) {
    if (this._initialized) {
      this._log("warn", "CharacterSystem already initialized");
      return this;
    }

    this._log("info", "Initializing Character System...");

    this._curationSystem = options.curationSystem || null;
    this._logger = options.logger || null;

    // Clear state
    this.clear();

    // Create default storage adapter
    this._storage = this._createDefaultStorage();

    // Initialize Character Director
    this._initializeCharacterDirector();

    // Load persisted data
    this._loadPersistedData();

    this._initialized = true;
    this._log("info", "Character System initialized");
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
    this._characterAgents.clear();
    this._positions.clear();
    this._userOverrides.clear();
    this._spawnedAgents.clear();
    this._characterDirector = null;
    this._characterDirectorPosition = null;
  },

  /**
   * Shutdown the system
   */
  async shutdown() {
    if (!this._initialized) return;

    this._log("info", "Shutting down Character System...");

    // Save data before shutdown
    await this.saveAll();

    this.clear();
    this._initialized = false;

    this._log("info", "Character System shut down");
    this._emit("system:shutdown");
  },

  // ===== STORAGE =====

  /**
   * Create default localStorage adapter
   * @returns {Object} Storage adapter
   */
  _createDefaultStorage() {
    const STORAGE_PREFIX = "thecouncil_characters_";

    return {
      async get(key) {
        try {
          const raw = localStorage.getItem(STORAGE_PREFIX + key);
          return raw ? JSON.parse(raw) : null;
        } catch (e) {
          console.error(`[CharacterSystem] Storage get error:`, e);
          return null;
        }
      },

      async set(key, value) {
        try {
          localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
          return true;
        } catch (e) {
          console.error(`[CharacterSystem] Storage set error:`, e);
          return false;
        }
      },

      async delete(key) {
        try {
          localStorage.removeItem(STORAGE_PREFIX + key);
          return true;
        } catch (e) {
          console.error(`[CharacterSystem] Storage delete error:`, e);
          return false;
        }
      },

      async keys() {
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(STORAGE_PREFIX)) {
            keys.push(key.substring(STORAGE_PREFIX.length));
          }
        }
        return keys;
      },
    };
  },

  /**
   * Load persisted data
   */
  async _loadPersistedData() {
    try {
      // Load character agents
      const agents = await this._storage.get("agents");
      if (agents && Array.isArray(agents)) {
        for (const agent of agents) {
          this._characterAgents.set(agent.id, agent);
        }
        this._log("info", `Loaded ${agents.length} character agents`);
      }

      // Load user overrides
      const overrides = await this._storage.get("overrides");
      if (overrides && typeof overrides === "object") {
        for (const [characterId, override] of Object.entries(overrides)) {
          this._userOverrides.set(characterId, override);
        }
        this._log(
          "info",
          `Loaded ${Object.keys(overrides).length} user overrides`,
        );
      }

      // Load Character Director config
      const director = await this._storage.get("director");
      if (director) {
        this._characterDirector = director;
        this._log("info", "Loaded Character Director configuration");
      }

      // Rebuild positions from agents
      this._rebuildPositions();
    } catch (error) {
      this._log("error", "Failed to load persisted data:", error);
    }
  },

  /**
   * Save all data
   */
  async saveAll() {
    try {
      // Save character agents
      await this._storage.set(
        "agents",
        Array.from(this._characterAgents.values()),
      );

      // Save user overrides
      await this._storage.set(
        "overrides",
        Object.fromEntries(this._userOverrides),
      );

      // Save Character Director config
      if (this._characterDirector) {
        await this._storage.set("director", this._characterDirector);
      }

      this._log("info", "Saved all character data");
      return true;
    } catch (error) {
      this._log("error", "Failed to save data:", error);
      return false;
    }
  },

  // ===== CHARACTER DIRECTOR =====

  /**
   * Initialize the Character Director (static leader position)
   */
  _initializeCharacterDirector() {
    // Create default Character Director if not exists
    if (!this._characterDirector) {
      this._characterDirector = this._createDefaultCharacterDirector();
    }

    // Create Character Director position
    this._characterDirectorPosition = {
      id: "character_director",
      name: "Character Director",
      type: "character_director",
      tier: "leader",
      isMandatory: true,
      assignedAgentId: "character_director_agent",
      promptModifiers: {
        prefix: "",
        suffix: "",
        roleDescription:
          "You are the Character Director, responsible for managing how story characters are voiced and represented. You coordinate character agents, ensure voice consistency, and spawn character avatars as needed for scenes.",
      },
    };

    this._positions.set(
      this._characterDirectorPosition.id,
      this._characterDirectorPosition,
    );

    this._log("info", "Character Director initialized");
  },

  /**
   * Create default Character Director agent
   * @returns {Object} Character Director agent
   */
  _createDefaultCharacterDirector() {
    return {
      id: "character_director_agent",
      name: "Character Director",
      description:
        "Manages character voice consistency and coordinates character agent spawning",
      apiConfig: {
        useCurrentConnection: true,
        endpoint: "",
        apiKey: "",
        model: "",
        temperature: 0.7,
        maxTokens: 2000,
        topP: 1,
        frequencyPenalty: 0,
        presencePenalty: 0,
      },
      systemPrompt: {
        source: "custom",
        customText: `You are the Character Director of an editorial team. Your responsibilities include:

1. **Character Voice Management**: Ensure each character maintains a consistent, authentic voice based on their personality, background, and speech patterns.

2. **Character Spawning**: When requested, identify which characters should be active in a scene and coordinate their participation.

3. **Voice Guidance**: Provide guidance to character agents on how to embody their characters authentically.

4. **Consistency Checks**: Review character dialogue and actions for consistency with established characterization.

5. **Character Development**: Track how characters evolve throughout the story and adjust their representation accordingly.

Always prioritize authenticity to the source material and established character traits.`,
      },
      metadata: {
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isStatic: true,
      },
    };
  },

  /**
   * Get Character Director
   * @returns {Object} Character Director agent
   */
  getCharacterDirector() {
    return this._characterDirector;
  },

  /**
   * Update Character Director configuration
   * @param {Object} updates - Updates to apply
   * @returns {Object} Updated Character Director
   */
  updateCharacterDirector(updates) {
    if (!this._characterDirector) {
      this._initializeCharacterDirector();
    }

    this._characterDirector = {
      ...this._characterDirector,
      ...updates,
      id: "character_director_agent", // Cannot change ID
      metadata: {
        ...this._characterDirector.metadata,
        updatedAt: Date.now(),
        isStatic: true,
      },
    };

    this._emit("director:updated", { director: this._characterDirector });
    this.saveAll();

    return this._characterDirector;
  },

  // ===== CHARACTER AGENTS =====

  /**
   * Create a character agent from Curation data
   * @param {string} characterId - Character ID from Curation characterSheets
   * @param {Object} options - Additional options
   * @returns {Object} Created character agent
   */
  createCharacterAgent(characterId, options = {}) {
    // Check if already exists
    if (this._characterAgents.has(characterId)) {
      this._log("warn", `Character agent ${characterId} already exists`);
      return this._characterAgents.get(characterId);
    }

    // Get character data from Curation
    const characterData = this._getCharacterFromCuration(characterId);
    if (!characterData) {
      throw new Error(`Character ${characterId} not found in Curation system`);
    }

    // Get user overrides if any
    const userOverrides = this._userOverrides.get(characterId) || {};

    // Create the character agent
    const agent = this._buildCharacterAgent(
      characterData,
      userOverrides,
      options,
    );

    // Store agent
    this._characterAgents.set(agent.id, agent);

    // Create position for this character
    this._createCharacterPosition(agent);

    this._log("info", `Created character agent: ${agent.name}`);
    this._emit("agent:created", { agent });

    this.saveAll();

    return agent;
  },

  /**
   * Build a character agent from character data
   * @param {Object} characterData - Character data from Curation
   * @param {Object} userOverrides - User-provided agent overrides
   * @param {Object} options - Additional options
   * @returns {Object} Character agent
   */
  _buildCharacterAgent(characterData, userOverrides = {}, options = {}) {
    const characterId =
      characterData.id || characterData.name.toLowerCase().replace(/\s+/g, "_");
    const agentId = `char_${characterId}`;

    // Determine character type
    const characterType = this._resolveCharacterType(characterData);

    // Build the agent
    return {
      id: agentId,
      characterId: characterId,
      name: characterData.name,
      displayName: characterData.name,
      type: characterType,
      status: this.AgentStatus.INACTIVE,

      // API configuration (same pattern as other agents)
      apiConfig: {
        useCurrentConnection: true,
        endpoint: "",
        apiKey: "",
        model: "",
        temperature: 0.8, // Slightly higher for character creativity
        maxTokens: 1500,
        topP: 1,
        frequencyPenalty: 0.1,
        presencePenalty: 0.1,
        ...userOverrides.apiConfig,
      },

      // System prompt configuration
      systemPromptConfig: {
        // User overrides for prompt generation
        prefix: userOverrides.prefix || "",
        suffix: userOverrides.suffix || "",
        // Voicing guidance: use override if provided, else from character data
        voicingGuidance:
          userOverrides.voicingGuidance || characterData.voicingGuidance || "",
        // Whether to auto-generate prompt from character data
        autoGenerate: userOverrides.autoGenerate !== false,
      },

      // Reference to source character data
      characterDataRef: {
        source: "curation",
        storeId: "characterSheets",
        lastSynced: Date.now(),
      },

      // Cached character traits (from Curation at creation time)
      cachedTraits: {
        personality: characterData.personality || "",
        appearance: characterData.appearance || "",
        background: characterData.background || "",
        speechPatterns: characterData.speechPatterns || "",
        motivations: characterData.motivations || [],
        fears: characterData.fears || [],
        relationships: characterData.relationships || {},
        skills: characterData.skills || [],
        flaws: characterData.flaws || [],
        // New fields from enhanced schema
        voicingGuidance: characterData.voicingGuidance || "",
        mannerisms: characterData.mannerisms || [],
        catchphrases: characterData.catchphrases || [],
      },

      // Agent metadata
      metadata: {
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastSyncedFromCuration: Date.now(),
        ...options.metadata,
      },
    };
  },

  /**
   * Resolve character type from character data
   * @param {Object} characterData - Character data
   * @returns {string} Character type
   */
  _resolveCharacterType(characterData) {
    // Check if type is explicitly set
    if (characterData.type) {
      const typeMap = {
        main: this.CharacterType.MAIN_CAST,
        main_cast: this.CharacterType.MAIN_CAST,
        recurring: this.CharacterType.RECURRING_CAST,
        recurring_cast: this.CharacterType.RECURRING_CAST,
        supporting: this.CharacterType.SUPPORTING_CAST,
        supporting_cast: this.CharacterType.SUPPORTING_CAST,
        background: this.CharacterType.BACKGROUND,
        npc: this.CharacterType.BACKGROUND,
      };
      return (
        typeMap[characterData.type.toLowerCase()] ||
        this.CharacterType.SUPPORTING_CAST
      );
    }

    // Default to supporting cast if not specified
    return this.CharacterType.SUPPORTING_CAST;
  },

  /**
   * Create a position for a character agent
   * @param {Object} agent - Character agent
   */
  _createCharacterPosition(agent) {
    const position = {
      id: `pos_${agent.id}`,
      name: agent.name,
      displayName: agent.displayName,
      type: agent.type,
      tier: "member",
      assignedAgentId: agent.id,
      characterId: agent.characterId,
      promptModifiers: {
        prefix: "",
        suffix: "",
        roleDescription: `Character avatar for ${agent.name}`,
      },
      isMandatory: false,
      isCharacterPosition: true,
    };

    this._positions.set(position.id, position);
  },

  /**
   * Get a character agent
   * @param {string} agentId - Agent ID
   * @returns {Object|null} Character agent
   */
  getCharacterAgent(agentId) {
    return this._characterAgents.get(agentId) || null;
  },

  /**
   * Get character agent by character ID
   * @param {string} characterId - Character ID from Curation
   * @returns {Object|null} Character agent
   */
  getAgentByCharacterId(characterId) {
    const agentId = `char_${characterId}`;
    return this._characterAgents.get(agentId) || null;
  },

  /**
   * Get all character agents
   * @returns {Object[]} Array of character agents
   */
  getAllCharacterAgents() {
    return Array.from(this._characterAgents.values());
  },

  /**
   * Get character agents by type
   * @param {string} type - Character type
   * @returns {Object[]} Character agents of that type
   */
  getAgentsByType(type) {
    return this.getAllCharacterAgents().filter((agent) => agent.type === type);
  },

  /**
   * Update a character agent
   * @param {string} agentId - Agent ID
   * @param {Object} updates - Updates to apply
   * @returns {Object} Updated agent
   */
  updateCharacterAgent(agentId, updates) {
    const agent = this._characterAgents.get(agentId);
    if (!agent) {
      throw new Error(`Character agent ${agentId} not found`);
    }

    // Merge updates (but protect certain fields)
    const updated = {
      ...agent,
      ...updates,
      id: agent.id, // Cannot change ID
      characterId: agent.characterId, // Cannot change character reference
      metadata: {
        ...agent.metadata,
        updatedAt: Date.now(),
      },
    };

    this._characterAgents.set(agentId, updated);

    // Update user overrides for persistence
    this._userOverrides.set(agent.characterId, {
      apiConfig: updated.apiConfig,
      prefix: updated.systemPromptConfig?.prefix,
      suffix: updated.systemPromptConfig?.suffix,
      voicingGuidance: updated.systemPromptConfig?.voicingGuidance,
      autoGenerate: updated.systemPromptConfig?.autoGenerate,
    });

    this._emit("agent:updated", { agent: updated });
    this.saveAll();

    return updated;
  },

  /**
   * Delete a character agent
   * @param {string} agentId - Agent ID
   * @returns {boolean} Success
   */
  deleteCharacterAgent(agentId) {
    const agent = this._characterAgents.get(agentId);
    if (!agent) {
      return false;
    }

    // Remove agent
    this._characterAgents.delete(agentId);

    // Remove position
    const positionId = `pos_${agentId}`;
    this._positions.delete(positionId);

    // Remove from spawned if present
    this._spawnedAgents.delete(agentId);

    // Note: We don't remove user overrides - they persist for re-creation

    this._log("info", `Deleted character agent: ${agent.name}`);
    this._emit("agent:deleted", { agentId, agent });

    this.saveAll();

    return true;
  },

  /**
   * Sync character agent with latest Curation data
   * @param {string} agentId - Agent ID
   * @returns {Object} Updated agent
   */
  syncWithCuration(agentId) {
    const agent = this._characterAgents.get(agentId);
    if (!agent) {
      throw new Error(`Character agent ${agentId} not found`);
    }

    // Get fresh data from Curation
    const characterData = this._getCharacterFromCuration(agent.characterId);
    if (!characterData) {
      this._log(
        "warn",
        `Character ${agent.characterId} not found in Curation, skipping sync`,
      );
      return agent;
    }

    // Update cached traits
    agent.cachedTraits = {
      personality: characterData.personality || "",
      appearance: characterData.appearance || "",
      background: characterData.background || "",
      speechPatterns: characterData.speechPatterns || "",
      motivations: characterData.motivations || "",
      fears: characterData.fears || "",
      relationships: characterData.relationships || [],
      skills: characterData.skills || [],
      flaws: characterData.flaws || [],
    };

    // Update type if changed
    agent.type = this._resolveCharacterType(characterData);

    // Update metadata
    agent.metadata.lastSyncedFromCuration = Date.now();
    agent.metadata.updatedAt = Date.now();

    this._characterAgents.set(agentId, agent);
    this._emit("agent:synced", { agent });

    this.saveAll();

    return agent;
  },

  /**
   * Sync all character agents with Curation
   */
  syncAllWithCuration() {
    for (const agentId of this._characterAgents.keys()) {
      try {
        this.syncWithCuration(agentId);
      } catch (error) {
        this._log("error", `Failed to sync ${agentId}:`, error);
      }
    }
    this._emit("agents:syncedAll");
  },

  // ===== SYSTEM PROMPT GENERATION =====

  /**
   * Generate the full system prompt for a character agent
   * @param {string} agentId - Agent ID
   * @returns {string} Generated system prompt
   */
  generateSystemPrompt(agentId) {
    const agent = this._characterAgents.get(agentId);
    if (!agent) {
      throw new Error(`Character agent ${agentId} not found`);
    }

    const config = agent.systemPromptConfig || {};

    // If auto-generate is disabled, return just the overrides
    if (!config.autoGenerate) {
      return [config.prefix, config.voicingGuidance, config.suffix]
        .filter(Boolean)
        .join("\n\n");
    }

    // Build the auto-generated prompt
    const parts = [];

    // User prefix
    if (config.prefix) {
      parts.push(config.prefix);
    }

    // Core identity
    parts.push(
      `You are ${agent.name}. You embody this character and speak as them, staying true to their personality and voice.`,
    );

    // Character traits
    const traits = agent.cachedTraits;

    if (traits.personality) {
      parts.push(`**Personality:** ${traits.personality}`);
    }

    if (traits.background) {
      parts.push(`**Background:** ${traits.background}`);
    }

    if (traits.speechPatterns) {
      parts.push(`**Speech Patterns:** ${traits.speechPatterns}`);
    }

    if (traits.motivations) {
      parts.push(`**Motivations:** ${traits.motivations}`);
    }

    if (traits.fears) {
      parts.push(`**Fears:** ${traits.fears}`);
    }

    if (traits.flaws && traits.flaws.length > 0) {
      const flawsStr = Array.isArray(traits.flaws)
        ? traits.flaws.join(", ")
        : traits.flaws;
      parts.push(`**Flaws:** ${flawsStr}`);
    }

    if (traits.relationships && Object.keys(traits.relationships).length > 0) {
      const relStr =
        typeof traits.relationships === "object" &&
        !Array.isArray(traits.relationships)
          ? Object.entries(traits.relationships)
              .map(([name, rel]) => `${name}: ${rel}`)
              .join("; ")
          : Array.isArray(traits.relationships)
            ? traits.relationships
                .map((r) =>
                  typeof r === "object" ? `${r.name}: ${r.relationship}` : r,
                )
                .join("; ")
            : traits.relationships;
      parts.push(`**Key Relationships:** ${relStr}`);
    }

    // Mannerisms (new field)
    if (traits.mannerisms && traits.mannerisms.length > 0) {
      const mannerismsStr = Array.isArray(traits.mannerisms)
        ? traits.mannerisms.join(", ")
        : traits.mannerisms;
      parts.push(`**Mannerisms:** ${mannerismsStr}`);
    }

    // Catchphrases (new field)
    if (traits.catchphrases && traits.catchphrases.length > 0) {
      const catchphrasesStr = Array.isArray(traits.catchphrases)
        ? traits.catchphrases.map((p) => `"${p}"`).join(", ")
        : traits.catchphrases;
      parts.push(`**Catchphrases:** ${catchphrasesStr}`);
    }

    // Voicing guidance (from character data or user-provided)
    const voicingGuidance =
      config.voicingGuidance || traits.voicingGuidance || "";
    if (voicingGuidance) {
      parts.push(`**Voicing Guidance:** ${voicingGuidance}`);
    }

    // Core instruction
    parts.push(
      `\nWhen responding, stay in character. Your dialogue, thoughts, and actions should reflect ${agent.name}'s personality, speech patterns, and current emotional state.`,
    );

    // User suffix
    if (config.suffix) {
      parts.push(config.suffix);
    }

    return parts.join("\n\n");
  },

  // ===== CURATION INTEGRATION =====

  /**
   * Get character data from Curation system
   * @param {string} characterId - Character ID
   * @returns {Object|null} Character data
   */
  _getCharacterFromCuration(characterId) {
    if (!this._curationSystem) {
      this._log("warn", "Curation system not available");
      return null;
    }

    try {
      // Try to read from characterSheets store
      const result = this._curationSystem.read("characterSheets", {
        id: characterId,
      });

      if (result) {
        return result;
      }

      // Try by name as fallback
      const allCharacters = this._curationSystem.getAll("characterSheets");
      if (Array.isArray(allCharacters)) {
        return allCharacters.find(
          (c) => c.id === characterId || c.name === characterId,
        );
      }

      return null;
    } catch (error) {
      this._log(
        "error",
        `Failed to get character ${characterId} from Curation:`,
        error,
      );
      return null;
    }
  },

  /**
   * Get all characters from Curation
   * @returns {Object[]} All characters
   */
  getAllCharactersFromCuration() {
    if (!this._curationSystem) {
      this._log("warn", "Curation system not available");
      return [];
    }

    try {
      const characters = this._curationSystem.getAll("characterSheets");
      return Array.isArray(characters) ? characters : [];
    } catch (error) {
      this._log("error", "Failed to get characters from Curation:", error);
      return [];
    }
  },

  /**
   * Get comprehensive character context using RAG pipeline
   * @param {string} characterName - Character name or ID
   * @param {Object} options - Options
   * @param {boolean} options.includeDialogue - Include dialogue samples
   * @param {boolean} options.includeDevelopment - Include development history
   * @returns {Promise<Object>} Character context
   */
  async getCharacterContext(characterName, options = {}) {
    if (!this._curationSystem) {
      this._log("warn", "Curation system not available for context fetch");
      return null;
    }

    const { includeDialogue = true, includeDevelopment = true } = options;

    try {
      // Try to use the character_context RAG pipeline
      const ragResult = await this._curationSystem.executeRAG(
        "character_context",
        {
          characterName,
          includeDialogue,
          includeDevelopment,
        },
      );

      if (ragResult?.results?.length > 0) {
        return {
          source: "rag_pipeline",
          characterName,
          context: ragResult.results.map((r) => r.text || r.content).join("\n"),
          results: ragResult.results,
          timestamp: Date.now(),
        };
      }
    } catch (error) {
      this._log(
        "debug",
        `RAG pipeline fetch failed, using fallback: ${error.message}`,
      );
    }

    // Fallback: manually gather context from stores
    try {
      const character = this._getCharacterFromCuration(characterName);
      if (!character) {
        return null;
      }

      const context = {
        source: "manual",
        characterName: character.name,
        character,
        development: null,
        recentDialogue: [],
        timestamp: Date.now(),
      };

      // Get character development
      if (includeDevelopment) {
        try {
          const development = this._curationSystem.read(
            "characterDevelopment",
            { characterId: character.id },
          );
          context.development = development;
        } catch (e) {
          // Development not found
        }
      }

      // Get recent dialogue
      if (includeDialogue) {
        try {
          const allDialogue = this._curationSystem.getAll("dialogueHistory");
          if (Array.isArray(allDialogue)) {
            context.recentDialogue = allDialogue
              .filter((d) => d.speaker === character.name)
              .slice(-10);
          }
        } catch (e) {
          // Dialogue not found
        }
      }

      return context;
    } catch (error) {
      this._log(
        "error",
        `Failed to get character context for ${characterName}:`,
        error,
      );
      return null;
    }
  },

  /**
   * Get character voice reference using RAG pipeline
   * @param {string} characterName - Character name
   * @param {number} sampleCount - Number of dialogue samples
   * @returns {Promise<Object>} Voice reference data
   */
  async getCharacterVoiceReference(characterName, sampleCount = 10) {
    if (!this._curationSystem) {
      return null;
    }

    try {
      const ragResult = await this._curationSystem.executeRAG(
        "character_voice",
        {
          characterName,
          sampleCount,
        },
      );

      return ragResult;
    } catch (error) {
      this._log("debug", `Voice reference RAG failed: ${error.message}`);

      // Fallback: build basic voice profile from character data
      const character = this._getCharacterFromCuration(characterName);
      if (!character) {
        return null;
      }

      return {
        source: "fallback",
        characterName,
        voiceProfile: {
          speechPatterns: character.speechPatterns || "",
          mannerisms: character.mannerisms || [],
          catchphrases: character.catchphrases || [],
        },
        guidelines: character.voicingGuidance || "",
      };
    }
  },

  /**
   * Get characters relevant to a scene using RAG pipeline
   * @param {string} sceneContext - Scene description or context
   * @param {Object} options - Options
   * @returns {Promise<Object[]>} Relevant characters
   */
  async getSceneCharacters(sceneContext, options = {}) {
    if (!this._curationSystem) {
      return [];
    }

    try {
      const ragResult = await this._curationSystem.executeRAG(
        "scene_characters",
        {
          sceneContext,
          location: options.location || "",
          plotLines: options.plotLines || [],
        },
      );

      if (ragResult?.results?.length > 0) {
        // Extract character names/IDs from results
        const characterNames = [];
        for (const result of ragResult.results) {
          if (result.name) characterNames.push(result.name);
          if (result.id) characterNames.push(result.id);
        }

        // Return full character data
        return characterNames
          .map((name) => this._getCharacterFromCuration(name))
          .filter(Boolean);
      }
    } catch (error) {
      this._log("debug", `Scene characters RAG failed: ${error.message}`);
    }

    // Fallback: return main cast and present characters
    const allCharacters = this.getAllCharactersFromCuration();
    return allCharacters.filter(
      (c) =>
        c.isPresent !== false &&
        (c.type === "main" ||
          c.type === "main_cast" ||
          c.type === "recurring" ||
          c.type === "recurring_cast"),
    );
  },

  /**
   * Create agents for all characters in Curation
   * @param {Object} options - Options
   * @returns {Object[]} Created agents
   */
  createAgentsFromCuration(options = {}) {
    const characters = this.getAllCharactersFromCuration();
    const created = [];

    for (const character of characters) {
      const characterId =
        character.id || character.name.toLowerCase().replace(/\s+/g, "_");

      // Skip if already exists and not forcing
      if (this.getAgentByCharacterId(characterId) && !options.overwrite) {
        continue;
      }

      try {
        const agent = this.createCharacterAgent(characterId, options);
        created.push(agent);
      } catch (error) {
        this._log(
          "error",
          `Failed to create agent for ${character.name}:`,
          error,
        );
      }
    }

    this._log(
      "info",
      `Created ${created.length} character agents from Curation`,
    );
    return created;
  },

  // ===== DYNAMIC SPAWNING =====

  /**
   * Spawn character agents for a scene
   * Called by Character Director when dynamic_characters participation is triggered
   * @param {string[]} characterIds - Character IDs to spawn
   * @param {Object} options - Spawning options
   * @returns {Object[]} Spawned agents
   */
  spawnForScene(characterIds, options = {}) {
    const spawned = [];

    for (const characterId of characterIds) {
      let agent = this.getAgentByCharacterId(characterId);

      // Create agent if doesn't exist
      if (!agent) {
        try {
          agent = this.createCharacterAgent(characterId, {
            ...options,
            metadata: { autoSpawned: true },
          });
        } catch (error) {
          this._log(
            "warn",
            `Could not create agent for ${characterId}:`,
            error.message,
          );
          continue;
        }
      }

      // Mark as spawned
      agent.status = this.AgentStatus.SPAWNED;
      this._characterAgents.set(agent.id, agent);
      this._spawnedAgents.add(agent.id);

      spawned.push(agent);
    }

    this._log("info", `Spawned ${spawned.length} character agents for scene`);
    this._emit("agents:spawned", { agents: spawned, characterIds });

    return spawned;
  },

  /**
   * Despawn all scene characters
   */
  despawnAll() {
    for (const agentId of this._spawnedAgents) {
      const agent = this._characterAgents.get(agentId);
      if (agent) {
        agent.status = this.AgentStatus.INACTIVE;
        this._characterAgents.set(agentId, agent);
      }
    }

    const count = this._spawnedAgents.size;
    this._spawnedAgents.clear();

    this._log("info", `Despawned ${count} character agents`);
    this._emit("agents:despawned", { count });
  },

  /**
   * Get currently spawned agents
   * @returns {Object[]} Spawned agents
   */
  getSpawnedAgents() {
    return Array.from(this._spawnedAgents)
      .map((id) => this._characterAgents.get(id))
      .filter(Boolean);
  },

  // ===== POSITIONS =====

  /**
   * Get all positions
   * @returns {Object[]} All positions
   */
  getAllPositions() {
    return Array.from(this._positions.values());
  },

  /**
   * Get position by ID
   * @param {string} positionId - Position ID
   * @returns {Object|null} Position
   */
  getPosition(positionId) {
    return this._positions.get(positionId) || null;
  },

  /**
   * Get positions by character type
   * @param {string} type - Character type
   * @returns {Object[]} Positions of that type
   */
  getPositionsByType(type) {
    return this.getAllPositions().filter((pos) => pos.type === type);
  },

  /**
   * Rebuild positions from agents
   */
  _rebuildPositions() {
    // Keep Character Director position
    const directorPos = this._characterDirectorPosition;

    // Clear and rebuild
    this._positions.clear();

    if (directorPos) {
      this._positions.set(directorPos.id, directorPos);
    }

    // Rebuild from agents
    for (const agent of this._characterAgents.values()) {
      this._createCharacterPosition(agent);
    }
  },

  // ===== USER OVERRIDES =====

  /**
   * Set user overrides for a character
   * @param {string} characterId - Character ID
   * @param {Object} overrides - Override settings
   */
  setUserOverrides(characterId, overrides) {
    this._userOverrides.set(characterId, {
      ...this._userOverrides.get(characterId),
      ...overrides,
    });

    // If agent exists, apply overrides
    const agent = this.getAgentByCharacterId(characterId);
    if (agent) {
      this.updateCharacterAgent(agent.id, {
        apiConfig: { ...agent.apiConfig, ...overrides.apiConfig },
        systemPromptConfig: {
          ...agent.systemPromptConfig,
          prefix: overrides.prefix ?? agent.systemPromptConfig?.prefix,
          suffix: overrides.suffix ?? agent.systemPromptConfig?.suffix,
          voicingGuidance:
            overrides.voicingGuidance ??
            agent.systemPromptConfig?.voicingGuidance,
          autoGenerate:
            overrides.autoGenerate ?? agent.systemPromptConfig?.autoGenerate,
        },
      });
    }

    this._emit("overrides:updated", { characterId, overrides });
    this.saveAll();
  },

  /**
   * Get user overrides for a character
   * @param {string} characterId - Character ID
   * @returns {Object} User overrides
   */
  getUserOverrides(characterId) {
    return this._userOverrides.get(characterId) || {};
  },

  /**
   * Clear user overrides for a character
   * @param {string} characterId - Character ID
   */
  clearUserOverrides(characterId) {
    this._userOverrides.delete(characterId);
    this._emit("overrides:cleared", { characterId });
    this.saveAll();
  },

  // ===== PIPELINE INTEGRATION =====

  /**
   * Get participants for pipeline action
   * Returns character agents that should participate
   * @param {Object} config - Participation config
   * @returns {Object[]} Participants array
   */
  getParticipants(config = {}) {
    const participants = [];

    // Include Character Director if requested
    if (config.includeDirector) {
      participants.push({
        position: this._characterDirectorPosition,
        agent: this._characterDirector,
        isDirector: true,
      });
    }

    // Get character agents based on config
    let agents = [];

    if (config.characterIds && config.characterIds.length > 0) {
      // Specific characters requested
      agents = config.characterIds
        .map((id) => this.getAgentByCharacterId(id))
        .filter(Boolean);
    } else if (config.types && config.types.length > 0) {
      // By type
      for (const type of config.types) {
        agents.push(...this.getAgentsByType(type));
      }
    } else if (config.spawnedOnly) {
      // Only spawned agents
      agents = this.getSpawnedAgents();
    } else if (config.activeOnly) {
      // All active agents
      agents = this.getAllCharacterAgents().filter(
        (a) =>
          a.status === this.AgentStatus.ACTIVE ||
          a.status === this.AgentStatus.SPAWNED,
      );
    }

    // Add character agents as participants
    for (const agent of agents) {
      const position = this._positions.get(`pos_${agent.id}`);
      if (position) {
        participants.push({
          position,
          agent,
          isDirector: false,
        });
      }
    }

    return participants;
  },

  /**
   * Resolve agent for a position (for pipeline integration)
   * @param {string} positionId - Position ID
   * @returns {Object|null} Agent and position
   */
  resolvePositionAgent(positionId) {
    const position = this._positions.get(positionId);
    if (!position) {
      return null;
    }

    let agent;
    if (position.id === "character_director") {
      agent = this._characterDirector;
    } else {
      agent = this._characterAgents.get(position.assignedAgentId);
    }

    if (!agent) {
      return null;
    }

    return {
      position,
      agent,
      systemPrompt:
        position.id === "character_director"
          ? agent.systemPrompt?.customText
          : this.generateSystemPrompt(agent.id),
    };
  },

  // ===== EXPORT / IMPORT =====

  /**
   * Export all character system data
   * @returns {Object} Export data
   */
  export() {
    return {
      version: this.VERSION,
      exportedAt: Date.now(),
      characterDirector: this._characterDirector,
      characterAgents: Array.from(this._characterAgents.values()),
      userOverrides: Object.fromEntries(this._userOverrides),
    };
  },

  /**
   * Import character system data
   * @param {Object} data - Import data
   * @param {Object} options - Import options
   */
  import(data, options = {}) {
    const { merge = false, clearExisting = true } = options;

    if (clearExisting && !merge) {
      this.clear();
      this._initializeCharacterDirector();
    }

    // Import Character Director
    if (data.characterDirector) {
      this._characterDirector = {
        ...this._createDefaultCharacterDirector(),
        ...data.characterDirector,
        id: "character_director_agent",
        metadata: {
          ...data.characterDirector.metadata,
          importedAt: Date.now(),
        },
      };
    }

    // Import character agents
    if (data.characterAgents && Array.isArray(data.characterAgents)) {
      for (const agent of data.characterAgents) {
        if (merge && this._characterAgents.has(agent.id)) {
          // Merge with existing
          const existing = this._characterAgents.get(agent.id);
          this._characterAgents.set(agent.id, {
            ...existing,
            ...agent,
            id: existing.id,
            metadata: {
              ...existing.metadata,
              ...agent.metadata,
              importedAt: Date.now(),
            },
          });
        } else {
          // Add new
          this._characterAgents.set(agent.id, {
            ...agent,
            metadata: {
              ...agent.metadata,
              importedAt: Date.now(),
            },
          });
        }
      }
    }

    // Import user overrides
    if (data.userOverrides) {
      for (const [characterId, overrides] of Object.entries(
        data.userOverrides,
      )) {
        if (merge) {
          this._userOverrides.set(characterId, {
            ...this._userOverrides.get(characterId),
            ...overrides,
          });
        } else {
          this._userOverrides.set(characterId, overrides);
        }
      }
    }

    // Rebuild positions
    this._rebuildPositions();

    this._log(
      "info",
      `Imported ${data.characterAgents?.length || 0} character agents`,
    );
    this._emit("system:imported", { data, options });

    this.saveAll();
  },

  // ===== SUMMARY =====

  /**
   * Get system summary
   * @returns {Object} Summary
   */
  getSummary() {
    const agents = this.getAllCharacterAgents();
    const spawned = this.getSpawnedAgents();

    const byType = {};
    for (const type of Object.values(this.CharacterType)) {
      byType[type] = agents.filter((a) => a.type === type).length;
    }

    const byStatus = {};
    for (const status of Object.values(this.AgentStatus)) {
      byStatus[status] = agents.filter((a) => a.status === status).length;
    }

    return {
      version: this.VERSION,
      initialized: this._initialized,
      characterDirector: {
        configured: !!this._characterDirector,
        name: this._characterDirector?.name,
      },
      counts: {
        totalAgents: agents.length,
        spawnedAgents: spawned.length,
        positions: this._positions.size,
        userOverrides: this._userOverrides.size,
      },
      byType,
      byStatus,
      curationConnected: !!this._curationSystem,
    };
  },

  // ===== EVENTS =====

  /**
   * Subscribe to an event
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  on(event, callback) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, []);
    }
    this._listeners.get(event).push(callback);
  },

  /**
   * Unsubscribe from an event
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  off(event, callback) {
    const listeners = this._listeners.get(event);
    if (listeners) {
      const idx = listeners.indexOf(callback);
      if (idx !== -1) {
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
        } catch (error) {
          this._log("error", `Error in event listener for ${event}:`, error);
        }
      }
    }
  },

  // ===== LOGGING =====

  /**
   * Log a message
   * @param {string} level - Log level
   * @param {string} message - Message
   * @param  {...any} args - Additional arguments
   */
  _log(level, message, ...args) {
    const prefix = "[CharacterSystem]";

    if (this._logger && typeof this._logger[level] === "function") {
      this._logger[level](prefix, message, ...args);
    } else {
      const consoleFn =
        level === "error"
          ? console.error
          : level === "warn"
            ? console.warn
            : level === "debug"
              ? console.debug
              : console.log;
      consoleFn(prefix, message, ...args);
    }
  },
};

// ===== MODULE EXPORT =====
if (typeof window !== "undefined") {
  window.CharacterSystem = CharacterSystem;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = CharacterSystem;
}
