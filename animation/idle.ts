import type { Modifiers, StickPose } from "@/animation/pose";
import { applyEmotion, basePose } from "@/animation/pose";

export function idlePose(t: number, mods: Modifiers): StickPose {
  const p = basePose();
  const breath = Math.sin(t * 2.2) * 0.5 * (0.5 + mods.intensity);
  p.lift = 2 + breath;
  p.torsoLean = Math.sin(t * 1.2) * 0.03;
  p.headTilt = Math.sin(t * 1.1) * 0.04;
  return applyEmotion(p, mods.emotion, mods.intensity);
}

