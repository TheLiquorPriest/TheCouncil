// index.js - The Council: Multi-LLM Story Production Pipeline
// Entry point and module orchestrator for SillyTavern extension

(function () {
  "use strict";

  // ===== EXTENSION METADATA =====
  const EXTENSION_NAME = "The_Council";
  const EXTENSION_PATH = "scripts/extensions/third-party/TheCouncil";
  const VERSION = "0.3.0";
  const DEBUG = true;

  // ===== MODULE REFERENCES =====
  const Modules = {
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

  // ===== SETTINGS =====
  let extensionSettings = null;

  // ===== LOGGING =====
  function log(msg, ...args) {
    console.log(`[${EXTENSION_NAME}] ${msg}`, ...args);
  }

  function debug(msg, ...args) {
    if (DEBUG) console.log(`[${EXTENSION_NAME}][DEBUG] ${msg}`, ...args);
  }

  function error(msg, ...args) {
    console.error(`[${EXTENSION_NAME}][ERROR] ${msg}`, ...args);
  }

  // ===== MODULE LOADING =====

  /**
   * Load a module script dynamically
   */
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.onload = () => {
        debug(`Loaded: ${src}`);
        resolve();
      };
      script.onerror = (e) => {
        error(`Failed to load: ${src}`, e);
        reject(new Error(`Failed to load ${src}`));
      };
      document.head.appendChild(script);
    });
  }

  /**
   * Load all module scripts
   */
  async function loadModules() {
    log("Loading modules...");

    const moduleFiles = [
      "config.js",
      "state.js",
      "stores.js",
      "context.js",
      "topology.js",
      "generation.js",
      "agents.js",
      "pipeline.js",
      "ui.js",
    ];

    try {
      for (const file of moduleFiles) {
        await loadScript(`${EXTENSION_PATH}/modules/${file}`);
      }

      // Get references to loaded modules
      Modules.Config = window.CouncilConfig;
      Modules.State = window.CouncilState;
      Modules.Stores = window.CouncilStores;
      Modules.Context = window.CouncilContext;
      Modules.Topology = window.CouncilTopology;
      Modules.Generation = window.CouncilGeneration;
      Modules.Agents = window.CouncilAgents;
      Modules.Pipeline = window.CouncilPipeline;
      Modules.UI = window.CouncilUI;

      log("All modules loaded successfully");
      return true;
    } catch (e) {
      error("Failed to load modules:", e);
      return false;
    }
  }

  // ===== SETTINGS MANAGEMENT =====

  /**
   * Get default settings
   */
  function getDefaultSettings() {
    const settings = {
      version: VERSION,
      agents: {},
      activeSMEs: [],
      delayBetweenCalls: 500,
      autoSaveStores: true,
      showTeamThreads: false,
      maxContextTokens: 8000,
      contextStrategy: "relevance",
      debugMode: DEBUG,
    };

    // Initialize per-agent settings
    if (Modules.Config?.AGENT_ROLES) {
      for (const [agentId, role] of Object.entries(
        Modules.Config.AGENT_ROLES,
      )) {
        settings.agents[agentId] = {
          enabled: true,
          useMainApi: true,
          apiEndpoint: "",
          apiKey: "",
          model: "",
          temperature: 0.7,
          maxTokens: 1000,
          systemPrompt: `You are ${role.name}. ${role.role}. Be concise and focused.`,
        };
      }
    }

    return settings;
  }

  /**
   * Load extension settings from ST
   */
  function loadSettings() {
    const context = SillyTavern.getContext();

    if (!context.extensionSettings[EXTENSION_NAME]) {
      context.extensionSettings[EXTENSION_NAME] = getDefaultSettings();
    }

    extensionSettings = context.extensionSettings[EXTENSION_NAME];

    // Merge any missing defaults
    const defaults = getDefaultSettings();
    for (const key of Object.keys(defaults)) {
      if (extensionSettings[key] === undefined) {
        extensionSettings[key] = defaults[key];
      }
    }

    // Ensure all agents have settings
    if (Modules.Config?.AGENT_ROLES) {
      for (const agentId of Object.keys(Modules.Config.AGENT_ROLES)) {
        if (!extensionSettings.agents[agentId]) {
          extensionSettings.agents[agentId] = defaults.agents[agentId];
        }
      }
    }

    debug("Settings loaded:", extensionSettings);
    return extensionSettings;
  }

  /**
   * Save extension settings to ST
   */
  function saveSettings() {
    const context = SillyTavern.getContext();
    context.extensionSettings[EXTENSION_NAME] = extensionSettings;
    context.saveSettingsDebounced();
    debug("Settings saved");
  }

  // ===== MODULE INITIALIZATION =====

  /**
   * Initialize all modules with proper dependencies
   */
  function initializeModules() {
    log("Initializing modules...");

    // Initialize State first (no dependencies)
    if (Modules.State) {
      Modules.State.init(extensionSettings);
    }

    // Initialize Generation (depends on State)
    if (Modules.Generation) {
      Modules.Generation.init(Modules.State);
      Modules.Generation.configure({
        delayBetweenCalls: extensionSettings.delayBetweenCalls,
      });
    }

    // Initialize Context (no dependencies for init)
    if (Modules.Context) {
      Modules.Context.init();
    }

    // Initialize Topology (no dependencies for init)
    if (Modules.Topology) {
      Modules.Topology.init();
    }

    // Initialize Agents (depends on Config, State, Context, Generation)
    if (Modules.Agents) {
      Modules.Agents.init({
        config: Modules.Config,
        state: Modules.State,
        context: Modules.Context,
        generation: Modules.Generation,
        stores: Modules.Stores,
      });
      Modules.Agents.loadConfigs(extensionSettings.agents);
    }

    // Initialize Pipeline (depends on all other modules)
    if (Modules.Pipeline) {
      Modules.Pipeline.init({
        config: Modules.Config,
        state: Modules.State,
        context: Modules.Context,
        stores: Modules.Stores,
        topology: Modules.Topology,
        generation: Modules.Generation,
        agents: Modules.Agents,
      });
    }

    // Initialize UI last (depends on Config, State, Pipeline)
    if (Modules.UI) {
      Modules.UI.init({
        config: Modules.Config,
        state: Modules.State,
        pipeline: Modules.Pipeline,
      });
    }

    log("All modules initialized");
  }

  // ===== EVENT WIRING =====

  /**
   * Set up event handlers to wire modules together
   */
  function setupEventHandlers() {
    if (!Modules.State) return;

    // Handle council:run event from UI
    Modules.State.on("council:run", async ({ userInput }) => {
      log("Pipeline triggered with input:", userInput.substring(0, 50) + "...");

      // Add user message to ST chat
      await addUserMessageToChat(userInput);

      // Run the pipeline
      try {
        const result = await Modules.Pipeline.run(userInput, {
          onPhaseStart: (phase, index, total) => {
            debug(`Phase ${index + 1}/${total}: ${phase.name}`);
          },
          onPhaseComplete: (phase, result, index, total) => {
            debug(`Phase ${phase.id} complete`);
          },
          onError: (err) => {
            error("Pipeline error:", err);
          },
        });

        if (result.success && result.finalDraft) {
          // Add final response to ST chat
          await addAssistantMessageToChat(result.finalDraft);
          log("Pipeline completed successfully");
        } else if (!result.success) {
          log("Pipeline failed:", result.error);
        }
      } catch (e) {
        error("Pipeline execution error:", e);
        Modules.State.failPipeline(e.message);
      }
    });

    // Handle settings changes
    Modules.State.on("settings:change", () => {
      saveSettings();
    });

    log("Event handlers set up");
  }

  // ===== SILLYTAVERN CHAT INTEGRATION =====

  /**
   * Add a user message to the ST chat
   */
  async function addUserMessageToChat(message) {
    const context = SillyTavern.getContext();

    const messageObj = {
      name: context.name1,
      is_user: true,
      is_system: false,
      send_date: new Date().toLocaleString(),
      mes: message,
    };

    context.chat.push(messageObj);

    if (typeof context.addOneMessage === "function") {
      await context.addOneMessage(messageObj);
    }

    if (typeof context.saveChat === "function") {
      await context.saveChat();
    }

    debug("User message added to chat");
  }

  /**
   * Add an assistant message to the ST chat
   */
  async function addAssistantMessageToChat(message) {
    if (!message || !message.trim()) {
      log("WARNING: Attempted to add empty message to chat");
      return;
    }

    const context = SillyTavern.getContext();

    const messageObj = {
      name: context.name2,
      is_user: false,
      is_system: false,
      send_date: new Date().toLocaleString(),
      mes: message,
      extra: {
        api: "council_pipeline",
        model: "multi-agent",
      },
    };

    context.chat.push(messageObj);

    if (typeof context.addOneMessage === "function") {
      await context.addOneMessage(messageObj);
    }

    if (typeof context.saveChat === "function") {
      await context.saveChat();
    }

    log("Assistant message added to chat");
  }

  // ===== VALIDATION =====

  /**
   * Validate that ST context is available and has required methods
   */
  function validateSTContext() {
    if (typeof SillyTavern === "undefined") {
      error("SillyTavern global not found");
      return false;
    }

    const context = SillyTavern.getContext();

    if (!context) {
      error("SillyTavern context not available");
      return false;
    }

    if (typeof context.executeSlashCommands !== "function") {
      error("executeSlashCommands not available - required for generation");
      return false;
    }

    return true;
  }

  // ===== PUBLIC API =====

  /**
   * Expose public API for external access
   */
  function exposePublicAPI() {
    window.TheCouncil = {
      version: VERSION,
      modules: Modules,
      settings: extensionSettings,

      // Methods
      run: (userInput) => Modules.State?.emit("council:run", { userInput }),
      abort: () => Modules.Pipeline?.abort(),
      isRunning: () => Modules.Pipeline?.isRunning() || false,
      getProgress: () => Modules.Pipeline?.getProgress(),
      getSummary: () => Modules.Pipeline?.getSummary(),

      // Module access
      getState: () => Modules.State,
      getStores: () => Modules.Stores,
      getContext: () => Modules.Context,
      getTopology: () => Modules.Topology,

      // Settings
      saveSettings: () => saveSettings(),
      reloadSettings: () => loadSettings(),

      // Debug
      debug: DEBUG,
      log: log,
    };

    log("Public API exposed as window.TheCouncil");
  }

  // ===== MAIN INITIALIZATION =====

  /**
   * Main initialization function
   */
  async function initialize() {
    log(`Initializing The Council v${VERSION}...`);

    // Validate ST context
    if (!validateSTContext()) {
      error("ST validation failed, aborting initialization");
      if (typeof toastr !== "undefined") {
        toastr.error(
          "The Council failed to load - missing SillyTavern API",
          EXTENSION_NAME,
        );
      }
      return;
    }

    // Load module scripts
    const modulesLoaded = await loadModules();
    if (!modulesLoaded) {
      error("Failed to load modules, aborting initialization");
      if (typeof toastr !== "undefined") {
        toastr.error("The Council failed to load modules", EXTENSION_NAME);
      }
      return;
    }

    // Load settings
    loadSettings();

    // Initialize modules
    initializeModules();

    // Set up event handlers
    setupEventHandlers();

    // Expose public API
    exposePublicAPI();

    log(`The Council v${VERSION} initialized successfully!`);

    if (typeof toastr !== "undefined") {
      toastr.info("Council Pipeline ready.", EXTENSION_NAME);
    }
  }

  // ===== ENTRY POINT =====

  // Wait for jQuery/DOM ready and ST to be available
  if (typeof jQuery !== "undefined") {
    jQuery(async function () {
      // Small delay to ensure ST is fully loaded
      setTimeout(initialize, 100);
    });
  } else {
    // Fallback: wait for DOMContentLoaded
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        setTimeout(initialize, 500);
      });
    } else {
      setTimeout(initialize, 500);
    }
  }
})();
