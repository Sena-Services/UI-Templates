<template>
  <div class="sc-message" :class="'sc-message--' + message.role">
    <!-- User message -->
    <div v-if="message.role === 'user'" class="sc-message__user-card">
      <div class="sc-message__user-text">{{ message.content }}</div>
      <div class="sc-message__user-footer">
        <div v-if="formattedTime" class="sc-message__user-time">
          <svg width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{{ formattedTime }}</span>
        </div>
        <div class="sc-message__spacer"></div>
        <button
          v-if="message.content"
          class="sc-message__user-copy"
          @click="copyContent"
          title="Copy message"
        >
          <svg width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <span v-if="!copied">Copy</span>
          <span v-else class="sc-message__copied">Copied</span>
        </button>
      </div>
    </div>

    <!-- Assistant message -->
    <AssistantMessage v-else-if="message.role === 'assistant'" :message="message" />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import AssistantMessage from './AssistantMessage.vue'

const props = defineProps({
  message: { type: Object, required: true },
})

const copied = ref(false)

const formattedTime = computed(() => {
  if (!props.message.timestamp) return ''
  const d = new Date(props.message.timestamp)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
})

async function copyContent() {
  if (!props.message.content) return
  try {
    await navigator.clipboard.writeText(props.message.content)
  } catch {
    // fallback
    const ta = document.createElement('textarea')
    ta.value = props.message.content
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
  }
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}
</script>

<style scoped>
.sc-message {
  padding: 4px 0;
}

.sc-message--user {
  display: flex;
  justify-content: flex-end;
  margin-bottom: -6px;
}

.sc-message--assistant {
  margin-bottom: 16px;
}

/* ── User card ── */
.sc-message__user-card {
  background: transparent;
  padding: 6px 12px 4px 12px;
  border-radius: 12px;
  border: 1px solid var(--sc-border, #E0DDD8);
  min-width: 60px;
  max-width: 520px;
  display: flex;
  flex-direction: column;
}

.sc-message__user-text {
  font-size: 15px;
  color: var(--sc-text-primary, #1A1A1A);
  line-height: 1.5;
  padding-bottom: 8px;
  white-space: pre-wrap;
  word-wrap: break-word;
  overflow-wrap: break-word;
  word-break: break-word;
  font-weight: 500;
  -webkit-font-smoothing: antialiased;
}

/* ── Footer ── */
.sc-message__user-footer {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 2px;
  padding-top: 2px;
  min-height: 14px;
  border-top: 1px solid var(--sc-border-light, rgba(0, 0, 0, 0.06));
}

.sc-message__spacer {
  flex: 1;
}

/* ── Timestamp ── */
.sc-message__user-time {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: default;
}

.sc-message__user-time svg {
  flex-shrink: 0;
  color: var(--sc-text-muted, #9B9B9B);
}

.sc-message__user-time span {
  font-size: 10px;
  font-weight: 500;
  line-height: 10px;
  letter-spacing: -0.01em;
  color: var(--sc-text-muted, #9B9B9B);
  white-space: nowrap;
}

/* ── Copy button ── */
.sc-message__user-copy {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--sc-text-muted, #9B9B9B);
  font-size: 10px;
  font-family: inherit;
  line-height: 10px;
  letter-spacing: -0.01em;
  border-radius: 4px;
  transition: color 0.2s ease, background 0.2s ease;
  min-width: 46px;
  justify-content: center;
  white-space: nowrap;
}

.sc-message__user-copy:hover {
  color: var(--sc-text-secondary, #6B6B6B);
  background: var(--sc-bg-hover, rgba(0, 0, 0, 0.04));
}

.sc-message__copied {
  color: #059669;
}
</style>
