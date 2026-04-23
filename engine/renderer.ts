import fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import os from "node:os";
import path from "node:path";
import { nanoid } from "nanoid";
import type { RenderConfig, Timeline } from "@/types/timeline";
import { SyncEngine } from "@/engine/syncEngine";
import { renderSceneFrame } from "@/animation/renderScene";
import { runFfmpeg } from "@/lib/ffmpeg";
import { createTrace, logStage, logError, validateFileOutput } from "@/lib/pipeline";

type RenderResult = {
  mp4Path: string;
  framesDir: string;
  cleanup: () => Promise<void>;
};

function clamp(n: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, n));
}

type Semaphore = { max: number; inFlight: number; queue: Array<() => void> };

function getSemaphore(): Semaphore {
  const g = globalThis as any;
  if (!g.__ss_render_semaphore) {
    g.__ss_render_semaphore = { max: Number(process.env.RENDER_CONCURRENCY ?? 1) || 1, inFlight: 0, queue: [] };
  }
  return g.__ss_render_semaphore as Semaphore;
}

async function withSemaphore<T>(fn: () => Promise<T>): Promise<T> {
  const sem = getSemaphore();
  if (sem.inFlight >= sem.max) {
    await new Promise<void>((resolve) => sem.queue.push(resolve));
  }
  sem.inFlight++;
  try {
    return await fn();
  } finally {
    sem.inFlight--;
    const next = sem.queue.shift();
    if (next) next();
  }
}

export async function renderTimelineToMp4File(timeline: Timeline, cfg?: Partial<RenderConfig>): Promise<RenderResult> {
  return withSemaphore(async () => {
    const trace = createTrace("renderer");
    const config: RenderConfig = {
      width: clamp(cfg?.width ?? 720, 320, 1920),
      height: clamp(cfg?.height ?? 420, 240, 1080),
      fps: clamp(cfg?.fps ?? 30, 10, 60),
      background: cfg?.background ?? "night"
    };
    logStage(trace, "render", "video render started", {
      width: config.width,
      height: config.height,
      fps: config.fps,
      duration: timeline.total_duration,
      visuals: timeline.visuals?.length ?? 0
    });

    if (timeline.total_duration > 60 * 10 + 0.001) {
      throw new Error("Timeline exceeds 10 minutes. Reduce total_duration or render at a lower fps.");
    }

    const workRoot = path.join(os.tmpdir(), "stickstory-render");
    const jobDir = path.join(workRoot, nanoid());
    const framesDir = path.join(jobDir, "frames");
    const mp4Path = path.join(jobDir, "out.mp4");

    await fs.mkdir(framesDir, { recursive: true });

    const { createCanvas } = await import("@napi-rs/canvas");
    const canvas = createCanvas(config.width, config.height);
    const ctx = canvas.getContext("2d");
    const engine = new SyncEngine(timeline, { baseX: config.width * 0.5, seedKey: JSON.stringify(timeline) });

    const totalFrames = Math.ceil(timeline.total_duration * config.fps);
    logStage(trace, "render", "frame rendering starting", {
      totalFrames,
      framesDir
    });

    for (let i = 0; i < totalFrames; i++) {
      const t = i / config.fps;
      const sample = engine.sample(t);
      renderSceneFrame(ctx as any, sample, config.width, config.height, { background: config.background });

      const file = path.join(framesDir, `frame_${String(i + 1).padStart(6, "0")}.png`);
      const buf = canvas.toBuffer("image/png");
      await fs.writeFile(file, buf);
    }

    logStage(trace, "render", "frame rendering completed", {
      totalFrames,
      sampleFrame: path.join(framesDir, "frame_000001.png")
    });

    try {
      await runFfmpeg(
        [
          "-y",
          "-hide_banner",
          "-loglevel",
          "error",
          "-framerate",
          String(config.fps),
          "-i",
          path.join(framesDir, "frame_%06d.png"),
          "-c:v",
          "libx264",
          "-pix_fmt",
          "yuv420p",
          "-movflags",
          "+faststart",
          mp4Path
        ],
        { cwd: jobDir, traceId: trace.id }
      );
    } catch (error) {
      logError(trace, "ffmpeg", error, { mp4Path, framesDir });
      throw error;
    }

    const output = await validateFileOutput(mp4Path);
    logStage(trace, "render", "video export completed", {
      mp4Path,
      exists: output.exists,
      sizeBytes: output.sizeBytes
    });
    if (!output.exists || output.sizeBytes <= 0) {
      throw new Error(`Rendered MP4 file is missing or empty: ${mp4Path}`);
    }

    const cleanup = async () => {
      try {
        await fs.rm(jobDir, { recursive: true, force: true });
      } catch {
        // ignore
      }
    };

    return { mp4Path, framesDir, cleanup };
  });
}

export function createMp4ReadStream(mp4Path: string) {
  return createReadStream(mp4Path);
}
