// Print a diagnosis that can be pasted into a bug report.
//
//   npm run doctor
//
// Checks the runtime, that the schema imports at all, that the example recipe
// validates and compiles, and whether this machine can do loop-device work.

import { execSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"

const line = (k, v) => console.log(`  ${k.padEnd(22)} ${v}`)
const has = (cmd) => {
	try {
		execSync(`command -v ${cmd}`, { stdio: "ignore" })
		return "yes"
	} catch {
		return "no"
	}
}

console.log("\nZenvX doctor\n")

console.log("runtime")
line("node", process.version)
line("platform", `${process.platform} ${process.arch}`)
line("user", process.getuid ? `uid ${process.getuid()}` : "n/a")
line("cwd", process.cwd())

console.log("\ntools")
for (const cmd of ["lb", "debootstrap", "xorriso", "mksquashfs", "qemu-img", "skopeo", "tsx"]) {
	line(cmd, has(cmd))
}
line("/dev/loop-control", existsSync("/dev/loop-control") ? "present" : "missing")

console.log("\nworkspace")
line("node_modules", existsSync("node_modules") ? "installed" : "MISSING - run npm install")
line("schema source", existsSync("packages/schema/src/index.ts") ? "present" : "MISSING")

console.log("\nschema")
let schema
try {
	schema = await import("@zenvx/schema")
	line("import", "ok")
} catch (err) {
	line("import", "FAILED")
	console.log(`\n${err?.stack ?? err}\n`)
	console.log("That is the real problem. Paste everything above.\n")
	process.exit(1)
}

try {
	const stats = schema.catalogStats?.()
	if (stats) line("catalog", `${stats.blocks} blocks, ${stats.fields} settings`)
} catch (err) {
	line("catalog", `threw: ${err?.message ?? err}`)
}

const examplePath = "examples/kid-first-distro.zenvx.json"
if (!existsSync(examplePath)) {
	line("example recipe", "MISSING")
} else {
	const recipe = JSON.parse(readFileSync(examplePath, "utf8"))
	try {
		const issues = schema.validate(recipe)
		const errors = issues.filter((i) => i.level === "error")
		line("validate", errors.length ? `${errors.length} errors` : `ok (${issues.length} notes)`)
		for (const i of issues) console.log(`      ${i.level}: ${i.message}`)
	} catch (err) {
		line("validate", `threw: ${err?.message ?? err}`)
	}
	try {
		const out = schema.compileRecipe(recipe)
		line("compile", `${out.files.length} files, ${out.packages.length} packages, ~${out.estimatedMb} MB`)
	} catch (err) {
		line("compile", `threw: ${err?.message ?? err}`)
		console.log(`\n${err?.stack ?? ""}\n`)
	}
}

console.log("\nverdict")
if (has("lb") === "yes" && existsSync("/dev/loop-control")) {
	console.log("  This machine can bake a real ISO.")
} else if (has("lb") === "yes") {
	console.log("  Rootfs targets only (oci, wsl, netboot). No loop devices for ISO work.")
} else {
	console.log("  Design and /api/compile only. live-build is not installed here.")
}
console.log("")
