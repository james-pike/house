// Smart color name → CSS value resolver
// Handles compound names like "Vintage Indigo/Black", "Sandstone/Carhartt Brown", etc.

const COLOR_MAP: Record<string, string> = {
  // Neutrals
  "black": "#1a1a1a",
  "white": "#f8f8f8",
  "gray": "#6b7280",
  "grey": "#6b7280",
  "charcoal": "#36454f",
  "shadow": "#4a4a4a",
  "asphalt": "#3d3d3d",
  "steel": "#71797E",
  "stone": "#8a8a7b",
  "ash": "#b2beb5",
  "silver": "#c0c0c0",
  "carbon": "#555555",
  "slate": "#708090",
  "smoke": "#848884",
  "iron": "#48494b",
  "pewter": "#8e9196",
  "thunder": "#4d4d4d",

  // Browns
  "brown": "#78350f",
  "tan": "#d2b48c",
  "khaki": "#c3b091",
  "beige": "#e8dcc8",
  "sand": "#c2b280",
  "sandstone": "#c9ae87",
  "walnut": "#5b3a29",
  "bison": "#6d4c33",
  "tobacco": "#6e4b2d",
  "caramel": "#a0522d",
  "teak": "#b8860b",
  "saddle": "#8b4513",
  "chestnut": "#954535",
  "auburn": "#a0522d",
  "sienna": "#a0522d",
  "mahogany": "#4e1609",
  "rustic": "#6b4226",
  "canyon": "#8b5e3c",
  "carhartt brown": "#7a5230",
  "frontier": "#6b4423",
  "cocoa": "#5c3317",
  "chocolate": "#3b1e08",
  "coffee": "#6f4e37",
  "mocha": "#7a5c45",
  "earth": "#5e3023",
  "cedar": "#7a4e2d",
  "copper": "#b87333",
  "brass": "#b5a642",
  "bronze": "#cd7f32",
  "amber": "#cf8a2e",
  "wheat": "#c8a951",
  "oat": "#d4c5a9",
  "ecru": "#c2b280",

  // Reds
  "red": "#dc2626",
  "crimson": "#8b0000",
  "burgundy": "#800020",
  "maroon": "#800000",
  "wine": "#722f37",
  "port": "#6c3461",
  "shiraz": "#7b2d3b",
  "salsa": "#c0392b",
  "ruby": "#9b111e",
  "cherry": "#c2185b",
  "rose": "#e8919e",
  "berry": "#8e4585",
  "rust": "#b7410e",
  "rusted": "#b7410e",
  "brick": "#cb4154",

  // Blues
  "blue": "#2563eb",
  "navy": "#1b3a5c",
  "indigo": "#3f51b5",
  "cobalt": "#0047ab",
  "teal": "#008080",
  "aqua": "#00bcd4",
  "azure": "#007fff",
  "sapphire": "#0f52ba",
  "royal": "#4169e1",
  "denim": "#1560bd",
  "canal": "#4c6d8b",
  "regatta": "#2e5090",
  "celestial": "#4997d0",
  "tranquil": "#6fb9d0",
  "sea": "#2e8b8b",

  // Greens
  "green": "#16a34a",
  "olive": "#556b2f",
  "moss": "#4a5d23",
  "basil": "#3e6b3e",
  "sage": "#87ae73",
  "forest": "#228b22",
  "pine": "#2d5a27",
  "lime": "#84cc16",
  "mint": "#98fb98",
  "fern": "#4f7942",
  "ivy": "#355e3b",
  "jade": "#00a86b",
  "army": "#4b5320",
  "hunter": "#355e3b",
  "kelp": "#3d5e1e",
  "spruce": "#2c5f3b",
  "rye": "#a89050",

  // Oranges
  "orange": "#ea580c",
  "tangerine": "#ff9966",
  "coral": "#ff6f61",
  "peach": "#ffcba4",
  "apricot": "#fbceb1",
  "salmon": "#fa8072",
  "terracotta": "#e2725b",
  "ginger": "#b06500",

  // Yellows
  "yellow": "#eab308",
  "gold": "#d4a017",
  "mustard": "#e1ad01",
  "honey": "#eb9605",
  "lemon": "#fff44f",
  "ochre": "#cc7722",
  "saffron": "#f4c430",
  "banana": "#ffe135",
  "suntan": "#d2a76c",

  // Purples
  "purple": "#7c3aed",
  "plum": "#673147",
  "lavender": "#b57edc",
  "mauve": "#b784a7",
  "violet": "#8b5cf6",
  "lilac": "#c8a2c8",
  "magenta": "#ff00ff",
  "blackberry": "#4b0049",

  // Pinks
  "pink": "#ec4899",
  "fuchsia": "#ff00ff",
  "blush": "#de5d83",

  // Hi-Vis / Safety
  "hi-vis": "#d4e600",
  "neon": "#39ff14",
  "fluorescent": "#ccff00",

  // Camo
  "camo": "linear-gradient(135deg,#4a5d23 25%,#6b7f3a 25%,#6b7f3a 50%,#374a20 50%,#374a20 75%,#556b2f 75%)",

  // Heather (muted versions — default to a muted gray-tone)
  "heather": "#a0a0a0",

  // Brand-specific creative names → closest real color
  "alder": "#6b4226",         // dark reddish-brown wood
  "bay": "#6b7f5e",           // muted olive-green
  "belgian": "#c8a87a",       // warm tan
  "bitterbrush": "#8b7355",   // dusty brown
  "bluestem": "#5b7a8a",      // muted steel-blue
  "bluestone": "#506878",     // dark slate-blue
  "boulder": "#7a7a6d",       // warm gray
  "broadwater": "#4a7a8c",    // teal-blue
  "cascade": "#4a7d6f",       // forest teal
  "chestnut": "#954535",      // warm reddish-brown
  "clay": "#b66a50",          // terracotta
  "coal": "#3b3b3b",          // near-black
  "cobblestone": "#8e8e82",   // warm gray
  "coldwater": "#5a7d8c",     // cool blue-gray
  "concrete": "#8c8c8c",      // medium gray
  "cove": "#4a6670",          // dark teal
  "darkstone": "#4a4a42",     // dark warm gray
  "desert": "#c9a86c",        // sandy tan
  "dill": "#6b7a2e",          // olive-yellow green
  "downpour": "#5a6a7a",      // storm gray-blue
  "driftwood": "#b8a088",     // warm beige
  "eggshell": "#f0ead6",      // off-white
  "erie": "#4a6a5a",          // dark teal-green
  "ferrous": "#5a5a5a",       // iron gray
  "fog": "#c8c8c8",           // light gray
  "forge": "#4a4a4a",         // dark gray
  "freight": "#6b6b5a",       // olive gray
  "granite": "#808080",       // medium gray
  "gravel": "#7a7a6d",        // warm gray
  "greige": "#b8b0a0",        // gray-beige
  "grotto": "#3a7a6d",        // deep teal
  "hickory": "#6b4226",       // warm brown
  "houghton": "#5a6a70",      // slate
  "lakeshore": "#4a7a8c",     // blue-gray
  "huron": "#5a7a8c",         // lake blue
  "mahogany": "#4e1609",      // deep red-brown
  "malt": "#c9a86c",          // golden tan
  "midnight": "#191970",      // deep navy
  "morning": "#c8d0d8",       // pale gray-blue
  "mountain": "#5a6a50",      // forest green
  "muskegon": "#5a6a70",      // cool gray
  "natural": "#d4c9a8",       // undyed beige
  "naval": "#1b3a5c",         // navy
  "north": "#3a5a3a",         // dark green
  "oat": "#d4c5a9",           // warm cream
  "peat": "#5a4a30",          // dark brown-green
  "primrose": "#e8d44d",      // yellow
  "railroad": "#1a1a3a",      // dark indigo stripe
  "rocky": "#7a6a5a",         // brown-gray
  "sepia": "#704214",         // dark brown
  "shaded": "#8a7a6a",        // warm gray
  "storm": "#5a6070",         // dark blue-gray
  "superior": "#4a6070",      // lake blue-gray
  "superstorm": "#4a5060",    // dark storm
  "tahoe": "#3a6a8a",         // lake blue
  "tamarack": "#6b7a2e",      // green-gold
  "tarmac": "#4a4a4a",        // asphalt gray
  "thundercloud": "#4d5a6a",  // dark storm blue
  "vapor": "#d8d8d8",         // near-white
  "weld": "#8a8a2e",          // yellow-green
  "wyatt": "#7a6a50",         // dusty brown
  "ocean": "#1a5276",         // deep blue
  "creek": "#5a8a6a",         // green-blue
  "fuchsia": "#ff00ff",       // bright pink
  "mint": "#98fb98",          // light green
};

// Keywords to strip when parsing compound color names
const NOISE_WORDS = new Set([
  "dark", "light", "medium", "deep", "bright", "pale", "vivid", "muted",
  "premium", "vintage", "washed", "duck", "rugged", "terrain", "chambray",
  "heather", "striped", "stripe", "railroad", "print", "watercolor",
  "oil", "kip", "nubuck", "suede", "scuff", "cap", "oiled",
]);

// Modifier words that adjust the base color
const DARK_MODIFIERS = new Set(["dark", "deep"]);
const LIGHT_MODIFIERS = new Set(["light", "pale", "bright"]);

function darken(hex: string): string {
  if (hex.startsWith("linear")) return hex;
  const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - 40);
  const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - 40);
  const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - 40);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

function lighten(hex: string): string {
  if (hex.startsWith("linear")) return hex;
  const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + 40);
  const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + 40);
  const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + 40);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

export function getColorCss(name: string): string {
  const lower = name.toLowerCase().trim();

  // 1. Direct match
  if (COLOR_MAP[lower]) return COLOR_MAP[lower];

  // 2. Check for camo anywhere in name
  if (lower.includes("camo")) return COLOR_MAP["camo"];

  // 3. Split compound names: "Vintage Indigo/Black" → ["vintage indigo", "black"]
  //    Also handle " / " and " - " separators
  const segments = lower.split(/[\/\-]/).map((s) => s.trim()).filter(Boolean);

  // Try each segment
  for (const segment of segments) {
    if (COLOR_MAP[segment]) return COLOR_MAP[segment];

    // Split into words and try to find a color keyword
    const words = segment.split(/\s+/);
    let isDark = false;
    let isLight = false;

    for (const word of words) {
      if (DARK_MODIFIERS.has(word)) { isDark = true; continue; }
      if (LIGHT_MODIFIERS.has(word)) { isLight = true; continue; }
      if (NOISE_WORDS.has(word)) continue;

      if (COLOR_MAP[word]) {
        let color = COLOR_MAP[word];
        if (isDark) color = darken(color);
        if (isLight) color = lighten(color);
        return color;
      }
    }
  }

  // 4. Last resort: try the full name as words
  const allWords = lower.replace(/[\/\-]/g, " ").split(/\s+/);
  for (const word of allWords) {
    if (NOISE_WORDS.has(word)) continue;
    if (COLOR_MAP[word]) return COLOR_MAP[word];
  }

  // 5. No match — return neutral gray
  return "#9ca3af";
}
