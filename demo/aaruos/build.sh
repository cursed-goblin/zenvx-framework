#!/bin/sh
set -e
lb clean --purge
./auto/config
lb build 2>&1 | tee build.log
