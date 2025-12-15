# General Instructions for Agents

These instructions apply to all agents working on The Council project.

## Project Context

**The Council** is a SillyTavern browser extension that transforms response generation into a multi-agent editorial production pipeline.

- **Platform**: SillyTavern (browser-based)
- **Language**: JavaScript (ES6+), vanilla (no frameworks)
- **Architecture**: 6-system Kernel-based design

## Code Standards

### Module Pattern

```javascript
const SystemName = {
  VERSION: "2.0.0",
  _initialized: false,
  _kernel: null,

  init(kernel) {
    this._kernel = kernel;
    this._logger = kernel.getModule('logger');
    this._eventBus = kernel.getModule('eventBus');
    this._initialized = true;
    return this;
  },

  // Public methods
  publicMethod() { },

  // Private methods prefixed with _
  _privateMethod() { }
};
```

### Event Namespacing

- `kernel:*` - Kernel events
- `curation:*` - Curation System
- `character:*` - Character System
- `promptBuilder:*` - Prompt Builder
- `pipeline:*` - Pipeline Builder
- `orchestration:*` - Orchestration
- `ui:*` - UI events

### Logging

```javascript
this._logger.log('info', 'Message');
this._logger.log('warn', 'Warning');
this._logger.log('error', 'Error', errorObject);
```

### Error Handling

```javascript
try {
  // Operation
} catch (error) {
  this._logger.error('Operation failed:', error);
  throw error; // Re-throw if needed
}
```

## Do's and Don'ts

### Do

- Read existing code before modifying
- Follow established patterns in the file
- Add defensive null checks
- Test changes before marking complete
- Create complete handoff documents

### Don't

- Over-engineer solutions
- Add features beyond the task
- Refactor unrelated code
- Leave console.log statements
- Skip testing

## File Operations

### Reading Files
Always read before modifying:
```
Read → Understand → Modify → Test
```

### Creating Files
Only create files when explicitly required. Prefer editing existing files.

### Handoff Documents
Always create a handoff after completing a task:
```
.claude/agent-dev-plans/{version}/handoffs/task-{g}.{b}.{t}.md
```

## Communication

- Don't ask questions during implementation - use your judgment
- Document assumptions in handoff
- Flag blockers immediately with clear description
- Mark tasks BLOCKED if you can't proceed

## Quality Expectations

Before marking a task COMPLETE:
1. All acceptance criteria met
2. No console errors introduced
3. Code follows project patterns
4. Handoff document created

## Context Sources

| Document | Purpose |
|----------|---------|
| `.claude/definitions/SYSTEM_DEFINITIONS.md` | System architecture |
| `.claude/definitions/VIEWS.md` | UI structure |
| `.claude/agent-dev-plans/{version}/reference.md` | Plan-specific context |
| `schemas/systems.js` | Data schemas |
