# Running it for real

The page you clicked around in is only the front half. It draws a pretend
computer. To get a real image you need the back half, and the back half cannot
live in a browser tab — building a Linux system needs root, and often loop
devices. No web page is allowed to do that, which is a good thing.

So the backend runs on a real machine. Pick whichever is least effort for you.

---

## Option 1: GitHub Codespaces (nothing to install)

A Codespace is a real Linux machine with a browser attached, which is exactly
what is needed.

1. On the repo page: **Code → Codespaces → Create codespace on main**
2. Wait. The first build installs `live-build` and friends, so give it a few
   minutes. When it finishes it prints a table of what this machine can build.
3. In the terminal:

   ```sh
   npm run start --workspace @zenvx/forge
   ```

4. A notification appears for **port 8787**. Click **Open in Browser**, then
   add `/build.html` to the address.

You now have the interface and a live backend, both in your browser, on a URL
you can share with yourself on any device.

### What a Codespace can and cannot bake

Codespaces does not hand out loop devices, and `live-build` needs one to wrap a
filesystem into a bootable image. So:

| Finish block | In a Codespace |
| --- | --- |
| `POST /api/compile` (the whole file tree, no build) | works |
| `image.oci` container image | works |
| `image.wsl` rootfs tarball | works |
| `image.netboot` bundle | works |
| `output.iso`, `output.hdd`, `image.qcow2`, `image.rpi` | needs a privileged machine |

Run `bash .devcontainer/capabilities.sh` at any time to see the list for the
machine you are on.

This is not a ZenvX limitation. Any ISO builder hits the same wall.

---

## Option 2: Docker on your own machine (gets you an ISO)

```sh
git clone https://github.com/cursed-goblin/zenvx-framework
cd zenvx-framework
docker compose up --build
```

First run takes a few minutes because it downloads a Debian image. When it says
`zenvx forge listening on http://localhost:8787`, open:

- **http://localhost:8787/** — the studio prototype
- **http://localhost:8787/build.html** — the forge console

The port is bound to `127.0.0.1`, so nothing is exposed to your network. The
container is `privileged` because `debootstrap` and loop mounts genuinely need
it — run this on your own machine or a throwaway VM, not a shared host.

When a build finishes, copy the artifact out:

```sh
docker compose cp forge:/var/lib/zenvx/builds ./out
```

---

## Option 3: Straight onto Debian or Ubuntu

```sh
sudo apt install live-build debootstrap xorriso squashfs-tools
npm install
npm run build --workspace @zenvx/schema
sudo -E npm run start --workspace @zenvx/forge
```

---

## Using the console

1. **Ping backend** confirms something is listening. One second.
2. **Check** sends the recipe to `/api/compile`. Nothing is built. You get the
   exact file tree, the package list and a size estimate. Use this constantly;
   it is the fast feedback loop.
3. **Build for real** sends it to `/api/build`, which writes that tree to disk
   and runs `lb build`. Ten to forty minutes. The log streams into the page.

## Why root is unavoidable

`live-build` unpacks a whole distribution into a directory, chroots into it,
installs packages, then wraps the result in a filesystem image. Every one of
those steps needs privileges an ordinary user does not have. This is why the
hosted preview can only ever be a drawing: the honest version of "build an
operating system in your browser" is "design it in your browser, bake it on a
machine you control".

## The API, if you would rather use curl

```sh
curl localhost:8787/api/health

# dry run
curl -X POST localhost:8787/api/compile \
  -H 'content-type: application/json' \
  --data-binary @examples/kid-first-distro.zenvx.json

# real build
curl -X POST localhost:8787/api/build \
  -H 'content-type: application/json' \
  --data-binary @examples/kid-first-distro.zenvx.json
# -> {"jobId":"a1b2c3d4", ...}

curl localhost:8787/api/build/a1b2c3d4
```

The body is the recipe itself, not `{ "recipe": ... }`.
