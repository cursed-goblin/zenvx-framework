import { type BlockDef, list, yes } from "./types"

export const networkStack: BlockDef = {
	id: "network.stack",
	category: "under-the-hood",
	label: "Network stack",
	kidLabel: "Getting Online",
	icon: "wifi",
	blurb: "Which manager runs the interfaces, and how.",
	inputs: ["system"],
	outputs: ["app"],
	singleton: true,
	proOnly: true,
	fields: [
		{
			key: "manager",
			label: "Manager",
			group: "Manager",
			type: "choice",
			default: "networkmanager",
			options: [
				{ value: "networkmanager", label: "NetworkManager", help: "Desktops and laptops." },
				{ value: "networkd", label: "systemd-networkd", help: "Servers and images." },
				{ value: "netplan", label: "netplan", help: "Declarative YAML on top." },
				{ value: "ifupdown", label: "ifupdown", help: "The old faithful." },
			],
		},
		{
			key: "addressing",
			label: "Addressing",
			group: "Addressing",
			type: "choice",
			default: "dhcp",
			options: [{ value: "dhcp", label: "DHCP" }, { value: "static", label: "Static" }],
		},
		{ key: "interface", label: "Interface", group: "Addressing", type: "text", default: "eth0", dependsOn: { key: "addressing", equals: "static" } },
		{ key: "address", label: "Address/CIDR", group: "Addressing", type: "text", placeholder: "192.168.1.50/24", dependsOn: { key: "addressing", equals: "static" } },
		{ key: "gateway", label: "Gateway", group: "Addressing", type: "text", placeholder: "192.168.1.1", dependsOn: { key: "addressing", equals: "static" } },
		{ key: "mtu", label: "MTU", group: "Addressing", type: "number", min: 576, max: 9216, default: 1500, advanced: true },
		{ key: "ipv6Privacy", label: "IPv6 privacy extensions", group: "Addressing", type: "toggle", default: true, advanced: true },
		{
			key: "wifiRegdom",
			label: "Wi-Fi regulatory domain",
			group: "Wireless",
			type: "choice",
			default: "IN",
			options: [
				{ value: "IN", label: "India" },
				{ value: "US", label: "United States" },
				{ value: "GB", label: "United Kingdom" },
				{ value: "DE", label: "Germany" },
				{ value: "JP", label: "Japan" },
				{ value: "00", label: "World" },
			],
		},
		{ key: "macRandomisation", label: "Randomise Wi-Fi MAC", group: "Wireless", type: "toggle", default: true },
		{ key: "wifiPowerSave", label: "Wi-Fi power saving", group: "Wireless", type: "toggle", default: true, advanced: true },
		{ key: "mdns", label: "Find devices on the network (mDNS)", group: "Extras", type: "toggle", default: true },
		{ key: "proxy", label: "HTTP proxy", group: "Extras", type: "text", placeholder: "http://proxy:3128", advanced: true },
		{ key: "bridge", label: "Create a bridge for VMs", group: "Extras", type: "toggle", default: false, advanced: true },
	],
	emit: (cfg) => {
		const mgr = String(cfg.manager ?? "networkmanager")
		const pkg: Record<string, string[]> = {
			networkmanager: ["network-manager"],
			networkd: ["systemd"],
			netplan: ["netplan.io", "systemd"],
			ifupdown: ["ifupdown", "isc-dhcp-client"],
		}
		const staticCfg = cfg.addressing === "static"
		return {
			packages: [
				...(pkg[mgr] ?? pkg.networkmanager),
				"wireless-regdb",
				...(yes(cfg.mdns) ? ["avahi-daemon", "libnss-mdns"] : []),
				...(cfg.bridge === true ? ["bridge-utils"] : []),
			],
			services: {
				enable: [
					...(mgr === "networkmanager" ? ["NetworkManager"] : []),
					...(mgr === "networkd" || mgr === "netplan" ? ["systemd-networkd"] : []),
					...(yes(cfg.mdns) ? ["avahi-daemon"] : []),
				],
			},
			files: [
				{ path: "etc/default/crda", content: `REGDOMAIN=${cfg.wifiRegdom ?? "IN"}\n` },
				...(mgr === "networkmanager"
					? [
						{
							path: "etc/NetworkManager/conf.d/zenvx.conf",
							content:
								`[device]\nwifi.scan-rand-mac-address=${yes(cfg.macRandomisation) ? "yes" : "no"}\n` +
								`wifi.powersave=${yes(cfg.wifiPowerSave) ? 3 : 2}\n` +
								`[connection]\nipv6.ip6-privacy=${yes(cfg.ipv6Privacy) ? 2 : 0}\n`,
						},
					]
					: []),
				...(staticCfg && (mgr === "networkd" || mgr === "netplan")
					? [
						{
							path: `etc/systemd/network/10-${cfg.interface ?? "eth0"}.network`,
							content:
								`[Match]\nName=${cfg.interface ?? "eth0"}\n\n[Network]\n` +
								`Address=${cfg.address ?? ""}\nGateway=${cfg.gateway ?? ""}\n\n[Link]\nMTUBytes=${cfg.mtu ?? 1500}\n`,
						},
					]
					: []),
				...(cfg.proxy
					? [
						{
							path: "etc/apt/apt.conf.d/95zenvx-proxy",
							content: `Acquire::http::Proxy "${cfg.proxy}";\nAcquire::https::Proxy "${cfg.proxy}";\n`,
						},
					]
					: []),
			],
			env: cfg.proxy ? { http_proxy: String(cfg.proxy), https_proxy: String(cfg.proxy) } : undefined,
			sizeMb: 25,
		}
	},
}

export const networkDns: BlockDef = {
	id: "network.dns",
	category: "under-the-hood",
	label: "DNS",
	kidLabel: "The Phone Book",
	icon: "globe",
	blurb: "Resolver, encryption, and what gets blocked.",
	inputs: ["system"],
	outputs: ["app"],
	singleton: true,
	proOnly: true,
	fields: [
		{
			key: "resolver",
			label: "Resolver",
			type: "choice",
			default: "systemd-resolved",
			options: [
				{ value: "systemd-resolved", label: "systemd-resolved" },
				{ value: "unbound", label: "unbound (local recursive)" },
				{ value: "dnsmasq", label: "dnsmasq" },
				{ value: "none", label: "Plain resolv.conf" },
			],
		},
		{ key: "servers", label: "Upstream servers", type: "tags", default: "1.1.1.1, 9.9.9.9", suggestions: ["1.1.1.1", "1.1.1.3", "9.9.9.9", "8.8.8.8", "208.67.222.123"] },
		{
			key: "dot",
			label: "DNS over TLS",
			type: "choice",
			default: "opportunistic",
			options: [
				{ value: "no", label: "Off" },
				{ value: "opportunistic", label: "Opportunistic" },
				{ value: "yes", label: "Required" },
			],
		},
		{ key: "dnssec", label: "DNSSEC validation", type: "toggle", default: true },
		{ key: "searchDomains", label: "Search domains", type: "tags", placeholder: "lan, home.arpa", advanced: true },
		{ key: "cacheSize", label: "Cache entries", type: "number", min: 0, max: 100000, step: 100, default: 4096, advanced: true },
		{
			key: "hosts",
			label: "Extra hosts entries",
			type: "text",
			multiline: true,
			rows: 4,
			syntax: "appended to etc/hosts",
			advanced: true,
		},
	],
	emit: (cfg) => {
		const servers = list(cfg.servers)
		const resolver = String(cfg.resolver ?? "systemd-resolved")
		return {
			packages: [
				...(resolver === "unbound" ? ["unbound"] : []),
				...(resolver === "dnsmasq" ? ["dnsmasq"] : []),
			],
			services: { enable: [resolver === "systemd-resolved" ? "systemd-resolved" : resolver] },
			files: [
				...(resolver === "systemd-resolved"
					? [
						{
							path: "etc/systemd/resolved.conf.d/zenvx.conf",
							content:
								`[Resolve]\nDNS=${servers.join(" ")}\n` +
								`DNSOverTLS=${cfg.dot ?? "opportunistic"}\n` +
								`DNSSEC=${yes(cfg.dnssec) ? "true" : "false"}\n` +
								`Cache=yes\nCacheFromLocalhost=no\n` +
								(list(cfg.searchDomains).length ? `Domains=${list(cfg.searchDomains).join(" ")}\n` : ""),
						},
					]
					: [{ path: "etc/resolv.conf", content: servers.map((s) => `nameserver ${s}`).join("\n") + "\n" }]),
				...(cfg.hosts ? [{ path: "etc/hosts.zenvx", content: `${cfg.hosts}\n` }] : []),
			],
			hooks: cfg.hosts ? ["cat /etc/hosts.zenvx >> /etc/hosts || true"] : [],
			sizeMb: 8,
		}
	},
}

export const networkVpn: BlockDef = {
	id: "network.vpn",
	category: "under-the-hood",
	label: "VPN (WireGuard)",
	kidLabel: "Secret Tunnel",
	icon: "tunnel",
	blurb: "A tunnel that comes up at boot, with an optional kill switch.",
	inputs: ["system"],
	outputs: ["app"],
	singleton: true,
	proOnly: true,
	fields: [
		{ key: "iface", label: "Interface name", type: "text", default: "wg0" },
		{ key: "address", label: "Tunnel address", type: "text", placeholder: "10.0.0.2/32" },
		{ key: "peer", label: "Peer public key", type: "text", placeholder: "base64 key" },
		{ key: "endpoint", label: "Endpoint", type: "text", placeholder: "vpn.example.com:51820" },
		{ key: "allowedIps", label: "Allowed IPs", type: "tags", default: "0.0.0.0/0, ::/0" },
		{ key: "keepalive", label: "Persistent keepalive", type: "number", min: 0, max: 300, default: 25, unit: "s", advanced: true },
		{ key: "autostart", label: "Start at boot", type: "toggle", default: false },
		{ key: "killSwitch", label: "Kill switch", type: "toggle", default: false, help: "Drop all traffic if the tunnel goes down." },
	],
	emit: (cfg) => ({
		packages: ["wireguard", "wireguard-tools"],
		services: { enable: yes(cfg.autostart) ? [`wg-quick@${cfg.iface ?? "wg0"}`] : [] },
		files: [
			{
				path: `etc/wireguard/${cfg.iface ?? "wg0"}.conf`,
				mode: "600",
				content:
					`[Interface]\nAddress = ${cfg.address ?? "10.0.0.2/32"}\n# PrivateKey is generated on first boot, never baked into the image\n` +
					(cfg.killSwitch === true
						? "PostUp = nft add table inet zenvxvpn\nPostDown = nft delete table inet zenvxvpn\n"
						: "") +
					`\n[Peer]\nPublicKey = ${cfg.peer ?? ""}\nEndpoint = ${cfg.endpoint ?? ""}\n` +
					`AllowedIPs = ${list(cfg.allowedIps).join(", ") || "0.0.0.0/0, ::/0"}\n` +
					`PersistentKeepalive = ${cfg.keepalive ?? 25}\n`,
			},
		],
		hooks: [
			`test -f /etc/wireguard/${cfg.iface ?? "wg0"}.key || (umask 077 && wg genkey > /etc/wireguard/${cfg.iface ?? "wg0"}.key) || true`,
		],
		notes: ["private keys are generated on the machine, not stored in the recipe"],
		sizeMb: 6,
	}),
}

export const networkTime: BlockDef = {
	id: "network.time",
	category: "under-the-hood",
	label: "Time sync",
	kidLabel: "The Clock",
	icon: "clock",
	blurb: "NTP client, pools and hardware clock.",
	inputs: ["system"],
	outputs: ["app"],
	singleton: true,
	proOnly: true,
	fields: [
		{
			key: "client",
			label: "Client",
			type: "choice",
			default: "timesyncd",
			options: [
				{ value: "timesyncd", label: "systemd-timesyncd" },
				{ value: "chrony", label: "chrony" },
				{ value: "none", label: "None" },
			],
		},
		{ key: "pools", label: "NTP pools", type: "tags", default: "in.pool.ntp.org, pool.ntp.org", suggestions: ["in.pool.ntp.org", "pool.ntp.org", "time.cloudflare.com", "time.google.com"] },
		{ key: "nts", label: "Network Time Security", type: "toggle", default: false, advanced: true, dependsOn: { key: "client", equals: "chrony" } },
		{ key: "rtcUtc", label: "Hardware clock in UTC", type: "toggle", default: true, advanced: true },
	],
	emit: (cfg) => {
		const client = String(cfg.client ?? "timesyncd")
		const pools = list(cfg.pools)
		return {
			packages: client === "chrony" ? ["chrony"] : [],
			services: { enable: client === "none" ? [] : [client === "chrony" ? "chrony" : "systemd-timesyncd"] },
			files:
				client === "chrony"
					? [
						{
							path: "etc/chrony/conf.d/zenvx.conf",
							content: pools.map((p) => `pool ${p} iburst${cfg.nts === true ? " nts" : ""}`).join("\n") + "\nmakestep 1.0 3\nrtcsync\n",
						},
					]
					: [
						{
							path: "etc/systemd/timesyncd.conf.d/zenvx.conf",
							content: `[Time]\nNTP=${pools.join(" ")}\n`,
						},
					],
			hooks: [`timedatectl set-local-rtc ${yes(cfg.rtcUtc) ? 0 : 1} || true`],
			sizeMb: 4,
		}
	},
}

export const networkShare: BlockDef = {
	id: "network.share",
	category: "under-the-hood",
	label: "Sharing & remote access",
	kidLabel: "Let Others In",
	icon: "share",
	blurb: "Files, printers and screens across the network.",
	inputs: ["system"],
	outputs: ["app"],
	singleton: true,
	proOnly: true,
	fields: [
		{ key: "samba", label: "Windows file sharing (SMB)", type: "toggle", default: false },
		{ key: "sambaWorkgroup", label: "Workgroup", type: "text", default: "WORKGROUP", dependsOn: { key: "samba", equals: true } },
		{ key: "nfs", label: "NFS server", type: "toggle", default: false, advanced: true },
		{ key: "printers", label: "Printing (CUPS)", type: "toggle", default: true },
		{ key: "sharePrinters", label: "Share printers on the network", type: "toggle", default: false, dependsOn: { key: "printers", equals: true } },
		{ key: "scanner", label: "Scanner support", type: "toggle", default: false, advanced: true },
		{
			key: "remoteDesktop",
			label: "Remote desktop",
			type: "choice",
			default: "none",
			options: [
				{ value: "none", label: "None" },
				{ value: "rdp", label: "RDP (xrdp)" },
				{ value: "vnc", label: "VNC" },
			],
		},
	],
	emit: (cfg) => ({
		packages: [
			...(cfg.samba === true ? ["samba"] : []),
			...(cfg.nfs === true ? ["nfs-kernel-server"] : []),
			...(cfg.printers !== false ? ["cups", "printer-driver-all"] : []),
			...(cfg.scanner === true ? ["sane-utils", "simple-scan"] : []),
			...(cfg.remoteDesktop === "rdp" ? ["xrdp"] : []),
			...(cfg.remoteDesktop === "vnc" ? ["tigervnc-standalone-server"] : []),
		],
		services: {
			enable: [
				...(cfg.samba === true ? ["smbd"] : []),
				...(cfg.nfs === true ? ["nfs-server"] : []),
				...(cfg.printers !== false ? ["cups"] : []),
				...(cfg.remoteDesktop === "rdp" ? ["xrdp"] : []),
			],
		},
		files: [
			...(cfg.samba === true
				? [
					{
						path: "etc/samba/smb.conf.d/zenvx.conf",
						content: `[global]\nworkgroup = ${cfg.sambaWorkgroup ?? "WORKGROUP"}\nserver min protocol = SMB3\nsmb encrypt = required\n`,
					},
				]
				: []),
			{
				path: "etc/zenvx/sharing.conf",
				content: `samba=${cfg.samba === true}\nnfs=${cfg.nfs === true}\nprinters=${cfg.printers !== false}\nshare_printers=${cfg.sharePrinters === true}\nremote_desktop=${cfg.remoteDesktop ?? "none"}\n`,
			},
		],
		sizeMb:
			(cfg.samba === true ? 90 : 0) +
			(cfg.printers !== false ? 340 : 0) +
			(cfg.remoteDesktop !== "none" ? 60 : 0),
	}),
}

export const networkBlocks: BlockDef[] = [
	networkStack,
	networkDns,
	networkVpn,
	networkTime,
	networkShare,
]
