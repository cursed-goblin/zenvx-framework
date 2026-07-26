# Roadmap

## Phase 1 — Studio + Simulator (current)

- [x] Recipe schema + validator
- [x] Block catalog v1 (base, desktop, apps, look, identity, output)
- [x] React Flow canvas with typed ports and Kid/Pro modes
- [x] Instant DOM simulator (desktop preview)
- [x] Pure `compileRecipe()` producing a live-build tree
- [ ] Recipe import/export + shareable links
- [ ] Guided 5-step Kid wizard

## Phase 2 — Real ISOs

- [ ] Forge queue + containerised `lb build`
- [ ] Artifact storage, build logs streamed to the Studio
- [ ] Package cache / apt proxy so builds take minutes, not hours
- [ ] Calamares installer branding from the identity blocks
- [ ] Size and package budget enforcement

## Phase 3 — Verify and learn

- [ ] Boot the produced ISO in-browser (QEMU-wasm) for a real smoke test
- [ ] "Why?" overlay: every block shows the exact lines it added to the config
- [ ] Classroom mode: teacher templates, student forks, diff view
- [ ] Remix gallery of community recipes

## Phase 4 — Beyond Debian

- [ ] Alpine target (tiny, ~60 s builds — great for classrooms)
- [ ] Arch target via `archiso`
- [ ] NixOS target (recipe maps almost 1:1 to a Nix module)
