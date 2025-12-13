/**
 * TheCouncil - System Configuration Schemas
 *
 * Defines per-system configuration schemas for:
 * - Curation System
 * - Character System
 * - Prompt Builder System
 * - Pipeline Builder System
 * - Orchestration System
 * - Kernel (global configuration)
 *
 * These schemas enable:
 * - Per-system configuration management
 * - Import/export of system configs
 * - Auto-detection of config types
 * - Schema validation
 *
 * @version 1.0.0
 */

// =============================================================================
// COMMON SUB-SCHEMAS
// =============================================================================

/**
 * Version field schema - common to all system configs
 */
const VersionFieldSchema = {
  type: "string",
  required: true,
  pattern: "^\\d+\\.\\d+\\.\\d+(-[a-zA-Z0-9]+)?$",
  description: "Semantic version string (e.g., '2.0.0', '2.1.0-alpha')",
};

/**
 * Timestamp field schema
 */
const TimestampFieldSchema = {
  type: "number",
  description: "Unix timestamp in milliseconds",
};

/**
 * Metadata schema - common to exportable configs
 */
const MetadataSchema = {
  createdAt: TimestampFieldSchema,
  updatedAt: TimestampFieldSchema,
  author: { type: "string", default: "" },
  description: { type: "string", default: "" },
  tags: { type: "array", items: { type: "string" }, default: [] },
};

// =============================================================================
// CURATION SYSTEM CONFIG SCHEMAS
// =============================================================================

/**
 * Topologist position mapping - maps positions to store responsibilities
 */
const TopologistPositionMappingSchema = {
  storyTopologist: { type: "array", items: { type: "string" }, default: ["storyDraft", "storyOutline", "storySynopsis", "plotLines", "scenes"] },
  characterTopologist: { type: "array", items: { type: "string" }, default: ["characterSheets", "characterDevelopment", "characterInventory", "characterPositions"] },
  loreTopologist: { type: "array", items: { type: "string" }, default: ["factionSheets", "locationSheets"] },
  sceneTopologist: { type: "array", items: { type: "string" }, default: ["scenes", "dialogueHistory", "currentSituation"] },
  locationTopologist: { type: "array", items: { type: "string" }, default: ["locationSheets"] },
};

/**
 * Curation execution settings
 */
const CurationExecutionSettingsSchema = {
  maxDeliberationRounds: { type: "number", default: 3, min: 1, max: 10 },
  deliberationTimeout: { type: "number", default: 30000, min: 5000 },
  autoSaveInterval: { type: "number", default: 60000, min: 0 },
  enableAutoExtraction: { type: "boolean", default: false },
  extractionTriggers: { type: "array", items: { type: "string" }, default: ["after_response", "on_demand"] },
};

/**
 * CURATION SYSTEM CONFIGURATION SCHEMA
 */
const CurationConfigSchema = {
  // Required version
  version: VersionFieldSchema,

  // Store schemas - defines the structure of each data store
  storeSchemas: {
    type: "array",
    items: {
      type: "object",
      schema: {
        id: { type: "string", required: true },
        name: { type: "string", required: true },
        description: { type: "string", default: "" },
        icon: { type: "string", default: "📦" },
        fields: { type: "object", required: true },
        primaryKey: { type: "string", nullable: true },
        indexFields: { type: "array", items: { type: "string" }, default: [] },
      },
    },
    default: [],
    description: "Data store schema definitions",
  },

  // CRUD pipelines - pipelines for create/read/update/delete operations
  crudPipelines: {
    type: "array",
    items: {
      type: "object",
      schema: {
        id: { type: "string", required: true },
        storeId: { type: "string", required: true },
        name: { type: "string", required: true },
        description: { type: "string", default: "" },
        operations: { type: "object", required: true },
      },
    },
    default: [],
    description: "CRUD operation pipelines",
  },

  // RAG pipelines - retrieval augmented generation pipelines
  ragPipelines: {
    type: "array",
    items: {
      type: "object",
      schema: {
        id: { type: "string", required: true },
        name: { type: "string", required: true },
        description: { type: "string", default: "" },
        targetStores: { type: "array", items: { type: "string" }, required: true },
        actions: { type: "array", items: { type: "object" }, default: [] },
        canTriggerFromPipeline: { type: "boolean", default: true },
        canTriggerManually: { type: "boolean", default: true },
      },
    },
    default: [],
    description: "RAG retrieval pipelines",
  },

  // Curation agents (Topologists)
  agents: {
    type: "array",
    items: {
      type: "object",
      schema: {
        id: { type: "string", required: true },
        name: { type: "string", required: true },
        description: { type: "string", default: "" },
        apiConfig: { type: "object" },
        systemPrompt: { type: "object" },
        reasoning: { type: "object" },
      },
    },
    default: [],
    description: "Curation agent configurations (Topologists)",
  },

  // Curation positions
  positions: {
    type: "array",
    items: {
      type: "object",
      schema: {
        id: { type: "string", required: true },
        name: { type: "string", required: true },
        tier: { type: "enum", values: ["leader", "member"], default: "member" },
        assignedAgentId: { type: "string", nullable: true },
        isMandatory: { type: "boolean", default: false },
      },
    },
    default: [],
    description: "Curation team positions",
  },

  // Position to store mapping
  positionMapping: {
    type: "object",
    schema: TopologistPositionMappingSchema,
    description: "Maps topologist positions to their responsible stores",
  },

  // Execution settings
  executionSettings: {
    type: "object",
    schema: CurationExecutionSettingsSchema,
    description: "Curation pipeline execution settings",
  },

  // Metadata
  metadata: {
    type: "object",
    schema: MetadataSchema,
    description: "Configuration metadata",
  },
};

// =============================================================================
// CHARACTER SYSTEM CONFIG SCHEMAS
// =============================================================================

/**
 * Character Director configuration
 */
const DirectorConfigSchema = {
  enabled: { type: "boolean", default: true },
  autoSpawn: { type: "boolean", default: true, description: "Automatically spawn character agents for scenes" },
  maxActiveCharacters: { type: "number", default: 10, min: 1, max: 50 },
  spawnThreshold: { type: "number", default: 0.5, min: 0, max: 1, description: "Relevance threshold for character spawning" },
  apiConfig: { type: "object", description: "Director agent API configuration override" },
  systemPrompt: { type: "object", description: "Director system prompt configuration" },
};

/**
 * Default voicing settings for character agents
 */
const VoicingDefaultsSchema = {
  includePersonality: { type: "boolean", default: true },
  includeAppearance: { type: "boolean", default: false },
  includeBackground: { type: "boolean", default: true },
  includeSpeechPatterns: { type: "boolean", default: true },
  includeMannerisms: { type: "boolean", default: true },
  includeCatchphrases: { type: "boolean", default: true },
  includeRelationships: { type: "boolean", default: true },
  voiceIntensity: { type: "enum", values: ["subtle", "moderate", "strong"], default: "moderate" },
  promptTemplate: { type: "string", default: "", description: "Custom voicing prompt template" },
};

/**
 * Avatar agent settings
 */
const AvatarSettingsSchema = {
  defaultApiConfig: { type: "object", description: "Default API config for avatar agents" },
  defaultReasoning: {
    type: "object",
    schema: {
      enabled: { type: "boolean", default: false },
      prefix: { type: "string", default: "<thinking>" },
      suffix: { type: "string", default: "</thinking>" },
      hideFromOutput: { type: "boolean", default: true },
    },
  },
  syncOnStartup: { type: "boolean", default: true, description: "Sync with Curation on startup" },
  persistOverrides: { type: "boolean", default: true, description: "Persist user overrides" },
};

/**
 * CHARACTER SYSTEM CONFIGURATION SCHEMA
 */
const CharacterConfigSchema = {
  // Required version
  version: VersionFieldSchema,

  // Character Director configuration
  directorConfig: {
    type: "object",
    schema: DirectorConfigSchema,
    description: "Character Director agent configuration",
  },

  // Default voicing settings
  voicingDefaults: {
    type: "object",
    schema: VoicingDefaultsSchema,
    description: "Default settings for character voicing",
  },

  // Avatar agent settings
  avatarSettings: {
    type: "object",
    schema: AvatarSettingsSchema,
    description: "Settings for character avatar agents",
  },

  // Character agent overrides (keyed by characterId)
  agentOverrides: {
    type: "object",
    default: {},
    description: "Per-character agent configuration overrides",
  },

  // Character type priorities
  typePriorities: {
    type: "object",
    schema: {
      main_cast: { type: "number", default: 1 },
      recurring_cast: { type: "number", default: 2 },
      supporting_cast: { type: "number", default: 3 },
      background: { type: "number", default: 4 },
    },
    description: "Priority order for character types during spawning",
  },

  // Metadata
  metadata: {
    type: "object",
    schema: MetadataSchema,
    description: "Configuration metadata",
  },
};

// =============================================================================
// PROMPT BUILDER SYSTEM CONFIG SCHEMAS
// =============================================================================

/**
 * Token definition schema
 */
const TokenDefinitionSchema = {
  id: { type: "string", required: true },
  name: { type: "string", required: true },
  description: { type: "string", default: "" },
  category: { type: "string", required: true },
  pattern: { type: "string", required: true, description: "Token pattern e.g., '{{custom.myToken}}'" },
  resolver: { type: "string", description: "Resolver function name or inline function string" },
  defaultValue: { type: "string", default: "" },
};

/**
 * Macro definition schema
 */
const MacroSchema = {
  id: { type: "string", required: true },
  name: { type: "string", required: true },
  description: { type: "string", default: "" },
  category: { type: "string", default: "custom" },
  template: { type: "string", required: true, description: "Macro template with {{param}} placeholders" },
  parameters: {
    type: "array",
    items: {
      type: "object",
      schema: {
        name: { type: "string", required: true },
        type: { type: "enum", values: ["string", "number", "boolean"], default: "string" },
        required: { type: "boolean", default: false },
        default: { type: "any" },
        description: { type: "string", default: "" },
      },
    },
    default: [],
  },
};

/**
 * Transform definition schema
 */
const TransformSchema = {
  id: { type: "string", required: true },
  name: { type: "string", required: true },
  description: { type: "string", default: "" },
  handler: { type: "string", description: "Transform function name or inline function string" },
  acceptsArgs: { type: "boolean", default: false },
  argSchema: { type: "object", description: "Schema for transform arguments" },
};

/**
 * Preset prompt schema
 */
const PresetPromptSchema = {
  id: { type: "string", required: true },
  name: { type: "string", required: true },
  description: { type: "string", default: "" },
  category: { type: "string", default: "custom" },
  content: { type: "string", required: true },
  tags: { type: "array", items: { type: "string" }, default: [] },
};

/**
 * PROMPT BUILDER SYSTEM CONFIGURATION SCHEMA
 */
const PromptBuilderConfigSchema = {
  // Required version
  version: VersionFieldSchema,

  // Custom tokens
  customTokens: {
    type: "array",
    items: { type: "object", schema: TokenDefinitionSchema },
    default: [],
    description: "User-defined custom tokens",
  },

  // Macros
  macros: {
    type: "array",
    items: { type: "object", schema: MacroSchema },
    default: [],
    description: "Reusable parameterized prompt fragments",
  },

  // Transform functions
  transforms: {
    type: "array",
    items: { type: "object", schema: TransformSchema },
    default: [],
    description: "Token value transform functions",
  },

  // Preset prompts
  presetPrompts: {
    type: "array",
    items: { type: "object", schema: PresetPromptSchema },
    default: [],
    description: "Saved prompt configurations",
  },

  // Token resolution settings
  resolutionSettings: {
    type: "object",
    schema: {
      maxNestingDepth: { type: "number", default: 10, min: 1, max: 50 },
      passUnresolvedToST: { type: "boolean", default: true },
      warnOnUnresolved: { type: "boolean", default: true },
      cacheResolutions: { type: "boolean", default: true },
    },
    description: "Token resolution behavior settings",
  },

  // UI preferences
  uiPreferences: {
    type: "object",
    schema: {
      defaultMode: { type: "enum", values: ["builder", "preset", "custom"], default: "builder" },
      showTokenCategories: { type: "boolean", default: true },
      showTokenDescriptions: { type: "boolean", default: true },
      enableAutoComplete: { type: "boolean", default: true },
    },
    description: "Prompt builder UI preferences",
  },

  // Metadata
  metadata: {
    type: "object",
    schema: MetadataSchema,
    description: "Configuration metadata",
  },
};

// =============================================================================
// PIPELINE BUILDER SYSTEM CONFIG SCHEMAS
// =============================================================================

/**
 * PIPELINE BUILDER SYSTEM CONFIGURATION SCHEMA
 */
const PipelineConfigSchema = {
  // Required version
  version: VersionFieldSchema,

  // Editorial agents
  agents: {
    type: "array",
    items: {
      type: "object",
      schema: {
        id: { type: "string", required: true },
        name: { type: "string", required: true },
        description: { type: "string", default: "" },
        apiConfig: { type: "object" },
        systemPrompt: { type: "object" },
        reasoning: { type: "object" },
        metadata: { type: "object" },
      },
    },
    default: [],
    description: "Editorial agent configurations",
  },

  // Positions
  positions: {
    type: "array",
    items: {
      type: "object",
      schema: {
        id: { type: "string", required: true },
        name: { type: "string", required: true },
        teamId: { type: "string", required: true },
        tier: { type: "enum", values: ["executive", "leader", "member"], default: "member" },
        assignedAgentId: { type: "string", nullable: true },
        assignedPoolId: { type: "string", nullable: true },
        promptModifiers: { type: "object" },
        isMandatory: { type: "boolean", default: false },
        isSME: { type: "boolean", default: false },
        smeKeywords: { type: "array", items: { type: "string" }, default: [] },
      },
    },
    default: [],
    description: "Team position configurations",
  },

  // Teams
  teams: {
    type: "array",
    items: {
      type: "object",
      schema: {
        id: { type: "string", required: true },
        name: { type: "string", required: true },
        description: { type: "string", default: "" },
        icon: { type: "string", default: "👥" },
        leaderId: { type: "string", required: true },
        memberIds: { type: "array", items: { type: "string" }, default: [] },
        settings: { type: "object" },
        displayOrder: { type: "number", default: 0 },
      },
    },
    default: [],
    description: "Team configurations",
  },

  // Agent pools
  agentPools: {
    type: "array",
    items: {
      type: "object",
      schema: {
        id: { type: "string", required: true },
        name: { type: "string", required: true },
        agentIds: { type: "array", items: { type: "string" }, required: true },
        selectionMode: { type: "enum", values: ["random", "round_robin", "weighted"], default: "random" },
        weights: { type: "object", default: {} },
      },
    },
    default: [],
    description: "Agent pool configurations for random selection",
  },

  // Pipeline definitions
  pipelines: {
    type: "array",
    items: {
      type: "object",
      schema: {
        id: { type: "string", required: true },
        name: { type: "string", required: true },
        description: { type: "string", default: "" },
        version: { type: "string", default: "1.0.0" },
        staticContext: { type: "object" },
        globals: { type: "object" },
        constants: { type: "object" },
        phases: { type: "array", items: { type: "object" }, default: [] },
        metadata: { type: "object" },
      },
    },
    default: [],
    description: "Pipeline definitions",
  },

  // Default pipeline settings
  defaultPipelineSettings: {
    type: "object",
    schema: {
      includeCharacterCard: { type: "boolean", default: true },
      includeWorldInfo: { type: "boolean", default: true },
      includePersona: { type: "boolean", default: true },
      includeScenario: { type: "boolean", default: true },
      defaultTimeout: { type: "number", default: 60000 },
      defaultRetryCount: { type: "number", default: 1 },
    },
    description: "Default settings applied to new pipelines",
  },

  // Active pipeline ID
  activePipelineId: {
    type: "string",
    nullable: true,
    description: "Currently active pipeline ID",
  },

  // Metadata
  metadata: {
    type: "object",
    schema: MetadataSchema,
    description: "Configuration metadata",
  },
};

// =============================================================================
// ORCHESTRATION SYSTEM CONFIG SCHEMAS
// =============================================================================

/**
 * Injection mapping schema
 */
const InjectionMappingSchema = {
  token: { type: "string", required: true, description: "ST token to replace (e.g., '{{chat}}')" },
  sourceType: { type: "enum", values: ["rag_pipeline", "store", "static", "custom"], required: true },
  sourceValue: { type: "string", required: true, description: "RAG pipeline ID, store ID, or static value" },
  enabled: { type: "boolean", default: true },
  maxResults: { type: "number", default: 5 },
  format: { type: "enum", values: ["raw", "formatted", "json"], default: "formatted" },
  cacheTimeout: { type: "number", default: 0, description: "Cache timeout in ms (0 = no cache)" },
};

/**
 * Execution settings schema
 */
const ExecutionSettingsSchema = {
  // Timeouts
  defaultActionTimeout: { type: "number", default: 60000, min: 5000 },
  defaultPhaseTimeout: { type: "number", default: 300000, min: 10000 },
  defaultPipelineTimeout: { type: "number", default: 1800000, min: 60000 },

  // Retry configuration
  defaultRetryCount: { type: "number", default: 1, min: 0, max: 5 },
  retryDelayMs: { type: "number", default: 1000 },
  retryBackoffMultiplier: { type: "number", default: 2 },

  // Parallelism
  maxParallelActions: { type: "number", default: 3, min: 1, max: 10 },
  maxParallelAgents: { type: "number", default: 5, min: 1, max: 20 },

  // Output
  streamOutput: { type: "boolean", default: true },
  preserveIntermediate: { type: "boolean", default: true },

  // Error handling
  continueOnActionError: { type: "boolean", default: false },
  continueOnPhaseError: { type: "boolean", default: false },

  // Gavel
  defaultGavelTimeout: { type: "number", default: 0, description: "0 = wait indefinitely" },
  autoApproveGavel: { type: "boolean", default: false },
};

/**
 * ORCHESTRATION SYSTEM CONFIGURATION SCHEMA
 */
const OrchestrationConfigSchema = {
  // Required version
  version: VersionFieldSchema,

  // Operating mode
  mode: {
    type: "enum",
    values: ["synthesis", "compilation", "injection"],
    default: "synthesis",
    description: "Current orchestration mode",
  },

  // Injection mode mappings
  injectionMappings: {
    type: "array",
    items: { type: "object", schema: InjectionMappingSchema },
    default: [],
    description: "Token to RAG/store mappings for injection mode",
  },

  // Injection mode settings
  injectionSettings: {
    type: "object",
    schema: {
      enabled: { type: "boolean", default: false },
      cacheEnabled: { type: "boolean", default: true },
      cacheDefaultTTL: { type: "number", default: 30000 },
      failSilently: { type: "boolean", default: true },
      fallbackToOriginal: { type: "boolean", default: true },
    },
    description: "Injection mode specific settings",
  },

  // Execution settings
  executionSettings: {
    type: "object",
    schema: ExecutionSettingsSchema,
    description: "Pipeline execution settings",
  },

  // ST integration settings
  stIntegration: {
    type: "object",
    schema: {
      interceptEnabled: { type: "boolean", default: true },
      autoDeliverOutput: { type: "boolean", default: true },
      deliveryTarget: { type: "enum", values: ["chat", "clipboard", "both"], default: "chat" },
      formatOutput: { type: "boolean", default: true },
    },
    description: "SillyTavern integration settings",
  },

  // Metadata
  metadata: {
    type: "object",
    schema: MetadataSchema,
    description: "Configuration metadata",
  },
};

// =============================================================================
// KERNEL CONFIG SCHEMAS
// =============================================================================

/**
 * UI settings schema
 */
const UISettingsSchema = {
  navPosition: {
    type: "object",
    schema: {
      x: { type: "number", default: 20 },
      y: { type: "number", default: 100 },
    },
    description: "Navigation modal position",
  },
  theme: { type: "enum", values: ["auto", "light", "dark"], default: "auto" },
  autoShowNav: { type: "boolean", default: true },
  showTooltips: { type: "boolean", default: true },
  confirmDestructive: { type: "boolean", default: true },
  modalAnimations: { type: "boolean", default: true },
  compactMode: { type: "boolean", default: false },
};

/**
 * API defaults schema
 */
const ApiDefaultsSchema = {
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
 * Debug settings schema
 */
const DebugSettingsSchema = {
  enabled: { type: "boolean", default: false },
  logLevel: { type: "enum", values: ["debug", "info", "warn", "error"], default: "info" },
  logToConsole: { type: "boolean", default: true },
  logToFile: { type: "boolean", default: false },
  includeTimestamps: { type: "boolean", default: true },
  includeStackTraces: { type: "boolean", default: false },
};

/**
 * KERNEL GLOBAL CONFIGURATION SCHEMA
 */
const KernelConfigSchema = {
  // Required version
  version: VersionFieldSchema,

  // Active preset
  activePreset: {
    type: "string",
    nullable: true,
    description: "ID of the currently active preset",
  },

  // UI settings
  uiSettings: {
    type: "object",
    schema: UISettingsSchema,
    description: "User interface settings",
  },

  // API defaults
  apiDefaults: {
    type: "object",
    schema: ApiDefaultsSchema,
    description: "Default API configuration for agents",
  },

  // Debug settings
  debug: {
    type: "object",
    schema: DebugSettingsSchema,
    description: "Debug and logging settings",
  },

  // Feature flags
  features: {
    type: "object",
    schema: {
      enableCuration: { type: "boolean", default: true },
      enableCharacter: { type: "boolean", default: true },
      enablePipeline: { type: "boolean", default: true },
      enableOrchestration: { type: "boolean", default: true },
      enablePromptBuilder: { type: "boolean", default: true },
      enablePresets: { type: "boolean", default: true },
    },
    description: "Feature enable/disable flags",
  },

  // Storage settings
  storage: {
    type: "object",
    schema: {
      defaultScope: { type: "enum", values: ["global", "chat", "character"], default: "chat" },
      autoSave: { type: "boolean", default: true },
      autoSaveInterval: { type: "number", default: 60000 },
      compressionEnabled: { type: "boolean", default: false },
    },
    description: "Data storage settings",
  },

  // Metadata
  metadata: {
    type: "object",
    schema: MetadataSchema,
    description: "Configuration metadata",
  },
};

// =============================================================================
// COMPILED PRESET SCHEMA
// =============================================================================

/**
 * Full preset schema - contains all system configs compiled together
 */
const CompiledPresetSchema = {
  // Preset metadata
  id: { type: "string", required: true },
  name: { type: "string", required: true },
  description: { type: "string", default: "" },
  version: VersionFieldSchema,

  // Creation metadata
  metadata: {
    type: "object",
    schema: {
      ...MetadataSchema,
      sourceVersion: { type: "string", description: "Version of TheCouncil that created this preset" },
      exportedAt: TimestampFieldSchema,
    },
  },

  // System configurations
  systems: {
    type: "object",
    schema: {
      curation: { type: "object", schema: CurationConfigSchema },
      character: { type: "object", schema: CharacterConfigSchema },
      promptBuilder: { type: "object", schema: PromptBuilderConfigSchema },
      pipeline: { type: "object", schema: PipelineConfigSchema },
      orchestration: { type: "object", schema: OrchestrationConfigSchema },
      kernel: { type: "object", schema: KernelConfigSchema },
    },
    description: "Per-system configuration data",
  },
};

// =============================================================================
// SYSTEM CONFIG SCHEMAS EXPORT
// =============================================================================

/**
 * SystemConfigSchemas - All per-system configuration schemas
 */
const SystemConfigSchemas = {
  // Main system config schemas
  curation: CurationConfigSchema,
  character: CharacterConfigSchema,
  promptBuilder: PromptBuilderConfigSchema,
  pipeline: PipelineConfigSchema,
  orchestration: OrchestrationConfigSchema,
  kernel: KernelConfigSchema,

  // Sub-schemas (exported for reuse)
  sub: {
    // Common
    VersionFieldSchema,
    TimestampFieldSchema,
    MetadataSchema,

    // Curation
    TopologistPositionMappingSchema,
    CurationExecutionSettingsSchema,

    // Character
    DirectorConfigSchema,
    VoicingDefaultsSchema,
    AvatarSettingsSchema,

    // Prompt Builder
    TokenDefinitionSchema,
    MacroSchema,
    TransformSchema,
    PresetPromptSchema,

    // Pipeline
    // (uses schemas from systems.js)

    // Orchestration
    InjectionMappingSchema,
    ExecutionSettingsSchema,

    // Kernel
    UISettingsSchema,
    ApiDefaultsSchema,
    DebugSettingsSchema,
  },

  // Compiled preset schema
  CompiledPresetSchema,

  // Helper: Get schema by system ID
  getSchema(systemId) {
    return this[systemId] || null;
  },

  // Helper: Get all system IDs
  getSystemIds() {
    return ["curation", "character", "promptBuilder", "pipeline", "orchestration", "kernel"];
  },

  // Helper: Detect system from config structure
  detectSystem(config) {
    if (!config || typeof config !== "object") return null;

    // Check for distinctive fields
    if (config.storeSchemas || config.crudPipelines || config.ragPipelines) return "curation";
    if (config.directorConfig || config.voicingDefaults || config.avatarSettings) return "character";
    if (config.customTokens || config.macros || config.transforms) return "promptBuilder";
    if (config.teams && config.pipelines) return "pipeline";
    if (config.injectionMappings || config.injectionSettings) return "orchestration";
    if (config.uiSettings && config.apiDefaults) return "kernel";

    // Check for systems object (compiled preset)
    if (config.systems) return "preset";

    return null;
  },

  // Helper: Create default config for a system
  createDefaultConfig(systemId) {
    const schema = this.getSchema(systemId);
    if (!schema) return null;

    const config = { version: "1.0.0" };

    // Apply defaults from schema
    for (const [key, fieldSchema] of Object.entries(schema)) {
      if (key === "version") continue;
      if (fieldSchema.default !== undefined) {
        config[key] = JSON.parse(JSON.stringify(fieldSchema.default));
      } else if (fieldSchema.type === "array") {
        config[key] = [];
      } else if (fieldSchema.type === "object" && fieldSchema.schema) {
        config[key] = this._createDefaultFromSchema(fieldSchema.schema);
      }
    }

    return config;
  },

  // Helper: Create default object from sub-schema
  _createDefaultFromSchema(schema) {
    const obj = {};
    for (const [key, fieldSchema] of Object.entries(schema)) {
      if (fieldSchema.default !== undefined) {
        obj[key] = JSON.parse(JSON.stringify(fieldSchema.default));
      } else if (fieldSchema.type === "array") {
        obj[key] = [];
      } else if (fieldSchema.type === "object" && fieldSchema.schema) {
        obj[key] = this._createDefaultFromSchema(fieldSchema.schema);
      }
    }
    return obj;
  },
};

// =============================================================================
// EXPORTS
// =============================================================================

// Export for different environments
if (typeof window !== "undefined") {
  window.SystemConfigSchemas = SystemConfigSchemas;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = SystemConfigSchemas;
}
