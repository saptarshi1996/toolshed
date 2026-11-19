import { NavLink } from 'react-router'
import { groups } from '../tools/registry'
import { Icon } from './Icon'
import './Sidebar.css'

interface Props {
  /** Search text from the top bar; filters the tool list. */
  query: string
  /** Icon-only rail. */
  collapsed: boolean
}

export function Sidebar({ query, collapsed }: Props) {
  const q = query.trim().toLowerCase()

  return (
    <aside className="sidebar" id="sidebar" data-collapsed={collapsed}>
      <div className="brand">
        <span className="brand-logo" aria-hidden="true">
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5.5 4.5V4A1.5 1.5 0 0 1 7 2.5h2A1.5 1.5 0 0 1 10.5 4v.5" />
            <rect x="2" y="4.5" width="12" height="8.5" rx="2" />
            <path d="M2 8.5h12M7 8.5V10h2V8.5" />
          </svg>
        </span>
        <span className="brand-name label">Toolshed</span>
      </div>

      <nav className="nav" aria-label="Tools">
        {groups.map((group) => {
          const tools = group.tools.filter(
            (t) =>
              !q ||
              group.name.toLowerCase().includes(q) ||
              t.name.toLowerCase().includes(q),
          )
          if (tools.length === 0) return null

          return (
            <div className="group" key={group.id}>
              <h2 className="group-head">
                <span className="tile" aria-hidden="true">
                  {group.glyph}
                </span>
                <span className="label">{group.name}</span>
              </h2>

              <ul className="tools">
                {tools.map((tool) => {
                  return (
                    <li key={tool.id}>
                      <NavLink
                        className="tool"
                        to={tool.path}
                        title={collapsed ? tool.name : undefined}
                      >
                        <Icon name={tool.icon} />
                        <span className="label">{tool.name}</span>
                      </NavLink>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </nav>
    </aside>
  )
}
