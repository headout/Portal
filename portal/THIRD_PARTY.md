# Third-party tools

Portal's reconstruction is an original orchestration over the following open-source projects.
We depend on them as tools (installed in the worker image); their code is not vendored here, and
each retains its own license. For a research write-up, cite the corresponding papers.

| Tool | Role in Portal | License |
|------|----------------|---------|
| [GLOMAP](https://github.com/colmap/glomap) | global Structure-from-Motion (poses + sparse cloud) | BSD-3-Clause |
| [COLMAP](https://colmap.github.io/) | database + model utilities, orientation alignment | BSD-3-Clause |
| [gsplat](https://github.com/nerfstudio-project/gsplat) | Gaussian-Splat training (MCMC, bilateral grid) | Apache-2.0 |
| [hloc — Hierarchical-Localization](https://github.com/cvg/Hierarchical-Localization) | retrieval + feature extraction/matching glue | Apache-2.0 |
| [ALIKED](https://github.com/Shiaoming/ALIKED) | learned local features | BSD-3-Clause |
| [LightGlue](https://github.com/cvg/LightGlue) | learned feature matcher | Apache-2.0 |
| [@mkkellogg/gaussian-splats-3d](https://github.com/mkkellogg/GaussianSplats3D) | `.ply` → `.ksplat` compression + reference WebGL renderer | MIT |
| [FFmpeg](https://ffmpeg.org/) | frame extraction / transcoding | LGPL/GPL |

