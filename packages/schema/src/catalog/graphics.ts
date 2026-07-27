import { type BlockDef, list, yes } from "./types"

export const graphicsDriver: BlockDef = {
	id: "graphics.driver",
	category: "under-the-hood",
	label: "Graphics",
	kidLabel: "Picture Maker",
	icon: "display",
	blurb: "Drivers, display server and screen behaviour.",
	inputs: ["desktop"],
	outputs: ["app"],
	singleton: true,
	proOnly: true,
	fields: [
		{
			key: "driver",
			label: "Driver",
			group: "Driver",
			type: "choice",
			default: "mesa",
			options: [
				{ value: "mesa", label: "Mesa (open)", help: "Intel, AMD, most things." },
				{ value: "nvidia", label: "NVIDIA proprietary" },
				{ value: "nouveau", label: "nouveau (open NVIDIA)" },
				{ value: "amdgpu-pro", label: "AMDGPU PRO" },
				{ value: "vm", label: "Virtual machine guest" },
				{ value: "fbdev", label: "Framebuffer only" },
			],
		},
		{ key: "vulkan", label: "Vulkan", group: "Driver", type: "toggle", default: true },
		{ key: "vaapi", label: "Hardware video decode (VA-API)", group: "Driver", type: "toggle", default: true },
		{ key: "lib32", label: "32-bit graphics libraries", group: "Driver", type: "toggle", default: false, help: "Needed for Steam and old games." },
		{ key: "earlyKms", label: "Early KMS", group: "Driver", type: "toggle", default: true, advanced: true, help: "Flicker-free boot." },
		{ key: "primeOffload", label: "PRIME render offload", group: "Driver", type: "toggle", default: false, advanced: true, dependsOn: { key: "driver", equals: "nvidia" } },
		{
			key: "server",
			label: "Display server",
			group: "Display",
			type: "choice",
			default: "both",
			options: [
				{ value: "wayland", label: "Wayland only" },
				{ value: "x11", label: "X11 only" },
				{ value: "both", label: "Both, Wayland default" },
			],
		},
		{ key: "scaling", label: "Scale factor", group: "Display", type: "slider", min: 100, max: 300, step: 25, default: 100, unit: "%" },
		{ key: "fractionalScaling", label: "Fractional scaling", group: "Display", type: "toggle", default: false },
		{ key: "refresh", label: "Preferred refresh rate", group: "Display", type: "number", min: 24, max: 500, default: 60, unit: "Hz", advanced: true },
		{ key: "colorDepth", label: "Colour depth", group: "Display", type: "choice", default: "24", advanced: true, options: [{ value: "24", label: "24-bit" }, { value: "30", label: "30-bit HDR-ish" }] },
		{ key: "tearFree", label: "Tear-free", group: "Display", type: "toggle", default: true, advanced: true },
		{ key: "vrr", label: "Variable refresh rate", group: "Display", type: "toggle", default: false, advanced: true },
	],
	emit: (cfg) => {
		const d = String(cfg.driver ?? "mesa")
		const pkgs: Record<string, string[]> = {
			mesa: ["mesa-utils", "libgl1-mesa-dri", "xserver-xorg-video-all"],
			nvidia: ["nvidia-driver", "nvidia-settings", "firmware-misc-nonfree"],
			nouveau: ["xserver-xorg-video-nouveau"],
			"amdgpu-pro": ["firmware-amd-graphics", "libdrm-amdgpu1"],
			vm: ["xserver-xorg-video-vmware", "spice-vdagent", "qemu-guest-agent"],
			fbdev: ["xserver-xorg-video-fbdev"],
		}
		return {
			packages: [
				...(pkgs[d] ?? pkgs.mesa),
				...(yes(cfg.vulkan) ? ["vulkan-tools", "libvulkan1"] : []),
				...(yes(cfg.vaapi) ? ["vainfo", "intel-media-va-driver", "mesa-va-drivers"] : []),
				...(cfg.lib32 === true ? ["libgl1-mesa-dri:i386", "libc6:i386"] : []),
				...(cfg.server !== "wayland" ? ["xserver-xorg"] : []),
			],
			blacklist: d === "nvidia" ? ["nouveau"] : [],
			files: [
				{
					path: "etc/zenvx/graphics.conf",
					content:
						`driver=${d}\nserver=${cfg.server ?? "both"}\nscale=${Number(cfg.scaling ?? 100) / 100}\n` +
						`fractional=${cfg.fractionalScaling === true}\nrefresh=${cfg.refresh ?? 60}\ndepth=${cfg.colorDepth ?? 24}\n` +
						`vrr=${cfg.vrr === true}\nprime_offload=${cfg.primeOffload === true}\n`,
				},
				{
					path: "etc/X11/xorg.conf.d/20-zenvx.conf",
					content:
						'Section "Device"\n\tIdentifier "zenvx"\n' +
						`\tOption "TearFree" "${cfg.tearFree !== false ? "true" : "false"}"\n` +
						`\tOption "VariableRefresh" "${cfg.vrr === true ? "true" : "false"}"\n` +
						"EndSection\n",
				},
				{
					path: "etc/environment.d/50-zenvx-graphics.conf",
					content:
						`GDK_SCALE=${Math.max(1, Math.round(Number(cfg.scaling ?? 100) / 100))}\n` +
						`QT_SCALE_FACTOR=${Number(cfg.scaling ?? 100) / 100}\n` +
						(cfg.server === "wayland" ? "MOZ_ENABLE_WAYLAND=1\nQT_QPA_PLATFORM=wayland\n" : ""),
				},
			],
			hooks: yes(cfg.earlyKms) ? ["update-initramfs -u -k all || true"] : [],
			sizeMb: d === "nvidia" ? 900 : 260,
		}
	},
}

export const graphicsCompositor: BlockDef = {
	id: "graphics.compositor",
	category: "looks",
	label: "Window manager",
	kidLabel: "Window Boss",
	icon: "grid",
	blurb: "Tiling or floating, and how it behaves.",
	inputs: ["desktop"],
	outputs: ["look"],
	singleton: true,
	proOnly: true,
	fields: [
		{
			key: "wm",
			label: "Manager",
			type: "choice",
			default: "default",
			options: [
				{ value: "default", label: "Desktop default" },
				{ value: "sway", label: "Sway (Wayland tiling)" },
				{ value: "hyprland", label: "Hyprland" },
				{ value: "i3", label: "i3 (X11 tiling)" },
				{ value: "bspwm", label: "bspwm" },
				{ value: "openbox", label: "Openbox" },
			],
		},
		{ key: "gaps", label: "Gaps between windows", type: "slider", min: 0, max: 60, default: 8, unit: "px", dependsOn: { key: "wm", equals: "sway" } },
		{ key: "borderWidth", label: "Border width", type: "number", min: 0, max: 12, default: 2, unit: "px" },
		{ key: "focusFollowsMouse", label: "Focus follows mouse", type: "toggle", default: false },
		{ key: "animations", label: "Animations", type: "toggle", default: true },
		{ key: "workspaces", label: "Workspaces", type: "number", min: 1, max: 20, default: 4 },
		{ key: "statusBar", label: "Status bar", type: "choice", default: "waybar", advanced: true, options: [{ value: "waybar", label: "Waybar" }, { value: "polybar", label: "Polybar" }, { value: "none", label: "None" }] },
		{ key: "launcher", label: "Launcher", type: "choice", default: "rofi", advanced: true, options: [{ value: "rofi", label: "rofi" }, { value: "wofi", label: "wofi" }, { value: "dmenu", label: "dmenu" }] },
		{
			key: "configAppend",
			label: "Extra config",
			type: "text",
			multiline: true,
			rows: 6,
			syntax: "appended verbatim to the window manager config",
			advanced: true,
		},
	],
	emit: (cfg) => {
		const wm = String(cfg.wm ?? "default")
		if (wm === "default") return { sizeMb: 0 }
		const extra = [
			...(cfg.statusBar && cfg.statusBar !== "none" ? [String(cfg.statusBar)] : []),
			...(cfg.launcher ? [String(cfg.launcher)] : []),
		]
		return {
			packages: [wm, ...extra],
			files: [
				{
					path: `etc/zenvx/wm/${wm}.conf`,
					content:
						`gaps inner ${cfg.gaps ?? 8}\n` +
						`default_border pixel ${cfg.borderWidth ?? 2}\n` +
						`focus_follows_mouse ${cfg.focusFollowsMouse === true ? "yes" : "no"}\n` +
						`workspaces ${cfg.workspaces ?? 4}\n` +
						`animations ${cfg.animations !== false}\n` +
						(cfg.configAppend ? `\n${cfg.configAppend}\n` : ""),
				},
			],
			sim: { windowStyle: cfg.borderWidth === 0 ? "square" : "rounded" },
			sizeMb: 120,
		}
	},
}

export const graphicsGaming: BlockDef = {
	id: "graphics.gaming",
	category: "apps",
	label: "Gaming stack",
	kidLabel: "Game Power",
	icon: "gamepad",
	blurb: "Steam, Proton and the tuning that goes with them.",
	inputs: ["desktop"],
	outputs: ["app"],
	singleton: true,
	proOnly: true,
	fields: [
		{ key: "steam", label: "Steam", type: "toggle", default: true },
		{ key: "protonGe", label: "Proton GE", type: "toggle", default: false, dependsOn: { key: "steam", equals: true } },
		{ key: "lutris", label: "Lutris", type: "toggle", default: false },
		{ key: "gamemode", label: "gamemode", type: "toggle", default: true, help: "Switches the governor while a game runs." },
		{ key: "mangohud", label: "MangoHud overlay", type: "toggle", default: false },
		{ key: "shaderCache", label: "Shader cache", type: "number", min: 0, max: 65536, step: 256, default: 4096, unit: "MB", advanced: true },
		{ key: "esync", label: "esync / fsync", type: "toggle", default: true, advanced: true },
		{ key: "fileLimit", label: "Open file limit", type: "number", min: 1024, max: 2097152, step: 1024, default: 524288, advanced: true },
		{ key: "controllers", label: "Controller drivers", type: "tags", default: "xpad", suggestions: ["xpad", "xboxdrv", "ds4drv", "hid-nintendo"], advanced: true },
	],
	emit: (cfg) => ({
		packages: [
			...(cfg.steam !== false ? ["steam-installer"] : []),
			...(cfg.lutris === true ? ["lutris"] : []),
			...(cfg.gamemode !== false ? ["gamemode"] : []),
			...(cfg.mangohud === true ? ["mangohud"] : []),
			"wine",
			"winetricks",
		],
		modules: list(cfg.controllers),
		files: [
			{
				path: "etc/security/limits.d/zenvx-gaming.conf",
				content: `* soft nofile ${cfg.fileLimit ?? 524288}\n* hard nofile ${cfg.fileLimit ?? 524288}\n`,
			},
			{
				path: "etc/environment.d/60-zenvx-gaming.conf",
				content:
					`MESA_SHADER_CACHE_MAX_SIZE=${Math.round(Number(cfg.shaderCache ?? 4096) / 1024)}G\n` +
					`PROTON_NO_ESYNC=${cfg.esync === false ? 1 : 0}\n` +
					(cfg.protonGe === true ? "PROTON_USE_GE=1\n" : ""),
			},
		],
		sim: { desktopIcons: [{ label: "Games", icon: "gamepad" }] },
		sizeMb: 1800,
	}),
}

export const audioStack: BlockDef = {
	id: "audio.stack",
	category: "under-the-hood",
	label: "Audio",
	kidLabel: "Sound Engine",
	icon: "speaker",
	blurb: "Server, latency, Bluetooth codecs.",
	inputs: ["desktop"],
	outputs: ["app"],
	singleton: true,
	proOnly: true,
	fields: [
		{
			key: "server",
			label: "Sound server",
			group: "Server",
			type: "choice",
			default: "pipewire",
			options: [
				{ value: "pipewire", label: "PipeWire" },
				{ value: "pulseaudio", label: "PulseAudio" },
				{ value: "jack", label: "JACK only" },
				{ value: "alsa", label: "Bare ALSA" },
			],
		},
		{
			key: "sampleRate",
			label: "Sample rate",
			group: "Latency",
			type: "choice",
			default: "48000",
			options: [
				{ value: "44100", label: "44.1 kHz" },
				{ value: "48000", label: "48 kHz" },
				{ value: "96000", label: "96 kHz" },
				{ value: "192000", label: "192 kHz" },
			],
		},
		{ key: "quantum", label: "Quantum", group: "Latency", type: "number", min: 32, max: 8192, step: 32, default: 1024, unit: "frames", help: "Lower is snappier and more likely to crackle." },
		{ key: "lowLatency", label: "Low-latency profile", group: "Latency", type: "toggle", default: false, help: "Adds realtime priority limits for audio work." },
		{ key: "rtPriority", label: "Realtime priority", group: "Latency", type: "number", min: 1, max: 99, default: 88, advanced: true, dependsOn: { key: "lowLatency", equals: true } },
		{ key: "bluetooth", label: "Bluetooth audio", group: "Devices", type: "toggle", default: true },
		{ key: "codecs", label: "Bluetooth codecs", group: "Devices", type: "tags", default: "sbc-xq, aac, ldac", suggestions: ["sbc", "sbc-xq", "aac", "ldac", "aptx", "aptx-hd"], dependsOn: { key: "bluetooth", equals: true } },
		{ key: "noiseSuppression", label: "Microphone noise suppression", group: "Devices", type: "toggle", default: false },
		{ key: "alsaFallback", label: "Keep ALSA compatibility", group: "Devices", type: "toggle", default: true, advanced: true },
	],
	emit: (cfg) => {
		const s = String(cfg.server ?? "pipewire")
		return {
			packages: [
				...(s === "pipewire" ? ["pipewire", "pipewire-pulse", "wireplumber"] : []),
				...(s === "pulseaudio" ? ["pulseaudio"] : []),
				...(s === "jack" ? ["jackd2", "qjackctl"] : []),
				...(yes(cfg.alsaFallback) ? ["alsa-utils"] : []),
				...(yes(cfg.bluetooth) ? ["bluez", "libspa-0.2-bluetooth"] : []),
				...(cfg.noiseSuppression === true ? ["noisetorch"] : []),
				...(cfg.lowLatency === true ? ["rtkit"] : []),
			],
			services: { enable: yes(cfg.bluetooth) ? ["bluetooth"] : [] },
			files: [
				{
					path: "etc/pipewire/pipewire.conf.d/zenvx.conf",
					content:
						"context.properties = {\n" +
						`\tdefault.clock.rate = ${cfg.sampleRate ?? 48000}\n` +
						`\tdefault.clock.quantum = ${cfg.quantum ?? 1024}\n` +
						`\tdefault.clock.min-quantum = ${Math.min(Number(cfg.quantum ?? 1024), 32)}\n` +
						"}\n",
				},
				...(cfg.lowLatency === true
					? [
						{
							path: "etc/security/limits.d/zenvx-audio.conf",
							content: `@audio - rtprio ${cfg.rtPriority ?? 88}\n@audio - memlock unlimited\n@audio - nice -19\n`,
						},
					]
					: []),
				...(yes(cfg.bluetooth)
					? [
						{
							path: "etc/wireplumber/bluetooth.lua.d/zenvx.lua",
							content: `bluez_monitor.properties = { ["bluez5.codecs"] = "[ ${list(cfg.codecs).join(" ")} ]" }\n`,
						},
					]
					: []),
			],
			sizeMb: 90,
		}
	},
}

export const graphicsBlocks: BlockDef[] = [
	graphicsDriver,
	graphicsCompositor,
	graphicsGaming,
	audioStack,
]
