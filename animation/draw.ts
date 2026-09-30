import type { StickPose } from "@/animation/pose";
import type { Emotion } from "@/types/timeline";

export type DrawOptions = {
  scale: number;
  stroke: string;
  lineWidth: number;
  groundY: number;
  mouthOpen?: number;
  emotion?: Emotion;
  opacity?: number;
  seed?: number;
  time?: number;
};

function rotVec(len: number, angle: number): { x: number; y: number } {
  return { x: Math.sin(angle) * len, y: Math.cos(angle) * len };
}

export function getWobble(seed: number, time: number, amount = 1.5): { x: number; y: number } {
  const s = seed * 1000 + time * 12;
  return {
    x: Math.sin(s * 0.7) * amount,
    y: Math.cos(s * 0.8) * amount
  };
}

function drawMouth(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  mouthOpen: number,
  emotion: Emotion,
  seed: number,
  time: number
) {
  const open = Math.max(0, Math.min(1, mouthOpen));
  const mouthY = y + radius * 0.35;
  const width = radius * 0.6;

  const w = (ox: number, oy: number) => {
    const off = getWobble(seed + ox + oy, time, 0.8);
    return { x: ox + off.x, y: oy + off.y };
  };

  ctx.beginPath();
  if (open > 0.12) {
    const mouthH = radius * (0.14 + open * 0.24);
    const p = w(x, mouthY);
    ctx.ellipse(p.x, p.y, width * 0.42, mouthH, 0, 0, Math.PI * 2);
  } else if (emotion === "happy") {
    const p = w(x, mouthY - radius * 0.05);
    ctx.arc(p.x, p.y, width * 0.6, 0.12 * Math.PI, 0.88 * Math.PI);
  } else if (emotion === "sad") {
    const p = w(x, mouthY + radius * 0.65);
    ctx.arc(p.x, p.y, width * 0.55, 1.15 * Math.PI, 1.85 * Math.PI);
  } else if (emotion === "angry") {
    const p1 = w(x - width * 0.5, mouthY + radius * 0.04);
    const p2 = w(x + width * 0.5, mouthY - radius * 0.1);
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
  } else {
    const p1 = w(x - width * 0.5, mouthY);
    const p2 = w(x + width * 0.5, mouthY);
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
  }
  ctx.stroke();
}

export function drawStickman(ctx: CanvasRenderingContext2D, pose: StickPose, opts: DrawOptions): void {
  const { scale, stroke, lineWidth, groundY, mouthOpen = 0, emotion = "neutral", opacity = 1, seed = 0, time = 0 } = opts;
  const headR = 14 * scale;
  const torsoLen = 42 * scale;
  const upperArm = 22 * scale;
  const lowerArm = 18 * scale;
  const upperLeg = 26 * scale;
  const lowerLeg = 22 * scale;

  const hipY = groundY - (upperLeg + lowerLeg) - pose.lift;
  const hip = { x: pose.rootX, y: hipY };
  const neck = {
    x: hip.x + Math.sin(pose.torsoLean) * torsoLen,
    y: hip.y - Math.cos(pose.torsoLean) * torsoLen
  };
  const head = { x: neck.x, y: neck.y - headR * 1.35 };

  const shoulderSpread = 9 * scale;
  const shoulders = {
    left: { x: neck.x - shoulderSpread, y: neck.y + 2 * scale },
    right: { x: neck.x + shoulderSpread, y: neck.y + 2 * scale }
  };

  const hipSpread = 7 * scale;
  const hips = {
    left: { x: hip.x - hipSpread, y: hip.y },
    right: { x: hip.x + hipSpread, y: hip.y }
  };

  const leftElbow = (() => {
    const v = rotVec(upperArm, Math.PI + pose.leftArm.a);
    return { x: shoulders.left.x + v.x, y: shoulders.left.y + v.y };
  })();
  const leftHand = (() => {
    const v = rotVec(lowerArm, Math.PI + pose.leftArm.a + pose.leftArm.b);
    return { x: leftElbow.x + v.x, y: leftElbow.y + v.y };
  })();
  const rightElbow = (() => {
    const v = rotVec(upperArm, pose.rightArm.a);
    return { x: shoulders.right.x + v.x, y: shoulders.right.y + v.y };
  })();
  const rightHand = (() => {
    const v = rotVec(lowerArm, pose.rightArm.a + pose.rightArm.b);
    return { x: rightElbow.x + v.x, y: rightElbow.y + v.y };
  })();

  const leftKnee = (() => {
    const v = rotVec(upperLeg, pose.leftLeg.a);
    return { x: hips.left.x + v.x, y: hips.left.y + v.y };
  })();
  const leftFoot = (() => {
    const v = rotVec(lowerLeg, pose.leftLeg.a + pose.leftLeg.b);
    return { x: leftKnee.x + v.x, y: leftKnee.y + v.y };
  })();
  const rightKnee = (() => {
    const v = rotVec(upperLeg, pose.rightLeg.a);
    return { x: hips.right.x + v.x, y: hips.right.y + v.y };
  })();
  const rightFoot = (() => {
    const v = rotVec(lowerLeg, pose.rightLeg.a + pose.rightLeg.b);
    return { x: rightKnee.x + v.x, y: rightKnee.y + v.y };
  })();

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lineWidth;

  const w = (ox: number, oy: number) => {
    const off = getWobble(seed + ox + oy, time, 1.2);
    return { x: ox + off.x, y: oy + off.y };
  };

  ctx.beginPath();
  const n = w(neck.x, neck.y);
  const h = w(hip.x, hip.y);
  ctx.moveTo(n.x, n.y);
  ctx.quadraticCurveTo(n.x + (h.x - n.x) * 0.5 + 2 * scale, n.y + (h.y - n.y) * 0.5, h.x, h.y);
  ctx.stroke();

  // Arms
  ctx.beginPath();
  const sl = w(shoulders.left.x, shoulders.left.y);
  const le = w(leftElbow.x, leftElbow.y);
  const lh = w(leftHand.x, leftHand.y);
  ctx.moveTo(sl.x, sl.y);
  ctx.quadraticCurveTo(le.x, le.y, lh.x, lh.y);

  const sr = w(shoulders.right.x, shoulders.right.y);
  const re = w(rightElbow.x, rightElbow.y);
  const rh = w(rightHand.x, rightHand.y);
  ctx.moveTo(sr.x, sr.y);
  ctx.quadraticCurveTo(re.x, re.y, rh.x, rh.y);
  ctx.stroke();

  // Legs
  ctx.beginPath();
  const hl = w(hips.left.x, hips.left.y);
  const lk = w(leftKnee.x, leftKnee.y);
  const lf = w(leftFoot.x, leftFoot.y);
  ctx.moveTo(hl.x, hl.y);
  ctx.quadraticCurveTo(lk.x, lk.y, lf.x, lf.y);

  const hr = w(hips.right.x, hips.right.y);
  const rk = w(rightKnee.x, rightKnee.y);
  const rf = w(rightFoot.x, rightFoot.y);
  ctx.moveTo(hr.x, hr.y);
  ctx.quadraticCurveTo(rk.x, rk.y, rf.x, rf.y);
  ctx.stroke();

  ctx.beginPath();
  const headPos = w(head.x, head.y);
  ctx.arc(headPos.x, headPos.y, headR, 0, Math.PI * 2);
  ctx.stroke();

  const eyeY = head.y - headR * 0.12;
  const eyeOffsetX = headR * 0.35;
  const eyeLen = headR * (emotion === "nervous" ? 0.16 : 0.12);
  const browTilt = emotion === "angry" ? 0.22 : emotion === "sad" ? -0.16 : 0;

  ctx.beginPath();
  const e1s = w(head.x - eyeOffsetX - eyeLen, eyeY - browTilt * headR * 0.2);
  const e1e = w(head.x - eyeOffsetX + eyeLen, eyeY + browTilt * headR * 0.2);
  ctx.moveTo(e1s.x, e1s.y);
  ctx.lineTo(e1e.x, e1e.y);

  const e2s = w(head.x + eyeOffsetX - eyeLen, eyeY + browTilt * headR * 0.2);
  const e2e = w(head.x + eyeOffsetX + eyeLen, eyeY - browTilt * headR * 0.2);
  ctx.moveTo(e2s.x, e2s.y);
  ctx.lineTo(e2e.x, e2e.y);
  ctx.stroke();

  drawMouth(ctx, head.x, head.y, headR, mouthOpen, emotion, seed, time);

  ctx.restore();
}
