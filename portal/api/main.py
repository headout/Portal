"""Portal API — submit videos, poll status, store seat presets.

Run locally:  uvicorn main:app --reload
Flow:
  1. POST /scenes            -> {scene_id, upload_url}   (browser PUTs the video to upload_url)
  2. POST /scenes/{id}/start -> submits a RunPod Serverless job (passes a presigned GET url)
  3. GET  /scenes/{id}       -> proxies RunPod status; on COMPLETED returns the scene manifest
  4. PUT/GET /scenes/{id}/seats -> per-venue seat -> camera-pose presets

State here is an in-memory dict for the scaffold. Swap `SCENES` for Postgres/SQLite
for anything real.
"""
import uuid

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

import runpod_client
import storage

app = FastAPI(title="Portal API", version="0.1")

# scene_id -> {runpod_job_id, video_key, seats}
SCENES: dict[str, dict] = {}


class StartBody(BaseModel):
    training_num_steps: int = 30000
    max_gaussians: int = 1_000_000
    target_framecount: int = 600
    make_sog: bool = False


class SeatPreset(BaseModel):
    position: list[float]
    target: list[float]
    fov: float = 55.0


@app.post("/scenes")
def create_scene():
    """Allocate a scene id and a presigned URL to upload the raw video to."""
    scene_id = uuid.uuid4().hex[:12]
    video_key = f"videos/{scene_id}.mp4"
    SCENES[scene_id] = {"runpod_job_id": None, "video_key": video_key, "seats": {}}
    return {"scene_id": scene_id, "upload_url": storage.presign_put(video_key)}


@app.post("/scenes/{scene_id}/start")
def start_scene(scene_id: str, body: StartBody):
    """Kick off the GPU job once the video has been uploaded."""
    scene = _get(scene_id)
    job_input = {
        "scene_id": scene_id,
        "video_url": storage.presign_get(scene["video_key"], expires=6 * 3600),
        "training_num_steps": body.training_num_steps,
        "max_gaussians": body.max_gaussians,
        "target_framecount": body.target_framecount,
        "make_sog": body.make_sog,
        # reconstruction_method is intentionally NOT exposed — GLOMAP only (G1).
    }
    scene["runpod_job_id"] = runpod_client.submit(job_input)
    return {"scene_id": scene_id, "status": "submitted", "job_id": scene["runpod_job_id"]}


@app.get("/scenes/{scene_id}")
def get_scene(scene_id: str):
    """Poll status; on completion return the scene manifest (splat urls + seats)."""
    scene = _get(scene_id)
    if not scene["runpod_job_id"]:
        return {"scene_id": scene_id, "status": "awaiting_upload"}
    st = runpod_client.status(scene["runpod_job_id"])
    resp = {"scene_id": scene_id, "status": st.get("status")}
    if st.get("status") == "COMPLETED":
        out = (st.get("output") or {})
        resp["outputs"] = out.get("outputs")
        resp["num_gaussians"] = out.get("num_gaussians")
        resp["seats"] = scene["seats"]
    elif st.get("status") == "FAILED":
        resp["error"] = st.get("output") or st.get("error")
    return resp


@app.put("/scenes/{scene_id}/seats")
def put_seats(scene_id: str, seats: dict[str, SeatPreset]):
    scene = _get(scene_id)
    scene["seats"] = {k: v.model_dump() for k, v in seats.items()}
    return {"ok": True, "count": len(scene["seats"])}


@app.get("/scenes/{scene_id}/seats")
def get_seats(scene_id: str):
    return _get(scene_id)["seats"]


def _get(scene_id: str) -> dict:
    scene = SCENES.get(scene_id)
    if not scene:
        raise HTTPException(404, "unknown scene_id")
    return scene
