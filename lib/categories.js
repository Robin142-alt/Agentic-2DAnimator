const CATEGORY_KEYWORDS = {
  character: [
    "character",
    "hero",
    "person",
    "stickman",
    "figure",
    "pedestrian",
    "human",
    "traveler",
    "walker"
  ],
  vehicle: [
    "vehicle",
    "bus",
    "car",
    "van",
    "truck",
    "bike",
    "bicycle",
    "motorbike",
    "scooter",
    "tram",
    "train",
    "taxi",
    "helicopter",
    "plane",
    "airplane"
  ],
  building: [
    "building",
    "house",
    "home",
    "apartment",
    "mansion",
    "tower",
    "skyscraper",
    "school",
    "station",
    "market",
    "shop",
    "garage",
    "warehouse",
    "office",
    "hallway",
    "workshop",
    "rooftop"
  ],
  prop: [
    "prop",
    "bench",
    "note",
    "letter",
    "phone",
    "bag",
    "umbrella",
    "tree",
    "lamp",
    "sign",
    "chair",
    "table",
    "box",
    "package",
    "fence",
    "gate"
  ]
};

const PHRASE_HINTS = [
  { phrase: "bus stop", assets: ["bus", "bench", "sign"] },
  { phrase: "street", assets: ["building", "lamp"] },
  { phrase: "market", assets: ["building", "bench"] },
  { phrase: "kitchen", assets: ["house", "table"] },
  { phrase: "park", assets: ["bench", "tree"] },
  { phrase: "rooftop", assets: ["building"] },
  { phrase: "hallway", assets: ["building", "lamp"] },
  { phrase: "workshop", assets: ["building", "table"] },
  { phrase: "station", assets: ["building", "bench"] }
];

function unique(values) {
  return [...new Set(values)];
}

export function normalizeAssetName(name) {
  const cleaned = String(name ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  return cleaned || "unnamed asset";
}

export function inferAssetCategory(name) {
  const normalized = normalizeAssetName(name);

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((keyword) => normalized === keyword || normalized.includes(keyword))) {
      return category;
    }
  }

  return null;
}

export function extractAssetHints(text) {
  const normalized = normalizeAssetName(text);
  const assets = [];

  for (const hint of PHRASE_HINTS) {
    if (normalized.includes(hint.phrase)) assets.push(...hint.assets);
  }

  for (const keywords of Object.values(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (normalized.includes(keyword)) assets.push(keyword);
    }
  }

  return unique(assets);
}

export function collectSceneAssetNames(scene) {
  const texts = [scene.setting, ...scene.beats.map((beat) => beat.summary)];
  for (const beat of scene.beats) {
    for (const line of beat.dialogue) texts.push(line.text);
  }

  const collected = unique(texts.flatMap((text) => extractAssetHints(text))).slice(0, 4);
  if (collected.length) return collected;

  const fallbackCategory = inferAssetCategory(scene.setting) ?? "prop";
  if (fallbackCategory === "building") return ["building"];
  if (fallbackCategory === "vehicle") return ["vehicle"];
  if (fallbackCategory === "character") return ["stickman"];
  return ["bench"];
}
