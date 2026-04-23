import fs from "node:fs";
import path from "node:path";

const REGISTRY_DIR = path.join(process.cwd(), "data");
const REGISTRY_FILE = path.join(REGISTRY_DIR, "assets-registry.json");

let memoryRegistry = null;

function cloneAsset(asset) {
  return asset ? JSON.parse(JSON.stringify(asset)) : asset;
}

function ensureRegistryLoaded() {
  if (memoryRegistry) return memoryRegistry;

  try {
    fs.mkdirSync(REGISTRY_DIR, { recursive: true });
    if (!fs.existsSync(REGISTRY_FILE)) {
      fs.writeFileSync(REGISTRY_FILE, "{}\n", "utf8");
      memoryRegistry = {};
      return memoryRegistry;
    }

    const raw = fs.readFileSync(REGISTRY_FILE, "utf8");
    const parsed = raw.trim() ? JSON.parse(raw) : {};
    memoryRegistry = parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    console.warn(`[WARN] Asset registry load failed: ${error instanceof Error ? error.message : String(error)}`);
    memoryRegistry = {};
  }

  return memoryRegistry;
}

function persistRegistry() {
  try {
    fs.mkdirSync(REGISTRY_DIR, { recursive: true });
    fs.writeFileSync(REGISTRY_FILE, `${JSON.stringify(ensureRegistryLoaded(), null, 2)}\n`, "utf8");
  } catch (error) {
    console.warn(`[WARN] Asset registry persist failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export function getRegistryPath() {
  return REGISTRY_FILE;
}

export function loadAssetRegistry() {
  return cloneAsset(ensureRegistryLoaded());
}

export function getCachedAsset(normalizedName) {
  const registry = ensureRegistryLoaded();
  return cloneAsset(registry[normalizedName] ?? null);
}

export function cacheAsset(asset) {
  if (!asset || !asset.normalizedName) return cloneAsset(asset);
  const registry = ensureRegistryLoaded();
  registry[asset.normalizedName] = cloneAsset(asset);
  persistRegistry();
  return cloneAsset(asset);
}
