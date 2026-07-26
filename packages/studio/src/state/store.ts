import {
	canConnect,
	compileRecipe,
	emptyRecipe,
	validate,
	type Recipe,
} from "@zenvx/schema"
import { create } from "zustand"

type Mode = "kid" | "pro"

type State = {
	recipe: Recipe
	mode: Mode
	selected: string | null
	setMode: (m: Mode) => void
	select: (uid: string | null) => void
	rename: (name: string) => void
	addBlock: (defId: string, pos?: { x: number; y: number }) => void
	removeBlock: (uid: string) => void
	moveBlock: (uid: string, pos: { x: number; y: number }) => void
	setCfg: (uid: string, key: string, value: any) => void
	connect: (from: string, to: string) => boolean
	disconnect: (from: string, to: string) => void
	load: (recipe: Recipe) => void
}

let seq = 0
const nextUid = () => `b${++seq}${Math.random().toString(36).slice(2, 5)}`

export const useStudio = create<State>((set, get) => ({
	recipe: emptyRecipe("MyOS"),
	mode: "kid",
	selected: null,
	setMode: (mode) => set({ mode }),
	select: (selected) => set({ selected }),
	rename: (name) => set((s) => ({ recipe: { ...s.recipe, name } })),

	addBlock: (defId, pos) =>
		set((s) => {
			const uid = nextUid()
			const blocks = [
				...s.recipe.blocks,
				{ uid, def: defId, cfg: {}, pos: pos ?? { x: 240, y: 120 } },
			]
			// Kid Mode auto-wires the new block to the first compatible parent.
			let edges = s.recipe.edges
			if (s.mode === "kid") {
				const probe = { ...s.recipe, blocks }
				const parent = blocks.find((b) => b.uid !== uid && canConnect(probe, b.uid, uid))
				if (parent) edges = [...edges, { from: parent.uid, to: uid }]
			}
			return { recipe: { ...s.recipe, blocks, edges }, selected: uid }
		}),

	removeBlock: (uid) =>
		set((s) => ({
			selected: s.selected === uid ? null : s.selected,
			recipe: {
				...s.recipe,
				blocks: s.recipe.blocks.filter((b) => b.uid !== uid),
				edges: s.recipe.edges.filter((e) => e.from !== uid && e.to !== uid),
			},
		})),

	moveBlock: (uid, pos) =>
		set((s) => ({
			recipe: {
				...s.recipe,
				blocks: s.recipe.blocks.map((b) => (b.uid === uid ? { ...b, pos } : b)),
			},
		})),

	setCfg: (uid, key, value) =>
		set((s) => ({
			recipe: {
				...s.recipe,
				blocks: s.recipe.blocks.map((b) =>
					b.uid === uid ? { ...b, cfg: { ...b.cfg, [key]: value } } : b,
				),
			},
		})),

	connect: (from, to) => {
		const { recipe } = get()
		if (!canConnect(recipe, from, to)) return false
		set({ recipe: { ...recipe, edges: [...recipe.edges, { from, to }] } })
		return true
	},

	disconnect: (from, to) =>
		set((s) => ({
			recipe: {
				...s.recipe,
				edges: s.recipe.edges.filter((e) => !(e.from === from && e.to === to)),
			},
		})),

	load: (recipe) => set({ recipe, selected: null }),
}))

/** Derived views. Cheap enough to recompute on every render. */
export const useCompiled = () => compileRecipe(useStudio((s) => s.recipe))
export const useIssues = () => validate(useStudio((s) => s.recipe))
