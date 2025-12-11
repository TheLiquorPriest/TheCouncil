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

  // ===== PRESET MANAGEMENT (Delegates to PresetManager) =====

  /**
   * Discover available presets
   * @returns {Promise<Array>}
   */
  async discoverPresets() {
    const presetManager = this.getModule("presetManager") || this.getSystem("presetManager");
    if (presetManager) {
      return presetManager.discoverPresets();
    }
    return [];
  },

  /**
   * Load a preset
   * @param {string} presetId - Preset ID
   * @returns {Promise<Object>}
   */
  async loadPreset(presetId) {
    const presetManager = this.getModule("presetManager") || this.getSystem("presetManager");
    if (!presetManager) {
      throw new Error("PresetManager not available");
    }
    return presetManager.loadPreset(presetId);
  },

  /**
   * Apply a preset
   * @param {Object} preset - Preset data
   * @returns {Promise}
   */
  async applyPreset(preset) {
    const presetManager = this.getModule("presetManager") || this.getSystem("presetManager");
    if (!presetManager) {
      throw new Error("PresetManager not available");
    }
    await this.runHooks("beforePresetApply", preset);
    await presetManager.applyPreset(preset);
    await this.runHooks("afterPresetApply", preset);
    this.setState("session.activePresetId", preset.id, true);
  },

  /**
   * Get current preset
   * @returns {Object|null}
   */
  getCurrentPreset() {
    const presetId = this.getState("session.activePresetId");
    if (!presetId) {
      return null;
    }
    const presetManager = this.getModule("presetManager") || this.getSystem("presetManager");
    if (presetManager && typeof presetManager.getPreset === "function") {
      return presetManager.getPreset(presetId);
    }
    return null;
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
