<template>
  <div class="ao-container">
    <ResponseOverlay
      :message="lastAssistantMessage"
      :visible="overlayVisible"
      @dismiss="dismissOverlay"
    />
    <ChatBar
      ref="barRef"
      :placeholder="placeholder"
      :is-streaming="isStreaming"
      :disabled="disabled"
      @send="handleSend"
      @stop="handleStop"
      @attach="$emit('attach')"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import ChatBar from './ChatBar.vue'
import ResponseOverlay from './ResponseOverlay.vue'
import { useChat } from '../composables/useChat'

const props = defineProps({
  agentName: { type: String, required: true },
  siteName: { type: String, default: null },
  socketUrl: { type: String, default: null },
  placeholder: { type: String, default: 'Ask something...' },
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits(['navigate', 'action', 'response-complete', 'error', 'attach'])

const chat = useChat({
  agentName: props.agentName,
  siteName: props.siteName,
  socketUrl: props.socketUrl,
})

const messages = chat.messages
const isStreaming = chat.isStreaming
const overlayVisible = ref(false)
const barRef = ref(null)

const lastAssistantMessage = computed(() => {
  for (let i = messages.value.length - 1; i >= 0; i--) {
    if (messages.value[i].role === 'assistant') return messages.value[i]
  }
  return null
})

/* Show overlay when assistant starts responding */
watch(
  () => messages.value.length,
  (newLen, oldLen) => {
    if (newLen > oldLen) {
      const last = messages.value[newLen - 1]
      if (last?.role === 'assistant') {
        overlayVisible.value = true
      }
    }
  }
)

/* Process tool results for navigation and action commands */
watch(
  () => lastAssistantMessage.value?.toolCalls,
  (calls) => {
    if (!calls?.length) return
    for (const tc of calls) {
      if (tc.status !== 'complete' || !tc.result) continue
      try {
        const result = JSON.parse(tc.result)
        if (result.navigate) {
          emit('navigate', result.navigate)
          overlayVisible.value = false
        }
        if (result.action) {
          emit('action', result.action)
        }
      } catch {
        /* not JSON — ignore */
      }
    }
  },
  { deep: true }
)

/* Auto-dismiss overlay when streaming ends and response is short */
watch(
  () => isStreaming.value,
  (streaming) => {
    if (!streaming && lastAssistantMessage.value) {
      emit('response-complete', lastAssistantMessage.value)
    }
  }
)

watch(
  () => chat.error.value,
  (err) => { if (err) emit('error', err) }
)

function handleSend(text) {
  chat.send(text)
}

function handleStop() {
  chat.cancelStreaming()
}

function dismissOverlay() {
  if (!isStreaming.value) {
    overlayVisible.value = false
  }
}

defineExpose({
  send: chat.send,
  clearMessages: chat.clearMessages,
  dismissOverlay,
  messages,
  isStreaming,
})
</script>

<style scoped>
.ao-container {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 100;

  --sa-bg-surface: var(--bg-surface, #FFFFFF);
  --sa-border: var(--border, #E8E6E1);
  --sa-text-primary: var(--text-primary, #1A1A1A);
  --sa-text-secondary: var(--text-secondary, #6B6B6B);
  --sa-text-muted: var(--text-muted, #9B9B9B);
  --sa-bg-hover: var(--bg-hover, rgba(0, 0, 0, 0.04));
}
</style>
