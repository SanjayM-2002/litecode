#!/bin/sh
# Prepare the cgroup v2 subtree isolate needs, then hand off to the judge.
#
# On a normal host, systemd does this: isolate.slice + isolate.service run
# isolate-cg-keeper, which delegates a subtree and writes its path to
# /run/isolate/cgroup. There is no init system in this container, so we do the
# same job by hand and point cg_root straight at the result.
#
# Everything here is idempotent — the container gets restarted a lot.
set -e

CG=/sys/fs/cgroup
ISO_CG=$CG/isolate

mkdir -p /run/isolate/locks

if [ ! -w "$CG/cgroup.subtree_control" ]; then
    echo "FATAL: $CG is not writable. The container needs --privileged." >&2
    echo "       Check 'privileged: true' in docker-compose.yml." >&2
    exit 1
fi

# cgroup v2's "no internal process" rule: a cgroup cannot both hold processes
# and enable controllers for its children. We are currently IN the namespace
# root, so move ourselves into a sibling first — otherwise the write below
# fails with EBUSY and the message gives no hint why.
mkdir -p "$CG/init"
echo $$ > "$CG/init/cgroup.procs" 2>/dev/null || true

# Delegate to children of the root, then to children of isolate/. Both levels
# are needed: the first lets $ISO_CG exist with controllers, the second lets
# isolate's per-box groups get memory.max. Miss the second and --init succeeds
# but every run dies on "Cannot write .../box-0/memory.max".
echo "+memory +cpu +pids +cpuset" > "$CG/cgroup.subtree_control"
mkdir -p "$ISO_CG"
echo "+memory +cpu +pids +cpuset" > "$ISO_CG/cgroup.subtree_control"

echo "cgroup ready: $(cat "$ISO_CG/cgroup.subtree_control")"

exec "$@"
