# Agent Registry Index

**This file is the single source of truth for all custom agents.**

## THE BIBLE: `.claude/PROCESS_README.md`

**READ PROCESS_README.md FIRST** for authoritative process documentation including all paths, conventions, and agent spawn patterns.

---

Every command, workflow, and orchestrator MUST read this index first to discover available agents. DO NOT hardcode agent paths - always reference this index.

---

## CRITICAL: How to Use Custom Agents

The Task tool only accepts built-in `subagent_type` values. To use custom agents:

1. **Read this index** to find the correct agent for the task
2. **Read the agent definition file** from `.claude/agents/{agent-name}.md`
3. **Extract the model** from the frontmatter (opus, sonnet, haiku)
4. **Include the FULL agent instructions** in the Task prompt
5. **Use the correct model parameter** in the Task call

```javascript
// CORRECT: Include full agent instructions
Task({
  description: "Task description",
  subagent_type: "general-purpose",  // Built-in type required
  model: "sonnet",                    // From agent frontmatter
  prompt: `
[PASTE FULL CONTENTS OF .claude/agents/{agent-name}.md HERE]

---

## Task-Specific Context
[Your task details here]
`
})
```

---

## Agent Categories

### Development Agents

| Agent | Model | File | Use When |
|-------|-------|------|----------|
| `dev-opus` | opus | `dev-opus.md` | Complex multi-file changes, architectural decisions |
| `dev-sonnet` | sonnet | `dev-sonnet.md` | Standard features with clear specifications |
| `dev-haiku` | haiku | `dev-haiku.md` | Simple fixes, docs, config changes |
| `dev-opus-plan` | opus | `dev-opus-plan.md` | Task breakdown, architecture planning |

### Quality Assurance Agents

| Agent | Model | File | Use When |
|-------|-------|------|----------|
| `code-audit-opus` | opus | `code-audit-opus.md` | Code review after implementation, group audits |
| `ui-feature-verification-test-opus` | opus | `ui-feature-verification-test-opus.md` | Comprehensive UI testing, complex flows |
| `ui-feature-verification-test-sonnet` | sonnet | `ui-feature-verification-test-sonnet.md` | Standard UI verification |
| `qa-team-opusplan` | opus | `qa-team-opusplan.md` | QA planning and coordination |

### Expert Advisor Agents

| Agent | Model | File | Expertise |
|-------|-------|------|-----------|
| `uiux-expert-opus` | opus | `uiux-expert-opus.md` | UI/UX design, accessibility, behavior specs |
| `api-expert-opus` | opus | `api-expert-opus.md` | LLM APIs, backend integration |
| `sillytavern-expert-opus` | opus | `sillytavern-expert-opus.md` | ST platform, extension API |

### Management Agents

| Agent | Model | File | Role |
|-------|-------|------|------|
| `project-manager-opus` | opus | `project-manager-opus.md` | **DEFAULT SESSION AGENT** - Coordination, planning, status |

---

## Default Agent

**For all user sessions, use `project-manager-opus` by default** unless a specific agent is required for the task. See CLAUDE.md.

---

## Task-to-Agent Assignment

For development tasks, agent assignments are defined in:
```
.claude/agent-dev-plans/{version}/assignments.md
```

**ALWAYS read `assignments.md`** to find the correct agent for each task.

---

## Agent Definition Format

Each agent file follows this structure:

```markdown
---
name: agent-name
model: opus | sonnet | haiku
---

# Agent Name

[Agent description]

## MANDATORY: Session Initialization
[Memory-keeper initialization requirements]

## MANDATORY: Tool Preferences
[Required tools and usage patterns]

## MANDATORY: Context Saving
[When and how to save context]

## [Additional sections specific to agent role]
```

---

## Required Reading For Each Agent

Every agent definition specifies which definition files to read. Common requirements:

| Agent Type | Required Definitions |
|------------|---------------------|
| Development | SYSTEM_DEFINITIONS.md |
| UI Testing | VIEWS.md, UI_BEHAVIOR.md |
| Code Audit | SYSTEM_DEFINITIONS.md |
| UI/UX Expert | VIEWS.md, UI_BEHAVIOR.md |

**Always check the agent definition** for specific requirements.

---

## Adding New Agents

When creating a new agent:

1. Create the definition file in `.claude/agents/{agent-name}.md`
2. Use the standard frontmatter format with `name` and `model`
3. Include all MANDATORY sections
4. Add the agent to this index with:
   - Agent name
   - Model
   - File name
   - Use case description
5. Update `assignments.md` if the agent will be assigned to tasks

---

## Version History

| Date | Change |
|------|--------|
| 2025-12-15 | Initial index creation |
