import { spawn } from "node:child_process"
import { chmod, mkdir, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { compileRecipe, type Recipe } from "@zenvx/schema"

export type Job = {
	id: string
	name: string
	state: "queued" | "running" | "done" | "failed"
	/** Finish block id, e.g. "image.qcow2". */
	target: string
	/** Finish block config, used by the conversion step. */
	targetCfg: Record<string, unknown>
	workdir: string
	log: string[]
	artifactPath?: string
	/** @deprecated use artifactPath */
	isoPath?: string
	startedAt: number
}

const jobs = new Map<string, Job>()
const ROOT = process.env.ZENVX_WORK ?? "/var/lib/zenvx/builds"

/** Only one heavy build at a time; live-build is IO bound and root-ish. */
let running = false
const queue: Job[] = []

export const getJob = (id: string) => jobs.get(id)

type TargetSpec = {
	artifact: (cfg: Record<string, unknown>) => string
	convert?: (cfg: Record<string, unknown>) => string
}

/**
 * What each finish block leaves in the work directory, and the command that
 * turns the live-build output into it. `convert` is omitted when live-build
 * already produced the artifact.
 */
const TARGETS: Record<string, TargetSpec> = {
	"output.iso": { artifact: () => "live-image-amd64.hybrid.iso" },
	"output.hdd": { artifact: () => "live-image-amd64.img" },
	"image.qcow2": {
		artifact: (cfg) => `disk.${String(cfg.format ?? "qcow2")}`,
		convert: (cfg) => {
			const fmt = String(cfg.format ?? "qcow2")
			const opts = fmt === "qcow2" ? `-o cluster_size=${cfg.clusterSize ?? 65536}` : ""
			return [
				`qemu-img convert -f raw -O ${fmt} ${opts} live-image-amd64.img disk.${fmt}`,
				`qemu-img resize disk.${fmt} ${cfg.sizeGb ?? 20}G`,
			].join(" && ")
		},
	},
	"image.oci": {
		artifact: (cfg) => (cfg.format === "docker" ? "image.docker.tar" : "image.oci.tar"),
		convert: (cfg) => {
			const out = cfg.format === "docker" ? "docker-archive:image.docker.tar" : "oci-archive:image.oci.tar"
			const tag = String(cfg.tag ?? "zenvx/distro:latest")
			return `tar -C chroot --numeric-owner -cf rootfs.tar . && skopeo copy tar:rootfs.tar ${out}:${tag}`
		},
	},
	"image.wsl": {
		artifact: () => "rootfs.tar.gz",
		convert: () => "tar -C chroot --numeric-owner -czf rootfs.tar.gz .",
	},
	"image.rpi": { artifact: () => "live-image-arm64.img" },
	"image.netboot": { artifact: () => "live-image-amd64.netboot.tar.gz" },
	"image.ostree": {
		artifact: () => "repo",
		convert: (cfg) =>
			`ostree --repo=repo init --mode=archive && ostree --repo=repo commit --branch=${cfg.branch ?? "zenvx/stable/x86_64"} chroot`,
	},
}

export const knownTargets = () => Object.keys(TARGETS)

/** The finish block decides the artifact. First one in the recipe wins. */
export function targetOf(recipe: Recipe): { id: string; cfg: Record<string, unknown> } {
	for (const b of recipe.blocks) {
		if (TARGETS[b.def]) return { id: b.def, cfg: (b.cfg ?? {}) as Record<string, unknown> }
	}
	return { id: "output.iso", cfg: {} }
}

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
	const target = targetOf(recipe)
	const job: Job = {
		id: Math.random().toString(36).slice(2, 10),
		name: recipe.name,
		state: "queued",
		target: target.id,
		targetCfg: target.cfg,
		workdir,
		log: [],
		startedAt: Date.now(),
	}
	jobs.set(job.id, job)
	queue.push(job)
	void pump()
	return job
}

/** Run one shell step in the job workdir, streaming into the job log. */
function step(job: Job, command: string): Promise<number> {
	return new Promise((resolve) => {
		job.log.push(`$ ${command}\n`)
		const child = spawn("sh", ["-c", command], { cwd: job.workdir })
		const push = (chunk: Buffer) => {
			job.log.push(chunk.toString())
			if (job.log.length > 4000) job.log.splice(0, 2000)
		}
		child.stdout.on("data", push)
		child.stderr.on("data", push)
		child.on("error", (err) => {
			job.log.push(`${err}\n`)
			resolve(1)
		})
		child.on("close", (code) => resolve(code ?? 1))
	})
}

async function pump(): Promise<void> {
	if (running) return
	const job = queue.shift()
	if (!job) return
	running = true
	job.state = "running"

	const spec = TARGETS[job.target] ?? TARGETS["output.iso"]
	const cfg = job.targetCfg ?? {}

	try {
		// `lb build` needs root. In production this runs inside the container
		// from packages/forge/Dockerfile, never on the host.
		let code = await step(job, "sh ./build.sh")
		if (code === 0 && spec.convert) code = await step(job, spec.convert(cfg))

		job.state = code === 0 ? "done" : "failed"
		if (code === 0) {
			job.artifactPath = join(job.workdir, spec.artifact(cfg))
			job.isoPath = job.artifactPath
		}
	} catch (err) {
		job.state = "failed"
		job.log.push(`${err}\n`)
	} finally {
		running = false
		void pump()
	}
}
