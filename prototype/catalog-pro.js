/*
 * Expert and finish tiers for the prototype.
 *
 * Field notation is documented at the top of catalog.js. Short version:
 *   "key|type|default|extra", "!" = advanced, "?a=b" = dependsOn, "~G" = group.
 */

import { CATEGORY_LABELS, CATEGORY_ORDER, PROTOTYPE_BLOCKS, parseField } from "./catalog.js"

const RAW = [
	// ---- kernel -----------------------------------------------------------
	["kernel.build", "under-the-hood", "Kernel build", "The Brain, Properly", "Which kernel, and what goes into the initramfs.", [
		"flavour~Kernel|choice|stock|stock,lts,mainline,rt,hardened,liquorix",
		"version!~Kernel|text||6.12.9",
		"microcode~Kernel|toggle|1",
		"headers~Kernel|toggle|1",
		"dkms!~Kernel|toggle|0",
		"initramfsModules~Initramfs|choice|dep|dep,most,list",
		"initramfsCompression~Initramfs|choice|zstd|zstd,lz4,xz,gzip",
		"modules!~Initramfs|tags||kvm,vfio-pci,i915,amdgpu",
		"blacklist!~Initramfs|tags||nouveau,pcspkr,iTCO_wdt",
		"configFragment!~Initramfs|area||CONFIG_ options, one per line",
		"buildFromSource!~Initramfs|toggle|0",
	]],
	["kernel.tuning", "under-the-hood", "Kernel tuning", "Speed Knobs", "Scheduling, memory and latency behaviour.", [
		"governor~CPU|choice|schedutil|performance,powersave,ondemand,schedutil,conservative",
		"timerHz!~CPU|choice|250|100,250,300,1000",
		"preempt~CPU|choice|voluntary|none,voluntary,full,rt",
		"isolcpus!~CPU|text||2-7",
		"nohzFull!~CPU|text||2-7",
		"mitigations!~CPU|toggle|1",
		"ioScheduler~IO|choice|none|none,mq-deadline,bfq,kyber",
		"swappiness~Memory|slider|60|0,200",
		"dirtyRatio!~Memory|slider|20|1,90,%",
		"dirtyBackgroundRatio!~Memory|slider|10|1,80,%",
		"vfsCachePressure!~Memory|slider|100|10,500",
		"thp~Memory|choice|madvise|always,madvise,never",
		"hugepages!~Memory|number|0|0,8192",
		"ksm!~Memory|toggle|0",
		"lockdown!~Safety|choice|none|none,integrity,confidentiality",
		"panicOnOops!~Safety|toggle|0",
		"watchdog!~Safety|toggle|1",
		"sysctl!~Safety|area||one sysctl per line",
	]],

	// ---- storage ----------------------------------------------------------
	["storage.root", "under-the-hood", "Root filesystem", "Where Things Live", "Filesystem, mount options and snapshots.", [
		"fs~Filesystem|choice|ext4|ext4,btrfs,xfs,zfs,f2fs",
		"label~Filesystem|text|zenvx-root",
		"mountOptions!~Filesystem|text|noatime",
		"discard~Filesystem|toggle|1",
		"compression?fs=btrfs~Filesystem|choice|zstd|none,zstd,lzo,zlib",
		"compressionLevel!?fs=btrfs~Filesystem|slider|3|1,15",
		"subvolumes?fs=btrfs~Filesystem|tags|@, @home|@,@home,@var,@snapshots",
		"quotas!~Filesystem|toggle|0",
		"snapshots~Snapshots|choice|none|none,snapper,timeshift",
		"keepDaily?snapshots=snapper~Snapshots|number|7|0,90",
		"snapshotOnUpgrade?snapshots=snapper~Snapshots|toggle|1",
	]],
	["storage.crypt", "under-the-hood", "Disk encryption", "The Lock", "LUKS2, and how hard it is to crack.", [
		"enabled|toggle|0",
		"cipher?enabled=1|choice|aes-xts-plain64|aes-xts-plain64,serpent-xts-plain64,aegis128",
		"keySize?enabled=1|choice|512|256,512",
		"hash!?enabled=1|choice|sha256|sha256,sha512",
		"pbkdfMemory!?enabled=1|number|1048576|32768,4194304,KiB",
		"pbkdfTime!?enabled=1|number|2000|500,10000,ms",
		"tpm2?enabled=1|toggle|0",
		"detachedHeader!?enabled=1|toggle|0",
		"keyfile!?enabled=1|text||/etc/keys/root.key",
		"discardPassthrough!?enabled=1|toggle|0",
	]],
	["storage.layout", "under-the-hood", "Partition layout", "Sharing The Disk", "How the disk is carved up.", [
		"table|choice|gpt|gpt,mbr",
		"espSizeMb|number|512|100,4096,MB",
		"separateHome|toggle|0",
		"homeSizeGb?separateHome=1|number|50|5,4000,GB",
		"separateVar!|toggle|0",
		"alignMb!|number|1|1,8,MB",
	]],
	["storage.lvm", "under-the-hood", "LVM", "Stretchy Disks", "Volume groups and thin pools.", [
		"enabled|toggle|0",
		"vgName?enabled=1|text|zenvx",
		"thinPool!?enabled=1|toggle|0",
		"cacheDevice!?enabled=1|text||/dev/nvme0n1p3",
	]],
	["storage.raid", "under-the-hood", "RAID", "Spare Copies", "mdadm arrays.", [
		"enabled|toggle|0",
		"level?enabled=1|choice|1|0,1,5,6,10",
		"devices?enabled=1|tags||/dev/sda,/dev/sdb",
		"spare!?enabled=1|number|0|0,4",
		"monitorEmail!?enabled=1|text||root@localhost",
	]],
	["storage.swap", "under-the-hood", "Swap and zram", "Spare Memory", "Swap file, partition or compressed RAM.", [
		"mode|choice|file|none,file,partition,zram",
		"sizeMb?mode=file|number|2048|0,131072,MB",
		"zramPercent?mode=zram|slider|50|10,200,%",
		"zramAlgorithm!?mode=zram|choice|zstd|lzo,lz4,zstd",
		"hibernate!|toggle|0",
	]],

	// ---- security ---------------------------------------------------------
	["security.mac", "under-the-hood", "Mandatory access control", "The Rulebook", "AppArmor or SELinux.", [
		"system|choice|apparmor|apparmor,selinux,none",
		"mode?system=apparmor|choice|enforce|enforce,complain",
		"selinuxPolicy!?system=selinux|choice|targeted|targeted,mls",
		"customProfile!|area||AppArmor profile text",
	]],
	["security.boot", "under-the-hood", "Secure Boot", "Signed Start", "Signed kernels and modules.", [
		"secureBoot|toggle|1",
		"shim?secureBoot=1|toggle|1",
		"mokEnroll!?secureBoot=1|toggle|0",
		"signModules!?secureBoot=1|toggle|1",
		"measuredBoot!|toggle|0",
	]],
	["security.hardening", "under-the-hood", "Hardening", "Tighten Up", "Kernel and userland defaults.", [
		"sysctlHardening|toggle|1",
		"kptrRestrict!|choice|1|0,1,2",
		"dmesgRestrict!|toggle|1",
		"userNamespaces!|toggle|1",
		"ptraceScope!|choice|1|0,1,2,3",
		"umask|choice|022|022,027,077",
		"coreDumps|toggle|0",
		"systemdHardening!|toggle|1",
	]],
	["security.access", "under-the-hood", "Accounts and sudo", "Who Can Do What", "Passwords, sudo and lockouts.", [
		"rootLocked|toggle|1",
		"sudoNoPassword|toggle|0",
		"sudoTimeout!|number|15|0,240,min",
		"minPasswordLength|number|12|6,64",
		"passwordQuality|toggle|1",
		"faillockAttempts!|number|5|0,20",
		"faillockUnlock!|number|900|60,86400,s",
	]],
	["security.audit", "under-the-hood", "Audit and logs", "The Diary", "auditd, journald and remote logging.", [
		"auditd|toggle|0",
		"rules!?auditd=1|area||audit rules, one per line",
		"journalStorage|choice|persistent|volatile,persistent,none",
		"journalMaxMb|number|500|50,10000,MB",
		"remoteSyslog!|text||logs.example.com:514",
		"compliance!|choice|none|none,cis,stig",
	]],

	// ---- network ----------------------------------------------------------
	["network.stack", "under-the-hood", "Network stack", "The Wires", "Who manages the interfaces.", [
		"manager|choice|networkmanager|networkmanager,systemd-networkd,ifupdown,none",
		"wifi|toggle|1",
		"regDomain!?wifi=1|text|00",
		"addressing|choice|dhcp|dhcp,static",
		"address?addressing=static|text||192.168.1.50/24",
		"gateway?addressing=static|text||192.168.1.1",
		"macRandomization!|toggle|1",
		"ipv6|choice|auto|auto,disabled,static",
		"proxy!|text||http://proxy.lan:3128",
	]],
	["network.dns", "under-the-hood", "DNS", "The Phone Book", "Resolvers, DNSSEC and DoT.", [
		"resolver|choice|systemd-resolved|systemd-resolved,dnsmasq,unbound,none",
		"servers|tags|9.9.9.9, 1.1.1.1|9.9.9.9,1.1.1.1,8.8.8.8",
		"dnssec|toggle|1",
		"dnsOverTls|choice|opportunistic|no,opportunistic,yes",
		"cacheSize!|number|4096|0,65536",
		"hosts!|area||extra hosts entries",
	]],
	["network.vpn", "under-the-hood", "VPN", "Secret Tunnel", "WireGuard or OpenVPN.", [
		"kind|choice|none|none,wireguard,openvpn",
		"iface?kind=wireguard|text|wg0",
		"endpoint?kind=wireguard|text||vpn.example.com:51820",
		"allowedIps!?kind=wireguard|text|0.0.0.0/0, ::/0",
		"killSwitch?kind=wireguard|toggle|1",
		"autoconnect|toggle|0",
	]],
	["network.time", "under-the-hood", "Time", "The Clock", "NTP and the hardware clock.", [
		"client|choice|systemd-timesyncd|systemd-timesyncd,chrony,none",
		"servers|tags|pool.ntp.org|pool.ntp.org,time.cloudflare.com",
		"rtcLocal!|toggle|0",
		"nts!|toggle|0",
	]],
	["network.share", "under-the-hood", "File sharing", "Sharing", "Samba, NFS and discovery.", [
		"samba|toggle|0",
		"sambaWorkgroup?samba=1|text|WORKGROUP",
		"nfs|toggle|0",
		"avahi|toggle|1",
		"guestAccess!?samba=1|toggle|0",
	]],

	// ---- graphics ---------------------------------------------------------
	["gfx.drivers", "under-the-hood", "Graphics drivers", "Picture Chip", "GPU drivers and acceleration.", [
		"vendor|choice|auto|auto,mesa,nvidia,nvidia-open,nouveau,amdgpu,intel,vm",
		"nvidiaBranch!?vendor=nvidia|choice|production|production,new-feature,legacy",
		"primeOffload?vendor=nvidia|toggle|0",
		"vaapi|toggle|1",
		"vulkan|toggle|1",
		"earlyKms!|toggle|1",
		"firmware|toggle|1",
	]],
	["gfx.session", "under-the-hood", "Display session", "The Screen", "Wayland or X11, and the compositor.", [
		"protocol|choice|wayland|wayland,x11",
		"compositor|choice|desktop-default|desktop-default,sway,hyprland,i3,bspwm,openbox",
		"displayManager|choice|lightdm|lightdm,gdm3,sddm,greetd,none",
		"scaling|choice|1|1,1.25,1.5,2",
		"fractionalScaling!|toggle|0",
		"vrr!|toggle|0",
		"tearFree!|toggle|1",
		"gaps!|number|0|0,60,px",
		"extraConfig!|area||appended to the compositor config",
	]],
	["gfx.gaming", "under-the-hood", "Gaming stack", "Game Boost", "Steam, Proton and the overlay tools.", [
		"steam|toggle|0",
		"proton?steam=1|toggle|1",
		"lutris|toggle|0",
		"gamemode|toggle|1",
		"mangohud|toggle|0",
		"vkbasalt!|toggle|0",
		"shaderCacheMb!|number|1024|0,32768,MB",
		"multilib|toggle|1",
	]],
	["gfx.audio", "under-the-hood", "Audio", "Sound Engine", "PipeWire, latency and codecs.", [
		"server|choice|pipewire|pipewire,pulseaudio,jack,none",
		"profile|choice|desktop|desktop,low-latency,studio",
		"sampleRate|choice|48000|44100,48000,96000,192000",
		"quantum!?profile=low-latency|number|256|32,2048,frames",
		"rtPriority!|number|88|0,99",
		"bluetoothCodecs|tags|SBC, AAC|SBC,AAC,aptX,LDAC",
		"echoCancel!|toggle|0",
	]],

	// ---- dev --------------------------------------------------------------
	["dev.toolchain", "under-the-hood", "Toolchains", "Maker Tools", "Compilers and runtimes in the image.", [
		"c~Languages|toggle|1",
		"cCompiler?c=1~Languages|choice|gcc|gcc,clang,both",
		"rust~Languages|toggle|0",
		"go~Languages|toggle|0",
		"node~Languages|toggle|0",
		"python~Languages|toggle|1",
		"java~Languages|toggle|0",
		"ccache~Build|toggle|1",
		"ccacheSize?ccache=1~Build|number|10|1,500,GB",
		"debugSymbols!~Build|toggle|0",
		"crossTargets!~Build|tags||arm64,armhf,riscv64,i386",
		"makeJobs!~Build|number|0|0,256",
	]],
	["dev.containers", "under-the-hood", "Containers", "Boxes", "Docker or Podman, and how they store things.", [
		"engine|choice|podman|podman,docker,lxc,none",
		"rootless|toggle|1",
		"storageDriver!|choice|overlay2|overlay2,btrfs,fuse-overlayfs",
		"compose|toggle|1",
		"buildkit!|toggle|1",
		"registries!|tags||docker.io,quay.io,ghcr.io",
		"k3s|toggle|0",
		"logMaxMb!|number|50|1,4096,MB",
	]],
	["dev.virt", "under-the-hood", "Virtualisation", "Computer Inside A Computer", "KVM, passthrough and guest tooling.", [
		"kvm|toggle|1",
		"manager?kvm=1|toggle|1",
		"nested!|toggle|0",
		"vfioIds!|tags||10de:2484,10de:228b",
		"hugepagesGb!|number|0|0,512,GB",
		"virtiofs!|toggle|1",
		"guestAgent|toggle|0",
	]],

	// ---- packaging --------------------------------------------------------
	["pkg.apt", "under-the-hood", "apt and repositories", "The App Shop", "Where packages come from and which ones win.", [
		"repos~Sources|area||one sources.list line per row",
		"keyUrls~Sources|tags||https://example.com/key.asc",
		"mirrorSnapshot!~Sources|text||20260701T000000Z",
		"aptProxy!~Sources|text||http://cache.lan:3142",
		"pinning!~Priorities|area||apt_preferences stanzas",
		"hold~Priorities|tags||linux-image-amd64,firefox-esr",
		"recommends~Behaviour|toggle|1",
		"suggests~Behaviour|toggle|0",
		"autoclean~Behaviour|toggle|1",
		"allowUnauth!~Behaviour|toggle|0",
		"preseed!~Behaviour|area||package question type value",
		"localDebs!~Behaviour|tags||./pkgs/thing.deb",
	]],
	["pkg.universal", "under-the-hood", "Universal packages", "More Apps", "Flatpak, Snap, AppImage, Nix.", [
		"flatpak|toggle|1",
		"flathub?flatpak=1|toggle|1",
		"flatpakApps?flatpak=1|tags||org.gimp.GIMP,org.blender.Blender,org.videolan.VLC",
		"snap|toggle|0",
		"appimage|toggle|0",
		"nix!|toggle|0",
		"brew!|toggle|0",
		"storePreference|choice|deb|deb,flatpak,snap",
	]],
	["pkg.reproducible", "under-the-hood", "Reproducible builds", "Same Every Time", "Build the same bytes twice, and prove it.", [
		"enabled|toggle|0",
		"sourceDateEpoch?enabled=1|text||1782518400",
		"manifest|toggle|1",
		"sbom!|toggle|0",
		"signImage!|toggle|0",
		"signKey!?signImage=1|text||0xDEADBEEF",
	]],

	// ---- bootloader -------------------------------------------------------
	["boot.loader", "under-the-hood", "Bootloader", "The Ignition", "What appears before the kernel starts.", [
		"loader~Loader|choice|grub|grub,systemd-boot,refind,syslinux",
		"firmware~Loader|choice|both|uefi,bios,both",
		"timeout~Menu|slider|5|0,60,s",
		"hidden~Menu|toggle|0",
		"defaultEntry!~Menu|text|0",
		"resolution!~Menu|choice|auto|auto,1024x768,1920x1080",
		"osProber~Entries|toggle|1",
		"recovery~Entries|toggle|1",
		"memtest~Entries|toggle|0",
		"password!~Entries|toggle|0",
		"extraEntries!~Entries|area||appended to 40_custom",
	]],

	// ---- finish -----------------------------------------------------------
	["output.iso", "finish", "ISO image", "Make The Disc", "A bootable ISO you can put on a USB stick.", [
		"installer|toggle|1",
		"volumeLabel|text|ZENVX",
	]],
	["output.hdd", "finish", "Disk image", "Make The Disk", "A raw image to write to a drive.", [
		"sizeGb|number|8|2,512,GB",
	]],
	["image.qcow2", "finish", "Virtual machine disk", "Pretend Computer", "Boot it in QEMU, Proxmox or the cloud.", [
		"format|choice|qcow2|qcow2,raw,vmdk,vdi,vhdx",
		"sizeGb|number|20|2,4096,GB",
		"sparse|toggle|1",
		"clusterSize!?format=qcow2|choice|65536|65536,262144,1048576",
		"virtio|toggle|1",
		"serialConsole|toggle|1",
		"cloudDatasource!|choice|none|none,NoCloud,Ec2,OpenStack",
	]],
	["image.oci", "finish", "Container image", "Shipping Box", "The same system as an OCI or Docker image.", [
		"format|choice|oci|oci,docker",
		"tag|text|zenvx/mydistro:latest",
		"squash|toggle|1",
		"entrypoint!|text|/bin/bash",
		"runAsUser|toggle|1",
		"labels!|tags||org.opencontainers.image.source=...",
		"stripDocs|toggle|1",
	]],
	["image.wsl", "finish", "WSL tarball", "Linux Inside Windows", "Import it into Windows Subsystem for Linux.", [
		"defaultUser|text|zenvx",
		"systemd|toggle|1",
		"interop|toggle|1",
		"appendWindowsPath!|toggle|0",
		"automount|toggle|1",
		"mountRoot!?automount=1|text|/mnt/",
		"generateResolvConf!|toggle|1",
	]],
	["image.rpi", "finish", "Raspberry Pi image", "Tiny Computer Card", "An SD card image for a Pi.", [
		"model|choice|pi4|pi5,pi4,pi3,zero2",
		"gpuMem|slider|76|16,512,MB",
		"uart|toggle|0",
		"overlays!|tags||vc4-kms-v3d,disable-bt,i2c-rtc",
		"overclock!|number|0|0,3000,MHz",
		"headless|toggle|0",
		"expandRootfs|toggle|1",
	]],
	["image.netboot", "finish", "Netboot bundle", "Boot Over The Wire", "PXE or iPXE, for a room full of machines.", [
		"protocol|choice|ipxe|pxe,ipxe",
		"rootTransport|choice|http|http,nfs",
		"serverUrl|text||http://boot.lan/zenvx",
		"toRam|toggle|1",
		"append!|text||nomodeset",
	]],
	["image.ostree", "finish", "Immutable system", "Cannot Be Broken", "Image-based updates with rollback.", [
		"remote|text||https://updates.example.com/repo",
		"branch|text|zenvx/stable/x86_64",
		"autoUpdate|toggle|1",
		"rollbackDepth|number|2|1,10",
		"writableEtc!|toggle|1",
		"overlayApps!|toggle|1",
	]],
]

export const PRO_BLOCKS = RAW.map(([id, category, label, kidLabel, blurb, fields]) => ({
	id,
	category,
	label,
	kidLabel,
	blurb,
	proOnly: !id.startsWith("output."),
	fields: fields.map(parseField),
}))

/** Everything the prototype knows about, kid tier first. */
export const ALL_BLOCKS = [...PROTOTYPE_BLOCKS, ...PRO_BLOCKS]

export const blockById = (id) => ALL_BLOCKS.find((b) => b.id === id)

export const stats = () => ({
	blocks: ALL_BLOCKS.length,
	fields: ALL_BLOCKS.reduce((n, b) => n + b.fields.length, 0),
	proOnly: ALL_BLOCKS.filter((b) => b.proOnly).length,
})

export { CATEGORY_LABELS, CATEGORY_ORDER }
