import { ref } from 'vue'
import {
  AGENT_TOKEN, AGENT_THINKING, AGENT_TOOL_CALL, AGENT_TOOL_RESULT,
  AGENT_TURN_DONE, AGENT_DONE, AGENT_ERROR, AGENT_INJECT_ACK,
  APPROVAL_UPDATE, ToolCallStatus,
} from '../utils/constants'

const THROTTLE_MS = 16
const THINKING_THROTTLE_MS = 50
const FIRST_EVENT_TIMEOUT_MS = 45000
const STREAM_TIMEOUT_MS = 600000

export function useStreaming(socket) {
  const isStreaming = ref(false)
  const streamingText = ref('')
  const thinkingText = ref('')
  const isThinking = ref(false)
  const activeSessionKey = ref(null)
  const toolCalls = ref([])
  const streamError = ref(null)
  const completionData = ref(null)
  const injectAck = ref(null)

  let responseAcc = ''
  let responseTimer = null
  let thinkingAcc = ''
  let thinkingTimer = null
  let firstEventTimer = null
  let streamTimer = null

  function flush() {
    if (responseAcc) { streamingText.value += responseAcc; responseAcc = '' }
    responseTimer = null
  }

  function flushThinking() {
    if (thinkingAcc) { thinkingText.value += thinkingAcc; thinkingAcc = '' }
    thinkingTimer = null
  }

  function clearFirstEvent() {
    if (firstEventTimer) { clearTimeout(firstEventTimer); firstEventTimer = null }
  }

  function handleToken(data) {
    if (data.session_key !== activeSessionKey.value) return
    clearFirstEvent()
    isThinking.value = false
    responseAcc += data.text || ''
    if (!responseTimer) responseTimer = setTimeout(flush, THROTTLE_MS)
  }

  function handleThinking(data) {
    if (data.session_key !== activeSessionKey.value) return
    clearFirstEvent()
    isThinking.value = true
    thinkingAcc += data.text || ''
    if (!thinkingTimer) thinkingTimer = setTimeout(flushThinking, THINKING_THROTTLE_MS)
  }

  function handleToolCall(data) {
    if (data.session_key !== activeSessionKey.value) return
    clearFirstEvent()
    toolCalls.value = [...toolCalls.value, {
      name: data.tool,
      arguments: data.arguments,
      status: ToolCallStatus.RUNNING,
      result: null,
      startedAt: Date.now(),
    }]
  }

  function handleToolResult(data) {
    if (data.session_key !== activeSessionKey.value) return
    clearFirstEvent()
    const idx = [...toolCalls.value].reverse().findIndex(
      t => t.name === data.tool && t.status === ToolCallStatus.RUNNING
    )
    if (idx === -1) return
    const realIdx = toolCalls.value.length - 1 - idx
    const updated = [...toolCalls.value]

    let parsed = null
    try { parsed = JSON.parse(data.result) } catch {}
    const isApproval = parsed?.status === 'awaiting_approval' && parsed?.approval_id
    let isError = !!data.error
    if (!isError && parsed) {
      isError = parsed.ok === false || parsed.status === 'error' ||
        (typeof parsed.error === 'string' && parsed.error.length > 0)
    }

    updated[realIdx] = {
      ...updated[realIdx],
      status: isError ? ToolCallStatus.ERROR : (isApproval ? ToolCallStatus.AWAITING_APPROVAL : ToolCallStatus.COMPLETE),
      result: data.result,
      error: isError ? (data.error || parsed?.error || 'Tool failed') : null,
      completedAt: Date.now(),
      approvalId: isApproval ? parsed.approval_id : null,
    }
    toolCalls.value = updated
  }

  function finishStream() {
    if (responseTimer) { clearTimeout(responseTimer); responseTimer = null }
    flush()
    if (thinkingTimer) { clearTimeout(thinkingTimer); thinkingTimer = null }
    flushThinking()

    const hasStuck = toolCalls.value.some(t => t.status === ToolCallStatus.RUNNING)
    if (hasStuck) {
      toolCalls.value = toolCalls.value.map(t =>
        t.status === ToolCallStatus.RUNNING
          ? { ...t, status: ToolCallStatus.COMPLETE, completedAt: Date.now() }
          : t
      )
    }

    isStreaming.value = false
    isThinking.value = false
    cleanup()
  }

  function handleTurnDone(data) {
    if (data.session_key !== activeSessionKey.value) return
    clearFirstEvent()
    finishStream()
  }

  function handleDone(data) {
    if (data.session_key !== activeSessionKey.value) return
    clearFirstEvent()
    if (responseTimer) { clearTimeout(responseTimer); responseTimer = null }
    flush()
    if (thinkingTimer) { clearTimeout(thinkingTimer); thinkingTimer = null }
    flushThinking()

    if (!streamingText.value && data.response) streamingText.value = data.response

    completionData.value = {
      response: data.response,
      model_used: data.model_used,
      tokens: data.tokens,
    }

    finishStream()
  }

  function handleError(data) {
    if (data.session_key !== activeSessionKey.value) return
    clearFirstEvent()
    if (responseTimer) { clearTimeout(responseTimer); responseTimer = null }
    flush()
    isStreaming.value = false
    isThinking.value = false
    streamError.value = data.message || 'Unknown streaming error'
    cleanup()
  }

  function handleInjectAck(data) {
    if (data.session_key !== activeSessionKey.value) return
    clearFirstEvent()
    if (responseTimer) { clearTimeout(responseTimer); responseTimer = null }
    flush()
    if (thinkingTimer) { clearTimeout(thinkingTimer); thinkingTimer = null }
    flushThinking()
    isThinking.value = false
    injectAck.value = { content: data.content, timestamp: Date.now() }
  }

  function handleApprovalUpdate(data) {
    if (!data?.name) return
    const idx = toolCalls.value.findIndex(
      t => t.approvalId === data.name && t.status === ToolCallStatus.AWAITING_APPROVAL
    )
    if (idx === -1) return
    const updated = [...toolCalls.value]
    if (data.status === 'approved' || data.status === 'consumed') {
      updated[idx] = { ...updated[idx], status: ToolCallStatus.COMPLETE }
    } else if (data.status === 'rejected') {
      updated[idx] = { ...updated[idx], status: ToolCallStatus.ERROR }
    }
    toolCalls.value = updated
  }

  function registerListeners() {
    socket.on(AGENT_TOKEN, handleToken)
    socket.on(AGENT_THINKING, handleThinking)
    socket.on(AGENT_TOOL_CALL, handleToolCall)
    socket.on(AGENT_TOOL_RESULT, handleToolResult)
    socket.on(AGENT_TURN_DONE, handleTurnDone)
    socket.on(AGENT_DONE, handleDone)
    socket.on(AGENT_ERROR, handleError)
    socket.on(AGENT_INJECT_ACK, handleInjectAck)
    socket.on(APPROVAL_UPDATE, handleApprovalUpdate)
  }

  function cleanup() {
    socket.off(AGENT_TOKEN, handleToken)
    socket.off(AGENT_THINKING, handleThinking)
    socket.off(AGENT_TOOL_CALL, handleToolCall)
    socket.off(AGENT_TOOL_RESULT, handleToolResult)
    socket.off(AGENT_TURN_DONE, handleTurnDone)
    socket.off(AGENT_DONE, handleDone)
    socket.off(AGENT_ERROR, handleError)
    socket.off(AGENT_INJECT_ACK, handleInjectAck)
    socket.off(APPROVAL_UPDATE, handleApprovalUpdate)
    if (firstEventTimer) { clearTimeout(firstEventTimer); firstEventTimer = null }
    if (streamTimer) { clearTimeout(streamTimer); streamTimer = null }
    if (responseTimer) { clearTimeout(responseTimer); responseTimer = null }
    if (thinkingTimer) { clearTimeout(thinkingTimer); thinkingTimer = null }
    responseAcc = ''
    thinkingAcc = ''
  }

  function startStreaming(sessionKey) {
    cleanup()
    activeSessionKey.value = sessionKey
    isStreaming.value = true
    streamingText.value = ''
    thinkingText.value = ''
    isThinking.value = false
    toolCalls.value = []
    streamError.value = null
    completionData.value = null
    responseAcc = ''
    thinkingAcc = ''

    socket.ensureConnected(15000).then(() => {
      registerListeners()
      firstEventTimer = setTimeout(() => {
        if (!isStreaming.value) return
        handleError({ session_key: activeSessionKey.value, message: 'Agent is not responding.' })
      }, FIRST_EVENT_TIMEOUT_MS)
    }).catch(() => {
      registerListeners()
    })

    streamTimer = setTimeout(() => {
      if (!isStreaming.value) return
      handleError({ session_key: activeSessionKey.value, message: 'Response timed out.' })
    }, STREAM_TIMEOUT_MS)
  }

  function stopStreaming() {
    if (!isStreaming.value) return
    flush()
    flushThinking()
    isStreaming.value = false
    isThinking.value = false
    cleanup()
  }

  return {
    isStreaming, streamingText, thinkingText, isThinking,
    toolCalls, streamError, completionData, injectAck, activeSessionKey,
    startStreaming, stopStreaming, cleanup,
  }
}
