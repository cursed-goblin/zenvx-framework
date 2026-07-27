import { blockById } from "@zenvx/schema"
import type { FieldDef } from "@zenvx/schema"
import { useMemo, useState } from "react"
import { useCompiled, useIssues, useStudio } from "../state/store"

const inputCls =
	"w-full min-h-[44px] px-3 rounded-lg border border-line focus:outline-none focus:ring-2 focus:ring-brand"

function Field({
	f,
	value,
	onChange,
}: {
	f: FieldDef
	value: string | number | boolean
	onChange: (v: string | number | boolean) => void
}) {
	if (f.type === "choice") {
		return (
			<div className="grid grid-cols-2 gap-2">
				{f.options.map((o) => (
					<button
						key={o.value}
						title={o.help}
						onClick={() => onChange(o.value)}
						className={`min-h-[44px] px-3 rounded-lg border text-sm ${
							value === o.value ? "border-brand bg-brandSoft font-medium" : "border-line"
						}`}
					>
						{o.label}
					</button>
				))}
			</div>
		)
	}

	if (f.type === "toggle") {
		return (
			<input
				type="checkbox"
				className="w-5 h-5 accent-[#2783DE]"
				checked={value !== false}
				onChange={(e) => onChange(e.target.checked)}
			/>
		)
	}

	if (f.type === "slider") {
		const n = Number(value ?? f.default ?? f.min)
		return (
			<div className="flex items-center gap-3">
				<input
					type="range"
					min={f.min}
					max={f.max}
					step={f.step ?? 1}
					value={n}
					onChange={(e) => onChange(Number(e.target.value))}
					className="flex-1 accent-[#2783DE]"
				/>
				<span className="text-sm tabular-nums text-muted w-16 text-right">
					{n}
					{f.unit ?? ""}
				</span>
			</div>
		)
	}

	if (f.type === "number") {
		return (
			<div className="flex items-center gap-2">
				<input
					type="number"
					min={f.min}
					max={f.max}
					step={f.step ?? 1}
					value={Number(value ?? f.default ?? 0)}
					onChange={(e) => onChange(Number(e.target.value))}
					className={inputCls}
				/>
				{f.unit && <span className="text-sm text-muted">{f.unit}</span>}
			</div>
		)
	}

	if (f.type === "tags") {
		const raw = String(value ?? "")
		const items = raw.split(",").map((s) => s.trim()).filter(Boolean)
		const add = (t: string) => onChange([...items, t].join(", "))
		const drop = (t: string) => onChange(items.filter((i) => i !== t).join(", "))
		return (
			<div className="space-y-2">
				<input
					type="text"
					value={raw}
					placeholder={f.placeholder}
					onChange={(e) => onChange(e.target.value)}
					className={`${inputCls} font-mono text-sm`}
				/>
				{items.length > 0 && (
					<div className="flex flex-wrap gap-1">
						{items.map((t) => (
							<button
								key={t}
								onClick={() => drop(t)}
								title="Remove"
								className="px-2 py-1 rounded-md bg-surface text-xs font-mono"
							>
								{t} ×
							</button>
						))}
					</div>
				)}
				{f.suggestions && f.suggestions.length > 0 && (
					<div className="flex flex-wrap gap-1">
						{f.suggestions
							.filter((s) => !items.includes(s))
							.map((s) => (
								<button
									key={s}
									onClick={() => add(s)}
									className="px-2 py-1 rounded-md border border-line text-xs font-mono text-muted"
								>
									+ {s}
								</button>
							))}
					</div>
				)}
			</div>
		)
	}

	if (f.type === "text" && f.multiline) {
		return (
			<div>
				<textarea
					rows={f.rows ?? 6}
					value={String(value ?? "")}
					placeholder={f.placeholder}
					onChange={(e) => onChange(e.target.value)}
					className={`${inputCls} py-2 font-mono text-xs leading-relaxed`}
				/>
				{f.syntax && (
					<p className="text-[11px] text-muted mt-1 font-mono">{f.syntax}</p>
				)}
			</div>
		)
	}

	return (
		<input
			type={f.type === "color" ? "color" : "text"}
			value={String(value ?? "")}
			placeholder={(f as any).placeholder}
			onChange={(e) => onChange(e.target.value)}
			className={inputCls}
		/>
	)
}

export default function Inspector() {
	const { recipe, selected, setCfg, mode } = useStudio()
	const issues = useIssues()
	const compiled = useCompiled()
	const [query, setQuery] = useState("")
	const [showAdvanced, setShowAdvanced] = useState(false)

	const block = recipe.blocks.find((b) => b.uid === selected)
	const def = block ? blockById(block.def) : undefined

	const valueOf = (f: FieldDef) =>
		block?.cfg[f.key] ?? (f as any).default ?? (f.type === "toggle" ? false : "")

	/** dependsOn, advanced, kid mode and the search box all filter here. */
	const visible = useMemo(() => {
		if (!def || !block) return [] as FieldDef[]
		const q = query.trim().toLowerCase()
		return (def.fields ?? []).filter((f) => {
			if (f.dependsOn) {
				const other = def.fields?.find((x) => x.key === f.dependsOn!.key)
				const v = block.cfg[f.dependsOn.key] ?? (other as any)?.default
				if (v !== f.dependsOn.equals) return false
			}
			if (f.advanced && (mode === "kid" || !showAdvanced)) return false
			if (q && !`${f.label} ${f.key} ${f.help ?? ""}`.toLowerCase().includes(q)) return false
			return true
		})
	}, [def, block, query, showAdvanced, mode])

	const groups = useMemo(() => {
		const out = new Map<string, FieldDef[]>()
		for (const f of visible) {
			const g = f.group ?? ""
			out.set(g, [...(out.get(g) ?? []), f])
		}
		return [...out.entries()]
	}, [visible])

	const advancedCount = (def?.fields ?? []).filter((f) => f.advanced).length
	const totalCount = (def?.fields ?? []).length

	return (
		<aside className="w-80 shrink-0 border-l border-line bg-white overflow-y-auto p-4 space-y-6">
			{def && block ? (
				<section>
					<div className="flex items-start justify-between gap-2">
						<h2 className="font-semibold">{mode === "kid" ? def.kidLabel : def.label}</h2>
						{def.proOnly && (
							<span className="pro-only text-[10px] uppercase tracking-wide px-2 py-1 rounded-md bg-surface text-muted">
								pro
							</span>
						)}
					</div>
					<p className="text-sm text-muted mt-1">{def.blurb}</p>

					{totalCount > 8 && (
						<input
							type="search"
							value={query}
							placeholder={`Search ${totalCount} settings`}
							onChange={(e) => setQuery(e.target.value)}
							className={`${inputCls} mt-3 text-sm`}
						/>
					)}

					<div className="mt-4 space-y-6">
						{groups.map(([group, fields]) => (
							<div key={group || "_"} className="space-y-4">
								{group && (
									<h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted">
										{group}
									</h3>
								)}
								{fields.map((f) => (
									<div key={f.key}>
										<label className="block text-sm font-medium mb-1">{f.label}</label>
										<Field
											f={f}
											value={valueOf(f)}
											onChange={(v) => setCfg(block.uid, f.key, v)}
										/>
										{f.help && <p className="text-xs text-muted mt-1">{f.help}</p>}
									</div>
								))}
							</div>
						))}

						{visible.length === 0 && (
							<p className="text-sm text-muted">
								{totalCount === 0
									? "Nothing to set up. It just works."
									: "No setting matches that search."}
							</p>
						)}

						{advancedCount > 0 && mode !== "kid" && (
							<button
								onClick={() => setShowAdvanced((s) => !s)}
								className="w-full min-h-[44px] rounded-lg border border-line text-sm text-muted"
							>
								{showAdvanced ? "Hide" : "Show"} {advancedCount} advanced settings
							</button>
						)}
					</div>
				</section>
			) : (
				<section>
					<h2 className="font-semibold">Your computer</h2>
					<p className="text-sm text-muted mt-1">Click a block on the canvas to change it.</p>
				</section>
			)}

			<section>
				<h2 className="font-semibold mb-2">Checks</h2>
				{issues.length === 0 ? (
					<p className="text-sm text-good">Everything looks good.</p>
				) : (
					<ul className="space-y-2">
						{issues.map((i, n) => (
							<li
								key={n}
								className={`text-sm rounded-lg px-3 py-2 ${
									i.level === "error"
										? "bg-[#FCE9E7] text-[#8a2f26]"
										: i.level === "warn"
											? "bg-[#FBEBDE] text-[#7a4715]"
											: "bg-surface text-muted"
								}`}
							>
								{i.message}
							</li>
						))}
					</ul>
				)}
			</section>

			<section className="pro-only">
				<h2 className="font-semibold mb-2">Generated files</h2>
				<ul className="text-xs font-mono text-muted space-y-1">
					{compiled.files.map((f) => (
						<li key={f.path} className="truncate">
							{f.path}
						</li>
					))}
				</ul>
			</section>
		</aside>
	)
}
