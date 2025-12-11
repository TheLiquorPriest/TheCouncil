/**
 * Preset Conversion Utility
 *
 * Converts presets from the nested agent format (agents.executive, agents.proseTeam)
 * to the flat format expected by PipelineBuilderSystem (agents: [...])
 *
 * The presets contain position definitions within agent objects that need to be
 * extracted and normalized into the PipelineBuilderSystem structure:
 * - agents: flat array of agent definitions
 * - positions: positions with assigned agents
 * - teams: team definitions with member positions
 * - pipelines: pipeline definitions
 */

const PresetConverter = {
  /**
   * Convert a preset from the old format to the new format
   * @param {Object} preset - The preset to convert
   * @returns {Object} Converted preset
   */
  convert(preset) {
    console.log(`Converting preset: ${preset.id || 'unknown'}`);

    const converted = {
      version: preset.version || '2.0.0',
      companyName: preset.companyName || 'The Council',
      agents: [],
      positions: [],
      teams: [],
      pipelines: [],
    };

    // Extract agents and build positions from the nested structure
    const agentMap = new Map(); // Map of agentId -> agent definition
    const positionMap = new Map(); // Map of positionId -> position definition

    if (preset.agents) {
      for (const [teamKey, agentList] of Object.entries(preset.agents)) {
        if (Array.isArray(agentList)) {
          for (const agent of agentList) {
            const agentId = agent.id;
            const positionId = agent.position || agent.id;

            // Store agent (without position info)
            agentMap.set(agentId, {
              id: agentId,
              name: agent.name,
              description: agent.description || '',
              apiConfig: {
                useCurrentConnection: true,
                endpoint: '',
                apiKey: '',
                model: '',
                temperature: 0.7,
                maxTokens: 2048,
              },
              systemPrompt: {
                source: 'custom',
                customText: agent.systemPrompt || '',
              },
              metadata: {
                createdAt: Date.now(),
                updatedAt: Date.now(),
                tags: [],
              },
            });

            // Build position definition
            if (!positionMap.has(positionId)) {
              positionMap.set(positionId, {
                id: positionId,
                name: agent.name || agent.id,
                description: agent.description || '',
                tier: agent.tier || 'member',
                teamId: null, // Will be set when processing teams
                assignedAgent: agentId,
                promptModifiers: {
                  prefix: '',
                  suffix: '',
                  roleDescription: agent.systemPrompt || '',
                },
              });
            }
          }
        }
      }
    }

    // Convert agents to array
    for (const agent of agentMap.values()) {
      converted.agents.push(agent);
    }

    // Convert positions to array
    for (const position of positionMap.values()) {
      converted.positions.push(position);
    }

    // Process teams and update team references in positions
    if (preset.teams && Array.isArray(preset.teams)) {
      for (const team of preset.teams) {
        const teamId = team.id;

        // Update positions that belong to this team
        const leaderPosition = positionMap.get(team.leaderId);
        if (leaderPosition) {
          leaderPosition.teamId = teamId;
        }

        if (team.memberPositions && Array.isArray(team.memberPositions)) {
          for (const memberPosId of team.memberPositions) {
            const memberPosition = positionMap.get(memberPosId);
            if (memberPosition) {
              memberPosition.teamId = teamId;
            }
          }
        }

        // Add team definition
        converted.teams.push({
          id: team.id,
          name: team.name,
          description: team.description || '',
          leaderId: team.leaderId,
          memberIds: (team.memberPositions || []).concat(team.leaderId),
        });
      }
    }

    // Add pipeline definition
    if (preset.id && preset.name) {
      converted.pipelines.push({
        id: preset.id,
        name: preset.name,
        description: preset.description || '',
        version: preset.version || '2.0.0',
        phases: preset.phases || [],
        threads: preset.threads || {},
        staticContext: preset.staticContext || {},
        globals: preset.globals || {},
        constants: preset.constants || {},
        metadata: {
          createdAt: Date.now(),
          updatedAt: Date.now(),
          author: preset.metadata?.author || 'The Council',
          tags: preset.metadata?.tags || [],
        },
      });
    }

    console.log(`  Converted: ${converted.agents.length} agents, ${converted.positions.length} positions, ${converted.teams.length} teams, ${converted.pipelines.length} pipelines\n`);

    return converted;
  },

  /**
   * Process all three presets and return conversions
   * @param {Object} presetObjects - Object with presetId -> preset data mappings
   * @returns {Object} Object with presetId -> converted preset mappings
   */
  convertAll(presetObjects) {
    const result = {};
    for (const [presetId, preset] of Object.entries(presetObjects)) {
      result[presetId] = this.convert(preset);
    }
    return result;
  },
};

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PresetConverter;
}

if (typeof window !== 'undefined') {
  window.PresetConverter = PresetConverter;
}
