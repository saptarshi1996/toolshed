import { Suspense, useEffect, useState } from 'react'
import { Link, Navigate, Outlet, Route, Routes, useLocation } from 'react-router'
import { Sidebar } from './components/Sidebar'
import { TopBar } from './components/TopBar'
import { allTools, findByPath } from './tools/registry'
import './App.css'

const NARROW = '(max-width: 900px)'

function Layout() {
  // Starts collapsed on narrow screens, and follows the window when it crosses the breakpoint.
  const [collapsed, setCollapsed] = useState(() => matchMedia(NARROW).matches)
  const { pathname } = useLocation()

  useEffect(() => {
    const mq = matchMedia(NARROW)
    const onChange = (e: MediaQueryListEvent) => setCollapsed(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    const match = findByPath(pathname)
    document.title = match ? `${match.tool.name} · ${match.group.name} · Toolshed` : 'Toolshed'
  }, [pathname])

  return (
    <div className="app" data-collapsed={collapsed}>
      <Sidebar collapsed={collapsed} />
      <div className="main">
        <TopBar sidebarCollapsed={collapsed} onToggleSidebar={() => setCollapsed((c) => !c)} />
        <main className="body">
          <Suspense fallback={null}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  )
}

function NotFound() {
  return (
    <div className="not-found">
      <h1>Page not found</h1>
      <p>There is no tool at this address.</p>
      <Link to={allTools[0].tool.path}>Go to {allTools[0].tool.name}</Link>
    </div>
  )
}

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to={allTools[0].tool.path} replace />} />
        {allTools.map(({ tool }) => (
          <Route key={tool.id} path={tool.path} element={<tool.component />} />
        ))}
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}

export default App
