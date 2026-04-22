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
  const matches = text.match(/[^.!?]+[.!?]?/g);
  if (!matches) return [text];
  const parts = matches.map((s) => s.trim()).filter(Boolean);
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
  for (const word of words) counts.set(word, (counts.get(word) ?? 0) + 1);

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 8)
    .map(([word]) => word);
}

function titleCase(text: string): string {
  return text
    .split(/\s+/)
    .map((word) => (word ? word[0]!.toUpperCase() + word.slice(1) : ""))
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

function makeSetupDialogue(coreThing: string, emotion: Emotion, shortInput: boolean): SceneBeat["dialogue"] {
  return [
    { speaker: "Hero", text: `I keep thinking about ${coreThing}.`, emotion: "neutral" },
    { speaker: "Other", text: "You have been quiet. What is going on?", emotion: "happy" },
    {
      speaker: "Hero",
      text: shortInput
        ? "It is small, but it matters."
        : "It started as something small, but it is turning into a decision.",
      emotion
    }
  ];
}

function makeConflictDialogue(): SceneBeat["dialogue"] {
  return [
    { speaker: "Other", text: "Be careful. This could spiral.", emotion: "nervous" },
    { speaker: "Hero", text: "Doing nothing is also a choice.", emotion: "angry" },
    { speaker: "Other", text: "I am not trying to stop you. I am trying to keep you.", emotion: "sad" }
  ];
}

function makeTurnDialogue(): SceneBeat["dialogue"] {
  return [
    { speaker: "Narrator", text: "A missing piece surfaces and quietly changes the math.", emotion: "neutral" },
    { speaker: "Hero", text: "Wait. I know what to do.", emotion: "happy" }
  ];
}

function makeClimaxDialogue(): SceneBeat["dialogue"] {
  return [
    { speaker: "Hero", text: "I am doing it. Not to prove anything. Just to be real.", emotion: "angry" },
    { speaker: "Other", text: "Then let me be on your side.", emotion: "happy" }
  ];
}

function makeResolutionDialogue(): SceneBeat["dialogue"] {
  return [
    { speaker: "Other", text: "We do not have to be perfect. Just honest.", emotion: "happy" },
    { speaker: "Hero", text: "Deal. One step at a time.", emotion: "happy" }
  ];
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
  const titleSource = baseTitle.split(/[:\-\u2013\u2014]/)[0] ?? baseTitle;
  const title = titleCase(titleSource.trim() || baseTitle);

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
    "a choice that cannot be undone",
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
  const shortInput = input.length < 180;

  const scenes: Scene[] = [];

  for (let i = 0; i < sceneCount; i++) {
    const sceneEmotion = emotionCurve(i, sceneCount);
    const kinds = beatKinds(sceneCount, i);
    const setting =
      i === 0
        ? `${corePlace}. ${heroName} carries a thought about "${coreThing}".`
        : `${pick(rand, settings)}.`;

    const beats: SceneBeat[] = kinds.map((kind, beatIndex) => {
      const emotion: Emotion = beatIndex === 0 ? sceneEmotion : emotionCurve(i + 0.25, sceneCount);

      const summary =
        kind === "setup"
          ? `${heroName} tries to keep things normal, but the topic of ${coreThing} will not leave their mind.`
          : kind === "conflict"
            ? `${otherName} pushes back, and the stakes sharpen: what ${heroName} wants clashes with what is safe.`
            : kind === "turn"
              ? `A detail clicks into place, and ${heroName} sees a different path: risky, but honest.`
              : kind === "climax"
                ? `${heroName} acts before fear can argue, choosing clarity over comfort.`
                : `${heroName} and ${otherName} reset the relationship, carrying the lesson forward.`;

      const dialogue =
        kind === "setup"
          ? makeSetupDialogue(coreThing, emotion, shortInput)
          : kind === "conflict"
            ? makeConflictDialogue()
            : kind === "turn"
              ? makeTurnDialogue()
              : kind === "climax"
                ? makeClimaxDialogue()
                : makeResolutionDialogue();

      return { kind, summary, emotion, dialogue };
    });

    scenes.push({
      index: i,
      title: titleCase(
        pick(rand, ["A Quiet Start", "The Push", "A New Angle", "The Risk", "The Turn", "The Leap", "The After"] as const)
      ),
      setting,
      beats
    });
  }

  return { title, logline, scenes };
}
