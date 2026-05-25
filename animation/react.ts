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
  // Overshoot timing
  const kick = easeOutBack(Math.min(1, u * 1.5));
  const settle = Math.pow(1 - u, 2);

  const recoil = (0.08 + 0.2 * mods.intensity) * kick;
  p.torsoLean = -recoil * mods.dir + settle * 0.05;
  p.headTilt = recoil * -1.2 + settle * 0.05;
  p.lift = 4 + Math.sin(Math.pow(u, 0.7) * Math.PI) * (15 + 20 * mods.intensity);

  // Hands up in shock
  const handsUp = kick * 1.2;
  p.leftArm = { a: -0.8 - handsUp, b: -0.2 - handsUp * 0.4 };
  p.rightArm = { a: 0.8 + handsUp, b: 0.2 + handsUp * 0.4 };

  // Feet brace wide
  const brace = kick * 0.4;
  p.leftLeg = { a: 0.1 - brace, b: -0.3 };
  p.rightLeg = { a: 0.3 + brace, b: -0.3 };

  return applyEmotion(p, mods.emotion, mods.intensity);
}

