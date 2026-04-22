export default function HomePage() {
  return (
    <main className="space-y-6">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
        <h1 className="text-2xl font-semibold tracking-tight">StickStory AI</h1>
        <p className="mt-2 text-sm text-zinc-300">
          Convert text into a structured story, a deterministic animation timeline, a canvas stickman animation, and an
          MP4 render via FFmpeg. Save and share stories in a public gallery.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <a
            href="/editor"
            className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200"
          >
            Open Editor
          </a>
          <a
            href="/gallery"
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-100 hover:bg-zinc-900"
          >
            Browse Gallery
          </a>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          ["Story Expansion", "Short input expands into 5–10 scenes with structure, dialogue, pacing, and emotion."],
          ["Director Engine", "Abstract actions + modifiers become a valid timeline JSON with smooth flow."],
          ["Animation + Render", "Canvas stickman playback, plus server-side MP4 export via FFmpeg."]
        ].map(([title, desc]) => (
          <div key={title} className="rounded-2xl border border-zinc-800 bg-zinc-900/20 p-5">
            <div className="text-sm font-semibold">{title}</div>
            <div className="mt-2 text-sm text-zinc-300">{desc}</div>
          </div>
        ))}
      </div>
    </main>
  );
}

