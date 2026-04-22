import { handleGenerate } from "@/api/generate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 900;

export async function POST(req: Request) {
  return handleGenerate(req);
}

