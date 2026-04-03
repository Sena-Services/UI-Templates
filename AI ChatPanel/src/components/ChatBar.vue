<template>
  <div class="ao-bar">
    <div class="ao-bar__inner">
      <ChatInput
        ref="inputRef"
        :placeholder="placeholder"
        :is-streaming="isStreaming"
        :disabled="disabled"
        :model-label="modelLabel"
        :instances="instances"
        :active-instance-id="activeInstanceId"
        :active-instance-label="activeInstanceLabel"
        @send="$emit('send', $event)"
        @stop="$emit('stop')"
        @attach="$emit('attach')"
        @select-instance="$emit('select-instance', $event)"
        @create-instance="$emit('create-instance')"
        @delete-instance="$emit('delete-instance', $event)"
        @navigate="$emit('navigate', $event)"
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
  instances: { type: Array, default: () => [] },
  activeInstanceId: { type: String, default: 'default' },
  activeInstanceLabel: { type: String, default: 'Chat 1' },
})

defineEmits(['send', 'stop', 'attach', 'select-instance', 'create-instance', 'delete-instance', 'navigate'])

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
