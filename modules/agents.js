// modules/agents.js - Agent Management System for The Council
// Handles agent definitions, prompt building, dynamic agents, and execution coordination

const CouncilAgents = {
  // ===== STATE =====
  _config: null, // Reference to CouncilConfig
  _state: null, // Reference to CouncilState
  _context: null, // Reference to CouncilContext
  _generation: null, // Reference to CouncilGeneration
  _stores: null, // Reference to CouncilStores

  _agentConfigs: {}, // Runtime agent configurations (from settings)
  _dynamicAgents: new Map(), // Dynamically created agents
  _activeSMEs: new Map(), // Active Subject Matter Experts

  // ===== INITIALIZATION =====

  /**
   * Initialize the agents module
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
    this._generation =
      modules.generation ||
      (typeof window !== "undefined" ? window.CouncilGeneration : null);
    this._stores =
      modules.stores ||
      (typeof window !== "undefined" ? window.CouncilStores : null);

    this._dynamicAgents.clear();
    this._activeSMEs.clear();

    console.log("[Council Agents] Initialized");
    return this;
  },

  /**
   * Load agent configurations from settings
   */
  loadConfigs(settingsAgents = {}) {
    this._agentConfigs = settingsAgents;
  },

  // ===== AGENT RETRIEVAL =====

  /**
   * Get agent role definition from config
   */
  getAgentRole(agentId) {
    // Check static agents
    if (this._config?.AGENT_ROLES?.[agentId]) {
      return this._config.AGENT_ROLES[agentId];
    }

    // Check dynamic character agents
    if (this._dynamicAgents.has(agentId)) {
      return this._dynamicAgents.get(agentId);
    }

    // Check active SMEs
    if (this._activeSMEs.has(agentId)) {
      return this._activeSMEs.get(agentId);
    }

    return null;
  },

  /**
   * Get agent runtime configuration (API settings, etc.)
   */
  getAgentConfig(agentId) {
    // Check for specific agent config
    if (this._agentConfigs[agentId]) {
      console.log(`[Council Agents] Found specific config for ${agentId}`);
      return this._agentConfigs[agentId];
    }

    // Return default config
    console.log(`[Council Agents] Using default config for ${agentId}`);
    return (
      this._config?.DEFAULT_AGENT_CONFIG || {
        enabled: true,
        useMainApi: true,
        useSTApi: true,
        apiEndpoint: "",
        apiKey: "",
        model: "",

        temperature: 0.7,

        maxTokens: 1000,

        systemPrompt: "",

        promptOrder: [],

        promptTokens: {},
      }
    );
  },

  /**
   * Get all agents for a team
   */
  getTeamAgents(teamId) {
    const agents = [];

    if (this._config?.AGENT_ROLES) {
      for (const [agentId, role] of Object.entries(this._config.AGENT_ROLES)) {
        if (role.team === teamId) {
          agents.push({ agentId, ...role });
        }
      }
    }

    return agents;
  },

  /**
   * Get team lead for a team
   */
  getTeamLead(teamId) {
    const teamAgents = this.getTeamAgents(teamId);
    return teamAgents.find((a) => a.isLead);
  },

  /**
   * Get all team leads
   */
  getAllTeamLeads() {
    const leads = [];

    if (this._config?.AGENT_ROLES) {
      for (const [agentId, role] of Object.entries(this._config.AGENT_ROLES)) {
        if (role.isLead) {
          leads.push({ agentId, ...role });
        }
      }
    }

    return leads;
  },

  /**
   * Check if an agent is enabled
   */
  isAgentEnabled(agentId) {
    const config = this.getAgentConfig(agentId);
    return config?.enabled !== false;
  },

  // ===== DYNAMIC CHARACTER AGENTS =====

  /**
   * Create a dynamic agent for a character
   */
  createCharacterAgent(character, type = "supporting") {
    const agentId = `character_${character.id || character.name.toLowerCase().replace(/\s+/g, "_")}`;

    const agentRole = {
      name: `${character.name}'s Voice`,
      team: "characters",
      role: `Represents ${character.name}'s perspective, voice, and character consistency`,
      responsibilities: [
        `Maintain ${character.name}'s unique voice and speech patterns`,
        `Ensure character-consistent reactions and decisions`,
        `Track emotional state and motivations`,
        `Provide character-specific feedback on scenes`,
      ],
      isLead: false,
      isDynamic: true,
      characterType: type,
      characterData: character,
      contextNeeds: [
        "character_sheets",
        "dialogue_history",
        "character_development",
        "current_situation",
      ],
    };

    this._dynamicAgents.set(agentId, agentRole);

    // Create a config for this agent
    this._agentConfigs[agentId] = {
      ...this.getAgentConfig("character_director"),
      systemPrompt: this.buildCharacterSystemPrompt(character),
    };

    // Register with state if available
    if (this._state) {
      this._state.addCharacterAgent(character.id || agentId, character);
    }

    console.log(`[Council Agents] Created character agent: ${agentId}`);
    return agentId;
  },

  /**
   * Build system prompt for a character agent
   */
  buildCharacterSystemPrompt(character) {
    const parts = [
      `You are an expert on the character "${character.name}".`,
      `Your role is to ensure this character is portrayed authentically and consistently.`,
    ];

    if (character.description) {
      parts.push(`\n## Character Description\n${character.description}`);
    }

    if (character.personality) {
      parts.push(`\n## Personality\n${character.personality}`);
    }

    if (character.speechPatterns) {
      parts.push(`\n## Speech Patterns\n${character.speechPatterns}`);
    }

    if (character.motivations) {
      parts.push(
        `\n## Motivations\n${Array.isArray(character.motivations) ? character.motivations.join(", ") : character.motivations}`,
      );
    }

    if (character.fears) {
      parts.push(
        `\n## Fears\n${Array.isArray(character.fears) ? character.fears.join(", ") : character.fears}`,
      );
    }

    parts.push(`\nWhen reviewing content, focus on:
- Does this sound like ${character.name}?
- Would ${character.name} react this way given their personality?
- Is the dialogue consistent with their speech patterns?
- Are their motivations and fears being respected?`);

    return parts.join("\n");
  },

  /**
   * Remove a dynamic character agent
   */
  removeCharacterAgent(agentId) {
    this._dynamicAgents.delete(agentId);
    delete this._agentConfigs[agentId];

    if (this._state) {
      this._state.removeCharacterAgent(agentId);
    }
  },

  /**
   * Create agents for all present characters
   */
  createAgentsForPresentCharacters(characterSheets) {
    const createdAgents = [];

    for (const [charId, character] of Object.entries(characterSheets)) {
      if (character.isPresent) {
        const agentId = this.createCharacterAgent(
          character,
          character.type || "supporting",
        );
        createdAgents.push(agentId);
      }
    }

    return createdAgents;
  },

  // ===== SUBJECT MATTER EXPERT (SME) AGENTS =====

  /**
   * Activate an SME agent
   */
  activateSME(smeId) {
    const smePool = this._config?.SME_POOL;
    if (!smePool || !smePool[smeId]) {
      console.warn(`[Council Agents] SME not found: ${smeId}`);
      return null;
    }

    const sme = smePool[smeId];

    const agentRole = {
      name: sme.name,
      team: "sme",
      role: sme.domain,
      responsibilities: [
        `Provide expert knowledge on ${sme.domain}`,
        `Identify issues within domain expertise`,
      ],
      isLead: false,
      isSME: true,
      smeId,
      contextNeeds: ["story_draft", "current_situation"],
    };

    this._activeSMEs.set(smeId, agentRole);

    // Create config
    this._agentConfigs[smeId] = {
      ...this.getAgentConfig("scholar"), // Base on scholar config
      systemPrompt: this.buildSMESystemPrompt(sme),
    };

    // Register with state
    if (this._state) {
      this._state.activateSME(smeId, sme);
    }

    console.log(`[Council Agents] Activated SME: ${smeId}`);
    return smeId;
  },

  /**
   * Build system prompt for an SME
   */
  buildSMESystemPrompt(sme) {
    return `You are a Subject Matter Expert specializing in: ${sme.domain}

Your role is to review content and identify any issues, inaccuracies, or areas that could benefit from your expertise.

Key areas of focus:
- Factual accuracy within your domain
- Realistic portrayal of ${sme.domain.toLowerCase()}
- Technical details that general writers might miss
- Consistency with real-world knowledge

Be concise and specific. Point out issues and suggest corrections.
Focus only on matters within your area of expertise.`;
  },

  /**
   * Deactivate an SME agent
   */
  deactivateSME(smeId) {
    this._activeSMEs.delete(smeId);
    delete this._agentConfigs[smeId];

    if (this._state) {
      this._state.deactivateSME(smeId);
    }
  },

  /**
   * Get all active SME IDs
   */
  getActiveSMEIds() {
    return Array.from(this._activeSMEs.keys());
  },

  /**
   * Detect and optionally activate needed SMEs based on content
   */
  detectAndActivateSMEs(content, maxSMEs = 2) {
    const smePool = this._config?.SME_POOL;
    if (!smePool) return [];

    const activated = [];
    const contentLower = content.toLowerCase();

    for (const [smeId, sme] of Object.entries(smePool)) {
      if (activated.length >= maxSMEs) break;
      if (this._activeSMEs.has(smeId)) continue;

      const keywords = sme.keywords || [];
      const matched = keywords.some((kw) =>
        contentLower.includes(kw.toLowerCase()),
      );

      if (matched) {
        this.activateSME(smeId);
        activated.push(smeId);
      }
    }

    return activated;
  },

  // ===== PROMPT BUILDING =====

  /**
   * Build a complete prompt for an agent
   */
  buildAgentPrompt(agentId, basePrompt, options = {}) {
    const {
      phase = null,
      includeContext = true,
      contextOverride = null,
      additionalInstructions = "",
      agentPromptOverrides = null,
    } = options;

    const role = this.getAgentRole(agentId);
    if (!role) {
      console.warn(`[Council Agents] Unknown agent: ${agentId}`);
      return { systemPrompt: "", prompt: basePrompt };
    }

    const config = this.getAgentConfig(agentId);
    const systemPrompt = this._buildSystemPrompt(agentId, phase, {
      agentPromptOverrides,
    });

    const parts = [];

    // Add system prompt first
    if (systemPrompt) {
      parts.push(systemPrompt);
    }

    // Add role header
    parts.push(`## Your Role: ${role.name}`);
    parts.push(role.role);

    // Add responsibilities
    if (role.responsibilities?.length > 0) {
      parts.push("\n### Responsibilities:");
      for (const resp of role.responsibilities) {
        parts.push(`- ${resp}`);
      }
    }

    // Add context if requested and available
    if (includeContext) {
      const contextContent =
        contextOverride || this.getAgentContext(agentId, role, phase);
      if (contextContent) {
        parts.push("\n---\n## Context");
        parts.push(contextContent);
      }
    }

    // Add phase-specific instructions
    if (phase) {
      const phaseInstructions = this.getPhaseInstructions(agentId, phase);
      if (phaseInstructions) {
        parts.push("\n---\n## Phase Instructions");
        parts.push(phaseInstructions);
      }
    }

    // Add additional instructions
    if (additionalInstructions) {
      parts.push("\n---\n## Additional Instructions");
      parts.push(additionalInstructions);
    }

    // Add the main task/prompt
    parts.push("\n---\n## Task");
    parts.push(basePrompt);

    return {
      systemPrompt: systemPrompt || config.systemPrompt,
      prompt: parts.join("\n"),
    };
  },

  _buildSystemPrompt(agentId, phase = null, options = {}) {
    const config = this.getAgentConfig(agentId);
    const overrideRaw =
      options.agentPromptOverrides?.[agentId] ||
      phase?.agentPromptOverrides?.[agentId];

    let basePrompt = "";
    let tokenSpec = [];

    // Structured overrides: { source: "preset"|"custom", presetName, customText, tokens: [{token,prefix,suffix}] }
    if (overrideRaw && typeof overrideRaw === "object") {
      const source = overrideRaw.source || "custom";
      if (source === "preset" && overrideRaw.presetName) {
        const saved = this._resolveSavedPrompt(overrideRaw.presetName);
        if (saved) basePrompt = saved;
      } else if (source === "custom") {
        basePrompt = overrideRaw.customText || "";
      }
      if (Array.isArray(overrideRaw.tokens)) {
        tokenSpec = overrideRaw.tokens.map((t) => ({
          token: t.token,
          prefix: t.prefix || "",
          suffix: t.suffix || "",
        }));
      }
    } else if (typeof overrideRaw === "string") {
      if (overrideRaw.startsWith("saved:")) {
        const name = overrideRaw.replace("saved:", "").trim();
        const saved = this._resolveSavedPrompt(name);
        if (saved) basePrompt = saved;
      } else {
        basePrompt = overrideRaw;
      }
    }

    // Fallback to agent config
    if (!basePrompt) {
      if (config.systemPromptSource === "st_saved" && config.systemPromptName) {
        const saved = this._resolveSavedPrompt(config.systemPromptName);
        if (saved) {
          basePrompt = saved;
        } else {
          basePrompt = config.systemPrompt || "";
          console.warn(
            `[Council Agents] Saved prompt not found: ${config.systemPromptName}`,
          );
        }
      } else {
        basePrompt = config.systemPrompt || "";
      }
    }

    // Build token list (override tokens > config tokens/order)
    if (!tokenSpec.length) {
      const promptTokens = config.promptTokens || {};
      const order =
        Array.isArray(config.promptOrder) && config.promptOrder.length
          ? config.promptOrder
          : ["persona", "character_card", "world_info", "chat_history"];
      tokenSpec = order.map((token) => ({
        token,
        prefix: (promptTokens[token] || {}).prefix || "",
        suffix: (promptTokens[token] || {}).suffix || "",
      }));
    }

    const tokenBlocks = tokenSpec
      .map(({ token, prefix, suffix }) => {
        const resolved = this._resolvePromptToken(token, phase);
        if (!resolved) return null;
        return [prefix, resolved, suffix].filter(Boolean).join("\n");
      })
      .filter(Boolean);

    return [basePrompt, ...tokenBlocks].filter(Boolean).join("\n\n");
  },

  _resolvePromptToken(token, phase = null) {
    try {
      switch (token) {
        case "chat_history":
          return (
            this._context?.getProcessed?.()?.chatHistory ||
            this._state?.getThreadSummary?.("main") ||
            "No chat history available."
          );
        case "world_info":
          return (
            this._context?.getProcessed?.()?.formattedWorldInfo?.formatted ||
            this._context?.getProcessed?.()?.formattedWorldInfo ||
            "No world info available."
          );
        case "character_card":
          return (
            this._context?.getProcessed?.()?.formattedCharacter ||
            "No character card available."
          );
        case "persona":
          return (
            window?.SillyTavern?.getContext?.()?.persona ||
            this._context?.getProcessed?.()?.persona ||
            "No persona available."
          );

        case "author_note": {
          const preset = this._resolveSavedPreset("author_note");
          if (preset) return preset;
          return (
            window?.SillyTavern?.getContext?.()?.authorsnote ||
            "No author note available."
          );
        }

        case "memory": {
          const preset = this._resolveSavedPreset("memory");
          if (preset) return preset;
          return (
            window?.SillyTavern?.getContext?.()?.memory ||
            "No memory available."
          );
        }

        case "lorebook": {
          const preset = this._resolveSavedPreset("lorebook");
          if (preset) return preset;
          return (
            window?.SillyTavern?.getContext?.()?.lorebook ||
            "No lorebook entries."
          );
        }

        case "bookmarks": {
          const preset = this._resolveSavedPreset("bookmarks");
          if (preset) return preset;
          return (
            window?.SillyTavern?.getContext?.()?.bookmarks ||
            "No bookmarks available."
          );
        }

        case "current_situation":
          return (
            this._stores?.getCurrentSituation?.() ||
            "No current situation available."
          );

        case "story_synopsis": {
          const preset = this._resolveSavedPreset("story_synopsis");
          if (preset) return preset;
          return (
            this._stores?.get?.("storySynopsis") ||
            "No story synopsis available."
          );
        }

        default:
          return `[[${token}: no data available]]`;
      }
    } catch (e) {
      console.warn("[Council Agents] Failed to resolve prompt token", token, e);

      return null;
    }
  },

  _resolveSavedPreset(name) {
    try {
      const ctx = window?.SillyTavern?.getContext?.();
      if (!ctx) return null;

      // Prefer ST preset manager
      const pm = ctx.getPresetManager?.();
      if (pm?.getCompletionPresetByName) {
        const preset = pm.getCompletionPresetByName(name);
        if (preset) return preset;
      }

      // Fallback to raw preset maps
      const presets =
        ctx?.chatCompletionPresets ||
        ctx?.api_presets ||
        ctx?.chatPresets ||
        ctx?.savedPrompts ||
        ctx?.prompts ||
        {};
      return presets[name] || null;
    } catch (e) {
      console.warn("[Council Agents] Failed to resolve saved preset:", name, e);
      return null;
    }
  },

  _resolveSavedPrompt(name) {
    try {
      const ctx = window?.SillyTavern?.getContext?.();
      if (!ctx) return null;

      // Prefer ST preset manager
      const pm = ctx.getPresetManager?.();
      if (pm?.getCompletionPresetByName) {
        const preset = pm.getCompletionPresetByName(name);
        // Many ST system prompts live under .content or .system
        if (preset?.content) return preset.content;
        if (preset?.system) return preset.system;
        if (typeof preset === "string") return preset;
      }

      // Fallback to raw maps if present
      const presets =
        ctx.chatCompletionPresets ||
        ctx.api_presets ||
        ctx.chatPresets ||
        ctx.savedPrompts ||
        ctx.prompts ||
        {};
      const candidate = presets[name];
      if (!candidate) return null;

      if (candidate.content) return candidate.content;
      if (candidate.system) return candidate.system;
      if (typeof candidate === "string") return candidate;

      return null;
    } catch (e) {
      console.warn("[Council Agents] Failed to resolve saved prompt:", name, e);
      return null;
    }
  },

  _resolveApiSettings(config) {
    if (!config?.useSTApi) return config;
    try {
      const ctx = window?.SillyTavern?.getContext?.();
      const apiEndpoint = ctx?.apiEndpoint || ctx?.api || config.apiEndpoint;
      const apiKey = ctx?.apiKey || config.apiKey;
      const model = config.model || ctx?.model || config.model;
      return {
        ...config,
        apiEndpoint,
        apiKey,
        model,
      };
    } catch (e) {
      console.warn(
        "[Council Agents] Failed to resolve ST API settings, using agent config",
        e,
      );
      return config;
    }
  },

  /**
   * Get context for an agent based on their needs
   */
  getAgentContext(agentId, role, phase) {
    if (!this._context || !role?.contextNeeds) {
      return null;
    }

    try {
      const contextData = this._context.getContextForAgent(
        agentId,
        role,
        phase,
        this._stores,
      );
      return contextData?.formatted || null;
    } catch (e) {
      console.error(
        `[Council Agents] Failed to get context for ${agentId}:`,
        e,
      );
      return null;
    }
  },

  /**
   * Get phase-specific instructions for an agent
   */
  getPhaseInstructions(agentId, phase) {
    const phaseInstructions = {
      // Record Keeping phase instructions
      curate_stores: {
        archivist:
          "Review the recent activity and identify what needs to be recorded or updated in our persistent stores.",
        story_topologist:
          "Analyze the story structure and update plot mappings.",
        lore_topologist: "Check for any new lore elements that need indexing.",
        character_topologist: "Update character data based on recent events.",
        scene_topologist: "Record scene details and transitions.",
        location_topologist: "Update location information and connections.",
      },

      // Context phases
      preliminary_context: {
        archivist: "Identify which stored data is relevant for this request.",
        scholar: "Determine what world/lore context is needed.",
        plot_architect: "Assess which plot threads are relevant.",
      },

      // Understanding phase
      understand_instructions: {
        publisher:
          "Analyze the user's request and determine the overall direction.",
        editor: "Consider what prose style and tone would be appropriate.",
        plot_architect: "Identify any plot implications in the request.",
        scholar: "Note any world-building or lore considerations.",
      },

      // Outline phases
      outline_draft: {
        plot_architect:
          "Create a structured outline with clear beats and progression.",
        macro_plot: "Ensure alignment with overarching story arcs.",
        micro_plot: "Detail scene-level beats and immediate developments.",
        continuity: "Flag any potential continuity concerns.",
      },

      outline_review: {
        scholar: "Review for world consistency and lore accuracy.",
        editor: "Evaluate pacing and narrative flow.",
      },

      // Draft phases
      first_draft: {
        editor: "Synthesize the team's work into a cohesive first draft.",
        writer_scene: "Focus on atmosphere, setting, and sensory details.",
        writer_dialogue: "Craft authentic character dialogue.",
        writer_action: "Handle action sequences and physical movement.",
        writer_character: "Convey internal thoughts and emotional beats.",
      },

      first_draft_review: {
        character_director: "Review character portrayals for authenticity.",
        environment_director: "Check setting and environment details.",
      },

      second_draft: {
        editor: "Refine based on feedback, focusing on polish.",
        writer_scene: "Enhance descriptive elements.",
        writer_dialogue: "Polish dialogue for naturalness.",
        writer_action: "Tighten action sequences.",
        writer_character: "Deepen emotional resonance.",
      },

      second_draft_review: {
        plot_architect: "Verify plot coherence and beat effectiveness.",
        scholar: "Final lore and world consistency check.",
        publisher: "Overall quality assessment.",
      },

      final_draft: {
        editor: "Final polish pass for publication quality.",
      },

      commentary: {
        publisher: "Provide brief final thoughts on the output.",
        archivist: "Record the session for future reference.",
      },
    };

    return phaseInstructions[phase?.id || phase]?.[agentId] || null;
  },

  /**
   * Build a consensus prompt for multiple agents
   */
  buildConsensusPrompt(topic, agentResponses, synthesizerId = "publisher") {
    const parts = [
      `## Consensus Required: ${topic}`,
      "",
      "The following agents have provided their input:",
      "",
    ];

    for (const { agentId, response } of agentResponses) {
      const role = this.getAgentRole(agentId);
      parts.push(`### ${role?.name || agentId}:`);
      parts.push(response);
      parts.push("");
    }

    parts.push("---");
    parts.push("");
    parts.push(
      "Please synthesize these perspectives into a coherent consensus.",
    );
    parts.push(
      "Identify points of agreement, resolve any conflicts, and produce a unified recommendation.",
    );

    return parts.join("\n");
  },

  /**
   * Build a review prompt
   */
  buildReviewPrompt(agentId, contentToReview, reviewType = "general") {
    const role = this.getAgentRole(agentId);

    const reviewInstructions = {
      general: "Review the following content and provide feedback.",
      prose: "Review the prose quality, style, voice, and readability.",
      plot: "Review for plot coherence, pacing, and narrative structure.",
      character:
        "Review character portrayal, voice consistency, and authenticity.",
      world:
        "Review for world consistency, lore accuracy, and setting details.",
      continuity:
        "Review for continuity issues, contradictions, or inconsistencies.",
    };

    return `## Review Task (${reviewType})

${reviewInstructions[reviewType] || reviewInstructions.general}

Focus on your area of expertise as ${role?.name || agentId}.

---

## Content to Review:

${contentToReview}

---

Provide specific, actionable feedback. Note both strengths and areas for improvement.`;
  },

  // ===== AGENT EXECUTION =====

  /**
   * Execute an agent (generate a response)
   */
  async executeAgent(agentId, prompt, options = {}) {
    console.log(`[Council Agents] executeAgent called for: ${agentId}`);

    const role = this.getAgentRole(agentId);
    const config = this.getAgentConfig(agentId);
    const apiConfig = this._resolveApiSettings(config);

    console.log(
      `[Council Agents] Agent ${agentId} - role found: ${!!role}, config found: ${!!config}`,
    );

    if (!role) {
      console.error(`[Council Agents] Unknown agent: ${agentId}`);
      throw new Error(`Unknown agent: ${agentId}`);
    }

    if (!this.isAgentEnabled(agentId)) {
      console.warn(`[Council Agents] Agent disabled: ${agentId}`);
      throw new Error(`Agent is disabled: ${agentId}`);
    }

    if (!this._generation) {
      console.error(`[Council Agents] Generation module not available`);
      throw new Error("Generation module not available");
    }

    // Build the full prompt
    console.log(
      `[Council Agents] Building prompt for ${agentId}, base prompt length: ${prompt?.length || 0}`,
    );
    const { systemPrompt, prompt: fullPrompt } = this.buildAgentPrompt(
      agentId,
      prompt,
      options,
    );
    console.log(
      `[Council Agents] Full prompt built for ${agentId}, length: ${fullPrompt?.length || 0}`,
    );

    // Generate
    console.log(`[Council Agents] Calling generation for ${agentId}...`);
    try {
      const response = await this._generation.generateForAgent(
        agentId,
        apiConfig,
        fullPrompt,
        {
          systemPrompt: systemPrompt || apiConfig.systemPrompt,
          ...options,
        },
      );
      console.log(
        `[Council Agents] Generation returned for ${agentId}, response length: ${response?.length || 0}`,
      );
      return response;
    } catch (genError) {
      console.error(
        `[Council Agents] Generation failed for ${agentId}:`,
        genError,
      );
      throw genError;
    }
  },

  /**
   * Execute multiple agents in parallel
   */
  async executeAgentsParallel(agentTasks) {
    if (!this._generation) {
      throw new Error("Generation module not available");
    }

    const tasks = agentTasks.map((task) => {
      const cfg = this._resolveApiSettings(this.getAgentConfig(task.agentId));
      const built = this.buildAgentPrompt(
        task.agentId,
        task.prompt,
        task.options || {},
      );
      return {
        agentId: task.agentId,
        agentConfig: cfg,
        prompt: built.prompt,
        options: {
          systemPrompt: built.systemPrompt || cfg.systemPrompt,
          ...(task.options || {}),
        },
      };
    });

    return this._generation.generateParallel(tasks);
  },

  /**
   * Execute a team (all agents in a team)
   */
  async executeTeam(teamId, prompt, options = {}) {
    const teamAgents = this.getTeamAgents(teamId);
    const enabledAgents = teamAgents.filter((a) =>
      this.isAgentEnabled(a.agentId),
    );

    if (enabledAgents.length === 0) {
      throw new Error(`No enabled agents in team: ${teamId}`);
    }

    const tasks = enabledAgents.map((agent) => ({
      agentId: agent.agentId,
      prompt,
      options,
    }));

    return this.executeAgentsParallel(tasks);
  },

  /**
   * Execute agents for a phase
   */
  async executePhaseAgents(phase, prompt, options = {}) {
    const phaseAgents = phase.agents || [];

    if (phaseAgents.length === 0) {
      return [];
    }

    // Add any active SMEs if the phase includes them
    const allAgents = [...phaseAgents];
    if (phase.includeSMEs && this._activeSMEs.size > 0) {
      allAgents.push(...this.getActiveSMEIds());
    }

    const tasks = allAgents
      .filter((agentId) => this.isAgentEnabled(agentId))
      .map((agentId) => ({
        agentId,
        prompt,
        options: { ...options, phase },
      }));

    if (phase.async) {
      return this.executeAgentsParallel(tasks);
    } else {
      // Execute sequentially
      const results = [];
      for (const task of tasks) {
        try {
          const result = await this.executeAgent(
            task.agentId,
            task.prompt,
            task.options,
          );
          results.push({ agentId: task.agentId, success: true, result });
        } catch (e) {
          results.push({
            agentId: task.agentId,
            success: false,
            error: e.message,
          });
        }
      }
      return results;
    }
  },

  // ===== UTILITY =====

  /**
   * Get summary of all agents
   */
  getSummary() {
    const staticAgents = Object.keys(this._config?.AGENT_ROLES || {}).length;
    const dynamicAgents = this._dynamicAgents.size;
    const activeSMEs = this._activeSMEs.size;

    return {
      staticAgents,
      dynamicAgents,
      activeSMEs,
      totalAgents: staticAgents + dynamicAgents + activeSMEs,
      teams: this.getTeamSummary(),
      smePool: Object.keys(this._config?.SME_POOL || {}).length,
    };
  },

  /**
   * Get team summary
   */
  getTeamSummary() {
    const teams = {};

    if (this._config?.AGENT_ROLES) {
      for (const role of Object.values(this._config.AGENT_ROLES)) {
        if (!teams[role.team]) {
          teams[role.team] = { count: 0, lead: null };
        }
        teams[role.team].count++;
        if (role.isLead) {
          teams[role.team].lead = role.name;
        }
      }
    }

    return teams;
  },

  /**
   * Clear all dynamic agents
   */
  clearDynamicAgents() {
    for (const agentId of this._dynamicAgents.keys()) {
      this.removeCharacterAgent(agentId);
    }

    for (const smeId of this._activeSMEs.keys()) {
      this.deactivateSME(smeId);
    }
  },
};

// Export for use in other modules
if (typeof window !== "undefined") {
  window.CouncilAgents = CouncilAgents;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = CouncilAgents;
}
