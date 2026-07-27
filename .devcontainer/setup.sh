#!/usr/bin/env bash
# Prepare a Codespace to run the forge.
set -euo pipefail

echo "==> installing build tools"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq --no-install-recommends \
	live-build \
	debootstrap \
	squashfs-tools \
	xorriso \
	mtools \
	dosfstools \
	qemu-utils \
	skopeo \
	ca-certificates \
	curl \
	rsync \
	>/dev/null

echo "==> installing workspace"
npm install --no-audit --no-fund

echo "==> building the schema package"
npm run build --workspace @zenvx/schema

mkdir -p /var/lib/zenvx/builds

cat <<'EOF'

==> ready

Start the backend:

  npm run start --workspace @zenvx/forge

Codespaces will pop up a notification for port 8787. Open it and add
/build.html to the address for the forge console.

EOF
