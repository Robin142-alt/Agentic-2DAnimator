import type { StickPose } from "@/animation/pose";

export type DrawOptions = {
  scale: number;
  stroke: string;
  lineWidth: number;
  groundY: number;
};

function rotVec(len: number, angle: number): { x: number; y: number } {
  return { x: Math.sin(angle) * len, y: Math.cos(angle) * len };
}

export function drawStickman(ctx: CanvasRenderingContext2D, pose: StickPose, opts: DrawOptions): void {
  const { scale, stroke, lineWidth, groundY } = opts;
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
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lineWidth;

  // torso
  ctx.beginPath();
  ctx.moveTo(neck.x, neck.y);
  ctx.lineTo(hip.x, hip.y);
  ctx.stroke();

  // arms
  ctx.beginPath();
  ctx.moveTo(shoulders.left.x, shoulders.left.y);
  ctx.lineTo(leftElbow.x, leftElbow.y);
  ctx.lineTo(leftHand.x, leftHand.y);
  ctx.moveTo(shoulders.right.x, shoulders.right.y);
  ctx.lineTo(rightElbow.x, rightElbow.y);
  ctx.lineTo(rightHand.x, rightHand.y);
  ctx.stroke();

  // legs
  ctx.beginPath();
  ctx.moveTo(hips.left.x, hips.left.y);
  ctx.lineTo(leftKnee.x, leftKnee.y);
  ctx.lineTo(leftFoot.x, leftFoot.y);
  ctx.moveTo(hips.right.x, hips.right.y);
  ctx.lineTo(rightKnee.x, rightKnee.y);
  ctx.lineTo(rightFoot.x, rightFoot.y);
  ctx.stroke();

  // head
  ctx.beginPath();
  ctx.arc(head.x, head.y, headR, 0, Math.PI * 2);
  ctx.stroke();

  // simple face (tilt)
  const faceDir = pose.headTilt;
  ctx.beginPath();
  ctx.moveTo(head.x - Math.cos(faceDir) * (headR * 0.35), head.y - Math.sin(faceDir) * (headR * 0.1));
  ctx.lineTo(head.x + Math.cos(faceDir) * (headR * 0.35), head.y + Math.sin(faceDir) * (headR * 0.1));
  ctx.stroke();

  ctx.restore();
}

