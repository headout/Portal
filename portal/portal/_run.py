"""Small shared helpers: logging + checked subprocess with streamed output."""
from __future__ import annotations

import logging
import subprocess
import sys
import time

log = logging.getLogger("portal")
if not log.handlers:
    _h = logging.StreamHandler(sys.stdout)
    _h.setFormatter(logging.Formatter("[portal %(levelname)s] %(message)s"))
    log.addHandler(_h)
    log.setLevel(logging.INFO)


def sh(cmd: list[str], *, cwd: str | None = None, env: dict | None = None) -> None:
    """Run a command, stream its output, raise on non-zero exit.

    Note: GLOMAP/COLMAP log progress to **stderr** via glog — that is not an error.
    Watch for `N / M images are within the connected component` as the success signal.
    """
    printable = " ".join(cmd)
    log.info("$ %s", printable if len(printable) < 400 else printable[:400] + " …")
    t0 = time.time()
    proc = subprocess.run(cmd, cwd=cwd, env=env)
    if proc.returncode != 0:
        raise RuntimeError(f"command failed ({proc.returncode}): {printable[:400]}")
    log.info("  ✓ %.1fs", time.time() - t0)
