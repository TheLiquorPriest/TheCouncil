/**
 * TheCouncil - Multi-LLM Story Production Pipeline
 * Entry point - Thin bootstrap that initializes the Kernel
 *
 * Six-System Architecture (via Kernel):
 * - THE COUNCIL KERNEL: Central hub, shared resources, event bus, hooks
 * - CURATION SYSTEM: Knowledge base with CRUD/RAG pipelines
 * - CHARACTER SYSTEM: Dynamic avatar agents from Curation data
 * - PROMPT BUILDER SYSTEM: Token registry, prompt stacks, template resolution
 * - RESPONSE PIPELINE BUILDER: Multi-step workflow definitions
 * - RESPONSE ORCHESTRATION: Pipeline execution in 3 modes
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
    CharacterSystem: null,
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
    CharacterModal: null,
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

      // Kernel (load before systems)
      "core/kernel.js",

      // Schemas
      "schemas/systems.js",

      // Core Systems
      "core/agents-system.js",
      "core/curation-system.js",
      "core/character-system.js",
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
      "ui/components/token-picker.js",
      "ui/components/execution-monitor.js",

      // UI Modals
      "ui/agents-modal.js",
      "ui/curation-modal.js",
      "ui/character-modal.js",
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
    Systems.CharacterSystem = window.CharacterSystem || null;
    Systems.PipelineSystem = window.PipelineSystem || null;
    Systems.ContextManager = window.ContextManager || null;
    Systems.OutputManager = window.OutputManager || null;
    Systems.ThreadManager = window.ThreadManager || null;
    Systems.PresetManager = window.TheCouncilPresetManager || null;

    Systems.AgentsModal = window.AgentsModal || null;
    Systems.CurationModal = window.CurationModal || null;
    Systems.CharacterModal = window.CharacterModal || null;
    Systems.PipelineModal = window.PipelineModal || null;
    Systems.GavelModal = window.GavelModal || null;
    Systems.NavModal = window.NavModal || null;

    // UI Components
    Systems.PromptBuilder = window.PromptBuilder || null;
    Systems.ParticipantSelector = window.ParticipantSelector || null;
    Systems.ContextConfig = window.ContextConfig || null;
    Systems.CurationPipelineBuilder = window.CurationPipelineBuilder || null;
    Systems.TokenPicker = window.TokenPicker || null;
    Systems.ExecutionMonitor = window.ExecutionMonitor || null;

    logger.debug("Module references obtained:", {
      Logger: !!Systems.Logger,
      TokenResolver: !!Systems.TokenResolver,
      ApiClient: !!Systems.ApiClient,
      SystemSchemas: !!Systems.SystemSchemas,
      AgentsSystem: !!Systems.AgentsSystem,
      CurationSystem: !!Systems.CurationSystem,
      CharacterSystem: !!Systems.CharacterSystem,
      PipelineSystem: !!Systems.PipelineSystem,
      PresetManager: !!Systems.PresetManager,
      ContextManager: !!Systems.ContextManager,
      OutputManager: !!Systems.OutputManager,
      ThreadManager: !!Systems.ThreadManager,
      AgentsModal: !!Systems.AgentsModal,
      CurationModal: !!Systems.CurationModal,
      CharacterModal: !!Systems.CharacterModal,
      PipelineModal: !!Systems.PipelineModal,
      GavelModal: !!Systems.GavelModal,
      NavModal: !!Systems.NavModal,
      PromptBuilder: !!Systems.PromptBuilder,
      ParticipantSelector: !!Systems.ParticipantSelector,
      ContextConfig: !!Systems.ContextConfig,
      CurationPipelineBuilder: !!Systems.CurationPipelineBuilder,
      TokenPicker: !!Systems.TokenPicker,
      ExecutionMonitor: !!Systems.ExecutionMonitor,
    });

    return true;
  }

  // ===== SYSTEM INITIALIZATION =====

  /**
   * Initialize the Kernel and register all modules/systems
   */
  async function initializeKernel() {
    logger.log("Initializing Kernel...");

    // Get Kernel reference
    const Kernel = window.TheCouncilKernel || window.TheCouncil;
    if (!Kernel) {
      throw new Error("Kernel not loaded!");
    }

    // Initialize Kernel with options
    await Kernel.init({
      debug: DEBUG,
    });

    // Update logger reference to use Kernel's logger
    logger = Kernel.getModule("logger") || logger;

    logger.log("info", "Kernel initialized");
    return Kernel;
  }

  /**
   * Register shared modules with Kernel
   */
  function registerModules(Kernel) {
    logger.log("info", "Registering shared modules...");

    // Register Logger (already initialized by Kernel)
    if (Systems.Logger) {
      Kernel.registerModule("logger", Systems.Logger);
    }

    // Register Token Resolver
    if (Systems.TokenResolver) {
      Systems.TokenResolver.init({
        logger: Kernel.getModule("logger"),
      });
      Kernel.registerModule("tokenResolver", Systems.TokenResolver);
      logger.log("info", "TokenResolver registered");
    }

    // Register API Client
    if (Systems.ApiClient) {
      Systems.ApiClient.init({
        logger: Kernel.getModule("logger"),
      });
      Kernel.registerModule("apiClient", Systems.ApiClient);
      logger.log("info", "ApiClient registered");
    }

    // Register Preset Manager as module
    if (Systems.PresetManager) {
      Kernel.registerModule("presetManager", Systems.PresetManager);
    }

    logger.log("info", "Shared modules registered");
  }

  /**
   * Initialize and register all core systems
   */
  async function initializeSystems(Kernel) {
    logger.log("info", "Initializing core systems...");

    // Initialize Agents System
    if (Systems.AgentsSystem) {
      Systems.AgentsSystem.init({
        logger: Kernel.getModule("logger"),
        agentsSystem: Systems.AgentsSystem,
        apiClient: Kernel.getModule("apiClient"),
      });
      Kernel.registerSystem("agentsSystem", Systems.AgentsSystem);
      logger.log("info", "AgentsSystem initialized");
    }

    // Initialize Curation System (with Kernel pattern)
    if (Systems.CurationSystem) {
      Systems.CurationSystem.init(Kernel, {
        // CurationSystem will register itself with Kernel
      });
      logger.log("info", "CurationSystem initialized");
    }

    // Initialize Character System
    if (Systems.CharacterSystem) {
      Systems.CharacterSystem.init({
        curationSystem: Systems.CurationSystem,
        logger: Kernel.getModule("logger"),
      });
      Kernel.registerSystem("characterSystem", Systems.CharacterSystem);
      logger.log("info", "CharacterSystem initialized");
    }

    // Initialize Context Manager
    if (Systems.ContextManager) {
      Systems.ContextManager.init({
        curationSystem: Systems.CurationSystem,
        tokenResolver: Kernel.getModule("tokenResolver"),
        stHelpers: getSillyTavernHelpers(),
      });
      Kernel.registerSystem("contextManager", Systems.ContextManager);
      logger.log("info", "ContextManager initialized");
    }

    // Initialize Output Manager
    if (Systems.OutputManager) {
      Systems.OutputManager.init({
        logger: Kernel.getModule("logger"),
        curationSystem: Systems.CurationSystem,
        threadManager: Systems.ThreadManager,
        tokenResolver: Kernel.getModule("tokenResolver"),
      });
      Kernel.registerSystem("outputManager", Systems.OutputManager);
      logger.log("info", "OutputManager initialized");
    }

    // Initialize Thread Manager
    if (Systems.ThreadManager) {
      Systems.ThreadManager.init({
        logger: Kernel.getModule("logger"),
      });
      Kernel.registerSystem("threadManager", Systems.ThreadManager);
      logger.log("info", "ThreadManager initialized");
    }

    // Initialize Pipeline System (depends on all others)
    if (Systems.PipelineSystem) {
      Systems.PipelineSystem.init({
        agentsSystem: Systems.AgentsSystem,
        curationSystem: Systems.CurationSystem,
        characterSystem: Systems.CharacterSystem,
        contextManager: Systems.ContextManager,
        outputManager: Systems.OutputManager,
        threadManager: Systems.ThreadManager,
        apiClient: Kernel.getModule("apiClient"),
        tokenResolver: Kernel.getModule("tokenResolver"),
      });
      Kernel.registerSystem("pipelineSystem", Systems.PipelineSystem);
      logger.log("info", "PipelineSystem initialized");
    }

    // Initialize Preset Manager (depends on all core systems)
    if (Systems.PresetManager) {
      Systems.PresetManager.init({
        agentsSystem: Systems.AgentsSystem,
        pipelineSystem: Systems.PipelineSystem,
        curationSystem: Systems.CurationSystem,
        threadManager: Systems.ThreadManager,
        logger: Kernel.getModule("logger"),
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
        tokenResolver: Kernel.getModule("tokenResolver"),
        logger: Kernel.getModule("logger"),
      });
      logger.log("info", "PromptBuilder initialized");
    }

    if (Systems.ParticipantSelector) {
      Systems.ParticipantSelector.init({
        agentsSystem: Systems.AgentsSystem,
        logger: Kernel.getModule("logger"),
      });
      logger.log("info", "ParticipantSelector initialized");
    }

    if (Systems.ContextConfig) {
      Systems.ContextConfig.init({
        curationSystem: Systems.CurationSystem,
        threadManager: Systems.ThreadManager,
        logger: Kernel.getModule("logger"),
      });
      logger.log("info", "ContextConfig initialized");
    }

    if (Systems.CurationPipelineBuilder) {
      Systems.CurationPipelineBuilder.init({
        curationSystem: Systems.CurationSystem,
        agentsSystem: Systems.AgentsSystem,
        logger: Kernel.getModule("logger"),
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

    // Initialize Character Modal
    if (Systems.CharacterModal) {
      Systems.CharacterModal.init({
        characterSystem: Systems.CharacterSystem,
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
        characterModal: Systems.CharacterModal,
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
   * Add UI elements to SillyTavern
   */
  function addSTUIElements() {
    addExtensionButton();
    addPipelineTriggerButton();
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
   * Add Pipeline trigger button near ST send button
   * @param {number} retryCount - Current retry count
   */
  function addPipelineTriggerButton(retryCount = 0) {
    // Check if button already exists
    if (document.getElementById("thecouncil-pipeline-trigger-btn")) {
      return;
    }

    // Try to find the send button area - ST has different layouts
    const selectors = [
      "#send_but_sheld",
      "#form_sheld .send_form",
      "#send_form",
      ".send_form",
      "#rightSendForm",
    ];

    let sendArea = null;
    for (const selector of selectors) {
      sendArea = document.querySelector(selector);
      if (sendArea) {
        logger.debug(`Found send area with selector: ${selector}`);
        break;
      }
    }

    if (!sendArea) {
      if (retryCount < 5) {
        logger.debug(`Send area not found, retry ${retryCount + 1}/5...`);
        setTimeout(() => addPipelineTriggerButton(retryCount + 1), 1000);
      } else {
        logger.debug("Could not find send area for pipeline trigger button");
      }
      return;
    }

    // Create the pipeline trigger button
    const button = document.createElement("div");
    button.id = "thecouncil-pipeline-trigger-btn";
    button.className = "fa-solid fa-play-circle";
    button.title = "Run Council Pipeline";
    button.style.cssText = `
      cursor: pointer;
      padding: 8px;
      font-size: 1.2em;
      color: var(--SmartThemeBodyColor, #ccc);
      opacity: 0.7;
      transition: opacity 0.2s, color 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    // Hover effect
    button.addEventListener("mouseenter", () => {
      button.style.opacity = "1";
      button.style.color = "var(--SmartThemeQuoteColor, #4a90d9)";
    });
    button.addEventListener("mouseleave", () => {
      button.style.opacity = "0.7";
      button.style.color = "var(--SmartThemeBodyColor, #ccc)";
    });

    // Click handler - run pipeline with current input
    button.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (!Systems.PipelineSystem) {
        logger.warn("PipelineSystem not available");
        return;
      }

      // Get user input from ST input field
      const inputSelectors = [
        "#send_textarea",
        "#chat-message-input",
        "textarea[name='chat']",
      ];

      let userInput = "";
      for (const selector of inputSelectors) {
        const input = document.querySelector(selector);
        if (input && input.value) {
          userInput = input.value.trim();
          break;
        }
      }

      if (!userInput) {
        // Show notification or prompt for input
        const stHelpers = getSillyTavernHelpers();
        if (stHelpers.callPopup) {
          userInput = await stHelpers.callPopup(
            "Enter input for pipeline:",
            "input",
          );
        }
      }

      if (!userInput) {
        logger.debug("No input provided for pipeline");
        return;
      }

      // Check if there's an active pipeline to run
      const pipelines = Systems.PipelineSystem.getAllPipelines();
      if (pipelines.length === 0) {
        logger.warn("No pipelines configured");
        if (Systems.NavModal) {
          Systems.NavModal.show();
        }
        return;
      }

      // Run the first (or selected/active) pipeline
      const activePipeline = pipelines[0]; // Could be enhanced to track "active" pipeline
      logger.log("info", `Running pipeline: ${activePipeline.name}`);

      try {
        button.classList.remove("fa-play-circle");
        button.classList.add("fa-spinner", "fa-spin");

        await Systems.PipelineSystem.startRun(activePipeline.id, {
          userInput,
        });

        button.classList.remove("fa-spinner", "fa-spin");
        button.classList.add("fa-check-circle");
        button.style.color = "#4caf50";

        setTimeout(() => {
          button.classList.remove("fa-check-circle");
          button.classList.add("fa-play-circle");
          button.style.color = "";
        }, 2000);
      } catch (error) {
        logger.error("Pipeline run failed:", error);
        button.classList.remove("fa-spinner", "fa-spin");
        button.classList.add("fa-times-circle");
        button.style.color = "#f44336";

        setTimeout(() => {
          button.classList.remove("fa-times-circle");
          button.classList.add("fa-play-circle");
          button.style.color = "";
        }, 2000);
      }
    });

    // Insert before the send button or at the start of send area
    const sendButton = sendArea.querySelector(
      "#send_but, .send_button, button[type='submit']",
    );
    if (sendButton) {
      sendButton.parentNode.insertBefore(button, sendButton);
    } else {
      sendArea.insertBefore(button, sendArea.firstChild);
    }

    logger.debug("Pipeline trigger button added near send area");
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
      return window.TheCouncil;
    }

    if (initializationPromise) {
      return initializationPromise;
    }

    initializationPromise = (async () => {
      logger.log(`Initializing TheCouncil v${VERSION}...`);

      try {
        // Load settings
        loadSettings();

        // Load new architecture modules (including Kernel)
        await loadNewArchitecture();

        // Initialize Kernel
        const Kernel = await initializeKernel();

        // Register shared modules with Kernel
        registerModules(Kernel);

        // Initialize and register all systems
        await initializeSystems(Kernel);

        // Initialize UI
        initializeUI();

        // Register SillyTavern event listeners
        registerSTEventListeners();

        // Add ST UI elements (extension button + pipeline trigger)
        addSTUIElements();

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

        // Return Kernel as main API
        return Kernel;
      } catch (e) {
        logger.error("Failed to initialize TheCouncil:", e);
        throw e;
      }
    })();

    return initializationPromise;
  }

  // ===== EXPORT & AUTO-INIT =====

  // Note: window.TheCouncil is exposed by the Kernel
  // We just keep a reference to the legacy TheCouncil object for backwards compatibility
  const TheCouncil = {
    VERSION,
    EXTENSION_NAME,
    isInitialized: () => isInitialized,
    getSystem: (name) => window.TheCouncil?.getSystem?.(name) || Systems[name] || null,
    getSystems: () => window.TheCouncil?.getAllSystems?.() || { ...Systems },
    getSettings: () => window.TheCouncil?.getSettings?.() || extensionSettings,
    updateSettings: (updates) => window.TheCouncil?.updateSettings?.(updates),
    showNav: () => Systems.NavModal?.show(),
    hideNav: () => Systems.NavModal?.hide(),
    showAgents: () => Systems.AgentsModal?.show(),
    showCuration: () => Systems.CurationModal?.show(),
    showPipeline: (options) => Systems.PipelineModal?.show(options),
    runPipeline: (pipelineId, options) => window.TheCouncil?.runPipeline?.(pipelineId, options),
    getSummary: () => window.TheCouncil?.getSummary?.(),
  };

  // Expose individual systems for convenience (legacy)
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
