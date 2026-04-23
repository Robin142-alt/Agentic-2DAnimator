function makeTextShape(text, width, height) {
  return {
    type: "text",
    x: width / 2,
    y: height / 2 - 8,
    text,
    color: "#f4f4f5",
    fontSize: 14,
    align: "center"
  };
}

export function createPlaceholderAsset(name, normalizedName = "unnamed asset") {
  const label = (name || "unknown").slice(0, 18);
  return {
    id: `asset:${normalizedName}`,
    name: name || "unknown",
    normalizedName,
    category: "placeholder",
    source: "placeholder",
    width: 120,
    height: 90,
    anchorY: 90,
    variationSeed: 0,
    label,
    shapes: [
      { type: "rect", x: 4, y: 4, width: 112, height: 82, fill: "#18181b", stroke: "#f59e0b", lineWidth: 3, radius: 8 },
      { type: "line", x1: 10, y1: 10, x2: 110, y2: 80, stroke: "#f59e0b", lineWidth: 2 },
      { type: "line", x1: 110, y1: 10, x2: 10, y2: 80, stroke: "#f59e0b", lineWidth: 2 },
      makeTextShape(label, 120, 90)
    ]
  };
}
