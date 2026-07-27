import { type BlockDef, list, yes } from "./types"

export const pkgApt: BlockDef = {
	id: "pkg.apt",
	category: "under-the-hood",
	label: "apt & repositories",
	kidLabel: "The App Shop",
	icon: "package",
	blurb: "Where packages come from and which ones win.",
	inputs: ["system"],
	outputs: ["app"],
	singleton: true,
	proOnly: true,
	fields: [
		{
			key: "repos",
			label: "Extra repositories",
			group: "Sources",
			type: "text",
			multiline: true,
			rows: 5,
			syntax: "one sources.list line each, written to etc/apt/sources.list.d/zenvx.list",
			placeholder: "deb https://deb.example.com/debian trixie main",
		},
		{ key: "keyUrls", label: "Signing keys", group: "Sources", type: "tags", placeholder: "https://example.com/key.asc", help: "Fetched into etc/apt/keyrings during the build." },
		{ key: "mirrorSnapshot", label: "Snapshot date", group: "Sources", type: "text", placeholder: "20260701T000000Z", advanced: true, help: "Pin snapshot.debian.org for a byte-stable build." },
		{ key: "aptProxy", label: "apt-cacher proxy", group: "Sources", type: "text", placeholder: "http://cache.lan:3142", advanced: true },
		{
			key: "pinning",
			label: "Pin priorities",
			group: "Priorities",
			type: "text",
			multiline: true,
			rows: 6,
			syntax: "apt_preferences stanzas, written to etc/apt/preferences.d/zenvx",
			advanced: true,
			placeholder: "Package: *\nPin: release a=testing\nPin-Priority: 400",
		},
		{ key: "hold", label: "Held packages", group: "Priorities", type: "tags", placeholder: "linux-image-amd64, firefox-esr", help: "Never upgraded automatically." },
		{ key: "recommends", label: "Install recommends", group: "Behaviour", type: "toggle", default: true },
		{ key: "suggests", label: "Install suggests", group: "Behaviour", type: "toggle", default: false },
		{ key: "autoclean", label: "Autoclean the cache", group: "Behaviour", type: "toggle", default: true },
		{ key: "allowUnauth", label: "Allow unauthenticated packages", group: "Behaviour", type: "toggle", default: false, advanced: true, help: "Almost never the right answer." },
		{
			key: "preseed",
			label: "debconf preseed",
			group: "Behaviour",
			type: "text",
			multiline: true,
			rows: 5,
			syntax: "package question type value",
			advanced: true,
		},
		{ key: "localDebs", label: "Local .deb files", group: "Behaviour", type: "tags", advanced: true, help: "Paths inside the build tree, installed last." },
	],
	emit: (cfg) => {
		const repoLines = String(cfg.repos ?? "").split("\n").map((l) => l.trim()).filter(Boolean)
		const held = list(cfg.hold)
		return {
			repos: repoLines.map((line, i) => ({ name: `zenvx-${i + 1}`, line })),
			debconf: String(cfg.preseed ?? "").split("\n").map((l) => l.trim()).filter(Boolean),
			files: [
				...(repoLines.length
					? [{ path: "etc/apt/sources.list.d/zenvx.list", content: repoLines.join("\n") + "\n" }]
					: []),
				...(cfg.pinning
					? [{ path: "etc/apt/preferences.d/zenvx", content: `${cfg.pinning}\n` }]
					: []),
				{
					path: "etc/apt/apt.conf.d/60zenvx",
					content:
						`APT::Install-Recommends "${yes(cfg.recommends) ? "1" : "0"}";\n` +
						`APT::Install-Suggests "${cfg.suggests === true ? "1" : "0"}";\n` +
						`APT::Get::AllowUnauthenticated "${cfg.allowUnauth === true ? "true" : "false"}";\n` +
						(yes(cfg.autoclean) ? 'APT::Periodic::AutocleanInterval "7";\n' : "") +
						(cfg.aptProxy ? `Acquire::http::Proxy "${cfg.aptProxy}";\n` : ""),
				},
				...(cfg.preseed
					? [{ path: "etc/zenvx/preseed.cfg", content: `${cfg.preseed}\n` }]
					: []),
			],
			hooks: [
				...list(cfg.keyUrls).map(
					(u, i) => `curl -fsSL ${u} -o /etc/apt/keyrings/zenvx-${i + 1}.asc || true`,
				),
				...held.map((p) => `apt-mark hold ${p} || true`),
				...(cfg.preseed ? ["debconf-set-selections /etc/zenvx/preseed.cfg || true"] : []),
				...list(cfg.localDebs).map((d) => `apt-get install -y ${d} || true`),
			],
			notes: cfg.mirrorSnapshot
				? [`mirror pinned to snapshot ${cfg.mirrorSnapshot}`]
				: [],
			sizeMb: 4,
		}
	},
}

export const pkgUniversal: BlockDef = {
	id: "pkg.universal",
	category: "under-the-hood",
	label: "Universal packages",
	kidLabel: "More Apps",
	icon: "boxes",
	blurb: "Flatpak, Snap, AppImage, Nix.",
	inputs: ["system"],
	outputs: ["app"],
	singleton: true,
	proOnly: true,
	fields: [
		{ key: "flatpak", label: "Flatpak", type: "toggle", default: true },
		{ key: "flathub", label: "Add Flathub", type: "toggle", default: true, dependsOn: { key: "flatpak", equals: true } },
		{ key: "flatpakApps", label: "Preinstalled flatpaks", type: "tags", placeholder: "org.gimp.GIMP", dependsOn: { key: "flatpak", equals: true }, suggestions: ["org.gimp.GIMP", "org.blender.Blender", "com.spotify.Client", "org.videolan.VLC"] },
		{ key: "snap", label: "Snap", type: "toggle", default: false },
		{ key: "appimage", label: "AppImage runtime", type: "toggle", default: false },
		{ key: "nix", label: "Nix package manager", type: "toggle", default: false, advanced: true },
		{ key: "brew", label: "Homebrew", type: "toggle", default: false, advanced: true },
		{
			key: "storePreference",
			label: "App store prefers",
			type: "choice",
			default: "deb",
			options: [{ value: "deb", label: "deb" }, { value: "flatpak", label: "flatpak" }, { value: "snap", label: "snap" }],
		},
	],
	emit: (cfg) => ({
		packages: [
			...(cfg.flatpak !== false ? ["flatpak", "gnome-software-plugin-flatpak"] : []),
			...(cfg.snap === true ? ["snapd"] : []),
			...(cfg.appimage === true ? ["libfuse2"] : []),
		],
		files: [
			{
				path: "etc/zenvx/packaging.conf",
				content: `prefer=${cfg.storePreference ?? "deb"}\nnix=${cfg.nix === true}\nbrew=${cfg.brew === true}\n`,
			},
		],
		hooks: [
			...(cfg.flatpak !== false && cfg.flathub !== false
				? ["flatpak remote-add --if-not-exists flathub https://dl.flathub.org/repo/flathub.flatpakrepo || true"]
				: []),
			...list(cfg.flatpakApps).map((a) => `flatpak install -y flathub ${a} || true`),
			...(cfg.nix === true ? ["sh <(curl -L https://nixos.org/nix/install) --daemon || true"] : []),
		],
		sizeMb: (cfg.flatpak !== false ? 220 : 0) + (cfg.snap === true ? 180 : 0) + (cfg.nix === true ? 400 : 0),
	}),
}

export const pkgReproducible: BlockDef = {
	id: "pkg.reproducible",
	category: "under-the-hood",
	label: "Reproducible builds",
	kidLabel: "Same Every Time",
	icon: "repeat",
	blurb: "Build the same bytes twice, and prove it.",
	inputs: ["system"],
	outputs: ["app"],
	singleton: true,
	proOnly: true,
	fields: [
		{ key: "enabled", label: "Deterministic build", type: "toggle", default: false },
		{ key: "sourceDateEpoch", label: "SOURCE_DATE_EPOCH", type: "text", placeholder: "1782518400", dependsOn: { key: "enabled", equals: true } },
		{ key: "manifest", label: "Write a package manifest", type: "toggle", default: true, help: "Every package name, version and hash that went in." },
		{ key: "sbom", label: "SPDX SBOM", type: "toggle", default: false, advanced: true },
		{ key: "signImage", label: "Sign the image", type: "toggle", default: false, advanced: true },
		{ key: "signKey", label: "GPG key id", type: "text", advanced: true, dependsOn: { key: "signImage", equals: true } },
	],
	emit: (cfg) => ({
		packages: [...(cfg.sbom === true ? ["syft"] : []), ...(cfg.signImage === true ? ["gnupg"] : [])],
		env: cfg.enabled === true && cfg.sourceDateEpoch
			? { SOURCE_DATE_EPOCH: String(cfg.sourceDateEpoch) }
			: undefined,
		files: [
			{
				path: "etc/zenvx/reproducible.conf",
				content:
					`enabled=${cfg.enabled === true}\n` +
					`source_date_epoch=${cfg.sourceDateEpoch ?? ""}\n` +
					`manifest=${cfg.manifest !== false}\nsbom=${cfg.sbom === true}\n` +
					`sign=${cfg.signImage === true}\nsign_key=${cfg.signKey ?? ""}\n`,
			},
		],
		hooks: [
			...(cfg.manifest !== false
				? ["dpkg-query -W -f='${Package}\\t${Version}\\n' > /etc/zenvx/manifest.tsv || true"]
				: []),
		],
		sizeMb: 6,
	}),
}

export const packagingBlocks: BlockDef[] = [pkgApt, pkgUniversal, pkgReproducible]
