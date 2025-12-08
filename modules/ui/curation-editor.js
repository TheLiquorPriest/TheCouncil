/**
 * modules/ui/curation-editor.js - Curation Pipeline Editor UI
 * A compact modal to view/edit the isolated CurationPipeline phases,
 * import/export configurations, and run/abort curation runs.
 */

const CurationEditor = {
  VERSION: "1.0.0",

  // Module references
  _curation: null,
  _stores: null,
  _outputManager: null,
  _threadManager: null,
  _state: null,

  // DOM/state
  _modal: null,
  _isVisible: false,
  _initialized: false,
  _phases: [],
  _originalPhases: [],
  _selectedIndex: -1,
  _hasChanges: false,

  init(modules = {}) {
    if (this._initialized) return this;

    this._curation =
      modules.curation ||
      (typeof window !== "undefined" ? window.CurationPipeline : null);
    this._stores =
      modules.stores ||
      (typeof window !== "undefined" ? window.CouncilStores : null);
    this._outputManager =
      modules.outputManager ||
      (typeof window !== "undefined" ? window.OutputManager : null);
    this._threadManager =
      modules.threadManager ||
      (typeof window !== "undefined" ? window.ThreadManager : null);
    this._state =
      modules.state ||
      (typeof window !== "undefined" ? window.CouncilState : null);

    this._loadPhases();
    this._createModal();
    this._injectStyles();
    this._bindModalEvents();

    this._initialized = true;
    return this;
  },

  isInitialized() {
    return this._initialized;
  },

  // ---------- Data ----------
  _loadPhases() {
    const current = this._curation?.getPhases?.() || [];
    this._phases = JSON.parse(JSON.stringify(current));
    this._originalPhases = JSON.parse(JSON.stringify(current));
    this._hasChanges = false;
    this._selectedIndex = this._phases.length ? 0 : -1;
  },

  _markChanged() {
    this._hasChanges = true;
    const indicator = document.getElementById("curation-changes");
    if (indicator) indicator.style.display = "inline";
  },

  // ---------- Modal ----------
  _createModal() {
    if (document.getElementById("curation-editor-modal")) {
      this._modal = document.getElementById("curation-editor-modal");
      return;
    }

    const html = `
      <div id="curation-editor-modal" class="curation-modal">
        <div class="curation-container">
          <div class="curation-header">
            <h3>🧭 Curation Pipeline</h3>
            <div class="curation-header-actions">
              <button class="ce-btn ce-btn-secondary" id="ce-run">▶ Run</button>
              <button class="ce-btn ce-btn-secondary" id="ce-abort">🛑 Abort</button>
              <button class="ce-btn ce-btn-secondary" id="ce-import">📥 Import</button>
              <button class="ce-btn ce-btn-secondary" id="ce-export">📤 Export</button>
              <button class="ce-btn ce-btn-icon" id="ce-close">×</button>
            </div>
          </div>

          <div class="curation-body">
            <div class="curation-sidebar">
              <div class="ce-sidebar-header">
                <span>Phases</span>
                <button class="ce-btn ce-btn-small" id="ce-add">+ Add</button>
              </div>
              <div class="ce-phase-list" id="ce-phase-list"></div>
            </div>
            <div class="curation-main">
              <div class="ce-no-selection" id="ce-no-selection">
                <div class="ce-no-selection-icon">🧭</div>
                <div class="ce-no-selection-text">Select a phase</div>
              </div>
              <div class="ce-phase-editor" id="ce-phase-editor" style="display:none;"></div>
            </div>
          </div>

          <div class="curation-footer">
            <span id="curation-changes" style="display:none;">⚠️ Unsaved changes</span>
            <div class="ce-footer-actions">
              <button class="ce-btn ce-btn-secondary" id="ce-reset">Reset</button>
              <button class="ce-btn ce-btn-secondary" id="ce-cancel">Cancel</button>
              <button class="ce-btn ce-btn-primary" id="ce-save">Save</button>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML("beforeend", html);
    this._modal = document.getElementById("curation-editor-modal");
  },

  _injectStyles() {
    if (document.getElementById("curation-editor-styles")) return;
    const styles = `
      .curation-modal {
        position: fixed; inset: 0;
        background: rgba(0,0,0,0.6);
        display: none; align-items: center; justify-content: center;
        z-index: 10002;
      }
      .curation-modal.visible { display: flex; }
      .curation-container {
        width: 90%; max-width: 1100px; height: 80%;
        background: var(--council-bg, #1a1a2e);
        border: 1px solid var(--council-border, #0f3460);
        border-radius: 10px;
        display: flex; flex-direction: column; overflow: hidden;
        color: var(--council-text, #e8e8e8);
      }
      .curation-header, .curation-footer {
        padding: 12px 14px;
        background: var(--council-header-bg, #16213e);
        border-bottom: 1px solid var(--council-border, #0f3460);
        display: flex; align-items: center; justify-content: space-between;
      }
      .curation-footer { border-top: 1px solid var(--council-border, #0f3460); border-bottom: none; }
      .curation-body { flex: 1; display: flex; overflow: hidden; }
      .curation-sidebar {
        width: 260px; border-right: 1px solid var(--council-border, #0f3460);
        display: flex; flex-direction: column;
      }
      .curation-main { flex: 1; padding: 12px; overflow-y: auto; }
      .ce-sidebar-header {
        display: flex; justify-content: space-between; align-items: center;
        padding: 10px 12px; border-bottom: 1px solid var(--council-border, #0f3460);
      }
      .ce-phase-list { padding: 10px; overflow-y: auto; flex: 1; }
      .ce-phase-item {
        border: 1px solid var(--council-border, #0f3460);
        border-radius: 5px;
        padding: 8px 10px;
        margin-bottom: 6px;
        cursor: pointer;
        display: flex; justify-content: space-between; align-items: center;
      }
      .ce-phase-item.selected { border-color: var(--council-accent, #4a9eff); background: rgba(74,158,255,0.1); }
      .ce-phase-name { font-weight: 600; }
      .ce-phase-id { font-size: 11px; color: var(--council-text-muted, #a0a0a0); }
      .ce-phase-actions { display: flex; gap: 6px; }
      .ce-no-selection { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; color: var(--council-text-muted, #a0a0a0); }
      .ce-no-selection-icon { font-size: 42px; margin-bottom: 8px; }
      .ce-phase-editor .ce-section { border: 1px solid var(--council-border, #0f3460); border-radius: 6px; padding: 10px; margin-bottom: 10px; }
      .ce-phase-editor label { font-size: 12px; color: var(--council-text-muted, #a0a0a0); display: block; margin-bottom: 4px; }
      .ce-input, .ce-textarea {
        width: 100%; background: var(--council-bg-light, #1e2a4a);
        border: 1px solid var(--council-border, #0f3460);
        border-radius: 4px; color: var(--council-text, #e8e8e8);
        padding: 8px; font-size: 13px;
      }
      .ce-textarea { min-height: 80px; resize: vertical; }
      .ce-btn {
        padding: 6px 10px; border-radius: 4px;
        border: 1px solid var(--council-border, #0f3460);
        background: transparent; color: var(--council-text, #e8e8e8);
        cursor: pointer; transition: all 0.2s; font-size: 12px;
      }
      .ce-btn:hover { background: var(--council-hover, #1a2744); }
      .ce-btn-primary { background: var(--council-accent, #4a9eff); border-color: var(--council-accent, #4a9eff); color: #fff; }
      .ce-btn-secondary { background: var(--council-bg-light, #1e2a4a); }
      .ce-btn-small { padding: 4px 8px; font-size: 11px; }
      .ce-btn-icon { background: transparent; border: none; font-size: 18px; }
      .ce-footer-actions { display: flex; gap: 8px; }
    `;
    const styleEl = document.createElement("style");
    styleEl.id = "curation-editor-styles";
    styleEl.textContent = styles;
    document.head.appendChild(styleEl);
  },

  _bindModalEvents() {
    document
      .getElementById("ce-close")
      ?.addEventListener("click", () => this.hide());
    document
      .getElementById("ce-cancel")
      ?.addEventListener("click", () => this.hide());
    document
      .getElementById("ce-reset")
      ?.addEventListener("click", () => this.reset());
    document
      .getElementById("ce-save")
      ?.addEventListener("click", () => this.save());
    document
      .getElementById("ce-add")
      ?.addEventListener("click", () => this.addPhase());
    document
      .getElementById("ce-import")
      ?.addEventListener("click", () => this.importPhases());
    document
      .getElementById("ce-export")
      ?.addEventListener("click", () => this.exportPhases());
    document
      .getElementById("ce-run")
      ?.addEventListener("click", () => this.runCuration());
    document
      .getElementById("ce-abort")
      ?.addEventListener("click", () => this.abortCuration());
    this._modal?.addEventListener("click", (e) => {
      if (e.target === this._modal) this.hide();
    });
  },

  // ---------- Rendering ----------
  _renderPhaseList() {
    const list = document.getElementById("ce-phase-list");
    if (!list) return;
    if (!this._phases.length) {
      list.innerHTML = `<div class="ce-phase-empty">No phases</div>`;
      return;
    }
    const html = this._phases
      .map((p, idx) => {
        const selected = idx === this._selectedIndex ? "selected" : "";
        return `
          <div class="ce-phase-item ${selected}" data-index="${idx}">
            <div>
              <div class="ce-phase-name">${this._escape(p.name || p.id)}</div>
              <div class="ce-phase-id">${p.id}</div>
            </div>
            <div class="ce-phase-actions">
              <button class="ce-btn ce-btn-small" data-action="dup" data-index="${idx}">📋</button>
              <button class="ce-btn ce-btn-small" data-action="del" data-index="${idx}">🗑️</button>
            </div>
          </div>
        `;
      })
      .join("");
    list.innerHTML = html;

    list.querySelectorAll(".ce-phase-item").forEach((item) => {
      item.addEventListener("click", (e) => {
        const idx = parseInt(item.dataset.index, 10);
        const act = e.target?.dataset?.action;
        if (act === "dup") {
          this.duplicatePhase(idx);
        } else if (act === "del") {
          this.deletePhase(idx);
        } else {
          this.selectPhase(idx);
        }
      });
    });
  },

  _renderEditor() {
    const noSel = document.getElementById("ce-no-selection");
    const editor = document.getElementById("ce-phase-editor");
    if (!editor || !noSel) return;

    const phase = this._phases[this._selectedIndex];
    if (!phase) {
      noSel.style.display = "flex";
      editor.style.display = "none";
      return;
    }
    noSel.style.display = "none";
    editor.style.display = "block";

    editor.innerHTML = `
      <div class="ce-section">
        <label>Phase Name</label>
        <input id="ce-field-name" class="ce-input" value="${this._escape(phase.name || "")}" />
      </div>
      <div class="ce-section">
        <label>Phase ID (snake_case)</label>
        <input id="ce-field-id" class="ce-input" value="${this._escape(phase.id || "")}" />
      </div>
      <div class="ce-section">
        <label>Description</label>
        <textarea id="ce-field-desc" class="ce-textarea">${this._escape(phase.description || "")}</textarea>
      </div>
      <div class="ce-section">
        <label>Agents (comma-separated IDs)</label>
        <input id="ce-field-agents" class="ce-input" value="${(phase.agents || []).join(", ")}" />
        <div class="inline-hint">Order defines execution order</div>
      </div>
      <div class="ce-section">
        <label>Output Template (optional)</label>
        <textarea id="ce-field-output" class="ce-textarea">${this._escape(phase.outputTemplate || "")}</textarea>
      </div>


      <div class="ce-section">

        <label>System Prompt (ST Preset Optional)</label>
        <div class="inline-hint">Pick an ST chat completion preset and apply it as saved:&lt;prompt&gt; to an agent override.</div>
        <div class="ce-row">
          <div>
            <label>Pick saved prompt</label>
            <select id="ce-saved-prompt" class="ce-input">${this._renderSavedPromptOptions()}</select>
          </div>
          <div>
            <label>Apply to agent (id)</label>
            <input id="ce-saved-prompt-agent" class="ce-input" value="${(phase.agents || [])[0] || ""}" placeholder="agent_id">
          </div>
        </div>
      </div>

      <div class="ce-section">
        <label>Agent Prompt Overrides (optional)</label>

        <textarea id="ce-agent-prompts" class="ce-textarea" placeholder="agent_id: prompt...">${this._escape(this._formatAgentPrompts(phase.agentPromptOverrides))}</textarea>

        <div class="inline-hint">Use saved:&lt;prompt_name&gt; to reference ST presets, or write a custom prompt. One per line, e.g. "curation_lead: saved:my_prompt".</div>
      </div>



    `;

    // bind inputs
    document.getElementById("ce-field-name")?.addEventListener("input", (e) => {
      phase.name = e.target.value;
      this._markChanged();
      this._renderPhaseList();
    });
    document.getElementById("ce-field-id")?.addEventListener("input", (e) => {
      phase.id = e.target.value;
      this._markChanged();
      this._renderPhaseList();
    });
    document.getElementById("ce-field-desc")?.addEventListener("input", (e) => {
      phase.description = e.target.value;
      this._markChanged();
    });
    document
      .getElementById("ce-field-agents")
      ?.addEventListener("input", (e) => {
        phase.agents = e.target.value
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s.length);
        this._markChanged();
      });
    document
      .getElementById("ce-field-output")
      ?.addEventListener("input", (e) => {
        phase.outputTemplate = e.target.value;
        this._markChanged();
      });

    document

      .getElementById("ce-agent-prompts")

      ?.addEventListener("input", (e) => {
        phase.agentPromptOverrides = this._parseAgentPrompts(e.target.value);

        this._markChanged();
      });

    document

      .getElementById("ce-saved-prompt")
      ?.addEventListener("change", (e) => {
        const promptName = e.target.value;
        if (!promptName || promptName === "(no saved prompts detected)") return;
        const agentField = document.getElementById("ce-saved-prompt-agent");
        const agentId = agentField?.value?.trim();
        if (!agentId) return;
        const overrides = this._parseAgentPrompts(
          document.getElementById("ce-agent-prompts")?.value || "",
        );
        overrides[agentId] = `saved:${promptName}`;
        const textarea = document.getElementById("ce-agent-prompts");
        if (textarea) {
          textarea.value = this._formatAgentPrompts(overrides);
          phase.agentPromptOverrides = overrides;
          this._markChanged();
        }
      });
  },

  // ---------- Actions ----------
  selectPhase(idx) {
    this._selectedIndex = idx;
    this._renderPhaseList();
    this._renderEditor();
  },

  addPhase() {
    const phase = {
      id: `curation_${Date.now()}`,
      name: "New Curation Phase",
      description: "",
      agents: [],
      outputTemplate: "",
    };
    this._phases.push(phase);
    this._selectedIndex = this._phases.length - 1;
    this._markChanged();
    this._renderPhaseList();
    this._renderEditor();
  },

  deletePhase(idx) {
    if (idx < 0 || idx >= this._phases.length) return;
    if (!confirm("Delete this phase?")) return;
    this._phases.splice(idx, 1);
    if (this._selectedIndex >= this._phases.length)
      this._selectedIndex = this._phases.length - 1;
    this._markChanged();
    this._renderPhaseList();
    this._renderEditor();
  },

  duplicatePhase(idx) {
    const p = this._phases[idx];
    if (!p) return;
    const dup = JSON.parse(JSON.stringify(p));
    dup.id = `${p.id}_copy`;
    dup.name = `${p.name || p.id} (Copy)`;
    this._phases.splice(idx + 1, 0, dup);
    this._selectedIndex = idx + 1;
    this._markChanged();
    this._renderPhaseList();
    this._renderEditor();
  },

  reset() {
    if (this._hasChanges && !confirm("Discard all changes?")) return;
    this._loadPhases();
    document.getElementById("curation-changes")?.style &&
      (document.getElementById("curation-changes").style.display = "none");
    this._renderPhaseList();
    this._renderEditor();
  },

  save() {
    if (!this._curation?.setPhases) {
      alert("Curation pipeline not available.");
      return;
    }
    this._curation.setPhases(this._phases);
    this._originalPhases = JSON.parse(JSON.stringify(this._phases));
    this._hasChanges = false;
    const indicator = document.getElementById("curation-changes");
    if (indicator) indicator.style.display = "none";
    alert("Curation phases saved.");
  },

  importPhases() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const data = JSON.parse(evt.target.result);
          const phases = Array.isArray(data) ? data : data.phases;
          if (!Array.isArray(phases)) throw new Error("Invalid format");
          this._phases = JSON.parse(JSON.stringify(phases));
          this._selectedIndex = this._phases.length ? 0 : -1;
          this._markChanged();
          this._renderPhaseList();
          this._renderEditor();
        } catch (err) {
          alert("Import failed: " + err.message);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  },

  exportPhases() {
    const payload = {
      version: this.VERSION,
      exportedAt: new Date().toISOString(),
      phases: this._phases,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `curation-phases-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  runCuration() {
    if (!this._curation?.run) {
      alert("Curation pipeline not available.");
      return;
    }
    this._curation
      .run({ source: "ui" })
      .then((res) => {
        alert(
          res?.success
            ? "Curation completed."
            : "Curation ended (aborted or error).",
        );
      })
      .catch((e) => alert("Curation failed: " + e.message));
  },

  abortCuration() {
    if (this._curation?.abort) {
      this._curation.abort("User abort from UI");
    }
  },

  // ---------- Visibility ----------
  show() {
    if (!this._initialized) this.init();
    this._modal?.classList.add("visible");
    this._isVisible = true;
    this._renderPhaseList();
    this._renderEditor();
  },

  hide() {
    if (this._hasChanges && !confirm("Close with unsaved changes?")) return;
    this._modal?.classList.remove("visible");
    this._isVisible = false;
  },

  toggle() {
    if (this._isVisible) this.hide();
    else this.show();
  },

  // ---------- Helpers ----------
  _parseAgentPrompts(text) {
    if (!text) return {};
    const lines = text.split("\n");
    const map = {};
    for (const line of lines) {
      const idx = line.indexOf(":");
      if (idx === -1) continue;
      const key = line.slice(0, idx).trim();
      const value = line.slice(idx + 1).trim();
      if (key) map[key] = value;
    }
    return map;
  },

  _formatAgentPrompts(map) {
    if (!map || typeof map !== "object") return "";
    return Object.entries(map)
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n");
  },

  _renderSavedPromptOptions(selected = "") {
    const prompts = this._getSavedPrompts();
    const opts = prompts.length ? prompts : ["(no saved prompts detected)"];
    return opts
      .map(
        (name) =>
          `<option value="${this._escape(name)}" ${
            name === selected ? "selected" : ""
          }>${this._escape(name)}</option>`,
      )
      .join("");
  },

  _getSavedPrompts() {
    try {
      const ctx = window?.SillyTavern?.getContext?.();
      if (!ctx) return [];
      const saved =
        ctx.chatCompletionPresets || ctx.savedPrompts || ctx.prompts || {};
      return Object.keys(saved);
    } catch (e) {
      console.warn("[Curation Editor] Failed to read ST saved prompts:", e);
      return [];
    }
  },

  _formatActionBlocks(blocks) {
    if (!Array.isArray(blocks)) return "";
    return blocks
      .map((b) => {
        const agents = (b.agents || []).join(", ");
        const asyncFlag = b.async ? "true" : "false";
        return `${b.id || ""}|${b.name || ""}|${agents}|${asyncFlag}|${
          b.prompt || ""
        }`;
      })
      .join("\n");
  },

  _escape(text) {
    if (text === undefined || text === null) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  },
};

if (typeof window !== "undefined") {
  window.CurationEditor = CurationEditor;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = CurationEditor;
}
