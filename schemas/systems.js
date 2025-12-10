/**
 * TheCouncil - System Schemas
 *
 * This file defines the data models for all three core systems:
 * 1. AGENTS SYSTEM - Define teams, positions, and AI agents
 * 2. CURATION SYSTEM - Data management and RAG pipelines
 * 3. RESPONSE PIPELINE SYSTEM - Editorial pipeline execution
 *
 * @version 1.0.0
 */

// =============================================================================
// COMMON / SHARED TYPES
// =============================================================================

/**
 * Token types that can be used in prompts and first messages
 * These are resolved at runtime based on current context
 */
const TokenTypes = {
  // ST Native Macros
  ST_CHAR: "{{char}}",
  ST_USER: "{{user}}",
  ST_PERSONA: "{{persona}}",
  ST_SCENARIO: "{{scenario}}",
  ST_PERSONALITY: "{{personality}}",
  ST_SYSTEM: "{{system}}",
  ST_JAILBREAK: "{{jailbreak}}",
  ST_MESEXAMPLES: "{{mesExamples}}",
  ST_DESCRIPTION: "{{description}}",

  // Pipeline Scope Tokens
  PIPELINE_USER_INPUT: "{{pipeline.userInput}}",
  PIPELINE_RAG_THREAD: "{{pipeline.ragThread}}",
  PIPELINE_RAG_INPUT: "{{pipeline.ragInput}}",

  // Phase Scope Tokens
  PHASE_ID: "{{phase.id}}",
  PHASE_NAME: "{{phase.name}}",
  PHASE_INPUT: "{{phase.input}}",
  PHASE_OUTPUT: "{{phase.output}}",
  PHASE_THREAD: "{{phase.thread}}",
  PHASE_RAG_THREAD: "{{phase.ragThread}}",
  PHASE_RAG_INPUT: "{{phase.ragInput}}",

  // Action Scope Tokens
  ACTION_ID: "{{action.id}}",
  ACTION_NAME: "{{action.name}}",
  ACTION_INPUT: "{{action.input}}",
  ACTION_OUTPUT: "{{action.output}}",
  ACTION_THREAD: "{{action.thread}}",
  ACTION_RAG_THREAD: "{{action.ragThread}}",
  ACTION_RAG_INPUT: "{{action.ragInput}}",

  // Global Variable Tokens (default pipeline globals)
  GLOBAL_INSTRUCTIONS: "{{global.instructions}}",
  GLOBAL_OUTLINE_DRAFT: "{{global.outlineDraft}}",
  GLOBAL_FINAL_OUTLINE: "{{global.finalOutline}}",
  GLOBAL_FIRST_DRAFT: "{{global.firstDraft}}",
  GLOBAL_SECOND_DRAFT: "{{global.secondDraft}}",
  GLOBAL_FINAL_DRAFT: "{{global.finalDraft}}",
  GLOBAL_COMMENTARY: "{{global.commentary}}",

  // Team Tokens
  TEAM_ID: "{{team.id}}",
  TEAM_NAME: "{{team.name}}",
  TEAM_THREAD: "{{team.thread}}",
  TEAM_INPUT: "{{team.input}}",
  TEAM_OUTPUT: "{{team.output}}",
  TEAM_TASK_THREAD: "{{team.taskThread}}",

  // Store Tokens (dynamic, based on store names)
  // Usage: {{store.characterSheets}}, {{store.plotLines}}, etc.
  STORE_PREFIX: "{{store.",

  // Agent/Position Tokens
  AGENT_NAME: "{{agent.name}}",
  POSITION_NAME: "{{position.name}}",
  POSITION_ROLE: "{{position.role}}",
};

/**
 * Lifecycle states for phases
 */
const PhaseLifecycle = {
  START: "start",
  BEFORE_ACTIONS: "before_actions",
  IN_PROGRESS: "in_progress",
  AFTER_ACTIONS: "after_actions",
  END: "end",
  RESPOND: "respond",
};

/**
 * Lifecycle states for actions
 */
const ActionLifecycle = {
  CALLED: "called",
  START: "start",
  IN_PROGRESS: "in_progress",
  COMPLETE: "complete",
  RESPOND: "respond",
};

/**
 * Execution modes for actions
 */
const ExecutionMode = {
  SYNC: "sync",
  ASYNC: "async",
};

/**
 * Trigger types for async actions
 */
const TriggerType = {
  SEQUENTIAL: "sequential", // Wait for previous action (default for sync)
  AWAIT: "await", // Wait for specific action + state
  ON: "on", // Fire when specific action reaches state
  IMMEDIATE: "immediate", // Start immediately (parallel)
};

/**
 * Orchestration modes when multiple agents participate in an action
 */
const OrchestrationMode = {
  SEQUENTIAL: "sequential", // One at a time, in order
  PARALLEL: "parallel", // All at once
  ROUND_ROBIN: "round_robin", // Take turns in a loop
  CONSENSUS: "consensus", // Discuss until agreement
};

/**
 * Output consolidation strategies for phases
 */
const OutputConsolidation = {
  LAST_ACTION: "last_action", // Last action's output becomes phase output
  SYNTHESIZE: "synthesize", // Designated action combines outputs
  USER_GAVEL: "user_gavel", // User chooses/edits
  MERGE: "merge", // Automatic merge of all outputs
  DESIGNATED: "designated", // Specific action's output
};

/**
 * Context block types
 */
const ContextBlockType = {
  STATIC: "static", // Never changes, always injected
  GLOBAL: "global", // Shared, updates at end of phases
  PHASE: "phase", // Scoped to single phase
  TEAM: "team", // Per-team, updates per phase
  STORE: "store", // Direct store object inclusion
};

/**
 * Position tiers in team hierarchy
 */
const PositionTier = {
  EXECUTIVE: "executive", // Publisher level - above all teams
  LEADER: "leader", // Team lead
  MEMBER: "member", // Team member
};

// =============================================================================
// AGENTS SYSTEM SCHEMAS
// =============================================================================

/**
 * @typedef {Object} ReasoningConfig
 * @property {boolean} enabled - Whether to use reasoning/CoT
 * @property {string} prefix - Opening tag for reasoning block
 * @property {string} suffix - Closing tag for reasoning block
 * @property {boolean} hideFromOutput - Whether to strip reasoning from final output
 */
const ReasoningConfigSchema = {
  enabled: { type: "boolean", default: false },
  prefix: { type: "string", default: "<thinking>" },
  suffix: { type: "string", default: "</thinking>" },
  hideFromOutput: { type: "boolean", default: true },
};

/**
 * @typedef {Object} ApiConfig
 * @property {boolean} useCurrentConnection - Use ST's current API connection
 * @property {string} endpoint - Custom API endpoint URL
 * @property {string} apiKey - API key for custom endpoint
 * @property {string} model - Model identifier
 * @property {number} temperature - Temperature setting (0-2)
 * @property {number} maxTokens - Maximum tokens for response
 * @property {number} topP - Top-p sampling
 * @property {number} frequencyPenalty - Frequency penalty
 * @property {number} presencePenalty - Presence penalty
 */
const ApiConfigSchema = {
  useCurrentConnection: { type: "boolean", default: true },
  endpoint: { type: "string", default: "" },
  apiKey: { type: "string", default: "" },
  model: { type: "string", default: "" },
  temperature: { type: "number", default: 0.7, min: 0, max: 2 },
  maxTokens: { type: "number", default: 2048, min: 1 },
  topP: { type: "number", default: 1, min: 0, max: 1 },
  frequencyPenalty: { type: "number", default: 0, min: -2, max: 2 },
  presencePenalty: { type: "number", default: 0, min: -2, max: 2 },
};

/**
 * @typedef {Object} SystemPromptConfig
 * @property {'builder'|'preset'|'custom'} source - Where the prompt comes from
 * @property {string} presetName - Name of saved ST preset (if source='preset')
 * @property {string} customText - Custom prompt text (if source='custom')
 * @property {Array<{token: string, prefix: string, suffix: string}>} builderTokens - Token configuration (if source='builder')
 */
const SystemPromptConfigSchema = {
  source: {
    type: "enum",
    values: ["builder", "preset", "custom"],
    default: "custom",
  },
  presetName: { type: "string", default: "" },
  customText: { type: "string", default: "" },
  builderTokens: {
    type: "array",
    items: {
      token: { type: "string", required: true },
      prefix: { type: "string", default: "" },
      suffix: { type: "string", default: "" },
    },
    default: [],
  },
};

/**
 * AGENT - An AI configuration that can be assigned to positions
 * @typedef {Object} Agent
 * @property {string} id - Unique identifier
 * @property {string} name - Display name
 * @property {string} description - Agent description/purpose
 * @property {ApiConfig} apiConfig - API settings
 * @property {SystemPromptConfig} systemPrompt - System prompt configuration
 * @property {ReasoningConfig} reasoning - Reasoning/CoT configuration
 * @property {Object} metadata - Additional metadata
 */
const AgentSchema = {
  id: { type: "string", required: true },
  name: { type: "string", required: true },
  description: { type: "string", default: "" },
  apiConfig: { type: "object", schema: ApiConfigSchema },
  systemPrompt: { type: "object", schema: SystemPromptConfigSchema },
  reasoning: { type: "object", schema: ReasoningConfigSchema },
  metadata: {
    type: "object",
    schema: {
      createdAt: { type: "number" },
      updatedAt: { type: "number" },
      tags: { type: "array", items: { type: "string" }, default: [] },
    },
  },
};

/**
 * AGENT POOL - A set of agents that a position can randomly select from
 * @typedef {Object} AgentPool
 * @property {string} id - Unique identifier
 * @property {string} name - Display name
 * @property {string[]} agentIds - List of agent IDs in the pool
 * @property {'random'|'round_robin'|'weighted'} selectionMode - How to pick an agent
 * @property {Object<string, number>} weights - Weights for weighted selection
 */
const AgentPoolSchema = {
  id: { type: "string", required: true },
  name: { type: "string", required: true },
  agentIds: {
    type: "array",
    items: { type: "string" },
    required: true,
    minLength: 1,
  },
  selectionMode: {
    type: "enum",
    values: ["random", "round_robin", "weighted"],
    default: "random",
  },
  weights: { type: "object", default: {} }, // { agentId: weight }
};

/**
 * POSITION PROMPT MODIFIERS - Prefix/suffix injected around agent's system prompt
 * @typedef {Object} PositionPromptModifiers
 * @property {string} prefix - Injected before agent's system prompt
 * @property {string} suffix - Injected after agent's system prompt
 * @property {string} roleDescription - Description of this position's role
 */
const PositionPromptModifiersSchema = {
  prefix: { type: "string", default: "" },
  suffix: { type: "string", default: "" },
  roleDescription: { type: "string", default: "" },
};

/**
 * POSITION - A slot in a team that an agent fills
 * @typedef {Object} Position
 * @property {string} id - Unique identifier
 * @property {string} name - Display name
 * @property {string} teamId - Which team this position belongs to
 * @property {'executive'|'leader'|'member'} tier - Position tier
 * @property {string|null} assignedAgentId - ID of assigned agent (or null)
 * @property {string|null} assignedPoolId - ID of assigned agent pool (or null)
 * @property {PositionPromptModifiers} promptModifiers - Prompt prefix/suffix
 * @property {boolean} isMandatory - Whether this position must be filled
 * @property {boolean} isSME - Whether this is a Subject Matter Expert position
 * @property {string[]} smeKeywords - Keywords that trigger this SME (if isSME)
 */
const PositionSchema = {
  id: { type: "string", required: true },
  name: { type: "string", required: true },
  teamId: { type: "string", required: true },
  tier: {
    type: "enum",
    values: ["executive", "leader", "member"],
    default: "member",
  },
  assignedAgentId: { type: "string", nullable: true, default: null },
  assignedPoolId: { type: "string", nullable: true, default: null },
  promptModifiers: { type: "object", schema: PositionPromptModifiersSchema },
  isMandatory: { type: "boolean", default: false },
  isSME: { type: "boolean", default: false },
  smeKeywords: { type: "array", items: { type: "string" }, default: [] },
};

/**
 * TEAM SETTINGS - Configuration specific to a team
 * @typedef {Object} TeamSettings
 * @property {string} outputObjectName - Name for this team's output object
 * @property {string} contextObjectName - Name for this team's context object
 * @property {string} threadFirstMessage - First message template for team threads
 * @property {string} taskThreadFirstMessage - First message template for task threads
 */
const TeamSettingsSchema = {
  outputObjectName: { type: "string", default: "" }, // Default to team name
  contextObjectName: { type: "string", default: "" }, // Default to team name
  threadFirstMessage: { type: "string", default: "" },
  taskThreadFirstMessage: { type: "string", default: "" },
};

/**
 * TEAM - A group of positions with a leader
 * @typedef {Object} Team
 * @property {string} id - Unique identifier
 * @property {string} name - Display name
 * @property {string} description - Team description/purpose
 * @property {string} icon - Icon/emoji for the team
 * @property {string} leaderId - Position ID of the team leader
 * @property {string[]} memberIds - Position IDs of team members
 * @property {TeamSettings} settings - Team-specific settings
 * @property {number} displayOrder - Order in UI
 */
const TeamSchema = {
  id: { type: "string", required: true },
  name: { type: "string", required: true },
  description: { type: "string", default: "" },
  icon: { type: "string", default: "👥" },
  leaderId: { type: "string", required: true },
  memberIds: { type: "array", items: { type: "string" }, default: [] },
  settings: { type: "object", schema: TeamSettingsSchema },
  displayOrder: { type: "number", default: 0 },
};

/**
 * HIERARCHY - The complete organizational structure
 * @typedef {Object} Hierarchy
 * @property {string} companyName - Name of the "company"
 * @property {Position[]} executivePositions - Positions above all teams (e.g., Publisher)
 * @property {Team[]} teams - All teams
 * @property {Position[]} positions - All positions (flat list for easy lookup)
 * @property {Agent[]} agents - All defined agents
 * @property {AgentPool[]} agentPools - All defined agent pools
 */
const HierarchySchema = {
  companyName: { type: "string", default: "The Council" },
  executivePositions: {
    type: "array",
    items: { type: "object", schema: PositionSchema },
    default: [],
  },
  teams: {
    type: "array",
    items: { type: "object", schema: TeamSchema },
    default: [],
  },
  positions: {
    type: "array",
    items: { type: "object", schema: PositionSchema },
    default: [],
  },
  agents: {
    type: "array",
    items: { type: "object", schema: AgentSchema },
    default: [],
  },
  agentPools: {
    type: "array",
    items: { type: "object", schema: AgentPoolSchema },
    default: [],
  },
};

// =============================================================================
// CURATION SYSTEM SCHEMAS
// =============================================================================

/**
 * FIELD DEFINITION - Schema for a single field in a data store
 * @typedef {Object} FieldDefinition
 * @property {string} name - Field name
 * @property {'string'|'number'|'boolean'|'array'|'object'|'enum'|'date'} type - Field type
 * @property {boolean} required - Whether field is required
 * @property {*} default - Default value
 * @property {string[]} enumValues - Possible values (if type='enum')
 * @property {FieldDefinition} itemSchema - Schema for array items (if type='array')
 * @property {Object<string, FieldDefinition>} objectSchema - Schema for object properties (if type='object')
 * @property {string} description - Field description
 */
const FieldDefinitionSchema = {
  name: { type: "string", required: true },
  type: {
    type: "enum",
    values: ["string", "number", "boolean", "array", "object", "enum", "date"],
    required: true,
  },
  required: { type: "boolean", default: false },
  default: { type: "any", default: null },
  enumValues: { type: "array", items: { type: "string" }, default: [] },
  itemSchema: { type: "object", nullable: true }, // Recursive
  objectSchema: { type: "object", nullable: true }, // Recursive
  description: { type: "string", default: "" },
};

/**
 * CRUD PROMPT INSTRUCTIONS - Prompts for each CRUD operation
 * @typedef {Object} CRUDPromptInstructions
 * @property {string} create - Instructions for creating entries
 * @property {string} read - Instructions for reading/retrieving entries
 * @property {string} update - Instructions for updating entries
 * @property {string} delete - Instructions for deleting entries
 */
const CRUDPromptInstructionsSchema = {
  create: { type: "string", default: "" },
  read: { type: "string", default: "" },
  update: { type: "string", default: "" },
  delete: { type: "string", default: "" },
};

/**
 * STORE SCHEMA - Complete schema definition for a data store
 * @typedef {Object} StoreSchema
 * @property {string} id - Store identifier
 * @property {string} name - Display name
 * @property {string} description - Store description
 * @property {string} icon - Icon/emoji
 * @property {Object<string, FieldDefinition>} fields - Field definitions
 * @property {string[]} requiredFields - List of required field names
 * @property {string} primaryKey - Field used as primary key (usually 'id')
 * @property {string[]} indexFields - Fields to index for search
 * @property {CRUDPromptInstructions} promptInstructions - CRUD prompts
 * @property {Object} validationRules - Custom validation rules
 */
const StoreSchemaSchema = {
  id: { type: "string", required: true },
  name: { type: "string", required: true },
  description: { type: "string", default: "" },
  icon: { type: "string", default: "📦" },
  fields: { type: "object", default: {} },
  requiredFields: { type: "array", items: { type: "string" }, default: [] },
  primaryKey: { type: "string", default: "id" },
  indexFields: { type: "array", items: { type: "string" }, default: [] },
  promptInstructions: { type: "object", schema: CRUDPromptInstructionsSchema },
  validationRules: { type: "object", default: {} },
};

/**
 * CURATION ACTION - A single step in a CRUD pipeline
 * @typedef {Object} CurationAction
 * @property {string} id - Action identifier
 * @property {string} name - Display name
 * @property {string} description - What this action does
 * @property {string} positionId - Which curation position executes this
 * @property {string} promptTemplate - The prompt template for this action
 * @property {Object} inputMapping - How to map inputs to this action
 * @property {Object} outputMapping - How to map outputs from this action
 * @property {Object} validation - Validation rules for output
 */
const CurationActionSchema = {
  id: { type: "string", required: true },
  name: { type: "string", required: true },
  description: { type: "string", default: "" },
  positionId: { type: "string", required: true },
  promptTemplate: { type: "string", default: "" },
  inputMapping: { type: "object", default: {} },
  outputMapping: { type: "object", default: {} },
  validation: { type: "object", default: {} },
};

/**
 * CRUD PIPELINE - Pipeline definition for a CRUD operation
 * @typedef {Object} CRUDPipeline
 * @property {string} id - Pipeline identifier
 * @property {string} storeId - Which store this operates on
 * @property {'create'|'read'|'update'|'delete'} operation - CRUD operation type
 * @property {string} name - Display name
 * @property {string} description - Pipeline description
 * @property {CurationAction[]} actions - Ordered list of actions
 * @property {Object} inputSchema - Expected input structure
 * @property {Object} outputSchema - Expected output structure
 */
const CRUDPipelineSchema = {
  id: { type: "string", required: true },
  storeId: { type: "string", required: true },
  operation: {
    type: "enum",
    values: ["create", "read", "update", "delete"],
    required: true,
  },
  name: { type: "string", required: true },
  description: { type: "string", default: "" },
  actions: {
    type: "array",
    items: { type: "object", schema: CurationActionSchema },
    default: [],
  },
  inputSchema: { type: "object", default: {} },
  outputSchema: { type: "object", default: {} },
};

/**
 * RAG PIPELINE - Pipeline for retrieval operations
 * @typedef {Object} RAGPipeline
 * @property {string} id - Pipeline identifier
 * @property {string} name - Display name
 * @property {string} description - Pipeline description
 * @property {string[]} targetStores - Which stores to query
 * @property {CurationAction[]} actions - Pipeline actions (search, rank, format)
 * @property {Object} inputSchema - Expected query structure
 * @property {Object} outputSchema - Expected result structure
 * @property {boolean} canTriggerFromPipeline - Can be called from editorial pipeline
 * @property {boolean} canTriggerManually - Can be called manually
 */
const RAGPipelineSchema = {
  id: { type: "string", required: true },
  name: { type: "string", required: true },
  description: { type: "string", default: "" },
  targetStores: { type: "array", items: { type: "string" }, default: [] },
  actions: {
    type: "array",
    items: { type: "object", schema: CurationActionSchema },
    default: [],
  },
  inputSchema: { type: "object", default: {} },
  outputSchema: { type: "object", default: {} },
  canTriggerFromPipeline: { type: "boolean", default: true },
  canTriggerManually: { type: "boolean", default: true },
};

/**
 * CURATION SYSTEM - Complete curation system configuration
 * @typedef {Object} CurationSystem
 * @property {Agent[]} agents - Curation-specific agents
 * @property {Team} team - The curation team (fixed structure)
 * @property {Position[]} positions - Curation positions (fixed roles)
 * @property {StoreSchema[]} storeSchemas - Schemas for all data stores
 * @property {CRUDPipeline[]} crudPipelines - CRUD operation pipelines
 * @property {RAGPipeline[]} ragPipelines - RAG retrieval pipelines
 */
const CurationSystemSchema = {
  agents: {
    type: "array",
    items: { type: "object", schema: AgentSchema },
    default: [],
  },
  team: { type: "object", schema: TeamSchema },
  positions: {
    type: "array",
    items: { type: "object", schema: PositionSchema },
    default: [],
  },
  storeSchemas: {
    type: "array",
    items: { type: "object", schema: StoreSchemaSchema },
    default: [],
  },
  crudPipelines: {
    type: "array",
    items: { type: "object", schema: CRUDPipelineSchema },
    default: [],
  },
  ragPipelines: {
    type: "array",
    items: { type: "object", schema: RAGPipelineSchema },
    default: [],
  },
};

/**
 * Default curation positions (fixed structure)
 */
const DefaultCurationPositions = [
  { id: "archivist", name: "Archivist", tier: "leader", isMandatory: true },
  {
    id: "story_topologist",
    name: "Story Topologist",
    tier: "member",
    isMandatory: true,
  },
  {
    id: "lore_topologist",
    name: "Lore Topologist",
    tier: "member",
    isMandatory: true,
  },
  {
    id: "character_topologist",
    name: "Character Topologist",
    tier: "member",
    isMandatory: true,
  },
  {
    id: "scene_topologist",
    name: "Scene Topologist",
    tier: "member",
    isMandatory: true,
  },
  {
    id: "location_topologist",
    name: "Location Topologist",
    tier: "member",
    isMandatory: true,
  },
];

// =============================================================================
// RESPONSE PIPELINE SYSTEM SCHEMAS
// =============================================================================

/**
 * TRIGGER - Defines when an async action should execute
 * @typedef {Object} Trigger
 * @property {'sequential'|'await'|'on'|'immediate'} type - Trigger type
 * @property {string} targetActionId - Action to wait for (if await/on)
 * @property {string} targetState - Lifecycle state to wait for
 */
const TriggerSchema = {
  type: {
    type: "enum",
    values: ["sequential", "await", "on", "immediate"],
    default: "sequential",
  },
  targetActionId: { type: "string", default: "" },
  targetState: {
    type: "enum",
    values: ["called", "start", "in_progress", "complete", "respond"],
    default: "complete",
  },
};

/**
 * ACTION EXECUTION CONFIG - How an action executes
 * @typedef {Object} ActionExecutionConfig
 * @property {'sync'|'async'} mode - Execution mode
 * @property {Trigger} trigger - When to execute (for async)
 * @property {number} timeout - Timeout in milliseconds
 * @property {number} retryCount - Number of retries on failure
 */
const ActionExecutionConfigSchema = {
  mode: { type: "enum", values: ["sync", "async"], default: "sync" },
  trigger: { type: "object", schema: TriggerSchema },
  timeout: { type: "number", default: 60000 },
  retryCount: { type: "number", default: 0 },
};

/**
 * ACTION PARTICIPANTS - Who participates in an action
 * @typedef {Object} ActionParticipants
 * @property {string[]} positionIds - Specific positions to include
 * @property {string[]} teamIds - Include all positions from these teams
 * @property {'sequential'|'parallel'|'round_robin'|'consensus'} orchestration - How participants interact
 * @property {number} maxRounds - Max rounds for round_robin/consensus
 */
const ActionParticipantsSchema = {
  positionIds: { type: "array", items: { type: "string" }, default: [] },
  teamIds: { type: "array", items: { type: "string" }, default: [] },
  orchestration: {
    type: "enum",
    values: ["sequential", "parallel", "round_robin", "consensus"],
    default: "sequential",
  },
  maxRounds: { type: "number", default: 3 },
};

/**
 * THREAD CONFIG - Configuration for a thread
 * @typedef {Object} ThreadConfig
 * @property {boolean} enabled - Whether this thread is active
 * @property {string} firstMessage - First message template (supports tokens)
 * @property {number} maxMessages - Maximum messages to retain
 */
const ThreadConfigSchema = {
  enabled: { type: "boolean", default: true },
  firstMessage: { type: "string", default: "" },
  maxMessages: { type: "number", default: 100 },
};

/**
 * ACTION THREADS - Thread configuration for an action
 * @typedef {Object} ActionThreads
 * @property {ThreadConfig} actionThread - Global action thread
 * @property {Object<string, ThreadConfig>} teamTaskThreads - Per-team task threads
 */
const ActionThreadsSchema = {
  actionThread: { type: "object", schema: ThreadConfigSchema },
  teamTaskThreads: { type: "object", default: {} }, // { teamId: ThreadConfig }
};

/**
 * INPUT CONFIG - Where an action gets its input
 * @typedef {Object} InputConfig
 * @property {'phaseInput'|'previousAction'|'global'|'store'|'custom'} source - Input source
 * @property {string} sourceKey - Key/ID of the source (e.g., action ID, global var name)
 * @property {string} transform - Optional transformation template
 */
const InputConfigSchema = {
  source: {
    type: "enum",
    values: ["phaseInput", "previousAction", "global", "store", "custom"],
    default: "phaseInput",
  },
  sourceKey: { type: "string", default: "" },
  transform: { type: "string", default: "" },
};

/**
 * OUTPUT CONFIG - Where an action sends its output
 * @typedef {Object} OutputConfig
 * @property {'phaseOutput'|'teamOutput'|'global'|'store'|'nextAction'} target - Output target
 * @property {string} targetKey - Key/ID of the target
 * @property {boolean} append - Whether to append (vs replace) for arrays
 */
const OutputConfigSchema = {
  target: {
    type: "enum",
    values: ["phaseOutput", "teamOutput", "global", "store", "nextAction"],
    default: "phaseOutput",
  },
  targetKey: { type: "string", default: "" },
  append: { type: "boolean", default: false },
};

/**
 * CONTEXT OVERRIDE - Action-specific context modifications
 * @typedef {Object} ContextOverride
 * @property {string[]} include - Additional context keys to include
 * @property {string[]} exclude - Context keys to exclude
 * @property {string[]} priority - Context keys to prioritize (inject first)
 */
const ContextOverrideSchema = {
  include: { type: "array", items: { type: "string" }, default: [] },
  exclude: { type: "array", items: { type: "string" }, default: [] },
  priority: { type: "array", items: { type: "string" }, default: [] },
};

/**
 * RAG TRIGGER - Configuration for triggering a RAG pipeline from an action
 * @typedef {Object} RAGTrigger
 * @property {boolean} enabled - Whether RAG is triggered
 * @property {string} ragPipelineId - Which RAG pipeline to run
 * @property {string} queryTemplate - Template for the RAG query (supports tokens)
 * @property {string} resultTarget - Where to put RAG results ('actionRagThread'|'context')
 */
const RAGTriggerSchema = {
  enabled: { type: "boolean", default: false },
  ragPipelineId: { type: "string", default: "" },
  queryTemplate: { type: "string", default: "" },
  resultTarget: {
    type: "enum",
    values: ["actionRagThread", "context"],
    default: "context",
  },
};

/**
 * ACTION - A single unit of work within a phase
 * @typedef {Object} Action
 * @property {string} id - Unique identifier
 * @property {string} name - Display name
 * @property {string} description - What this action does
 * @property {ActionExecutionConfig} execution - Execution configuration
 * @property {ActionParticipants} participants - Who participates
 * @property {ActionThreads} threads - Thread configuration
 * @property {InputConfig} input - Input configuration
 * @property {OutputConfig} output - Output configuration
 * @property {ContextOverride} contextOverrides - Context modifications
 * @property {RAGTrigger} rag - RAG trigger configuration
 * @property {string} promptTemplate - Main prompt template for this action
 * @property {number} displayOrder - Order in UI
 */
const ActionSchema = {
  id: { type: "string", required: true },
  name: { type: "string", required: true },
  description: { type: "string", default: "" },
  execution: { type: "object", schema: ActionExecutionConfigSchema },
  participants: { type: "object", schema: ActionParticipantsSchema },
  threads: { type: "object", schema: ActionThreadsSchema },
  input: { type: "object", schema: InputConfigSchema },
  output: { type: "object", schema: OutputConfigSchema },
  contextOverrides: { type: "object", schema: ContextOverrideSchema },
  rag: { type: "object", schema: RAGTriggerSchema },
  promptTemplate: { type: "string", default: "" },
  displayOrder: { type: "number", default: 0 },
};

/**
 * PHASE THREADS - Thread configuration for a phase
 * @typedef {Object} PhaseThreads
 * @property {ThreadConfig} phaseThread - Global phase thread (leaders+ only)
 * @property {Object<string, ThreadConfig>} teamThreads - Per-team threads
 */
const PhaseThreadsSchema = {
  phaseThread: { type: "object", schema: ThreadConfigSchema },
  teamThreads: { type: "object", default: {} }, // { teamId: ThreadConfig }
};

/**
 * PHASE CONTEXT CONFIG - What context is available in a phase
 * @typedef {Object} PhaseContextConfig
 * @property {string[]} static - Static context keys to inject
 * @property {string[]} global - Global context keys to inject
 * @property {string[]} phase - Phase context keys from previous phases
 * @property {string[]} team - Team context keys
 * @property {string[]} stores - Store keys to include
 */
const PhaseContextConfigSchema = {
  static: { type: "array", items: { type: "string" }, default: [] },
  global: { type: "array", items: { type: "string" }, default: [] },
  phase: { type: "array", items: { type: "string" }, default: [] },
  team: { type: "array", items: { type: "string" }, default: [] },
  stores: { type: "array", items: { type: "string" }, default: [] },
};

/**
 * PHASE OUTPUT CONFIG - Where phase outputs go
 * @typedef {Object} PhaseOutputConfig
 * @property {OutputConfig} phaseOutput - Main phase output (max one)
 * @property {Object<string, OutputConfig>} teamOutputs - Per-team outputs
 * @property {'last_action'|'synthesize'|'user_gavel'|'merge'|'designated'} consolidation - How to consolidate multiple outputs
 * @property {string} consolidationActionId - Action ID for 'designated' consolidation
 */
const PhaseOutputConfigSchema = {
  phaseOutput: { type: "object", schema: OutputConfigSchema },
  teamOutputs: { type: "object", default: {} }, // { teamId: OutputConfig }
  consolidation: {
    type: "enum",
    values: ["last_action", "synthesize", "user_gavel", "merge", "designated"],
    default: "last_action",
  },
  consolidationActionId: { type: "string", default: "" },
};

/**
 * GAVEL CONFIG - User review configuration
 * @typedef {Object} GavelConfig
 * @property {boolean} enabled - Whether gavel is enabled for this phase
 * @property {string} prompt - Prompt to show user in gavel modal
 * @property {string[]} editableFields - Which fields the user can edit
 * @property {boolean} canSkip - Whether user can skip without editing
 */
const GavelConfigSchema = {
  enabled: { type: "boolean", default: false },
  prompt: { type: "string", default: "Review and edit if needed:" },
  editableFields: {
    type: "array",
    items: { type: "string" },
    default: ["output"],
  },
  canSkip: { type: "boolean", default: true },
};

/**
 * PHASE - A stage in the pipeline containing actions
 * @typedef {Object} Phase
 * @property {string} id - Unique identifier
 * @property {string} name - Display name
 * @property {string} description - Phase description
 * @property {string} icon - Icon/emoji
 * @property {string[]} teams - Active teams in this phase
 * @property {PhaseThreads} threads - Thread configuration
 * @property {PhaseContextConfig} context - Context configuration
 * @property {Action[]} actions - Actions in this phase
 * @property {PhaseOutputConfig} output - Output configuration
 * @property {GavelConfig} gavel - User review configuration
 * @property {Object} constants - Phase-scoped constants
 * @property {Object} variables - Phase-scoped variables (initial values)
 * @property {number} displayOrder - Order in pipeline
 */
const PhaseSchema = {
  id: { type: "string", required: true },
  name: { type: "string", required: true },
  description: { type: "string", default: "" },
  icon: { type: "string", default: "📋" },
  teams: { type: "array", items: { type: "string" }, default: [] },
  threads: { type: "object", schema: PhaseThreadsSchema },
  context: { type: "object", schema: PhaseContextConfigSchema },
  actions: {
    type: "array",
    items: { type: "object", schema: ActionSchema },
    default: [],
  },
  output: { type: "object", schema: PhaseOutputConfigSchema },
  gavel: { type: "object", schema: GavelConfigSchema },
  constants: { type: "object", default: {} },
  variables: { type: "object", default: {} },
  displayOrder: { type: "number", default: 0 },
};

/**
 * PIPELINE GLOBALS - Default global variables for a pipeline
 * @typedef {Object} PipelineGlobals
 * @property {string} instructions - Interpreted user instructions
 * @property {string} outlineDraft - Working outline draft
 * @property {string} finalOutline - Finalized outline
 * @property {string} firstDraft - First draft of response
 * @property {string} secondDraft - Second draft of response
 * @property {string} finalDraft - Final response draft
 * @property {string} commentary - Agent commentary
 * @property {Object} custom - User-defined custom globals
 */
const PipelineGlobalsSchema = {
  instructions: { type: "string", default: "" },
  outlineDraft: { type: "string", default: "" },
  finalOutline: { type: "string", default: "" },
  firstDraft: { type: "string", default: "" },
  secondDraft: { type: "string", default: "" },
  finalDraft: { type: "string", default: "" },
  commentary: { type: "string", default: "" },
  custom: { type: "object", default: {} },
};

/**
 * STATIC CONTEXT CONFIG - Context that never changes during a run
 * @typedef {Object} StaticContextConfig
 * @property {boolean} includeCharacterCard - Include ST character card
 * @property {boolean} includeWorldInfo - Include ST world info
 * @property {boolean} includePersona - Include user persona
 * @property {boolean} includeScenario - Include scenario
 * @property {Object<string, string>} custom - Custom static context entries
 */
const StaticContextConfigSchema = {
  includeCharacterCard: { type: "boolean", default: true },
  includeWorldInfo: { type: "boolean", default: true },
  includePersona: { type: "boolean", default: true },
  includeScenario: { type: "boolean", default: true },
  custom: { type: "object", default: {} },
};

/**
 * PIPELINE - The complete pipeline definition
 * @typedef {Object} Pipeline
 * @property {string} id - Unique identifier
 * @property {string} name - Display name
 * @property {string} description - Pipeline description
 * @property {string} version - Version string
 * @property {StaticContextConfig} staticContext - Static context configuration
 * @property {PipelineGlobals} globals - Default global variables
 * @property {Object} constants - Pipeline-scoped constants
 * @property {Phase[]} phases - Pipeline phases
 * @property {Object} metadata - Additional metadata
 */
const PipelineSchema = {
  id: { type: "string", required: true },
  name: { type: "string", required: true },
  description: { type: "string", default: "" },
  version: { type: "string", default: "1.0.0" },
  staticContext: { type: "object", schema: StaticContextConfigSchema },
  globals: { type: "object", schema: PipelineGlobalsSchema },
  constants: { type: "object", default: {} },
  phases: {
    type: "array",
    items: { type: "object", schema: PhaseSchema },
    default: [],
  },
  metadata: {
    type: "object",
    schema: {
      createdAt: { type: "number" },
      updatedAt: { type: "number" },
      author: { type: "string", default: "" },
      tags: { type: "array", items: { type: "string" }, default: [] },
    },
  },
};

// =============================================================================
// DEFAULT STORE SCHEMAS
// =============================================================================

/**
 * Default schemas for persistent data stores
 */
const DefaultStoreSchemas = {
  storyDraft: {
    id: "storyDraft",
    name: "Story Draft",
    description: "Current working draft of the story so far",
    icon: "📝",
    fields: {
      content: {
        name: "content",
        type: "string",
        required: true,
        description: "The draft text",
      },
      updatedAt: {
        name: "updatedAt",
        type: "date",
        description: "Last update time",
      },
    },
    primaryKey: null, // Single object, not a collection
  },

  storyOutline: {
    id: "storyOutline",
    name: "Story Outline",
    description: "Current outline of the story structure",
    icon: "📋",
    fields: {
      content: { name: "content", type: "string", required: true },
      updatedAt: { name: "updatedAt", type: "date" },
    },
    primaryKey: null,
  },

  storySynopsis: {
    id: "storySynopsis",
    name: "Story Synopsis",
    description: "Detailed synopsis using 5 W's and How",
    icon: "📖",
    fields: {
      who: { name: "who", type: "string", description: "Who is involved" },
      what: { name: "what", type: "string", description: "What is happening" },
      when: {
        name: "when",
        type: "string",
        description: "When it takes place",
      },
      where: {
        name: "where",
        type: "string",
        description: "Where it takes place",
      },
      why: { name: "why", type: "string", description: "Why it is happening" },
      how: { name: "how", type: "string", description: "How it unfolds" },
      summary: {
        name: "summary",
        type: "string",
        description: "Overall summary",
      },
      updatedAt: { name: "updatedAt", type: "date" },
    },
    primaryKey: null,
  },

  plotLines: {
    id: "plotLines",
    name: "Plot Lines",
    description: "Chronological plot line details and tracker",
    icon: "📈",
    fields: {
      id: { name: "id", type: "string", required: true },
      name: { name: "name", type: "string", required: true },
      description: { name: "description", type: "string" },
      status: {
        name: "status",
        type: "enum",
        enumValues: ["active", "resolved", "inactive", "stalled"],
        default: "active",
      },
      type: {
        name: "type",
        type: "enum",
        enumValues: ["main", "subplot", "background"],
        default: "subplot",
      },
      startedAt: {
        name: "startedAt",
        type: "string",
        description: "When this plot started (in-story)",
      },
      resolvedAt: {
        name: "resolvedAt",
        type: "string",
        description: "When this plot resolved (in-story)",
      },
      relatedCharacters: {
        name: "relatedCharacters",
        type: "array",
        items: { type: "string" },
      },
      relatedLocations: {
        name: "relatedLocations",
        type: "array",
        items: { type: "string" },
      },
      timeline: {
        name: "timeline",
        type: "array",
        items: { type: "object" },
        description: "Key events in this plot",
      },
      tension: {
        name: "tension",
        type: "number",
        min: 0,
        max: 10,
        description: "Current tension level",
      },
    },
    primaryKey: "id",
    indexFields: ["name", "status", "type"],
  },

  scenes: {
    id: "scenes",
    name: "Scenes",
    description: "Chronological scene details and tracker",
    icon: "🎬",
    fields: {
      id: { name: "id", type: "string", required: true },
      number: { name: "number", type: "number", required: true },
      title: { name: "title", type: "string" },
      summary: { name: "summary", type: "string" },
      timeInStory: {
        name: "timeInStory",
        type: "string",
        description: "In-story time",
      },
      weather: { name: "weather", type: "string" },
      location: { name: "location", type: "string" },
      characters: {
        name: "characters",
        type: "array",
        items: { type: "string" },
      },
      props: { name: "props", type: "array", items: { type: "string" } },
      environmentDetails: { name: "environmentDetails", type: "string" },
      mood: { name: "mood", type: "string" },
      tension: { name: "tension", type: "number", min: 0, max: 10 },
      timestamp: {
        name: "timestamp",
        type: "date",
        description: "Real-world creation time",
      },
    },
    primaryKey: "id",
    indexFields: ["number", "location", "characters"],
  },

  dialogueHistory: {
    id: "dialogueHistory",
    name: "Dialogue History",
    description: "Complete chronological in-character dialogue history",
    icon: "💬",
    fields: {
      id: { name: "id", type: "string", required: true },
      sceneId: { name: "sceneId", type: "string" },
      speaker: { name: "speaker", type: "string", required: true },
      dialogue: { name: "dialogue", type: "string", required: true },
      subtext: {
        name: "subtext",
        type: "string",
        description: "Underlying meaning/emotion",
      },
      timeInStory: { name: "timeInStory", type: "string" },
      timestamp: { name: "timestamp", type: "date" },
    },
    primaryKey: "id",
    indexFields: ["speaker", "sceneId"],
  },

  characterSheets: {
    id: "characterSheets",
    name: "Character Sheets",
    description: "Detailed character sheets for all characters",
    icon: "👤",
    fields: {
      id: { name: "id", type: "string", required: true },
      name: { name: "name", type: "string", required: true },
      type: {
        name: "type",
        type: "enum",
        enumValues: [
          "main",
          "main_cast",
          "recurring",
          "recurring_cast",
          "supporting",
          "supporting_cast",
          "minor",
          "background",
          "npc",
        ],
        default: "supporting_cast",
        description:
          "Character importance: main_cast (protagonists), recurring_cast (regular appearances), supporting_cast (occasional), background (extras/NPCs)",
      },
      description: { name: "description", type: "string" },
      personality: { name: "personality", type: "string" },
      appearance: { name: "appearance", type: "string" },
      background: { name: "background", type: "string" },
      motivations: {
        name: "motivations",
        type: "array",
        items: { type: "string" },
      },
      fears: { name: "fears", type: "array", items: { type: "string" } },
      relationships: {
        name: "relationships",
        type: "object",
        description: "Map of characterId to relationship",
      },
      skills: { name: "skills", type: "array", items: { type: "string" } },
      flaws: { name: "flaws", type: "array", items: { type: "string" } },
      speechPatterns: { name: "speechPatterns", type: "string" },
      isPresent: { name: "isPresent", type: "boolean", default: true },
      // Character System integration fields
      voicingGuidance: {
        name: "voicingGuidance",
        type: "string",
        description:
          "Additional guidance for voicing this character in dialogue",
      },
      mannerisms: {
        name: "mannerisms",
        type: "array",
        items: { type: "string" },
        description: "Distinctive mannerisms, gestures, or habits",
      },
      catchphrases: {
        name: "catchphrases",
        type: "array",
        items: { type: "string" },
        description: "Signature phrases or expressions the character uses",
      },
      createdAt: { name: "createdAt", type: "date" },
      updatedAt: { name: "updatedAt", type: "date" },
    },
    primaryKey: "id",
    indexFields: ["name", "type", "isPresent"],
  },

  characterDevelopment: {
    id: "characterDevelopment",
    name: "Character Development",
    description: "Chronological character development tracker",
    icon: "📊",
    fields: {
      characterId: { name: "characterId", type: "string", required: true },
      arc: {
        name: "arc",
        type: "string",
        description: "Character arc description",
      },
      currentState: {
        name: "currentState",
        type: "string",
        description: "Current emotional/development state",
      },
      milestones: {
        name: "milestones",
        type: "array",
        items: { type: "object" },
      },
      changes: {
        name: "changes",
        type: "array",
        items: { type: "object" },
        description: "Record of changes over time",
      },
    },
    primaryKey: "characterId",
  },

  characterInventory: {
    id: "characterInventory",
    name: "Character Inventory",
    description: "Items and possessions for all characters",
    icon: "🎒",
    fields: {
      characterId: { name: "characterId", type: "string", required: true },
      items: { name: "items", type: "array", items: { type: "object" } },
    },
    primaryKey: "characterId",
  },

  characterPositions: {
    id: "characterPositions",
    name: "Character Positions",
    description: "Current location and position history for characters",
    icon: "📍",
    fields: {
      characterId: { name: "characterId", type: "string", required: true },
      currentLocation: { name: "currentLocation", type: "string" },
      currentActivity: { name: "currentActivity", type: "string" },
      history: { name: "history", type: "array", items: { type: "object" } },
    },
    primaryKey: "characterId",
  },

  factionSheets: {
    id: "factionSheets",
    name: "Faction Sheets",
    description: "Detailed faction/organization sheets",
    icon: "🏛️",
    fields: {
      id: { name: "id", type: "string", required: true },
      name: { name: "name", type: "string", required: true },
      description: { name: "description", type: "string" },
      goals: { name: "goals", type: "array", items: { type: "string" } },
      members: { name: "members", type: "array", items: { type: "string" } },
      allies: { name: "allies", type: "array", items: { type: "string" } },
      enemies: { name: "enemies", type: "array", items: { type: "string" } },
      territory: { name: "territory", type: "string" },
      resources: {
        name: "resources",
        type: "array",
        items: { type: "string" },
      },
      createdAt: { name: "createdAt", type: "date" },
      updatedAt: { name: "updatedAt", type: "date" },
    },
    primaryKey: "id",
    indexFields: ["name"],
  },

  locationSheets: {
    id: "locationSheets",
    name: "Location Sheets",
    description: "Detailed location/setting sheets",
    icon: "🗺️",
    fields: {
      id: { name: "id", type: "string", required: true },
      name: { name: "name", type: "string", required: true },
      type: {
        name: "type",
        type: "enum",
        enumValues: ["interior", "exterior", "mixed"],
        default: "mixed",
      },
      description: { name: "description", type: "string" },
      features: { name: "features", type: "array", items: { type: "string" } },
      connections: {
        name: "connections",
        type: "array",
        items: { type: "string" },
        description: "Connected locations",
      },
      atmosphere: { name: "atmosphere", type: "string" },
      history: { name: "history", type: "string" },
      createdAt: { name: "createdAt", type: "date" },
      updatedAt: { name: "updatedAt", type: "date" },
    },
    primaryKey: "id",
    indexFields: ["name", "type"],
  },

  currentSituation: {
    id: "currentSituation",
    name: "Current Situation",
    description: "Current story situation using 5 W's and How",
    icon: "📌",
    fields: {
      who: { name: "who", type: "string" },
      what: { name: "what", type: "string" },
      when: { name: "when", type: "string" },
      where: { name: "where", type: "string" },
      why: { name: "why", type: "string" },
      how: { name: "how", type: "string" },
      summary: { name: "summary", type: "string" },
      updatedAt: { name: "updatedAt", type: "date" },
    },
    primaryKey: null,
  },

  agentCommentary: {
    id: "agentCommentary",
    name: "Agent Commentary",
    description: "Archived commentary from agents",
    icon: "💭",
    fields: {
      id: { name: "id", type: "string", required: true },
      agentId: { name: "agentId", type: "string", required: true },
      positionId: { name: "positionId", type: "string" },
      phaseId: { name: "phaseId", type: "string" },
      content: { name: "content", type: "string", required: true },
      timestamp: { name: "timestamp", type: "date" },
    },
    primaryKey: "id",
    indexFields: ["agentId", "phaseId"],
  },
};

// =============================================================================
// DEFAULT HIERARCHY (Mandatory Positions)
// =============================================================================

/**
 * Default mandatory positions that must exist in the hierarchy
 */
const MandatoryPositions = [
  {
    id: "publisher",
    name: "Publisher",
    tier: "executive",
    isMandatory: true,
    promptModifiers: {
      prefix: "",
      suffix: "",
      roleDescription:
        "The Publisher oversees the entire creative operation, ensuring the final output meets quality standards and aligns with the user's vision.",
    },
  },
];

// =============================================================================
// EXPORTS
// =============================================================================

const SystemSchemas = {
  // Common Types
  TokenTypes,
  PhaseLifecycle,
  ActionLifecycle,
  ExecutionMode,
  TriggerType,
  OrchestrationMode,
  OutputConsolidation,
  ContextBlockType,
  PositionTier,

  // Agent System Schemas
  ReasoningConfigSchema,
  ApiConfigSchema,
  SystemPromptConfigSchema,
  AgentSchema,
  AgentPoolSchema,
  PositionPromptModifiersSchema,
  PositionSchema,
  TeamSettingsSchema,
  TeamSchema,
  HierarchySchema,

  // Curation System Schemas
  FieldDefinitionSchema,
  CRUDPromptInstructionsSchema,
  StoreSchemaSchema,
  CurationActionSchema,
  CRUDPipelineSchema,
  RAGPipelineSchema,
  CurationSystemSchema,
  DefaultCurationPositions,

  // Response Pipeline System Schemas
  TriggerSchema,
  ActionExecutionConfigSchema,
  ActionParticipantsSchema,
  ThreadConfigSchema,
  ActionThreadsSchema,
  InputConfigSchema,
  OutputConfigSchema,
  ContextOverrideSchema,
  RAGTriggerSchema,
  ActionSchema,
  PhaseThreadsSchema,
  PhaseContextConfigSchema,
  PhaseOutputConfigSchema,
  GavelConfigSchema,
  PhaseSchema,
  PipelineGlobalsSchema,
  StaticContextConfigSchema,
  PipelineSchema,

  // Defaults
  DefaultStoreSchemas,
  MandatoryPositions,
};

// Export for different environments
if (typeof window !== "undefined") {
  window.SystemSchemas = SystemSchemas;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = SystemSchemas;
}
