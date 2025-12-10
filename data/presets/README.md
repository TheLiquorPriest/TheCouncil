# The Council - Pipeline Presets

This directory contains preset configurations for The Council pipeline system. Presets define complete workflows including agents, teams, phases, and execution settings.

## Available Presets

| Preset | File | Phases | Description |
|--------|------|--------|-------------|
| **Quick** | `quick-pipeline.json` | 4 | Fast, streamlined workflow with minimal review. Best for quick responses. |
| **Standard** | `standard-pipeline.json` | 10 | Balanced workflow with key review cycles and user gavels. Recommended for most use cases. |
| **Editorial Board** | `default-pipeline.json` | 19 | Comprehensive multi-agent workflow with full editorial review. Maximum quality. |

## Preset Structure

```json
{
  "id": "unique-preset-id",
  "name": "Human Readable Name",
  "description": "Description of the preset",
  "version": "2.0.0",
  
  "staticContext": { ... },
  "globals": { ... },
  "constants": { ... },
  "agents": { ... },
  "teams": [ ... ],
  "threads": { ... },
  "phases": [ ... ],
  "metadata": { ... }
}
```

## Section Reference

### `staticContext`
Controls what SillyTavern context is included:
- `includeCharacterCard`: Include character card data
- `includeWorldInfo`: Include world info/lorebook
- `includePersona`: Include user persona
- `includeScenario`: Include scenario description
- `custom`: Custom context entries

### `globals`
Pipeline-wide variables accessible via `{{globals.varName}}`:
- `instructions`: User instructions
- `outlineDraft`, `finalOutline`: Outline stages
- `firstDraft`, `secondDraft`, `finalDraft`: Draft stages
- `commentary`: Team commentary
- `custom`: Custom globals

### `constants`
Fixed configuration values:
- `maxSMEs`: Maximum Subject Matter Experts (1-5)
- `defaultTimeout`: Action timeout in ms
- `deliberationRounds`: Max rounds for consensus

### `agents`
Agents organized by team category:
```json
{
  "executive": [...],      // Top-level decision makers
  "proseTeam": [...],      // Writing team
  "plotTeam": [...],       // Story structure team
  "worldTeam": [...],      // World consistency team
  "characterTeam": [...],  // Character specialists
  "environmentTeam": [...],// Setting specialists
  "curationTeam": [...]    // Data management team
}
```

Each agent has:
- `id`: Unique identifier
- `name`: Display name
- `position`: Position type (e.g., `prose_lead`, `prose_member`)
- `tier`: `executive`, `leader`, or `member`
- `description`: Role description
- `systemPrompt`: Agent's system prompt

### `teams`
Team definitions:
```json
{
  "id": "team_id",
  "name": "Team Name",
  "leaderId": "agent_id",
  "memberPositions": ["position_type_1", "position_type_2"]
}
```

### `threads`
Conversation threads for deliberation:
```json
{
  "thread_id": {
    "id": "thread_id",
    "name": "Display Name",
    "description": "Thread purpose",
    "visible": true
  }
}
```

### `phases`
Pipeline phases (executed in order):
```json
{
  "id": "phase_id",
  "name": "Phase Name",
  "description": "What this phase does",
  "icon": "📝",
  "teams": ["team_id_1", "team_id_2"],
  "threads": {
    "phaseThread": { "enabled": true },
    "teamThreads": { "thread_id": true }
  },
  "actions": [...],
  "output": { "consolidation": "last" },
  "gavel": { ... }  // Optional user intervention point
}
```

### Action Types
- `standard`: Normal LLM action with participants
- `gavel`: User intervention/approval point
- `deliverables`: Final output delivery
- `system`: Non-LLM system action
- `crud_pipeline`: Curation CRUD operation
- `rag_pipeline`: Retrieval-augmented generation
- `deliberative_rag`: RAG with team deliberation

### `metadata`
Preset metadata:
```json
{
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z",
  "author": "Author Name",
  "tags": ["tag1", "tag2"]
}
```

## Creating Custom Presets

1. Copy an existing preset as a starting point
2. Modify the `id` and `name` to be unique
3. Adjust agents for your use case
4. Define teams based on your agents
5. Create phases for your workflow
6. Add gavel points where user input is needed
7. Save as `your-preset-id.json` in this directory

## Token Reference

Use these tokens in `promptTemplate` fields:

### SillyTavern Macros
- `{{char}}`, `{{user}}` - Character/user names
- `{{description}}`, `{{personality}}` - Character info
- `{{scenario}}` - Current scenario

### Pipeline Tokens
- `{{input}}` - Action input
- `{{context}}` - Combined context
- `{{output}}` - Action output
- `{{previousPhase.output}}` - Previous phase output
- `{{previousAction.output}}` - Previous action output
- `{{globals.varName}}` - Global variable
- `{{constants.varName}}` - Constant value
- `{{phase.name}}`, `{{action.name}}` - Current phase/action

### Agent/Position
- `{{agent.name}}`, `{{agent.systemPrompt}}`
- `{{position.name}}`, `{{position.tier}}`
- `{{team.name}}`, `{{team.leader}}`

### Store Access
- `{{store.storeName}}` - Access curation store data
- `{{rag.results}}` - RAG retrieval results

## Tips

- **Quick preset**: Use for casual roleplay where speed matters
- **Standard preset**: Good balance for most creative writing
- **Editorial Board preset**: Use when quality is paramount and you have time

For more details, see `docs/DEFAULT_PIPELINE.md` and `docs/ARCHITECTURE.md`.