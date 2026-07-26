# @zenvx/forge

Turns a recipe into a real distro.

| Route | Purpose |
| --- | --- |
| `GET /api/health` | liveness |
| `POST /api/compile` | validate + return the live-build tree (no build) |
| `POST /api/build` | materialize the tree and queue `lb build` |
| `GET /api/build/:id` | job state, streamed log tail, ISO path when done |

`/api/compile` is the one the Studio calls on every change in Pro Mode, so a kid
never waits. `/api/build` is the expensive path and is queued one at a time.

## Running builds safely

`lb build` requires root and mounts pseudo-filesystems. Never run it on the host.
Use the container:

```bash
docker build -f packages/forge/Dockerfile -t zenvx-forge .
docker run --privileged -p 8787:8787 -v zenvx-builds:/var/lib/zenvx/builds zenvx-forge
```

First build of a given base pulls ~1 GB from the Debian mirror. Run
`apt-cacher-ng` alongside it for classroom use, or builds will be painfully slow
when 30 students press the button at once.
