import { resolveAsset } from "../lib/assetResolver.js";
import { getRegistryPath } from "../lib/cache.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const known = resolveAsset("bus");
const knownCached = resolveAsset("bus");
const unknown = resolveAsset("unknown_object");
const edge = resolveAsset("");

assert(known && Array.isArray(known.shapes) && known.shapes.length > 0, "known asset should be renderable");
assert(knownCached && knownCached.normalizedName === "bus", "known asset should resolve from cache/registry");
assert(unknown && Array.isArray(unknown.shapes) && unknown.shapes.length > 0, "unknown asset should fall back safely");
assert(edge && Array.isArray(edge.shapes) && edge.shapes.length > 0, "empty asset name should still resolve");

console.log(`[asset-test] registry: ${getRegistryPath()}`);
console.log(
  JSON.stringify(
    {
      known: { name: known.name, category: known.category, source: known.source },
      knownCached: { name: knownCached.name, category: knownCached.category, source: knownCached.source },
      unknown: { name: unknown.name, category: unknown.category, source: unknown.source },
      edge: { name: edge.name, category: edge.category, source: edge.source }
    },
    null,
    2
  )
);
