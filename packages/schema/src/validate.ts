import { blockById } from "./blocks"
import type { Recipe } from "./recipe"

export type Issue = {
	level: "error" | "warn" | "hint"
	/** Kid-readable. Never mentions a package name. */
	message: string
	blockUid?: string
}

const PACKAGE_BUDGET = 400

/** Can `to` accept a connection from `from`? Used to refuse bad edges in the UI. */
export function canConnect(recipe: Recipe, fromUid: string, toUid: string): boolean {
	const from = recipe.blocks.find((b) => b.uid === fromUid)
	const to = recipe.blocks.find((b) => b.uid === toUid)
	if (!from || !to || fromUid === toUid) return false
	const fromDef = blockById(from.def)
	const toDef = blockById(to.def)
	if (!fromDef || !toDef) return false
	if (!toDef.inputs.some((i) => fromDef.outputs.includes(i))) return false
	// no cycles
	const seen = new Set<string>()
	const walk = (uid: string): boolean => {
		if (uid === fromUid) return true
		if (seen.has(uid)) return false
		seen.add(uid)
		return recipe.edges.filter((e) => e.from === uid).some((e) => walk(e.to))
	}
	return !walk(toUid)
}

export function validate(recipe: Recipe): Issue[] {
	const issues: Issue[] = []
	const defs = recipe.blocks.map((b) => ({ b, d: blockById(b.def) }))

	if (!recipe.name.trim()) {
		issues.push({ level: "error", message: "Your OS needs a name." })
	}
	if (!defs.some(({ d }) => d?.outputs.includes("system"))) {
		issues.push({ level: "error", message: "Add an engine block so the computer can turn on." })
	}
	if (!defs.some(({ d }) => d?.outputs.includes("desktop"))) {
		issues.push({ level: "warn", message: "No desktop yet, so you will only see text on screen." })
	}
	if (!defs.some(({ d }) => d?.outputs.includes("image"))) {
		issues.push({ level: "hint", message: "Add the Make It Real block to get a file you can boot." })
	}

	// singletons
	const counts = new Map<string, number>()
	for (const { b, d } of defs) {
		if (!d) {
			issues.push({ level: "error", message: `Unknown block "${b.def}".`, blockUid: b.uid })
			continue
		}
		if (d.singleton) {
			const n = (counts.get(d.id) ?? 0) + 1
			counts.set(d.id, n)
			if (n > 1) {
				issues.push({
					level: "error",
					message: `Only one "${d.kidLabel}" block is allowed.`,
					blockUid: b.uid,
				})
			}
		}
	}

	// orphans
	for (const { b, d } of defs) {
		if (!d || d.inputs.length === 0) continue
		const fed = recipe.edges.some((e) => e.to === b.uid)
		if (!fed) {
			issues.push({
				level: "warn",
				message: `"${d.kidLabel}" is not connected to anything yet.`,
				blockUid: b.uid,
			})
		}
	}

	const pkgCount = defs.reduce(
		(n, { b, d }) => n + (d?.emit(b.cfg).packages?.length ?? 0),
		0,
	)
	if (pkgCount > PACKAGE_BUDGET) {
		issues.push({ level: "error", message: "Too many things at once. Remove a few apps." })
	}

	return issues
}
