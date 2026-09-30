import type { Modifiers, StickPose } from "@/animation/pose";
import { applyEmotion, basePose } from "@/animation/pose";

export function talkPose(t: number, mods: Modifiers): StickPose {
  const p = basePose();
  // Double-timed bob for energy
  const bob = Math.sin(t * 8.5) * (1.2 + 0.8 * mods.intensity);
  const sway = Math.sin(t * 2.5) * 0.06;

  p.lift = 4 + bob * 0.8;
  p.torsoLean = sway + 0.04 * mods.dir;
  p.headTilt = Math.sin(t * 12) * 0.04 + bob * 0.02;

  // Expressive hand gestures
  const handL = Math.sin(t * 4.2 * mods.speed) * (0.4 + 0.5 * mods.intensity);
  const handR = Math.cos(t * 3.8 * mods.speed) * (0.4 + 0.5 * mods.intensity);

  p.leftArm = { a: -0.8 - handL, b: -0.2 - Math.abs(handL) * 0.5 };
  p.rightArm = { a: 0.8 + handR, b: 0.2 + Math.abs(handR) * 0.5 };

  return applyEmotion(p, mods.emotion, mods.intensity);
}

