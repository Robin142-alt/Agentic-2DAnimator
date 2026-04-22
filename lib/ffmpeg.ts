import { spawn } from "node:child_process";
import ffmpegPath from "ffmpeg-static";

export async function runFfmpeg(args: string[], opts?: { cwd?: string }): Promise<void> {
  const bin = ffmpegPath;
  if (!bin) throw new Error("ffmpeg-static did not provide an ffmpeg binary path");

  await new Promise<void>((resolve, reject) => {
    const proc = spawn(bin, args, {
      cwd: opts?.cwd,
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stderr = "";
    proc.stderr.on("data", (d) => (stderr += d.toString()));
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited with code ${code}: ${stderr.slice(-4000)}`));
    });
  });
}

