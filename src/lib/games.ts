// Catalog of supported games with their per-game context field schema.
// Each field is stored per-game in localStorage under a single key so that
// switching games remembers the last context you configured for that game.

export type FieldKind = "text" | "textarea" | "select";

export type ContextField = {
  id: string;
  label: string;
  kind: FieldKind;
  options?: string[]; // for kind: "select"
  placeholder?: string;
};

export type GameDefinition = {
  id: string;
  name: string;
  engine: string;
  languages: string[];
  framework: string;
  fileTypes: string[];
  /** Free-form guidance appended to the system prompt when this game is picked. */
  systemHint: string;
  /** Editable context fields shown in the sidebar Game panel. */
  fields: ContextField[];
};

const NOTES_FIELD: ContextField = {
  id: "notes",
  label: "Notes",
  kind: "textarea",
  placeholder: "Anything else the AI should know",
};

export const GAMES: GameDefinition[] = [
  {
    id: "cs2",
    name: "Counter-Strike 2",
    engine: "Source 2",
    languages: ["KeyValues3", "Lua (Panorama)"],
    framework: "Panorama UI · CS2 Workshop Tools",
    fileTypes: [".vmap", ".vmdl", ".vsndevts", ".xml", ".css", ".js"],
    systemHint:
      "The user plays or maps for Counter-Strike 2. Give tactical advice (utility usage, positioning, callouts) or Source 2 / Panorama modding help. Cite exact callouts and grenade lineups when relevant.",
    fields: [
      { id: "map", label: "Map", kind: "select", options: ["Mirage", "Inferno", "Dust II", "Nuke", "Ancient", "Anubis", "Vertigo", "Overpass", "Train"] },
      { id: "side", label: "Side", kind: "select", options: ["CT", "T"] },
      { id: "mode", label: "Game Mode", kind: "select", options: ["Competitive", "Premier", "Wingman", "Deathmatch", "Casual"] },
      { id: "rank", label: "Rank / Rating", kind: "text", placeholder: "e.g. 15,200 Premier" },
      { id: "role", label: "Role", kind: "select", options: ["Entry", "AWPer", "Support", "Lurker", "IGL", "Rifler"] },
      { id: "region", label: "Region", kind: "text", placeholder: "e.g. EU West" },
      { id: "objective", label: "Objective", kind: "select", options: ["Improve Aim", "Improve Utility", "Improve Positioning", "Learn Callouts", "Review Strategy", "Analyze Demo"] },
      NOTES_FIELD,
    ],
  },
  {
    id: "roblox",
    name: "Roblox Studio",
    engine: "Roblox Engine",
    languages: ["Luau (Lua)"],
    framework: "Roblox Studio · Rojo",
    fileTypes: [".lua", ".luau", ".rbxlx", ".rbxl", ".rbxmx", ".project.json"],
    systemHint:
      "The user is building on Roblox with Luau. Prefer modern Roblox APIs (TweenService, RemoteEvents, Attributes, DataStoreService). Say where each script goes (ServerScriptService, StarterPlayerScripts, ReplicatedStorage). Format code in ```lua fenced blocks.",
    fields: [
      { id: "studioVersion", label: "Studio Version", kind: "text", placeholder: "e.g. 0.665" },
      { id: "projectType", label: "Project Type", kind: "select", options: ["Simulator", "Obby", "Tycoon", "Round-based", "RPG", "Combat", "UI Library", "Other"] },
      { id: "experienceName", label: "Experience Name", kind: "text" },
      { id: "engineMode", label: "Framework", kind: "select", options: ["Vanilla Luau", "Knit", "Matter ECS", "Nevermore", "Roact"] },
      NOTES_FIELD,
    ],
  },
  {
    id: "valorant",
    name: "Valorant",
    engine: "Unreal Engine 4 (proprietary build)",
    languages: ["—"],
    framework: "Riot client (no public modding)",
    fileTypes: [],
    systemHint: "Focus on tactical FPS advice: agent picks, utility lineups, map control, economy, and aim training. No cheating, injection, or client modification.",
    fields: [
      { id: "map", label: "Map", kind: "select", options: ["Ascent", "Bind", "Haven", "Split", "Icebox", "Breeze", "Fracture", "Pearl", "Lotus", "Sunset", "Abyss"] },
      { id: "agent", label: "Agent", kind: "text" },
      { id: "role", label: "Role", kind: "select", options: ["Duelist", "Controller", "Initiator", "Sentinel"] },
      { id: "rank", label: "Rank", kind: "text" },
      { id: "objective", label: "Objective", kind: "text", placeholder: "e.g. Improve entry timing" },
      NOTES_FIELD,
    ],
  },
  {
    id: "fortnite",
    name: "Fortnite",
    engine: "Unreal Engine 5",
    languages: ["Verse (UEFN)"],
    framework: "Unreal Editor for Fortnite (UEFN)",
    fileTypes: [".verse", ".uasset", ".umap"],
    systemHint: "Help with Fortnite gameplay (Battle Royale, Zero Build) or UEFN island creation. For code, prefer Verse examples.",
    fields: [
      { id: "mode", label: "Mode", kind: "select", options: ["Battle Royale", "Zero Build", "Reload", "OG", "UEFN Creator", "Ranked"] },
      { id: "goal", label: "Goal", kind: "text", placeholder: "e.g. build a spawn island in UEFN" },
      NOTES_FIELD,
    ],
  },
  {
    id: "minecraft",
    name: "Minecraft",
    engine: "Custom Java / Bedrock",
    languages: ["Java", "JavaScript (Bedrock)", "MCFunction"],
    framework: "Fabric · Forge · Bedrock Script API · Datapacks",
    fileTypes: [".java", ".json", ".mcfunction", ".mcmeta"],
    systemHint: "Help with Minecraft — mods (Fabric/Forge), datapacks, command blocks, or Bedrock Script API add-ons.",
    fields: [
      { id: "edition", label: "Edition", kind: "select", options: ["Java", "Bedrock"] },
      { id: "version", label: "Version", kind: "text", placeholder: "e.g. 1.21.3" },
      { id: "loader", label: "Mod Loader", kind: "select", options: ["Vanilla", "Fabric", "Forge", "NeoForge", "Datapack", "Bedrock Add-on"] },
      NOTES_FIELD,
    ],
  },
  {
    id: "gtav",
    name: "GTA V",
    engine: "RAGE",
    languages: ["Lua (ScriptHookVLua)", "C# (ScriptHookVDotNet)"],
    framework: "OpenIV · ScriptHookV · FiveM (separate)",
    fileTypes: [".lua", ".cs", ".asi", ".ymap", ".ytyp"],
    systemHint: "Single-player GTA V modding, missions, or gameplay tips. Multiplayer/FiveM is its own entry.",
    fields: [
      { id: "focus", label: "Focus", kind: "select", options: ["Story Mode", "Modding", "Vehicles", "Missions"] },
      NOTES_FIELD,
    ],
  },
  {
    id: "apex",
    name: "Apex Legends",
    engine: "Source (modified)",
    languages: ["—"],
    framework: "No public modding",
    fileTypes: [],
    systemHint: "Battle royale advice — legend synergies, rotations, movement tech, ranked play.",
    fields: [
      { id: "legend", label: "Main Legend", kind: "text" },
      { id: "rank", label: "Rank", kind: "text" },
      { id: "playstyle", label: "Playstyle", kind: "select", options: ["Aggressive", "Passive", "IGL", "Support"] },
      NOTES_FIELD,
    ],
  },
  {
    id: "r6",
    name: "Rainbow Six Siege",
    engine: "AnvilNext 2.0",
    languages: ["—"],
    framework: "No public modding",
    fileTypes: [],
    systemHint: "Tactical FPS: operator picks, drone timings, spawn peeks, site setups, ranked play.",
    fields: [
      { id: "map", label: "Map", kind: "text" },
      { id: "side", label: "Side", kind: "select", options: ["Attack", "Defense"] },
      { id: "operator", label: "Operator", kind: "text" },
      { id: "rank", label: "Rank", kind: "text" },
      NOTES_FIELD,
    ],
  },
  {
    id: "rust",
    name: "Rust",
    engine: "Unity",
    languages: ["C# (Oxide/uMod plugins)"],
    framework: "Oxide · Carbon",
    fileTypes: [".cs"],
    systemHint: "Rust survival tips, base design, raid mechanics, or Oxide/Carbon plugin dev in C#.",
    fields: [
      { id: "focus", label: "Focus", kind: "select", options: ["Solo", "Duo", "Trio", "Clan", "Plugin Dev", "Base Design"] },
      NOTES_FIELD,
    ],
  },
  {
    id: "tarkov",
    name: "Escape From Tarkov",
    engine: "Unity",
    languages: ["—"],
    framework: "SPT-AKI (offline)",
    fileTypes: [],
    systemHint: "Tarkov PvP/PvE: raid strategy, loadouts, quests, hideout, map extract points. SPT-AKI questions for the offline mod are OK.",
    fields: [
      { id: "map", label: "Map", kind: "text" },
      { id: "playstyle", label: "Playstyle", kind: "select", options: ["PMC", "Scav", "Quests", "Hatchet"] },
      NOTES_FIELD,
    ],
  },
  {
    id: "cod",
    name: "Call of Duty",
    engine: "IW Engine",
    languages: ["—"],
    framework: "No public modding on modern titles",
    fileTypes: [],
    systemHint: "Modern CoD gameplay: loadouts, meta weapons, movement, positioning, Warzone rotations.",
    fields: [
      { id: "title", label: "Title", kind: "text", placeholder: "e.g. MW3, Warzone, BO6" },
      { id: "mode", label: "Mode", kind: "text" },
      NOTES_FIELD,
    ],
  },
  {
    id: "ow2",
    name: "Overwatch 2",
    engine: "Proprietary",
    languages: ["Workshop Script (block-based)"],
    framework: "Overwatch Workshop",
    fileTypes: [],
    systemHint: "Hero synergies, team comps, positioning, ult economy, or Workshop game-mode ideas.",
    fields: [
      { id: "role", label: "Role", kind: "select", options: ["Tank", "Damage", "Support"] },
      { id: "hero", label: "Main Hero", kind: "text" },
      { id: "rank", label: "Rank", kind: "text" },
      NOTES_FIELD,
    ],
  },
  {
    id: "rocketleague",
    name: "Rocket League",
    engine: "Unreal Engine 3 (custom)",
    languages: ["C++ (BakkesMod plugins)"],
    framework: "BakkesMod",
    fileTypes: [".dll", ".cfg"],
    systemHint: "Mechanics (fast aerial, flip reset, ceiling shots), rotation, kickoffs, or BakkesMod plugin dev.",
    fields: [
      { id: "rank", label: "Rank", kind: "text" },
      { id: "mode", label: "Mode", kind: "select", options: ["1v1", "2v2", "3v3", "Rumble", "Hoops", "Snow Day"] },
      NOTES_FIELD,
    ],
  },
  {
    id: "lol",
    name: "League of Legends",
    engine: "Proprietary",
    languages: ["—"],
    framework: "No modding",
    fileTypes: [],
    systemHint: "Champion picks, matchups, item builds, wave management, macro, and objective priority.",
    fields: [
      { id: "role", label: "Role", kind: "select", options: ["Top", "Jungle", "Mid", "ADC", "Support"] },
      { id: "champion", label: "Main Champion", kind: "text" },
      { id: "rank", label: "Rank", kind: "text" },
      NOTES_FIELD,
    ],
  },
  {
    id: "dota2",
    name: "Dota 2",
    engine: "Source 2",
    languages: ["Lua (Custom Games)"],
    framework: "Dota 2 Workshop Tools",
    fileTypes: [".lua", ".vpcf", ".vmdl"],
    systemHint: "Hero picks, laning, itemization, warding, teamfight timing, or Custom Games scripting in Lua.",
    fields: [
      { id: "role", label: "Role", kind: "select", options: ["Carry", "Mid", "Offlane", "Soft Support", "Hard Support"] },
      { id: "hero", label: "Hero", kind: "text" },
      { id: "rank", label: "MMR / Rank", kind: "text" },
      NOTES_FIELD,
    ],
  },
  {
    id: "tf2",
    name: "Team Fortress 2",
    engine: "Source",
    languages: ["SourcePawn (SourceMod)", "VScript"],
    framework: "SourceMod · Hammer",
    fileTypes: [".sp", ".smx", ".vmf", ".nut"],
    systemHint: "Class play, loadouts, jumps, or SourceMod / VScript / Hammer mapping.",
    fields: [
      { id: "class", label: "Class", kind: "text" },
      NOTES_FIELD,
    ],
  },
  {
    id: "destiny2",
    name: "Destiny 2",
    engine: "Tiger",
    languages: ["—"],
    framework: "No modding",
    fileTypes: [],
    systemHint: "Loadouts, exotics, mods, raid/dungeon mechanics, crucible tips.",
    fields: [
      { id: "class", label: "Class", kind: "select", options: ["Titan", "Warlock", "Hunter"] },
      { id: "activity", label: "Activity", kind: "text" },
      NOTES_FIELD,
    ],
  },
  {
    id: "warthunder",
    name: "War Thunder",
    engine: "Dagor",
    languages: ["—"],
    framework: "No public modding",
    fileTypes: [],
    systemHint: "Vehicle spading, BR sweet-spots, tactics for ground/air/naval.",
    fields: [
      { id: "mode", label: "Mode", kind: "select", options: ["Arcade", "Realistic", "Simulator"] },
      { id: "vehicle", label: "Vehicle Type", kind: "select", options: ["Ground", "Air", "Naval"] },
      { id: "br", label: "Battle Rating", kind: "text" },
      NOTES_FIELD,
    ],
  },
  {
    id: "wow",
    name: "World of Warcraft",
    engine: "Proprietary",
    languages: ["Lua"],
    framework: "WoW Addon API",
    fileTypes: [".lua", ".toc", ".xml"],
    systemHint: "Class rotations, mythic+ routes, raid mechanics, or WoW addon development in Lua/XML.",
    fields: [
      { id: "class", label: "Class / Spec", kind: "text" },
      { id: "content", label: "Content", kind: "select", options: ["Raiding", "Mythic+", "PvP", "Addon Dev", "Leveling"] },
      NOTES_FIELD,
    ],
  },
  {
    id: "fivem",
    name: "FiveM",
    engine: "RAGE (CitizenFX)",
    languages: ["Lua", "C#", "JavaScript"],
    framework: "CitizenFX · ESX · QBCore",
    fileTypes: [".lua", ".cs", ".js", "fxmanifest.lua"],
    systemHint: "Server owner or resource developer on FiveM. Follow ESX/QBCore patterns, use fxmanifest.lua, and separate client/server logic.",
    fields: [
      { id: "framework", label: "Framework", kind: "select", options: ["ESX", "QBCore", "QBox", "Standalone"] },
      { id: "focus", label: "Focus", kind: "select", options: ["Server Config", "Resource Dev", "UI (NUI)", "Database"] },
      NOTES_FIELD,
    ],
  },
  {
    id: "gmod",
    name: "Garry's Mod",
    engine: "Source",
    languages: ["Lua (GLua)"],
    framework: "GMod Addon SDK",
    fileTypes: [".lua", ".gma"],
    systemHint: "GLua addon or gamemode work. Use hook.Add, ENT/SWEP patterns, and net.* for networking.",
    fields: [
      { id: "gamemode", label: "Gamemode", kind: "text", placeholder: "e.g. DarkRP, Sandbox" },
      NOTES_FIELD,
    ],
  },
  {
    id: "terraria",
    name: "Terraria",
    engine: "XNA/MonoGame",
    languages: ["C# (tModLoader)"],
    framework: "tModLoader",
    fileTypes: [".cs", ".tmod"],
    systemHint: "Progression tips or tModLoader mod dev in C#.",
    fields: [
      { id: "focus", label: "Focus", kind: "select", options: ["Playthrough", "Mod Dev", "Boss Fight"] },
      NOTES_FIELD,
    ],
  },
  {
    id: "gd",
    name: "Geometry Dash",
    engine: "Cocos2d-x",
    languages: ["C++ (Geode mods)"],
    framework: "Geode SDK",
    fileTypes: [".geode", ".cpp", ".hpp"],
    systemHint: "Level design, memorization, or Geode SDK modding in C++.",
    fields: [
      { id: "focus", label: "Focus", kind: "select", options: ["Level Design", "Playing", "Modding"] },
      NOTES_FIELD,
    ],
  },
  {
    id: "osu",
    name: "osu!",
    engine: "osu!framework",
    languages: ["C#"],
    framework: "osu!framework (open source)",
    fileTypes: [".osu", ".osz", ".cs"],
    systemHint: "Skill training, tablet setup, map mapping tips, or osu!lazer contributions in C#.",
    fields: [
      { id: "mode", label: "Mode", kind: "select", options: ["osu!", "taiko", "catch", "mania"] },
      { id: "rank", label: "Global Rank / PP", kind: "text" },
      NOTES_FIELD,
    ],
  },
  {
    id: "sot",
    name: "Sea of Thieves",
    engine: "Unreal Engine 4",
    languages: ["—"],
    framework: "No modding",
    fileTypes: [],
    systemHint: "Voyages, PvP naval combat, tall tales, faction grinding.",
    fields: [
      { id: "focus", label: "Focus", kind: "select", options: ["PvE", "PvP", "Emissary", "Tall Tales"] },
      NOTES_FIELD,
    ],
  },
  {
    id: "phasmo",
    name: "Phasmophobia",
    engine: "Unity",
    languages: ["—"],
    framework: "No modding",
    fileTypes: [],
    systemHint: "Ghost identification, evidence gathering, map strategy, difficulty tips.",
    fields: [
      { id: "difficulty", label: "Difficulty", kind: "select", options: ["Amateur", "Intermediate", "Professional", "Nightmare", "Insanity"] },
      NOTES_FIELD,
    ],
  },
  {
    id: "dbd",
    name: "Dead by Daylight",
    engine: "Unreal Engine 4",
    languages: ["—"],
    framework: "No modding",
    fileTypes: [],
    systemHint: "Killer builds, survivor perks, loop tech, map knowledge.",
    fields: [
      { id: "role", label: "Role", kind: "select", options: ["Killer", "Survivor"] },
      { id: "main", label: "Main Killer / Survivor", kind: "text" },
      NOTES_FIELD,
    ],
  },
  {
    id: "ark",
    name: "ARK",
    engine: "Unreal Engine (ARK: SA — UE5)",
    languages: ["C++ (Dev Kit)"],
    framework: "ARK Dev Kit",
    fileTypes: [".uasset", ".umap"],
    systemHint: "Taming, base building, boss fights, or ARK Dev Kit mod creation.",
    fields: [
      { id: "map", label: "Map", kind: "text" },
      { id: "focus", label: "Focus", kind: "select", options: ["PvE", "PvP", "Modding"] },
      NOTES_FIELD,
    ],
  },
  {
    id: "palworld",
    name: "Palworld",
    engine: "Unreal Engine 5",
    languages: ["—"],
    framework: "Community mods (UE tooling)",
    fileTypes: [".pak"],
    systemHint: "Pal breeding, base layouts, boss strategy, server hosting.",
    fields: [
      { id: "focus", label: "Focus", kind: "select", options: ["Breeding", "Base Building", "Combat", "Server"] },
      NOTES_FIELD,
    ],
  },
  {
    id: "helldivers2",
    name: "Helldivers 2",
    engine: "Stingray (Autodesk, deprecated)",
    languages: ["—"],
    framework: "No modding",
    fileTypes: [],
    systemHint: "Loadouts, stratagem synergy, difficulty scaling, faction (Terminid/Automaton/Illuminate) tactics.",
    fields: [
      { id: "difficulty", label: "Difficulty", kind: "text", placeholder: "e.g. Helldive" },
      { id: "faction", label: "Faction", kind: "select", options: ["Terminid", "Automaton", "Illuminate"] },
      NOTES_FIELD,
    ],
  },
  {
    id: "pubg",
    name: "PUBG",
    engine: "Unreal Engine",
    languages: ["—"],
    framework: "No public modding",
    fileTypes: [],
    systemHint: "Rotations, drops, gunplay, zone play.",
    fields: [
      { id: "mode", label: "Mode", kind: "select", options: ["Solo", "Duo", "Squad", "Ranked"] },
      NOTES_FIELD,
    ],
  },
  {
    id: "battlefield",
    name: "Battlefield",
    engine: "Frostbite",
    languages: ["—"],
    framework: "Portal (BF 2042 scripting via Portal editor)",
    fileTypes: [],
    systemHint: "Class play, vehicle tactics, or Battlefield Portal logic for custom experiences.",
    fields: [
      { id: "title", label: "Title", kind: "text", placeholder: "e.g. BF 2042, BF1" },
      { id: "class", label: "Class", kind: "text" },
      NOTES_FIELD,
    ],
  },
  {
    id: "halo",
    name: "Halo Infinite",
    engine: "Slipspace",
    languages: ["—"],
    framework: "Forge (node-based scripting)",
    fileTypes: [],
    systemHint: "Multiplayer tips or Forge scripting/geometry for custom modes.",
    fields: [
      { id: "focus", label: "Focus", kind: "select", options: ["Multiplayer", "Forge", "Campaign"] },
      NOTES_FIELD,
    ],
  },
  {
    id: "finals",
    name: "The Finals",
    engine: "Unreal Engine 5",
    languages: ["—"],
    framework: "No modding",
    fileTypes: [],
    systemHint: "Class builds (Light/Medium/Heavy), destruction tactics, cashout defense.",
    fields: [
      { id: "class", label: "Class", kind: "select", options: ["Light", "Medium", "Heavy"] },
      { id: "mode", label: "Mode", kind: "text" },
      NOTES_FIELD,
    ],
  },
  {
    id: "rivals",
    name: "Marvel Rivals",
    engine: "Unreal Engine 5",
    languages: ["—"],
    framework: "No modding",
    fileTypes: [],
    systemHint: "Hero synergies, team-up abilities, positioning, ranked play.",
    fields: [
      { id: "role", label: "Role", kind: "select", options: ["Vanguard", "Duelist", "Strategist"] },
      { id: "hero", label: "Main Hero", kind: "text" },
      NOTES_FIELD,
    ],
  },
  {
    id: "amongus",
    name: "Among Us",
    engine: "Unity",
    languages: ["C# (via BepInEx mods)"],
    framework: "BepInEx / Reactor",
    fileTypes: [".dll"],
    systemHint: "Impostor/crewmate strategy, task efficiency, meeting reads.",
    fields: [
      { id: "role", label: "Role focus", kind: "select", options: ["Impostor", "Crewmate", "Both"] },
      NOTES_FIELD,
    ],
  },
  {
    id: "brawlhalla",
    name: "Brawlhalla",
    engine: "Proprietary",
    languages: ["—"],
    framework: "No modding",
    fileTypes: [],
    systemHint: "Legend picks, combos, dodge reads, edge-guarding, ranked climb.",
    fields: [
      { id: "legend", label: "Main Legend", kind: "text" },
      { id: "rank", label: "Rank", kind: "text" },
      NOTES_FIELD,
    ],
  },
  {
    id: "other",
    name: "Other (Custom)",
    engine: "—",
    languages: [],
    framework: "—",
    fileTypes: [],
    systemHint: "The user picked a custom game. Rely on the fields they filled in below.",
    fields: [
      { id: "gameName", label: "Game Name", kind: "text" },
      { id: "engine", label: "Engine", kind: "text" },
      { id: "language", label: "Language(s)", kind: "text" },
      NOTES_FIELD,
    ],
  },
];

export function findGame(id: string | null | undefined): GameDefinition | undefined {
  if (!id) return undefined;
  return GAMES.find((g) => g.id === id);
}

export type GameContext = Record<string, string>;

/**
 * Turn a game + its user-filled context into a compact system-prompt block.
 * Empty fields are omitted so the model doesn't see noise.
 */
export function buildGameContextBlock(
  game: GameDefinition,
  context: GameContext,
): string {
  const filled = game.fields
    .map((f) => {
      const v = context[f.id]?.trim();
      return v ? `- ${f.label}: ${v}` : null;
    })
    .filter(Boolean)
    .join("\n");

  const meta = [
    `Game: ${game.name}`,
    game.engine !== "—" ? `Engine: ${game.engine}` : null,
    game.languages.length ? `Language(s): ${game.languages.join(", ")}` : null,
    game.framework !== "—" ? `Framework/API: ${game.framework}` : null,
    game.fileTypes.length ? `Typical file types: ${game.fileTypes.join(", ")}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return `${meta}\n\n${game.systemHint}${filled ? `\n\nUser-provided context:\n${filled}` : ""}`;
}
