# Running it for real

The page you clicked around in is only the front half. It draws a pretend
computer. To get a real `.iso` you need the back half, and the back half
cannot live in a browser tab — building a Linux image needs root, loop devices
and `debootstrap`. No web page is allowed to do that, which is a good thing.

So the backend runs on your machine instead. One command.

## What you need

Docker. That is all. On Linux it works directly; on macOS or Windows use
Docker Desktop.

## Start it

```sh
git clone https://github.com/cursed-goblin/zenvx-framework
cd zenvx-framework
docker compose up --build
```

First run takes a few minutes because it downloads a Debian image.

When it says `zenvx forge listening on http://localhost:8787`, open:

- **http://localhost:8787/** — the studio prototype
- **http://localhost:8787/build.html** — the real backend console

The interface and the API are on the same address now, so nothing has to talk
across origins.

## Using the console

1. **Check** sends your recipe to `/api/compile`. Nothing is built. You get
   back the exact file tree, the package list and a size estimate. This is the
   fast way to see whether a recipe makes sense.
2. **Build** sends it to `/api/build`, which writes that tree to disk and runs
   `lb build`. Expect 10 to 40 minutes depending on your machine and your
   internet. The log streams into the page.
3. When it finishes, the artifact is in the `builds` volume. Copy it out:

   ```sh
   docker compose cp forge:/var/lib/zenvx/builds ./out
   ```

   Inside you will find the ISO, or the qcow2, or the tarball — whichever
   finish block your recipe used.

## Without Docker

If you already have a Debian or Ubuntu machine:

```sh
sudo apt install live-build debootstrap xorriso
npm install
npm run build --workspace @zenvx/schema
sudo -E npm run start --workspace @zenvx/forge
```

`sudo` is needed for the same reason as `privileged` above.

## Why it needs to be root

`live-build` unpacks a whole distribution into a directory, chroots into it,
installs packages, then wraps the result in a filesystem image. Every one of
those steps needs privileges an ordinary user does not have. This is why the
hosted preview can only ever be a drawing: the honest version of "build an
operating system in your browser" is "design it in your browser, build it on a
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
