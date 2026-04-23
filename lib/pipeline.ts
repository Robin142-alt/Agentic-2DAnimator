import fs from "node:fs/promises";
import type { ExpandedStory } from "@/types/story";
import type { BaseAction, Timeline } from "@/types/timeline";

const VALID_ACTIONS = new Set<BaseAction>(["idle", "move", "jump", "interact", "gesture", "talk", "react"]);

export type PipelineTrace = {
  id: string;
  startedAt: string;
};

export function createTrace(prefix: string): PipelineTrace {
  const random = Math.random().toString(36).slice(2, 10);
  return {
    id: `${prefix}-${Date.now().toString(36)}-${random}`,
    startedAt: new Date().toISOString()
  };
}

export function logStage(trace: PipelineTrace, stage: string, message: string, meta?: Record<string, unknown>): void {
  const payload = {
    traceId: trace.id,
    startedAt: trace.startedAt,
    stage,
    message,
    ...meta
  };
  console.log(`[pipeline] ${JSON.stringify(payload)}`);
}

export function logError(trace: PipelineTrace, stage: string, error: unknown, meta?: Record<string, unknown>): void {
  const err =
    error instanceof Error
      ? { name: error.name, message: error.message, stack: error.stack }
      : { message: String(error) };
  console.error(`[pipeline] ${JSON.stringify({ traceId: trace.id, stage, level: "error", ...meta, error: err })}`);
}

export function validateExpandedStory(expanded: ExpandedStory): { ok: boolean; issues: string[] } {
  const issues: string[] = [];
  if (!expanded.title.trim()) issues.push("expanded.title is empty");
  if (!expanded.logline.trim()) issues.push("expanded.logline is empty");
  if (!expanded.scenes.length) issues.push("expanded.scenes is empty");

  for (const scene of expanded.scenes) {
    if (!scene.title.trim()) issues.push(`scene ${scene.index} title is empty`);
    if (!scene.setting.trim()) issues.push(`scene ${scene.index} setting is empty`);
    if (!scene.beats.length) issues.push(`scene ${scene.index} has no beats`);
  }

  return { ok: issues.length === 0, issues };
}

export function validateTimeline(timeline: Timeline): { ok: boolean; issues: string[] } {
  const issues: string[] = [];
  if (!timeline.timeline.length) issues.push("timeline.timeline is empty");
  if (!(timeline.total_duration > 0)) issues.push("timeline.total_duration must be > 0");

  timeline.timeline.forEach((item, index) => {
    if (!VALID_ACTIONS.has(item.action)) issues.push(`timeline[${index}] invalid action: ${item.action}`);
    if (!(item.duration > 0)) issues.push(`timeline[${index}] duration must be > 0`);
    if (item.intensity < 0 || item.intensity > 1) issues.push(`timeline[${index}] intensity must be between 0 and 1`);
  });

  return { ok: issues.length === 0, issues };
}

export async function validateFileOutput(filePath: string): Promise<{ exists: boolean; sizeBytes: number }> {
  try {
    const stat = await fs.stat(filePath);
    return { exists: true, sizeBytes: stat.size };
  } catch {
    return { exists: false, sizeBytes: 0 };
  }
}

