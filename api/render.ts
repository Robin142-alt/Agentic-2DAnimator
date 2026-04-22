import { z } from "zod";
import { Readable } from "node:stream";
import type { RenderConfig, Timeline } from "@/types/timeline";
import { createMp4ReadStream, renderTimelineToMp4File } from "@/engine/renderer";
import { rateLimit } from "@/lib/rateLimit";

const BodySchema = z.object({
  timeline: z.custom<Timeline>(),
  config: z
    .object({
      width: z.number().int().min(320).max(1920).optional(),
      height: z.number().int().min(240).max(1080).optional(),
      fps: z.number().int().min(10).max(60).optional(),
      background: z.enum(["night", "paper", "plain"]).optional()
    })
    .optional()
});

export async function handleRenderMp4(req: Request): Promise<Response> {
  try {
    const rl = rateLimit(req, "render", { windowMs: 60_000, max: 4 });
    if (!rl.ok) {
      return new Response(JSON.stringify({ error: "Rate limited" }), {
        status: 429,
        headers: { "content-type": "application/json", "retry-after": String(rl.retryAfterSec ?? 60) }
      });
    }

    const json = await req.json().catch(() => null);
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return Response.json({ error: "Invalid request", issues: parsed.error.issues }, { status: 400 });
    }

    const { mp4Path, cleanup } = await renderTimelineToMp4File(
      parsed.data.timeline,
      parsed.data.config as Partial<RenderConfig> | undefined
    );

    const nodeStream = createMp4ReadStream(mp4Path);
    nodeStream.on("close", () => void cleanup());
    nodeStream.on("error", () => void cleanup());

    const webStream = Readable.toWeb(nodeStream) as ReadableStream;
    return new Response(webStream, {
      headers: {
        "content-type": "video/mp4",
        "content-disposition": "attachment; filename=stickstory.mp4",
        "cache-control": "no-store"
      }
    });
  } catch (error) {
    console.error("Video render failed", error);
    const message = error instanceof Error ? error.message : "Render failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
