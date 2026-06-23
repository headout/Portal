"""Stage 4 — export & deliver: checkpoint → SH3 `.ply` → prune → `.ksplat`.

- `export_ply.py` converts the gsplat `.pt` checkpoint to a standard SH3 `.ply`.
- a low-opacity prune drops near-invisible floaters.
- `ply2ksplat.mjs` compresses to `.ksplat` (~3×, SH preserved) for browser streaming.
"""
from __future__ import annotations

import os
import shutil
import subprocess

from ._run import log, sh
from .config import PipelineConfig

_SCRIPTS = os.path.join(os.path.dirname(os.path.dirname(__file__)), "scripts")


def export_outputs(ckpt: str, out_dir: str, cfg: PipelineConfig) -> dict:
    ply_dir = os.path.join(out_dir, "ply")
    os.makedirs(ply_dir, exist_ok=True)
    full_ply = os.path.join(ply_dir, "splat_full.ply")
    splat_ply = os.path.join(ply_dir, "splat.ply")

    # 1) checkpoint → SH3 .ply
    sh(["python", os.path.join(_SCRIPTS, "export_ply.py"), "--ckpt", ckpt, "--out", full_ply])

    # 2) prune low-opacity floaters (best-effort; falls back to the full .ply)
    if not _prune_ply(full_ply, splat_ply, cfg.alpha_prune):
        shutil.copy(full_ply, splat_ply)

    result = {"ply": splat_ply, "ksplat": None}

    # 3) compress to .ksplat for the web (best-effort — needs node + @mkkellogg)
    if cfg.make_ksplat:
        ksplat = os.path.join(ply_dir, "splat.ksplat")
        try:
            sh(["node", "--max-old-space-size=8192",
                os.path.join(_SCRIPTS, "ply2ksplat.mjs"),
                splat_ply, ksplat, str(cfg.ksplat_compression), str(cfg.sh_degree)])
            result["ksplat"] = ksplat
        except Exception as e:  # noqa: BLE001
            log.warning("export: .ksplat skipped (%s) — .ply is still produced", e)

    log.info("export: %s%s", splat_ply, f" + {result['ksplat']}" if result["ksplat"] else "")
    return result


def _prune_ply(src: str, dst: str, alpha: float) -> bool:
    """Drop Gaussians whose opacity (sigmoid of the logit field) is below `alpha`."""
    try:
        import numpy as np
        from plyfile import PlyData, PlyElement
        ply = PlyData.read(src)
        v = ply["vertex"].data
        keep = 1.0 / (1.0 + np.exp(-v["opacity"])) >= alpha
        kept, total = int(keep.sum()), len(v)
        PlyData([PlyElement.describe(v[keep], "vertex")], text=False).write(dst)
        log.info("export: pruned %d → %d Gaussians (alpha<%.3f dropped)", total, kept, alpha)
        return True
    except Exception as e:  # noqa: BLE001
        log.warning("export: prune skipped (%s)", e)
        return False


def ply_vertex_count(ply_path: str) -> int | None:
    """Gaussian count from a binary PLY header (a quick QA metric)."""
    try:
        with open(ply_path, "rb") as f:
            for _ in range(60):
                line = f.readline().decode("ascii", "replace")
                if line.startswith("element vertex"):
                    return int(line.split()[-1])
                if line.startswith("end_header"):
                    break
    except Exception:
        pass
    return None
