/**
 * Sena Bridge — transparent API proxy for iframe UIs.
 *
 * When running inside a Sena iframe (AgentIframeSurface), API calls are
 * proxied through the parent via postMessage. The parent has auth cookies
 * and CSRF — the iframe never touches credentials.
 *
 * When running standalone (same-origin, no parent), falls back to direct
 * fetch with credentials.
 *
 * Usage:
 *   const bridge = createBridge({ apiBase: '', siteName: null })
 *   await bridge.ready
 *   const data = await bridge.call('events.fire_event', { ... })
 */

const API_PREFIX = '/api/method/senaagents_backend.senaagents_backend.api'
const CALL_TIMEOUT = 30_000

let _bridgeInstance = null

/**
 * Create a bridge instance. Returns a singleton — safe to call multiple times.
 *
 * @param {Object} options
 * @param {string} options.apiBase - Base URL for direct fetch fallback (empty for same-origin)
 * @param {string|null} options.siteName - Frappe site name (for socket namespace)
 * @returns {{ ready: Promise, call: Function, mode: string, agentName: string }}
 */
export function createBridge(options = {}) {
  if (_bridgeInstance) return _bridgeInstance

  const { apiBase = '' } = options

  let mode = 'direct'     // 'bridge' or 'direct'
  let agentName = ''
  let csrfToken = null
  const pending = new Map() // id → { resolve, reject, timer }

  // ── Handshake ──────────────────────────────────
  // If we're in an iframe, try the bridge handshake. If the parent responds
  // within 500ms, use bridge mode. Otherwise fall back to direct fetch.

  const ready = new Promise((resolve) => {
    if (window.parent === window) {
      // Not in an iframe — direct mode
      resolve()
      return
    }

    function onHandshake(event) {
      if (event.data?.type !== 'sena:bridge-ready') return
      window.removeEventListener('message', onHandshake)
      clearTimeout(timer)
      mode = 'bridge'
      agentName = event.data.agentName || ''
      resolve()
    }

    window.addEventListener('message', onHandshake)
    window.parent.postMessage({ type: 'sena:bridge-handshake' }, '*')

    // Fallback: if no response in 500ms, assume direct mode
    const timer = setTimeout(() => {
      window.removeEventListener('message', onHandshake)
      resolve()
    }, 500)
  })

  // ── Response listener ──────────────────────────
  window.addEventListener('message', (event) => {
    const data = event.data
    if (data?.type !== 'sena:api-response' || !data.id) return
    const entry = pending.get(data.id)
    if (!entry) return
    pending.delete(data.id)
    clearTimeout(entry.timer)
    if (data.error) {
      entry.reject(new Error(data.error))
    } else {
      entry.resolve(data.data)
    }
  })

  // ── CSRF for direct mode ───────────────────────
  async function getCsrf() {
    if (csrfToken) return csrfToken
    try {
      const res = await fetch(`${apiBase}${API_PREFIX}.auth.get_csrf_token`, {
        method: 'GET',
        credentials: 'include',
      })
      const data = await res.json()
      const msg = data.message
      csrfToken = msg?.csrf_token || msg
    } catch {
      // Fall back to cookie
      const match = document.cookie.match(/csrf_token=([^;]+)/)
      if (match) csrfToken = decodeURIComponent(match[1])
    }
    return csrfToken
  }

  // ── Core call function ─────────────────────────
  /**
   * Call a Frappe API method. In bridge mode, proxied through parent.
   * In direct mode, uses fetch with cookies.
   *
   * @param {string} method - Full Frappe method path (e.g. 'events.fire_event')
   *   Accepts shorthand (resolved against senaagents_backend API prefix)
   *   or full dotted path.
   * @param {Object} params - Request parameters
   * @returns {Promise<any>} - Frappe response.message (unwrapped)
   */
  async function call(method, params = {}) {
    // Resolve shorthand: 'events.fire_event' → full method path
    const fullMethod = method.includes('senaagents_backend')
      ? method
      : `senaagents_backend.senaagents_backend.api.${method}`

    if (mode === 'bridge') {
      return bridgeCall(fullMethod, params)
    }
    return directCall(fullMethod, params)
  }

  function bridgeCall(method, params) {
    return new Promise((resolve, reject) => {
      const id = _generateId()
      const timer = setTimeout(() => {
        pending.delete(id)
        reject(new Error('Bridge API call timed out'))
      }, CALL_TIMEOUT)

      pending.set(id, { resolve, reject, timer })
      window.parent.postMessage({ type: 'sena:api-call', id, method, params }, '*')
    })
  }

  async function directCall(method, params) {
    const csrf = await getCsrf()
    const res = await fetch(`${apiBase}/api/method/${method}`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-Frappe-CSRF-Token': csrf,
      },
      body: JSON.stringify(params),
    })
    if (!res.ok) throw new Error(`API error: ${res.status}`)
    const data = await res.json()
    return data.message
  }

  _bridgeInstance = {
    /** Resolves when handshake completes (bridge or direct mode determined) */
    ready,
    /** Make an API call */
    call,
    /** Current mode: 'bridge' or 'direct' */
    get mode() { return mode },
    /** Agent name from parent (bridge mode only) */
    get agentName() { return agentName },
    /** CSRF token getter for direct mode consumers that need it */
    getCsrf,
  }
  return _bridgeInstance
}

function _generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}
