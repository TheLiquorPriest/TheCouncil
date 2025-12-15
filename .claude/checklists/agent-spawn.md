# Agent Spawn Checklist

**Complete this checklist when spawning any agent using the Task tool.**

---

## 1. Agent Selection

| Complexity | Agent | Use When |
|------------|-------|----------|
| Simple | dev-haiku | Docs, config, small fixes |
| Moderate | dev-sonnet | Standard features, clear scope |
| Complex | dev-opus | Architecture, multi-file, decisions |
| Planning | dev-opus-plan | Design only, no implementation |
| Code Review | code-audit-opus | After implementation complete |
| UI Testing | ui-feature-verification-test-* | Browser verification needed |

- [ ] Correct agent type selected for task complexity
- [ ] Model matches agent definition

---

## 2. Prompt Must Include

### Mandatory Session Init

```
## MANDATORY: Session Initialization

mcp__memory-keeper__context_session_start({
  name: "TheCouncil-[AgentRole]",
  projectDir: "D:/LLM/ST/SillyTavern-Launcher/SillyTavern/public/scripts/extensions/third-party/TheCouncil"
})

Retrieve relevant context:
mcp__memory-keeper__context_search({ query: "[topic]" })
```

- [ ] Memory-keeper init included
- [ ] Context retrieval included

### Mandatory Definition Loading

```
## MANDATORY: Definition Loading

Read .claude/definitions/index.md first.
Load ALL definitions listed in the index.
```

- [ ] Definition loading instruction included

### Mandatory Tool Preferences

```
## MANDATORY: Tool Preferences

**Use ast-grep FIRST** for code exploration:
ast-grep run --pattern '$PATTERN' --lang javascript [path]

For parallel browser operations, use concurrent-browser.
For sequential browser operations, playwright is acceptable.
```

- [ ] ast-grep preference stated
- [ ] Browser tool guidance included

### Context Saving Requirements

```
## Context Saving

Save progress:
mcp__memory-keeper__context_save({
  key: "[category]-[topic]",
  value: "[content]",
  category: "[decision|progress|error]",
  priority: "[high|normal]"
})
```

- [ ] Context saving instructions included

---

## 3. Task-Specific Content

- [ ] Clear task description
- [ ] Required reading files listed
- [ ] Acceptance criteria defined
- [ ] Expected deliverables stated
- [ ] Handoff format specified

---

## 4. Constraints Included

- [ ] Context budget warning (70% threshold)
- [ ] Commit message format
- [ ] No push/merge instruction
- [ ] Browser test requirement stated

---

## Agent Prompt Template

```
You are implementing [TASK] for The Council project.

## MANDATORY: Session Initialization
[memory-keeper init]

## MANDATORY: Definition Loading
[read definitions index]

## MANDATORY: Tool Preferences
[ast-grep first, browser tool guidance]

## Your Task
[clear description]

## Required Reading
1. CLAUDE.md
2. .claude/definitions/index.md → load all listed
3. [task-specific files]

## Deliverables
[list expected outputs]

## Acceptance Criteria
- [ ] [criterion 1]
- [ ] [criterion 2]

## Context Saving
[save instructions]

## Handoff Format
[handoff template]

## Constraints
- Context budget: Stop at 70%
- Commit format: "Task [ID]: [description]"
- Do NOT push. Do NOT merge.
- Browser test: [Yes/No]

Begin now.
```

---

## Ready to Spawn

Only spawn agent when all checkboxes are checked.
