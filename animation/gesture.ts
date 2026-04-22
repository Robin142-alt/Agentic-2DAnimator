import type { Modifiers, StickPose } from "@/animation/pose";
import { applyEmotion, basePose } from "@/animation/pose";

export function gesturePose(t: number, mods: Modifiers): StickPose {
  const p = basePose();
  const wave = Math.sin(t * 7.5 * mods.speed) * (0.6 + 0.4 * mods.intensity);
  const point = Math.sin(t * 2.2) * 0.15;

  p.lift = 3 + Math.sin(t * 2.1) * 1.2;
  p.torsoLean = 0.04 * mods.dir + point;
  p.headTilt = 0.05 + point;

  // Right arm gestures
  p.rightArm = { a: 1.15 + wave * 0.4, b: 0.35 + wave * 0.25 };
  // Left arm balances
  p.leftArm = { a: -0.65 - wave * 0.2, b: -0.15 };

  return applyEmotion(p, mods.emotion, mods.intensity);
}

