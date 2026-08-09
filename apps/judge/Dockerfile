# syntax=docker/dockerfile:1
#
# The judge runtime image: isolate + g++ (with precompiled headers) + node.
# ~650 MB final. The build stages below are discarded — without the split
# you'd ship the Go toolchain (~600 MB) and isolate's build deps for nothing.
#
# Build:  docker build -t litecode-judge:dev .
# Run:    docker run --rm --privileged --env-file .env litecode-judge:dev
#
# --privileged is required: isolate needs mount, pivot_root and cgroup access.

# ─────────────────────────── stage 1: Go binary ────────────────────────────
# Alpine rather than bookworm: this stage is discarded, so its only cost is
# ~550 MB of build cache on your disk. Safe here ONLY because CGO_ENABLED=0 —
# the output is a static binary with no libc dependency, so musl vs glibc is
# irrelevant. If you ever need cgo (e.g. libseccomp), switch back to bookworm,
# or you'll produce a musl-linked binary that won't run on the Debian runtime.
FROM golang:1.24-alpine AS gobuild
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/judge ./cmd/judge

# ────────────────────────── stage 2: build isolate ─────────────────────────
# There is no prebuilt package, and on Apple Silicon it has to compile for
# linux/arm64 anyway. It's a small C program, so this is quick.
FROM debian:bookworm-slim AS isolatebuild
# PINNED. 2.x is REQUIRED here, not preferred: isolate 1.x speaks cgroup v1
# only (it looks for /sys/fs/cgroup/memory/), and Docker Desktop's VM is
# cgroup v2 unified — there is no v1 hierarchy to find. 1.10.1 fails at
# --init with "Failed to create control group /sys/fs/cgroup/memory/box-0/".
#
# The cost of 2.x is setup: it wants libseccomp, a UID range, and a cgroup
# subtree someone else delegated to it. docker-entrypoint.sh does that job
# in place of the systemd unit + isolate-cg-keeper it normally relies on.
ARG ISOLATE_REF=v2.6
# ca-certificates is not optional: debian:*-slim ships without a CA bundle, so
# `git clone https://…` fails with "server certificate verification failed"
# rather than anything resembling a network error.
RUN apt-get update && apt-get install -y --no-install-recommends \
      git make gcc libc6-dev libcap-dev libseccomp-dev pkg-config \
      libsystemd-dev ca-certificates \
 && rm -rf /var/lib/apt/lists/*
RUN git clone --depth 1 --branch ${ISOLATE_REF} https://github.com/ioi/isolate /isolate \
 && make -C /isolate isolate

# ───────────────────────── stage 3: fetch C++ headers ──────────────────────
FROM debian:bookworm-slim AS headers
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
RUN mkdir -p /out && curl -fsSL \
      -o /out/json.hpp \
      https://github.com/nlohmann/json/releases/download/v3.11.3/json.hpp

# ──────────────────────────── stage 4: runtime ─────────────────────────────
FROM debian:bookworm-slim

# g++ for C++ submissions; libcap2 is isolate's only runtime dependency.
#
# libc6-dev is explicit because --no-install-recommends omits it, and without
# it g++ cannot find stdint.h — every C++ submission would fail to compile.
# libstdc++-12-dev supplies libstdc++.a, which -static in runtime.go needs.
RUN apt-get update && apt-get install -y --no-install-recommends \
      g++ libc6-dev libstdc++-12-dev libcap2 libseccomp2 ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# Node 22 — just the binary. npm isn't needed to run a submission, and
# skipping it saves ~60 MB. Debian's own nodejs package is v18.
COPY --from=node:22-bookworm-slim /usr/local/bin/node /usr/local/bin/node

COPY --from=isolatebuild /isolate/isolate       /usr/local/bin/isolate
COPY --from=headers      /out/json.hpp          /opt/judge/pch/json.hpp
COPY --from=gobuild      /out/judge             /usr/local/bin/judge

# Isolate's config. 2.x ships default.cf.in (a template meant to be filled in
# by `make install`), so we write the real thing instead of copying it.
#
# cg_root is an explicit path rather than the shipped "auto:/run/isolate/cgroup",
# which expects isolate-cg-keeper to have written that file. No systemd here,
# so the entrypoint creates the directory and we point straight at it.
#
# first_uid/first_gid avoid the subid_user mechanism entirely — that path needs
# an `isolate` user with a /etc/subuid range, and fails with the memorable
# "User isolate not found in /etc/subuid".
RUN printf '%s\n' \
    'box_root = /var/local/lib/isolate' \
    'lock_root = /run/isolate/locks' \
    'cg_root = /sys/fs/cgroup/isolate' \
    'first_uid = 60000' \
    'first_gid = 60000' \
    'num_boxes = 100' \
    > /usr/local/etc/isolate

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Precompile bits/stdc++.h. Takes the standard-library half of a compile from
# ~2.4s to ~190ms, at a cost of ~150 MB — a PCH is a serialized compiler state
# dump.
#
# Do NOT extend this to also cover json.hpp. It was tried and measured: a
# combined judge.h PCH gives 1735ms versus 1485ms for this one, i.e. no gain.
# A PCH caches PARSED DECLARATIONS, and nlohmann/json's cost is TEMPLATE
# INSTANTIATION in the user's translation unit, which no PCH can hoist. With
# json declarations available but unused a compile is 271ms; using them costs
# ~1.4s regardless of PCH, -O0, or static vs dynamic linking.
#
# The flags MUST match the ones runtime.go compiles with. Change -O2 or -std
# here and GCC silently ignores the PCH — no error, just the 2.4s back.
RUN set -eux; \
    # find, not a glob: on arm64 Debian this header lives under the multiarch
    # path (/usr/include/aarch64-linux-gnu/c++/12/bits/), not /usr/include/c++/.
    src="$(find /usr/include -path '*/bits/stdc++.h' | head -1)"; \
    test -n "$src"; \
    mkdir -p /opt/judge/pch/bits; \
    cp "$src" /opt/judge/pch/bits/stdc++.h; \
    g++ -O2 -std=c++20 -x c++-header /opt/judge/pch/bits/stdc++.h \
        -o /opt/judge/pch/bits/stdc++.h.gch

# isolate's box root. Mount this as tmpfs at run time so job files live in RAM:
#   --tmpfs /var/local/lib/isolate:rw,exec,size=512m
RUN mkdir -p /var/local/lib/isolate /var/lib/judge/cache

ENV JUDGE_SANDBOX=isolate \
    ISOLATE_BIN=/usr/local/bin/isolate \
    CPP_INCLUDE_DIR=/opt/judge/pch \
    CACHE_DIR=/var/lib/judge/cache \
    LOG_LEVEL=info \
    LOG_FORMAT=json

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["/usr/local/bin/judge"]
