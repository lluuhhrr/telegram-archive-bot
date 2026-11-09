import type { TagCount } from '@/lib/types'

/*
 * 树形类目：标签名用 '/' 分层（动漫/海贼王）。后端把整串当成一个标签，
 * 这里只负责在前端把它还原成文件夹树，不改变标签的存储与查询语义。
 */

export const TAG_SEPARATOR = '/'

export interface TagTreeNode {
  /** 完整路径，如 动漫/海贼王 */
  path: string
  /** 末段显示名 */
  name: string
  /** 该完整标签自身的使用次数；纯虚拟文件夹为 0 */
  count: number
  /** 自身 + 所有后代的计数之和（同一素材可挂多个子标签，数值可能重复） */
  subtreeCount: number
  children: TagTreeNode[]
}

export interface TagTreeRow {
  node: TagTreeNode
  depth: number
  expanded: boolean
}

function partsOf(name: string): string[] {
  return name.split(TAG_SEPARATOR).map((part) => part.trim()).filter(Boolean)
}

/** 把 /tags 的平铺标签构造成文件夹树；空段（a//b、首尾 /）自动忽略。 */
export function buildTagTree(tags: TagCount[]): TagTreeNode[] {
  const roots: TagTreeNode[] = []
  const index = new Map<string, TagTreeNode>()

  for (const tag of tags) {
    const parts = partsOf(tag.name)
    if (!parts.length) continue
    let siblings = roots
    let path = ''
    for (let i = 0; i < parts.length; i++) {
      path = path ? `${path}${TAG_SEPARATOR}${parts[i]}` : parts[i]
      let node = index.get(path)
      if (!node) {
        node = { path, name: parts[i], count: 0, subtreeCount: 0, children: [] }
        index.set(path, node)
        siblings.push(node)
      }
      if (i === parts.length - 1) node.count += tag.count
      siblings = node.children
    }
  }

  accumulate(roots)
  sortNodes(roots)
  return roots
}

function accumulate(nodes: TagTreeNode[]): number {
  let total = 0
  for (const node of nodes) {
    node.subtreeCount = node.count + accumulate(node.children)
    total += node.subtreeCount
  }
  return total
}

/** 文件夹在前，其次按子树热度，最后按名称，保证层级稳定可读 */
function sortNodes(nodes: TagTreeNode[]) {
  nodes.sort((a, b) => {
    const aFolder = a.children.length ? 0 : 1
    const bFolder = b.children.length ? 0 : 1
    if (aFolder !== bFolder) return aFolder - bFolder
    if (b.subtreeCount !== a.subtreeCount) return b.subtreeCount - a.subtreeCount
    return a.name.localeCompare(b.name, 'zh-Hans-CN')
  })
  for (const node of nodes) sortNodes(node.children)
}

/** 关键词过滤：命中节点保留其全部后代，未命中节点仅在有命中后代时保留。 */
export function filterTagTree(nodes: TagTreeNode[], keyword: string): TagTreeNode[] {
  const kw = keyword.trim().toLowerCase()
  if (!kw) return nodes
  return nodes.flatMap((node) => {
    const children = filterTagTree(node.children, kw)
    const selfMatch = node.path.toLowerCase().includes(kw)
    if (!selfMatch && !children.length) return []
    return [{ ...node, children: selfMatch ? node.children : children }]
  })
}

/** 把树按展开状态压平成可渲染的行；搜索时传全展开集合即可看到所有命中项。 */
export function flattenTagTree(
  nodes: TagTreeNode[],
  expanded: ReadonlySet<string>,
  keyword = '',
): TagTreeRow[] {
  const rows: TagTreeRow[] = []
  const autoExpand = keyword.trim().length > 0
  const walk = (list: TagTreeNode[], depth: number) => {
    for (const node of list) {
      const open = autoExpand || expanded.has(node.path)
      rows.push({ node, depth, expanded: open })
      if (node.children.length && open) walk(node.children, depth + 1)
    }
  }
  walk(nodes, 0)
  return rows
}

export function collectFolderPaths(nodes: TagTreeNode[], into = new Set<string>()): Set<string> {
  for (const node of nodes) {
    if (node.children.length) into.add(node.path)
    collectFolderPaths(node.children, into)
  }
  return into
}

/** 根节点默认展开一层，一进页面就能看见目录结构 */
export function defaultExpanded(nodes: TagTreeNode[]): Set<string> {
  return new Set(nodes.filter((node) => node.children.length).map((node) => node.path))
}

/** 文件夹走前缀（整棵子树），叶子走精确标签 */
export function tagQuery(node: TagTreeNode): Record<string, string> {
  return node.children.length ? { tag_prefix: node.path } : { tag: node.path }
}
