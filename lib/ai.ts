import type { ExpandedStory } from "@/types/story";
import type { Timeline } from "@/types/timeline";
import { expandStory } from "@/engine/storyExpansion";
import { buildTimeline } from "@/engine/directorEngine";
import { createTrace, logStage, validateExpandedStory, validateTimeline, type PipelineTrace } from "@/lib/pipeline";
import type { RenderedVideoMeta } from "@/lib/renderJob";
import { renderTimelineToVideoArtifact } from "@/lib/renderJob";

export type GenerateResult = {
  expanded: ExpandedStory;
  timeline: Timeline;
  video?: RenderedVideoMeta;
  traceId: string;
};

// Deterministic "AI-like" generation with optional future integration points.
export async function generateFromText(
  text: string,
  opts?: {
    trace?: PipelineTrace;
    renderVideo?: boolean;
  }
): Promise<GenerateResult> {
  const trace = opts?.trace ?? createTrace("generate");
  logStage(trace, "input", "story text received", { chars: text.length, preview: text.slice(0, 120) });

  logStage(trace, "story-compiler", "expanding structured story");
  const expanded = expandStory(text);
  const expandedValidation = validateExpandedStory(expanded);
  logStage(trace, "story-compiler", "structured story created", {
    scenes: expanded.scenes.length,
    valid: expandedValidation.ok,
    issues: expandedValidation.issues
  });
  if (!expandedValidation.ok) {
    throw new Error(`Expanded story invalid: ${expandedValidation.issues.join("; ")}`);
  }

  logStage(trace, "scene-generator", "scenes ready", {
    sceneTitles: expanded.scenes.map((scene) => scene.title)
  });

  logStage(trace, "director", "building animation timeline");
  const timeline = buildTimeline(expanded);
  const timelineValidation = validateTimeline(timeline);
  logStage(trace, "director", "animation timeline built", {
    timelineItems: timeline.timeline.length,
    totalDuration: timeline.total_duration,
    valid: timelineValidation.ok,
    issues: timelineValidation.issues
  });
  if (!timelineValidation.ok) {
    throw new Error(`Timeline invalid: ${timelineValidation.issues.join("; ")}`);
  }

  logStage(trace, "audio", "audio generation skipped", {
    reason: "No TTS/audio stage exists in the current lightweight pipeline"
  });

  let video: RenderedVideoMeta | undefined;
  if (opts?.renderVideo) {
    logStage(trace, "render", "rendering video artifact from generated timeline");
    video = await renderTimelineToVideoArtifact(timeline);
    logStage(trace, "render", "video artifact created", {
      path: video.path,
      sizeBytes: video.sizeBytes,
      framesDir: video.framesDir
    });
  }

  return { expanded, timeline, video, traceId: trace.id };
}
