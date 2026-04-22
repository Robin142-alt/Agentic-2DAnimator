import type { Modifiers, StickPose } from "@/animation/pose";
import { applyEmotion, basePose } from "@/animation/pose";

function easeOutBack(u: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2);
}

export function reactPose(t: number, duration: number, mods: Modifiers): StickPose {
  const p = basePose();
  const u = duration <= 0 ? 1 : Math.max(0, Math.min(1, t / duration));
  const kick = easeOutBack(Math.min(1, u * 1.1));

  const recoil = (0.05 + 0.12 * mods.intensity) * kick;
  p.torsoLean = -recoil * mods.dir;
  p.headTilt = recoil * -0.8;
  p.lift = 4 + Math.sin(u * Math.PI) * (10 + 12 * mods.intensity);

  // Hands up
  p.leftArm = { a: -1.0, b: -0.2 };
  p.rightArm = { a: 1.0, b: 0.2 };

  // Feet brace
  p.leftLeg = { a: 0.15, b: -0.35 };
  p.rightLeg = { a: 0.15, b: -0.35 };

  return applyEmotion(p, mods.emotion, mods.intensity);
}

