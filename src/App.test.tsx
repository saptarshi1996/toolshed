import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import App from './App'
import { mockMatchMedia } from './test/matchMedia'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

const sidebar = () => screen.getByRole('complementary')

describe('routing', () => {
  it('sends the root address to the Compare page', async () => {
    renderAt('/')
    expect(await screen.findByRole('heading', { name: 'Compare JSON' })).toBeInTheDocument()
  })

  it('opens Compare at /compare', async () => {
    renderAt('/compare')
    expect(await screen.findByRole('heading', { name: 'Compare JSON' })).toBeInTheDocument()
  })

  it('opens Stringify at /stringify, listed in the sidebar and marked current', async () => {
    renderAt('/stringify')
    expect(await screen.findByRole('heading', { name: 'Stringify JSON' })).toBeInTheDocument()
    expect(within(sidebar()).getByRole('link', { name: 'Stringify' })).toHaveAttribute('aria-current', 'page')
  })

  it('treats a trailing slash as the same page', async () => {
    renderAt('/compare/')
    expect(await screen.findByRole('heading', { name: 'Compare JSON' })).toBeInTheDocument()
    expect(screen.getByText('Compare', { selector: 'b' })).toBeInTheDocument()
  })

  it('shows a not-found page with a way back for unknown addresses', async () => {
    const user = userEvent.setup()
    renderAt('/nope')
    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Compare JSON' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'Go to Compare' }))
    expect(await screen.findByRole('heading', { name: 'Compare JSON' })).toBeInTheDocument()
  })

  it('sets the tab title from the page, and resets it for unknown pages', async () => {
    const { unmount } = renderAt('/compare')
    await screen.findByRole('heading', { name: 'Compare JSON' })
    expect(document.title).toBe('Compare · JSON · Toolshed')
    unmount()

    renderAt('/nope')
    expect(document.title).toBe('Toolshed')
  })
})

describe('sidebar', () => {
  it('lists the JSON group with its Compare tool as a real link', async () => {
    renderAt('/compare')
    await screen.findByRole('heading', { name: 'Compare JSON' })
    expect(within(sidebar()).getByRole('heading', { name: 'JSON' })).toBeInTheDocument()
    expect(within(sidebar()).getByRole('link', { name: 'Compare' })).toHaveAttribute('href', '/compare')
  })

  it('marks the open page as current', async () => {
    renderAt('/compare')
    await screen.findByRole('heading', { name: 'Compare JSON' })
    expect(within(sidebar()).getByRole('link', { name: 'Compare' })).toHaveAttribute('aria-current', 'page')
  })

  it('does not mark any tool as current on an unknown page', () => {
    renderAt('/nope')
    expect(within(sidebar()).getByRole('link', { name: 'Compare' })).not.toHaveAttribute('aria-current')
  })

  it('has no collapsible groups', () => {
    renderAt('/compare')
    expect(within(sidebar()).queryByRole('button')).not.toBeInTheDocument()
  })

  it('shows the breadcrumb for the current tool', async () => {
    renderAt('/compare')
    await screen.findByRole('heading', { name: 'Compare JSON' })
    const bar = screen.getAllByRole('banner')[0]
    expect(within(bar).getByText('JSON', { exact: false })).toBeInTheDocument()
    expect(within(bar).getByText('Compare', { selector: 'b' })).toBeInTheDocument()
  })
})

describe('collapsing the sidebar', () => {
  it('starts expanded on a wide window', () => {
    renderAt('/compare')
    expect(sidebar()).toHaveAttribute('data-collapsed', 'false')
    expect(screen.getByRole('button', { name: 'Collapse sidebar' })).toHaveAttribute('aria-expanded', 'true')
  })

  it('collapses to icons and expands again with the toggle', async () => {
    const user = userEvent.setup()
    renderAt('/compare')

    await user.click(screen.getByRole('button', { name: 'Collapse sidebar' }))
    expect(sidebar()).toHaveAttribute('data-collapsed', 'true')
    expect(screen.getByRole('button', { name: 'Expand sidebar' })).toHaveAttribute('aria-expanded', 'false')
    // Names stay available to screen readers and as a tooltip.
    const link = within(sidebar()).getByRole('link', { name: 'Compare' })
    expect(link).toHaveAttribute('title', 'Compare')

    await user.click(screen.getByRole('button', { name: 'Expand sidebar' }))
    expect(sidebar()).toHaveAttribute('data-collapsed', 'false')
    expect(within(sidebar()).getByRole('link', { name: 'Compare' })).not.toHaveAttribute('title')
  })

  it('starts collapsed on a narrow window', () => {
    mockMatchMedia(true)
    renderAt('/compare')
    expect(sidebar()).toHaveAttribute('data-collapsed', 'true')
  })
})

describe('search', () => {
  it('filters the sidebar by tool name, ignoring case', async () => {
    const user = userEvent.setup()
    renderAt('/compare')
    await user.type(screen.getByLabelText('Search tools'), 'COMP')
    expect(within(sidebar()).getByRole('link', { name: 'Compare' })).toBeInTheDocument()
  })

  it('also matches the group name', async () => {
    const user = userEvent.setup()
    renderAt('/compare')
    await user.type(screen.getByLabelText('Search tools'), 'json')
    expect(within(sidebar()).getByRole('link', { name: 'Compare' })).toBeInTheDocument()
  })

  it('hides tools and groups that do not match', async () => {
    const user = userEvent.setup()
    renderAt('/compare')
    await user.type(screen.getByLabelText('Search tools'), 'zzz')
    expect(within(sidebar()).queryByRole('link')).not.toBeInTheDocument()
    expect(within(sidebar()).queryByRole('heading', { name: 'JSON' })).not.toBeInTheDocument()
  })

  it('clears with Escape', async () => {
    const user = userEvent.setup()
    renderAt('/compare')
    const input = screen.getByLabelText('Search tools')
    await user.type(input, 'zzz')
    await user.keyboard('{Escape}')
    expect(input).toHaveValue('')
    expect(within(sidebar()).getByRole('link', { name: 'Compare' })).toBeInTheDocument()
  })

  it('focuses with Ctrl+K', async () => {
    const user = userEvent.setup()
    renderAt('/compare')
    expect(screen.getByLabelText('Search tools')).not.toHaveFocus()
    await user.keyboard('{Control>}k{/Control}')
    expect(screen.getByLabelText('Search tools')).toHaveFocus()
  })

  it('focuses with Cmd+K', async () => {
    const user = userEvent.setup()
    renderAt('/compare')
    await user.keyboard('{Meta>}k{/Meta}')
    expect(screen.getByLabelText('Search tools')).toHaveFocus()
  })

  it('keeps the page open while searching', async () => {
    const user = userEvent.setup()
    renderAt('/compare')
    await screen.findByRole('heading', { name: 'Compare JSON' })
    await user.type(screen.getByLabelText('Search tools'), 'zzz')
    expect(screen.getByRole('heading', { name: 'Compare JSON' })).toBeInTheDocument()
  })
})
