# Session Start Checklist

**Every session MUST complete these steps before any work begins.**

---

## 1. Memory-Keeper Initialization

```javascript
mcp__memory-keeper__context_session_start({
  name: "TheCouncil-[Role]",
  projectDir: "D:/LLM/ST/SillyTavern-Launcher/SillyTavern/public/scripts/extensions/third-party/TheCouncil"
})
```

- [ ] Session initialized with appropriate name
- [ ] Project directory correct

---

## 2. Context Retrieval

```javascript
// Get relevant previous context
mcp__memory-keeper__context_search({ query: "[relevant topic]" })
mcp__memory-keeper__context_get({ category: "decision" })
mcp__memory-keeper__context_get({ category: "error" })
mcp__memory-keeper__context_get({ priorities: ["high"] })
```

- [ ] Searched for relevant prior context
- [ ] Retrieved high-priority items
- [ ] Checked for errors from previous sessions

---

## 3. Definition Loading

```markdown
Read .claude/definitions/index.md FIRST
Load ALL definitions listed in the index
```

- [ ] Read definitions/index.md
- [ ] Loaded SYSTEM_DEFINITIONS.md
- [ ] Loaded VIEWS.md
- [ ] Loaded context-specific definitions as needed

---

## 4. Tool Preferences Verified

| Tool Type | Primary | Fallback |
|-----------|---------|----------|
| Code Search | ast-grep | Grep (simple text only) |
| Parallel Browser | concurrent-browser | - |
| Sequential Browser | playwright | - |
| File Search | Glob | - |

- [ ] ast-grep available for code analysis
- [ ] Correct browser MCP for task type

---

## 5. Current State Check

- [ ] Read CLAUDE.md for project context
- [ ] Checked active development plan status
- [ ] Reviewed any pending tasks or blockers

---

## Ready to Work

Only proceed when all checkboxes above are complete.
