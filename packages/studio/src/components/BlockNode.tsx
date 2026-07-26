import { blockById } from "@zenvx/schema"
import { Handle, Position, type NodeProps } from "reactflow"
import { useStudio } from "../state/store"
import BlockIcon from "./BlockIcon"

export default function BlockNode({ id, data, selected }: NodeProps) {
	const mode = useStudio((s) => s.mode)
	const removeBlock = useStudio((s) => s.removeBlock)
	const def = blockById(data.def)
	if (!def) return null

	return (
		<div
			className={`rounded-xl bg-white border px-4 py-3 shadow-card min-w-[180px] ${
				selected ? "border-brand ring-2 ring-brandSoft" : "border-line"
			}`}
		>
			{def.inputs.length > 0 && (
				<Handle type="target" position={Position.Top} className="pro-only" />
			)}
			<div className="flex items-center gap-3">
				<BlockIcon name={def.icon} size={mode === "kid" ? 28 : 22} />
				<div>
					<div className="font-medium leading-tight">
						{mode === "kid" ? def.kidLabel : def.label}
					</div>
					<div className="pro-only text-xs text-muted">{def.id}</div>
				</div>
				<button
					onClick={() => removeBlock(id)}
					aria-label="Remove block"
					className="ml-auto w-8 h-8 rounded-md text-muted hover:bg-surface"
				>
					×
				</button>
			</div>
			{def.outputs.length > 0 && (
				<Handle type="source" position={Position.Bottom} className="pro-only" />
			)}
		</div>
	)
}
