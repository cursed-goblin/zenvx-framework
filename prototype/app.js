import { ALL_BLOCKS, CATEGORY_LABELS, CATEGORY_ORDER, blockById, stats } from "./catalog-pro.js"

/* ---------------------------------------------------------------- state */

const state = {
	mode: "kid", // kid | pro
	blocks: [], // { uid, def, cfg }
	selected: null,
	showAdvanced: false,
	search: "",
}

let seq = 0
const nextUid = () => `b${++seq}${Math.random().toString(36).slice(2, 5)}`

const defaultsFor = (def) => {
	const out = {}
	for (const f of blockById(def).fields) if (f.default !== undefined) out[f.key] = f.default
	return out
}

const addBlock = (def) => {
	const d = blockById(def)
	if (state.blocks.some((b) => b.def === def)) return // one of each, like the schema singletons
	const uid = nextUid()
	state.blocks.push({ uid, def, cfg: defaultsFor(def) })
	state.selected = uid
	state.search = ""
	render()
	void d
}

const removeBlock = (uid) => {
	state.blocks = state.blocks.filter((b) => b.uid !== uid)
	if (state.selected === uid) state.selected = null
	render()
}

const setCfg = (uid, key, value) => {
	const b = state.blocks.find((x) => x.uid === uid)
	if (!b) return
	b.cfg[key] = value
	render()
}

/* Rough size estimate, purely for the demo readout. */
const estimate = () =>
	state.blocks.reduce((mb, b) => {
		const d = blockById(b.def)
		if (d.category === "start") return mb + 900
		if (d.category === "looks") return mb + 320
		if (d.category === "apps") return mb + 140
		if (d.category === "under-the-hood") return mb + 90
		return mb + 20
	}, 0)

/* ------------------------------------------------------------- elements */

const el = (tag, props = {}, kids = []) => {
	const n = document.createElement(tag)
	for (const [k, v] of Object.entries(props)) {
		if (k === "class") n.className = v
		else if (k === "text") n.textContent = v
		else if (k.startsWith("on")) n.addEventListener(k.slice(2), v)
		else if (v !== undefined && v !== null) n.setAttribute(k, v)
	}
	for (const kid of [].concat(kids)) if (kid) n.appendChild(kid)
	return n
}

/* -------------------------------------------------------------- palette */

function renderPalette() {
	const root = document.getElementById("palette")
	root.textContent = ""
	for (const cat of CATEGORY_ORDER) {
		const inCat = ALL_BLOCKS.filter(
			(b) => b.category === cat && (state.mode === "pro" || !b.proOnly),
		)
		if (!inCat.length) continue
		root.appendChild(el("h3", { text: CATEGORY_LABELS[cat] }))
		for (const b of inCat) {
			const used = state.blocks.some((x) => x.def === b.id)
			const btn = el("button", {
				title: b.blurb,
				style: used ? "opacity:.45" : "",
				onclick: () => addBlock(b.id),
			})
			if (b.proOnly) btn.appendChild(el("span", { class: "pro-badge", text: "pro" }))
			btn.appendChild(document.createTextNode(state.mode === "kid" ? b.kidLabel : b.label))
			root.appendChild(btn)
		}
	}
}

/* --------------------------------------------------------------- canvas */

const RANK = { start: 0, looks: 1, apps: 2, me: 3, "under-the-hood": 4, finish: 5 }
const NW = 190

function layout() {
	const columns = {}
	return state.blocks.map((b) => {
		const r = RANK[blockById(b.def).category] ?? 0
		const i = (columns[r] = (columns[r] ?? -1) + 1)
		return { ...b, x: 28 + r * (NW + 46), y: 22 + i * 102 }
	})
}

function renderCanvas() {
	const root = document.getElementById("canvas")
	root.textContent = ""
	const placed = layout()

	const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
	svg.setAttribute("class", "wires")
	root.appendChild(svg)

	// Wire every block to the ones in the next occupied column.
	const byRank = {}
	for (const p of placed) (byRank[RANK[blockById(p.def).category]] ??= []).push(p)
	const ranks = Object.keys(byRank).map(Number).sort((a, b) => a - b)
	for (let i = 0; i < ranks.length - 1; i++) {
		for (const from of byRank[ranks[i]]) {
			for (const to of byRank[ranks[i + 1]]) {
				const x1 = from.x + NW
				const y1 = from.y + 30
				const x2 = to.x
				const y2 = to.y + 30
				const mx = (x1 + x2) / 2
				const path = document.createElementNS("http://www.w3.org/2000/svg", "path")
				path.setAttribute("d", `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`)
				path.setAttribute("stroke", "#2783DE")
				path.setAttribute("stroke-width", "2.5")
				path.setAttribute("fill", "none")
				path.setAttribute("opacity", "0.5")
				svg.appendChild(path)
			}
		}
	}

	for (const p of placed) {
		const d = blockById(p.def)
		const node = el("div", {
			class: `node${state.selected === p.uid ? " selected" : ""}`,
			style: `left:${p.x}px;top:${p.y}px`,
			onclick: () => {
				state.selected = p.uid
				state.search = ""
				render()
			},
		})
		node.appendChild(el("div", { class: "t", text: state.mode === "kid" ? d.kidLabel : d.label }))
		node.appendChild(
			el("div", { class: "s", text: `${d.fields.length} setting${d.fields.length === 1 ? "" : "s"}` }),
		)
		node.appendChild(
			el("button", {
				class: "x",
				title: "Remove",
				text: "×",
				onclick: (e) => {
					e.stopPropagation()
					removeBlock(p.uid)
				},
			}),
		)
		root.appendChild(node)
	}

	const height = Math.max(...placed.map((p) => p.y), 0) + 180
	root.style.height = `${height}px`
	root.style.width = `${28 + 6 * (NW + 46)}px`
}

/* ------------------------------------------------------------ inspector */

function fieldControl(uid, cfg, f) {
	const value = cfg[f.key] ?? f.default ?? ""
	const set = (v) => setCfg(uid, f.key, v)

	if (f.type === "toggle") {
		return el("div", { class: "row" }, [
			el("span", { text: f.label }),
			el("button", {
				class: "switch",
				"aria-pressed": String(!!value),
				"aria-label": f.label,
				onclick: () => set(!value),
			}),
		])
	}

	const wrap = el("div", {}, [el("label", { text: f.label })])

	if (f.type === "choice") {
		const row = el("div", { class: "choices" })
		for (const o of f.options) {
			row.appendChild(
				el("button", {
					text: o,
					"aria-pressed": String(String(value) === o),
					onclick: () => set(o),
				}),
			)
		}
		wrap.appendChild(row)
	} else if (f.type === "slider") {
		const out = el("span", { class: "help", text: `${value}${f.unit ? ` ${f.unit}` : ""}` })
		const input = el("input", {
			type: "range",
			min: f.min,
			max: f.max,
			value: String(value),
			oninput: (e) => {
				out.textContent = `${e.target.value}${f.unit ? ` ${f.unit}` : ""}`
			},
			onchange: (e) => set(Number(e.target.value)),
		})
		wrap.appendChild(input)
		wrap.appendChild(out)
	} else if (f.type === "number") {
		wrap.appendChild(
			el("input", {
				type: "number",
				min: f.min,
				max: f.max,
				value: String(value),
				onchange: (e) => set(Number(e.target.value)),
			}),
		)
		if (f.unit) wrap.appendChild(el("div", { class: "help", text: f.unit }))
	} else if (f.type === "color") {
		wrap.appendChild(
			el("input", { type: "color", value: String(value || "#2783DE"), onchange: (e) => set(e.target.value) }),
		)
	} else if (f.type === "area") {
		wrap.appendChild(
			el("textarea", { rows: "5", placeholder: f.hint ?? "", onchange: (e) => set(e.target.value) }),
		).value = String(value)
		wrap.lastChild.value = String(value)
		if (f.hint) wrap.appendChild(el("div", { class: "help", text: f.hint }))
	} else if (f.type === "tags") {
		const current = String(value || "")
			.split(",")
			.map((s) => s.trim())
			.filter(Boolean)
		const chips = el("div", { class: "chips" })
		for (const t of current) {
			const chip = el("span", { class: "chip", text: t })
			chip.appendChild(
				el("button", {
					text: "×",
					"aria-label": `Remove ${t}`,
					onclick: () => set(current.filter((x) => x !== t).join(", ")),
				}),
			)
			chips.appendChild(chip)
		}
		wrap.appendChild(chips)
		const input = el("input", {
			type: "text",
			placeholder: "Type and press Enter",
			onkeydown: (e) => {
				if (e.key !== "Enter" || !e.target.value.trim()) return
				e.preventDefault()
				set([...current, e.target.value.trim()].join(", "))
			},
		})
		wrap.appendChild(input)
		const sug = (f.suggestions ?? []).filter((s) => !current.includes(s))
		if (sug.length) {
			const row = el("div", { class: "suggest" })
			for (const s of sug.slice(0, 6)) {
				row.appendChild(el("button", { text: `+ ${s}`, onclick: () => set([...current, s].join(", ")) }))
			}
			wrap.appendChild(row)
		}
	} else {
		const input = el("input", {
			type: "text",
			placeholder: f.hint ?? "",
			onchange: (e) => set(e.target.value),
		})
		input.value = String(value)
		wrap.appendChild(input)
	}

	if (f.help) wrap.appendChild(el("div", { class: "help", text: f.help }))
	return wrap
}

function renderInspector() {
	const root = document.getElementById("inspector")
	root.textContent = ""
	const chosen = state.blocks.find((b) => b.uid === state.selected)

	if (!chosen) {
		root.appendChild(el("h2", { text: "Nothing picked" }))
		root.appendChild(
			el("p", {
				class: "blurb",
				text:
					state.mode === "kid"
						? "Pick a piece on the left to start building."
						: "Select a block to edit its settings. Switch to pro mode for the expert catalog.",
			}),
		)
		return
	}

	const d = blockById(chosen.def)
	root.appendChild(el("h2", { text: state.mode === "kid" ? d.kidLabel : d.label }))
	root.appendChild(el("p", { class: "blurb", text: d.blurb }))

	let fields = d.fields

	// dependsOn
	fields = fields.filter((f) => {
		if (!f.dependsOn) return true
		const v = chosen.cfg[f.dependsOn.key]
		return v === f.dependsOn.equals || String(v) === String(f.dependsOn.equals)
	})

	const advancedCount = fields.filter((f) => f.advanced).length
	const showAdv = state.mode === "pro" && state.showAdvanced
	if (!showAdv) fields = fields.filter((f) => !f.advanced)

	if (d.fields.length > 8) {
		const s = el("input", {
			class: "search",
			type: "text",
			placeholder: "Search settings",
			oninput: (e) => {
				state.search = e.target.value
				renderInspector()
			},
		})
		s.value = state.search
		root.appendChild(s)
	}
	if (state.search) {
		const q = state.search.toLowerCase()
		fields = fields.filter((f) => f.label.toLowerCase().includes(q) || f.key.toLowerCase().includes(q))
	}

	let lastGroup = null
	for (const f of fields) {
		if ((f.group ?? null) !== lastGroup) {
			lastGroup = f.group ?? null
			if (lastGroup) root.appendChild(el("div", { class: "group", text: lastGroup }))
		}
		root.appendChild(el("div", { class: "field" }, [fieldControl(chosen.uid, chosen.cfg, f)]))
	}

	if (!fields.length) root.appendChild(el("p", { class: "empty", text: "Nothing to configure here." }))

	if (state.mode === "pro" && advancedCount) {
		root.appendChild(
			el("button", {
				class: "reveal",
				text: showAdv ? "Hide advanced settings" : `Show ${advancedCount} advanced settings`,
				onclick: () => {
					state.showAdvanced = !state.showAdvanced
					renderInspector()
				},
			}),
		)
	}
}

/* --------------------------------------------------------------- header */

function renderHeader() {
	const s = stats()
	document.getElementById("count").textContent =
		`${state.blocks.length} of ${s.blocks} blocks · ${s.fields} settings available · about ${Math.round(estimate() / 100) / 10} GB`
	for (const btn of document.querySelectorAll("#mode button")) {
		btn.setAttribute("aria-pressed", String(btn.dataset.mode === state.mode))
	}
	document.body.className = state.mode === "kid" ? "kid" : "pro"
}

/* -------------------------------------------------------------- preview */

function preview() {
	const look = state.blocks.find((b) => b.def === "look.theme")
	const brand = state.blocks.find((b) => b.def === "identity.brand")
	const wallpapers = {
		space: "linear-gradient(160deg,#101828,#2783DE)",
		forest: "linear-gradient(160deg,#14281f,#46A171)",
		sunset: "linear-gradient(160deg,#3a1c1c,#D5803B)",
		ocean: "linear-gradient(160deg,#07243a,#2AA5B5)",
		candy: "linear-gradient(160deg,#3a1230,#E56ea0)",
		mono: "linear-gradient(160deg,#1b1b1b,#4a4a4a)",
		plain: "linear-gradient(160deg,#202020,#383836)",
	}
	const name = brand?.cfg.name || "MyOS"
	const screen = document.getElementById("screen")
	const overlay = document.getElementById("overlay")

	overlay.classList.add("on")
	screen.style.background = "#191919"
	screen.textContent = `Starting ${name}…`

	setTimeout(() => {
		screen.textContent = ""
		screen.style.background = wallpapers[look?.cfg.wallpaper] ?? wallpapers.plain
		const icons = el("div", { class: "icons" })
		for (const b of state.blocks.filter((x) => blockById(x.def).category === "apps").slice(0, 5)) {
			const d = blockById(b.def)
			icons.appendChild(el("div", {}, [el("span"), el("i", { text: state.mode === "kid" ? d.kidLabel : d.label })]))
		}
		screen.appendChild(icons)
		screen.appendChild(el("div", { class: "panel" }, [el("span", { text: name })]))
	}, 1300)
}

/* ---------------------------------------------------------------- boot */

function render() {
	renderHeader()
	renderPalette()
	renderCanvas()
	renderInspector()
}

export function mount() {
	for (const btn of document.querySelectorAll("#mode button")) {
		btn.addEventListener("click", () => {
			state.mode = btn.dataset.mode
			render()
		})
	}
	document.getElementById("run").addEventListener("click", preview)
	document.getElementById("close").addEventListener("click", () => {
		document.getElementById("overlay").classList.remove("on")
	})

	// A sensible starting recipe, same spirit as examples/kid-first-distro.
	for (const id of ["base.debian-stable", "desktop.xfce", "look.theme", "app.browser", "app.paint", "identity.brand", "output.iso"]) {
		addBlock(id)
	}
	state.selected = null
	render()
}
