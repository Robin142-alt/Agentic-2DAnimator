import { z } from "zod";
import { generateFromText } from "@/lib/ai";
import { rateLimit } from "@/lib/rateLimit";

const BodySchema = z.object({
  text: z.string().min(1).max(50_000)
});

export async function handleGenerate(req: Request): Promise<Response> {
  try {
    const rl = rateLimit(req, "generate", { windowMs: 60_000, max: 20 });
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

    const { expanded, timeline } = await generateFromText(parsed.data.text);
    return Response.json({ expanded, timeline });
  } catch (error) {
    console.error("Generation failed", error);
    return Response.json({ error: "Generation failed" }, { status: 500 });
  }
}
