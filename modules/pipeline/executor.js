// modules/pipeline/executor.js - Pipeline Executor for The Council
// New pipeline runner using modular architecture with full integration
// Integrates: ContextManager, OutputManager, ThreadManager, PipelineSchemas

const PipelineExecutor = {
  // ===== VERSION =====
  VERSION: "1.0.0",

  // ===== MODULE REFERENCES =====
  _core: null,
  _config: null,
  _state: null,
  _stores: null,
  _context: null,
  _agents: null,
  _generation: null,
  _topology: null,

  // New modular architecture
  _contextManager: null,
  _outputManager: null,
  _threadManager: null,
  _pipelineSchemas: null,

  // ===== PIPELINE STATE =====
  _phases: [],
  _migratedPhases: [], // Phases converted to new format
  _currentPhaseIndex: -1,
  _currentPhase: null,
  _aborted: false,
  _startTime: null,
  _phaseResults: new Map(),

  // ===== RAG STATE =====
  _pendingRAGRequests: new Map(),
  _ragResponses: new Map(),

  // ===== EVENT LISTENERS =====
  _listeners: new Map(),

  // ===== INITIALIZATION =====

  /**
   * Initialize the pipeline executor
   * @param {Object} modules - Module references
   * @returns {PipelineExecutor}
   */
  init(modules = {}) {
    console.log("[Pipeline Executor] Initializing...");

    // Legacy modules
    this._config = modules.config || window.CouncilConfig || null;
    this._state = modules.state || window.CouncilState || null;
    this._stores = modules.stores || window.CouncilStores || null;
    this._context = modules.context || window.CouncilContext || null;
    this._agents = modules.agents || window.CouncilAgents || null;
    this._generation = modules.generation || window.CouncilGeneration || null;
    this._topology = modules.topology || window.CouncilTopology || null;

    // New modular architecture
    this._core = modules.core || window.CouncilCore || null;
    this._contextManager =
      modules.contextManager || window.ContextManager || null;
    this._outputManager = modules.outputManager || window.OutputManager || null;
    this._threadManager = modules.threadManager || window.ThreadManager || null;
    this._pipelineSchemas =
      modules.pipelineSchemas || window.PipelineSchemas || null;

    // Initialize new modules if available
    this._initializeNewModules();

    // Load and migrate phases
    this._loadPhases();

    console.log(
      "[Pipeline Executor] Initialized with",
      this._phases.length,
      "phases",
    );
    return this;
  },

  /**
   * Initialize new modular architecture
   */
  _initializeNewModules() {
    // Initialize Core if available (it will init child modules)
    if (this._core && !this._core.isInitialized()) {
      this._core.init({
        contextManager: this._contextManager,
        outputManager: this._outputManager,
        threadManager: this._threadManager,
        pipelineSchemas: this._pipelineSchemas,
        threads: {
          teams: this._getTeamIds(),
        },
      });
    } else {
      // Initialize modules individually if Core not available
      if (this._contextManager && !this._contextManager.isInitialized()) {
        this._contextManager.init();
      }
      if (this._outputManager && !this._outputManager.isInitialized()) {
        this._outputManager.init();
      }
      if (this._threadManager && !this._threadManager.isInitialized()) {
        this._threadManager.init({ teams: this._getTeamIds() });
      }
    }
  },

  /**
   * Get all team IDs from config
   * @returns {Array<string>}
   */
  _getTeamIds() {
    if (!this._config?.AGENT_ROLES) return [];

    const teams = new Set();
    for (const role of Object.values(this._config.AGENT_ROLES)) {
      if (role.team) {
        teams.add(role.team);
      }
    }
    return Array.from(teams);
  },

  /**
   * Load phases from config and migrate to new format
   */
  _loadPhases() {
    this._phases = this._config?.PIPELINE_PHASES || [];

    // Migrate old phases to new format if schemas available
    if (this._pipelineSchemas && this._phases.length > 0) {
      this._migratedPhases = this._phases.map((phase) =>
        this._pipelineSchemas.migratePhaseDefinition(phase),
      );
      console.log(
        "[Pipeline Executor] Migrated",
        this._migratedPhases.length,
        "phases to new format",
      );
    } else {
      this._migratedPhases = this._phases;
    }
  },

  // ===== MAIN PIPELINE EXECUTION =====

  /**
   * Run the complete pipeline
   * @param {string} userInput - User's input text
   * @param {Object} options - Execution options
   * @returns {Object} Pipeline result
   */
  async run(userInput, options = {}) {
    console.log("[Pipeline Executor] Starting pipeline run...");

    const {
      skipPhases = [],
      onPhaseStart = null,
      onPhaseComplete = null,
      onPhaseError = null,
      onRAGRequest = null,
      onRAGResponse = null,
      useNewArchitecture = true,
    } = options;

    // Validate input
    if (!userInput || !userInput.trim()) {
      throw new Error("User input is required");
    }

    // Check if already running
    if (this._state?.pipeline?.isProcessing) {
      throw new Error("Pipeline is already running");
    }

    // Reset state
    this._aborted = false;
    this._currentPhaseIndex = -1;
    this._currentPhase = null;
    this._startTime = Date.now();
    this._phaseResults.clear();
    this._pendingRAGRequests.clear();
    this._ragResponses.clear();

    // Start pipeline in legacy state
    this._state?.startPipeline(userInput);

    try {
      // Phase 0: Initialize context and stores (MUST happen before new architecture pipeline)
      await this._initializePipelineContext(userInput);

      // Start pipeline in new architecture (after stores are initialized)
      if (useNewArchitecture && this._core) {
        this._startNewArchitecturePipeline(userInput);
      }

      // Execute phases
      const phases = useNewArchitecture ? this._migratedPhases : this._phases;

      for (let i = 0; i < phases.length; i++) {
        if (this._aborted) {
          console.log("[Pipeline Executor] Pipeline aborted by user");
          break;
        }

        const phase = phases[i];
        const originalPhase = this._phases[i]; // For backward compatibility

        // Skip if requested
        if (skipPhases.includes(phase.id)) {
          console.log(`[Pipeline Executor] Skipping phase: ${phase.id}`);
          continue;
        }

        // Update state
        this._currentPhaseIndex = i;
        this._currentPhase = phase;
        this._state?.setPhase(i, originalPhase);

        // Emit phase start
        this._emit("phase:start", { phase, index: i, total: phases.length });
        if (onPhaseStart) {
          await onPhaseStart(phase, i, phases.length);
        }

        console.log(
          `[Pipeline Executor] Phase ${i + 1}/${phases.length}: ${phase.name}`,
        );

        try {
          // Begin phase in new architecture
          if (useNewArchitecture) {
            this._beginPhase(phase);
          }

          // Execute RAG if configured
          if (useNewArchitecture && this._phaseRequiresRAG(phase)) {
            await this._executePhaseRAG(phase, { onRAGRequest, onRAGResponse });
          }

          // Execute phase
          const phaseResult = await this._executePhase(
            phase,
            originalPhase,
            useNewArchitecture,
          );

          // Store result
          this._phaseResults.set(phase.id, phaseResult);
          this._state?.setPhaseResult(phase.id, phaseResult);

          // Handle user gavel if needed
          if (this._phaseRequiresGavel(phase, originalPhase)) {
            await this._handleGavel(phase, originalPhase);
          }

          // Route outputs in new architecture
          if (useNewArchitecture) {
            this._routePhaseOutputs(phase, phaseResult);
          }

          // End phase in new architecture
          if (useNewArchitecture) {
            this._endPhase(phase, phaseResult);
          }

          // Emit phase complete
          this._emit("phase:complete", {
            phase,
            result: phaseResult,
            index: i,
            total: phases.length,
          });
          if (onPhaseComplete) {
            await onPhaseComplete(phase, phaseResult, i, phases.length);
          }
        } catch (phaseError) {
          console.error(
            `[Pipeline Executor] Phase ${phase.id} error:`,
            phaseError,
          );

          this._emit("phase:error", { phase, error: phaseError, index: i });
          if (onPhaseError) {
            await onPhaseError(phase, phaseError, i);
          }

          // Continue or abort based on error severity
          if (this._isCriticalPhase(phase)) {
            throw phaseError;
          }
        }
      }

      // Save stores
      this._stores?.save();

      // Complete pipeline
      this._state?.completePipeline();

      // End pipeline in new architecture
      if (useNewArchitecture && this._core) {
        this._core.endPipeline({ success: true });
      }

      // Build result
      const result = this._buildPipelineResult(true);

      this._emit("pipeline:complete", result);
      console.log("[Pipeline Executor] Pipeline completed successfully");

      return result;
    } catch (error) {
      console.error("[Pipeline Executor] Pipeline failed:", error);

      this._state?.failPipeline(error.message);

      if (useNewArchitecture && this._core) {
        this._core.endPipeline({ success: false, error: error.message });
      }

      const result = this._buildPipelineResult(false, error);
      this._emit("pipeline:error", result);

      return result;
    }
  },

  /**
   * Abort the running pipeline
   */
  abort() {
    this._aborted = true;
    this._emit("pipeline:abort", { phaseIndex: this._currentPhaseIndex });
    console.log("[Pipeline Executor] Abort requested");
  },

  // ===== PIPELINE INITIALIZATION =====

  /**
   * Start pipeline with new architecture
   * @param {string} userInput - User input
   */
  _startNewArchitecturePipeline(userInput) {
    if (!this._core) return;

    // Build static context
    const staticContext = this._buildStaticContext();

    // Build initial global context
    const globalContext = this._buildInitialGlobalContext(userInput);

    // Build persistent refs
    const persistentRefs = this._buildPersistentRefs();

    this._core.startPipeline({
      staticContext,
      globalContext,
      persistentRefs,
    });
  },

  /**
   * Build static context from ST data
   * @returns {Object}
   */
  _buildStaticContext() {
    const context = {};

    // Character card (never changes during pipeline)
    const charCard = this._context?.getProcessed()?.formattedCharacter;
    if (charCard) {
      context.character_card = {
        data: charCard,
        name: "Character Card",
        description: "The character's core definition",
      };
    }

    // World info summary (treated as static for single pipeline run)
    const worldInfo = this._context?.getProcessed()?.formattedWorldInfo;
    if (worldInfo) {
      context.world_info = {
        data: worldInfo,
        name: "World Information",
        description: "Lore and world building entries",
      };
    }

    return context;
  },

  /**
   * Build initial global context
   * @param {string} userInput - User input
   * @returns {Object}
   */
  _buildInitialGlobalContext(userInput) {
    const context = {};

    // User input
    context.user_input = {
      data: userInput,
      name: "User Input",
      description: "The user's current request",
    };

    // Current situation from stores
    const situation = this._stores?.getCurrentSituation();
    if (situation) {
      context.current_situation = {
        data: situation,
        name: "Current Situation",
        description: "The current story state",
      };
    }

    // Story synopsis
    const synopsis = this._stores?.get("storySynopsis");
    if (synopsis) {
      context.story_synopsis = {
        data: synopsis,
        name: "Story Synopsis",
        description: "High-level story summary",
      };
    }

    // Recent chat
    const recentChat = this._context?.getProcessed()?.formattedChat;
    if (recentChat) {
      context.recent_chat = {
        data: recentChat.formatted?.substring(0, 4000),
        name: "Recent Chat",
        description: "Recent conversation history",
      };
    }

    return context;
  },

  /**
   * Build persistent store references
   * @returns {Object}
   */
  _buildPersistentRefs() {
    return {
      plot_lines: { storeKey: "plotLines" },
      active_plots: {
        storeKey: "plotLines",
        transform: (plots) => plots?.filter((p) => p.status === "active"),
      },
      scenes: { storeKey: "scenes" },
      current_scene: {
        storeKey: "scenes",
        transform: (scenes) => scenes?.[scenes.length - 1],
      },
      character_sheets: { storeKey: "characterSheets" },
      present_characters: {
        storeKey: "characterSheets",
        transform: (chars) =>
          Object.values(chars || {}).filter((c) => c.isPresent),
      },
      location_sheets: { storeKey: "locationSheets" },
      dialogue_history: { storeKey: "dialogueHistory" },
      story_outline: { storeKey: "storyOutline" },
      story_draft: { storeKey: "storyDraft" },
    };
  },

  /**
   * Initialize pipeline context
   * @param {string} userInput - User input
   */
  async _initializePipelineContext(userInput) {
    // Initialize stores first
    this._initializeStores();

    // Initialize legacy context
    if (this._context) {
      this._context.retrieveFromST();
      this._context.process(this._stores);

      const tokenEstimates = this._context.getProcessed()?.tokenEstimates || {};
      this._state?.setContextLoaded(tokenEstimates.total || 0);
      this._state?.setContextProcessed();
    }

    // Initialize character agents
    this._initializeCharacterAgents();

    // Initialize topology
    this._initializeTopology();

    console.log("[Pipeline Executor] Pipeline context initialized");
  },

  /**
   * Initialize stores for current story
   * Ensures stores are tied to the specific chat and persist across refreshes
   */
  _initializeStores() {
    if (!this._stores) return;

    try {
      const context = SillyTavern.getContext();
      const chatId = context.chatId || "default";
      const characterName = context.name2 || "Unknown";
      const userName = context.name1 || "User";

      // Initialize stores with full context for persistence
      // The storyId is the chatId to ensure chat-specific storage
      this._stores.init(chatId, {
        chatId: chatId,
        characterName: characterName,
        userName: userName,
      });

      // Update state with story context
      this._state?.setStoryContext(chatId, characterName, userName, chatId);

      console.log("[Pipeline Executor] Stores initialized for chat:", chatId);
      console.log(
        "[Pipeline Executor] Character:",
        characterName,
        "User:",
        userName,
      );

      // Log persistence status
      const storedStories = this._stores.listStoredStories?.() || [];
      console.log(
        "[Pipeline Executor] Total stored chats:",
        storedStories.length,
      );
    } catch (e) {
      console.error("[Pipeline Executor] Store initialization error:", e);
    }
  },

  /**
   * Initialize character agents
   */
  _initializeCharacterAgents() {
    if (!this._stores || !this._agents) return;

    const characterSheets = this._stores.get("characterSheets") || {};

    for (const [id, char] of Object.entries(characterSheets)) {
      if (char.isPresent) {
        this._state?.addCharacterAgent(id, {
          name: char.name,
          personality: char.personality,
          speechPatterns: char.speechPatterns,
        });
      }
    }
  },

  /**
   * Initialize topology
   */
  _initializeTopology() {
    if (!this._topology || !this._stores) return;

    const stores = this._stores.getAll();
    if (!stores) return;

    // Use topology sub-modules if available, with defensive checks
    try {
      // Index plot lines using storyTopology
      if (stores.plotLines && this._topology.storyTopology?.indexPlotLine) {
        for (const plotLine of stores.plotLines) {
          this._topology.storyTopology.indexPlotLine(this._topology, plotLine);
        }
        console.log(
          "[Pipeline Executor] Indexed",
          stores.plotLines.length,
          "plot lines",
        );
      }

      // Index characters using characterTopology
      if (
        stores.characterSheets &&
        this._topology.characterTopology?.indexCharacter
      ) {
        for (const character of Object.values(stores.characterSheets)) {
          this._topology.characterTopology.indexCharacter(
            this._topology,
            character,
          );
        }
        console.log(
          "[Pipeline Executor] Indexed",
          Object.keys(stores.characterSheets).length,
          "characters",
        );
      }

      // Index scenes using sceneTopology
      if (stores.scenes && this._topology.sceneTopology?.indexScene) {
        for (const scene of stores.scenes) {
          this._topology.sceneTopology.indexScene(this._topology, scene);
        }
        console.log(
          "[Pipeline Executor] Indexed",
          stores.scenes.length,
          "scenes",
        );
      }

      console.log("[Pipeline Executor] Topology initialized");
    } catch (e) {
      console.warn(
        "[Pipeline Executor] Topology initialization error (non-fatal):",
        e.message,
      );
    }
  },

  // ===== PHASE EXECUTION =====

  /**
   * Begin a phase in new architecture
   * @param {Object} phase - Phase definition
   */
  _beginPhase(phase) {
    if (this._core) {
      this._core.beginPhase(phase.id, phase);
    } else {
      if (this._contextManager) {
        this._contextManager.beginPhase(phase.id);
      }
      if (this._outputManager) {
        this._outputManager.beginPhase(phase.id);
      }
      if (this._threadManager) {
        this._threadManager.beginPhase(phase.id, phase);
      }
    }

    // Set up phase context if defined
    if (phase.context?.phase && this._contextManager) {
      for (const blockId of phase.context.phase) {
        this._contextManager.setPhase(
          blockId,
          null,
          blockId,
          `Phase context for ${phase.id}`,
        );
      }
    }

    // Add phase marker to main thread
    if (this._threadManager) {
      this._threadManager.addSystemMessage(
        this._threadManager.THREAD_TYPES.MAIN_PHASE,
        { phaseId: phase.id },
        `━━━ Phase: ${phase.name} ━━━`,
      );
    }

    // Also add to legacy threads for backward compatibility
    const threads = phase.threads?.team || phase.threads || [];
    for (const threadId of Array.isArray(threads) ? threads : []) {
      this._state?.addToThread(
        threadId,
        "system",
        "System",
        `━━━ Phase: ${phase.name} ━━━`,
        { isPhaseMarker: true, phaseId: phase.id },
      );
    }
  },

  /**
   * End a phase in new architecture
   * @param {Object} phase - Phase definition
   * @param {Object} result - Phase result
   */
  _endPhase(phase, result) {
    // Build global context updates from phase results
    const globalUpdates = this._extractGlobalUpdates(phase, result);

    if (this._core) {
      this._core.endPhase(phase.id, {
        globalContextUpdates: globalUpdates,
        preserveContext: false,
        preserveOutputs: true,
        preserveThreads: true,
      });
    } else {
      if (globalUpdates && this._contextManager) {
        this._contextManager.updateGlobalAfterPhase(phase.id, globalUpdates);
      }
      if (this._contextManager) {
        this._contextManager.endPhase(phase.id);
      }
      if (this._outputManager) {
        this._outputManager.endPhase(phase.id);
      }
      if (this._threadManager) {
        this._threadManager.endPhase(phase.id);
      }
    }
  },

  /**
   * Execute a single phase
   * @param {Object} phase - New format phase definition
   * @param {Object} originalPhase - Original phase definition
   * @param {boolean} useNewArchitecture - Whether to use new architecture
   * @returns {Object} Phase result
   */
  async _executePhase(phase, originalPhase, useNewArchitecture) {
    console.log(`[Pipeline Executor] Executing phase: ${phase.id}`);

    // Try custom handler first
    const handler = this.phaseHandlers[phase.id];
    if (handler) {
      return await handler.call(this, phase, originalPhase, useNewArchitecture);
    }

    // Fall back to generic execution
    return await this._executeGenericPhase(
      phase,
      originalPhase,
      useNewArchitecture,
    );
  },

  /**
   * Execute a generic phase
   * @param {Object} phase - Phase definition
   * @param {Object} originalPhase - Original phase definition
   * @param {boolean} useNewArchitecture - Whether to use new architecture
   * @returns {Object} Phase result
   */
  async _executeGenericPhase(phase, originalPhase, useNewArchitecture) {
    const agentIds = this._getPhaseAgents(phase);

    if (!agentIds || agentIds.length === 0) {
      return { skipped: true, reason: "No agents defined" };
    }

    const results = {};
    const isAsync = phase.execution?.async || originalPhase?.async || false;

    // Build context for agents
    const agentContext = useNewArchitecture
      ? this._buildAgentContextForPhase(phase)
      : this._buildLegacyPrompt(phase);

    if (isAsync) {
      // Execute agents in parallel
      const promises = agentIds.map(async (agentId) => {
        const prompt = this._buildAgentPrompt(phase, agentId, agentContext);
        const result = await this._executeAgent(
          agentId,
          prompt,
          phase,
          useNewArchitecture,
        );
        return { agentId, result };
      });

      const agentResults = await Promise.all(promises);
      for (const { agentId, result } of agentResults) {
        results[agentId] = result;
      }
    } else {
      // Execute agents sequentially
      for (const agentId of agentIds) {
        const prompt = this._buildAgentPrompt(phase, agentId, agentContext);
        results[agentId] = await this._executeAgent(
          agentId,
          prompt,
          phase,
          useNewArchitecture,
        );
      }
    }

    return results;
  },

  /**
   * Execute a single agent
   * @param {string} agentId - Agent identifier
   * @param {string} prompt - Agent prompt
   * @param {Object} phase - Phase definition
   * @param {boolean} useNewArchitecture - Whether to use new architecture
   * @returns {string} Agent response
   */
  async _executeAgent(agentId, prompt, phase, useNewArchitecture) {
    console.log(`[Pipeline Executor] Executing agent: ${agentId}`);

    let result;
    try {
      result = await this._agents?.executeAgent(agentId, prompt, { phase });
    } catch (e) {
      console.error(`[Pipeline Executor] Agent ${agentId} failed:`, e);
      result = `Agent execution failed: ${e.message}`;
    }

    // Post to threads
    const role = this._agents?.getAgentRole(agentId);
    const agentName = role?.name || agentId;
    const teamId = role?.team || null;

    if (useNewArchitecture && this._threadManager) {
      // Add to main phase thread
      this._threadManager.addToMainThread(
        agentId,
        agentName,
        result,
        {},
        phase.id,
      );

      // Add to team thread if applicable
      if (teamId) {
        this._threadManager.addToTeamThread(
          teamId,
          agentId,
          agentName,
          result,
          {},
          phase.id,
        );
      }
    }

    // Also add to legacy threads
    const threads =
      phase.threads?.team ||
      (Array.isArray(phase.threads) ? phase.threads : []);
    for (const threadId of threads) {
      this._state?.addToThread(threadId, agentId, agentName, result);
    }

    return result;
  },

  /**
   * Get agent IDs for a phase
   * @param {Object} phase - Phase definition
   * @returns {Array<string>}
   */
  _getPhaseAgents(phase) {
    // New format: agents is an object
    if (
      phase.agents &&
      typeof phase.agents === "object" &&
      !Array.isArray(phase.agents)
    ) {
      return Object.keys(phase.agents);
    }
    // Old format: agents is an array
    if (Array.isArray(phase.agents)) {
      return phase.agents;
    }
    return [];
  },

  /**
   * Build context for agents in a phase using new architecture
   * @param {Object} phase - Phase definition
   * @returns {Object}
   */
  _buildAgentContextForPhase(phase) {
    if (!this._contextManager) {
      return this._buildLegacyPrompt(phase);
    }

    // Get first agent to build context (team context will be the same)
    const agentIds = this._getPhaseAgents(phase);
    const firstAgent = agentIds[0];
    const role = this._agents?.getAgentRole(firstAgent);
    const teamId = role?.team || null;

    return this._contextManager.buildContextForAgent(
      firstAgent,
      teamId,
      phase.id,
      this._stores,
    );
  },

  /**
   * Build legacy prompt for a phase
   * @param {Object} phase - Phase definition
   * @returns {string}
   */
  _buildLegacyPrompt(phase) {
    const userInput = this._state?.pipeline?.userInput || "";
    const outline = this._state?.pipeline?.outline || "";
    const currentDraft =
      this._state?.pipeline?.drafts?.second ||
      this._state?.pipeline?.drafts?.first ||
      "";

    let prompt = `## Current Task\n${phase.description || phase.name}\n\n`;
    prompt += `## User Input\n${userInput}\n\n`;

    if (outline) {
      prompt += `## Story Outline\n${outline}\n\n`;
    }

    if (currentDraft) {
      prompt += `## Current Draft\n${currentDraft.substring(0, 2000)}...\n\n`;
    }

    return prompt;
  },

  /**
   * Build prompt for a specific agent
   * @param {Object} phase - Phase definition
   * @param {string} agentId - Agent identifier
   * @param {Object|string} context - Context object or string
   * @returns {string}
   */
  _buildAgentPrompt(phase, agentId, context) {
    const agentConfig = phase.agents?.[agentId] || {};
    const role = this._agents?.getAgentRole(agentId);

    let prompt = "";

    // Add initial prompt if defined
    if (agentConfig.initialPrompt) {
      prompt += agentConfig.initialPrompt + "\n\n";
    }

    // Add context
    if (typeof context === "string") {
      prompt += context;
    } else if (context && this._contextManager) {
      prompt += this._contextManager.formatContextForPrompt(context, {
        maxLength: 6000,
        includeHeaders: true,
      });
    }

    // Add role-specific instructions
    if (role) {
      prompt += `\n\n## Your Role\n${role.name}: ${role.role}\n`;
      if (role.responsibilities) {
        prompt += "Responsibilities:\n";
        for (const resp of role.responsibilities) {
          prompt += `- ${resp}\n`;
        }
      }
    }

    return prompt;
  },

  // ===== RAG INTEGRATION =====

  /**
   * Check if phase requires RAG
   * @param {Object} phase - Phase definition
   * @returns {boolean}
   */
  _phaseRequiresRAG(phase) {
    return phase.rag?.enabled === true;
  },

  /**
   * Execute RAG requests for a phase
   * @param {Object} phase - Phase definition
   * @param {Object} callbacks - RAG callbacks
   */
  async _executePhaseRAG(phase, callbacks = {}) {
    if (!this._phaseRequiresRAG(phase)) return;

    const { onRAGRequest, onRAGResponse } = callbacks;
    const ragConfig = phase.rag;

    console.log(`[Pipeline Executor] Executing RAG for phase: ${phase.id}`);

    // Build context manifest for Record Keepers
    const manifest =
      this._contextManager?.generateContextManifest(null, null, phase.id) || {};

    // Determine which agents to make RAG requests for
    const agentIds = ragConfig.targetAgents || this._getPhaseAgents(phase);
    const scope = ragConfig.scope || "team";

    // Group by team if team-scoped
    if (scope === "team") {
      const teamRequests = this._groupAgentsByTeam(agentIds);

      for (const [teamId, agents] of Object.entries(teamRequests)) {
        const request = this._buildRAGRequest(
          phase,
          teamId,
          agents,
          manifest,
          ragConfig,
        );

        if (onRAGRequest) {
          await onRAGRequest(request);
        }

        this._emit("rag:request", request);
        this._pendingRAGRequests.set(request.requestId, request);

        // Execute RAG via Record Keeper team
        const response = await this._executeRAGRequest(request);

        this._ragResponses.set(request.requestId, response);
        this._pendingRAGRequests.delete(request.requestId);

        if (onRAGResponse) {
          await onRAGResponse(response);
        }

        this._emit("rag:response", response);

        // Inject RAG response into phase context
        if (this._contextManager) {
          this._contextManager.setPhase(
            `rag_${teamId}`,
            response.content,
            `RAG Response for ${teamId}`,
            "Retrieved context from Record Keepers",
            phase.id,
            agents,
          );
        }
      }
    } else {
      // Agent-scoped RAG
      for (const agentId of agentIds) {
        const request = this._buildRAGRequest(
          phase,
          null,
          [agentId],
          manifest,
          ragConfig,
        );

        if (onRAGRequest) {
          await onRAGRequest(request);
        }

        this._emit("rag:request", request);

        const response = await this._executeRAGRequest(request);

        if (onRAGResponse) {
          await onRAGResponse(response);
        }

        this._emit("rag:response", response);

        // Inject into phase context for this agent only
        if (this._contextManager) {
          this._contextManager.setPhase(
            `rag_${agentId}`,
            response.content,
            `RAG Response for ${agentId}`,
            "Retrieved context from Record Keepers",
            phase.id,
            [agentId],
          );
        }
      }
    }
  },

  /**
   * Build a RAG request
   * @param {Object} phase - Phase definition
   * @param {string} teamId - Team identifier
   * @param {Array<string>} agentIds - Agent identifiers
   * @param {Object} manifest - Context manifest
   * @param {Object} ragConfig - RAG configuration
   * @returns {Object} RAG request
   */
  _buildRAGRequest(phase, teamId, agentIds, manifest, ragConfig) {
    const requestId = this._generateId();

    return {
      requestId,
      phaseId: phase.id,
      teamId,
      agentIds,
      scope: ragConfig.scope || "team",
      query:
        ragConfig.recordKeeperQuery ||
        `Provide relevant context for phase: ${phase.name}`,
      contextManifest: ragConfig.contextManifestIncluded ? manifest : null,
      maxTokens: ragConfig.maxTokens || 2000,
      priority: "normal",
      timestamp: Date.now(),
    };
  },

  /**
   * Execute a RAG request via Record Keeper team
   * @param {Object} request - RAG request
   * @returns {Object} RAG response
   */
  async _executeRAGRequest(request) {
    console.log(
      `[Pipeline Executor] Executing RAG request: ${request.requestId}`,
    );

    // Build prompt for Record Keeper
    const prompt = this._buildRecordKeeperPrompt(request);

    // Execute via archivist agent (primary Record Keeper)
    let content = "";
    try {
      content = await this._agents?.executeAgent("archivist", prompt, {
        phase: { id: request.phaseId },
        isRAGRequest: true,
      });
    } catch (e) {
      console.error("[Pipeline Executor] RAG request failed:", e);
      content = "RAG request failed: " + e.message;
    }

    return {
      requestId: request.requestId,
      respondingAgentId: "archivist",
      phaseId: request.phaseId,
      content,
      sources: [],
      tokenCount: Math.ceil(content.length / 4),
      timestamp: Date.now(),
    };
  },

  /**
   * Build prompt for Record Keeper RAG
   * @param {Object} request - RAG request
   * @returns {string}
   */
  _buildRecordKeeperPrompt(request) {
    let prompt = `## RAG Request\n${request.query}\n\n`;

    if (request.contextManifest) {
      prompt += `## Already Provided Context\n`;
      prompt += `The following context has already been provided to the requesting agents:\n`;
      prompt += JSON.stringify(
        request.contextManifest.alreadyProvided,
        null,
        2,
      );
      prompt += `\n\nDo NOT repeat information that is already provided. Focus on supplementary context.\n\n`;
    }

    prompt += `## Current Stores Summary\n`;
    prompt += JSON.stringify(this._stores?.getSummary() || {}, null, 2);
    prompt += `\n\n`;

    prompt += `Provide relevant, focused context that would help with this phase. Be concise.`;

    return prompt;
  },

  /**
   * Group agents by team
   * @param {Array<string>} agentIds - Agent identifiers
   * @returns {Object} Map of teamId to agent array
   */
  _groupAgentsByTeam(agentIds) {
    const teams = {};

    for (const agentId of agentIds) {
      const role = this._agents?.getAgentRole(agentId);
      const teamId = role?.team || "default";

      if (!teams[teamId]) {
        teams[teamId] = [];
      }
      teams[teamId].push(agentId);
    }

    return teams;
  },

  // ===== GAVEL HANDLING =====

  /**
   * Check if phase requires gavel
   * @param {Object} phase - New format phase
   * @param {Object} originalPhase - Original phase
   * @returns {boolean}
   */
  _phaseRequiresGavel(phase, originalPhase) {
    return phase.gavel?.required === true || originalPhase?.userGavel === true;
  },

  /**
   * Handle user gavel for a phase
   * @param {Object} phase - Phase definition
   * @param {Object} originalPhase - Original phase
   */
  async _handleGavel(phase, originalPhase) {
    const gavelPrompt =
      phase.gavel?.prompt || originalPhase?.gavelPrompt || "Review and edit:";
    const gavelContent = this._getGavelContent(phase.id);

    const editedContent = await this._state?.awaitGavel(
      phase.id,
      gavelPrompt,
      gavelContent,
    );

    this._applyGavelEdit(phase.id, editedContent);
  },

  /**
   * Get content for gavel based on phase
   * @param {string} phaseId - Phase identifier
   * @returns {string}
   */
  _getGavelContent(phaseId) {
    // Check output manager first
    if (this._outputManager) {
      const phaseOutput = this._outputManager.getPhaseOutput(phaseId);
      if (phaseOutput) return phaseOutput;
    }

    // Fall back to legacy state
    switch (phaseId) {
      case "understand_instructions":
        return (
          this._state?.pipeline?.phaseResults?.understand_instructions
            ?.interpretation || ""
        );
      case "outline_consensus":
        return this._state?.pipeline?.outline || "";
      case "first_draft":
        return this._state?.pipeline?.drafts?.first || "";
      case "second_draft":
        return this._state?.pipeline?.drafts?.second || "";
      case "final_draft":
        return this._state?.pipeline?.drafts?.final || "";
      default:
        return "";
    }
  },

  /**
   * Apply gavel edit to appropriate state
   * @param {string} phaseId - Phase identifier
   * @param {string} content - Edited content
   */
  _applyGavelEdit(phaseId, content) {
    if (!content) return;

    // Update output manager
    if (this._outputManager) {
      this._outputManager.setPhaseOutput(phaseId, content, "user_gavel", {
        overwrite: true,
      });
    }

    // Update legacy state
    switch (phaseId) {
      case "outline_consensus":
        this._state?.setOutline(content);
        if (this._outputManager) {
          this._outputManager.setFinalOutline(content, "user_gavel");
        }
        break;
      case "first_draft":
        this._state?.setDraft("first", content);
        if (this._outputManager) {
          this._outputManager.setFirstDraft(content, "user_gavel");
        }
        break;
      case "second_draft":
        this._state?.setDraft("second", content);
        if (this._outputManager) {
          this._outputManager.setSecondDraft(content, "user_gavel");
        }
        break;
      case "final_draft":
        this._state?.setDraft("final", content);
        if (this._outputManager) {
          this._outputManager.setFinalDraft(content, "user_gavel");
        }
        break;
    }
  },

  // ===== OUTPUT ROUTING =====

  /**
   * Route phase outputs to appropriate destinations
   * @param {Object} phase - Phase definition
   * @param {Object} result - Phase result
   */
  _routePhaseOutputs(phase, result) {
    if (!this._outputManager) return;

    // Extract main output from result
    const mainOutput = this._extractMainOutput(result);

    if (mainOutput) {
      // Route via output manager
      this._outputManager.routeOutput(
        phase,
        mainOutput,
        "phase_execution",
        null,
      );
    }

    // Handle specific phase outputs
    this._handleSpecificPhaseOutputs(phase.id, result);
  },

  /**
   * Extract main output from phase result
   * @param {Object} result - Phase result
   * @returns {string|null}
   */
  _extractMainOutput(result) {
    if (!result) return null;

    // If result is a string, return it
    if (typeof result === "string") return result;

    // Look for common output keys
    for (const key of ["output", "result", "content", "draft", "outline"]) {
      if (result[key] && typeof result[key] === "string") {
        return result[key];
      }
    }

    // Check for agent results
    const agentKeys = Object.keys(result).filter(
      (k) => !["skipped", "reason"].includes(k),
    );
    if (agentKeys.length === 1) {
      return result[agentKeys[0]];
    }

    return null;
  },

  /**
   * Handle specific phase output routing
   * @param {string} phaseId - Phase identifier
   * @param {Object} result - Phase result
   */
  _handleSpecificPhaseOutputs(phaseId, result) {
    if (!this._outputManager) return;

    switch (phaseId) {
      case "understand_instructions":
        if (result?.interpretation) {
          this._outputManager.setInstructions(result.interpretation, phaseId);
        }
        break;

      case "outline_draft":
        const outlineDraft = result?.outline || this._extractMainOutput(result);
        if (outlineDraft) {
          this._outputManager.setOutlineDraft(outlineDraft, phaseId);
        }
        break;

      case "outline_consensus":
        const finalOutline = this._state?.pipeline?.outline;
        if (finalOutline) {
          this._outputManager.setFinalOutline(finalOutline, phaseId);
        }
        break;

      case "first_draft":
        const firstDraft =
          result?.firstDraft || this._state?.pipeline?.drafts?.first;
        if (firstDraft) {
          this._outputManager.setFirstDraft(firstDraft, phaseId);
        }
        break;

      case "second_draft":
        const secondDraft =
          result?.secondDraft || this._state?.pipeline?.drafts?.second;
        if (secondDraft) {
          this._outputManager.setSecondDraft(secondDraft, phaseId);
        }
        break;

      case "final_draft":
        const finalDraft =
          result?.finalDraft || this._state?.pipeline?.drafts?.final;
        if (finalDraft) {
          this._outputManager.setFinalDraft(finalDraft, phaseId);
        }
        break;

      case "commentary":
        if (result) {
          this._outputManager.setCommentary(result, phaseId);
        }
        break;
    }
  },

  /**
   * Extract global context updates from phase results
   * @param {Object} phase - Phase definition
   * @param {Object} result - Phase result
   * @returns {Object}
   */
  _extractGlobalUpdates(phase, result) {
    const updates = {};

    // Update interpreted instructions
    if (phase.id === "understand_instructions" && result?.interpretation) {
      updates.interpreted_instructions = result.interpretation;
    }

    // Update outline
    if (phase.id === "outline_consensus") {
      const outline = this._state?.pipeline?.outline;
      if (outline) {
        updates.final_outline = outline;
      }
    }

    // Update current draft reference
    if (["first_draft", "second_draft", "final_draft"].includes(phase.id)) {
      const draftKey = phase.id.replace("_draft", "");
      const draft = this._state?.pipeline?.drafts?.[draftKey];
      if (draft) {
        updates[`${draftKey}_draft`] = draft.substring(0, 500) + "..."; // Summary only
        updates.latest_draft_phase = phase.id;
      }
    }

    return updates;
  },

  // ===== PHASE HANDLERS =====

  /**
   * Custom phase handlers
   * These provide specific logic for key phases
   */
  phaseHandlers: {
    // Placeholder for phase-specific handlers
    // The executor will fall back to generic execution for unlisted phases
    // Custom handlers can be added here or injected via configuration
  },

  // ===== UTILITY METHODS =====

  /**
   * Check if phase is critical (errors should abort pipeline)
   * @param {Object} phase - Phase definition
   * @returns {boolean}
   */
  _isCriticalPhase(phase) {
    const criticalPhases = [
      "curate_stores",
      "understand_instructions",
      "final_draft",
    ];
    return criticalPhases.includes(phase.id);
  },

  /**
   * Build pipeline result object
   * @param {boolean} success - Success status
   * @param {Error} error - Error if failed
   * @returns {Object}
   */
  _buildPipelineResult(success, error = null) {
    const finalDraft =
      this._outputManager?.getFinalDraft() ||
      this._state?.pipeline?.drafts?.final ||
      "";

    const outline =
      this._outputManager?.getFinalOutline() ||
      this._state?.pipeline?.outline ||
      "";

    return {
      success,
      finalDraft,
      outline,
      error: error?.message || null,
      phaseResults: Object.fromEntries(this._phaseResults),
      duration: Date.now() - this._startTime,
      phasesCompleted: this._currentPhaseIndex + 1,
      totalPhases: this._phases.length,
    };
  },

  /**
   * Generate unique ID
   * @returns {string}
   */
  _generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  },

  // ===== EVENT SYSTEM =====

  /**
   * Subscribe to executor events
   * @param {string} event - Event name
   * @param {Function} callback - Event handler
   * @returns {Function} Unsubscribe function
   */
  on(event, callback) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, []);
    }
    this._listeners.get(event).push(callback);
    return () => this.off(event, callback);
  },

  /**
   * Unsubscribe from executor events
   * @param {string} event - Event name
   * @param {Function} callback - Event handler
   */
  off(event, callback) {
    const listeners = this._listeners.get(event);
    if (listeners) {
      const idx = listeners.indexOf(callback);
      if (idx > -1) {
        listeners.splice(idx, 1);
      }
    }
  },

  /**
   * Emit an executor event
   * @param {string} event - Event name
   * @param {Object} data - Event data
   */
  _emit(event, data = {}) {
    const listeners = this._listeners.get(event);
    if (listeners) {
      for (const callback of listeners) {
        try {
          callback(data);
        } catch (e) {
          console.error(
            `[Pipeline Executor] Event handler error for ${event}:`,
            e,
          );
        }
      }
    }
  },

  // ===== PUBLIC ACCESSORS =====

  /**
   * Get phases (original format)
   * @returns {Array}
   */
  getPhases() {
    return this._phases;
  },

  /**
   * Get migrated phases (new format)
   * @returns {Array}
   */
  getMigratedPhases() {
    return this._migratedPhases;
  },

  /**
   * Get current phase
   * @returns {Object|null}
   */
  getCurrentPhase() {
    return this._currentPhase;
  },

  /**
   * Get current phase index
   * @returns {number}
   */
  getCurrentPhaseIndex() {
    return this._currentPhaseIndex;
  },

  /**
   * Check if pipeline is running
   * @returns {boolean}
   */
  isRunning() {
    return this._state?.pipeline?.isProcessing || false;
  },

  /**
   * Get pipeline progress
   * @returns {Object}
   */
  getProgress() {
    return {
      currentPhase: this._currentPhaseIndex,
      totalPhases: this._phases.length,
      percent:
        this._phases.length > 0
          ? Math.round(
              ((this._currentPhaseIndex + 1) / this._phases.length) * 100,
            )
          : 0,
      isRunning: this.isRunning(),
      currentPhaseName: this._currentPhase?.name || null,
    };
  },

  /**
   * Get summary of executor state
   * @returns {Object}
   */
  getSummary() {
    return {
      version: this.VERSION,
      isRunning: this.isRunning(),
      progress: this.getProgress(),
      phasesCount: this._phases.length,
      migratedPhasesCount: this._migratedPhases.length,
      pendingRAGRequests: this._pendingRAGRequests.size,
      completedRAGRequests: this._ragResponses.size,
      moduleStatus: {
        core: !!this._core,
        contextManager: !!this._contextManager,
        outputManager: !!this._outputManager,
        threadManager: !!this._threadManager,
        pipelineSchemas: !!this._pipelineSchemas,
        legacyModules: {
          config: !!this._config,
          state: !!this._state,
          stores: !!this._stores,
          context: !!this._context,
          agents: !!this._agents,
          generation: !!this._generation,
        },
      },
    };
  },
};

// Export for use in other modules
if (typeof window !== "undefined") {
  window.PipelineExecutor = PipelineExecutor;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = PipelineExecutor;
}
