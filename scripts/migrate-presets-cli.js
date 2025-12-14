#!/usr/bin/env node
/**
 * TheCouncil - Preset Migration CLI Script
 *
 * Migrates existing preset files to new CompiledPresetSchema format.
 *
 * Usage:
 *   node scripts/migrate-presets-cli.js
 *
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');

// Migration function (duplicated here for Node.js environment)
function migrateLegacyPreset(legacyPreset) {
  const timestamp = Date.now();

  const presetId = legacyPreset.id || 'unknown-preset';
  const presetName = legacyPreset.name || 'Untitled Preset';
  const presetDescription = legacyPreset.description || '';
  const presetVersion = legacyPreset.version || '1.0.0';

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
      sourceVersion: '2.0.0',
      exportedAt: timestamp,
    },

    systems: {
      curation: {
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
          createdAt: timestamp,
          updatedAt: timestamp,
          author: legacyPreset.metadata?.author || 'The Council',
          description: 'Curation system configuration',
          tags: [],
        },
      },

      character: {
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
          createdAt: timestamp,
          updatedAt: timestamp,
          author: legacyPreset.metadata?.author || 'The Council',
          description: 'Character system configuration',
          tags: [],
        },
      },

      promptBuilder: {
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
          createdAt: timestamp,
          updatedAt: timestamp,
          author: legacyPreset.metadata?.author || 'The Council',
          description: 'Prompt builder configuration',
          tags: [],
        },
      },

      pipeline: {
        version: '1.0.0',
        agents: legacyPreset.agents || [],
        positions: legacyPreset.positions || [],
        teams: legacyPreset.teams || [],
        agentPools: [],
        pipelines: legacyPreset.pipelines || [],
        defaultPipelineSettings: {
          includeCharacterCard: legacyPreset.staticContext?.includeCharacterCard !== false,
          includeWorldInfo: legacyPreset.staticContext?.includeWorldInfo !== false,
          includePersona: legacyPreset.staticContext?.includePersona !== false,
          includeScenario: legacyPreset.staticContext?.includeScenario !== false,
          defaultTimeout: legacyPreset.constants?.defaultTimeout || 60000,
          defaultRetryCount: 1,
        },
        activePipelineId: (legacyPreset.pipelines && legacyPreset.pipelines.length > 0) ? legacyPreset.pipelines[0].id : null,
        metadata: {
          createdAt: timestamp,
          updatedAt: timestamp,
          author: legacyPreset.metadata?.author || 'The Council',
          description: 'Pipeline builder configuration',
          tags: legacyPreset.metadata?.tags || [],
        },
      },

      orchestration: {
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
          defaultActionTimeout: legacyPreset.constants?.defaultTimeout || 60000,
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
          createdAt: timestamp,
          updatedAt: timestamp,
          author: legacyPreset.metadata?.author || 'The Council',
          description: 'Orchestration configuration',
          tags: [],
        },
      },

      kernel: {
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
          createdAt: timestamp,
          updatedAt: timestamp,
          author: legacyPreset.metadata?.author || 'The Council',
          description: 'Kernel configuration',
          tags: [],
        },
      },
    },
  };

  return migratedPreset;
}

// Main migration script
function main() {
  const projectRoot = path.resolve(__dirname, '..');
  const presetsDir = path.join(projectRoot, 'data', 'presets');

  const presetFiles = [
    'default-pipeline.json',
    'quick-pipeline.json',
    'standard-pipeline.json',
  ];

  console.log('TheCouncil Preset Migration Tool');
  console.log('=================================\n');

  for (const filename of presetFiles) {
    const filePath = path.join(presetsDir, filename);

    console.log(`Processing: ${filename}`);

    try {
      // Read legacy preset
      const legacyData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      console.log(`  ✓ Read legacy preset (${legacyData.agents?.length || 0} agents, ${legacyData.pipelines?.length || 0} pipelines)`);

      // Migrate to new format
      const migratedData = migrateLegacyPreset(legacyData);
      console.log(`  ✓ Migrated to CompiledPresetSchema format`);

      // Write migrated preset
      fs.writeFileSync(filePath, JSON.stringify(migratedData, null, 2), 'utf8');
      console.log(`  ✓ Wrote migrated preset to ${filename}`);

      // Validate structure
      const hasAllSystems = ['curation', 'character', 'promptBuilder', 'pipeline', 'orchestration', 'kernel']
        .every(sys => migratedData.systems[sys]);

      if (hasAllSystems) {
        console.log(`  ✓ Validation: All system configs present`);
      } else {
        console.log(`  ⚠ Warning: Missing some system configs`);
      }

      console.log(`  ✓ SUCCESS: ${filename} migrated\n`);
    } catch (error) {
      console.error(`  ✗ ERROR: ${error.message}\n`);
    }
  }

  console.log('Migration complete!');
  console.log('\nNext steps:');
  console.log('1. Review migrated preset files in data/presets/');
  console.log('2. Test preset loading in browser');
  console.log('3. Verify agents, teams, and pipelines are correct');
}

// Run migration
main();
