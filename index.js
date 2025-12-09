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
    PresetManager: null,

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
      "core/preset-manager.js",

      // UI Components
      "ui/components/prompt-builder.js",
      "ui/components/participant-selector.js",
      "ui/components/context-config.js",
      "ui/components/curation-pipeline-builder.js",

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
    Systems.PresetManager = window.TheCouncilPresetManager || null;

    Systems.AgentsModal = window.AgentsModal || null;
    Systems.CurationModal = window.CurationModal || null;
    Systems.PipelineModal = window.PipelineModal || null;
    Systems.GavelModal = window.GavelModal || null;
    Systems.NavModal = window.NavModal || null;

    // UI Components
    Systems.PromptBuilder = window.PromptBuilder || null;
    Systems.ParticipantSelector = window.ParticipantSelector || null;
    Systems.ContextConfig = window.ContextConfig || null;
    Systems.CurationPipelineBuilder = window.CurationPipelineBuilder || null;

    logger.debug("Module references obtained:", {
      Logger: !!Systems.Logger,
      TokenResolver: !!Systems.TokenResolver,
      ApiClient: !!Systems.ApiClient,
      SystemSchemas: !!Systems.SystemSchemas,
      AgentsSystem: !!Systems.AgentsSystem,
      CurationSystem: !!Systems.CurationSystem,
      PipelineSystem: !!Systems.PipelineSystem,
      PresetManager: !!Systems.PresetManager,
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
      CurationPipelineBuilder: !!Systems.CurationPipelineBuilder,
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

    // Initialize Preset Manager (depends on all core systems)
    if (Systems.PresetManager) {
      Systems.PresetManager.init({
        agentsSystem: Systems.AgentsSystem,
        pipelineSystem: Systems.PipelineSystem,
        curationSystem: Systems.CurationSystem,
        threadManager: Systems.ThreadManager,
        logger: Systems.Logger,
        extensionPath: EXTENSION_PATH,
      });
      logger.log("info", "PresetManager initialized");

      // Discover available presets (non-blocking)
      Systems.PresetManager.discoverPresets()
        .then((presets) => {
          logger.log("info", `Discovered ${presets.length} preset(s)`);
        })
        .catch((err) => {
          logger.log("warn", `Preset discovery failed: ${err.message}`);
        });
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

    if (Systems.CurationPipelineBuilder) {
      Systems.CurationPipelineBuilder.init({
        curationSystem: Systems.CurationSystem,
        agentsSystem: Systems.AgentsSystem,
        logger: Systems.Logger,
      });
      logger.log("info", "CurationPipelineBuilder initialized");
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
        presetManager: Systems.PresetManager,
        agentsSystem: Systems.AgentsSystem,
        contextManager: Systems.ContextManager,
        outputManager: Systems.OutputManager,
        threadManager: Systems.ThreadManager,
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
    const context = window.SillyTavern?.getContext?.();
    return {
      getContext: () => window.SillyTavern?.getContext?.(),
      context: context,
      characters: context?.characters || window.characters,
      this_chid: context?.characterId || window.this_chid,
      name1: context?.name1 || window.name1,
      name2: context?.name2 || window.name2,
      chat: context?.chat || window.chat,
      substituteParams: context?.substituteParams || window.substituteParams,
      getRequestHeaders: context?.getRequestHeaders || window.getRequestHeaders,
      callPopup: context?.callGenericPopup || window.callPopup,
      eventSource: context?.eventSource || window.eventSource,
      event_types: context?.eventTypes || window.event_types,
    };
  }

  /**
   * Wait for SillyTavern to be fully ready
   * @param {number} maxWaitMs - Maximum time to wait in milliseconds
   * @param {number} checkInterval - Check interval in milliseconds
   * @returns {Promise<boolean>} True if ST is ready, false if timed out
   */
  async function waitForSillyTavern(maxWaitMs = 10000, checkInterval = 200) {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
      // Check if ST context is available with getPresetManager
      const context = window.SillyTavern?.getContext?.();
      if (
        context &&
        typeof context.getPresetManager === "function" &&
        context.eventSource &&
        context.eventTypes
      ) {
        logger.debug("SillyTavern is ready");
        return true;
      }

      // Wait before next check
      await new Promise((resolve) => setTimeout(resolve, checkInterval));
    }

    logger.warn("Timed out waiting for SillyTavern to be ready");
    return false;
  }

  /**
   * Register SillyTavern event listeners
   */
  function registerSTEventListeners(retryCount = 0) {
    const stHelpers = getSillyTavernHelpers();

    if (!stHelpers.eventSource || !stHelpers.event_types) {
      if (retryCount < 10) {
        logger.debug(
          `SillyTavern event system not available yet, retry ${retryCount + 1}/10...`,
        );
        setTimeout(() => registerSTEventListeners(retryCount + 1), 1000);
      } else {
        logger.warn("Could not register ST event listeners after 10 retries");
      }
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
   * @param {number} retryCount - Current retry count
   */
  function addExtensionButton(retryCount = 0) {
    // Check if button already exists
    if (document.getElementById("thecouncil-extension-btn")) {
      return;
    }

    // Try multiple selectors for different ST versions
    const selectors = [
      "#extensionsMenu .extensions_block",
      "#extensionsMenu",
      ".extensions_block",
      "#extensions_settings",
      "#top-settings-holder .extensions_block",
      "#form_sheld .extensions_block",
      // Fallback: try to find any element that looks like an extension container
      '[id*="extension"]',
    ];

    let extensionButtons = null;
    for (const selector of selectors) {
      extensionButtons = document.querySelector(selector);
      if (extensionButtons) {
        logger.debug(`Found extension container with selector: ${selector}`);
        break;
      }
    }

    if (!extensionButtons) {
      if (retryCount < 5) {
        // Retry a few times as ST UI may still be loading
        logger.debug(`Extensions menu not found, retry ${retryCount + 1}/5...`);
        setTimeout(() => addExtensionButton(retryCount + 1), 1000);
      } else {
        // Not critical - extension still works, just no button in ST menu
        logger.debug(
          "Could not find extensions menu - TheCouncil accessible via keyboard shortcut or NavModal",
        );
      }
      return;
    }

    const button = document.createElement("div");
    button.id = "thecouncil-extension-btn";
    button.className = "extension_button fa-solid fa-users-gear";
    button.title = "TheCouncil - Multi-LLM Pipeline";
    button.style.cssText = "cursor: pointer; padding: 5px;";
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

  /**
   * Register keyboard shortcut to open TheCouncil
   * Default: Ctrl+Shift+C
   */
  function registerKeyboardShortcut() {
    document.addEventListener("keydown", (e) => {
      // Ctrl+Shift+C (or Cmd+Shift+C on Mac)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "C") {
        e.preventDefault();
        e.stopPropagation();

        if (Systems.NavModal) {
          Systems.NavModal.toggle();
          logger.debug("NavModal toggled via keyboard shortcut");
        } else {
          logger.warn("NavModal not initialized");
        }
      }
    });

    logger.debug("Keyboard shortcut registered: Ctrl+Shift+C");
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

        // Register keyboard shortcut
        registerKeyboardShortcut();

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

  // Auto-initialize when DOM is ready, but wait for ST to be available
  async function initWhenReady() {
    // Wait for DOM
    if (document.readyState === "loading") {
      await new Promise((resolve) =>
        document.addEventListener("DOMContentLoaded", resolve),
      );
    }

    // Wait a moment for ST to start initializing
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Wait for ST to be fully ready
    const stReady = await waitForSillyTavern(15000, 300);
    if (!stReady) {
      logger.warn(
        "SillyTavern not fully ready, initializing anyway (some features may not work)",
      );
    }

    // Now initialize
    await initialize();
  }

  initWhenReady().catch((e) => {
    logger.error("Failed to initialize TheCouncil:", e);
  });
})();
