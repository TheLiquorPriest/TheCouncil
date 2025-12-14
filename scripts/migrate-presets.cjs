/**
 * Preset Migration Script for The Council v2.1.0
 * Task 3.3.1: Migrate existing presets to per-system schema format
 *
 * This script converts the old flat preset format to the new CompiledPresetSchema
 * with per-system configuration sections.
 */

const fs = require('fs');
const path = require('path');

const PRESETS_DIR = path.join(__dirname, '..', 'data', 'presets');

/**
 * Create default system configs for systems not defined in old preset
 */
function getDefaultCurationConfig() {
  return {
    version: "1.0.0",
    storeSchemas: [],
    crudPipelines: [],
    ragPipelines: [],
    agents: [],
    positions: [],
    positionMapping: {
      storyTopologist: ["storyDraft", "storyOutline", "storySynopsis", "plotLines", "scenes"],
      characterTopologist: ["characterSheets", "characterDevelopment", "characterInventory", "characterPositions"],
      loreTopologist: ["factionSheets", "locationSheets"],
      sceneTopologist: ["scenes", "dialogueHistory", "currentSituation"],
      locationTopologist: ["locationSheets"]
    },
    executionSettings: {
      maxDeliberationRounds: 3,
      deliberationTimeout: 30000,
      autoSaveInterval: 60000,
      enableAutoExtraction: false,
      extractionTriggers: ["after_response", "on_demand"]
    },
    metadata: {
      createdAt: Date.now(),
      updatedAt: Date.now(),
      author: "TheCouncil",
      description: "Default curation configuration",
      tags: []
    }
  };
}

function getDefaultCharacterConfig() {
  return {
    version: "1.0.0",
    directorConfig: {
      enabled: true,
      autoSpawn: true,
      maxActiveCharacters: 10,
      spawnThreshold: 0.5
    },
    voicingDefaults: {
      includePersonality: true,
      includeAppearance: false,
      includeBackground: true,
      includeSpeechPatterns: true,
      includeMannerisms: true,
      includeCatchphrases: true,
      includeRelationships: true,
      voiceIntensity: "moderate",
      promptTemplate: ""
    },
    avatarSettings: {
      defaultReasoning: {
        enabled: false,
        prefix: "<thinking>",
        suffix: "</thinking>",
        hideFromOutput: true
      },
      syncOnStartup: true,
      persistOverrides: true
    },
    agentOverrides: {},
    typePriorities: {
      main_cast: 1,
      recurring_cast: 2,
      supporting_cast: 3,
      background: 4
    },
    metadata: {
      createdAt: Date.now(),
      updatedAt: Date.now(),
      author: "TheCouncil",
      description: "Default character system configuration",
      tags: []
    }
  };
}

function getDefaultPromptBuilderConfig() {
  return {
    version: "1.0.0",
    customTokens: [],
    macros: [],
    transforms: [],
    presetPrompts: [],
    resolutionSettings: {
      maxNestingDepth: 10,
      passUnresolvedToST: true,
      warnOnUnresolved: true,
      cacheResolutions: true
    },
    uiPreferences: {
      defaultMode: "builder",
      showTokenCategories: true,
      showTokenDescriptions: true,
      enableAutoComplete: true
    },
    metadata: {
      createdAt: Date.now(),
      updatedAt: Date.now(),
      author: "TheCouncil",
      description: "Default prompt builder configuration",
      tags: []
    }
  };
}

function getDefaultOrchestrationConfig(mode = "synthesis") {
  return {
    version: "1.0.0",
    mode: mode,
    injectionMappings: [],
    injectionSettings: {
      enabled: false,
      cacheEnabled: true,
      cacheDefaultTTL: 30000,
      failSilently: true,
      fallbackToOriginal: true
    },
    executionSettings: {
      defaultActionTimeout: 60000,
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
      autoApproveGavel: false
    },
    stIntegration: {
      interceptEnabled: true,
      autoDeliverOutput: true,
      deliveryTarget: "chat",
      formatOutput: true
    },
    metadata: {
      createdAt: Date.now(),
      updatedAt: Date.now(),
      author: "TheCouncil",
      description: "Default orchestration configuration",
      tags: []
    }
  };
}

function getDefaultKernelConfig(activePreset) {
  return {
    version: "2.0.0",
    activePreset: activePreset,
    uiSettings: {
      navPosition: { x: 20, y: 100 },
      theme: "auto",
      autoShowNav: true,
      showTooltips: true,
      confirmDestructive: true,
      modalAnimations: true,
      compactMode: false
    },
    apiDefaults: {
      useCurrentConnection: true,
      endpoint: "",
      apiKey: "",
      model: "",
      temperature: 0.7,
      maxTokens: 2048,
      topP: 1,
      frequencyPenalty: 0,
      presencePenalty: 0
    },
    debug: {
      enabled: false,
      logLevel: "info",
      logToConsole: true,
      logToFile: false,
      includeTimestamps: true,
      includeStackTraces: false
    },
    features: {
      enableCuration: true,
      enableCharacter: true,
      enablePipeline: true,
      enableOrchestration: true,
      enablePromptBuilder: true,
      enablePresets: true
    },
    storage: {
      defaultScope: "chat",
      autoSave: true,
      autoSaveInterval: 60000,
      compressionEnabled: false
    },
    metadata: {
      createdAt: Date.now(),
      updatedAt: Date.now(),
      author: "TheCouncil",
      description: "Default kernel configuration",
      tags: []
    }
  };
}

/**
 * Convert old agent format to new format with reasoning field
 */
function migrateAgent(oldAgent) {
  return {
    id: oldAgent.id,
    name: oldAgent.name,
    description: oldAgent.description,
    apiConfig: oldAgent.apiConfig || { useCurrentConnection: true },
    systemPrompt: oldAgent.systemPrompt || { source: "custom", customText: "" },
    reasoning: oldAgent.reasoning || {},
    metadata: oldAgent.metadata || { createdAt: 0, updatedAt: 0, tags: [] }
  };
}

/**
 * Convert old position format to new format with full fields
 */
function migratePosition(oldPos) {
  return {
    id: oldPos.id,
    name: oldPos.name,
    teamId: oldPos.teamId || null,
    tier: oldPos.tier || "member",
    assignedAgentId: oldPos.assignedAgent || oldPos.assignedAgentId || null,
    assignedPoolId: oldPos.assignedPoolId || null,
    promptModifiers: oldPos.promptModifiers || { prefix: "", suffix: "", roleDescription: "" },
    isMandatory: oldPos.isMandatory !== undefined ? oldPos.isMandatory : (oldPos.tier === "leader" || oldPos.tier === "executive"),
    isSME: oldPos.isSME || false,
    smeKeywords: oldPos.smeKeywords || []
  };
}

/**
 * Convert old team format to new format with icon and displayOrder
 */
function migrateTeam(oldTeam, index) {
  const iconMap = {
    prose_team: "pen",
    plot_team: "chart-line",
    world_team: "globe",
    character_team: "user",
    environment_team: "mountain",
    curation_team: "archive"
  };

  return {
    id: oldTeam.id,
    name: oldTeam.name,
    description: oldTeam.description,
    icon: iconMap[oldTeam.id] || "users",
    leaderId: oldTeam.leaderId,
    memberIds: oldTeam.memberIds,
    settings: oldTeam.settings || {},
    displayOrder: index + 1
  };
}

/**
 * Migrate a single preset file
 */
function migratePreset(oldPreset) {
  const now = Date.now();

  // Extract pipeline-specific data
  const pipelineConfig = {
    version: "2.0.0",
    agents: (oldPreset.agents || []).map(migrateAgent),
    positions: (oldPreset.positions || []).map(migratePosition),
    teams: (oldPreset.teams || []).map(migrateTeam),
    agentPools: [],
    pipelines: oldPreset.pipelines || [],
    defaultPipelineSettings: {
      includeCharacterCard: oldPreset.staticContext?.includeCharacterCard ?? true,
      includeWorldInfo: oldPreset.staticContext?.includeWorldInfo ?? true,
      includePersona: oldPreset.staticContext?.includePersona ?? true,
      includeScenario: oldPreset.staticContext?.includeScenario ?? true,
      defaultTimeout: oldPreset.constants?.defaultTimeout ?? 60000,
      defaultRetryCount: 1
    },
    activePipelineId: oldPreset.pipelines?.[0]?.id || oldPreset.id,
    metadata: {
      createdAt: now,
      updatedAt: now,
      author: "TheCouncil",
      description: `Pipeline configuration for ${oldPreset.name}`,
      tags: oldPreset.metadata?.tags || []
    }
  };

  // Create new preset structure
  const newPreset = {
    id: oldPreset.id,
    name: oldPreset.name,
    description: oldPreset.description,
    version: "2.1.0",
    metadata: {
      createdAt: now,
      updatedAt: now,
      author: oldPreset.metadata?.author || "TheCouncil",
      description: oldPreset.description,
      tags: oldPreset.metadata?.tags || [],
      sourceVersion: "2.1.0",
      exportedAt: now
    },
    systems: {
      curation: getDefaultCurationConfig(),
      character: getDefaultCharacterConfig(),
      promptBuilder: getDefaultPromptBuilderConfig(),
      pipeline: pipelineConfig,
      orchestration: getDefaultOrchestrationConfig(),
      kernel: getDefaultKernelConfig(oldPreset.id)
    }
  };

  return newPreset;
}

/**
 * Main migration function
 */
function main() {
  console.log('=== The Council Preset Migration ===');
  console.log('Task 3.3.1: Migrate existing presets to per-system schema format\n');

  const presetFiles = ['default-pipeline.json', 'quick-pipeline.json', 'standard-pipeline.json'];

  for (const filename of presetFiles) {
    const filepath = path.join(PRESETS_DIR, filename);

    if (!fs.existsSync(filepath)) {
      console.log(`SKIP: ${filename} not found`);
      continue;
    }

    console.log(`Migrating: ${filename}`);

    try {
      // Read old preset
      const oldContent = fs.readFileSync(filepath, 'utf8');
      const oldPreset = JSON.parse(oldContent);

      // Check if already migrated
      if (oldPreset.systems) {
        console.log(`  Already migrated, skipping`);
        continue;
      }

      // Migrate
      const newPreset = migratePreset(oldPreset);

      // Write new preset
      fs.writeFileSync(filepath, JSON.stringify(newPreset, null, 2), 'utf8');
      console.log(`  SUCCESS: Migrated to per-system format`);

    } catch (error) {
      console.error(`  ERROR: ${error.message}`);
    }
  }

  console.log('\nMigration complete!');
}

main();
