<template>
  <div class="sa-bar">
    <div class="sa-bar__inner">
      <ChatInput
        ref="inputRef"
        :placeholder="placeholder"
        :is-streaming="isStreaming"
        :disabled="disabled"
        @send="$emit('send', $event)"
        @stop="$emit('stop')"
      />
    </div>
  </div>
</template>

<script setup>
import ChatInput from './ChatInput.vue'
import { ref } from 'vue'

defineProps({
  placeholder: { type: String, default: 'Ask something...' },
  isStreaming: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
})

defineEmits(['send', 'stop'])

const inputRef = ref(null)

function focus() {
  inputRef.value?.focus()
}

defineExpose({ focus })
</script>

<style scoped>
.sa-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 12px 16px 16px;
  pointer-events: none;
  z-index: 10;
}

.sa-bar__inner {
  max-width: clamp(480px, 55vw, 720px);
  margin: 0 auto;
  pointer-events: auto;
  background: var(--sa-bg-surface, #FFFFFF);
  border-radius: 14px;
  box-shadow: 0 2px 20px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.04);
}
</style>
