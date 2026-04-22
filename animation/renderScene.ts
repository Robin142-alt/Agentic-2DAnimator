import type { Sample } from "@/engine/syncEngine";
import { drawStickman } from "@/animation/draw";

export function renderSceneFrame(
  ctx: CanvasRenderingContext2D,
  sample: Sample,
  width: number,
  height: number
): void {
  ctx.clearRect(0, 0, width, height);

  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, "#0a0a0f");
  grad.addColorStop(1, "#050507");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  const groundY = height - 52;
  ctx.strokeStyle = "rgba(255,255,255,0.10)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, groundY);
  ctx.lineTo(width, groundY);
  ctx.stroke();

  drawStickman(ctx, sample.pose, { scale: 1.25, stroke: "#e5e7eb", lineWidth: 4, groundY });

  const text = sample.dialogue?.trim();
  if (!text) return;

  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(18, height - 110, width - 36, 78);
  ctx.fillStyle = "#f4f4f5";
  ctx.font = "14px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto";
  ctx.textBaseline = "top";
  const line = text.length > 120 ? `${text.slice(0, 117)}...` : text;
  ctx.fillText(line, 30, height - 96);
  ctx.restore();
}

