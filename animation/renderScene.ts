import type { Asset, AssetShape, Emotion, RenderConfig, TransitionStyle, VisualCue } from "@/types/timeline";
import type { Sample } from "@/engine/syncEngine";
import type { StickPose } from "@/animation/pose";
import { drawStickman } from "@/animation/draw";

type DrawingContext = CanvasRenderingContext2D & {
  roundRect?: (x: number, y: number, width: number, height: number, radius: number) => void;
};

type SceneTheme = "busStop" | "park" | "kitchen" | "rooftop" | "hallway" | "market" | "workshop" | "street" | "default";
type DialogueSpeaker = "Hero" | "Other" | "Narrator" | null;

type CameraState = {
  zoom: number;
  panX: number;
  shakeX: number;
  shakeY: number;
  characterScale: number;
  supportScale: number;
};

function hashString(input: string): number {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index++) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function rng(seedValue: number) {
  let seed = seedValue >>> 0;
  return () => {
    seed += 0x6d2b79f5;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function smoothstep(u: number) {
  const t = clamp(u, 0, 1);
  return t * t * (3 - 2 * t);
}

function clonePose(pose: StickPose): StickPose {
  return {
    rootX: pose.rootX,
    lift: pose.lift,
    torsoLean: pose.torsoLean,
    headTilt: pose.headTilt,
    leftArm: { ...pose.leftArm },
    rightArm: { ...pose.rightArm },
    leftLeg: { ...pose.leftLeg },
    rightLeg: { ...pose.rightLeg }
  };
}

function inferTheme(note: string, assets: Asset[]): SceneTheme {
  const text = `${note} ${assets.map((asset) => asset.name).join(" ")}`.toLowerCase();
  if (text.includes("bus stop") || text.includes("bus")) return "busStop";
  if (text.includes("park") || text.includes("tree")) return "park";
  if (text.includes("kitchen") || text.includes("home") || text.includes("house")) return "kitchen";
  if (text.includes("rooftop") || text.includes("tower") || text.includes("skyline")) return "rooftop";
  if (text.includes("hallway") || text.includes("station")) return "hallway";
  if (text.includes("market") || text.includes("shop")) return "market";
  if (text.includes("workshop") || text.includes("garage")) return "workshop";
  if (assets.some((asset) => asset.category === "building")) return "street";
  return "default";
}

function parseSpeaker(dialogue: string): DialogueSpeaker {
  const match = dialogue.trim().match(/^(Hero|Other|Narrator):/i);
  if (!match) return null;
  const speaker = match[1]!.toLowerCase();
  if (speaker === "hero") return "Hero";
  if (speaker === "other") return "Other";
  return "Narrator";
}

function backgroundGradient(ctx: DrawingContext, width: number, height: number, top: string, bottom: string, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, top);
  grad.addColorStop(1, bottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

function drawSkyline(ctx: DrawingContext, width: number, baseY: number, seed: number, color: string, panX: number, alpha = 1) {
  const random = rng(seed);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(-panX * 0.18, 0);
  ctx.fillStyle = color;
  let x = -40;
  while (x < width + 80) {
    const buildingW = 28 + random() * 44;
    const buildingH = 50 + random() * 120;
    ctx.fillRect(x, baseY - buildingH, buildingW, buildingH);
    x += buildingW - 6;
  }
  ctx.restore();
}

function drawCloud(ctx: DrawingContext, x: number, y: number, scale: number, color: string, panX: number, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(-panX * 0.08, 0);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, 18 * scale, 0, Math.PI * 2);
  ctx.arc(x + 18 * scale, y - 8 * scale, 16 * scale, 0, Math.PI * 2);
  ctx.arc(x + 36 * scale, y, 14 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawLampGlow(ctx: DrawingContext, x: number, height: number, panX: number, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  const lampX = x - panX * 0.28;
  ctx.strokeStyle = "#e5e7eb";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(lampX, height - 56);
  ctx.lineTo(lampX, height - 160);
  ctx.stroke();

  const glow = ctx.createRadialGradient(lampX, height - 162, 6, lampX, height - 162, 56);
  glow.addColorStop(0, "rgba(253,224,71,0.35)");
  glow.addColorStop(1, "rgba(253,224,71,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(lampX, height - 162, 56, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawThemeBackground(
  ctx: DrawingContext,
  width: number,
  height: number,
  theme: SceneTheme,
  note: string,
  panX: number,
  alpha = 1
) {
  const lowered = note.toLowerCase();
  const seed = hashString(`${note}:${theme}`);
  const random = rng(seed);

  if (theme === "park") {
    backgroundGradient(ctx, width, height, "#1d4ed8", "#7dd3fc", alpha);
    drawCloud(ctx, width * 0.18, height * 0.18, 1.1, "rgba(255,255,255,0.82)", panX, alpha);
    drawCloud(ctx, width * 0.64, height * 0.26, 0.9, "rgba(255,255,255,0.72)", panX, alpha);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "#fde047";
    ctx.beginPath();
    ctx.arc(width - 90 - panX * 0.04, 84, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#166534";
    ctx.beginPath();
    ctx.moveTo(0, height - 74);
    ctx.quadraticCurveTo(width * 0.3, height - 140, width * 0.6, height - 84);
    ctx.quadraticCurveTo(width * 0.8, height - 50, width, height - 92);
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.fill();
    ctx.restore();
    return;
  }

  if (theme === "kitchen") {
    backgroundGradient(ctx, width, height, "#3f3f46", "#18181b", alpha);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "#854d0e";
    ctx.fillRect(0, height - 96, width, 96);
    ctx.fillStyle = "#27272a";
    ctx.fillRect(0, 0, width, height - 96);
    ctx.fillStyle = "#93c5fd";
    ctx.fillRect(width * 0.12 - panX * 0.1, height * 0.16, width * 0.2, height * 0.22);
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 3;
    ctx.strokeRect(width * 0.12 - panX * 0.1, height * 0.16, width * 0.2, height * 0.22);
    ctx.fillStyle = "#a16207";
    ctx.fillRect(width * 0.62 - panX * 0.18, height - 170, width * 0.18, 86);
    ctx.fillRect(width * 0.64 - panX * 0.18, height - 210, width * 0.14, 26);
    ctx.restore();
    return;
  }

  if (theme === "rooftop") {
    backgroundGradient(ctx, width, height, "#312e81", "#020617", alpha);
    drawSkyline(ctx, width, height - 50, seed, "rgba(15,23,42,0.88)", panX, alpha);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "#f8fafc";
    ctx.beginPath();
    ctx.arc(width - 86 - panX * 0.03, 82, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  if (theme === "hallway") {
    backgroundGradient(ctx, width, height, "#18181b", "#09090b", alpha);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(-panX * 0.16, 0);
    ctx.fillStyle = "#27272a";
    ctx.beginPath();
    ctx.moveTo(width * 0.22, 0);
    ctx.lineTo(width * 0.78, 0);
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.fill();
    for (let index = 0; index < 3; index++) {
      const y = 72 + index * 82;
      const glow = ctx.createRadialGradient(width / 2, y, 4, width / 2, y, 34);
      glow.addColorStop(0, "rgba(250,204,21,0.42)");
      glow.addColorStop(1, "rgba(250,204,21,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(width / 2, y, 34, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    return;
  }

  if (theme === "market") {
    backgroundGradient(ctx, width, height, "#fb923c", "#7c2d12", alpha);
    drawCloud(ctx, width * 0.12, height * 0.2, 0.8, "rgba(255,255,255,0.38)", panX, alpha);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "#7c2d12";
    ctx.fillRect(0, height - 128, width, 128);
    for (let index = 0; index < 5; index++) {
      const x = 32 + index * 118 - panX * 0.2;
      ctx.fillStyle = index % 2 === 0 ? "#ef4444" : "#facc15";
      ctx.beginPath();
      ctx.moveTo(x, height - 132);
      ctx.lineTo(x + 76, height - 132);
      ctx.lineTo(x + 68, height - 100);
      ctx.lineTo(x + 8, height - 100);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    return;
  }

  if (theme === "workshop") {
    backgroundGradient(ctx, width, height, "#1f2937", "#030712", alpha);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(-panX * 0.16, 0);
    ctx.fillStyle = "#111827";
    ctx.fillRect(0, height - 88, width, 88);
    ctx.strokeStyle = "rgba(148,163,184,0.16)";
    ctx.lineWidth = 1;
    for (let x = 24; x < width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 24);
      ctx.lineTo(x, height - 104);
      ctx.stroke();
    }
    for (let y = 24; y < height - 104; y += 32) {
      ctx.beginPath();
      ctx.moveTo(24, y);
      ctx.lineTo(width - 24, y);
      ctx.stroke();
    }
    ctx.fillStyle = "#92400e";
    ctx.fillRect(width * 0.15, height - 132, width * 0.24, 14);
    ctx.restore();
    return;
  }

  if (theme === "street" || theme === "busStop") {
    backgroundGradient(ctx, width, height, theme === "busStop" ? "#111827" : "#0f172a", "#020617", alpha);
    drawSkyline(ctx, width, height - 40, seed, "rgba(15,23,42,0.95)", panX, alpha);
    drawLampGlow(ctx, width * 0.18, height, panX, alpha);
    if (theme === "busStop") {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "rgba(226,232,240,0.14)";
      ctx.fillRect(width * 0.08 - panX * 0.24, height - 146, 62, 82);
      ctx.strokeStyle = "rgba(226,232,240,0.45)";
      ctx.lineWidth = 2;
      ctx.strokeRect(width * 0.08 - panX * 0.24, height - 146, 62, 82);
      if (lowered.includes("rain")) {
        ctx.strokeStyle = "rgba(148,163,184,0.28)";
        ctx.lineWidth = 1;
        for (let index = 0; index < 52; index++) {
          const x = random() * width;
          const y = random() * (height - 70);
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x - 6, y + 16);
          ctx.stroke();
        }
      }
      ctx.restore();
    }
    return;
  }

  backgroundGradient(ctx, width, height, "#0a0a0f", "#050507", alpha);
}

function drawGround(ctx: DrawingContext, width: number, groundY: number, theme: SceneTheme, panX: number, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(-panX * 0.24, 0);
  ctx.fillStyle = theme === "park" ? "#166534" : theme === "kitchen" ? "#713f12" : "rgba(255,255,255,0.04)";
  ctx.fillRect(-40, groundY, width + 80, 60);
  ctx.strokeStyle = "rgba(255,255,255,0.10)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-40, groundY);
  ctx.lineTo(width + 40, groundY);
  ctx.stroke();
  ctx.restore();
}

function applyRect(ctx: DrawingContext, shape: Extract<AssetShape, { type: "rect" }>) {
  ctx.beginPath();
  if (shape.radius && typeof ctx.roundRect === "function") {
    ctx.roundRect(shape.x, shape.y, shape.width, shape.height, shape.radius);
  } else {
    ctx.rect(shape.x, shape.y, shape.width, shape.height);
  }
  if (shape.fill) {
    ctx.fillStyle = shape.fill;
    ctx.fill();
  }
  if (shape.stroke) {
    ctx.strokeStyle = shape.stroke;
    ctx.lineWidth = shape.lineWidth ?? 1;
    ctx.stroke();
  }
}

function applyCircle(ctx: DrawingContext, shape: Extract<AssetShape, { type: "circle" }>) {
  ctx.beginPath();
  ctx.arc(shape.x, shape.y, shape.radius, 0, Math.PI * 2);
  if (shape.fill) {
    ctx.fillStyle = shape.fill;
    ctx.fill();
  }
  if (shape.stroke) {
    ctx.strokeStyle = shape.stroke;
    ctx.lineWidth = shape.lineWidth ?? 1;
    ctx.stroke();
  }
}

function applyLine(ctx: DrawingContext, shape: Extract<AssetShape, { type: "line" }>) {
  ctx.beginPath();
  ctx.moveTo(shape.x1, shape.y1);
  ctx.lineTo(shape.x2, shape.y2);
  ctx.strokeStyle = shape.stroke ?? "#f4f4f5";
  ctx.lineWidth = shape.lineWidth ?? 2;
  ctx.stroke();
}

function applyText(ctx: DrawingContext, shape: Extract<AssetShape, { type: "text" }>) {
  ctx.fillStyle = shape.color ?? "#f4f4f5";
  ctx.font = `${shape.fontSize ?? 14}px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto`;
  ctx.textAlign = shape.align ?? "left";
  ctx.textBaseline = "top";
  ctx.fillText(shape.text, shape.x, shape.y);
}

function drawAsset(
  ctx: DrawingContext,
  asset: Asset,
  x: number,
  groundY: number,
  scale: number,
  opacity = 1,
  offsetX = 0
) {
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.translate(x + offsetX - (asset.width * scale) / 2, groundY - asset.anchorY * scale);
  ctx.scale(scale, scale);

  for (const shape of asset.shapes) {
    if (shape.type === "rect") applyRect(ctx, shape);
    else if (shape.type === "circle") applyCircle(ctx, shape);
    else if (shape.type === "line") applyLine(ctx, shape);
    else applyText(ctx, shape);
  }

  ctx.restore();
}

function drawSceneAssets(
  ctx: DrawingContext,
  assets: Asset[],
  width: number,
  groundY: number,
  theme: SceneTheme,
  camera: CameraState,
  alpha = 1,
  layerOffsetX = 0
) {
  const buildings = assets.filter((asset) => asset.category === "building" || asset.category === "placeholder");
  const vehicles = assets.filter((asset) => asset.category === "vehicle");
  const props = assets.filter((asset) => asset.category === "prop");
  const characters = assets.filter((asset) => asset.category === "character");

  buildings.slice(0, 2).forEach((asset, index) => {
    drawAsset(
      ctx,
      asset,
      width * (0.24 + index * 0.48) - camera.panX * 0.25,
      groundY - (theme === "rooftop" ? 16 : 10),
      (0.92 + index * 0.08) * camera.supportScale,
      0.7 * alpha,
      layerOffsetX
    );
  });

  vehicles.slice(0, 1).forEach((asset) => {
    const laneX = theme === "busStop" ? width * 0.18 : width * 0.24;
    drawAsset(ctx, asset, laneX - camera.panX * 0.38, groundY, 0.94 * camera.supportScale, 0.96 * alpha, layerOffsetX);
  });

  props.slice(0, 3).forEach((asset, index) => {
    drawAsset(
      ctx,
      asset,
      width * (0.18 + index * 0.25) - camera.panX * 0.32,
      groundY,
      0.74 * camera.supportScale,
      0.95 * alpha,
      layerOffsetX
    );
  });

  characters.slice(0, 1).forEach((asset) => {
    drawAsset(ctx, asset, width * 0.84 - camera.panX * 0.48, groundY, 0.74 * camera.supportScale, 0.5 * alpha, layerOffsetX);
  });
}

function createListenerPose(sample: Sample, x: number): StickPose {
  const pose = clonePose(sample.pose);
  pose.rootX = x;
  pose.lift = 2 + Math.sin(sample.timeGlobal * 2.2) * 1.2;
  pose.torsoLean *= 0.35;
  pose.headTilt *= 0.4;
  pose.leftArm = { a: -0.55, b: -0.12 };
  pose.rightArm = { a: 0.55, b: 0.12 };
  pose.leftLeg = { a: 0.12, b: -0.32 };
  pose.rightLeg = { a: 0.12, b: -0.32 };
  return pose;
}

function activePoseForSample(sample: Sample, width: number, speaker: DialogueSpeaker): StickPose {
  const pose = clonePose(sample.pose);
  if (sample.item.action !== "talk" && sample.item.action !== "gesture") return pose;

  if (speaker === "Hero") pose.rootX = width * 0.66;
  else if (speaker === "Other") pose.rootX = width * 0.34;
  else pose.rootX = width * 0.5;
  return pose;
}

function mouthOpenForSample(sample: Sample): number {
  if (sample.item.action === "talk") {
    return 0.2 + Math.abs(Math.sin(sample.timeLocal * 12)) * (0.45 + sample.item.intensity * 0.4);
  }
  if (sample.item.action === "react") {
    return 0.08 + Math.abs(Math.sin(sample.timeLocal * 6)) * 0.2;
  }
  return 0;
}

function cameraStateForSample(sample: Sample, width: number): CameraState {
  const speaker = parseSpeaker(sample.dialogue);
  const arcRole = sample.visual?.arcRole ?? "conflict";
  const beatProgress = clamp(sample.timeLocal / Math.max(sample.item.duration, 0.001), 0, 1);
  const dialoguePeak = sample.item.dialogue ? Math.sin(beatProgress * Math.PI) : 0;
  let zoom = sample.camera.baseZoom;
  if (sample.item.action === "talk") {
    zoom += 0.08 + (sample.camera.shot === "close" ? 0.04 : 0);
    zoom += dialoguePeak * (sample.camera.shot === "wide" ? 0.18 : 0.12);
  }
  if (sample.item.action === "move" && sample.camera.shot === "tracking") zoom += 0.05;
  if (sample.item.action === "jump" || sample.item.action === "react") {
    zoom += 0.08 + sample.item.intensity * 0.06;
    zoom += dialoguePeak * 0.14;
  }
  if (arcRole === "climax") {
    zoom += smoothstep(sample.sceneProgress) * 0.08;
  } else if (arcRole === "resolution") {
    const endingPush = smoothstep(Math.max(0, (sample.sceneProgress - 0.5) / 0.5));
    zoom += endingPush * 0.16;
  } else if (arcRole === "setup") {
    zoom -= (1 - smoothstep(sample.sceneProgress)) * 0.04;
  }

  let focusX = width * 0.5 + sample.camera.panBias * width * 0.08;
  if (speaker === "Hero") focusX = width * 0.64;
  else if (speaker === "Other") focusX = width * 0.36;
  else if (sample.item.action === "move") focusX = sample.pose.rootX;
  if (sample.item.action === "react") {
    focusX += speaker === "Hero" ? width * 0.04 : speaker === "Other" ? -width * 0.04 : 0;
  }
  if (arcRole === "resolution" && sample.sceneProgress > 0.72) {
    focusX = width * 0.5 + sample.camera.panBias * width * 0.03;
  }

  const panX = (focusX - width * 0.5) * 0.62 + sample.camera.panBias * 26;
  const shakeBase = sample.item.action === "jump" || sample.item.emotion === "angry" ? 1 : 0;
  const shakeScale = arcRole === "resolution" ? 0.18 : arcRole === "climax" ? 1.15 : 1;
  const shakeX = shakeBase ? Math.sin(sample.timeGlobal * 32) * (1.5 + sample.item.intensity * 2.2) * shakeScale : 0;
  const shakeY = shakeBase ? Math.cos(sample.timeGlobal * 24) * (0.8 + sample.item.intensity * 1.6) * shakeScale : 0;
  const zoomScale = clamp(zoom, 0.92, 1.42);
  const shotCharacterScale =
    sample.camera.shot === "close"
      ? 1.42
      : sample.camera.shot === "tracking"
        ? 1.22
        : sample.camera.shot === "wide"
          ? 1.08
          : 1.24;
  const shotSupportScale = sample.camera.shot === "wide" ? 1.06 : sample.camera.shot === "close" ? 0.9 : 0.98;

  return {
    zoom,
    panX,
    shakeX,
    shakeY,
    characterScale: shotCharacterScale * zoomScale,
    supportScale: shotSupportScale * (0.9 + (zoomScale - 0.92) * 0.35)
  };
}

function drawSpeakerBadge(ctx: DrawingContext, sample: Sample, width: number) {
  const speaker = parseSpeaker(sample.dialogue);
  if (!speaker && !sample.sceneNote) return;

  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  if (typeof ctx.roundRect === "function") {
    ctx.beginPath();
    ctx.roundRect(18, 18, Math.min(width - 36, 290), 40, 12);
    ctx.fill();
  } else {
    ctx.fillRect(18, 18, Math.min(width - 36, 290), 40);
  }
  ctx.fillStyle = "#e4e4e7";
  ctx.font = "12px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto";
  ctx.textBaseline = "top";
  const heading = speaker ? `Scene Speaker: ${speaker}` : "Scene";
  ctx.fillText(heading, 30, 28);
  if (sample.sceneNote) {
    ctx.fillStyle = "#a1a1aa";
    const text = sample.sceneNote.length > 48 ? `${sample.sceneNote.slice(0, 45)}...` : sample.sceneNote;
    ctx.fillText(text, 150, 28);
  }
  ctx.restore();
}

function drawDialogueOverlay(ctx: DrawingContext, sample: Sample, width: number, height: number) {
  const speaker = parseSpeaker(sample.dialogue);
  const cleanDialogue = sample.dialogue.replace(/^(Hero|Other|Narrator):\s*/i, "");
  const lines = [sample.sceneNote, cleanDialogue].map((entry) => entry?.trim()).filter(Boolean).slice(0, 2);

  if (!lines.length) return;

  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(18, height - 120, width - 36, 88);
  ctx.textBaseline = "top";
  ctx.font = "12px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto";

  if (sample.sceneNote) {
    const sceneLine = sample.sceneNote.length > 90 ? `${sample.sceneNote.slice(0, 87)}...` : sample.sceneNote;
    ctx.fillStyle = "#a1a1aa";
    ctx.fillText(sceneLine, 30, height - 106);
  }

  if (cleanDialogue) {
    const text = cleanDialogue.length > 116 ? `${cleanDialogue.slice(0, 113)}...` : cleanDialogue;
    if (speaker) {
      ctx.fillStyle = speaker === "Hero" ? "#93c5fd" : speaker === "Other" ? "#fca5a5" : "#fde68a";
      ctx.font = "12px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto";
      ctx.fillText(`${speaker}:`, 30, height - 82);
      ctx.fillStyle = "#f4f4f5";
      ctx.font = "14px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto";
      ctx.fillText(text, 84, height - 84);
    } else {
      ctx.fillStyle = "#f4f4f5";
      ctx.font = "14px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto";
      ctx.fillText(text, 30, height - 84);
    }
  }
  ctx.restore();
}

function drawSceneTitle(ctx: DrawingContext, sample: Sample, width: number) {
  if (sample.sceneProgress > 0.18 || !sample.sceneNote) return;

  const alpha = 1 - smoothstep(sample.sceneProgress / 0.18);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  if (typeof ctx.roundRect === "function") {
    ctx.beginPath();
    ctx.roundRect(width - 250, 18, 220, 36, 10);
    ctx.fill();
  } else {
    ctx.fillRect(width - 250, 18, 220, 36);
  }
  ctx.fillStyle = "#f4f4f5";
  ctx.font = "12px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const label = sample.sceneNote.length > 34 ? `${sample.sceneNote.slice(0, 31)}...` : sample.sceneNote;
  ctx.fillText(label, width - 140, 36);
  ctx.restore();
}

function drawWhipOverlay(ctx: DrawingContext, width: number, height: number, progress: number) {
  const alpha = (1 - progress) * 0.18;
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "#f8fafc";
  for (let index = 0; index < 8; index++) {
    const x = width * (index / 8);
    ctx.fillRect(x, 0, 18, height);
  }
  ctx.restore();
}

function drawTransitionLayer(
  ctx: DrawingContext,
  visual: VisualCue | null,
  width: number,
  height: number,
  groundY: number,
  transition: TransitionStyle,
  progress: number,
  isCurrent: boolean
) {
  if (!visual) return;

  const theme = inferTheme(visual.note, visual.assets);
  const camera: CameraState = {
    zoom: visual.camera.baseZoom,
    panX: visual.camera.panBias * 18,
    shakeX: 0,
    shakeY: 0,
    characterScale: 1.16,
    supportScale: (visual.camera.shot === "wide" ? 1.04 : 0.96) * clamp(0.92 + (visual.camera.baseZoom - 0.9) * 0.32, 0.9, 1.08)
  };

  const alpha = transition === "dissolve" ? (isCurrent ? progress : 1 - progress) : 1;
  let offsetX = 0;
  if (transition === "slide") {
    offsetX = isCurrent ? (1 - progress) * width * 0.55 : -progress * width * 0.55;
  } else if (transition === "whip") {
    offsetX = isCurrent ? (1 - progress) * width * 0.92 : -progress * width * 0.92;
  }

  drawThemeBackground(ctx, width, height, theme, visual.note, camera.panX, alpha);
  drawSceneAssets(ctx, visual.assets, width, groundY, theme, camera, alpha, offsetX);
  drawGround(ctx, width, groundY, theme, camera.panX + offsetX * 0.12, alpha);
}

export function renderSceneFrame(
  ctx: DrawingContext,
  sample: Sample,
  width: number,
  height: number,
  opts?: { background?: RenderConfig["background"] }
): void {
  ctx.clearRect(0, 0, width, height);

  const theme = opts?.background === "paper" ? "default" : inferTheme(sample.sceneNote, sample.assets);
  const groundY = height - 52;
  const camera = cameraStateForSample(sample, width);
  const transition = sample.camera.transition;
  const progress = smoothstep(sample.transitionProgress);

  if (sample.previousVisual && transition !== "cut" && progress < 0.999) {
    drawTransitionLayer(ctx, sample.previousVisual, width, height, groundY, transition, progress, false);
  }

  drawThemeBackground(ctx, width, height, theme, sample.sceneNote, camera.panX, transition === "dissolve" ? Math.max(0.75, progress) : 1);
  drawSceneAssets(ctx, sample.assets, width, groundY, theme, camera, 1);
  drawGround(ctx, width, groundY, theme, camera.panX);

  const speaker = parseSpeaker(sample.dialogue);
  const mainPose = activePoseForSample(sample, width, speaker);
  mainPose.rootX -= camera.panX + camera.shakeX;
  const listenerX = (speaker === "Other" ? width * 0.72 : speaker === "Hero" ? width * 0.3 : width * 0.22) - camera.panX * 0.72;

  if (speaker && speaker !== "Narrator") {
    const listenerPose = createListenerPose(sample, listenerX + camera.shakeX * 0.35);
    drawStickman(ctx, listenerPose, {
      scale: 1.06 * camera.characterScale * 0.78,
      stroke: "#a1a1aa",
      lineWidth: 3,
      groundY: groundY + camera.shakeY * 0.15,
      mouthOpen: 0,
      emotion: "neutral",
      opacity: 0.82
    });
  }

  drawStickman(ctx, mainPose, {
    scale: 1.25 * camera.characterScale,
    stroke: "#e5e7eb",
    lineWidth: 4,
    groundY: groundY + camera.shakeY,
    mouthOpen: mouthOpenForSample(sample),
    emotion: sample.item.emotion as Emotion
  });

  if (sample.previousVisual && transition === "whip" && progress < 1) {
    drawWhipOverlay(ctx, width, height, progress);
  }

  drawSpeakerBadge(ctx, sample, width);
  drawSceneTitle(ctx, sample, width);
  drawDialogueOverlay(ctx, sample, width, height);
}
