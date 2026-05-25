import type { Modifiers, StickPose } from "@/animation/pose";
import { applyEmotion, basePose } from "@/animation/pose";

export function movePose(t: number, mods: Modifiers): StickPose {
  const p = basePose();
  const speedMult = 6.2 * mods.speed;
  const cycle = t * speedMult;

  // Weighted bounce
  const bounce = Math.abs(Math.sin(cycle));
  const lift = bounce * (5 + 6 * mods.intensity);

  // Smooth swing with secondary offset
  const swing = Math.sin(cycle) * (0.65 + 0.45 * mods.intensity);
  const headBob = Math.cos(cycle * 2) * 0.04;

  p.lift = 2 + lift;
  p.torsoLean = 0.08 * mods.dir + Math.sin(cycle) * 0.04;
  p.headTilt = headBob + 0.05 * mods.dir;

  // Arms counter-swing with more weight
  p.leftArm = {
    a: -0.75 - swing * 0.6,
    b: -0.2 - Math.max(0, swing) * 0.4
  };
  p.rightArm = {
    a: 0.75 + swing * 0.6,
    b: 0.2 + Math.min(0, swing) * 0.4
  };

  // Legs swing with custom "push" feel
  p.leftLeg = {
    a: 0.2 + swing * 0.45,
    b: -0.5 - (swing < 0 ? -swing * 0.8 : 0)
  };
  p.rightLeg = {
    a: 0.2 - swing * 0.45,
    b: -0.5 - (swing > 0 ? swing * 0.8 : 0)
  };

  return applyEmotion(p, mods.emotion, mods.intensity);
}

export function moveDeltaX(dt: number, mods: Modifiers): number {
  const base = 90; // px per second
  return base * dt * mods.speed * mods.dir * (0.7 + 0.6 * mods.intensity);
}

