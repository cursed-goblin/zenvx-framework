# ZenvX Framework

**Build your own Linux operating system by dragging blocks.**

ZenvX Framework is a visual OS construction kit. You drag blocks onto a canvas —
a base system, a desktop, some apps, a theme, a name — and the framework compiles
that canvas into a real, bootable Debian/Ubuntu distribution.

Two modes, one engine:

- **Kid Mode** — huge icons, no jargon, 5 steps to a working OS. "Pick a look",
  not "select a display manager".
- **Pro Mode** — full block graph, package lists, kernel flags, hooks, raw
  `live-build` output, reproducible recipe files.

## How it works

```
  Canvas (blocks)  ->  Recipe (.zenvx.json)  ->  Compiler  ->  live-build tree  ->  ISO
                                |
                                +-> Simulator (instant in-browser preview)
```

The **Recipe** is the single source of truth. It is a small, human-readable JSON
file. Everything downstream is a pure function of the recipe, which means:

- the browser can *simulate* the OS instantly, with zero build time
- the backend can *build* the same OS byte-for-byte reproducibly
- a recipe can be shared, forked, remixed, and diffed like source code

## Repo layout

| Path | What it is |
| --- | --- |
| `packages/schema` | Block catalog + recipe schema + validator (shared by frontend and backend) |
| `packages/studio` | The visual builder: React + Vite + Tailwind + React Flow, plus the in-browser OS simulator |
| `packages/forge` | Build service: compiles a recipe into a `live-build` tree and (later) an ISO |
| `docs` | Architecture, block spec, roadmap |
| `examples` | Example recipes |
| `demo/aaruos` | A compiled demo distro: the live-build tree generated from `examples/kid-first-distro.zenvx.json` |
| `prototype` | Self-contained single-file HTML prototype of the Studio UI |

## Quick start

```bash
npm install
npm run dev          # studio on http://localhost:5173
npm run dev:forge    # build service on http://localhost:8787
```

No Docker or root needed for the simulator. Real ISO builds need Debian +
`live-build` (see `packages/forge/Dockerfile`).

## Try it with no install

Open `prototype/index.html` in any browser. It is a self-contained build of the
Studio UI: drag blocks, switch Kid/Pro modes, and boot the simulated desktop.

## Build the demo distro

```bash
node demo/build-demo.mjs           # compiles the recipe into demo/aaruos/
cd demo/aaruos && sudo ./build.sh  # needs Debian + live-build; produces the ISO
```

## Status

Phase 1 (simulator + recipe compiler) is the current target. ISO output is
Phase 2. See `docs/roadmap.md`.
