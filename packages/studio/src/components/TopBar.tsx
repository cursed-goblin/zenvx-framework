import { useCompiled, useIssues, useStudio } from "../state/store"

export default function TopBar({ onBuild }: { onBuild: () => void }) {
	const { mode, setMode, recipe, rename } = useStudio()
	const compiled = useCompiled()
	const issues = useIssues()
	const blocking = issues.filter((i) => i.level === "error").length

	return (
		<header className="h-16 shrink-0 border-b border-line bg-white flex items-center gap-4 px-6">
			<div className="flex items-center gap-2">
				<div className="w-8 h-8 rounded-lg bg-brand text-white grid place-items-center font-bold">
					Z
				</div>
				<span className="font-semibold">ZenvX Framework</span>
			</div>

			<input
				value={recipe.name}
				onChange={(e) => rename(e.target.value)}
				aria-label="Name of your operating system"
				className="ml-4 px-3 py-2 rounded-lg bg-soft border border-line focus:outline-none focus:ring-2 focus:ring-brand"
			/>

			<div className="ml-auto flex items-center gap-4">
				<span className="pro-only text-sm text-muted">
					{compiled.packages.length} packages · ~
					{(compiled.estimatedMb / 1024).toFixed(1)} GB
				</span>

				<div
					role="tablist"
					aria-label="Interface mode"
					className="flex rounded-lg bg-surface p-1"
				>
					{(["kid", "pro"] as const).map((m) => (
						<button
							key={m}
							role="tab"
							aria-selected={mode === m}
							onClick={() => setMode(m)}
							className={`px-4 py-2 rounded-md text-sm font-medium ${
								mode === m ? "bg-white shadow-card" : "text-muted"
							}`}
						>
							{m === "kid" ? "Kid" : "Pro"}
						</button>
					))}
				</div>

				<button
					onClick={onBuild}
					disabled={blocking > 0}
					className="px-5 py-3 rounded-lg bg-brand text-white font-semibold disabled:opacity-40"
				>
					{blocking > 0 ? `${blocking} to fix` : "Turn it on"}
				</button>
			</div>
		</header>
	)
}
