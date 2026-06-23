# eval/ — evaluation harness

Quantifies splat quality and capture quality, scene-by-scene. This is the empirical backbone for
the research write-up and the production A/B (does a Portal preview lift conversion?).

## Metrics

- **Held-out novel-view fidelity:** train on a frame subset, render the held-out frames, report
  **PSNR / SSIM / LPIPS** (LPIPS correlates best with human perception — weight it).
- **Reconstruction health** (from each scene's `quality_report.json`): cameras registered vs. dropped,
  points triangulated, Gaussian count, per-stage timings.
- **Capture-quality diagnostics:** parallax / overlap, sharpness (Laplacian variance, resolution-
  normalized), exposure spread — to predict failures *before* training.

## Benchmark axes

Span the hard cases, one scene per axis, each with a baseline (e.g. KIRI Engine):
featureless walls · glass / reflective · low-parallax · linear walk (street-view) · seat-POV venue.

