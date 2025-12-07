// modules/stores.js - Persistent Storage System for The Council
// Handles CRUD operations for all story data stores
// Supports both localStorage and SillyTavern extension data for persistence

const CouncilStores = {
  // ===== VERSION =====
  VERSION: "0.3.0",

  // ===== STATE =====
  _stores: null,
  _storyId: null,
  _chatId: null,
  _characterName: null,
  _isDirty: false,
  _autoSaveTimeout: null,
  _initialized: false,
  _lastSaveTime: null,
  _saveInProgress: false,

  // ===== STORAGE CONFIGURATION =====
  STORAGE_PREFIX: "TheCouncil_stores_",
  BACKUP_PREFIX: "TheCouncil_backup_",
  MAX_BACKUPS: 5,
  AUTO_SAVE_DELAY: 2000,
  BACKUP_INTERVAL: 300000, // 5 minutes

  // ===== STORAGE KEY MANAGEMENT =====

  /**
   * Get the primary storage key for a story/chat
   * @param {string} storyId - Story/chat identifier
   * @returns {string} Storage key
   */
  getStorageKey(storyId) {
    return `${this.STORAGE_PREFIX}${storyId || this._storyId || "default"}`;
  },

  /**
   * Get backup storage key
   * @param {string} storyId - Story/chat identifier
   * @param {number} index - Backup index
   * @returns {string} Backup key
   */
  getBackupKey(storyId, index = 0) {
    return `${this.BACKUP_PREFIX}${storyId || this._storyId || "default"}_${index}`;
  },

  /**
   * Get all storage keys for a story (main + backups)
   * @param {string} storyId - Story/chat identifier
   * @returns {Array<string>} All related keys
   */
  getAllKeysForStory(storyId) {
    const targetId = storyId || this._storyId || "default";
    const keys = [this.getStorageKey(targetId)];
    for (let i = 0; i < this.MAX_BACKUPS; i++) {
      keys.push(this.getBackupKey(targetId, i));
    }
    return keys;
  },

  // ===== INITIALIZATION =====

  /**
   * Initialize stores for a specific story/chat
   * @param {string} storyId - Story/chat identifier (usually chatId)
   * @param {Object} options - Additional options
   * @returns {Object} Loaded stores
   */
  init(storyId, options = {}) {
    console.log("[Council Stores] Initializing for story:", storyId);

    this._storyId = storyId || "default";
    this._chatId = options.chatId || storyId;
    this._characterName = options.characterName || null;

    // Try to load from ST extension data first, then localStorage
    this._stores = this.load(storyId);

    this._initialized = true;
    this._isDirty = false;

    // Start backup interval
    this._startBackupInterval();

    console.log(
      "[Council Stores] Initialized with",
      Object.keys(this._stores).length,
      "store keys",
    );
    console.log(
      "[Council Stores] Story ID:",
      this._storyId,
      "Chat ID:",
      this._chatId,
    );

    return this._stores;
  },

  /**
   * Check if stores are initialized
   * @returns {boolean}
   */
  isInitialized() {
    return this._initialized;
  },

  /**
   * Get current story ID
   * @returns {string}
   */
  getStoryId() {
    return this._storyId;
  },

  // ===== CORE CRUD OPERATIONS =====

  /**
   * Load stores from storage (tries ST extension data first, then localStorage)
   * @param {string} storyId - Story/chat identifier
   * @returns {Object} Loaded stores
   */
  load(storyId = null) {
    const targetId = storyId || this._storyId;
    console.log("[Council Stores] Loading stores for:", targetId);

    // Try SillyTavern extension data first
    let stored = this._loadFromSTExtensionData(targetId);

    // Fall back to localStorage
    if (!stored) {
      stored = this._loadFromLocalStorage(targetId);
    }

    // Try to recover from backup if main data is corrupted
    if (!stored) {
      console.log("[Council Stores] Attempting recovery from backup...");
      stored = this._loadFromBackup(targetId);
    }

    if (stored) {
      try {
        const parsed = typeof stored === "string" ? JSON.parse(stored) : stored;
        // Validate and merge with defaults to ensure all fields exist
        this._stores = this.mergeWithDefaults(parsed);
        this._stores._meta.storyId = targetId;
        console.log(
          "[Council Stores] Loaded existing stores, last updated:",
          new Date(this._stores._meta.updatedAt).toLocaleString(),
        );
        return this._stores;
      } catch (e) {
        console.error("[Council Stores] Failed to parse stored data:", e);
      }
    }

    // Return fresh stores
    console.log("[Council Stores] Creating new stores for:", targetId);
    this._stores = this.getEmptyStores();
    this._stores._meta.storyId = targetId;
    this._stores._meta.chatId = this._chatId;
    this._stores._meta.characterName = this._characterName;

    // Save the new stores immediately
    this.save(targetId);

    return this._stores;
  },

  /**
   * Load from SillyTavern extension data
   * @param {string} storyId - Story identifier
   * @returns {Object|null} Stored data or null
   */
  _loadFromSTExtensionData(storyId) {
    try {
      if (typeof SillyTavern !== "undefined") {
        const context = SillyTavern.getContext();
        if (context.extensionSettings?.TheCouncil_Stores?.[storyId]) {
          console.log("[Council Stores] Loaded from ST extension data");
          return context.extensionSettings.TheCouncil_Stores[storyId];
        }
      }
    } catch (e) {
      console.warn(
        "[Council Stores] ST extension data load failed:",
        e.message,
      );
    }
    return null;
  },

  /**
   * Load from localStorage
   * @param {string} storyId - Story identifier
   * @returns {string|null} Stored JSON string or null
   */
  _loadFromLocalStorage(storyId) {
    try {
      const key = this.getStorageKey(storyId);
      const stored = localStorage.getItem(key);
      if (stored) {
        console.log("[Council Stores] Loaded from localStorage");
        return stored;
      }
    } catch (e) {
      console.warn("[Council Stores] localStorage load failed:", e.message);
    }
    return null;
  },

  /**
   * Load from backup
   * @param {string} storyId - Story identifier
   * @returns {string|null} Backup data or null
   */
  _loadFromBackup(storyId) {
    for (let i = 0; i < this.MAX_BACKUPS; i++) {
      try {
        const key = this.getBackupKey(storyId, i);
        const backup = localStorage.getItem(key);
        if (backup) {
          console.log("[Council Stores] Recovered from backup", i);
          return backup;
        }
      } catch (e) {
        continue;
      }
    }
    return null;
  },

  /**
   * Save stores to all storage backends
   * @param {string} storyId - Story/chat identifier
   * @returns {boolean} Success status
   */
  save(storyId = null) {
    if (this._saveInProgress) {
      console.log("[Council Stores] Save already in progress, skipping");
      return false;
    }

    this._saveInProgress = true;
    const targetId = storyId || this._storyId;

    // Update metadata
    if (this._stores._meta) {
      this._stores._meta.updatedAt = Date.now();
      this._stores._meta.version = this.VERSION;
      this._stores._meta.storyId = targetId;
      this._stores._meta.chatId = this._chatId;
    }

    let success = false;

    try {
      // Save to localStorage (primary)
      success = this._saveToLocalStorage(targetId);

      // Also save to ST extension data for additional persistence
      this._saveToSTExtensionData(targetId);

      if (success) {
        this._isDirty = false;
        this._lastSaveTime = Date.now();
        console.log("[Council Stores] Saved successfully to:", targetId);
      }
    } catch (e) {
      console.error("[Council Stores] Save failed:", e);
    } finally {
      this._saveInProgress = false;
    }

    return success;
  },

  /**
   * Save to localStorage
   * @param {string} storyId - Story identifier
   * @returns {boolean} Success status
   */
  _saveToLocalStorage(storyId) {
    try {
      const key = this.getStorageKey(storyId);
      const data = JSON.stringify(this._stores);
      localStorage.setItem(key, data);
      return true;
    } catch (e) {
      console.error("[Council Stores] localStorage save failed:", e);
      // Try to clear old data if quota exceeded
      if (e.name === "QuotaExceededError") {
        this._clearOldStores();
        try {
          localStorage.setItem(
            this.getStorageKey(storyId),
            JSON.stringify(this._stores),
          );
          return true;
        } catch (e2) {
          console.error("[Council Stores] Still failed after clearing:", e2);
        }
      }
      return false;
    }
  },

  /**
   * Save to SillyTavern extension data
   * @param {string} storyId - Story identifier
   */
  _saveToSTExtensionData(storyId) {
    try {
      if (typeof SillyTavern !== "undefined") {
        const context = SillyTavern.getContext();

        // Initialize storage object if needed
        if (!context.extensionSettings.TheCouncil_Stores) {
          context.extensionSettings.TheCouncil_Stores = {};
        }

        // Save stores for this story
        context.extensionSettings.TheCouncil_Stores[storyId] = this._stores;

        // Trigger ST save
        if (typeof context.saveSettingsDebounced === "function") {
          context.saveSettingsDebounced();
        }

        console.log("[Council Stores] Saved to ST extension data");
      }
    } catch (e) {
      console.warn(
        "[Council Stores] ST extension data save failed:",
        e.message,
      );
    }
  },

  /**
   * Create a backup of current stores
   * @param {string} storyId - Story identifier
   */
  createBackup(storyId = null) {
    const targetId = storyId || this._storyId;

    try {
      // Rotate backups (shift old ones)
      for (let i = this.MAX_BACKUPS - 1; i > 0; i--) {
        const oldKey = this.getBackupKey(targetId, i - 1);
        const newKey = this.getBackupKey(targetId, i);
        const data = localStorage.getItem(oldKey);
        if (data) {
          localStorage.setItem(newKey, data);
        }
      }

      // Save current as backup 0
      const backupKey = this.getBackupKey(targetId, 0);
      localStorage.setItem(backupKey, JSON.stringify(this._stores));

      console.log("[Council Stores] Backup created for:", targetId);
    } catch (e) {
      console.warn("[Council Stores] Backup creation failed:", e.message);
    }
  },

  /**
   * Restore from a specific backup
   * @param {string} storyId - Story identifier
   * @param {number} backupIndex - Backup index to restore
   * @returns {boolean} Success status
   */
  restoreFromBackup(storyId = null, backupIndex = 0) {
    const targetId = storyId || this._storyId;

    try {
      const backupKey = this.getBackupKey(targetId, backupIndex);
      const backup = localStorage.getItem(backupKey);

      if (backup) {
        const parsed = JSON.parse(backup);
        this._stores = this.mergeWithDefaults(parsed);
        this.save(targetId);
        console.log("[Council Stores] Restored from backup", backupIndex);
        return true;
      }
    } catch (e) {
      console.error("[Council Stores] Restore failed:", e);
    }

    return false;
  },

  /**
   * Auto-save with debouncing
   * @param {number} delay - Delay in milliseconds
   */
  autoSave(delay = null) {
    this._isDirty = true;

    if (this._autoSaveTimeout) {
      clearTimeout(this._autoSaveTimeout);
    }

    this._autoSaveTimeout = setTimeout(() => {
      this.save();
    }, delay || this.AUTO_SAVE_DELAY);
  },

  /**
   * Start periodic backup interval
   */
  _startBackupInterval() {
    // Clear any existing interval
    if (this._backupIntervalId) {
      clearInterval(this._backupIntervalId);
    }

    // Create backups periodically
    this._backupIntervalId = setInterval(() => {
      if (this._stores && this._storyId) {
        this.createBackup();
      }
    }, this.BACKUP_INTERVAL);
  },

  /**
   * Clear old stores to free up space
   */
  _clearOldStores() {
    console.log("[Council Stores] Clearing old stores to free space...");

    const allKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.STORAGE_PREFIX)) {
        allKeys.push(key);
      }
    }

    // Sort by age and remove oldest (keep current)
    const currentKey = this.getStorageKey(this._storyId);
    const keysToRemove = allKeys
      .filter((k) => k !== currentKey)
      .slice(0, Math.max(0, allKeys.length - 10)); // Keep last 10

    for (const key of keysToRemove) {
      localStorage.removeItem(key);
    }

    console.log("[Council Stores] Cleared", keysToRemove.length, "old stores");
  },

  /**
   * Force immediate save (synchronous)
   * @returns {boolean} Success status
   */
  forceSave() {
    if (this._autoSaveTimeout) {
      clearTimeout(this._autoSaveTimeout);
      this._autoSaveTimeout = null;
    }
    return this.save();
  },

  /**
   * Get current stores (read-only reference)
   * @returns {Object} All stores
   */
  getAll() {
    return this._stores;
  },

  /**
   * Get a specific store
   * @param {string} storeName - Store name
   * @returns {any} Store value
   */
  get(storeName) {
    return this._stores?.[storeName];
  },

  /**
   * Set a specific store
   * @param {string} storeName - Store name
   * @param {any} value - Value to set
   * @param {boolean} immediate - Save immediately
   */
  set(storeName, value, immediate = false) {
    if (this._stores) {
      this._stores[storeName] = value;
      if (immediate) {
        this.forceSave();
      } else {
        this.autoSave();
      }
    }
  },

  /**
   * Update a nested value in a store
   * @param {string} storeName - Store name
   * @param {string} path - Dot-separated path (e.g., "character.name")
   * @param {any} value - Value to set
   */
  setNested(storeName, path, value) {
    if (!this._stores || !this._stores[storeName]) return;

    const parts = path.split(".");
    let current = this._stores[storeName];

    for (let i = 0; i < parts.length - 1; i++) {
      if (current[parts[i]] === undefined) {
        current[parts[i]] = {};
      }
      current = current[parts[i]];
    }

    current[parts[parts.length - 1]] = value;
    this.autoSave();
  },

  /**
   * Check if store has data
   * @param {string} storeName - Store name
   * @returns {boolean}
   */
  has(storeName) {
    const value = this._stores?.[storeName];
    if (value === null || value === undefined) return false;
    if (typeof value === "string") return value.length > 0;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === "object") return Object.keys(value).length > 0;
    return true;
  },

  /**
   * Clear all stores for current story
   */
  clear() {
    // Create backup before clearing
    this.createBackup();

    this._stores = this.getEmptyStores();
    this._stores._meta.storyId = this._storyId;
    this._stores._meta.chatId = this._chatId;
    this.save();

    console.log("[Council Stores] Stores cleared for:", this._storyId);
  },

  /**
   * Delete all data for a specific story
   * @param {string} storyId - Story identifier
   */
  deleteStory(storyId) {
    const keys = this.getAllKeysForStory(storyId);
    for (const key of keys) {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        console.warn("[Council Stores] Failed to delete key:", key);
      }
    }

    // Also remove from ST extension data
    try {
      if (typeof SillyTavern !== "undefined") {
        const context = SillyTavern.getContext();
        if (context.extensionSettings?.TheCouncil_Stores?.[storyId]) {
          delete context.extensionSettings.TheCouncil_Stores[storyId];
          context.saveSettingsDebounced?.();
        }
      }
    } catch (e) {
      console.warn("[Council Stores] Failed to delete from ST:", e.message);
    }

    console.log("[Council Stores] Deleted all data for story:", storyId);
  },

  /**
   * List all stored stories
   * @returns {Array<Object>} List of stored stories with metadata
   */
  listStoredStories() {
    const stories = [];
    const seen = new Set();

    // Check localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (
        key &&
        key.startsWith(this.STORAGE_PREFIX) &&
        !key.includes("_backup_")
      ) {
        const storyId = key.replace(this.STORAGE_PREFIX, "");
        if (!seen.has(storyId)) {
          seen.add(storyId);
          try {
            const data = JSON.parse(localStorage.getItem(key));
            stories.push({
              storyId,
              characterName: data._meta?.characterName || "Unknown",
              updatedAt: data._meta?.updatedAt || 0,
              source: "localStorage",
            });
          } catch (e) {
            stories.push({
              storyId,
              characterName: "Unknown",
              updatedAt: 0,
              source: "localStorage",
            });
          }
        }
      }
    }

    // Check ST extension data
    try {
      if (typeof SillyTavern !== "undefined") {
        const context = SillyTavern.getContext();
        const stStores = context.extensionSettings?.TheCouncil_Stores || {};
        for (const [storyId, data] of Object.entries(stStores)) {
          if (!seen.has(storyId)) {
            seen.add(storyId);
            stories.push({
              storyId,
              characterName: data._meta?.characterName || "Unknown",
              updatedAt: data._meta?.updatedAt || 0,
              source: "ST",
            });
          }
        }
      }
    } catch (e) {
      // Ignore
    }

    // Sort by most recently updated
    return stories.sort((a, b) => b.updatedAt - a.updatedAt);
  },

  /**
   * Export stores as JSON string
   * @returns {string} JSON string
   */
  export() {
    return JSON.stringify(this._stores, null, 2);
  },

  /**
   * Export stores as downloadable file
   */
  exportToFile() {
    const data = this.export();
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `council_stores_${this._storyId}_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  /**
   * Import stores from JSON string
   * @param {string} jsonString - JSON string to import
   * @returns {boolean} Success status
   */
  import(jsonString) {
    try {
      const imported = JSON.parse(jsonString);

      // Validate structure
      if (!imported || typeof imported !== "object") {
        throw new Error("Invalid data structure");
      }

      // Create backup before importing
      this.createBackup();

      // Merge with defaults and update
      this._stores = this.mergeWithDefaults(imported);
      this._stores._meta.storyId = this._storyId;
      this._stores._meta.chatId = this._chatId;
      this._stores._meta.importedAt = Date.now();

      this.save();
      console.log("[Council Stores] Import successful");
      return true;
    } catch (e) {
      console.error("[Council Stores] Import failed:", e);
      return false;
    }
  },

  /**
   * Import from uploaded file
   * @param {File} file - File to import
   * @returns {Promise<boolean>} Success status
   */
  async importFromFile(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const success = this.import(e.target.result);
        resolve(success);
      };
      reader.onerror = () => {
        console.error("[Council Stores] File read failed");
        resolve(false);
      };
      reader.readAsText(file);
    });
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

      // Pipeline state (persisted for recovery)
      pipelineState: {
        lastRun: null,
        lastPhase: null,
        lastDraft: "",
        lastOutline: "",
      },

      // Metadata
      _meta: {
        version: this.VERSION,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        storyId: this._storyId,
        chatId: this._chatId,
        characterName: this._characterName,
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
    if (!this._stores?.plotLines) return [];
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
    if (!this._stores?.scenes) return null;
    return this._stores.scenes[this._stores.scenes.length - 1] || null;
  },

  getRecentScenes(count = 5) {
    if (!this._stores?.scenes) return [];
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
    if (!this._stores?.characterSheets) return [];
    return Object.values(this._stores.characterSheets);
  },

  getCharactersByType(type) {
    if (!this._stores?.characterSheets) return [];
    return Object.values(this._stores.characterSheets).filter(
      (c) => c.type === type,
    );
  },

  getPresentCharacters() {
    if (!this._stores?.characterSheets) return [];
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
    if (!this._stores?.locationSheets) return [];
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
    if (!this._stores?.factionSheets) return [];
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
    if (!this._stores) {
      console.warn(
        "[Council Stores] getCurrentSituation called before initialization",
      );
      return null;
    }
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
    if (!this._stores) {
      console.warn("[Council Stores] getSummary called before initialization");
      return {
        plotLines: { total: 0, active: 0 },
        scenes: { total: 0, current: "None" },
        characters: {
          total: 0,
          present: 0,
          byType: { main: 0, supporting: 0, minor: 0 },
        },
        locations: { total: 0 },
        factions: { total: 0 },
        dialogueEntries: 0,
        currentSituation: "Not initialized",
      };
    }
    return {
      plotLines: {
        total: this._stores.plotLines?.length || 0,
        active: this.getActivePlotLines().length,
      },
      scenes: {
        total: this._stores.scenes?.length || 0,
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
      dialogueEntries: this._stores.dialogueHistory?.length || 0,
      currentSituation: this._stores.currentSituation?.summary || "Not set",
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
