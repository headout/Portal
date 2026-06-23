"""Stage 2 — Structure-from-Motion: hloc (correspondence) → GLOMAP (global solve).

hloc answers *which pixel in image A is the same 3D point in image B* (retrieval +
ALIKED features + LightGlue matcher). GLOMAP turns those matches into camera poses +
a sparse point cloud, solving **all cameras jointly** (loop-robust, ~10× faster than
incremental SfM, doesn't fragment a walk-around).

Output layout (a gsplat-ready data dir):
    <out_dir>/images/        (from stage 1)
    <out_dir>/sparse/0/      cameras.bin · images.bin · points3D.bin
"""
from __future__ import annotations

import os
import shutil
from pathlib import Path

from ._run import log, sh
from .config import PipelineConfig


def _num_reg_images(model_dir: Path) -> int:
    try:
        import pycolmap
        return pycolmap.Reconstruction(str(model_dir)).num_reg_images()
    except Exception:
        return 0


def _largest_model(glomap_out: Path) -> Path:
    """GLOMAP writes one sub-model per connected component (0, 1, …); take the biggest."""
    models = sorted([d for d in glomap_out.iterdir() if d.is_dir() and (d / "images.bin").exists()])
    if not models:
        raise RuntimeError(
            "GLOMAP produced no reconstruction — capture likely lacks overlap/parallax "
            "(check that frames are dense + uniform, not motion-gated)")
    best = max(models, key=_num_reg_images)
    if len(models) > 1:
        log.info("sfm: %d sub-models; kept the largest (%d images) — the rest are disconnected",
                 len(models), _num_reg_images(best))
    return best


def run_sfm(out_dir: str, cfg: PipelineConfig) -> str:
    """Run hloc + GLOMAP; return the gsplat-ready data dir (== out_dir)."""
    from hloc import extract_features, match_features, pairs_from_retrieval, reconstruction
    import pycolmap

    image_dir = Path(out_dir) / "images"
    work = Path(out_dir) / "sfm"
    work.mkdir(parents=True, exist_ok=True)

    # 1) neural correspondences (hloc)
    log.info("sfm: hloc retrieval=%s features=%s matcher=%s (num_matched=%d)",
             cfg.retrieval, cfg.feature, cfg.matcher, cfg.num_matched)
    retrieval_conf = extract_features.confs[cfg.retrieval]
    feature_conf = extract_features.confs[cfg.feature]
    matcher_conf = match_features.confs[cfg.matcher]

    retrieval_path = extract_features.main(retrieval_conf, image_dir, work)
    pairs = work / "pairs-retrieval.txt"
    pairs_from_retrieval.main(retrieval_path, pairs, num_matched=cfg.num_matched)
    feature_path = extract_features.main(feature_conf, image_dir, work)
    match_path = match_features.main(matcher_conf, pairs, feature_conf["output"], work)

    # 2) import into a COLMAP database + geometric verification
    db = work / "database.db"
    if db.exists():
        db.unlink()
    reconstruction.create_empty_db(db)
    reconstruction.import_images(image_dir, db, pycolmap.CameraMode.SINGLE)
    image_ids = reconstruction.get_image_ids(db)
    reconstruction.import_features(image_ids, db, feature_path)
    reconstruction.import_matches(image_ids, db, pairs, match_path,
                                  min_match_score=None, skip_geometric_verification=False)
    reconstruction.estimation_and_geometric_verification(db, pairs)

    # 3) GLOMAP global solve
    glomap_out = work / "glomap"
    glomap_out.mkdir(exist_ok=True)
    sh([cfg.glomap_bin, "mapper",
        "--database_path", str(db),
        "--image_path", str(image_dir),
        "--output_path", str(glomap_out)])
    best = _largest_model(glomap_out)

    # 4) gravity-align ("up" is up) → <out>/sparse/0
    final = Path(out_dir) / "sparse" / "0"
    final.mkdir(parents=True, exist_ok=True)
    if cfg.align_gravity:
        try:
            sh([cfg.colmap_bin, "model_orientation_aligner",
                "--image_path", str(image_dir),
                "--input_path", str(best),
                "--output_path", str(final)])
        except RuntimeError:
            log.warning("sfm: orientation aligner failed — using unaligned model")
            _copy_model(best, final)
    else:
        _copy_model(best, final)

    n = _num_reg_images(final)
    log.info("sfm: %d images registered in one model → %s", n, final)
    return out_dir


def _copy_model(src: Path, dst: Path) -> None:
    for name in ("cameras.bin", "images.bin", "points3D.bin"):
        if (src / name).exists():
            shutil.copy(src / name, dst / name)
