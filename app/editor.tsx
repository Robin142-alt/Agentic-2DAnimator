"use client";

import { useEffect, useMemo, useState } from "react";
import CanvasPlayer from "@/components/CanvasPlayer";
import { exportTimelineInBrowser, shouldPreferBrowserVideoExport } from "@/lib/clientVideo";
import type { ExpandedStory } from "@/types/story";
import type { Timeline } from "@/types/timeline";

type MeResponse = { user: { id: string; email: string } | null };

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "content-type": "application/json", ...(init?.headers ?? {}) } });
  const raw = await res.text();
  let data: any = null;
  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      data = null;
    }
  }
  if (!res.ok) {
    const msg = data?.error ? String(data.error) : raw && raw.length < 300 ? raw : `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data as T;
}

export default function Editor() {
  const [text, setText] = useState(
    "A person finds a lost note at a bus stop and decides whether to return it or keep walking."
  );
  const [expanded, setExpanded] = useState<ExpandedStory | null>(null);
  const [timeline, setTimeline] = useState<Timeline | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const [me, setMe] = useState<MeResponse["user"]>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [saveTitle, setSaveTitle] = useState("My StickStory");
  const [isPublic, setIsPublic] = useState(true);
  const [savedSlug, setSavedSlug] = useState<string | null>(null);

  useEffect(() => {
    fetchJson<MeResponse>("/api/auth", { method: "GET" })
      .then((d) => setMe(d.user))
      .catch(() => setMe(null));
  }, []);

  const canSave = useMemo(() => Boolean(me && expanded && timeline), [me, expanded, timeline]);

  const onGenerate = async () => {
    setError(null);
    setStatus(null);
    setSavedSlug(null);
    setBusy(true);
    try {
      const data = await fetchJson<{ expanded: ExpandedStory; timeline: Timeline }>("/api/generate", {
        method: "POST",
        body: JSON.stringify({ text, renderVideo: false })
      });
      setExpanded(data.expanded);
      setTimeline(data.timeline);
      setSaveTitle(data.expanded.title || "My StickStory");
    } catch (e: any) {
      setError(e?.message ?? "Generation failed");
    } finally {
      setBusy(false);
    }
  };

  const onAuth = async (action: "register" | "login" | "logout") => {
    setError(null);
    setStatus(null);
    setBusy(true);
    try {
      const data = await fetchJson<MeResponse>("/api/auth", {
        method: "POST",
        body: JSON.stringify(action === "logout" ? { action } : { action, email, password })
      });
      setMe(data.user);
      setEmail("");
      setPassword("");
    } catch (e: any) {
      setError(e?.message ?? "Auth failed");
    } finally {
      setBusy(false);
    }
  };

  const onSave = async () => {
    if (!expanded || !timeline) return;
    setError(null);
    setStatus(null);
    setBusy(true);
    try {
      const data = await fetchJson<{ slug: string }>("/api/story", {
        method: "POST",
        body: JSON.stringify({
          title: saveTitle,
          originalText: text,
          expanded,
          timeline,
          isPublic
        })
      });
      setSavedSlug(data.slug);
      setStatus("Story saved.");
    } catch (e: any) {
      setError(e?.message ?? "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const onExport = async () => {
    if (!timeline) return;

    setError(null);
    setStatus("Preparing export...");
    setBusy(true);

    try {
      if (shouldPreferBrowserVideoExport()) {
        throw new Error("Hosted browser export preferred");
      }

      const res = await fetch("/api/render", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ timeline, config: { width: 720, height: 420, fps: 30, background: "night" } })
      });

      if (!res.ok) {
        const raw = await res.text();
        let data: any = null;
        if (raw) {
          try {
            data = JSON.parse(raw);
          } catch {
            data = null;
          }
        }
        throw new Error(data?.error ?? (raw && raw.length < 300 ? raw : `Render failed (${res.status})`));
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "stickstory.mp4";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setStatus("MP4 export complete.");
    } catch (serverError: any) {
      try {
        setStatus("Recording browser video in real time...");
        const result = await exportTimelineInBrowser(timeline, {
          width: 720,
          height: 420,
          fps: 30,
          onProgress: (progress) => {
            setStatus(`Recording browser video... ${Math.round(progress * 100)}%`);
          }
        });

        const url = URL.createObjectURL(result.blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `stickstory.${result.extension}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        setStatus("Browser video export complete.");
      } catch (fallbackError: any) {
        setStatus(null);
        setError(fallbackError?.message ?? serverError?.message ?? "Export failed");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="grid gap-6 lg:grid-cols-2">
      <section className="space-y-4">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-5">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-sm font-semibold text-zinc-200">Input</h2>
            <button
              disabled={busy || text.trim().length === 0}
              onClick={onGenerate}
              className="rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-zinc-900 hover:bg-zinc-200 disabled:opacity-50"
            >
              {busy ? "Working..." : "Generate"}
            </button>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="mt-3 h-44 w-full resize-none rounded-xl border border-zinc-800 bg-zinc-950/40 p-3 text-sm text-zinc-100 outline-none focus:border-zinc-600"
            placeholder="Paste a short story prompt..."
          />
          {error ? <div className="mt-3 text-sm text-red-300">{error}</div> : null}
          {status ? <div className="mt-3 text-sm text-emerald-300">{status}</div> : null}
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-5">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-zinc-200">Account</div>
            {me ? (
              <button
                disabled={busy}
                onClick={() => onAuth("logout")}
                className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-900 disabled:opacity-50"
              >
                Logout
              </button>
            ) : null}
          </div>
          {me ? (
            <div className="mt-3 text-sm text-zinc-300">Signed in as {me.email}</div>
          ) : (
            <div className="mt-3 grid gap-2">
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-sm outline-none focus:border-zinc-600"
                placeholder="Email"
              />
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-sm outline-none focus:border-zinc-600"
                placeholder="Password (min 8 chars)"
                type="password"
              />
              <div className="flex gap-2">
                <button
                  disabled={busy || !email || password.length < 8}
                  onClick={() => onAuth("login")}
                  className="rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-zinc-900 hover:bg-zinc-200 disabled:opacity-50"
                >
                  Login
                </button>
                <button
                  disabled={busy || !email || password.length < 8}
                  onClick={() => onAuth("register")}
                  className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-900 disabled:opacity-50"
                >
                  Register
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-5">
          <div className="text-sm font-semibold text-zinc-200">Save & Share</div>
          <div className="mt-3 grid gap-2">
            <input
              value={saveTitle}
              onChange={(e) => setSaveTitle(e.target.value)}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-sm outline-none focus:border-zinc-600 disabled:opacity-50"
              placeholder="Title"
              disabled={!expanded}
            />
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                disabled={!expanded}
              />
              Public in gallery
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                disabled={!canSave || busy}
                onClick={onSave}
                className="rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-zinc-900 hover:bg-zinc-200 disabled:opacity-50"
              >
                Save Story
              </button>
              <button
                disabled={!timeline || busy}
                onClick={onExport}
                className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-900 disabled:opacity-50"
              >
                Export Video
              </button>
            </div>
            {savedSlug ? (
              <div className="text-sm text-zinc-300">
                Saved. Share link:{" "}
                <a className="underline hover:text-white" href={`/player/${savedSlug}`}>
                  /player/{savedSlug}
                </a>
              </div>
            ) : null}
            {!me ? <div className="text-xs text-zinc-500">Login required to save stories.</div> : null}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-5">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-zinc-200">Playback</div>
            {timeline ? <div className="text-xs text-zinc-400">{Math.round(timeline.total_duration)}s timeline</div> : null}
          </div>
          <div className="mt-4">
            {timeline ? <CanvasPlayer timeline={timeline} /> : <div className="text-sm text-zinc-500">Generate to preview animation.</div>}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-5">
          <div className="text-sm font-semibold text-zinc-200">Expanded Story</div>
          {!expanded ? (
            <div className="mt-2 text-sm text-zinc-500">No story yet.</div>
          ) : (
            <div className="mt-3 space-y-4">
              <div>
                <div className="text-base font-semibold">{expanded.title}</div>
                <div className="text-sm text-zinc-300">{expanded.logline}</div>
              </div>
              <div className="space-y-3">
                {expanded.scenes.map((s) => (
                  <div key={s.index} className="rounded-xl border border-zinc-800 bg-zinc-950/30 p-3">
                    <div className="text-sm font-semibold">
                      {s.index + 1}. {s.title}
                    </div>
                    <div className="mt-1 text-xs text-zinc-400">{s.setting}</div>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-200">
                      {s.beats.map((b, i) => (
                        <li key={i}>
                          <span className="text-zinc-300">{b.kind}</span>: {b.summary}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-5">
          <div className="text-sm font-semibold text-zinc-200">Timeline JSON</div>
          <pre className="mt-3 max-h-72 overflow-auto rounded-xl border border-zinc-800 bg-zinc-950/40 p-3 text-xs text-zinc-200">
            {timeline ? JSON.stringify(timeline, null, 2) : "Generate a story to see the director output."}
          </pre>
        </div>
      </section>
    </main>
  );
}
