import type { BlockCategory, Contribution, FieldDef, PortType } from "./recipe"

export type BlockDef = {
	id: string
	category: BlockCategory
	label: string
	kidLabel: string
	icon: string
	blurb: string
	inputs: PortType[]
	outputs: PortType[]
	singleton?: boolean
	proOnly?: boolean
	fields?: FieldDef[]
	emit: (cfg: Record<string, any>) => Contribution
}

const wallpapers: Record<string, string> = {
	space: "linear-gradient(160deg,#101828,#2783DE)",
	forest: "linear-gradient(160deg,#14281f,#46A171)",
	sunset: "linear-gradient(160deg,#3a1c1c,#D5803B)",
	plain: "linear-gradient(160deg,#202020,#383836)",
}

/* ------------------------------- START ---------------------------------- */

const baseDebian: BlockDef = {
	id: "base.debian-stable",
	category: "start",
	label: "Debian 13 (stable)",
	kidLabel: "The Engine",
	icon: "engine",
	blurb: "The part that makes the computer turn on.",
	inputs: [],
	outputs: ["system"],
	singleton: true,
	fields: [
		{
			key: "arch",
			label: "Architecture",
			type: "choice",
			default: "amd64",
			options: [
				{ value: "amd64", label: "64-bit PC" },
				{ value: "arm64", label: "ARM64" },
			],
		},
	],
	emit: (cfg) => ({
		lbFlags: {
			distribution: "trixie",
			architectures: cfg.arch ?? "amd64",
			archive_areas: "main contrib non-free-firmware",
			binary_images: "iso-hybrid",
		},
		packages: ["linux-image-amd64", "live-boot", "systemd-sysv", "network-manager"],
		sizeMb: 720,
	}),
}

const baseUbuntu: BlockDef = {
	id: "base.ubuntu-lts",
	category: "start",
	label: "Ubuntu 26.04 LTS",
	kidLabel: "The Friendly Engine",
	icon: "engine-alt",
	blurb: "Same job, more drivers out of the box.",
	inputs: [],
	outputs: ["system"],
	singleton: true,
	emit: () => ({
		lbFlags: {
			distribution: "noble",
			mirror_bootstrap: "http://archive.ubuntu.com/ubuntu/",
			archive_areas: "main restricted universe multiverse",
			binary_images: "iso-hybrid",
		},
		packages: ["linux-generic", "live-boot", "network-manager"],
		sizeMb: 900,
	}),
}

/* ------------------------------- LOOKS ---------------------------------- */

const desktop = (
	id: string,
	label: string,
	kidLabel: string,
	icon: string,
	blurb: string,
	packages: string[],
	sim: Contribution["sim"],
	sizeMb: number,
): BlockDef => ({
	id,
	category: "looks",
	label,
	kidLabel,
	icon,
	blurb,
	inputs: ["system"],
	outputs: ["desktop"],
	singleton: true,
	fields: [
		{
			key: "panelPosition",
			label: "Where is the bar?",
			type: "choice",
			default: sim?.panel ?? "bottom",
			options: [
				{ value: "bottom", label: "Bottom" },
				{ value: "top", label: "Top" },
				{ value: "left", label: "Left side" },
			],
		},
	],
	emit: (cfg) => ({
		packages: [...packages, "lightdm", "xserver-xorg"],
		services: { enable: ["lightdm"] },
		sim: { ...sim, panel: cfg.panelPosition ?? sim?.panel },
		sizeMb,
	}),
})

const desktopXfce = desktop(
	"desktop.xfce",
	"XFCE 4",
	"Simple Desktop",
	"desktop-simple",
	"Light, fast, works on old computers.",
	["xfce4", "xfce4-terminal", "thunar"],
	{ panel: "bottom", windowStyle: "square" },
	420,
)

const desktopGnome = desktop(
	"desktop.gnome",
	"GNOME 48",
	"Modern Desktop",
	"desktop-modern",
	"Big, smooth, touch friendly.",
	["gnome-core", "gnome-terminal", "nautilus"],
	{ panel: "top", windowStyle: "rounded" },
	1400,
)

const desktopKde = desktop(
	"desktop.kde",
	"KDE Plasma 6",
	"Customise-Everything Desktop",
	"desktop-power",
	"Every setting you could want.",
	["kde-plasma-desktop", "konsole", "dolphin"],
	{ panel: "bottom", windowStyle: "rounded" },
	1600,
)

const lookTheme: BlockDef = {
	id: "look.theme",
	category: "looks",
	label: "Theme & wallpaper",
	kidLabel: "Colours",
	icon: "palette",
	blurb: "Pick your colour and background.",
	inputs: ["desktop"],
	outputs: ["look"],
	singleton: true,
	fields: [
		{ key: "accent", label: "Favourite colour", type: "color", default: "#2783DE" },
		{
			key: "wallpaper",
			label: "Background",
			type: "choice",
			default: "space",
			options: [
				{ value: "space", label: "Space" },
				{ value: "forest", label: "Forest" },
				{ value: "sunset", label: "Sunset" },
				{ value: "plain", label: "Plain" },
			],
		},
		{ key: "darkMode", label: "Dark mode", type: "toggle", default: true },
	],
	emit: (cfg) => ({
		packages: ["papirus-icon-theme", "fonts-inter"],
		files: [
			{
				path: "etc/zenvx/theme.conf",
				content: `accent=${cfg.accent ?? "#2783DE"}\nwallpaper=${cfg.wallpaper ?? "space"}\ndark=${cfg.darkMode !== false}\n`,
			},
		],
		sim: {
			accent: cfg.accent ?? "#2783DE",
			wallpaper: wallpapers[cfg.wallpaper ?? "space"],
		},
		sizeMb: 40,
	}),
}

/* -------------------------------- APPS ---------------------------------- */

const app = (
	id: string,
	label: string,
	kidLabel: string,
	icon: string,
	blurb: string,
	packages: string[],
	sizeMb: number,
	demoBody: string,
): BlockDef => ({
	id,
	category: "apps",
	label,
	kidLabel,
	icon,
	blurb,
	inputs: ["desktop"],
	outputs: ["app"],
	emit: () => ({
		packages,
		sim: {
			desktopIcons: [{ label: kidLabel, icon }],
			demoWindow: { title: kidLabel, icon, body: demoBody },
		},
		sizeMb,
	}),
})

const apps: BlockDef[] = [
	app("app.browser", "Firefox ESR", "Internet", "globe", "Look things up on the web.", ["firefox-esr"], 260, "A tabbed web browser window."),
	app("app.paint", "Drawing (Pinta)", "Paint", "brush", "Draw and colour.", ["pinta"], 120, "A canvas with a colour palette."),
	app("app.code", "Code editor (VS Codium)", "Code", "code", "Write your own programs.", ["codium"], 340, "An editor with a file tree and terminal."),
	app("app.games", "Games pack", "Games", "gamepad", "Chess, mines, solitaire.", ["gnome-games"], 180, "A grid of playable games."),
	app("app.media", "Media player (VLC)", "Music & Video", "music", "Play music and videos.", ["vlc"], 150, "A playlist and playback controls."),
	app("app.office", "LibreOffice", "Homework", "doc", "Write documents, do sums.", ["libreoffice"], 780, "A word processor page."),
	app("app.python", "Python 3 + Thonny", "Robot Lessons", "python", "Learn to code, step by step.", ["python3", "thonny"], 190, "A beginner Python shell."),
	app("app.files", "File manager", "My Stuff", "folder", "Where your things live.", ["thunar"], 60, "Folders and files in a list."),
]

/* --------------------------------- ME ----------------------------------- */

const identityBrand: BlockDef = {
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
				{ value: "bolt", label: "Bolt" },
			],
		},
	],
	emit: (cfg) => ({
		files: [
			{
				path: "etc/zenvx/brand.conf",
				content: `TAGLINE="${cfg.tagline ?? ""}"\nLOGO=${cfg.logo ?? "rocket"}\n`,
			},
		],
		sizeMb: 1,
	}),
}

const identityUser: BlockDef = {
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
		{ key: "autologin", label: "Log in automatically", type: "toggle", default: true },
	],
	emit: (cfg) => ({
		hooks: [
			`useradd -m -s /bin/bash ${cfg.username ?? "zen"} || true`,
			`usermod -aG sudo,audio,video ${cfg.username ?? "zen"} || true`,
		],
		files:
			cfg.autologin === false
				? []
				: [
						{
							path: "etc/lightdm/lightdm.conf.d/90-zenvx-autologin.conf",
							content: `[Seat:*]\nautologin-user=${cfg.username ?? "zen"}\nautologin-user-timeout=0\n`,
						},
				  ],
		sizeMb: 1,
	}),
}

const identityLocale: BlockDef = {
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
				{ value: "en_US", label: "English (US)" },
			],
		},
		{ key: "timezone", label: "Timezone", type: "text", default: "Asia/Kolkata" },
	],
	emit: (cfg) => ({
		packages:
			cfg.locale === "ml_IN"
				? ["locales", "fonts-noto", "fonts-smc", "ibus-m17n"]
				: ["locales", "fonts-noto"],
		lbFlags: { bootappend_live: `boot=live locales=${cfg.locale ?? "en_IN"}.UTF-8` },
		files: [{ path: "etc/timezone", content: `${cfg.timezone ?? "Asia/Kolkata"}\n` }],
		sizeMb: 80,
	}),
}

/* --------------------------- UNDER THE HOOD ------------------------------ */

const hoodPackages: BlockDef = {
	id: "hood.packages",
	category: "under-the-hood",
	label: "Extra packages",
	kidLabel: "More Stuff",
	icon: "box",
	blurb: "Any Debian package, comma separated.",
	inputs: ["system"],
	outputs: ["app"],
	proOnly: true,
	fields: [{ key: "list", label: "Packages", type: "text", placeholder: "htop, git, neovim" }],
	emit: (cfg) => ({
		packages: String(cfg.list ?? "")
			.split(",")
			.map((s) => s.trim())
			.filter(Boolean),
		sizeMb: 50,
	}),
}

const hoodFirewall: BlockDef = {
	id: "hood.firewall",
	category: "under-the-hood",
	label: "Firewall (nftables)",
	kidLabel: "Shield",
	icon: "shield",
	blurb: "Block incoming connections by default.",
	inputs: ["system"],
	outputs: ["app"],
	proOnly: true,
	emit: () => ({
		packages: ["nftables"],
		services: { enable: ["nftables"] },
		sizeMb: 10,
	}),
}

const hoodHook: BlockDef = {
	id: "hood.hook",
	category: "under-the-hood",
	label: "Custom hook script",
	kidLabel: "Secret Script",
	icon: "terminal",
	blurb: "Shell run inside the chroot at build time.",
	inputs: ["system"],
	outputs: ["app"],
	proOnly: true,
	fields: [{ key: "script", label: "Shell", type: "text", placeholder: "echo hello > /etc/motd" }],
	emit: (cfg) => ({ hooks: cfg.script ? [String(cfg.script)] : [] }),
}

/* ------------------------------- FINISH --------------------------------- */

const outputIso: BlockDef = {
	id: "output.iso",
	category: "finish",
	label: "Bootable ISO",
	kidLabel: "Make It Real",
	icon: "disc",
	blurb: "A file you can put on a USB stick.",
	inputs: ["system"],
	outputs: ["image"],
	singleton: true,
	fields: [
		{ key: "installer", label: "Include installer", type: "toggle", default: true },
	],
	emit: (cfg) => ({
		lbFlags: { binary_images: "iso-hybrid" },
		packages: cfg.installer === false ? [] : ["calamares", "calamares-settings-debian"],
		sizeMb: cfg.installer === false ? 0 : 120,
	}),
}

export const BLOCKS: BlockDef[] = [
	baseDebian,
	baseUbuntu,
	desktopXfce,
	desktopGnome,
	desktopKde,
	lookTheme,
	...apps,
	identityBrand,
	identityUser,
	identityLocale,
	hoodPackages,
	hoodFirewall,
	hoodHook,
	outputIso,
]

export const blockById = (id: string): BlockDef | undefined =>
	BLOCKS.find((b) => b.id === id)

export const CATEGORY_LABELS: Record<string, { label: string; kidLabel: string }> = {
	start: { label: "Base system", kidLabel: "Start here" },
	looks: { label: "Desktop & theme", kidLabel: "Looks" },
	apps: { label: "Applications", kidLabel: "Apps" },
	me: { label: "Identity & locale", kidLabel: "Me" },
	"under-the-hood": { label: "Under the hood", kidLabel: "Advanced" },
	finish: { label: "Output target", kidLabel: "Finish" },
}
