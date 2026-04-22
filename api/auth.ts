import { z } from "zod";
import bcrypt from "bcryptjs";
import { sql } from "@/lib/db";
import { clearAuthCookie, getUserFromRequest, makeAuthCookie, signToken } from "@/lib/auth";
import type { User } from "@/types/user";
import { rateLimit } from "@/lib/rateLimit";

const PostSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("logout") }),
  z.object({
    action: z.enum(["register", "login"]),
    email: z.string().email().max(320).transform((s) => s.toLowerCase()),
    password: z.string().min(8).max(200)
  })
]);

export async function handleAuth(req: Request): Promise<Response> {
  if (req.method === "GET") {
    const user = await getUserFromRequest(req);
    return Response.json({ user });
  }

  const rl = rateLimit(req, "auth", { windowMs: 60_000, max: 10 });
  if (!rl.ok) {
    return new Response(JSON.stringify({ error: "Rate limited" }), {
      status: 429,
      headers: { "content-type": "application/json", "retry-after": String(rl.retryAfterSec ?? 60) }
    });
  }

  const json = await req.json().catch(() => null);
  const parsed = PostSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: "Invalid request", issues: parsed.error.issues }, { status: 400 });
  }

  const { action } = parsed.data;

  if (action === "logout") {
    return new Response(JSON.stringify({ user: null }), {
      status: 200,
      headers: { "content-type": "application/json", "set-cookie": clearAuthCookie() }
    });
  }

  if (action === "register") {
    const { email, password } = parsed.data;
    const hash = await bcrypt.hash(password, 10);
    try {
      const created = await sql<User>(
        "insert into users (email, password_hash) values ($1, $2) returning id, email, created_at::text as created_at",
        [email, hash]
      );
      const user = created.rows[0]!;
      const token = signToken({ userId: user.id, email: user.email });
      return new Response(JSON.stringify({ user }), {
        status: 200,
        headers: { "content-type": "application/json", "set-cookie": makeAuthCookie(token) }
      });
    } catch (e: any) {
      const msg = typeof e?.message === "string" ? e.message : "Registration failed";
      return Response.json({ error: "Registration failed", detail: msg }, { status: 400 });
    }
  }

  // login
  const { email, password } = parsed.data;
  const res = await sql<{ id: string; email: string; password_hash: string; created_at: string }>(
    "select id, email, password_hash, created_at::text as created_at from users where email = $1",
    [email]
  );
  const row = res.rows[0];
  if (!row) return Response.json({ error: "Invalid email or password" }, { status: 401 });

  const ok = await bcrypt.compare(password, row.password_hash);
  if (!ok) return Response.json({ error: "Invalid email or password" }, { status: 401 });

  const user: User = { id: row.id, email: row.email, created_at: row.created_at };
  const token = signToken({ userId: user.id, email: user.email });
  return new Response(JSON.stringify({ user }), {
    status: 200,
    headers: { "content-type": "application/json", "set-cookie": makeAuthCookie(token) }
  });
}
