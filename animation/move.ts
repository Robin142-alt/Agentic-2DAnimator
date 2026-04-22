import type { Modifiers, StickPose } from "@/animation/pose";
import { applyEmotion, basePose } from "@/animation/pose";

export function movePose(t: number, mods: Modifiers): StickPose {
  const p = basePose();
  const cycle = t * 6.2 * mods.speed;
  const swing = Math.sin(cycle) * (0.6 + 0.5 * mods.intensity);
  const lift = Math.abs(Math.sin(cycle)) * (3 + 4 * mods.intensity);

  p.lift = 2 + lift * 0.25;
  p.torsoLean = 0.06 * mods.dir + Math.sin(cycle) * 0.02;
  p.headTilt = Math.sin(cycle * 0.5) * 0.03;

  // Arms counter-swing
  p.leftArm = { a: -0.7 - swing * 0.45, b: -0.1 - swing * 0.2 };
  p.rightArm = { a: 0.7 + swing * 0.45, b: 0.1 + swing * 0.2 };

  // Legs swing opposite
  p.leftLeg = { a: 0.2 + swing * 0.35, b: -0.45 - swing * 0.3 };
  p.rightLeg = { a: 0.2 - swing * 0.35, b: -0.45 + swing * 0.3 };

  return applyEmotion(p, mods.emotion, mods.intensity);
}

export function moveDeltaX(dt: number, mods: Modifiers): number {
  const base = 90; // px per second
  return base * dt * mods.speed * mods.dir * (0.7 + 0.6 * mods.intensity);
}

