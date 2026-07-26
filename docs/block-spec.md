# Block spec

A block is a declarative contribution to the recipe. It never runs arbitrary
code in the browser.

```ts
type BlockDef = {
  id: string                 // "desktop.xfce"
  category: BlockCategory    // palette grouping
  label: string              // Pro Mode name: "XFCE 4"
  kidLabel: string           // Kid Mode name: "Simple Desktop"
  icon: string               // emoji or icon id
  blurb: string              // one line, kid-readable
  inputs: PortType[]         // what it must be fed
  outputs: PortType[]        // what it provides
  singleton?: boolean        // only one allowed on canvas
  fields?: FieldDef[]        // inspector controls
  emit: (cfg) => Contribution
}
```

## Port types

| Port | Meaning |
| --- | --- |
| `system` | A bootable base system exists |
| `desktop` | A graphical session exists |
| `app` | Software to install |
| `look` | Theme / wallpaper / icons |
| `identity` | Distro name, logo, users, locale |
| `image` | Final output target |

Rule: `image` requires `system`. `desktop` requires `system`. `app` and `look`
require `desktop` unless marked `headlessOk`.

## Contribution

```ts
type Contribution = {
  packages?: string[]
  removePackages?: string[]
  lbFlags?: Record<string, string>
  files?: { path: string; content: string; mode?: string }[]
  hooks?: string[]           // shell fragments appended to the chroot hook
  services?: { enable?: string[]; disable?: string[] }
  sim?: SimHints             // how the simulator should render this block
}
```

## Categories in the palette

1. **Start here** — base system blocks
2. **Looks** — desktops, themes, wallpapers, cursors
3. **Apps** — browser, code, paint, games, office, media
4. **Me** — distro name, logo, user account, language, timezone
5. **Under the hood** *(Pro Mode only)* — kernel flavour, services, firewall,
   custom packages, custom hook script
6. **Finish** — build target (ISO / VM image / raw disk)

## Adding a block

Drop a file in `packages/schema/src/blocks/` and export it from the index. No
frontend change is required: the palette, inspector, validator, simulator, and
compiler are all driven by the catalog.
