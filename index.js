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
    PromptBuilderSystem: null,
    PipelineBuilderSystem: null,
    OrchestrationSystem: null,
    CurationSystem: null,
    CharacterSystem: null,
    PipelineSystem: null,
    OutputManager: null,

    // Utilities
    Logger: null,
    ApiClient: null,

    // UI Modals
    // AgentsModal: null, // REMOVED: agents managed via PipelineModal
    CurationModal: null,
    CharacterModal: null,
    PipelineModal: null,
    GavelModal: null,
    NavModal: null,
    InjectionModal: null,

    // UI Components
    PromptBuilder: null,
    ParticipantSelector: null,
    ContextConfig: null,
    CurationPipelineBuilder: null,
    TokenPicker: null,
    ExecutionMonitor: null,

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
      "utils/api-client.js",

      // Kernel (load before systems)
      "core/kernel.js",

      // Schemas
      "schemas/systems.js",

      // Core Systems
      "core/prompt-builder-system.js",
      "core/pipeline-builder-system.js", // Consolidated system with agent/team/pipeline management
      "core/orchestration-system.js", // Response Orchestration
      "core/curation-system.js",
      "core/character-system.js",
      "core/output-manager.js",
      "core/pipeline-system.js",

      // UI Components
      "ui/components/prompt-builder.js",
      "ui/components/participant-selector.js",
      "ui/components/context-config.js",
      "ui/components/curation-pipeline-builder.js",
      "ui/components/token-picker.js",
      "ui/components/execution-monitor.js",

      // UI Modals
      // "ui/agents-modal.js", // REMOVED: agents managed via PipelineModal per SYSTEM_DEFINITIONS.md
      "ui/curation-modal.js",
      "ui/character-modal.js",
      "ui/pipeline-modal.js",
      "ui/gavel-modal.js",
      "ui/injection-modal.js",
      "ui/nav-modal.js",
    ];

    // Add integration tests in debug mode
    if (DEBUG) {
      moduleFiles.push("tests/integration-test.js");
    }

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
    Systems.ApiClient = window.ApiClient || null;
    Systems.SystemSchemas = window.SystemSchemas || null;

    Systems.PromptBuilderSystem = window.PromptBuilderSystem || null;
    Systems.PipelineBuilderSystem = window.PipelineBuilderSystem || null;
    Systems.OrchestrationSystem = window.OrchestrationSystem || null;
    Systems.CurationSystem = window.CurationSystem || null;
    Systems.CharacterSystem = window.CharacterSystem || null;
    Systems.PipelineSystem = window.PipelineSystem || null;
    Systems.OutputManager = window.OutputManager || null;

    // Systems.AgentsModal removed - agents managed via PipelineModal
    Systems.CurationModal = window.CurationModal || null;
    Systems.CharacterModal = window.CharacterModal || null;
    Systems.PipelineModal = window.PipelineModal || null;
    Systems.GavelModal = window.GavelModal || null;
    Systems.InjectionModal = window.InjectionModal || null;
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
      ApiClient: !!Systems.ApiClient,
      SystemSchemas: !!Systems.SystemSchemas,
      PromptBuilderSystem: !!Systems.PromptBuilderSystem,
      PipelineBuilderSystem: !!Systems.PipelineBuilderSystem,
      OrchestrationSystem: !!Systems.OrchestrationSystem,
      CurationSystem: !!Systems.CurationSystem,
      CharacterSystem: !!Systems.CharacterSystem,
      PipelineSystem: !!Systems.PipelineSystem,
      OutputManager: !!Systems.OutputManager,
      // AgentsModal removed - agents managed via PipelineModal
      CurationModal: !!Systems.CurationModal,
      CharacterModal: !!Systems.CharacterModal,
      PipelineModal: !!Systems.PipelineModal,
      GavelModal: !!Systems.GavelModal,
      InjectionModal: !!Systems.InjectionModal,
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

    // Initialize Prompt Builder System (first - other systems may depend on it)
    if (Systems.PromptBuilderSystem) {
      Systems.PromptBuilderSystem.init(Kernel);
      logger.log("info", "PromptBuilderSystem initialized");
    }

    // Initialize Pipeline Builder System (Task 4.1 - consolidated agent/team/pipeline management)
    if (Systems.PipelineBuilderSystem) {
      Systems.PipelineBuilderSystem.init(Kernel);
      logger.log("info", "PipelineBuilderSystem initialized");
    }

    // Initialize Curation System (with Kernel pattern)
    if (Systems.CurationSystem) {
      Systems.CurationSystem.init(Kernel, {
        // CurationSystem will register itself with Kernel
      });
      logger.log("info", "CurationSystem initialized");
    }

    // Initialize Character System (Kernel pattern - registers itself)
    if (Systems.CharacterSystem) {
      Systems.CharacterSystem.init(Kernel);
      logger.log("info", "CharacterSystem initialized");
    }

    // Initialize Output Manager
    if (Systems.OutputManager) {
      Systems.OutputManager.init({
        logger: Kernel.getModule("logger"),
        curationSystem: Systems.CurationSystem,
        promptBuilder: Kernel.getSystem("promptBuilder"),
      });
      Kernel.registerSystem("outputManager", Systems.OutputManager);
      logger.log("info", "OutputManager initialized");
    }

    // Initialize Pipeline System (depends on all others)
    if (Systems.PipelineSystem) {
      Systems.PipelineSystem.init({
        pipelineBuilderSystem: Systems.PipelineBuilderSystem,
        curationSystem: Systems.CurationSystem,
        characterSystem: Systems.CharacterSystem,
        outputManager: Systems.OutputManager,
        apiClient: Kernel.getModule("apiClient"),
        promptBuilder: Kernel.getSystem("promptBuilder"),
      });
      Kernel.registerSystem("pipelineSystem", Systems.PipelineSystem);
      logger.log("info", "PipelineSystem initialized");
    }

    // Initialize Orchestration System (Task 5.x - Response Orchestration with 3 modes)
    if (Systems.OrchestrationSystem) {
      Systems.OrchestrationSystem.init(Kernel, {
        apiClient: Kernel.getModule("apiClient"),
        logger: Kernel.getModule("logger"),
      });
      // OrchestrationSystem registers itself with Kernel in init()
      // Load any persisted injection mappings
      Systems.OrchestrationSystem.loadInjectionMappings();
      logger.log("info", "OrchestrationSystem initialized");
    }


    // Initialize UI Components
    if (Systems.PromptBuilder) {
      Systems.PromptBuilder.init({
        promptBuilderSystem: Systems.PromptBuilderSystem,
        logger: Kernel.getModule("logger"),
      });
      logger.log("info", "PromptBuilder initialized");
    }

    if (Systems.ParticipantSelector) {
      Systems.ParticipantSelector.init({
        pipelineBuilderSystem: Systems.PipelineBuilderSystem,
        logger: Kernel.getModule("logger"),
      });
      logger.log("info", "ParticipantSelector initialized");
    }

    if (Systems.ContextConfig) {
      Systems.ContextConfig.init({
        curationSystem: Systems.CurationSystem,
        pipelineBuilderSystem: Systems.PipelineBuilderSystem,
        logger: Kernel.getModule("logger"),
      });
      logger.log("info", "ContextConfig initialized");
    }

    if (Systems.CurationPipelineBuilder) {
      Systems.CurationPipelineBuilder.init({
        curationSystem: Systems.CurationSystem,
        pipelineBuilderSystem: Systems.PipelineBuilderSystem,
        logger: Kernel.getModule("logger"),
      });
      logger.log("info", "CurationPipelineBuilder initialized");
    }

    logger.log("info", "All core systems initialized");
  }

  /**
   * Initialize UI modals
   * @param {Object} Kernel - Kernel instance
   */
  function initializeUI(Kernel) {
    logger.log("info", "Initializing UI modals...");
    console.log("[TheCouncil] initializeUI called - Systems available:", {
      // AgentsModal removed - agents managed via PipelineModal
      CurationModal: !!Systems.CurationModal,
      CharacterModal: !!Systems.CharacterModal,
      PipelineModal: !!Systems.PipelineModal,
      GavelModal: !!Systems.GavelModal,
      InjectionModal: !!Systems.InjectionModal,
      NavModal: !!Systems.NavModal,
    });

    // NOTE: AgentsModal removed - editorial agents are managed via PipelineModal
    // per SYSTEM_DEFINITIONS.md: "agents-system.js functionality consolidated into Pipeline Builder System"

    // Initialize Curation Modal
    if (Systems.CurationModal) {
      Systems.CurationModal.init({
        kernel: Kernel,
        curationSystem: Systems.CurationSystem,
        logger: Kernel.getModule("logger"),
      });
    }

    // Initialize Character Modal
    if (Systems.CharacterModal) {
      Systems.CharacterModal.init({
        kernel: Kernel,
        characterSystem: Systems.CharacterSystem,
        curationSystem: Systems.CurationSystem,
        logger: Kernel.getModule("logger"),
      });
    }

    // Initialize Pipeline Modal (Kernel pattern)
    if (Systems.PipelineModal) {
      Systems.PipelineModal.init(Kernel);
    }

    // Initialize Gavel Modal (Kernel + options hybrid)
    if (Systems.GavelModal) {
      Systems.GavelModal.init(Kernel);
    }

    // Initialize Injection Modal (Task 5.3 - Mode 3 Injection UI)
    if (Systems.InjectionModal) {
      Systems.InjectionModal.init({
        kernel: Kernel,
        orchestrationSystem: Systems.OrchestrationSystem,
        curationSystem: Systems.CurationSystem,
        logger: Kernel.getModule("logger"),
      });
    }

    // Initialize Nav Modal
    if (Systems.NavModal) {
      console.log("[TheCouncil] Initializing NavModal...");
      try {
        Systems.NavModal.init({
          kernel: Kernel,
          // agentsModal removed - agents managed via PipelineModal
          curationModal: Systems.CurationModal,
          characterModal: Systems.CharacterModal,
          pipelineModal: Systems.PipelineModal,
          gavelModal: Systems.GavelModal,
          injectionModal: Systems.InjectionModal,
          pipelineSystem: Systems.PipelineSystem,
          orchestrationSystem: Systems.OrchestrationSystem,
          logger: Kernel.getModule("logger"),
        });
        console.log("[TheCouncil] NavModal.init() completed", {
          initialized: Systems.NavModal._initialized,
          containerExists: !!Systems.NavModal._elements?.container,
        });
      } catch (e) {
        console.error("[TheCouncil] NavModal.init() FAILED:", e);
      }
    } else {
      console.warn("[TheCouncil] NavModal not available - UI will not show");
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
        initializeUI(Kernel);

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

  // Note: window.TheCouncil is exposed by the Kernel (core/kernel.js)
  // Expose Systems for legacy access
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

  // ===== DEBUG: Add manual trigger if UI doesn't show =====
  // This adds a floating button that can be used to manually trigger the UI
  // if automatic initialization fails
  setTimeout(() => {
    // Check if NavModal container exists and is visible
    const navContainer = document.querySelector(".council-nav-container");
    const hasVisibleUI =
      navContainer && navContainer.classList.contains("visible");

    if (!hasVisibleUI) {
      logger.warn(
        "NavModal not visible after initialization - adding debug trigger",
      );

      // Add a floating debug button
      const debugBtn = document.createElement("div");
      debugBtn.id = "council-debug-trigger";
      debugBtn.innerHTML = "🏛️";
      debugBtn.title = "Open TheCouncil (Debug Trigger)";
      debugBtn.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 50px;
        height: 50px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
        cursor: pointer;
        z-index: 99999;
        box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        transition: transform 0.2s;
      `;
      debugBtn.addEventListener("mouseenter", () => {
        debugBtn.style.transform = "scale(1.1)";
      });
      debugBtn.addEventListener("mouseleave", () => {
        debugBtn.style.transform = "scale(1)";
      });
      debugBtn.addEventListener("click", () => {
        // Try to show NavModal
        if (Systems.NavModal) {
          Systems.NavModal.show();
          logger.log("debug", "NavModal.show() called via debug trigger");
        } else {
          logger.error("NavModal not available");
          alert(
            "TheCouncil NavModal not initialized. Check browser console for errors.",
          );
        }

        // Log debug info
        console.log("[TheCouncil Debug Info]", {
          initialized: isInitialized,
          navModalExists: !!Systems.NavModal,
          navModalInitialized: Systems.NavModal?._initialized,
          navContainerExists: !!document.querySelector(".council-nav-container"),
          systems: Object.keys(Systems).filter((k) => Systems[k] !== null),
        });
      });

      document.body.appendChild(debugBtn);
    }
  }, 3000); // Wait 3 seconds after page load
})();
