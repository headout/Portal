"""Minimal client for a RunPod Serverless endpoint (the GPU job queue)."""
import os

import requests

_API_KEY = os.environ["RUNPOD_API_KEY"]
_ENDPOINT_ID = os.environ["RUNPOD_ENDPOINT_ID"]
_BASE = f"https://api.runpod.ai/v2/{_ENDPOINT_ID}"
_HEADERS = {"Authorization": f"Bearer {_API_KEY}", "Content-Type": "application/json"}


def submit(job_input: dict) -> str:
    """Async submit (GOTCHA G8: training is minutes — never use /runsync). Returns job id."""
    r = requests.post(f"{_BASE}/run", headers=_HEADERS, json={"input": job_input}, timeout=30)
    r.raise_for_status()
    return r.json()["id"]


def status(job_id: str) -> dict:
    """Return {'status': IN_QUEUE|IN_PROGRESS|COMPLETED|FAILED, 'output': {...}?}."""
    r = requests.get(f"{_BASE}/status/{job_id}", headers=_HEADERS, timeout=30)
    r.raise_for_status()
    return r.json()


def cancel(job_id: str) -> dict:
    r = requests.post(f"{_BASE}/cancel/{job_id}", headers=_HEADERS, timeout=30)
    r.raise_for_status()
    return r.json()
