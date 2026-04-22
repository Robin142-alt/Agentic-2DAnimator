# StickStory AI

Deterministic pipeline:

`User Input -> Story Expansion -> Director Engine -> Timeline JSON -> Sync Engine -> Animation Engine -> Renderer -> Video`

## Requirements

- Node.js 22+
- Docker (recommended for local PostgreSQL)

## Setup

1. Install dependencies

```bash
npm install
```

2. Start PostgreSQL + initialize schema

```bash
docker compose up -d
```

Or apply schema to an existing database:

```bash
npm run db:migrate
```

3. Configure env

```bash
copy .env.example .env.local
```

Set `JWT_SECRET` to a strong value (min 16 chars). `DATABASE_URL` in `.env.local` is already correct for the provided `docker-compose.yml`.

4. Run the app

```bash
npm run dev
```

Open `http://localhost:3000`

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

Then open `http://localhost:3000`

Environment variables for production:

- `DATABASE_URL` (required)
- `JWT_SECRET` (required, min 16 chars)
- `RENDER_CONCURRENCY` (optional, default `1`)

### Vercel

You can deploy the app UI + APIs to Vercel, but note the platform function execution limits:

- On Hobby, Vercel Functions can be configured up to `300s`. Pro and Enterprise can go higher. [Vercel docs](https://vercel.com/docs/functions/limitations/) [Duration config](https://vercel.com/docs/functions/configuring-functions/duration)
- The maximum uncompressed bundle size per function is `250 MB`. [Vercel function limits](https://vercel.com/docs/functions/limitations/)

Steps:

1. Import the GitHub repo in Vercel
2. Set project env vars:

```text
DATABASE_URL=<your-pooled-neon-connection-string>
JWT_SECRET=<strong-random-secret>
RENDER_CONCURRENCY=1
```

3. Deploy
4. Verify health at `/api/health`

Render endpoint notes:

- `/api/render` runs server-side FFmpeg + native canvas; large dependencies may hit the `250MB` function limit. If that happens, set `VERCEL_ANALYZE_BUILD_OUTPUT=1` and redeploy to inspect function size.
- For long renders, you may eventually want to offload rendering to a separate worker service instead of keeping it inline in the request/response path.
