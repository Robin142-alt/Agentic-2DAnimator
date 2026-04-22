import type { Modifiers, StickPose } from "@/animation/pose";
import { applyEmotion, basePose } from "@/animation/pose";

export function jumpPose(t: number, duration: number, mods: Modifiers): StickPose {
  const p = basePose();
  const u = duration <= 0 ? 1 : Math.max(0, Math.min(1, t / duration));

  // Ease out then in
  const jump = Math.sin(Math.PI * u);
  const crouch = Math.sin(Math.PI * Math.max(0, Math.min(1, u * 1.4))) * (1 - u);

  p.lift = 8 + jump * (65 + 40 * mods.intensity) - crouch * 18;
  p.torsoLean = 0.02 * mods.dir - crouch * 0.08;
  p.headTilt = -0.04 + jump * 0.08;

  // Arms up during jump
  p.leftArm = { a: -1.15, b: -0.25 };
  p.rightArm = { a: 1.15, b: 0.25 };

  // Legs tuck slightly
  p.leftLeg = { a: 0.15, b: -0.2 - 0.4 * jump };
  p.rightLeg = { a: 0.15, b: -0.2 - 0.4 * jump };

  return applyEmotion(p, mods.emotion, mods.intensity);
}

