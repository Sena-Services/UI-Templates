<template>
  <Transition name="sa-overlay">
    <div v-if="visible && message" class="sa-overlay" @click.self="$emit('dismiss')">
      <div class="sa-overlay__panel" ref="panelRef">
        <div class="sa-overlay__header">
          <span class="sa-overlay__title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
            Assistant
          </span>
          <button class="sa-overlay__close" @click="$emit('dismiss')" title="Dismiss">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="sa-overlay__body" ref="bodyRef">
          <AssistantMessage :message="message" />
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, watch, nextTick, onMounted, onUnmounted } from 'vue'
import AssistantMessage from './AssistantMessage.vue'

const props = defineProps({
  message: { type: Object, default: null },
  visible: { type: Boolean, default: false },
})

defineEmits(['dismiss'])

const bodyRef = ref(null)
const panelRef = ref(null)

function scrollToBottom() {
  nextTick(() => {
    const el = bodyRef.value
    if (el) el.scrollTop = el.scrollHeight
  })
}

watch(() => props.message?.content?.length, scrollToBottom)
watch(() => props.message?.toolCalls?.length, scrollToBottom)
watch(() => props.visible, (v) => { if (v) scrollToBottom() })

function onKeydown(e) {
  if (e.key === 'Escape' && props.visible) {
    e.preventDefault()
    // Only dismiss if not streaming
    if (!props.message?.isStreaming) {
      // emit is not directly callable here, use the component instance
    }
  }
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))
</script>

<style scoped>
.sa-overlay {
  position: absolute;
  bottom: 70px;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  padding: 0 16px;
  z-index: 9;
  pointer-events: none;
}

.sa-overlay__panel {
  max-width: clamp(480px, 55vw, 720px);
  width: 100%;
  max-height: 50vh;
  background: var(--sa-bg-surface, #FFFFFF);
  border-radius: 14px;
  box-shadow: 0 4px 32px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.04);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  pointer-events: auto;
}

.sa-overlay__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-bottom: 1px solid var(--sa-border, #E8E6E1);
  flex-shrink: 0;
}

.sa-overlay__title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 600;
  color: var(--sa-text-secondary, #6B6B6B);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.sa-overlay__title svg {
  opacity: 0.5;
}

.sa-overlay__close {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--sa-text-muted, #9B9B9B);
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sa-overlay__close:hover {
  color: var(--sa-text-primary, #1A1A1A);
  background: var(--sa-bg-hover, rgba(0, 0, 0, 0.04));
}

.sa-overlay__body {
  overflow-y: auto;
  padding: 14px 16px;
  scrollbar-width: thin;
  scrollbar-color: transparent transparent;
}

.sa-overlay__body:hover {
  scrollbar-color: #cbd5e1 transparent;
}

/* Transition */
.sa-overlay-enter-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.sa-overlay-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.sa-overlay-enter-from {
  opacity: 0;
  transform: translateY(12px);
}
.sa-overlay-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
