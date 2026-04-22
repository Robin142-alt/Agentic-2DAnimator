import type { Emotion } from "@/types/timeline";

export type DialogueLine = {
  speaker: "Narrator" | "Hero" | "Other";
  text: string;
  emotion: Emotion;
};

export type SceneBeat = {
  kind: "setup" | "conflict" | "turn" | "climax" | "resolution";
  summary: string;
  emotion: Emotion;
  dialogue: DialogueLine[];
};

export type Scene = {
  index: number;
  title: string;
  setting: string;
  beats: SceneBeat[];
};

export type ExpandedStory = {
  title: string;
  logline: string;
  scenes: Scene[];
};

