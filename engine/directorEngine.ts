import type { ExpandedStory } from "@/types/story";
import type { Emotion, Timeline, TimelineItem } from "@/types/timeline";
import { clamp01, hashStringToSeed, mulberry32, pick } from "@/engine/rng";

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

export function buildTimeline(expanded: ExpandedStory): Timeline {
  const seed = hashStringToSeed(JSON.stringify(expanded));
  const rand = mulberry32(seed);

  const timeline: TimelineItem[] = [];

  // Cold open
  timeline.push({
    action: "idle",
    style: "speed:normal",
    emotion: "neutral",
    intensity: 0.25,
    duration: 1.2,
    dialogue: expanded.logline
  });

  for (const scene of expanded.scenes) {
    timeline.push({
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
      for (const it of items) timeline.push(it);

      if (beat.kind === "climax") {
        timeline.push({
          action: "jump",
          style: speedStyle(rand, beat.emotion),
          emotion: beat.emotion,
          intensity: clamp01(0.85),
          duration: 1.4,
          dialogue: ""
        });
      }
    }
  }

  // Outro
  timeline.push({
    action: "idle",
    style: "speed:slow",
    emotion: "happy",
    intensity: 0.3,
    duration: 1.6,
    dialogue: "The moment settles."
  });

  const total_duration = timeline.reduce((sum, t) => sum + Math.max(0.1, t.duration), 0);
  return { total_duration: Math.round(total_duration * 1000) / 1000, timeline };
}

