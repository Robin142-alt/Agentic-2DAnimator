export type ParsedStyle = {
  speed: number; // multiplier
  dir: -1 | 1;
  tags: string[];
};

export function parseStyle(style: string | undefined | null): ParsedStyle {
  const s = (style ?? "").toLowerCase();
  const tokens = s
    .split(/[;,\s]+/)
    .map((t) => t.trim())
    .filter(Boolean);

  let speedLabel: "slow" | "normal" | "fast" = "normal";
  let dir: -1 | 1 = 1;

  for (const t of tokens) {
    const [k, v] = t.includes(":") ? (t.split(":").map((p) => p.trim()) as [string, string]) : [t, ""];
    const key = k;
    const val = v || k;
    if (key === "speed") {
      if (val === "slow" || val === "normal" || val === "fast") speedLabel = val;
    } else if (key === "dir" || key === "direction") {
      if (val === "left") dir = -1;
      if (val === "right") dir = 1;
    } else {
      if (val === "slow" || val === "normal" || val === "fast") speedLabel = val;
      if (val === "left") dir = -1;
      if (val === "right") dir = 1;
    }
  }

  const speed = speedLabel === "slow" ? 0.65 : speedLabel === "fast" ? 1.6 : 1.0;
  return { speed, dir, tags: tokens };
}

