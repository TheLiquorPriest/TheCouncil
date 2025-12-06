// index.js - The Council Extension for SillyTavern
// A Multi-Agent Consensus Architecture for response generation

const EXTENSION_NAME = "The_Council";
const EXTENSION_FOLDER = "third-party/TheCouncil";

// ===== STATE =====
let isProcessing = false;
let extensionSettings = {};
let hasDeliberation = false; // Track if there's a deliberation to view

// ===== DEFAULT SETTINGS =====
const DEFAULT_SETTINGS = {
  agents: {
    editor: {
      name: "The Editor",
      enabled: true,
      useMainApi: true,
      apiEndpoint: "https://openrouter.ai/api/v1/chat/completions",
      apiKey: "",
      model: "deepseek/deepseek-chat",
      systemPrompt:
        "You are The Editor. Briefly analyze narrative constraints and structure. 2-3 sentences max. No thinking out loud.",
      temperature: 0.5,
      maxTokens: 150,
    },
    advocate: {
      name: "The Advocate",
      enabled: true,
      useMainApi: true,
      apiEndpoint: "https://openrouter.ai/api/v1/chat/completions",
      apiKey: "",
      model: "deepseek/deepseek-chat",
      systemPrompt:
        "You are The Advocate. Briefly state user intent. 2-3 sentences max. No thinking out loud.",
      temperature: 0.5,
      maxTokens: 150,
    },
    moderator: {
      name: "The Moderator",
      enabled: true,
      useMainApi: true,
      apiEndpoint: "https://openrouter.ai/api/v1/chat/completions",
      apiKey: "",
      model: "deepseek/deepseek-chat",
      systemPrompt:
        "Synthesize into 3-5 bullet point instructions. No preamble, no thinking, just the instructions.",
      temperature: 0.5,
      maxTokens: 200,
    },
    writer: {
      name: "The Writer",
      enabled: true,
      useMainApi: true,
      apiEndpoint: "https://openrouter.ai/api/v1/chat/completions",
      apiKey: "",
      model: "deepseek/deepseek-chat",
      systemPrompt:
        "Write the response directly. No preamble, no meta-commentary, no thinking out loud. Just the narrative response.",
      temperature: 0.7,
      maxTokens: 500,
    },
  },
  runParallel: false, // Run Editor and Advocate in parallel (can cause rate limits)
  delayBetweenCalls: 500, // Delay in ms between API calls (lowered for testing)
};

// ===== LOGGING =====
function log(msg) {
  console.log(`[${EXTENSION_NAME}] ${msg}`);
}

// ===== SETTINGS MANAGEMENT =====
const FORCE_RESET_SETTINGS = true; // Set to true during development to always use latest defaults

function loadSettings() {
  const context = SillyTavern.getContext();

  // Force reset for development/testing
  if (FORCE_RESET_SETTINGS) {
    log("FORCE_RESET_SETTINGS is enabled - resetting to defaults");
    context.extensionSettings[EXTENSION_NAME] =
      structuredClone(DEFAULT_SETTINGS);
  }

  // Initialize extension settings if not present
  if (!context.extensionSettings[EXTENSION_NAME]) {
    context.extensionSettings[EXTENSION_NAME] =
      structuredClone(DEFAULT_SETTINGS);
  }

  extensionSettings = context.extensionSettings[EXTENSION_NAME];

  // Merge any missing default properties (for updates)
  for (const key of Object.keys(DEFAULT_SETTINGS)) {
    if (extensionSettings[key] === undefined) {
      extensionSettings[key] = structuredClone(DEFAULT_SETTINGS[key]);
    }
  }

  for (const agentKey of Object.keys(DEFAULT_SETTINGS.agents)) {
    if (!extensionSettings.agents[agentKey]) {
      extensionSettings.agents[agentKey] = structuredClone(
        DEFAULT_SETTINGS.agents[agentKey],
      );
    } else {
      // Merge missing agent properties
      for (const prop of Object.keys(DEFAULT_SETTINGS.agents[agentKey])) {
        if (extensionSettings.agents[agentKey][prop] === undefined) {
          extensionSettings.agents[agentKey][prop] =
            DEFAULT_SETTINGS.agents[agentKey][prop];
        }
      }
    }
  }

  log("Settings loaded.");
}

function saveSettings() {
  const context = SillyTavern.getContext();
  context.extensionSettings[EXTENSION_NAME] = extensionSettings;
  context.saveSettingsDebounced();
  log("Settings saved.");
}

// ===== TIMEOUT HELPER =====
function withTimeout(promise, ms, errorMsg) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(errorMsg)), ms),
    ),
  ]);
}

// ===== DELAY HELPER =====
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ===== API GENERATION =====
async function generateWithMainApi(prompt, systemPrompt) {
  const context = SillyTavern.getContext();

  if (typeof context.executeSlashCommands !== "function") {
    throw new Error("executeSlashCommands not available");
  }

  const fullPrompt = `${systemPrompt}\n\n${prompt}`;
  const escapedPrompt = fullPrompt.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const command = `/genraw lock=on "${escapedPrompt}"`;

  const result = await withTimeout(
    context.executeSlashCommands(command),
    120000,
    "Generation timed out after 120s",
  );

  return result?.pipe || (typeof result === "string" ? result : "") || "";
}

async function generateWithCustomApi(prompt, systemPrompt, agentConfig) {
  const { apiEndpoint, apiKey, model, temperature, maxTokens } = agentConfig;

  if (!apiEndpoint || !apiKey) {
    throw new Error("API endpoint and key are required for custom API");
  }

  const requestBody = {
    model: model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt },
    ],
    temperature: temperature || 0.7,
    max_tokens: maxTokens || 1000,
  };

  const response = await withTimeout(
    fetch(apiEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    }),
    120000,
    "API request timed out after 120s",
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

async function generateForAgent(agentKey, prompt) {
  const agent = extensionSettings.agents[agentKey];

  if (!agent || !agent.enabled) {
    throw new Error(`Agent ${agentKey} is not enabled`);
  }

  log(`Generating for ${agent.name}...`);

  if (agent.useMainApi) {
    return await generateWithMainApi(prompt, agent.systemPrompt);
  } else {
    return await generateWithCustomApi(prompt, agent.systemPrompt, agent);
  }
}

// ===== MODAL MANAGEMENT =====
function createModal() {
  const existing = document.getElementById("council-modal");
  if (existing) existing.remove();

  const modalHtml = `
    <div id="council-modal" class="council-modal">
      <div class="council-modal-content">
        <div class="council-modal-header">
          <h3>⚖️ The Council Deliberation</h3>
          <button id="council-modal-close" class="council-modal-close">×</button>
        </div>
        <div class="council-modal-body">
          <div class="council-section" id="council-input-section">
            <div class="council-section-header">📝 User Input</div>
            <div class="council-section-content" id="council-input"></div>
          </div>
          <div class="council-section" id="council-editor-section">
            <div class="council-section-header">📋 The Editor (Narrative Constraints)</div>
            <div class="council-section-content" id="council-editor">
              <span class="council-waiting">Waiting...</span>
            </div>
          </div>
          <div class="council-section" id="council-advocate-section">
            <div class="council-section-header">🗣️ The Advocate (User Intent)</div>
            <div class="council-section-content" id="council-advocate">
              <span class="council-waiting">Waiting...</span>
            </div>
          </div>
          <div class="council-section" id="council-consensus-section">
            <div class="council-section-header">🤝 Consensus Instructions</div>
            <div class="council-section-content" id="council-consensus">
              <span class="council-waiting">Waiting...</span>
            </div>
          </div>
          <div class="council-section" id="council-final-section">
            <div class="council-section-header">✍️ Final Response</div>
            <div class="council-section-content" id="council-final">
              <span class="council-waiting">Waiting...</span>
            </div>
          </div>
        </div>
        <div class="council-modal-footer">
          <span id="council-status">Initializing...</span>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", modalHtml);

  document
    .getElementById("council-modal-close")
    .addEventListener("click", hideModal);
  document.getElementById("council-modal").addEventListener("click", (e) => {
    if (e.target.id === "council-modal") hideModal();
  });
}

function showModal(resetContent = false) {
  let modal = document.getElementById("council-modal");
  if (!modal) {
    createModal();
    modal = document.getElementById("council-modal");
  }
  modal.style.display = "flex";

  // Only reset content when starting a new deliberation
  if (resetContent) {
    document.getElementById("council-input").innerHTML = "";
    document.getElementById("council-editor").innerHTML =
      '<span class="council-waiting">Waiting...</span>';
    document.getElementById("council-advocate").innerHTML =
      '<span class="council-waiting">Waiting...</span>';
    document.getElementById("council-consensus").innerHTML =
      '<span class="council-waiting">Waiting...</span>';
    document.getElementById("council-final").innerHTML =
      '<span class="council-waiting">Waiting...</span>';
    document.getElementById("council-status").textContent = "Initializing...";
  }
}

function hideModal() {
  const modal = document.getElementById("council-modal");
  if (modal) modal.style.display = "none";
}

function toggleModal() {
  const modal = document.getElementById("council-modal");
  if (modal && modal.style.display === "flex") {
    hideModal();
  } else if (hasDeliberation) {
    showModal(false); // Don't reset, just show existing content
  } else {
    toastr.info(
      "No deliberation to show yet. Click Council to generate one.",
      EXTENSION_NAME,
    );
  }
}

function updateModalSection(sectionId, content, isActive = false) {
  const section = document.getElementById(sectionId);
  if (section) {
    section.innerHTML = content.replace(/\n/g, "<br>");
  }

  const container = document.getElementById(`${sectionId}-section`);
  if (container) {
    container.classList.toggle("council-active", isActive);
  }
}

function updateModalStatus(status) {
  const statusEl = document.getElementById("council-status");
  if (statusEl) statusEl.textContent = status;
}

// ===== SETTINGS PANEL =====
function createSettingsPanel() {
  const settingsHtml = `
    <div id="council-settings" class="council-settings">
      <div class="inline-drawer">
        <div class="inline-drawer-toggle inline-drawer-header">
          <b>⚖️ The Council Settings</b>
          <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
        </div>
        <div class="inline-drawer-content">
          <div class="council-settings-section">
            <h4>General Settings</h4>
            <label class="checkbox_label">
              <input type="checkbox" id="council-parallel" />
              <span>Run Editor & Advocate in Parallel</span>
            </label>
            <div class="council-setting-row">
              <label>Delay between API calls (ms):</label>
              <input type="number" id="council-delay" min="0" max="10000" step="100" />
            </div>
          </div>

          <div class="council-settings-section" id="council-agent-settings">
            <h4>Agent Configuration</h4>
            <select id="council-agent-select">
              <option value="editor">📋 The Editor</option>
              <option value="advocate">🗣️ The Advocate</option>
              <option value="moderator">🤝 The Moderator</option>
              <option value="writer">✍️ The Writer</option>
            </select>

            <div id="council-agent-config">
              <label class="checkbox_label">
                <input type="checkbox" id="council-agent-enabled" />
                <span>Agent Enabled</span>
              </label>

              <label class="checkbox_label">
                <input type="checkbox" id="council-agent-use-main" />
                <span>Use SillyTavern's Main API</span>
              </label>

              <div class="council-custom-api" id="council-custom-api-section">
                <div class="council-setting-row">
                  <label>API Endpoint:</label>
                  <input type="text" id="council-agent-endpoint" placeholder="https://openrouter.ai/api/v1/chat/completions" />
                </div>
                <div class="council-setting-row">
                  <label>API Key:</label>
                  <input type="password" id="council-agent-apikey" placeholder="sk-..." />
                </div>
                <div class="council-setting-row">
                  <label>Model:</label>
                  <input type="text" id="council-agent-model" placeholder="deepseek/deepseek-chat" />
                </div>
                <div class="council-setting-row">
                  <label>Temperature:</label>
                  <input type="number" id="council-agent-temp" min="0" max="2" step="0.1" />
                </div>
                <div class="council-setting-row">
                  <label>Max Tokens:</label>
                  <input type="number" id="council-agent-tokens" min="100" max="8000" step="100" />
                </div>
              </div>

              <div class="council-setting-row">
                <label>System Prompt:</label>
                <textarea id="council-agent-prompt" rows="4"></textarea>
              </div>
            </div>
          </div>

          <div class="council-settings-actions">
            <button id="council-save-settings" class="menu_button">Save Settings</button>
            <button id="council-reset-settings" class="menu_button">Reset to Defaults</button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Find the extensions settings area
  const extensionsSettings = document.getElementById("extensions_settings");
  if (extensionsSettings) {
    extensionsSettings.insertAdjacentHTML("beforeend", settingsHtml);
    bindSettingsEvents();
    log("Settings panel created.");
  } else {
    log("WARNING: Could not find extensions_settings container.");
  }
}

function bindSettingsEvents() {
  // General settings
  document
    .getElementById("council-parallel")
    ?.addEventListener("change", (e) => {
      extensionSettings.runParallel = e.target.checked;
    });

  document.getElementById("council-delay")?.addEventListener("change", (e) => {
    extensionSettings.delayBetweenCalls = parseInt(e.target.value) || 1000;
  });

  // Agent select
  document
    .getElementById("council-agent-select")
    ?.addEventListener("change", (e) => {
      loadAgentSettings(e.target.value);
    });

  // Use main API toggle
  document
    .getElementById("council-agent-use-main")
    ?.addEventListener("change", (e) => {
      const customSection = document.getElementById(
        "council-custom-api-section",
      );
      if (customSection) {
        customSection.style.display = e.target.checked ? "none" : "block";
      }
      updateCurrentAgentSetting("useMainApi", e.target.checked);
    });

  // Agent settings inputs
  document
    .getElementById("council-agent-enabled")
    ?.addEventListener("change", (e) => {
      updateCurrentAgentSetting("enabled", e.target.checked);
    });

  document
    .getElementById("council-agent-endpoint")
    ?.addEventListener("change", (e) => {
      updateCurrentAgentSetting("apiEndpoint", e.target.value);
    });

  document
    .getElementById("council-agent-apikey")
    ?.addEventListener("change", (e) => {
      updateCurrentAgentSetting("apiKey", e.target.value);
    });

  document
    .getElementById("council-agent-model")
    ?.addEventListener("change", (e) => {
      updateCurrentAgentSetting("model", e.target.value);
    });

  document
    .getElementById("council-agent-temp")
    ?.addEventListener("change", (e) => {
      updateCurrentAgentSetting("temperature", parseFloat(e.target.value));
    });

  document
    .getElementById("council-agent-tokens")
    ?.addEventListener("change", (e) => {
      updateCurrentAgentSetting("maxTokens", parseInt(e.target.value));
    });

  document
    .getElementById("council-agent-prompt")
    ?.addEventListener("change", (e) => {
      updateCurrentAgentSetting("systemPrompt", e.target.value);
    });

  // Save/Reset buttons
  document
    .getElementById("council-save-settings")
    ?.addEventListener("click", () => {
      saveSettings();
      toastr.success("Settings saved!", EXTENSION_NAME);
    });

  document
    .getElementById("council-reset-settings")
    ?.addEventListener("click", () => {
      if (confirm("Reset all Council settings to defaults?")) {
        extensionSettings = structuredClone(DEFAULT_SETTINGS);
        saveSettings();
        populateSettingsUI();
        toastr.info("Settings reset to defaults.", EXTENSION_NAME);
      }
    });

  // Initial load
  populateSettingsUI();
}

function populateSettingsUI() {
  document.getElementById("council-parallel").checked =
    extensionSettings.runParallel;
  document.getElementById("council-delay").value =
    extensionSettings.delayBetweenCalls;
  loadAgentSettings("editor");
}

function loadAgentSettings(agentKey) {
  const agent = extensionSettings.agents[agentKey];
  if (!agent) return;

  document.getElementById("council-agent-enabled").checked = agent.enabled;
  document.getElementById("council-agent-use-main").checked = agent.useMainApi;
  document.getElementById("council-agent-endpoint").value =
    agent.apiEndpoint || "";
  document.getElementById("council-agent-apikey").value = agent.apiKey || "";
  document.getElementById("council-agent-model").value = agent.model || "";
  document.getElementById("council-agent-temp").value =
    agent.temperature || 0.7;
  document.getElementById("council-agent-tokens").value =
    agent.maxTokens || 1000;
  document.getElementById("council-agent-prompt").value =
    agent.systemPrompt || "";

  // Show/hide custom API section
  const customSection = document.getElementById("council-custom-api-section");
  if (customSection) {
    customSection.style.display = agent.useMainApi ? "none" : "block";
  }
}

function updateCurrentAgentSetting(property, value) {
  const agentKey = document.getElementById("council-agent-select")?.value;
  if (agentKey && extensionSettings.agents[agentKey]) {
    extensionSettings.agents[agentKey][property] = value;
  }
}

// ===== INJECT STYLES =====
function injectStyles() {
  if (document.getElementById("council-styles")) return;

  const styles = `
    <style id="council-styles">
      /* Modal Styles */
      .council-modal {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        z-index: 10000;
        justify-content: center;
        align-items: center;
      }

      .council-modal-content {
        background: var(--SmartThemeBlurTintColor, #1a1a2e);
        border: 1px solid var(--SmartThemeBorderColor, #444);
        border-radius: 10px;
        width: 80%;
        max-width: 900px;
        max-height: 85vh;
        display: flex;
        flex-direction: column;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
      }

      .council-modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 15px 20px;
        border-bottom: 1px solid var(--SmartThemeBorderColor, #444);
      }

      .council-modal-header h3 {
        margin: 0;
        color: var(--SmartThemeBodyColor, #eee);
      }

      .council-modal-close {
        background: none;
        border: none;
        color: var(--SmartThemeBodyColor, #eee);
        font-size: 24px;
        cursor: pointer;
        padding: 0 5px;
      }

      .council-modal-close:hover {
        color: #ff6b6b;
      }

      .council-modal-body {
        padding: 15px 20px;
        overflow-y: auto;
        flex: 1;
      }

      .council-section {
        margin-bottom: 15px;
        border: 1px solid var(--SmartThemeBorderColor, #333);
        border-radius: 8px;
        overflow: hidden;
        transition: border-color 0.3s ease;
      }

      .council-section.council-active {
        border-color: #4CAF50;
        box-shadow: 0 0 10px rgba(76, 175, 80, 0.3);
      }

      .council-section-header {
        background: rgba(255, 255, 255, 0.05);
        padding: 10px 15px;
        font-weight: bold;
        color: var(--SmartThemeBodyColor, #ddd);
        border-bottom: 1px solid var(--SmartThemeBorderColor, #333);
      }

      .council-section-content {
        padding: 12px 15px;
        color: var(--SmartThemeBodyColor, #ccc);
        font-size: 14px;
        line-height: 1.5;
        max-height: 200px;
        overflow-y: auto;
      }

      .council-waiting {
        color: #888;
        font-style: italic;
      }

      .council-modal-footer {
        padding: 12px 20px;
        border-top: 1px solid var(--SmartThemeBorderColor, #444);
        text-align: center;
        color: var(--SmartThemeBodyColor, #aaa);
        font-size: 13px;
      }

      /* Button Styles */
      #council-button {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border: none;
        border-radius: 5px;
        color: white;
        padding: 8px 12px;
        cursor: pointer;
        font-size: 14px;
        margin-left: 5px;
        transition: all 0.2s ease;
      }

      #council-button:hover {
        transform: scale(1.05);
        box-shadow: 0 2px 10px rgba(102, 126, 234, 0.4);
      }

      #council-button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none;
      }

      #council-button.processing {
        animation: council-pulse 1.5s infinite;
      }

      @keyframes council-pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.6; }
      }

      #council-toggle {
        background: var(--SmartThemeBlurTintColor, #2a2a4e);
        border: 1px solid var(--SmartThemeBorderColor, #444);
        border-radius: 5px;
        color: var(--SmartThemeBodyColor, #ccc);
        padding: 8px 10px;
        cursor: pointer;
        font-size: 14px;
        margin-left: 3px;
        transition: all 0.2s ease;
      }

      #council-toggle:hover {
        background: var(--SmartThemeBlurTintColor, #3a3a5e);
        border-color: #667eea;
      }

      #council-toggle.has-content {
        border-color: #667eea;
        color: #667eea;
      }

      #council-toggle:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }

      /* Settings Panel Styles */
      .council-settings {
        margin-top: 10px;
      }

      .council-settings-section {
        margin-bottom: 15px;
        padding: 10px;
        background: rgba(0, 0, 0, 0.2);
        border-radius: 5px;
      }

      .council-settings-section h4 {
        margin: 0 0 10px 0;
        color: var(--SmartThemeBodyColor, #ddd);
      }

      .council-setting-row {
        margin: 8px 0;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .council-setting-row label {
        font-size: 12px;
        color: var(--SmartThemeBodyColor, #aaa);
      }

      .council-setting-row input,
      .council-setting-row textarea,
      .council-setting-row select {
        width: 100%;
        padding: 6px 8px;
        border: 1px solid var(--SmartThemeBorderColor, #444);
        border-radius: 4px;
        background: var(--SmartThemeBlurTintColor, #1a1a2e);
        color: var(--SmartThemeBodyColor, #eee);
        font-size: 13px;
      }

      .council-setting-row textarea {
        resize: vertical;
        min-height: 80px;
      }

      #council-agent-select {
        margin-bottom: 10px;
        padding: 8px;
        font-size: 14px;
      }

      .council-custom-api {
        padding: 10px;
        margin: 10px 0;
        background: rgba(0, 0, 0, 0.2);
        border-radius: 5px;
        border: 1px solid var(--SmartThemeBorderColor, #333);
      }

      .council-settings-actions {
        display: flex;
        gap: 10px;
        margin-top: 15px;
      }

      .council-settings-actions button {
        flex: 1;
      }
    </style>
  `;

  document.head.insertAdjacentHTML("beforeend", styles);
}

// ===== COUNCIL EXECUTION =====
async function runCouncil(userInput) {
  log("=== COUNCIL STARTING ===");

  showModal(true); // Reset content for new deliberation
  hasDeliberation = true;
  updateToggleButton();
  updateModalSection("council-input", userInput);
  updateModalStatus("Phase 1: Analyzing input...");

  let editorResult = "";
  let advocateResult = "";

  // Phase 1: Analysis
  log("Phase 1: Analysis");
  updateModalSection("council-editor", "🔄 Analyzing...", true);
  updateModalSection("council-advocate", "🔄 Analyzing...", true);

  const editorPrompt = `User said: "${userInput}"\n\nAnalyze this for narrative constraints and structure.`;
  const advocatePrompt = `User said: "${userInput}"\n\nAnalyze this for user intent and what they truly want.`;

  if (extensionSettings.runParallel) {
    // Parallel execution
    [editorResult, advocateResult] = await Promise.all([
      generateForAgent("editor", editorPrompt),
      generateForAgent("advocate", advocatePrompt),
    ]);
  } else {
    // Sequential execution with delay
    editorResult = await generateForAgent("editor", editorPrompt);
    updateModalSection("council-editor", editorResult, false);

    if (extensionSettings.delayBetweenCalls > 0) {
      await delay(extensionSettings.delayBetweenCalls);
    }

    advocateResult = await generateForAgent("advocate", advocatePrompt);
  }

  log(`Editor: ${editorResult.substring(0, 100)}...`);
  log(`Advocate: ${advocateResult.substring(0, 100)}...`);

  updateModalSection("council-editor", editorResult, false);
  updateModalSection("council-advocate", advocateResult, false);
  updateModalStatus("Phase 2: Building consensus...");

  if (extensionSettings.delayBetweenCalls > 0) {
    await delay(extensionSettings.delayBetweenCalls);
  }

  // Phase 2: Consensus
  log("Phase 2: Consensus");
  updateModalSection("council-consensus", "🔄 Synthesizing...", true);

  const consensusPrompt = `
User said: "${userInput}"

THE ADVOCATE (User Intent):
${advocateResult}

THE EDITOR (Narrative Constraints):
${editorResult}

Synthesize these perspectives into clear, actionable writing instructions.`;

  const consensus = await generateForAgent("moderator", consensusPrompt);

  log(`Consensus: ${consensus.substring(0, 100)}...`);
  updateModalSection("council-consensus", consensus, false);
  updateModalStatus("Phase 3: Writing final response...");

  if (extensionSettings.delayBetweenCalls > 0) {
    await delay(extensionSettings.delayBetweenCalls);
  }

  // Phase 3: Final response
  log("Phase 3: Writing");
  updateModalSection("council-final", "🔄 Writing...", true);

  const writerPrompt = `COUNCIL DIRECTIVES:\n${consensus}\n\nWrite the narrative response to the user now.`;
  const finalResponse = await generateForAgent("writer", writerPrompt);

  log(`=== COUNCIL COMPLETE ===`);
  log(`Final response length: ${finalResponse?.length || 0}`);
  log(`Final response preview: "${finalResponse?.substring(0, 100)}..."`);
  updateModalSection("council-final", finalResponse, false);
  updateModalStatus("✅ Council deliberation complete!");

  return finalResponse;
}

// ===== ADD MESSAGE TO CHAT =====
async function addMessageToChat(message) {
  log(
    `addMessageToChat called with: "${message?.substring(0, 100)}..." (length: ${message?.length || 0})`,
  );

  const context = SillyTavern.getContext();

  const messageObj = {
    name: context.name2,
    is_user: false,
    is_system: false,
    send_date: new Date().toLocaleString(),
    mes: message,
    extra: { api: "council" },
  };

  context.chat.push(messageObj);

  if (typeof context.addOneMessage === "function") {
    await context.addOneMessage(messageObj);
  }

  if (typeof context.saveChat === "function") {
    await context.saveChat();
  }

  log("Message added to chat.");
}

// ===== BUTTON HANDLER =====
async function handleCouncilButton() {
  if (isProcessing) {
    toastr.warning("Council is already deliberating.", EXTENSION_NAME);
    return;
  }

  // Get text from input field
  const inputField = document.getElementById("send_textarea");
  const userInput = inputField?.value?.trim() || "";

  if (!userInput) {
    toastr.warning("Type a message first.", EXTENSION_NAME);
    return;
  }

  log(`User input: "${userInput.substring(0, 50)}..."`);

  // Clear the input field
  inputField.value = "";
  inputField.dispatchEvent(new Event("input", { bubbles: true }));

  // Add user message to chat first
  const context = SillyTavern.getContext();
  const userMessageObj = {
    name: context.name1, // User's name
    is_user: true,
    is_system: false,
    send_date: new Date().toLocaleString(),
    mes: userInput,
  };

  context.chat.push(userMessageObj);

  if (typeof context.addOneMessage === "function") {
    await context.addOneMessage(userMessageObj);
  }

  // Save chat with user message
  if (typeof context.saveChat === "function") {
    await context.saveChat();
  }

  log("User message added to chat.");

  const button = document.getElementById("council-button");
  if (button) {
    button.disabled = true;
    button.classList.add("processing");
    button.textContent = "⚖️ Deliberating...";
  }

  isProcessing = true;

  try {
    const result = await runCouncil(userInput);
    log(
      `Result from runCouncil: "${result?.substring(0, 100)}..." (length: ${result?.length || 0})`,
    );

    if (!result || result.trim() === "") {
      log("WARNING: Empty result from Council!");
      toastr.error("Council returned empty response.", EXTENSION_NAME);
      return;
    }

    await addMessageToChat(result);
    toastr.success("The Council has spoken.", EXTENSION_NAME);
  } catch (err) {
    log(`Council failed: ${err.message}`);
    toastr.error(`Council failed: ${err.message}`, EXTENSION_NAME);
    updateModalStatus(`❌ Error: ${err.message}`);
  } finally {
    isProcessing = false;
    if (button) {
      button.disabled = false;
      button.classList.remove("processing");
      button.textContent = "⚖️ Council";
    }
  }
}

// ===== ADD BUTTONS TO UI =====
function addCouncilButton() {
  if (document.getElementById("council-button")) return;

  const sendForm = document.getElementById("send_form");
  if (!sendForm) {
    log("WARNING: Could not find send_form to attach button.");
    return;
  }

  // Create Council button
  const button = document.createElement("button");
  button.id = "council-button";
  button.type = "button";
  button.textContent = "⚖️ Council";
  button.title = "Generate a response using The Council multi-agent system";
  button.addEventListener("click", handleCouncilButton);

  // Create toggle button to view last deliberation
  const toggleBtn = document.createElement("button");
  toggleBtn.id = "council-toggle";
  toggleBtn.type = "button";
  toggleBtn.textContent = "📜";
  toggleBtn.title = "View last Council deliberation";
  toggleBtn.addEventListener("click", toggleModal);

  const sendButton = document.getElementById("send_but");
  if (sendButton) {
    sendButton.parentNode.insertBefore(button, sendButton);
    sendButton.parentNode.insertBefore(toggleBtn, sendButton);
  } else {
    sendForm.appendChild(button);
    sendForm.appendChild(toggleBtn);
  }

  log("Council buttons added to UI.");
}

function updateToggleButton() {
  const toggleBtn = document.getElementById("council-toggle");
  if (toggleBtn) {
    toggleBtn.classList.toggle("has-content", hasDeliberation);
    toggleBtn.title = hasDeliberation
      ? "View last Council deliberation"
      : "No deliberation yet";
  }
}

// ===== SLASH COMMAND HANDLER =====
async function handleSlashCommand(args, value) {
  if (!value || !value.trim()) {
    return "Usage: /council [message] - Run the Council on a specific message";
  }

  if (isProcessing) {
    toastr.warning("Council is already deliberating.", EXTENSION_NAME);
    return "Council is busy.";
  }

  isProcessing = true;
  const button = document.getElementById("council-button");
  if (button) {
    button.disabled = true;
    button.classList.add("processing");
  }

  try {
    const result = await runCouncil(value.trim());
    await addMessageToChat(result);
    toastr.success("The Council has spoken.", EXTENSION_NAME);
    return result;
  } catch (err) {
    log(`Council failed: ${err.message}`);
    toastr.error(`Council failed: ${err.message}`, EXTENSION_NAME);
    return `Error: ${err.message}`;
  } finally {
    isProcessing = false;
    if (button) {
      button.disabled = false;
      button.classList.remove("processing");
    }
  }
}

// ===== INITIALIZATION =====
jQuery(async function () {
  log("Extension initializing...");

  const context = SillyTavern.getContext();

  // Check API availability
  if (typeof context.executeSlashCommands !== "function") {
    console.error(
      `[${EXTENSION_NAME}] FATAL: executeSlashCommands not available`,
    );
    toastr.error("Council failed to load - missing API", EXTENSION_NAME);
    return;
  }

  log("API available.");

  // Load settings
  loadSettings();

  // Inject styles
  injectStyles();

  // Create modal (hidden)
  createModal();

  // Create settings panel
  createSettingsPanel();

  // Add button to UI
  addCouncilButton();

  // Register slash command
  if (typeof context.registerSlashCommand === "function") {
    context.registerSlashCommand(
      "council",
      handleSlashCommand,
      [],
      "Run The Council on a message. Usage: /council [message]",
      true,
      true,
    );
    log("Slash command /council registered.");
  }

  log("Extension loaded successfully!");
  toastr.info(
    "Click the ⚖️ Council button to generate responses.",
    EXTENSION_NAME,
  );
});
