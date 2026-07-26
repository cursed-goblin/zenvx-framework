/** The ZenvX Recipe: the single source of truth for a distro. */

export type PortType =
	| "system"
	| "desktop"
	| "app"
	| "look"
	| "identity"
	| "image"

export type BlockCategory =
	| "start"
	| "looks"
	| "apps"
	| "me"
	| "under-the-hood"
	| "finish"

export type FieldDef =
	| { key: string; label: string; type: "text"; placeholder?: string; default?: string }
	| { key: string; label: string; type: "toggle"; default?: boolean }
	| { key: string; label: string; type: "color"; default?: string }
	| {
			key: string
			label: string
			type: "choice"
			options: { value: string; label: string; icon?: string }[]
			default?: string
	  }

export type SimHints = {
	/** How the simulated desktop should look. */
	panel?: "bottom" | "top" | "left" | "none"
	windowStyle?: "rounded" | "square"
	accent?: string
	wallpaper?: string
	/** Icons shown on the simulated desktop / dock. */
	desktopIcons?: { label: string; icon: string }[]
	/** A window the simulator can open to demo the app. */
	demoWindow?: { title: string; icon: string; body: string }
}

export type Contribution = {
	packages?: string[]
	removePackages?: string[]
	lbFlags?: Record<string, string>
	files?: { path: string; content: string; mode?: string }[]
	hooks?: string[]
	services?: { enable?: string[]; disable?: string[] }
	sim?: SimHints
	/** Rough installed-size estimate in MB, used for the ISO budget meter. */
	sizeMb?: number
}

export type BlockConfig = Record<string, string | boolean | number>

export type RecipeBlock = {
	uid: string
	def: string
	cfg: BlockConfig
	/** Canvas position; presentation only, ignored by the compiler. */
	pos?: { x: number; y: number }
}

export type RecipeEdge = { from: string; to: string }

export type Recipe = {
	zenvxVersion: 1
	name: string
	codename?: string
	author?: string
	blocks: RecipeBlock[]
	edges: RecipeEdge[]
}

export const emptyRecipe = (name = "MyOS"): Recipe => ({
	zenvxVersion: 1,
	name,
	blocks: [],
	edges: [],
})
