import { mirrorHost, mirrorUrl } from "./registry"
import { type BlockDef, list, yes } from "./types"

export const devToolchain: BlockDef = {
	id: "dev.toolchain",
	category: "under-the-hood",
	label: "Toolchains",
	kidLabel: "Maker Tools",
	icon: "wrench",
	blurb: "Compilers and runtimes baked into the image.",
	inputs: ["system"],
	outputs: ["app"],
	singleton: true,
	proOnly: true,
	fields: [
		{ key: "c", label: "C / C++", group: "Languages", type: "toggle", default: true },
		{ key: "cCompiler", label: "Compiler", group: "Languages", type: "choice", default: "gcc", dependsOn: { key: "c", equals: true }, options: [{ value: "gcc", label: "GCC" }, { value: "clang", label: "Clang" }, { value: "both", label: "Both" }] },
		{ key: "rust", label: "Rust", group: "Languages", type: "toggle", default: false },
		{ key: "go", label: "Go", group: "Languages", type: "toggle", default: false },
		{ key: "node", label: "Node.js", group: "Languages", type: "toggle", default: false },
		{ key: "nodeVersion", label: "Node version", group: "Languages", type: "text", default: "22", dependsOn: { key: "node", equals: true } },
		{ key: "python", label: "Python", group: "Languages", type: "toggle", default: true },
		{ key: "pythonExtras", label: "Python extras", group: "Languages", type: "tags", default: "pip, venv", suggestions: ["pip", "venv", "numpy", "pandas", "requests", "pytest"], dependsOn: { key: "python", equals: true } },
		{ key: "java", label: "Java (JDK)", group: "Languages", type: "toggle", default: false },
		{ key: "ccache", label: "ccache", group: "Build", type: "toggle", default: true },
		{ key: "ccacheSize", label: "ccache size", group: "Build", type: "number", min: 1, max: 500, default: 10, unit: "GB", dependsOn: { key: "ccache", equals: true } },
		{ key: "debugSymbols", label: "Ship debug symbols", group: "Build", type: "toggle", default: false, advanced: true, help: "Adds a lot of size. Priceless when it crashes." },
		{ key: "crossTargets", label: "Cross-compile targets", group: "Build", type: "tags", advanced: true, suggestions: ["arm64", "armhf", "riscv64", "i386"] },
		{ key: "makeJobs", label: "Default make jobs", group: "Build", type: "number", min: 0, max: 256, default: 0, advanced: true, help: "0 means nproc." },
	],
	emit: (cfg) => {
		const cc = String(cfg.cCompiler ?? "gcc")
		const extras = list(cfg.pythonExtras).filter((p) => p !== "pip" && p !== "venv")
		return {
			packages: [
				...(cfg.c !== false ? ["build-essential", ...(cc !== "gcc" ? ["clang", "lld"] : [])] : []),
				...(cfg.rust === true ? ["rustc", "cargo", "rust-analyzer"] : []),
				...(cfg.go === true ? ["golang-go"] : []),
				...(cfg.node === true ? ["nodejs", "npm"] : []),
				...(cfg.python !== false ? ["python3", "python3-pip", "python3-venv"] : []),
				...(cfg.java === true ? ["default-jdk"] : []),
				...(yes(cfg.ccache) ? ["ccache"] : []),
				...(cfg.debugSymbols === true ? ["gdb", "valgrind"] : []),
				...list(cfg.crossTargets).map((t) => `crossbuild-essential-${t}`),
			],
			files: [
				{
					path: "etc/environment.d/70-zenvx-dev.conf",
					content:
						(yes(cfg.ccache) ? `CCACHE_MAXSIZE=${cfg.ccacheSize ?? 10}G\nPATH=/usr/lib/ccache:$PATH\n` : "") +
						(Number(cfg.makeJobs ?? 0) > 0 ? `MAKEFLAGS=-j${cfg.makeJobs}\n` : "MAKEFLAGS=-j$(nproc)\n") +
						(cfg.node === true ? `NODE_MAJOR=${cfg.nodeVersion ?? 22}\n` : ""),
				},
			],
			hooks: extras.length
				? [`pip3 install --break-system-packages ${extras.join(" ")} || true`]
				: [],
			sizeMb:
				(cfg.c !== false ? 480 : 0) +
				(cfg.rust === true ? 900 : 0) +
				(cfg.go === true ? 520 : 0) +
				(cfg.node === true ? 180 : 0) +
				(cfg.java === true ? 420 : 0) +
				(cfg.debugSymbols === true ? 700 : 0),
		}
	},
}

export const devContainers: BlockDef = {
	id: "dev.containers",
	category: "under-the-hood",
	label: "Containers",
	kidLabel: "Boxes",
	icon: "box",
	blurb: "Docker or Podman, and how they store things.",
	inputs: ["system"],
	outputs: ["app"],
	singleton: true,
	proOnly: true,
	fields: [
		{
			key: "engine",
			label: "Engine",
			type: "choice",
			default: "podman",
			options: [
				{ value: "podman", label: "Podman", help: "Rootless by default." },
				{ value: "docker", label: "Docker" },
				{ value: "lxc", label: "LXC" },
				{ value: "none", label: "None" },
			],
		},
		{ key: "rootless", label: "Rootless", type: "toggle", default: true },
		{
			key: "storageDriver",
			label: "Storage driver",
			type: "choice",
			default: "overlay2",
			advanced: true,
			options: [{ value: "overlay2", label: "overlay2" }, { value: "btrfs", label: "btrfs" }, { value: "fuse-overlayfs", label: "fuse-overlayfs" }],
		},
		{ key: "compose", label: "Compose", type: "toggle", default: true },
		{ key: "buildkit", label: "BuildKit / buildah", type: "toggle", default: true, advanced: true },
		{ key: "registries", label: "Registry mirrors", type: "tags", advanced: true, suggestions: ["docker.io", "quay.io", "ghcr.io"] },
		{ key: "k3s", label: "k3s Kubernetes", type: "toggle", default: false },
		{ key: "logMaxMb", label: "Container log cap", type: "number", min: 1, max: 4096, default: 50, unit: "MB", advanced: true },
	],
	emit: (cfg) => {
		const e = String(cfg.engine ?? "podman")
		if (e === "none") return { sizeMb: 0 }
		const mirrors = list(cfg.registries)
		return {
			packages: [
				...(e === "docker" ? ["docker.io", ...(cfg.compose !== false ? ["docker-compose"] : [])] : []),
				...(e === "podman" ? ["podman", ...(cfg.compose !== false ? ["podman-compose"] : [])] : []),
				...(e === "lxc" ? ["lxc", "lxc-templates"] : []),
				...(cfg.buildkit !== false ? ["buildah"] : []),
				...(yes(cfg.rootless) ? ["uidmap", "slirp4netns"] : []),
				...(cfg.k3s === true ? ["curl"] : []),
			],
			services: { enable: e === "docker" && !yes(cfg.rootless) ? ["docker"] : [] },
			files: [
				...(e === "docker"
					? [
						{
							path: "etc/docker/daemon.json",
							content:
								JSON.stringify(
									{
										"storage-driver": cfg.storageDriver ?? "overlay2",
										"log-driver": "json-file",
										"log-opts": { "max-size": `${cfg.logMaxMb ?? 50}m`, "max-file": "3" },
										"registry-mirrors": mirrors.map(mirrorUrl),
										"live-restore": true,
									},
									null,
									2,
								) + "\n",
						},
					]
					: []),
				...(e === "podman"
					? [
						{
							path: "etc/containers/registries.conf.d/zenvx.conf",
							content: `unqualified-search-registries = [${mirrors.map((r) => `"${mirrorHost(r)}"`).join(", ") || '"docker.io"'}]\n`,
						},
					]
					: []),
			],
			hooks: cfg.k3s === true ? ["curl -sfL https://get.k3s.io | sh - || true"] : [],
			sizeMb: (e === "docker" ? 420 : e === "podman" ? 260 : 120) + (cfg.k3s === true ? 340 : 0),
		}
	},
}

export const devVirt: BlockDef = {
	id: "dev.virt",
	category: "under-the-hood",
	label: "Virtualisation",
	kidLabel: "Computer Inside A Computer",
	icon: "server",
	blurb: "KVM, passthrough and guest tooling.",
	inputs: ["system"],
	outputs: ["app"],
	singleton: true,
	proOnly: true,
	fields: [
		{ key: "kvm", label: "KVM + libvirt", type: "toggle", default: true },
		{ key: "manager", label: "virt-manager GUI", type: "toggle", default: true, dependsOn: { key: "kvm", equals: true } },
		{ key: "nested", label: "Nested virtualisation", type: "toggle", default: false, advanced: true },
		{ key: "vfioIds", label: "VFIO passthrough IDs", type: "tags", placeholder: "10de:2484, 10de:228b", advanced: true, help: "PCI vendor:device pairs to bind at boot." },
		{ key: "hugepagesGb", label: "Guest hugepages", type: "number", min: 0, max: 512, default: 0, unit: "GB", advanced: true },
		{ key: "virtiofs", label: "virtiofs shares", type: "toggle", default: true, advanced: true },
		{ key: "guestAgent", label: "Guest agent (if this image runs as a VM)", type: "toggle", default: false },
	],
	emit: (cfg) => {
		const vfio = list(cfg.vfioIds)
		return {
			packages: [
				...(cfg.kvm !== false ? ["qemu-system-x86", "qemu-utils", "libvirt-daemon-system", "bridge-utils"] : []),
				...(cfg.manager !== false ? ["virt-manager"] : []),
				...(cfg.guestAgent === true ? ["qemu-guest-agent", "spice-vdagent"] : []),
			],
			services: { enable: [...(cfg.kvm !== false ? ["libvirtd"] : []), ...(cfg.guestAgent === true ? ["qemu-guest-agent"] : [])] },
			modules: [...(cfg.kvm !== false ? ["kvm"] : []), ...(vfio.length ? ["vfio-pci"] : [])],
			files: [
				...(cfg.nested === true
					? [{ path: "etc/modprobe.d/zenvx-nested.conf", content: "options kvm_intel nested=1\noptions kvm_amd nested=1\n" }]
					: []),
				...(vfio.length
					? [{ path: "etc/modprobe.d/zenvx-vfio.conf", content: `options vfio-pci ids=${vfio.join(",")}\n` }]
					: []),
				{
					path: "etc/zenvx/virt.conf",
					content: `hugepages_gb=${cfg.hugepagesGb ?? 0}\nvirtiofs=${cfg.virtiofs !== false}\n`,
				},
			],
			lbFlags: vfio.length ? { bootappend_live: "boot=live intel_iommu=on amd_iommu=on iommu=pt" } : {},
			sizeMb: cfg.kvm !== false ? 620 : 40,
		}
	},
}

export const devWorkspace: BlockDef = {
	id: "dev.workspace",
	category: "apps",
	label: "Developer workspace",
	kidLabel: "My Desk",
	icon: "terminal",
	blurb: "Shell, editor, dotfiles and git identity.",
	inputs: ["desktop"],
	outputs: ["app"],
	singleton: true,
	proOnly: true,
	fields: [
		{
			key: "shell",
			label: "Shell",
			group: "Shell",
			type: "choice",
			default: "bash",
			options: [
				{ value: "bash", label: "bash" },
				{ value: "zsh", label: "zsh" },
				{ value: "fish", label: "fish" },
				{ value: "nushell", label: "nushell" },
			],
		},
		{ key: "prompt", label: "Prompt", group: "Shell", type: "choice", default: "plain", options: [{ value: "plain", label: "Plain" }, { value: "starship", label: "Starship" }, { value: "powerline", label: "Powerline" }] },
		{ key: "tmux", label: "tmux", group: "Shell", type: "toggle", default: false },
		{ key: "modernCli", label: "Modern CLI tools", group: "Shell", type: "tags", default: "ripgrep, fd-find, bat, fzf", suggestions: ["ripgrep", "fd-find", "bat", "fzf", "eza", "zoxide", "jq", "htop", "btop"] },
		{
			key: "editor",
			label: "Editor",
			group: "Editor",
			type: "choice",
			default: "vscodium",
			options: [
				{ value: "vscodium", label: "VSCodium" },
				{ value: "neovim", label: "Neovim" },
				{ value: "emacs", label: "Emacs" },
				{ value: "helix", label: "Helix" },
				{ value: "none", label: "None" },
			],
		},
		{ key: "languageServers", label: "Language servers", group: "Editor", type: "tags", advanced: true, suggestions: ["clangd", "pyright", "rust-analyzer", "gopls", "typescript-language-server"] },
		{ key: "gitName", label: "Git name", group: "Git", type: "text", placeholder: "Ada Lovelace" },
		{ key: "gitEmail", label: "Git email", group: "Git", type: "text", placeholder: "ada@example.com" },
		{ key: "gitSign", label: "Sign commits", group: "Git", type: "toggle", default: false, advanced: true },
		{ key: "dotfiles", label: "Dotfiles repo", group: "Git", type: "text", placeholder: "https://github.com/you/dotfiles", advanced: true, help: "Cloned into the user home on first boot." },
	],
	emit: (cfg) => {
		const editorPkg: Record<string, string[]> = {
			vscodium: ["codium"],
			neovim: ["neovim"],
			emacs: ["emacs"],
			helix: ["helix"],
			none: [],
		}
		return {
			packages: [
				"git",
				String(cfg.shell ?? "bash"),
				...(cfg.prompt === "starship" ? ["starship"] : []),
				...(cfg.prompt === "powerline" ? ["powerline"] : []),
				...(cfg.tmux === true ? ["tmux"] : []),
				...list(cfg.modernCli),
				...(editorPkg[String(cfg.editor ?? "vscodium")] ?? []),
				...list(cfg.languageServers),
			],
			files: [
				{
					path: "etc/skel/.gitconfig",
					content:
						"[user]\n" +
						`\tname = ${cfg.gitName ?? ""}\n\temail = ${cfg.gitEmail ?? ""}\n` +
						`[commit]\n\tgpgsign = ${cfg.gitSign === true}\n` +
						"[init]\n\tdefaultBranch = main\n[pull]\n\trebase = true\n",
				},
			],
			hooks: cfg.dotfiles ? [`git clone --depth 1 ${cfg.dotfiles} /etc/skel/.dotfiles || true`] : [],
			sim: { desktopIcons: [{ label: "Terminal", icon: "terminal" }] },
			sizeMb: 340,
		}
	},
}

export const devBlocks: BlockDef[] = [devToolchain, devContainers, devVirt, devWorkspace]
