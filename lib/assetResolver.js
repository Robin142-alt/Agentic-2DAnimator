import { cacheAsset, getCachedAsset } from "./cache.js";
import { collectSceneAssetNames, inferAssetCategory, normalizeAssetName } from "./categories.js";
import { generateCategoryAsset, generateProceduralAsset } from "./generators.js";
import { createPlaceholderAsset } from "./placeholder.js";

function warn(message) {
  console.warn(`[WARN] ${message}`);
}

function guaranteePlaceholder(name, normalizedName) {
  try {
    return cacheAsset(createPlaceholderAsset(name, normalizedName));
  } catch {
    return {
      id: `asset:${normalizedName}`,
      name,
      normalizedName,
      category: "placeholder",
      source: "placeholder",
      width: 120,
      height: 90,
      anchorY: 90,
      variationSeed: 0,
      label: name,
      shapes: [
        { type: "rect", x: 4, y: 4, width: 112, height: 82, fill: "#18181b", stroke: "#f59e0b", lineWidth: 3, radius: 8 },
        { type: "text", x: 60, y: 38, text: name.slice(0, 18), color: "#f4f4f5", fontSize: 14, align: "center" }
      ]
    };
  }
}

export function resolveAsset(name) {
  const rawName = typeof name === "string" ? name.trim() : "";
  const normalizedName = normalizeAssetName(rawName);
  const safeName = rawName || "unknown asset";

  try {
    const cached = getCachedAsset(normalizedName);
    if (cached) return cached;
  } catch (error) {
    warn(`Asset registry lookup failed for "${safeName}": ${error instanceof Error ? error.message : String(error)}`);
  }

  try {
    const procedural = generateProceduralAsset(safeName);
    if (procedural) {
      warn(`Using procedural generation for "${safeName}"`);
      return cacheAsset(procedural);
    }
  } catch (error) {
    warn(`Procedural generation failed for "${safeName}": ${error instanceof Error ? error.message : String(error)}`);
  }

  try {
    const category = inferAssetCategory(safeName);
    if (category) {
      warn(`Using category fallback for "${safeName}"`);
      return cacheAsset(generateCategoryAsset(safeName, category));
    }
  } catch (error) {
    warn(`Category fallback failed for "${safeName}": ${error instanceof Error ? error.message : String(error)}`);
  }

  warn(`Using placeholder fallback for "${safeName}"`);
  return guaranteePlaceholder(safeName, normalizedName);
}

export function resolveAssets(names) {
  return [...new Set((names ?? []).map((name) => normalizeAssetName(name)))]
    .map((normalizedName) => resolveAsset(normalizedName))
    .filter(Boolean);
}

export function resolveSceneAssets(scene) {
  try {
    const names = collectSceneAssetNames(scene);
    return resolveAssets(names);
  } catch (error) {
    warn(`Scene asset resolution failed for "${scene?.title ?? "scene"}": ${error instanceof Error ? error.message : String(error)}`);
    return [resolveAsset(scene?.title || "scene asset")];
  }
}
