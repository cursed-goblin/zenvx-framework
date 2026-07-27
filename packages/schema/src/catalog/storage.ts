import { type BlockDef, list, yes } from "./types"

export const storageRoot: BlockDef = {
	id: "storage.root",
	category: "under-the-hood",
	label: "Root filesystem",
	kidLabel: "Where Stuff Is Kept",
	icon: "disk",
	blurb: "Filesystem, mount options, compression and snapshots.",
	inputs: ["system"],
	outputs: ["app"],
	singleton: true,
	proOnly: true,
	fields: [
		{
			key: "fs",
			label: "Filesystem",
			group: "Filesystem",
			type: "choice",
			default: "ext4",
			options: [
				{ value: "ext4", label: "ext4", help: "Dull, fast, unbreakable." },
				{ value: "btrfs", label: "btrfs", help: "Snapshots and compression." },
				{ value: "xfs", label: "XFS", help: "Big files, big servers." },
				{ value: "zfs", label: "ZFS", help: "Checksums everywhere. Licence caveats." },
				{ value: "f2fs", label: "F2FS", help: "Flash-friendly." },
			],
		},
		{ key: "label", label: "Volume label", group: "Filesystem", type: "text", default: "zenvx-root" },
		{
			key: "mountOptions",
			label: "Mount options",
			group: "Filesystem",
			type: "tags",
			default: "noatime",
			suggestions: ["noatime", "relatime", "nodiratime", "commit=120", "nobarrier", "lazytime"],
		},
		{ key: "discard", label: "Continuous TRIM", group: "Filesystem", type: "toggle", default: false, help: "Off means a weekly fstrim timer instead." },
		{
			key: "compression",
			label: "Compression",
			group: "btrfs",
			type: "choice",
			default: "zstd",
			dependsOn: { key: "fs", equals: "btrfs" },
			options: [
				{ value: "none", label: "none" },
				{ value: "zstd", label: "zstd" },
				{ value: "lzo", label: "lzo" },
			],
		},
		{ key: "compressionLevel", label: "zstd level", group: "btrfs", type: "slider", min: 1, max: 15, default: 3, dependsOn: { key: "fs", equals: "btrfs" } },
		{
			key: "subvolumes",
			label: "Subvolume layout",
			group: "btrfs",
			type: "text",
			multiline: true,
			rows: 5,
			syntax: "name:mountpoint, one per line",
			default: "@:/\n@home:/home\n@log:/var/log\n@snapshots:/.snapshots",
			dependsOn: { key: "fs", equals: "btrfs" },
		},
		{ key: "quotas", label: "Quota groups", group: "btrfs", type: "toggle", default: false, advanced: true, dependsOn: { key: "fs", equals: "btrfs" } },
		{
			key: "snapshots",
			label: "Snapshots",
			group: "Snapshots",
			type: "choice",
			default: "none",
			options: [
				{ value: "none", label: "None" },
				{ value: "snapper", label: "Snapper" },
				{ value: "timeshift", label: "Timeshift" },
			],
		},
		{ key: "keepHourly", label: "Keep hourly", group: "Snapshots", type: "number", min: 0, max: 48, default: 6 },
		{ key: "keepDaily", label: "Keep daily", group: "Snapshots", type: "number", min: 0, max: 90, default: 7 },
		{ key: "keepMonthly", label: "Keep monthly", group: "Snapshots", type: "number", min: 0, max: 24, default: 3 },
		{ key: "snapshotOnUpgrade", label: "Snapshot before every apt run", group: "Snapshots", type: "toggle", default: true },
	],
	emit: (cfg) => {
		const fs = String(cfg.fs ?? "ext4")
		const opts = list(cfg.mountOptions)
		if (fs === "btrfs" && cfg.compression !== "none") {
			opts.push(`compress=${cfg.compression ?? "zstd"}:${cfg.compressionLevel ?? 3}`)
		}
		opts.push(cfg.discard === true ? "discard=async" : "nodiscard")
		const snap = String(cfg.snapshots ?? "none")
		const subvols = String(cfg.subvolumes ?? "")
			.split("\n")
			.map((l) => l.trim())
			.filter(Boolean)
		return {
			packages: [
				...(fs === "btrfs" ? ["btrfs-progs"] : []),
				...(fs === "xfs" ? ["xfsprogs"] : []),
				...(fs === "zfs" ? ["zfsutils-linux", "zfs-dkms"] : []),
				...(fs === "f2fs" ? ["f2fs-tools"] : []),
				...(snap === "snapper" ? ["snapper"] : []),
				...(snap === "timeshift" ? ["timeshift"] : []),
			],
			services: {
				enable: [
					...(cfg.discard === true ? [] : ["fstrim.timer"]),
					...(snap === "snapper" ? ["snapper-timeline.timer", "snapper-cleanup.timer"] : []),
				],
			},
			files: [
				{
					path: "etc/zenvx/storage.conf",
					content:
						`fs=${fs}\n` +
						`label=${cfg.label ?? "zenvx-root"}\n` +
						`options=${opts.join(",")}\n` +
						`quotas=${cfg.quotas === true}\n` +
						(subvols.length ? `subvolumes=${subvols.join(" ")}\n` : ""),
				},
				...(snap === "snapper"
					? [
						{
							path: "etc/snapper/configs/root",
							content:
								'SUBVOLUME="/"\nFSTYPE="btrfs"\nTIMELINE_CREATE="yes"\n' +
								`TIMELINE_LIMIT_HOURLY="${cfg.keepHourly ?? 6}"\n` +
								`TIMELINE_LIMIT_DAILY="${cfg.keepDaily ?? 7}"\n` +
								`TIMELINE_LIMIT_MONTHLY="${cfg.keepMonthly ?? 3}"\n`,
						},
					]
					: []),
				...(snap !== "none" && yes(cfg.snapshotOnUpgrade)
					? [
						{
							path: "etc/apt/apt.conf.d/80zenvx-snapshot",
							content: `DPkg::Pre-Invoke { "${snap === "snapper" ? "snapper create -d apt" : "timeshift --create --comments apt"} || true"; };\n`,
						},
					]
					: []),
			],
			hooks: subvols.map((s) => `btrfs subvolume create /${s.split(":")[0]} || true`),
			sizeMb: 30,
		}
	},
}

export const storageCrypt: BlockDef = {
	id: "storage.crypt",
	category: "under-the-hood",
	label: "Disk encryption (LUKS2)",
	kidLabel: "Secret Lock",
	icon: "lock",
	blurb: "Encrypt the whole disk at rest.",
	inputs: ["system"],
	outputs: ["app"],
	singleton: true,
	proOnly: true,
	fields: [
		{ key: "enabled", label: "Encrypt the root disk", type: "toggle", default: true },
		{
			key: "cipher",
			label: "Cipher",
			group: "Crypto",
			type: "choice",
			default: "aes-xts-plain64",
			dependsOn: { key: "enabled", equals: true },
			options: [
				{ value: "aes-xts-plain64", label: "AES-XTS", help: "Hardware accelerated everywhere." },
				{ value: "xchacha20,aes-adiantum-plain64", label: "Adiantum", help: "For CPUs without AES-NI." },
			],
		},
		{ key: "keySize", label: "Key size", group: "Crypto", type: "choice", default: "512", dependsOn: { key: "enabled", equals: true }, options: [{ value: "256", label: "256 bit" }, { value: "512", label: "512 bit" }] },
		{ key: "hash", label: "Hash", group: "Crypto", type: "choice", default: "sha512", advanced: true, options: [{ value: "sha256", label: "sha256" }, { value: "sha512", label: "sha512" }] },
		{ key: "pbkdfMemory", label: "Argon2id memory", group: "Crypto", type: "slider", min: 64, max: 4096, step: 64, default: 1024, unit: "MB", advanced: true },
		{ key: "pbkdfTime", label: "Argon2id time cost", group: "Crypto", type: "slider", min: 500, max: 10000, step: 500, default: 2000, unit: "ms", advanced: true },
		{ key: "tpm2", label: "Unlock with TPM2", group: "Unlocking", type: "toggle", default: false, help: "Still keeps a recovery passphrase." },
		{ key: "detachedHeader", label: "Detached header", group: "Unlocking", type: "toggle", default: false, advanced: true },
		{ key: "keyfile", label: "Keyfile path", group: "Unlocking", type: "text", placeholder: "/boot/keys/root.key", advanced: true },
		{ key: "discardPassthrough", label: "Pass TRIM through", group: "Unlocking", type: "toggle", default: false, advanced: true, help: "Faster SSD, leaks which blocks are used." },
	],
	emit: (cfg) => {
		if (cfg.enabled === false) return { notes: ["disk encryption: off"], sizeMb: 0 }
		const opts = [
			"luks",
			...(cfg.discardPassthrough === true ? ["discard"] : []),
			...(cfg.tpm2 === true ? ["tpm2-device=auto"] : []),
		]
		return {
			packages: [
				"cryptsetup",
				"cryptsetup-initramfs",
				...(cfg.tpm2 === true ? ["systemd-cryptenroll", "tpm2-tools"] : []),
			],
			files: [
				{
					path: "etc/crypttab",
					content: `cryptroot UUID=REPLACE_ME ${cfg.keyfile || "none"} ${opts.join(",")}\n`,
				},
				{
					path: "etc/zenvx/crypt.conf",
					content:
						`cipher=${cfg.cipher ?? "aes-xts-plain64"}\n` +
						`key_size=${cfg.keySize ?? 512}\n` +
						`hash=${cfg.hash ?? "sha512"}\n` +
						`pbkdf=argon2id\n` +
						`pbkdf_memory=${Number(cfg.pbkdfMemory ?? 1024) * 1024}\n` +
						`pbkdf_time_ms=${cfg.pbkdfTime ?? 2000}\n` +
						`detached_header=${cfg.detachedHeader === true}\n` +
						`tpm2=${cfg.tpm2 === true}\n`,
				},
			],
			hooks: ["update-initramfs -u -k all || true"],
			notes: ["the installer formats with these parameters; the live image itself is not encrypted"],
			sizeMb: 12,
		}
	},
}

export const storageLayout: BlockDef = {
	id: "storage.layout",
	category: "under-the-hood",
	label: "Partition layout",
	kidLabel: "Disk Slices",
	icon: "layout",
	blurb: "How the installer carves up the disk.",
	inputs: ["system"],
	outputs: ["app"],
	singleton: true,
	proOnly: true,
	fields: [
		{ key: "table", label: "Partition table", type: "choice", default: "gpt", options: [{ value: "gpt", label: "GPT / UEFI" }, { value: "msdos", label: "MBR / BIOS" }] },
		{ key: "espSize", label: "EFI partition", type: "number", min: 128, max: 2048, step: 64, default: 512, unit: "MB", dependsOn: { key: "table", equals: "gpt" } },
		{ key: "separateHome", label: "Separate /home", type: "toggle", default: false },
		{ key: "separateVar", label: "Separate /var", type: "toggle", default: false, advanced: true },
		{ key: "rootSize", label: "Root size cap", type: "number", min: 8, max: 4096, default: 40, unit: "GB", advanced: true, help: "0 means use the whole disk." },
		{ key: "autoresize", label: "Grow to fill the disk on first boot", type: "toggle", default: true },
	],
	emit: (cfg) => ({
		packages: ["parted", "gdisk", "cloud-guest-utils"],
		files: [
			{
				path: "etc/zenvx/layout.conf",
				content:
					`table=${cfg.table ?? "gpt"}\n` +
					`esp_mb=${cfg.espSize ?? 512}\n` +
					`separate_home=${cfg.separateHome === true}\n` +
					`separate_var=${cfg.separateVar === true}\n` +
					`root_gb=${cfg.rootSize ?? 40}\n` +
					`autoresize=${yes(cfg.autoresize)}\n`,
			},
		],
		sizeMb: 8,
	}),
}

export const storageLvm: BlockDef = {
	id: "storage.lvm",
	category: "under-the-hood",
	label: "LVM",
	kidLabel: "Stretchy Disks",
	icon: "layers",
	blurb: "Volume groups you can resize later.",
	inputs: ["system"],
	outputs: ["app"],
	singleton: true,
	proOnly: true,
	fields: [
		{ key: "vgName", label: "Volume group", type: "text", default: "zenvx" },
		{ key: "thin", label: "Thin provisioning", type: "toggle", default: false },
		{ key: "poolSize", label: "Thin pool size", type: "number", min: 1, max: 8192, default: 64, unit: "GB", dependsOn: { key: "thin", equals: true } },
		{ key: "extentSize", label: "Extent size", type: "number", min: 1, max: 512, default: 4, unit: "MB", advanced: true },
	],
	emit: (cfg) => ({
		packages: ["lvm2", ...(cfg.thin === true ? ["thin-provisioning-tools"] : [])],
		files: [
			{
				path: "etc/zenvx/lvm.conf",
				content: `vg=${cfg.vgName ?? "zenvx"}\nthin=${cfg.thin === true}\npool_gb=${cfg.poolSize ?? 64}\nextent_mb=${cfg.extentSize ?? 4}\n`,
			},
		],
		hooks: ["update-initramfs -u -k all || true"],
		sizeMb: 10,
	}),
}

export const storageRaid: BlockDef = {
	id: "storage.raid",
	category: "under-the-hood",
	label: "Software RAID",
	kidLabel: "Twin Disks",
	icon: "copy",
	blurb: "mdadm arrays for redundancy or speed.",
	inputs: ["system"],
	outputs: ["app"],
	singleton: true,
	proOnly: true,
	fields: [
		{
			key: "level",
			label: "Level",
			type: "choice",
			default: "1",
			options: [
				{ value: "0", label: "RAID 0 (speed)" },
				{ value: "1", label: "RAID 1 (mirror)" },
				{ value: "5", label: "RAID 5" },
				{ value: "6", label: "RAID 6" },
				{ value: "10", label: "RAID 10" },
			],
		},
		{ key: "devices", label: "Member devices", type: "tags", placeholder: "/dev/sda, /dev/sdb", suggestions: ["/dev/sda", "/dev/sdb", "/dev/nvme0n1", "/dev/nvme1n1"] },
		{ key: "chunk", label: "Chunk size", type: "number", min: 4, max: 4096, step: 4, default: 512, unit: "KB", advanced: true },
		{ key: "bitmap", label: "Write-intent bitmap", type: "toggle", default: true, advanced: true },
		{ key: "monitorEmail", label: "Email on failure", type: "text", placeholder: "me@example.com", advanced: true },
	],
	emit: (cfg) => {
		const devices = list(cfg.devices)
		return {
			packages: ["mdadm"],
			services: { enable: ["mdmonitor"] },
			files: [
				{
					path: "etc/zenvx/raid.conf",
					content:
						`level=${cfg.level ?? 1}\n` +
						`devices=${devices.join(" ")}\n` +
						`chunk_kb=${cfg.chunk ?? 512}\n` +
						`bitmap=${yes(cfg.bitmap)}\n`,
				},
				...(cfg.monitorEmail
					? [{ path: "etc/mdadm/mdadm.conf", content: `MAILADDR ${cfg.monitorEmail}\n` }]
					: []),
			],
			sizeMb: 8,
		}
	},
}

export const storageSwap: BlockDef = {
	id: "storage.swap",
	category: "under-the-hood",
	label: "Swap & zram",
	kidLabel: "Extra Memory",
	icon: "memory",
	blurb: "Compressed RAM swap, swapfile and hibernation.",
	inputs: ["system"],
	outputs: ["app"],
	singleton: true,
	proOnly: true,
	fields: [
		{ key: "zram", label: "Use zram", type: "toggle", default: true },
		{
			key: "zramAlgorithm",
			label: "zram algorithm",
			type: "choice",
			default: "zstd",
			dependsOn: { key: "zram", equals: true },
			options: [
				{ value: "zstd", label: "zstd" },
				{ value: "lz4", label: "lz4" },
				{ value: "lzo-rle", label: "lzo-rle" },
			],
		},
		{ key: "zramPercent", label: "zram size", type: "slider", min: 10, max: 200, step: 5, default: 50, unit: "% of RAM", dependsOn: { key: "zram", equals: true } },
		{ key: "swapfile", label: "Swapfile size", type: "number", min: 0, max: 65536, step: 512, default: 0, unit: "MB", help: "0 disables the swapfile." },
		{ key: "hibernate", label: "Allow hibernation", type: "toggle", default: false, advanced: true, help: "Needs a swapfile at least the size of RAM." },
	],
	emit: (cfg) => {
		const swapMb = Number(cfg.swapfile ?? 0)
		return {
			packages: yes(cfg.zram) ? ["systemd-zram-generator"] : [],
			files: [
				...(yes(cfg.zram)
					? [
						{
							path: "etc/systemd/zram-generator.conf",
							content: `[zram0]\nzram-size = ram * ${Number(cfg.zramPercent ?? 50) / 100}\ncompression-algorithm = ${cfg.zramAlgorithm ?? "zstd"}\n`,
						},
					]
					: []),
			],
			hooks: [
				...(swapMb > 0
					? [
						`fallocate -l ${swapMb}M /swapfile || true`,
						"chmod 600 /swapfile || true",
						"mkswap /swapfile || true",
						"echo '/swapfile none swap sw 0 0' >> /etc/fstab",
					]
					: []),
				...(cfg.hibernate === true
					? ["echo 'RESUME=/swapfile' > /etc/initramfs-tools/conf.d/resume"]
					: []),
			],
			sizeMb: 4,
		}
	},
}

export const storageBlocks: BlockDef[] = [
	storageRoot,
	storageCrypt,
	storageLayout,
	storageLvm,
	storageRaid,
	storageSwap,
]
