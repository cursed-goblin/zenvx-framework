import { useEffect, useState } from "react"
import { useCompiled, useStudio } from "../state/store"

/**
 * Not an emulator. A faithful DOM mock of the chosen desktop, driven entirely by
 * the compiled recipe's sim hints. Answers "what will my computer look like?"
 * in zero seconds, which is the only question a beginner has.
 */
export default function Simulator({ onClose }: { onClose: () => void }) {
	const recipe = useStudio((s) => s.recipe)
	const { sim } = useCompiled()
	const [booted, setBooted] = useState(false)
	const [openApp, setOpenApp] = useState<string | null>(null)

	useEffect(() => {
		const t = setTimeout(() => setBooted(true), 1400)
		return () => clearTimeout(t)
	}, [])

	const panel = sim.panel ?? "bottom"
	const panelClass =
		panel === "top"
			? "top-0 left-0 right-0 h-10 flex-row"
			: panel === "left"
				? "top-0 bottom-0 left-0 w-14 flex-col"
				: "bottom-0 left-0 right-0 h-12 flex-row"

	return (
		<div className="fixed inset-0 z-50 bg-black/60 grid place-items-center p-6">
			<div className="w-full max-w-4xl rounded-xl overflow-hidden shadow-2xl bg-[#191919]">
				<div className="h-10 flex items-center px-4 gap-2 bg-[#202020] text-white/70 text-sm">
					<span className="font-medium text-white">{recipe.name}</span>
					<span>· live preview</span>
					<button onClick={onClose} className="ml-auto px-3 py-1 rounded hover:bg-white/10">
						Close
					</button>
				</div>

				<div
					className="relative h-[420px]"
					style={{ background: sim.wallpaper ?? "linear-gradient(160deg,#101828,#2783DE)" }}
				>
					{!booted ? (
						<div className="absolute inset-0 grid place-items-center bg-black text-white">
							<div className="text-center">
								<div className="text-2xl font-semibold">{recipe.name}</div>
								<div className="mt-3 h-1 w-40 mx-auto bg-white/20 overflow-hidden rounded">
									<div className="h-full w-1/3 bg-white/80 animate-pulse" />
								</div>
								<div className="mt-3 text-xs text-white/50">starting up…</div>
							</div>
						</div>
					) : (
						<>
							<div className="p-6 grid grid-cols-6 gap-4 content-start">
								{sim.desktopIcons.map((ic, n) => (
									<button
										key={n}
										onClick={() => setOpenApp(ic.label)}
										className="text-white text-xs flex flex-col items-center gap-2 p-2 rounded-lg hover:bg-white/10"
									>
										<span
											className="w-11 h-11 rounded-xl grid place-items-center"
											style={{ background: sim.accent }}
										/>
										{ic.label}
									</button>
								))}
							</div>

							{openApp && (
								<div className="absolute left-1/4 top-16 w-96 rounded-xl overflow-hidden bg-[#202020] border border-white/20 shadow-2xl">
									<div className="h-9 px-3 flex items-center text-white/80 text-sm bg-[#383836]">
										{openApp}
										<button
											onClick={() => setOpenApp(null)}
											className="ml-auto px-2 hover:bg-white/10 rounded"
										>
											×
										</button>
									</div>
									<div className="p-4 text-white/60 text-sm h-40">
										This app is installed in your OS.
									</div>
								</div>
							)}

							<div
								className={`absolute flex items-center gap-2 px-3 bg-black/40 backdrop-blur ${panelClass}`}
							>
								<span
									className="w-7 h-7 rounded-md"
									style={{ background: sim.accent }}
								/>
								{panel !== "left" && (
									<span className="text-white/70 text-xs ml-auto">{recipe.name}</span>
								)}
							</div>
						</>
					)}
				</div>
			</div>
		</div>
	)
}
