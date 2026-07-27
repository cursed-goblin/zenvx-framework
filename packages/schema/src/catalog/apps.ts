import type { Contribution, FieldDef } from "../recipe"
import { type BlockDef, yes } from "./types"

/**
 * Every app shares two settings (pin to the bar, open at start) and can add
 * its own fields plus an extra contribution that is merged into the base one.
 */
const app = (
	id: string,
	label: string,
	kidLabel: string,
	icon: string,
	blurb: string,
	packages: string[],
	sizeMb: number,
	demoBody: string,
	extraFields: FieldDef[] = [],
	extra?: (cfg: Record<string, any>) => Contribution,
): BlockDef => ({
	id,
	category: "apps",
	label,
	kidLabel,
	icon,
	blurb,
	inputs: ["desktop"],
	outputs: ["app"],
	fields: [
		{ key: "pinToBar", label: "Pin to the bar", type: "toggle", default: true },
		{ key: "openAtStart", label: "Open when it turns on", type: "toggle", default: false },
		...extraFields,
	],
	emit: (cfg) => {
		const e = extra?.(cfg) ?? {}
		const all = [...packages, ...(e.packages ?? [])]
		return {
			...e,
			packages: all,
			hooks: [
				...(e.hooks ?? []),
				...(cfg.openAtStart === true && all[0]
					? [
						`mkdir -p /etc/xdg/autostart && cp /usr/share/applications/${all[0]}.desktop /etc/xdg/autostart/ 2>/dev/null || true`,
					]
					: []),
			],
			files: [
				...(e.files ?? []),
				...(cfg.pinToBar === false && all[0]
					? [{ path: `etc/zenvx/unpinned/${all[0]}`, content: "unpinned\n" }]
					: []),
			],
			sim: {
				desktopIcons: [{ label: kidLabel, icon }],
				demoWindow: { title: kidLabel, icon, body: demoBody },
				...(e.sim ?? {}),
			},
			sizeMb: sizeMb + (e.sizeMb ?? 0),
		}
	},
})

const browser = app(
	"app.browser",
	"Web browser",
	"Internet",
	"globe",
	"Look things up on the web.",
	[],
	260,
	"A tabbed web browser window.",
	[
		{
			key: "engine",
			label: "Which browser?",
			type: "choice",
			default: "firefox-esr",
			options: [
				{ value: "firefox-esr", label: "Firefox" },
				{ value: "chromium", label: "Chromium" },
				{ value: "epiphany-browser", label: "Web (tiny)" },
			],
		},
		{ key: "adblock", label: "Block ads", type: "toggle", default: true },
		{ key: "homepage", label: "Homepage", type: "text", placeholder: "https://kiddle.co" },
	],
	(cfg) => ({
		packages: [String(cfg.engine ?? "firefox-esr")],
		files: [
			{
				path: "etc/zenvx/browser.conf",
				content:
					`engine=${cfg.engine ?? "firefox-esr"}\n` +
					`adblock=${yes(cfg.adblock)}\n` +
					`homepage=${cfg.homepage ?? ""}\n`,
			},
		],
	}),
)

export const apps: BlockDef[] = [
	browser,
	app("app.paint", "Drawing (Pinta)", "Paint", "brush", "Draw and colour.", ["pinta"], 120, "A canvas with a colour palette."),
	app("app.code", "Code editor (VS Codium)", "Code", "code", "Write your own programs.", ["codium"], 340, "An editor with a file tree and terminal."),
	app("app.blockcode", "Scratch", "Block Coding", "puzzle", "Make games by snapping blocks together.", ["scratch"], 220, "Drag-and-drop code blocks and a stage."),
	app("app.games", "Games pack", "Games", "gamepad", "Chess, mines, solitaire.", ["gnome-games"], 180, "A grid of playable games."),
	app("app.sandbox", "Minetest", "Blocks World", "cube", "Build worlds out of blocks.", ["minetest"], 400, "A blocky 3D world."),
	app("app.media", "Media player (VLC)", "Music & Video", "music", "Play music and videos.", ["vlc"], 150, "A playlist and playback controls."),
	app("app.musicmaker", "LMMS", "Music Maker", "note", "Make your own songs.", ["lmms"], 300, "A beat grid and a piano roll."),
	app("app.video", "Kdenlive", "Video Editor", "film", "Cut and join videos.", ["kdenlive"], 700, "A timeline with video clips."),
	app("app.photo", "GIMP", "Photo Studio", "image", "Edit photos properly.", ["gimp"], 480, "Layers, brushes and filters."),
	app("app.vector", "Inkscape", "Shape Draw", "pen", "Draw logos and shapes that never blur.", ["inkscape"], 420, "Bezier shapes on a canvas."),
	app("app.office", "LibreOffice", "Homework", "doc", "Write documents, do sums.", ["libreoffice"], 780, "A word processor page."),
	app("app.python", "Python 3 + Thonny", "Robot Lessons", "python", "Learn to code, step by step.", ["python3", "thonny"], 190, "A beginner Python shell."),
	app("app.typing", "Typing tutor", "Typing Game", "keyboard", "Learn where the keys are.", ["tuxtype"], 60, "Falling letters to type."),
	app("app.maths", "Maths games", "Maths Game", "calculator", "Sums, but fun.", ["tuxmath"], 60, "Arithmetic asteroids."),
	app("app.stars", "Stellarium", "Stars", "star", "See the night sky on any date.", ["stellarium"], 380, "A planetarium view."),
	app("app.files", "File manager", "My Stuff", "folder", "Where your things live.", ["thunar"], 60, "Folders and files in a list."),
	app("app.terminal", "Terminal", "Command Box", "terminal", "Type commands directly.", ["xterm"], 20, "A black window with a prompt."),
]
