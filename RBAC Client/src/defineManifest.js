/**
 * Identity helper for RBAC manifests.
 *
 * Use this to wrap your app's RBAC config so:
 *   1. Editors can autocomplete the expected shape.
 *   2. Obvious mistakes (missing agentName, malformed screens) fail at import
 *      time instead of silently shipping broken RBAC.
 *
 * The returned object is the same reference you passed in.
 *
 * @typedef {Object} ScreenDecl
 * @property {string} slug          — must match the route key your SPA uses internally
 * @property {string} label         — shown to users in nav / tabs
 * @property {string[]} [requiredRoles]  — Frappe role names that can see this screen.
 *                                          If empty/omitted, the screen is PUBLIC (anyone with app access).
 * @property {string} [defaultForRole]   — if the user has this role, this screen is their landing page
 *
 * @typedef {string | {name: string, description?: string, defaultScreen?: string}} RoleDecl
 *
 * @typedef {Object} RbacManifest
 * @property {string} agentName           — Runtime Agent name, e.g. "SenaCode"
 * @property {string} [appPrefix]         — namespace for declared roles (default = agentName).
 *                                           Resulting Frappe role = `${appPrefix}: ${role.name}`.
 * @property {RoleDecl[]} [declaredRoles] — roles this app declares. Created as Frappe roles on install.
 * @property {ScreenDecl[]} screens       — every SPA-level screen the app has.
 *
 * @param {RbacManifest} manifest
 * @returns {RbacManifest}
 */
export function defineRbacManifest(manifest) {
	if (!manifest || typeof manifest !== 'object') {
		throw new Error('defineRbacManifest: manifest must be an object')
	}
	if (!manifest.agentName || typeof manifest.agentName !== 'string') {
		throw new Error('defineRbacManifest: agentName is required')
	}
	if (!Array.isArray(manifest.screens) || manifest.screens.length === 0) {
		throw new Error('defineRbacManifest: screens must be a non-empty array')
	}
	const slugs = new Set()
	for (const s of manifest.screens) {
		if (!s || typeof s !== 'object' || !s.slug || !s.label) {
			throw new Error('defineRbacManifest: each screen needs a slug and a label')
		}
		if (slugs.has(s.slug)) {
			throw new Error(`defineRbacManifest: duplicate screen slug "${s.slug}"`)
		}
		slugs.add(s.slug)
	}
	return manifest
}
