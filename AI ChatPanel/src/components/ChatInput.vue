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
    <Transition name="sc-slash">
      <div v-if="slashMenuOpen" ref="slashMenuRef" class="sc-input__slash-menu">
        <div class="sc-input__slash-header">
          <span>Navigate</span>
          <span class="sc-input__slash-hint">Enter</span>
        </div>
        <button
          v-for="(item, index) in filteredNavigationItems"
          :key="item.id"
          type="button"
          class="sc-input__slash-item"
          :data-slash-index="index"
          :class="{ 'sc-input__slash-item--active': index === selectedSlashIndex }"
          @mousedown.prevent="navigateToItem(item)"
        >
          <span class="sc-input__slash-item-main">
            <span class="sc-input__slash-item-title">{{ item.title }}</span>
            <span class="sc-input__slash-item-command">/{{ item.slug }}</span>
          </span>
        </button>
      </div>
    </Transition>

    <!-- Toolbar footer -->
    <div class="sc-input__toolbar">
      <!-- Left: instance picker -->
      <div class="sc-input__toolbar-left">
        <div class="sc-input__instance-picker" ref="pickerRef">
          <button class="sc-input__instance-btn" @click="togglePicker" :title="activeInstanceLabel">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
            </svg>
            <span class="sc-input__instance-label">{{ activeInstanceLabel }}</span>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
          <Transition name="sc-picker">
            <div v-if="pickerOpen" class="sc-input__instance-dropdown">
              <div
                v-for="inst in instances"
                :key="inst.instance_id"
                class="sc-input__instance-option"
                :class="{ 'sc-input__instance-option--active': inst.instance_id === activeInstanceId }"
                @click="selectInstance(inst.instance_id)"
              >
                <span class="sc-input__instance-name">{{ inst.title || inst.instance_id }}</span>
                <span v-if="inst.message_count" class="sc-input__instance-count">&middot; {{ inst.message_count }}</span>
                <span class="sc-input__instance-spacer"></span>
                <button
                  v-if="instances.length > 1"
                  class="sc-input__instance-delete"
                  title="Delete chat"
                  @click.stop="deleteInstance(inst.instance_id)"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                  </svg>
                </button>
              </div>
              <button class="sc-input__instance-new" @click="createNewInstance">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <span>New chat</span>
              </button>
            </div>
          </Transition>
        </div>
      </div>

      <!-- Right: attach + stop/voice/send -->
      <div class="sc-input__toolbar-right">
        <button class="sc-input__btn" title="Attach" @click="$emit('attach')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
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
import { computed, ref, nextTick, onMounted, onUnmounted, watch } from 'vue'

const props = defineProps({
  placeholder: { type: String, default: 'Ask something...' },
  isStreaming: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  modelLabel: { type: String, default: '' },
  instances: { type: Array, default: () => [] },
  activeInstanceId: { type: String, default: 'default' },
  activeInstanceLabel: { type: String, default: 'Chat 1' },
})

const emit = defineEmits(['send', 'stop', 'attach', 'select-instance', 'create-instance', 'delete-instance', 'navigate'])

const editorRef = ref(null)
const pickerRef = ref(null)
const slashMenuRef = ref(null)
const hasContent = ref(false)
const pickerOpen = ref(false)
const editorText = ref('')
const navigationItems = ref([])
const selectedSlashIndex = ref(0)

function togglePicker() {
  pickerOpen.value = !pickerOpen.value
}

function selectInstance(instanceId) {
  emit('select-instance', instanceId)
  pickerOpen.value = false
}

function createNewInstance() {
  emit('create-instance')
  pickerOpen.value = false
}

function deleteInstance(instanceId) {
  emit('delete-instance', instanceId)
}

function onClickOutside(e) {
  if (pickerRef.value && !pickerRef.value.contains(e.target)) {
    pickerOpen.value = false
  }
}

function handleSidebarItems(event) {
  navigationItems.value = event.detail?.items || []
  selectedSlashIndex.value = 0
}

const filteredNavigationItems = computed(() => {
  const text = editorText.value.trim()
  if (!text.startsWith('/')) return []

  const query = text.slice(1).trim().toLowerCase()
  return navigationItems.value.filter((item) => {
    if (!query) return true
    const haystack = [item.slug, item.title, ...(item.keywords || [])]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return haystack.includes(query)
  })
})

const slashMenuOpen = computed(() => filteredNavigationItems.value.length > 0)

watch(filteredNavigationItems, (items) => {
  if (!items.length) {
    selectedSlashIndex.value = 0
    return
  }
  if (selectedSlashIndex.value > items.length - 1) {
    selectedSlashIndex.value = items.length - 1
  }
})

watch(selectedSlashIndex, async () => {
  if (!slashMenuOpen.value) return
  await nextTick()
  const menu = slashMenuRef.value
  if (!menu) return
  const active = menu.querySelector(`[data-slash-index="${selectedSlashIndex.value}"]`)
  if (!active) return
  active.scrollIntoView({ block: 'nearest' })
})

onMounted(() => {
  document.addEventListener('click', onClickOutside, true)
  if (typeof window !== 'undefined') {
    navigationItems.value = window.__SENA_TEMPLATE_SIDEBAR_ITEMS__ || []
    window.addEventListener('sena:sidebar-items', handleSidebarItems)
  }
})

onUnmounted(() => {
  document.removeEventListener('click', onClickOutside, true)
  if (typeof window !== 'undefined') {
    window.removeEventListener('sena:sidebar-items', handleSidebarItems)
  }
})

function handleInput() {
  editorText.value = editorRef.value?.textContent || ''
  hasContent.value = !!editorText.value.trim()
  selectedSlashIndex.value = 0
}

function handleKeydown(e) {
  if (slashMenuOpen.value) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      selectedSlashIndex.value = (selectedSlashIndex.value + 1) % filteredNavigationItems.value.length
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      selectedSlashIndex.value = (selectedSlashIndex.value - 1 + filteredNavigationItems.value.length) % filteredNavigationItems.value.length
      return
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      clearEditor()
      return
    }
  }

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
  nextTick(() => {
    editorText.value = editorRef.value?.textContent || ''
    hasContent.value = !!editorText.value.trim()
    selectedSlashIndex.value = 0
  })
}

function clearEditor() {
  if (editorRef.value) {
    editorRef.value.textContent = ''
  }
  editorText.value = ''
  hasContent.value = false
  selectedSlashIndex.value = 0
}

function navigateToItem(item) {
  emit('navigate', item.target || `/app/${item.slug}`)
  clearEditor()
  nextTick(() => editorRef.value?.focus())
}

function submit() {
  const text = editorRef.value?.textContent.trim()
  if (!text || props.isStreaming || props.disabled) return
  if (text.startsWith('/')) {
    const item = filteredNavigationItems.value[selectedSlashIndex.value] || filteredNavigationItems.value[0]
    if (item) {
      navigateToItem(item)
    }
    return
  }
  emit('send', text)
  clearEditor()
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
  border-color: var(--sc-border-focus, #B8B3A8);
  box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.03);
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

.sc-input__slash-menu {
  position: absolute;
  left: 50%;
  width: min(520px, calc(100% - 24px));
  bottom: calc(100% + 10px);
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: min(320px, calc(100vh - 160px));
  overflow-y: auto;
  padding: 8px;
  background: var(--sc-bg-surface, #FFFFFF);
  border: 1px solid var(--sc-border, #E0DDD8);
  border-radius: 12px;
  box-shadow:
    0 10px 28px rgba(15, 23, 42, 0.12),
    0 2px 8px rgba(15, 23, 42, 0.08);
  z-index: 20;
  scrollbar-width: thin;
}

.sc-input__slash-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 6px 8px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--sc-text-muted, #9B9B9B);
}

.sc-input__slash-hint {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 34px;
  height: 18px;
  padding: 0 6px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.7);
  color: var(--sc-text-faint, #94A3B8);
  font-size: 8px;
  letter-spacing: 0.08em;
}

.sc-input__slash-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  min-height: 42px;
  padding: 8px 10px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--sc-text-primary, #1A1A1A);
  cursor: pointer;
  text-align: left;
  font: inherit;
  transition: background 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
}

.sc-input__slash-item:hover,
.sc-input__slash-item--active {
  background: rgba(59, 130, 246, 0.09);
  box-shadow: inset 0 0 0 1px rgba(59, 130, 246, 0.14);
  transform: translateY(-1px);
}

.sc-input__slash-item-main {
  display: flex;
  align-items: baseline;
  gap: 10px;
  min-width: 0;
  width: 100%;
}

.sc-input__slash-item-command {
  font-size: 10px;
  font-weight: 700;
  color: #2563eb;
  letter-spacing: 0.04em;
  white-space: nowrap;
}

.sc-input__slash-item-title {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--sc-text-primary, #1E293B);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sc-slash-enter-active,
.sc-slash-leave-active {
  transition: opacity 0.16s ease, transform 0.16s ease;
}

.sc-slash-enter-from,
.sc-slash-leave-to {
  opacity: 0;
  transform: translateY(6px);
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

/* ── Instance picker ── */
.sc-input__instance-picker {
  position: relative;
}

.sc-input__instance-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--sc-text-muted, #9B9B9B);
  font-size: 11px;
  font-weight: 500;
  font-family: inherit;
  border-radius: 6px;
  transition: all 0.15s ease;
  white-space: nowrap;
  height: 24px;
}

.sc-input__instance-btn:hover {
  background: var(--sc-bg-hover, rgba(0, 0, 0, 0.04));
  color: var(--sc-text-secondary, #6B6B6B);
}

.sc-input__instance-label {
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sc-input__instance-dropdown {
  position: absolute;
  bottom: calc(100% + 6px);
  left: 0;
  min-width: 180px;
  max-height: 240px;
  overflow-y: auto;
  background: var(--sc-bg-surface, #FFFFFF);
  border: 1px solid var(--sc-border, #E0DDD8);
  border-radius: 10px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08), 0 1px 4px rgba(0, 0, 0, 0.04);
  padding: 4px;
  z-index: 100;
}

.sc-input__instance-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  color: var(--sc-text-primary, #1A1A1A);
  cursor: pointer;
  transition: background 0.1s ease;
}

.sc-input__instance-option:hover {
  background: var(--sc-bg-hover, rgba(0, 0, 0, 0.04));
}

.sc-input__instance-option--active {
  background: var(--sc-bg-hover, rgba(0, 0, 0, 0.04));
  font-weight: 600;
}

.sc-input__instance-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex-shrink: 1;
  min-width: 0;
}

.sc-input__instance-count {
  font-size: 10px;
  color: var(--sc-text-muted, #9B9B9B);
  font-weight: 500;
  flex-shrink: 0;
  white-space: nowrap;
}

.sc-input__instance-spacer {
  flex: 1;
}

.sc-input__instance-delete {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--sc-text-muted, #9B9B9B);
  border-radius: 4px;
  flex-shrink: 0;
  opacity: 0;
  transition: all 0.15s ease;
}

.sc-input__instance-option:hover .sc-input__instance-delete {
  opacity: 1;
}

.sc-input__instance-delete:hover {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.08);
}

.sc-input__instance-new {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 6px 10px;
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--sc-text-muted, #9B9B9B);
  font-size: 12px;
  font-weight: 500;
  font-family: inherit;
  border-radius: 6px;
  border-top: 1px solid var(--sc-border-light, rgba(0, 0, 0, 0.05));
  margin-top: 2px;
  padding-top: 8px;
  transition: all 0.15s ease;
}

.sc-input__instance-new:hover {
  background: var(--sc-bg-hover, rgba(0, 0, 0, 0.04));
  color: var(--sc-text-primary, #1A1A1A);
}

/* Picker transition */
.sc-picker-enter-active { transition: opacity 0.15s ease, transform 0.15s ease; }
.sc-picker-leave-active { transition: opacity 0.1s ease, transform 0.1s ease; }
.sc-picker-enter-from { opacity: 0; transform: translateY(4px); }
.sc-picker-leave-to { opacity: 0; transform: translateY(4px); }

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
