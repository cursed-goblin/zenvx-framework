#!/bin/sh
# Needs root and live-build. Run inside the forge container.
set -e
lb clean --purge
./auto/config
lb build 2>&1 | tee build.log
