# StickStory AI

Deterministic pipeline:

`User Input → Story Expansion → Director Engine → Timeline JSON → Sync Engine → Animation Engine → Renderer → Video`

## Requirements

- Node.js 22+
- Docker (recommended for local PostgreSQL)

## Setup

1) Install dependencies

```bash
npm install
```

2) Start PostgreSQL + initialize schema

```bash
docker compose up -d
```

Or apply schema to an existing database:

```bash
npm run db:migrate
```

3) Configure env

```bash
copy .env.example .env.local
```

Set `JWT_SECRET` to a strong value (min 16 chars). `DATABASE_URL` in `.env.local` is already correct for the provided `docker-compose.yml`.

4) Run the app

```bash
npm run dev
```

Open http://localhost:3000

## Notes

- MP4 export uses server-side FFmpeg via `ffmpeg-static` and frame rendering via `@napi-rs/canvas`.
- Rendering long timelines is CPU + disk intensive (frames are written to a temp directory per render job).

## Deployment

Recommended: container deploy (Node runtime required for FFmpeg + native canvas bindings).

- Build: `npm run build`
- Run: `npm run start`
- Health: `GET /api/health`

### Docker (app + db)

```bash
docker compose -f docker-compose.app.yml up -d --build
```

Then open http://localhost:3000

Environment variables for production:

- `DATABASE_URL` (required)
- `JWT_SECRET` (required, min 16 chars)
- `RENDER_CONCURRENCY` (optional, default `1`)

### Vercel

You can deploy the app UI + APIs to Vercel, but note the platform function execution limits:

- Vercel Functions default to 300s and (on Pro/Enterprise) can be configured up to 800s. citeturn3search2turn3search6
- The maximum uncompressed bundle size per function is 250 MB. citeturn3search0turn3search4

Steps:

1) Import the GitHub repo in Vercel
2) Set project env vars:
   - `DATABASE_URL`
   - `JWT_SECRET` (>= 16 chars)
   - `RENDER_CONCURRENCY=1`
3) Deploy
4) Verify health at `/api/health`

Render endpoint notes:

- `/api/render` runs server-side FFmpeg + native canvas; large dependencies may hit the 250MB function limit. If that happens, set `VERCEL_ANALYZE_BUILD_OUTPUT=1` and redeploy to see function sizes. citeturn3search4
- For long renders, you may need to offload rendering to a separate worker service instead of running it inline in a request/response cycle. citeturn3search8
