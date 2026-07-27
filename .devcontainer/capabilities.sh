#!/usr/bin/env bash
# Report what this machine can actually produce, so nobody waits 30 minutes
# for a build that was never going to work here.
set -uo pipefail

yes() { printf '  \033[32myes\033[0m  %s\n' "$1"; }
no() { printf '  \033[31mno \033[0m  %s\n' "$1"; }

loop=no
if [ -e /dev/loop-control ] && losetup -f >/dev/null 2>&1; then
	loop=yes
fi

mountok=no
if unshare --mount true >/dev/null 2>&1 || [ "$(id -u)" = "0" ] && mount --help >/dev/null 2>&1; then
	mountok=yes
fi

echo
echo "ZenvX forge — what this machine can build"
echo

if [ "$loop" = "yes" ]; then
	yes "output.iso        bootable ISO"
	yes "output.hdd        raw disk image"
	yes "image.qcow2       virtual machine disk"
	yes "image.rpi         Raspberry Pi card image"
else
	no "output.iso        needs loop devices"
	no "output.hdd        needs loop devices"
	no "image.qcow2       needs loop devices"
	no "image.rpi         needs loop devices"
fi

yes "image.oci         container image"
yes "image.wsl         WSL rootfs tarball"
yes "image.netboot     netboot bundle"

echo
echo "Always available, on any machine:"
yes "POST /api/compile  the full live-build tree, no privileges needed"
echo

if [ "$loop" = "no" ]; then
	cat <<'EOF'
Codespaces does not hand out loop devices, so the disk-image finishes cannot
run here. Everything else does. To get an ISO, either:

  * run `docker compose up --build` on your own machine, or
  * use a rootfs finish block here and convert it elsewhere.

EOF
fi

echo "Start it with: npm run start --workspace @zenvx/forge"
echo
