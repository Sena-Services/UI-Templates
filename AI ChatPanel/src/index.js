// Full chat panel (sidebar pattern)
export { default as SenaChat } from './components/SenaChat.vue'

// Docked overlay (business-first pattern)
export { default as AgentOverlay } from './components/AgentOverlay.vue'
export { default as ChatBar } from './components/ChatBar.vue'
export { default as ResponseOverlay } from './components/ResponseOverlay.vue'

// Shared components
export { default as ChatMessage } from './components/ChatMessage.vue'
export { default as AssistantMessage } from './components/AssistantMessage.vue'
export { default as ChatInput } from './components/ChatInput.vue'
export { default as ThinkingSection } from './components/ThinkingSection.vue'
export { default as ToolCallTimeline } from './components/ToolCallTimeline.vue'
export { default as ResultCard } from './components/ResultCard.vue'

// Composables
export { useChat } from './composables/useChat'
export { useSocket } from './composables/useSocket'
export { useStreaming } from './composables/useStreaming'

// Utils
export { cardRegistry, registerCard, registerCards } from './utils/cardRegistry'
export { renderMarkdown, escapeHtml, sanitizeUrl } from './utils/markdown'
