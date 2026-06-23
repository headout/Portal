"""Stage 1 — frame extraction.

Accepts up to 4K video. Samples `target_frames` **uniformly** across the clip and
downscales the long side to `frame_long_side` (default 1920).

Why uniform (not "smart" motion-gated) sampling: motion-gating thins frame-to-frame
overlap, which fragments SfM into disconnected sub-models. Dense uniform frames on a
continuous capture register into ONE model.
"""
from __future__ import annotations

import json
import os
import subprocess

from ._run import log, sh
from .config import PipelineConfig


def _probe_nframes(video: str, ffmpeg_bin: str) -> int:
    """Best-effort total frame count via the ffprobe sibling of ffmpeg."""
    ffprobe = ffmpeg_bin.replace("ffmpeg", "ffprobe")
    try:
        out = subprocess.run(
            [ffprobe, "-v", "error", "-select_streams", "v:0",
             "-count_frames", "-show_entries", "stream=nb_read_frames",
             "-of", "json", video],
            capture_output=True, text=True, timeout=600,
        )
        return int(json.loads(out.stdout)["streams"][0]["nb_read_frames"])
    except Exception:
        return 0


def extract_frames(video: str, out_dir: str, cfg: PipelineConfig) -> str:
    """Write `<out_dir>/images/*.png` and return the images directory."""
    if not os.path.exists(video):
        raise FileNotFoundError(video)
    images = os.path.join(out_dir, "images")
    os.makedirs(images, exist_ok=True)

    total = _probe_nframes(video, cfg.ffmpeg_bin)
    step = max(1, total // cfg.target_frames) if total else 1
    log.info("frames: ~%d total → every %d → ≈%d frames @≤%dpx",
             total, step, (total // step if total else cfg.target_frames), cfg.frame_long_side)

    # select every `step`-th frame; scale long side to frame_long_side (no upscatch on <1920)
    L = cfg.frame_long_side
    vf = (f"select='not(mod(n\\,{step}))',"
          f"scale='if(gt(iw,ih),min({L},iw),-2)':'if(gt(iw,ih),-2,min({L},ih))'")
    sh([cfg.ffmpeg_bin, "-y", "-i", video, "-vf", vf, "-vsync", "vfr",
        "-qscale:v", "2", os.path.join(images, "frame_%05d.png")])

    n = len([f for f in os.listdir(images) if f.endswith(".png")])
    if n < 50:
        raise RuntimeError(
            f"only {n} frames extracted — clip too short, or the upload is truncated "
            f"(verify with `ffmpeg -i {video}`)")
    log.info("frames: wrote %d images → %s", n, images)
    return images
