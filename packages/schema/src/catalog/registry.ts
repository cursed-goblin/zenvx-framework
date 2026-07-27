/** Normalise a registry mirror entry into a plain URL Docker will accept. */
export const mirrorUrl = (value: string): string => {
	const v = value.trim()
	if (!v) return v
	return v.startsWith("http") ? v : "https://" + v
}

/** Strip any scheme, for config files that want a bare hostname. */
export const mirrorHost = (value: string): string =>
	value.trim().replace(/^https?:\/\//, "")
