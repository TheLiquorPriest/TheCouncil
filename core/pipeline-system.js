/**
 * TheCouncil - Pipeline System
 *
 * Core module for managing response pipelines:
 * - Pipeline definitions (phases, actions)
 * - Pipeline execution and lifecycle management
 * - Phase/Action state tracking
 * - Execution flow control
 *
 * Lifecycle States:
 * - Phase: start -> before_actions -> in_progress -> after_actions -> end -> respond
 * - Action: called -> start -> in_progress -> complete -> respond
 *
 * @version 2.0.0
 */

const PipelineSystem = {
  // ===== VERSION =====
  VERSION: "2.0.0",

  // ===== LIFECYCLE CONSTANTS =====

  PhaseLifecycle: {
    START: "start",
    BEFORE_ACTIONS: "before_actions",
    IN_PROGRESS: "in_progress",
    AFTER_ACTIONS: "after_actions",
    END: "end",
    RESPOND: "respond",
  },

  ActionLifecycle: {
    CALLED: "called",
    START: "start",
    IN_PROGRESS: "in_progress",
    COMPLETE: "complete",
    RESPOND: "respond",
  },

  ExecutionMode: {
    SYNC: "sync",
    ASYNC: "async",
  },

  TriggerType: {
    SEQUENTIAL: "sequential",
    AWAIT: "await",
    ON: "on",
    IMMEDIATE: "immediate",
  },

  OrchestrationMode: {
    SEQUENTIAL: "sequential",
    PARALLEL: "parallel",
    ROUND_ROBIN: "round_robin",
    CONSENSUS: "consensus",
  },

  OutputConsolidation: {
    LAST_ACTION: "last_action",
    SYNTHESIZE: "synthesize",
    USER_GAVEL: "user_gavel",
    MERGE: "merge",
    DESIGNATED: "designated",
  },

  /**
   * Action types - defines what kind of action this is
   */
  ActionType: {
    /** Standard agent-based action with prompt and participants */
    STANDARD: "standard",
    /** Execute a CRUD pipeline from the Curation system */
    CRUD_PIPELINE: "crud_pipeline",
    /** Execute a RAG pipeline from the Curation system */
    RAG_PIPELINE: "rag_pipeline",
    /** Deliberative RAG - interactive conversation with Curation team */
    DELIBERATIVE_RAG: "deliberative_rag",
    /** User gavel/review point */
    USER_GAVEL: "user_gavel",
    /** System action (no LLM call) */
    SYSTEM: "system",
    /** Character workshop - dedicated character refinement action */
    CHARACTER_WORKSHOP: "character_workshop",
  },

  // ===== STATE =====

  /**
   * Registered pipelines
   * @type {Map<string, Object>}
   */
  _pipelines: new Map(),

  /**
   * Active pipeline run state
   * @type {Object|null}
   */
  _activeRun: null,

  /**
   * Run history
   * @type {Array<Object>}
   */
  _runHistory: [],

  /**
   * Maximum run history to keep
   * @type {number}
   */
  _maxRunHistory: 10,

  /**
   * Dependencies
   */
  _agentsSystem: null,
  _curationSystem: null,
  _characterSystem: null,
  _contextManager: null,
  _outputManager: null,
  _threadManager: null,
  _apiClient: null,
  _tokenResolver: null,
  _logger: null,

  /**
   * Event listeners
   * @type {Map<string, Function[]>}
   */
  _listeners: new Map(),

  /**
   * Initialization flag
   * @type {boolean}
   */
  _initialized: false,

  /**
   * Abort controller for current run
   * @type {AbortController|null}
   */
  _abortController: null,

  // ===== INITIALIZATION =====

  /**
   * Initialize the Pipeline System
   * @param {Object} options - Configuration options
   * @returns {PipelineSystem}
   */
  init(options = {}) {
    if (this._initialized) {
      this._log("warn", "PipelineSystem already initialized");
      return this;
    }

    this._log("info", "Initializing Pipeline System...");

    // Set dependencies
    this._logger = options.logger || null;
    this._agentsSystem = options.agentsSystem || null;
    this._curationSystem = options.curationSystem || null;
    this._characterSystem = options.characterSystem || null;
    this._contextManager = options.contextManager || null;
    this._outputManager = options.outputManager || null;
    this._threadManager = options.threadManager || null;
    this._apiClient = options.apiClient || null;
    this._tokenResolver = options.tokenResolver || null;

    // Clear state
    this.clear();

    // Register default pipeline if provided
    if (options.defaultPipeline) {
      this.registerPipeline(options.defaultPipeline);
    }

    this._initialized = true;
    this._log("info", "Pipeline System initialized");
    this._emit("system:initialized");

    return this;
  },

  /**
   * Check if system is initialized
   * @returns {boolean}
   */
  isInitialized() {
    return this._initialized;
  },

  /**
   * Clear all state
   */
  clear() {
    this._pipelines.clear();
    this._activeRun = null;
    this._runHistory = [];
    this._abortController = null;
  },

  // ===== PIPELINE MANAGEMENT =====

  /**
   * Register a pipeline
   * @param {Object} pipeline - Pipeline definition
   * @returns {Object} Normalized pipeline
   */
  registerPipeline(pipeline) {
    // Validate pipeline
    const validation = this._validatePipeline(pipeline);
    if (!validation.valid) {
      throw new Error(`Invalid pipeline: ${validation.errors.join(", ")}`);
    }

    const normalized = this._normalizePipeline(pipeline);
    this._pipelines.set(normalized.id, normalized);

    this._log(
      "info",
      `Pipeline registered: ${normalized.name} (${normalized.id})`,
    );
    this._emit("pipeline:registered", { pipeline: normalized });

    return normalized;
  },

  /**
   * Validate a pipeline configuration
   * @param {Object} pipeline - Pipeline to validate
   * @returns {Object} Validation result { valid: boolean, errors: string[], warnings: string[] }
   */
  _validatePipeline(pipeline) {
    const errors = [];
    const warnings = [];

    // Required fields
    if (!pipeline.id) {
      errors.push("Pipeline requires an id");
    } else if (typeof pipeline.id !== "string") {
      errors.push("Pipeline id must be a string");
    } else if (!/^[a-zA-Z0-9_-]+$/.test(pipeline.id)) {
      errors.push(
        "Pipeline id must contain only alphanumeric characters, underscores, and hyphens",
      );
    }

    if (!pipeline.name) {
      warnings.push("Pipeline should have a name (using id as fallback)");
    }

    // Phases validation
    if (pipeline.phases) {
      if (!Array.isArray(pipeline.phases)) {
        errors.push("Pipeline phases must be an array");
      } else {
        const phaseIds = new Set();
        pipeline.phases.forEach((phase, index) => {
          if (!phase.id) {
            errors.push(`Phase at index ${index} requires an id`);
          } else if (phaseIds.has(phase.id)) {
            errors.push(`Duplicate phase id: ${phase.id}`);
          } else {
            phaseIds.add(phase.id);
          }

          // Validate actions within phase
          if (phase.actions && Array.isArray(phase.actions)) {
            const actionIds = new Set();
            phase.actions.forEach((action, actionIndex) => {
              if (!action.id) {
                errors.push(
                  `Action at index ${actionIndex} in phase ${phase.id || index} requires an id`,
                );
              } else if (actionIds.has(action.id)) {
                errors.push(
                  `Duplicate action id in phase ${phase.id}: ${action.id}`,
                );
              } else {
                actionIds.add(action.id);
              }

              // Validate action type
              if (action.actionType) {
                const validTypes = Object.values(this.ActionType);
                if (!validTypes.includes(action.actionType)) {
                  warnings.push(
                    `Unknown action type "${action.actionType}" in action ${action.id}`,
                  );
                }
              }

              // Validate participants
              if (
                action.participants?.positionIds?.length === 0 &&
                action.participants?.teamIds?.length === 0 &&
                !action.participants?.characters?.enabled &&
                action.actionType !== this.ActionType.SYSTEM &&
                action.actionType !== this.ActionType.USER_GAVEL
              ) {
                warnings.push(
                  `Action ${action.id} has no participants configured`,
                );
              }
            });
          }
        });
      }
    } else {
      warnings.push("Pipeline has no phases defined");
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  },

  /**
   * Get a pipeline by ID
   * @param {string} pipelineId - Pipeline ID
   * @returns {Object|null} Pipeline or null
   */
  getPipeline(pipelineId) {
    return this._pipelines.get(pipelineId) || null;
  },

  /**
   * Get all pipelines
   * @returns {Object[]} Array of pipelines
   */
  getAllPipelines() {
    return Array.from(this._pipelines.values());
  },

  /**
   * Update a pipeline
   * @param {string} pipelineId - Pipeline ID
   * @param {Object} updates - Updates to apply
   * @returns {Object} Updated pipeline
   */
  updatePipeline(pipelineId, updates) {
    const pipeline = this._pipelines.get(pipelineId);
    if (!pipeline) {
      throw new Error(`Pipeline "${pipelineId}" not found`);
    }

    const updated = this._normalizePipeline({
      ...pipeline,
      ...updates,
      id: pipelineId, // Prevent ID change
      metadata: {
        ...pipeline.metadata,
        updatedAt: Date.now(),
      },
    });

    this._pipelines.set(pipelineId, updated);
    this._log("info", `Pipeline updated: ${updated.name}`);
    this._emit("pipeline:updated", { pipeline: updated });

    return updated;
  },

  /**
   * Delete a pipeline
   * @param {string} pipelineId - Pipeline ID
   * @returns {boolean} Success
   */
  deletePipeline(pipelineId) {
    if (!this._pipelines.has(pipelineId)) {
      return false;
    }

    this._pipelines.delete(pipelineId);
    this._log("info", `Pipeline deleted: ${pipelineId}`);
    this._emit("pipeline:deleted", { pipelineId });

    return true;
  },

  /**
   * Normalize a pipeline definition
   * @param {Object} pipeline - Raw pipeline
   * @returns {Object} Normalized pipeline
   */
  _normalizePipeline(pipeline) {
    return {
      id: pipeline.id,
      name: pipeline.name || pipeline.id,
      description: pipeline.description || "",
      version: pipeline.version || "1.0.0",
      staticContext: {
        includeCharacterCard:
          pipeline.staticContext?.includeCharacterCard !== false,
        includeWorldInfo: pipeline.staticContext?.includeWorldInfo !== false,
        includePersona: pipeline.staticContext?.includePersona !== false,
        includeScenario: pipeline.staticContext?.includeScenario !== false,
        custom: pipeline.staticContext?.custom || {},
      },
      globals: {
        instructions: pipeline.globals?.instructions || "",
        outlineDraft: pipeline.globals?.outlineDraft || "",
        finalOutline: pipeline.globals?.finalOutline || "",
        firstDraft: pipeline.globals?.firstDraft || "",
        secondDraft: pipeline.globals?.secondDraft || "",
        finalDraft: pipeline.globals?.finalDraft || "",
        commentary: pipeline.globals?.commentary || "",
        custom: pipeline.globals?.custom || {},
      },
      constants: pipeline.constants || {},
      phases: (pipeline.phases || []).map((p, i) => this._normalizePhase(p, i)),
      metadata: {
        createdAt: pipeline.metadata?.createdAt || Date.now(),
        updatedAt: pipeline.metadata?.updatedAt || Date.now(),
        author: pipeline.metadata?.author || "",
        tags: pipeline.metadata?.tags || [],
      },
    };
  },

  /**
   * Normalize a phase definition
   * @param {Object} phase - Raw phase
   * @param {number} index - Phase index
   * @returns {Object} Normalized phase
   */
  _normalizePhase(phase, index) {
    return {
      id: phase.id,
      name: phase.name || phase.id,
      description: phase.description || "",
      icon: phase.icon || "📋",
      teams: phase.teams || [],
      threads: {
        phaseThread: this._normalizeThreadConfig(phase.threads?.phaseThread),
        teamThreads: phase.threads?.teamThreads || {},
      },
      context: {
        static: phase.context?.static || [],
        global: phase.context?.global || [],
        phase: phase.context?.phase || [],
        team: phase.context?.team || [],
        stores: phase.context?.stores || [],
      },
      actions: (phase.actions || []).map((a, i) => this._normalizeAction(a, i)),
      output: {
        phaseOutput: this._normalizeOutputConfig(phase.output?.phaseOutput),
        teamOutputs: phase.output?.teamOutputs || {},
        consolidation: phase.output?.consolidation || "last_action",
        consolidationActionId: phase.output?.consolidationActionId || "",
      },
      gavel: {
        enabled: phase.gavel?.enabled || false,
        prompt: phase.gavel?.prompt || "Review and edit if needed:",
        editableFields: phase.gavel?.editableFields || ["output"],
        canSkip: phase.gavel?.canSkip !== false,
      },
      constants: phase.constants || {},
      variables: phase.variables || {},
      displayOrder: phase.displayOrder ?? index,
    };
  },

  /**
   * Normalize an action definition
   * @param {Object} action - Raw action
   * @param {number} index - Action index
   * @returns {Object} Normalized action
   */
  _normalizeAction(action, index) {
    // Determine action type
    const actionType = action.actionType || this.ActionType.STANDARD;

    const normalized = {
      id: action.id,
      name: action.name || action.id,
      description: action.description || "",
      actionType: actionType,
      execution: {
        mode: action.execution?.mode || "sync",
        trigger: {
          type: action.execution?.trigger?.type || "sequential",
          targetActionId: action.execution?.trigger?.targetActionId || "",
          targetState: action.execution?.trigger?.targetState || "complete",
        },
        timeout: action.execution?.timeout || 60000,
        retryCount: action.execution?.retryCount || 0,
      },
      participants: {
        positionIds: action.participants?.positionIds || [],
        teamIds: action.participants?.teamIds || [],
        orchestration: action.participants?.orchestration || "sequential",
        maxRounds: action.participants?.maxRounds || 3,
        // Character participation configuration
        characters: {
          enabled: action.participants?.characters?.enabled || false,
          // How to select characters: "dynamic" (Director picks), "explicit" (specific IDs), "spawned" (use currently spawned)
          mode: action.participants?.characters?.mode || "dynamic",
          // Explicit character IDs (when mode is "explicit")
          characterIds: action.participants?.characters?.characterIds || [],
          // Character types to include (when mode is "dynamic")
          characterTypes: action.participants?.characters?.characterTypes || [],
          // Include Character Director as orchestrator
          includeDirector:
            action.participants?.characters?.includeDirector || false,
          // Supplementary voicing guidance prompt
          voicingGuidance:
            action.participants?.characters?.voicingGuidance || "",
          // RAG configuration for character context
          ragContext: {
            enabled:
              action.participants?.characters?.ragContext?.enabled || false,
            pipelineId:
              action.participants?.characters?.ragContext?.pipelineId || "",
            queryTemplate:
              action.participants?.characters?.ragContext?.queryTemplate || "",
          },
        },
      },
      threads: {
        actionThread: this._normalizeThreadConfig(action.threads?.actionThread),
        teamTaskThreads: action.threads?.teamTaskThreads || {},
      },
      input: {
        source: action.input?.source || "phaseInput",
        sourceKey: action.input?.sourceKey || "",
        transform: action.input?.transform || "",
      },
      output: this._normalizeOutputConfig(action.output),
      contextOverrides: {
        include: action.contextOverrides?.include || [],
        exclude: action.contextOverrides?.exclude || [],
        priority: action.contextOverrides?.priority || [],
      },
      rag: {
        enabled: action.rag?.enabled || false,
        ragPipelineId: action.rag?.ragPipelineId || "",
        queryTemplate: action.rag?.queryTemplate || "",
        resultTarget: action.rag?.resultTarget || "context",
      },
      promptTemplate: action.promptTemplate || "",
      displayOrder: action.displayOrder ?? index,
    };

    // Add type-specific configuration
    if (actionType === this.ActionType.CRUD_PIPELINE) {
      normalized.crudConfig = {
        pipelineId: action.crudConfig?.pipelineId || "",
        operation: action.crudConfig?.operation || "create",
        storeId: action.crudConfig?.storeId || "",
        inputMapping: action.crudConfig?.inputMapping || {},
        outputMapping: action.crudConfig?.outputMapping || {},
      };
    }

    if (actionType === this.ActionType.RAG_PIPELINE) {
      normalized.ragConfig = {
        pipelineId: action.ragConfig?.pipelineId || "",
        querySource: action.ragConfig?.querySource || "input",
        queryTemplate: action.ragConfig?.queryTemplate || "{{input}}",
        resultTarget: action.ragConfig?.resultTarget || "context",
        maxResults: action.ragConfig?.maxResults || 5,
      };
    }

    if (actionType === this.ActionType.DELIBERATIVE_RAG) {
      normalized.deliberativeConfig = {
        // Participants who will query the curation team
        queryParticipants: action.deliberativeConfig?.queryParticipants || [],
        // Curation team positions that will respond
        curationPositions: action.deliberativeConfig?.curationPositions || [
          "archivist",
          "story_topologist",
          "lore_topologist",
          "character_topologist",
        ],
        // Maximum rounds of Q&A
        maxRounds: action.deliberativeConfig?.maxRounds || 3,
        // RAG pipelines available to curation team
        availableRAGPipelines:
          action.deliberativeConfig?.availableRAGPipelines || [],
        // Stores available for direct query
        availableStores: action.deliberativeConfig?.availableStores || [],
        // Thread for the deliberation
        deliberationThread: action.deliberativeConfig?.deliberationThread || {
          enabled: true,
          name: "Deliberative RAG",
        },
        // How to consolidate the retrieved information
        consolidation: action.deliberativeConfig?.consolidation || "synthesize",
        // Prompt for the curation team
        curationPrompt:
          action.deliberativeConfig?.curationPrompt ||
          "You are a member of the Record Keeping team with access to story data. Answer questions accurately based on stored information.",
      };
    }

    if (actionType === this.ActionType.USER_GAVEL) {
      normalized.gavelConfig = {
        prompt: action.gavelConfig?.prompt || "Review and edit if needed:",
        editableFields: action.gavelConfig?.editableFields || ["output"],
        canSkip: action.gavelConfig?.canSkip !== false,
        timeout: action.gavelConfig?.timeout || 0, // 0 = no timeout
      };
    }

    if (actionType === this.ActionType.CHARACTER_WORKSHOP) {
      normalized.characterWorkshopConfig = {
        // Workshop mode: "refinement" (refine voice), "consistency" (check consistency), "collaboration" (cross-team)
        mode: action.characterWorkshopConfig?.mode || "refinement",
        // Character IDs to workshop (empty = use spawned characters)
        characterIds: action.characterWorkshopConfig?.characterIds || [],
        // Include Character Director
        includeDirector:
          action.characterWorkshopConfig?.includeDirector !== false,
        // Editorial team positions to include for collaboration
        editorialPositions:
          action.characterWorkshopConfig?.editorialPositions || [],
        // RAG configuration for pulling character data
        ragConfig: {
          enabled: action.characterWorkshopConfig?.ragConfig?.enabled || true,
          pipelineId:
            action.characterWorkshopConfig?.ragConfig?.pipelineId || "",
          storeIds: action.characterWorkshopConfig?.ragConfig?.storeIds || [
            "characterSheets",
          ],
        },
        // Prompts for workshop
        prompts: {
          director:
            action.characterWorkshopConfig?.prompts?.director ||
            "As Character Director, guide this workshop to refine character voices and ensure consistency.",
          refinement:
            action.characterWorkshopConfig?.prompts?.refinement ||
            "Analyze and refine this character's voice, mannerisms, and speech patterns based on the provided context.",
          consistency:
            action.characterWorkshopConfig?.prompts?.consistency ||
            "Check this character's portrayal for consistency with established traits and history.",
        },
        // Output consolidation
        consolidation:
          action.characterWorkshopConfig?.consolidation || "synthesize",
        // Thread configuration
        workshopThread: {
          enabled:
            action.characterWorkshopConfig?.workshopThread?.enabled !== false,
          name:
            action.characterWorkshopConfig?.workshopThread?.name ||
            "Character Workshop",
        },
      };
    }

    return normalized;
  },

  /**
   * Normalize thread config
   * @param {Object} config - Raw config
   * @returns {Object} Normalized config
   */
  _normalizeThreadConfig(config) {
    return {
      enabled: config?.enabled !== false,
      firstMessage: config?.firstMessage || "",
      maxMessages: config?.maxMessages || 100,
    };
  },

  /**
   * Normalize output config
   * @param {Object} config - Raw config
   * @returns {Object} Normalized config
   */
  _normalizeOutputConfig(config) {
    return {
      target: config?.target || "phaseOutput",
      targetKey: config?.targetKey || "",
      append: config?.append || false,
    };
  },

  // ===== PHASE MANAGEMENT =====

  /**
   * Add a phase to a pipeline
   * @param {string} pipelineId - Pipeline ID
   * @param {Object} phase - Phase definition
   * @returns {Object} Updated pipeline
   */
  addPhase(pipelineId, phase) {
    const pipeline = this._pipelines.get(pipelineId);
    if (!pipeline) {
      throw new Error(`Pipeline "${pipelineId}" not found`);
    }

    const normalizedPhase = this._normalizePhase(phase, pipeline.phases.length);
    pipeline.phases.push(normalizedPhase);
    pipeline.metadata.updatedAt = Date.now();

    this._emit("phase:added", { pipelineId, phase: normalizedPhase });
    return pipeline;
  },

  /**
   * Update a phase in a pipeline
   * @param {string} pipelineId - Pipeline ID
   * @param {string} phaseId - Phase ID
   * @param {Object} updates - Updates to apply
   * @returns {Object} Updated phase
   */
  updatePhase(pipelineId, phaseId, updates) {
    const pipeline = this._pipelines.get(pipelineId);
    if (!pipeline) {
      throw new Error(`Pipeline "${pipelineId}" not found`);
    }

    const phaseIndex = pipeline.phases.findIndex((p) => p.id === phaseId);
    if (phaseIndex === -1) {
      throw new Error(
        `Phase "${phaseId}" not found in pipeline "${pipelineId}"`,
      );
    }

    const phase = pipeline.phases[phaseIndex];
    const updated = this._normalizePhase(
      { ...phase, ...updates, id: phaseId },
      phaseIndex,
    );

    pipeline.phases[phaseIndex] = updated;
    pipeline.metadata.updatedAt = Date.now();

    this._emit("phase:updated", { pipelineId, phase: updated });
    return updated;
  },

  /**
   * Remove a phase from a pipeline
   * @param {string} pipelineId - Pipeline ID
   * @param {string} phaseId - Phase ID
   * @returns {boolean} Success
   */
  removePhase(pipelineId, phaseId) {
    const pipeline = this._pipelines.get(pipelineId);
    if (!pipeline) {
      return false;
    }

    const phaseIndex = pipeline.phases.findIndex((p) => p.id === phaseId);
    if (phaseIndex === -1) {
      return false;
    }

    pipeline.phases.splice(phaseIndex, 1);
    pipeline.metadata.updatedAt = Date.now();

    this._emit("phase:removed", { pipelineId, phaseId });
    return true;
  },

  /**
   * Reorder phases in a pipeline
   * @param {string} pipelineId - Pipeline ID
   * @param {string[]} phaseIds - Ordered array of phase IDs
   * @returns {Object} Updated pipeline
   */
  reorderPhases(pipelineId, phaseIds) {
    const pipeline = this._pipelines.get(pipelineId);
    if (!pipeline) {
      throw new Error(`Pipeline "${pipelineId}" not found`);
    }

    const phaseMap = new Map(pipeline.phases.map((p) => [p.id, p]));
    const reordered = [];

    for (const id of phaseIds) {
      const phase = phaseMap.get(id);
      if (phase) {
        phase.displayOrder = reordered.length;
        reordered.push(phase);
      }
    }

    pipeline.phases = reordered;
    pipeline.metadata.updatedAt = Date.now();

    this._emit("phases:reordered", { pipelineId, phaseIds });
    return pipeline;
  },

  // ===== ACTION MANAGEMENT =====

  /**
   * Add an action to a phase
   * @param {string} pipelineId - Pipeline ID
   * @param {string} phaseId - Phase ID
   * @param {Object} action - Action definition
   * @returns {Object} Updated phase
   */
  addAction(pipelineId, phaseId, action) {
    const pipeline = this._pipelines.get(pipelineId);
    if (!pipeline) {
      throw new Error(`Pipeline "${pipelineId}" not found`);
    }

    const phase = pipeline.phases.find((p) => p.id === phaseId);
    if (!phase) {
      throw new Error(`Phase "${phaseId}" not found`);
    }

    const normalizedAction = this._normalizeAction(
      action,
      phase.actions.length,
    );
    phase.actions.push(normalizedAction);
    pipeline.metadata.updatedAt = Date.now();

    this._emit("action:added", {
      pipelineId,
      phaseId,
      action: normalizedAction,
    });
    return phase;
  },

  /**
   * Update an action in a phase
   * @param {string} pipelineId - Pipeline ID
   * @param {string} phaseId - Phase ID
   * @param {string} actionId - Action ID
   * @param {Object} updates - Updates to apply
   * @returns {Object} Updated action
   */
  updateAction(pipelineId, phaseId, actionId, updates) {
    const pipeline = this._pipelines.get(pipelineId);
    if (!pipeline) {
      throw new Error(`Pipeline "${pipelineId}" not found`);
    }

    const phase = pipeline.phases.find((p) => p.id === phaseId);
    if (!phase) {
      throw new Error(`Phase "${phaseId}" not found`);
    }

    const actionIndex = phase.actions.findIndex((a) => a.id === actionId);
    if (actionIndex === -1) {
      throw new Error(`Action "${actionId}" not found`);
    }

    const action = phase.actions[actionIndex];
    const updated = this._normalizeAction(
      { ...action, ...updates, id: actionId },
      actionIndex,
    );

    phase.actions[actionIndex] = updated;
    pipeline.metadata.updatedAt = Date.now();

    this._emit("action:updated", { pipelineId, phaseId, action: updated });
    return updated;
  },

  /**
   * Remove an action from a phase
   * @param {string} pipelineId - Pipeline ID
   * @param {string} phaseId - Phase ID
   * @param {string} actionId - Action ID
   * @returns {boolean} Success
   */
  removeAction(pipelineId, phaseId, actionId) {
    const pipeline = this._pipelines.get(pipelineId);
    if (!pipeline) {
      return false;
    }

    const phase = pipeline.phases.find((p) => p.id === phaseId);
    if (!phase) {
      return false;
    }

    const actionIndex = phase.actions.findIndex((a) => a.id === actionId);
    if (actionIndex === -1) {
      return false;
    }

    phase.actions.splice(actionIndex, 1);
    pipeline.metadata.updatedAt = Date.now();

    this._emit("action:removed", { pipelineId, phaseId, actionId });
    return true;
  },

  // ===== PIPELINE EXECUTION =====

  /**
   * Start a pipeline run
   * @param {string} pipelineId - Pipeline ID
   * @param {Object} input - User input and context
   * @returns {Promise<Object>} Run result
   */
  async startRun(pipelineId, input = {}) {
    if (this._activeRun) {
      throw new Error("A pipeline run is already in progress");
    }

    const pipeline = this._pipelines.get(pipelineId);
    if (!pipeline) {
      throw new Error(`Pipeline "${pipelineId}" not found`);
    }

    // Create abort controller
    this._abortController = new AbortController();

    // Initialize run state
    this._activeRun = this._createRunState(pipeline, input);

    this._log("info", `Starting pipeline run: ${pipeline.name}`);
    this._emit("run:started", { run: this._activeRun });

    try {
      // Execute all phases
      for (const phase of pipeline.phases) {
        // Check for abort
        if (this._abortController.signal.aborted) {
          throw new Error("Pipeline run aborted");
        }

        await this._executePhase(phase);
      }

      // Finalize run
      this._activeRun.status = "completed";
      this._activeRun.endedAt = Date.now();

      this._log("info", `Pipeline run completed: ${pipeline.name}`);
      this._emit("run:completed", { run: this._activeRun });

      // Store in history
      this._addToHistory(this._activeRun);

      const result = this._activeRun;
      this._activeRun = null;
      this._abortController = null;

      return result;
    } catch (error) {
      this._activeRun.status = "error";
      this._activeRun.error = error.message;
      this._activeRun.endedAt = Date.now();

      this._log("error", `Pipeline run failed: ${error.message}`);
      this._emit("run:error", { run: this._activeRun, error });

      this._addToHistory(this._activeRun);

      const result = this._activeRun;
      this._activeRun = null;
      this._abortController = null;

      throw error;
    }
  },

  /**
   * Abort the current pipeline run
   * @returns {boolean} Success
   */
  abortRun() {
    if (!this._activeRun || !this._abortController) {
      return false;
    }

    this._log("info", "Aborting pipeline run...");
    this._abortController.abort();
    this._emit("run:aborting", { run: this._activeRun });

    return true;
  },

  /**
   * Pause the current pipeline run
   * @returns {boolean} Success
   */
  pauseRun() {
    if (!this._activeRun || this._activeRun.status !== "running") {
      return false;
    }

    this._activeRun.status = "paused";
    this._log("info", "Pipeline run paused");
    this._emit("run:paused", { run: this._activeRun });

    return true;
  },

  /**
   * Resume a paused pipeline run
   * @returns {boolean} Success
   */
  resumeRun() {
    if (!this._activeRun || this._activeRun.status !== "paused") {
      return false;
    }

    this._activeRun.status = "running";
    this._log("info", "Pipeline run resumed");
    this._emit("run:resumed", { run: this._activeRun });

    return true;
  },

  /**
   * Create initial run state
   * @param {Object} pipeline - Pipeline definition
   * @param {Object} input - User input
   * @returns {Object} Run state
   */
  _createRunState(pipeline, input) {
    return {
      id: `run_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      pipelineId: pipeline.id,
      pipelineName: pipeline.name,
      status: "running",
      startedAt: Date.now(),
      endedAt: null,
      error: null,

      // Input
      userInput: input.userInput || "",
      context: input.context || {},

      // Globals (copy from pipeline defaults)
      globals: { ...pipeline.globals },

      // Phase states
      phases: {},

      // Current position
      currentPhaseId: null,
      currentPhaseIndex: -1,
      currentActionId: null,
      currentActionIndex: -1,

      // Output
      finalOutput: null,
    };
  },

  /**
   * Execute a single phase
   * @param {Object} phase - Phase definition
   * @returns {Promise<void>}
   */
  async _executePhase(phase) {
    this._log("debug", `Executing phase: ${phase.name}`);

    // Update current position
    this._activeRun.currentPhaseId = phase.id;
    this._activeRun.currentPhaseIndex++;

    // Initialize phase state
    const phaseState = {
      id: phase.id,
      name: phase.name,
      lifecycle: this.PhaseLifecycle.START,
      startedAt: Date.now(),
      endedAt: null,
      actions: {},
      input: null,
      output: null,
      variables: { ...phase.variables },
    };
    this._activeRun.phases[phase.id] = phaseState;

    this._emit("phase:lifecycle", {
      phaseId: phase.id,
      lifecycle: this.PhaseLifecycle.START,
    });

    try {
      // START lifecycle
      await this._onPhaseStart(phase, phaseState);

      // BEFORE_ACTIONS lifecycle
      phaseState.lifecycle = this.PhaseLifecycle.BEFORE_ACTIONS;
      this._emit("phase:lifecycle", {
        phaseId: phase.id,
        lifecycle: this.PhaseLifecycle.BEFORE_ACTIONS,
      });
      await this._onPhaseBeforeActions(phase, phaseState);

      // IN_PROGRESS - Execute actions
      phaseState.lifecycle = this.PhaseLifecycle.IN_PROGRESS;
      this._emit("phase:lifecycle", {
        phaseId: phase.id,
        lifecycle: this.PhaseLifecycle.IN_PROGRESS,
      });

      for (let i = 0; i < phase.actions.length; i++) {
        const action = phase.actions[i];

        // Check for abort
        if (this._abortController?.signal.aborted) {
          throw new Error("Pipeline run aborted");
        }

        // Wait for pause to be lifted
        while (this._activeRun?.status === "paused") {
          await this._sleep(100);
        }

        await this._executeAction(phase, action, phaseState, i);
      }

      // AFTER_ACTIONS lifecycle
      phaseState.lifecycle = this.PhaseLifecycle.AFTER_ACTIONS;
      this._emit("phase:lifecycle", {
        phaseId: phase.id,
        lifecycle: this.PhaseLifecycle.AFTER_ACTIONS,
      });
      await this._onPhaseAfterActions(phase, phaseState);

      // Handle output consolidation
      await this._consolidatePhaseOutput(phase, phaseState);

      // Handle gavel if enabled
      if (phase.gavel?.enabled) {
        phaseState.lifecycle = this.PhaseLifecycle.RESPOND;
        this._emit("phase:lifecycle", {
          phaseId: phase.id,
          lifecycle: this.PhaseLifecycle.RESPOND,
        });

        await this._handleGavel(phase, phaseState);
      }

      // END lifecycle
      phaseState.lifecycle = this.PhaseLifecycle.END;
      phaseState.endedAt = Date.now();
      this._emit("phase:lifecycle", {
        phaseId: phase.id,
        lifecycle: this.PhaseLifecycle.END,
      });
      await this._onPhaseEnd(phase, phaseState);
    } catch (error) {
      phaseState.error = error.message;
      phaseState.endedAt = Date.now();
      this._emit("phase:error", { phaseId: phase.id, error });
      throw error;
    }
  },

  /**
   * Execute a single action
   * @param {Object} phase - Phase definition
   * @param {Object} action - Action definition
   * @param {Object} phaseState - Phase state
   * @param {number} actionIndex - Action index
   * @returns {Promise<void>}
   */
  async _executeAction(phase, action, phaseState, actionIndex) {
    this._log("debug", `Executing action: ${action.name}`);

    // Update current position
    this._activeRun.currentActionId = action.id;
    this._activeRun.currentActionIndex = actionIndex;

    // Initialize action state
    const actionState = {
      id: action.id,
      name: action.name,
      lifecycle: this.ActionLifecycle.CALLED,
      startedAt: Date.now(),
      endedAt: null,
      input: null,
      output: null,
      responses: [],
      error: null,
    };
    phaseState.actions[action.id] = actionState;

    this._emit("action:lifecycle", {
      phaseId: phase.id,
      actionId: action.id,
      lifecycle: this.ActionLifecycle.CALLED,
    });

    // Retry configuration
    const maxRetries = action.execution?.retryCount || 0;
    let lastError = null;
    let attemptCount = 0;

    while (attemptCount <= maxRetries) {
      try {
        attemptCount++;

        if (attemptCount > 1) {
          this._log(
            "info",
            `Retrying action ${action.name} (attempt ${attemptCount}/${maxRetries + 1})`,
          );
          this._emit("action:retry", {
            phaseId: phase.id,
            actionId: action.id,
            attempt: attemptCount,
            maxRetries: maxRetries + 1,
            previousError: lastError?.message,
          });
          // Brief delay before retry
          await this._sleep(1000 * attemptCount);
        }

        // Handle async trigger if needed
        if (action.execution.mode === "async") {
          await this._waitForTrigger(action, phaseState);
        }

        // START lifecycle
        actionState.lifecycle = this.ActionLifecycle.START;
        this._emit("action:lifecycle", {
          phaseId: phase.id,
          actionId: action.id,
          lifecycle: this.ActionLifecycle.START,
        });

        // Resolve input
        actionState.input = await this._resolveActionInput(action, phaseState);

        // IN_PROGRESS lifecycle
        actionState.lifecycle = this.ActionLifecycle.IN_PROGRESS;
        this._emit("action:lifecycle", {
          phaseId: phase.id,
          actionId: action.id,
          lifecycle: this.ActionLifecycle.IN_PROGRESS,
        });

        // Execute based on action type with timeout wrapper
        let output;
        const actionType = action.actionType || this.ActionType.STANDARD;
        const timeout = action.execution?.timeout || 60000;

        output = await this._executeActionWithTimeout(
          action,
          actionType,
          actionState,
          phaseState,
          timeout,
        );

        // Store output
        actionState.output = output;

        // Route output
        await this._routeActionOutput(action, actionState, phaseState);

        // COMPLETE lifecycle
        actionState.lifecycle = this.ActionLifecycle.COMPLETE;
        actionState.endedAt = Date.now();
        actionState.attempts = attemptCount;
        this._emit("action:lifecycle", {
          phaseId: phase.id,
          actionId: action.id,
          lifecycle: this.ActionLifecycle.COMPLETE,
        });

        // Success - exit retry loop
        return;
      } catch (error) {
        lastError = error;

        // Check if this is an abort - don't retry aborts
        if (
          this._abortController?.signal?.aborted ||
          error.message === "Pipeline run aborted"
        ) {
          actionState.error = "Aborted";
          actionState.endedAt = Date.now();
          throw error;
        }

        // Log the error
        this._log(
          "warn",
          `Action ${action.name} failed (attempt ${attemptCount}): ${error.message}`,
        );

        // If we've exhausted retries, fail
        if (attemptCount > maxRetries) {
          actionState.error = error.message;
          actionState.errorDetails = {
            message: error.message,
            stack: error.stack,
            attempts: attemptCount,
            lastAttemptAt: Date.now(),
          };
          actionState.endedAt = Date.now();
          this._emit("action:error", {
            phaseId: phase.id,
            actionId: action.id,
            error,
            attempts: attemptCount,
          });
          throw error;
        }
      }
    }
  },

  /**
   * Execute action with timeout wrapper
   * @param {Object} action - Action definition
   * @param {string} actionType - Action type
   * @param {Object} actionState - Action state
   * @param {Object} phaseState - Phase state
   * @param {number} timeout - Timeout in ms
   * @returns {Promise<*>} Action output
   */
  async _executeActionWithTimeout(
    action,
    actionType,
    actionState,
    phaseState,
    timeout,
  ) {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(
          new Error(`Action "${action.name}" timed out after ${timeout}ms`),
        );
      }, timeout);
    });

    const executionPromise = this._executeActionByType(
      action,
      actionType,
      actionState,
      phaseState,
    );

    return Promise.race([executionPromise, timeoutPromise]);
  },

  /**
   * Execute action based on type
   * @param {Object} action - Action definition
   * @param {string} actionType - Action type
   * @param {Object} actionState - Action state
   * @param {Object} phaseState - Phase state
   * @returns {Promise<*>} Action output
   */
  async _executeActionByType(action, actionType, actionState, phaseState) {
    switch (actionType) {
      case this.ActionType.CRUD_PIPELINE:
        return this._executeCRUDAction(action, actionState, phaseState);

      case this.ActionType.RAG_PIPELINE:
        return this._executeRAGAction(action, actionState, phaseState);

      case this.ActionType.DELIBERATIVE_RAG:
        return this._executeDeliberativeRAGAction(
          action,
          actionState,
          phaseState,
        );

      case this.ActionType.USER_GAVEL:
        return this._executeUserGavelAction(action, actionState, phaseState);

      case this.ActionType.SYSTEM:
        return this._executeSystemAction(action, actionState, phaseState);

      case this.ActionType.CHARACTER_WORKSHOP:
        return this._executeCharacterWorkshopAction(
          action,
          actionState,
          phaseState,
        );

      case this.ActionType.STANDARD:
      default:
        // Standard action with optional RAG
        let ragResults = null;
        if (action.rag?.enabled && this._curationSystem) {
          ragResults = await this._executeActionRAG(action, actionState);
        }
        return this._executeActionParticipants(action, actionState, ragResults);
    }
  },

  /**
   * Wait for action trigger condition
   * @param {Object} action - Action definition
   * @param {Object} phaseState - Phase state
   * @returns {Promise<void>}
   */
  async _waitForTrigger(action, phaseState) {
    const trigger = action.execution.trigger;

    if (trigger.type === "immediate") {
      return; // No waiting
    }

    if (trigger.type === "sequential") {
      return; // Default sequential, already handled by loop
    }

    if (trigger.type === "await" || trigger.type === "on") {
      const targetActionId = trigger.targetActionId;
      const targetState = trigger.targetState;

      if (!targetActionId) return;

      // Wait for target action to reach state
      const maxWait = action.execution.timeout || 60000;
      const startTime = Date.now();

      while (Date.now() - startTime < maxWait) {
        const targetAction = phaseState.actions[targetActionId];
        if (
          targetAction &&
          this._hasReachedState(targetAction.lifecycle, targetState)
        ) {
          return;
        }
        await this._sleep(50);
      }

      throw new Error(
        `Timeout waiting for action "${targetActionId}" to reach "${targetState}"`,
      );
    }
  },

  /**
   * Check if an action has reached a lifecycle state
   * @param {string} current - Current lifecycle state
   * @param {string} target - Target lifecycle state
   * @returns {boolean}
   */
  _hasReachedState(current, target) {
    const order = ["called", "start", "in_progress", "complete", "respond"];
    const currentIdx = order.indexOf(current);
    const targetIdx = order.indexOf(target);
    return currentIdx >= targetIdx;
  },

  /**
   * Resolve action input based on configuration
   * @param {Object} action - Action definition
   * @param {Object} phaseState - Phase state
   * @returns {Promise<*>} Resolved input
   */
  async _resolveActionInput(action, phaseState) {
    const inputConfig = action.input;
    let input = null;

    switch (inputConfig.source) {
      case "phaseInput":
        input = phaseState.input;
        break;

      case "previousAction":
        const prevActionId = inputConfig.sourceKey;
        if (prevActionId && phaseState.actions[prevActionId]) {
          input = phaseState.actions[prevActionId].output;
        }
        break;

      case "global":
        const globalKey = inputConfig.sourceKey;
        if (globalKey && this._activeRun?.globals) {
          input = this._activeRun.globals[globalKey];
        }
        break;

      case "store":
        if (this._curationSystem && inputConfig.sourceKey) {
          input = this._curationSystem.read(inputConfig.sourceKey);
        }
        break;

      case "custom":
        input = inputConfig.sourceKey;
        break;

      default:
        input = phaseState.input || this._activeRun?.userInput;
    }

    // Apply transform if specified
    if (inputConfig.transform && this._tokenResolver) {
      input = await this._tokenResolver.resolve(inputConfig.transform, {
        input,
        phase: phaseState,
        run: this._activeRun,
      });
    }

    return input;
  },

  // ===== SPECIAL ACTION TYPE EXECUTORS =====

  /**
   * Execute a CRUD pipeline action
   * @param {Object} action - Action definition
   * @param {Object} actionState - Action state
   * @param {Object} phaseState - Phase state
   * @returns {Promise<string>} Output
   */
  async _executeCRUDAction(action, actionState, phaseState) {
    if (!this._curationSystem) {
      throw new Error("CurationSystem not available for CRUD action");
    }

    const config = action.crudConfig;
    if (!config?.pipelineId) {
      throw new Error("CRUD action requires crudConfig.pipelineId");
    }

    this._log("debug", `Executing CRUD pipeline: ${config.pipelineId}`);

    // Map input to CRUD pipeline input
    const input = this._mapActionInput(actionState.input, config.inputMapping);

    // Get the CRUD pipeline
    const pipeline = this._curationSystem.getCRUDPipeline(config.pipelineId);
    if (!pipeline) {
      throw new Error(`CRUD pipeline not found: ${config.pipelineId}`);
    }

    // Execute the CRUD operation based on pipeline type
    let result;
    const storeId = config.storeId || pipeline.storeId;
    const operation = config.operation || pipeline.operation;

    switch (operation) {
      case "create":
        result = this._curationSystem.create(storeId, input);
        break;
      case "read":
        result = this._curationSystem.read(storeId, input.key || input.id);
        break;
      case "update":
        result = this._curationSystem.update(
          storeId,
          input.key || input.id,
          input.data || input,
        );
        break;
      case "delete":
        result = this._curationSystem.delete(storeId, input.key || input.id);
        break;
      default:
        throw new Error(`Unknown CRUD operation: ${operation}`);
    }

    // Map output
    const output = this._mapActionOutput(result, config.outputMapping);

    this._emit("action:crud:complete", {
      actionId: action.id,
      pipelineId: config.pipelineId,
      operation,
      result,
    });

    return typeof output === "string"
      ? output
      : JSON.stringify(output, null, 2);
  },

  /**
   * Execute a RAG pipeline action
   * @param {Object} action - Action definition
   * @param {Object} actionState - Action state
   * @param {Object} phaseState - Phase state
   * @returns {Promise<string>} Output
   */
  async _executeRAGAction(action, actionState, phaseState) {
    if (!this._curationSystem) {
      throw new Error("CurationSystem not available for RAG action");
    }

    const config = action.ragConfig;
    if (!config?.pipelineId) {
      throw new Error("RAG action requires ragConfig.pipelineId");
    }

    this._log("debug", `Executing RAG pipeline: ${config.pipelineId}`);

    // Build query from input
    let query = actionState.input;
    if (config.queryTemplate) {
      query =
        this._tokenResolver?.resolve(config.queryTemplate, {
          input: actionState.input,
          phase: phaseState,
        }) || config.queryTemplate.replace("{{input}}", actionState.input);
    }

    // Execute RAG pipeline
    const result = await this._curationSystem.executeRAG(config.pipelineId, {
      query,
      limit: config.maxResults || 5,
    });

    this._emit("action:rag:complete", {
      actionId: action.id,
      pipelineId: config.pipelineId,
      query,
      resultCount: result?.count || 0,
    });

    // Format results as output
    if (result?.results && result.results.length > 0) {
      return result.results
        .map((r) => `[${r.storeName}] ${JSON.stringify(r.entry)}`)
        .join("\n\n");
    }

    return "No relevant information found.";
  },

  /**
   * Execute a Deliberative RAG action - interactive Q&A with Curation team
   * @param {Object} action - Action definition
   * @param {Object} actionState - Action state
   * @param {Object} phaseState - Phase state
   * @returns {Promise<string>} Consolidated output
   */
  async _executeDeliberativeRAGAction(action, actionState, phaseState) {
    if (!this._curationSystem || !this._agentsSystem) {
      throw new Error(
        "CurationSystem and AgentsSystem required for Deliberative RAG",
      );
    }

    const config = action.deliberativeConfig;
    const maxRounds = config.maxRounds || 3;

    this._log("debug", `Starting Deliberative RAG with ${maxRounds} rounds`);

    // Create deliberation thread if enabled
    let threadId = null;
    if (config.deliberationThread?.enabled && this._threadManager) {
      threadId = this._threadManager.createThread({
        name: config.deliberationThread.name || "Deliberative RAG",
        type: "deliberation",
      });
    }

    const deliberationLog = [];

    // Get query participants (agents who will ask questions)
    const queryParticipants = this._resolveParticipantsFromIds(
      config.queryParticipants,
    );

    // Get curation positions (agents who will answer)
    const curationAgents = this._resolveCurationAgents(
      config.curationPositions,
    );

    // Deliberation rounds
    for (let round = 0; round < maxRounds; round++) {
      this._log("debug", `Deliberative RAG round ${round + 1}/${maxRounds}`);

      // Phase 1: Query participants formulate questions
      const questions = [];
      for (const participant of queryParticipants) {
        const questionPrompt = `Based on the current context and input, what information do you need from the story records?

Input: ${actionState.input}

Previous Q&A:
${deliberationLog.map((d) => `Q: ${d.question}\nA: ${d.answer}`).join("\n\n") || "None yet"}

Formulate a specific question to retrieve relevant information. If you have enough information, respond with "SUFFICIENT".`;

        const question = await this._callAgent(participant, questionPrompt);

        if (
          question.toLowerCase().includes("sufficient") ||
          question.toLowerCase().includes("no further")
        ) {
          continue;
        }

        questions.push({ participant: participant.id, question });
      }

      // If no more questions, end deliberation
      if (questions.length === 0) {
        this._log(
          "debug",
          "Deliberation complete - sufficient information gathered",
        );
        break;
      }

      // Phase 2: Curation team answers questions
      for (const q of questions) {
        // Execute RAG to get relevant data
        let ragContext = "";
        for (const pipelineId of config.availableRAGPipelines || []) {
          try {
            const ragResult = await this._curationSystem.executeRAG(
              pipelineId,
              {
                query: q.question,
                limit: 3,
              },
            );
            if (ragResult?.results?.length > 0) {
              ragContext +=
                ragResult.results
                  .map((r) => JSON.stringify(r.entry))
                  .join("\n") + "\n";
            }
          } catch (e) {
            this._log("debug", `RAG pipeline ${pipelineId} error:`, e);
          }
        }

        // Have curation agent synthesize answer
        const curationAgent =
          curationAgents[round % curationAgents.length] || curationAgents[0];

        if (curationAgent) {
          const answerPrompt = `${config.curationPrompt}

Question from ${q.participant}: ${q.question}

Available data from records:
${ragContext || "No specific records found."}

Provide a helpful, accurate answer based on the stored information.`;

          const answer = await this._callAgent(curationAgent, answerPrompt);

          deliberationLog.push({
            round: round + 1,
            participant: q.participant,
            question: q.question,
            answeredBy: curationAgent.id,
            answer,
          });

          // Post to thread if enabled
          if (threadId && this._threadManager) {
            this._threadManager.addMessage(threadId, {
              role: "user",
              content: `[${q.participant}] ${q.question}`,
            });
            this._threadManager.addMessage(threadId, {
              role: "assistant",
              content: `[${curationAgent.id}] ${answer}`,
            });
          }
        }
      }
    }

    // Consolidate results
    let output;
    if (config.consolidation === "synthesize" && queryParticipants.length > 0) {
      const synthesizePrompt = `Synthesize the following information retrieved through deliberation:

${deliberationLog.map((d) => `Q: ${d.question}\nA: ${d.answer}`).join("\n\n")}

Provide a consolidated summary of the relevant information.`;

      output = await this._callAgent(queryParticipants[0], synthesizePrompt);
    } else {
      output = deliberationLog
        .map((d) => `**Q:** ${d.question}\n**A:** ${d.answer}`)
        .join("\n\n---\n\n");
    }

    this._emit("action:deliberative_rag:complete", {
      actionId: action.id,
      rounds: deliberationLog.length,
      deliberationLog,
    });

    return output;
  },

  /**
   * Execute a User Gavel action - pause for user review
   * @param {Object} action - Action definition
   * @param {Object} actionState - Action state
   * @param {Object} phaseState - Phase state
   * @returns {Promise<string>} User-approved output
   */
  async _executeUserGavelAction(action, actionState, phaseState) {
    const config = action.gavelConfig;

    this._log("debug", `User Gavel: ${config.prompt}`);

    // Emit gavel event for UI to handle
    this._emit("action:gavel:requested", {
      actionId: action.id,
      prompt: config.prompt,
      input: actionState.input,
      editableFields: config.editableFields,
      canSkip: config.canSkip,
    });

    // Wait for user response
    return new Promise((resolve, reject) => {
      const timeout = config.timeout;
      let timeoutId = null;

      const handleResponse = (response) => {
        if (timeoutId) clearTimeout(timeoutId);
        this.off("gavel:response:" + action.id, handleResponse);

        if (response.skipped) {
          resolve(actionState.input); // Pass through input unchanged
        } else {
          resolve(response.output || actionState.input);
        }
      };

      this.on("gavel:response:" + action.id, handleResponse);

      if (timeout > 0) {
        timeoutId = setTimeout(() => {
          this.off("gavel:response:" + action.id, handleResponse);
          if (config.canSkip) {
            resolve(actionState.input);
          } else {
            reject(new Error("User gavel timed out"));
          }
        }, timeout);
      }
    });
  },

  /**
   * Execute a System action - no LLM call, just data transformation
   * @param {Object} action - Action definition
   * @param {Object} actionState - Action state
   * @param {Object} phaseState - Phase state
   * @returns {Promise<string>} Transformed output
   */
  async _executeSystemAction(action, actionState, phaseState) {
    this._log("debug", `System action: ${action.name}`);

    // System actions can transform input to output without LLM
    // Use the promptTemplate as a transformation template
    if (action.promptTemplate && this._tokenResolver) {
      return this._tokenResolver.resolve(action.promptTemplate, {
        input: actionState.input,
        phase: phaseState,
        globals: this._activeRun?.state?.globals || {},
      });
    }

    // Default: pass through input
    return actionState.input;
  },

  /**
   * Execute a Character Workshop action - dedicated character refinement
   * @param {Object} action - Action definition
   * @param {Object} actionState - Action state
   * @param {Object} phaseState - Phase state
   * @returns {Promise<string>} Workshop output
   */
  async _executeCharacterWorkshopAction(action, actionState, phaseState) {
    const config = action.characterWorkshopConfig;
    this._log(
      "info",
      `Character Workshop action: ${action.name} (mode: ${config.mode})`,
    );

    if (!this._characterSystem) {
      throw new Error(
        "CharacterSystem not available for Character Workshop action",
      );
    }

    // Set up workshop thread if enabled
    let threadId = null;
    if (config.workshopThread?.enabled && this._threadManager) {
      threadId = this._threadManager.createThread({
        name: config.workshopThread.name || "Character Workshop",
        type: "character_workshop",
      });
    }

    const workshopLog = [];

    // Get character agents to workshop
    let characterAgents = [];
    if (config.characterIds?.length > 0) {
      // Explicit character IDs
      for (const charId of config.characterIds) {
        const agent = this._characterSystem.getAgentByCharacterId(charId);
        if (agent) characterAgents.push(agent);
      }
    } else {
      // Use spawned characters
      characterAgents = this._characterSystem.getSpawnedAgents();
      // Fallback to main cast if none spawned
      if (characterAgents.length === 0) {
        characterAgents = this._characterSystem.getAgentsByType(
          this._characterSystem.CharacterType?.MAIN_CAST || "main_cast",
        );
      }
    }

    if (characterAgents.length === 0) {
      this._log("warn", "No character agents available for workshop");
      return actionState.input;
    }

    // Get Character Director if included
    let director = null;
    if (config.includeDirector) {
      director = this._characterSystem.getCharacterDirector();
    }

    // Fetch RAG context for characters if enabled
    let ragContext = "";
    if (config.ragConfig?.enabled && this._curationSystem) {
      try {
        const characterNames = characterAgents.map((a) => a.name).join(", ");
        const ragResult = await this._curationSystem.executeRAGPipeline(
          config.ragConfig.pipelineId || "default",
          {
            query: `Character information for: ${characterNames}`,
            limit: 10,
          },
        );
        if (ragResult?.results?.length > 0) {
          ragContext = ragResult.results
            .map((r) => r.text || r.content)
            .join("\n\n");
        }
      } catch (error) {
        this._log("warn", `RAG context fetch failed: ${error.message}`);
      }
    }

    // Build workshop based on mode
    let output = "";

    switch (config.mode) {
      case "refinement":
        output = await this._executeRefinementWorkshop(
          characterAgents,
          director,
          config,
          actionState,
          ragContext,
          workshopLog,
          threadId,
        );
        break;

      case "consistency":
        output = await this._executeConsistencyWorkshop(
          characterAgents,
          director,
          config,
          actionState,
          ragContext,
          workshopLog,
          threadId,
        );
        break;

      case "collaboration":
        output = await this._executeCollaborationWorkshop(
          characterAgents,
          director,
          config,
          actionState,
          ragContext,
          workshopLog,
          threadId,
        );
        break;

      default:
        output = await this._executeRefinementWorkshop(
          characterAgents,
          director,
          config,
          actionState,
          ragContext,
          workshopLog,
          threadId,
        );
    }

    this._emit("character:workshop:complete", {
      actionId: action.id,
      mode: config.mode,
      characterCount: characterAgents.length,
      workshopLog,
    });

    return output;
  },

  /**
   * Execute refinement workshop - refine character voices
   * @private
   */
  async _executeRefinementWorkshop(
    characterAgents,
    director,
    config,
    actionState,
    ragContext,
    workshopLog,
    threadId,
  ) {
    const refinements = [];

    // Director sets the stage if present
    if (director && this._apiClient) {
      const directorPrompt = `${config.prompts.director}

## Characters in Workshop:
${characterAgents.map((a) => `- ${a.name} (${a.type})`).join("\n")}

## Context:
${actionState.input}

${ragContext ? `## Character Data:\n${ragContext}` : ""}

Provide guidance for refining each character's voice in this context.`;

      try {
        const directorResponse = await this._apiClient.chat({
          messages: [
            {
              role: "system",
              content: director.systemPrompt?.customText || "",
            },
            { role: "user", content: directorPrompt },
          ],
          ...director.apiConfig,
        });

        const guidance =
          directorResponse?.content || directorResponse?.message?.content || "";
        workshopLog.push({
          participant: "Character Director",
          role: "director",
          content: guidance,
        });

        if (threadId && this._threadManager) {
          this._threadManager.addMessage(threadId, {
            role: "assistant",
            content: guidance,
          });
        }
      } catch (error) {
        this._log("warn", `Director guidance failed: ${error.message}`);
      }
    }

    // Each character refines their voice
    for (const agent of characterAgents) {
      const systemPrompt = this._characterSystem.generateSystemPrompt(agent.id);
      const refinementPrompt = `${config.prompts.refinement}

## Your Character: ${agent.name}
${ragContext ? `\n## Character Background:\n${ragContext}` : ""}

## Scene/Context:
${actionState.input}

Respond in character, demonstrating your refined voice and mannerisms.`;

      try {
        const response = await this._apiClient.chat({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: refinementPrompt },
          ],
          ...agent.apiConfig,
        });

        const content = response?.content || response?.message?.content || "";
        refinements.push({
          character: agent.name,
          characterId: agent.characterId,
          response: content,
        });

        workshopLog.push({
          participant: agent.name,
          role: "character",
          content,
        });

        if (threadId && this._threadManager) {
          this._threadManager.addMessage(threadId, {
            role: "assistant",
            content: `[${agent.name}]: ${content}`,
          });
        }
      } catch (error) {
        this._log(
          "warn",
          `Character ${agent.name} refinement failed: ${error.message}`,
        );
      }
    }

    // Consolidate output
    if (config.consolidation === "synthesize" && director && this._apiClient) {
      const synthesizePrompt = `Synthesize the following character refinements into a cohesive summary:

${refinements.map((r) => `## ${r.character}\n${r.response}`).join("\n\n")}`;

      try {
        const synthesis = await this._apiClient.chat({
          messages: [
            {
              role: "system",
              content: director.systemPrompt?.customText || "",
            },
            { role: "user", content: synthesizePrompt },
          ],
          ...director.apiConfig,
        });

        return (
          synthesis?.content ||
          synthesis?.message?.content ||
          refinements.map((r) => r.response).join("\n\n")
        );
      } catch (error) {
        this._log("warn", `Synthesis failed: ${error.message}`);
      }
    }

    return refinements
      .map((r) => `[${r.character}]: ${r.response}`)
      .join("\n\n");
  },

  /**
   * Execute consistency workshop - check character consistency
   * @private
   */
  async _executeConsistencyWorkshop(
    characterAgents,
    director,
    config,
    actionState,
    ragContext,
    workshopLog,
    threadId,
  ) {
    const consistencyChecks = [];

    for (const agent of characterAgents) {
      const systemPrompt = this._characterSystem.generateSystemPrompt(agent.id);
      const checkPrompt = `${config.prompts.consistency}

## Your Character: ${agent.name}
${ragContext ? `\n## Established Character Data:\n${ragContext}` : ""}

## Content to Check:
${actionState.input}

Analyze if this content is consistent with your established character. Note any inconsistencies.`;

      try {
        const response = await this._apiClient.chat({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: checkPrompt },
          ],
          ...agent.apiConfig,
        });

        const content = response?.content || response?.message?.content || "";
        consistencyChecks.push({
          character: agent.name,
          analysis: content,
        });

        workshopLog.push({
          participant: agent.name,
          role: "character",
          type: "consistency_check",
          content,
        });
      } catch (error) {
        this._log(
          "warn",
          `Consistency check for ${agent.name} failed: ${error.message}`,
        );
      }
    }

    // Director synthesizes consistency findings
    if (director && this._apiClient) {
      const synthesizePrompt = `Review and synthesize the following character consistency checks:

${consistencyChecks.map((c) => `## ${c.character}\n${c.analysis}`).join("\n\n")}

Provide a summary of consistency issues found and recommendations.`;

      try {
        const synthesis = await this._apiClient.chat({
          messages: [
            {
              role: "system",
              content: director.systemPrompt?.customText || "",
            },
            { role: "user", content: synthesizePrompt },
          ],
          ...director.apiConfig,
        });

        return synthesis?.content || synthesis?.message?.content || "";
      } catch (error) {
        this._log("warn", `Director synthesis failed: ${error.message}`);
      }
    }

    return consistencyChecks
      .map((c) => `[${c.character}]: ${c.analysis}`)
      .join("\n\n");
  },

  /**
   * Execute collaboration workshop - Editorial ↔ Character team collaboration
   * @private
   */
  async _executeCollaborationWorkshop(
    characterAgents,
    director,
    config,
    actionState,
    ragContext,
    workshopLog,
    threadId,
  ) {
    const collaborationRounds = [];

    // Get editorial participants
    const editorialParticipants = [];
    if (config.editorialPositions?.length > 0 && this._agentsSystem) {
      for (const positionId of config.editorialPositions) {
        const position = this._agentsSystem.getPosition(positionId);
        const agent = this._agentsSystem.getAgentForPosition(positionId);
        if (position && agent) {
          editorialParticipants.push({ position, agent });
        }
      }
    }

    // Round 1: Editorial feedback on characters
    for (const { position, agent } of editorialParticipants) {
      const feedbackPrompt = `As ${position.name}, provide feedback on these characters in the context:

## Characters:
${characterAgents.map((a) => `- ${a.name}: ${a.cachedTraits?.personality || "No description"}`).join("\n")}

## Context:
${actionState.input}

Provide editorial feedback on character portrayal and voice.`;

      try {
        const response = await this._callAgent(agent, feedbackPrompt);
        collaborationRounds.push({
          round: 1,
          participant: position.name,
          role: "editorial",
          content: response.content,
        });

        workshopLog.push({
          participant: position.name,
          role: "editorial",
          content: response.content,
        });
      } catch (error) {
        this._log(
          "warn",
          `Editorial feedback from ${position.name} failed: ${error.message}`,
        );
      }
    }

    // Round 2: Characters respond to feedback
    const editorialFeedback = collaborationRounds
      .filter((r) => r.role === "editorial")
      .map((r) => `${r.participant}: ${r.content}`)
      .join("\n\n");

    for (const agent of characterAgents) {
      const systemPrompt = this._characterSystem.generateSystemPrompt(agent.id);
      const responsePrompt = `Editorial team has provided feedback on your portrayal:

${editorialFeedback}

Respond to this feedback in character, acknowledging valid points and clarifying your voice.`;

      try {
        const response = await this._apiClient.chat({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: responsePrompt },
          ],
          ...agent.apiConfig,
        });

        const content = response?.content || response?.message?.content || "";
        collaborationRounds.push({
          round: 2,
          participant: agent.name,
          role: "character",
          content,
        });

        workshopLog.push({
          participant: agent.name,
          role: "character",
          content,
        });
      } catch (error) {
        this._log(
          "warn",
          `Character ${agent.name} response failed: ${error.message}`,
        );
      }
    }

    // Director synthesizes collaboration
    if (director && this._apiClient) {
      const synthesizePrompt = `Synthesize the editorial-character collaboration:

${collaborationRounds.map((r) => `## ${r.participant} (${r.role}, Round ${r.round})\n${r.content}`).join("\n\n")}

Provide actionable insights for improving character voice and consistency.`;

      try {
        const synthesis = await this._apiClient.chat({
          messages: [
            {
              role: "system",
              content: director.systemPrompt?.customText || "",
            },
            { role: "user", content: synthesizePrompt },
          ],
          ...director.apiConfig,
        });

        return synthesis?.content || synthesis?.message?.content || "";
      } catch (error) {
        this._log("warn", `Director synthesis failed: ${error.message}`);
      }
    }

    return collaborationRounds
      .map((r) => `[${r.participant}]: ${r.content}`)
      .join("\n\n");
  },

  /**
   * Map action input using mapping configuration
   * @param {any} input - Raw input
   * @param {Object} mapping - Input mapping
   * @returns {any} Mapped input
   */
  _mapActionInput(input, mapping) {
    if (!mapping || Object.keys(mapping).length === 0) {
      return input;
    }

    if (typeof input === "string") {
      try {
        input = JSON.parse(input);
      } catch {
        return input;
      }
    }

    const mapped = {};
    for (const [targetKey, sourceKey] of Object.entries(mapping)) {
      mapped[targetKey] = input[sourceKey] ?? input[targetKey];
    }
    return mapped;
  },

  /**
   * Map action output using mapping configuration
   * @param {any} output - Raw output
   * @param {Object} mapping - Output mapping
   * @returns {any} Mapped output
   */
  _mapActionOutput(output, mapping) {
    if (!mapping || Object.keys(mapping).length === 0) {
      return output;
    }

    const mapped = {};
    for (const [targetKey, sourceKey] of Object.entries(mapping)) {
      mapped[targetKey] = output[sourceKey] ?? output[targetKey];
    }
    return mapped;
  },

  /**
   * Resolve participants from position/team IDs
   * @param {Array<string>} ids - Position or team IDs
   * @returns {Array<Object>} Resolved agents
   */
  _resolveParticipantsFromIds(ids) {
    if (!ids || !this._agentsSystem) return [];

    const participants = [];
    for (const id of ids) {
      const position = this._agentsSystem.getPosition(id);
      if (position?.assignedAgentId) {
        const agent = this._agentsSystem.getAgent(position.assignedAgentId);
        if (agent) participants.push(agent);
      }
    }
    return participants;
  },

  /**
   * Resolve curation team agents
   * @param {Array<string>} positionIds - Curation position IDs
   * @returns {Array<Object>} Resolved agents
   */
  _resolveCurationAgents(positionIds) {
    const defaultPositions = [
      "archivist",
      "story_topologist",
      "lore_topologist",
      "character_topologist",
      "scene_topologist",
      "location_topologist",
    ];

    const idsToResolve =
      positionIds?.length > 0 ? positionIds : defaultPositions;

    // Use CurationSystem to resolve curation agents (not AgentsSystem)
    if (this._curationSystem) {
      const agents = [];
      for (const positionId of idsToResolve) {
        // First try to get the agent assigned to this position
        const agent = this._curationSystem.getAgentForPosition(positionId);
        if (agent) {
          agents.push(agent);
          continue;
        }

        // Fallback: search all curation agents for one with this positionId
        const allCurationAgents = this._curationSystem.getAllCurationAgents();
        for (const curationAgent of allCurationAgents) {
          if (curationAgent.positionId === positionId) {
            agents.push(curationAgent);
            break;
          }
        }
      }
      if (agents.length > 0) {
        return agents;
      }
    }

    // Fallback to AgentsSystem if CurationSystem doesn't have agents
    return this._resolveParticipantsFromIds(idsToResolve);
  },

  /**
   * Call an agent with a prompt
   * @param {Object} agent - Agent definition
   * @param {string} prompt - Prompt to send
   * @returns {Promise<string>} Agent response
   */
  async _callAgent(agent, prompt) {
    if (!this._apiClient) {
      this._log("warn", "ApiClient not available, returning placeholder");
      return `[${agent.name || agent.id}]: (API not available)`;
    }

    try {
      const response = await this._apiClient.chat({
        messages: [
          { role: "system", content: agent.systemPrompt?.customText || "" },
          { role: "user", content: prompt },
        ],
        // Use agent's API config or defaults
        ...agent.apiConfig,
      });

      return response.content || response.message || "";
    } catch (e) {
      this._log("error", `Agent call failed: ${e.message}`);
      return `[Error from ${agent.name || agent.id}]: ${e.message}`;
    }
  },

  // ===== STANDARD ACTION HELPERS =====

  /**
   * Execute RAG for an action
   * @param {Object} action - Action definition
   * @param {Object} actionState - Action state
   * @returns {Promise<Object>} RAG results
   */
  async _executeActionRAG(action, actionState) {
    if (!this._curationSystem || !action.rag?.enabled) {
      return null;
    }

    try {
      const query = action.rag.queryTemplate || actionState.input;
      const results = await this._curationSystem.executeRAG(
        action.rag.ragPipelineId || null,
        { query, text: query },
      );
      return results;
    } catch (error) {
      this._log("warn", `RAG execution failed for action ${action.id}:`, error);
      return null;
    }
  },

  /**
   * Execute action with participants
   * @param {Object} action - Action definition
   * @param {Object} actionState - Action state
   * @param {Object} ragResults - RAG results (if any)
   * @returns {Promise<string>} Combined output
   */
  async _executeActionParticipants(action, actionState, ragResults) {
    const participants = this._resolveParticipants(action, actionState);

    if (participants.length === 0) {
      this._log("warn", `No participants for action ${action.id}`);
      return "";
    }

    const orchestration = action.participants.orchestration || "sequential";
    const responses = [];

    switch (orchestration) {
      case "parallel":
        const promises = participants.map((p) =>
          this._executeForParticipant(action, actionState, p, ragResults),
        );
        const results = await Promise.all(promises);
        responses.push(...results);
        break;

      case "round_robin":
        const maxRounds = action.participants.maxRounds || 3;
        for (let round = 0; round < maxRounds; round++) {
          for (const participant of participants) {
            const response = await this._executeForParticipant(
              action,
              actionState,
              participant,
              ragResults,
              responses,
            );
            responses.push(response);
          }
        }
        break;

      case "consensus":
        // Simplified consensus: iterate until agreement or max rounds
        let consensusReached = false;
        const maxConsensusRounds = action.participants.maxRounds || 3;
        for (
          let round = 0;
          round < maxConsensusRounds && !consensusReached;
          round++
        ) {
          for (const participant of participants) {
            const response = await this._executeForParticipant(
              action,
              actionState,
              participant,
              ragResults,
              responses,
            );
            responses.push(response);
          }
          // Simple consensus check: if all responses are similar, stop
          if (responses.length >= 2) {
            const lastResponses = responses.slice(-participants.length);
            consensusReached = this._checkConsensus(lastResponses);
          }
        }
        break;

      case "sequential":
      default:
        for (const participant of participants) {
          const response = await this._executeForParticipant(
            action,
            actionState,
            participant,
            ragResults,
            responses,
          );
          responses.push(response);
        }
        break;
    }

    actionState.responses = responses;

    // Return last response as output (or combined for some modes)
    return responses.length > 0 ? responses[responses.length - 1].content : "";
  },

  /**
   * Resolve participants for an action
   * @param {Object} action - Action definition
   * @returns {Object[]} Array of participant info
   */
  _resolveParticipants(action, actionState = {}) {
    const participants = [];

    // Add specific positions
    for (const positionId of action.participants.positionIds || []) {
      if (this._agentsSystem) {
        const position = this._agentsSystem.getPosition(positionId);
        const agent = this._agentsSystem.getAgentForPosition(positionId);
        if (position && agent) {
          participants.push({ position, agent, positionId });
        }
      }
    }

    // Add all positions from specified teams
    for (const teamId of action.participants.teamIds || []) {
      if (this._agentsSystem) {
        const team = this._agentsSystem.getTeam(teamId);
        if (team) {
          // Add leader
          if (team.leaderId) {
            const leader = this._agentsSystem.getPosition(team.leaderId);
            const agent = this._agentsSystem.getAgentForPosition(team.leaderId);
            if (
              leader &&
              agent &&
              !participants.find((p) => p.positionId === team.leaderId)
            ) {
              participants.push({
                position: leader,
                agent,
                positionId: team.leaderId,
              });
            }
          }
          // Add members
          for (const memberId of team.memberIds || []) {
            const member = this._agentsSystem.getPosition(memberId);
            const agent = this._agentsSystem.getAgentForPosition(memberId);
            if (
              member &&
              agent &&
              !participants.find((p) => p.positionId === memberId)
            ) {
              participants.push({
                position: member,
                agent,
                positionId: memberId,
              });
            }
          }
        }
      }
    }

    // Handle dynamic SME selection
    const dynamicConfig = action.participants.dynamic;
    if (dynamicConfig?.enabled && this._agentsSystem) {
      const smeParticipants = this._resolveDynamicSMEs(
        dynamicConfig,
        actionState,
        participants,
      );
      participants.push(...smeParticipants);
    }

    // Handle character participation
    const characterConfig = action.participants.characters;
    if (characterConfig?.enabled && this._characterSystem) {
      const characterParticipants = this._resolveCharacterParticipants(
        characterConfig,
        actionState,
        participants,
      );
      participants.push(...characterParticipants);
    }

    return participants;
  },

  /**
   * Resolve character participants for an action
   * @param {Object} characterConfig - Character participation configuration
   * @param {Object} actionState - Current action state
   * @param {Object[]} existingParticipants - Already resolved participants
   * @returns {Object[]} Array of character participants
   */
  _resolveCharacterParticipants(
    characterConfig,
    actionState,
    existingParticipants,
  ) {
    const characterParticipants = [];

    if (!this._characterSystem) {
      this._log(
        "warn",
        "CharacterSystem not available for character participation",
      );
      return characterParticipants;
    }

    const mode = characterConfig.mode || "dynamic";

    // Include Character Director if requested
    if (characterConfig.includeDirector) {
      const directorResolved =
        this._characterSystem.resolvePositionAgent("character_director");
      if (directorResolved) {
        characterParticipants.push({
          position: directorResolved.position,
          agent: directorResolved.agent,
          positionId: "character_director",
          isCharacterParticipant: true,
          isDirector: true,
        });
      }
    }

    let characterAgents = [];

    switch (mode) {
      case "explicit":
        // Use explicitly specified character IDs
        for (const characterId of characterConfig.characterIds || []) {
          const agent =
            this._characterSystem.getAgentByCharacterId(characterId);
          if (agent) {
            characterAgents.push(agent);
          } else {
            this._log(
              "debug",
              `No agent found for character ID: ${characterId}`,
            );
          }
        }
        break;

      case "spawned":
        // Use currently spawned characters
        characterAgents = this._characterSystem.getSpawnedAgents();
        break;

      case "dynamic":
      default:
        // Dynamic selection based on scene/input context
        characterAgents = this._resolveDynamicCharacters(
          characterConfig,
          actionState,
        );
        break;
    }

    // Filter by character types if specified
    const typeFilter = characterConfig.characterTypes || [];
    if (typeFilter.length > 0) {
      characterAgents = characterAgents.filter((agent) =>
        typeFilter.includes(agent.type),
      );
    }

    // Convert character agents to participant format
    for (const agent of characterAgents) {
      // Skip if already a participant
      const positionId = `character_${agent.characterId}`;
      if (existingParticipants.find((p) => p.positionId === positionId)) {
        continue;
      }
      if (characterParticipants.find((p) => p.positionId === positionId)) {
        continue;
      }

      // Get or create position for character
      let position = this._characterSystem.getPosition(positionId);
      if (!position) {
        // Use agent info as position
        position = {
          id: positionId,
          name: agent.name,
          displayName: agent.displayName || agent.name,
          type: agent.type,
          isCharacterPosition: true,
        };
      }

      // Generate system prompt with voicing guidance if provided
      let systemPrompt = this._characterSystem.generateSystemPrompt(agent.id);
      if (characterConfig.voicingGuidance) {
        systemPrompt += `\n\n## Voicing Guidance\n${characterConfig.voicingGuidance}`;
      }

      // Create participant with enhanced agent
      const enhancedAgent = {
        ...agent,
        systemPrompt,
      };

      characterParticipants.push({
        position,
        agent: enhancedAgent,
        positionId,
        isCharacterParticipant: true,
        isDirector: false,
      });
    }

    this._log(
      "debug",
      `Resolved ${characterParticipants.length} character participants (mode: ${mode})`,
    );

    return characterParticipants;
  },

  /**
   * Dynamically resolve characters based on scene context
   * Uses Character Director to identify relevant characters
   * @param {Object} characterConfig - Character configuration
   * @param {Object} actionState - Current action state
   * @returns {Object[]} Array of character agents
   */
  async _resolveDynamicCharacters(characterConfig, actionState) {
    if (!this._characterSystem) {
      return [];
    }

    // Get input context for analysis
    const input = actionState.input || "";
    const context = this._activeRun?.context || {};

    // Try to get Character Director's assessment
    const director = this._characterSystem.getCharacterDirector();
    if (director && this._apiClient) {
      try {
        // Build prompt for Character Director to identify characters
        const analysisPrompt = `Analyze the following scene/content and identify which characters should participate.

## Scene Content:
${input}

## Available Characters:
${this._characterSystem
  .getAllCharacterAgents()
  .map(
    (a) =>
      `- ${a.name} (${a.type}): ${a.cachedTraits?.personality || "No description"}`,
  )
  .join("\n")}

Respond with a JSON array of character names that should participate in this scene.
Example: ["Character A", "Character B"]

Only include characters that are directly relevant to the scene content.`;

        const response = await this._apiClient.chat({
          messages: [
            {
              role: "system",
              content: director.systemPrompt?.customText || "",
            },
            { role: "user", content: analysisPrompt },
          ],
          ...director.apiConfig,
        });

        // Parse director's response
        const responseText =
          response?.content || response?.message?.content || "";
        const jsonMatch = responseText.match(/\[.*?\]/s);
        if (jsonMatch) {
          const characterNames = JSON.parse(jsonMatch[0]);
          const allAgents = this._characterSystem.getAllCharacterAgents();
          return allAgents.filter((agent) =>
            characterNames.some(
              (name) =>
                agent.name.toLowerCase().includes(name.toLowerCase()) ||
                name.toLowerCase().includes(agent.name.toLowerCase()),
            ),
          );
        }
      } catch (error) {
        this._log(
          "warn",
          `Character Director analysis failed: ${error.message}`,
        );
      }
    }

    // Fallback: return all spawned characters or main cast
    const spawned = this._characterSystem.getSpawnedAgents();
    if (spawned.length > 0) {
      return spawned;
    }

    // Default to main cast characters
    return this._characterSystem.getAgentsByType(
      this._characterSystem?.CharacterType?.MAIN_CAST || "main_cast",
    );
  },

  /**
   * Resolve dynamic SME participants based on keyword matching
   * @param {Object} dynamicConfig - Dynamic configuration
   * @param {Object} actionState - Current action state
   * @param {Object[]} existingParticipants - Already resolved participants
   * @returns {Object[]} Array of SME participants
   */
  _resolveDynamicSMEs(dynamicConfig, actionState, existingParticipants) {
    const smeParticipants = [];
    const maxSMEs = dynamicConfig.maxSMEs || 3;

    // Extract keywords from input or context
    const keywords = this._extractSMEKeywords(dynamicConfig, actionState);

    if (keywords.length === 0) {
      this._log("debug", "No keywords found for SME matching");
      // Use fallback if specified
      if (dynamicConfig.fallbackPosition) {
        const fallback = this._resolvePositionParticipant(
          dynamicConfig.fallbackPosition,
        );
        if (fallback) {
          return [fallback];
        }
      }
      return [];
    }

    this._log("debug", `SME keyword search: [${keywords.join(", ")}]`);

    // Get all SME positions
    const allPositions = this._agentsSystem.getAllPositions();
    const smePositions = allPositions.filter(
      (p) => p.isSME && p.smeKeywords?.length > 0,
    );

    // Score each SME position by keyword matches
    const scoredSMEs = [];
    for (const position of smePositions) {
      // Skip if already a participant
      if (existingParticipants.find((p) => p.positionId === position.id)) {
        continue;
      }

      const score = this._calculateSMEScore(keywords, position.smeKeywords);
      if (score > 0) {
        scoredSMEs.push({ position, score });
      }
    }

    // Sort by score descending and take top N
    scoredSMEs.sort((a, b) => b.score - a.score);
    const topSMEs = scoredSMEs.slice(0, maxSMEs);

    // Resolve to full participant objects
    for (const { position } of topSMEs) {
      const agent = this._agentsSystem.getAgentForPosition(position.id);
      if (agent) {
        smeParticipants.push({
          position,
          agent,
          positionId: position.id,
          isDynamicSME: true,
        });
        this._log("debug", `Selected SME: ${position.name} (${position.id})`);
      }
    }

    // Use fallback if no SMEs found
    if (smeParticipants.length === 0 && dynamicConfig.fallbackPosition) {
      const fallback = this._resolvePositionParticipant(
        dynamicConfig.fallbackPosition,
      );
      if (fallback) {
        this._log(
          "debug",
          `Using fallback position: ${dynamicConfig.fallbackPosition}`,
        );
        return [fallback];
      }
    }

    return smeParticipants;
  },

  /**
   * Extract keywords for SME matching
   * @param {Object} dynamicConfig - Dynamic configuration
   * @param {Object} actionState - Current action state
   * @returns {string[]} Array of keywords (lowercase)
   */
  _extractSMEKeywords(dynamicConfig, actionState) {
    let text = "";

    // Determine source text
    const source = dynamicConfig.keywordSource || "input";
    if (source === "input") {
      text = actionState.input || "";
    } else if (source === "context") {
      text = actionState.context?.combined || actionState.input || "";
    } else if (source === "custom" && dynamicConfig.customKeywords) {
      return dynamicConfig.customKeywords.map((k) => k.toLowerCase());
    }

    // Extract keywords from text
    // Simple approach: split on non-word characters, filter short words and common words
    const commonWords = new Set([
      "the",
      "a",
      "an",
      "and",
      "or",
      "but",
      "in",
      "on",
      "at",
      "to",
      "for",
      "of",
      "with",
      "by",
      "from",
      "as",
      "is",
      "was",
      "are",
      "were",
      "been",
      "be",
      "have",
      "has",
      "had",
      "do",
      "does",
      "did",
      "will",
      "would",
      "could",
      "should",
      "may",
      "might",
      "must",
      "shall",
      "can",
      "need",
      "that",
      "this",
      "these",
      "those",
      "it",
      "its",
      "they",
      "them",
      "their",
      "he",
      "she",
      "him",
      "her",
      "his",
      "we",
      "us",
      "our",
      "you",
      "your",
      "i",
      "me",
      "my",
      "what",
      "which",
      "who",
      "whom",
      "when",
      "where",
      "why",
      "how",
      "all",
      "each",
      "every",
      "both",
      "few",
      "more",
      "most",
      "other",
      "some",
      "such",
      "no",
      "not",
      "only",
      "own",
      "same",
      "so",
      "than",
      "too",
      "very",
      "just",
      "also",
      "now",
      "here",
      "there",
      "then",
      "once",
    ]);

    const words = text
      .toLowerCase()
      .split(/\W+/)
      .filter((word) => {
        return word.length >= 3 && !commonWords.has(word);
      });

    // Return unique keywords
    return [...new Set(words)];
  },

  /**
   * Calculate SME score based on keyword matches
   * @param {string[]} searchKeywords - Keywords to search for
   * @param {string[]} smeKeywords - SME's registered keywords
   * @returns {number} Match score
   */
  _calculateSMEScore(searchKeywords, smeKeywords) {
    let score = 0;
    const normalizedSMEKeywords = smeKeywords.map((k) => k.toLowerCase());

    for (const keyword of searchKeywords) {
      // Exact match = 3 points
      if (normalizedSMEKeywords.includes(keyword)) {
        score += 3;
        continue;
      }

      // Partial match (SME keyword contains search keyword or vice versa) = 1 point
      for (const smeKeyword of normalizedSMEKeywords) {
        if (smeKeyword.includes(keyword) || keyword.includes(smeKeyword)) {
          score += 1;
          break;
        }
      }
    }

    return score;
  },

  /**
   * Resolve a single position to a participant object
   * @param {string} positionId - Position ID
   * @returns {Object|null} Participant object or null
   */
  _resolvePositionParticipant(positionId) {
    if (!this._agentsSystem) return null;

    const position = this._agentsSystem.getPosition(positionId);
    const agent = this._agentsSystem.getAgentForPosition(positionId);

    if (position && agent) {
      return { position, agent, positionId };
    }
    return null;
  },

  /**
   * Execute action for a single participant
   * @param {Object} action - Action definition
   * @param {Object} actionState - Action state
   * @param {Object} participant - Participant info
   * @param {Object} ragResults - RAG results
   * @param {Object[]} previousResponses - Previous responses in this action
   * @returns {Promise<Object>} Response
   */
  async _executeForParticipant(
    action,
    actionState,
    participant,
    ragResults,
    previousResponses = [],
  ) {
    const { position, agent } = participant;

    // Build prompt
    let prompt = action.promptTemplate || "";

    // Resolve tokens in prompt
    if (this._tokenResolver) {
      prompt = await this._tokenResolver.resolve(prompt, {
        action: actionState,
        agent,
        position,
        input: actionState.input,
        rag: ragResults,
        previousResponses,
        run: this._activeRun,
      });
    }

    // Add position modifiers
    if (position.promptModifiers) {
      if (position.promptModifiers.prefix) {
        prompt = position.promptModifiers.prefix + "\n" + prompt;
      }
      if (position.promptModifiers.suffix) {
        prompt = prompt + "\n" + position.promptModifiers.suffix;
      }
    }

    // Execute via API client
    let content = "";
    if (this._apiClient) {
      try {
        content = await this._apiClient.generate(prompt, {
          agent,
          timeout: action.execution.timeout,
        });
      } catch (error) {
        this._log("error", `Generation failed for ${agent.name}:`, error);
        content = `[Error: ${error.message}]`;
      }
    } else {
      content = `[No API client - prompt would be: ${prompt.substring(0, 100)}...]`;
    }

    return {
      participantId: participant.positionId,
      agentId: agent.id,
      agentName: agent.name,
      positionName: position.name,
      content,
      timestamp: Date.now(),
    };
  },

  /**
   * Simple consensus check
   * @param {Object[]} responses - Recent responses
   * @returns {boolean} Whether consensus reached
   */
  _checkConsensus(responses) {
    if (responses.length < 2) return false;
    // Very simple: check if last two responses are similar in length
    const last = responses[responses.length - 1].content;
    const prev = responses[responses.length - 2].content;
    const lenDiff = Math.abs(last.length - prev.length);
    return lenDiff < Math.max(last.length, prev.length) * 0.1;
  },

  /**
   * Route action output to target
   * @param {Object} action - Action definition
   * @param {Object} actionState - Action state
   * @param {Object} phaseState - Phase state
   * @returns {Promise<void>}
   */
  async _routeActionOutput(action, actionState, phaseState) {
    const outputConfig = action.output;
    const output = actionState.output;

    if (!output) return;

    switch (outputConfig.target) {
      case "phaseOutput":
        if (outputConfig.append && phaseState.output) {
          phaseState.output += "\n" + output;
        } else {
          phaseState.output = output;
        }
        break;

      case "global":
        const globalKey = outputConfig.targetKey || "custom";
        if (this._activeRun?.globals) {
          if (globalKey === "custom") {
            this._activeRun.globals.custom[action.id] = output;
          } else {
            this._activeRun.globals[globalKey] = output;
          }
        }
        break;

      case "store":
        if (this._curationSystem && outputConfig.targetKey) {
          try {
            this._curationSystem.update(outputConfig.targetKey, {
              content: output,
            });
          } catch (e) {
            this._log("warn", `Failed to store output: ${e.message}`);
          }
        }
        break;

      case "teamOutput":
        // Store in team-specific output
        if (!phaseState.teamOutputs) phaseState.teamOutputs = {};
        const teamKey = outputConfig.targetKey || "default";
        phaseState.teamOutputs[teamKey] = output;
        break;

      case "nextAction":
        // Will be picked up by next action's input resolution
        break;
    }
  },

  /**
   * Consolidate phase outputs
   * @param {Object} phase - Phase definition
   * @param {Object} phaseState - Phase state
   * @returns {Promise<void>}
   */
  async _consolidatePhaseOutput(phase, phaseState) {
    const consolidation = phase.output?.consolidation || "last_action";

    switch (consolidation) {
      case "last_action":
        // Output already set by last action
        break;

      case "merge":
        // Merge all action outputs
        const outputs = Object.values(phaseState.actions)
          .filter((a) => a.output)
          .map((a) => a.output);
        phaseState.output = outputs.join("\n\n");
        break;

      case "designated":
        const designatedId = phase.output?.consolidationActionId;
        if (designatedId && phaseState.actions[designatedId]) {
          phaseState.output = phaseState.actions[designatedId].output;
        }
        break;

      case "synthesize":
      case "user_gavel":
        // These require additional handling (gavel or synthesis action)
        break;
    }

    // Update global output if configured
    if (phase.output?.phaseOutput?.target === "global" && phaseState.output) {
      const key = phase.output.phaseOutput.targetKey;
      if (key && this._activeRun?.globals) {
        this._activeRun.globals[key] = phaseState.output;
      }
    }
  },

  /**
   * Handle gavel (user review)
   * @param {Object} phase - Phase definition
   * @param {Object} phaseState - Phase state
   * @returns {Promise<void>}
   */
  async _handleGavel(phase, phaseState) {
    if (!phase.gavel?.enabled) return;

    this._log("info", `Gavel requested for phase: ${phase.name}`);
    this._emit("gavel:requested", {
      phaseId: phase.id,
      phaseName: phase.name,
      prompt: phase.gavel.prompt,
      output: phaseState.output,
      editableFields: phase.gavel.editableFields,
      canSkip: phase.gavel.canSkip,
    });

    // Wait for gavel response
    // In a real implementation, this would wait for UI input
    // For now, we'll just continue (the UI module will handle this)
  },

  /**
   * Submit gavel response
   * @param {string} phaseId - Phase ID
   * @param {Object} response - User response
   * @returns {boolean} Success
   */
  submitGavelResponse(phaseId, response) {
    if (!this._activeRun || !this._activeRun.phases[phaseId]) {
      return false;
    }

    const phaseState = this._activeRun.phases[phaseId];

    if (response.edited && response.output) {
      phaseState.output = response.output;
    }

    phaseState.gavelResponse = response;
    this._emit("gavel:submitted", { phaseId, response });

    return true;
  },

  // ===== PHASE LIFECYCLE HOOKS =====

  async _onPhaseStart(phase, phaseState) {
    // Initialize phase input from previous phase or user input
    const phaseIndex = this._activeRun.currentPhaseIndex;
    if (phaseIndex === 0) {
      phaseState.input = this._activeRun.userInput;
    } else {
      const prevPhases = Object.values(this._activeRun.phases);
      if (prevPhases.length > 0) {
        const prevPhase = prevPhases[prevPhases.length - 1];
        phaseState.input = prevPhase.output;
      }
    }
  },

  async _onPhaseBeforeActions(phase, phaseState) {
    // Hook for custom before-actions logic
  },

  async _onPhaseAfterActions(phase, phaseState) {
    // Hook for custom after-actions logic
  },

  async _onPhaseEnd(phase, phaseState) {
    // Update final output if this is the last phase
    const pipeline = this._pipelines.get(this._activeRun.pipelineId);
    if (pipeline) {
      const lastPhase = pipeline.phases[pipeline.phases.length - 1];
      if (lastPhase.id === phase.id) {
        this._activeRun.finalOutput = phaseState.output;
      }
    }
  },

  // ===== HELPER METHODS =====

  _sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  },

  _addToHistory(run) {
    this._runHistory.unshift(run);
    if (this._runHistory.length > this._maxRunHistory) {
      this._runHistory.pop();
    }
  },

  // ===== STATUS / QUERY =====

  /**
   * Get active run state
   * @returns {Object|null}
   */
  getActiveRun() {
    return this._activeRun;
  },

  /**
   * Check if a run is active
   * @returns {boolean}
   */
  isRunning() {
    return this._activeRun !== null && this._activeRun.status === "running";
  },

  /**
   * Get run history
   * @returns {Object[]}
   */
  getRunHistory() {
    return [...this._runHistory];
  },

  /**
   * Get system summary
   * @returns {Object}
   */
  getSummary() {
    return {
      version: this.VERSION,
      initialized: this._initialized,
      pipelineCount: this._pipelines.size,
      pipelines: Array.from(this._pipelines.values()).map((p) => ({
        id: p.id,
        name: p.name,
        phaseCount: p.phases.length,
      })),
      isRunning: this.isRunning(),
      activeRun: this._activeRun
        ? {
            id: this._activeRun.id,
            pipelineId: this._activeRun.pipelineId,
            status: this._activeRun.status,
            currentPhaseId: this._activeRun.currentPhaseId,
            currentActionId: this._activeRun.currentActionId,
          }
        : null,
      runHistoryCount: this._runHistory.length,
    };
  },

  // ===== IMPORT / EXPORT =====

  /**
   * Export all pipelines
   * @returns {Object}
   */
  exportPipelines() {
    return {
      version: this.VERSION,
      exportedAt: Date.now(),
      pipelines: Array.from(this._pipelines.values()),
    };
  },

  /**
   * Import pipelines
   * @param {Object} data - Import data
   * @param {boolean} merge - Merge with existing
   * @returns {boolean}
   */
  importPipelines(data, merge = false) {
    try {
      if (!data.pipelines) {
        throw new Error("Invalid import data");
      }

      if (!merge) {
        this._pipelines.clear();
      }

      for (const pipeline of data.pipelines) {
        if (!merge || !this._pipelines.has(pipeline.id)) {
          this.registerPipeline(pipeline);
        }
      }

      this._log("info", "Pipelines imported successfully");
      this._emit("pipelines:imported");
      return true;
    } catch (e) {
      this._log("error", "Import failed:", e);
      return false;
    }
  },

  // ===== EVENT SYSTEM =====

  on(event, callback) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, []);
    }
    this._listeners.get(event).push(callback);
    return () => this.off(event, callback);
  },

  off(event, callback) {
    const listeners = this._listeners.get(event);
    if (listeners) {
      const idx = listeners.indexOf(callback);
      if (idx > -1) listeners.splice(idx, 1);
    }
  },

  _emit(event, data = {}) {
    const listeners = this._listeners.get(event);
    if (listeners) {
      for (const callback of listeners) {
        try {
          callback(data);
        } catch (e) {
          this._log("error", `Event handler error for ${event}:`, e);
        }
      }
    }
  },

  // ===== LOGGING =====

  _log(level, message, ...args) {
    if (this._logger && typeof this._logger[level] === "function") {
      this._logger[level](`[PipelineSystem] ${message}`, ...args);
    }
  },
};

// Export for different environments
if (typeof window !== "undefined") {
  window.PipelineSystem = PipelineSystem;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = PipelineSystem;
}
