# ZenvX Framework — Architecture

## Design rules

1. **The recipe is the truth.** The canvas is a view over a recipe. The simulator
   and the ISO builder are two renderers of the same recipe.
2. **Nothing invalid is expressible.** Blocks have typed ports. If a connection
   would produce an unbuildable OS, the UI refuses the connection instead of
   failing 20 minutes into a build.
3. **Instant feedback beats correctness prompts.** A five-year-old will not read
   an error. They will drag a block and expect the screen to change. The
   simulator updates on every canvas change, in under a frame.
4. **Kid Mode is a lens, not a fork.** Same blocks, same recipe. Kid Mode hides
   ports, renames labels, and pre-wires sensible edges.

## Layers

```
+----------------------------------------------------------+
|  Studio (browser)                                        |
|                                                          |
|  Palette --drag--> Canvas (React Flow) --> Recipe store   |
|                                    |                     |
|                                    +--> Simulator (DOM)   |
|                                    +--> Inspector         |
+---------------------------|------------------------------+
                            | POST /api/build  (recipe)
+---------------------------v------------------------------+
|  Forge (Node service)                                    |
|                                                          |
|  validate -> compile -> live-build tree -> lb build      |
|                              |                            |
|                              +--> artifacts: .iso, logs   |
+----------------------------------------------------------+
```

## The compile step

`compileRecipe(recipe)` is pure and returns a virtual file tree. That makes it
testable without Debian installed, and lets the Studio show "what will be
generated" in Pro Mode.

Output for a Debian `live-build` target:

```
auto/config                                  # lb config flags
config/package-lists/zenvx.list.chroot       # every package the blocks asked for
config/includes.chroot/etc/os-release        # branding
config/includes.chroot/etc/zenvx/recipe.json # provenance: the exact recipe used
config/includes.chroot/usr/share/backgrounds/zenvx.png
config/hooks/normal/9000-zenvx.hook.chroot   # theme + service wiring
build.sh
```

## Why live-build

- Debian-official, stable, well documented
- Produces a hybrid ISO that is both live and installable (Calamares)
- Purely declarative config tree — a perfect compile target for a block graph
- No proprietary tooling; a kid's distro can be legally redistributed

## Simulator

The simulator is deliberately *not* an emulator. Running QEMU in a browser for a
child is slow and fragile. Instead it renders a faithful DOM mock of the chosen
desktop: panel position, menu style, window chrome, wallpaper, icon theme, and
the actual app list from the recipe. It answers the only question a beginner has
— "what will my computer look like?" — in zero seconds.

Phase 3 can add a real `v86`/QEMU-wasm boot of the produced ISO for verification.

## Safety and cost

- Builds run in a disposable container with no network beyond the Debian mirror.
- Recipes are size-capped (package count, ISO budget) so a kid cannot queue a
  40 GB build by dragging 300 blocks.
- Every ISO ships `/etc/zenvx/recipe.json` so any distro can be rebuilt or
  audited from the artifact alone.
