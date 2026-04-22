import { handleStory } from "@/api/story";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(req: Request) {
  return handleStory(req);
}

export async function POST(req: Request) {
  return handleStory(req);
}

export async function PATCH(req: Request) {
  return handleStory(req);
}
