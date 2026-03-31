import { ref, watch } from 'vue'
import { useSocket } from './useSocket'
import { useStreaming } from './useStreaming'

/**
 * Main chat composable for embedded agent UIs.
 *
 * Usage:
 *   const chat = useChat({
 *     agentName: 'Academic Assistant',
 *     siteName: 'localhost',         // optional, auto-detected
 *     apiBase: '/api/method/...',    // optional override
 *   })
 *
 *   // Send a message
 *   await chat.send('What assignments are due this week?')
 *
 *   // Reactive state
 *   chat.messages  — Array of { id, role, content, toolCalls, thinkingText, isStreaming }
 *   chat.isStreaming — Boolean
 */
export function useChat(options = {}) {
  const { agentName = '', siteName = null, instanceId = 'default', socketUrl = null } = options

  const socket = useSocket(siteName, socketUrl)
  const streaming = useStreaming(socket)
  const messages = ref([])
  const error = ref(null)

  let csrfToken = null
  let messageCounter = 0

  async function getCsrf() {
    if (csrfToken) return csrfToken
    const res = await fetch('/api/method/sena_agents_backend.sena_agents_backend.api.auth.get_csrf_token', {
      method: 'GET',
      credentials: 'include',
    })
    const data = await res.json()
    const msg = data.message
    csrfToken = msg?.csrf_token || msg
    // Pre-connect the socket now that we know the site
    if (msg?.site_name) socket.connect()
    return csrfToken
  }

  async function send(text, files = null) {
    if (!text.trim() || !agentName) return
    error.value = null

    const userMsg = {
      id: `msg-${++messageCounter}`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
      attachments: files || [],
    }
    messages.value = [...messages.value, userMsg]

    const assistantMsg = {
      id: `msg-${++messageCounter}`,
      role: 'assistant',
      content: '',
      thinkingText: '',
      isStreaming: true,
      isThinking: false,
      toolCalls: [],
      timestamp: Date.now(),
    }
    messages.value = [...messages.value, assistantMsg]

    try {
      const csrf = await getCsrf()
      const body = {
        agent_name: agentName,
        message: text,
        instance_id: instanceId,
      }
      if (files?.length) body.attachments = JSON.stringify(files)

      const res = await fetch('/api/method/sena_agents_backend.sena_agents_backend.api.chat.send_message_stream', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Frappe-CSRF-Token': csrf,
        },
        body: JSON.stringify(body),
      })

      if (!res.ok) throw new Error(`API error: ${res.status}`)

      const data = await res.json()
      const sessionKey = data.message?.session_key
      if (!sessionKey) throw new Error('No session_key returned')

      streaming.startStreaming(sessionKey)
    } catch (err) {
      error.value = err.message
      const last = messages.value[messages.value.length - 1]
      if (last?.role === 'assistant' && last.isStreaming) {
        messages.value = messages.value.slice(0, -1)
      }
    }
  }

  function cancelStreaming() {
    streaming.stopStreaming()
  }

  function clearMessages() {
    messages.value = []
  }

  // Wire streaming state into the last assistant message
  watch(
    () => streaming.streamingText.value,
    (text) => {
      const last = messages.value[messages.value.length - 1]
      if (last?.role === 'assistant' && last.isStreaming) {
        messages.value = messages.value.map((m, i) =>
          i === messages.value.length - 1 ? { ...m, content: text } : m
        )
      }
    }
  )

  watch(
    () => streaming.thinkingText.value,
    (text) => {
      const last = messages.value[messages.value.length - 1]
      if (last?.role === 'assistant' && last.isStreaming) {
        messages.value = messages.value.map((m, i) =>
          i === messages.value.length - 1 ? { ...m, thinkingText: text } : m
        )
      }
    }
  )

  watch(
    () => streaming.isThinking.value,
    (val) => {
      const last = messages.value[messages.value.length - 1]
      if (last?.role === 'assistant' && last.isStreaming) {
        messages.value = messages.value.map((m, i) =>
          i === messages.value.length - 1 ? { ...m, isThinking: val } : m
        )
      }
    }
  )

  watch(
    () => streaming.toolCalls.value,
    (calls) => {
      const last = messages.value[messages.value.length - 1]
      if (last?.role === 'assistant' && last.isStreaming) {
        messages.value = messages.value.map((m, i) =>
          i === messages.value.length - 1 ? { ...m, toolCalls: calls } : m
        )
      }
    },
    { deep: true }
  )

  watch(
    () => streaming.isStreaming.value,
    (val) => {
      if (!val) {
        // Stream ended — finalize the last assistant message
        messages.value = messages.value.map((m, i) =>
          i === messages.value.length - 1 && m.role === 'assistant'
            ? { ...m, isStreaming: false }
            : m
        )
      }
    }
  )

  watch(
    () => streaming.streamError.value,
    (err) => {
      if (err) {
        error.value = err
        const last = messages.value[messages.value.length - 1]
        if (last?.role === 'assistant' && last.isStreaming) {
          messages.value = messages.value.map((m, i) =>
            i === messages.value.length - 1
              ? { ...m, isStreaming: false, content: m.content || `Error: ${err}` }
              : m
          )
        }
      }
    }
  )

  return {
    messages,
    isStreaming: streaming.isStreaming,
    error,
    send,
    cancelStreaming,
    clearMessages,
  }
}
