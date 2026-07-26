import { createServer } from "node:http"
import { compileRecipe, validate, type Recipe } from "@zenvx/schema"
import { enqueue, getJob, materialize } from "./builder.js"

const PORT = Number(process.env.PORT ?? 8787)

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

const server = createServer(async (req, res) => {
	try {
		if (req.method === "GET" && req.url === "/api/health") {
			return json(res, 200, { ok: true })
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
			return json(res, 202, { jobId: job.id, workdir: dir })
		}

		const m = req.url?.match(/^\/api\/build\/(.+)$/)
		if (req.method === "GET" && m) {
			const job = getJob(m[1])
			return job ? json(res, 200, job) : json(res, 404, { error: "no such job" })
		}

		json(res, 404, { error: "not found" })
	} catch (err) {
		json(res, 400, { error: String(err) })
	}
})

server.listen(PORT, () => console.log(`zenvx forge listening on :${PORT}`))
