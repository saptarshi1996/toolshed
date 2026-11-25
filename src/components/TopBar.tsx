import { useLocation } from 'react-router'
import { findByPath } from '../tools/registry'
import './TopBar.css'

interface Props {
  sidebarCollapsed: boolean
  onToggleSidebar: () => void
}

export function TopBar({ sidebarCollapsed, onToggleSidebar }: Props) {
  const current = findByPath(useLocation().pathname)

  return (
    <header className="topbar">
      <div className="topbar-start">
        <button
          className="icon-btn"
          onClick={onToggleSidebar}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!sidebarCollapsed}
          aria-controls="sidebar"
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
            <rect x="2" y="3" width="12" height="10" rx="2" />
            <path d="M6 3v10" />
          </svg>
        </button>
        {current && (
          <div className="crumb">
            {current.group.name} <span className="crumb-sep">/</span> <b>{current.tool.name}</b>
          </div>
        )}
      </div>

    </header>
  )
}
