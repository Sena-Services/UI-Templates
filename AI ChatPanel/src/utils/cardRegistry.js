import { shallowReactive } from 'vue'

/**
 * Card registry — maps component names to Vue components.
 *
 * Uses window.__senaCardRegistry as a singleton to avoid Vite module
 * duplication issues when sena-chat is aliased as a source import.
 *
 * Tool result convention:
 *   {
 *     "ok": true,
 *     "data": { ... },
 *     "ui_component": "deadline-list",
 *     "ui_props": { "assignments": [...] }
 *   }
 */
function getRegistry() {
  if (typeof window !== 'undefined') {
    if (!window.__senaCardRegistry) {
      window.__senaCardRegistry = shallowReactive({})
    }
    return window.__senaCardRegistry
  }
  return shallowReactive({})
}

export const cardRegistry = getRegistry()

export function registerCard(name, component) {
  cardRegistry[name] = component
}

export function registerCards(map) {
  for (const [name, component] of Object.entries(map)) {
    cardRegistry[name] = component
  }
}

export function resolveCard(name) {
  return cardRegistry[name] || null
}
