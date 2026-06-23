"""Stage 3 — train the splat: gsplat MCMC + exportable bilateral grid.

MCMC keeps a **fixed Gaussian budget** (bounded web file size) and makes far fewer
floaters than vanilla adaptive-density 3DGS. The bilateral grid corrects per-frame
exposure/white-balance drift and — unlike an appearance MLP (`--app_opt`) — bakes into
real SH coefficients, so the exported `.ply` keeps view-dependent colour.

Returns the path to the trained checkpoint (`<out>/train/ckpts/ckpt_*.pt`).
"""
from __future__ import annotations

import glob
import os
import re
import sys

from ._run import log, sh
from .config import PipelineConfig


def train(data_dir: str, out_dir: str, cfg: PipelineConfig) -> str:
    result_dir = os.path.join(out_dir, "train")
    cmd = [
        sys.executable, cfg.gsplat_trainer, "mcmc",
        "--data_dir", data_dir,
        "--data-factor", str(cfg.data_factor),
        "--result_dir", result_dir,
        "--max-steps", str(cfg.max_steps),
        "--sh-degree", str(cfg.sh_degree),
        "--strategy.cap-max", str(cfg.max_gaussians),
        "--disable_viewer",
    ]
    if cfg.use_bilateral_grid:
        cmd.append("--use_bilateral_grid")  # exportable exposure correction

    # the trainer is examples/simple_trainer.py — its repo root must be importable
    repo_root = os.path.dirname(os.path.dirname(cfg.gsplat_trainer))
    env = {**os.environ, "PYTHONPATH": repo_root + os.pathsep + os.environ.get("PYTHONPATH", "")}

    log.info("train: gsplat MCMC · %d steps · ≤%d Gaussians · SH%d · bilateral_grid=%s",
             cfg.max_steps, cfg.max_gaussians, cfg.sh_degree, cfg.use_bilateral_grid)
    sh(cmd, env=env)

    ckpt = _latest_ckpt(result_dir)
    if not ckpt:
        raise RuntimeError(f"training produced no checkpoint under {result_dir}/ckpts")
    log.info("train: checkpoint → %s", ckpt)
    return ckpt


def _latest_ckpt(result_dir: str) -> str | None:
    ckpts = glob.glob(os.path.join(result_dir, "ckpts", "ckpt_*.pt"))
    if not ckpts:
        return None
    return max(ckpts, key=lambda p: int(re.search(r"ckpt_(\d+)", p).group(1)))
