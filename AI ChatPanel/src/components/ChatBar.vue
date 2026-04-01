<template>
  <div class="ao-bar">
    <div class="ao-bar__inner">
      <ChatInput
        ref="inputRef"
        :placeholder="placeholder"
        :is-streaming="isStreaming"
        :disabled="disabled"
        :model-label="modelLabel"
        @send="$emit('send', $event)"
        @stop="$emit('stop')"
        @attach="$emit('attach')"
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
  modelLabel: { type: String, default: '' },
})

defineEmits(['send', 'stop', 'attach'])

const inputRef = ref(null)

function focus() {
  inputRef.value?.focus()
}

defineExpose({ focus })
</script>

<style scoped>
.ao-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 12px 16px 16px;
  pointer-events: none;
  z-index: 10;
}

.ao-bar__inner {
  max-width: clamp(480px, 55vw, 720px);
  margin: 0 auto;
  pointer-events: auto;
}
</style>
