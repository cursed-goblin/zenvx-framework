import { blockById } from "@zenvx/schema"
import { useCompiled, useIssues, useStudio } from "../state/store"

export default function Inspector() {
	const { recipe, selected, setCfg, mode } = useStudio()
	const issues = useIssues()
	const compiled = useCompiled()
	const block = recipe.blocks.find((b) => b.uid === selected)
	const def = block ? blockById(block.def) : undefined

	return (
		<aside className="w-80 shrink-0 border-l border-line bg-white overflow-y-auto p-4 space-y-6">
			{def && block ? (
				<section>
					<h2 className="font-semibold">{mode === "kid" ? def.kidLabel : def.label}</h2>
					<p className="text-sm text-muted mt-1">{def.blurb}</p>
					<div className="mt-4 space-y-4">
						{(def.fields ?? []).map((f) => {
							const value = block.cfg[f.key] ?? (f as any).default ?? ""
							const id = `${block.uid}-${f.key}`
							return (
								<div key={f.key}>
									<label htmlFor={id} className="block text-sm font-medium mb-1">
										{f.label}
									</label>
									{f.type === "choice" ? (
										<div className="grid grid-cols-2 gap-2">
											{f.options.map((o) => (
												<button
													key={o.value}
													onClick={() => setCfg(block.uid, f.key, o.value)}
													className={`min-h-[44px] px-3 rounded-lg border text-sm ${
														value === o.value
															? "border-brand bg-brandSoft font-medium"
															: "border-line"
													}`}
												>
													{o.label}
												</button>
											))}
										</div>
									) : f.type === "toggle" ? (
										<input
											id={id}
											type="checkbox"
											className="w-5 h-5 accent-[#2783DE]"
											checked={value !== false}
											onChange={(e) => setCfg(block.uid, f.key, e.target.checked)}
										/>
									) : (
										<input
											id={id}
											type={f.type === "color" ? "color" : "text"}
											value={String(value)}
											placeholder={(f as any).placeholder}
											onChange={(e) => setCfg(block.uid, f.key, e.target.value)}
											className="w-full min-h-[44px] px-3 rounded-lg border border-line focus:outline-none focus:ring-2 focus:ring-brand"
										/>
									)}
								</div>
							)
						})}
						{!def.fields?.length && (
							<p className="text-sm text-muted">Nothing to set up. It just works.</p>
						)}
					</div>
				</section>
			) : (
				<section>
					<h2 className="font-semibold">Your computer</h2>
					<p className="text-sm text-muted mt-1">
						Click a block on the canvas to change it.
					</p>
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
