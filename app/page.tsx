export default function HomePage() {
  return (
    <main className="space-y-6">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
        <h1 className="text-2xl font-semibold tracking-tight">StickStory AI</h1>
        <p className="mt-2 text-sm text-zinc-300">
          Convert text into a structured story, a deterministic animation timeline, a canvas stickman animation, and a
          finished video export. Save and share stories in a public gallery.
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
          ["Story Expansion", "Short input expands into 5-10 scenes with structure, dialogue, pacing, and emotion."],
          ["Director Engine", "Abstract actions plus modifiers become valid timeline JSON with smooth flow."],
          ["Playback + Video", "Canvas playback lives beside export controls and an in-app video preview surface."]
        ].map(([title, desc]) => (
          <div key={title} className="rounded-2xl border border-zinc-800 bg-zinc-900/20 p-5">
            <div className="text-sm font-semibold">{title}</div>
            <div className="mt-2 text-sm text-zinc-300">{desc}</div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/20 p-6">
        <h2 className="text-sm font-semibold text-zinc-100">Interface coverage</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/30 p-4 text-sm text-zinc-300">
            Live stickman playback with scrubbing, play/pause controls, and dialogue overlays.
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/30 p-4 text-sm text-zinc-300">
            Finished exported video preview inside the editor and on the shared player page.
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/30 p-4 text-sm text-zinc-300">
            Save and share through the gallery, then reopen stories in a dedicated player route.
          </div>
        </div>
      </div>
    </main>
  );
}
