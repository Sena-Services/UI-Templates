import { ref } from 'vue'
import io from 'socket.io-client'

let socket = null
let currentNamespace = null
const connected = ref(false)
let _connectingPromise = null

/**
 * @param {string|function|null} siteName - Frappe site name for namespace
 * @param {string|null} socketUrl - Socket.IO server URL (e.g. 'http://localhost:9000')
 *   If not provided, tries same origin first, then falls back to port 9000.
 */
export function useSocket(siteName, socketUrl) {
  function resolveSite() {
    if (siteName) return typeof siteName === 'function' ? siteName() : siteName
    const hostname = window.location.hostname
    return hostname
  }

  function resolveSocketUrl() {
    if (socketUrl) return socketUrl
    // In dev, the socketio server runs on a separate port (9000 by default).
    // In production, nginx proxies /socket.io to the socketio server on the same origin.
    // Try same origin first — if it fails, the reconnection logic handles it.
    return window.location.origin
  }

  function connect() {
    const site = resolveSite()
    const base = resolveSocketUrl()
    const namespace = `${base}/${site}`

    if (socket && currentNamespace !== namespace) {
      socket.disconnect()
      socket = null
      currentNamespace = null
    }

    if (socket?.connected) { connected.value = true; return }
    if (socket) return

    currentNamespace = namespace
    socket = io(namespace, {
      withCredentials: true,
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
      extraHeaders: { 'X-Frappe-Site-Name': site },
    })

    socket.on('connect', () => { connected.value = true })
    socket.on('disconnect', () => { connected.value = false })
  }

  function on(event, handler) {
    if (!socket) connect()
    socket.on(event, handler)
  }

  function off(event, handler) {
    socket?.off(event, handler)
  }

  function ensureConnected(timeoutMs = 15000) {
    if (socket?.connected) return Promise.resolve()
    if (_connectingPromise) return _connectingPromise

    if (socket) {
      socket.disconnect()
      socket = null
      currentNamespace = null
      connected.value = false
    }

    connect()
    if (socket?.connected) return Promise.resolve()

    _connectingPromise = new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        socket?.off('connect', onConnect)
        reject(new Error('Socket connection timed out'))
      }, timeoutMs)
      function onConnect() { clearTimeout(timer); resolve() }
      socket?.once('connect', onConnect)
    }).finally(() => { _connectingPromise = null })

    return _connectingPromise
  }

  return { connected, connect, on, off, ensureConnected }
}
