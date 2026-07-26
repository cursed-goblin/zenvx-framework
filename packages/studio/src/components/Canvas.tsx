import { useCallback, useMemo, useRef } from "react"
import ReactFlow, {
	Background,
	Controls,
	type Connection,
	type Edge,
	type Node,
} from "reactflow"
import { useStudio } from "../state/store"
import BlockNode from "./BlockNode"

const nodeTypes = { zenvx: BlockNode }

export default function Canvas() {
	const wrap = useRef<HTMLDivElement>(null)
	const { recipe, mode, addBlock, moveBlock, connect, select, selected } = useStudio()

	const nodes: Node[] = useMemo(
		() =>
			recipe.blocks.map((b) => ({
				id: b.uid,
				type: "zenvx",
				position: b.pos ?? { x: 200, y: 120 },
				selected: selected === b.uid,
				data: { def: b.def },
			})),
		[recipe.blocks, selected],
	)

	const edges: Edge[] = useMemo(
		() =>
			recipe.edges.map((e) => ({
				id: `${e.from}->${e.to}`,
				source: e.from,
				target: e.to,
				animated: mode === "kid",
				style: { stroke: "#2783DE", strokeWidth: 2 },
			})),
		[recipe.edges, mode],
	)

	const onDrop = useCallback(
		(event: React.DragEvent) => {
			event.preventDefault()
			const defId = event.dataTransfer.getData("application/zenvx-block")
			if (!defId) return
			const rect = wrap.current!.getBoundingClientRect()
			addBlock(defId, {
				x: event.clientX - rect.left - 90,
				y: event.clientY - rect.top - 30,
			})
		},
		[addBlock],
	)

	return (
		<main
			ref={wrap}
			className="flex-1 min-w-0 relative"
			onDragOver={(e) => e.preventDefault()}
			onDrop={onDrop}
		>
			<ReactFlow
				nodes={nodes}
				edges={edges}
				nodeTypes={nodeTypes}
				fitView
				proOptions={{ hideAttribution: true }}
				onNodeClick={(_, n) => select(n.id)}
				onPaneClick={() => select(null)}
				onNodeDragStop={(_, n) => moveBlock(n.id, n.position)}
				onConnect={(c: Connection) => {
					if (c.source && c.target && !connect(c.source, c.target)) {
						// Refused: the ports are incompatible or it would create a loop.
						console.info("zenvx: connection refused")
					}
				}}
			>
				<Background gap={20} color="#E6E5E3" />
				<Controls className="pro-only" />
			</ReactFlow>

			{recipe.blocks.length === 0 && (
				<div className="absolute inset-0 grid place-items-center pointer-events-none">
					<p className="text-muted text-center max-w-xs">
						Drag a block from the left to start building your computer.
					</p>
				</div>
			)}
		</main>
	)
}
