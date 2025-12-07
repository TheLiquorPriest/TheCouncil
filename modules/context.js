// modules/context.js - RAG System for The Council
// Handles context retrieval, processing, indexing, and routing

const CouncilContext = {
  // ===== STATE =====
  _rawContext: null,
  _processedContext: null,
  _indexes: null,
  _relevanceCache: new Map(),

  // ===== INITIALIZATION =====
  init() {
    this._rawContext = null;
    this._processedContext = null;
    this._indexes = this.getEmptyIndexes();
    this._relevanceCache.clear();
  },

  getEmptyIndexes() {
    return {
      entities: {
        characters: new Map(),
        locations: new Map(),
        factions: new Map(),
        items: new Map(),
      },
      timeline: [],
      relationships: new Map(),
      topics: new Map(),
      keywords: new Map(),
    };
  },

  // ===== CONTEXT RETRIEVAL FROM SILLYTAVERN =====

  /**
   * Retrieve all available context from SillyTavern
   */
  retrieveFromST() {
    const context = SillyTavern.getContext();

    this._rawContext = {
      // Chat data
      chat: context.chat || [],
      chatId: context.chatId,
      chatMetadata: context.chatMetadata || {},

      // Character data
      characterCard: this.extractCharacterCard(context),
      allCharacters: this.extractAllCharacters(context),

      // World info
      worldInfo: context.worldInfo || [],

      // User info
      userName: context.name1,
      characterName: context.name2,

      // Group info (if applicable)
      groupId: context.groupId,
      groups: context.groups || [],

      // Timestamps
      retrievedAt: Date.now(),
    };

    return this._rawContext;
  },

  /**
   * Extract character card data
   */
  extractCharacterCard(context) {
    const charId = context.characterId;
    const char = context.characters?.[charId] || {};

    return {
      name: context.name2 || char.name || "Unknown",
      description: char.description || "",
      personality: char.personality || "",
      scenario: char.scenario || "",
      firstMessage: char.first_mes || "",
      messageExamples: char.mes_example || "",
      systemPrompt: char.system_prompt || "",
      postHistoryInstructions: char.post_history_instructions || "",
      creatorNotes: char.creator_notes || "",
      tags: char.tags || [],
      avatar: char.avatar || "",
    };
  },

  /**
   * Extract all character data (for group chats)
   */
  extractAllCharacters(context) {
    const characters = {};
    if (context.characters) {
      for (const [id, char] of Object.entries(context.characters)) {
        characters[id] = {
          name: char.name || "Unknown",
          description: char.description || "",
          personality: char.personality || "",
          avatar: char.avatar || "",
        };
      }
    }
    return characters;
  },

  // ===== CONTEXT PROCESSING =====

  /**
   * Process raw context into structured, indexed format
   */
  process(stores = null) {
    if (!this._rawContext) {
      this.retrieveFromST();
    }

    this._processedContext = {
      // Formatted sources
      formattedChat: this.formatChatHistory(this._rawContext.chat),
      formattedWorldInfo: this.formatWorldInfo(this._rawContext.worldInfo),
      formattedCharacter: this.formatCharacterCard(
        this._rawContext.characterCard,
      ),

      // Extracted entities
      entities: this.extractEntities(),

      // Timeline
      timeline: this.buildTimeline(),

      // Relationships
      relationships: this.extractRelationships(),

      // Store data (if provided)
      storeData: stores ? this.integrateStores(stores) : null,

      // Metadata
      processedAt: Date.now(),
      tokenEstimates: {},
    };

    // Build indexes
    this.buildIndexes();

    // Estimate tokens
    this._processedContext.tokenEstimates = this.estimateTokens();

    return this._processedContext;
  },

  // ===== FORMATTING FUNCTIONS =====

  /**
   * Format chat history for context
   */
  formatChatHistory(chat, options = {}) {
    const {
      maxMessages = 50,
      includeSystem = false,
      format = "standard", // standard, compact, detailed
    } = options;

    if (!chat || chat.length === 0) {
      return {
        formatted: "No chat history.",
        messages: [],
        speakers: new Set(),
      };
    }

    const messages = chat.slice(-maxMessages);
    const speakers = new Set();
    const formatted = [];

    for (const msg of messages) {
      if (!includeSystem && msg.is_system) continue;

      const speaker = msg.is_user ? this._rawContext.userName : msg.name;
      speakers.add(speaker);

      switch (format) {
        case "compact":
          formatted.push(
            `${speaker}: ${msg.mes.substring(0, 200)}${msg.mes.length > 200 ? "..." : ""}`,
          );
          break;
        case "detailed":
          formatted.push({
            speaker,
            content: msg.mes,
            isUser: msg.is_user,
            timestamp: msg.send_date,
            swipeId: msg.swipe_id,
          });
          break;
        default:
          formatted.push(`${speaker}: ${msg.mes}`);
      }
    }

    return {
      formatted:
        Array.isArray(formatted) && typeof formatted[0] === "string"
          ? formatted.join("\n\n")
          : formatted,
      messages,
      speakers,
      messageCount: messages.length,
      totalCount: chat.length,
    };
  },

  /**
   * Format world info entries
   */
  formatWorldInfo(worldInfo, options = {}) {
    const { includeDisabled = false, groupByType = true } = options;

    if (!worldInfo || worldInfo.length === 0) {
      return { formatted: "No world info available.", entries: [], byType: {} };
    }

    const entries = worldInfo.filter((entry) => {
      if (!entry.content) return false;
      if (!includeDisabled && entry.disable) return false;
      return true;
    });

    const byType = {};
    const formatted = [];

    for (const entry of entries) {
      const type = entry.comment?.toLowerCase().includes("character")
        ? "character"
        : entry.comment?.toLowerCase().includes("location")
          ? "location"
          : entry.comment?.toLowerCase().includes("faction")
            ? "faction"
            : entry.comment?.toLowerCase().includes("lore")
              ? "lore"
              : "general";

      if (!byType[type]) byType[type] = [];
      byType[type].push(entry);

      const header = entry.comment || entry.key?.join(", ") || "Entry";
      formatted.push(`[${header}]:\n${entry.content}`);
    }

    return {
      formatted: formatted.join("\n\n---\n\n"),
      entries,
      byType,
      entryCount: entries.length,
      totalCount: worldInfo.length,
    };
  },

  /**
   * Format character card
   */
  formatCharacterCard(card) {
    if (!card) return { formatted: "No character data.", sections: {} };

    const sections = {};
    const formatted = [];

    if (card.name) {
      sections.name = card.name;
      formatted.push(`# ${card.name}`);
    }

    if (card.description) {
      sections.description = card.description;
      formatted.push(`## Description\n${card.description}`);
    }

    if (card.personality) {
      sections.personality = card.personality;
      formatted.push(`## Personality\n${card.personality}`);
    }

    if (card.scenario) {
      sections.scenario = card.scenario;
      formatted.push(`## Scenario\n${card.scenario}`);
    }

    if (card.systemPrompt) {
      sections.systemPrompt = card.systemPrompt;
      formatted.push(`## System Instructions\n${card.systemPrompt}`);
    }

    return {
      formatted: formatted.join("\n\n"),
      sections,
      hasContent: formatted.length > 1,
    };
  },

  // ===== ENTITY EXTRACTION =====

  /**
   * Extract entities from all context sources
   */
  extractEntities() {
    const entities = {
      characters: new Map(),
      locations: new Map(),
      factions: new Map(),
      items: new Map(),
      events: [],
    };

    // Extract from world info
    if (this._rawContext.worldInfo) {
      for (const entry of this._rawContext.worldInfo) {
        this.extractEntitiesFromText(entry.content, entry.comment, entities);
      }
    }

    // Extract from character card
    if (this._rawContext.characterCard) {
      const card = this._rawContext.characterCard;
      entities.characters.set(card.name.toLowerCase(), {
        name: card.name,
        type: "main",
        description: card.description,
        source: "character_card",
      });

      this.extractEntitiesFromText(
        card.description,
        "character_card",
        entities,
      );
      this.extractEntitiesFromText(card.scenario, "scenario", entities);
    }

    // Extract from chat
    if (this._rawContext.chat) {
      for (const msg of this._rawContext.chat.slice(-20)) {
        this.extractEntitiesFromText(msg.mes, "chat", entities);
      }
    }

    return entities;
  },

  /**
   * Extract entities from a text block
   */
  extractEntitiesFromText(text, source, entities) {
    if (!text) return;

    // Simple pattern-based extraction
    // In production, this could use NER or more sophisticated methods

    // Names (capitalized words that appear multiple times)
    const namePattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/g;
    const names = text.match(namePattern) || [];
    const nameCounts = {};
    for (const name of names) {
      nameCounts[name] = (nameCounts[name] || 0) + 1;
    }

    // Location indicators
    const locationPatterns = [
      /(?:in|at|to|from)\s+(?:the\s+)?([A-Z][a-zA-Z\s]+?)(?:\.|,|;|\s+(?:where|which|that))/g,
      /(?:called|named)\s+(?:the\s+)?([A-Z][a-zA-Z\s]+?)(?:\.|,|;)/g,
    ];

    for (const pattern of locationPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const location = match[1].trim();
        if (location.length > 2 && location.length < 50) {
          if (!entities.locations.has(location.toLowerCase())) {
            entities.locations.set(location.toLowerCase(), {
              name: location,
              source,
              mentions: 1,
            });
          } else {
            entities.locations.get(location.toLowerCase()).mentions++;
          }
        }
      }
    }

    return entities;
  },

  // ===== TIMELINE BUILDING =====

  /**
   * Build a timeline from chat and story events
   */
  buildTimeline() {
    const timeline = [];

    if (this._rawContext.chat) {
      for (let i = 0; i < this._rawContext.chat.length; i++) {
        const msg = this._rawContext.chat[i];
        timeline.push({
          index: i,
          type: msg.is_user ? "user_message" : "character_message",
          speaker: msg.is_user ? this._rawContext.userName : msg.name,
          summary:
            msg.mes.substring(0, 100) + (msg.mes.length > 100 ? "..." : ""),
          timestamp: msg.send_date,
          fullContent: msg.mes,
        });
      }
    }

    return timeline;
  },

  // ===== RELATIONSHIP EXTRACTION =====

  /**
   * Extract relationships between entities
   */
  extractRelationships() {
    const relationships = new Map();

    // Character to character relationships
    if (this._rawContext.characterCard?.description) {
      // Simple extraction - look for relationship keywords
      const text = this._rawContext.characterCard.description;
      const relationshipPatterns = [
        /(\w+)\s+(?:is|are)\s+(?:the\s+)?(\w+)\s+of\s+(\w+)/gi,
        /(\w+)'s\s+(\w+)/gi,
      ];

      for (const pattern of relationshipPatterns) {
        let match;
        while ((match = pattern.exec(text)) !== null) {
          const key = `${match[1].toLowerCase()}_${match[3]?.toLowerCase() || "unknown"}`;
          if (!relationships.has(key)) {
            relationships.set(key, {
              entity1: match[1],
              relationship: match[2],
              entity2: match[3] || "unknown",
              source: "character_card",
            });
          }
        }
      }
    }

    return relationships;
  },

  // ===== STORE INTEGRATION =====

  /**
   * Integrate persistent store data into context
   */
  integrateStores(stores) {
    if (!stores) return null;

    return {
      // Story state
      currentSituation: stores.get("currentSituation"),
      storySynopsis: stores.get("storySynopsis"),
      storyOutline: stores.get("storyOutline"),

      // Plot data
      plotLines: stores.get("plotLines"),
      activePlots: stores.getActivePlotLines?.() || [],

      // Scene data
      scenes: stores.get("scenes"),
      currentScene: stores.getCurrentScene?.(),
      recentScenes: stores.getRecentScenes?.(5) || [],

      // Character data
      characters: stores.get("characterSheets"),
      presentCharacters: stores.getPresentCharacters?.() || [],
      characterDevelopment: stores.get("characterDevelopment"),
      characterPositions: stores.get("characterPositions"),
      characterInventory: stores.get("characterInventory"),

      // World data
      locations: stores.get("locationSheets"),
      factions: stores.get("factionSheets"),

      // Dialogue
      recentDialogue: stores.getRecentDialogue?.(20) || [],

      // Meta
      summary: stores.getSummary?.() || {},
    };
  },

  // ===== INDEX BUILDING =====

  /**
   * Build searchable indexes
   */
  buildIndexes() {
    this._indexes = this.getEmptyIndexes();

    // Index entities
    if (this._processedContext?.entities) {
      const entities = this._processedContext.entities;

      for (const [name, data] of entities.characters) {
        this._indexes.entities.characters.set(name, data);
      }
      for (const [name, data] of entities.locations) {
        this._indexes.entities.locations.set(name, data);
      }
    }

    // Index keywords from world info
    if (this._rawContext?.worldInfo) {
      for (const entry of this._rawContext.worldInfo) {
        const keys = entry.key || [];
        for (const key of keys) {
          const keyLower = key.toLowerCase();
          if (!this._indexes.keywords.has(keyLower)) {
            this._indexes.keywords.set(keyLower, []);
          }
          this._indexes.keywords.get(keyLower).push(entry);
        }
      }
    }

    // Build timeline index
    this._indexes.timeline = this._processedContext?.timeline || [];

    return this._indexes;
  },

  // ===== RELEVANCE SCORING =====

  /**
   * Score relevance of a context piece to a query
   */
  scoreRelevance(text, query, weights = {}) {
    const {
      exactMatch = 10,
      partialMatch = 5,
      keywordMatch = 3,
      proximityBonus = 2,
    } = weights;

    let score = 0;
    const textLower = text.toLowerCase();
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter((w) => w.length > 2);

    // Exact match
    if (textLower.includes(queryLower)) {
      score += exactMatch;
    }

    // Word matches
    for (const word of queryWords) {
      if (textLower.includes(word)) {
        score += keywordMatch;
      }
    }

    // Proximity bonus (words appearing close together)
    if (queryWords.length > 1) {
      const positions = queryWords
        .map((w) => textLower.indexOf(w))
        .filter((p) => p >= 0);
      if (positions.length > 1) {
        positions.sort((a, b) => a - b);
        const avgDistance =
          positions.reduce((sum, pos, i) => {
            if (i === 0) return 0;
            return sum + (pos - positions[i - 1]);
          }, 0) /
          (positions.length - 1);

        if (avgDistance < 50) score += proximityBonus;
      }
    }

    return score;
  },

  /**
   * Get relevant context for a query
   */
  getRelevantContext(query, options = {}) {
    const {
      maxResults = 10,
      minScore = 1,
      sources = ["worldInfo", "chat", "character", "stores"],
    } = options;

    const results = [];

    // Search world info
    if (sources.includes("worldInfo") && this._rawContext?.worldInfo) {
      for (const entry of this._rawContext.worldInfo) {
        const score = this.scoreRelevance(entry.content || "", query);
        if (score >= minScore) {
          results.push({
            source: "worldInfo",
            content: entry.content,
            header: entry.comment || entry.key?.join(", "),
            score,
          });
        }
      }
    }

    // Search chat
    if (sources.includes("chat") && this._rawContext?.chat) {
      for (const msg of this._rawContext.chat.slice(-30)) {
        const score = this.scoreRelevance(msg.mes || "", query);
        if (score >= minScore) {
          results.push({
            source: "chat",
            content: msg.mes,
            speaker: msg.is_user ? this._rawContext.userName : msg.name,
            score,
          });
        }
      }
    }

    // Search character card
    if (sources.includes("character") && this._rawContext?.characterCard) {
      const card = this._rawContext.characterCard;
      for (const [section, content] of Object.entries(card)) {
        if (typeof content === "string" && content) {
          const score = this.scoreRelevance(content, query);
          if (score >= minScore) {
            results.push({
              source: "character",
              section,
              content,
              score,
            });
          }
        }
      }
    }

    // Sort by score and limit
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, maxResults);
  },

  // ===== CONTEXT ROUTING =====

  /**
   * Get context appropriate for a specific agent
   */
  getContextForAgent(agentId, agentRole, phase, stores = null) {
    const contextNeeds = agentRole.contextNeeds || [];
    const context = {
      agentId,
      agentName: agentRole.name,
      phase: phase?.name,
      sections: {},
    };

    // Always include basic situation
    context.sections.currentSituation =
      this._processedContext?.storeData?.currentSituation ||
      stores?.getCurrentSituation?.() ||
      "Not established";

    // Add context based on agent needs
    for (const need of contextNeeds) {
      switch (need) {
        case "user_input":
          // Added by pipeline
          break;

        case "current_situation":
          // Already added above
          break;

        case "story_synopsis":
          context.sections.storySynopsis =
            this._processedContext?.storeData?.storySynopsis ||
            stores?.get?.("storySynopsis");
          break;

        case "story_outline":
          context.sections.storyOutline =
            this._processedContext?.storeData?.storyOutline ||
            stores?.get?.("storyOutline");
          break;

        case "story_draft":
          context.sections.storyDraft =
            this._processedContext?.storeData?.storyDraft ||
            stores?.get?.("storyDraft");
          break;

        case "plot_lines":
          context.sections.plotLines =
            this._processedContext?.storeData?.activePlots ||
            stores?.getActivePlotLines?.();
          break;

        case "scenes":
          context.sections.recentScenes =
            this._processedContext?.storeData?.recentScenes ||
            stores?.getRecentScenes?.(5);
          break;

        case "dialogue_history":
          context.sections.dialogueHistory =
            this._processedContext?.storeData?.recentDialogue ||
            stores?.getRecentDialogue?.(15);
          break;

        case "character_sheets":
          context.sections.characters =
            this._processedContext?.storeData?.presentCharacters ||
            stores?.getPresentCharacters?.();
          break;

        case "character_development":
          context.sections.characterDevelopment =
            this._processedContext?.storeData?.characterDevelopment ||
            stores?.get?.("characterDevelopment");
          break;

        case "character_positions":
          context.sections.characterPositions =
            this._processedContext?.storeData?.characterPositions ||
            stores?.get?.("characterPositions");
          break;

        case "character_inventory":
          context.sections.characterInventory =
            this._processedContext?.storeData?.characterInventory ||
            stores?.get?.("characterInventory");
          break;

        case "character_relationships":
          context.sections.relationships =
            this._processedContext?.relationships;
          break;

        case "faction_sheets":
          context.sections.factions = stores?.getAllFactions?.();
          break;

        case "location_sheets":
          context.sections.locations = stores?.getAllLocations?.();
          break;

        case "world_info":
          context.sections.worldInfo =
            this._processedContext?.formattedWorldInfo?.formatted;
          break;

        case "environment_details":
          context.sections.currentScene = stores?.getCurrentScene?.();
          context.sections.locations = stores?.getAllLocations?.();
          break;

        case "all_stores":
          context.sections.storeSummary = stores?.getSummary?.();
          break;
      }
    }

    // Format for prompt inclusion
    context.formatted = this.formatContextForPrompt(context.sections);

    return context;
  },

  /**
   * Format context sections into a prompt-ready string
   */
  formatContextForPrompt(sections, maxLength = 4000) {
    const parts = [];
    let totalLength = 0;

    for (const [key, value] of Object.entries(sections)) {
      if (!value) continue;

      let formatted;
      if (typeof value === "string") {
        formatted = `### ${this.formatSectionName(key)}\n${value}`;
      } else if (Array.isArray(value)) {
        formatted = `### ${this.formatSectionName(key)}\n${JSON.stringify(value, null, 2)}`;
      } else if (typeof value === "object") {
        formatted = `### ${this.formatSectionName(key)}\n${this.formatObject(value)}`;
      }

      if (formatted && totalLength + formatted.length < maxLength) {
        parts.push(formatted);
        totalLength += formatted.length;
      }
    }

    return parts.join("\n\n");
  },

  formatSectionName(key) {
    return key
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  },

  formatObject(obj) {
    if (obj.summary) return obj.summary;
    if (obj.formatted) return obj.formatted;

    const lines = [];
    for (const [key, value] of Object.entries(obj)) {
      if (value && typeof value !== "object") {
        lines.push(`- ${this.formatSectionName(key)}: ${value}`);
      }
    }
    return lines.join("\n");
  },

  // ===== TOKEN ESTIMATION =====

  /**
   * Estimate token counts for context pieces
   */
  estimateTokens() {
    // Simple estimation: ~4 characters per token
    const estimates = {};

    if (this._processedContext) {
      if (this._processedContext.formattedChat?.formatted) {
        estimates.chat = Math.ceil(
          this._processedContext.formattedChat.formatted.length / 4,
        );
      }
      if (this._processedContext.formattedWorldInfo?.formatted) {
        estimates.worldInfo = Math.ceil(
          this._processedContext.formattedWorldInfo.formatted.length / 4,
        );
      }
      if (this._processedContext.formattedCharacter?.formatted) {
        estimates.character = Math.ceil(
          this._processedContext.formattedCharacter.formatted.length / 4,
        );
      }
    }

    estimates.total = Object.values(estimates).reduce(
      (sum, val) => sum + val,
      0,
    );

    return estimates;
  },

  // ===== SME DETECTION =====

  /**
   * Detect which SMEs might be needed based on content
   */
  detectNeededSMEs(text, smePool) {
    const needed = [];

    for (const [smeId, sme] of Object.entries(smePool)) {
      const keywords = sme.keywords || [];
      for (const keyword of keywords) {
        if (text.toLowerCase().includes(keyword.toLowerCase())) {
          needed.push({
            id: smeId,
            name: sme.name,
            domain: sme.domain,
            matchedKeyword: keyword,
          });
          break;
        }
      }
    }

    return needed;
  },

  // ===== UTILITY FUNCTIONS =====

  /**
   * Get raw context
   */
  getRaw() {
    return this._rawContext;
  },

  /**
   * Get processed context
   */
  getProcessed() {
    return this._processedContext;
  },

  /**
   * Get indexes
   */
  getIndexes() {
    return this._indexes;
  },

  /**
   * Clear all cached context
   */
  clear() {
    this._rawContext = null;
    this._processedContext = null;
    this._indexes = this.getEmptyIndexes();
    this._relevanceCache.clear();
  },

  /**
   * Get context summary for debugging
   */
  getSummary() {
    return {
      hasRawContext: !!this._rawContext,
      hasProcessedContext: !!this._processedContext,
      chatMessages: this._rawContext?.chat?.length || 0,
      worldInfoEntries: this._rawContext?.worldInfo?.length || 0,
      hasCharacterCard: !!this._rawContext?.characterCard?.name,
      entitiesExtracted: {
        characters: this._indexes.entities.characters.size,
        locations: this._indexes.entities.locations.size,
      },
      tokenEstimates: this._processedContext?.tokenEstimates || {},
    };
  },
};

// Export for use in other modules
if (typeof window !== "undefined") {
  window.CouncilContext = CouncilContext;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = CouncilContext;
}
