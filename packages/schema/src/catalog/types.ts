import type { BlockCategory, Contribution, FieldDef, PortType } from "../recipe"

/** One draggable block: what it looks like, what it asks, what it contributes. */
export type BlockDef = {
	id: string
	category: BlockCategory
	label: string
	kidLabel: string
	icon: string
	blurb: string
	inputs: PortType[]
	outputs: PortType[]
	singleton?: boolean
	proOnly?: boolean
	fields?: FieldDef[]
	emit: (cfg: Record<string, any>) => Contribution
}

export const wallpapers: Record<string, string> = {
	space: "linear-gradient(160deg,#101828,#2783DE)",
	forest: "linear-gradient(160deg,#14281f,#46A171)",
	sunset: "linear-gradient(160deg,#3a1c1c,#D5803B)",
	ocean: "linear-gradient(160deg,#07243a,#2AA5B5)",
	candy: "linear-gradient(160deg,#3a1230,#E56ea0)",
	mono: "linear-gradient(160deg,#1b1b1b,#4a4a4a)",
	plain: "linear-gradient(160deg,#202020,#383836)",
}

/** Toggles default to on unless explicitly switched off. */
export const yes = (v: unknown) => v !== false

/** "htop, git , neovim" -> ["htop", "git", "neovim"] */
export const list = (v: unknown) =>
	String(v ?? "")
		.split(",")
		.map((s) => s.trim())
		.filter(Boolean)
