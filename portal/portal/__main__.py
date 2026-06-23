"""CLI:  python -m portal --video venue.mp4 --out out/venue [--frames 800] ...

Runs the full video → splat pipeline. Requires the GPU toolchain (GLOMAP, gsplat,
hloc) on PATH — use the worker image (worker/Dockerfile).
"""
from __future__ import annotations

import argparse
import json

from .config import PipelineConfig
from .pipeline import run


def main() -> None:
    p = argparse.ArgumentParser("portal", description="video → 3D Gaussian Splat")
    p.add_argument("--video", required=True, help="input video (up to 4K)")
    p.add_argument("--out", required=True, help="output directory")
    p.add_argument("--frames", type=int, help="target frame count (default 600)")
    p.add_argument("--max-gaussians", type=int, help="MCMC Gaussian budget (default 1,000,000)")
    p.add_argument("--steps", type=int, help="training steps (default 30000)")
    p.add_argument("--sh-degree", type=int, choices=[0, 1, 2, 3], help="SH degree (default 3)")
    p.add_argument("--no-ksplat", action="store_true", help="skip .ksplat compression")
    p.add_argument("--no-bilateral-grid", action="store_true", help="disable exposure correction")
    a = p.parse_args()

    cfg = PipelineConfig()
    if a.frames: cfg.target_frames = a.frames
    if a.max_gaussians: cfg.max_gaussians = a.max_gaussians
    if a.steps: cfg.max_steps = a.steps
    if a.sh_degree is not None: cfg.sh_degree = a.sh_degree
    if a.no_ksplat: cfg.make_ksplat = False
    if a.no_bilateral_grid: cfg.use_bilateral_grid = False

    result = run(a.video, a.out, cfg)
    print(json.dumps(result.get("report", {}), indent=2))


if __name__ == "__main__":
    main()
