# UI Testing with Browser Automation

This document describes how to use browser automation (MCP) for testing The Council extension in SillyTavern.

## Overview

The Council project is configured with two MCP (Model Context Protocol) browser automation servers:

| Server | Package | Purpose |
|--------|---------|---------|
| **playwright** | `@playwright/mcp` | Programmatic browser control (headless/headed) |
| **browsermcp** | `@browsermcp/mcp` | Control live Chrome browser (requires extension) |

## Setup

### Prerequisites

- SillyTavern running locally (default: `http://127.0.0.1:8000/`)
- Claude Code with MCP support
- Node.js (for npx)

### MCP Configuration

The `.mcp.json` file in the project root configures both servers:

```json
{
  "mcpServers": {
    "playwright": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest"]
    },
    "browsermcp": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@browsermcp/mcp@latest"]
    }
  }
}
```

### Adding MCP Servers (if not configured)

```bash
# Add to user config (persists across projects)
claude mcp add playwright -s user -- npx -y @playwright/mcp@latest
claude mcp add browsermcp -s user -- npx -y @browsermcp/mcp@latest

# Verify servers are connected
claude mcp list
```

### Browser MCP Chrome Extension (Optional)

For `browsermcp` to control your live browser:
1. Install from: https://chromewebstore.google.com/detail/browser-mcp/ifnpjjdlfkdhipmpfpjpeilhopmdgcbd
2. Enable the extension
3. Open Chrome to your SillyTavern instance

## Available MCP Tools

### Navigation
- `mcp__playwright__browser_navigate` - Navigate to URL
- `mcp__playwright__browser_navigate_back` - Go back

### Interaction
- `mcp__playwright__browser_click` - Click elements (requires `ref` from snapshot)
- `mcp__playwright__browser_type` - Type into text fields
- `mcp__playwright__browser_hover` - Hover over elements
- `mcp__playwright__browser_select_option` - Select dropdown options
- `mcp__playwright__browser_press_key` - Press keyboard keys

### Observation
- `mcp__playwright__browser_snapshot` - Get accessibility tree (preferred over screenshot)
- `mcp__playwright__browser_take_screenshot` - Capture visual screenshot
- `mcp__playwright__browser_console_messages` - Get console logs

### Advanced
- `mcp__playwright__browser_evaluate` - Execute JavaScript
- `mcp__playwright__browser_run_code` - Run Playwright code snippets
- `mcp__playwright__browser_wait_for` - Wait for text/time

## Common Testing Workflows

### 1. Navigate and Inspect

```
1. Navigate to SillyTavern: mcp__playwright__browser_navigate (url: "http://127.0.0.1:8000/")
2. Get page state: mcp__playwright__browser_snapshot
3. Check console for errors: mcp__playwright__browser_console_messages
```

### 2. Test Council UI

```
1. Navigate to SillyTavern
2. Take snapshot to find Council elements
3. Click Council navigation: ref for "🏛️ Council" button
4. Click specific system: e.g., "📚 Curation" button
5. Verify modal opens via snapshot
```

### 3. Run Integration Tests

```javascript
// Via browser_evaluate tool:
window.TheCouncil.runIntegrationTests()
```

### 4. Test Pipeline Execution

```
1. Open Pipeline modal
2. Configure pipeline settings
3. Click "▶️ Run" button
4. Monitor execution via snapshots
5. Check console for orchestration logs
```

## Element Reference System

The `browser_snapshot` tool returns an accessibility tree with `ref` attributes:

```yaml
- button "📚 Curation" [ref=e260] [cursor=pointer]:
    - generic [ref=e261]: 📚
    - generic [ref=e262]: Curation
```

To click this element:
```
mcp__playwright__browser_click(element: "Curation button", ref: "e260")
```

## Console Log Monitoring

The Council uses namespaced logging. Key prefixes to watch:

| Prefix | System |
|--------|--------|
| `[The_Council]` | General extension logs |
| `[The_Council][Kernel]` | Kernel system |
| `[The_Council][PromptBuilder]` | Prompt Builder |
| `[The_Council][PipelineBuilderSystem]` | Pipeline Builder |
| `[The_Council][CurationSystem]` | Curation System |
| `[The_Council][CharacterSystem]` | Character System |
| `[OrchestrationSystem]` | Orchestration |

## Debugging Tips

### Check Extension Loaded
Look for in console:
```
[The_Council] TheCouncil v2.0.0 initialized successfully
```

### Verify All Systems
```
[The_Council] info All core systems initialized
```

### Check for Errors
Filter console messages by level:
```
mcp__playwright__browser_console_messages(level: "error")
```

### Take Screenshot for Visual Debug
```
mcp__playwright__browser_take_screenshot(filename: "debug.png")
```

## Session Workflow

1. **Start Session**: Navigate to SillyTavern, verify Council loaded
2. **Get Context**: Take snapshot, review console logs
3. **Interact**: Click UI elements using refs from snapshot
4. **Verify**: Check results via new snapshot or console
5. **Debug**: Screenshot or evaluate JavaScript as needed

## Troubleshooting

### MCP Servers Not Connected
```bash
# Check status
claude mcp list

# Re-add if needed
claude mcp add playwright -s user -- npx -y @playwright/mcp@latest

# Restart Claude Code session
```

### Element Refs Change
Element refs (e.g., `e260`) are regenerated on each snapshot. Always take a fresh snapshot before interacting.

### Browser Not Responding
```bash
# Close browser via MCP
mcp__playwright__browser_close

# Navigate fresh
mcp__playwright__browser_navigate(url: "http://127.0.0.1:8000/")
```

### Council Not Loading
1. Check SillyTavern is running
2. Verify extension is enabled in ST settings
3. Check console for initialization errors
4. Refresh page and retry
