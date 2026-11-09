<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ChevronDown, ChevronRight, Folder, FolderOpen, Hash } from 'lucide-vue-next'
import type { TagCount } from '@/lib/types'
import {
  buildTagTree,
  collectFolderPaths,
  defaultExpanded,
  filterTagTree,
  flattenTagTree,
  tagQuery,
  type TagTreeNode,
} from '@/lib/tagTree'
import { staggerDelay } from '@/lib/motion'

const props = withDefaults(
  defineProps<{
    tags: TagCount[]
    keyword?: string
    variant?: 'vault' | 'magazine'
  }>(),
  { keyword: '', variant: 'vault' },
)

const tree = computed(() => buildTagTree(props.tags))
const visible = computed(() => filterTagTree(tree.value, props.keyword))
const expanded = ref<Set<string>>(new Set())

/* 首次载入展开根级文件夹；之后保留用户手动的展开状态 */
watch(
  tree,
  (nodes) => {
    if (nodes.length && !expanded.value.size) expanded.value = new Set(defaultExpanded(nodes))
  },
  { immediate: true },
)

const rows = computed(() => flattenTagTree(visible.value, expanded.value, props.keyword))
const maxCount = computed(() => Math.max(1, ...rows.value.map((row) => row.node.subtreeCount)))
const folderPaths = computed(() => collectFolderPaths(tree.value))
const allExpanded = computed(
  () => folderPaths.value.size > 0 && [...folderPaths.value].every((p) => expanded.value.has(p)),
)

function isFolder(node: TagTreeNode) {
  return node.children.length > 0
}

function toggle(path: string) {
  const next = new Set(expanded.value)
  if (next.has(path)) next.delete(path)
  else next.add(path)
  expanded.value = next
}

function toggleAll() {
  expanded.value = allExpanded.value ? new Set() : new Set(folderPaths.value)
}

function target(node: TagTreeNode) {
  return { name: 'messages', query: tagQuery(node) }
}

function exactTarget(node: TagTreeNode) {
  return { name: 'messages', query: { tag: node.path } }
}
</script>

<template>
  <div>
    <div
      class="mb-2 flex items-center gap-3 font-mono text-[10px] tracking-[0.14em] text-steam-dim/70"
      :class="variant === 'vault' ? 'px-4' : 'border-t border-ink-line pt-3'"
    >
      <span class="flex-1">类目 / 文件夹</span>
      <button
        v-if="folderPaths.size"
        type="button"
        class="cursor-pointer rounded px-1.5 py-0.5 text-[10px] text-steam-dim transition-colors hover:text-gold"
        @click="toggleAll"
      >
        {{ allExpanded ? '全部折叠' : '全部展开' }}
      </button>
      <span class="w-14 text-right">条目</span>
      <span class="ml-6 hidden w-32 sm:block">热度</span>
    </div>

    <div
      :class="
        variant === 'vault'
          ? 'overflow-hidden rounded-xl border border-ink-line bg-ink-surface shadow-sm'
          : 'border-t border-ink-line/60'
      "
    >
      <div
        v-for="(row, i) in rows"
        :key="row.node.path"
        class="anim-fade-up flex items-center gap-1.5 border-b border-ink-line/60 py-2.5 pr-4 transition-colors last:border-b-0 hover:bg-ink-raised/60"
        :style="{ animationDelay: staggerDelay(i), paddingLeft: `${16 + row.depth * 20}px` }"
      >
        <button
          v-if="isFolder(row.node)"
          type="button"
          class="grid size-5 shrink-0 cursor-pointer place-items-center rounded text-steam-dim transition-colors hover:bg-ink-raised hover:text-gold"
          :aria-label="`${row.expanded ? '折叠' : '展开'} ${row.node.path}`"
          :aria-expanded="row.expanded"
          @click="toggle(row.node.path)"
        >
          <ChevronDown v-if="row.expanded" class="size-3.5" />
          <ChevronRight v-else class="size-3.5" />
        </button>
        <span v-else class="size-5 shrink-0" />

        <component
          :is="isFolder(row.node) ? (row.expanded ? FolderOpen : Folder) : Hash"
          class="size-4 shrink-0"
          :class="isFolder(row.node) ? 'text-gold/80' : 'text-steam-dim/70'"
        />

        <RouterLink
          :to="target(row.node)"
          class="min-w-0 flex-1 truncate text-[13px] font-medium text-steam transition-colors hover:text-gold"
          :title="row.node.path"
        >
          {{ row.node.name }}
        </RouterLink>

        <!-- 同一路径既是文件夹又被直接打过标签时，本级资源单独给一个入口 -->
        <RouterLink
          v-if="isFolder(row.node) && row.node.count > 0"
          :to="exactTarget(row.node)"
          class="shrink-0 rounded-full border border-ink-line px-2 py-0.5 text-[10px] text-steam-dim transition-colors hover:border-gold hover:text-gold"
        >
          本级 {{ row.node.count }}
        </RouterLink>

        <span class="w-14 shrink-0 text-right font-mono text-xs tabular-nums text-steam-dim">
          {{ row.node.subtreeCount }}
        </span>
        <span class="ml-6 hidden h-1.5 w-32 shrink-0 overflow-hidden rounded-full bg-ink-raised sm:block">
          <span
            class="block h-full rounded-full bg-gold/70"
            :style="{ width: `${(row.node.subtreeCount / maxCount) * 100}%` }"
          />
        </span>
      </div>
    </div>
  </div>
</template>
