import { type BlockDef, list, yes } from "./types"

const KERNEL_PACKAGES: Record<string, string[]> = {
	stock: ["linux-image-amd64"],
	lts: ["linux-image-amd64"],
	mainline: ["linux-image-amd64-unsigned"],
	rt: ["linux-image-rt-amd64"],
	hardened: ["linux-image-amd64", "linux-hardened-config"],
	liquorix: ["linux-image-liquorix-amd64"],
}

export const kernelBuild: BlockDef = {
	id: "kernel.build",
	category: "under-the-hood",
	label: "Kernel",
	kidLabel: "The Brain",
	icon: "chip",
	blurb: "Which kernel to ship, and how it is put together.",
	inputs: ["system"],
	outputs: ["app"],
	singleton: true,
	proOnly: true,
	fields: [
		{
			key: "flavour",
			label: "Flavour",
			group: "Kernel",
			type: "choice",
			default: "stock",
			options: [
				{ value: "stock", label: "Distro stock", help: "Signed, boring, works." },
				{ value: "lts", label: "LTS", help: "Long-term support series." },
				{ value: "mainline", label: "Mainline", help: "Newest upstream release." },
				{ value: "rt", label: "PREEMPT_RT", help: "Real-time patches, low latency." },
				{ value: "hardened", label: "Hardened", help: "Security-first config." },
				{ value: "liquorix", label: "Liquorix", help: "Desktop responsiveness build." },
			],
		},
		{
			key: "version",
			label: "Pin a version",
			group: "Kernel",
			type: "text",
			placeholder: "6.12.9",
			help: "Leave empty to track the series.",
		},
		{ key: "microcode", label: "CPU microcode", group: "Kernel", type: "toggle", default: true },
		{ key: "headers", label: "Ship kernel headers", group: "Kernel", type: "toggle", default: false },
		{
			key: "dkms",
			label: "DKMS",
			group: "Kernel",
			type: "toggle",
			default: false,
			dependsOn: { key: "headers", equals: true },
			help: "Rebuild out-of-tree modules on kernel updates.",
		},
		{
			key: "initramfsModules",
			label: "initramfs MODULES",
			group: "initramfs",
			type: "choice",
			default: "dep",
			options: [
				{ value: "dep", label: "dep (small)" },
				{ value: "most", label: "most (portable)" },
				{ value: "list", label: "list (manual)" },
			],
		},
		{
			key: "initramfsCompression",
			label: "initramfs compression",
			group: "initramfs",
			type: "choice",
			default: "zstd",
			options: [
				{ value: "zstd", label: "zstd" },
				{ value: "lz4", label: "lz4 (fastest boot)" },
				{ value: "xz", label: "xz (smallest)" },
				{ value: "gzip", label: "gzip" },
			],
		},
		{
			key: "modules",
			label: "Load these modules",
			group: "Modules",
			type: "tags",
			placeholder: "kvm_amd, i915, vfio-pci",
			suggestions: ["kvm_amd", "kvm_intel", "vfio-pci", "i915", "amdgpu", "br_netfilter"],
		},
		{
			key: "blacklist",
			label: "Blacklist these modules",
			group: "Modules",
			type: "tags",
			placeholder: "nouveau, pcspkr",
			suggestions: ["nouveau", "pcspkr", "snd_pcsp", "floppy", "firewire_core"],
		},
		{
			key: "configFragment",
			label: ".config fragment",
			group: "Modules",
			type: "text",
			multiline: true,
			rows: 8,
			syntax: "kconfig - merged with merge_config.sh when building from source",
			advanced: true,
			placeholder: "CONFIG_PREEMPT=y\nCONFIG_HZ_1000=y\n# CONFIG_DEBUG_INFO is not set",
		},
		{
			key: "buildFromSource",
			label: "Build from source",
			group: "Modules",
			type: "toggle",
			default: false,
			advanced: true,
			help: "Adds an hour or three to the build. You know what you are doing.",
		},
	],
	emit: (cfg) => {
		const flavour = String(cfg.flavour ?? "stock")
		const mods = list(cfg.modules)
		const deny = list(cfg.blacklist)
		return {
			packages: [
				...(KERNEL_PACKAGES[flavour] ?? KERNEL_PACKAGES.stock),
				...(yes(cfg.microcode) ? ["intel-microcode", "amd64-microcode"] : []),
				...(cfg.headers === true ? ["linux-headers-amd64"] : []),
				...(cfg.headers === true && cfg.dkms === true ? ["dkms", "build-essential"] : []),
				...(cfg.buildFromSource === true
					? ["build-essential", "bc", "flex", "bison", "libssl-dev", "libelf-dev"]
					: []),
			],
			modules: mods,
			blacklist: deny,
			files: [
				{
					path: "etc/initramfs-tools/conf.d/zenvx.conf",
					content:
						`MODULES=${cfg.initramfsModules ?? "dep"}\n` +
						`COMPRESS=${cfg.initramfsCompression ?? "zstd"}\n`,
				},
				...(mods.length
					? [{ path: "etc/modules-load.d/zenvx.conf", content: `${mods.join("\n")}\n` }]
					: []),
				...(deny.length
					? [
						{
							path: "etc/modprobe.d/zenvx-blacklist.conf",
							content: deny.map((m) => `blacklist ${m}`).join("\n") + "\n",
						},
					]
					: []),
				...(cfg.configFragment
					? [{ path: "etc/zenvx/kernel.config-fragment", content: `${cfg.configFragment}\n` }]
					: []),
				{
					path: "etc/zenvx/kernel.conf",
					content: `flavour=${flavour}\nversion=${cfg.version ?? "series"}\nfrom_source=${cfg.buildFromSource === true}\n`,
				},
			],
			hooks: ["update-initramfs -u -k all || true"],
			notes: [`kernel: ${flavour}${cfg.version ? ` pinned to ${cfg.version}` : ""}`],
			sizeMb: 180 + (cfg.headers === true ? 120 : 0) + (cfg.buildFromSource === true ? 900 : 0),
		}
	},
}

export const kernelTuning: BlockDef = {
	id: "kernel.tuning",
	category: "under-the-hood",
	label: "Kernel tuning",
	kidLabel: "Speed Dials",
	icon: "gauge",
	blurb: "Scheduler, memory and latency knobs.",
	inputs: ["system"],
	outputs: ["app"],
	singleton: true,
	proOnly: true,
	fields: [
		{
			key: "governor",
			label: "CPU governor",
			group: "CPU",
			type: "choice",
			default: "schedutil",
			options: [
				{ value: "schedutil", label: "schedutil" },
				{ value: "performance", label: "performance" },
				{ value: "powersave", label: "powersave" },
				{ value: "ondemand", label: "ondemand" },
			],
		},
		{
			key: "timerHz",
			label: "Timer frequency",
			group: "CPU",
			type: "choice",
			default: "250",
			options: [
				{ value: "100", label: "100 Hz (servers)" },
				{ value: "250", label: "250 Hz" },
				{ value: "300", label: "300 Hz" },
				{ value: "1000", label: "1000 Hz (audio)" },
			],
		},
		{
			key: "preempt",
			label: "Preemption",
			group: "CPU",
			type: "choice",
			default: "voluntary",
			options: [
				{ value: "none", label: "none (throughput)" },
				{ value: "voluntary", label: "voluntary" },
				{ value: "full", label: "full (latency)" },
			],
		},
		{ key: "isolcpus", label: "isolcpus", group: "CPU", type: "text", placeholder: "2-7", advanced: true },
		{ key: "nohzFull", label: "nohz_full", group: "CPU", type: "text", placeholder: "2-7", advanced: true },
		{
			key: "mitigations",
			label: "CPU mitigations",
			group: "CPU",
			type: "choice",
			default: "auto",
			advanced: true,
			help: "Turning these off is a real security trade-off.",
			options: [
				{ value: "auto", label: "auto" },
				{ value: "auto,nosmt", label: "auto,nosmt (strict)" },
				{ value: "off", label: "off (fast, unsafe)" },
			],
		},
		{
			key: "ioScheduler",
			label: "IO scheduler",
			group: "Storage & memory",
			type: "choice",
			default: "mq-deadline",
			options: [
				{ value: "none", label: "none (NVMe)" },
				{ value: "mq-deadline", label: "mq-deadline" },
				{ value: "bfq", label: "bfq (desktop)" },
				{ value: "kyber", label: "kyber" },
			],
		},
		{ key: "swappiness", label: "vm.swappiness", group: "Storage & memory", type: "slider", min: 0, max: 100, default: 60 },
		{ key: "dirtyRatio", label: "vm.dirty_ratio", group: "Storage & memory", type: "slider", min: 1, max: 90, default: 20, unit: "%", advanced: true },
		{ key: "dirtyBackgroundRatio", label: "vm.dirty_background_ratio", group: "Storage & memory", type: "slider", min: 1, max: 50, default: 10, unit: "%", advanced: true },
		{ key: "vfsCachePressure", label: "vm.vfs_cache_pressure", group: "Storage & memory", type: "number", min: 0, max: 1000, default: 100, advanced: true },
		{
			key: "thp",
			label: "Transparent hugepages",
			group: "Storage & memory",
			type: "choice",
			default: "madvise",
			options: [
				{ value: "always", label: "always" },
				{ value: "madvise", label: "madvise" },
				{ value: "never", label: "never" },
			],
		},
		{ key: "hugepages", label: "Reserved hugepages", group: "Storage & memory", type: "number", min: 0, max: 65536, default: 0, unit: "x 2MB", advanced: true },
		{ key: "ksm", label: "Kernel same-page merging", group: "Storage & memory", type: "toggle", default: false, advanced: true },
		{
			key: "lockdown",
			label: "Kernel lockdown",
			group: "Safety",
			type: "choice",
			default: "none",
			options: [
				{ value: "none", label: "none" },
				{ value: "integrity", label: "integrity" },
				{ value: "confidentiality", label: "confidentiality" },
			],
		},
		{ key: "panicOnOops", label: "Panic on oops", group: "Safety", type: "toggle", default: false, advanced: true },
		{ key: "watchdog", label: "Hardware watchdog", group: "Safety", type: "toggle", default: false, advanced: true },
		{
			key: "sysctl",
			label: "Raw sysctl",
			group: "Safety",
			type: "text",
			multiline: true,
			rows: 6,
			syntax: "key = value, one per line, written to etc/sysctl.d/90-zenvx.conf",
			advanced: true,
			placeholder: "net.core.rmem_max = 16777216",
		},
	],
	emit: (cfg) => {
		const sysctl: Record<string, string> = {
			"vm.swappiness": String(cfg.swappiness ?? 60),
			"vm.dirty_ratio": String(cfg.dirtyRatio ?? 20),
			"vm.dirty_background_ratio": String(cfg.dirtyBackgroundRatio ?? 10),
			"vm.vfs_cache_pressure": String(cfg.vfsCachePressure ?? 100),
			...(Number(cfg.hugepages ?? 0) > 0 ? { "vm.nr_hugepages": String(cfg.hugepages) } : {}),
			...(cfg.panicOnOops === true ? { "kernel.panic_on_oops": "1", "kernel.panic": "10" } : {}),
		}
		const cmdline = [
			"boot=live",
			`preempt=${cfg.preempt ?? "voluntary"}`,
			`transparent_hugepage=${cfg.thp ?? "madvise"}`,
			`mitigations=${cfg.mitigations ?? "auto"}`,
			...(cfg.isolcpus ? [`isolcpus=${cfg.isolcpus}`] : []),
			...(cfg.nohzFull ? [`nohz_full=${cfg.nohzFull}`] : []),
			...(cfg.lockdown && cfg.lockdown !== "none" ? [`lockdown=${cfg.lockdown}`] : []),
		].join(" ")
		return {
			packages: [
				"cpufrequtils",
				...(cfg.watchdog === true ? ["watchdog"] : []),
				...(cfg.ksm === true ? ["ksmtuned"] : []),
			],
			sysctl,
			lbFlags: { bootappend_live: cmdline },
			files: [
				{
					path: "etc/sysctl.d/90-zenvx.conf",
					content:
						Object.entries(sysctl)
							.map(([k, v]) => `${k} = ${v}`)
							.join("\n") +
						"\n" +
						(cfg.sysctl ? `${cfg.sysctl}\n` : ""),
				},
				{
					path: "etc/udev/rules.d/60-zenvx-scheduler.rules",
					content: `ACTION=="add|change", KERNEL=="sd[a-z]|nvme[0-9]n[0-9]", ATTR{queue/scheduler}="${cfg.ioScheduler ?? "mq-deadline"}"\n`,
				},
				{
					path: "etc/default/cpufrequtils",
					content: `GOVERNOR="${cfg.governor ?? "schedutil"}"\n`,
				},
				{
					path: "etc/zenvx/tuning.conf",
					content: `timer_hz=${cfg.timerHz ?? 250}\nksm=${cfg.ksm === true}\nwatchdog=${cfg.watchdog === true}\n`,
				},
			],
			notes: [`cmdline: ${cmdline}`],
			sizeMb: 6,
		}
	},
}

export const kernelBlocks: BlockDef[] = [kernelBuild, kernelTuning]
