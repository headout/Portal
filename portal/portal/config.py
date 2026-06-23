"""Pipeline configuration — one dataclass, sensible defaults, every stage tunable.

Defaults are the recipe that, on a well-captured 4K clip, produced our reference splat.
They generalize: we do **not** tune per-video thresholds.
"""
from __future__ import annotations

import os
from dataclasses import dataclass, field


@dataclass
class PipelineConfig:
    # ── Frame extraction ────────────────────────────────────────────────────
    target_frames: int = 600          # uniformly-sampled frames fed to SfM
    frame_long_side: int = 1920       # downscale long side; INPUT may be up to 4K
    # We capture 4K but work at ~1920: SfM/training cost scales with pixels and the
    # Gaussian budget (not input pixels) is the real detail ceiling. A 4K→1920 frame
    # is still sharper/cleaner than native 1080p.

    # ── Structure-from-Motion (hloc → GLOMAP) ───────────────────────────────
    retrieval: str = "eigenplaces"    # global descriptor for image-pair retrieval
    feature: str = "aliked-n16"       # learned local features (beats SIFT on hard light)
    matcher: str = "aliked+lightglue" # learned matcher
    num_matched: int = 32             # retrieved pairs per image (more = more loop closures)
    align_gravity: bool = True        # orientation-align so "up" is up (for seat eye-height)

    # ── Gaussian-Splat training (gsplat MCMC) ───────────────────────────────
    sh_degree: int = 3                # view-dependent colour (sheen/reflections)
    max_gaussians: int = 1_000_000    # MCMC fixed budget → bounded file size for the web
    max_steps: int = 30_000
    use_bilateral_grid: bool = True   # per-image exposure correction — EXPORTABLE (not app_opt)
    data_factor: int = 1              # train at full (already-downscaled) resolution

    # ── Export / delivery ───────────────────────────────────────────────────
    alpha_prune: float = 0.005        # drop near-invisible Gaussians (floaters) before export
    make_ksplat: bool = True          # compress .ply → .ksplat for browser streaming (~3×)
    ksplat_compression: int = 1       # 0 lossless · 1 16-bit near-lossless · 2 smaller

    # ── Tool locations (overridable via env for the GPU image) ──────────────
    gsplat_trainer: str = field(
        default_factory=lambda: os.environ.get(
            "GSPLAT_TRAINER", "/opt/gsplat/examples/simple_trainer.py"
        )
    )
    glomap_bin: str = field(default_factory=lambda: os.environ.get("GLOMAP_BIN", "glomap"))
    colmap_bin: str = field(default_factory=lambda: os.environ.get("COLMAP_BIN", "colmap"))
    ffmpeg_bin: str = field(default_factory=lambda: os.environ.get("FFMPEG_BIN", "ffmpeg"))

    def validate(self) -> "PipelineConfig":
        if self.target_frames < 50:
            raise ValueError("target_frames < 50 is too few for a stable reconstruction")
        if self.sh_degree not in (0, 1, 2, 3):
            raise ValueError("sh_degree must be 0–3")
        return self
