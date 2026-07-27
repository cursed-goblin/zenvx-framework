import { createReadStream } from "node:fs"
import { stat } from "node:fs/promises"
import { createServer } from "node:http"
import { extname, join, normalize, resolve, sep } from "node:path"
import { compileRecipe, validate, type Recipe } from "@zenvx/schema"
import { enqueue, getJob, materialize } from "./builder.js"

const PORT = Number(process.env.PORT ?? 8787)

/**
 * Static web root. Defaults to the prototype folder in the repo, so a single
 * `docker compose up` gives you the interface and the API on one origin.
 */
const WEB_ROOT = resolve(process.env.ZENVX_WEB ?? "prototype")

const TYPES: Record<string, string> = {
	".html": "text/html; charset=utf-8",
	".js": "text/javascript; charset=utf-8",
	".css": "text/css; charset=utf-8",
	".json": "application/json; charset=utf-8",
	".svg": "image/svg+xml",
	".png": "image/png",
	".ico": "image/x-icon",
}

const json = (res: any, code: number, body: unknown) => {
	res.writeHead(code, { "content-type": "application/json" })
	res.end(JSON.stringify(body))
}

const readBody = (req: any) =>
	new Promise<string>((resolve, reject) => {
		let data = ""
		req.on("data", (c: Buffer) => {
			data += c
			if (data.length > 1_000_000) reject(new Error("recipe too large"))
		})
		req.on("end", () => resolve(data))
		req.on("error", reject)
	})

/**
 * Serve a file from WEB_ROOT.
 *
 * Every path is normalized and resolved, then checked to still live inside the
 * web root, so `../../etc/passwd` and friends get a 403 rather than a file.
 * No directory listings, no symlink following outside the root.
 */
async function serveStatic(req: any, res: any): Promise<boolean> {
	if (req.method !== "GET" && req.method !== "HEAD") return false

	const urlPath = decodeURIComponent((req.url ?? "/").split("?")[0])
	const relative = normalize(urlPath).replace(/^(\.\.(\/|\\|$))+/, "")
	let target = resolve(join(WEB_ROOT, relative))

	if (target !== WEB_ROOT && !target.startsWith(WEB_ROOT + sep)) {
		json(res, 403, { error: "forbidden" })
		return true
	}

	try {
		let info = await stat(target)
		if (info.isDirectory()) {
			target = join(target, "standalone.html")
			info = await stat(target)
		}
		if (!info.isFile()) return false

		res.writeHead(200, {
			"content-type": TYPES[extname(target)] ?? "application/octet-stream",
			"content-length": info.size,
			"cache-control": "no-cache",
			"x-content-type-options": "nosniff",
		})
		if (req.method === "HEAD") {
			res.end()
			return true
		}
		createReadStream(target).pipe(res)
		return true
	} catch {
		return false
	}
}

const server = createServer(async (req, res) => {
	try {
		if (req.method === "GET" && req.url === "/api/health") {
			return json(res, 200, { ok: true, webRoot: WEB_ROOT })
		}

		// Dry run: return the exact live-build tree without building anything.
		if (req.method === "POST" && req.url === "/api/compile") {
			const recipe = JSON.parse(await readBody(req)) as Recipe
			const issues = validate(recipe)
			if (issues.some((i) => i.level === "error")) return json(res, 400, { issues })
			return json(res, 200, { issues, ...compileRecipe(recipe) })
		}

		// Real build: write the tree to disk and queue `lb build`.
		if (req.method === "POST" && req.url === "/api/build") {
			const recipe = JSON.parse(await readBody(req)) as Recipe
			const issues = validate(recipe)
			if (issues.some((i) => i.level === "error")) return json(res, 400, { issues })
			const dir = await materialize(recipe)
			const job = enqueue(recipe, dir)
			return json(res, 202, { jobId: job.id, target: job.target, workdir: dir })
		}

		const m = req.url?.match(/^\/api\/build\/([\w-]+)$/)
		if (req.method === "GET" && m) {
			const job = getJob(m[1])
			if (!job) return json(res, 404, { error: "no such job" })
			// Send the tail only; a full live-build log is megabytes.
			return json(res, 200, { ...job, log: job.log.slice(-80) })
		}

		if (req.url?.startsWith("/api/")) return json(res, 404, { error: "not found" })
		if (await serveStatic(req, res)) return

		json(res, 404, { error: "not found" })
	} catch (err) {
		json(res, 400, { error: String(err) })
	}
})

server.listen(PORT, () => {
	console.log(`zenvx forge listening on http://localhost:${PORT}`)
	console.log(`serving ${WEB_ROOT}`)
})
