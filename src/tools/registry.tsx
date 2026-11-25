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
      {
        id: 'stringify',
        name: 'Stringify',
        path: '/stringify',
        icon: 'stringify',
        component: lazy(() => import('./json/Stringify').then((m) => ({ default: m.Stringify }))),
      },
      {
        id: 'parse',
        name: 'Parse',
        path: '/parse',
        icon: 'parse',
        component: lazy(() => import('./json/Parse').then((m) => ({ default: m.Parse }))),
      },
      {
        id: 'to-csv',
        name: 'To CSV',
        path: '/to-csv',
        icon: 'csv',
        component: lazy(() => import('./json/ToCsv').then((m) => ({ default: m.ToCsv }))),
      },
    ],
  },
]

export const allTools = groups.flatMap((group) => group.tools.map((tool) => ({ group, tool })))

export function findByPath(pathname: string) {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  return allTools.find(({ tool }) => tool.path === path)
}
