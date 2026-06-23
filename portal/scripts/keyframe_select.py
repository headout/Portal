#!/usr/bin/env python3
"""
keyframe_select.py — extract sharp, well-distributed keyframes from a video for SfM / 3DGS.

Two-stage selection, far better viewpoint coverage than uniform-by-time sampling:
  1. Sharpness gate — drop the blurriest frames (variance of Laplacian).
  2. Motion gate    — greedily keep a frame only when it has moved enough from the last
                      kept frame (mean abs-diff on a downscaled gray image). This skips
                      standing-still / near-duplicate frames, so spacing tracks *viewpoint*
                      change rather than wall-clock time. The motion threshold is
                      auto-tuned (binary search) to land near the target frame count.

Usage:
  python keyframe_select.py --video room.mov --out scene/images --n 150 --fps 4
"""
import argparse, glob, os, shutil, subprocess, sys
import cv2
import numpy as np


def extract_frames(video, raw_dir, fps):
    os.makedirs(raw_dir, exist_ok=True)
    subprocess.run(
        ["ffmpeg", "-y", "-i", video, "-vf", f"fps={fps}", "-q:v", "2",
         os.path.join(raw_dir, "%05d.jpg")],
        check=True,
    )
    return sorted(glob.glob(os.path.join(raw_dir, "*.jpg")))


def sharpness(path):
    g = cv2.imread(path, cv2.IMREAD_GRAYSCALE)
    return cv2.Laplacian(g, cv2.CV_64F).var()


def small_gray(path, w=64):
    g = cv2.imread(path, cv2.IMREAD_GRAYSCALE)
    h = max(1, int(g.shape[0] * w / g.shape[1]))
    return cv2.resize(g, (w, h)).astype(np.int16)


def motion(a, b):
    return float(np.mean(np.abs(a - b)))


def select(frames, target, sharp_keep=0.7):
    scores = np.array([sharpness(p) for p in frames])
    thresh = np.quantile(scores, 1 - sharp_keep)                      # 1) sharpness gate
    candidates = [p for p, s in zip(frames, scores) if s >= thresh] or frames
    smalls = {p: small_gray(p) for p in candidates}                   # cache downscaled grays

    def run(mt):                                                      # 2) motion gate at threshold mt
        kept = [candidates[0]]; last = smalls[candidates[0]]
        for p in candidates[1:]:
            if motion(last, smalls[p]) >= mt:
                kept.append(p); last = smalls[p]
        return kept

    best = run(0.0); lo, hi = 0.0, 40.0                               # auto-tune mt -> ~target count
    for _ in range(18):
        mt = (lo + hi) / 2; kept = run(mt)
        lo, hi = (mt, hi) if len(kept) > target else (lo, mt)
        if abs(len(kept) - target) < abs(len(best) - target):
            best = kept
    if len(best) > target:                                           # trim evenly if still over
        idx = np.linspace(0, len(best) - 1, target).round().astype(int)
        best = [best[i] for i in idx]
    return best


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--video", required=True)
    ap.add_argument("--out", default="scene/images")
    ap.add_argument("--n", type=int, default=150)
    ap.add_argument("--fps", type=float, default=4.0)
    ap.add_argument("--raw", default=None, help="frame-dump dir (default: <out>/../_raw)")
    a = ap.parse_args()

    raw = a.raw or os.path.join(os.path.dirname(a.out.rstrip("/")) or ".", "_raw")
    os.makedirs(a.out, exist_ok=True)
    for f in glob.glob(os.path.join(a.out, "*.jpg")):
        os.remove(f)

    frames = extract_frames(a.video, raw, a.fps)
    if not frames:
        sys.exit("no frames extracted — check the video path / codec")
    kept = select(frames, a.n)
    for i, p in enumerate(kept):
        shutil.copy(p, os.path.join(a.out, f"{i:04d}.jpg"))
    print(f"extracted {len(frames)} candidates @ {a.fps}fps -> selected {len(kept)} keyframes into {a.out}")


if __name__ == "__main__":
    main()
