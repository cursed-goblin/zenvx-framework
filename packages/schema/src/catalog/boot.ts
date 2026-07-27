import { type BlockDef, yes } from "./types"

export const bootLoader: BlockDef = {
	id: "boot.loader",
	category: "under-the-hood",
	label: "Bootloader",
	kidLabel: "The Ignition",
	icon: "power",
	blurb: "What appears before the kernel starts.",
	inputs: ["system"],
	outputs: ["app"],
	singleton: true,
	proOnly: true,
	fields: [
		{
			key: "loader",
			label: "Loader",
			group: "Loader",
			type: "choice",
			default: "grub",
			options: [
				{ value: "grub", label: "GRUB" },
				{ value: "systemd-boot", label: "systemd-boot" },
				{ value: "refind", label: "rEFInd" },
				{ value: "syslinux", label: "syslinux / isolinux" },
			],
		},
		{
			key: "firmware",
			label: "Firmware",
			group: "Loader",
			type: "choice",
			default: "both",
			options: [{ value: "uefi", label: "UEFI only" }, { value: "bios", label: "BIOS only" }, { value: "both", label: "Both" }],
		},
		{ key: "timeout", label: "Menu timeout", group: "Menu", type: "slider", min: 0, max: 60, default: 5, unit: "s" },
		{ key: "hidden", label: "Hide the menu", group: "Menu", type: "toggle", default: false, help: "Hold Shift or Space to show it anyway." },
		{ key: "defaultEntry", label: "Default entry", group: "Menu", type: "text", default: "0", advanced: true },
		{ key: "resolution", label: "Menu resolution", group: "Menu", type: "choice", default: "auto", advanced: true, options: [{ value: "auto", label: "auto" }, { value: "1024x768", label: "1024x768" }, { value: "1920x1080", label: "1920x1080" }] },
		{ key: "osProber", label: "Detect other operating systems", group: "Entries", type: "toggle", default: true },
		{ key: "recovery", label: "Recovery entry", group: "Entries", type: "toggle", default: true },
		{ key: "memtest", label: "Memtest entry", group: "Entries", type: "toggle", default: false },
		{ key: "password", label: "Password-protect editing", group: "Entries", type: "toggle", default: false, advanced: true },
		{
			key: "extraEntries",
			label: "Extra menu entries",
			group: "Entries",
			type: "text",
			multiline: true,
			rows: 5,
			syntax: "appended to etc/grub.d/40_custom",
			advanced: true,
		},
	],
	emit: (cfg) => {
		const loader = String(cfg.loader ?? "grub")
		const fw = String(cfg.firmware ?? "both")
		return {
			packages: [
				...(loader === "grub"
					? [
						...(fw !== "bios" ? ["grub-efi-amd64"] : []),
						...(fw !== "uefi" ? ["grub-pc"] : []),
						...(cfg.osProber !== false ? ["os-prober"] : []),
					]
					: []),
				...(loader === "systemd-boot" ? ["systemd-boot"] : []),
				...(loader === "refind" ? ["refind"] : []),
				...(loader === "syslinux" ? ["syslinux", "isolinux"] : []),
				...(cfg.memtest === true ? ["memtest86+"] : []),
			],
			lbFlags: {
				bootloaders: loader === "grub" ? "grub-efi,syslinux" : loader,
				uefi_secure_boot: "auto",
			},
			files: [
				{
					path: "etc/default/grub.d/zenvx.cfg",
					content:
						`GRUB_TIMEOUT=${cfg.timeout ?? 5}\n` +
						`GRUB_TIMEOUT_STYLE=${cfg.hidden === true ? "hidden" : "menu"}\n` +
						`GRUB_DEFAULT=${cfg.defaultEntry ?? 0}\n` +
						`GRUB_DISABLE_OS_PROBER=${cfg.osProber === false ? "true" : "false"}\n` +
						`GRUB_DISABLE_RECOVERY=${cfg.recovery === false ? "true" : "false"}\n` +
						(cfg.resolution && cfg.resolution !== "auto" ? `GRUB_GFXMODE=${cfg.resolution}\n` : ""),
				},
				...(cfg.extraEntries
					? [{ path: "etc/grub.d/40_custom", content: `#!/bin/sh\nexec tail -n +3 $0\n${cfg.extraEntries}\n`, mode: "755" }]
					: []),
			],
			hooks: ["update-grub || true"],
			sizeMb: 40,
		}
	},
}

export const bootSplash: BlockDef = {
	id: "boot.splash",
	category: "looks",
	label: "Boot experience",
	kidLabel: "Starting Up Screen",
	icon: "sparkles",
	blurb: "What you stare at while it starts.",
	inputs: ["system"],
	outputs: ["look"],
	singleton: true,
	proOnly: true,
	fields: [
		{ key: "plymouth", label: "Graphical splash", type: "toggle", default: true },
		{
			key: "theme",
			label: "Theme",
			type: "choice",
			default: "spinner",
			dependsOn: { key: "plymouth", equals: true },
			options: [
				{ value: "spinner", label: "Spinner" },
				{ value: "bgrt", label: "Firmware logo" },
				{ value: "fade-in", label: "Fade in" },
				{ value: "text", label: "Text only" },
			],
		},
		{ key: "logo", label: "Logo file", type: "text", placeholder: "/usr/share/zenvx/logo.png", advanced: true },
		{ key: "quiet", label: "Quiet boot", type: "toggle", default: true },
		{
			key: "logLevel",
			label: "Kernel log level",
			type: "slider",
			min: 0,
			max: 7,
			default: 3,
			advanced: true,
			help: "0 is silent, 7 is a firehose.",
		},
		{ key: "showMessages", label: "Show service messages", type: "toggle", default: false },
		{ key: "fsckProgress", label: "Show disk check progress", type: "toggle", default: true, advanced: true },
	],
	emit: (cfg) => ({
		packages: yes(cfg.plymouth) ? ["plymouth", "plymouth-themes"] : [],
		lbFlags: {
			bootappend_live: [
				"boot=live",
				...(yes(cfg.quiet) ? ["quiet"] : []),
				...(yes(cfg.plymouth) ? ["splash"] : []),
				`loglevel=${cfg.logLevel ?? 3}`,
				...(cfg.showMessages === true ? ["systemd.show_status=1"] : []),
			].join(" "),
		},
		files: [
			...(yes(cfg.plymouth)
				? [
					{
						path: "etc/plymouth/plymouthd.conf",
						content: `[Daemon]\nTheme=${cfg.theme ?? "spinner"}\nShowDelay=0\nDeviceTimeout=8\n`,
					},
				]
				: []),
			{
				path: "etc/zenvx/boot-look.conf",
				content: `logo=${cfg.logo ?? ""}\nfsck_progress=${cfg.fsckProgress !== false}\n`,
			},
		],
		hooks: yes(cfg.plymouth) ? ["update-initramfs -u -k all || true"] : [],
		sizeMb: yes(cfg.plymouth) ? 45 : 0,
	}),
}

export const bootFirstRun: BlockDef = {
	id: "boot.firstrun",
	category: "me",
	label: "First run",
	kidLabel: "Hello Screen",
	icon: "wand",
	blurb: "What happens the very first time it boots.",
	inputs: ["system"],
	outputs: ["identity"],
	singleton: true,
	proOnly: true,
	fields: [
		{ key: "wizard", label: "Setup wizard", type: "toggle", default: true },
		{ key: "steps", label: "Wizard steps", type: "tags", default: "welcome, language, user, wifi, finish", suggestions: ["welcome", "language", "keyboard", "user", "wifi", "timezone", "privacy", "finish"], dependsOn: { key: "wizard", equals: true } },
		{ key: "oemMode", label: "OEM mode", type: "toggle", default: false, help: "Ship it configured, let the buyer make the first account." },
		{ key: "cloudInit", label: "cloud-init", type: "toggle", default: false, advanced: true },
		{ key: "regenMachineId", label: "Regenerate machine-id", type: "toggle", default: true, advanced: true },
		{ key: "regenSshKeys", label: "Regenerate SSH host keys", type: "toggle", default: true, advanced: true, help: "Never ship an image with baked-in host keys." },
		{
			key: "eula",
			label: "Terms shown on first run",
			type: "text",
			multiline: true,
			rows: 5,
			advanced: true,
		},
	],
	emit: (cfg) => ({
		packages: [...(cfg.cloudInit === true ? ["cloud-init"] : [])],
		files: [
			{
				path: "etc/zenvx/firstrun.conf",
				content:
					`wizard=${cfg.wizard !== false}\nsteps=${cfg.steps ?? ""}\noem=${cfg.oemMode === true}\n` +
					`regen_machine_id=${cfg.regenMachineId !== false}\nregen_ssh_keys=${cfg.regenSshKeys !== false}\n`,
			},
			...(cfg.eula ? [{ path: "etc/zenvx/terms.txt", content: `${cfg.eula}\n` }] : []),
		],
		hooks: [
			...(cfg.regenMachineId !== false ? ["rm -f /etc/machine-id && touch /etc/machine-id"] : []),
			...(cfg.regenSshKeys !== false ? ["rm -f /etc/ssh/ssh_host_* || true"] : []),
		],
		sizeMb: cfg.cloudInit === true ? 120 : 2,
	}),
}

export const bootBlocks: BlockDef[] = [bootLoader, bootSplash, bootFirstRun]
