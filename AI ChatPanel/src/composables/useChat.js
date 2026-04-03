import { ref, computed, watch } from 'vue'
import { useSocket } from './useSocket'
import { useStreaming } from './useStreaming'
import { createBridge } from '../utils/senaBridge'

export function useChat(options = {}) {
  const { agentName = '', siteName = null, socketUrl = null, apiBase = '' } = options

  const bridge = createBridge({ apiBase })
  const socket = useSocket(siteName, socketUrl)
  const streaming = useStreaming(socket)
  const messages = ref([])
  const error = ref(null)

  // ── Instance management ──
  const instances = ref([])
  const activeInstanceId = ref(null)
  const activeInstanceLabel = computed(() => {
    const inst = instances.value.find(i => i.instance_id === activeInstanceId.value)
    return inst?.title || 'Chat 1'
  })

  let messageCounter = 0
  let _busy = false

  // ── Bootstrap ──
  bridge.ready.then(() => {
    if (bridge.mode === 'direct') {
      bridge.getCsrf().then(() => socket.connect()).catch(() => {})
    }
    _init()
  })

  async function _init() {
    try {
      await bridge.ready
      const resp = await bridge.call('instances.list_instances', { agent: agentName })
      // Backend returns {ok, data: [...], message}
      const list = resp?.data || resp || []

      if (_busy) return

      if (Array.isArray(list) && list.length) {
        instances.value = list
        // Most recently active first (backend sorts by last_activity desc)
        activeInstanceId.value = list[0].instance_id
        await _loadHistorySafe()
      } else {
        // No instances — create one via backend
        await _createFirstInstance()
      }
    } catch (e) {
      console.warn('Failed to init instances:', e)
      // Fallback: still allow chatting — fire_event auto-creates instances
      if (!activeInstanceId.value) {
        activeInstanceId.value = `default`
      }
    }
  }

  async function _createFirstInstance() {
    const id = _generateId()
    try {
      await bridge.call('instances.create_instance', {
        agent: agentName,
        instance_id: id,
        title: 'Chat 1',
      })
    } catch { /* fire_event will auto-create if needed */ }
    instances.value = [{ instance_id: id, title: 'Chat 1', message_count: 0 }]
    activeInstanceId.value = id
  }

  async function _loadHistorySafe() {
    if (_busy || streaming.isStreaming.value) return
    try {
      await bridge.ready
      const targetInstance = activeInstanceId.value
      if (!targetInstance) return

      const resp = await bridge.call('messages.list_messages', {
        instance_id: targetInstance,
        limit: 200,
        offset: 0,
      })
      // Backend returns {ok, data: {messages: [...], limit, offset, has_more}}
      const msgData = resp?.data || resp || {}
      const msgList = msgData.messages || msgData || []

      // Bail if state changed while awaiting
      if (_busy || streaming.isStreaming.value) return
      if (activeInstanceId.value !== targetInstance) return

      if (Array.isArray(msgList) && msgList.length) {
        messageCounter = 0
        messages.value = msgList.map(m => ({
          id: m.name || `msg-${++messageCounter}`,
          role: m.role,
          content: m.content || '',
          thinkingText: '',
          isStreaming: false,
          isThinking: false,
          toolCalls: _parseJson(m.tool_calls),
          timestamp: m.creation ? new Date(m.creation).getTime() : Date.now(),
          attachments: _parseJson(m.attachments),
        }))
      }
      // Don't wipe messages if backend returns empty — could be timing
    } catch (e) {
      console.warn('Failed to load history:', e)
    }
  }

  // ── Public instance API ──

  async function refreshInstances() {
    try {
      await bridge.ready
      const resp = await bridge.call('instances.list_instances', { agent: agentName })
      const list = resp?.data || resp || []
      if (Array.isArray(list) && list.length) {
        instances.value = list
      }
    } catch (e) {
      console.warn('Failed to refresh instances:', e)
    }
  }

  async function createInstance() {
    const id = _generateId()
    const num = instances.value.length + 1
    const title = `Chat ${num}`
    try {
      await bridge.ready
      await bridge.call('instances.create_instance', {
        agent: agentName,
        instance_id: id,
        title,
      })
    } catch (e) {
      console.warn('Failed to create instance:', e)
      return null
    }
    const inst = { instance_id: id, title, message_count: 0 }
    instances.value = [...instances.value, inst]
    activeInstanceId.value = id
    messages.value = []
    return inst
  }

  async function deleteInstance(instanceId) {
    if (!instanceId) return
    // Don't allow deleting the last instance
    if (instances.value.length <= 1) return

    try {
      await bridge.ready
      await bridge.call('instances.delete_instance', { instance_id: instanceId })
    } catch (e) {
      console.warn('Failed to delete instance:', e)
      return
    }

    // Remove from local list
    instances.value = instances.value.filter(i => i.instance_id !== instanceId)

    // If we deleted the active instance, switch to the first remaining
    if (activeInstanceId.value === instanceId) {
      const next = instances.value[0]
      if (next) {
        activeInstanceId.value = next.instance_id
        messages.value = []
        await _loadHistorySafe()
      }
    }
  }

  async function switchInstance(instanceId) {
    if (instanceId === activeInstanceId.value) return
    streaming.stopStreaming()
    _busy = false
    activeInstanceId.value = instanceId
    messages.value = []
    await _loadHistorySafe()
  }

  // ── Send ──

  async function send(text, files = null) {
    if (!text.trim() || !agentName) return
    error.value = null
    _busy = true

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
      await bridge.ready
      const resolvedInstanceId = activeInstanceId.value
      const sessionKey = `${agentName}::${resolvedInstanceId}`

      // Persist user message — create_message auto-creates instance if needed
      await bridge.call('messages.create_message', {
        instance_id: resolvedInstanceId,
        role: 'user',
        content: text.trim(),
        agent: agentName,
        ...(files?.length ? { attachments: JSON.stringify(files) } : {}),
      }).catch(() => {})

      // Fire event — triggers agent wakeup, also auto-creates instance
      const fireResp = await bridge.call('events.fire_event', {
        event_name: 'User Message',
        agent_id: agentName,
        instance_id: resolvedInstanceId,
        payload: JSON.stringify({ message: text, message_persisted: true }),
      })

      // Backend may resolve to a different instance_id (e.g. default:{pk})
      // Use the actual instance_id from the response for streaming
      const actualInstanceId = fireResp?.instance_id || fireResp?.data?.instance_id || resolvedInstanceId
      const actualSessionKey = `${agentName}::${actualInstanceId}`

      // Update our active instance if backend resolved differently
      if (actualInstanceId !== resolvedInstanceId) {
        activeInstanceId.value = actualInstanceId
      }

      streaming.startStreaming(actualSessionKey)
    } catch (err) {
      _busy = false
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

  // ── Streaming watchers ──

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
        _busy = false
        messages.value = messages.value.map((m, i) =>
          i === messages.value.length - 1 && m.role === 'assistant'
            ? { ...m, isStreaming: false }
            : m
        )
        refreshInstances()
      }
    }
  )

  watch(
    () => streaming.streamError.value,
    (err) => {
      if (err) {
        _busy = false
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
    instances,
    activeInstanceId,
    activeInstanceLabel,
    send,
    cancelStreaming,
    clearMessages,
    createInstance,
    deleteInstance,
    switchInstance,
    loadHistory: _loadHistorySafe,
    refreshInstances,
  }
}

function _generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

function _parseJson(val) {
  if (!val) return []
  if (Array.isArray(val)) return val
  if (typeof val === 'string') {
    try { return JSON.parse(val) } catch { return [] }
  }
  return []
}
