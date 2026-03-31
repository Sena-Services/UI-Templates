<template>
  <div v-if="thinkingText || (isStreaming && isThinking)" class="sc-thinking">
    <button class="sc-thinking__toggle" @click="open = !open">
      <svg class="sc-thinking__icon" :class="{ 'sc-thinking__icon--active': isStreaming && isThinking }" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
      </svg>
      <span class="sc-thinking__label">
        {{ isStreaming && isThinking ? 'Thinking...' : 'Reasoning' }}
      </span>
      <span class="sc-thinking__chevron" :class="{ 'sc-thinking__chevron--open': open }">&#x25BC;</span>
    </button>
    <div v-if="open" class="sc-thinking__body">{{ thinkingText }}</div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

defineProps({
  thinkingText: { type: String, default: '' },
  isStreaming: { type: Boolean, default: false },
  isThinking: { type: Boolean, default: false },
})

const open = ref(false)
</script>

<style scoped>
.sc-thinking {
  margin: 4px 0 8px 0;
}

.sc-thinking__toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--sc-text-muted, #9B9B9B);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.1s;
}

.sc-thinking__toggle:hover {
  background: var(--sc-bg-hover, rgba(0,0,0,0.04));
}

.sc-thinking__icon--active {
  animation: sc-pulse 1.5s ease-in-out infinite;
}

@keyframes sc-pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}

.sc-thinking__chevron {
  font-size: 8px;
  transition: transform 0.15s;
}

.sc-thinking__chevron--open {
  transform: rotate(0deg);
}

.sc-thinking__chevron:not(.sc-thinking__chevron--open) {
  transform: rotate(-90deg);
}

.sc-thinking__body {
  font-size: 12px;
  color: var(--sc-text-muted, #9B9B9B);
  line-height: 1.6;
  padding: 6px 8px;
  max-height: 200px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
