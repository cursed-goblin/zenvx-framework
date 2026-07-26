import { BLOCKS, CATEGORY_LABELS } from "@zenvx/schema"
import { useStudio } from "../state/store"
import BlockIcon from "./BlockIcon"

const ORDER = ["start", "looks", "apps", "me", "under-the-hood", "finish"] as const

export default function Palette() {
	const { mode, addBlock } = useStudio()

	return (
		<aside className="w-64 shrink-0 border-r border-line bg-white overflow-y-auto p-4 space-y-6">
			{ORDER.map((cat) => {
				const blocks = BLOCKS.filter(
					(b) => b.category === cat && (mode === "pro" || !b.proOnly),
				)
				if (!blocks.length) return null
				const label =
					mode === "kid" ? CATEGORY_LABELS[cat].kidLabel : CATEGORY_LABELS[cat].label
				return (
					<section key={cat}>
						<h2 className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">
							{label}
						</h2>
						<div className="space-y-2">
							{blocks.map((b) => (
								<button
									key={b.id}
									draggable
									onDragStart={(e) =>
										e.dataTransfer.setData("application/zenvx-block", b.id)
									}
									onClick={() => addBlock(b.id)}
									title={b.blurb}
									className="w-full min-h-[44px] flex items-center gap-3 p-3 rounded-xl border border-line hover:border-brand hover:bg-brandSoft text-left"
								>
									<BlockIcon name={b.icon} />
									<span className="text-sm font-medium">
										{mode === "kid" ? b.kidLabel : b.label}
									</span>
								</button>
							))}
						</div>
					</section>
				)
			})}
		</aside>
	)
}
