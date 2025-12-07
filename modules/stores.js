// modules/stores.js - Persistent Storage System for The Council
// Handles CRUD operations for all story data stores

const CouncilStores = {
  // ===== STATE =====
  _stores: null,
  _storyId: null,
  _isDirty: false,
  _autoSaveTimeout: null,

  // ===== STORAGE KEY MANAGEMENT =====
  getStorageKey(storyId) {
    return `TheCouncil_stores_${storyId || this._storyId || "default"}`;
  },

  // ===== INITIALIZATION =====
  init(storyId) {
    this._storyId = storyId;
    this._stores = this.load();
    return this._stores;
  },

  // ===== CORE CRUD OPERATIONS =====

  /**
   * Load stores from localStorage
   */
  load(storyId = null) {
    const key = this.getStorageKey(storyId);
    const stored = localStorage.getItem(key);

    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Merge with defaults to ensure all fields exist
        this._stores = this.mergeWithDefaults(parsed);
        return this._stores;
      } catch (e) {
        console.error("[Council Stores] Failed to parse stored data:", e);
      }
    }

    // Return fresh stores
    this._stores = this.getEmptyStores();
    return this._stores;
  },

  /**
   * Save stores to localStorage
   */
  save(storyId = null) {
    const key = this.getStorageKey(storyId);
    try {
      localStorage.setItem(key, JSON.stringify(this._stores));
      this._isDirty = false;
      return true;
    } catch (e) {
      console.error("[Council Stores] Failed to save:", e);
      return false;
    }
  },

  /**
   * Auto-save with debouncing
   */
  autoSave(delay = 2000) {
    this._isDirty = true;
    if (this._autoSaveTimeout) {
      clearTimeout(this._autoSaveTimeout);
    }
    this._autoSaveTimeout = setTimeout(() => {
      this.save();
    }, delay);
  },

  /**
   * Get current stores (read-only reference)
   */
  getAll() {
    return this._stores;
  },

  /**
   * Get a specific store
   */
  get(storeName) {
    return this._stores?.[storeName];
  },

  /**
   * Set a specific store
   */
  set(storeName, value) {
    if (this._stores) {
      this._stores[storeName] = value;
      this.autoSave();
    }
  },

  /**
   * Clear all stores
   */
  clear() {
    this._stores = this.getEmptyStores();
    this.save();
  },

  /**
   * Export stores as JSON
   */
  export() {
    return JSON.stringify(this._stores, null, 2);
  },

  /**
   * Import stores from JSON
   */
  import(jsonString) {
    try {
      const imported = JSON.parse(jsonString);
      this._stores = this.mergeWithDefaults(imported);
      this.save();
      return true;
    } catch (e) {
      console.error("[Council Stores] Import failed:", e);
      return false;
    }
  },

  // ===== EMPTY STORE TEMPLATES =====

  getEmptyStores() {
    return {
      // Story-level
      storyDraft: "",
      storyOutline: "",
      storySynopsis: this.getEmptySynopsis(),

      // Plot tracking
      plotLines: [],
      scenes: [],

      // Dialogue
      dialogueHistory: [],

      // Character data
      characterSheets: {},
      characterDevelopment: {},
      characterInventory: {},
      characterPositions: {},

      // World data
      factionSheets: {},
      locationSheets: {},

      // Current state
      currentSituation: this.getEmptySynopsis(),

      // Meta
      agentCommentary: [],
      sessionHistory: [],

      // Metadata
      _meta: {
        version: "0.2.0",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        storyId: this._storyId,
      },
    };
  },

  getEmptySynopsis() {
    return {
      who: "",
      what: "",
      when: "",
      where: "",
      why: "",
      how: "",
      summary: "",
    };
  },

  mergeWithDefaults(stored) {
    const defaults = this.getEmptyStores();

    // Deep merge stored into defaults
    const merged = { ...defaults };
    for (const key of Object.keys(stored)) {
      if (key === "_meta") {
        merged._meta = {
          ...defaults._meta,
          ...stored._meta,
          updatedAt: Date.now(),
        };
      } else if (
        typeof defaults[key] === "object" &&
        !Array.isArray(defaults[key])
      ) {
        merged[key] = { ...defaults[key], ...stored[key] };
      } else {
        merged[key] = stored[key];
      }
    }

    return merged;
  },

  // ===== STORY OPERATIONS =====

  updateStoryDraft(draft) {
    this._stores.storyDraft = draft;
    this.autoSave();
  },

  updateStoryOutline(outline) {
    this._stores.storyOutline = outline;
    this.autoSave();
  },

  updateStorySynopsis(synopsis) {
    this._stores.storySynopsis = { ...this._stores.storySynopsis, ...synopsis };
    this.autoSave();
  },

  // ===== PLOT LINE OPERATIONS =====

  addPlotLine(plotLine) {
    const newPlot = {
      id: this.generateId(),
      name: plotLine.name || "Untitled Plot",
      description: plotLine.description || "",
      status: plotLine.status || "active",
      type: plotLine.type || "micro",
      startedAt: Date.now(),
      resolvedAt: null,
      relatedCharacters: plotLine.relatedCharacters || [],
      relatedLocations: plotLine.relatedLocations || [],
      timeline: [],
      ...plotLine,
    };
    this._stores.plotLines.push(newPlot);
    this.autoSave();
    return newPlot;
  },

  updatePlotLine(id, updates) {
    const index = this._stores.plotLines.findIndex((p) => p.id === id);
    if (index !== -1) {
      this._stores.plotLines[index] = {
        ...this._stores.plotLines[index],
        ...updates,
      };
      if (
        updates.status === "resolved" &&
        !this._stores.plotLines[index].resolvedAt
      ) {
        this._stores.plotLines[index].resolvedAt = Date.now();
      }
      this.autoSave();
      return this._stores.plotLines[index];
    }
    return null;
  },

  getPlotLinesByStatus(status) {
    return this._stores.plotLines.filter((p) => p.status === status);
  },

  getActivePlotLines() {
    return this.getPlotLinesByStatus("active");
  },

  // ===== SCENE OPERATIONS =====

  addScene(scene) {
    const newScene = {
      id: this.generateId(),
      number: this._stores.scenes.length + 1,
      title: scene.title || `Scene ${this._stores.scenes.length + 1}`,
      summary: scene.summary || "",
      timestamp: Date.now(),
      timeInStory: scene.timeInStory || "",
      weather: scene.weather || "",
      location: scene.location || "",
      characters: scene.characters || [],
      props: scene.props || [],
      mood: scene.mood || "",
      tension: scene.tension || 5,
      ...scene,
    };
    this._stores.scenes.push(newScene);
    this.autoSave();
    return newScene;
  },

  updateScene(id, updates) {
    const index = this._stores.scenes.findIndex((s) => s.id === id);
    if (index !== -1) {
      this._stores.scenes[index] = {
        ...this._stores.scenes[index],
        ...updates,
      };
      this.autoSave();
      return this._stores.scenes[index];
    }
    return null;
  },

  getCurrentScene() {
    return this._stores.scenes[this._stores.scenes.length - 1] || null;
  },

  getRecentScenes(count = 5) {
    return this._stores.scenes.slice(-count);
  },

  // ===== DIALOGUE OPERATIONS =====

  addDialogue(dialogue) {
    const newDialogue = {
      id: this.generateId(),
      sceneId: dialogue.sceneId || this.getCurrentScene()?.id || null,
      speaker: dialogue.speaker || "Unknown",
      dialogue: dialogue.dialogue || "",
      subtext: dialogue.subtext || "",
      timestamp: Date.now(),
      timeInStory: dialogue.timeInStory || "",
      ...dialogue,
    };
    this._stores.dialogueHistory.push(newDialogue);
    this.autoSave();
    return newDialogue;
  },

  getDialogueByCharacter(characterName) {
    return this._stores.dialogueHistory.filter(
      (d) => d.speaker.toLowerCase() === characterName.toLowerCase(),
    );
  },

  getDialogueByScene(sceneId) {
    return this._stores.dialogueHistory.filter((d) => d.sceneId === sceneId);
  },

  getRecentDialogue(count = 20) {
    return this._stores.dialogueHistory.slice(-count);
  },

  // ===== CHARACTER OPERATIONS =====

  addCharacter(character) {
    const id = character.id || this.generateId();
    const newCharacter = {
      id,
      name: character.name || "Unknown",
      type: character.type || "minor",
      description: character.description || "",
      personality: character.personality || "",
      appearance: character.appearance || "",
      background: character.background || "",
      motivations: character.motivations || [],
      fears: character.fears || [],
      relationships: character.relationships || {},
      skills: character.skills || [],
      flaws: character.flaws || [],
      speechPatterns: character.speechPatterns || "",
      isPresent: character.isPresent !== undefined ? character.isPresent : true,
      createdAt: Date.now(),
      ...character,
    };
    this._stores.characterSheets[id] = newCharacter;
    this._stores.characterDevelopment[id] = {
      characterId: id,
      arc: "",
      milestones: [],
      currentState: "",
      changes: [],
    };
    this._stores.characterInventory[id] = [];
    this._stores.characterPositions[id] = {
      characterId: id,
      currentLocation: "",
      currentActivity: "",
      history: [],
    };
    this.autoSave();
    return newCharacter;
  },

  updateCharacter(id, updates) {
    if (this._stores.characterSheets[id]) {
      this._stores.characterSheets[id] = {
        ...this._stores.characterSheets[id],
        ...updates,
        updatedAt: Date.now(),
      };
      this.autoSave();
      return this._stores.characterSheets[id];
    }
    return null;
  },

  getCharacter(id) {
    return this._stores.characterSheets[id] || null;
  },

  getCharacterByName(name) {
    return Object.values(this._stores.characterSheets).find(
      (c) => c.name.toLowerCase() === name.toLowerCase(),
    );
  },

  getAllCharacters() {
    return Object.values(this._stores.characterSheets);
  },

  getCharactersByType(type) {
    return Object.values(this._stores.characterSheets).filter(
      (c) => c.type === type,
    );
  },

  getPresentCharacters() {
    return Object.values(this._stores.characterSheets).filter(
      (c) => c.isPresent,
    );
  },

  // ===== CHARACTER DEVELOPMENT =====

  addCharacterMilestone(characterId, milestone) {
    if (this._stores.characterDevelopment[characterId]) {
      this._stores.characterDevelopment[characterId].milestones.push({
        id: this.generateId(),
        description: milestone.description || "",
        timestamp: Date.now(),
        sceneId: milestone.sceneId || null,
        ...milestone,
      });
      this.autoSave();
    }
  },

  updateCharacterState(characterId, state) {
    if (this._stores.characterDevelopment[characterId]) {
      const dev = this._stores.characterDevelopment[characterId];
      dev.changes.push({
        from: dev.currentState,
        to: state,
        timestamp: Date.now(),
      });
      dev.currentState = state;
      this.autoSave();
    }
  },

  // ===== CHARACTER INVENTORY =====

  addToInventory(characterId, item) {
    if (!this._stores.characterInventory[characterId]) {
      this._stores.characterInventory[characterId] = [];
    }
    this._stores.characterInventory[characterId].push({
      id: this.generateId(),
      name: item.name || "Unknown Item",
      description: item.description || "",
      acquiredAt: Date.now(),
      ...item,
    });
    this.autoSave();
  },

  removeFromInventory(characterId, itemId) {
    if (this._stores.characterInventory[characterId]) {
      this._stores.characterInventory[characterId] =
        this._stores.characterInventory[characterId].filter(
          (i) => i.id !== itemId,
        );
      this.autoSave();
    }
  },

  getInventory(characterId) {
    return this._stores.characterInventory[characterId] || [];
  },

  // ===== CHARACTER POSITION =====

  updateCharacterPosition(characterId, location, activity = "") {
    if (!this._stores.characterPositions[characterId]) {
      this._stores.characterPositions[characterId] = {
        characterId,
        currentLocation: "",
        currentActivity: "",
        history: [],
      };
    }
    const pos = this._stores.characterPositions[characterId];
    if (pos.currentLocation !== location || pos.currentActivity !== activity) {
      pos.history.push({
        location: pos.currentLocation,
        activity: pos.currentActivity,
        timestamp: Date.now(),
      });
      pos.currentLocation = location;
      pos.currentActivity = activity;
      this.autoSave();
    }
  },

  getCharacterPosition(characterId) {
    return this._stores.characterPositions[characterId] || null;
  },

  // ===== LOCATION OPERATIONS =====

  addLocation(location) {
    const id = location.id || this.generateId();
    const newLocation = {
      id,
      name: location.name || "Unknown Location",
      type: location.type || "interior",
      description: location.description || "",
      features: location.features || [],
      connections: location.connections || [],
      atmosphere: location.atmosphere || "",
      history: location.history || "",
      createdAt: Date.now(),
      ...location,
    };
    this._stores.locationSheets[id] = newLocation;
    this.autoSave();
    return newLocation;
  },

  updateLocation(id, updates) {
    if (this._stores.locationSheets[id]) {
      this._stores.locationSheets[id] = {
        ...this._stores.locationSheets[id],
        ...updates,
        updatedAt: Date.now(),
      };
      this.autoSave();
      return this._stores.locationSheets[id];
    }
    return null;
  },

  getLocation(id) {
    return this._stores.locationSheets[id] || null;
  },

  getLocationByName(name) {
    return Object.values(this._stores.locationSheets).find(
      (l) => l.name.toLowerCase() === name.toLowerCase(),
    );
  },

  getAllLocations() {
    return Object.values(this._stores.locationSheets);
  },

  // ===== FACTION OPERATIONS =====

  addFaction(faction) {
    const id = faction.id || this.generateId();
    const newFaction = {
      id,
      name: faction.name || "Unknown Faction",
      description: faction.description || "",
      goals: faction.goals || [],
      members: faction.members || [],
      allies: faction.allies || [],
      enemies: faction.enemies || [],
      territory: faction.territory || [],
      resources: faction.resources || [],
      createdAt: Date.now(),
      ...faction,
    };
    this._stores.factionSheets[id] = newFaction;
    this.autoSave();
    return newFaction;
  },

  updateFaction(id, updates) {
    if (this._stores.factionSheets[id]) {
      this._stores.factionSheets[id] = {
        ...this._stores.factionSheets[id],
        ...updates,
        updatedAt: Date.now(),
      };
      this.autoSave();
      return this._stores.factionSheets[id];
    }
    return null;
  },

  getAllFactions() {
    return Object.values(this._stores.factionSheets);
  },

  // ===== CURRENT SITUATION =====

  updateCurrentSituation(situation) {
    this._stores.currentSituation = {
      ...this._stores.currentSituation,
      ...situation,
      updatedAt: Date.now(),
    };
    this.autoSave();
  },

  getCurrentSituation() {
    return this._stores.currentSituation;
  },

  // ===== AGENT COMMENTARY =====

  addCommentary(phaseId, comments) {
    this._stores.agentCommentary.push({
      id: this.generateId(),
      phaseId,
      timestamp: Date.now(),
      comments, // Array of { agentId, content }
    });
    this.autoSave();
  },

  getRecentCommentary(count = 5) {
    return this._stores.agentCommentary.slice(-count);
  },

  // ===== SESSION HISTORY =====

  addSessionEntry(entry) {
    this._stores.sessionHistory.push({
      id: this.generateId(),
      timestamp: Date.now(),
      userInput: entry.userInput || "",
      finalResponse: entry.finalResponse || "",
      phasesCompleted: entry.phasesCompleted || [],
      duration: entry.duration || 0,
      ...entry,
    });
    this.autoSave();
  },

  getSessionHistory(count = 10) {
    return this._stores.sessionHistory.slice(-count);
  },

  // ===== UTILITY FUNCTIONS =====

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  },

  /**
   * Get a summary of all stores for context
   */
  getSummary() {
    return {
      plotLines: {
        total: this._stores.plotLines.length,
        active: this.getActivePlotLines().length,
      },
      scenes: {
        total: this._stores.scenes.length,
        current: this.getCurrentScene()?.title || "None",
      },
      characters: {
        total: this.getAllCharacters().length,
        present: this.getPresentCharacters().length,
        byType: {
          main: this.getCharactersByType("main").length,
          supporting: this.getCharactersByType("supporting").length,
          minor: this.getCharactersByType("minor").length,
        },
      },
      locations: {
        total: this.getAllLocations().length,
      },
      factions: {
        total: this.getAllFactions().length,
      },
      dialogueEntries: this._stores.dialogueHistory.length,
      currentSituation: this._stores.currentSituation.summary || "Not set",
    };
  },

  /**
   * Get formatted store data for agent context
   */
  getFormattedForContext(storeNames = []) {
    const result = {};

    for (const name of storeNames) {
      const data = this._stores[name];
      if (data === undefined) continue;

      if (Array.isArray(data)) {
        // For arrays, get recent items
        result[name] = data.slice(-10);
      } else if (typeof data === "object") {
        result[name] = data;
      } else {
        result[name] = data;
      }
    }

    return result;
  },

  /**
   * Search across stores for relevant content
   */
  search(query, storeNames = null) {
    const results = [];
    const queryLower = query.toLowerCase();
    const searchIn = storeNames || Object.keys(this._stores);

    for (const storeName of searchIn) {
      const data = this._stores[storeName];
      if (!data) continue;

      if (Array.isArray(data)) {
        for (const item of data) {
          if (this.matchesQuery(item, queryLower)) {
            results.push({ store: storeName, item });
          }
        }
      } else if (typeof data === "object") {
        for (const [key, value] of Object.entries(data)) {
          if (
            this.matchesQuery(value, queryLower) ||
            key.toLowerCase().includes(queryLower)
          ) {
            results.push({ store: storeName, key, item: value });
          }
        }
      }
    }

    return results;
  },

  matchesQuery(obj, queryLower) {
    if (typeof obj === "string") {
      return obj.toLowerCase().includes(queryLower);
    }
    if (typeof obj === "object" && obj !== null) {
      return Object.values(obj).some((v) => this.matchesQuery(v, queryLower));
    }
    return false;
  },
};

// Export for use in other modules
if (typeof window !== "undefined") {
  window.CouncilStores = CouncilStores;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = CouncilStores;
}
