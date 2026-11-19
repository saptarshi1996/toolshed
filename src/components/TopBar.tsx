import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router'
import { findByPath } from '../tools/registry'
import './TopBar.css'

interface Props {
  query: string
  onQueryChange: (query: string) => void
  sidebarCollapsed: boolean
  onToggleSidebar: () => void
}

const isMac = /Mac|iPhone|iPad/.test(navigator.userAgent)

export function TopBar({ query, onQueryChange, sidebarCollapsed, onToggleSidebar }: Props) {
  const searchRef = useRef<HTMLInputElement>(null)
  const current = findByPath(useLocation().pathname)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [])

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

      <label className="search">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
          <circle cx="7" cy="7" r="5" />
          <path d="m11 11 3.5 3.5" />
        </svg>
        <input
          ref={searchRef}
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Escape' && (onQueryChange(''), e.currentTarget.blur())}
          placeholder="Search tools, formats, operations"
          aria-label="Search tools"
        />
        <kbd>{isMac ? '⌘K' : 'Ctrl K'}</kbd>
      </label>

    </header>
  )
}
