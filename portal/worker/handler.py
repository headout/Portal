"""RunPod Serverless entrypoint for the Portal video → splat pipeline.

Local test (uses test_input.json automatically):
    python handler.py
Job input (job["input"]):
    {
      "scene_id": "venue-01",                 # optional; defaults to runpod job id
      "video_url": "https://<presigned GET>", # required (never base64 the video)
      "target_framecount": 600,               # optional
      "max_gaussians": 1000000,               # optional
      "training_num_steps": 30000             # optional
    }
Returns:
    {"scene_id", "status":"done", "outputs":{"ply_url","ksplat_url"?}, "num_gaussians", "report"}
"""
import os
import tempfile
import traceback

import runpod

from portal import PipelineConfig, run
from portal.export import ply_vertex_count
from storage import download_to, upload_file


def handler(job):
    inp = job.get("input") or {}
    scene_id = inp.get("scene_id") or job.get("id") or "scene"
    video_url = inp.get("video_url")
    if not video_url:
        return {"error": "missing 'video_url' (presigned GET URL to the input video)"}

    work = tempfile.mkdtemp(prefix="portal_")
    try:
        video_path = os.path.join(work, "input.mp4")
        download_to(video_url, video_path)

        cfg = PipelineConfig()
        if inp.get("target_framecount"):
            cfg.target_frames = int(inp["target_framecount"])
        if inp.get("max_gaussians"):
            cfg.max_gaussians = int(inp["max_gaussians"])
        if inp.get("training_num_steps"):
            cfg.max_steps = int(inp["training_num_steps"])

        result = run(video_path, os.path.join(work, "out"), cfg)

        outputs = {"ply_url": upload_file(result["ply"], f"scenes/{scene_id}/splat.ply")}
        if result.get("ksplat"):
            outputs["ksplat_url"] = upload_file(result["ksplat"], f"scenes/{scene_id}/splat.ksplat")

        return {
            "scene_id": scene_id,
            "status": "done",
            "outputs": outputs,
            "num_gaussians": ply_vertex_count(result["ply"]),
            "report": result.get("report"),
        }
    except Exception as e:  # surface the traceback to the job result for debugging
        return {"scene_id": scene_id, "status": "error",
                "error": str(e), "traceback": traceback.format_exc()}


runpod.serverless.start({"handler": handler})
