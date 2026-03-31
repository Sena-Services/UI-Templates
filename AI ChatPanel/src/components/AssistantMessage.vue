<template>
  <div class="sc-assistant">
    <ThinkingSection
      :thinking-text="message.thinkingText"
      :is-streaming="message.isStreaming"
      :is-thinking="message.isThinking"
    />

    <ToolCallTimeline
      :tool-calls="message.toolCalls"
      :is-streaming="message.isStreaming"
    />

    <ResultCard :tool-calls="message.toolCalls" />

    <div
      class="sc-assistant__text"
      :class="{ 'sc-assistant__text--streaming': message.isStreaming && message.content }"
      v-html="renderedContent"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import ThinkingSection from './ThinkingSection.vue'
import ToolCallTimeline from './ToolCallTimeline.vue'
import ResultCard from './ResultCard.vue'
import { renderMarkdown } from '../utils/markdown'

const props = defineProps({
  message: { type: Object, required: true },
})

const renderedContent = computed(() => {
  if (!props.message.content) return ''
  return renderMarkdown(props.message.content)
})
</script>

<style scoped>
.sc-assistant {
  width: 100%;
  overflow: hidden;
}

.sc-assistant__text {
  font-size: 14px;
  line-height: 1.7;
  color: var(--sc-text-primary, #1A1A1A);
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.sc-assistant__text :deep(p) { margin: 0 0 0.5em; }
.sc-assistant__text :deep(p:last-child) { margin-bottom: 0; }

.sc-assistant__text :deep(.sc-code-block) {
  background: var(--sc-text-primary, #1A1A1A);
  color: #e2e8f0;
  padding: 12px 16px;
  border-radius: 8px;
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 12px;
  line-height: 1.5;
  overflow-x: auto;
  margin: 8px 0;
  white-space: pre;
}

.sc-assistant__text :deep(.sc-inline-code) {
  background: var(--sc-bg-hover, rgba(0,0,0,0.06));
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 12px;
}

.sc-assistant__text :deep(.sc-list) {
  margin: 0.25em 0 0.5em;
  padding-left: 1.5em;
}

.sc-assistant__text :deep(a) {
  color: var(--sc-blue, #2563EB);
  text-decoration: underline;
}

.sc-assistant__text :deep(strong) { font-weight: 600; }
.sc-assistant__text :deep(em) { font-style: italic; }

.sc-assistant__text--streaming :deep(*:last-child)::after,
.sc-assistant__text--streaming:not(:has(*))::after {
  content: '';
  display: inline-block;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--sc-text-muted, #9ca3af);
  margin-left: 4px;
  vertical-align: middle;
  animation: sc-cursor-pulse 1.4s ease-in-out infinite;
}

@keyframes sc-cursor-pulse {
  0%, 100% { opacity: 0.3; transform: scale(0.85); }
  50% { opacity: 0.9; transform: scale(1); }
}
</style>
