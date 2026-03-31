<template>
  <div class="sc-input" :class="{ 'sc-input--disabled': disabled }">
    <div
      ref="editorRef"
      class="sc-input__editor"
      contenteditable="true"
      :data-placeholder="placeholder"
      @keydown="handleKeydown"
      @input="handleInput"
    />
    <button
      v-if="isStreaming"
      class="sc-input__btn sc-input__btn--stop"
      title="Stop"
      @click="$emit('stop')"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
    </button>
    <button
      v-else
      class="sc-input__btn sc-input__btn--send"
      :disabled="!hasContent"
      title="Send"
      @click="submit"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
    </button>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue'

const props = defineProps({
  placeholder: { type: String, default: 'Ask something...' },
  isStreaming: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits(['send', 'stop'])

const editorRef = ref(null)
const hasContent = ref(false)

function handleInput() {
  hasContent.value = !!editorRef.value?.textContent.trim()
}

function handleKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    submit()
  }
}

function submit() {
  const text = editorRef.value?.textContent.trim()
  if (!text || props.isStreaming || props.disabled) return
  emit('send', text)
  editorRef.value.textContent = ''
  hasContent.value = false
  nextTick(() => editorRef.value?.focus())
}

function focus() {
  editorRef.value?.focus()
}

defineExpose({ focus })
</script>

<style scoped>
.sc-input {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 10px 12px;
  border: 1.5px solid var(--sc-border, #E8E6E1);
  border-radius: 12px;
  background: var(--sc-bg-surface, #FFFFFF);
  transition: border-color 0.15s;
}

.sc-input:focus-within {
  border-color: var(--sc-accent, #D97706);
}

.sc-input--disabled {
  opacity: 0.5;
  pointer-events: none;
}

.sc-input__editor {
  flex: 1;
  min-height: 20px;
  max-height: 120px;
  overflow-y: auto;
  font-size: 14px;
  line-height: 1.5;
  color: var(--sc-text-primary, #1A1A1A);
  outline: none;
  word-wrap: break-word;
}

.sc-input__editor:empty::before {
  content: attr(data-placeholder);
  color: var(--sc-text-muted, #9B9B9B);
  pointer-events: none;
}

.sc-input__btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.1s;
}

.sc-input__btn--send {
  background: var(--sc-accent, #D97706);
  color: white;
}

.sc-input__btn--send:disabled {
  opacity: 0.3;
  cursor: default;
}

.sc-input__btn--send:not(:disabled):hover {
  opacity: 0.85;
}

.sc-input__btn--stop {
  background: var(--sc-red, #DC2626);
  color: white;
}

.sc-input__btn--stop:hover {
  opacity: 0.85;
}
</style>
