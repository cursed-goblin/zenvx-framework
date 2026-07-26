import { useState } from "react"
import Canvas from "./components/Canvas"
import Inspector from "./components/Inspector"
import Palette from "./components/Palette"
import TopBar from "./components/TopBar"
import Simulator from "./sim/Simulator"
import { useStudio } from "./state/store"

export default function App() {
	const mode = useStudio((s) => s.mode)
	const [showSim, setShowSim] = useState(false)

	return (
		<div
			className={`h-screen w-screen flex flex-col bg-soft ${
				mode === "kid" ? "kid-mode" : ""
			}`}
		>
			<TopBar onBuild={() => setShowSim(true)} />
			<div className="flex-1 min-h-0 flex">
				<Palette />
				<Canvas />
				<Inspector />
			</div>
			{showSim && <Simulator onClose={() => setShowSim(false)} />}
		</div>
	)
}
