import { apps } from "./apps"
import { bases } from "./bases"
import { desktops } from "./desktops"
import { hood } from "./hood"
import { identity } from "./identity"
import { looks } from "./looks"
import { outputs } from "./output"
import type { BlockDef } from "./types"

export type { BlockDef } from "./types"
export { wallpapers } from "./types"

/** Every block the Studio can offer, in palette order. */
export const BLOCKS: BlockDef[] = [
	...bases,
	...desktops,
	...looks,
	...apps,
	...identity,
	...hood,
	...outputs,
]

export const blockById = (id: string): BlockDef | undefined => BLOCKS.find((b) => b.id === id)

export const CATEGORY_LABELS: Record<string, { label: string; kidLabel: string }> = {
	start: { label: "Base system", kidLabel: "Start here" },
	looks: { label: "Desktop & theme", kidLabel: "Looks" },
	apps: { label: "Applications", kidLabel: "Apps" },
	me: { label: "Identity & locale", kidLabel: "Me" },
	"under-the-hood": { label: "Under the hood", kidLabel: "Advanced" },
	finish: { label: "Output target", kidLabel: "Finish" },
}
