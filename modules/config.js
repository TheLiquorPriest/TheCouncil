// modules/config.js - Configuration definitions for The Council
// All agent, phase, thread, and store definitions

const CouncilConfig = {
  // ===== EXTENSION INFO =====
  EXTENSION_NAME: "The_Council",
  EXTENSION_FOLDER: "third-party/TheCouncil",
  VERSION: "0.2.0",

  // ===== THREAD DEFINITIONS =====
  // Threads are communication channels where agents post their deliberations
  THREADS: {
    main: {
      name: "Main",
      icon: "🏛️",
      expanded: true,
      description: "Central deliberation hub",
      priority: 2,
      isMainThread: true,
    },
    context: {
      name: "Context",
      icon: "📚",
      expanded: true,
      description: "Retrieved and processed context",
      priority: 3,
      isMainThread: true,
    },
    instructions: {
      name: "Instructions",
      icon: "📋",
      expanded: true,
      description: "User intent interpretation",
      priority: 1,
      isMainThread: true,
    },
    outline: {
      name: "Outline",
      icon: "📝",
      expanded: true,
      description: "Story outline drafts",
      priority: 4,
      isMainThread: true,
    },
    prose: {
      name: "Prose",
      icon: "✍️",
      expanded: false,
      description: "Prose team internal deliberation",
      team: "prose",
      priority: 10,
      isTeamThread: true,
    },
    plot: {
      name: "Plot",
      icon: "🗺️",
      expanded: false,
      description: "Plot team internal deliberation",
      team: "plot",
      priority: 11,
      isTeamThread: true,
    },
    world: {
      name: "World",
      icon: "🌍",
      expanded: false,
      description: "World team internal deliberation",
      team: "world",
      priority: 12,
      isTeamThread: true,
    },
    characters: {
      name: "Characters",
      icon: "👥",
      expanded: false,
      description: "Character team internal deliberation",
      team: "characters",
      priority: 13,
      isTeamThread: true,
    },
    environment: {
      name: "Environment",
      icon: "🏞️",
      expanded: false,
      description: "Environment team internal deliberation",
      team: "environment",
      priority: 14,
      isTeamThread: true,
    },
    recordkeeping: {
      name: "Records",
      icon: "📁",
      expanded: false,
      description: "Archive team internal deliberation",
      team: "recordkeeping",
      priority: 15,
      isTeamThread: true,
    },
    drafting: {
      name: "Drafting",
      icon: "📄",
      expanded: false,
      description: "Draft iterations and feedback",
      priority: 20,
      isTeamThread: true,
    },
    final: {
      name: "Final",
      icon: "✅",
      expanded: false,
      description: "Final output",
      priority: 21,
      isTeamThread: true,
    },
  },

  // ===== AGENT ROLE DEFINITIONS =====
  // Each agent has a role, team, and responsibilities
  AGENT_ROLES: {
    // === Leadership ===
    publisher: {
      name: "Publisher",
      team: "leadership",
      role: "Pipeline orchestrator and final decision maker",
      responsibilities: [
        "Direct overall pipeline flow",
        "Make final decisions on disputes",
        "Approve SME requests",
        "Quality control on final output",
      ],
      isLead: true,
      contextNeeds: [
        "current_situation",
        "user_instructions",
        "story_synopsis",
      ],
    },

    // === Prose Team ===
    editor: {
      name: "Editor",
      team: "prose",
      role: "Prose team lead, synthesizes writer outputs into cohesive narrative",
      responsibilities: [
        "Coordinate prose team",
        "Synthesize specialist drafts",
        "Ensure consistent voice and style",
        "Final prose polish",
      ],
      isLead: true,
      contextNeeds: [
        "story_draft",
        "character_sheets",
        "dialogue_history",
        "current_situation",
      ],
    },
    writer_scene: {
      name: "Scene Writer",
      team: "prose",
      role: "Specializes in scene setting, atmosphere, and sensory description",
      responsibilities: [
        "Establish scene atmosphere",
        "Sensory details (sight, sound, smell, etc.)",
        "Pacing through description",
        "Transitions between scenes",
      ],
      isLead: false,
      contextNeeds: ["scenes", "location_sheets", "environment_details"],
    },
    writer_dialogue: {
      name: "Dialogue Writer",
      team: "prose",
      role: "Specializes in character dialogue and conversation flow",
      responsibilities: [
        "Write authentic character voices",
        "Subtext and tension in dialogue",
        "Dialogue tags and beats",
        "Conversation pacing",
      ],
      isLead: false,
      contextNeeds: [
        "character_sheets",
        "dialogue_history",
        "character_relationships",
      ],
    },
    writer_action: {
      name: "Action Writer",
      team: "prose",
      role: "Specializes in action sequences and physical movement",
      responsibilities: [
        "Combat and action sequences",
        "Physical movement and blocking",
        "Tension and pacing in action",
        "Consequences of actions",
      ],
      isLead: false,
      contextNeeds: [
        "character_positions",
        "character_inventory",
        "location_sheets",
      ],
    },
    writer_character: {
      name: "Character Writer",
      team: "prose",
      role: "Specializes in internal thoughts, emotions, and characterization",
      responsibilities: [
        "Internal monologue",
        "Emotional responses",
        "Character motivation expression",
        "Character growth moments",
      ],
      isLead: false,
      contextNeeds: [
        "character_sheets",
        "character_development",
        "current_situation",
      ],
    },

    // === Plot Team ===
    plot_architect: {
      name: "Plot Architect",
      team: "plot",
      role: "Plot team lead, oversees narrative structure and story arcs",
      responsibilities: [
        "Coordinate plot team",
        "Maintain story arc integrity",
        "Balance plot threads",
        "Ensure narrative momentum",
      ],
      isLead: true,
      contextNeeds: ["plot_lines", "story_outline", "story_synopsis"],
    },
    macro_plot: {
      name: "Macro Plot Specialist",
      team: "plot",
      role: "Handles overarching story arcs and long-term plot threads",
      responsibilities: [
        "Track major plot arcs",
        "Foreshadowing placement",
        "Theme development",
        "Story milestone tracking",
      ],
      isLead: false,
      contextNeeds: ["plot_lines", "story_synopsis", "story_outline"],
    },
    micro_plot: {
      name: "Micro Plot Specialist",
      team: "plot",
      role: "Handles scene-level plot beats and immediate story progression",
      responsibilities: [
        "Scene-level tension",
        "Immediate conflict resolution",
        "Beat-by-beat progression",
        "Scene goals and obstacles",
      ],
      isLead: false,
      contextNeeds: ["scenes", "current_situation", "plot_lines"],
    },
    continuity: {
      name: "Continuity Specialist",
      team: "plot",
      role: "Ensures consistency and tracks all plot thread states",
      responsibilities: [
        "Track active/resolved/stalled plots",
        "Catch continuity errors",
        "Timeline consistency",
        "Detail tracking",
      ],
      isLead: false,
      contextNeeds: [
        "plot_lines",
        "scenes",
        "dialogue_history",
        "character_positions",
      ],
    },

    // === World Team ===
    scholar: {
      name: "Scholar",
      team: "world",
      role: "World team lead, oversees lore accuracy and world consistency",
      responsibilities: [
        "Coordinate world team",
        "Verify lore accuracy",
        "World rule enforcement",
        "Setting authenticity",
      ],
      isLead: true,
      contextNeeds: [
        "world_info",
        "location_sheets",
        "faction_sheets",
        "story_synopsis",
      ],
    },
    lore_specialist: {
      name: "Lore Specialist",
      team: "world",
      role: "Manages world-building, history, and established lore details",
      responsibilities: [
        "Track established lore",
        "Historical accuracy",
        "Cultural details",
        "Magic/tech system rules",
      ],
      isLead: false,
      contextNeeds: ["world_info", "faction_sheets", "location_sheets"],
    },
    story_specialist: {
      name: "Story Specialist",
      team: "world",
      role: "Ensures story fits within established world rules and tone",
      responsibilities: [
        "Tone consistency",
        "Genre conventions",
        "World rule adherence",
        "Believability within setting",
      ],
      isLead: false,
      contextNeeds: ["world_info", "story_synopsis", "story_outline"],
    },

    // === Character Team ===
    character_director: {
      name: "Character Director",
      team: "characters",
      role: "Character team lead, manages character consistency and development",
      responsibilities: [
        "Coordinate character agents",
        "Track character arcs",
        "Ensure character consistency",
        "Manage character relationships",
      ],
      isLead: true,
      contextNeeds: [
        "character_sheets",
        "character_development",
        "character_relationships",
      ],
    },
    // Note: Individual character agents are created dynamically

    // === Environment Team ===
    environment_director: {
      name: "Environment Director",
      team: "environment",
      role: "Environment team lead, oversees setting and atmosphere details",
      responsibilities: [
        "Coordinate environment team",
        "Setting consistency",
        "Atmosphere management",
        "Environmental storytelling",
      ],
      isLead: true,
      contextNeeds: ["location_sheets", "scenes", "current_situation"],
    },
    interior_specialist: {
      name: "Interior Specialist",
      team: "environment",
      role: "Handles indoor environments, rooms, buildings, and enclosed spaces",
      responsibilities: [
        "Room layouts and details",
        "Indoor atmosphere",
        "Props and objects",
        "Building architecture",
      ],
      isLead: false,
      contextNeeds: ["location_sheets", "scenes"],
    },
    exterior_specialist: {
      name: "Exterior Specialist",
      team: "environment",
      role: "Handles outdoor environments, landscapes, weather, and nature",
      responsibilities: [
        "Landscape description",
        "Weather and time of day",
        "Natural environments",
        "Urban exteriors",
      ],
      isLead: false,
      contextNeeds: ["location_sheets", "scenes", "current_situation"],
    },

    // === Record Keeping Team ===
    archivist: {
      name: "Archivist",
      team: "recordkeeping",
      role: "Record keeping lead, maintains all persistent data stores",
      responsibilities: [
        "Coordinate topologists",
        "Ensure data accuracy",
        "Archive important events",
        "Maintain data relationships",
      ],
      isLead: true,
      contextNeeds: ["all_stores"],
    },
    story_topologist: {
      name: "Story Topologist",
      team: "recordkeeping",
      role: "Maps and indexes story structure, plot points, and narrative flow",
      responsibilities: [
        "Index plot structure",
        "Map story beats",
        "Track narrative flow",
        "Update story synopsis",
      ],
      isLead: false,
      contextNeeds: ["story_draft", "story_outline", "plot_lines"],
    },
    lore_topologist: {
      name: "Lore Topologist",
      team: "recordkeeping",
      role: "Maps and indexes world lore, rules, and established facts",
      responsibilities: [
        "Index world info",
        "Map lore relationships",
        "Track world rules",
        "Update lore database",
      ],
      isLead: false,
      contextNeeds: ["world_info", "faction_sheets", "location_sheets"],
    },
    character_topologist: {
      name: "Character Topologist",
      team: "recordkeeping",
      role: "Maps and indexes character data, relationships, and development",
      responsibilities: [
        "Index character traits",
        "Map relationships",
        "Track development arcs",
        "Update character sheets",
      ],
      isLead: false,
      contextNeeds: [
        "character_sheets",
        "character_development",
        "dialogue_history",
      ],
    },
    scene_topologist: {
      name: "Scene Topologist",
      team: "recordkeeping",
      role: "Maps and indexes scene details, settings, and progression",
      responsibilities: [
        "Index scene details",
        "Track scene progression",
        "Map scene connections",
        "Update scene records",
      ],
      isLead: false,
      contextNeeds: ["scenes", "location_sheets", "character_positions"],
    },
    location_topologist: {
      name: "Location Topologist",
      team: "recordkeeping",
      role: "Maps and indexes locations, geography, and spatial relationships",
      responsibilities: [
        "Index locations",
        "Map spatial relationships",
        "Track location states",
        "Update location sheets",
      ],
      isLead: false,
      contextNeeds: ["location_sheets", "scenes"],
    },
  },

  // ===== SME POOL (Subject Matter Experts) =====
  // Dynamically spawned based on story needs
  SME_POOL: {
    firearms: {
      name: "Firearms & Ballistics Expert",
      domain: "Weapons, ammunition, combat tactics, gun mechanics",
      keywords: [
        "gun",
        "shoot",
        "bullet",
        "rifle",
        "pistol",
        "ammunition",
        "weapon",
        "firearm",
      ],
    },
    physics: {
      name: "Physics Expert",
      domain: "Physical laws, mechanics, realistic movement, forces",
      keywords: [
        "fall",
        "gravity",
        "momentum",
        "force",
        "energy",
        "physics",
        "velocity",
      ],
    },
    survivalism: {
      name: "Survivalism Expert",
      domain: "Survival skills, wilderness, resources, emergency situations",
      keywords: [
        "survive",
        "wilderness",
        "shelter",
        "fire",
        "water",
        "hunt",
        "forage",
      ],
    },
    history_us: {
      name: "US History Expert",
      domain: "American history, culture, events, periods",
      keywords: [
        "american",
        "usa",
        "civil war",
        "revolution",
        "colonial",
        "western",
      ],
    },
    history_world: {
      name: "World History Expert",
      domain: "Global history, civilizations, historical events",
      keywords: ["ancient", "medieval", "empire", "dynasty", "historical"],
    },
    medicine: {
      name: "Medical Expert",
      domain: "Medicine, injuries, treatments, anatomy, diseases",
      keywords: [
        "injury",
        "wound",
        "heal",
        "doctor",
        "medical",
        "blood",
        "surgery",
        "disease",
      ],
    },
    psychology: {
      name: "Psychology Expert",
      domain: "Human behavior, mental states, motivations, trauma",
      keywords: [
        "trauma",
        "mental",
        "behavior",
        "emotion",
        "psychology",
        "fear",
        "anxiety",
      ],
    },
    military: {
      name: "Military Expert",
      domain: "Military operations, hierarchy, tactics, combat",
      keywords: [
        "military",
        "soldier",
        "army",
        "tactics",
        "combat",
        "war",
        "battle",
      ],
    },
    technology: {
      name: "Technology Expert",
      domain: "Computers, electronics, modern tech, hacking",
      keywords: [
        "computer",
        "hack",
        "technology",
        "software",
        "electronic",
        "digital",
      ],
    },
    maritime: {
      name: "Maritime Expert",
      domain: "Ships, sailing, ocean, naval operations",
      keywords: ["ship", "boat", "sail", "ocean", "naval", "sea", "maritime"],
    },
    legal: {
      name: "Legal Expert",
      domain: "Law, legal procedures, courts, rights",
      keywords: [
        "law",
        "legal",
        "court",
        "attorney",
        "trial",
        "crime",
        "police",
      ],
    },
    science: {
      name: "Science Expert",
      domain: "General science, chemistry, biology, research",
      keywords: [
        "science",
        "chemical",
        "biology",
        "experiment",
        "research",
        "laboratory",
      ],
    },
  },

  // ===== PIPELINE PHASES =====
  PIPELINE_PHASES: [
    {
      id: "curate_stores",
      name: "Curate Persistent Stores",
      threads: ["recordkeeping"],
      agents: [
        "archivist",
        "story_topologist",
        "lore_topologist",
        "character_topologist",
        "scene_topologist",
        "location_topologist",
      ],
      description:
        "Update and build persistent data stores from recent activity",
      userGavel: false,
      contextRequired: ["chat_history", "world_info", "character_card"],
    },
    {
      id: "preliminary_context",
      name: "Preliminary Context",
      threads: ["main", "context"],
      agents: ["archivist", "scholar", "plot_architect"],
      description:
        "Deliberate to determine what preliminary context should be retrieved",
      userGavel: false,
      contextRequired: ["stores", "world_info"],
    },
    {
      id: "understand_instructions",
      name: "Understand User Instructions",
      threads: ["main", "instructions"],
      agents: ["publisher", "editor", "plot_architect", "scholar"],
      description: "Deliberate user instructions and intent to reach consensus",
      userGavel: true,
      gavelPrompt: "Review and edit the interpreted instructions:",
      contextRequired: ["user_input", "current_situation", "character_card"],
    },
    {
      id: "secondary_context",
      name: "Secondary Context Pass",
      threads: ["main", "context"],
      agents: ["archivist", "scholar", "plot_architect"],
      description: "Assess whether additional context should be included",
      userGavel: false,
      contextRequired: ["interpreted_instructions", "stores"],
    },
    {
      id: "outline_draft",
      name: "Outline Draft",
      threads: ["plot", "outline"],
      agents: ["plot_architect", "macro_plot", "micro_plot", "continuity"],
      description: "Plot Team drafts initial response outline",
      userGavel: false,
      contextRequired: [
        "interpreted_instructions",
        "plot_lines",
        "current_situation",
      ],
    },
    {
      id: "outline_review",
      name: "Outline Review",
      threads: ["world", "prose", "plot", "main"],
      agents: [
        "scholar",
        "lore_specialist",
        "story_specialist",
        "editor",
        "plot_architect",
      ],
      description: "Teams review initial outline, Plot may request SMEs",
      async: true,
      userGavel: false,
      contextRequired: ["outline_draft", "world_info", "story_synopsis"],
    },
    {
      id: "outline_consensus",
      name: "Outline Consensus",
      threads: ["main", "outline"],
      agents: ["plot_architect", "editor", "scholar"],
      description: "Deliberate and decide final outline by consensus",
      userGavel: true,
      gavelPrompt: "Review and edit the story outline:",
      contextRequired: ["outline_draft", "review_feedback"],
    },
    {
      id: "first_draft",
      name: "First Draft",
      threads: ["prose", "drafting"],
      agents: [
        "editor",
        "writer_scene",
        "writer_dialogue",
        "writer_action",
        "writer_character",
      ],
      description: "Prose Team produces first draft from outline",
      userGavel: true,
      gavelPrompt: "Review and edit the first draft:",
      contextRequired: [
        "final_outline",
        "character_sheets",
        "location_sheets",
        "current_situation",
      ],
    },
    {
      id: "first_draft_review",
      name: "First Draft Review",
      threads: ["characters", "environment", "main"],
      agents: ["character_director", "environment_director"],
      description: "Character and Environment teams review draft",
      async: true,
      userGavel: false,
      contextRequired: ["first_draft", "character_sheets", "location_sheets"],
    },
    {
      id: "second_draft",
      name: "Second Draft",
      threads: ["prose", "drafting"],
      agents: [
        "editor",
        "writer_scene",
        "writer_dialogue",
        "writer_action",
        "writer_character",
      ],
      description: "Prose Team refines first draft based on feedback",
      userGavel: true,
      gavelPrompt: "Review and edit the second draft:",
      contextRequired: ["first_draft", "first_draft_feedback"],
    },
    {
      id: "second_draft_review",
      name: "Second Draft Review",
      threads: ["plot", "world", "main"],
      agents: ["plot_architect", "scholar", "publisher"],
      description: "Plot, World, and Publisher review second draft",
      async: true,
      userGavel: false,
      contextRequired: ["second_draft", "story_outline", "world_info"],
    },
    {
      id: "final_draft",
      name: "Final Draft",
      threads: ["prose", "drafting"],
      agents: [
        "editor",
        "writer_scene",
        "writer_dialogue",
        "writer_action",
        "writer_character",
      ],
      description: "Prose Team produces final polished draft",
      userGavel: true,
      gavelPrompt: "Review and edit the final draft:",
      contextRequired: ["second_draft", "second_draft_feedback"],
    },
    {
      id: "commentary",
      name: "Team Commentary",
      threads: ["main"],
      agents: [
        "publisher",
        "editor",
        "plot_architect",
        "scholar",
        "character_director",
        "environment_director",
        "archivist",
      ],
      description: "Team leads comment on final draft, Archivist records",
      userGavel: false,
      contextRequired: ["final_draft"],
    },
    {
      id: "final_response",
      name: "Final Response",
      threads: ["final"],
      agents: [],
      description: "Post final draft to ST chat",
      userGavel: false,
      contextRequired: ["final_draft"],
    },
  ],

  // ===== PERSISTENT STORE SCHEMA =====
  // These stores persist across chat sessions
  STORE_SCHEMA: {
    // Story-level stores
    storyDraft: {
      name: "Story Draft",
      description: "Current working draft",
      type: "string",
      default: "",
    },
    storyOutline: {
      name: "Story Outline",
      description: "Current story outline with major beats",
      type: "string",
      default: "",
    },
    storySynopsis: {
      name: "Story Synopsis",
      description: "Detailed synopsis using 5 W's and How",
      type: "object",
      default: {
        who: "",
        what: "",
        when: "",
        where: "",
        why: "",
        how: "",
        summary: "",
      },
    },

    // Plot tracking
    plotLines: {
      name: "Plot Lines",
      description: "Chronological plot line tracker",
      type: "array",
      default: [],
      itemSchema: {
        id: "string",
        name: "string",
        description: "string",
        status: "string", // active, resolved, inactive, stalled
        type: "string", // macro, micro
        startedAt: "number",
        resolvedAt: "number|null",
        relatedCharacters: "array",
        relatedLocations: "array",
        timeline: "array",
      },
    },

    // Scene tracking
    scenes: {
      name: "Scenes",
      description: "Chronological scene tracker",
      type: "array",
      default: [],
      itemSchema: {
        id: "string",
        number: "number",
        title: "string",
        summary: "string",
        timestamp: "number",
        timeInStory: "string",
        weather: "string",
        location: "string",
        characters: "array",
        props: "array",
        mood: "string",
        tension: "number", // 1-10
      },
    },

    // Dialogue history
    dialogueHistory: {
      name: "Dialogue History",
      description: "Complete chronological dialogue mapped to timeline",
      type: "array",
      default: [],
      itemSchema: {
        id: "string",
        sceneId: "string",
        speaker: "string",
        dialogue: "string",
        subtext: "string",
        timestamp: "number",
        timeInStory: "string",
      },
    },

    // Character data
    characterSheets: {
      name: "Character Sheets",
      description: "Detailed sheets for all characters",
      type: "object",
      default: {},
      valueSchema: {
        id: "string",
        name: "string",
        type: "string", // main, supporting, minor
        description: "string",
        personality: "string",
        appearance: "string",
        background: "string",
        motivations: "array",
        fears: "array",
        relationships: "object",
        skills: "array",
        flaws: "array",
        speechPatterns: "string",
        isPresent: "boolean",
      },
    },
    characterDevelopment: {
      name: "Character Development",
      description: "Chronological character development tracker",
      type: "object",
      default: {},
      valueSchema: {
        characterId: "string",
        arc: "string",
        milestones: "array",
        currentState: "string",
        changes: "array",
      },
    },
    characterInventory: {
      name: "Character Inventory",
      description: "What each character has on them",
      type: "object",
      default: {},
    },
    characterPositions: {
      name: "Character Positions",
      description: "Current and historical positions of characters",
      type: "object",
      default: {},
      valueSchema: {
        characterId: "string",
        currentLocation: "string",
        currentActivity: "string",
        history: "array",
      },
    },

    // World data
    factionSheets: {
      name: "Faction Sheets",
      description: "All faction information",
      type: "object",
      default: {},
    },
    locationSheets: {
      name: "Location Sheets",
      description: "All location information",
      type: "object",
      default: {},
      valueSchema: {
        id: "string",
        name: "string",
        type: "string", // interior, exterior
        description: "string",
        features: "array",
        connections: "array",
        atmosphere: "string",
        history: "string",
      },
    },

    // Current state
    currentSituation: {
      name: "Current Situation",
      description: "Current situation synopsis using 5 W's and How",
      type: "object",
      default: {
        who: "",
        what: "",
        when: "",
        where: "",
        why: "",
        how: "",
        summary: "",
      },
    },

    // Meta/Archive
    agentCommentary: {
      name: "Agent Commentary",
      description: "Archived agent commentary from pipeline runs",
      type: "array",
      default: [],
    },
    sessionHistory: {
      name: "Session History",
      description: "History of pipeline runs",
      type: "array",
      default: [],
    },
  },

  // ===== DEFAULT AGENT API CONFIGURATION =====
  DEFAULT_AGENT_CONFIG: {
    enabled: true,
    useMainApi: true,
    apiEndpoint: "https://openrouter.ai/api/v1/chat/completions",
    apiKey: "",
    model: "deepseek/deepseek-chat",
    temperature: 0.7,
    maxTokens: 500,
    systemPrompt: "",
  },

  // ===== DEFAULT EXTENSION SETTINGS =====
  DEFAULT_SETTINGS: {
    agents: {}, // Populated at runtime from AGENT_ROLES
    activeSMEs: [],
    delayBetweenCalls: 500,
    autoSaveStores: true,
    showTeamThreads: false,
    maxContextTokens: 4000,
    contextStrategy: "relevance", // relevance, recency, hybrid
    debugMode: false,
  },

  // ===== CONTEXT ROUTING =====
  // Maps context types to which agents need them
  CONTEXT_ROUTING: {
    user_input: ["publisher", "editor", "plot_architect", "scholar"],
    current_situation: [
      "publisher",
      "editor",
      "plot_architect",
      "character_director",
    ],
    story_synopsis: ["publisher", "plot_architect", "macro_plot", "scholar"],
    story_outline: ["plot_architect", "macro_plot", "micro_plot", "editor"],
    story_draft: ["editor", "story_topologist"],
    plot_lines: ["plot_architect", "macro_plot", "micro_plot", "continuity"],
    scenes: [
      "micro_plot",
      "scene_topologist",
      "writer_scene",
      "environment_director",
    ],
    dialogue_history: ["writer_dialogue", "character_topologist", "continuity"],
    character_sheets: [
      "character_director",
      "writer_character",
      "writer_dialogue",
      "character_topologist",
    ],
    character_development: [
      "character_director",
      "writer_character",
      "character_topologist",
    ],
    character_positions: [
      "continuity",
      "environment_director",
      "writer_action",
    ],
    character_inventory: ["continuity", "writer_action"],
    faction_sheets: ["scholar", "lore_specialist", "lore_topologist"],
    location_sheets: [
      "environment_director",
      "interior_specialist",
      "exterior_specialist",
      "location_topologist",
    ],
    world_info: [
      "scholar",
      "lore_specialist",
      "story_specialist",
      "lore_topologist",
    ],
  },
};

// Initialize default agent settings from role definitions
Object.keys(CouncilConfig.AGENT_ROLES).forEach((agentId) => {
  const role = CouncilConfig.AGENT_ROLES[agentId];
  CouncilConfig.DEFAULT_SETTINGS.agents[agentId] = {
    ...CouncilConfig.DEFAULT_AGENT_CONFIG,
    systemPrompt: `You are ${role.name}. ${role.role}. Your responsibilities: ${role.responsibilities.join(", ")}. Be concise and focused on your specific role.`,
  };
});

// Export for use in other modules
if (typeof window !== "undefined") {
  window.CouncilConfig = CouncilConfig;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = CouncilConfig;
}
