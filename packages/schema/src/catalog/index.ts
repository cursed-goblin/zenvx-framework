import type { BlockCategory } from "../recipe"
import { apps } from "./apps"
import { bases } from "./bases"
import { bootBlocks } from "./boot"
import { desktops } from "./desktops"
import { devBlocks } from "./dev"
import { graphicsBlocks } from "./graphics"
import { hood } from "./hood"
import { identity } from "./identity"
import { imageBlocks } from "./images"
import { kernelBlocks } from "./kernel"
import { looks } from "./looks"
import { networkBlocks } from "./network"
import { outputs } from "./output"
import { packagingBlocks } from "./packaging"
import { securityBlocks } from "./security"
import { storageBlocks } from "./storage"
import type { BlockDef } from "./types"

export type { BlockDef } from "./types"
export { wallpapers } from "./types"

/**
 * Every block ZenvX knows about.
 *
 * Order matters only for the palette: blocks appear in this order inside their
 * category. Kid-facing blocks come first, expert blocks after.
 */
export const BLOCKS: BlockDef[] = [
	...bases,
	...desktops,
	...looks,
	...apps,
	...identity,
	...hood,
	...kernelBlocks,
	...storageBlocks,
	...securityBlocks,
	...networkBlocks,
	...graphicsBlocks,
	...devBlocks,
	...packagingBlocks,
	...bootBlocks,
	...outputs,
	...imageBlocks,
]

export const blockById = (id: string): BlockDef | undefined =>
	BLOCKS.find((b) => b.id === id)

export const CATEGORY_LABELS: Record<BlockCategory, string> = {
	start: "Start here",
	looks: "How it looks",
	apps: "Things to do",
	me: "Make it mine",
	"under-the-hood": "Under the hood",
	finish: "Finish",
}

/** Blocks in one category, palette order. */
export const blocksInCategory = (category: BlockCategory): BlockDef[] =>
	BLOCKS.filter((b) => b.category === category)

/** Handy for docs and tests. */
export const catalogStats = () => ({
	blocks: BLOCKS.length,
	fields: BLOCKS.reduce((n, b) => n + (b.fields?.length ?? 0), 0),
	proOnly: BLOCKS.filter((b) => b.proOnly).length,
	byCategory: BLOCKS.reduce<Record<string, number>>((acc, b) => {
		acc[b.category] = (acc[b.category] ?? 0) + 1
		return acc
	}, {}),
})
