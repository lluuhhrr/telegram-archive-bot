import { describe, expect, it } from 'vitest'
import {
  buildTagTree,
  collectFolderPaths,
  defaultExpanded,
  filterTagTree,
  flattenTagTree,
  tagQuery,
  type TagTreeNode,
} from '@/lib/tagTree'

const sample = [
  { name: '动漫/海贼王', count: 3 },
  { name: '动漫/火影忍者/第一部', count: 2 },
  { name: '电影/星际穿越', count: 1 },
  { name: '随手存', count: 4 },
]

function find(nodes: TagTreeNode[], path: string): TagTreeNode | undefined {
  for (const node of nodes) {
    if (node.path === path) return node
    const hit = find(node.children, path)
    if (hit) return hit
  }
  return undefined
}

describe('buildTagTree', () => {
  it('nests slash-separated tags and sums subtree counts', () => {
    const tree = buildTagTree(sample)
    expect(tree.map((n) => n.path)).toEqual(['动漫', '电影', '随手存'])

    const anime = find(tree, '动漫')!
    // 文件夹排在叶子前面
    expect(anime.children.map((n) => n.name)).toEqual(['火影忍者', '海贼王'])
    expect(anime.count).toBe(0)
    expect(anime.subtreeCount).toBe(5)
    expect(find(tree, '动漫/火影忍者/第一部')!.count).toBe(2)

    const loose = find(tree, '随手存')!
    expect(loose.children).toEqual([])
    expect(loose.subtreeCount).toBe(4)
  })

  it('keeps a folder that is also used as a tag', () => {
    const tree = buildTagTree([
      { name: '动漫', count: 7 },
      { name: '动漫/海贼王', count: 3 },
    ])
    const anime = find(tree, '动漫')!
    expect(anime.children.length).toBe(1)
    expect(anime.count).toBe(7)
    expect(anime.subtreeCount).toBe(10)
  })

  it('ignores empty segments and duplicate paths', () => {
    const tree = buildTagTree([
      { name: '/动漫//海贼王/', count: 2 },
      { name: '动漫/海贼王', count: 1 },
      { name: '///', count: 9 },
    ])
    expect(tree.map((n) => n.path)).toEqual(['动漫'])
    expect(find(tree, '动漫/海贼王')!.count).toBe(3)
  })
})

describe('tagQuery', () => {
  it('uses prefix for folders and exact tag for leaves', () => {
    const tree = buildTagTree(sample)
    expect(tagQuery(find(tree, '动漫')!)).toEqual({ tag_prefix: '动漫' })
    expect(tagQuery(find(tree, '动漫/海贼王')!)).toEqual({ tag: '动漫/海贼王' })
  })
})

describe('filterTagTree / flattenTagTree', () => {
  it('keeps ancestors of a match and its descendants', () => {
    const tree = filterTagTree(buildTagTree(sample), '火影')
    expect(tree.map((n) => n.path)).toEqual(['动漫'])
    expect(find(tree, '动漫/火影忍者')!.children.map((n) => n.name)).toEqual(['第一部'])
    expect(find(tree, '动漫/海贼王')).toBeUndefined()
  })

  it('shows all matches when a keyword is present, regardless of expansion', () => {
    const tree = filterTagTree(buildTagTree(sample), '动漫')
    const rows = flattenTagTree(tree, new Set(), '动漫')
    expect(rows.map((r) => r.node.path)).toEqual([
      '动漫',
      '动漫/火影忍者',
      '动漫/火影忍者/第一部',
      '动漫/海贼王',
    ])
    expect(rows.every((r) => r.expanded)).toBe(true)
  })

  it('only renders children of expanded folders', () => {
    const tree = buildTagTree(sample)
    const collapsed = flattenTagTree(tree, new Set())
    expect(collapsed.map((r) => r.node.path)).toEqual(['动漫', '电影', '随手存'])

    const expanded = flattenTagTree(tree, new Set(defaultExpanded(tree)))
    expect(expanded.map((r) => r.node.path)).toEqual([
      '动漫', '动漫/火影忍者', '动漫/海贼王', '电影', '电影/星际穿越', '随手存',
    ])
    expect(expanded[1].depth).toBe(1)
  })

  it('collects every folder path', () => {
    const tree = buildTagTree(sample)
    expect([...collectFolderPaths(tree)].sort()).toEqual([
      '动漫', '动漫/火影忍者', '电影',
    ])
  })
})
