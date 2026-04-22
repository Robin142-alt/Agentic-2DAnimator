export type BaseAction = "idle" | "move" | "jump" | "interact" | "gesture" | "talk" | "react";

export type Emotion = "neutral" | "happy" | "sad" | "angry" | "nervous";

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
};

export type RenderConfig = {
  width: number;
  height: number;
  fps: number;
  background?: "night" | "paper" | "plain";
};

