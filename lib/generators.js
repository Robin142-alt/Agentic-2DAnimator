import { inferAssetCategory, normalizeAssetName } from "./categories.js";

function hashString(input) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index++) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function rng(seedValue) {
  let seed = seedValue >>> 0;
  return () => {
    seed += 0x6d2b79f5;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function round(n) {
  return Math.round(n * 1000) / 1000;
}

function assetBase(name, normalizedName, category, source, width, height, seed) {
  return {
    id: `asset:${normalizedName}`,
    name,
    normalizedName,
    category,
    source,
    width: round(width),
    height: round(height),
    anchorY: round(height),
    variationSeed: seed,
    label: name,
    shapes: []
  };
}

function createStickmanAsset(name, normalizedName, source, random, seed) {
  const width = 72 + random() * 10;
  const height = 136 + random() * 16;
  const centerX = width / 2;
  const headRadius = 14 + random() * 3;
  const bodyTop = 34;
  const hipY = 86 + random() * 8;
  const armReach = 22 + random() * 6;
  const legReach = 30 + random() * 6;
  const stroke = "#d4d4d8";

  const asset = assetBase(name, normalizedName, "character", source, width, height, seed);
  asset.shapes = [
    { type: "circle", x: centerX, y: 18, radius: headRadius, stroke, lineWidth: 4 },
    { type: "line", x1: centerX, y1: bodyTop, x2: centerX, y2: hipY, stroke, lineWidth: 4 },
    { type: "line", x1: centerX, y1: 48, x2: centerX - armReach, y2: 48 + 22, stroke, lineWidth: 4 },
    { type: "line", x1: centerX, y1: 48, x2: centerX + armReach, y2: 48 + 18, stroke, lineWidth: 4 },
    { type: "line", x1: centerX, y1: hipY, x2: centerX - 14, y2: hipY + legReach, stroke, lineWidth: 4 },
    { type: "line", x1: centerX, y1: hipY, x2: centerX + 14, y2: hipY + legReach + 6, stroke, lineWidth: 4 }
  ];
  return asset;
}

function createVehicleAsset(name, normalizedName, source, random, seed) {
  const width = 146 + random() * 34;
  const height = 72 + random() * 12;
  const bodyY = 24 + random() * 8;
  const bodyHeight = 24 + random() * 10;
  const wheelRadius = 12 + random() * 2;
  const bodyColor = normalizedName.includes("bus") ? "#f59e0b" : normalizedName.includes("truck") ? "#60a5fa" : "#ef4444";
  const asset = assetBase(name, normalizedName, "vehicle", source, width, height, seed);

  asset.shapes = [
    { type: "rect", x: 10, y: bodyY, width: width - 20, height: bodyHeight, fill: bodyColor, stroke: "#0f172a", lineWidth: 3, radius: 8 },
    { type: "rect", x: 26, y: bodyY - 16, width: width * 0.4, height: 18, fill: "#fbbf24", stroke: "#0f172a", lineWidth: 3, radius: 6 },
    { type: "rect", x: width * 0.52, y: bodyY - 12, width: width * 0.2, height: 14, fill: "#93c5fd", radius: 4 },
    { type: "circle", x: 34, y: height - 12, radius: wheelRadius, fill: "#18181b", stroke: "#d4d4d8", lineWidth: 3 },
    { type: "circle", x: width - 34, y: height - 12, radius: wheelRadius, fill: "#18181b", stroke: "#d4d4d8", lineWidth: 3 }
  ];
  return asset;
}

function createBuildingAsset(name, normalizedName, source, random, seed) {
  const width = 116 + random() * 34;
  const height = 176 + random() * 58;
  const asset = assetBase(name, normalizedName, "building", source, width, height, seed);
  const facade = normalizedName.includes("mansion") ? "#78350f" : normalizedName.includes("tower") ? "#1d4ed8" : "#334155";

  const windows = [];
  const columns = 2 + Math.floor(random() * 2);
  const rows = 3 + Math.floor(random() * 3);
  const spacingX = width / (columns + 1);
  const spacingY = (height - 56) / (rows + 1);
  for (let x = 1; x <= columns; x++) {
    for (let y = 1; y <= rows; y++) {
      windows.push({
        type: "rect",
        x: x * spacingX - 9,
        y: y * spacingY,
        width: 18,
        height: 22,
        fill: "#fde68a",
        stroke: "#0f172a",
        lineWidth: 1.5,
        radius: 2
      });
    }
  }

  asset.shapes = [
    { type: "rect", x: 8, y: 10, width: width - 16, height: height - 10, fill: facade, stroke: "#e2e8f0", lineWidth: 3, radius: 6 },
    ...windows,
    { type: "rect", x: width / 2 - 14, y: height - 48, width: 28, height: 38, fill: "#111827", stroke: "#f4f4f5", lineWidth: 2, radius: 4 }
  ];
  return asset;
}

function createPropAsset(name, normalizedName, source, random, seed) {
  const width = 86 + random() * 28;
  const height = 88 + random() * 26;
  const asset = assetBase(name, normalizedName, "prop", source, width, height, seed);

  if (normalizedName.includes("bench")) {
    asset.shapes = [
      { type: "rect", x: 14, y: 32, width: width - 28, height: 10, fill: "#a16207", radius: 3 },
      { type: "rect", x: 18, y: 20, width: width - 36, height: 8, fill: "#ca8a04", radius: 3 },
      { type: "line", x1: 22, y1: 42, x2: 18, y2: height - 8, stroke: "#e5e7eb", lineWidth: 3 },
      { type: "line", x1: width - 22, y1: 42, x2: width - 18, y2: height - 8, stroke: "#e5e7eb", lineWidth: 3 }
    ];
    return asset;
  }

  if (normalizedName.includes("tree")) {
    asset.shapes = [
      { type: "rect", x: width / 2 - 8, y: height - 40, width: 16, height: 34, fill: "#78350f" },
      { type: "circle", x: width / 2, y: 24, radius: 24, fill: "#22c55e", stroke: "#14532d", lineWidth: 3 },
      { type: "circle", x: width / 2 - 18, y: 34, radius: 16, fill: "#16a34a" },
      { type: "circle", x: width / 2 + 16, y: 36, radius: 14, fill: "#16a34a" }
    ];
    return asset;
  }

  if (normalizedName.includes("note") || normalizedName.includes("letter")) {
    asset.shapes = [
      { type: "rect", x: 18, y: 16, width: width - 36, height: height - 30, fill: "#fef3c7", stroke: "#1f2937", lineWidth: 2, radius: 6 },
      { type: "line", x1: 28, y1: 34, x2: width - 28, y2: 34, stroke: "#64748b", lineWidth: 2 },
      { type: "line", x1: 28, y1: 48, x2: width - 34, y2: 48, stroke: "#64748b", lineWidth: 2 },
      { type: "line", x1: 28, y1: 62, x2: width - 42, y2: 62, stroke: "#64748b", lineWidth: 2 }
    ];
    return asset;
  }

  asset.shapes = [
    { type: "rect", x: 16, y: 18, width: width - 32, height: height - 28, fill: "#374151", stroke: "#e5e7eb", lineWidth: 2, radius: 8 },
    { type: "line", x1: width / 2, y1: 18, x2: width / 2, y2: height - 10, stroke: "#9ca3af", lineWidth: 2 }
  ];
  return asset;
}

export function generateProceduralAsset(name) {
  const normalizedName = normalizeAssetName(name);
  const seed = hashString(normalizedName);
  const random = rng(seed);

  if (["stickman", "person", "hero", "character", "pedestrian"].some((token) => normalizedName.includes(token))) {
    return createStickmanAsset(name, normalizedName, "procedural", random, seed);
  }
  if (["bus", "car", "truck", "van", "taxi", "bike", "bicycle"].some((token) => normalizedName.includes(token))) {
    return createVehicleAsset(name, normalizedName, "procedural", random, seed);
  }
  if (["house", "building", "tower", "station", "market", "workshop", "hallway"].some((token) => normalizedName.includes(token))) {
    return createBuildingAsset(name, normalizedName, "procedural", random, seed);
  }
  if (["bench", "tree", "note", "letter", "lamp", "table", "chair", "sign"].some((token) => normalizedName.includes(token))) {
    return createPropAsset(name, normalizedName, "procedural", random, seed);
  }
  return null;
}

export function generateCategoryAsset(name, category) {
  const normalizedName = normalizeAssetName(name);
  const inferred = category || inferAssetCategory(normalizedName) || "prop";
  const seed = hashString(`${normalizedName}:${inferred}`);
  const random = rng(seed);

  if (inferred === "character") return createStickmanAsset(name, normalizedName, "category", random, seed);
  if (inferred === "vehicle") return createVehicleAsset(name, normalizedName, "category", random, seed);
  if (inferred === "building") return createBuildingAsset(name, normalizedName, "category", random, seed);
  return createPropAsset(name, normalizedName, "category", random, seed);
}
