"use client";

type ExportedVideoPanelProps = {
  videoUrl: string | null;
  filename?: string;
  mimeType?: string;
  note?: string;
};

export default function ExportedVideoPanel({
  videoUrl,
  filename = "stickstory-video.webm",
  mimeType,
  note
}: ExportedVideoPanelProps) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-zinc-200">Video Output</div>
          <div className="mt-1 text-xs text-zinc-400">
            {videoUrl ? "Preview the latest rendered export here." : "Export a video to preview it here."}
          </div>
        </div>
        {mimeType ? (
          <div className="rounded-full border border-zinc-700 px-2.5 py-1 text-[11px] uppercase tracking-wide text-zinc-300">
            {mimeType.includes("mp4") ? "MP4" : "WEBM"}
          </div>
        ) : null}
      </div>

      {videoUrl ? (
        <div className="mt-4 space-y-3">
          <video
            controls
            playsInline
            preload="metadata"
            src={videoUrl}
            className="w-full rounded-2xl border border-zinc-800 bg-black"
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-zinc-400">
              {note ?? "Use the video controls to play, pause, scrub, and review the export."}
            </div>
            <a
              href={videoUrl}
              download={filename}
              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-100 hover:bg-zinc-900"
            >
              Download Video
            </a>
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-dashed border-zinc-800 bg-zinc-950/30 p-4 text-sm text-zinc-500">
          No exported video yet.
        </div>
      )}
    </div>
  );
}
