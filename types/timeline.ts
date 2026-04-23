export type BaseAction = "idle" | "move" | "jump" | "interact" | "gesture" | "talk" | "react";

export type Emotion = "neutral" | "happy" | "sad" | "angry" | "nervous";

export type AssetCategory = "character" | "vehicle" | "building" | "prop" | "placeholder";

export type AssetSource = "registry" | "procedural" | "category" | "placeholder";

export type AssetShape =
  | {
      type: "rect";
      x: number;
      y: number;
      width: number;
      height: number;
      fill?: string;
      stroke?: string;
      lineWidth?: number;
      radius?: number;
    }
  | {
      type: "circle";
      x: number;
      y: number;
      radius: number;
      fill?: string;
      stroke?: string;
      lineWidth?: number;
    }
  | {
      type: "line";
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      stroke?: string;
      lineWidth?: number;
    }
  | {
      type: "text";
      x: number;
      y: number;
      text: string;
      color?: string;
      fontSize?: number;
      align?: "left" | "center" | "right";
    };

export type Asset = {
  id: string;
  name: string;
  normalizedName: string;
  category: AssetCategory;
  source: AssetSource;
  width: number;
  height: number;
  anchorY: number;
  variationSeed: number;
  shapes: AssetShape[];
  label?: string;
};

export type CameraShot = "wide" | "medium" | "close" | "tracking";

export type TransitionStyle = "cut" | "dissolve" | "slide" | "whip";

export type CameraPlan = {
  shot: CameraShot;
  baseZoom: number;
  panBias: number; // -1..1
  transition: TransitionStyle;
};

export type SceneArcRole = "setup" | "conflict" | "climax" | "resolution";

export type VisualCue = {
  start: number;
  end: number;
  assetNames: string[];
  assets: Asset[];
  note: string;
  camera: CameraPlan;
  arcRole: SceneArcRole;
};

export type TimelineItem = {
  action: BaseAction;
  style: string;
  emotion: Emotion;
  intensity: number; // 0..1
  duration: number; // seconds
  dialogue: string;
};

export type Timeline = {
  total_duration: number; // seconds
  timeline: TimelineItem[];
  visuals?: VisualCue[];
};

export type RenderConfig = {
  width: number;
  height: number;
  fps: number;
  background?: "night" | "paper" | "plain";
};
