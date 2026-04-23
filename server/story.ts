import { z } from "zod";
import { nanoid } from "nanoid";
import type { ExpandedStory } from "@/types/story";
import type { Timeline } from "@/types/timeline";
import { requireUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { rateLimit } from "@/lib/rateLimit";

const CreateSchema = z.object({
  title: z.string().min(1).max(140),
  originalText: z.string().min(1).max(50_000),
  expanded: z.custom<ExpandedStory>(),
  timeline: z.custom<Timeline>(),
  isPublic: z.boolean().optional().default(false)
});

const PatchSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(140).optional(),
  isPublic: z.boolean().optional()
});

function makeSlug(): string {
  return nanoid(10).toLowerCase();
}

export async function handleStory(req: Request): Promise<Response> {
  const url = new URL(req.url);

  if (req.method === "GET") {
    const slug = url.searchParams.get("slug");
    const isPublic = url.searchParams.get("public") === "1";
    if (slug) {
      const rows = await sql<any>(
        "select id, user_id as \"userId\", slug, title, original_text as \"originalText\", expanded_story as expanded, timeline, is_public as \"isPublic\", created_at::text as created_at from stories where slug = $1",
        [slug]
      );
      const story = rows.rows[0];
      if (!story) return Response.json({ error: "Not found" }, { status: 404 });
      if (!story.isPublic) {
        const user = await requireUser(req).catch(() => null);
        if (!user || story.userId !== user.id) return Response.json({ error: "Not found" }, { status: 404 });
      }
      return Response.json({ story });
    }

    if (isPublic) {
      const rows = await sql<any>(
        "select slug, title, is_public as \"isPublic\", created_at::text as created_at from stories where is_public = true order by created_at desc limit 50"
      );
      return Response.json({ stories: rows.rows });
    }

    const user = await requireUser(req);
    const rows = await sql<any>(
      "select slug, title, is_public as \"isPublic\", created_at::text as created_at from stories where user_id = $1 order by created_at desc limit 50",
      [user.id]
    );
    return Response.json({ stories: rows.rows });
  }

  if (req.method === "POST") {
    const rl = rateLimit(req, "story_create", { windowMs: 60_000, max: 30 });
    if (!rl.ok) {
      return new Response(JSON.stringify({ error: "Rate limited" }), {
        status: 429,
        headers: { "content-type": "application/json", "retry-after": String(rl.retryAfterSec ?? 60) }
      });
    }
    const user = await requireUser(req);
    const json = await req.json().catch(() => null);
    const parsed = CreateSchema.safeParse(json);
    if (!parsed.success) return Response.json({ error: "Invalid request", issues: parsed.error.issues }, { status: 400 });

    let slug = makeSlug();
    for (let i = 0; i < 4; i++) {
      const exists = await sql<{ slug: string }>("select slug from stories where slug = $1", [slug]);
      if (!exists.rows[0]) break;
      slug = makeSlug();
    }

    const r = await sql<any>(
      "insert into stories (user_id, slug, title, original_text, expanded_story, timeline, is_public) values ($1,$2,$3,$4,$5,$6,$7) returning slug",
      [user.id, slug, parsed.data.title, parsed.data.originalText, parsed.data.expanded, parsed.data.timeline, parsed.data.isPublic]
    );
    return Response.json({ slug: r.rows[0]!.slug });
  }

  if (req.method === "PATCH") {
    const rl = rateLimit(req, "story_patch", { windowMs: 60_000, max: 60 });
    if (!rl.ok) {
      return new Response(JSON.stringify({ error: "Rate limited" }), {
        status: 429,
        headers: { "content-type": "application/json", "retry-after": String(rl.retryAfterSec ?? 60) }
      });
    }
    const user = await requireUser(req);
    const json = await req.json().catch(() => null);
    const parsed = PatchSchema.safeParse(json);
    if (!parsed.success) return Response.json({ error: "Invalid request", issues: parsed.error.issues }, { status: 400 });
    const { id, title, isPublic } = parsed.data;

    const owned = await sql<{ id: string }>("select id from stories where id = $1 and user_id = $2", [id, user.id]);
    if (!owned.rows[0]) return Response.json({ error: "Not found" }, { status: 404 });

    await sql(
      "update stories set title = coalesce($1, title), is_public = coalesce($2, is_public) where id = $3",
      [title ?? null, typeof isPublic === "boolean" ? isPublic : null, id]
    );
    return Response.json({ ok: true });
  }

  return Response.json({ error: "Method not allowed" }, { status: 405 });
}
