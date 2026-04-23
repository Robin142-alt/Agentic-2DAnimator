import { z } from "zod";
import { generateFromText } from "@/lib/ai";
import { createTrace, logError, logStage } from "@/lib/pipeline";
import { rateLimit } from "@/lib/rateLimit";

const BodySchema = z.object({
  text: z.string().min(1).max(50_000),
  renderVideo: z.boolean().optional().default(true)
});

export async function handleGenerate(req: Request): Promise<Response> {
  const trace = createTrace("api-generate");
  try {
    logStage(trace, "request", "generate request received");
    const rl = rateLimit(req, "generate", { windowMs: 60_000, max: 20 });
    if (!rl.ok) {
      logStage(trace, "request", "generate request rate limited", { retryAfterSec: rl.retryAfterSec ?? 60 });
      return new Response(JSON.stringify({ error: "Rate limited" }), {
        status: 429,
        headers: { "content-type": "application/json", "retry-after": String(rl.retryAfterSec ?? 60) }
      });
    }

    const json = await req.json().catch(() => null);
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      logStage(trace, "request", "generate request validation failed", { issues: parsed.error.issues });
      return Response.json({ error: "Invalid request", issues: parsed.error.issues }, { status: 400 });
    }

    const result = await generateFromText(parsed.data.text, {
      trace,
      renderVideo: parsed.data.renderVideo
    });
    logStage(trace, "request", "generate request completed", {
      renderVideo: parsed.data.renderVideo,
      hasVideo: Boolean(result.video)
    });
    return Response.json(result);
  } catch (error) {
    logError(trace, "request", error);
    return Response.json({ error: "Generation failed", traceId: trace.id }, { status: 500 });
  }
}
