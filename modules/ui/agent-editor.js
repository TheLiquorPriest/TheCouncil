/**
 * modules/ui/agent-editor.js - Agent Editor modal
 * Supports editorial/curation agent types, API/model settings, and system prompt source/overrides.
 */
const AgentEditor = {
  VERSION: "1.0.0",

  // References
  _config: null,
  _state: null,
  _agents: null,

  // State
  _initialized: false,
  _visible: false,
  _modal: null,
  _agentList: [],
  _selectedId: null,
  _hasChanges: false,

  init(modules = {}) {
    if (this._initialized) return this;

    this._config =
      modules.config ||
      (typeof window !== "undefined" ? window.CouncilConfig : null);
    this._state =
      modules.state ||
      (typeof window !== "undefined" ? window.CouncilState : null);
    this._agents =
      modules.agents ||
      (typeof window !== "undefined" ? window.CouncilAgents : null);

    this._loadAgents();
    this._createModal();
    this._injectStyles();
    this._bindEvents();

    this._initialized = true;
    return this;
  },

  isInitialized() {
    return this._initialized;
  },

  // ---------- Data ----------
  _loadAgents() {
    const roles = this._config?.AGENT_ROLES || {};
    this._agentList = Object.entries(roles).map(([id, role]) => {
      return {
        id,
        name: role.name || id,
        icon: role.icon || "🤖",
        type: role.agentType || "editorial", // editorial | curation
        apiEndpoint: role.apiEndpoint || "",
        apiKey: role.apiKey || "",

        model: role.model || "",

        temperature: role.temperature ?? 0.7,

        maxTokens: role.maxTokens ?? 1000,
        useSTApi: role.useSTApi ?? true,

        systemPromptSource: role.systemPromptSource || "custom", // custom | st_saved

        systemPromptName: role.systemPromptName || "",

        systemPrompt: role.systemPrompt || "",

        promptOrder: role.promptOrder || [],
        promptTokens: role.promptTokens || {},
        promptTokens: role.promptTokens || {},
      };
    });

    if (this._agentList.length) this._selectedId = this._agentList[0].id;
  },

  _saveAgents() {
    if (!this._config?.AGENT_ROLES) return;
    const newRoles = {};
    for (const agent of this._agentList) {
      newRoles[agent.id] = {
        ...(this._config.AGENT_ROLES[agent.id] || {}),
        name: agent.name,
        icon: agent.icon,
        agentType: agent.type,
        apiEndpoint: agent.apiEndpoint,
        apiKey: agent.apiKey,
        model: agent.model,
        temperature: agent.temperature,
        maxTokens: agent.maxTokens,
        useSTApi: agent.useSTApi,
        systemPromptSource: agent.systemPromptSource,
        systemPromptName: agent.systemPromptName,
        systemPrompt: agent.systemPrompt,
        promptOrder: agent.promptOrder || [],
        promptTokens: agent.promptTokens || {},
      };
    }
    this._config.AGENT_ROLES = newRoles;
    this._agents?.loadConfigs?.(this._config.AGENT_ROLES);
    this._hasChanges = false;
    const indicator = document.getElementById("ae-changes");
    if (indicator) indicator.style.display = "none";
    alert("Agent settings saved.");
  },

  _markChanged() {
    this._hasChanges = true;
    const indicator = document.getElementById("ae-changes");
    if (indicator) indicator.style.display = "inline";
  },

  // ---------- Modal ----------
  _createModal() {
    if (document.getElementById("agent-editor-modal")) {
      this._modal = document.getElementById("agent-editor-modal");
      return;
    }
    const html = `
      <div id="agent-editor-modal" class="agent-modal">
        <div class="agent-container">
          <div class="agent-header">
            <h3>🧑‍💻 Agent Editor</h3>
            <div class="agent-actions">
              <button class="ae-btn ae-btn-secondary" id="ae-dup">📋 Duplicate</button>
              <button class="ae-btn ae-btn-secondary" id="ae-del">🗑️ Delete</button>
              <button class="ae-btn ae-btn-secondary" id="ae-reset">Reset</button>
              <button class="ae-btn ae-btn-primary" id="ae-save">Save</button>
              <button class="ae-btn ae-btn-icon" id="ae-close">×</button>
            </div>
          </div>
          <div class="agent-body">
            <div class="agent-sidebar">
              <div class="ae-sidebar-header">
                <span>Agents</span>
                <button class="ae-btn ae-btn-small" id="ae-add">+ Add</button>
              </div>
              <div id="ae-list" class="ae-list"></div>
            </div>
            <div class="agent-main">
              <div id="ae-no-selection" class="ae-no-selection">
                <div class="ae-no-icon">🧠</div>
                <div>Select an agent</div>
              </div>
              <div id="ae-editor" class="ae-editor" style="display:none;"></div>
            </div>
          </div>
          <div class="agent-footer">
            <span id="ae-changes" style="display:none;">⚠️ Unsaved changes</span>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML("beforeend", html);
    this._modal = document.getElementById("agent-editor-modal");
  },

  _injectStyles() {
    if (document.getElementById("agent-editor-styles")) return;
    const styles = `
      .agent-modal { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: none; align-items: center; justify-content: center; z-index: 10002; }
      .agent-modal.visible { display: flex; }
      .agent-container { width: 90%; max-width: 1100px; height: 80%; background: var(--council-bg, #1a1a2e); border: 1px solid var(--council-border, #0f3460); border-radius: 10px; display: flex; flex-direction: column; overflow: hidden; color: var(--council-text, #e8e8e8); }
      .agent-header, .agent-footer { padding: 12px 14px; background: var(--council-header-bg, #16213e); border-bottom: 1px solid var(--council-border, #0f3460); display: flex; align-items: center; justify-content: space-between; }
      .agent-footer { border-top: 1px solid var(--council-border, #0f3460); border-bottom: none; }
      .agent-body { flex: 1; display: flex; overflow: hidden; }
      .agent-sidebar { width: 260px; border-right: 1px solid var(--council-border, #0f3460); display: flex; flex-direction: column; }
      .agent-main { flex: 1; padding: 12px; overflow-y: auto; }
      .ae-sidebar-header { display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; border-bottom: 1px solid var(--council-border, #0f3460); }
      .ae-list { padding: 10px; overflow-y: auto; flex: 1; }
      .ae-item { border: 1px solid var(--council-border, #0f3460); border-radius: 5px; padding: 8px 10px; margin-bottom: 6px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; }
      .ae-item.selected { border-color: var(--council-accent, #4a9eff); background: rgba(74,158,255,0.1); }
      .ae-item-name { font-weight: 600; }
      .ae-item-id { font-size: 11px; color: var(--council-text-muted, #a0a0a0); }
      .ae-no-selection { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; color: var(--council-text-muted, #a0a0a0); }
      .ae-no-icon { font-size: 42px; margin-bottom: 8px; }
      .ae-editor .ae-section { border: 1px solid var(--council-border, #0f3460); border-radius: 6px; padding: 10px; margin-bottom: 10px; }
      .ae-editor label { font-size: 12px; color: var(--council-text-muted, #a0a0a0); display: block; margin-bottom: 4px; }
      .ae-input, .ae-textarea, .ae-select { width: 100%; background: var(--council-bg-light, #1e2a4a); border: 1px solid var(--council-border, #0f3460); border-radius: 4px; color: var(--council-text, #e8e8e8); padding: 8px; font-size: 13px; }
      .ae-textarea { min-height: 80px; resize: vertical; }
      .ae-btn { padding: 6px 10px; border-radius: 4px; border: 1px solid var(--council-border, #0f3460); background: transparent; color: var(--council-text, #e8e8e8); cursor: pointer; transition: all 0.2s; font-size: 12px; }
      .ae-btn:hover { background: var(--council-hover, #1a2744); }
      .ae-btn-primary { background: var(--council-accent, #4a9eff); border-color: var(--council-accent, #4a9eff); color: #fff; }
      .ae-btn-secondary { background: var(--council-bg-light, #1e2a4a); }
      .ae-btn-small { padding: 4px 8px; font-size: 11px; }
      .ae-btn-icon { background: transparent; border: none; font-size: 18px; }
      .ae-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 8px; }
      .inline-hint { font-size: 11px; color: var(--council-text-muted, #a0a0a0); margin-top: 2px; }
      .ae-token-composer { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
      .ae-token-column { border: 1px solid var(--council-border, #0f3460); border-radius: 6px; padding: 8px; min-height: 120px; background: var(--council-bg-light, #1e2a4a); }
      .ae-token-title { font-weight: 600; margin-bottom: 6px; }
      .ae-token-pool, .ae-token-list { min-height: 80px; border: 1px dashed var(--council-border, #0f3460); padding: 6px; border-radius: 4px; display: flex; flex-direction: column; gap: 6px; }
      .ae-token-chip { padding: 4px 6px; border: 1px solid var(--council-border, #0f3460); border-radius: 4px; background: var(--council-bg, #1a1a2e); cursor: grab; display: flex; flex-direction: column; gap: 4px; min-width: 140px; }
      .ae-token-chip:hover { border-color: var(--council-accent, #4a9eff); }
      .ae-token-chip input { width: 100%; font-size: 11px; padding: 4px; background: var(--council-bg-light, #1e2a4a); border: 1px solid var(--council-border, #0f3460); border-radius: 4px; color: var(--council-text, #e8e8e8); }
      .ae-token-label { font-size: 12px; font-weight: 600; color: var(--council-text); }
    `;
    const styleEl = document.createElement("style");
    styleEl.id = "agent-editor-styles";
    styleEl.textContent = styles;
    document.head.appendChild(styleEl);
  },

  _bindEvents() {
    document
      .getElementById("ae-close")
      ?.addEventListener("click", () => this.hide());
    document
      .getElementById("ae-save")
      ?.addEventListener("click", () => this._saveAgents());
    document
      .getElementById("ae-reset")
      ?.addEventListener("click", () => this.reset());
    document
      .getElementById("ae-add")
      ?.addEventListener("click", () => this.addAgent());
    document
      .getElementById("ae-del")
      ?.addEventListener("click", () => this.deleteAgent());
    document
      .getElementById("ae-dup")
      ?.addEventListener("click", () => this.duplicateAgent());
    this._modal?.addEventListener("click", (e) => {
      if (e.target === this._modal) this.hide();
    });
  },

  // ---------- Rendering ----------
  _renderList() {
    const list = document.getElementById("ae-list");
    if (!list) return;
    if (!this._agentList.length) {
      list.innerHTML = `<div class="ae-item">No agents</div>`;
      return;
    }
    list.innerHTML = this._agentList
      .map(
        (a) => `
      <div class="ae-item ${a.id === this._selectedId ? "selected" : ""}" data-id="${a.id}">
        <div>
          <div class="ae-item-name">${this._escape(a.name || a.id)}</div>
          <div class="ae-item-id">${a.id} • ${a.type}</div>
        </div>
      </div>`,
      )
      .join("");

    list.querySelectorAll(".ae-item").forEach((el) => {
      el.addEventListener("click", () => {
        this._selectedId = el.dataset.id;
        this._renderList();
        this._renderEditor();
      });
    });
  },

  _renderEditor() {
    const editor = document.getElementById("ae-editor");
    const noSel = document.getElementById("ae-no-selection");
    if (!editor || !noSel) return;

    const agent = this._agentList.find((a) => a.id === this._selectedId);
    if (!agent) {
      noSel.style.display = "flex";
      editor.style.display = "none";
      return;
    }
    noSel.style.display = "none";
    editor.style.display = "block";

    editor.innerHTML = `
      <div class="ae-section">
        <label>Display Name</label>
        <input id="ae-name" class="ae-input" value="${this._escape(agent.name)}" />
      </div>
      <div class="ae-section ae-row">
        <div>
          <label>Agent ID</label>
          <input id="ae-id" class="ae-input" value="${this._escape(agent.id)}" />
          <div class="inline-hint">Unique identifier</div>
        </div>
        <div>
          <label>Icon (emoji/text)</label>
          <input id="ae-icon" class="ae-input" value="${this._escape(agent.icon)}" />
        </div>
        <div>
          <label>Type</label>
          <select id="ae-type" class="ae-select">
            <option value="editorial" ${agent.type === "editorial" ? "selected" : ""}>Editorial</option>
            <option value="curation" ${agent.type === "curation" ? "selected" : ""}>Curation</option>
          </select>
        </div>
      </div>

      <div class="ae-section">
        <label>API Settings</label>
        <div class="ae-row">
          <div>
            <label>API Endpoint</label>
            <input id="ae-endpoint" class="ae-input" value="${this._escape(agent.apiEndpoint)}" />
          </div>
          <div>
            <label>API Key</label>
            <input id="ae-apikey" class="ae-input" value="${this._escape(agent.apiKey)}" />
          </div>
          <div>
            <label>Model</label>
            <input id="ae-model" class="ae-input" value="${this._escape(agent.model)}" />
          </div>
          <div>
            <label><input type="checkbox" id="ae-use-st-api" ${agent.useSTApi ? "checked" : ""}/> Use ST API settings</label>
            <div class="inline-hint">If checked, use ST connection; overrides endpoint/key/model above</div>
          </div>
        </div>
        <div class="ae-row">
          <div>
            <label>Temperature</label>
            <input id="ae-temp" type="number" step="0.1" min="0" max="2" class="ae-input" value="${agent.temperature}" />
          </div>
          <div>
            <label>Max Tokens</label>
            <input id="ae-max" type="number" step="1" min="1" class="ae-input" value="${agent.maxTokens}" />
          </div>
        </div>
      </div>


      <div class="ae-section">

        <label>System Prompt</label>

        <div class="ae-row">

          <div>

            <label>Source</label>

            <select id="ae-sp-source" class="ae-select">

              <option value="custom" ${agent.systemPromptSource === "custom" ? "selected" : ""}>Custom</option>

              <option value="st_saved" ${agent.systemPromptSource === "st_saved" ? "selected" : ""}>ST Saved Prompt</option>

            </select>

          </div>

          <div>

            <label>Saved Prompt Name (if using ST)</label>

            <input id="ae-sp-name" class="ae-input" value="${this._escape(agent.systemPromptName)}" placeholder="e.g., persona_prompt_1" />
            <div class="inline-hint">Or pick a saved prompt:</div>
            <select id="ae-sp-name-select" class="ae-select">
              ${this._renderSavedPromptOptions(agent.systemPromptName)}
            </select>

          </div>

        </div>

        <label>Custom Prompt</label>

        <textarea id="ae-sp-text" class="ae-textarea" placeholder="Custom system prompt...">${this._escape(agent.systemPrompt)}</textarea>

        <div class="inline-hint">If ST saved prompt is selected, custom prompt is ignored at runtime.</div>

      </div>



      <div class="ae-section">
        <label>Prompt Tokens (drag to reorder)</label>
        <div class="inline-hint">Drag tokens into the active list to control ordering. Add optional prefix/suffix wrappers per token.</div>
        <div class="ae-token-composer">
          <div class="ae-token-column">
            <div class="ae-token-title">Available</div>
            <div id="ae-token-pool" class="ae-token-pool">
              ${this._renderTokenPool(agent)}
            </div>
          </div>
          <div class="ae-token-column">
            <div class="ae-token-title">Active Order</div>
            <div id="ae-token-list" class="ae-token-list">
              ${this._renderTokenList(agent)}
            </div>
          </div>
        </div>
      </div>


    `;

    // Bind inputs
    document.getElementById("ae-name")?.addEventListener("input", (e) => {
      agent.name = e.target.value;
      this._markChanged();
      this._renderList();
    });
    document.getElementById("ae-id")?.addEventListener("input", (e) => {
      agent.id = e.target.value;
      this._markChanged();
      this._renderList();
    });
    document.getElementById("ae-icon")?.addEventListener("input", (e) => {
      agent.icon = e.target.value;
      this._markChanged();
      this._renderList();
    });
    document.getElementById("ae-type")?.addEventListener("change", (e) => {
      agent.type = e.target.value;
      this._markChanged();
      this._renderList();
    });
    document.getElementById("ae-endpoint")?.addEventListener("input", (e) => {
      agent.apiEndpoint = e.target.value;
      this._markChanged();
    });
    document.getElementById("ae-apikey")?.addEventListener("input", (e) => {
      agent.apiKey = e.target.value;
      this._markChanged();
    });
    document.getElementById("ae-model")?.addEventListener("input", (e) => {
      agent.model = e.target.value;
      this._markChanged();
    });
    document.getElementById("ae-temp")?.addEventListener("input", (e) => {
      agent.temperature = parseFloat(e.target.value) || 0;
      this._markChanged();
    });
    document.getElementById("ae-max")?.addEventListener("input", (e) => {
      agent.maxTokens = parseInt(e.target.value, 10) || 0;
      this._markChanged();
    });
    document.getElementById("ae-sp-source")?.addEventListener("change", (e) => {
      agent.systemPromptSource = e.target.value;
      this._markChanged();
    });
    document.getElementById("ae-sp-name")?.addEventListener("input", (e) => {
      agent.systemPromptName = e.target.value;
      this._markChanged();
    });
    document
      .getElementById("ae-sp-name-select")
      ?.addEventListener("change", (e) => {
        agent.systemPromptName = e.target.value;
        const input = document.getElementById("ae-sp-name");
        if (input) input.value = agent.systemPromptName;
        this._markChanged();
      });

    document
      .getElementById("ae-use-st-api")
      ?.addEventListener("change", (e) => {
        agent.useSTApi = e.target.checked;
        this._markChanged();
      });
    document.getElementById("ae-sp-source")?.addEventListener("change", (e) => {
      agent.systemPromptSource = e.target.value;
      this._markChanged();
    });

    this._bindTokenDragDrop(agent);
  },

  // ---------- Agent CRUD ----------
  addAgent() {
    const id = `agent_${Date.now()}`;
    this._agentList.push({
      id,
      name: "New Agent",
      icon: "🤖",
      type: "editorial",

      apiEndpoint: "",

      apiKey: "",

      model: "",

      temperature: 0.7,

      maxTokens: 1000,

      useSTApi: true,
      systemPromptSource: "custom",

      systemPromptName: "",

      systemPrompt: "",

      promptOrder: [],
      promptTokens: {},
      includeChatHistory: true,

      includeWorldInfo: true,

      includeCharacterCard: true,

      includePersona: true,
    });

    this._selectedId = id;
    this._markChanged();
    this._renderList();
    this._renderEditor();
  },

  deleteAgent() {
    if (!this._selectedId) return;
    if (!confirm("Delete this agent?")) return;
    const idx = this._agentList.findIndex((a) => a.id === this._selectedId);
    if (idx >= 0) this._agentList.splice(idx, 1);
    this._selectedId = this._agentList[0]?.id || null;
    this._markChanged();
    this._renderList();
    this._renderEditor();
  },

  duplicateAgent() {
    if (!this._selectedId) return;
    const agent = this._agentList.find((a) => a.id === this._selectedId);
    if (!agent) return;
    const copy = JSON.parse(JSON.stringify(agent));
    copy.id = `${agent.id}_copy`;
    copy.name = `${agent.name} (Copy)`;

    // ensure promptTokens is cloned
    copy.promptTokens = JSON.parse(JSON.stringify(agent.promptTokens || {}));
    this._agentList.push(copy);

    this._selectedId = copy.id;

    this._markChanged();

    this._renderList();

    this._renderEditor();
  },

  reset() {
    if (this._hasChanges && !confirm("Discard changes?")) return;
    this._loadAgents();
    this._hasChanges = false;
    const indicator = document.getElementById("ae-changes");
    if (indicator) indicator.style.display = "none";
    this._renderList();
    this._renderEditor();
  },

  // ---------- Visibility ----------
  show() {
    if (!this._initialized) this.init();
    this._modal?.classList.add("visible");
    this._visible = true;
    this._renderList();
    this._renderEditor();
  },

  hide() {
    if (this._hasChanges && !confirm("Close with unsaved changes?")) return;
    this._modal?.classList.remove("visible");
    this._visible = false;
  },

  toggle() {
    if (this._visible) this.hide();
    else this.show();
  },

  // ---------- Token Composer ----------
  _renderTokenPool(agent) {
    const active = new Set(agent.promptOrder || []);
    return this._getAllTokens()
      .filter((t) => !active.has(t))
      .map(
        (t) =>
          `<div class="ae-token-chip" draggable="true" data-token="${t}"><div class="ae-token-label">${t}</div></div>`,
      )
      .join("");
  },
  _renderTokenList(agent) {
    const order =
      agent.promptOrder && agent.promptOrder.length
        ? agent.promptOrder
        : this._getDefaultTokenOrder();
    const wrappers = agent.promptTokens || {};
    return order
      .map((t, idx) => {
        const wrap = wrappers[t] || {};
        return `
          <div class="ae-token-chip" draggable="true" data-token="${t}" data-index="${idx}">
            <div class="ae-token-label">${t}</div>
            <input placeholder="Prefix" data-role="prefix" value="${this._escape(wrap.prefix || "")}" />
            <input placeholder="Suffix" data-role="suffix" value="${this._escape(wrap.suffix || "")}" />
          </div>
        `;
      })
      .join("");
  },

  _bindTokenDragDrop(agent) {
    const pool = document.getElementById("ae-token-pool");
    const list = document.getElementById("ae-token-list");
    if (!pool || !list) return;

    const updateFromList = () => {
      const chips = Array.from(list.querySelectorAll(".ae-token-chip"));
      agent.promptOrder = chips.map((c) => c.dataset.token);
      agent.promptTokens = agent.promptTokens || {};
      for (const chip of chips) {
        const token = chip.dataset.token;
        const prefix =
          chip.querySelector('input[data-role="prefix"]')?.value || "";
        const suffix =
          chip.querySelector('input[data-role="suffix"]')?.value || "";
        agent.promptTokens[token] = { prefix, suffix };
      }
      this._markChanged();
    };

    const handleDragStart = (e) => {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", e.target.dataset.token || "");
      const parent = e.target.closest(".ae-token-pool, .ae-token-list");
      e.dataTransfer.setData("source", parent?.id || "");
      e.target.classList.add("dragging");
    };
    const handleDragEnd = (e) => e.target.classList.remove("dragging");

    const enableDnD = (container) => {
      container.querySelectorAll(".ae-token-chip").forEach((chip) => {
        chip.addEventListener("dragstart", handleDragStart);
        chip.addEventListener("dragend", handleDragEnd);
      });
    };

    const handleDrop = (target) => (e) => {
      e.preventDefault();
      const token = e.dataTransfer.getData("text/plain");
      if (!token) return;

      const dropTargetChip = e.target.closest(".ae-token-chip");

      // If dropping from pool, clone new chip with prefix/suffix inputs
      if (e.dataTransfer.getData("source") === "ae-token-pool") {
        const chip = document.createElement("div");
        chip.className = "ae-token-chip";
        chip.draggable = true;
        chip.dataset.token = token;
        chip.innerHTML = `
          <div class="ae-token-label">${token}</div>
          <input placeholder="Prefix" data-role="prefix" />
          <input placeholder="Suffix" data-role="suffix" />
        `;
        if (dropTargetChip && dropTargetChip.parentElement === target) {
          target.insertBefore(chip, dropTargetChip);
        } else {
          target.appendChild(chip);
        }
        chip.addEventListener("dragstart", handleDragStart);
        chip.addEventListener("dragend", handleDragEnd);
        chip
          .querySelectorAll("input")
          .forEach((inp) => inp.addEventListener("input", updateFromList));
        // remove from pool
        const poolChip = pool.querySelector(`[data-token="${token}"]`);
        poolChip?.remove();
      } else {
        const dragging = document.querySelector(".ae-token-chip.dragging");
        if (dragging) {
          if (dropTargetChip && dropTargetChip.parentElement === target) {
            target.insertBefore(dragging, dropTargetChip);
          } else if (dragging.parentElement !== target) {
            target.appendChild(dragging);
          }
        }
      }
      updateFromList();
    };

    const handleDragOver = (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
    };

    pool.addEventListener("dragover", handleDragOver);
    list.addEventListener("dragover", handleDragOver);
    pool.addEventListener("drop", (e) => {
      e.preventDefault();
      const token = e.dataTransfer.getData("text/plain");
      if (!token) return;
      // remove from list back to pool
      const chip = list.querySelector(`[data-token="${token}"]`);
      if (chip) {
        chip.remove();
        const poolChip = document.createElement("div");
        poolChip.className = "ae-token-chip";
        poolChip.draggable = true;
        poolChip.dataset.token = token;
        poolChip.innerHTML = `<div class="ae-token-label">${token}</div>`;
        pool.appendChild(poolChip);
        poolChip.addEventListener("dragstart", handleDragStart);
        poolChip.addEventListener("dragend", handleDragEnd);
        updateFromList();
      }
    });
    list.addEventListener("drop", handleDrop(list));
    enableDnD(pool);
    enableDnD(list);

    list
      .querySelectorAll("input")
      .forEach((inp) => inp.addEventListener("input", updateFromList));
  },

  _getAllTokens() {
    return [
      "persona",
      "character_card",
      "world_info",
      "chat_history",
      "author_note",
      "memory",
      "lorebook",
      "bookmarks",
      "current_situation",
      "story_synopsis",
    ];
  },

  _renderSavedPromptOptions(selected) {
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
      // Prefer chat completion presets, then fall back to saved/prompts
      const saved =
        ctx.chatCompletionPresets || ctx.savedPrompts || ctx.prompts || {};
      return Object.keys(saved);
    } catch (e) {
      console.warn("[Agent Editor] Failed to read ST saved prompts:", e);
      return [];
    }
  },

  _getDefaultTokenOrder() {
    return ["persona", "character_card", "world_info", "chat_history"];
  },

  _getSavedPrompts() {
    try {
      const ctx = window?.SillyTavern?.getContext?.();
      if (!ctx) return [];
      const saved = ctx.savedPrompts || ctx.prompts || {};
      return Object.keys(saved);
    } catch (e) {
      console.warn("[Agent Editor] Failed to read ST saved prompts:", e);
      return [];
    }
  },

  _getDefaultTokenOrder() {
    return ["persona", "character_card", "world_info", "chat_history"];
  },

  // ---------- Utils ----------
  _escape(text) {
    if (text === undefined || text === null) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  },
};

// Export
if (typeof window !== "undefined") {
  window.AgentEditor = AgentEditor;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = AgentEditor;
}
