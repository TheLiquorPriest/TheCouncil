/**
 * TheCouncil - Multi-LLM Story Production Pipeline
 * Entry point and system orchestrator for SillyTavern extension
 *
 * Three-System Architecture:
 * - AGENTS SYSTEM: Define and staff a creative writing "company"
 * - CURATION SYSTEM: Data management with structured schemas
 * - RESPONSE PIPELINE SYSTEM: Editorial workflow producing final content
 *
 * @version 2.0.0
 */

(function () {
  "use strict";

  // ===== EXTENSION METADATA =====
  const EXTENSION_NAME = "The_Council";
  const EXTENSION_PATH = "scripts/extensions/third-party/TheCouncil";
  const VERSION = "2.0.0";
  const DEBUG = true;

  // ===== SYSTEM REFERENCES =====
  const Systems = {
    // Core Systems
    AgentsSystem: null,
    CurationSystem: null,
    PipelineSystem: null,

    // Support Modules
    ContextManager: null,
    OutputManager: null,
    ThreadManager: null,

    // Utilities
    Logger: null,
    TokenResolver: null,
    ApiClient: null,

    // UI Modals
    AgentsModal: null,
    CurationModal: null,
    PipelineModal: null,
    GavelModal: null,
    NavModal: null,

    // Schemas
    SystemSchemas: null,
  };

  // ===== LEGACY MODULE REFERENCES =====
  const LegacyModules = {
    Config: null,
    State: null,
    Stores: null,
    Context: null,
    Topology: null,
    Generation: null,
    Agents: null,
    Pipeline: null,
    UI: null,
  };

  // ===== STATE =====
  let extensionSettings = null;
  let isInitialized = false;
  let initializationPromise = null;

  // ===== LOGGING =====

  /**
   * Create a simple logger before the full logger is loaded
   */
  const BootstrapLogger = {
    log(msg, ...args) {
      console.log(`[${EXTENSION_NAME}] ${msg}`, ...args);
    },
    debug(msg, ...args) {
      if (DEBUG) console.log(`[${EXTENSION_NAME}][DEBUG] ${msg}`, ...args);
    },
    warn(msg, ...args) {
      console.warn(`[${EXTENSION_NAME}][WARN] ${msg}`, ...args);
    },
    error(msg, ...args) {
      console.error(`[${EXTENSION_NAME}][ERROR] ${msg}`, ...args);
    },
  };

  let logger = BootstrapLogger;

  // ===== SCRIPT LOADING =====

  /**
   * Load a module script dynamically
   * @param {string} src - Script source path
   * @returns {Promise<void>}
   */
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      if (document.querySelector(`script[src="${src}"]`)) {
        logger.debug(`Already loaded: ${src}`);
        resolve();
        return;
      }

      const script = document.createElement("script");
      script.src = src;
      script.onload = () => {
        logger.debug(`Loaded: ${src}`);
        resolve();
      };
      script.onerror = (e) => {
        logger.error(`Failed to load: ${src}`, e);
        reject(new Error(`Failed to load ${src}`));
      };
      document.head.appendChild(script);
    });
  }

  /**
   * Load a CSS stylesheet
   * @param {string} href - Stylesheet path
   */
  function loadStylesheet(href) {
    if (document.querySelector(`link[href="${href}"]`)) {
      return;
    }

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
  }

  // ===== MODULE LOADING =====

  /**
   * Load all new architecture modules
   */
  async function loadNewArchitecture() {
    logger.log("Loading new architecture modules...");

    const basePath = EXTENSION_PATH;

    // Order matters: schemas and utils first, then core, then UI
    const moduleFiles = [
      // Schemas
      "schemas/systems.js",

      // Utilities
      "utils/logger.js",
      "utils/token-resolver.js",
      "utils/api-client.js",

      // Core Systems
      "core/agents-system.js",
      "core/curation-system.js",
      "core/context-manager.js",
      "core/output-manager.js",
      "core/thread-manager.js",
      "core/pipeline-system.js",

      // UI Modals
      "ui/agents-modal.js",
      "ui/curation-modal.js",
      "ui/pipeline-modal.js",
      "ui/gavel-modal.js",
      "ui/nav-modal.js",
    ];

    for (const file of moduleFiles) {
      try {
        await loadScript(`${basePath}/${file}`);
      } catch (e) {
        logger.error(`Failed to load module: ${file}`, e);
        throw e;
      }
    }

    // Load stylesheet
    loadStylesheet(`${basePath}/styles/main.css`);

    // Get module references from global scope
    Systems.SystemSchemas = window.SystemSchemas || null;
    Systems.Logger = window.Logger || null;
    Systems.TokenResolver = window.TokenResolver || null;
    Systems.ApiClient = window.ApiClient || null;
    Systems.AgentsSystem = window.AgentsSystem || null;
    Systems.CurationSystem = window.CurationSystem || null;
    Systems.ContextManager = window.ContextManager || null;
    Systems.OutputManager = window.OutputManager || null;
    Systems.ThreadManager = window.ThreadManager || null;
    Systems.PipelineSystem = window.PipelineSystem || null;
    Systems.AgentsModal = window.AgentsModal || null;
    Systems.CurationModal = window.CurationModal || null;
    Systems.PipelineModal = window.PipelineModal || null;
    Systems.GavelModal = window.GavelModal || null;
    Systems.NavModal = window.NavModal || null;

    logger.log("New architecture modules loaded");

    return true;
  }

  /**
   * Load legacy modules for backward compatibility
   */
  async function loadLegacyModules() {
    logger.log("Loading legacy modules (backward compatibility)...");

    const basePath = EXTENSION_PATH;

    const legacyFiles = [
      "modules/config.js",
      "modules/state.js",
      "modules/stores.js",
      "modules/context.js",
      "modules/topology.js",
      "modules/generation.js",
      "modules/agents.js",
      "modules/pipeline.js",
      "modules/ui.js",
    ];

    for (const file of legacyFiles) {
      try {
        await loadScript(`${basePath}/${file}`);
      } catch (e) {
        // Legacy modules are optional
        logger.debug(`Optional legacy module not loaded: ${file}`);
      }
    }

    // Get legacy module references
    LegacyModules.Config = window.CouncilConfig || null;
    LegacyModules.State = window.CouncilState || null;
    LegacyModules.Stores = window.CouncilStores || null;
    LegacyModules.Context = window.CouncilContext || null;
    LegacyModules.Topology = window.CouncilTopology || null;
    LegacyModules.Generation = window.CouncilGeneration || null;
    LegacyModules.Agents = window.CouncilAgents || null;
    LegacyModules.Pipeline = window.CouncilPipeline || null;
    LegacyModules.UI = window.CouncilUI || null;

    logger.debug("Legacy modules loaded:", {
      Config: !!LegacyModules.Config,
      State: !!LegacyModules.State,
      Stores: !!LegacyModules.Stores,
      Context: !!LegacyModules.Context,
      Topology: !!LegacyModules.Topology,
      Generation: !!LegacyModules.Generation,
      Agents: !!LegacyModules.Agents,
      Pipeline: !!LegacyModules.Pipeline,
      UI: !!LegacyModules.UI,
    });

    return true;
  }

  // ===== SYSTEM INITIALIZATION =====

  /**
   * Initialize all systems
   */
  async function initializeSystems() {
    logger.log("Initializing systems...");

    // Initialize Logger first
    if (Systems.Logger) {
      Systems.Logger.init({
        prefix: EXTENSION_NAME,
        level: DEBUG ? "debug" : "info",
      });
      logger = Systems.Logger;
      logger.log("info", "Logger initialized");
    }

    // Initialize Token Resolver
    if (Systems.TokenResolver) {
      Systems.TokenResolver.init({
        logger: Systems.Logger,
      });
      logger.log("info", "Token Resolver initialized");
    }

    // Initialize API Client
    if (Systems.ApiClient) {
      Systems.ApiClient.init({
        logger: Systems.Logger,
      });
      logger.log("info", "API Client initialized");
    }

    // Initialize Agents System
    if (Systems.AgentsSystem) {
      Systems.AgentsSystem.init({
        logger: Systems.Logger,
        tokenResolver: Systems.TokenResolver,
        apiClient: Systems.ApiClient,
      });
      logger.log("info", "Agents System initialized");
    }

    // Initialize Curation System
    if (Systems.CurationSystem) {
      Systems.CurationSystem.init({
        logger: Systems.Logger,
        agentsSystem: Systems.AgentsSystem,
        apiClient: Systems.ApiClient,
      });
      logger.log("info", "Curation System initialized");
    }

    // Initialize Thread Manager
    if (Systems.ThreadManager) {
      Systems.ThreadManager.init({
        logger: Systems.Logger,
      });
      logger.log("info", "Thread Manager initialized");
    }

    // Initialize Context Manager
    if (Systems.ContextManager) {
      Systems.ContextManager.init({
        logger: Systems.Logger,
        curationSystem: Systems.CurationSystem,
        tokenResolver: Systems.TokenResolver,
        stHelpers: getSillyTavernHelpers(),
      });
      logger.log("info", "Context Manager initialized");
    }

    // Initialize Output Manager
    if (Systems.OutputManager) {
      Systems.OutputManager.init({
        logger: Systems.Logger,
        curationSystem: Systems.CurationSystem,
        threadManager: Systems.ThreadManager,
        tokenResolver: Systems.TokenResolver,
      });
      logger.log("info", "Output Manager initialized");
    }

    // Initialize Pipeline System
    if (Systems.PipelineSystem) {
      Systems.PipelineSystem.init({
        logger: Systems.Logger,
        agentsSystem: Systems.AgentsSystem,
        curationSystem: Systems.CurationSystem,
        contextManager: Systems.ContextManager,
        outputManager: Systems.OutputManager,
        threadManager: Systems.ThreadManager,
        apiClient: Systems.ApiClient,
        tokenResolver: Systems.TokenResolver,
      });
      logger.log("info", "Pipeline System initialized");
    }

    logger.log("All core systems initialized");
  }

  /**
   * Initialize UI modals
   */
  function initializeUI() {
    logger.log("info", "Initializing UI modals...");

    // Initialize Agents Modal
    if (Systems.AgentsModal) {
      Systems.AgentsModal.init({
        agentsSystem: Systems.AgentsSystem,
        logger: Systems.Logger,
      });
      logger.log("info", "Agents Modal initialized");
    }

    // Initialize Curation Modal
    if (Systems.CurationModal) {
      Systems.CurationModal.init({
        curationSystem: Systems.CurationSystem,
        logger: Systems.Logger,
      });
      logger.log("info", "Curation Modal initialized");
    }

    // Initialize Gavel Modal
    if (Systems.GavelModal) {
      Systems.GavelModal.init({
        pipelineSystem: Systems.PipelineSystem,
        logger: Systems.Logger,
      });
      logger.log("info", "Gavel Modal initialized");
    }

    // Initialize Pipeline Modal
    if (Systems.PipelineModal) {
      Systems.PipelineModal.init({
        pipelineSystem: Systems.PipelineSystem,
        agentsSystem: Systems.AgentsSystem,
        contextManager: Systems.ContextManager,
        outputManager: Systems.OutputManager,
        threadManager: Systems.ThreadManager,
        logger: Systems.Logger,
      });
      logger.log("info", "Pipeline Modal initialized");
    }

    // Initialize Navigation Modal
    if (Systems.NavModal) {
      Systems.NavModal.init({
        agentsModal: Systems.AgentsModal,
        curationModal: Systems.CurationModal,
        pipelineModal: Systems.PipelineModal,
        gavelModal: Systems.GavelModal,
        pipelineSystem: Systems.PipelineSystem,
        logger: Systems.Logger,
      });
      logger.log("info", "Navigation Modal initialized");
    }

    logger.log("info", "All UI modals initialized");
  }

  // ===== SILLYTAVERN INTEGRATION =====

  /**
   * Get SillyTavern helper references
   * @returns {Object|null} ST helpers
   */
  function getSillyTavernHelpers() {
    try {
      return {
        getContext: window.getContext || null,
        characters: window.characters || null,
        this_chid: window.this_chid,
        name1: window.name1,
        name2: window.name2,
        chat: window.chat || null,
        substituteParams: window.substituteParams || null,
        getRequestHeaders: window.getRequestHeaders || null,
        callPopup: window.callPopup || null,
        eventSource: window.eventSource || null,
        event_types: window.event_types || null,
      };
    } catch (e) {
      logger.warn("Failed to get SillyTavern helpers:", e);
      return null;
    }
  }

  /**
   * Register SillyTavern event listeners
   */
  function registerSTEventListeners() {
    const stHelpers = getSillyTavernHelpers();
    if (!stHelpers?.eventSource || !stHelpers?.event_types) {
      logger.warn("SillyTavern event system not available");
      return;
    }

    const eventSource = stHelpers.eventSource;
    const event_types = stHelpers.event_types;

    // Listen for message generation events
    if (event_types.GENERATION_STARTED) {
      eventSource.on(event_types.GENERATION_STARTED, () => {
        logger.debug("ST Generation started");
      });
    }

    if (event_types.GENERATION_STOPPED) {
      eventSource.on(event_types.GENERATION_STOPPED, () => {
        logger.debug("ST Generation stopped");
      });
    }

    // Listen for chat events
    if (event_types.CHAT_CHANGED) {
      eventSource.on(event_types.CHAT_CHANGED, () => {
        logger.debug("ST Chat changed");
        // Reload context if needed
        if (Systems.ContextManager) {
          Systems.ContextManager.clear();
        }
      });
    }

    // Listen for character events
    if (event_types.CHARACTER_EDITED) {
      eventSource.on(event_types.CHARACTER_EDITED, () => {
        logger.debug("ST Character edited");
      });
    }

    logger.log("info", "SillyTavern event listeners registered");
  }

  /**
   * Add extension button to SillyTavern UI
   */
  function addExtensionButton() {
    // Check if button already exists
    if (document.getElementById("council-extension-button")) {
      return;
    }

    // Try to find the extensions menu area
    const extensionsMenu = document.getElementById("extensionsMenu");
    const extensionButtons = document.querySelector(".extension_buttons");

    if (!extensionsMenu && !extensionButtons) {
      logger.warn("Could not find extension menu location");
      return;
    }

    // Create button
    const button = document.createElement("div");
    button.id = "council-extension-button";
    button.className = "list-group-item flex-container flexGap5";
    button.innerHTML = `
      <span class="fa-solid fa-building-columns"></span>
      <span>The Council</span>
    `;
    button.style.cursor = "pointer";

    button.addEventListener("click", () => {
      // Toggle navigation modal
      if (Systems.NavModal) {
        Systems.NavModal.toggle();
      } else if (Systems.PipelineModal) {
        // Fallback to pipeline modal
        Systems.PipelineModal.toggle();
      }
    });

    // Add to appropriate location
    if (extensionButtons) {
      extensionButtons.appendChild(button);
    } else if (extensionsMenu) {
      extensionsMenu.appendChild(button);
    }

    logger.log("info", "Extension button added to UI");
  }

  // ===== SETTINGS MANAGEMENT =====

  /**
   * Get default settings
   * @returns {Object} Default settings
   */
  function getDefaultSettings() {
    return {
      version: VERSION,
      architecture: "2.0",

      // General
      debug: DEBUG,
      autoShowNav: true,

      // Agents System
      agents: {
        defaultApiConfig: {
          useCurrentConnection: true,
        },
      },

      // Curation System
      curation: {
        autoSaveStores: true,
        storagePrefix: "council_",
      },

      // Pipeline System
      pipeline: {
        defaultTimeout: 30000,
        maxRetries: 2,
        parallelLimit: 3,
      },

      // UI
      ui: {
        navPosition: { x: 20, y: 100 },
        theme: "auto",
      },

      // Legacy compatibility
      legacy: {
        enableLegacyModules: false,
      },
    };
  }

  /**
   * Load settings from SillyTavern extension_settings
   */
  function loadSettings() {
    try {
      const stContext = window.getContext?.();
      if (stContext?.extensionSettings?.[EXTENSION_NAME]) {
        extensionSettings = {
          ...getDefaultSettings(),
          ...stContext.extensionSettings[EXTENSION_NAME],
        };
      } else {
        extensionSettings = getDefaultSettings();
      }
      logger.log("info", "Settings loaded", extensionSettings);
    } catch (e) {
      logger.warn("Failed to load settings, using defaults:", e);
      extensionSettings = getDefaultSettings();
    }
  }

  /**
   * Save settings to SillyTavern extension_settings
   */
  function saveSettings() {
    try {
      const stContext = window.getContext?.();
      if (stContext?.extensionSettings) {
        stContext.extensionSettings[EXTENSION_NAME] = extensionSettings;
        // Trigger save if available
        if (window.saveSettingsDebounced) {
          window.saveSettingsDebounced();
        }
        logger.debug("Settings saved");
      }
    } catch (e) {
      logger.warn("Failed to save settings:", e);
    }
  }

  // ===== PUBLIC API =====

  /**
   * The Council public API
   */
  const TheCouncil = {
    VERSION,
    EXTENSION_NAME,

    /**
     * Get initialization status
     * @returns {boolean}
     */
    isInitialized() {
      return isInitialized;
    },

    /**
     * Get system reference
     * @param {string} name - System name
     * @returns {Object|null}
     */
    getSystem(name) {
      return Systems[name] || null;
    },

    /**
     * Get all systems
     * @returns {Object}
     */
    getSystems() {
      return { ...Systems };
    },

    /**
     * Get legacy module reference
     * @param {string} name - Module name
     * @returns {Object|null}
     */
    getLegacyModule(name) {
      return LegacyModules[name] || null;
    },

    /**
     * Get settings
     * @returns {Object}
     */
    getSettings() {
      return { ...extensionSettings };
    },

    /**
     * Update settings
     * @param {Object} updates - Settings updates
     */
    updateSettings(updates) {
      extensionSettings = { ...extensionSettings, ...updates };
      saveSettings();
    },

    /**
     * Show navigation modal
     */
    showNav() {
      Systems.NavModal?.show();
    },

    /**
     * Hide navigation modal
     */
    hideNav() {
      Systems.NavModal?.hide();
    },

    /**
     * Show agents modal
     */
    showAgents() {
      Systems.AgentsModal?.show();
    },

    /**
     * Show curation modal
     */
    showCuration() {
      Systems.CurationModal?.show();
    },

    /**
     * Show pipeline modal
     * @param {Object} options - Show options
     */
    showPipeline(options) {
      Systems.PipelineModal?.show(options);
    },

    /**
     * Run a pipeline
     * @param {string} pipelineId - Pipeline ID
     * @param {Object} options - Run options
     * @returns {Promise}
     */
    async runPipeline(pipelineId, options = {}) {
      if (!Systems.PipelineSystem) {
        throw new Error("Pipeline System not initialized");
      }
      return Systems.PipelineSystem.startRun(pipelineId, options);
    },

    /**
     * Get summary of all systems
     * @returns {Object}
     */
    getSummary() {
      return {
        version: VERSION,
        initialized: isInitialized,
        systems: {
          AgentsSystem: Systems.AgentsSystem?.getSummary?.() || null,
          CurationSystem: Systems.CurationSystem?.getSummary?.() || null,
          PipelineSystem: Systems.PipelineSystem?.getSummary?.() || null,
        },
        ui: {
          NavModal: Systems.NavModal?.getSummary?.() || null,
          AgentsModal: !!Systems.AgentsModal,
          CurationModal: !!Systems.CurationModal,
          PipelineModal: !!Systems.PipelineModal,
          GavelModal: Systems.GavelModal?.getSummary?.() || null,
        },
        legacy: {
          enabled: extensionSettings?.legacy?.enableLegacyModules || false,
          modulesLoaded: Object.keys(LegacyModules).filter(
            (k) => LegacyModules[k] !== null,
          ),
        },
      };
    },
  };

  // ===== MAIN INITIALIZATION =====

  /**
   * Main initialization function
   */
  async function initialize() {
    if (isInitialized) {
      logger.warn("TheCouncil already initialized");
      return TheCouncil;
    }

    if (initializationPromise) {
      return initializationPromise;
    }

    initializationPromise = (async () => {
      logger.log(`Initializing TheCouncil v${VERSION}...`);

      try {
        // Load settings
        loadSettings();

        // Load new architecture modules
        await loadNewArchitecture();

        // Optionally load legacy modules
        if (extensionSettings?.legacy?.enableLegacyModules) {
          await loadLegacyModules();
        }

        // Initialize core systems
        await initializeSystems();

        // Initialize UI
        initializeUI();

        // Register SillyTavern event listeners
        registerSTEventListeners();

        // Add extension button
        addExtensionButton();

        // Show nav if configured
        if (extensionSettings?.ui?.autoShowNav !== false) {
          setTimeout(() => {
            Systems.NavModal?.show();
          }, 500);
        }

        isInitialized = true;
        logger.log(`TheCouncil v${VERSION} initialized successfully`);

        // Emit initialization event
        document.dispatchEvent(
          new CustomEvent("thecouncil:initialized", {
            detail: { version: VERSION },
          }),
        );

        return TheCouncil;
      } catch (e) {
        logger.error("Failed to initialize TheCouncil:", e);
        throw e;
      }
    })();

    return initializationPromise;
  }

  // ===== EXPORT & AUTO-INIT =====

  // Expose to global scope
  window.TheCouncil = TheCouncil;

  // Also expose individual systems for convenience
  window.CouncilSystems = Systems;

  // Auto-initialize when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize);
  } else {
    // DOM already loaded, wait a tick for ST to be ready
    setTimeout(initialize, 100);
  }

  // Also initialize on SillyTavern's app ready event if available
  if (window.eventSource?.on && window.event_types?.APP_READY) {
    window.eventSource.on(window.event_types.APP_READY, () => {
      if (!isInitialized) {
        initialize();
      }
    });
  }

  logger.log(`TheCouncil v${VERSION} loaded, waiting for initialization...`);
})();
