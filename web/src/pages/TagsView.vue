<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { getTags } from '@/lib/api'
import type { TagCount } from '@/lib/types'
import TagTree from '@/components/TagTree.vue'
import Button from '@/components/ui/Button.vue'
import { buildTagTree, filterTagTree, type TagTreeNode } from '@/lib/tagTree'
import { isVault, useVocab } from '@/lib/vocab'

const counts = ref<TagCount[] | null>(null)
const loading = ref(true)
const loadError = ref('')
const keyword = ref('')
const L = useVocab()

/* 标签名里的 '/' 是层级分隔符：平铺的 /tags 响应在这里还原成文件夹树。
   关键词按完整路径匹配，命中节点的祖先与后代一并保留。 */
const tree = computed(() => buildTagTree(counts.value ?? []))
const filteredTree = computed(() => filterTagTree(tree.value, keyword.value))
const filteredCount = computed(() => {
  const walk = (nodes: TagTreeNode[]): number =>
    nodes.reduce((total, node) => total + 1 + walk(node.children), 0)
  return walk(filteredTree.value)
})

async function load() {
  loadError.value = ''
  try {
    counts.value = (await getTags()).items
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : '加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <!-- 标准后台：文件夹树（筛选职责在侧栏树；关键词本地过滤） -->
  <div v-if="isVault" class="mx-auto max-w-6xl px-5 pb-24 pt-6 lg:pb-6">
    <div class="mb-5 flex flex-wrap items-center gap-3">
      <h1 class="text-[17px] font-semibold text-steam">{{ L.tag }}</h1>
      <span v-if="counts" class="font-mono text-[10.5px] tabular-nums text-steam-dim">
        {{ filteredCount }} / {{ counts.length }} 个
      </span>
      <!-- 手机端与下方标签卡同宽（max-w-xs 只在 sm+ 生效） -->
      <label class="ml-auto flex h-9 w-full max-w-full items-center gap-2 rounded-lg border border-ink-line bg-ink-surface px-2.5 transition-colors focus-within:border-gold sm:max-w-xs">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="shrink-0 text-steam-dim"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
        <input
          v-model="keyword"
          type="search"
          placeholder="搜索类目…"
          aria-label="搜索类目"
          class="w-full min-w-0 bg-transparent text-[13px] text-steam outline-none placeholder:text-steam-dim/60"
        />
      </label>
    </div>

    <!-- 分支链 out-in 淡切（B4）；行挂载 stagger（B6） -->
    <Transition name="v-dialog" mode="out-in">
      <div v-if="loading" key="loading" class="space-y-2" aria-hidden="true">
        <div v-for="i in 6" :key="i" class="h-11 animate-pulse rounded-xl border border-ink-line bg-ink-surface" />
      </div>

      <div v-else-if="loadError" key="error" class="flex flex-col items-center gap-3 rounded-xl border border-ink-line bg-ink-surface py-16 text-steam-dim">
        <p class="text-sm">{{ loadError }}</p>
        <Button variant="secondary" size="sm" @click="load">重试</Button>
      </div>

      <TagTree v-else-if="filteredCount" key="tree" :tags="counts ?? []" :keyword="keyword" />

      <div v-else-if="counts && counts.length" key="no-match" class="rounded-xl border border-ink-line bg-ink-surface py-16 text-center">
        <p class="text-[15px] font-semibold text-steam">没有匹配的类目</p>
        <p class="mt-2 text-[13px] text-steam-dim">换个关键词试试。</p>
      </div>

      <div v-else key="empty" class="rounded-xl border border-ink-line bg-ink-surface py-16 text-center">
        <p class="text-[15px] font-semibold text-steam">还没有{{ L.tag }}</p>
        <p class="mt-2 text-[13px] text-steam-dim">在详情里给归档加{{ L.tag }}后，会汇总在这里。用「动漫/海贼王」这样的写法可以建文件夹。</p>
      </div>
    </Transition>
  </div>

  <!-- 素材志：同一棵树，换成杂志风的轻量排版 -->
  <div v-else class="mx-auto max-w-4xl px-5 py-8 min-[820px]:px-8">
    <header class="mb-7 flex items-end justify-between gap-4">
      <div>
        <h1 class="font-display text-2xl font-bold tracking-[0.18em] text-steam min-[480px]:text-3xl">类 目</h1>
        <p class="mt-2 font-mono text-[10.5px] tracking-[0.3em] text-steam-dim">INDEX OF TAGS</p>
      </div>
      <label class="flex h-9 w-full max-w-[15rem] items-center gap-2 rounded-full border border-ink-line bg-ink-surface px-3">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="shrink-0 text-steam-dim"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
        <input
          v-model="keyword"
          type="search"
          placeholder="搜索类目…"
          aria-label="搜索类目"
          class="w-full min-w-0 bg-transparent text-[13px] text-steam outline-none placeholder:text-steam-dim/60"
        />
      </label>
    </header>

    <Transition name="v-dialog" mode="out-in">
      <div v-if="loading" key="loading" class="flex flex-wrap gap-2" aria-hidden="true">
        <div v-for="i in 10" :key="i" class="h-8 w-20 animate-pulse rounded-full bg-ink-raised" />
      </div>

      <!-- 加载失败不能伪装成空态 -->
      <div v-else-if="loadError" key="error" class="flex flex-col items-center gap-3 border-t border-ink-line py-16 text-steam-dim">
        <p class="text-sm">{{ loadError }}</p>
        <Button variant="secondary" size="sm" @click="load">重试</Button>
      </div>

      <TagTree v-else-if="filteredCount" key="tree" :tags="counts ?? []" :keyword="keyword" variant="magazine" />

      <div v-else-if="counts && counts.length" key="no-match" class="border-t border-ink-line py-16 text-center">
        <p class="text-[15px] font-semibold text-steam">没有匹配的类目</p>
        <p class="mt-2 text-[13px] text-steam-dim">换个关键词试试。</p>
      </div>

      <div v-else key="empty" class="border-t border-ink-line py-16 text-center">
        <p class="empty-title font-display text-xl text-steam">尚无类目</p>
        <p class="mt-2 text-[13px] text-steam-dim">在抽屉里给归档加注标签后，会汇总在这里。用「动漫/海贼王」可建文件夹。</p>
      </div>
    </Transition>
  </div>
</template>
