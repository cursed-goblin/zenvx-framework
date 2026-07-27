import { type BlockDef, list, yes } from "./types"

export const imageQcow2: BlockDef = {
	id: "image.qcow2",
	category: "finish",
	label: "Virtual machine disk",
	kidLabel: "Pretend Computer",
	icon: "server",
	blurb: "A disk image you can boot in QEMU, Proxmox or the cloud.",
	inputs: ["system", "desktop", "app", "look", "identity"],
	outputs: ["image"],
	singleton: true,
	proOnly: true,
	fields: [
		{
			key: "format",
			label: "Format",
			type: "choice",
			default: "qcow2",
			options: [
				{ value: "qcow2", label: "qcow2" },
				{ value: "raw", label: "raw" },
				{ value: "vmdk", label: "VMDK" },
				{ value: "vdi", label: "VDI" },
				{ value: "vhdx", label: "VHDX" },
			],
		},
		{ key: "sizeGb", label: "Disk size", type: "number", min: 2, max: 4096, default: 20, unit: "GB" },
		{ key: "sparse", label: "Sparse", type: "toggle", default: true },
		{ key: "clusterSize", label: "Cluster size", type: "choice", default: "65536", advanced: true, dependsOn: { key: "format", equals: "qcow2" }, options: [{ value: "65536", label: "64K" }, { value: "262144", label: "256K" }, { value: "1048576", label: "1M" }] },
		{ key: "virtio", label: "virtio drivers", type: "toggle", default: true },
		{ key: "serialConsole", label: "Serial console", type: "toggle", default: true, help: "ttyS0, so headless hosts can talk to it." },
		{
			key: "cloudDatasource",
			label: "cloud-init datasource",
			type: "choice",
			default: "none",
			advanced: true,
			options: [
				{ value: "none", label: "None" },
				{ value: "NoCloud", label: "NoCloud" },
				{ value: "Ec2", label: "EC2" },
				{ value: "OpenStack", label: "OpenStack" },
			],
		},
	],
	emit: (cfg) => ({
		packages: [
			"qemu-utils",
			...(yes(cfg.virtio) ? ["qemu-guest-agent"] : []),
			...(cfg.cloudDatasource && cfg.cloudDatasource !== "none" ? ["cloud-init"] : []),
		],
		lbFlags: { binary_images: "hdd", binary_filesystem: "ext4" },
		files: [
			{
				path: "etc/zenvx/image-vm.conf",
				content:
					`format=${cfg.format ?? "qcow2"}\nsize_gb=${cfg.sizeGb ?? 20}\nsparse=${cfg.sparse !== false}\n` +
					`cluster=${cfg.clusterSize ?? 65536}\ndatasource=${cfg.cloudDatasource ?? "none"}\n`,
			},
			...(yes(cfg.serialConsole)
				? [{ path: "etc/systemd/system/getty.target.wants/serial-getty@ttyS0.service.conf", content: "[Service]\nExecStart=\nExecStart=-/sbin/agetty --keep-baud 115200 %I $TERM\n" }]
				: []),
		],
		sizeMb: 20,
	}),
}

export const imageOci: BlockDef = {
	id: "image.oci",
	category: "finish",
	label: "Container image",
	kidLabel: "Shipping Box",
	icon: "box",
	blurb: "The same system as an OCI or Docker image.",
	inputs: ["system", "app", "identity"],
	outputs: ["image"],
	singleton: true,
	proOnly: true,
	fields: [
		{ key: "format", label: "Archive format", type: "choice", default: "oci", options: [{ value: "oci", label: "OCI archive" }, { value: "docker", label: "Docker archive" }] },
		{ key: "tag", label: "Image tag", type: "text", placeholder: "zenvx/mydistro:latest" },
		{ key: "squash", label: "Squash to one layer", type: "toggle", default: true },
		{ key: "entrypoint", label: "Entrypoint", type: "text", default: "/bin/bash", advanced: true },
		{ key: "runAsUser", label: "Run as non-root user", type: "toggle", default: true },
		{ key: "labels", label: "Labels", type: "tags", advanced: true, placeholder: "org.opencontainers.image.source=..." },
		{ key: "stripDocs", label: "Strip docs and locales", type: "toggle", default: true, help: "Much smaller image, no man pages." },
	],
	emit: (cfg) => ({
		removePackages: yes(cfg.stripDocs) ? ["man-db", "manpages"] : [],
		files: [
			{
				path: "etc/zenvx/image-oci.conf",
				content:
					`format=${cfg.format ?? "oci"}\ntag=${cfg.tag ?? "zenvx/distro:latest"}\nsquash=${cfg.squash !== false}\n` +
					`entrypoint=${cfg.entrypoint ?? "/bin/bash"}\nnonroot=${cfg.runAsUser !== false}\nlabels=${list(cfg.labels).join(";")}\n`,
			},
		],
		hooks: yes(cfg.stripDocs)
			? ["rm -rf /usr/share/doc/* /usr/share/man/* /usr/share/locale/* || true"]
			: [],
		sizeMb: 10,
	}),
}

export const imageWsl: BlockDef = {
	id: "image.wsl",
	category: "finish",
	label: "WSL tarball",
	kidLabel: "Linux Inside Windows",
	icon: "windows",
	blurb: "Import it into Windows Subsystem for Linux.",
	inputs: ["system", "app", "identity"],
	outputs: ["image"],
	singleton: true,
	proOnly: true,
	fields: [
		{ key: "defaultUser", label: "Default user", type: "text", default: "zenvx" },
		{ key: "systemd", label: "systemd", type: "toggle", default: true },
		{ key: "interop", label: "Run Windows programs", type: "toggle", default: true },
		{ key: "appendWindowsPath", label: "Add Windows PATH", type: "toggle", default: false, advanced: true },
		{ key: "automount", label: "Mount Windows drives", type: "toggle", default: true },
		{ key: "mountRoot", label: "Mount point", type: "text", default: "/mnt/", advanced: true, dependsOn: { key: "automount", equals: true } },
		{ key: "generateResolvConf", label: "Let WSL manage DNS", type: "toggle", default: true, advanced: true },
	],
	emit: (cfg) => ({
		files: [
			{
				path: "etc/wsl.conf",
				content:
					`[user]\ndefault=${cfg.defaultUser ?? "zenvx"}\n\n` +
					`[boot]\nsystemd=${cfg.systemd !== false}\n\n` +
					`[interop]\nenabled=${cfg.interop !== false}\nappendWindowsPath=${cfg.appendWindowsPath === true}\n\n` +
					`[automount]\nenabled=${cfg.automount !== false}\nroot=${cfg.mountRoot ?? "/mnt/"}\n\n` +
					`[network]\ngenerateResolvConf=${cfg.generateResolvConf !== false}\n`,
			},
		],
		sizeMb: 4,
	}),
}

export const imageRpi: BlockDef = {
	id: "image.rpi",
	category: "finish",
	label: "Raspberry Pi image",
	kidLabel: "Tiny Computer Card",
	icon: "raspberry",
	blurb: "An SD card image for a Pi.",
	inputs: ["system", "desktop", "app", "look", "identity"],
	outputs: ["image"],
	singleton: true,
	proOnly: true,
	fields: [
		{
			key: "model",
			label: "Model",
			type: "choice",
			default: "pi4",
			options: [
				{ value: "pi5", label: "Pi 5" },
				{ value: "pi4", label: "Pi 4 / 400" },
				{ value: "pi3", label: "Pi 3" },
				{ value: "zero2", label: "Zero 2 W" },
			],
		},
		{ key: "gpuMem", label: "GPU memory split", type: "slider", min: 16, max: 512, step: 16, default: 76, unit: "MB" },
		{ key: "uart", label: "Serial console (UART)", type: "toggle", default: false },
		{ key: "overlays", label: "Device tree overlays", type: "tags", advanced: true, suggestions: ["vc4-kms-v3d", "disable-bt", "i2c-rtc", "w1-gpio"] },
		{ key: "overclock", label: "ARM frequency", type: "number", min: 600, max: 3000, step: 50, default: 0, unit: "MHz", advanced: true, help: "0 keeps the stock clock. Cooling is your problem." },
		{ key: "headless", label: "Headless", type: "toggle", default: false, help: "No desktop, SSH from first boot." },
		{ key: "expandRootfs", label: "Expand to fill the card", type: "toggle", default: true },
	],
	emit: (cfg) => {
		const overlays = list(cfg.overlays)
		return {
			packages: ["raspi-firmware", "linux-image-arm64"],
			lbFlags: { architectures: "arm64", binary_images: "hdd", binary_filesystem: "fat32" },
			files: [
				{
					path: "boot/firmware/config.txt",
					content:
						`# ZenvX for ${cfg.model ?? "pi4"}\n` +
						`gpu_mem=${cfg.gpuMem ?? 76}\n` +
						`enable_uart=${yes(cfg.uart) ? 1 : 0}\n` +
						(Number(cfg.overclock ?? 0) > 0 ? `arm_freq=${cfg.overclock}\nover_voltage=2\n` : "") +
						overlays.map((o) => `dtoverlay=${o}`).join("\n") +
						(overlays.length ? "\n" : ""),
				},
				{
					path: "etc/zenvx/image-rpi.conf",
					content: `model=${cfg.model ?? "pi4"}\nheadless=${cfg.headless === true}\nexpand=${cfg.expandRootfs !== false}\n`,
				},
			],
			sizeMb: 60,
		}
	},
}

export const imageNetboot: BlockDef = {
	id: "image.netboot",
	category: "finish",
	label: "Netboot bundle",
	kidLabel: "Boot Over The Wire",
	icon: "network",
	blurb: "PXE or iPXE, for a room full of machines.",
	inputs: ["system", "desktop", "app", "look", "identity"],
	outputs: ["image"],
	singleton: true,
	proOnly: true,
	fields: [
		{ key: "protocol", label: "Protocol", type: "choice", default: "ipxe", options: [{ value: "pxe", label: "PXE" }, { value: "ipxe", label: "iPXE" }] },
		{ key: "rootTransport", label: "Root filesystem over", type: "choice", default: "http", options: [{ value: "http", label: "HTTP" }, { value: "nfs", label: "NFS" }] },
		{ key: "serverUrl", label: "Server", type: "text", placeholder: "http://boot.lan/zenvx" },
		{ key: "toRam", label: "Copy to RAM", type: "toggle", default: true, help: "Slower start, no network dependency afterwards." },
		{ key: "append", label: "Extra kernel append", type: "text", advanced: true, placeholder: "nomodeset" },
	],
	emit: (cfg) => ({
		lbFlags: {
			binary_images: "netboot",
			net_root_server: String(cfg.serverUrl ?? ""),
			bootappend_live: [
				"boot=live",
				`fetch=${cfg.serverUrl ?? ""}/filesystem.squashfs`,
				...(yes(cfg.toRam) ? ["toram"] : []),
				...(cfg.append ? [String(cfg.append)] : []),
			].join(" "),
		},
		files: [
			{
				path: "etc/zenvx/image-netboot.conf",
				content: `protocol=${cfg.protocol ?? "ipxe"}\ntransport=${cfg.rootTransport ?? "http"}\nserver=${cfg.serverUrl ?? ""}\n`,
			},
		],
		sizeMb: 6,
	}),
}

export const imageOstree: BlockDef = {
	id: "image.ostree",
	category: "finish",
	label: "Immutable system",
	kidLabel: "Cannot Be Broken",
	icon: "lock-closed",
	blurb: "Image-based updates with rollback, the Silverblue way.",
	inputs: ["system", "desktop", "app", "look", "identity"],
	outputs: ["image"],
	singleton: true,
	proOnly: true,
	fields: [
		{ key: "remote", label: "Update remote", type: "text", placeholder: "https://updates.example.com/repo" },
		{ key: "branch", label: "Branch", type: "text", default: "zenvx/stable/x86_64" },
		{ key: "autoUpdate", label: "Stage updates automatically", type: "toggle", default: true },
		{ key: "rollbackDepth", label: "Keep deployments", type: "number", min: 1, max: 10, default: 2 },
		{ key: "writableEtc", label: "Writable /etc", type: "toggle", default: true, advanced: true },
		{ key: "overlayApps", label: "Allow layered packages", type: "toggle", default: true, advanced: true },
	],
	emit: (cfg) => ({
		packages: ["ostree", "libostree-1-1"],
		files: [
			{
				path: "etc/zenvx/image-ostree.conf",
				content:
					`remote=${cfg.remote ?? ""}\nbranch=${cfg.branch ?? "zenvx/stable/x86_64"}\n` +
					`auto_update=${cfg.autoUpdate !== false}\nkeep=${cfg.rollbackDepth ?? 2}\n` +
					`writable_etc=${cfg.writableEtc !== false}\nlayering=${cfg.overlayApps !== false}\n`,
			},
		],
		notes: ["the root filesystem is mounted read-only; changes live in /var and /etc"],
		sizeMb: 80,
	}),
}

export const imageBlocks: BlockDef[] = [
	imageQcow2,
	imageOci,
	imageWsl,
	imageRpi,
	imageNetboot,
	imageOstree,
]
