<template>
  <div v-if="cards.length" class="sc-result-cards">
    <component
      v-for="(card, i) in cards"
      :key="'card-' + i"
      :is="card.component"
      v-bind="card.props"
      class="sc-result-card"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { resolveCard } from '../utils/cardRegistry'

const props = defineProps({
  toolCalls: { type: Array, default: () => [] },
})

const cards = computed(() => {
  if (!props.toolCalls?.length) return []

  return props.toolCalls
    .filter(tc => tc.status === 'complete' || tc.status === 'completed')
    .map(tc => {
      if (!tc.result) return null
      try {
        const result = JSON.parse(tc.result)
        if (!result.ui_component) return null
        const component = resolveCard(result.ui_component)
        if (!component) return null
        return {
          component,
          props: result.ui_props || result.data || {},
        }
      } catch {
        return null
      }
    })
    .filter(Boolean)
})
</script>

<style scoped>
.sc-result-cards {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 8px 0;
}

.sc-result-card {
  border: 1px solid var(--sc-border, #e5e7eb);
  border-radius: 8px;
  overflow: hidden;
}
</style>
