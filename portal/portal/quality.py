"""Quality report — one JSON per scene: did it reconstruct, how big, how long.

This is the basis of the evaluation harness: cameras registered, points triangulated,
Gaussian count, and per-stage timings. (Held-out PSNR/SSIM/LPIPS belong in `eval/`.)
"""
from __future__ import annotations

import json
import os

from .export import ply_vertex_count


def _sparse_stats(out_dir: str) -> dict:
    model = os.path.join(out_dir, "sparse", "0")
    try:
        import pycolmap
        rec = pycolmap.Reconstruction(model)
        return {"cameras_registered": rec.num_reg_images(), "points_3d": rec.num_points3D()}
    except Exception:
        return {"cameras_registered": None, "points_3d": None}


def build_report(out_dir: str, result: dict, timings: dict) -> dict:
    images = os.path.join(out_dir, "images")
    n_frames = len([f for f in os.listdir(images) if f.endswith(".png")]) \
        if os.path.isdir(images) else None

    report = {
        "frames": n_frames,
        **_sparse_stats(out_dir),
        "num_gaussians": ply_vertex_count(result.get("ply")) if result.get("ply") else None,
        "outputs": {k: os.path.basename(v) for k, v in result.items() if v},
        "timings_sec": {k: round(v, 1) for k, v in timings.items()},
    }
    with open(os.path.join(out_dir, "quality_report.json"), "w") as f:
        json.dump(report, f, indent=2)
    return report
