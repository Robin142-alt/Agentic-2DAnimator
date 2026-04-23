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
};

function rotVec(len: number, angle: number): { x: number; y: number } {
  return { x: Math.sin(angle) * len, y: Math.cos(angle) * len };
}

function drawMouth(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  mouthOpen: number,
  emotion: Emotion
) {
  const open = Math.max(0, Math.min(1, mouthOpen));
  const mouthY = y + radius * 0.35;
  const width = radius * 0.6;

  ctx.beginPath();
  if (open > 0.12) {
    const mouthH = radius * (0.14 + open * 0.24);
    ctx.ellipse(x, mouthY, width * 0.42, mouthH, 0, 0, Math.PI * 2);
  } else if (emotion === "happy") {
    ctx.arc(x, mouthY - radius * 0.05, width * 0.6, 0.12 * Math.PI, 0.88 * Math.PI);
  } else if (emotion === "sad") {
    ctx.arc(x, mouthY + radius * 0.65, width * 0.55, 1.15 * Math.PI, 1.85 * Math.PI);
  } else if (emotion === "angry") {
    ctx.moveTo(x - width * 0.5, mouthY + radius * 0.04);
    ctx.lineTo(x + width * 0.5, mouthY - radius * 0.1);
  } else {
    ctx.moveTo(x - width * 0.5, mouthY);
    ctx.lineTo(x + width * 0.5, mouthY);
  }
  ctx.stroke();
}

export function drawStickman(ctx: CanvasRenderingContext2D, pose: StickPose, opts: DrawOptions): void {
  const { scale, stroke, lineWidth, groundY, mouthOpen = 0, emotion = "neutral", opacity = 1 } = opts;
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

  ctx.beginPath();
  ctx.moveTo(neck.x, neck.y);
  ctx.lineTo(hip.x, hip.y);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(shoulders.left.x, shoulders.left.y);
  ctx.lineTo(leftElbow.x, leftElbow.y);
  ctx.lineTo(leftHand.x, leftHand.y);
  ctx.moveTo(shoulders.right.x, shoulders.right.y);
  ctx.lineTo(rightElbow.x, rightElbow.y);
  ctx.lineTo(rightHand.x, rightHand.y);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(hips.left.x, hips.left.y);
  ctx.lineTo(leftKnee.x, leftKnee.y);
  ctx.lineTo(leftFoot.x, leftFoot.y);
  ctx.moveTo(hips.right.x, hips.right.y);
  ctx.lineTo(rightKnee.x, rightKnee.y);
  ctx.lineTo(rightFoot.x, rightFoot.y);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(head.x, head.y, headR, 0, Math.PI * 2);
  ctx.stroke();

  const eyeY = head.y - headR * 0.12;
  const eyeOffsetX = headR * 0.35;
  const eyeLen = headR * (emotion === "nervous" ? 0.16 : 0.12);
  const browTilt = emotion === "angry" ? 0.22 : emotion === "sad" ? -0.16 : 0;

  ctx.beginPath();
  ctx.moveTo(head.x - eyeOffsetX - eyeLen, eyeY - browTilt * headR * 0.2);
  ctx.lineTo(head.x - eyeOffsetX + eyeLen, eyeY + browTilt * headR * 0.2);
  ctx.moveTo(head.x + eyeOffsetX - eyeLen, eyeY + browTilt * headR * 0.2);
  ctx.lineTo(head.x + eyeOffsetX + eyeLen, eyeY - browTilt * headR * 0.2);
  ctx.stroke();

  drawMouth(ctx, head.x, head.y, headR, mouthOpen, emotion);

  ctx.restore();
}
