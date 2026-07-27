import { type BlockDef, wallpapers, yes } from "./types"

const FONT_PACKAGES: Record<string, string> = {
	inter: "fonts-inter",
	noto: "fonts-noto",
	dejavu: "fonts-dejavu",
	opendyslexic: "fonts-opendyslexic",
}

const ICON_PACKAGES: Record<string, string> = {
	papirus: "papirus-icon-theme",
	adwaita: "adwaita-icon-theme",
	breeze: "breeze-icon-theme",
}

export const lookTheme: BlockDef = {
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
				{ value: "ocean", label: "Ocean" },
				{ value: "candy", label: "Candy" },
				{ value: "mono", label: "Greyscale" },
				{ value: "plain", label: "Plain" },
			],
		},
		{ key: "darkMode", label: "Dark mode", type: "toggle", default: true },
		{
			key: "iconTheme",
			label: "Icon style",
			type: "choice",
			default: "papirus",
			options: [
				{ value: "papirus", label: "Papirus (colourful)" },
				{ value: "adwaita", label: "Adwaita (plain)" },
				{ value: "breeze", label: "Breeze (flat)" },
			],
		},
		{
			key: "font",
			label: "Font",
			type: "choice",
			default: "inter",
			options: [
				{ value: "inter", label: "Inter (modern)" },
				{ value: "noto", label: "Noto (every language)" },
				{ value: "dejavu", label: "DejaVu (classic)" },
				{ value: "opendyslexic", label: "OpenDyslexic (easy reading)" },
			],
		},
		{
			key: "textSize",
			label: "Text size",
			type: "choice",
			default: "normal",
			options: [
				{ value: "normal", label: "Normal" },
				{ value: "large", label: "Large" },
				{ value: "huge", label: "Huge" },
			],
		},
		{ key: "bigCursor", label: "Big mouse pointer", type: "toggle", default: false },
	],
	emit: (cfg) => ({
		packages: [
			ICON_PACKAGES[cfg.iconTheme ?? "papirus"] ?? "papirus-icon-theme",
			FONT_PACKAGES[cfg.font ?? "inter"] ?? "fonts-inter",
			...(cfg.bigCursor === true ? ["dmz-cursor-theme"] : []),
		],
		files: [
			{
				path: "etc/zenvx/theme.conf",
				content:
					`accent=${cfg.accent ?? "#2783DE"}\n` +
					`wallpaper=${cfg.wallpaper ?? "space"}\n` +
					`dark=${yes(cfg.darkMode)}\n` +
					`icons=${cfg.iconTheme ?? "papirus"}\n` +
					`font=${cfg.font ?? "inter"}\n` +
					`text_size=${cfg.textSize ?? "normal"}\n` +
					`cursor_size=${cfg.bigCursor === true ? 48 : 24}\n`,
			},
		],
		sim: {
			accent: cfg.accent ?? "#2783DE",
			wallpaper: wallpapers[cfg.wallpaper ?? "space"],
		},
		sizeMb: 40,
	}),
}

export const lookSplash: BlockDef = {
	id: "look.splash",
	category: "looks",
	label: "Boot splash (Plymouth)",
	kidLabel: "Start-up Screen",
	icon: "sparkle",
	blurb: "What you see while it turns on.",
	inputs: ["desktop"],
	outputs: ["look"],
	singleton: true,
	fields: [
		{
			key: "splash",
			label: "Style",
			type: "choice",
			default: "spinner",
			options: [
				{ value: "spinner", label: "Spinner" },
				{ value: "solar", label: "Solar" },
				{ value: "text", label: "Just text" },
			],
		},
		{ key: "quiet", label: "Hide the scrolling text", type: "toggle", default: true },
	],
	emit: (cfg) => ({
		packages: ["plymouth", "plymouth-themes"],
		lbFlags: yes(cfg.quiet) ? { bootappend_live: "boot=live quiet splash" } : {},
		hooks: [`plymouth-set-default-theme ${cfg.splash ?? "spinner"} -R || true`],
		sizeMb: 60,
	}),
}

export const lookSounds: BlockDef = {
	id: "look.sounds",
	category: "looks",
	label: "Sound theme",
	kidLabel: "Sounds",
	icon: "speaker",
	blurb: "Beeps, clicks and a start-up sound.",
	inputs: ["desktop"],
	outputs: ["look"],
	singleton: true,
	fields: [
		{ key: "startupSound", label: "Play a sound on start-up", type: "toggle", default: true },
		{ key: "mute", label: "Start muted", type: "toggle", default: false },
	],
	emit: (cfg) => ({
		packages: ["sound-theme-freedesktop", "pipewire-audio"],
		files: [
			{
				path: "etc/zenvx/sound.conf",
				content: `startup=${yes(cfg.startupSound)}\nmuted=${cfg.mute === true}\n`,
			},
		],
		sizeMb: 25,
	}),
}

export const looks: BlockDef[] = [lookTheme, lookSplash, lookSounds]
