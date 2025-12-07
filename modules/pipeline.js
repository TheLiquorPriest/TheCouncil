// modules/pipeline.js - Pipeline Orchestration System for The Council
// Manages the complete execution flow through all pipeline phases

const CouncilPipeline = {
  // ===== MODULE REFERENCES =====
  _config: null,
  _state: null,
  _context: null,
  _stores: null,
  _topology: null,
  _generation: null,
  _agents: null,

  // ===== PIPELINE STATE =====
  _phases: [],
  _currentPhaseIndex: -1,
  _aborted: false,

  // ===== INITIALIZATION =====

  /**
   * Initialize the pipeline module with references to other modules
   */
  init(modules = {}) {
    this._config =
      modules.config ||
      (typeof window !== "undefined" ? window.CouncilConfig : null);
    this._state =
      modules.state ||
      (typeof window !== "undefined" ? window.CouncilState : null);
    this._context =
      modules.context ||
      (typeof window !== "undefined" ? window.CouncilContext : null);
    this._stores =
      modules.stores ||
      (typeof window !== "undefined" ? window.CouncilStores : null);
    this._topology =
      modules.topology ||
      (typeof window !== "undefined" ? window.CouncilTopology : null);
    this._generation =
      modules.generation ||
      (typeof window !== "undefined" ? window.CouncilGeneration : null);
    this._agents =
      modules.agents ||
      (typeof window !== "undefined" ? window.CouncilAgents : null);

    // Load phases from config
    this._phases = this._config?.PIPELINE_PHASES || [];
    this._currentPhaseIndex = -1;
    this._aborted = false;

    console.log(
      "[Council Pipeline] Initialized with",
      this._phases.length,
      "phases",
    );
    return this;
  },

  // ===== MAIN PIPELINE EXECUTION =====

  /**
   * Run the complete pipeline
   */
  async run(userInput, options = {}) {
    console.log(
      "[Council Pipeline] run() called with input:",
      userInput?.substring(0, 50),
    );

    const {
      skipPhases = [],
      onPhaseStart = null,
      onPhaseComplete = null,
      onError = null,
    } = options;

    // Debug: Check module references
    console.log("[Council Pipeline] Module check:", {
      hasConfig: !!this._config,
      hasState: !!this._state,
      hasContext: !!this._context,
      hasStores: !!this._stores,
      hasAgents: !!this._agents,
      hasGeneration: !!this._generation,
      phasesCount: this._phases?.length || 0,
    });

    // Validate
    if (!userInput || !userInput.trim()) {
      console.error("[Council Pipeline] No user input provided");
      throw new Error("User input is required");
    }

    if (this._state?.pipeline?.isProcessing) {
      console.error("[Council Pipeline] Pipeline already running");
      throw new Error("Pipeline is already running");
    }

    this._aborted = false;

    // Initialize pipeline run
    console.log(
      "[Council Pipeline] Starting pipeline run with",
      this._phases?.length,
      "phases",
    );
    this._state?.startPipeline(userInput);

    // Load stores for this story FIRST (before context processing needs them)
    this.initializeStores();

    // Retrieve and process ST context (uses stores)
    await this.initializeContext(userInput);

    // Create dynamic character agents for present characters
    this.initializeCharacterAgents();

    // Initialize topology
    this.initializeTopology();

    try {
      // Execute each phase
      for (let i = 0; i < this._phases.length; i++) {
        if (this._aborted) {
          console.log("[Council Pipeline] Pipeline aborted");
          break;
        }

        const phase = this._phases[i];

        // Skip if requested
        if (skipPhases.includes(phase.id)) {
          console.log(`[Council Pipeline] Skipping phase: ${phase.id}`);
          continue;
        }

        this._currentPhaseIndex = i;
        this._state?.setPhase(i, phase);

        // Callback
        if (onPhaseStart) {
          await onPhaseStart(phase, i, this._phases.length);
        }

        console.log(
          `[Council Pipeline] Executing phase ${i + 1}/${this._phases.length}: ${phase.name}`,
        );

        // Execute the phase
        let phaseResult;
        try {
          phaseResult = await this.executePhase(phase);
          console.log(
            `[Council Pipeline] Phase ${phase.id} returned:`,
            typeof phaseResult,
          );
        } catch (phaseError) {
          console.error(
            `[Council Pipeline] Phase ${phase.id} threw error:`,
            phaseError,
          );
          throw phaseError;
        }

        // Store result
        this._state?.setPhaseResult(phase.id, phaseResult);

        // Handle user gavel if needed
        if (phase.userGavel) {
          const gavelContent = this.getGavelContent(phase.id);
          const editedContent = await this._state?.awaitGavel(
            phase.id,
            phase.gavelPrompt,
            gavelContent,
          );
          this.applyGavelEdit(phase.id, editedContent);
        }

        // Post phase result to relevant threads
        this.postPhaseResults(phase, phaseResult);

        // Callback
        if (onPhaseComplete) {
          await onPhaseComplete(phase, phaseResult, i, this._phases.length);
        }
      }

      // Save stores
      this._stores?.save();

      // Complete pipeline
      this._state?.completePipeline();

      // Return final draft
      const finalDraft = this._state?.pipeline?.drafts?.final || "";
      console.log(
        "[Council Pipeline] Pipeline complete. Final draft length:",
        finalDraft.length,
      );

      return {
        success: true,
        finalDraft: finalDraft,
        outline: this._state?.pipeline?.outline || "",
        phaseResults: this._state?.pipeline?.phaseResults || {},
      };
    } catch (error) {
      console.error("[Council Pipeline] Pipeline error:", error);
      this._state?.failPipeline(error.message);

      if (onError) {
        await onError(error);
      }

      return {
        success: false,
        error: error.message,
        phaseResults: this._state?.pipeline?.phaseResults || {},
      };
    }
  },

  /**
   * Abort the running pipeline
   */
  abort() {
    this._aborted = true;
    console.log("[Council Pipeline] Abort requested");
  },

  // ===== INITIALIZATION HELPERS =====

  /**
   * Initialize context from SillyTavern
   */
  async initializeContext(userInput) {
    if (!this._context) {
      console.warn("[Council Pipeline] Context module not available");
      return;
    }

    // Retrieve raw context from ST
    this._context.retrieveFromST();

    // Process into structured format
    this._context.process(this._stores);

    // Mark as loaded in state
    const tokenEstimates = this._context.getProcessed()?.tokenEstimates || {};
    this._state?.setContextLoaded(tokenEstimates.total || 0);
    this._state?.setContextProcessed();

    console.log(
      "[Council Pipeline] Context initialized:",
      this._context.getSummary(),
    );
  },

  /**
   * Initialize stores for the current story
   */
  initializeStores() {
    if (!this._stores) {
      console.warn("[Council Pipeline] Stores module not available");
      return;
    }

    // Get story ID from ST context - retrieve basic info first
    let storyId = "default";
    let characterName = null;
    let userName = null;
    let chatId = null;

    try {
      const context = SillyTavern.getContext();
      storyId = context.chatId || "default";
      characterName = context.name2;
      userName = context.name1;
      chatId = context.chatId;
    } catch (e) {
      console.warn(
        "[Council Pipeline] Could not get ST context for stores:",
        e,
      );
    }

    // Initialize stores
    this._stores.init(storyId);

    // Update story context in state
    this._state?.setStoryContext(storyId, characterName, userName, chatId);

    console.log("[Council Pipeline] Stores initialized for story:", storyId);
  },

  /**
   * Initialize dynamic character agents
   */
  initializeCharacterAgents() {
    if (!this._agents || !this._stores) {
      return;
    }

    const characterSheets = this._stores.get("characterSheets") || {};
    const createdAgents =
      this._agents.createAgentsForPresentCharacters(characterSheets);

    console.log(
      "[Council Pipeline] Created",
      createdAgents.length,
      "character agents",
    );
  },

  /**
   * Initialize topology module
   */
  initializeTopology() {
    if (!this._topology) {
      return;
    }

    this._topology.init();

    // Index existing stores data
    const stores = this._stores?.getAll();
    if (stores) {
      // Index plot lines
      for (const plot of stores.plotLines || []) {
        this._topology.storyTopology.indexPlotLine(this._topology, plot);
      }

      // Index scenes
      for (const scene of stores.scenes || []) {
        this._topology.sceneTopology.indexScene(this._topology, scene);
      }

      // Index characters
      for (const [id, char] of Object.entries(stores.characterSheets || {})) {
        this._topology.characterTopology.indexCharacter(this._topology, {
          id,
          ...char,
        });
      }

      // Index locations
      for (const [id, loc] of Object.entries(stores.locationSheets || {})) {
        this._topology.locationTopology.indexLocation(this._topology, {
          id,
          ...loc,
        });
      }
    }

    console.log(
      "[Council Pipeline] Topology initialized:",
      this._topology.getSummary(),
    );
  },

  // ===== PHASE EXECUTION =====

  /**
   * Execute a single phase
   */
  async executePhase(phase) {
    console.log(`[Council Pipeline] executePhase called for: ${phase.id}`);

    const { id, agents, threads, async: isAsync } = phase;

    // Add phase marker to threads
    for (const threadId of threads || []) {
      this._state?.addToThread(
        threadId,
        "system",
        "System",
        `━━━ Phase: ${phase.name} ━━━`,
        {
          isPhaseMarker: true,
          phaseId: id,
        },
      );
    }

    // Route to specific phase handler
    const handler = this.phaseHandlers[id];
    console.log(
      `[Council Pipeline] Looking for handler for phase: ${id}, found: ${!!handler}`,
    );

    if (handler) {
      console.log(`[Council Pipeline] Calling handler for phase: ${id}`);
      try {
        const result = await handler.call(this, phase);
        console.log(`[Council Pipeline] Handler for ${id} completed`);
        return result;
      } catch (handlerError) {
        console.error(
          `[Council Pipeline] Handler for ${id} failed:`,
          handlerError,
        );
        throw handlerError;
      }
    } else {
      console.warn(
        `[Council Pipeline] No handler for phase: ${id}, using generic`,
      );
      return await this.executeGenericPhase(phase);
    }
  },

  /**
   * Execute a generic phase (fallback)
   */
  async executeGenericPhase(phase) {
    const { agents, async: isAsync } = phase;

    if (!agents || agents.length === 0) {
      return { skipped: true, reason: "No agents defined" };
    }

    const prompt = this.buildPhasePrompt(phase);
    const results = await this._agents?.executePhaseAgents(phase, prompt);

    // Post results to threads
    for (const result of results || []) {
      if (result.success) {
        const role = this._agents?.getAgentRole(result.agentId);
        for (const threadId of phase.threads || []) {
          this._state?.addToThread(
            threadId,
            result.agentId,
            role?.name || result.agentId,
            result.result,
          );
        }
      }
    }

    return results;
  },

  // ===== PHASE HANDLERS =====

  phaseHandlers: {
    /**
     * Phase: Curate Persistent Stores
     */
    async curate_stores(phase) {
      console.log("[Council Pipeline] curate_stores phase starting");

      const userInput = this._state?.pipeline?.userInput || "";
      const recentChat =
        this._context?.getProcessed()?.formattedChat?.formatted || "";

      console.log(
        "[Council Pipeline] curate_stores - userInput length:",
        userInput.length,
      );

      const prompt = `Review the current story state and identify what needs to be recorded or updated.

## User's Current Input
${userInput}

## Recent Activity
${recentChat.substring(0, 2000)}

## Current Store Summary
${JSON.stringify(this._stores?.getSummary() || {}, null, 2)}

Identify:
1. Any new characters that appeared
2. Location changes
3. Plot developments
4. Items gained/lost
5. Significant dialogue to archive
6. Current situation updates

Be specific about what should be updated.`;

      console.log("[Council Pipeline] curate_stores - calling archivist agent");

      let archivistResult;
      try {
        archivistResult = await this._agents?.executeAgent(
          "archivist",
          prompt,
          { phase },
        );
        console.log(
          "[Council Pipeline] curate_stores - archivist returned:",
          archivistResult?.substring(0, 100),
        );
      } catch (agentError) {
        console.error(
          "[Council Pipeline] curate_stores - archivist failed:",
          agentError,
        );
        archivistResult = "Agent execution failed: " + agentError.message;
      }

      this._state?.addToThread(
        "recordkeeping",
        "archivist",
        "Archivist",
        archivistResult,
      );

      return { archivist: archivistResult };
    },

    /**
     * Phase: Preliminary Context
     */
    async preliminary_context(phase) {
      const userInput = this._state?.pipeline?.userInput || "";

      const prompt = `Based on this user input, what context do we need for a proper response?

## User Input
"${userInput}"

## Available Context Sources
- World Info: ${this._context?.getRaw()?.worldInfo?.length || 0} entries
- Chat History: ${this._context?.getRaw()?.chat?.length || 0} messages
- Character Card: ${this._context?.getRaw()?.characterCard?.name || "None"}
- Stored Data: Plot lines, scenes, characters, locations, etc.

## Current Situation
${JSON.stringify(this._stores?.getCurrentSituation() || {}, null, 2)}

Identify what context is relevant and should be retrieved.`;

      const results = [];

      // Archivist identifies stored data needs
      const archivistResult = await this._agents?.executeAgent(
        "archivist",
        prompt,
        { phase },
      );
      results.push({ agentId: "archivist", result: archivistResult });
      this._state?.addToThread(
        "main",
        "archivist",
        "Archivist",
        archivistResult,
      );

      // Scholar identifies world/lore needs
      const scholarResult = await this._agents?.executeAgent(
        "scholar",
        `${prompt}\n\nFocus on world lore and setting context needed.`,
        { phase },
      );
      results.push({ agentId: "scholar", result: scholarResult });
      this._state?.addToThread("main", "scholar", "Scholar", scholarResult);

      // Post context to context thread
      const worldInfo =
        this._context?.getProcessed()?.formattedWorldInfo?.formatted || "";
      const charCard =
        this._context?.getProcessed()?.formattedCharacter?.formatted || "";

      this._state?.addToThread(
        "context",
        "system",
        "System",
        `## World Info\n${worldInfo}`,
        { isContext: true },
      );
      this._state?.addToThread(
        "context",
        "system",
        "System",
        `## Character\n${charCard}`,
        { isContext: true },
      );

      return results;
    },

    /**
     * Phase: Understand User Instructions
     */
    async understand_instructions(phase) {
      const userInput = this._state?.pipeline?.userInput || "";
      const charName = this._context?.getRaw()?.characterName || "Character";

      const prompt = `Analyze and interpret the user's instructions.

## User Input
"${userInput}"

## Character
${charName}

## Current Story Situation
${JSON.stringify(this._stores?.getCurrentSituation() || {}, null, 2)}

## Active Plot Threads
${JSON.stringify(this._stores?.getActivePlotLines() || [], null, 2)}

Determine:
1. What is the user asking for?
2. What is their intent?
3. What should the response accomplish?
4. What constraints or requirements are implied?
5. What tone and style is appropriate?

Provide a clear interpretation of the user's request.`;

      // Publisher takes lead
      const publisherResult = await this._agents?.executeAgent(
        "publisher",
        prompt,
        { phase },
      );
      this._state?.addToThread(
        "main",
        "publisher",
        "Publisher",
        publisherResult,
      );
      this._state?.addToThread(
        "instructions",
        "publisher",
        "Publisher",
        publisherResult,
      );

      // Editor weighs in on prose considerations
      const editorResult = await this._agents?.executeAgent(
        "editor",
        `${prompt}\n\nFocus on prose style, tone, and narrative approach.`,
        { phase },
      );
      this._state?.addToThread(
        "instructions",
        "editor",
        "Editor",
        editorResult,
      );

      return {
        publisher: publisherResult,
        editor: editorResult,
        interpretation: publisherResult,
      };
    },

    /**
     * Phase: Secondary Context Pass
     */
    async secondary_context(phase) {
      const instructions =
        this._state?.getThreadSummary("instructions", 5) || "";

      const prompt = `Based on our interpretation of the user's request, is any additional context needed?

## Interpreted Instructions
${instructions}

## Already Retrieved Context
${this._state?.getThreadSummary("context", 10) || "See context thread"}

Is there anything else we should pull from:
- Specific world info entries
- Character relationships
- Past dialogue
- Location details
- Plot thread details

If yes, specify what. If no, confirm we have sufficient context.`;

      const archivistResult = await this._agents?.executeAgent(
        "archivist",
        prompt,
        { phase },
      );
      this._state?.addToThread(
        "main",
        "archivist",
        "Archivist",
        archivistResult,
      );

      return { archivist: archivistResult };
    },

    /**
     * Phase: Outline Draft
     */
    async outline_draft(phase) {
      const userInput = this._state?.pipeline?.userInput || "";
      const instructions =
        this._state?.getThreadSummary("instructions", 5) || "";
      const context = this._state?.getThreadSummary("context", 10) || "";

      const prompt = `Create an outline for the response.

## User Input
"${userInput}"

## Interpreted Instructions
${instructions}

## Relevant Context
${context}

## Active Plot Threads
${JSON.stringify(this._stores?.getActivePlotLines()?.slice(0, 5) || [], null, 2)}

Create a structured outline with:
1. Opening beat (hook/continuation)
2. Key story beats (2-4 beats)
3. Character moments to include
4. Closing beat (cliffhanger/resolution)

Include notes on tone, pacing, and any important details to incorporate.`;

      // Plot Architect leads
      const plotArchitectResult = await this._agents?.executeAgent(
        "plot_architect",
        prompt,
        { phase },
      );
      this._state?.addToThread(
        "plot",
        "plot_architect",
        "Plot Architect",
        plotArchitectResult,
      );
      this._state?.addToThread(
        "outline",
        "plot_architect",
        "Plot Architect",
        plotArchitectResult,
      );

      // Continuity specialist reviews
      const continuityResult = await this._agents?.executeAgent(
        "continuity",
        `Review this outline for continuity concerns:\n\n${plotArchitectResult}`,
        { phase },
      );
      this._state?.addToThread(
        "plot",
        "continuity",
        "Continuity Specialist",
        continuityResult,
      );

      // Store outline
      this._state?.setOutline(plotArchitectResult);

      return {
        outline: plotArchitectResult,
        continuity: continuityResult,
      };
    },

    /**
     * Phase: Outline Review
     */
    async outline_review(phase) {
      const outline = this._state?.pipeline?.outline || "";

      // Parallel reviews from World and Prose teams
      const reviewPrompt = `Review this story outline:\n\n${outline}\n\nProvide specific feedback.`;

      // These can run in parallel
      const reviews = await this._agents?.executeAgentsParallel([
        {
          agentId: "scholar",
          prompt: `${reviewPrompt}\n\nFocus on world consistency and lore accuracy.`,
          options: { phase },
        },
        {
          agentId: "editor",
          prompt: `${reviewPrompt}\n\nFocus on pacing, narrative flow, and prose potential.`,
          options: { phase },
        },
      ]);

      // Post results
      for (const review of reviews || []) {
        if (review.success) {
          const role = this._agents?.getAgentRole(review.agentId);
          const threadId = review.agentId === "scholar" ? "world" : "prose";
          this._state?.addToThread(
            threadId,
            review.agentId,
            role?.name,
            review.result,
          );
          this._state?.addToThread(
            "main",
            review.agentId,
            role?.name,
            review.result,
          );
        }
      }

      // Check if SMEs are needed
      const activatedSMEs =
        this._agents?.detectAndActivateSMEs(outline, 2) || [];
      if (activatedSMEs.length > 0) {
        console.log("[Council Pipeline] Activated SMEs:", activatedSMEs);
        this._state?.addToThread(
          "main",
          "system",
          "System",
          `Subject Matter Experts activated: ${activatedSMEs.join(", ")}`,
        );
      }

      return { reviews, activatedSMEs };
    },

    /**
     * Phase: Outline Consensus
     */
    async outline_consensus(phase) {
      const outline = this._state?.pipeline?.outline || "";
      const outlineThread = this._state?.getThreadSummary("outline", 10) || "";
      const mainThread = this._state?.getThreadSummary("main", 15) || "";

      const prompt = `Finalize the story outline based on team feedback.

## Current Outline
${outline}

## Feedback Received
${mainThread}

Incorporate valid feedback and produce the final outline.
Resolve any conflicts between suggestions.
The final outline should be clear and actionable for the Prose team.`;

      const plotArchitectResult = await this._agents?.executeAgent(
        "plot_architect",
        prompt,
        { phase },
      );

      // Update outline
      this._state?.setOutline(plotArchitectResult);
      this._state?.addToThread(
        "main",
        "plot_architect",
        "Plot Architect",
        `**Final Outline:**\n\n${plotArchitectResult}`,
      );
      this._state?.addToThread(
        "outline",
        "system",
        "System",
        plotArchitectResult,
        { isFinal: true },
      );

      return { finalOutline: plotArchitectResult };
    },

    /**
     * Phase: First Draft
     */
    async first_draft(phase) {
      const userInput = this._state?.pipeline?.userInput || "";
      const outline = this._state?.pipeline?.outline || "";
      const charCard =
        this._context?.getProcessed()?.formattedCharacter?.formatted || "";
      const recentChat =
        this._context
          ?.getProcessed()
          ?.formattedChat?.formatted?.substring(0, 2000) || "";

      const basePrompt = `Write a draft based on the outline.

## User Input
"${userInput}"

## Outline
${outline}

## Character
${charCard}

## Recent Context
${recentChat}

Write naturally and engagingly. Follow the outline's structure.`;

      // Get specialist drafts in parallel
      const specialistResults = await this._agents?.executeAgentsParallel([
        {
          agentId: "writer_scene",
          prompt: `${basePrompt}\n\nFocus on: Scene setting, atmosphere, sensory details.`,
          options: { phase },
        },
        {
          agentId: "writer_dialogue",
          prompt: `${basePrompt}\n\nFocus on: Character dialogue, conversation flow.`,
          options: { phase },
        },
        {
          agentId: "writer_action",
          prompt: `${basePrompt}\n\nFocus on: Action sequences, physical movement, pacing.`,
          options: { phase },
        },
        {
          agentId: "writer_character",
          prompt: `${basePrompt}\n\nFocus on: Internal thoughts, emotions, character moments.`,
          options: { phase },
        },
      ]);

      // Post specialist contributions to prose thread
      for (const result of specialistResults || []) {
        if (result.success) {
          const role = this._agents?.getAgentRole(result.agentId);
          this._state?.addToThread(
            "prose",
            result.agentId,
            role?.name,
            result.result,
          );
        }
      }

      // Editor synthesizes
      const contributions = (specialistResults || [])
        .filter((r) => r.success)
        .map(
          (r) =>
            `### ${this._agents?.getAgentRole(r.agentId)?.name}:\n${r.result}`,
        )
        .join("\n\n---\n\n");

      const synthesisPrompt = `Synthesize these specialist contributions into a cohesive first draft.

## Outline
${outline}

## Specialist Contributions
${contributions}

Create a unified, flowing narrative that incorporates the best elements from each specialist.
Maintain consistent voice and style throughout.`;

      console.log(
        "[Council Pipeline] first_draft - calling editor for synthesis",
      );

      let editorResult;
      try {
        editorResult = await this._agents?.executeAgent(
          "editor",
          synthesisPrompt,
          { phase },
        );
        console.log(
          "[Council Pipeline] first_draft - editor returned:",
          editorResult?.substring(0, 100),
        );
      } catch (editorError) {
        console.error(
          "[Council Pipeline] first_draft - editor failed:",
          editorError,
        );
        editorResult = "Editor synthesis failed: " + editorError.message;
      }

      // Store first draft
      this._state?.setDraft("first", editorResult);
      console.log(
        "[Council Pipeline] first_draft - draft stored, length:",
        editorResult?.length,
      );
      this._state?.addToThread(
        "prose",
        "editor",
        "Editor",
        `**Synthesized Draft:**\n\n${editorResult}`,
      );
      this._state?.addToThread(
        "drafting",
        "editor",
        "Editor",
        `**FIRST DRAFT:**\n\n${editorResult}`,
        {
          isDraft: true,
          version: 1,
        },
      );

      return {
        specialistContributions: specialistResults,
        firstDraft: editorResult,
      };
    },

    /**
     * Phase: First Draft Review
     */
    async first_draft_review(phase) {
      const draft = this._state?.pipeline?.drafts?.first || "";

      // Character and Environment review in parallel
      const reviews = await this._agents?.executeAgentsParallel([
        {
          agentId: "character_director",
          prompt: this._agents?.buildReviewPrompt(
            "character_director",
            draft,
            "character",
          ),
          options: { phase },
        },
        {
          agentId: "environment_director",
          prompt: this._agents?.buildReviewPrompt(
            "environment_director",
            draft,
            "world",
          ),
          options: { phase },
        },
      ]);

      // Add active SME reviews if any
      const smeIds = this._agents?.getActiveSMEIds() || [];
      if (smeIds.length > 0) {
        const smeReviews = await this._agents?.executeAgentsParallel(
          smeIds.map((smeId) => ({
            agentId: smeId,
            prompt: this._agents?.buildReviewPrompt(smeId, draft, "general"),
            options: { phase },
          })),
        );
        reviews.push(...(smeReviews || []));
      }

      // Post reviews
      for (const review of reviews || []) {
        if (review.success) {
          const role = this._agents?.getAgentRole(review.agentId);
          const threadId = role?.team || "main";
          this._state?.addToThread(
            threadId,
            review.agentId,
            role?.name,
            review.result,
          );
          this._state?.addToThread(
            "main",
            review.agentId,
            role?.name,
            review.result,
          );
        }
      }

      return { reviews };
    },

    /**
     * Phase: Second Draft
     */
    async second_draft(phase) {
      const firstDraft = this._state?.pipeline?.drafts?.first || "";
      const feedback = this._state?.getThreadSummary("main", 10) || "";

      const prompt = `Refine the first draft based on feedback.

## First Draft
${firstDraft}

## Feedback
${feedback}

Create an improved second draft that:
1. Addresses the feedback
2. Polishes prose quality
3. Strengthens weak areas
4. Maintains what works well`;

      const editorResult = await this._agents?.executeAgent("editor", prompt, {
        phase,
      });

      // Store second draft
      this._state?.setDraft("second", editorResult);
      this._state?.addToThread(
        "prose",
        "editor",
        "Editor",
        `**Refined Draft:**\n\n${editorResult}`,
      );
      this._state?.addToThread(
        "drafting",
        "editor",
        "Editor",
        `**SECOND DRAFT:**\n\n${editorResult}`,
        {
          isDraft: true,
          version: 2,
        },
      );

      return { secondDraft: editorResult };
    },

    /**
     * Phase: Second Draft Review
     */
    async second_draft_review(phase) {
      const draft = this._state?.pipeline?.drafts?.second || "";

      // Plot, World, and Publisher review
      const reviews = await this._agents?.executeAgentsParallel([
        {
          agentId: "plot_architect",
          prompt: this._agents?.buildReviewPrompt(
            "plot_architect",
            draft,
            "plot",
          ),
          options: { phase },
        },
        {
          agentId: "scholar",
          prompt: this._agents?.buildReviewPrompt("scholar", draft, "world"),
          options: { phase },
        },
        {
          agentId: "publisher",
          prompt: `Review this draft for overall quality and readiness:\n\n${draft}\n\nProvide final recommendations.`,
          options: { phase },
        },
      ]);

      // Post reviews
      for (const review of reviews || []) {
        if (review.success) {
          const role = this._agents?.getAgentRole(review.agentId);
          this._state?.addToThread(
            "main",
            review.agentId,
            role?.name,
            review.result,
          );
        }
      }

      return { reviews };
    },

    /**
     * Phase: Final Draft
     */
    async final_draft(phase) {
      const secondDraft = this._state?.pipeline?.drafts?.second || "";
      const feedback = this._state?.getThreadSummary("main", 10) || "";

      const prompt = `Create the final polished draft.

## Second Draft
${secondDraft}

## Final Feedback
${feedback}

This is the final pass. Ensure:
1. All feedback is addressed
2. Prose is polished and publication-ready
3. The response fully addresses the user's request
4. Voice and style are consistent
5. The ending is satisfying (or appropriately hooks for continuation)`;

      console.log(
        "[Council Pipeline] final_draft - calling editor for final polish",
      );

      let editorResult;
      try {
        editorResult = await this._agents?.executeAgent("editor", prompt, {
          phase,
        });
        console.log(
          "[Council Pipeline] final_draft - editor returned:",
          editorResult?.substring(0, 100),
        );
      } catch (editorError) {
        console.error(
          "[Council Pipeline] final_draft - editor failed:",
          editorError,
        );
        editorResult = "Final draft generation failed: " + editorError.message;
      }

      // Store final draft
      this._state?.setDraft("final", editorResult);
      console.log(
        "[Council Pipeline] final_draft - stored, length:",
        editorResult?.length,
      );
      this._state?.addToThread(
        "prose",
        "editor",
        "Editor",
        `**Final Polish:**\n\n${editorResult}`,
      );
      this._state?.addToThread(
        "drafting",
        "editor",
        "Editor",
        `**FINAL DRAFT:**\n\n${editorResult}`,
        {
          isDraft: true,
          version: 3,
          isFinal: true,
        },
      );

      return { finalDraft: editorResult };
    },

    /**
     * Phase: Team Commentary
     */
    async commentary(phase) {
      const finalDraft = this._state?.pipeline?.drafts?.final || "";
      const draftPreview = finalDraft.substring(0, 1000);

      // Get brief comments from team leads
      const commentPrompt = `The final draft is ready. Provide a brief (2-3 sentences) comment.

Draft preview:
${draftPreview}...

Note any final thoughts or observations for the record.`;

      const comments = await this._agents?.executeAgentsParallel([
        { agentId: "publisher", prompt: commentPrompt, options: { phase } },
        { agentId: "editor", prompt: commentPrompt, options: { phase } },
        {
          agentId: "plot_architect",
          prompt: commentPrompt,
          options: { phase },
        },
      ]);

      // Post comments
      const commentaryRecord = [];
      for (const comment of comments || []) {
        if (comment.success) {
          const role = this._agents?.getAgentRole(comment.agentId);
          this._state?.addToThread(
            "main",
            comment.agentId,
            role?.name,
            comment.result,
          );
          commentaryRecord.push({
            agent: comment.agentId,
            content: comment.result,
          });
        }
      }

      // Store commentary
      const currentCommentary = this._stores?.get("agentCommentary") || [];
      currentCommentary.push({
        timestamp: Date.now(),
        phase: "final",
        comments: commentaryRecord,
      });
      this._stores?.set("agentCommentary", currentCommentary);

      return { comments: commentaryRecord };
    },

    /**
     * Phase: Final Response
     */
    async final_response(phase) {
      console.log("[Council Pipeline] final_response phase starting");

      const finalDraft = this._state?.pipeline?.drafts?.final || "";
      console.log(
        "[Council Pipeline] final_response - draft length:",
        finalDraft.length,
      );

      // Post to final thread
      this._state?.addToThread("final", "system", "System", finalDraft, {
        isFinalResponse: true,
      });

      // Update stores
      this._stores?.set("storyDraft", finalDraft);

      // Add to session history
      const sessionHistory = this._stores?.get("sessionHistory") || [];
      sessionHistory.push({
        id: this._state?.generateId(),
        timestamp: Date.now(),
        userInput: this._state?.pipeline?.userInput,
        finalResponse: finalDraft,
        phasesCompleted: Object.keys(this._state?.pipeline?.phaseResults || {})
          .length,
        duration: Date.now() - (this._state?.pipeline?.startedAt || Date.now()),
      });
      this._stores?.set("sessionHistory", sessionHistory);

      return { finalDraft, posted: true };
    },
  },

  // ===== HELPER METHODS =====

  /**
   * Build a generic prompt for a phase
   */
  buildPhasePrompt(phase) {
    const userInput = this._state?.pipeline?.userInput || "";
    const outline = this._state?.pipeline?.outline || "";
    const currentDraft =
      this._state?.pipeline?.drafts?.second ||
      this._state?.pipeline?.drafts?.first ||
      "";

    return `Phase: ${phase.name}

## User Request
"${userInput}"

${outline ? `## Current Outline\n${outline}\n` : ""}
${currentDraft ? `## Current Draft\n${currentDraft.substring(0, 2000)}...\n` : ""}

Please fulfill your role for this phase.`;
  },

  /**
   * Get content for user gavel based on phase
   */
  getGavelContent(phaseId) {
    switch (phaseId) {
      case "understand_instructions":
        return this._state?.getThreadSummary("instructions", 10) || "";
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
   * Apply user's gavel edit to the appropriate state
   */
  applyGavelEdit(phaseId, content) {
    switch (phaseId) {
      case "outline_consensus":
        this._state?.setOutline(content);
        break;
      case "first_draft":
        this._state?.setDraft("first", content);
        break;
      case "second_draft":
        this._state?.setDraft("second", content);
        break;
      case "final_draft":
        this._state?.setDraft("final", content);
        break;
    }
  },

  /**
   * Post phase results to relevant threads
   */
  postPhaseResults(phase, results) {
    // Results are typically posted within phase handlers
    // This method handles any additional logging
    console.log(
      `[Council Pipeline] Phase ${phase.id} completed:`,
      typeof results === "object" ? Object.keys(results) : results,
    );
  },

  // ===== UTILITY METHODS =====

  /**
   * Get current phase
   */
  getCurrentPhase() {
    if (
      this._currentPhaseIndex >= 0 &&
      this._currentPhaseIndex < this._phases.length
    ) {
      return this._phases[this._currentPhaseIndex];
    }
    return null;
  },

  /**
   * Get pipeline progress
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
      isRunning: this._state?.pipeline?.isProcessing || false,
      currentPhaseName: this.getCurrentPhase()?.name || null,
    };
  },

  /**
   * Get all phases
   */
  getPhases() {
    return this._phases;
  },

  /**
   * Check if pipeline is running
   */
  isRunning() {
    return this._state?.pipeline?.isProcessing || false;
  },

  /**
   * Get final output
   */
  getFinalOutput() {
    return this._state?.pipeline?.drafts?.final || "";
  },

  /**
   * Get summary of pipeline run
   */
  getSummary() {
    return {
      isRunning: this.isRunning(),
      progress: this.getProgress(),
      phaseResults: Object.keys(this._state?.pipeline?.phaseResults || {}),
      hasFinalDraft: !!this._state?.pipeline?.drafts?.final,
      activeSMEs: this._agents?.getActiveSMEIds() || [],
      agentStats: this._state?.getAgentStats() || {},
    };
  },
};

// Export for use in other modules
if (typeof window !== "undefined") {
  window.CouncilPipeline = CouncilPipeline;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = CouncilPipeline;
}
