import { type BlockDef, list, yes } from "./types"

export const hoodPackages: BlockDef = {
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
	emit: (cfg) => ({ packages: list(cfg.list), sizeMb: 50 }),
}

export const hoodRemove: BlockDef = {
	id: "hood.remove",
	category: "under-the-hood",
	label: "Remove packages",
	kidLabel: "Take Stuff Out",
	icon: "minus",
	blurb: "Strip things you do not want from the image.",
	inputs: ["system"],
	outputs: ["app"],
	proOnly: true,
	fields: [
		{ key: "list", label: "Packages", type: "text", placeholder: "gnome-games, libreoffice" },
	],
	emit: (cfg) => ({ removePackages: list(cfg.list), sizeMb: 0 }),
}

export const hoodFirewall: BlockDef = {
	id: "hood.firewall",
	category: "under-the-hood",
	label: "Firewall (nftables)",
	kidLabel: "Shield",
	icon: "shield",
	blurb: "Block incoming connections by default.",
	inputs: ["system"],
	outputs: ["app"],
	proOnly: true,
	fields: [
		{ key: "allowSsh", label: "Allow SSH in", type: "toggle", default: false },
		{ key: "allowPing", label: "Answer ping", type: "toggle", default: true },
	],
	emit: (cfg) => ({
		packages: ["nftables"],
		services: { enable: ["nftables"] },
		files: [
			{
				path: "etc/nftables.conf",
				mode: "755",
				content:
					"#!/usr/sbin/nft -f\n" +
					"flush ruleset\n" +
					"table inet filter {\n" +
					"\tchain input {\n" +
					"\t\ttype filter hook input priority 0; policy drop;\n" +
					"\t\tct state established,related accept\n" +
					"\t\tiif lo accept\n" +
					(yes(cfg.allowPing)
						? "\t\tip protocol icmp accept\n\t\tip6 nexthdr icmpv6 accept\n"
						: "") +
					(cfg.allowSsh === true ? "\t\ttcp dport 22 accept\n" : "") +
					"\t}\n" +
					"\tchain forward { type filter hook forward priority 0; policy drop; }\n" +
					"\tchain output { type filter hook output priority 0; policy accept; }\n" +
					"}\n",
			},
		],
		sizeMb: 10,
	}),
}

export const hoodSsh: BlockDef = {
	id: "hood.ssh",
	category: "under-the-hood",
	label: "SSH server (key-only)",
	kidLabel: "Remote Door",
	icon: "key",
	blurb: "Log in from another computer. Keys only, no passwords, no root.",
	inputs: ["system"],
	outputs: ["app"],
	proOnly: true,
	fields: [
		{
			key: "authorizedKey",
			label: "Your public key",
			type: "text",
			placeholder: "ssh-ed25519 AAAA...",
		},
		{ key: "username", label: "For which user", type: "text", default: "zen" },
	],
	emit: (cfg) => {
		const u = cfg.username ?? "zen"
		const key = String(cfg.authorizedKey ?? "").trim()
		return {
			packages: ["openssh-server"],
			// Without a key there is no safe way in, so the service stays off.
			services: key ? { enable: ["ssh"] } : { disable: ["ssh"] },
			files: [
				{
					path: "etc/ssh/sshd_config.d/10-zenvx.conf",
					content:
						"PasswordAuthentication no\n" +
						"KbdInteractiveAuthentication no\n" +
						"PermitRootLogin no\n" +
						"PubkeyAuthentication yes\n" +
						"X11Forwarding no\n",
				},
				...(key
					? [{ path: `home/${u}/.ssh/authorized_keys`, content: `${key}\n`, mode: "600" }]
					: []),
			],
			hooks: key
				? [`chown -R ${u}:${u} /home/${u}/.ssh || true`, `chmod 700 /home/${u}/.ssh || true`]
				: [],
			sizeMb: 15,
		}
	},
}

export const hoodUpdates: BlockDef = {
	id: "hood.updates",
	category: "under-the-hood",
	label: "Automatic security updates",
	kidLabel: "Self Repair",
	icon: "refresh",
	blurb: "Install security fixes on its own.",
	inputs: ["system"],
	outputs: ["app"],
	proOnly: true,
	fields: [{ key: "reboot", label: "Restart if needed (3am)", type: "toggle", default: false }],
	emit: (cfg) => ({
		packages: ["unattended-upgrades"],
		services: { enable: ["unattended-upgrades"] },
		files: [
			{
				path: "etc/apt/apt.conf.d/51zenvx-unattended",
				content:
					'APT::Periodic::Update-Package-Lists "1";\n' +
					'APT::Periodic::Unattended-Upgrade "1";\n' +
					(cfg.reboot === true
						? 'Unattended-Upgrade::Automatic-Reboot "true";\nUnattended-Upgrade::Automatic-Reboot-Time "03:00";\n'
						: 'Unattended-Upgrade::Automatic-Reboot "false";\n'),
			},
		],
		sizeMb: 8,
	}),
}

export const hoodSwap: BlockDef = {
	id: "hood.swap",
	category: "under-the-hood",
	label: "Swap file",
	kidLabel: "Extra Memory",
	icon: "memory",
	blurb: "Helps on machines with little RAM.",
	inputs: ["system"],
	outputs: ["app"],
	proOnly: true,
	fields: [
		{
			key: "size",
			label: "Size",
			type: "choice",
			default: "2G",
			options: [
				{ value: "512M", label: "512 MB" },
				{ value: "2G", label: "2 GB" },
				{ value: "4G", label: "4 GB" },
			],
		},
	],
	emit: (cfg) => ({
		hooks: [
			`fallocate -l ${cfg.size ?? "2G"} /swapfile || true`,
			"chmod 600 /swapfile || true",
			"mkswap /swapfile || true",
			"echo '/swapfile none swap sw 0 0' >> /etc/fstab",
		],
		sizeMb: 0,
	}),
}

export const hoodKernel: BlockDef = {
	id: "hood.kernel",
	category: "under-the-hood",
	label: "Kernel boot options",
	kidLabel: "Magic Words",
	icon: "sliders",
	blurb: "Extra arguments passed at boot.",
	inputs: ["system"],
	outputs: ["app"],
	proOnly: true,
	fields: [{ key: "args", label: "Arguments", type: "text", placeholder: "nomodeset quiet" }],
	emit: (cfg) => ({
		lbFlags: cfg.args ? { bootappend_live: `boot=live ${cfg.args}` } : {},
		sizeMb: 0,
	}),
}

export const hoodHook: BlockDef = {
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

export const hood: BlockDef[] = [
	hoodPackages,
	hoodRemove,
	hoodFirewall,
	hoodSsh,
	hoodUpdates,
	hoodSwap,
	hoodKernel,
	hoodHook,
]
