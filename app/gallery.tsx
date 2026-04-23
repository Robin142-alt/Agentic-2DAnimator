"use client";

import { useEffect, useState } from "react";

type StoryListItem = { slug: string; title: string; isPublic: boolean; created_at: string };

export default function Gallery() {
  const [stories, setStories] = useState<StoryListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    setBusy(true);
    fetch("/api/story?public=1")
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j?.error ?? "Failed to load");
        setStories(j.stories ?? []);
        setError(null);
      })
      .catch((e) => setError(String(e?.message ?? e)))
      .finally(() => setBusy(false));
  }, []);

  return (
    <main className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Public Gallery</h1>
        <a
          href="/editor"
          className="rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-zinc-900 hover:bg-zinc-200"
        >
          Create Story
        </a>
      </div>
      <div className="text-sm text-zinc-400">
        Shared stories open in the player view, where visitors can watch the animation timeline and export a video copy.
      </div>
      {error ? <div className="text-sm text-red-300">{error}</div> : null}
      {busy ? <div className="text-sm text-zinc-400">Loading...</div> : null}
      <div className="grid gap-4 md:grid-cols-2">
        {stories.map((s) => (
          <a
            key={s.slug}
            href={`/player/${s.slug}`}
            className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-5 hover:bg-zinc-900/45"
          >
            <div className="text-sm font-semibold">{s.title}</div>
            <div className="mt-1 text-xs text-zinc-400">{new Date(s.created_at).toLocaleString()}</div>
            <div className="mt-3 text-sm text-zinc-300">Open player and export video -&gt;</div>
          </a>
        ))}
        {!busy && stories.length === 0 ? (
          <div className="text-sm text-zinc-400">No public stories yet. Create one in the editor.</div>
        ) : null}
      </div>
    </main>
  );
}
