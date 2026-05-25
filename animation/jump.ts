import type { Modifiers, StickPose } from "@/animation/pose";
import { applyEmotion, basePose } from "@/animation/pose";

export function jumpPose(t: number, duration: number, mods: Modifiers): StickPose {
  const p = basePose();
  const u = duration <= 0 ? 1 : Math.max(0, Math.min(1, t / duration));

  // Snappier jump curve
  const jump = Math.pow(Math.sin(Math.PI * u), 0.85);
  // Stronger anticipation
  const crouch = Math.pow(Math.sin(Math.PI * Math.max(0, Math.min(1, u * 1.8))), 2) * (1 - u);

  p.lift = 5 + jump * (80 + 50 * mods.intensity) - crouch * 25;
  p.torsoLean = 0.05 * mods.dir - crouch * 0.2 + jump * 0.1;
  p.headTilt = -0.08 + jump * 0.15;

  // Arms throw up for momentum
  const armUp = Math.pow(u, 0.5) * 1.5;
  p.leftArm = { a: -0.6 - armUp, b: -0.2 - armUp * 0.3 };
  p.rightArm = { a: 0.6 + armUp, b: 0.2 + armUp * 0.3 };

  // Legs tuck strongly in mid-air
  const tuck = Math.sin(Math.PI * u);
  p.leftLeg = { a: 0.2 + tuck * 0.6, b: -0.3 - tuck * 0.8 };
  p.rightLeg = { a: 0.2 + tuck * 0.6, b: -0.3 - tuck * 0.8 };

  return applyEmotion(p, mods.emotion, mods.intensity);
}

