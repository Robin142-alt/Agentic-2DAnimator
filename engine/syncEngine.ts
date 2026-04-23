import type { Asset, CameraPlan, Timeline, TimelineItem, VisualCue } from "@/types/timeline";
import type { StickPose } from "@/animation/pose";
import { parseStyle } from "@/engine/style";
import { clamp01, hashStringToSeed, mulberry32 } from "@/engine/rng";
import { idlePose } from "@/animation/idle";
import { moveDeltaX, movePose } from "@/animation/move";
import { jumpPose } from "@/animation/jump";
import { gesturePose } from "@/animation/gesture";
import { talkPose } from "@/animation/talk";
import { reactPose } from "@/animation/react";

type Segment = {
  item: TimelineItem;
  start: number;
  end: number;
  startX: number;
  endX: number;
};

export type Sample = {
  item: TimelineItem;
  timeGlobal: number;
  timeLocal: number;
  pose: StickPose;
  dialogue: string;
  assets: Asset[];
  sceneNote: string;
  visual: VisualCue | null;
  previousVisual: VisualCue | null;
  sceneProgress: number;
  transitionProgress: number;
  camera: CameraPlan;
};

export class SyncEngine {
  private readonly timeline: Timeline;
  private readonly segments: Segment[];
  private time = 0;
  private playing = false;
  private readonly baseX: number;
  private readonly seed: number;

  constructor(timeline: Timeline, opts?: { baseX?: number; seedKey?: string }) {
    this.timeline = timeline;
    this.baseX = opts?.baseX ?? 320;
    this.seed = hashStringToSeed(opts?.seedKey ?? JSON.stringify(timeline));
    this.segments = this.buildSegments();
  }

  play(): void {
    this.time = 0;
    this.playing = true;
  }

  pause(): void {
    this.playing = false;
  }

  resume(): void {
    if (this.time >= this.timeline.total_duration) this.time = 0;
    this.playing = true;
  }

  isPlaying(): boolean {
    return this.playing;
  }

  seek(seconds: number): void {
    this.time = Math.max(0, Math.min(this.timeline.total_duration, seconds));
  }

  tick(dtSeconds: number): void {
    if (!this.playing) return;
    this.time += dtSeconds;
    if (this.time >= this.timeline.total_duration) {
      this.time = this.timeline.total_duration;
      this.playing = false;
    }
  }

  getTime(): number {
    return this.time;
  }

  getDuration(): number {
    return this.timeline.total_duration;
  }

  sample(timeSeconds?: number): Sample {
    const t = timeSeconds ?? this.time;
    const seg = this.findSegment(t);
    const local = Math.max(0, Math.min(seg.end - seg.start, t - seg.start));
    const duration = Math.max(0.001, seg.end - seg.start);

    const style = parseStyle(seg.item.style);
    const intensity = clamp01(seg.item.intensity);

    const mods = {
      speed: style.speed,
      dir: style.dir,
      intensity,
      emotion: seg.item.emotion
    } as const;

    const rand = mulberry32(this.seed ^ (Math.floor(seg.start * 1000) >>> 0));
    const jitter = (rand() - 0.5) * 0.4 * intensity;
    const rootX = this.baseX + (seg.startX + (seg.endX - seg.startX) * (local / duration)) + jitter * 2;

    const pose = (() => {
      if (seg.item.action === "idle") return idlePose(local, mods);
      if (seg.item.action === "move") return movePose(local, mods);
      if (seg.item.action === "jump") return jumpPose(local, duration, mods);
      if (seg.item.action === "gesture") return gesturePose(local, mods);
      if (seg.item.action === "talk") return talkPose(local, mods);
      if (seg.item.action === "react") return reactPose(local, duration, mods);
      if (seg.item.action === "interact") return gesturePose(local, { ...mods, intensity: clamp01(intensity + 0.15) });
      return idlePose(local, mods);
    })();

    pose.rootX = rootX;
    const visualInfo = this.findVisual(t);
    const visual = visualInfo.current;
    const visualDuration = visual ? Math.max(0.001, visual.end - visual.start) : 1;
    const sceneProgress = visual ? clamp01((t - visual.start) / visualDuration) : 0;
    const transitionWindow = visual ? Math.min(1.2, Math.max(0.35, visualDuration * 0.18)) : 0;
    const transitionProgress =
      visual && visualInfo.previous && visual.camera.transition !== "cut"
        ? clamp01((t - visual.start) / transitionWindow)
        : 1;
    return {
      item: seg.item,
      timeGlobal: t,
      timeLocal: local,
      pose,
      dialogue: seg.item.dialogue,
      assets: visual?.assets ?? [],
      sceneNote: visual?.note ?? "",
      visual,
      previousVisual: visualInfo.previous,
      sceneProgress,
      transitionProgress,
      camera: visual?.camera ?? { shot: "medium", baseZoom: 1, panBias: 0, transition: "cut" }
    };
  }

  private buildSegments(): Segment[] {
    const out: Segment[] = [];
    let cursor = 0;
    let trackX = 0;
    for (const item of this.timeline.timeline) {
      const d = Math.max(0.1, item.duration);
      const start = cursor;
      const end = cursor + d;

      const style = parseStyle(item.style);
      const intensity = clamp01(item.intensity);
      const mods = { speed: style.speed, dir: style.dir, intensity, emotion: item.emotion } as const;

      const startX = trackX;
      let endX = trackX;
      if (item.action === "move") {
        endX = trackX + moveDeltaX(d, mods);
        trackX = endX;
      }

      out.push({ item, start, end, startX, endX });
      cursor = end;
    }
    return out;
  }

  private findSegment(t: number): Segment {
    const clamped = Math.max(0, Math.min(this.timeline.total_duration, t));
    // linear scan is fine at ~hundreds of items; keep deterministic and simple
    for (const s of this.segments) {
      if (clamped >= s.start && clamped < s.end) return s;
    }
    return this.segments[this.segments.length - 1] ?? {
      item: { action: "idle", style: "speed:normal", emotion: "neutral", intensity: 0.3, duration: 1, dialogue: "" },
      start: 0,
      end: 1,
      startX: 0,
      endX: 0
    };
  }

  private findVisual(t: number): { current: VisualCue | null; previous: VisualCue | null; next: VisualCue | null } {
    const visuals = this.timeline.visuals ?? [];
    if (!visuals.length) return { current: null, previous: null, next: null };
    if (t < visuals[0]!.start) return { current: null, previous: null, next: visuals[0]! };
    for (let index = 0; index < visuals.length; index++) {
      const visual = visuals[index]!;
      if (t >= visual.start && t < visual.end) {
        return {
          current: visual,
          previous: visuals[index - 1] ?? null,
          next: visuals[index + 1] ?? null
        };
      }
    }
    const last = visuals[visuals.length - 1]!;
    if (t <= last.end) {
      return { current: last, previous: visuals[visuals.length - 2] ?? null, next: null };
    }
    return { current: null, previous: last, next: null };
  }
}
