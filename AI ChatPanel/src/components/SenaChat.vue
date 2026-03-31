<template>
  <div class="sc-chat" :class="{ 'sc-chat--embedded': embedded }">
    <!-- Messages -->
    <div ref="messagesRef" class="sc-chat__messages" @scroll="handleScroll">
      <div v-if="!messages.length" class="sc-chat__empty">
        <slot name="empty">
          <p class="sc-chat__empty-text">{{ emptyText }}</p>
        </slot>
      </div>
      <ChatMessage
        v-for="msg in messages"
        :key="msg.id"
        :message="msg"
      />
    </div>

    <!-- Error banner -->
    <div v-if="error" class="sc-chat__error">
      {{ error }}
      <button class="sc-chat__error-dismiss" @click="error = null">&times;</button>
    </div>

    <!-- Input -->
    <div class="sc-chat__input-area">
      <ChatInput
        ref="inputRef"
        :placeholder="placeholder"
        :is-streaming="isStreaming"
        :disabled="disabled"
        @send="handleSend"
        @stop="handleStop"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick, onMounted } from 'vue'
import ChatMessage from './ChatMessage.vue'
import ChatInput from './ChatInput.vue'
import { useChat } from '../composables/useChat'

const props = defineProps({
  agentName: { type: String, required: true },
  siteName: { type: String, default: null },
  socketUrl: { type: String, default: null },
  placeholder: { type: String, default: 'Ask something...' },
  emptyText: { type: String, default: 'Start a conversation' },
  embedded: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits(['message-sent', 'response-complete', 'error'])

const chat = useChat({
  agentName: props.agentName,
  siteName: props.siteName,
  socketUrl: props.socketUrl,
})

const messages = chat.messages
const isStreaming = chat.isStreaming
const error = chat.error

const messagesRef = ref(null)
const inputRef = ref(null)
let isNearBottom = true

function handleScroll() {
  const el = messagesRef.value
  if (!el) return
  isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80
}

function scrollToBottom() {
  nextTick(() => {
    const el = messagesRef.value
    if (el && isNearBottom) {
      el.scrollTop = el.scrollHeight
    }
  })
}

watch(() => messages.value.length, scrollToBottom)
watch(
  () => {
    const last = messages.value[messages.value.length - 1]
    return last?.content?.length || 0
  },
  scrollToBottom
)

async function handleSend(text) {
  emit('message-sent', text)
  await chat.send(text)
}

function handleStop() {
  chat.cancelStreaming()
}

watch(
  () => chat.isStreaming.value,
  (streaming) => {
    if (!streaming && messages.value.length > 0) {
      // Wait for useChat's watcher to finalize the message (set isStreaming: false)
      nextTick(() => {
        const last = messages.value[messages.value.length - 1]
        if (last?.role === 'assistant') {
          emit('response-complete', last)
        }
      })
    }
  }
)

watch(
  () => chat.error.value,
  (err) => { if (err) emit('error', err) }
)

onMounted(() => {
  inputRef.value?.focus()
})

defineExpose({
  send: chat.send,
  clearMessages: chat.clearMessages,
  messages,
  isStreaming,
})
</script>

<style scoped>
.sc-chat {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  --sc-bg: var(--bg, #FAF9F5);
  --sc-bg-surface: var(--bg-surface, #FFFFFF);
  --sc-bg-hover: var(--bg-surface-hover, rgba(0,0,0,0.04));
  --sc-border: var(--border, #E8E6E1);
  --sc-text-primary: var(--text-primary, #1A1A1A);
  --sc-text-secondary: var(--text-secondary, #6B6B6B);
  --sc-text-muted: var(--text-muted, #9B9B9B);
  --sc-accent: var(--accent, #D97706);
  --sc-blue: var(--blue, #2563EB);
  --sc-green: var(--green, #16A34A);
  --sc-red: var(--red, #DC2626);
  --sc-user-bg: var(--user-bg, #F0EEE9);
}

.sc-chat--embedded {
  border: 1px solid var(--sc-border);
  border-radius: 12px;
  background: var(--sc-bg);
}

.sc-chat__messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  scroll-behavior: smooth;
  scrollbar-width: thin;
  scrollbar-color: transparent transparent;
}

.sc-chat__messages:hover {
  scrollbar-color: #cbd5e1 transparent;
}

.sc-chat__empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sc-chat__empty-text {
  color: var(--sc-text-muted);
  font-size: 14px;
}

.sc-chat__error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  margin: 0 12px;
  background: #FEF2F2;
  border: 1px solid #FECACA;
  border-radius: 8px;
  font-size: 12px;
  color: var(--sc-red);
}

.sc-chat__error-dismiss {
  border: none;
  background: none;
  color: var(--sc-red);
  font-size: 16px;
  cursor: pointer;
  padding: 0 4px;
}

.sc-chat__input-area {
  padding: 12px 16px 16px;
  flex-shrink: 0;
}
</style>
