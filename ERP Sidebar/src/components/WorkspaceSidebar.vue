<template>
  <nav class="sidebar" :class="{ 'sidebar--collapsed': collapsed }">
    <div class="sidebar__header">
      <div v-if="!collapsed" class="sidebar__brand">
        <div class="sidebar__logo">
          <span v-if="brandGlyph" class="sidebar__logo-glyph">{{ brandGlyph }}</span>
          <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
        </div>
        <span class="sidebar__title">{{ brandTitle }}</span>
      </div>
      <button class="sidebar__toggle" :title="collapsed ? 'Expand' : 'Collapse'" @click="collapsed = !collapsed">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline v-if="collapsed" points="9 18 15 12 9 6" />
          <polyline v-else points="15 18 9 12 15 6" />
        </svg>
      </button>
    </div>

    <div class="sidebar__nav">
      <template v-for="section in renderedSections" :key="section.label || 'default'">
        <div v-if="!collapsed && section.label" class="sidebar__label">{{ section.label }}</div>
        <div
          v-for="item in section.items"
          :key="item.id || item.slug || item.title"
          class="sidebar__item"
          :class="{ 'sidebar__item--active': active === item.activeKey }"
          :title="item.title"
          @click="selectItem(item)"
        >
          <img
            v-if="item.iconUrl"
            class="sidebar__icon"
            :src="item.iconUrl"
            :alt="item.title"
            @error="onIconError"
          />
          <svg v-else-if="item.icon === 'upload'" class="sidebar__tool-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
          </svg>
          <span v-else class="sidebar__glyph">{{ item.glyph || item.title.charAt(0) }}</span>
          <span v-if="!collapsed" class="sidebar__text">{{ item.title }}</span>
        </div>
      </template>
    </div>
  </nav>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'

const emit = defineEmits(['select'])

const props = defineProps({
  active: { type: String, default: null },
  brandTitle: { type: String, default: 'ERP' },
  brandGlyph: { type: String, default: '' },
  sections: { type: Array, default: null },
  tools: {
    type: Array,
    default: () => [
      { title: 'Data Migration', slug: 'data-import', icon: 'upload' },
    ],
  },
  workspacesApi: {
    type: String,
    default: '/api/method/frappe.desk.desktop.get_workspace_sidebar_items',
  },
  workspaceFilter: {
    type: Function,
    default: (page) => page.app === 'erpnext' && page.title !== 'Home',
  },
})

const workspaces = ref([])
const collapsed = ref(false)
const resolvedTools = computed(() => props.tools || [])
const fallbackSections = computed(() => [
  {
    label: 'Modules',
    items: workspaces.value.map((workspace) => ({
      id: `module:${toSlug(workspace.title)}`,
      title: workspace.title,
      slug: toSlug(workspace.title),
      target: toSlug(workspace.title),
      activeKey: toSlug(workspace.title),
      kind: 'module',
      keywords: [workspace.title, toSlug(workspace.title)],
      iconUrl: iconUrl(workspace.title),
    })),
  },
  {
    label: 'Tools',
    items: resolvedTools.value.map((tool) => ({
      id: `tool:${tool.slug}`,
      title: tool.title,
      slug: tool.slug,
      target: tool.target || tool.slug,
      activeKey: tool.activeKey || tool.slug,
      kind: 'tool',
      keywords: [tool.title, tool.slug],
      icon: tool.icon,
      glyph: tool.glyph,
    })),
  },
])

const renderedSections = computed(() => {
  if (Array.isArray(props.sections) && props.sections.length) {
    return props.sections.map((section) => ({
      label: section.label || '',
      items: (section.items || []).map((item) => ({
        ...item,
        activeKey: item.activeKey || item.slug || item.target,
        target: item.target || item.slug,
        kind: item.kind || 'item',
        keywords: item.keywords || [item.title, item.slug, item.target].filter(Boolean),
      })),
    }))
  }
  return fallbackSections.value
})

const sidebarItems = computed(() => renderedSections.value.flatMap((section) => section.items))

function toSlug(title) {
  return title.toLowerCase().replace(/\s+/g, '-')
}

function iconUrl(title) {
  const scrubbed = title.toLowerCase().replace(/\s+/g, '_')
  return `/assets/erpnext/icons/desktop_icons/subtle/${scrubbed}.svg`
}

function onIconError(event) {
  event.target.style.display = 'none'
}

function selectItem(item) {
  emit('select', item.target || item.slug || item.title)
}

function publishSidebarItems() {
  if (typeof window === 'undefined') return
  const items = sidebarItems.value
  window.__SENA_TEMPLATE_SIDEBAR_ITEMS__ = items
  window.dispatchEvent(new CustomEvent('sena:sidebar-items', { detail: { items } }))
}

onMounted(async () => {
  if (!props.sections?.length) {
    try {
      const res = await fetch(props.workspacesApi, {
        credentials: 'same-origin',
      })
      const json = await res.json()
      const pages = json.message?.pages || []
      workspaces.value = pages.filter(props.workspaceFilter)
    } catch (err) {
      console.error('Failed to load workspaces:', err)
    }
  }
  publishSidebarItems()
})

watch(sidebarItems, publishSidebarItems, { deep: true })
</script>

<style scoped>
.sidebar {
  width: 200px;
  background: #FAFAFA;
  border-right: 1px solid #E8E6E1;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  transition: width 0.2s ease;
  overflow: hidden;
}

.sidebar--collapsed {
  width: 48px;
}

.sidebar__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  border-bottom: 1px solid #E8E6E1;
  min-height: 48px;
}

.sidebar__brand {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sidebar__logo {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  background: #1E293B;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
}

.sidebar__logo svg {
  width: 14px;
  height: 14px;
}

.sidebar__logo-glyph {
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
}

.sidebar__title {
  font-size: 13px;
  font-weight: 700;
  color: #1E293B;
  letter-spacing: -0.02em;
}

.sidebar__toggle {
  background: none;
  border: none;
  cursor: pointer;
  color: #94A3B8;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.sidebar__toggle:hover {
  color: #1E293B;
  background: rgba(0, 0, 0, 0.04);
}

.sidebar__nav {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
  scrollbar-width: thin;
  scrollbar-color: transparent transparent;
}

.sidebar__nav:hover {
  scrollbar-color: #cbd5e1 transparent;
}

.sidebar__label {
  font-size: 9px;
  font-weight: 700;
  color: #94A3B8;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  padding: 4px 14px 6px;
}

.sidebar__item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 14px;
  cursor: pointer;
  font-size: 12.5px;
  font-weight: 500;
  color: #64748B;
  transition: all 0.1s;
  border-left: 2px solid transparent;
}

.sidebar--collapsed .sidebar__item {
  justify-content: center;
  padding: 8px;
  border-left: none;
}

.sidebar__item:hover {
  color: #334155;
  background: rgba(0, 0, 0, 0.03);
}

.sidebar__item--active {
  color: #1E293B;
  font-weight: 600;
  background: rgba(59, 130, 246, 0.06);
  border-left-color: #3B82F6;
}

.sidebar--collapsed .sidebar__item--active {
  border-left-color: transparent;
  background: rgba(59, 130, 246, 0.1);
  border-radius: 6px;
  margin: 0 4px;
  padding: 8px 4px;
}

.sidebar__icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  opacity: 0.6;
}

.sidebar__item--active .sidebar__icon {
  opacity: 0.9;
}

.sidebar__glyph,
.sidebar__tool-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  opacity: 0.7;
  font-size: 10px;
  font-weight: 700;
}

.sidebar__text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
