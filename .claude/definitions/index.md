# Definitions Index

**This file is the single source of truth for all project definitions.**

## THE BIBLE: `.claude/PROCESS_README.md`

**READ PROCESS_README.md FIRST** for authoritative process documentation including all paths, conventions, and requirements.

---

Every agent, command, and workflow MUST read this index first and load the definitions listed here dynamically. DO NOT hardcode definition paths elsewhere - always reference this index.

---

## Required Reading Order

When starting any session, load definitions in this order:

### 1. Core Definitions (Always Load)

| File | Purpose | Priority |
|------|---------|----------|
| `SYSTEM_DEFINITIONS.md` | Six-system architecture, data schemas, event patterns | **Critical** |
| `VIEWS.md` | Complete UI element inventory, modal structure, testing reference | **Critical** |
| `UI_BEHAVIOR.md` | Expected UI behavior spec for testing | Running UI tests | **Critical** |

### 2. Context-Specific Definitions (Load When Relevant)

| File | Purpose | Load When |
|------|---------|-----------|
| `DEFAULT_PIPELINE.md` | Pipeline structure, agent/team/phase definitions | Working on pipelines |


---

## Definition Summaries

### SYSTEM_DEFINITIONS.md

The authoritative document for The Council's six-system architecture:

- **Kernel** - Hub: shared modules, event bus, hooks, state, presets, UI
- **Curation System** - Knowledge bases, CRUD/RAG pipelines, Topologists
- **Character System** - Dynamic avatar agents from character data
- **Prompt Builder System** - Token registry, macros, transforms, conditionals
- **Pipeline Builder System** - Multi-step workflows, agents, teams, phases
- **Orchestration System** - Execute pipelines (Synthesis/Compilation/Injection)

**Key Sections:**
- System architecture diagrams
- Data schemas for each system
- Event namespacing conventions
- Module pattern reference

### VIEWS.md

Complete inventory of all UI elements in The Council:

- **6 Modals**: Navigation, Curation, Character, Pipeline, Injection, Gavel
- **26+ Sub-views** across all tabs
- **150+ UI elements** with expected behavior
- **Shared components**: Prompt Builder, Token Picker, etc.

**Use For:**
- UI development
- Browser automation testing
- Feature verification

### DEFAULT_PIPELINE.md

Reference for pipeline structure and presets:

- Agent definition schema
- Position configuration
- Team composition
- Phase workflow structure
- Action definitions
- Thread context management

### UI_BEHAVIOR.md

Expected behavior specification for UI testing:

- Button actions and expected results
- State transitions
- Error states
- Visual indicators
- Validation rules

---

## How to Use This Index

### For Agents

```javascript
// In agent prompts, include:
// "Read .claude/definitions/index.md first to discover required definitions.
//  Load ALL definitions listed in the index."
```

### For Slash Commands

```markdown
## MANDATORY: Definition Loading

Read `.claude/definitions/index.md` to discover required definitions.
Load the definitions listed there dynamically.
DO NOT hardcode definition paths.
```

### For Development Tasks

Before implementing any task:
1. Read this index
2. Load Core Definitions
3. Load Context-Specific Definitions relevant to the task
4. Check for any new definitions added since last session

---

## Adding New Definitions

When creating a new definition file:

1. Create the file in `.claude/definitions/`
2. Add it to this index with:
   - File name
   - Purpose description
   - Load condition (always, or when relevant)
3. Update affected agents/commands if needed

---

## Version History

| Date | Change |
|------|--------|
| 2024-12-15 | Initial index creation |
