"""Portal — turn a phone video of any space into a web-ready 3D Gaussian Splat.

The pipeline is a thin, original orchestration over best-in-class open tools:

    video → frames (ffmpeg) → SfM (hloc + GLOMAP) → train (gsplat MCMC) → export (.ply/.ksplat)

Public API:
    from portal import run, PipelineConfig
    result = run("venue.mp4", "out/venue", PipelineConfig(target_frames=800))
"""
from .config import PipelineConfig
from .pipeline import run

__all__ = ["PipelineConfig", "run"]
__version__ = "0.2.0"
