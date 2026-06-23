# Portal GPU worker for RunPod Serverless.
# Builds the pipeline toolchain (GLOMAP + gsplat + hloc) from each tool's own repo,
# then installs the `portal` package. Build context = repo root:
#   docker build -f worker/Dockerfile --build-arg TORCH_CUDA_ARCH_LIST="8.9" -t $REG/portal-worker:0.2 .
FROM pytorch/pytorch:2.5.1-cuda12.4-cudnn9-devel

# ── system libs: COLMAP/GLOMAP/Ceres build deps + ffmpeg + node toolchain ──
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential wget curl git ffmpeg cmake ninja-build colmap \
        libboost-program-options-dev libboost-graph-dev libboost-system-dev \
        libeigen3-dev libflann-dev libfreeimage-dev libmetis-dev libgoogle-glog-dev \
        libgtest-dev libgmock-dev libsqlite3-dev libglew-dev qtbase5-dev \
        libqt5opengl5-dev libcgal-dev libceres-dev libwebp-dev pkg-config && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# cmake >= 3.31 (required by GLOMAP)
RUN wget -q https://github.com/Kitware/CMake/releases/download/v3.31.0/cmake-3.31.0-linux-x86_64.sh && \
    chmod +x cmake-3.31.0-linux-x86_64.sh && \
    ./cmake-3.31.0-linux-x86_64.sh --skip-license --prefix=/usr/local && rm cmake-3.31.0-linux-x86_64.sh

# Node 20 — for the .ply → .ksplat web compression
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && apt-get clean && rm -rf /var/lib/apt/lists/*

# GPU arch — MUST include your serverless GPU. 8.0=A100 · 8.6=A40 · 8.9=L40S/4090 · 9.0=H100
ARG TORCH_CUDA_ARCH_LIST="8.0;8.6;8.9"
ENV TORCH_CUDA_ARCH_LIST=${TORCH_CUDA_ARCH_LIST}

# ── GLOMAP (global SfM) — built against the system Ceres/SuiteSparse ──
RUN git clone --recursive https://github.com/colmap/glomap /opt/glomap && \
    cd /opt/glomap && mkdir build && cd build && \
    cmake .. -GNinja -DCMAKE_CUDA_ARCHITECTURES=80 && ninja && ninja install
ENV GLOMAP_BIN=/usr/local/bin/glomap COLMAP_BIN=/usr/bin/colmap

# ── gsplat (Gaussian-Splat trainer) ──
RUN git clone --recursive https://github.com/nerfstudio-project/gsplat /opt/gsplat && \
    cd /opt/gsplat && pip install . --no-build-isolation && \
    pip install -r examples/requirements.txt --no-build-isolation && \
    pip install git+https://github.com/rahul-goel/fused-ssim --no-build-isolation
ENV GSPLAT_TRAINER=/opt/gsplat/examples/simple_trainer.py

# ── hloc (learned retrieval + ALIKED + LightGlue) + pycolmap ──
RUN git clone --recursive https://github.com/cvg/Hierarchical-Localization /opt/hloc && \
    cd /opt/hloc && pip install -e . && \
    pip install pycolmap-cuda12==3.13.0 --no-deps && pip install plyfile

# ── the Portal package + serverless deps ──
COPY pyproject.toml /app/portal/pyproject.toml
COPY portal /app/portal/portal
COPY scripts /app/portal/scripts
RUN cd /app/portal && pip install -e . && pip install runpod boto3 && \
    cd scripts && npm install

COPY worker /app/portal/worker
WORKDIR /app/portal/worker
ENV PYTHONPATH=/app/portal
CMD ["python", "-u", "handler.py"]
