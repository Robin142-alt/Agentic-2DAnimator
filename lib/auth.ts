import jwt from "jsonwebtoken";
import type { User } from "@/types/user";
import { sql } from "@/lib/db";
import { env } from "@/lib/env";

const COOKIE_NAME = "ss_token";

export function signToken(payload: { userId: string; email: string }): string {
  const secret = env().JWT_SECRET;
  return jwt.sign(payload, secret, { expiresIn: "7d" });
}

export function verifyToken(token: string): { userId: string; email: string } {
  const secret = env().JWT_SECRET;
  const out = jwt.verify(token, secret);
  if (typeof out !== "object" || out == null) throw new Error("Invalid token payload");
  const userId = (out as any).userId;
  const email = (out as any).email;
  if (typeof userId !== "string" || typeof email !== "string") throw new Error("Invalid token payload");
  return { userId, email };
}

export function parseCookies(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) return {};
  const out: Record<string, string> = {};
  const parts = cookieHeader.split(";").map((p) => p.trim()).filter(Boolean);
  for (const p of parts) {
    const idx = p.indexOf("=");
    if (idx <= 0) continue;
    const k = p.slice(0, idx).trim();
    const v = p.slice(idx + 1).trim();
    out[k] = decodeURIComponent(v);
  }
  return out;
}

export function makeAuthCookie(token: string): string {
  const secure = process.env.NODE_ENV === "production";
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${60 * 60 * 24 * 7}`
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export function clearAuthCookie(): string {
  const secure = process.env.NODE_ENV === "production";
  const parts = [`${COOKIE_NAME}=`, "Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=0"];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export async function getUserFromRequest(req: Request): Promise<User | null> {
  const cookies = parseCookies(req.headers.get("cookie"));
  const token = cookies[COOKIE_NAME];
  if (!token) return null;
  try {
    const { userId } = verifyToken(token);
    const res = await sql<User>(
      "select id, email, created_at::text as created_at from users where id = $1",
      [userId]
    );
    return res.rows[0] ?? null;
  } catch {
    return null;
  }
}

export async function requireUser(req: Request): Promise<User> {
  const user = await getUserFromRequest(req);
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}
