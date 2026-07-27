#!/usr/bin/env bash
# Report what this machine can actually produce, so nobody waits half an hour
# for a build that was never going to work here.

ok() { printf '  \033[32myes\033[0m  %s\n' "$1"; }
nope() { printf '  \033[31mno \033[0m  %s\n' "$1"; }

loop=no
if [ -e /dev/loop-control ] && command -v losetup >/dev/null 2>&1; then
	if losetup -f >/dev/null 2>&1; then loop=yes; fi
fi

have_lb=no
command -v lb >/dev/null 2>&1 && have_lb=yes

echo
echo "ZenvX forge — what this machine can build"
echo

if [ "$loop" = "yes" ] && [ "$have_lb" = "yes" ]; then
	ok "output.iso        bootable ISO"
	ok "output.hdd        raw disk image"
	ok "image.qcow2       virtual machine disk"
	ok "image.rpi         Raspberry Pi card image"
else
	nope "output.iso        no loop devices here"
	nope "output.hdd        no loop devices here"
	nope "image.qcow2       no loop devices here"
	nope "image.rpi         no loop devices here"
fi

if [ "$have_lb" = "yes" ]; then
	ok "image.oci         container image"
	ok "image.wsl         WSL rootfs tarball"
	ok "image.netboot     netboot bundle"
else
	nope "image.oci         live-build is not installed"
	nope "image.wsl         live-build is not installed"
	nope "image.netboot     live-build is not installed"
fi

echo
echo "Always available, on any machine:"
ok "POST /api/compile  the whole live-build tree, no privileges needed"
echo

if [ "$loop" = "no" ]; then
	cat <<'EOF'
Codespaces does not hand out loop devices, so the disk-image finishes cannot
run here. To get an ISO, run `docker compose up --build` on your own machine
with the same recipe.

EOF
fi

echo "Start it with: npm run start --workspace @zenvx/forge"
echo
