/**
 * Blocks reference icons by name so the catalog stays free of JSX.
 * Icons are inline SVG: crisp at any size, no network fetch, themable.
 */
const PATHS: Record<string, string> = {
	engine: "M4 7h16v10H4z M8 7V4h8v3",
	"engine-alt": "M5 8h14v9H5z M9 8V5h6v3",
	"desktop-simple": "M3 5h18v11H3z M8 20h8",
	"desktop-modern": "M3 5h18v11H3z M3 9h18",
	"desktop-power": "M3 5h18v11H3z M12 9v4",
	palette: "M12 3a9 9 0 100 18h2a3 3 0 000-6h-1a3 3 0 010-6h1a3 3 0 000-6z",
	globe: "M12 3a9 9 0 100 18 9 9 0 000-18z M3 12h18 M12 3c3 4 3 14 0 18",
	"globe-alt": "M12 3a9 9 0 100 18 9 9 0 000-18z M12 3v18",
	brush: "M4 20c4 0 4-4 8-8l4 4c-4 4-8 4-8 4z M14 8l4-4 2 2-4 4z",
	code: "M9 8l-4 4 4 4 M15 8l4 4-4 4",
	gamepad: "M6 9h12a4 4 0 010 8H6a4 4 0 010-8z M9 13h2 M15 12v2",
	music: "M9 18V6l10-2v12 M9 18a2 2 0 11-4 0 2 2 0 014 0",
	doc: "M6 3h8l4 4v14H6z M14 3v4h4",
	python: "M12 3h4v6H8v6h8 M8 21H4v-6h8V9",
	folder: "M3 6h6l2 3h10v10H3z",
	tag: "M4 4h9l7 7-9 9-7-7z M8 8h.01",
	user: "M12 4a4 4 0 100 8 4 4 0 000-8z M4 21c0-4 4-6 8-6s8 2 8 6",
	box: "M4 8l8-4 8 4v9l-8 4-8-4z M4 8l8 4 8-4 M12 12v9",
	shield: "M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6z",
	terminal: "M4 5h16v14H4z M8 10l2 2-2 2 M13 14h4",
	disc: "M12 3a9 9 0 100 18 9 9 0 000-18z M12 10a2 2 0 100 4 2 2 0 000-4",
}

export default function BlockIcon({ name, size = 22 }: { name: string; size?: number }) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={1.6}
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
			className="text-brand shrink-0"
		>
			<path d={PATHS[name] ?? PATHS.box} />
		</svg>
	)
}
