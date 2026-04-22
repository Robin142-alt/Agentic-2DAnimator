import { renderSceneFrame } from "@/animation/renderScene";
import { SyncEngine } from "@/engine/syncEngine";
import type { Timeline } from "@/types/timeline";

type ExportResult = {
  blob: Blob;
  extension: "webm";
  mimeType: string;
};

function getSupportedMimeType(): string {
  const candidates = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
  for (const candidate of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(candidate)) {
      return candidate;
    }
  }
  return "video/webm";
}

export async function exportTimelineInBrowser(
  timeline: Timeline,
  opts?: {
    width?: number;
    height?: number;
    fps?: number;
    onProgress?: (progress: number) => void;
  }
): Promise<ExportResult> {
  if (typeof window === "undefined") {
    throw new Error("Browser recording is only available in the browser.");
  }

  if (typeof MediaRecorder === "undefined") {
    throw new Error("This browser does not support video recording export.");
  }

  const width = opts?.width ?? 720;
  const height = opts?.height ?? 420;
  const fps = opts?.fps ?? 30;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not create a recording canvas.");
  }

  const mimeType = getSupportedMimeType();
  const stream = canvas.captureStream(fps);
  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: 4_000_000
  });

  const chunks: BlobPart[] = [];
  const stopped = new Promise<Blob>((resolve, reject) => {
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    recorder.onerror = () => reject(new Error("Browser recording failed."));
    recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
  });

  const engine = new SyncEngine(timeline, { baseX: width * 0.5 });
  let lastTs: number | null = null;

  recorder.start(250);
  engine.play();

  await new Promise<void>((resolve) => {
    const tick = (ts: number) => {
      if (lastTs == null) lastTs = ts;
      const dt = Math.min(0.05, Math.max(0, (ts - lastTs) / 1000));
      lastTs = ts;

      if (engine.isPlaying()) engine.tick(dt);
      const sample = engine.sample();
      renderSceneFrame(ctx, sample, width, height);
      opts?.onProgress?.(Math.min(1, sample.timeGlobal / timeline.total_duration));

      if (engine.isPlaying()) {
        requestAnimationFrame(tick);
        return;
      }

      opts?.onProgress?.(1);
      recorder.stop();
      resolve();
    };

    requestAnimationFrame(tick);
  });

  const blob = await stopped;
  for (const track of stream.getTracks()) track.stop();

  return { blob, extension: "webm", mimeType };
}
