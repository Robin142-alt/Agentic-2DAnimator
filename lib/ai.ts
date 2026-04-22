import type { ExpandedStory } from "@/types/story";
import type { Timeline } from "@/types/timeline";
import { expandStory } from "@/engine/storyExpansion";
import { buildTimeline } from "@/engine/directorEngine";

export type GenerateResult = {
  expanded: ExpandedStory;
  timeline: Timeline;
};

// Deterministic "AI-like" generation with optional future integration points.
export async function generateFromText(text: string): Promise<GenerateResult> {
  const expanded = expandStory(text);
  const timeline = buildTimeline(expanded);
  return { expanded, timeline };
}

