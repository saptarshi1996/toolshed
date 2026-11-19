import { lazy, type ComponentType } from 'react'
import type { IconName } from '../components/Icon'

export interface Tool {
  id: string
  name: string
  /** URL of the tool's page. Keep these unique across all groups. */
  path: string
  /** Key into the icon set in components/Icon.tsx. */
  icon: IconName
  /** Loaded on first visit, so each tool is its own chunk. */
  component: ComponentType
}

export interface ToolGroup {
  id: string
  name: string
  /** Text shown as the group's icon. */
  glyph: string
  tools: Tool[]
}

export const groups: ToolGroup[] = [
  {
    id: 'json',
    name: 'JSON',
    glyph: '{ }',
    tools: [
      {
        id: 'compare',
        name: 'Compare',
        path: '/compare',
        icon: 'compare',
        component: lazy(() => import('./json/Compare').then((m) => ({ default: m.Compare }))),
      },
    ],
  },
]

export const allTools = groups.flatMap((group) => group.tools.map((tool) => ({ group, tool })))

export function findByPath(pathname: string) {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  return allTools.find(({ tool }) => tool.path === path)
}
