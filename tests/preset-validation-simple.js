/**
 * Simple Preset Validation Test
 *
 * Tests that preset JSON files are valid and loadable
 * Checks that they have required fields and correct structure
 */

const PresetValidator = {
  /**
   * Validate a preset object structure
   */
  validatePreset(preset, presetId) {
    const errors = [];
    const warnings = [];

    console.log(`\n=== Validating Preset: ${presetId} ===\n`);

    // Check required fields
    if (!preset.id) {
      errors.push('Missing required field: id');
    } else if (preset.id !== presetId) {
      warnings.push(`Preset ID mismatch: JSON id="${preset.id}", filename suggests "${presetId}"`);
    }

    if (!preset.name) {
      errors.push('Missing required field: name');
    }

    if (!preset.version) {
      warnings.push('Missing version field');
    }

    // Check agents structure
    if (!preset.agents) {
      errors.push('Missing required field: agents');
    } else {
      let agentCount = 0;
      if (typeof preset.agents === 'object' && !Array.isArray(preset.agents)) {
        // Old format - nested by team
        for (const [team, agents] of Object.entries(preset.agents)) {
          if (Array.isArray(agents)) {
            agentCount += agents.length;
            for (const agent of agents) {
              if (!agent.id) errors.push(`Agent in "${team}" missing id`);
              if (!agent.name) errors.push(`Agent "${agent.id || '?'}" in "${team}" missing name`);
              if (!agent.systemPrompt && !agent.description) {
                warnings.push(`Agent "${agent.id || '?'}" has no systemPrompt or description`);
              }
            }
          }
        }
        console.log(`  Found ${agentCount} agents (in nested format)`);
      } else if (Array.isArray(preset.agents)) {
        // New format - flat array
        agentCount = preset.agents.length;
        for (const agent of preset.agents) {
          if (!agent.id) errors.push('Agent missing id');
          if (!agent.name) errors.push(`Agent missing name`);
        }
        console.log(`  Found ${agentCount} agents (in flat format)`);
      }

      if (agentCount === 0) {
        errors.push('No agents defined in preset');
      }
    }

    // Check teams
    if (!preset.teams || !Array.isArray(preset.teams)) {
      errors.push('Missing or invalid teams field (should be array)');
    } else {
      console.log(`  Found ${preset.teams.length} teams`);
      for (const team of preset.teams) {
        if (!team.id) errors.push('Team missing id');
        if (!team.name) errors.push(`Team "${team.id || '?'}" missing name`);
        if (!team.leaderId) errors.push(`Team "${team.id || '?'}" missing leaderId`);
      }
    }

    // Check phases
    if (!preset.phases || !Array.isArray(preset.phases)) {
      warnings.push('Missing or invalid phases field (should be array)');
    } else {
      console.log(`  Found ${preset.phases.length} phases`);
      for (const phase of preset.phases) {
        if (!phase.id) errors.push('Phase missing id');
        if (!phase.name) errors.push(`Phase "${phase.id || '?'}" missing name`);
        if (!Array.isArray(phase.actions)) {
          warnings.push(`Phase "${phase.id || '?'}" has no actions array`);
        } else {
          for (const action of phase.actions) {
            if (!action.id) errors.push(`Action in phase "${phase.id || '?'}" missing id`);
          }
        }
      }
    }

    // Check threads
    if (preset.threads && typeof preset.threads === 'object') {
      console.log(`  Found ${Object.keys(preset.threads).length} threads`);
    } else {
      warnings.push('Missing or invalid threads field');
    }

    // Print results
    console.log(`\n  Status: ${errors.length === 0 ? 'VALID' : 'INVALID'}`);

    if (errors.length > 0) {
      console.log(`  Errors (${errors.length}):`);
      for (const error of errors) {
        console.log(`    - ${error}`);
      }
    }

    if (warnings.length > 0) {
      console.log(`  Warnings (${warnings.length}):`);
      for (const warning of warnings) {
        console.log(`    - ${warning}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      agentCount: this._countAgents(preset),
      teamCount: preset.teams?.length || 0,
      phaseCount: preset.phases?.length || 0,
    };
  },

  /**
   * Count agents in preset (works with both formats)
   */
  _countAgents(preset) {
    if (!preset.agents) return 0;

    if (Array.isArray(preset.agents)) {
      return preset.agents.length;
    }

    let count = 0;
    for (const agents of Object.values(preset.agents)) {
      if (Array.isArray(agents)) {
        count += agents.length;
      }
    }
    return count;
  },

  /**
   * Load and validate all presets from files
   */
  async loadAndValidateAll() {
    console.log('\n====== PRESET VALIDATION SUITE ======\n');

    const presetIds = ['default-pipeline', 'standard-pipeline', 'quick-pipeline'];
    const results = [];

    for (const presetId of presetIds) {
      try {
        // Load preset JSON
        const response = await fetch(
          `/scripts/extensions/third-party/TheCouncil/data/presets/${presetId}.json`
        );

        if (!response.ok) {
          console.error(`Failed to load ${presetId}.json: ${response.statusText}`);
          results.push({
            preset: presetId,
            valid: false,
            error: `HTTP ${response.status}: ${response.statusText}`,
          });
          continue;
        }

        const preset = await response.json();
        const validation = this.validatePreset(preset, presetId);
        results.push({
          preset: presetId,
          ...validation,
        });
      } catch (error) {
        console.error(`Error loading ${presetId}:`, error);
        results.push({
          preset: presetId,
          valid: false,
          error: error.message,
        });
      }
    }

    // Summary
    console.log('\n====== SUMMARY ======\n');
    let passCount = 0;
    for (const result of results) {
      const status = result.valid ? 'PASS' : 'FAIL';
      console.log(`${status}: ${result.preset}`);
      if (!result.valid) {
        console.log(`     Error: ${result.error || 'Validation failed'}`);
      } else {
        console.log(`     Agents: ${result.agentCount}, Teams: ${result.teamCount}, Phases: ${result.phaseCount}`);
      }
      if (result.valid) passCount++;
    }

    console.log(`\nTotal: ${passCount}/${results.length} presets valid\n`);

    return results;
  },
};

// Export
if (typeof window !== 'undefined') {
  window.PresetValidator = PresetValidator;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = PresetValidator;
}
