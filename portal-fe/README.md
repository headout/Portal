# portal-fe

One-page research/landing site for **Portal** — the video → 3D Gaussian Splat service.
Next.js (App Router) + Tailwind + Framer Motion, configured for **static export** so the
`out/` folder drops straight onto **S3 + CloudFront**.

## Run

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # static export -> ./out
npm run preview    # serve the exported ./out locally
```

## Deploy (CloudFront)

`npm run build` writes a fully static site to `out/`. Upload `out/` to your S3 bucket and
point CloudFront at it. No server, no Node runtime needed.

## Media

All demo assets live in `public/media/` (git-ignored because they're large):

| File          | Section            | Source                          |
| ------------- | ------------------ | ------------------------------- |
| `input.mp4`   | hero (input video) | `final.mov` (tonemapped 4K→SDR) |
| `splat.mp4`   | hero (splat)       | `traj_29999.mp4` fly-through    |
| `seat.mp4`    | use case 1         | `audi_demo.MOV`                 |
| `object.mp4`  | use case 2         | `sculpture.mov`                 |
| `walk.mp4`    | use case 3         | `lane.mov`                      |
| `*.jpg`       | posters            | first-frame stills              |
| `kiri.jpg`    | benchmark (KIRI)   | **drop your KIRI screenshot**   |
| `portal.jpg`  | benchmark (ours)   | **drop your splat screenshot**  |

`kiri.jpg` / `portal.jpg` show a styled "drop file here" placeholder until you add them.
Regenerate the videos with `scripts/build_media.sh`.

## Converting a splat (`.ply` → `.ksplat`)

The hero viewer streams a `.ksplat` from R2. To make one from a 3DGS `.ply` (smaller +
faster to load, view-dependent color preserved), use the converter at the **project root**
(`../scripts/ply2ksplat.mjs`) — it reuses this project's `@mkkellogg/gaussian-splats-3d`
parser. Run it from the project root:

```bash
node --max-old-space-size=8192 scripts/ply2ksplat.mjs <in.ply> <out.ksplat> [compression=1] [shDegree=2] [alpha=1]

# what produced our hero splat (156 MB .ply -> 55 MB .ksplat):
node --max-old-space-size=8192 scripts/ply2ksplat.mjs splat_vs.ply splat_vs.ksplat 1 2
```

- `compression`: `0` lossless float32 · `1` 16-bit near-lossless (default) · `2` smaller, mild loss
- `shDegree`: SH degree to keep — match your `.ply` (45 `f_rest` props = 3, 24 = 2, 9 = 1, 0 = flat)
- `alpha`: drop splats with opacity ≤ this (default `1`, prunes near-invisible ones)

Then upload the `.ksplat` to R2 and point `NEXT_PUBLIC_SPLAT_URL` (in `.env.local`) at it.
