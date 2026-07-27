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

/** Metadata every field shares, whatever its control type. */
export type FieldBase = {
	key: string
	label: string
	/** One line of explanation shown under the control. */
	help?: string
	/** Fields with the same group collapse into one section in the Inspector. */
	group?: string
	/** Hidden behind a disclosure, and only in pro mode. */
	advanced?: boolean
	/** Only show this field when another field in the same block matches. */
	dependsOn?: { key: string; equals: string | boolean }
}

export type FieldDef =
	| (FieldBase & {
			type: "text"
			placeholder?: string
			default?: string
			/** Render a textarea instead of a single line. */
			multiline?: boolean
			rows?: number
			/** Syntax label shown on multiline fields, e.g. "ini", "sh". */
			syntax?: string
	  })
	| (FieldBase & { type: "toggle"; default?: boolean })
	| (FieldBase & { type: "color"; default?: string })
	| (FieldBase & {
			type: "choice"
			options: { value: string; label: string; icon?: string; help?: string }[]
			default?: string
	  })
	| (FieldBase & {
			type: "number"
			min?: number
			max?: number
			step?: number
			unit?: string
			default?: number
	  })
	| (FieldBase & {
			type: "slider"
			min: number
			max: number
			step?: number
			unit?: string
			default?: number
	  })
	| (FieldBase & {
			type: "tags"
			placeholder?: string
			/** One-click values offered under the input. */
			suggestions?: string[]
			default?: string
	  })

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

	/*
	 * Structured intent. These are advisory: every block that sets them also
	 * emits the equivalent file or hook, so the compiler stays simple and older
	 * builds keep working. Tooling can read them to explain or audit an image.
	 */
	/** kernel.sysctl style keys, e.g. { "vm.swappiness": "10" }. */
	sysctl?: Record<string, string>
	/** Kernel modules to load at boot. */
	modules?: string[]
	/** Kernel modules to blacklist. */
	blacklist?: string[]
	/** Extra apt sources, with optional pin priority. */
	repos?: { name: string; line: string; keyUrl?: string; pin?: number }[]
	/** systemd units written verbatim into etc/systemd/system. */
	units?: { name: string; content: string; enable?: boolean }[]
	/** Environment written into etc/environment. */
	env?: Record<string, string>
	/** debconf preseed lines. */
	debconf?: string[]
	/** Human notes surfaced in the build report. */
	notes?: string[]
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
