import type { BlockDef } from "./types"

export const outputIso: BlockDef = {
	id: "output.iso",
	category: "finish",
	label: "Bootable ISO",
	kidLabel: "Make It Real",
	icon: "disc",
	blurb: "A file you can put on a USB stick.",
	inputs: ["system"],
	outputs: ["image"],
	singleton: true,
	fields: [
		{ key: "installer", label: "Include installer", type: "toggle", default: true },
		{ key: "persistence", label: "Remember changes on the USB", type: "toggle", default: false },
		{
			key: "compression",
			label: "Squeeze the image",
			type: "choice",
			default: "xz",
			options: [
				{ value: "xz", label: "Smallest (slow build)" },
				{ value: "gzip", label: "Fastest build" },
			],
		},
		{ key: "isoLabel", label: "USB label", type: "text", placeholder: "MYOS" },
	],
	emit: (cfg) => ({
		lbFlags: {
			binary_images: "iso-hybrid",
			compression: cfg.compression ?? "xz",
			...(cfg.isoLabel ? { iso_volume: String(cfg.isoLabel) } : {}),
			...(cfg.persistence === true ? { bootappend_live: "boot=live persistence" } : {}),
		},
		packages: cfg.installer === false ? [] : ["calamares", "calamares-settings-debian"],
		sizeMb: cfg.installer === false ? 0 : 120,
	}),
}

export const outputHdd: BlockDef = {
	id: "output.hdd",
	category: "finish",
	label: "USB / disk image",
	kidLabel: "Make a USB Stick",
	icon: "usb",
	blurb: "An .img you can write straight to a drive.",
	inputs: ["system"],
	outputs: ["image"],
	singleton: true,
	fields: [
		{
			key: "filesystem",
			label: "Filesystem",
			type: "choice",
			default: "ext4",
			options: [
				{ value: "ext4", label: "ext4 (Linux)" },
				{ value: "fat32", label: "FAT32 (works everywhere)" },
			],
		},
	],
	emit: (cfg) => ({
		lbFlags: { binary_images: "hdd", binary_filesystem: cfg.filesystem ?? "ext4" },
		sizeMb: 0,
	}),
}

export const outputs: BlockDef[] = [outputIso, outputHdd]
