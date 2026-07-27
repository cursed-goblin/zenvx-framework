import { type BlockDef, yes } from "./types"

export const identityBrand: BlockDef = {
	id: "identity.brand",
	category: "me",
	label: "Distro identity",
	kidLabel: "Name It",
	icon: "tag",
	blurb: "Give your OS a name and a logo.",
	inputs: ["system"],
	outputs: ["identity"],
	singleton: true,
	fields: [
		{ key: "tagline", label: "Tagline", type: "text", placeholder: "My very own computer" },
		{
			key: "logo",
			label: "Logo",
			type: "choice",
			default: "rocket",
			options: [
				{ value: "rocket", label: "Rocket" },
				{ value: "star", label: "Star" },
				{ value: "cat", label: "Cat" },
				{ value: "dino", label: "Dinosaur" },
				{ value: "robot", label: "Robot" },
				{ value: "heart", label: "Heart" },
				{ value: "bolt", label: "Bolt" },
			],
		},
		{ key: "version", label: "Version", type: "text", default: "0.1" },
		{ key: "motd", label: "Message in the terminal", type: "text", placeholder: "Hello!" },
	],
	emit: (cfg) => ({
		files: [
			{
				path: "etc/zenvx/brand.conf",
				content:
					`TAGLINE="${cfg.tagline ?? ""}"\n` +
					`LOGO=${cfg.logo ?? "rocket"}\n` +
					`VERSION="${cfg.version ?? "0.1"}"\n`,
			},
			...(cfg.motd ? [{ path: "etc/motd", content: `${cfg.motd}\n` }] : []),
		],
		sizeMb: 1,
	}),
}

export const identityUser: BlockDef = {
	id: "identity.user",
	category: "me",
	label: "User account",
	kidLabel: "That's Me",
	icon: "user",
	blurb: "Who is going to use this computer?",
	inputs: ["system"],
	outputs: ["identity"],
	singleton: true,
	fields: [
		{ key: "username", label: "Username", type: "text", default: "zen" },
		{ key: "fullName", label: "Full name", type: "text", placeholder: "Aaru" },
		{ key: "autologin", label: "Log in automatically", type: "toggle", default: true },
		{ key: "admin", label: "Allow admin powers (sudo)", type: "toggle", default: true },
		{
			key: "shell",
			label: "Shell",
			type: "choice",
			default: "/bin/bash",
			options: [
				{ value: "/bin/bash", label: "bash" },
				{ value: "/usr/bin/zsh", label: "zsh" },
				{ value: "/usr/bin/fish", label: "fish" },
			],
		},
	],
	emit: (cfg) => {
		const u = cfg.username ?? "zen"
		const shell = cfg.shell ?? "/bin/bash"
		const groups = yes(cfg.admin) ? "sudo,audio,video" : "audio,video"
		return {
			packages:
				shell === "/usr/bin/zsh" ? ["zsh"] : shell === "/usr/bin/fish" ? ["fish"] : [],
			hooks: [
				`useradd -m -s ${shell} ${cfg.fullName ? `-c "${cfg.fullName}" ` : ""}${u} || true`,
				`usermod -aG ${groups} ${u} || true`,
			],
			files:
				cfg.autologin === false
					? []
					: [
						{
							path: "etc/lightdm/lightdm.conf.d/90-zenvx-autologin.conf",
							content: `[Seat:*]\nautologin-user=${u}\nautologin-user-timeout=0\n`,
						},
					],
			sizeMb: 1,
		}
	},
}

export const identityHostname: BlockDef = {
	id: "identity.hostname",
	category: "me",
	label: "Computer name",
	kidLabel: "Machine Name",
	icon: "pc",
	blurb: "What the computer calls itself on the network.",
	inputs: ["system"],
	outputs: ["identity"],
	singleton: true,
	fields: [{ key: "hostname", label: "Name", type: "text", default: "zenvx-pc" }],
	emit: (cfg) => {
		const h = cfg.hostname ?? "zenvx-pc"
		return {
			files: [
				{ path: "etc/hostname", content: `${h}\n` },
				{ path: "etc/hosts", content: `127.0.0.1\tlocalhost\n127.0.1.1\t${h}\n` },
			],
			sizeMb: 1,
		}
	},
}

const INDIC = ["ml_IN", "hi_IN", "ta_IN", "kn_IN", "te_IN", "bn_IN"]

export const identityLocale: BlockDef = {
	id: "identity.locale",
	category: "me",
	label: "Language & region",
	kidLabel: "My Language",
	icon: "globe-alt",
	blurb: "Words, keyboard and clock.",
	inputs: ["system"],
	outputs: ["identity"],
	singleton: true,
	fields: [
		{
			key: "locale",
			label: "Language",
			type: "choice",
			default: "en_IN",
			options: [
				{ value: "en_IN", label: "English (India)" },
				{ value: "ml_IN", label: "Malayalam" },
				{ value: "hi_IN", label: "Hindi" },
				{ value: "ta_IN", label: "Tamil" },
				{ value: "kn_IN", label: "Kannada" },
				{ value: "te_IN", label: "Telugu" },
				{ value: "bn_IN", label: "Bengali" },
				{ value: "en_US", label: "English (US)" },
				{ value: "en_GB", label: "English (UK)" },
			],
		},
		{ key: "timezone", label: "Timezone", type: "text", default: "Asia/Kolkata" },
		{
			key: "keyboard",
			label: "Keyboard",
			type: "choice",
			default: "us",
			options: [
				{ value: "us", label: "US" },
				{ value: "in", label: "India" },
				{ value: "gb", label: "UK" },
				{ value: "de", label: "German" },
			],
		},
		{ key: "clock24", label: "24-hour clock", type: "toggle", default: true },
	],
	emit: (cfg) => {
		const locale = cfg.locale ?? "en_IN"
		const kb = cfg.keyboard ?? "us"
		return {
			packages: INDIC.includes(locale)
				? ["locales", "fonts-noto", "fonts-smc", "ibus-m17n"]
				: ["locales", "fonts-noto"],
			lbFlags: {
				bootappend_live: `boot=live locales=${locale}.UTF-8 keyboard-layouts=${kb}`,
			},
			files: [
				{ path: "etc/timezone", content: `${cfg.timezone ?? "Asia/Kolkata"}\n` },
				{ path: "etc/default/keyboard", content: `XKBMODEL="pc105"\nXKBLAYOUT="${kb}"\n` },
				{ path: "etc/zenvx/clock.conf", content: `format=${yes(cfg.clock24) ? "24h" : "12h"}\n` },
			],
			sizeMb: 80,
		}
	},
}

const SAFE_DNS: Record<string, string> = {
	"cloudflare-family": "1.1.1.3 1.0.0.3",
	"opendns-family": "208.67.222.123 208.67.220.123",
}

export const identityGuard: BlockDef = {
	id: "identity.guard",
	category: "me",
	label: "Family safety",
	kidLabel: "Safe Mode",
	icon: "shield-heart",
	blurb: "Filtered DNS, and only a grown-up can install apps.",
	inputs: ["system"],
	outputs: ["identity"],
	singleton: true,
	fields: [
		{
			key: "dns",
			label: "Safe DNS",
			type: "choice",
			default: "cloudflare-family",
			options: [
				{ value: "cloudflare-family", label: "Cloudflare for Families" },
				{ value: "opendns-family", label: "OpenDNS FamilyShield" },
				{ value: "off", label: "Off" },
			],
		},
		{
			key: "lockInstalls",
			label: "Only a grown-up can install apps",
			type: "toggle",
			default: true,
		},
	],
	emit: (cfg) => {
		const dns = SAFE_DNS[cfg.dns ?? "cloudflare-family"]
		return {
			files: [
				...(dns
					? [
						{
							path: "etc/systemd/resolved.conf.d/10-zenvx-family.conf",
							content: `[Resolve]\nDNS=${dns}\nDomains=~.\n`,
						},
					]
					: []),
				{
					path: "etc/zenvx/guard.conf",
					content: `dns=${cfg.dns ?? "cloudflare-family"}\nlock_installs=${yes(cfg.lockInstalls)}\n`,
				},
			],
			sizeMb: 2,
		}
	},
}

export const identity: BlockDef[] = [
	identityBrand,
	identityUser,
	identityHostname,
	identityLocale,
	identityGuard,
]
