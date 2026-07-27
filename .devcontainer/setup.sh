#!/usr/bin/env bash
# Prepare a Codespace to run the forge.
#
# Deliberately NOT `set -e`. A half-installed Codespace you can debug beats a
# Codespace that refused to be created. Every step records its own outcome and
# the summary at the end tells you what actually went wrong.

note() { printf '\n==> %s\n' "$1"; }
failures=()

note "where am I"
( set -x; whoami; node --version; npm --version; pwd ) 2>&1 | sed 's/^/    /'

note "installing build tools (this is the slow part)"
export DEBIAN_FRONTEND=noninteractive
if ! apt-get update -qq; then
	failures+=("apt-get update failed")
fi

# Split into groups so one unavailable package cannot block the rest.
install_group() {
	local label="$1"
	shift
	if apt-get install -y -qq --no-install-recommends "$@" >/dev/null 2>&1; then
		printf '    ok   %s\n' "$label"
	else
		printf '    MISS %s\n' "$label"
		failures+=("apt group '$label' failed: $*")
	fi
}

install_group "live-build core" live-build debootstrap
install_group "image tools" squashfs-tools xorriso mtools dosfstools
install_group "convert tools" qemu-utils
install_group "container tools" skopeo
install_group "basics" ca-certificates curl rsync

note "installing the npm workspace"
if npm install --no-audit --no-fund; then
	echo "    ok"
else
	failures+=("npm install failed")
fi

# The forge does not need this. @zenvx/schema has main: ./src/index.ts and the
# forge runs through tsx, so the TypeScript source is consumed directly. This
# is only a health check, and its output is worth seeing.
note "type-checking the schema (optional)"
if npm run build --workspace @zenvx/schema 2>&1 | tail -40; then
	echo "    ok"
else
	echo "    the schema has type errors. The forge still runs; tsx ignores them."
fi

mkdir -p /var/lib/zenvx/builds 2>/dev/null

note "summary"
if [ ${#failures[@]} -eq 0 ]; then
	echo "    everything installed"
else
	for f in "${failures[@]}"; do printf '    problem: %s\n' "$f"; done
	echo
	echo "    Paste the lines above if you want help. The Codespace still works;"
	echo "    /api/compile needs none of those packages."
fi

cat <<'EOF'

==> start the backend

  npm run start --workspace @zenvx/forge

A notification will appear for port 8787. Open it, then add /build.html

If anything looks wrong first:

  npm run doctor

EOF
