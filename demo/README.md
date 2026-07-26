# Demo distro: AaruOS

AaruOS is the demo produced by the example recipe
[`examples/kid-first-distro.zenvx.json`](../examples/kid-first-distro.zenvx.json).
Nine blocks: Debian 13 engine, XFCE desktop, space theme, Internet, Paint, Code,
a brand, a user, and an ISO target.

## Regenerate the tree

```bash
node demo/build-demo.mjs
```

No install step. `build-demo.mjs` is a dependency-free port of the
`@zenvx/schema` compiler so the demo runs on plain Node.

Output:

```
AaruOS (firefly)
  blocks     9
  packages   16
  est. size  1.97 GB
  files      9 -> demo/aaruos
```

## What it writes

| Path | Purpose |
| --- | --- |
| `aaruos/auto/config` | the `lb config` invocation (distribution, areas, image type) |
| `aaruos/build.sh` | `lb clean` → `auto/config` → `lb build`, logging to `build.log` |
| `aaruos/config/package-lists/zenvx.list.chroot` | the 16 packages the blocks asked for |
| `aaruos/config/includes.chroot/etc/os-release` | makes the machine call itself AaruOS |
| `aaruos/config/includes.chroot/etc/zenvx/recipe.json` | the recipe ships inside the OS, so any distro can be reopened in Studio |
| `aaruos/config/includes.chroot/etc/zenvx/theme.conf` | accent `#2783DE`, space wallpaper, dark on |
| `aaruos/config/includes.chroot/etc/zenvx/brand.conf` | tagline and logo |
| `aaruos/config/includes.chroot/etc/lightdm/lightdm.conf.d/90-zenvx-autologin.conf` | logs `aaru` straight in — no password screen for a 5-year-old |
| `aaruos/config/hooks/normal/9000-zenvx.hook.chroot` | creates the user, enables LightDM |
| `aaruos/zenvx-preview.json` | the sim hints the browser preview renders |

## Turn it into a real ISO

The tree is a stock live-build project, so it needs Debian, root, and about
15 minutes:

```bash
docker build -f packages/forge/Dockerfile -t zenvx-forge .
docker run --privileged -v "$PWD/demo/aaruos:/work" -w /work zenvx-forge ./build.sh
```

Result: `live-image-amd64.hybrid.iso`, bootable from a USB stick.

## Try the desktop without building

Open [`prototype/index.html`](../prototype/index.html) and press **Turn it on**
to see the same AaruOS desktop the recipe describes.
