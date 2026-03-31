<template>
  <div v-if="toolCalls?.length" class="sc-tools">
    <button class="sc-tools__header" @click="expanded = !expanded">
      <span>Tools</span>
      <span class="sc-tools__chevron" :class="{ 'is-expanded': expanded }">&#x25BC;</span>
    </button>
    <div class="sc-tools__list" :class="{ 'is-expanded': expanded }">
      <div
        v-for="(tc, idx) in toolCalls"
        :key="idx"
        class="sc-tools__item"
        :class="statusClass(tc.status)"
        @click="toggleDetail(idx)"
      >
        <div class="sc-tools__icon" :class="statusClass(tc.status)">
          <svg v-if="tc.status === 'running'" class="sc-tools__svg spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
          </svg>
          <svg v-else-if="tc.status === 'error'" class="sc-tools__svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
          <svg v-else class="sc-tools__svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>
        <div class="sc-tools__body">
          <span class="sc-tools__name">{{ formatToolName(tc.name) }}</span>
          <span v-if="tc.status === 'running'" class="sc-tools__duration sc-tools__duration--live">{{ liveDuration(tc) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onBeforeUnmount } from 'vue'

defineProps({
  toolCalls: { type: Array, default: () => [] },
  isStreaming: { type: Boolean, default: false },
})

const expanded = ref(true)
const openDetails = ref(new Set())
const tick = ref(0)
let timer = null

function startTick() { if (!timer) timer = setInterval(() => tick.value++, 1000) }
function stopTick() { if (timer) { clearInterval(timer); timer = null } }
startTick()
onBeforeUnmount(stopTick)

function toggleDetail(idx) {
  const next = new Set(openDetails.value)
  next.has(idx) ? next.delete(idx) : next.add(idx)
  openDetails.value = next
}

function statusClass(status) {
  if (status === 'running') return 'is-running'
  if (status === 'complete' || status === 'completed') return 'is-completed'
  if (status === 'error' || status === 'failed') return 'is-error'
  return ''
}

function formatToolName(name) {
  return name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function liveDuration(tc) {
  void tick.value
  if (!tc.startedAt) return ''
  const s = Math.floor((Date.now() - tc.startedAt) / 1000)
  return `${s}s`
}
</script>

<style scoped>
.sc-tools {
  margin: 6px 0 8px 0;
  position: relative;
}

.sc-tools__header {
  appearance: none;
  border: none;
  font-family: inherit;
  position: absolute;
  top: -7px;
  left: 8px;
  font-size: 9px;
  font-weight: 600;
  color: var(--sc-text-muted, #9ca3af);
  text-transform: uppercase;
  letter-spacing: 0.8px;
  background: var(--sc-bg, #FAF9F5);
  padding: 0 4px;
  z-index: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
}

.sc-tools__chevron {
  font-size: 8px;
  transition: transform 0.2s;
}

.sc-tools__chevron.is-expanded { transform: rotate(0deg); }
.sc-tools__chevron:not(.is-expanded) { transform: rotate(-90deg); }

.sc-tools__list {
  display: flex;
  flex-direction: column;
  max-height: 0;
  overflow: hidden;
  padding: 0 8px;
  border: 1.5px solid var(--sc-border, #e5e7eb);
  border-radius: 6px;
  transition: max-height 0.3s ease, padding 0.3s ease;
}

.sc-tools__list.is-expanded {
  max-height: 400px;
  overflow-y: auto;
  padding: 10px 8px 6px;
}

.sc-tools__item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 0;
  cursor: pointer;
}

.sc-tools__icon { width: 14px; height: 14px; flex-shrink: 0; }

.sc-tools__svg { width: 14px; height: 14px; }
.is-running .sc-tools__svg { stroke: var(--sc-blue, #2563EB); }
.is-completed .sc-tools__svg { stroke: var(--sc-green, #16A34A); }
.is-error .sc-tools__svg { stroke: var(--sc-red, #DC2626); }

.sc-tools__svg.spin { animation: sc-spin 1.5s linear infinite; }
@keyframes sc-spin { to { transform: rotate(360deg); } }

.sc-tools__body {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.sc-tools__name {
  font-size: 11px;
  font-weight: 500;
  color: var(--sc-text-secondary, #4b5563);
}

.is-running .sc-tools__name { color: var(--sc-blue, #2563EB); }
.is-completed .sc-tools__name { color: var(--sc-green, #16A34A); }
.is-error .sc-tools__name { color: var(--sc-red, #DC2626); }

.sc-tools__duration {
  font-size: 9px;
  color: var(--sc-text-muted, #b4b4b4);
  margin-left: auto;
  font-variant-numeric: tabular-nums;
}

.sc-tools__duration--live { color: var(--sc-blue, #2563EB); }
</style>
