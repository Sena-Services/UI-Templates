# sena-rbac-client

Drop-in RBAC integration for Sena agent apps. One manifest + one composable.

## What it does

- Fetches the current user's allowed screens from the Sena backend on mount.
- Parses `?screen=<slug>` from the URL (for `boot_session` deep-links).
- Gives you reactive helpers for filtering your sidebar and guarding navigation.
- Degrades gracefully — if the backend endpoint is unavailable (older site, network
  blip), the composable falls back to "allow everything" instead of hiding the app.
- Emits a single canonical registry-item payload from your manifest, so the
  install flow on tenant sites auto-creates Frappe Roles + Runtime UI Screen rows.

You stop hand-writing sidebar filters, navigation guards, URL parsing, and
graceful-degradation logic. Everything is a single import.

## 10-minute integration

### 1. Install

In your SPA's `package.json`:

```json
{
  "dependencies": {
    "sena-rbac-client": "file:/home/arvis/SenaAgents/UI-Templates/RBAC Client"
  }
}
```

Then `npm install`.

### 2. Declare your manifest (`src/rbac.config.js`)

Every screen your SPA exposes, and any roles your app wants installed:

```js
import { defineRbacManifest } from 'sena-rbac-client'

export default defineRbacManifest({
  agentName: 'SenaCode',      // Runtime Agent name — must match the installed agent
  appPrefix: 'SenaCode',      // Frappe role namespace (default: agentName)
  declaredRoles: [
    { name: 'Developer', description: 'Can build and ship code' },
    'Reviewer',                // shorthand when you don't need a description
  ],
  screens: [
    { slug: 'home', label: 'Home' },                               // public
    { slug: 'ln-issues', label: 'Linear Issues', requiredRoles: ['Developer'] },
    { slug: 'wiki', label: 'Wiki' },
    { slug: 'claude-code', label: 'Claude Code', requiredRoles: ['Developer'] },
    { slug: 'settings', label: 'Settings' },
  ],
})
```

**Screen rules**

- `slug` must match the internal route key your SPA uses to render the screen
  (e.g. the value of `tab.value` or a Vue Router path key).
- Leave `requiredRoles` empty/omitted → the screen is PUBLIC (anyone with access
  to the agent app sees it).
- `requiredRoles` entries get namespaced to `"<appPrefix>: <role>"` at install time,
  so `"Developer"` becomes `"SenaCode: Developer"` in Frappe.
- If you want a role to always land on a specific screen, leave that to the
  **admin** to configure in the Team UI's "Default landing" checkbox — or declare
  it yourself by setting `defaultScreen` on the role, see below.

### 3. Wire into your SPA (`App.vue`)

```js
import { useRbac } from 'sena-rbac-client'
import manifest from './rbac.config.js'
import { useApi } from './composables/useApi.js'

const { api } = useApi()
const rbac = useRbac({
  manifest,
  fetchContext: () => api('.rbac.get_app_context?agent=' + manifest.agentName, 'GET'),
})

// --- Sidebar filter ---
const sidebarSections = computed(() => {
  const allScreens = manifest.screens.map(s => ({
    slug: s.slug, label: s.label, target: s.slug,
  }))
  return [{ label: 'Navigation', items: allScreens.filter(s => rbac.isAllowed(s.slug)) }]
})

// --- Navigation guard ---
function navigate(slug) {
  tab.value = rbac.guard(slug)   // returns `slug` if allowed, else a safe fallback
}

// --- Initial screen on mount ---
const tab = ref(manifest.screens[0].slug)
onMounted(async () => {
  await rbac.refresh()            // ensures URL param + backend default are available
  tab.value = rbac.initialScreen() || manifest.screens[0].slug
})
```

That's the entire integration. No sidebar rewriting, no URL parsing, no try/catch
around the endpoint — the composable handles all of it.

### 4. Publish your registry item with RBAC metadata

Before publishing your agent app to the registry, fold the manifest into the payload:

```js
// publish.js (your existing publish script)
import { toRegistryPayload } from 'sena-rbac-client'
import manifest from './src/rbac.config.js'

const registryItem = {
  name: 'ui/senacode',
  item_type: 'UI',
  title: 'SenaCode',
  payload: {
    ui_name: 'SenaCode UI',
    route: '/assets/senacode/senacode-ui/index.html',
    // ... your existing payload fields ...
    ...toRegistryPayload(manifest),
  },
}

// POST to the platform's publish_item endpoint
await fetch(PLATFORM_URL + '/api/method/.../publish_item', {
  method: 'POST',
  body: JSON.stringify(registryItem),
})
```

The tenant's install flow reads `app_prefix`, `declared_roles`, and `screens`
from the payload and:

- Creates any missing Frappe Role rows (namespaced).
- Creates `Runtime UI Screen` child rows on the installed Runtime UI, one per
  `(screen × required_role)` pair, or a public row per screen with no roles.

## Full `useRbac` API

```js
const rbac = useRbac({ manifest, fetchContext, screenParam? })
```

| Property           | Type                        | Notes                                                                                           |
| ------------------ | --------------------------- | ----------------------------------------------------------------------------------------------- |
| `rbac.ready`       | `Ref<boolean>`              | `true` after the first fetch resolves (success or failure).                                     |
| `rbac.context`     | `Ref<object \| null>`       | Raw `{screens, default_screen, user_roles}` from the backend, or `null` if not loaded/errored.  |
| `rbac.screens`     | `ComputedRef<Screen[]>`     | The backend's allow-list (dedup'd by `screen_id`).                                              |
| `rbac.defaultScreen` | `ComputedRef<string\|null>` | Slug the user should land on per their role, if any.                                            |
| `rbac.userRoles`   | `ComputedRef<string[]>`     | The user's roles in this agent app (namespaced Frappe role names).                              |
| `rbac.allowedSlugs`| `ComputedRef<Set\|null>`    | Set of allowed slugs, or `null` when context isn't loaded (then `isAllowed` returns `true`).    |
| `rbac.isAllowed(slug)` | `(slug: string) => boolean` | Cheap check for any slug.                                                                   |
| `rbac.guard(slug)` | `(slug: string) => string`  | Returns `slug` if allowed, else default, else first allowed — for use in `navigate()`.         |
| `rbac.initialScreen()` | `() => string \| null`  | URL param → backend default → first allowed. Call once on mount after `refresh()`.              |
| `rbac.refresh()`   | `() => Promise<void>`       | Re-fetch. Called automatically once on mount; call manually after role/preference changes.     |

## Graceful degradation

If `fetchContext` throws or returns a malformed response, `allowedSlugs` stays
`null`. In that mode `isAllowed()` always returns `true`. Net effect: your app
behaves as if there's no RBAC — every screen visible, every nav allowed. Good
for local dev against a backend that hasn't been migrated, and safe for
production fallback.

## FAQ

**Do I still need to hardcode my routes in the SPA?**
Yes. The SPA is the implementation; the manifest is the declaration of what's
exposed to RBAC. The two must stay in sync (add a new screen → update manifest).

**Can I have per-screen components / child routes?**
Yes — `slug` is opaque to the RBAC system. Use whatever router/tab pattern you
want, as long as the manifest's slugs are the keys you check in `isAllowed`.

**What if an admin changes roles while the SPA is open?**
Call `rbac.refresh()` after the change (e.g. post-role-toggle handler, or on
window focus). The reactive helpers update automatically.

**How does this interact with `@requires_app_role` on backend APIs?**
It doesn't. Frontend RBAC is about **visibility** (which screens render).
Backend RBAC is about **execution** (which API methods can be called). The two
are separate by design — if a user bypasses the frontend guard, the backend
decorator still blocks the method. See `docs/WIP/agent-app-ui-and-rbac.md`.
