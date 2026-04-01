<template>
  <div class="sc-input">
    <!-- Model label on top border -->
    <div class="sc-input__border-labels">
      <div v-if="modelLabel" class="sc-input__border-label">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="6" y="6" width="12" height="12" rx="2" />
          <line x1="9" y1="6" x2="9" y2="3" /><line x1="12" y1="6" x2="12" y2="3" /><line x1="15" y1="6" x2="15" y2="3" />
          <line x1="9" y1="21" x2="9" y2="18" /><line x1="12" y1="21" x2="12" y2="18" /><line x1="15" y1="21" x2="15" y2="18" />
          <line x1="6" y1="9" x2="3" y2="9" /><line x1="6" y1="12" x2="3" y2="12" /><line x1="6" y1="15" x2="3" y2="15" />
          <line x1="21" y1="9" x2="18" y2="9" /><line x1="21" y1="12" x2="18" y2="12" /><line x1="21" y1="15" x2="18" y2="15" />
        </svg>
        <span>{{ modelLabel }}</span>
      </div>
    </div>

    <!-- Editable area -->
    <div class="sc-input__textarea">
      <div
        ref="editorRef"
        class="sc-input__editable"
        :class="{ 'sc-input__editable--empty': !hasContent }"
        :data-placeholder="placeholder"
        contenteditable="true"
        @input="handleInput"
        @keydown="handleKeydown"
        @paste="handlePaste"
      />
    </div>

    <!-- Toolbar footer -->
    <div class="sc-input__toolbar">
      <div class="sc-input__toolbar-left">
        <button class="sc-input__btn" title="Attach" @click="$emit('attach')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>
      <div class="sc-input__toolbar-right">
        <!-- Stop streaming -->
        <button v-if="isStreaming" class="sc-input__btn sc-input__btn--stop" @click="$emit('stop')">
          <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
            <rect x="6" y="6" width="8" height="8" rx="1" />
          </svg>
        </button>
        <template v-else>
          <!-- Voice waves (idle) -->
          <button v-if="!hasContent" class="sc-input__btn sc-input__btn--voice" title="Voice input">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <line x1="4" y1="8" x2="4" y2="16" /><line x1="8" y1="5" x2="8" y2="19" />
              <line x1="12" y1="3" x2="12" y2="21" /><line x1="16" y1="5" x2="16" y2="19" />
              <line x1="20" y1="8" x2="20" y2="16" />
            </svg>
          </button>
          <!-- Send arrow -->
          <button v-else class="sc-input__btn sc-input__btn--send" :disabled="disabled" title="Send" @click="submit">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" />
            </svg>
          </button>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue'

const props = defineProps({
  placeholder: { type: String, default: 'Ask something...' },
  isStreaming: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  modelLabel: { type: String, default: '' },
})

const emit = defineEmits(['send', 'stop', 'attach'])

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

function handlePaste(e) {
  e.preventDefault()
  const text = e.clipboardData.getData('text/plain')
  const sel = window.getSelection()
  if (sel.rangeCount) {
    const range = sel.getRangeAt(0)
    range.deleteContents()
    range.insertNode(document.createTextNode(text))
    range.collapse(false)
    sel.removeAllRanges()
    sel.addRange(range)
  }
  nextTick(() => { hasContent.value = !!editorRef.value?.textContent.trim() })
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
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: 40px;
  border: 1px solid var(--sc-border, #E0DDD8);
  border-radius: 12px;
  background: var(--sc-bg-surface, #FFFFFF);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  overflow: visible;
}

.sc-input:hover {
  border-color: var(--sc-border-hover, #CCC9C2);
}

.sc-input:focus-within {
  border-color: var(--sc-accent, #2563EB);
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.08);
}

/* ── Model label on top border ── */
.sc-input__border-labels {
  position: absolute;
  top: -1px;
  left: 16px;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  gap: 6px;
  z-index: 2;
}

.sc-input__border-label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 7px;
  border-radius: 4px;
  font-size: 9px;
  font-weight: 600;
  color: var(--sc-text-muted, #9B9B9B);
  text-transform: uppercase;
  letter-spacing: 0.4px;
  border: 1px solid var(--sc-border, #E0DDD8);
  background: var(--sc-bg, #FAFAF5);
  line-height: 1;
  white-space: nowrap;
  height: 16px;
}

.sc-input__border-label svg {
  flex-shrink: 0;
  opacity: 0.5;
}

/* ── Editable area ── */
.sc-input__textarea {
  flex: 1;
  padding: 10px 14px 6px;
  overflow: hidden;
}

.sc-input__editable {
  width: 100%;
  min-height: 20px;
  max-height: 200px;
  overflow-y: auto;
  outline: none;
  white-space: pre-wrap;
  word-wrap: break-word;
  font-size: 15px;
  font-family: inherit;
  color: var(--sc-text-primary, #1A1A1A);
  line-height: 1.65;
  background: transparent;
  border: none;
}

.sc-input__editable--empty::before {
  content: attr(data-placeholder);
  color: var(--sc-text-muted, #9B9B9B);
  font-size: 15px;
  line-height: 1.65;
  pointer-events: none;
  position: absolute;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: calc(100% - 28px);
}

/* ── Toolbar footer ── */
.sc-input__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 28px;
  padding: 0 6px;
  flex-shrink: 0;
  border-top: 1px solid var(--sc-border-light, rgba(0, 0, 0, 0.05));
  border-radius: 0 0 11px 11px;
}

.sc-input__toolbar-left,
.sc-input__toolbar-right {
  display: flex;
  align-items: center;
  gap: 2px;
}

/* ── Toolbar buttons ── */
.sc-input__btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--sc-text-muted, #9B9B9B);
  border-radius: 8px;
  transition: all 0.2s ease;
  outline: none;
}

.sc-input__btn:hover {
  background: var(--sc-bg-hover, rgba(0, 0, 0, 0.04));
  color: var(--sc-text-secondary, #6B6B6B);
}

.sc-input__btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* Send — clean arrow */
.sc-input__btn--send {
  color: var(--sc-text-primary, #1A1A1A);
}

.sc-input__btn--send:hover {
  transform: translateY(-1px);
}

.sc-input__btn--send:active {
  transform: scale(0.92);
}

/* Stop — filled circle */
.sc-input__btn--stop {
  background: var(--sc-bg-hover, rgba(0, 0, 0, 0.06));
  border-radius: 50%;
  color: var(--sc-text-primary, #1A1A1A);
}

.sc-input__btn--stop:hover {
  background: rgba(0, 0, 0, 0.1);
}

/* Voice — muted waves */
.sc-input__btn--voice {
  color: var(--sc-text-muted, #9B9B9B);
}

.sc-input__btn--voice svg line {
  opacity: 0.5;
}
</style>
