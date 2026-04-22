import type { ExpandedStory, Scene, SceneBeat } from "@/types/story";
import type { Emotion } from "@/types/timeline";
import { hashStringToSeed, mulberry32, pick } from "@/engine/rng";

const STOPWORDS = new Set(
  [
    "the",
    "a",
    "an",
    "and",
    "or",
    "but",
    "if",
    "then",
    "so",
    "because",
    "as",
    "at",
    "by",
    "for",
    "from",
    "in",
    "into",
    "of",
    "on",
    "onto",
    "to",
    "up",
    "down",
    "with",
    "without",
    "is",
    "are",
    "was",
    "were",
    "be",
    "been",
    "being",
    "i",
    "you",
    "he",
    "she",
    "they",
    "we",
    "it",
    "this",
    "that",
    "these",
    "those",
    "my",
    "your",
    "his",
    "her",
    "their",
    "our",
    "me",
    "him",
    "them",
    "us"
  ].map((s) => s.toLowerCase())
);

function normalizeInput(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

function splitSentences(text: string): string[] {
  const parts = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length ? parts : [text];
}

function keywords(text: string): string[] {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 4 && !STOPWORDS.has(w));

  const counts = new Map<string, number>();
  for (const w of words) counts.set(w, (counts.get(w) ?? 0) + 1);

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 8)
    .map(([w]) => w);
}

function titleCase(s: string): string {
  return s
    .split(/\s+/)
    .map((w) => (w ? w[0]!.toUpperCase() + w.slice(1) : ""))
    .join(" ")
    .trim();
}

function estimateSceneCount(text: string): number {
  const len = text.length;
  if (len < 90) return 7;
  if (len < 220) return 8;
  if (len < 500) return 7;
  if (len < 1200) return 6;
  return 5;
}

function emotionCurve(index: number, total: number): Emotion {
  const t = total <= 1 ? 0 : index / (total - 1);
  if (t < 0.15) return "neutral";
  if (t < 0.3) return "happy";
  if (t < 0.5) return "nervous";
  if (t < 0.7) return "angry";
  if (t < 0.85) return "sad";
  return "happy";
}

function beatKinds(totalScenes: number, sceneIndex: number): SceneBeat["kind"][] {
  const isFirst = sceneIndex === 0;
  const isLast = sceneIndex === totalScenes - 1;
  const isClimax = sceneIndex === totalScenes - 2 && totalScenes >= 5;
  if (isFirst) return ["setup", "setup"];
  if (isLast) return ["resolution", "resolution"];
  if (isClimax) return ["climax", "resolution"];
  return ["conflict", "turn"];
}

export function expandStory(rawInput: string): ExpandedStory {
  const input = normalizeInput(rawInput);
  const seed = hashStringToSeed(input);
  const rand = mulberry32(seed);
  const sentences = splitSentences(input);
  const keys = keywords(input);

  const baseTitle =
    sentences[0]?.slice(0, 80).replace(/[.!?]$/, "") ||
    (keys.length ? `The ${titleCase(keys[0]!)}` : "A Small Adventure");
  const title = titleCase(baseTitle.split(/[:\-–—]/)[0]!.trim() || baseTitle);

  const sceneCount = estimateSceneCount(input);
  const settings = [
    "a quiet street under neon signs",
    "a small kitchen at dawn",
    "a crowded market with bright colors",
    "a windy rooftop overlooking the city",
    "a dim hallway with a single flickering light",
    "a sunlit park with long shadows",
    "a bus stop in light rain",
    "a workshop filled with sketches and tools"
  ] as const;

  const motifs = [
    "a promise made too quickly",
    "a secret kept for too long",
    "a message that arrives late",
    "a choice that can’t be undone",
    "a missing piece that changes everything",
    "a small kindness that echoes",
    "a misunderstanding that grows",
    "a brave apology"
  ] as const;

  const motif = pick(rand, motifs);
  const logline =
    keys.length >= 2
      ? `When ${keys[0]} collides with ${keys[1]}, ${motif} forces a hard decision.`
      : `A simple moment turns into ${motif}, forcing a hard decision.`;

  const heroName = pick(rand, ["Ari", "Sam", "Mina", "Kai", "Noor", "Jules"] as const);
  const otherName = pick(rand, ["Rhea", "Omar", "Tariq", "Lena", "Bo", "Ivy"] as const);
  const coreThing = keys[0] ? titleCase(keys[0]) : "Idea";
  const corePlace = pick(rand, settings);

  const scenes: Scene[] = [];
  for (let i = 0; i < sceneCount; i++) {
    const sceneEmotion = emotionCurve(i, sceneCount);
    const kinds = beatKinds(sceneCount, i);
    const setting =
      i === 0
        ? `${corePlace}. ${heroName} carries a thought about “${coreThing}.”`
        : `${pick(rand, settings)}.`;

    const beats: SceneBeat[] = kinds.map((kind, beatIdx) => {
      const emotion: Emotion = beatIdx === 0 ? sceneEmotion : emotionCurve(i + 0.25, sceneCount);
      const summary = (() => {
        if (kind === "setup")
          return `${heroName} tries to keep things normal, but the topic of ${coreThing} won’t leave their mind.`;
        if (kind === "conflict")
          return `${otherName} pushes back, and the stakes sharpen: what ${heroName} wants clashes with what’s safe.`;
        if (kind === "turn")
          return `A detail clicks into place, and ${heroName} sees a different path—risky, but honest.`;
        if (kind === "climax")
          return `${heroName} acts before fear can argue, choosing clarity over comfort.`;
        return `${heroName} and ${otherName} reset the relationship, carrying the lesson forward.`;
      })();

      const dialogue = (() => {
        const short = input.length < 180;
        if (kind === "setup")
          return [
            { speaker: "Hero", text: `I keep thinking about ${coreThing}.`, emotion: "neutral" as const },
            { speaker: "Other", text: `You’ve been quiet. What’s going on?`, emotion: "happy" as const },
            {
              speaker: "Hero",
              text: short ? `It’s small, but it matters.` : `It started as something small, but it’s turning into a decision.`,
              emotion: emotion
            }
          ] satisfies SceneBeat["dialogue"];
        if (kind === "conflict")
          return [
            { speaker: "Other", text: `Be careful. This could spiral.`, emotion: "nervous" as const },
            { speaker: "Hero", text: `Doing nothing is also a choice.`, emotion: "angry" as const },
            { speaker: "Other", text: `I’m not trying to stop you—I’m trying to keep you.`, emotion: "sad" as const }
          ] satisfies SceneBeat["dialogue"];
        if (kind === "turn")
          return [
            { speaker: "Narrator", text: `A missing piece surfaces, quietly changing the math.`, emotion: "neutral" as const },
            { speaker: "Hero", text: `Wait… I know what to do.`, emotion: "happy" as const }
          ] satisfies SceneBeat["dialogue"];
        if (kind === "climax")
          return [
            { speaker: "Hero", text: `I’m doing it. Not to prove anything—just to be real.`, emotion: "angry" as const },
            { speaker: "Other", text: `Then let me be on your side.`, emotion: "happy" as const }
          ] satisfies SceneBeat["dialogue"];
        return [
          { speaker: "Other", text: `We don’t have to be perfect. Just honest.`, emotion: "happy" as const },
          { speaker: "Hero", text: `Deal. One step at a time.`, emotion: "happy" as const }
        ] satisfies SceneBeat["dialogue"];
      })();

      return { kind, summary, emotion, dialogue };
    });

    scenes.push({
      index: i,
      title: titleCase(
        pick(rand, [
          "A Quiet Start",
          "The Push",
          "A New Angle",
          "The Risk",
          "The Turn",
          "The Leap",
          "The After"
        ] as const)
      ),
      setting,
      beats
    });
  }

  return { title, logline, scenes };
}
