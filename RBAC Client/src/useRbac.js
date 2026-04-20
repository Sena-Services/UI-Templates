import { ref, computed, onMounted } from 'vue'

/**
 * Vue composable that handles the RBAC contract for an agent-app SPA.
 *
 * Responsibilities:
 *   - Fetch `get_app_context(agent)` from the Sena backend on mount.
 *   - Parse the `?screen=<slug>` URL param for boot_session deep-links.
 *   - Expose a reactive allow-list + helpers so your sidebar + navigate code
 *     stays 2-3 lines.
 *   - Degrade gracefully: if the endpoint errors (network hiccup, older
 *     backend without RBAC), the composable returns "allow everything" so
 *     the app keeps working instead of bricking.
 *
 * @param {object} opts
 * @param {import('./defineManifest.js').RbacManifest} opts.manifest
 *        — manifest from `defineRbacManifest`. Used for fallback ordering
 *          when computing `initialScreen()`.
 * @param {() => Promise<any>} opts.fetchContext
 *        — async function that returns the raw response from the Sena backend's
 *          `get_app_context` endpoint. You're responsible for wiring it to
 *          your app's HTTP layer (e.g. `() => api('.rbac.get_app_context?agent=SenaCode', 'GET')`).
 *          Can return either the raw `{screens, default_screen, user_roles}`
 *          object or a wrapped `{ok, data: {...}}` envelope — both are accepted.
 * @param {string} [opts.screenParam='screen']
 *        — URL query param to read for the initial screen deep-link.
 */
export function useRbac(opts) {
	if (!opts || typeof opts !== 'object') {
		throw new Error('useRbac: options object is required')
	}
	const { manifest, fetchContext } = opts
	const screenParam = opts.screenParam || 'screen'

	if (!manifest) throw new Error('useRbac: manifest is required')
	if (typeof fetchContext !== 'function') {
		throw new Error('useRbac: fetchContext (async function) is required')
	}

	const ready = ref(false)
	// Raw context payload: { screens: [{screen_id, label}, ...], default_screen, user_roles }
	const context = ref(null)

	// Read ?screen= once at construction. Persists even if context refetches later.
	const urlScreen = (() => {
		if (typeof window === 'undefined') return ''
		try {
			return new URLSearchParams(window.location.search).get(screenParam) || ''
		} catch {
			return ''
		}
	})()

	// Allowed slug set:
	//  - null → context not loaded yet, endpoint errored, OR user is unrestricted
	//           → degrade to "allow all" (trust the manifest)
	//  - Set → only these slugs are navigable
	//
	// The backend sets `unrestricted: true` when it can't enumerate every
	// screen the app declares (common case: no restriction rows for this
	// user's roles). In that mode we trust the frontend manifest entirely.
	const allowedSlugs = computed(() => {
		const c = context.value
		if (!c) return null
		if (c.unrestricted) return null
		if (!Array.isArray(c.screens) || c.screens.length === 0) return null
		return new Set(c.screens.map(s => s.screen_id))
	})

	function isAllowed(slug) {
		const s = allowedSlugs.value
		return !s || s.has(slug)
	}

	/** Returns the passed slug if allowed, else a safe fallback. Use in navigate(). */
	function guard(slug) {
		if (isAllowed(slug)) return slug
		const def = context.value?.default_screen
		if (def && isAllowed(def)) return def
		const first = manifest.screens.find(s => isAllowed(s.slug))
		return first?.slug || manifest.screens[0]?.slug || slug
	}

	/**
	 * Returns the slug the SPA should mount on initially.
	 * Precedence: `?screen=` URL param → backend default_screen → first allowed manifest screen.
	 */
	function initialScreen() {
		if (urlScreen && isAllowed(urlScreen)) return urlScreen
		const def = context.value?.default_screen
		if (def && isAllowed(def)) return def
		const first = manifest.screens.find(s => isAllowed(s.slug))
		return first?.slug || manifest.screens[0]?.slug || null
	}

	async function refresh() {
		try {
			const res = await fetchContext()
			if (res?.data && Array.isArray(res.data.screens)) {
				context.value = res.data
			} else if (Array.isArray(res?.screens)) {
				context.value = res
			} else {
				context.value = null
			}
		} catch {
			context.value = null
		}
		ready.value = true
	}

	const screens = computed(() => context.value?.screens || [])
	const defaultScreen = computed(() => context.value?.default_screen || null)
	const userRoles = computed(() => context.value?.user_roles || [])

	onMounted(refresh)

	return {
		ready,
		context,
		screens,
		defaultScreen,
		userRoles,
		allowedSlugs,
		isAllowed,
		guard,
		initialScreen,
		refresh,
	}
}
