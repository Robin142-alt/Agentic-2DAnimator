"use client";

import { useEffect, useState } from "react";
import type { ExpandedStory } from "@/types/story";
import type { Timeline } from "@/types/timeline";
import CanvasPlayer from "@/components/CanvasPlayer";

type StoryPayload = {
  slug: string;
  title: string;
  originalText: string;
  expanded: ExpandedStory;
  timeline: Timeline;
  isPublic: boolean;
  created_at: string;
};

export default function PlayerBySlug({ slug }: { slug: string }) {
  const [story, setStory] = useState<StoryPayload | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setBusy(true);
    fetch(`/api/story?slug=${encodeURIComponent(slug)}`)
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j?.error ?? "Failed to load");
        setStory(j.story);
      })
      .catch((e) => setError(String(e?.message ?? e)))
      .finally(() => setBusy(false));
  }, [slug]);

  const onExport = async () => {
    if (!story) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/render", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ timeline: story.timeline, config: { width: 720, height: 420, fps: 30, background: "night" } })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? `Render failed (${res.status})`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${story.slug}.mp4`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(e?.message ?? "Export failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{story ? story.title : "Player"}</h1>
          {story ? (
            <div className="text-xs text-zinc-400">
              /player/{story.slug} • {new Date(story.created_at).toLocaleString()}
            </div>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <a className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-900" href="/gallery">
            Back
          </a>
          <button
            disabled={!story || busy}
            onClick={onExport}
            className="rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-zinc-900 hover:bg-zinc-200 disabled:opacity-50"
          >
            Export MP4
          </button>
        </div>
      </div>

      {error ? <div className="text-sm text-red-300">{error}</div> : null}
      {busy && !story ? <div className="text-sm text-zinc-400">Loading…</div> : null}

      {story ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-5">
            <div className="text-sm font-semibold text-zinc-200">Playback</div>
            <div className="mt-4">
              <CanvasPlayer timeline={story.timeline} autoPlay />
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-5">
            <div className="text-sm font-semibold text-zinc-200">Story</div>
            <div className="mt-3 text-sm text-zinc-300">{story.expanded.logline}</div>
            <div className="mt-4 space-y-2">
              {story.expanded.scenes.map((s) => (
                <div key={s.index} className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
                  <div className="text-sm font-semibold">
                    {s.index + 1}. {s.title}
                  </div>
                  <div className="mt-1 text-xs text-zinc-400">{s.setting}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

