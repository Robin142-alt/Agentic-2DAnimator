import { spawn } from "node:child_process";
import { logStage } from "@/lib/pipeline";

export async function runFfmpeg(args: string[], opts?: { cwd?: string; traceId?: string }): Promise<void> {
  const { default: ffmpegPath } = await import("ffmpeg-static");
  const bin = ffmpegPath;
  if (!bin) throw new Error("ffmpeg-static did not provide an ffmpeg binary path");
  if (opts?.traceId) {
    logStage({ id: opts.traceId, startedAt: new Date().toISOString() }, "ffmpeg", "ffmpeg command starting", {
      command: `${bin} ${args.join(" ")}`
    });
  }

  await new Promise<void>((resolve, reject) => {
    const proc = spawn(bin, args, {
      cwd: opts?.cwd,
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stderr = "";
    proc.stderr.on("data", (d) => (stderr += d.toString()));
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (opts?.traceId) {
        logStage({ id: opts.traceId, startedAt: new Date().toISOString() }, "ffmpeg", "ffmpeg command completed", {
          exitCode: code,
          stderr: stderr.slice(-4000)
        });
      }
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited with code ${code}: ${stderr.slice(-4000)}`));
    });
  });
}
