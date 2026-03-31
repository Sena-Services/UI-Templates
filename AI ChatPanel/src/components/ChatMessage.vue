<template>
  <div class="sc-message" :class="'sc-message--' + message.role">
    <!-- User message -->
    <div v-if="message.role === 'user'" class="sc-message__user">
      {{ message.content }}
    </div>

    <!-- Assistant message -->
    <AssistantMessage v-else-if="message.role === 'assistant'" :message="message" />
  </div>
</template>

<script setup>
import AssistantMessage from './AssistantMessage.vue'

defineProps({
  message: { type: Object, required: true },
})
</script>

<style scoped>
.sc-message {
  padding: 4px 0;
}

.sc-message--user {
  display: flex;
  justify-content: flex-end;
}

.sc-message__user {
  background: var(--sc-user-bg, #F0EEE9);
  color: var(--sc-text-primary, #1A1A1A);
  padding: 10px 14px;
  border-radius: 16px 16px 4px 16px;
  font-size: 14px;
  line-height: 1.5;
  max-width: 80%;
  word-wrap: break-word;
}
</style>
