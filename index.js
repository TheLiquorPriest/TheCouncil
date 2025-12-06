// index.js

const EXTENSION_NAME = "The_Council";
const DEBUG = true;

// -- AGENT PERSONAS (Hardcoded for PoC, later User Definable) --
const AGENTS = {
  EDITOR: {
    system_prompt:
      "You are The Editor. Your goal is to synthesize a final response plan. You have final authority. Listen to the Advocate, but prioritize narrative structure and the 'World Info' constraints.",
  },
  ADVOCATE: {
    system_prompt:
      "You are The Advocate. Your goal is to fight for the User's Intent. Analyze the user's last message deeply. If the Editor proposes something that violates what the user wants, you must object.",
  },
};

// -- HELPER: Log to Console --
function log(msg) {
  if (DEBUG) console.log(`[${EXTENSION_NAME}] ${msg}`);
}

// -- HELPER: The "Quiet" Generator --
// This wraps ST's internal generation API to run without updating the UI
async function generateShadowReply(prompt, system_override) {
  // We access the globally available SillyTavern context
  const context = SillyTavern.getContext();

  // Construct a temporary prompt payload
  // Note: In a real implementation, we would pull the current settings (temp, max_tokens)
  // and override the 'system_prompt' with our Agent's specific persona.
  const payload = {
    prompt: system_override + "\n\n" + prompt,
    quiet: true, // Hypothetical flag to prevent UI updates/streaming to main chat
    stop_sequence: ["\nUser:", "\nSystem:"],
  };

  log(
    `Generating shadow reply with system: ${system_override.substring(0, 50)}...`,
  );

  // 'generateQuietPrompt' is a common internal utility in ST scripts.
  // If not directly exposed, we use the standard API connector.
  // This is pseudo-code for the API handshake.
  const reply = await context.actions.generateQuiet(payload);
  return reply;
}

// -- CORE LOGIC: The Council Loop --
async function runCouncilExecution(user_input, chat_history, world_info) {
  toastr.info("The Council is deliberating...", "Please Wait");

  // PHASE 1: INITIAL ANALYSIS
  // Parallel execution: Editor and Advocate analyze the input
  const p1_editor_task = generateShadowReply(
    `User Input: "${user_input}"\n\nAnalyze this input for narrative constraints.`,
    AGENTS.EDITOR.system_prompt,
  );

  const p1_advocate_task = generateShadowReply(
    `User Input: "${user_input}"\n\nAnalyze this input for User Intent. What do they really want?`,
    AGENTS.ADVOCATE.system_prompt,
  );

  const [editor_analysis, advocate_analysis] = await Promise.all([
    p1_editor_task,
    p1_advocate_task,
  ]);

  log(`Editor Analysis: ${editor_analysis}`);
  log(`Advocate Analysis: ${advocate_analysis}`);

  // PHASE 2: THE DEBATE (Main Room)
  // We synthesize their views into a consensus instruction
  const debate_prompt = `
    THE SITUATION:
    User said: "${user_input}"

    ADVOCATE'S STANCE:
    ${advocate_analysis}

    EDITOR'S STANCE:
    ${editor_analysis}

    INSTRUCTION:
    Debate briefly if needed, then provide the FINAL INSTRUCTIONS for the writer.
    The instructions must satisfy the Advocate's intent but adhere to the Editor's constraints.
    Output ONLY the final instructions.
    `;

  const consensus_instructions = await generateShadowReply(
    debate_prompt,
    "You are the Moderator. Synthesize the final instructions.",
  );

  log(`Consensus Reached: ${consensus_instructions}`);

  // PHASE 3: EXECUTION (Bullpen)
  // Now we generate the ACTUAL reply that the user will see, using the consensus instructions
  toastr.success("Consensus Reached. Writing response...");

  const final_response = await generateShadowReply(
    `Directives: ${consensus_instructions}\n\nWrite the response to the user now.`,
    "You are the Writer. Write the story response following the Directives exactly.",
  );

  return final_response;
}

// -- INTERCEPTOR REGISTRATION --
jQuery(document).ready(function () {
  log("Extension Loaded.");

  // We hook into the 'generate' trigger
  SillyTavern.getContext().eventSource.on(
    SillyTavern.getContext().eventTypes.BEFORE_GENERATE,
    async (data) => {
      // 1. ABORT the default generation immediately
      // We return 'false' or cancel the event to stop ST from sending its own prompt
      if (data.type === "chat") {
        log("Intercepting Chat Generation!");

        // Stop ST from doing its normal thing
        data.preventDefault();

        // 2. GET DATA
        const context = SillyTavern.getContext();
        const user_input = context.chat[context.chat.length - 1].mes; // Last user message
        const chat_history = context.chat;
        const world_info = context.worldInfo; // Access loaded WI

        try {
          // 3. RUN COUNCIL
          const council_reply = await runCouncilExecution(
            user_input,
            chat_history,
            world_info,
          );

          // 4. INJECT RESULT
          // We manually push the model's reply to the chat array
          context.chat.push({
            name: context.characterId, // The active character
            is_user: false,
            is_name: true,
            send_date: Date.now(),
            mes: council_reply,
            force_avatar: context.characterAvatar,
          });

          // 5. REFRESH UI
          // Tell ST to redraw the chat window and save the history
          context.saveChat();
          context.reloadChat();
        } catch (e) {
          console.error("Council Execution Failed", e);
          toastr.error("The Council failed to reach a consensus.");
        }
      }
    },
  );
});
