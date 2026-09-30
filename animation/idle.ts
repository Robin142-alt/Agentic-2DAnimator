import type { Modifiers, StickPose } from "@/animation/pose";
import { applyEmotion, basePose } from "@/animation/pose";

export function idlePose(t: number, mods: Modifiers): StickPose {
  const p = basePose();
  // Multi-frequency breathing and swaying for organic feel
  const breath = Math.sin(t * 1.8) * 0.8 * (0.4 + mods.intensity * 0.6);
  const sway = Math.sin(t * 0.8) * 0.04;
  const headSway = Math.cos(t * 0.7) * 0.05;

  p.lift = 2 + breath;
  p.torsoLean = sway + Math.sin(t * 2.1) * 0.01;
  p.headTilt = headSway + Math.sin(t * 1.5) * 0.02;

  // Secondary arm micro-movements
  const armSway = Math.sin(t * 0.6) * 0.02;
  p.leftArm.a += armSway;
  p.rightArm.a -= armSway;

  return applyEmotion(p, mods.emotion, mods.intensity);
}

