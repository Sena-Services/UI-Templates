<template>
  <div class="ao-container">
    <ResponseOverlay
      :messages="messages"
      :visible="overlayVisible"
      @dismiss="toggleOverlay"
    />
    <!-- Show button when overlay is hidden but there are messages -->
    <Transition name="ao-pill">
      <button
        v-if="!overlayVisible && messages.length > 0"
        class="ao-show-btn"
        @click="toggleOverlay"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
        Assistant
      </button>
    </Transition>
    <ChatBar
      ref="barRef"
      :placeholder="placeholder"
      :is-streaming="isStreaming"
      :disabled="disabled"
      :instances="chat.instances.value"
      :active-instance-id="chat.activeInstanceId.value"
      :active-instance-label="chat.activeInstanceLabel.value"
      @send="handleSend"
      @stop="handleStop"
      @attach="$emit('attach')"
      @select-instance="handleSwitchInstance"
      @create-instance="handleCreateInstance"
      @delete-instance="handleDeleteInstance"
      @navigate="handleNavigate"
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

/* Only open overlay when a new assistant message starts streaming */
watch(
  () => isStreaming.value,
  (val) => {
    if (val) overlayVisible.value = true
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

function handleNavigate(target) {
  if (!target) return
  emit('navigate', target)
  overlayVisible.value = false
}

async function handleSwitchInstance(instanceId) {
  await chat.switchInstance(instanceId)
  // Show overlay if the switched instance has messages
  overlayVisible.value = messages.value.length > 0
}

async function handleCreateInstance() {
  await chat.createInstance()
  overlayVisible.value = false
}

async function handleDeleteInstance(instanceId) {
  await chat.deleteInstance(instanceId)
  overlayVisible.value = messages.value.length > 0
}

function toggleOverlay() {
  overlayVisible.value = !overlayVisible.value
}

function dismissOverlay() {
  overlayVisible.value = false
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

.ao-show-btn {
  position: absolute;
  bottom: 70px;
  left: 50%;
  transform: translateX(-50%);
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 6px 14px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  background: #F8F7F4;
  color: #334155;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  transition: all 0.15s ease;
}

.ao-show-btn:hover {
  background: #FAF9F5;
  border-color: rgba(245, 158, 11, 0.35);
  box-shadow: 0 4px 12px -2px rgba(0, 0, 0, 0.08);
  transform: translateX(-50%) translateY(-1px);
}

.ao-show-btn svg {
  opacity: 0.5;
  stroke: #64748B;
}

.ao-pill-enter-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.ao-pill-leave-active { transition: opacity 0.1s ease, transform 0.1s ease; }
.ao-pill-enter-from { opacity: 0; transform: translateX(-50%) translateY(6px); }
.ao-pill-leave-to { opacity: 0; transform: translateX(-50%) translateY(6px); }
</style>
