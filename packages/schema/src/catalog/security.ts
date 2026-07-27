import { type BlockDef, list, yes } from "./types"

export const securityMac: BlockDef = {
	id: "security.mac",
	category: "under-the-hood",
	label: "Mandatory access control",
	kidLabel: "Rule Keeper",
	icon: "shield",
	blurb: "AppArmor or SELinux, and how strict they are.",
	inputs: ["system"],
	outputs: ["app"],
	singleton: true,
	proOnly: true,
	fields: [
		{
			key: "system",
			label: "System",
			type: "choice",
			default: "apparmor",
			options: [
				{ value: "apparmor", label: "AppArmor", help: "Path based. Debian default." },
				{ value: "selinux", label: "SELinux", help: "Label based. Stricter, fiddlier." },
				{ value: "none", label: "None", help: "Not recommended." },
			],
		},
		{
			key: "mode",
			label: "Mode",
			type: "choice",
			default: "enforce",
			options: [
				{ value: "enforce", label: "Enforcing" },
				{ value: "complain", label: "Complain / permissive" },
			],
		},
		{ key: "extraProfiles", label: "Extra profile packages", type: "tags", advanced: true, suggestions: ["apparmor-profiles", "apparmor-profiles-extra", "apparmor-utils"] },
		{ key: "confineUserApps", label: "Confine browsers and media apps", type: "toggle", default: true },
		{
			key: "customProfile",
			label: "Custom profile",
			type: "text",
			multiline: true,
			rows: 6,
			syntax: "written to etc/apparmor.d/zenvx-custom",
			advanced: true,
		},
	],
	emit: (cfg) => {
		const sys = String(cfg.system ?? "apparmor")
		if (sys === "none") return { notes: ["MAC disabled"], sizeMb: 0 }
		const enforcing = cfg.mode !== "complain"
		return {
			packages:
				sys === "apparmor"
					? ["apparmor", "apparmor-utils", ...list(cfg.extraProfiles), ...(yes(cfg.confineUserApps) ? ["apparmor-profiles-extra"] : [])]
					: ["selinux-basics", "selinux-policy-default", "policycoreutils"],
			services: { enable: [sys === "apparmor" ? "apparmor" : "selinux-autorelabel"] },
			lbFlags: {
				bootappend_live:
					sys === "apparmor"
						? `boot=live apparmor=1 security=apparmor${enforcing ? "" : " apparmor=complain"}`
						: `boot=live security=selinux selinux=1 enforcing=${enforcing ? 1 : 0}`,
			},
			files: [
				{ path: "etc/zenvx/mac.conf", content: `system=${sys}\nmode=${enforcing ? "enforce" : "complain"}\n` },
				...(cfg.customProfile
					? [{ path: "etc/apparmor.d/zenvx-custom", content: `${cfg.customProfile}\n` }]
					: []),
			],
			sizeMb: sys === "selinux" ? 90 : 35,
		}
	},
}

export const securityBoot: BlockDef = {
	id: "security.boot",
	category: "under-the-hood",
	label: "Secure Boot & measured boot",
	kidLabel: "Sealed Start",
	icon: "key",
	blurb: "Signed boot chain, TPM measurements, verified root.",
	inputs: ["system"],
	outputs: ["app"],
	singleton: true,
	proOnly: true,
	fields: [
		{
			key: "mode",
			label: "Secure Boot",
			type: "choice",
			default: "shim",
			options: [
				{ value: "off", label: "Off" },
				{ value: "shim", label: "Shim (Microsoft chain)" },
				{ value: "ownkeys", label: "Own keys (enrol PK/KEK/db)" },
			],
		},
		{ key: "mokEnroll", label: "Prompt to enrol MOK on first boot", type: "toggle", default: true, dependsOn: { key: "mode", equals: "shim" } },
		{ key: "signingKey", label: "Signing certificate", type: "text", placeholder: "/keys/db.crt", dependsOn: { key: "mode", equals: "ownkeys" } },
		{ key: "signModules", label: "Sign out-of-tree modules", type: "toggle", default: true, advanced: true },
		{ key: "measuredBoot", label: "Measured boot (TPM2)", type: "toggle", default: false },
		{ key: "pcrs", label: "PCRs to bind", type: "tags", default: "0, 2, 4, 7", advanced: true, dependsOn: { key: "measuredBoot", equals: true } },
		{ key: "verity", label: "dm-verity read-only root", type: "toggle", default: false, help: "Immutable rootfs. Updates land as a new image." },
		{ key: "unifiedKernelImage", label: "Unified kernel image", type: "toggle", default: false, advanced: true, help: "Kernel, initrd and cmdline in one signed EFI binary." },
	],
	emit: (cfg) => {
		const mode = String(cfg.mode ?? "shim")
		return {
			packages: [
				...(mode !== "off" ? ["shim-signed", "grub-efi-amd64-signed", "sbsigntool"] : []),
				...(mode === "ownkeys" ? ["efitools", "mokutil"] : []),
				...(cfg.measuredBoot === true ? ["tpm2-tools"] : []),
				...(cfg.verity === true ? ["cryptsetup-bin"] : []),
				...(cfg.unifiedKernelImage === true ? ["systemd-boot-efi", "binutils"] : []),
			],
			files: [
				{
					path: "etc/zenvx/secureboot.conf",
					content:
						`mode=${mode}\n` +
						`mok_enroll=${cfg.mokEnroll !== false}\n` +
						`signing_key=${cfg.signingKey ?? ""}\n` +
						`sign_modules=${cfg.signModules !== false}\n` +
						`measured_boot=${cfg.measuredBoot === true}\n` +
						`pcrs=${list(cfg.pcrs).join(",") || "0,2,4,7"}\n` +
						`verity=${cfg.verity === true}\n` +
						`uki=${cfg.unifiedKernelImage === true}\n`,
				},
			],
			notes: [
				mode === "ownkeys"
					? "you must enrol your PK/KEK/db in firmware setup before this image will boot"
					: "shim chain boots on stock firmware without enrolling anything",
			],
			sizeMb: 40,
		}
	},
}

export const securityHardening: BlockDef = {
	id: "security.hardening",
	category: "under-the-hood",
	label: "Kernel hardening",
	kidLabel: "Extra Armour",
	icon: "shield-check",
	blurb: "The sysctl list every hardening guide argues about.",
	inputs: ["system"],
	outputs: ["app"],
	singleton: true,
	proOnly: true,
	fields: [
		{ key: "aslr", label: "Full ASLR", group: "Memory", type: "toggle", default: true },
		{ key: "restrictDmesg", label: "Restrict dmesg", group: "Memory", type: "toggle", default: true },
		{ key: "kptrRestrict", label: "Hide kernel pointers", group: "Memory", type: "toggle", default: true },
		{
			key: "ptraceScope",
			label: "ptrace scope",
			group: "Memory",
			type: "choice",
			default: "1",
			options: [
				{ value: "0", label: "0 classic" },
				{ value: "1", label: "1 restricted" },
				{ value: "2", label: "2 admin only" },
				{ value: "3", label: "3 nobody" },
			],
		},
		{ key: "coreDumps", label: "Allow core dumps", group: "Memory", type: "toggle", default: false },
		{ key: "unprivilegedUserns", label: "Unprivileged user namespaces", group: "Memory", type: "toggle", default: true, advanced: true, help: "Needed by Flatpak and rootless containers." },
		{ key: "synCookies", label: "SYN cookies", group: "Network", type: "toggle", default: true },
		{ key: "rpFilter", label: "Reverse path filter", group: "Network", type: "toggle", default: true },
		{ key: "ignoreIcmpBroadcast", label: "Ignore ICMP broadcasts", group: "Network", type: "toggle", default: true },
		{ key: "logMartians", label: "Log martian packets", group: "Network", type: "toggle", default: true, advanced: true },
		{ key: "disableIpv6", label: "Disable IPv6", group: "Network", type: "toggle", default: false, advanced: true },
		{ key: "umask", label: "Default umask", group: "Userland", type: "choice", default: "022", options: [{ value: "022", label: "022" }, { value: "027", label: "027" }, { value: "077", label: "077" }] },
		{ key: "noNewPrivs", label: "Harden systemd units", group: "Userland", type: "toggle", default: true, advanced: true },
		{ key: "hardenCompiler", label: "Hardened build flags", group: "Userland", type: "toggle", default: false, advanced: true },
	],
	emit: (cfg) => {
		const s: Record<string, string> = {
			"kernel.randomize_va_space": yes(cfg.aslr) ? "2" : "0",
			"kernel.dmesg_restrict": yes(cfg.restrictDmesg) ? "1" : "0",
			"kernel.kptr_restrict": yes(cfg.kptrRestrict) ? "2" : "0",
			"kernel.yama.ptrace_scope": String(cfg.ptraceScope ?? "1"),
			"fs.suid_dumpable": cfg.coreDumps === true ? "1" : "0",
			"kernel.unprivileged_userns_clone": cfg.unprivilegedUserns === false ? "0" : "1",
			"net.ipv4.tcp_syncookies": yes(cfg.synCookies) ? "1" : "0",
			"net.ipv4.conf.all.rp_filter": yes(cfg.rpFilter) ? "1" : "0",
			"net.ipv4.icmp_echo_ignore_broadcasts": yes(cfg.ignoreIcmpBroadcast) ? "1" : "0",
			"net.ipv4.conf.all.log_martians": yes(cfg.logMartians) ? "1" : "0",
			"net.ipv4.conf.all.accept_redirects": "0",
			"net.ipv6.conf.all.accept_redirects": "0",
			...(cfg.disableIpv6 === true ? { "net.ipv6.conf.all.disable_ipv6": "1" } : {}),
		}
		return {
			sysctl: s,
			files: [
				{
					path: "etc/sysctl.d/95-zenvx-hardening.conf",
					content: Object.entries(s).map(([k, v]) => `${k} = ${v}`).join("\n") + "\n",
				},
				{ path: "etc/profile.d/zenvx-umask.sh", content: `umask ${cfg.umask ?? "022"}\n`, mode: "755" },
				...(cfg.coreDumps === false
					? [{ path: "etc/security/limits.d/zenvx-core.conf", content: "* hard core 0\n" }]
					: []),
				...(cfg.noNewPrivs !== false
					? [
						{
							path: "etc/systemd/system.conf.d/zenvx-harden.conf",
							content: "[Manager]\nDefaultLimitCORE=0\nDumpCore=no\n",
						},
					]
					: []),
			],
			sizeMb: 2,
		}
	},
}

export const securityAccess: BlockDef = {
	id: "security.access",
	category: "under-the-hood",
	label: "Accounts & sudo",
	kidLabel: "Who Can Do What",
	icon: "user-lock",
	blurb: "Password policy, sudo rules, lockouts, 2FA.",
	inputs: ["system"],
	outputs: ["app"],
	singleton: true,
	proOnly: true,
	fields: [
		{ key: "lockRoot", label: "Lock the root account", group: "sudo", type: "toggle", default: true },
		{ key: "sudoNoPassword", label: "sudo without a password", group: "sudo", type: "toggle", default: false, help: "Convenient. Also how laptops get owned." },
		{ key: "sudoTimeout", label: "sudo timestamp timeout", group: "sudo", type: "number", min: 0, max: 240, default: 15, unit: "min" },
		{ key: "sudoLog", label: "Log every sudo command", group: "sudo", type: "toggle", default: true, advanced: true },
		{ key: "sudoInsults", label: "sudo insults", group: "sudo", type: "toggle", default: false, advanced: true, help: "Yes, really." },
		{ key: "minLength", label: "Minimum password length", group: "Passwords", type: "slider", min: 6, max: 32, default: 8 },
		{ key: "requireClasses", label: "Require mixed character classes", group: "Passwords", type: "toggle", default: false },
		{ key: "maxAgeDays", label: "Force change after", group: "Passwords", type: "number", min: 0, max: 3650, default: 0, unit: "days", help: "0 means never." },
		{ key: "failedAttempts", label: "Lock after failed logins", group: "Passwords", type: "number", min: 0, max: 20, default: 5 },
		{ key: "lockoutMinutes", label: "Lockout duration", group: "Passwords", type: "number", min: 1, max: 1440, default: 15, unit: "min", advanced: true },
		{ key: "u2f", label: "Hardware key 2FA (pam_u2f)", group: "Extras", type: "toggle", default: false },
		{ key: "fail2ban", label: "fail2ban", group: "Extras", type: "toggle", default: false },
		{ key: "usbguard", label: "USBGuard", group: "Extras", type: "toggle", default: false, advanced: true, help: "Blocks unknown USB devices until allowed." },
		{ key: "firejail", label: "Firejail sandboxes", group: "Extras", type: "toggle", default: false, advanced: true },
	],
	emit: (cfg) => {
		const sudoLines = [
			`Defaults timestamp_timeout=${cfg.sudoTimeout ?? 15}`,
			...(cfg.sudoLog !== false ? ["Defaults logfile=/var/log/sudo.log"] : []),
			...(cfg.sudoInsults === true ? ["Defaults insults"] : []),
			...(cfg.sudoNoPassword === true ? ["%sudo ALL=(ALL) NOPASSWD: ALL"] : []),
		]
		return {
			packages: [
				"libpam-pwquality",
				...(cfg.u2f === true ? ["libpam-u2f"] : []),
				...(cfg.fail2ban === true ? ["fail2ban"] : []),
				...(cfg.usbguard === true ? ["usbguard"] : []),
				...(cfg.firejail === true ? ["firejail", "firejail-profiles"] : []),
			],
			services: {
				enable: [
					...(cfg.fail2ban === true ? ["fail2ban"] : []),
					...(cfg.usbguard === true ? ["usbguard"] : []),
				],
			},
			files: [
				{ path: "etc/sudoers.d/zenvx", content: sudoLines.join("\n") + "\n", mode: "440" },
				{
					path: "etc/security/pwquality.conf",
					content:
						`minlen = ${cfg.minLength ?? 8}\n` +
						(cfg.requireClasses === true ? "minclass = 3\ndcredit = -1\nucredit = -1\nocredit = -1\n" : ""),
				},
				{
					path: "etc/security/faillock.conf",
					content: `deny = ${cfg.failedAttempts ?? 5}\nunlock_time = ${Number(cfg.lockoutMinutes ?? 15) * 60}\n`,
				},
				...(Number(cfg.maxAgeDays ?? 0) > 0
					? [{ path: "etc/zenvx/passwords.conf", content: `max_age_days=${cfg.maxAgeDays}\n` }]
					: []),
			],
			hooks: [...(yes(cfg.lockRoot) ? ["passwd -l root || true"] : [])],
			sizeMb: 12,
		}
	},
}

export const securityAudit: BlockDef = {
	id: "security.audit",
	category: "under-the-hood",
	label: "Audit & compliance",
	kidLabel: "The Logbook",
	icon: "clipboard",
	blurb: "auditd, file integrity, remote logging, benchmark profiles.",
	inputs: ["system"],
	outputs: ["app"],
	singleton: true,
	proOnly: true,
	fields: [
		{ key: "auditd", label: "Run auditd", type: "toggle", default: false },
		{
			key: "rules",
			label: "Audit rules",
			type: "text",
			multiline: true,
			rows: 6,
			syntax: "auditctl syntax, written to etc/audit/rules.d/zenvx.rules",
			default: "-w /etc/passwd -p wa -k identity\n-w /etc/sudoers.d -p wa -k sudoers",
			dependsOn: { key: "auditd", equals: true },
		},
		{ key: "retentionDays", label: "Keep logs for", type: "number", min: 1, max: 3650, default: 90, unit: "days" },
		{ key: "maxLogSize", label: "Journal size cap", type: "number", min: 16, max: 65536, step: 16, default: 512, unit: "MB" },
		{ key: "aide", label: "AIDE integrity baseline", type: "toggle", default: false, advanced: true },
		{ key: "remoteSyslog", label: "Ship logs to", type: "text", placeholder: "logs.example.com:514", advanced: true },
		{
			key: "profile",
			label: "Benchmark profile",
			type: "choice",
			default: "none",
			options: [
				{ value: "none", label: "None" },
				{ value: "cis-level1", label: "CIS Level 1" },
				{ value: "cis-level2", label: "CIS Level 2" },
				{ value: "stig", label: "DISA STIG" },
			],
		},
	],
	emit: (cfg) => ({
		packages: [
			...(cfg.auditd === true ? ["auditd", "audispd-plugins"] : []),
			...(cfg.aide === true ? ["aide", "aide-common"] : []),
			...(cfg.remoteSyslog ? ["rsyslog"] : []),
			...(cfg.profile !== "none" && cfg.profile ? ["openscap-scanner", "ssg-debian"] : []),
		],
		services: { enable: [...(cfg.auditd === true ? ["auditd"] : []), ...(cfg.remoteSyslog ? ["rsyslog"] : [])] },
		files: [
			...(cfg.auditd === true
				? [{ path: "etc/audit/rules.d/zenvx.rules", content: `${cfg.rules ?? ""}\n` }]
				: []),
			{
				path: "etc/systemd/journald.conf.d/zenvx.conf",
				content: `[Journal]\nSystemMaxUse=${cfg.maxLogSize ?? 512}M\nMaxRetentionSec=${Number(cfg.retentionDays ?? 90) * 86400}\nStorage=persistent\n`,
			},
			...(cfg.remoteSyslog
				? [{ path: "etc/rsyslog.d/90-zenvx-remote.conf", content: `*.* @@${cfg.remoteSyslog}\n` }]
				: []),
			{ path: "etc/zenvx/compliance.conf", content: `profile=${cfg.profile ?? "none"}\naide=${cfg.aide === true}\n` },
		],
		hooks: [...(cfg.aide === true ? ["aideinit -y -f || true"] : [])],
		sizeMb: 60,
	}),
}

export const securityBlocks: BlockDef[] = [
	securityMac,
	securityBoot,
	securityHardening,
	securityAccess,
	securityAudit,
]
