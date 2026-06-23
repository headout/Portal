"""The Portal pipeline — one call, four stages.

    video → frames (ffmpeg) → SfM (hloc + GLOMAP) → train (gsplat MCMC) → export (.ply/.ksplat)

    from portal import run, PipelineConfig
    result = run("venue.mp4", "out/venue")
    # -> {"ply": ".../splat.ply", "ksplat": ".../splat.ksplat", "report": {...}}
"""
from __future__ import annotations

import os
import time

from ._run import log
from .config import PipelineConfig
from .export import export_outputs
from .frames import extract_frames
from .quality import build_report
from .sfm import run_sfm
from .train import train


def run(video: str, out_dir: str, cfg: PipelineConfig | None = None) -> dict:
    cfg = (cfg or PipelineConfig()).validate()
    os.makedirs(out_dir, exist_ok=True)
    timings: dict[str, float] = {}

    def _stage(name, fn, *a):
        t0 = time.time()
        log.info("── %s ──", name)
        r = fn(*a)
        timings[name] = time.time() - t0
        return r

    _stage("frames", extract_frames, video, out_dir, cfg)
    data_dir = _stage("sfm", run_sfm, out_dir, cfg)
    ckpt = _stage("train", train, data_dir, out_dir, cfg)
    result = _stage("export", export_outputs, ckpt, out_dir, cfg)

    report = build_report(out_dir, result, timings)
    result["report"] = report
    log.info("done in %.0fs · %s Gaussians · %s cameras",
             sum(timings.values()), report.get("num_gaussians"),
             report.get("cameras_registered"))
    return result
