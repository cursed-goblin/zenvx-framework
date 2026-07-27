# Block spec

A block is a small, self-contained description of one decision about an
operating system. The studio draws it, the compiler asks it what it wants, and
the forge turns the answers into a real image.

Everything in this document lives in `packages/schema/src/recipe.ts` and
`packages/schema/src/catalog/`.

## Shape of a block

```ts
type BlockDef = {
  id: string              // "kernel.tuning" — stable, never renamed
  category: BlockCategory // start | looks | apps | me | under-the-hood | finish
  label: string           // what a professional sees
  kidLabel: string        // what a seven year old sees
  icon: string
  blurb: string           // one plain sentence
  inputs: PortType[]      // what it can be plugged into
  outputs: PortType[]     // what it offers downstream
  singleton?: boolean     // only one per recipe
  proOnly?: boolean       // hidden in kid mode
  fields?: FieldDef[]
  emit: (cfg) => Contribution
}
```

`PortType` is `system | desktop | app | look | identity | image`. A wire is
legal when the source's output type appears in the target's input list; kid
mode wires blocks up automatically using the same rule.

## Fields

Every field shares a base:

```ts
{
  key: string
  label: string
  help?: string       // one line under the control
  group?: string      // section header in the inspector
  advanced?: boolean  // hidden until "Show advanced settings"
  dependsOn?: { key: string; equals: string | boolean }
}
```

`dependsOn` is what keeps a 20-setting block readable: btrfs compression level
only appears when the filesystem is btrfs, PRIME offload only for NVIDIA, RT
priority only in the low-latency audio profile.

### The seven types

| Type | Extra keys | Renders as |
|---|---|---|
| `text` | `multiline`, `rows`, `syntax`, `placeholder`, `default` | input or code-ish textarea |
| `toggle` | `default` | switch |
| `color` | `default` | swatch + hex |
| `choice` | `options: { value, label, icon?, help? }[]` | segmented buttons |
| `number` | `min`, `max`, `step`, `unit`, `default` | stepper with a unit |
| `slider` | `min`, `max`, `step`, `unit`, `default` | slider with a live value |
| `tags` | `placeholder`, `suggestions`, `default` | removable chips |

`syntax` on a multiline text field is a hint shown to the user, such as
`"one sysctl per line"` or `"apt_preferences stanzas"`. It is documentation,
not validation.

A block with more than eight fields gets a search box in the inspector.

## What a block emits

```ts
type Contribution = {
  packages?: string[]
  removePackages?: string[]
  files?: { path: string; content: string; mode?: string }[]
  hooks?: string[]          // shell, run in the chroot
  services?: { enable?: string[]; disable?: string[] }
  lbFlags?: Record<string, string>
  sim?: Partial<SimHints>    // how the browser preview should look
  sizeMb?: number

  // advisory, for the inspector and the docs
  sysctl?: Record<string, string | number>
  modules?: string[]
  blacklist?: string[]
  repos?: { name: string; line: string }[]
  units?: string[]
  env?: Record<string, string>
  debconf?: string[]
  notes?: string[]
}
```

The advisory keys exist so the inspector can explain *why* an image is the way
it is. Any block that sets them also writes a real file or hook, so the
compiler never has to interpret them.

Paths in `files` are relative and have no leading slash: `etc/sysctl.d/90-zenvx.conf`.
`mode` is an octal string, `"755"`, and matters for anything in `profile.d`,
`grub.d`, `sudoers.d` (which must be `440`) or a WireGuard config (`600`).

## The catalog

84 blocks across two tiers. Kid-facing blocks carry no `proOnly` flag and show
their `kidLabel`; expert blocks are hidden until pro mode is on.

### Kid tier

- **start** — Debian stable, Debian testing, Ubuntu LTS
- **looks** — XFCE, GNOME, KDE, LXQt, MATE, Cinnamon, plain TTY, plus theme,
  splash and sounds
- **apps** — browser, paint, code, block coding, games, sandbox, media, music
  maker, video, photo, vector, office, python, typing, maths, stars, files,
  terminal
- **me** — brand, user, hostname, locale, parental guard
- **under-the-hood** — extra packages, remove packages, firewall, ssh, updates,
  swap, kernel choice, custom hook
- **finish** — ISO, HDD image

### Expert tier

| Group | Blocks |
|---|---|
| Kernel | `kernel.build`, `kernel.tuning` |
| Storage | `storage.root`, `storage.crypt`, `storage.layout`, `storage.lvm`, `storage.raid`, `storage.swap` |
| Security | `security.mac`, `security.boot`, `security.hardening`, `security.access`, `security.audit` |
| Network | `network.stack`, `network.dns`, `network.vpn`, `network.time`, `network.share` |
| Graphics | `gfx.drivers`, `gfx.session`, `gfx.gaming`, `gfx.audio` |
| Dev | `dev.toolchain`, `dev.containers`, `dev.virt`, `dev.workspace` |
| Packaging | `pkg.apt`, `pkg.universal`, `pkg.reproducible` |
| Boot | `boot.loader`, `boot.splash`, `boot.firstrun` |
| Images | `image.qcow2`, `image.oci`, `image.wsl`, `image.rpi`, `image.netboot`, `image.ostree` |

`catalogStats()` in `packages/schema/src/catalog/index.ts` returns the live
counts, which are more trustworthy than this table.

## Defaults are opinions

The defaults are chosen so that an untouched recipe produces a system worth
shipping: MAC in enforcing mode, root locked, sudo asks for a password,
DNSSEC on, DNS-over-TLS opportunistic, file sharing off, SSH host keys and
machine-id regenerated on first boot, WireGuard private keys generated on the
device and never written into a recipe file.

When a setting is dangerous the `help` text says so plainly — `mitigations=off`
and "allow unauthenticated packages" both carry a warning rather than being
hidden away.

## Adding a block

1. Put it in the right file under `packages/schema/src/catalog/`.
2. Export it from that file's array (`kernelBlocks`, `devBlocks`, and so on).
3. If you added a new file, spread its array into `BLOCKS` in `catalog/index.ts`.
4. Give every field a `group` if the block has more than five of them.
5. Mark anything that can break a boot as `advanced`.
6. Make sure `emit()` returns the same shape for every combination of inputs —
   empty arrays, not `undefined`, when nothing is contributed.
