import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "StickStory AI",
  description: "Text → story → stickman animation → video → share"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-zinc-950 text-zinc-100">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <header className="mb-8 flex items-center justify-between">
            <a href="/" className="text-lg font-semibold tracking-tight">
              StickStory AI
            </a>
            <nav className="flex items-center gap-4 text-sm text-zinc-300">
              <a className="hover:text-white" href="/editor">
                Editor
              </a>
              <a className="hover:text-white" href="/gallery">
                Gallery
              </a>
            </nav>
          </header>
          {children}
          <footer className="mt-12 border-t border-zinc-800 pt-6 text-xs text-zinc-400">
            Deterministic pipeline: input → expansion → director → timeline → animation → render.
          </footer>
        </div>
      </body>
    </html>
  );
}

