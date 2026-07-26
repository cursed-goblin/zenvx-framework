/** @type {import('tailwindcss').Config} */
export default {
	content: ["./index.html", "./src/**/*.{ts,tsx}"],
	theme: {
		extend: {
			colors: {
				ink: "#2C2C2B",
				muted: "#7D7A75",
				soft: "#F9F8F7",
				surface: "#F0EFED",
				line: "#E6E5E3",
				brand: "#2783DE",
				brandSoft: "#E5F2FC",
				good: "#46A171",
				warn: "#D5803B",
				bad: "#E56458",
			},
			borderRadius: { xl: "12px" },
			boxShadow: {
				card: "0 1px 2px rgba(0,0,0,.05), 0 4px 12px rgba(0,0,0,.04)",
			},
		},
	},
	plugins: [],
}
