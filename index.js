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
        resolve();
        return;
      }

      const script = document.createElement("script");
      script.src = src;
      script.type = "text/javascript";
      script.onload = () => {
        logger.debug(`Loaded: ${src}`);
        resolve();
      };
      script.onerror = () => {
        reject(new Error(`Failed to load script: ${src}`));
      };
      document.head.appendChild(script);
    });
  }

  /**
   * Load a CSS stylesheet dynamically
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
   * Load new architecture modules
   */
  async function loadNewArchitecture() {
    logger.log("Loading new architecture modules...");

    const basePath = EXTENSION_PATH;

    const moduleFiles = [
      // Utilities (load first)
      "utils/logger.js",
      "utils/token-resolver.js",
      "utils/api-client.js",

      // Schemas
      "schemas/systems.js",

      // Core Systems
      "core/agents-system.js",
      "core/curation-system.js",
      "core/context-manager.js",
      "core/output-manager.js",
      "core/thread-manager.js",
      "core/pipeline-system.js",

      // UI Components
      "ui/components/prompt-builder.js",
      "ui/components/participant-selector.js",
      "ui/components/context-config.js",

      // UI Modals
      "ui/agents-modal.js",
      "ui/curation-modal.js",
      "ui/pipeline-modal.js",
      "ui/gavel-modal.js",
      "ui/nav-modal.js",
    ];

    // Load stylesheet
    loadStylesheet(`${basePath}/styles/main.css`);

    // Load all module files
    for (const file of moduleFiles) {
      try {
        await loadScript(`${basePath}/${file}`);
      } catch (e) {
        logger.error(`Failed to load module: ${file}`, e);
        throw e;
      }
    }

    // Get module references from window (browser global)
    Systems.Logger = window.Logger || null;
    Systems.TokenResolver = window.TokenResolver || null;
    Systems.ApiClient = window.ApiClient || null;
    Systems.SystemSchemas = window.SystemSchemas || null;

    Systems.AgentsSystem = window.AgentsSystem || null;
    Systems.CurationSystem = window.CurationSystem || null;
    Systems.PipelineSystem = window.PipelineSystem || null;
    Systems.ContextManager = window.ContextManager || null;
    Systems.OutputManager = window.OutputManager || null;
    Systems.ThreadManager = window.ThreadManager || null;

    Systems.AgentsModal = window.AgentsModal || null;
    Systems.CurationModal = window.CurationModal || null;
    Systems.PipelineModal = window.PipelineModal || null;
    Systems.GavelModal = window.GavelModal || null;
    Systems.NavModal = window.NavModal || null;

    // UI Components
    Systems.PromptBuilder = window.PromptBuilder || null;
    Systems.ParticipantSelector = window.ParticipantSelector || null;
    Systems.ContextConfig = window.ContextConfig || null;

    logger.debug("Module references obtained:", {
      Logger: !!Systems.Logger,
      TokenResolver: !!Systems.TokenResolver,
      ApiClient: !!Systems.ApiClient,
      SystemSchemas: !!Systems.SystemSchemas,
      AgentsSystem: !!Systems.AgentsSystem,
      CurationSystem: !!Systems.CurationSystem,
      PipelineSystem: !!Systems.PipelineSystem,
      ContextManager: !!Systems.ContextManager,
      OutputManager: !!Systems.OutputManager,
      ThreadManager: !!Systems.ThreadManager,
      AgentsModal: !!Systems.AgentsModal,
      CurationModal: !!Systems.CurationModal,
      PipelineModal: !!Systems.PipelineModal,
      GavelModal: !!Systems.GavelModal,
      NavModal: !!Systems.NavModal,
      PromptBuilder: !!Systems.PromptBuilder,
      ParticipantSelector: !!Systems.ParticipantSelector,
      ContextConfig: !!Systems.ContextConfig,
    });

    return true;
  }

  // ===== SYSTEM INITIALIZATION =====

  /**
   * Initialize all core systems with proper dependency injection
   */
  async function initializeSystems() {
    logger.log("Initializing core systems...");

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
      logger.log("info", "TokenResolver initialized");
    }

    // Initialize API Client
    if (Systems.ApiClient) {
      Systems.ApiClient.init({
        logger: Systems.Logger,
      });
      const tokenResolver = Systems.TokenResolver;
      const apiClient = Systems.ApiClient;
      logger.log("info", "ApiClient initialized");
    }

    // Initialize Agents System
    if (Systems.AgentsSystem) {
      Systems.AgentsSystem.init({
        logger: Systems.Logger,
        agentsSystem: Systems.AgentsSystem,
        apiClient: Systems.ApiClient,
      });
      logger.log("info", "AgentsSystem initialized");
    }

    // Initialize Curation System
    if (Systems.CurationSystem) {
      Systems.CurationSystem.init({
        logger: Systems.Logger,
      });
      logger.log("info", "CurationSystem initialized");
    }

    // Initialize Context Manager
    if (Systems.ContextManager) {
      Systems.ContextManager.init({
        curationSystem: Systems.CurationSystem,
        tokenResolver: Systems.TokenResolver,
        stHelpers: getSillyTavernHelpers(),
      });
      logger.log("info", "ContextManager initialized");
    }

    // Initialize Output Manager
    if (Systems.OutputManager) {
      Systems.OutputManager.init({
        logger: Systems.Logger,
        curationSystem: Systems.CurationSystem,
        threadManager: Systems.ThreadManager,
        tokenResolver: Systems.TokenResolver,
      });
      logger.log("info", "OutputManager initialized");
    }

    // Initialize Thread Manager
    if (Systems.ThreadManager) {
      Systems.ThreadManager.init({
        logger: Systems.Logger,
      });
      logger.log("info", "ThreadManager initialized");
    }

    // Initialize Pipeline System (depends on all others)
    if (Systems.PipelineSystem) {
      Systems.PipelineSystem.init({
        agentsSystem: Systems.AgentsSystem,
        curationSystem: Systems.CurationSystem,
        contextManager: Systems.ContextManager,
        outputManager: Systems.OutputManager,
        threadManager: Systems.ThreadManager,
        apiClient: Systems.ApiClient,
        tokenResolver: Systems.TokenResolver,
      });
      logger.log("info", "PipelineSystem initialized");
    }

    // Initialize UI Components
    if (Systems.PromptBuilder) {
      Systems.PromptBuilder.init({
        tokenResolver: Systems.TokenResolver,
        logger: Systems.Logger,
      });
      logger.log("info", "PromptBuilder initialized");
    }

    if (Systems.ParticipantSelector) {
      Systems.ParticipantSelector.init({
        agentsSystem: Systems.AgentsSystem,
        logger: Systems.Logger,
      });
      logger.log("info", "ParticipantSelector initialized");
    }

    if (Systems.ContextConfig) {
      Systems.ContextConfig.init({
        curationSystem: Systems.CurationSystem,
        threadManager: Systems.ThreadManager,
        logger: Systems.Logger,
      });
      logger.log("info", "ContextConfig initialized");
    }

    logger.log("info", "All core systems initialized");
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
    }

    // Initialize Curation Modal
    if (Systems.CurationModal) {
      Systems.CurationModal.init({
        curationSystem: Systems.CurationSystem,
        logger: Systems.Logger,
      });
    }

    // Initialize Pipeline Modal
    if (Systems.PipelineModal) {
      Systems.PipelineModal.init({
        pipelineSystem: Systems.PipelineSystem,
        logger: Systems.Logger,
      });
    }

    // Initialize Gavel Modal
    if (Systems.GavelModal) {
      Systems.GavelModal.init({
        pipelineSystem: Systems.PipelineSystem,
        agentsSystem: Systems.AgentsSystem,
        contextManager: Systems.ContextManager,
        outputManager: Systems.OutputManager,
        threadManager: Systems.ThreadManager,
        logger: Systems.Logger,
      });
    }

    // Initialize Nav Modal
    if (Systems.NavModal) {
      Systems.NavModal.init({
        agentsModal: Systems.AgentsModal,
        curationModal: Systems.CurationModal,
        pipelineModal: Systems.PipelineModal,
        gavelModal: Systems.GavelModal,
        pipelineSystem: Systems.PipelineSystem,
        logger: Systems.Logger,
      });
    }

    logger.log("info", "UI modals initialized");
  }

  // ===== SILLYTAVERN INTEGRATION =====

  /**
   * Get SillyTavern helper functions
   */
  function getSillyTavernHelpers() {
    return {
      getContext: window.getContext,
      characters: window.characters,
      this_chid: window.this_chid,
      name1: window.name1,
      name2: window.name2,
      chat: window.chat,
      substituteParams: window.substituteParams,
      getRequestHeaders: window.getRequestHeaders,
      callPopup: window.callPopup,
      eventSource: window.eventSource,
      event_types: window.event_types,
    };
  }

  /**
   * Register SillyTavern event listeners
   */
  function registerSTEventListeners() {
    const stHelpers = getSillyTavernHelpers();

    if (!stHelpers.eventSource || !stHelpers.event_types) {
      logger.warn("SillyTavern event system not available");
      return;
    }

    const eventSource = stHelpers.eventSource;
    const event_types = stHelpers.event_types;

    // Listen for chat changes
    eventSource.on(event_types.CHAT_CHANGED, () => {
      logger.debug("Chat changed, updating context...");
      Systems.ContextManager?.refreshSTContext?.();
    });

    // Listen for character changes
    eventSource.on(event_types.CHARACTER_SELECTED, () => {
      logger.debug("Character selected, updating context...");
      Systems.ContextManager?.refreshSTContext?.();
    });

    // Listen for message sent (potential trigger for pipeline)
    eventSource.on(event_types.MESSAGE_SENT, (messageId) => {
      logger.debug("Message sent:", messageId);
    });

    // Listen for message received
    eventSource.on(event_types.MESSAGE_RECEIVED, (messageId) => {
      logger.debug("Message received:", messageId);
    });

    logger.debug("SillyTavern event listeners registered");
  }

  /**
   * Add extension button to SillyTavern UI
   */
  function addExtensionButton() {
    // Check if button already exists
    if (document.getElementById("thecouncil-extension-btn")) {
      return;
    }

    const extensionsMenu = document.getElementById("extensionsMenu");
    const extensionButtons = document.querySelector(
      "#extensionsMenu .extensions_block",
    );

    if (!extensionButtons) {
      logger.warn("Could not find extensions menu to add button");
      return;
    }

    const button = document.createElement("div");
    button.id = "thecouncil-extension-btn";
    button.className = "extension_button fa-solid fa-users-gear";
    button.title = "TheCouncil - Multi-LLM Pipeline";
    button.addEventListener("click", () => {
      if (Systems.NavModal) {
        Systems.NavModal.toggle();
      } else {
        logger.warn("NavModal not initialized");
      }
    });

    extensionButtons.appendChild(button);
    logger.debug("Extension button added to menu");
  }

  // ===== SETTINGS =====

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
     * Get a specific system
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
    // DOM already ready, initialize after a short delay
    setTimeout(initialize, 100);
  }
})();
