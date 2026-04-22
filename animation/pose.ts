import type { Emotion } from "@/types/timeline";

export type Limb2 = { a: number; b: number }; // shoulder/hip (a), elbow/knee (b) angles in radians

export type StickPose = {
  rootX: number; // px
  lift: number; // px (positive up)
  torsoLean: number; // radians
  headTilt: number; // radians
  leftArm: Limb2;
  rightArm: Limb2;
  leftLeg: Limb2;
  rightLeg: Limb2;
};

export type Modifiers = {
  speed: number;
  dir: -1 | 1;
  intensity: number; // 0..1
  emotion: Emotion;
};

export function basePose(): StickPose {
  return {
    rootX: 0,
    lift: 0,
    torsoLean: 0,
    headTilt: 0,
    leftArm: { a: -0.6, b: -0.25 },
    rightArm: { a: 0.6, b: 0.25 },
    leftLeg: { a: -0.1, b: 0.35 },
    rightLeg: { a: 0.1, b: -0.35 }
  };
}

export function applyEmotion(pose: StickPose, emotion: Emotion, intensity01: number): StickPose {
  const i = Math.max(0, Math.min(1, intensity01));
  const out = { ...pose };
  if (emotion === "happy") {
    out.headTilt += 0.12 * i;
    out.torsoLean += 0.06 * i;
    out.leftArm = { a: out.leftArm.a - 0.18 * i, b: out.leftArm.b - 0.06 * i };
    out.rightArm = { a: out.rightArm.a + 0.18 * i, b: out.rightArm.b + 0.06 * i };
  } else if (emotion === "sad") {
    out.headTilt += -0.12 * i;
    out.torsoLean += -0.08 * i;
    out.leftArm = { a: out.leftArm.a + 0.18 * i, b: out.leftArm.b + 0.1 * i };
    out.rightArm = { a: out.rightArm.a - 0.18 * i, b: out.rightArm.b - 0.1 * i };
  } else if (emotion === "angry") {
    out.headTilt += -0.06 * i;
    out.torsoLean += 0.1 * i;
    out.leftArm = { a: out.leftArm.a - 0.25 * i, b: out.leftArm.b + 0.12 * i };
    out.rightArm = { a: out.rightArm.a + 0.25 * i, b: out.rightArm.b - 0.12 * i };
  } else if (emotion === "nervous") {
    out.headTilt += -0.04 * i;
    out.torsoLean += -0.02 * i;
    out.leftArm = { a: out.leftArm.a + 0.08 * i, b: out.leftArm.b + 0.18 * i };
    out.rightArm = { a: out.rightArm.a - 0.08 * i, b: out.rightArm.b - 0.18 * i };
  }
  return out;
}

