#!/usr/bin/env python3
"""Export a gsplat checkpoint (.pt) -> standard 3DGS .ply (SuperSplat-readable).

gsplat saves a torch checkpoint in <result_dir>/ckpts/ (e.g. ckpt_29999_rank0.pt),
NOT a .ply (the ply/ folder is usually empty). This converts it.

Auto-detects the two checkpoint layouts:
  - full SH (sh0/shN)  -> proper SH3 .ply  (trained WITHOUT --app_opt)
  - flat color (colors) -> degree-0 .ply   (trained WITH --app_opt; lower quality)

Usage:
  python export_ply.py --ckpt /workspace/out/ckpts/ckpt_29999_rank0.pt --out /workspace/out/splat.ply
"""
import argparse, numpy as np, torch
from plyfile import PlyData, PlyElement

C0 = 0.28209479177387814  # SH degree-0 constant


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--ckpt", required=True)
    ap.add_argument("--out", required=True)
    a = ap.parse_args()

    ck = torch.load(a.ckpt, map_location="cpu")
    s = ck["splats"] if "splats" in ck else ck
    print("KEYS:", {k: tuple(v.shape) for k, v in s.items()})

    g = lambda k: s[k].float().cpu().numpy()
    means, scales, quats = g("means"), g("scales"), g("quats")
    opac = g("opacities").reshape(-1, 1)
    N = means.shape[0]

    if "sh0" in s and "shN" in s:                          # full-SH checkpoint (no app_opt)
        sh0, shN = g("sh0"), g("shN")
        f_dc   = sh0.reshape(N, -1)                        # [N,3]
        f_rest = shN.transpose(0, 2, 1).reshape(N, -1)     # [N,3*K] channel-major (INRIA layout)
        mode = f"SH3 ({shN.shape[1]} rest coeffs/channel)"
    elif "colors" in s:                                     # flat-color (app_opt) checkpoint
        colors = g("colors")
        if colors.min() < 0 or colors.max() > 1:
            colors = 1.0 / (1.0 + np.exp(-colors))         # sigmoid if logits
        f_dc   = (colors - 0.5) / C0
        f_rest = np.zeros((N, 0), np.float32)
        mode = "flat color (degree-0) -- trained with --app_opt; retrain w/o it for SH3"
    else:
        raise SystemExit(f"Unrecognized color keys; have: {list(s.keys())}")

    normals = np.zeros((N, 3), np.float32)
    names = (['x', 'y', 'z', 'nx', 'ny', 'nz']
             + [f'f_dc_{i}'   for i in range(f_dc.shape[1])]
             + [f'f_rest_{i}' for i in range(f_rest.shape[1])]
             + ['opacity']
             + [f'scale_{i}'  for i in range(scales.shape[1])]
             + [f'rot_{i}'    for i in range(quats.shape[1])])
    data = np.concatenate([means, normals, f_dc, f_rest, opac, scales, quats], 1).astype(np.float32)
    el = np.empty(N, dtype=[(n, 'f4') for n in names])
    for i, n in enumerate(names):
        el[n] = data[:, i]
    PlyData([PlyElement.describe(el, 'vertex')]).write(a.out)
    print(f"WROTE {a.out} | {N} gaussians | mode: {mode}")


if __name__ == "__main__":
    main()
