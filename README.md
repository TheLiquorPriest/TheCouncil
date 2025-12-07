# The Council

**A Multi-LLM Story Production Pipeline for SillyTavern**

The Council is a comprehensive multi-agent orchestration system that transforms SillyTavern's response generation into a full editorial production pipeline. It coordinates multiple specialized AI agents across different teams to produce high-quality, consistent narrative responses.

## Features

- **Multi-Agent Architecture**: 20+ specialized agents organized into teams (Prose, Plot, World, Character, Environment, Record Keeping)
- **Pipeline-Based Processing**: 14 distinct phases from context retrieval to final output
- **Persistent Data Stores**: Track story state, characters, locations, plot lines, and more
- **Topological Indexing**: Efficient context retrieval and relationship mapping
- **Dynamic Character Agents**: Automatically create agents for present characters
- **Subject Matter Experts (SMEs)**: Dynamically spin up domain experts as needed
- **User Gavel System**: Review and edit at key decision points
- **Full ST Integration**: Uses SillyTavern's APIs for seamless chat integration

## Installation

1. Navigate to your SillyTavern installation's extensions folder:
   ```
   SillyTavern/public/scripts/extensions/third-party/
   ```

2. Clone or copy the `TheCouncil` folder into this directory

3. Restart SillyTavern

4. The Council button (⚖️) should appear next to your send button

## Architecture

### Module Structure

```
TheCouncil/
├── index.js                 # Entry point, module loader, ST integration
├── manifest.json            # Extension manifest
├── modules/
│   ├── config.js            # Agent, phase, thread, store definitions
│   ├── state.js             # Global state management & events
│   ├── stores.js            # Persistent storage CRUD operations
│   ├── context.js           # RAG system - retrieval & processing
│   ├── topology.js          # Topological indexing & relationship mapping
│   ├── generation.js        # LLM API calls (main + custom endpoints)
│   ├── agents.js            # Agent management & prompt building
│   ├── pipeline.js          # Pipeline orchestration
│   └── ui.js                # UI components & DOM management
├── styles/
│   └── main.css             # Stylesheet reference
└── data/
    └── stories/             # Per-story persistent data
```

### Agent Teams

| Team | Lead | Specialists |
|------|------|-------------|
| **Leadership** | Publisher | - |
| **Prose** | Editor | Scene Writer, Dialogue Writer, Action Writer, Character Writer |
| **Plot** | Plot Architect | Macro Plot, Micro Plot, Continuity Specialist |
| **World** | Scholar | Lore Specialist, Story Specialist |
| **Character** | Character Director | Dynamic character agents |
| **Environment** | Environment Director | Interior Specialist, Exterior Specialist |
| **Record Keeping** | Archivist | Story/Lore/Character/Scene/Location Topologists |

### Pipeline Phases

1. **Curate Persistent Stores** - Update story data stores
2. **Preliminary Context** - Identify needed context
3. **Understand User Instructions** - Interpret user intent (🔨 User Gavel)
4. **Secondary Context Pass** - Gather additional context
5. **Outline Draft** - Plot team creates outline
6. **Outline Review** - Teams review outline (parallel)
7. **Outline Consensus** - Finalize outline (🔨 User Gavel)
8. **First Draft** - Prose team writes (🔨 User Gavel)
9. **First Draft Review** - Character/Environment review (parallel)
10. **Second Draft** - Refine based on feedback (🔨 User Gavel)
11. **Second Draft Review** - Plot/World/Publisher review (parallel)
12. **Final Draft** - Final polish (🔨 User Gavel)
13. **Team Commentary** - Team leads comment, Archivist records
14. **Final Response** - Post to ST chat

## Persistent Data Stores

The Council maintains the following per-story data stores:

| Store | Description |
|-------|-------------|
| `storyDraft` | Current working draft |
| `storyOutline` | Current story outline |
| `storySynopsis` | Detailed synopsis (5 W's and How) |
| `plotLines` | Plot threads with status tracking |
| `scenes` | Scene details and timeline |
| `dialogueHistory` | Complete dialogue archive |
| `characterSheets` | All character data |
| `characterDevelopment` | Character arc tracking |
| `characterInventory` | Character possessions |
| `characterPositions` | Character locations |
| `factionSheets` | Faction data |
| `locationSheets` | Location details |
| `currentSituation` | Current story situation |
| `agentCommentary` | Archived agent commentary |
| `sessionHistory` | Pipeline run history |

## Configuration

### Per-Agent API Settings

Each agent can be configured independently:

```javascript
{
  enabled: true,           // Enable/disable agent
  useMainApi: true,        // Use ST's main API or custom
  apiEndpoint: "",         // Custom API endpoint
  apiKey: "",              // API key for custom endpoint
  model: "",               // Model to use
  temperature: 0.7,        // Temperature setting
  maxTokens: 1000,         // Max tokens per response
  systemPrompt: ""         // Custom system prompt
}
```

### Global Settings

```javascript
{
  delayBetweenCalls: 500,  // MS between API calls
  autoSaveStores: true,    // Auto-save store changes
  showTeamThreads: false,  // Expand team threads by default
  maxContextTokens: 8000,  // Context token budget
  contextStrategy: "relevance",  // Context selection strategy
  debugMode: false         // Enable debug logging
}
```

## Usage

### Basic Usage

1. Type your message in the SillyTavern input field
2. Click the **⚖️ Council** button (instead of Send)
3. Watch the pipeline execute in the panel (click 📜 to toggle)
4. Review and edit at User Gavel points
5. Final response is added to chat automatically

### Panel Features

- **Progress Bar**: Shows current phase progress
- **Thread Tabs**: View deliberations from each team
- **Collapse/Expand**: Click thread headers to toggle
- **Badge Counts**: See message counts per thread

### User Gavel

At key points, you can review and edit the content:

- Click **Skip (Accept)** to accept as-is
- Edit in the textarea and click **Apply Edits** to modify

## API Reference

### Global Object

```javascript
window.TheCouncil = {
  version: "0.3.0",
  modules: { ... },        // All module references
  
  // Methods
  run(userInput),          // Start pipeline with input
  abort(),                 // Abort running pipeline
  isRunning(),             // Check if pipeline is active
  getProgress(),           // Get current progress
  getSummary(),            // Get pipeline summary
  
  // Module Access
  getState(),              // Get State module
  getStores(),             // Get Stores module
  getContext(),            // Get Context module
  getTopology(),           // Get Topology module
  
  // Settings
  saveSettings(),          // Save current settings
  reloadSettings()         // Reload from ST
}
```

### Events

Subscribe to state events:

```javascript
TheCouncil.getState().on('pipeline:start', (data) => { ... });
TheCouncil.getState().on('pipeline:phase', ({ phase, index }) => { ... });
TheCouncil.getState().on('pipeline:complete', (data) => { ... });
TheCouncil.getState().on('pipeline:error', ({ error }) => { ... });
TheCouncil.getState().on('thread:entry', ({ threadId, entry }) => { ... });
TheCouncil.getState().on('gavel:await', ({ phaseId, prompt, content }) => { ... });
```

## Subject Matter Experts (SMEs)

SMEs are automatically activated based on content keywords:

| SME | Domain |
|-----|--------|
| Firearms | Weapons, ammunition, combat |
| Physics | Physical laws, mechanics |
| Survivalism | Survival skills, wilderness |
| History (US/World) | Historical accuracy |
| Medicine | Medical procedures, injuries |
| Psychology | Human behavior, motivations |
| Military | Military operations, tactics |
| Technology | Computers, electronics |
| Maritime | Naval, sailing |
| Legal | Law, legal procedures |
| Science | Scientific accuracy |

## Development

### Debug Mode

Enable debug logging:

```javascript
window.TheCouncil.debug = true;
```

### Module Development

Each module follows a consistent pattern:

```javascript
const ModuleName = {
  _state: null,
  
  init(dependencies) {
    // Initialize with dependencies
    return this;
  },
  
  // Methods...
};

// Export
if (typeof window !== "undefined") {
  window.ModuleName = ModuleName;
}
```

### Adding New Agents

1. Add role definition in `config.js` under `AGENT_ROLES`
2. Add to relevant pipeline phases in `PIPELINE_PHASES`
3. Add phase instructions in `agents.js` under `getPhaseInstructions`

### Adding New Phases

1. Define phase in `config.js` under `PIPELINE_PHASES`
2. Add handler in `pipeline.js` under `phaseHandlers`
3. Update UI if needed for new thread types

## Troubleshooting

### Common Issues

**Pipeline won't start:**
- Ensure SillyTavern's `executeSlashCommands` is available
- Check browser console for errors
- Verify extension loaded (should see toast on startup)

**Agents not responding:**
- Check API configuration in settings
- Verify API key if using custom endpoints
- Check rate limiting delays

**Context missing:**
- Ensure World Info is enabled and populated
- Check character card has content
- Verify chat history exists

### Logs

Check browser console for logs prefixed with `[The_Council]`

## License

MIT License - See LICENSE file for details

## Credits

Wild Turkey 101 Bourbon

---

*"Many voices, one story."*
