import type { Contribution } from "../recipe"
import { type BlockDef, yes } from "./types"

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
				{ value: "none", label: "Hide it" },
			],
		},
		{
			key: "panelSize",
			label: "Bar size",
			type: "choice",
			default: "medium",
			options: [
				{ value: "small", label: "Small" },
				{ value: "medium", label: "Medium" },
				{ value: "large", label: "Big (easy to click)" },
			],
		},
		{
			key: "windowStyle",
			label: "Window corners",
			type: "choice",
			default: sim?.windowStyle ?? "rounded",
			options: [
				{ value: "rounded", label: "Rounded" },
				{ value: "square", label: "Square" },
			],
		},
		{ key: "animations", label: "Smooth animations", type: "toggle", default: true },
		{ key: "showDesktopIcons", label: "Icons on the desktop", type: "toggle", default: true },
	],
	emit: (cfg) => ({
		packages: [...packages, "lightdm", "xserver-xorg"],
		services: { enable: ["lightdm"] },
		files: [
			{
				path: "etc/zenvx/desktop.conf",
				content:
					`panel=${cfg.panelPosition ?? sim?.panel ?? "bottom"}\n` +
					`panel_size=${cfg.panelSize ?? "medium"}\n` +
					`animations=${yes(cfg.animations)}\n` +
					`desktop_icons=${yes(cfg.showDesktopIcons)}\n`,
			},
		],
		sim: {
			...sim,
			panel: cfg.panelPosition ?? sim?.panel,
			windowStyle: cfg.windowStyle ?? sim?.windowStyle,
		},
		sizeMb,
	}),
})

export const desktopXfce = desktop(
	"desktop.xfce",
	"XFCE 4",
	"Simple Desktop",
	"desktop-simple",
	"Light, fast, works on old computers.",
	["xfce4", "xfce4-terminal", "thunar"],
	{ panel: "bottom", windowStyle: "square" },
	420,
)

export const desktopGnome = desktop(
	"desktop.gnome",
	"GNOME 48",
	"Modern Desktop",
	"desktop-modern",
	"Big, smooth, touch friendly.",
	["gnome-core", "gnome-terminal", "nautilus"],
	{ panel: "top", windowStyle: "rounded" },
	1400,
)

export const desktopKde = desktop(
	"desktop.kde",
	"KDE Plasma 6",
	"Customise-Everything Desktop",
	"desktop-power",
	"Every setting you could want.",
	["kde-plasma-desktop", "konsole", "dolphin"],
	{ panel: "bottom", windowStyle: "rounded" },
	1600,
)

export const desktopLxqt = desktop(
	"desktop.lxqt",
	"LXQt",
	"Tiny Desktop",
	"desktop-tiny",
	"Runs on almost anything.",
	["lxqt-core", "qterminal", "pcmanfm-qt"],
	{ panel: "bottom", windowStyle: "square" },
	320,
)

export const desktopMate = desktop(
	"desktop.mate",
	"MATE",
	"Classic Desktop",
	"desktop-classic",
	"The old-school two-bar layout.",
	["mate-desktop-environment", "mate-terminal"],
	{ panel: "top", windowStyle: "square" },
	620,
)

export const desktopCinnamon = desktop(
	"desktop.cinnamon",
	"Cinnamon",
	"Windows-ish Desktop",
	"desktop-familiar",
	"Feels like a familiar PC.",
	["cinnamon-core", "gnome-terminal", "nemo"],
	{ panel: "bottom", windowStyle: "rounded" },
	980,
)

export const desktopNone: BlockDef = {
	id: "desktop.tty",
	category: "looks",
	label: "No desktop (console only)",
	kidLabel: "Text Only",
	icon: "terminal",
	blurb: "Just a text screen. Tiny and fast.",
	inputs: ["system"],
	outputs: ["desktop"],
	singleton: true,
	proOnly: true,
	emit: () => ({
		packages: ["console-setup"],
		sim: { panel: "none", windowStyle: "square" },
		sizeMb: 5,
	}),
}

export const desktops: BlockDef[] = [
	desktopXfce,
	desktopGnome,
	desktopKde,
	desktopLxqt,
	desktopMate,
	desktopCinnamon,
	desktopNone,
]
