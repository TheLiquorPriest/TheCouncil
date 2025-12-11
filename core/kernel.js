/**
 * TheCouncil Kernel - Central Hub for All Systems
 *
 * Provides:
 * - Module registry (shared utilities)
 * - Event bus (cross-system communication)
 * - Hooks system (lifecycle integration)
 * - Global state management
 * - Bootstrap sequence
 * - Public API (window.TheCouncil)
 *
 * @version 2.0.0
 */

const TheCouncilKernel = {
  // ===== VERSION =====
  VERSION: "2.0.0",

  // ===== STATE =====
  _initialized: false,
  _initializationPromise: null,

  // ===== MODULE REGISTRY =====
  _modules: new Map(),

  /**
   * Register a shared module
   * @param {string} name - Module name
   * @param {Object} module - Module instance
   * @returns {boolean} Success
   */
  registerModule(name, module) {
    if (this._modules.has(name)) {
      this._log("warn", `Module "${name}" already registered, overwriting`);
    }
    this._modules.set(name, module);
    this._log("debug", `Module registered: ${name}`);
    this._emit("kernel:module:registered", { name, module });
    return true;
  },

  /**
   * Get a shared module
   * @param {string} name - Module name
   * @returns {Object|null} Module instance or null
   */
  getModule(name) {
    return this._modules.get(name) || null;
  },

  /**
   * Check if a module is registered
   * @param {string} name - Module name
   * @returns {boolean}
   */
  hasModule(name) {
    return this._modules.has(name);
  },

  /**
   * Get all registered modules
   * @returns {Object} Map of name -> module
   */
  getAllModules() {
    return Object.fromEntries(this._modules);
  },

  // ===== SYSTEM REGISTRY =====
  _systems: new Map(),

  /**
   * Register a system
   * @param {string} name - System name
   * @param {Object} system - System instance
   * @returns {boolean} Success
   */
  registerSystem(name, system) {
    if (this._systems.has(name)) {
      this._log("warn", `System "${name}" already registered, overwriting`);
    }
    this._systems.set(name, system);
    this._log("debug", `System registered: ${name}`);
    this._emit("kernel:system:registered", { name, system });
    return true;
  },

  /**
   * Get a system
   * @param {string} name - System name
   * @returns {Object|null} System instance or null
   */
  getSystem(name) {
    return this._systems.get(name) || null;
  },

  /**
   * Check if a system is registered
   * @param {string} name - System name
   * @returns {boolean}
   */
  hasSystem(name) {
    return this._systems.has(name);
  },

  /**
   * Get all registered systems
   * @returns {Object} Map of name -> system
   */
  getAllSystems() {
    return Object.fromEntries(this._systems);
  },

  /**
   * Check if a system is ready (has initialized)
   * @param {string} name - System name
   * @returns {boolean}
   */
  isSystemReady(name) {
    const system = this._systems.get(name);
    return system && typeof system.isReady === "function" ? system.isReady() : !!system;
  },

  // ===== EVENT BUS =====
  _eventListeners: new Map(),

  /**
   * Subscribe to an event
   * @param {string} event - Event name (use namespaced format: "system:event")
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  on(event, callback) {
    if (!this._eventListeners.has(event)) {
      this._eventListeners.set(event, []);
    }
    this._eventListeners.get(event).push(callback);

    // Return unsubscribe function
    return () => this.off(event, callback);
  },

  /**
   * Unsubscribe from an event
   * @param {string} event - Event name
   * @param {Function} callback - Callback function to remove
   * @returns {boolean} Success
   */
  off(event, callback) {
    if (!this._eventListeners.has(event)) {
      return false;
    }

    const listeners = this._eventListeners.get(event);
    const index = listeners.indexOf(callback);
    if (index !== -1) {
      listeners.splice(index, 1);
      return true;
    }
    return false;
  },

  /**
   * Subscribe to an event once (auto-unsubscribes after first call)
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  once(event, callback) {
    const wrappedCallback = (...args) => {
      this.off(event, wrappedCallback);
      callback(...args);
    };
    return this.on(event, wrappedCallback);
  },

  /**
   * Emit an event
   * @param {string} event - Event name
   * @param {any} data - Event data
   * @returns {number} Number of listeners called
   */
  emit(event, data) {
    const listeners = this._eventListeners.get(event);
    if (!listeners || listeners.length === 0) {
      return 0;
    }

    // Call all listeners with error handling
    let called = 0;
    for (const callback of listeners) {
      try {
        callback(data, event);
        called++;
      } catch (error) {
        this._log("error", `Event listener error for "${event}":`, error);
      }
    }

    return called;
  },

  /**
   * Remove all listeners for an event (or all events if no event specified)
   * @param {string} event - Event name (optional)
   */
  removeAllListeners(event = null) {
    if (event) {
      this._eventListeners.delete(event);
    } else {
      this._eventListeners.clear();
    }
  },

  /**
   * Get count of listeners for an event
   * @param {string} event - Event name
   * @returns {number} Listener count
   */
  listenerCount(event) {
    const listeners = this._eventListeners.get(event);
    return listeners ? listeners.length : 0;
  },

  // ===== HOOKS SYSTEM =====
  _hooks: new Map(),

  /**
   * Register a hook
   * @param {string} hookName - Hook name
   * @param {Function} callback - Hook callback (can be async)
   * @param {number} priority - Priority (lower runs first, default 10)
   * @returns {Function} Unregister function
   */
  registerHook(hookName, callback, priority = 10) {
    if (!this._hooks.has(hookName)) {
      this._hooks.set(hookName, []);
    }

    const hook = { callback, priority };
    const hooks = this._hooks.get(hookName);
    hooks.push(hook);

    // Sort by priority (lower first)
    hooks.sort((a, b) => a.priority - b.priority);

    this._log("debug", `Hook registered: ${hookName} (priority ${priority})`);

    // Return unregister function
    return () => {
      const index = hooks.indexOf(hook);
      if (index !== -1) {
        hooks.splice(index, 1);
      }
    };
  },

  /**
   * Run hooks sequentially
   * @param {string} hookName - Hook name
   * @param {any} context - Context object passed to hooks (can be modified)
   * @returns {Promise<any>} Modified context
   */
  async runHooks(hookName, context = {}) {
    const hooks = this._hooks.get(hookName);
    if (!hooks || hooks.length === 0) {
      return context;
    }

    this._log("debug", `Running ${hooks.length} hook(s): ${hookName}`);

    let currentContext = context;

    for (const hook of hooks) {
      try {
        const result = await hook.callback(currentContext);
        // If hook returns a value, use it as new context
        if (result !== undefined) {
          currentContext = result;
        }
      } catch (error) {
        this._log("error", `Hook error for "${hookName}":`, error);
        // Continue with other hooks even if one fails
      }
    }

    return currentContext;
  },

  /**
   * Check if a hook has any callbacks registered
   * @param {string} hookName - Hook name
   * @returns {boolean}
   */
  hasHook(hookName) {
    const hooks = this._hooks.get(hookName);
    return hooks && hooks.length > 0;
  },

  /**
   * Remove all hooks for a specific hook name
   * @param {string} hookName - Hook name
   */
  removeHook(hookName) {
    this._hooks.delete(hookName);
  },

  // ===== GLOBAL STATE MANAGEMENT =====
  _globalState: {
    // Active session
    session: {
      activePresetId: null,
      activePipelineId: null,
      orchestrationMode: "synthesis", // 'synthesis' | 'compilation' | 'injection'
    },

    // ST integration state
    stContext: {
      characterId: null,
      chatId: null,
      isConnected: false,
    },

    // UI state
    ui: {
      activeModal: null,
      navPosition: { x: 20, y: 100 },
      theme: "auto",
    },

    // User preferences (persisted)
    preferences: {
      debug: false,
      autoShowNav: true,
    },
  },

  _stateSubscribers: new Map(),

  /**
   * Get global state (or a specific path)
   * @param {string} path - Dot-notation path (e.g., "session.activePresetId")
   * @returns {any} State value
   */
  getState(path = null) {
    if (!path) {
      return { ...this._globalState };
    }

    // Navigate path
    const parts = path.split(".");
    let value = this._globalState;
    for (const part of parts) {
      if (value && typeof value === "object" && part in value) {
        value = value[part];
      } else {
        return undefined;
      }
    }
    return value;
  },

  /**
   * Set global state
   * @param {string} path - Dot-notation path
   * @param {any} value - New value
   * @param {boolean} persist - Whether to persist to storage
   */
  setState(path, value, persist = false) {
    // Navigate to parent and set value
    const parts = path.split(".");
    const key = parts.pop();
    let target = this._globalState;

    for (const part of parts) {
      if (!(part in target)) {
        target[part] = {};
      }
      target = target[part];
    }

    const oldValue = target[key];
    target[key] = value;

    // Notify subscribers
    this._notifyStateSubscribers(path, value, oldValue);

    // Emit event
    this._emit("kernel:state:changed", { path, value, oldValue });

    // Persist if requested
    if (persist) {
      this.saveState();
    }
  },

  /**
   * Subscribe to state changes
   * @param {string} path - Dot-notation path (or null for all changes)
   * @param {Function} callback - Callback(newValue, oldValue, path)
   * @returns {Function} Unsubscribe function
   */
  subscribe(path, callback) {
    if (!this._stateSubscribers.has(path)) {
      this._stateSubscribers.set(path, []);
    }
    this._stateSubscribers.get(path).push(callback);

    // Return unsubscribe function
    return () => {
      const subscribers = this._stateSubscribers.get(path);
      if (subscribers) {
        const index = subscribers.indexOf(callback);
        if (index !== -1) {
          subscribers.splice(index, 1);
        }
      }
    };
  },

  /**
   * Notify state subscribers
   * @param {string} path - Changed path
   * @param {any} newValue - New value
   * @param {any} oldValue - Old value
   */
  _notifyStateSubscribers(path, newValue, oldValue) {
    // Notify exact path subscribers
    const exactSubscribers = this._stateSubscribers.get(path);
    if (exactSubscribers) {
      for (const callback of exactSubscribers) {
        try {
          callback(newValue, oldValue, path);
        } catch (error) {
          this._log("error", `State subscriber error for "${path}":`, error);
        }
      }
    }

    // Notify wildcard subscribers (null = all)
    const wildcardSubscribers = this._stateSubscribers.get(null);
    if (wildcardSubscribers) {
      for (const callback of wildcardSubscribers) {
        try {
          callback(newValue, oldValue, path);
        } catch (error) {
          this._log("error", "State subscriber error (wildcard):", error);
        }
      }
    }
  },

  /**
   * Persist state to storage
   */
  async saveState() {
    try {
      // Use ST extension storage if available
      const stContext = window.SillyTavern?.getContext?.();
      if (stContext?.extensionSettings) {
        stContext.extensionSettings["TheCouncil_kernel_state"] = this._globalState;
        if (window.saveSettingsDebounced) {
          window.saveSettingsDebounced();
        }
      } else {
        // Fallback to localStorage
        localStorage.setItem("TheCouncil_kernel_state", JSON.stringify(this._globalState));
      }
      this._log("debug", "State saved");
    } catch (error) {
      this._log("error", "Failed to save state:", error);
    }
  },

  /**
   * Load state from storage
   */
  async loadState() {
    try {
      // Try ST extension storage first
      const stContext = window.SillyTavern?.getContext?.();
      if (stContext?.extensionSettings?.["TheCouncil_kernel_state"]) {
        const loaded = stContext.extensionSettings["TheCouncil_kernel_state"];
        this._globalState = { ...this._globalState, ...loaded };
        this._log("debug", "State loaded from ST extension settings");
        return;
      }

      // Fallback to localStorage
      const stored = localStorage.getItem("TheCouncil_kernel_state");
      if (stored) {
        const loaded = JSON.parse(stored);
        this._globalState = { ...this._globalState, ...loaded };
        this._log("debug", "State loaded from localStorage");
      }
    } catch (error) {
      this._log("error", "Failed to load state:", error);
    }
  },

  // ===== SETTINGS MANAGEMENT =====
  _settings: null,

  /**
   * Get settings
   * @param {string} path - Dot-notation path (optional)
   * @returns {any} Settings value
   */
  getSettings(path = null) {
    if (!this._settings) {
      return null;
    }

    if (!path) {
      return { ...this._settings };
    }

    // Navigate path
    const parts = path.split(".");
    let value = this._settings;
    for (const part of parts) {
      if (value && typeof value === "object" && part in value) {
        value = value[part];
      } else {
        return undefined;
      }
    }
    return value;
  },

  /**
   * Get a specific setting value
   * @param {string} path - Dot-notation path
   * @returns {any} Setting value
   */
  getSetting(path) {
    return this.getSettings(path);
  },

  /**
   * Update settings
   * @param {Object} updates - Settings updates (deep merge)
   */
  updateSettings(updates) {
    if (!this._settings) {
      this._settings = {};
    }

    // Deep merge
    this._settings = this._deepMerge(this._settings, updates);

    // Persist
    this.saveSettings();

    // Emit event
    this._emit("kernel:settings:changed", { settings: this._settings });
  },

  /**
   * Save settings to storage
   */
  async saveSettings() {
    try {
      const stContext = window.SillyTavern?.getContext?.();
      if (stContext?.extensionSettings) {
        stContext.extensionSettings["The_Council"] = this._settings;
        if (window.saveSettingsDebounced) {
          window.saveSettingsDebounced();
        }
      }
      this._log("debug", "Settings saved");
    } catch (error) {
      this._log("error", "Failed to save settings:", error);
    }
  },

  /**
   * Load settings from storage
   */
  async loadSettings() {
    try {
      const stContext = window.SillyTavern?.getContext?.();
      if (stContext?.extensionSettings?.["The_Council"]) {
        this._settings = stContext.extensionSettings["The_Council"];
        this._log("debug", "Settings loaded");
      }
    } catch (error) {
      this._log("error", "Failed to load settings:", error);
    }
  },

  /**
   * Reset settings to defaults
   */
  resetSettings() {
    this._settings = this._getDefaultSettings();
    this.saveSettings();
    this._emit("kernel:settings:reset", {});
  },

  /**
   * Get default settings
   * @returns {Object} Default settings
   */
  _getDefaultSettings() {
    return {
      version: this.VERSION,
      debug: false,
      autoShowNav: true,
      ui: {
        navPosition: { x: 20, y: 100 },
        theme: "auto",
      },
    };
  },

  // ===== STORAGE ABSTRACTION =====

  /**
   * Save data to storage with chat-scoped key
   * @param {string} key - Storage key
   * @param {any} data - Data to save
   * @param {Object} options - Storage options
   * @returns {Promise<boolean>} Success
   */
  async saveData(key, data, options = {}) {
    const { scope = "chat", merge = false } = options;

    try {
      const scopedKey = this._getScopedKey(key, scope);
      const stContext = window.SillyTavern?.getContext?.();

      if (stContext?.extensionSettings) {
        // Use ST extension storage
        if (merge && stContext.extensionSettings[scopedKey]) {
          const existing = stContext.extensionSettings[scopedKey];
          stContext.extensionSettings[scopedKey] = typeof existing === "object" && typeof data === "object"
            ? this._deepMerge(existing, data)
            : data;
        } else {
          stContext.extensionSettings[scopedKey] = data;
        }

        if (window.saveSettingsDebounced) {
          window.saveSettingsDebounced();
        }
        this._log("debug", `Data saved: ${scopedKey}`);
        this._emit("kernel:storage:saved", { key: scopedKey, scope });
        return true;
      } else {
        // Fallback to localStorage
        const storageKey = `TheCouncil_${scopedKey}`;
        if (merge) {
          const existing = localStorage.getItem(storageKey);
          if (existing) {
            const parsed = JSON.parse(existing);
            const merged = typeof parsed === "object" && typeof data === "object"
              ? this._deepMerge(parsed, data)
              : data;
            localStorage.setItem(storageKey, JSON.stringify(merged));
          } else {
            localStorage.setItem(storageKey, JSON.stringify(data));
          }
        } else {
          localStorage.setItem(storageKey, JSON.stringify(data));
        }
        this._log("debug", `Data saved to localStorage: ${storageKey}`);
        this._emit("kernel:storage:saved", { key: scopedKey, scope });
        return true;
      }
    } catch (error) {
      this._log("error", `Failed to save data for key "${key}":`, error);
      this._emit("kernel:storage:error", { key, error: error.message });
      return false;
    }
  },

  /**
   * Load data from storage with chat-scoped key
   * @param {string} key - Storage key
   * @param {Object} options - Storage options
   * @returns {Promise<any>} Loaded data or null
   */
  async loadData(key, options = {}) {
    const { scope = "chat", defaultValue = null } = options;

    try {
      const scopedKey = this._getScopedKey(key, scope);
      const stContext = window.SillyTavern?.getContext?.();

      if (stContext?.extensionSettings) {
        // Use ST extension storage
        const data = stContext.extensionSettings[scopedKey];
        if (data !== undefined) {
          this._log("debug", `Data loaded from ST: ${scopedKey}`);
          this._emit("kernel:storage:loaded", { key: scopedKey, scope });
          return data;
        }
      } else {
        // Fallback to localStorage
        const storageKey = `TheCouncil_${scopedKey}`;
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const data = JSON.parse(stored);
          this._log("debug", `Data loaded from localStorage: ${storageKey}`);
          this._emit("kernel:storage:loaded", { key: scopedKey, scope });
          return data;
        }
      }

      return defaultValue;
    } catch (error) {
      this._log("error", `Failed to load data for key "${key}":`, error);
      this._emit("kernel:storage:error", { key, error: error.message });
      return defaultValue;
    }
  },

  /**
   * Clear data from storage
   * @param {string} key - Storage key (if null, clears all Council data)
   * @param {Object} options - Storage options
   * @returns {Promise<boolean>} Success
   */
  async clearData(key = null, options = {}) {
    const { scope = "chat" } = options;

    try {
      if (key === null) {
        // Clear all Council data
        const stContext = window.SillyTavern?.getContext?.();
        if (stContext?.extensionSettings) {
          // Clear all keys starting with TheCouncil_
          const keysToDelete = Object.keys(stContext.extensionSettings).filter(k =>
            k.startsWith("TheCouncil_")
          );
          for (const k of keysToDelete) {
            delete stContext.extensionSettings[k];
          }
          if (window.saveSettingsDebounced) {
            window.saveSettingsDebounced();
          }
          this._log("info", "All Council data cleared from ST storage");
        } else {
          // Clear from localStorage
          const keysToDelete = [];
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith("TheCouncil_")) {
              keysToDelete.push(k);
            }
          }
          for (const k of keysToDelete) {
            localStorage.removeItem(k);
          }
          this._log("info", "All Council data cleared from localStorage");
        }
        this._emit("kernel:storage:cleared", { key: null });
        return true;
      } else {
        // Clear specific key
        const scopedKey = this._getScopedKey(key, scope);
        const stContext = window.SillyTavern?.getContext?.();

        if (stContext?.extensionSettings) {
          delete stContext.extensionSettings[scopedKey];
          if (window.saveSettingsDebounced) {
            window.saveSettingsDebounced();
          }
        } else {
          const storageKey = `TheCouncil_${scopedKey}`;
          localStorage.removeItem(storageKey);
        }

        this._log("debug", `Data cleared: ${scopedKey}`);
        this._emit("kernel:storage:cleared", { key: scopedKey, scope });
        return true;
      }
    } catch (error) {
      this._log("error", `Failed to clear data for key "${key}":`, error);
      this._emit("kernel:storage:error", { key, error: error.message });
      return false;
    }
  },

  /**
   * Get scoped storage key
   * @param {string} key - Base key
   * @param {string} scope - Scope ('global' | 'chat' | 'character')
   * @returns {string} Scoped key
   */
  _getScopedKey(key, scope) {
    if (scope === "global") {
      return `TheCouncil_${key}`;
    }

    const stContext = window.SillyTavern?.getContext?.();
    const chatId = stContext?.chatId || "default";
    const characterId = stContext?.characterId || "default";

    if (scope === "chat") {
      return `TheCouncil_chat_${chatId}_${key}`;
    } else if (scope === "character") {
      return `TheCouncil_char_${characterId}_${key}`;
    }

    // Default to chat scope
    return `TheCouncil_chat_${chatId}_${key}`;
  },

  /**
   * Check if data exists for a key
   * @param {string} key - Storage key
   * @param {Object} options - Storage options
   * @returns {Promise<boolean>} True if exists
   */
  async hasData(key, options = {}) {
    const data = await this.loadData(key, options);
    return data !== null;
  },

  // ===== PRESET MANAGEMENT =====

  /**
   * Presets directory relative to extension
   * @type {string}
   */
  PRESETS_DIR: "data/presets",

  /**
   * Extension path - set during init
   * @type {string}
   */
  _extensionPath: "",

  /**
   * Loaded presets cache
   * @type {Map<string, Object>}
   */
  _presets: new Map(),

  /**
   * Discover available presets from data/presets/
   * @returns {Promise<Array>} Array of preset metadata
   */
  async discoverPresets() {
    this._log("info", "Discovering presets...");

    try {
      const presetFiles = await this._listPresetFiles();
      this._log("info", `Found ${presetFiles.length} preset file(s)`);

      const loadPromises = presetFiles.map(file =>
        this._loadPresetFile(file).catch(err => {
          this._log("error", `Failed to load preset ${file}: ${err.message}`);
          return null;
        })
      );

      const results = await Promise.all(loadPromises);
      const validPresets = results.filter(p => p !== null);

      // Cache all valid presets
      for (const preset of validPresets) {
        this._presets.set(preset.id, preset);
        this._log("info", `Loaded preset: ${preset.name} (${preset.id})`);
      }

      this._emit("kernel:presets:discovered", {
        count: validPresets.length,
        presets: validPresets.map(p => ({ id: p.id, name: p.name, description: p.description }))
      });

      // Return metadata only
      return validPresets.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        version: p.version,
        metadata: p.metadata
      }));
    } catch (error) {
      this._log("error", `Failed to discover presets: ${error.message}`);
      this._emit("kernel:presets:error", { error: error.message });
      return [];
    }
  },

  /**
   * List preset files in the presets directory
   * @returns {Promise<string[]>} Array of file paths
   */
  async _listPresetFiles() {
    const presetsPath = this._getPresetsPath();

    // Try to fetch known preset files
    const knownFiles = [
      "default-pipeline.json",
      "standard-pipeline.json",
      "quick-pipeline.json"
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

      // Validate preset structure
      if (!preset.id || !preset.name) {
        throw new Error("Preset missing required fields (id, name)");
      }

      // Add source file reference
      preset._sourceFile = filePath;

      return preset;
    } catch (error) {
      this._log("error", `Error loading preset from ${filePath}: ${error.message}`);
      return null;
    }
  },

  /**
   * Load a preset by ID
   * @param {string} presetId - Preset ID
   * @returns {Promise<Object>} Loaded preset
   */
  async loadPreset(presetId) {
    // Check if already in cache
    if (this._presets.has(presetId)) {
      this._log("debug", `Preset loaded from cache: ${presetId}`);
      return this._presets.get(presetId);
    }

    // Try to discover presets if not cached
    await this.discoverPresets();

    if (this._presets.has(presetId)) {
      return this._presets.get(presetId);
    }

    throw new Error(`Preset "${presetId}" not found`);
  },

  /**
   * Apply a preset to all systems
   * @param {string|Object} presetIdOrData - Preset ID or preset object
   * @param {Object} options - Application options
   * @returns {Promise<Object>} Application result
   */
  async applyPreset(presetIdOrData, options = {}) {
    let preset;

    // Load preset if ID provided
    if (typeof presetIdOrData === "string") {
      preset = await this.loadPreset(presetIdOrData);
    } else {
      preset = presetIdOrData;
    }

    if (!preset) {
      throw new Error("Invalid preset data");
    }

    this._log("info", `Applying preset: ${preset.name} (${preset.id})`);

    // Run beforePresetApply hook
    await this.runHooks("beforePresetApply", preset);

    const results = {
      presetId: preset.id,
      presetName: preset.name,
      systems: {},
      errors: []
    };

    try {
      // Apply to each system that has an applyPreset method
      for (const [systemName, system] of this._systems) {
        if (typeof system.applyPreset === "function") {
          try {
            this._log("debug", `Applying preset to system: ${systemName}`);
            const systemResult = await system.applyPreset(preset, options);
            results.systems[systemName] = systemResult;
          } catch (error) {
            const errorMsg = `${systemName}: ${error.message}`;
            results.errors.push(errorMsg);
            this._log("error", `Failed to apply preset to ${systemName}:`, error);
          }
        }
      }

      // Update global state
      this.setState("session.activePresetId", preset.id, true);

      // Run afterPresetApply hook
      await this.runHooks("afterPresetApply", { preset, results });

      this._log("info", `Preset applied: ${preset.name}`, results);
      this._emit("kernel:preset:applied", { preset, results });

      return results;
    } catch (error) {
      this._log("error", `Failed to apply preset: ${error.message}`);
      this._emit("kernel:preset:error", { preset, error: error.message });
      throw error;
    }
  },

  /**
   * Save current configuration as a new preset
   * @param {string} name - Preset name
   * @param {Object} options - Save options
   * @returns {Promise<Object>} Created preset
   */
  async saveAsPreset(name, options = {}) {
    const {
      id = `custom_${Date.now()}`,
      description = "Custom preset created from current configuration"
    } = options;

    this._log("info", `Creating preset from current state: ${name}`);

    const preset = {
      id,
      name,
      description,
      version: this.VERSION,
      metadata: {
        createdAt: new Date().toISOString(),
        author: "User",
        tags: ["custom"]
      }
    };

    // Collect configuration from each system
    for (const [systemName, system] of this._systems) {
      if (typeof system.exportPresetData === "function") {
        try {
          const systemData = await system.exportPresetData();
          Object.assign(preset, systemData);
          this._log("debug", `Exported preset data from system: ${systemName}`);
        } catch (error) {
          this._log("warn", `Failed to export from ${systemName}: ${error.message}`);
        }
      }
    }

    // Cache the preset
    this._presets.set(preset.id, preset);

    // Optionally save to storage
    if (options.persist !== false) {
      await this.saveData(`preset_${preset.id}`, preset, { scope: "global" });
    }

    this._log("info", `Preset created: ${preset.name} (${preset.id})`);
    this._emit("kernel:preset:created", { preset });

    return preset;
  },

  /**
   * Get current preset ID
   * @returns {string|null}
   */
  getCurrentPresetId() {
    return this.getState("session.activePresetId");
  },

  /**
   * Get current preset object
   * @returns {Object|null}
   */
  getCurrentPreset() {
    const presetId = this.getCurrentPresetId();
    if (!presetId) {
      return null;
    }
    return this._presets.get(presetId) || null;
  },

  /**
   * Get all cached presets
   * @returns {Array<Object>} Array of preset metadata
   */
  getAllPresets() {
    return Array.from(this._presets.values()).map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      version: p.version,
      metadata: p.metadata
    }));
  },

  /**
   * Get a specific preset from cache
   * @param {string} presetId - Preset ID
   * @returns {Object|null}
   */
  getPreset(presetId) {
    return this._presets.get(presetId) || null;
  },

  /**
   * Export a preset as JSON
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
      exportedAt: new Date().toISOString()
    };

    return JSON.stringify(exportData, null, 2);
  },

  /**
   * Import a preset from JSON
   * @param {string|Object} data - JSON string or preset object
   * @param {Object} options - Import options
   * @returns {Object} Imported preset
   */
  importPreset(data, options = {}) {
    const { applyImmediately = false } = options;

    // Parse if string
    let preset = typeof data === "string" ? JSON.parse(data) : data;

    // Validate
    if (!preset.id || !preset.name) {
      throw new Error("Invalid preset: missing required fields (id, name)");
    }

    // Check for ID conflict
    if (this._presets.has(preset.id) && !options.overwrite) {
      preset.id = `${preset.id}_imported_${Date.now()}`;
      preset.name = `${preset.name} (Imported)`;
    }

    // Cache
    this._presets.set(preset.id, preset);

    this._log("info", `Preset imported: ${preset.name} (${preset.id})`);
    this._emit("kernel:preset:imported", { preset });

    // Apply if requested
    if (applyImmediately) {
      return this.applyPreset(preset.id);
    }

    return preset;
  },

  // ===== BOOTSTRAP SEQUENCE =====

  /**
   * Initialize the Kernel
   * @param {Object} options - Initialization options
   * @returns {Promise<Object>} Kernel instance
   */
  async init(options = {}) {
    if (this._initialized) {
      this._log("warn", "Kernel already initialized");
      return this;
    }

    if (this._initializationPromise) {
      return this._initializationPromise;
    }

    this._initializationPromise = (async () => {
      this._log("log", `Initializing TheCouncil Kernel v${this.VERSION}...`);

      try {
        // Emit pre-init hook
        await this.runHooks("beforeKernelInit", options);

        // 1. Load settings and state
        await this.loadSettings();
        await this.loadState();

        // Initialize with default settings if not loaded
        if (!this._settings) {
          this._settings = this._getDefaultSettings();
        }

        // Apply options overrides
        if (options.debug !== undefined) {
          this._settings.debug = options.debug;
        }

        // 2. Register Logger as first module (if available)
        if (window.Logger) {
          window.Logger.init({
            prefix: "The_Council",
            level: this._settings.debug ? "debug" : "info",
          });
          this.registerModule("logger", window.Logger);
        }

        // 3. Register other utility modules (will be registered by bootstrap)
        // These are registered by the bootstrap process in index.js

        // 4. Systems will be registered by bootstrap process

        // Emit post-init hook
        await this.runHooks("afterKernelInit", this);

        this._initialized = true;
        this._log("log", "Kernel initialized successfully");
        this._emit("kernel:ready", { version: this.VERSION });

        return this;
      } catch (error) {
        this._log("error", "Kernel initialization failed:", error);
        this._emit("kernel:error", { error });
        throw error;
      }
    })();

    return this._initializationPromise;
  },

  /**
   * Check if Kernel is initialized
   * @returns {boolean}
   */
  isInitialized() {
    return this._initialized;
  },

  // ===== UTILITY METHODS =====

  /**
   * Deep merge two objects
   * @param {Object} target - Target object
   * @param {Object} source - Source object
   * @returns {Object} Merged object
   */
  _deepMerge(target, source) {
    const result = { ...target };
    for (const key in source) {
      if (source[key] && typeof source[key] === "object" && !Array.isArray(source[key])) {
        result[key] = this._deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    return result;
  },

  /**
   * Internal logging (before logger is available)
   * @param {string} level - Log level
   * @param {string} message - Message
   * @param {...any} args - Additional arguments
   */
  _log(level, message, ...args) {
    const logger = this.getModule("logger");
    if (logger) {
      logger[level](message, ...args);
    } else {
      // Fallback to console
      const method = level === "error" ? "error" : level === "warn" ? "warn" : "log";
      console[method](`[The_Council][Kernel] ${message}`, ...args);
    }
  },

  /**
   * Internal emit shorthand
   * @param {string} event - Event name
   * @param {any} data - Event data
   */
  _emit(event, data) {
    this.emit(event, data);
  },

  // ===== CONVENIENCE METHODS (Delegate to Systems) =====

  /**
   * Get summary of Kernel and all systems
   * @returns {Object} Summary
   */
  getSummary() {
    const systems = {};
    for (const [name, system] of this._systems) {
      systems[name] = typeof system.getSummary === "function" ? system.getSummary() : "ready";
    }

    return {
      version: this.VERSION,
      initialized: this._initialized,
      modules: Array.from(this._modules.keys()),
      systems: systems,
      state: this._globalState,
      settings: this._settings,
    };
  },

  /**
   * Run a pipeline (delegates to OrchestrationSystem)
   * @param {string} pipelineId - Pipeline ID
   * @param {Object} options - Run options
   * @returns {Promise}
   */
  async runPipeline(pipelineId, options = {}) {
    const orchestration = this.getSystem("orchestration");
    if (!orchestration) {
      throw new Error("Orchestration System not available");
    }
    return orchestration.startRun(pipelineId, options);
  },

  /**
   * Abort current pipeline run
   */
  abortRun() {
    const orchestration = this.getSystem("orchestration");
    if (orchestration) {
      return orchestration.abortRun();
    }
  },

  /**
   * Get current run state
   * @returns {Object|null}
   */
  getRunState() {
    const orchestration = this.getSystem("orchestration");
    if (orchestration) {
      return orchestration.getRunState();
    }
    return null;
  },

  /**
   * Show UI modal
   * @param {string} modalName - Modal name
   */
  showUI(modalName) {
    this._emit("ui:show", { modalName });
  },

  /**
   * Hide UI modal
   * @param {string} modalName - Modal name
   */
  hideUI(modalName) {
    this._emit("ui:hide", { modalName });
  },

  /**
   * Toggle UI modal
   * @param {string} modalName - Modal name
   */
  toggleUI(modalName) {
    this._emit("ui:toggle", { modalName });
  },

  /**
   * Get active modal
   * @returns {string|null}
   */
  getActiveModal() {
    return this.getState("ui.activeModal");
  },

  // ===== UI INFRASTRUCTURE =====

  /**
   * Registered modals
   * @type {Map<string, Object>}
   */
  _modals: new Map(),

  /**
   * Register a modal
   * @param {string} name - Modal name/ID
   * @param {Object} modal - Modal instance with show/hide methods
   * @returns {boolean} Success
   */
  registerModal(name, modal) {
    if (this._modals.has(name)) {
      this._log("warn", `Modal "${name}" already registered, overwriting`);
    }

    // Validate modal has required methods
    if (typeof modal.show !== "function" || typeof modal.hide !== "function") {
      this._log("error", `Modal "${name}" must have show() and hide() methods`);
      return false;
    }

    this._modals.set(name, modal);
    this._log("debug", `Modal registered: ${name}`);
    this._emit("kernel:modal:registered", { name, modal });
    return true;
  },

  /**
   * Unregister a modal
   * @param {string} name - Modal name
   * @returns {boolean} Success
   */
  unregisterModal(name) {
    if (!this._modals.has(name)) {
      return false;
    }
    this._modals.delete(name);
    this._log("debug", `Modal unregistered: ${name}`);
    this._emit("kernel:modal:unregistered", { name });
    return true;
  },

  /**
   * Show a modal
   * @param {string} name - Modal name
   * @param {Object} options - Options to pass to modal.show()
   * @returns {boolean} Success
   */
  showModal(name, options = {}) {
    const modal = this._modals.get(name);
    if (!modal) {
      this._log("warn", `Modal "${name}" not found`);
      return false;
    }

    // Hide current active modal if different
    const currentActive = this.getState("ui.activeModal");
    if (currentActive && currentActive !== name) {
      this.hideModal(currentActive);
    }

    try {
      modal.show(options);
      this.setState("ui.activeModal", name);
      this._log("debug", `Modal shown: ${name}`);
      this._emit("kernel:modal:shown", { name, options });
      return true;
    } catch (error) {
      this._log("error", `Failed to show modal "${name}":`, error);
      return false;
    }
  },

  /**
   * Hide a modal
   * @param {string} name - Modal name
   * @returns {boolean} Success
   */
  hideModal(name) {
    const modal = this._modals.get(name);
    if (!modal) {
      this._log("warn", `Modal "${name}" not found`);
      return false;
    }

    try {
      modal.hide();

      // Clear active modal if this was it
      if (this.getState("ui.activeModal") === name) {
        this.setState("ui.activeModal", null);
      }

      this._log("debug", `Modal hidden: ${name}`);
      this._emit("kernel:modal:hidden", { name });
      return true;
    } catch (error) {
      this._log("error", `Failed to hide modal "${name}":`, error);
      return false;
    }
  },

  /**
   * Toggle a modal
   * @param {string} name - Modal name
   * @param {Object} options - Options to pass to modal if showing
   * @returns {boolean} Success
   */
  toggleModal(name, options = {}) {
    const modal = this._modals.get(name);
    if (!modal) {
      this._log("warn", `Modal "${name}" not found`);
      return false;
    }

    // Check if modal is visible
    const isVisible = typeof modal.isVisible === "function" ? modal.isVisible() : false;

    if (isVisible) {
      return this.hideModal(name);
    } else {
      return this.showModal(name, options);
    }
  },

  /**
   * Get a registered modal
   * @param {string} name - Modal name
   * @returns {Object|null} Modal instance or null
   */
  getModal(name) {
    return this._modals.get(name) || null;
  },

  /**
   * Get all registered modal names
   * @returns {string[]} Array of modal names
   */
  getAllModalNames() {
    return Array.from(this._modals.keys());
  },

  /**
   * Toast container element
   * @type {HTMLElement|null}
   */
  _toastContainer: null,

  /**
   * Active toasts
   * @type {Set<HTMLElement>}
   */
  _activeToasts: new Set(),

  /**
   * Show a toast notification
   * @param {string} message - Message to display
   * @param {string} type - Type: 'info', 'success', 'warning', 'error' (default: 'info')
   * @param {number} duration - Duration in ms (default: 3000, 0 = permanent)
   * @returns {Object} Toast object with remove() method
   */
  toast(message, type = "info", duration = 3000) {
    // Ensure toast container exists
    if (!this._toastContainer) {
      this._createToastContainer();
    }

    // Create toast element
    const toast = document.createElement("div");
    toast.className = `council-toast council-toast-${type}`;
    toast.setAttribute("role", "alert");
    toast.setAttribute("aria-live", "polite");

    // Add icon based on type
    const icon = document.createElement("span");
    icon.className = "council-toast-icon";
    icon.textContent = this._getToastIcon(type);
    toast.appendChild(icon);

    // Add message
    const messageEl = document.createElement("span");
    messageEl.className = "council-toast-message";
    messageEl.textContent = message;
    toast.appendChild(messageEl);

    // Add close button
    const closeBtn = document.createElement("button");
    closeBtn.className = "council-toast-close";
    closeBtn.textContent = "×";
    closeBtn.setAttribute("aria-label", "Close notification");
    closeBtn.addEventListener("click", () => removeToast());
    toast.appendChild(closeBtn);

    // Add to container
    this._toastContainer.appendChild(toast);
    this._activeToasts.add(toast);

    // Trigger animation
    setTimeout(() => toast.classList.add("visible"), 10);

    // Auto-remove after duration
    let timeoutId = null;
    if (duration > 0) {
      timeoutId = setTimeout(() => removeToast(), duration);
    }

    // Remove function
    const removeToast = () => {
      if (timeoutId) clearTimeout(timeoutId);
      toast.classList.remove("visible");
      setTimeout(() => {
        toast.remove();
        this._activeToasts.delete(toast);
      }, 300);
    };

    this._log("debug", `Toast shown: ${type} - ${message}`);
    this._emit("kernel:toast:shown", { message, type, duration });

    return { remove: removeToast, element: toast };
  },

  /**
   * Create toast container
   */
  _createToastContainer() {
    this._toastContainer = document.createElement("div");
    this._toastContainer.id = "council-toast-container";
    this._toastContainer.className = "council-toast-container";
    document.body.appendChild(this._toastContainer);

    // Inject toast styles
    this._injectToastStyles();
  },

  /**
   * Get icon for toast type
   * @param {string} type - Toast type
   * @returns {string} Icon character
   */
  _getToastIcon(type) {
    const icons = {
      info: "ℹ️",
      success: "✓",
      warning: "⚠️",
      error: "✕"
    };
    return icons[type] || icons.info;
  },

  /**
   * Inject toast styles
   */
  _injectToastStyles() {
    if (document.getElementById("council-toast-styles")) return;

    const style = document.createElement("style");
    style.id = "council-toast-styles";
    style.textContent = `
      .council-toast-container {
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 10003;
        display: flex;
        flex-direction: column;
        gap: 10px;
        max-width: 400px;
        pointer-events: none;
      }

      .council-toast {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px 16px;
        background: var(--SmartThemeBlurTintColor, #1a1a2e);
        border: 1px solid var(--SmartThemeBorderColor, #444);
        border-radius: 8px;
        color: var(--SmartThemeBodyColor, #eee);
        font-size: 14px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        opacity: 0;
        transform: translateX(100%);
        transition: opacity 0.3s ease, transform 0.3s ease;
        pointer-events: auto;
      }

      .council-toast.visible {
        opacity: 1;
        transform: translateX(0);
      }

      .council-toast-icon {
        font-size: 18px;
        flex-shrink: 0;
      }

      .council-toast-message {
        flex: 1;
        word-break: break-word;
      }

      .council-toast-close {
        background: none;
        border: none;
        color: inherit;
        font-size: 20px;
        line-height: 1;
        cursor: pointer;
        padding: 0;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0.6;
        transition: opacity 0.2s;
        flex-shrink: 0;
      }

      .council-toast-close:hover {
        opacity: 1;
      }

      .council-toast-info {
        border-left: 3px solid #60a5fa;
      }

      .council-toast-success {
        border-left: 3px solid #4ade80;
      }

      .council-toast-warning {
        border-left: 3px solid #fbbf24;
      }

      .council-toast-error {
        border-left: 3px solid #f87171;
      }

      @media (max-width: 768px) {
        .council-toast-container {
          left: 10px;
          right: 10px;
          bottom: 10px;
          max-width: none;
        }
      }
    `;
    document.head.appendChild(style);
  },

  /**
   * Clear all toasts
   */
  clearToasts() {
    for (const toast of this._activeToasts) {
      toast.classList.remove("visible");
      setTimeout(() => toast.remove(), 300);
    }
    this._activeToasts.clear();
  },

  /**
   * Confirmation dialog element
   * @type {HTMLElement|null}
   */
  _confirmDialog: null,

  /**
   * Show a confirmation dialog
   * @param {string} message - Confirmation message
   * @param {Object} options - Options
   * @param {string} options.title - Dialog title (default: "Confirm")
   * @param {string} options.confirmText - Confirm button text (default: "Confirm")
   * @param {string} options.cancelText - Cancel button text (default: "Cancel")
   * @param {string} options.type - Type: 'info', 'warning', 'danger' (default: 'info')
   * @returns {Promise<boolean>} Resolves to true if confirmed, false if cancelled
   */
  confirm(message, options = {}) {
    const {
      title = "Confirm",
      confirmText = "Confirm",
      cancelText = "Cancel",
      type = "info"
    } = options;

    return new Promise((resolve) => {
      // Create dialog if it doesn't exist
      if (!this._confirmDialog) {
        this._createConfirmDialog();
      }

      // Update dialog content
      const dialog = this._confirmDialog;
      dialog.querySelector(".council-confirm-title").textContent = title;
      dialog.querySelector(".council-confirm-message").textContent = message;
      dialog.querySelector(".council-confirm-btn").textContent = confirmText;
      dialog.querySelector(".council-confirm-cancel").textContent = cancelText;

      // Set type class
      const container = dialog.querySelector(".council-confirm-container");
      container.className = `council-confirm-container council-confirm-${type}`;

      // Handle confirm
      const handleConfirm = () => {
        cleanup();
        resolve(true);
      };

      // Handle cancel
      const handleCancel = () => {
        cleanup();
        resolve(false);
      };

      // Cleanup function
      const cleanup = () => {
        dialog.classList.remove("visible");
        confirmBtn.removeEventListener("click", handleConfirm);
        cancelBtn.removeEventListener("click", handleCancel);
        dialog.removeEventListener("click", handleBackdropClick);
      };

      // Backdrop click
      const handleBackdropClick = (e) => {
        if (e.target === dialog) {
          handleCancel();
        }
      };

      // Attach event listeners
      const confirmBtn = dialog.querySelector(".council-confirm-btn");
      const cancelBtn = dialog.querySelector(".council-confirm-cancel");

      confirmBtn.addEventListener("click", handleConfirm);
      cancelBtn.addEventListener("click", handleCancel);
      dialog.addEventListener("click", handleBackdropClick);

      // Show dialog
      dialog.classList.add("visible");

      this._log("debug", `Confirmation dialog shown: ${message}`);
      this._emit("kernel:confirm:shown", { message, options });
    });
  },

  /**
   * Create confirmation dialog
   */
  _createConfirmDialog() {
    this._confirmDialog = document.createElement("div");
    this._confirmDialog.className = "council-confirm-dialog";
    this._confirmDialog.setAttribute("role", "dialog");
    this._confirmDialog.setAttribute("aria-modal", "true");
    this._confirmDialog.innerHTML = `
      <div class="council-confirm-container">
        <div class="council-confirm-header">
          <h3 class="council-confirm-title">Confirm</h3>
        </div>
        <div class="council-confirm-body">
          <p class="council-confirm-message"></p>
        </div>
        <div class="council-confirm-footer">
          <button class="council-confirm-cancel">Cancel</button>
          <button class="council-confirm-btn">Confirm</button>
        </div>
      </div>
    `;
    document.body.appendChild(this._confirmDialog);

    // Inject confirm styles
    this._injectConfirmStyles();
  },

  /**
   * Inject confirmation dialog styles
   */
  _injectConfirmStyles() {
    if (document.getElementById("council-confirm-styles")) return;

    const style = document.createElement("style");
    style.id = "council-confirm-styles";
    style.textContent = `
      .council-confirm-dialog {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        z-index: 10002;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.2s ease, visibility 0.2s ease;
      }

      .council-confirm-dialog.visible {
        opacity: 1;
        visibility: visible;
      }

      .council-confirm-container {
        background: var(--SmartThemeBlurTintColor, #1a1a2e);
        border: 1px solid var(--SmartThemeBorderColor, #444);
        border-radius: 12px;
        width: 90%;
        max-width: 450px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
        transform: scale(0.9);
        transition: transform 0.2s ease;
      }

      .council-confirm-dialog.visible .council-confirm-container {
        transform: scale(1);
      }

      .council-confirm-header {
        padding: 16px 20px;
        border-bottom: 1px solid var(--SmartThemeBorderColor, #333);
      }

      .council-confirm-title {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
        color: var(--SmartThemeBodyColor, #eee);
      }

      .council-confirm-body {
        padding: 20px;
      }

      .council-confirm-message {
        margin: 0;
        font-size: 14px;
        line-height: 1.6;
        color: var(--SmartThemeBodyColor, #ccc);
      }

      .council-confirm-footer {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        padding: 16px 20px;
        border-top: 1px solid var(--SmartThemeBorderColor, #333);
        background: rgba(0, 0, 0, 0.2);
        border-radius: 0 0 12px 12px;
      }

      .council-confirm-cancel,
      .council-confirm-btn {
        padding: 10px 20px;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        border: none;
      }

      .council-confirm-cancel {
        background: rgba(255, 255, 255, 0.1);
        color: var(--SmartThemeBodyColor, #ccc);
      }

      .council-confirm-cancel:hover {
        background: rgba(255, 255, 255, 0.15);
      }

      .council-confirm-btn {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
      }

      .council-confirm-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
      }

      .council-confirm-container.council-confirm-danger .council-confirm-btn {
        background: linear-gradient(135deg, #f87171 0%, #dc2626 100%);
      }

      .council-confirm-container.council-confirm-warning .council-confirm-btn {
        background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
      }

      @media (max-width: 768px) {
        .council-confirm-container {
          width: 95%;
        }

        .council-confirm-footer {
          flex-direction: column-reverse;
        }

        .council-confirm-cancel,
        .council-confirm-btn {
          width: 100%;
        }
      }
    `;
    document.head.appendChild(style);
  },

  // ===== ST INTEGRATION =====

  /**
   * Get SillyTavern context
   * @returns {Object}
   */
  getSTContext() {
    return window.SillyTavern?.getContext?.() || {};
  },

  /**
   * Register SillyTavern integration handlers
   */
  registerSTHandlers() {
    this._log("debug", "Registering ST integration handlers");
    this._emit("kernel:st:register", {});
  },
};

// ===== EXPORT =====

// Expose to window
if (typeof window !== "undefined") {
  window.TheCouncilKernel = TheCouncilKernel;
  // Also expose as window.TheCouncil (main API)
  window.TheCouncil = TheCouncilKernel;
}

// CommonJS export
if (typeof module !== "undefined" && module.exports) {
  module.exports = TheCouncilKernel;
}
