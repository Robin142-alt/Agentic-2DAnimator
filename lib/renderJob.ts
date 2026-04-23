import type { RenderConfig, Timeline } from "@/types/timeline";
import { renderTimelineToMp4File } from "@/engine/renderer";
import { validateFileOutput } from "@/lib/pipeline";

export type RenderedVideoMeta = {
  path: string;
  sizeBytes: number;
  framesDir: string;
  mimeType: "video/mp4";
};

export async function renderTimelineToVideoArtifact(
  timeline: Timeline,
  config?: Partial<RenderConfig>
): Promise<RenderedVideoMeta> {
  const { mp4Path, framesDir } = await renderTimelineToMp4File(timeline, config);
  const file = await validateFileOutput(mp4Path);
  if (!file.exists || file.sizeBytes <= 0) {
    throw new Error(`Rendered video file was not created: ${mp4Path}`);
  }

  return {
    path: mp4Path,
    sizeBytes: file.sizeBytes,
    framesDir,
    mimeType: "video/mp4"
  };
}

