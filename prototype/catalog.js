/*
 * ZenvX prototype catalog.
 *
 * A compact mirror of packages/schema/src/catalog for the dependency-free
 * demo. Fields use a terse notation so the whole catalog stays small:
 *
 *   "key|type|default|extra"
 *
 *   text     key|text|default|placeholder
 *   area     key|area|default|syntax hint
 *   toggle   key|toggle|1 or 0
 *   color    key|color|#rrggbb
 *   choice   key|choice|default|a,b,c
 *   number   key|number|default|min,max,unit
 *   slider   key|slider|default|min,max,unit
 *   tags     key|tags|a, b|suggestion,suggestion
 *
 * A trailing "!" on the key marks the field advanced.
 * A trailing "?other=value" on the key makes it depend on another field.
 * A "~Group" suffix on the key puts it in a section.
 */

const TITLES = {
	flavour: "Kernel flavour", governor: "CPU governor", fs: "Filesystem",
	cipher: "Cipher", engine: "Engine", shell: "Shell", editor: "Editor",
	loader: "Loader", theme: "Theme", model: "Model", format: "Format",
}

const titleize = (k) =>
	TITLES[k] ||
	k.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase()).trim()

export function parseField(spec) {
	const [rawKey, type = "toggle", def = "", extra = ""] = spec.split("|")
	let key = rawKey
	const f = { type }

	const groupAt = key.indexOf("~")
	if (groupAt > -1) {
		f.group = key.slice(groupAt + 1)
		key = key.slice(0, groupAt)
	}
	const depAt = key.indexOf("?")
	if (depAt > -1) {
		const [dk, dv] = key.slice(depAt + 1).split("=")
		f.dependsOn = { key: dk, equals: dv === "1" ? true : dv === "0" ? false : dv }
		key = key.slice(0, depAt)
	}
	if (key.endsWith("!")) {
		f.advanced = true
		key = key.slice(0, -1)
	}

	f.key = key
	f.label = titleize(key)

	if (type === "toggle") f.default = def === "1"
	else if (type === "number" || type === "slider") {
		const [min, max, unit] = extra.split(",")
		f.default = Number(def)
		f.min = Number(min || 0)
		f.max = Number(max || 100)
		if (unit) f.unit = unit
	} else if (type === "choice") {
		f.default = def
		f.options = extra.split(",").filter(Boolean)
	} else if (type === "tags") {
		f.default = def
		f.suggestions = extra.split(",").filter(Boolean)
	} else {
		f.default = def
		if (extra) f.hint = extra
	}
	return f
}

/** [id, category, label, kidLabel, blurb, proOnly, fields] */
const RAW = [
	// ---- start ------------------------------------------------------------
	["base.debian-stable", "start", "Debian stable", "The Engine", "Rock solid, a bit older.", 0, ["arch|choice|amd64|amd64,arm64,i386", "nonfree|toggle|1"]],
	["base.debian-testing", "start", "Debian testing", "The Fast Engine", "Newer things, occasionally spicy.", 0, ["arch|choice|amd64|amd64,arm64"]],
	["base.ubuntu-lts", "start", "Ubuntu LTS", "The Friendly Engine", "Familiar and well supported.", 0, ["arch|choice|amd64|amd64,arm64"]],

	// ---- looks ------------------------------------------------------------
	["desktop.xfce", "looks", "XFCE", "Simple Desk", "Light and quick.", 0, []],
	["desktop.gnome", "looks", "GNOME", "Big Buttons Desk", "Modern and touch friendly.", 0, []],
	["desktop.kde", "looks", "KDE Plasma", "Everything Desk", "Endlessly adjustable.", 0, []],
	["desktop.lxqt", "looks", "LXQt", "Tiny Desk", "For old machines.", 0, []],
	["desktop.mate", "looks", "MATE", "Classic Desk", "The old ways, maintained.", 0, []],
	["desktop.cinnamon", "looks", "Cinnamon", "Cosy Desk", "Warm and familiar.", 0, []],
	["desktop.tty", "looks", "No desktop", "Just Text", "Text only, like the old days.", 0, []],
	["look.theme", "looks", "Theme", "Colours", "Accent colour and wallpaper.", 0, ["accent|color|#2783DE", "wallpaper|choice|space|space,forest,sunset,ocean,candy,mono,plain", "dark|toggle|0"]],
	["look.splash", "looks", "Splash", "Hello Picture", "The picture while it wakes up.", 0, ["text|text|Hello|shown under the logo"]],
	["look.sounds", "looks", "Sounds", "Beeps", "Startup and click sounds.", 0, ["startup|toggle|1", "clicks|toggle|0"]],
	["boot.splash", "looks", "Boot experience", "Starting Up Screen", "What you stare at while it starts.", 1, ["plymouth|toggle|1", "theme?plymouth=1|choice|spinner|spinner,bgrt,fade-in,text", "logo!|text||/usr/share/zenvx/logo.png", "quiet|toggle|1", "logLevel!|slider|3|0,7", "showMessages|toggle|0", "fsckProgress!|toggle|1"]],

	// ---- apps -------------------------------------------------------------
	["app.browser", "apps", "Web browser", "Internet", "Firefox.", 0, ["homepage|text||https://example.com", "adblock|toggle|1"]],
	["app.paint", "apps", "Paint", "Painting", "Draw pictures.", 0, []],
	["app.code", "apps", "Code editor", "Coding", "VSCodium.", 0, []],
	["app.blockcode", "apps", "Block coding", "Puzzle Code", "Scratch.", 0, []],
	["app.games", "apps", "Games", "Games", "A few good ones.", 0, []],
	["app.sandbox", "apps", "Sandbox", "Building Blocks", "Minetest.", 0, []],
	["app.media", "apps", "Media player", "Watch", "VLC.", 0, []],
	["app.musicmaker", "apps", "Music maker", "Make Music", "LMMS.", 0, []],
	["app.video", "apps", "Video editor", "Movie Maker", "Shotcut.", 0, []],
	["app.photo", "apps", "Photo editor", "Photos", "GIMP.", 0, []],
	["app.vector", "apps", "Vector editor", "Shapes", "Inkscape.", 0, []],
	["app.office", "apps", "Office", "Homework", "LibreOffice.", 0, []],
	["app.python", "apps", "Python", "Python", "Thonny and Python 3.", 0, []],
	["app.typing", "apps", "Typing tutor", "Typing", "Learn the keyboard.", 0, []],
	["app.maths", "apps", "Maths", "Numbers", "GeoGebra.", 0, []],
	["app.stars", "apps", "Stars", "Space", "Stellarium.", 0, []],
	["app.files", "apps", "Files", "My Stuff", "A file manager.", 0, []],
	["app.terminal", "apps", "Terminal", "Command Box", "A shell.", 0, []],
	["dev.workspace", "apps", "Developer workspace", "My Desk", "Shell, editor, dotfiles, git identity.", 1, ["shell~Shell|choice|bash|bash,zsh,fish,nushell", "prompt~Shell|choice|plain|plain,starship,powerline", "tmux~Shell|toggle|0", "modernCli~Shell|tags|ripgrep, fd-find, bat, fzf|ripgrep,fd-find,bat,fzf,eza,zoxide,jq,btop", "editor~Editor|choice|vscodium|vscodium,neovim,emacs,helix,none", "languageServers!~Editor|tags||clangd,pyright,rust-analyzer,gopls", "gitName~Git|text||Ada Lovelace", "gitEmail~Git|text||ada@example.com", "gitSign!~Git|toggle|0", "dotfiles!~Git|text||https://github.com/you/dotfiles"]],

	// ---- me ---------------------------------------------------------------
	["identity.brand", "me", "Brand", "My Name For It", "Name, icon, version.", 0, ["name|text|MyOS", "icon|choice|rocket|rocket,star,cat,robot,leaf", "version|text|0.1"]],
	["identity.user", "me", "User", "Me", "The first account.", 0, ["username|text|kid", "autologin|toggle|1", "sudo|toggle|0"]],
	["identity.hostname", "me", "Hostname", "Computer Name", "What the network calls it.", 0, ["hostname|text|myos"]],
	["identity.locale", "me", "Locale", "Language", "Language, keyboard, timezone.", 0, ["locale|text|en_US.UTF-8", "keyboard|text|us", "timezone|text|UTC"]],
	["identity.guard", "me", "Parental guard", "Safe Mode", "Filtering and time limits.", 0, ["safeSearch|toggle|1", "blockList|tags||social,ads,adult", "timeLimitMinutes|number|0|0,720,min"]],
	["boot.firstrun", "me", "First run", "Hello Screen", "What happens the very first boot.", 1, ["wizard|toggle|1", "steps?wizard=1|tags|welcome, language, user, wifi, finish|welcome,language,keyboard,user,wifi,timezone,privacy,finish", "oemMode|toggle|0", "cloudInit!|toggle|0", "regenMachineId!|toggle|1", "regenSshKeys!|toggle|1", "eula!|area||shown on first boot"]],

	// ---- under the hood: kid ----------------------------------------------
	["hood.packages", "under-the-hood", "Extra packages", "More Programs", "Anything else from the archive.", 0, ["packages|tags||htop,neofetch,curl,git"]],
	["hood.remove", "under-the-hood", "Remove packages", "Take Out", "Strip things you do not want.", 0, ["packages|tags||games,libreoffice"]],
	["hood.firewall", "under-the-hood", "Firewall", "Door Guard", "ufw, closed by default.", 0, ["enabled|toggle|1", "allow|tags||ssh,http,https"]],
	["hood.ssh", "under-the-hood", "SSH", "Remote Door", "Log in from another machine.", 0, ["enabled|toggle|0", "passwordAuth?enabled=1|toggle|0", "keys?enabled=1|area||one public key per line"]],
	["hood.updates", "under-the-hood", "Updates", "Keep Fresh", "Unattended upgrades.", 0, ["auto|toggle|1", "securityOnly|toggle|1", "reboot!|toggle|0"]],
	["hood.swap", "under-the-hood", "Swap", "Extra Memory", "A swap file.", 0, ["sizeMb|number|2048|0,65536,MB"]],
	["hood.kernel", "under-the-hood", "Kernel choice", "The Brain", "Which kernel to install.", 0, ["flavour|choice|stock|stock,lts,backports"]],
	["hood.hook", "under-the-hood", "Custom hook", "My Own Script", "Shell that runs inside the image.", 0, ["script|area||runs in the chroot as root"]],
]

export const PROTOTYPE_BLOCKS = RAW.map(([id, category, label, kidLabel, blurb, proOnly, fields]) => ({
	id,
	category,
	label,
	kidLabel,
	blurb,
	proOnly: !!proOnly,
	fields: fields.map(parseField),
}))

export const CATEGORY_LABELS = {
	start: "Start here",
	looks: "How it looks",
	apps: "Things to do",
	me: "Make it mine",
	"under-the-hood": "Under the hood",
	finish: "Finish",
}

export const CATEGORY_ORDER = ["start", "looks", "apps", "me", "under-the-hood", "finish"]
