import { z } from "zod";
import { Readable } from "node:stream";
import type { RenderConfig, Timeline } from "@/types/timeline";
import { createMp4ReadStream, renderTimelineToMp4File } from "@/engine/renderer";
import { createTrace, logError, logStage, validateTimeline } from "@/lib/pipeline";
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
  const trace = createTrace("api-render");
  try {
    logStage(trace, "request", "render request received");
    const rl = rateLimit(req, "render", { windowMs: 60_000, max: 4 });
    if (!rl.ok) {
      logStage(trace, "request", "render request rate limited", { retryAfterSec: rl.retryAfterSec ?? 60 });
      return new Response(JSON.stringify({ error: "Rate limited" }), {
        status: 429,
        headers: { "content-type": "application/json", "retry-after": String(rl.retryAfterSec ?? 60) }
      });
    }

    const json = await req.json().catch(() => null);
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      logStage(trace, "request", "render request validation failed", { issues: parsed.error.issues });
      return Response.json({ error: "Invalid request", issues: parsed.error.issues }, { status: 400 });
    }

    const timelineValidation = validateTimeline(parsed.data.timeline);
    logStage(trace, "director", "render timeline validated", {
      valid: timelineValidation.ok,
      issues: timelineValidation.issues,
      items: parsed.data.timeline.timeline.length
    });
    if (!timelineValidation.ok) {
      return Response.json({ error: "Invalid timeline", issues: timelineValidation.issues }, { status: 400 });
    }

    const { mp4Path, cleanup } = await renderTimelineToMp4File(
      parsed.data.timeline,
      parsed.data.config as Partial<RenderConfig> | undefined
    );
    logStage(trace, "request", "render completed", { mp4Path });

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
    logError(trace, "request", error);
    const message = error instanceof Error ? error.message : "Render failed";
    return Response.json({ error: message, traceId: trace.id }, { status: 500 });
  }
}
