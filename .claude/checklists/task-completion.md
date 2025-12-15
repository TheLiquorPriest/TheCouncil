# Task Completion Checklist

**Complete this checklist before marking any task as COMPLETE.**

---

## 1. Implementation Verification

- [ ] All acceptance criteria met
- [ ] Code compiles/runs without errors
- [ ] No console errors introduced
- [ ] No debug code left in (console.log, etc.)

---

## 2. Code Quality (use ast-grep)

```bash
# Check for debug statements
ast-grep run --pattern 'console.log($$$)' --lang javascript .

# Check for TODO comments
ast-grep run --pattern '// TODO' --lang javascript .

# Verify error handling exists
ast-grep run --pattern 'try { $$$BODY } catch ($E) { $$$HANDLER }' --lang javascript .
```

- [ ] No unexpected console.log statements
- [ ] No unresolved TODOs in modified files
- [ ] Error handling appropriate for the changes

---

## 3. Memory Context Saved

```javascript
// Save completion
mcp__memory-keeper__context_save({
  key: "task-{ID}-complete",
  value: "Completed: [summary]\nFiles: [list]",
  category: "progress",
  priority: "normal"
})

// Save any decisions made
mcp__memory-keeper__context_save({
  key: "decision-{topic}",
  value: "[decision and rationale]",
  category: "decision",
  priority: "high"
})
```

- [ ] Progress saved to memory
- [ ] Key decisions documented
- [ ] Any issues/warnings saved

---

## 4. Handoff Document Created

Create `.claude/handoffs/task-{ID}.md`:

- [ ] Status clearly stated (COMPLETE/PARTIAL/BLOCKED)
- [ ] Model used documented
- [ ] Files modified listed
- [ ] Acceptance criteria results with pass/fail
- [ ] Memory keys saved listed
- [ ] Issues encountered documented
- [ ] Browser test requirement noted

---

## 5. Files Committed

```bash
git add [files]
git commit -m "Task {ID}: [brief description]

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

- [ ] Only task-related files staged
- [ ] Commit message follows format
- [ ] No unrelated changes included

---

## 6. Browser Verification Required?

If task involves UI changes:

- [ ] Browser test scheduled
- [ ] Test criteria documented

If no UI changes:
- [ ] `browserTest: false` noted in handoff

---

## Ready to Mark Complete

Only set status to COMPLETE when all applicable checkboxes are checked.
