// modules/pipeline/schemas.js - Pipeline Definition Schemas for The Council
// Defines new phase definition structure with context routing, outputs, and RAG config

const PipelineSchemas = {
  // ===== VERSION =====
  VERSION: "1.0.0",

  // ===== CONTEXT BLOCK TYPES =====

  /**
   * Context block type definitions
   * These define how context flows through the pipeline
   */
  CONTEXT_BLOCK_TYPES: {
    STATIC: "static",       // Shared across all phases, never updates, read-only
    GLOBAL: "global",       // Shared across all phases, updates at end of phases
    PHASE: "phase",         // Single phase lifespan, scoped to participants
    TEAM: "team",           // Per-team scope, can update per phase
    PERSISTENT: "persistent" // Direct reference to persistent store objects
  },

  // ===== OUTPUT TYPES =====

  /**
   * Output type definitions
   */
  OUTPUT_TYPES: {
    PHASE: "phase_output",    // Per-phase output (max one per phase)
    TEAM: "team_output",      // Per-team output
    PERMANENT: "permanent"    // Permanent output blocks
  },

  /**
   * Permanent output block identifiers
   * These persist across the entire pipeline run
   */
  PERMANENT_OUTPUT_BLOCKS: {
    GLOBAL_CONTEXT: "global_context",
    INSTRUCTIONS: "instructions",
    OUTLINE_DRAFT: "outline_draft",
    FINAL_OUTLINE: "final_outline",
    FIRST_DRAFT: "first_draft",
    SECOND_DRAFT: "second_draft",
    FINAL_DRAFT: "final_draft",
    COMMENTARY: "commentary"
  },

  // ===== THREAD TYPES =====

  /**
   * Thread type definitions for the new architecture
   */
  THREAD_TYPES: {
    MAIN_PHASE: "main_phase",       // Main thread per phase (replaces single main thread)
    COLLABORATION: "collaboration",  // Per-phase collaboration threads
    TEAM: "team"                     // Per-team threads
  },

  // ===== RAG SCOPE =====

  /**
   * RAG request scope options
   */
  RAG_SCOPE: {
    TEAM: "team",     // RAG scoped to team
    AGENT: "agent",   // RAG scoped to individual agent
    PHASE: "phase"    // RAG scoped to entire phase
  },

  // ===== SCHEMA DEFINITIONS =====

  /**
   * Phase Definition Schema
   * The complete structure for defining a pipeline phase
   */
  PHASE_DEFINITION_SCHEMA: {
    // Core identification
    id: { type: "string", required: true, description: "Unique phase identifier" },
    name: { type: "string", required: true, description: "Human-readable phase name" },
    description: { type: "string", required: false, description: "Phase description" },

    // Thread configuration
    threads: {
      type: "object",
      required: true,
      schema: {
        main: {
          type: "object",
          schema: {
            enabled: { type: "boolean", default: true },
            initialPrompt: { type: "string", required: false }
          }
        },
        collaboration: {
          type: "array",
          items: { type: "string" },
          description: "List of collaboration thread IDs for this phase"
        },
        team: {
          type: "array",
          items: { type: "string" },
          description: "List of team thread IDs active in this phase"
        }
      }
    },

    // Agent configuration with initial prompts
    agents: {
      type: "object",
      required: true,
      description: "Map of agentId to agent configuration",
      valueSchema: {
        initialPrompt: { type: "string", required: false },
        ragScope: { type: "string", enum: ["team", "agent", null], default: null },
        contextOverrides: { type: "object", required: false }
      }
    },

    // Context routing configuration
    context: {
      type: "object",
      required: true,
      schema: {
        // What gets injected into this phase
        inject: {
          type: "array",
          items: { type: "string" },
          description: "Context keys to inject (from static/global/persistent)"
        },
        // Phase-scoped blocks to create
        phase: {
          type: "array",
          items: { type: "string" },
          description: "Phase context block IDs to create"
        },
        // Team-specific context
        team: {
          type: "object",
          description: "Map of teamId to array of context block IDs"
        },
        // Persistent store references to resolve
        persistent: {
          type: "array",
          items: { type: "string" },
          description: "Persistent store reference IDs to resolve"
        }
      }
    },

    // Output routing configuration
    outputs: {
      type: "object",
      required: false,
      schema: {
        phase: {
          type: "object",
          schema: {
            target: { type: "string", required: true },
            maxOne: { type: "boolean", default: true }
          }
        },
        team: {
          type: "object",
          description: "Map of teamId to output target"
        },
        permanent: {
          type: "string",
          enum: Object.values(this?.PERMANENT_OUTPUT_BLOCKS || {}),
          description: "Permanent output block to write to"
        }
      }
    },

    // RAG configuration for Record Keeper integration
    rag: {
      type: "object",
      required: false,
      schema: {
        enabled: { type: "boolean", default: false },
        async: { type: "boolean", default: true },
        scope: { type: "string", enum: ["team", "agent", "phase"], default: "team" },
        recordKeeperQuery: { type: "string", required: false },
        targetAgents: { type: "array", items: { type: "string" }, required: false },
        contextManifestIncluded: { type: "boolean", default: true }
      }
    },

    // Execution configuration
    execution: {
      type: "object",
      required: false,
      schema: {
        async: { type: "boolean", default: false },
        parallel: { type: "boolean", default: false },
        timeout: { type: "number", default: 300000 }, // 5 minutes default
        retryCount: { type: "number", default: 1 }
      }
    },

    // User gavel (approval) configuration
    gavel: {
      type: "object",
      required: false,
      schema: {
        required: { type: "boolean", default: false },
        prompt: { type: "string", required: false },
        editableFields: { type: "array", items: { type: "string" }, required: false }
      }
    },

    // Phase dependencies
    dependencies: {
      type: "array",
      items: { type: "string" },
      description: "Phase IDs that must complete before this phase"
    },

    // Conditional execution
    condition: {
      type: "function",
      description: "Function that returns boolean - whether to execute phase"
    }
  },

  /**
   * Agent Phase Configuration Schema
   * Detailed configuration for an agent within a phase
   */
  AGENT_PHASE_CONFIG_SCHEMA: {
    agentId: { type: "string", required: true },
    initialPrompt: { type: "string", required: false },
    ragScope: { type: "string", enum: ["team", "agent", null], default: null },
    contextOverrides: {
      type: "object",
      schema: {
        include: { type: "array", items: { type: "string" } },
        exclude: { type: "array", items: { type: "string" } },
        priority: { type: "array", items: { type: "string" } }
      }
    },
    outputTarget: { type: "string", required: false },
    role: { type: "string", required: false, description: "Role override for this phase" }
  },

  /**
   * Thread Configuration Schema
   */
  THREAD_CONFIG_SCHEMA: {
    id: { type: "string", required: true },
    type: { type: "string", enum: ["main_phase", "collaboration", "team"], required: true },
    name: { type: "string", required: true },
    icon: { type: "string", required: false },
    description: { type: "string", required: false },

    // For team threads
    teamId: { type: "string", required: false },

    // For phase threads
    phaseId: { type: "string", required: false },

    // Display options
    expanded: { type: "boolean", default: false },
    priority: { type: "number", default: 0 },

    // Participant filtering
    participantAgents: { type: "array", items: { type: "string" }, required: false },
    participantTeams: { type: "array", items: { type: "string" }, required: false }
  },

  /**
   * RAG Request Schema
   * Structure for Record Keeper RAG requests
   */
  RAG_REQUEST_SCHEMA: {
    requestId: { type: "string", required: true },
    requestingAgentId: { type: "string", required: true },
    requestingTeamId: { type: "string", required: false },
    phaseId: { type: "string", required: true },
    scope: { type: "string", enum: ["team", "agent", "phase"], required: true },
    query: { type: "string", required: true },
    contextManifest: { type: "object", required: false },
    maxTokens: { type: "number", default: 2000 },
    priority: { type: "string", enum: ["low", "normal", "high"], default: "normal" },
    timestamp: { type: "number", required: true }
  },

  /**
   * RAG Response Schema
   * Structure for Record Keeper RAG responses
   */
  RAG_RESPONSE_SCHEMA: {
    requestId: { type: "string", required: true },
    respondingAgentId: { type: "string", required: true },
    phaseId: { type: "string", required: true },
    content: { type: "string", required: true },
    sources: {
      type: "array",
      items: {
        type: "object",
        schema: {
          type: { type: "string" }, // "store", "context", "world_info", etc.
          key: { type: "string" },
          relevance: { type: "number" }
        }
      }
    },
    tokenCount: { type: "number", required: false },
    timestamp: { type: "number", required: true }
  },

  /**
   * Output Block Schema
   */
  OUTPUT_BLOCK_SCHEMA: {
    id: { type: "string", required: true },
    type: { type: "string", enum: ["phase_output", "team_output", "permanent"], required: true },
    name: { type: "string", required: true },
    content: { type: "any", required: true },
    metadata: {
      type: "object",
      schema: {
        createdAt: { type: "number" },
        updatedAt: { type: "number" },
        createdBy: { type: "string" }, // agentId or phaseId
        phaseId: { type: "string" },
        teamId: { type: "string" },
        version: { type: "number" }
      }
    }
  },

  /**
   * Pipeline Definition Schema
   * The complete pipeline structure
   */
  PIPELINE_DEFINITION_SCHEMA: {
    id: { type: "string", required: true },
    name: { type: "string", required: true },
    version: { type: "string", required: true },
    description: { type: "string", required: false },

    // Static context to initialize at pipeline start
    staticContext: {
      type: "object",
      description: "Map of contextId to initial static context data"
    },

    // Global context to initialize
    globalContext: {
      type: "object",
      description: "Map of contextId to initial global context data"
    },

    // Persistent store references to register
    persistentRefs: {
      type: "object",
      description: "Map of refId to { storeKey, path?, transform? }"
    },

    // Team definitions
    teams: {
      type: "object",
      description: "Map of teamId to team configuration"
    },

    // Phase definitions (ordered)
    phases: {
      type: "array",
      items: { type: "object", schema: "PHASE_DEFINITION_SCHEMA" },
      required: true
    },

    // Thread definitions
    threads: {
      type: "object",
      description: "Map of threadId to thread configuration"
    },

    // Output block definitions
    outputBlocks: {
      type: "object",
      description: "Map of outputId to output block configuration"
    }
  },

  // ===== DEFAULT CONFIGURATIONS =====

  /**
   * Default phase configuration
   */
  DEFAULT_PHASE_CONFIG: {
    threads: {
      main: { enabled: true },
      collaboration: [],
      team: []
    },
    agents: {},
    context: {
      inject: [],
      phase: [],
      team: {},
      persistent: []
    },
    outputs: {
      phase: null,
      team: {},
      permanent: null
    },
    rag: {
      enabled: false,
      async: true,
      scope: "team",
      contextManifestIncluded: true
    },
    execution: {
      async: false,
      parallel: false,
      timeout: 300000,
      retryCount: 1
    },
    gavel: {
      required: false
    },
    dependencies: [],
    condition: null
  },

  /**
   * Default agent phase configuration
   */
  DEFAULT_AGENT_PHASE_CONFIG: {
    initialPrompt: null,
    ragScope: null,
    contextOverrides: {
      include: [],
      exclude: [],
      priority: []
    },
    outputTarget: null,
    role: null
  },

  /**
   * Default RAG configuration
   */
  DEFAULT_RAG_CONFIG: {
    enabled: false,
    async: true,
    scope: "team",
    recordKeeperQuery: null,
    targetAgents: null,
    contextManifestIncluded: true
  },

  // ===== VALIDATION UTILITIES =====

  /**
   * Validate a phase definition against the schema
   * @param {Object} phase - Phase definition to validate
   * @returns {Object} { valid: boolean, errors: string[] }
   */
  validatePhaseDefinition(phase) {
    const errors = [];

    // Required fields
    if (!phase.id || typeof phase.id !== "string") {
      errors.push("Phase must have a string id");
    }
    if (!phase.name || typeof phase.name !== "string") {
      errors.push("Phase must have a string name");
    }

    // Validate threads
    if (phase.threads) {
      if (phase.threads.collaboration && !Array.isArray(phase.threads.collaboration)) {
        errors.push("threads.collaboration must be an array");
      }
      if (phase.threads.team && !Array.isArray(phase.threads.team)) {
        errors.push("threads.team must be an array");
      }
    }

    // Validate agents
    if (phase.agents) {
      if (typeof phase.agents !== "object") {
        errors.push("agents must be an object");
      } else {
        for (const [agentId, config] of Object.entries(phase.agents)) {
          if (config.ragScope && !["team", "agent", null].includes(config.ragScope)) {
            errors.push(`Agent ${agentId} has invalid ragScope`);
          }
        }
      }
    }

    // Validate context
    if (phase.context) {
      if (phase.context.inject && !Array.isArray(phase.context.inject)) {
        errors.push("context.inject must be an array");
      }
      if (phase.context.phase && !Array.isArray(phase.context.phase)) {
        errors.push("context.phase must be an array");
      }
      if (phase.context.team && typeof phase.context.team !== "object") {
        errors.push("context.team must be an object");
      }
    }

    // Validate RAG config
    if (phase.rag) {
      if (phase.rag.scope && !["team", "agent", "phase"].includes(phase.rag.scope)) {
        errors.push("rag.scope must be team, agent, or phase");
      }
    }

    // Validate gavel
    if (phase.gavel) {
      if (typeof phase.gavel.required !== "undefined" && typeof phase.gavel.required !== "boolean") {
        errors.push("gavel.required must be a boolean");
      }
    }

    // Validate dependencies
    if (phase.dependencies && !Array.isArray(phase.dependencies)) {
      errors.push("dependencies must be an array");
    }

    return {
      valid: errors.length === 0,
      errors
    };
  },

  /**
   * Validate a complete pipeline definition
   * @param {Object} pipeline - Pipeline definition to validate
   * @returns {Object} { valid: boolean, errors: string[], phaseErrors: Object }
   */
  validatePipelineDefinition(pipeline) {
    const errors = [];
    const phaseErrors = {};

    // Required fields
    if (!pipeline.id || typeof pipeline.id !== "string") {
      errors.push("Pipeline must have a string id");
    }
    if (!pipeline.name || typeof pipeline.name !== "string") {
      errors.push("Pipeline must have a string name");
    }
    if (!pipeline.version || typeof pipeline.version !== "string") {
      errors.push("Pipeline must have a string version");
    }

    // Validate phases
    if (!pipeline.phases || !Array.isArray(pipeline.phases)) {
      errors.push("Pipeline must have a phases array");
    } else {
      const phaseIds = new Set();
      for (let i = 0; i < pipeline.phases.length; i++) {
        const phase = pipeline.phases[i];
        const phaseValidation = this.validatePhaseDefinition(phase);

        if (!phaseValidation.valid) {
          phaseErrors[phase.id || `phase_${i}`] = phaseValidation.errors;
        }

        // Check for duplicate phase IDs
        if (phase.id) {
          if (phaseIds.has(phase.id)) {
            errors.push(`Duplicate phase id: ${phase.id}`);
          }
          phaseIds.add(phase.id);
        }

        // Validate dependencies reference existing phases
        if (phase.dependencies) {
          for (const dep of phase.dependencies) {
            if (!phaseIds.has(dep)) {
              errors.push(`Phase ${phase.id} depends on unknown phase: ${dep}`);
            }
          }
        }
      }
    }

    return {
      valid: errors.length === 0 && Object.keys(phaseErrors).length === 0,
      errors,
      phaseErrors
    };
  },

  /**
   * Validate a RAG request
   * @param {Object} request - RAG request to validate
   * @returns {Object} { valid: boolean, errors: string[] }
   */
  validateRAGRequest(request) {
    const errors = [];

    if (!request.requestId || typeof request.requestId !== "string") {
      errors.push("RAG request must have a string requestId");
    }
    if (!request.requestingAgentId || typeof request.requestingAgentId !== "string") {
      errors.push("RAG request must have a string requestingAgentId");
    }
    if (!request.phaseId || typeof request.phaseId !== "string") {
      errors.push("RAG request must have a string phaseId");
    }
    if (!request.scope || !["team", "agent", "phase"].includes(request.scope)) {
      errors.push("RAG request must have a valid scope (team, agent, phase)");
    }
    if (!request.query || typeof request.query !== "string") {
      errors.push("RAG request must have a string query");
    }

    return {
      valid: errors.length === 0,
      errors
    };
  },

  // ===== FACTORY METHODS =====

  /**
   * Create a new phase definition with defaults
   * @param {Object} config - Phase configuration overrides
   * @returns {Object} Complete phase definition
   */
  createPhaseDefinition(config) {
    const phase = {
      ...this.DEFAULT_PHASE_CONFIG,
      ...config,
      threads: {
        ...this.DEFAULT_PHASE_CONFIG.threads,
        ...(config.threads || {})
      },
      context: {
        ...this.DEFAULT_PHASE_CONFIG.context,
        ...(config.context || {})
      },
      outputs: {
        ...this.DEFAULT_PHASE_CONFIG.outputs,
        ...(config.outputs || {})
      },
      rag: {
        ...this.DEFAULT_PHASE_CONFIG.rag,
        ...(config.rag || {})
      },
      execution: {
        ...this.DEFAULT_PHASE_CONFIG.execution,
        ...(config.execution || {})
      },
      gavel: {
        ...this.DEFAULT_PHASE_CONFIG.gavel,
        ...(config.gavel || {})
      }
    };

    return phase;
  },

  /**
   * Create an agent phase configuration with defaults
   * @param {string} agentId - Agent identifier
   * @param {Object} config - Configuration overrides
   * @returns {Object} Complete agent phase configuration
   */
  createAgentPhaseConfig(agentId, config = {}) {
    return {
      agentId,
      ...this.DEFAULT_AGENT_PHASE_CONFIG,
      ...config,
      contextOverrides: {
        ...this.DEFAULT_AGENT_PHASE_CONFIG.contextOverrides,
        ...(config.contextOverrides || {})
      }
    };
  },

  /**
   * Create a RAG request
   * @param {Object} config - Request configuration
   * @returns {Object} Complete RAG request
   */
  createRAGRequest(config) {
    return {
      requestId: config.requestId || this._generateId(),
      requestingAgentId: config.requestingAgentId,
      requestingTeamId: config.requestingTeamId || null,
      phaseId: config.phaseId,
      scope: config.scope || "team",
      query: config.query,
      contextManifest: config.contextManifest || null,
      maxTokens: config.maxTokens || 2000,
      priority: config.priority || "normal",
      timestamp: Date.now()
    };
  },

  /**
   * Create an output block
   * @param {Object} config - Output block configuration
   * @returns {Object} Complete output block
   */
  createOutputBlock(config) {
    return {
      id: config.id || this._generateId(),
      type: config.type || "phase_output",
      name: config.name || config.id,
      content: config.content || null,
      metadata: {
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdBy: config.createdBy || null,
        phaseId: config.phaseId || null,
        teamId: config.teamId || null,
        version: 1
      }
    };
  },

  // ===== MIGRATION UTILITIES =====

  /**
   * Migrate old phase definition format to new format
   * @param {Object} oldPhase - Old format phase definition
   * @returns {Object} New format phase definition
   */
  migratePhaseDefinition(oldPhase) {
    // Map old format to new format
    const newPhase = this.createPhaseDefinition({
      id: oldPhase.id,
      name: oldPhase.name,
      description: oldPhase.description || "",

      // Convert old threads array to new structure
      threads: {
        main: { enabled: true },
        collaboration: [],
        team: oldPhase.threads || []
      },

      // Convert old agents array to new object format
      agents: this._migrateAgents(oldPhase.agents || []),

      // Convert old contextRequired to new format
      context: {
        inject: oldPhase.contextRequired || [],
        phase: [],
        team: {},
        persistent: []
      },

      // Set execution options based on old async flag
      execution: {
        async: oldPhase.async || false,
        parallel: false,
        timeout: 300000,
        retryCount: 1
      },

      // Convert old gavel settings
      gavel: {
        required: oldPhase.userGavel || false,
        prompt: oldPhase.gavelPrompt || null
      },

      // RAG disabled by default (needs explicit configuration)
      rag: {
        enabled: false
      }
    });

    return newPhase;
  },

  /**
   * Migrate old agents array to new agents object
   * @param {Array} oldAgents - Old format agents array
   * @returns {Object} New format agents object
   */
  _migrateAgents(oldAgents) {
    const newAgents = {};

    if (Array.isArray(oldAgents)) {
      for (const agentId of oldAgents) {
        newAgents[agentId] = this.createAgentPhaseConfig(agentId);
      }
    }

    return newAgents;
  },

  /**
   * Migrate entire old pipeline definition to new format
   * @param {Object} oldPipeline - Old format pipeline (from config.js)
   * @returns {Object} New format pipeline definition
   */
  migratePipelineDefinition(oldPipeline) {
    return {
      id: "council_pipeline_v2",
      name: "The Council Pipeline",
      version: "2.0.0",
      description: "Migrated pipeline definition",

      staticContext: {},
      globalContext: {},
      persistentRefs: {},
      teams: {},

      phases: (oldPipeline.PIPELINE_PHASES || []).map(phase =>
        this.migratePhaseDefinition(phase)
      ),

      threads: {},
      outputBlocks: {}
    };
  },

  // ===== UTILITY METHODS =====

  /**
   * Generate unique ID
   * @returns {string}
   */
  _generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  },

  /**
   * Deep merge two objects
   * @param {Object} target - Target object
   * @param {Object} source - Source object
   * @returns {Object} Merged object
   */
  _deepMerge(target, source) {
    const result = { ...target };

    for (const key of Object.keys(source)) {
      if (source[key] && typeof source[key] === "object" && !Array.isArray(source[key])) {
        result[key] = this._deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }

    return result;
  },

  /**
   * Get all agent IDs from a phase definition
   * @param {Object} phase - Phase definition
   * @returns {Array<string>} Agent IDs
   */
  getPhaseAgents(phase) {
    if (!phase.agents) return [];
    return Object.keys(phase.agents);
  },

  /**
   * Get all team IDs referenced in a phase
   * @param {Object} phase - Phase definition
   * @returns {Array<string>} Team IDs
   */
  getPhaseTeams(phase) {
    const teams = new Set();

    // From threads
    if (phase.threads?.team) {
      for (const teamId of phase.threads.team) {
        teams.add(teamId);
      }
    }

    // From context
    if (phase.context?.team) {
      for (const teamId of Object.keys(phase.context.team)) {
        teams.add(teamId);
      }
    }

    // From outputs
    if (phase.outputs?.team) {
      for (const teamId of Object.keys(phase.outputs.team)) {
        teams.add(teamId);
      }
    }

    return Array.from(teams);
  },

  /**
   * Check if phase requires RAG
   * @param {Object} phase - Phase definition
   * @returns {boolean}
   */
  phaseRequiresRAG(phase) {
    return phase.rag?.enabled === true;
  },

  /**
   * Check if phase requires user gavel
   * @param {Object} phase - Phase definition
   * @returns {boolean}
   */
  phaseRequiresGavel(phase) {
    return phase.gavel?.required === true;
  },

  /**
   * Get context injection list for a phase
   * @param {Object} phase - Phase definition
   * @returns {Array<string>} Context keys to inject
   */
  getPhaseContextInjections(phase) {
    const injections = [];

    if (phase.context?.inject) {
      injections.push(...phase.context.inject);
    }

    if (phase.context?.persistent) {
      injections.push(...phase.context.persistent);
    }

    return injections;
  }
};

// Export for use in other modules
if (typeof window !== "undefined") {
  window.PipelineSchemas = PipelineSchemas;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = PipelineSchemas;
}
