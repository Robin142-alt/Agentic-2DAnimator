import { createCanvas } from "@napi-rs/canvas";
import fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import os from "node:os";
import path from "node:path";
import { nanoid } from "nanoid";
import type { RenderConfig, Timeline } from "@/types/timeline";
import { SyncEngine } from "@/engine/syncEngine";
import { drawStickman } from "@/animation/draw";
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

function background(ctx: any, width: number, height: number, kind: RenderConfig["background"]) {
  if (kind === "paper") {
    ctx.fillStyle = "#0b0b10";
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    for (let y = 0; y < height; y += 24) {
      ctx.fillRect(0, y, width, 1);
    }
    return;
  }
  if (kind === "night") {
    const g = ctx.createLinearGradient(0, 0, 0, height);
    g.addColorStop(0, "#050510");
    g.addColorStop(1, "#000000");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);
    return;
  }
  ctx.fillStyle = "#050507";
  ctx.fillRect(0, 0, width, height);
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
      duration: timeline.total_duration
    });

    if (timeline.total_duration > 60 * 10 + 0.001) {
      throw new Error("Timeline exceeds 10 minutes. Reduce total_duration or render at a lower fps.");
    }

    const workRoot = path.join(os.tmpdir(), "stickstory-render");
    const jobDir = path.join(workRoot, nanoid());
    const framesDir = path.join(jobDir, "frames");
    const mp4Path = path.join(jobDir, "out.mp4");

    await fs.mkdir(framesDir, { recursive: true });

    const canvas = createCanvas(config.width, config.height);
    const ctx = canvas.getContext("2d");
    const engine = new SyncEngine(timeline, { baseX: config.width * 0.5, seedKey: JSON.stringify(timeline) });

    const totalFrames = Math.ceil(timeline.total_duration * config.fps);
    const groundY = config.height - 52;
    logStage(trace, "render", "frame rendering starting", {
      totalFrames,
      framesDir
    });

    for (let i = 0; i < totalFrames; i++) {
      const t = i / config.fps;
      const sample = engine.sample(t);

      background(ctx, config.width, config.height, config.background);
      ctx.strokeStyle = "rgba(255,255,255,0.10)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, groundY);
      ctx.lineTo(config.width, groundY);
      ctx.stroke();

      drawStickman(ctx as any, sample.pose, { scale: 1.25, stroke: "#e5e7eb", lineWidth: 4, groundY });

      const text = sample.dialogue?.trim();
      if (text) {
        ctx.save();
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(18, config.height - 110, config.width - 36, 78);
        ctx.fillStyle = "#f4f4f5";
        ctx.font = "14px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto";
        ctx.textBaseline = "top";
        const line = text.length > 130 ? text.slice(0, 127) + "…" : text;
        ctx.fillText(line, 30, config.height - 96);
        ctx.restore();
      }

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
