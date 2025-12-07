// index.js - The Council: Multi-LLM Story Production Pipeline
// Entry point and module orchestrator for SillyTavern extension

(function () {
  "use strict";

  // ===== EXTENSION METADATA =====
  const EXTENSION_NAME = "The_Council";
  const EXTENSION_PATH = "scripts/extensions/third-party/TheCouncil";
  const VERSION = "0.4.0";
  const DEBUG = true;

  // ===== MODULE REFERENCES =====
  const Modules = {
    // Legacy modules
    Config: null,
    State: null,
    Stores: null,
    Context: null,
    Topology: null,
    Generation: null,
    Agents: null,
    Pipeline: null,
    UI: null,

    // New modular architecture
    Core: null,
    ContextManager: null,
    OutputManager: null,
    ThreadManager: null,
    PipelineSchemas: null,
    PipelineExecutor: null,
    DataViewer: null,
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

    // Legacy modules (load first for backward compatibility)
    const legacyModuleFiles = [
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

    // New modular architecture modules
    const newModuleFiles = [
      "context/manager.js",
      "pipeline/schemas.js",
      "pipeline/output-manager.js",
      "threads/manager.js",
      "core/index.js",
      "pipeline/executor.js",
      "ui/data-viewer.js",
    ];

    try {
      // Load legacy modules
      for (const file of legacyModuleFiles) {
        await loadScript(`${EXTENSION_PATH}/modules/${file}`);
      }

      // Load new architecture modules
      for (const file of newModuleFiles) {
        try {
          await loadScript(`${EXTENSION_PATH}/modules/${file}`);
          debug(`Loaded new module: ${file}`);
        } catch (e) {
          // New modules are optional for backward compatibility
          debug(`Optional module not loaded: ${file}`, e.message);
        }
      }

      // Get references to legacy modules
      Modules.Config = window.CouncilConfig;
      Modules.State = window.CouncilState;
      Modules.Stores = window.CouncilStores;
      Modules.Context = window.CouncilContext;
      Modules.Topology = window.CouncilTopology;
      Modules.Generation = window.CouncilGeneration;
      Modules.Agents = window.CouncilAgents;
      Modules.Pipeline = window.CouncilPipeline;
      Modules.UI = window.CouncilUI;

      // Get references to new architecture modules
      Modules.ContextManager = window.ContextManager || null;
      Modules.OutputManager = window.OutputManager || null;
      Modules.ThreadManager = window.ThreadManager || null;
      Modules.PipelineSchemas = window.PipelineSchemas || null;
      Modules.Core = window.CouncilCore || null;
      Modules.PipelineExecutor = window.PipelineExecutor || null;
      Modules.DataViewer = window.DataViewer || null;

      log("All modules loaded successfully");
      debug("New architecture modules:", {
        ContextManager: !!Modules.ContextManager,
        OutputManager: !!Modules.OutputManager,
        ThreadManager: !!Modules.ThreadManager,
        PipelineSchemas: !!Modules.PipelineSchemas,
        Core: !!Modules.Core,
        PipelineExecutor: !!Modules.PipelineExecutor,
        DataViewer: !!Modules.DataViewer,
      });

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

    // Log which modules are available
    debug("Legacy modules loaded:", {
      Config: !!Modules.Config,
      State: !!Modules.State,
      Stores: !!Modules.Stores,
      Context: !!Modules.Context,
      Topology: !!Modules.Topology,
      Generation: !!Modules.Generation,
      Agents: !!Modules.Agents,
      Pipeline: !!Modules.Pipeline,
      UI: !!Modules.UI,
    });

    debug("New architecture modules loaded:", {
      ContextManager: !!Modules.ContextManager,
      OutputManager: !!Modules.OutputManager,
      ThreadManager: !!Modules.ThreadManager,
      PipelineSchemas: !!Modules.PipelineSchemas,
      Core: !!Modules.Core,
      PipelineExecutor: !!Modules.PipelineExecutor,
      DataViewer: !!Modules.DataViewer,
    });

    // Initialize State first (no dependencies)
    if (Modules.State) {
      Modules.State.init(extensionSettings);
      debug("State module initialized");
    } else {
      error("State module not available!");
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

    // ===== NEW ARCHITECTURE INITIALIZATION =====

    // Get team IDs from config for thread initialization
    const teamIds = getTeamIds();

    // Initialize new architecture modules if available
    if (Modules.Core) {
      Modules.Core.init({
        contextManager: Modules.ContextManager,
        outputManager: Modules.OutputManager,
        threadManager: Modules.ThreadManager,
        pipelineSchemas: Modules.PipelineSchemas,
        threads: { teams: teamIds },
      });
      debug("Council Core initialized");
    } else {
      // Initialize modules individually if Core not available
      if (Modules.ContextManager) {
        Modules.ContextManager.init();
        debug("ContextManager initialized");
      }
      if (Modules.OutputManager) {
        Modules.OutputManager.init();
        debug("OutputManager initialized");
      }
      if (Modules.ThreadManager) {
        Modules.ThreadManager.init({ teams: teamIds });
        debug("ThreadManager initialized");
      }
    }

    // Initialize Pipeline Executor (new architecture pipeline runner)
    if (Modules.PipelineExecutor) {
      Modules.PipelineExecutor.init({
        config: Modules.Config,
        state: Modules.State,
        stores: Modules.Stores,
        context: Modules.Context,
        topology: Modules.Topology,
        generation: Modules.Generation,
        agents: Modules.Agents,
        // New modules
        core: Modules.Core,
        contextManager: Modules.ContextManager,
        outputManager: Modules.OutputManager,
        threadManager: Modules.ThreadManager,
        pipelineSchemas: Modules.PipelineSchemas,
      });
      debug(
        "Pipeline Executor initialized with",
        Modules.PipelineExecutor.getPhases()?.length || 0,
        "phases",
      );
    }

    // ===== LEGACY PIPELINE (kept for backward compatibility) =====

    // Initialize Legacy Pipeline (depends on all other modules)
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
      debug(
        "Legacy Pipeline initialized with",
        Modules.Pipeline.getPhases()?.length || 0,
        "phases",
      );
    } else {
      error("Pipeline module not available!");
    }

    // Initialize UI last (depends on Config, State, Pipeline)
    if (Modules.UI) {
      Modules.UI.init({
        config: Modules.Config,
        state: Modules.State,
        pipeline: Modules.PipelineExecutor || Modules.Pipeline, // Prefer new executor
      });
      debug("UI module initialized");
    } else {
      error("UI module not available!");
    }

    log("All modules initialized");

    // Verify critical modules
    if (!Modules.Pipeline || !Modules.State || !Modules.Generation) {
      error("Critical modules missing! Pipeline may not work correctly.");
    }

    // Initialize Data Viewer
    if (Modules.DataViewer) {
      Modules.DataViewer.init({
        stores: Modules.Stores,
        contextManager: Modules.ContextManager,
        outputManager: Modules.OutputManager,
        threadManager: Modules.ThreadManager,
      });
      debug("Data Viewer initialized");
    }

    // Log new architecture status
    if (Modules.Core && Modules.PipelineExecutor) {
      log("New modular architecture enabled");
    } else {
      log("Running in legacy mode (new modules not fully loaded)");
    }
  }

  /**
   * Get team IDs from agent configuration
   */
  function getTeamIds() {
    if (!Modules.Config?.AGENT_ROLES) return [];

    const teams = new Set();
    for (const role of Object.values(Modules.Config.AGENT_ROLES)) {
      if (role.team) {
        teams.add(role.team);
      }
    }
    return Array.from(teams);
  }

  // ===== EVENT WIRING =====

  /**
   * Set up event handlers to wire modules together
   */
  function setupEventHandlers() {
    if (!Modules.State) {
      error("State module not available for event setup");
      return;
    }

    // Handle council:run event from UI
    // Wrap in an immediately-invoked async function to properly catch errors
    Modules.State.on("council:run", (data) => {
      runPipelineWithInput(data.userInput);
    });

    // Handle settings changes
    Modules.State.on("settings:change", () => {
      saveSettings();
    });

    log("Event handlers set up");
  }

  /**
   * Run the pipeline with user input (separated for better error handling)
   */
  async function runPipelineWithInput(userInput) {
    log("Pipeline triggered with input:", userInput.substring(0, 50) + "...");

    // Determine which pipeline to use (prefer new executor)
    const useNewExecutor = !!Modules.PipelineExecutor;
    const pipeline = useNewExecutor
      ? Modules.PipelineExecutor
      : Modules.Pipeline;

    // Verify pipeline module is available
    if (!pipeline) {
      error("Pipeline module not available!");
      if (typeof toastr !== "undefined") {
        toastr.error("Pipeline module not loaded", EXTENSION_NAME);
      }
      return;
    }

    // Check if pipeline has phases
    const phases = pipeline.getPhases();
    debug("Pipeline phases count:", phases?.length || 0);
    debug("Using new executor:", useNewExecutor);

    if (!phases || phases.length === 0) {
      error("No pipeline phases defined!");
      if (typeof toastr !== "undefined") {
        toastr.error("Pipeline has no phases configured", EXTENSION_NAME);
      }
      return;
    }

    // Add user message to ST chat
    try {
      await addUserMessageToChat(userInput);
      debug("User message added to chat");
    } catch (e) {
      error("Failed to add user message:", e);
    }

    // Run the pipeline
    try {
      log("Starting pipeline execution...");

      const runOptions = {
        onPhaseStart: (phase, index, total) => {
          log(`Phase ${index + 1}/${total}: ${phase.name}`);
        },
        onPhaseComplete: (phase, result, index, total) => {
          debug(`Phase ${phase.id} complete`);
        },
        onPhaseError: (phase, err, index) => {
          error(`Pipeline phase ${phase.id} error:`, err);
        },
        onError: (err) => {
          error("Pipeline error:", err);
        },
      };

      // Add RAG callbacks if using new executor
      if (useNewExecutor) {
        runOptions.onRAGRequest = (request) => {
          debug(
            "RAG request:",
            request.requestId,
            request.query?.substring(0, 50),
          );
        };
        runOptions.onRAGResponse = (response) => {
          debug(
            "RAG response:",
            response.requestId,
            response.content?.substring(0, 50),
          );
        };
        runOptions.useNewArchitecture = true;
      }

      const result = await pipeline.run(userInput, runOptions);

      debug("Pipeline result:", result);

      if (result.success && result.finalDraft) {
        // Add final response to ST chat
        await addAssistantMessageToChat(result.finalDraft);
        log("Pipeline completed successfully with response");
      } else if (result.success && !result.finalDraft) {
        log("Pipeline completed but no final draft was generated");
        if (typeof toastr !== "undefined") {
          toastr.warning(
            "Pipeline completed but generated no output",
            EXTENSION_NAME,
          );
        }
      } else if (!result.success) {
        error("Pipeline failed:", result.error);
        if (typeof toastr !== "undefined") {
          toastr.error(`Pipeline failed: ${result.error}`, EXTENSION_NAME);
        }
      }
    } catch (e) {
      error("Pipeline execution error:", e);
      console.error(e);
      Modules.State?.failPipeline(e.message);
      if (typeof toastr !== "undefined") {
        toastr.error(`Pipeline error: ${e.message}`, EXTENSION_NAME);
      }
    }
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
    // Determine preferred pipeline
    const preferredPipeline = Modules.PipelineExecutor || Modules.Pipeline;

    window.TheCouncil = {
      version: VERSION,
      modules: Modules,
      settings: extensionSettings,

      // Methods
      run: (userInput) => Modules.State?.emit("council:run", { userInput }),
      abort: () => preferredPipeline?.abort(),
      isRunning: () => preferredPipeline?.isRunning() || false,
      getProgress: () => preferredPipeline?.getProgress(),
      getSummary: () => preferredPipeline?.getSummary(),

      // Module access - Legacy
      getState: () => Modules.State,
      getStores: () => Modules.Stores,
      getContext: () => Modules.Context,
      getTopology: () => Modules.Topology,

      // Module access - New Architecture
      getCore: () => Modules.Core,
      getContextManager: () => Modules.ContextManager,
      getOutputManager: () => Modules.OutputManager,
      getThreadManager: () => Modules.ThreadManager,
      getPipelineExecutor: () => Modules.PipelineExecutor,
      getPipelineSchemas: () => Modules.PipelineSchemas,
      getDataViewer: () => Modules.DataViewer,

      // Data Viewer shortcuts
      showDataViewer: () => Modules.DataViewer?.show(),
      hideDataViewer: () => Modules.DataViewer?.hide(),
      toggleDataViewer: () => Modules.DataViewer?.toggle(),

      // Architecture info
      isNewArchitectureEnabled: () =>
        !!(Modules.Core && Modules.PipelineExecutor),
      getArchitectureStatus: () => ({
        newArchitecture: !!(Modules.Core && Modules.PipelineExecutor),
        modules: {
          core: !!Modules.Core,
          contextManager: !!Modules.ContextManager,
          outputManager: !!Modules.OutputManager,
          threadManager: !!Modules.ThreadManager,
          pipelineSchemas: !!Modules.PipelineSchemas,
          pipelineExecutor: !!Modules.PipelineExecutor,
          dataViewer: !!Modules.DataViewer,
        },
      }),

      // Settings
      saveSettings: () => saveSettings(),
      reloadSettings: () => loadSettings(),

      // Debug utilities
      debug: DEBUG,
      log: log,
      getDebugSnapshot: () => {
        return {
          version: VERSION,
          state: Modules.State?.getSnapshot(),
          stores: Modules.Stores?.getSummary(),
          context: Modules.Context?.getSummary(),
          core: Modules.Core?.getSummary(),
          pipeline: preferredPipeline?.getSummary(),
          stores: Modules.Stores?.getSummary(),
          storedStories: Modules.Stores?.listStoredStories?.(),
        };
      },
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
