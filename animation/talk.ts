import type { Modifiers, StickPose } from "@/animation/pose";
import { applyEmotion, basePose } from "@/animation/pose";

export function talkPose(t: number, mods: Modifiers): StickPose {
  const p = basePose();
  const bob = Math.sin(t * 8.0) * (0.7 + 0.6 * mods.intensity);
  const hand = Math.sin(t * 5.0 * mods.speed) * (0.25 + 0.35 * mods.intensity);

  p.lift = 3 + bob * 0.6;
  p.torsoLean = Math.sin(t * 1.5) * 0.04 + 0.02 * mods.dir;
  p.headTilt = bob * 0.03;

  // Subtle hand talk
  p.leftArm = { a: -0.75 - hand * 0.4, b: -0.1 - hand * 0.2 };
  p.rightArm = { a: 0.75 + hand * 0.4, b: 0.1 + hand * 0.2 };

  return applyEmotion(p, mods.emotion, mods.intensity);
}

