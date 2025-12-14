/**
 * TheCouncil - Preset Migration Utility
 *
 * Migrates legacy preset format to new CompiledPresetSchema format.
 * Legacy format: Flat structure with agents/positions/teams/pipelines arrays
 * New format: Per-system configuration structure
 *
 * @version 1.0.0
 */

/**
 * Migrate legacy preset to new CompiledPresetSchema format
 *
 * @param {Object} legacyPreset - Legacy preset data
 * @returns {Object} Migrated preset in CompiledPresetSchema format
 */
function migrateLegacyPreset(legacyPreset) {
  const timestamp = Date.now();

  // Extract preset metadata
  const presetId = legacyPreset.id || 'unknown-preset';
  const presetName = legacyPreset.name || 'Untitled Preset';
  const presetDescription = legacyPreset.description || '';
  const presetVersion = legacyPreset.version || '1.0.0';

  // Create migrated preset structure
  const migratedPreset = {
    id: presetId,
    name: presetName,
    description: presetDescription,
    version: presetVersion,

    metadata: {
      createdAt: timestamp,
      updatedAt: timestamp,
      author: legacyPreset.companyName || legacyPreset.metadata?.author || 'The Council',
      description: presetDescription,
      tags: legacyPreset.metadata?.tags || [],
      sourceVersion: '2.0.0', // Version that created the legacy preset
      exportedAt: timestamp,
    },

    systems: {
      curation: createCurationConfig(legacyPreset),
      character: createCharacterConfig(legacyPreset),
      promptBuilder: createPromptBuilderConfig(legacyPreset),
      pipeline: createPipelineConfig(legacyPreset),
      orchestration: createOrchestrationConfig(legacyPreset),
      kernel: createKernelConfig(legacyPreset),
    },
  };

  return migratedPreset;
}

/**
 * Create Curation System configuration from legacy preset
 */
function createCurationConfig(legacy) {
  return {
    version: '1.0.0',
    storeSchemas: [],
    crudPipelines: [],
    ragPipelines: [],
    agents: [],
    positions: [],
    positionMapping: {
      storyTopologist: ['storyDraft', 'storyOutline', 'storySynopsis', 'plotLines', 'scenes'],
      characterTopologist: ['characterSheets', 'characterDevelopment', 'characterInventory', 'characterPositions'],
      loreTopologist: ['factionSheets', 'locationSheets'],
      sceneTopologist: ['scenes', 'dialogueHistory', 'currentSituation'],
      locationTopologist: ['locationSheets'],
    },
    executionSettings: {
      maxDeliberationRounds: 3,
      deliberationTimeout: 30000,
      autoSaveInterval: 60000,
      enableAutoExtraction: false,
      extractionTriggers: ['after_response', 'on_demand'],
    },
    metadata: {
      createdAt: Date.now(),
      updatedAt: Date.now(),
      author: legacy.metadata?.author || 'The Council',
      description: 'Curation system configuration',
      tags: [],
    },
  };
}

/**
 * Create Character System configuration from legacy preset
 */
function createCharacterConfig(legacy) {
  return {
    version: '1.0.0',
    directorConfig: {
      enabled: true,
      autoSpawn: true,
      maxActiveCharacters: 10,
      spawnThreshold: 0.5,
      apiConfig: {},
      systemPrompt: {},
    },
    voicingDefaults: {
      includePersonality: true,
      includeAppearance: false,
      includeBackground: true,
      includeSpeechPatterns: true,
      includeMannerisms: true,
      includeCatchphrases: true,
      includeRelationships: true,
      voiceIntensity: 'moderate',
      promptTemplate: '',
    },
    avatarSettings: {
      defaultApiConfig: {},
      defaultReasoning: {
        enabled: false,
        prefix: '<thinking>',
        suffix: '</thinking>',
        hideFromOutput: true,
      },
      syncOnStartup: true,
      persistOverrides: true,
    },
    agentOverrides: {},
    typePriorities: {
      main_cast: 1,
      recurring_cast: 2,
      supporting_cast: 3,
      background: 4,
    },
    metadata: {
      createdAt: Date.now(),
      updatedAt: Date.now(),
      author: legacy.metadata?.author || 'The Council',
      description: 'Character system configuration',
      tags: [],
    },
  };
}

/**
 * Create Prompt Builder System configuration from legacy preset
 */
function createPromptBuilderConfig(legacy) {
  return {
    version: '1.0.0',
    customTokens: [],
    macros: [],
    transforms: [],
    presetPrompts: [],
    resolutionSettings: {
      maxNestingDepth: 10,
      passUnresolvedToST: true,
      warnOnUnresolved: true,
      cacheResolutions: true,
    },
    uiPreferences: {
      defaultMode: 'builder',
      showTokenCategories: true,
      showTokenDescriptions: true,
      enableAutoComplete: true,
    },
    metadata: {
      createdAt: Date.now(),
      updatedAt: Date.now(),
      author: legacy.metadata?.author || 'The Council',
      description: 'Prompt builder configuration',
      tags: [],
    },
  };
}

/**
 * Create Pipeline Builder System configuration from legacy preset
 */
function createPipelineConfig(legacy) {
  // Extract agents, positions, teams, and pipelines from legacy format
  const agents = legacy.agents || [];
  const positions = legacy.positions || [];
  const teams = legacy.teams || [];
  const pipelines = legacy.pipelines || [];

  return {
    version: '1.0.0',
    agents: agents,
    positions: positions,
    teams: teams,
    agentPools: [],
    pipelines: pipelines,
    defaultPipelineSettings: {
      includeCharacterCard: legacy.staticContext?.includeCharacterCard !== false,
      includeWorldInfo: legacy.staticContext?.includeWorldInfo !== false,
      includePersona: legacy.staticContext?.includePersona !== false,
      includeScenario: legacy.staticContext?.includeScenario !== false,
      defaultTimeout: legacy.constants?.defaultTimeout || 60000,
      defaultRetryCount: 1,
    },
    activePipelineId: pipelines.length > 0 ? pipelines[0].id : null,
    metadata: {
      createdAt: Date.now(),
      updatedAt: Date.now(),
      author: legacy.metadata?.author || 'The Council',
      description: 'Pipeline builder configuration',
      tags: legacy.metadata?.tags || [],
    },
  };
}

/**
 * Create Orchestration System configuration from legacy preset
 */
function createOrchestrationConfig(legacy) {
  return {
    version: '1.0.0',
    mode: 'synthesis',
    injectionMappings: [],
    injectionSettings: {
      enabled: false,
      cacheEnabled: true,
      cacheDefaultTTL: 30000,
      failSilently: true,
      fallbackToOriginal: true,
    },
    executionSettings: {
      defaultActionTimeout: legacy.constants?.defaultTimeout || 60000,
      defaultPhaseTimeout: 300000,
      defaultPipelineTimeout: 1800000,
      defaultRetryCount: 1,
      retryDelayMs: 1000,
      retryBackoffMultiplier: 2,
      maxParallelActions: 3,
      maxParallelAgents: 5,
      streamOutput: true,
      preserveIntermediate: true,
      continueOnActionError: false,
      continueOnPhaseError: false,
      defaultGavelTimeout: 0,
      autoApproveGavel: false,
    },
    stIntegration: {
      interceptEnabled: true,
      autoDeliverOutput: true,
      deliveryTarget: 'chat',
      formatOutput: true,
    },
    metadata: {
      createdAt: Date.now(),
      updatedAt: Date.now(),
      author: legacy.metadata?.author || 'The Council',
      description: 'Orchestration configuration',
      tags: [],
    },
  };
}

/**
 * Create Kernel configuration from legacy preset
 */
function createKernelConfig(legacy) {
  return {
    version: '1.0.0',
    activePreset: null,
    uiSettings: {
      navPosition: { x: 20, y: 100 },
      theme: 'auto',
      autoShowNav: true,
      showTooltips: true,
      confirmDestructive: true,
      modalAnimations: true,
      compactMode: false,
    },
    apiDefaults: {
      useCurrentConnection: true,
      endpoint: '',
      apiKey: '',
      model: '',
      temperature: 0.7,
      maxTokens: 2048,
      topP: 1,
      frequencyPenalty: 0,
      presencePenalty: 0,
    },
    debug: {
      enabled: false,
      logLevel: 'info',
      logToConsole: true,
      logToFile: false,
      includeTimestamps: true,
      includeStackTraces: false,
    },
    features: {
      enableCuration: true,
      enableCharacter: true,
      enablePipeline: true,
      enableOrchestration: true,
      enablePromptBuilder: true,
      enablePresets: true,
    },
    storage: {
      defaultScope: 'chat',
      autoSave: true,
      autoSaveInterval: 60000,
      compressionEnabled: false,
    },
    metadata: {
      createdAt: Date.now(),
      updatedAt: Date.now(),
      author: legacy.metadata?.author || 'The Council',
      description: 'Kernel configuration',
      tags: [],
    },
  };
}

// Export for different environments
if (typeof window !== 'undefined') {
  window.migrateLegacyPreset = migrateLegacyPreset;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { migrateLegacyPreset };
}
