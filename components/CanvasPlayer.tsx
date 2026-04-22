"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Timeline } from "@/types/timeline";
import { SyncEngine } from "@/engine/syncEngine";
import { drawStickman } from "@/animation/draw";

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${String(r).padStart(2, "0")}`;
}

export default function CanvasPlayer({
  timeline,
  width = 720,
  height = 420,
  autoPlay = true
}: {
  timeline: Timeline;
  width?: number;
  height?: number;
  autoPlay?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef<number | null>(null);

  const engine = useMemo(() => new SyncEngine(timeline, { baseX: width * 0.5 }), [timeline, width]);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [dialogue, setDialogue] = useState("");

  useEffect(() => {
    if (autoPlay) {
      engine.play();
      setPlaying(true);
    } else {
      engine.pause();
      setPlaying(false);
    }
    setTime(0);
    setDialogue("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const renderFrame = (ts: number) => {
      if (lastRef.current == null) lastRef.current = ts;
      const dt = Math.min(0.05, Math.max(0, (ts - lastRef.current) / 1000));
      lastRef.current = ts;

      if (engine.isPlaying()) engine.tick(dt);
      const sample = engine.sample();
      setTime(sample.timeGlobal);
      setDialogue(sample.dialogue ?? "");

      // background
      ctx.clearRect(0, 0, width, height);
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, "#0a0a0f");
      grad.addColorStop(1, "#050507");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      const groundY = height - 52;
      ctx.strokeStyle = "rgba(255,255,255,0.10)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, groundY);
      ctx.lineTo(width, groundY);
      ctx.stroke();

      drawStickman(ctx, sample.pose, { scale: 1.25, stroke: "#e5e7eb", lineWidth: 4, groundY });

      // dialogue overlay
      const text = sample.dialogue?.trim();
      if (text) {
        ctx.save();
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.fillRect(18, height - 110, width - 36, 78);
        ctx.fillStyle = "#f4f4f5";
        ctx.font = "14px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto";
        ctx.textBaseline = "top";
        const line = text.length > 120 ? text.slice(0, 117) + "…" : text;
        ctx.fillText(line, 30, height - 96);
        ctx.restore();
      }

      rafRef.current = requestAnimationFrame(renderFrame);
    };

    rafRef.current = requestAnimationFrame(renderFrame);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastRef.current = null;
    };
  }, [engine, height, width]);

  const onPlayPause = () => {
    if (engine.isPlaying()) {
      engine.pause();
      setPlaying(false);
      return;
    }
    if (time >= timeline.total_duration) engine.play();
    else engine.resume();
    setPlaying(true);
  };

  const onSeek = (next: number) => {
    engine.seek(next);
    const sample = engine.sample(next);
    setTime(sample.timeGlobal);
    setDialogue(sample.dialogue ?? "");
  };

  return (
    <div className="space-y-3">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="w-full rounded-2xl border border-zinc-800 bg-black"
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={onPlayPause}
            className="rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-zinc-900 hover:bg-zinc-200"
          >
            {engine.isPlaying() ? "Pause" : time >= timeline.total_duration ? "Replay" : "Play"}
          </button>
          <div className="text-xs text-zinc-400">
            {formatTime(time)} / {formatTime(timeline.total_duration)}
          </div>
        </div>
        <input
          className="w-full md:w-[360px]"
          type="range"
          min={0}
          max={timeline.total_duration}
          step={0.05}
          value={time}
          onChange={(e) => onSeek(Number(e.target.value))}
        />
      </div>
      {dialogue ? <div className="text-sm text-zinc-200">{dialogue}</div> : <div className="text-sm text-zinc-500"> </div>}
      {playing ? null : null}
    </div>
  );
}
