import type { ExpandedStory } from "@/types/story";
import type { Asset, CameraPlan, Emotion, SceneArcRole, Timeline, TimelineItem, TransitionStyle, VisualCue } from "@/types/timeline";
import { clamp01, hashStringToSeed, mulberry32, pick } from "@/engine/rng";
import { resolveSceneAssets } from "@/lib/assetResolver.js";

const ACTIONS: TimelineItem["action"][] = ["idle", "move", "jump", "interact", "gesture", "talk", "react"];

function ensureAction(action: string): TimelineItem["action"] {
  if ((ACTIONS as string[]).includes(action)) return action as TimelineItem["action"];
  return "idle";
}

function speedStyle(rand: () => number, emotion: Emotion): string {
  const speed =
    emotion === "angry" ? "fast" : emotion === "sad" ? "slow" : emotion === "nervous" ? "fast" : "normal";
  const dir = pick(rand, ["left", "right"] as const);
  return `speed:${speed};dir:${dir}`;
}

function dialogueDurationSeconds(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const wps = 2.2; // readable pace
  return Math.max(1.2, Math.min(8, words / wps));
}

function beatToItems(
  rand: () => number,
  emotion: Emotion,
  summary: string,
  dialogueLines: { text: string; emotion: Emotion }[]
): TimelineItem[] {
  const items: TimelineItem[] = [];

  const travel = pick(rand, [true, false, false] as const);
  if (travel) {
    items.push({
      action: "move",
      style: speedStyle(rand, emotion),
      emotion,
      intensity: clamp01(emotion === "angry" ? 0.85 : emotion === "nervous" ? 0.75 : 0.5),
      duration: 1.8,
      dialogue: ""
    });
  } else {
    items.push({
      action: "idle",
      style: "speed:normal",
      emotion,
      intensity: clamp01(0.35),
      duration: 1.1,
      dialogue: ""
    });
  }

  const summaryAsides = summary
    .replace(/\s+/g, " ")
    .trim()
    .split(/[.;]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 1);
  if (summaryAsides[0]) {
    items.push({
      action: "react",
      style: "speed:normal",
      emotion,
      intensity: clamp01(0.45),
      duration: 1.1,
      dialogue: summaryAsides[0]!
    });
  }

  for (const line of dialogueLines) {
    const action = ensureAction("talk");
    const intensity = clamp01(
      line.emotion === "angry" ? 0.9 : line.emotion === "sad" ? 0.55 : line.emotion === "nervous" ? 0.75 : 0.5
    );
    const style = line.emotion === "nervous" ? "speed:fast" : line.emotion === "sad" ? "speed:slow" : "speed:normal";
    items.push({
      action,
      style,
      emotion: line.emotion,
      intensity,
      duration: dialogueDurationSeconds(line.text),
      dialogue: line.text
    });

    const after = pick(rand, ["gesture", "idle", "react"] as const);
    items.push({
      action: ensureAction(after),
      style: speedStyle(rand, line.emotion),
      emotion: line.emotion,
      intensity: clamp01(Math.max(0.25, intensity - 0.15)),
      duration: 0.9,
      dialogue: ""
    });
  }

  return items;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function dominantEmotion(scene: ExpandedStory["scenes"][number]): Emotion {
  const weights = new Map<Emotion, number>([
    ["neutral", 0],
    ["happy", 0],
    ["sad", 0],
    ["angry", 0],
    ["nervous", 0]
  ]);

  for (const beat of scene.beats) {
    weights.set(beat.emotion, (weights.get(beat.emotion) ?? 0) + 2);
    for (const line of beat.dialogue) {
      weights.set(line.emotion, (weights.get(line.emotion) ?? 0) + 1);
    }
  }

  return [...weights.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "neutral";
}

function pickTransition(sceneIndex: number, emotion: Emotion, note: string): TransitionStyle {
  const normalized = note.toLowerCase();
  if (sceneIndex === 0) return "cut";
  if (emotion === "angry" || emotion === "nervous") return "whip";
  if (normalized.includes("hallway") || normalized.includes("rooftop")) return "slide";
  return "dissolve";
}

function arcRoleForScene(scene: ExpandedStory["scenes"][number], sceneCount: number): SceneArcRole {
  if (scene.beats.some((beat) => beat.kind === "climax")) return "climax";
  if (scene.index >= sceneCount - 2 || scene.beats.every((beat) => beat.kind === "resolution")) return "resolution";
  if (scene.index === 0 || scene.beats.some((beat) => beat.kind === "setup")) return "setup";
  return "conflict";
}

function planCameraForScene(
  scene: ExpandedStory["scenes"][number],
  assets: Asset[],
  sceneIndex: number,
  rand: () => number
): CameraPlan {
  const note = scene.setting.toLowerCase();
  const emotion = dominantEmotion(scene);
  const hasVehicle = assets.some((asset) => asset.category === "vehicle");
  const hasBuilding = assets.some((asset) => asset.category === "building");
  const dialogueCount = scene.beats.reduce((sum, beat) => sum + beat.dialogue.length, 0);
  const hasClimax = scene.beats.some((beat) => beat.kind === "climax");

  let shot: CameraPlan["shot"] = "medium";
  if (hasClimax || emotion === "angry") shot = "close";
  else if (hasVehicle || hasBuilding || note.includes("rooftop") || note.includes("market")) shot = "wide";
  else if (dialogueCount >= 5 || emotion === "sad") shot = "medium";
  else if (note.includes("street") || note.includes("park")) shot = "tracking";

  const baseZoom =
    shot === "wide" ? 0.92 : shot === "medium" ? 1.02 : shot === "close" ? 1.18 : 1.08;
  const panBias = clamp((rand() - 0.5) * 1.4 + (sceneIndex % 2 === 0 ? -0.12 : 0.12), -1, 1);

  return {
    shot,
    baseZoom,
    panBias,
    transition: pickTransition(sceneIndex, emotion, scene.setting)
  };
}

export function buildTimeline(expanded: ExpandedStory): Timeline {
  const seed = hashStringToSeed(JSON.stringify(expanded));
  const rand = mulberry32(seed);

  const timeline: TimelineItem[] = [];
  const visuals: VisualCue[] = [];
  let cursor = 0;

  const pushItem = (item: TimelineItem) => {
    timeline.push(item);
    cursor += Math.max(0.1, item.duration);
  };

  // Cold open
  pushItem({
    action: "idle",
    style: "speed:normal",
    emotion: "neutral",
    intensity: 0.25,
    duration: 1.2,
    dialogue: expanded.logline
  });

  for (const scene of expanded.scenes) {
    const sceneStart = cursor;
    const arcRole = arcRoleForScene(scene, expanded.scenes.length);

    pushItem({
      action: "move",
      style: speedStyle(rand, "neutral"),
      emotion: "neutral",
      intensity: 0.4,
      duration: 1.4,
      dialogue: scene.setting
    });

    for (const beat of scene.beats) {
      const items = beatToItems(
        rand,
        beat.emotion,
        beat.summary,
        beat.dialogue.map((d) => ({ text: `${d.speaker}: ${d.text}`, emotion: d.emotion }))
      );
      for (const it of items) pushItem(it);

      if (beat.kind === "climax") {
        pushItem({
          action: "jump",
          style: speedStyle(rand, beat.emotion),
          emotion: beat.emotion,
          intensity: clamp01(0.85),
          duration: 1.4,
          dialogue: ""
        });
      }
    }

    const assets = resolveSceneAssets(scene);
    const camera = planCameraForScene(scene, assets, scene.index, rand);

    visuals.push({
      start: Math.round(sceneStart * 1000) / 1000,
      end: Math.round(cursor * 1000) / 1000,
      note: scene.setting,
      assets,
      assetNames: assets.map((asset: any) => asset.name),
      camera,
      arcRole
    });
  }

  // Outro
  pushItem({
    action: "idle",
    style: "speed:slow",
    emotion: "happy",
    intensity: 0.3,
    duration: 1.6,
    dialogue: "The moment settles."
  });

  return { total_duration: Math.round(cursor * 1000) / 1000, timeline, visuals };
}
