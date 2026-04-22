import { handleRenderMp4 } from "@/api/render";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 800;

export async function POST(req: Request) {
  return handleRenderMp4(req);
}
