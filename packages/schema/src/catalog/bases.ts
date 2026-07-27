import type { FieldDef } from "../recipe"
import { type BlockDef, yes } from "./types"

const archField: FieldDef = {
	key: "arch",
	label: "Architecture",
	type: "choice",
	default: "amd64",
	options: [
		{ value: "amd64", label: "64-bit PC" },
		{ value: "arm64", label: "ARM64 (Raspberry Pi 4/5)" },
		{ value: "i386", label: "32-bit PC (very old)" },
	],
}

const base = (
	id: string,
	label: string,
	kidLabel: string,
	icon: string,
	blurb: string,
	defaults: {
		distribution: string
		areas: string
		mirrors: { value: string; label: string }[]
	},
	packages: string[],
	sizeMb: number,
): BlockDef => ({
	id,
	category: "start",
	label,
	kidLabel,
	icon,
	blurb,
	inputs: [],
	outputs: ["system"],
	singleton: true,
	fields: [
		archField,
		{
			key: "mirror",
			label: "Download from",
			type: "choice",
			default: defaults.mirrors[0].value,
			options: defaults.mirrors,
		},
		{ key: "firmware", label: "Include Wi-Fi / GPU firmware", type: "toggle", default: true },
		{ key: "backports", label: "Newer software (backports)", type: "toggle", default: false },
	],
	emit: (cfg) => ({
		lbFlags: {
			distribution: defaults.distribution,
			architectures: cfg.arch ?? "amd64",
			archive_areas: yes(cfg.firmware) ? defaults.areas : defaults.areas.split(" ")[0],
			binary_images: "iso-hybrid",
			mirror_bootstrap: cfg.mirror ?? defaults.mirrors[0].value,
			...(cfg.backports === true
				? { parent_archive_areas: defaults.areas, backports: "true" }
				: {}),
		},
		packages,
		sizeMb,
	}),
})

const debianMirrors = [
	{ value: "http://deb.debian.org/debian/", label: "Worldwide (fastest)" },
	{ value: "http://ftp.in.debian.org/debian/", label: "India" },
	{ value: "http://ftp.us.debian.org/debian/", label: "United States" },
	{ value: "http://ftp.de.debian.org/debian/", label: "Europe" },
]

export const baseDebian = base(
	"base.debian-stable",
	"Debian 13 (stable)",
	"The Engine",
	"engine",
	"The part that makes the computer turn on.",
	{ distribution: "trixie", areas: "main contrib non-free-firmware", mirrors: debianMirrors },
	["linux-image-amd64", "live-boot", "systemd-sysv", "network-manager"],
	720,
)

export const baseDebianTesting = base(
	"base.debian-testing",
	"Debian testing (forky)",
	"The Fast Engine",
	"engine-fast",
	"Newest software, breaks a little more often.",
	{ distribution: "forky", areas: "main contrib non-free-firmware", mirrors: debianMirrors },
	["linux-image-amd64", "live-boot", "systemd-sysv", "network-manager"],
	760,
)

export const baseUbuntu = base(
	"base.ubuntu-lts",
	"Ubuntu 26.04 LTS",
	"The Friendly Engine",
	"engine-alt",
	"Same job, more drivers out of the box.",
	{
		distribution: "noble",
		areas: "main restricted universe multiverse",
		mirrors: [
			{ value: "http://archive.ubuntu.com/ubuntu/", label: "Worldwide (fastest)" },
			{ value: "http://in.archive.ubuntu.com/ubuntu/", label: "India" },
		],
	},
	["linux-generic", "live-boot", "network-manager"],
	900,
)

export const bases: BlockDef[] = [baseDebian, baseDebianTesting, baseUbuntu]
