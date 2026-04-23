import { spawn } from "node:child_process";
import fs from "node:fs/promises";

const port = 3112;
const baseUrl = `http://localhost:${port}`;
const input = "A guy walks into a room and says hello";

function run(command, args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, { stdio: "inherit", shell: true });
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} failed with exit code ${code}`));
    });
  });
}

async function waitForHealth() {
  for (let i = 0; i < 120; i++) {
    try {
      const res = await fetch(`${baseUrl}/api/health`);
      if (res.ok) return;
    } catch {
      // keep waiting
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("Timed out waiting for local server health check");
}

async function main() {
  console.log("[minimal-test] building app");
  await run("npm.cmd", ["run", "build"]);

  console.log("[minimal-test] starting server");
  const server = spawn("npm.cmd", ["run", "start", "--", "-p", String(port)], {
    stdio: "inherit",
    shell: true
  });

  try {
    await waitForHealth();

    console.log("[minimal-test] POST /api/generate");
    const response = await fetch(`${baseUrl}/api/generate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: input, renderVideo: true })
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(`Generate failed with status ${response.status}: ${JSON.stringify(payload)}`);
    }

    if (!payload.expanded?.scenes?.length) {
      throw new Error("Expected at least one scene in expanded story");
    }
    if (!payload.timeline?.timeline?.length) {
      throw new Error("Expected at least one timeline item");
    }
    if (!payload.video?.path) {
      throw new Error("Expected generate response to include video.path");
    }

    const stat = await fs.stat(payload.video.path);
    if (!(stat.size > 0)) {
      throw new Error(`Rendered video file is empty: ${payload.video.path}`);
    }

    console.log("[minimal-test] success");
    console.log(
      JSON.stringify(
        {
          scenes: payload.expanded.scenes.length,
          timelineItems: payload.timeline.timeline.length,
          videoPath: payload.video.path,
          videoSizeBytes: stat.size
        },
        null,
        2
      )
    );
  } finally {
    server.kill("SIGTERM");
  }
}

main().catch((error) => {
  console.error("[minimal-test] failed", error);
  process.exitCode = 1;
});
