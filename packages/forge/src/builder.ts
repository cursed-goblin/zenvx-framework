import { spawn } from "node:child_process"
import { chmod, mkdir, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { compileRecipe, type Recipe } from "@zenvx/schema"

export type Job = {
	id: string
	name: string
	state: "queued" | "running" | "done" | "failed"
	workdir: string
	log: string[]
	isoPath?: string
	startedAt: number
}

const jobs = new Map<string, Job>()
const ROOT = process.env.ZENVX_WORK ?? "/var/lib/zenvx/builds"

/** Only one heavy build at a time; live-build is IO bound and root-ish. */
let running = false
const queue: Job[] = []

export const getJob = (id: string) => jobs.get(id)

/** Write the compiled virtual file tree to a real directory. */
export async function materialize(recipe: Recipe): Promise<string> {
	const { files } = compileRecipe(recipe)
	const dir = join(ROOT, `${Date.now()}-${recipe.name.replace(/[^\w-]/g, "")}`)
	for (const f of files) {
		const target = join(dir, f.path)
		await mkdir(dirname(target), { recursive: true })
		await writeFile(target, f.content, "utf8")
		if (f.mode) await chmod(target, parseInt(f.mode, 8))
	}
	return dir
}

export function enqueue(recipe: Recipe, workdir: string): Job {
	const job: Job = {
		id: Math.random().toString(36).slice(2, 10),
		name: recipe.name,
		state: "queued",
		workdir,
		log: [],
		startedAt: Date.now(),
	}
	jobs.set(job.id, job)
	queue.push(job)
	pump()
	return job
}

function pump() {
	if (running) return
	const job = queue.shift()
	if (!job) return
	running = true
	job.state = "running"

	// `lb build` needs root. In production this runs inside the container from
	// packages/forge/Dockerfile, never on the host.
	const child = spawn("sh", ["./build.sh"], { cwd: job.workdir })
	const push = (chunk: Buffer) => {
		job.log.push(chunk.toString())
		if (job.log.length > 4000) job.log.splice(0, 2000)
	}
	child.stdout.on("data", push)
	child.stderr.on("data", push)
	child.on("close", (code) => {
		job.state = code === 0 ? "done" : "failed"
		if (code === 0) job.isoPath = join(job.workdir, "live-image-amd64.hybrid.iso")
		running = false
		pump()
	})
}
