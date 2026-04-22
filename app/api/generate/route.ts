import { handleGenerate } from "@/api/generate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: Request) {
  return handleGenerate(req);
}
