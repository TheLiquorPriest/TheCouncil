# The Council

**A Multi-Agent Story Production Pipeline for SillyTavern**

The Council is a comprehensive multi-agent orchestration system that transforms SillyTavern's response generation into a full editorial production pipeline. It coordinates multiple specialized AI agents to produce high-quality, consistent narrative responses.

**Version:** 2.1.0-alpha
**Status:** Alpha Complete

## Features

- **Six-System Architecture**: Modular design with clear separation of concerns
- **Multi-Agent Orchestration**: Coordinate multiple LLM agents in configurable pipelines
- **Three Orchestration Modes**: Synthesis, Compilation, and Injection
- **Advanced Prompt Builder**: Council Macros, conditionals, transforms, live validation
- **Curation System**: Topological data stores with CRUD/RAG pipelines
- **Character System**: Dynamic avatar agents from character data
- **User Gavel System**: Review and edit at key decision points
- **Full ST Integration**: Uses SillyTavern's APIs for seamless chat integration

## Quick Start

### Installation

1. Navigate to your SillyTavern installation's extensions folder:
   ```
   SillyTavern/public/scripts/extensions/third-party/
   ```

2. Clone or copy the `TheCouncil` folder into this directory

3. Restart SillyTavern

4. The Council button (⚖️) should appear next to your send button

### Basic Usage

1. Click the **⚖️ Council** button to open the navigation panel
2. Configure your pipeline in the **Pipeline** tab
3. Set up agents, positions, and teams
4. Run the pipeline using the **Execute** button
5. Review and edit at User Gavel points

## Architecture

### Six Systems

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           THE COUNCIL KERNEL                                 │
│  (EventBus, StateManager, Storage, Presets, Hooks, UI Components)           │
└────────────────────────────────────┬────────────────────────────────────────┘
          ┌──────────────────────────┼──────────────────────────┐
          ▼                          ▼                          ▼
┌─────────────────┐      ┌─────────────────────┐      ┌─────────────────┐
│ CURATION SYSTEM │      │ PROMPT BUILDER SYS  │      │ CHARACTER SYSTEM│
│ (Topologists)   │      │ (Macros/Tokens)     │      │ (Avatars)       │
└────────┬────────┘      └──────────┬──────────┘      └────────┬────────┘
         └───────────────────────────┼─────────────────────────┘
┌────────────────────────────────────┴────────────────────────────────────────┐
│              RESPONSE PIPELINE BUILDER SYSTEM (Editorial Agents)            │
└────────────────────────────────────┬────────────────────────────────────────┘
┌────────────────────────────────────┴────────────────────────────────────────┐
│                      RESPONSE ORCHESTRATION SYSTEM                           │
│              (Synthesis | Compilation | Injection modes)                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### File Structure

```
TheCouncil/
├── index.js                    # Entry point
├── core/                       # System implementations
│   ├── kernel.js               # The Council Kernel
│   ├── curation-system.js      # Curation System
│   ├── character-system.js     # Character System
│   ├── prompt-builder-system.js # Prompt Builder System
│   ├── pipeline-builder-system.js # Pipeline Builder System
│   └── orchestration-system.js # Orchestration System
├── ui/                         # User interface
│   ├── nav-modal.js            # Navigation modal
│   └── components/             # Reusable UI components
├── data/presets/               # Pipeline presets
└── docs/                       # Documentation
```

## Orchestration Modes

| Mode | Purpose | Use Case |
|------|---------|----------|
| **Synthesis** | Multi-agent workflow produces final response | Complex creative tasks requiring multiple perspectives |
| **Compilation** | Multi-agent workflow produces optimized prompt | Prompt engineering and optimization |
| **Injection** | Replace ST tokens with Curation RAG outputs | Fast context injection without full pipeline |

## Pipeline Configuration

### Agents

LLM-backed workers that process inputs and produce outputs:
- Configurable system prompts using the Prompt Builder
- Per-agent API settings (temperature, max tokens)
- Support for custom and ST-native endpoints

### Positions

Roles within teams that define how agents participate:
- Role descriptions
- Prompt modifiers (prefix, suffix)
- Priority ordering

### Teams

Groups of positions working together:
- Team-level orchestration modes
- Participant selection
- Output aggregation

### Phases & Actions

Multi-step workflows:
- Phases contain ordered actions
- Actions can reference agents, curation stores, or character avatars
- Input/output variable flow
- Gavel points for user intervention

## Prompt Builder

The Prompt Builder provides advanced prompt construction:

### Modes
- **Custom**: Write prompts directly with macro support
- **ST Preset**: Use SillyTavern prompt presets
- **Token Builder**: Drag-and-drop token assembly

### Council Macros
```
{{macro:system_base}}
{{macro:greeting name="Alice" location="wonderland"}}
```

### Conditional Blocks
```
{{#if phase.isFirst}}
  This is the first phase.
{{else}}
  Building on previous work.
{{/if}}
```

### Transform Pipelines
```
{{input | uppercase | truncate:100}}
{{agent.name | default:'Unknown'}}
```

## Curation System

Manage topological data stores:

### Stores
- Define custom schemas with fields and types
- CRUD operations on entries
- Topological indexing for relationships

### RAG Pipelines
- Retrieval-augmented generation
- Query building with LLM assistance
- Context injection into prompts

### Topologist Agents
- AI-powered data management
- Automatic categorization and indexing

## Character System

Dynamic avatar agents:

### Character Avatars
- Generate agents from character data
- Automatic personality and knowledge extraction
- Voice consistency guidance

### Character Director
- Coordinates multiple character agents
- Ensures narrative consistency

## API Reference

### Global Object

```javascript
window.TheCouncil = {
  // Modules
  getModule(name),         // Get registered module

  // Events
  on(event, handler),      // Subscribe to event
  off(event, handler),     // Unsubscribe
  emit(event, data),       // Emit event

  // State
  getState(),              // Get current state
  setState(path, value),   // Update state

  // Storage
  save(key, data),         // Save to storage
  load(key),               // Load from storage

  // Presets
  discoverPresets(),       // Find available presets
  loadPreset(name),        // Load preset by name
  applyPreset(preset),     // Apply preset to current config
};
```

### Events

```javascript
// System events
'kernel:ready'              // Kernel initialized
'pipeline:start'            // Pipeline execution started
'pipeline:phase'            // Phase started
'pipeline:action'           // Action started
'pipeline:complete'         // Pipeline finished
'pipeline:error'            // Error occurred
'gavel:await'               // User intervention needed
'gavel:resolved'            // User intervention complete

// UI events
'ui:modal:open'             // Modal opened
'ui:modal:close'            // Modal closed
```

## Configuration

### Pipeline Presets

Located in `data/presets/`:
- `default-pipeline.json` - Empty starter pipeline
- `quick-pipeline.json` - Single-phase quick execution
- `standard-pipeline.json` - Multi-phase editorial workflow

### Per-Agent Settings

```javascript
{
  apiConfig: {
    useCurrentConnection: true,  // Use ST's current API
    temperature: 0.7,
    maxTokens: 2048,
  },
  systemPrompt: {
    source: "custom",           // custom | character | curation
    customText: "...",
    promptConfig: { ... }       // Prompt Builder config
  }
}
```

## Troubleshooting

### Common Issues

**Pipeline won't start:**
- Check browser console for errors
- Verify all systems initialized (look for "initialized" logs)
- Ensure preset is valid

**Agents not responding:**
- Check API configuration in agent settings
- Verify API key if using custom endpoints
- Check rate limiting

**Context missing:**
- Ensure Curation stores have data
- Verify token resolution in Prompt Builder preview

### Debug Mode

Enable debug logging in browser console:
```javascript
window.TheCouncil.getModule('logger').setLevel('debug');
```

## Documentation

| Document | Purpose |
|----------|---------|
| `CLAUDE.md` | Developer quick reference |
| `docs/SYSTEM_DEFINITIONS.md` | Complete system specifications |
| `docs/STATUS_REPORT.md` | Implementation status |
| `docs/DEVELOPMENT_PLAN.md` | Development task plan |

## Credits

- **Author**: The Liquor Priest
- **Inspiration**: Wild Turkey 101 Bourbon

## License

MIT License - See LICENSE file for details

---

*"Many voices, one story."*
