/**
 * Convert the dev-friendly RBAC manifest into the registry-item payload shape
 * Sena's install flow expects.
 *
 * Output keys:
 *   - app_prefix: string — used to namespace declared roles into Frappe Role
 *                 names, e.g. "SenaCode: Developer"
 *   - declared_roles: [{role_name, description, default_screen}]
 *   - screens: [{screen_id, label, allowed_roles: string[]}]
 *
 * The install flow (`rbac_install._install_declared_roles` +
 * `_build_ui_screen_rows`) reads this shape and:
 *   - Creates Frappe Role rows for each declared role prefixed with app_prefix.
 *   - Expands each screen into one Runtime UI Screen row per allowed role,
 *     or a single public row when allowed_roles is empty.
 *
 * @param {import('./defineManifest.js').RbacManifest} manifest
 * @returns {{app_prefix: string, declared_roles: object[], screens: object[]}}
 */
export function toRegistryPayload(manifest) {
	if (!manifest) throw new Error('toRegistryPayload: manifest is required')

	const appPrefix = manifest.appPrefix || manifest.agentName

	const declaredRoles = (manifest.declaredRoles || []).map(r => {
		if (typeof r === 'string') {
			return { role_name: r }
		}
		const out = { role_name: r.name || r.role_name || '' }
		if (r.description) out.description = r.description
		if (r.defaultScreen || r.default_screen) {
			out.default_screen = r.defaultScreen || r.default_screen
		}
		return out
	})

	const screens = (manifest.screens || []).map(s => {
		const allowed = (s.requiredRoles || s.required_roles || []).slice()
		return {
			screen_id: s.slug,
			label: s.label,
			allowed_roles: allowed,
		}
	})

	return {
		app_prefix: appPrefix,
		declared_roles: declaredRoles,
		screens,
	}
}
