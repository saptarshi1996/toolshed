import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { getEditor, getEditorText, setEditorText } from '../../test/editor'
import { Compare } from './Compare'

const LEFT = `{
  "name": "toolshed",
  "version": "1.4.0",
  "private": true,
  "scripts": {
    "build": "vite build",
    "test": "vitest"
  },
  "tags": ["json", "diff"],
  "author": { "name": "Ada" }
}`

const RIGHT = `{
  "name": "toolshed",
  "version": "1.5.0",
  "scripts": {
    "build": "vite build",
    "test": "vitest run",
    "lint": "eslint ."
  },
  "tags": ["json", "diff", "cli"],
  "author": { "name": "Ada Lovelace" }
}`

function loadSample() {
  setEditorText('Left JSON', LEFT)
  setEditorText('Right JSON', RIGHT)
}

describe('Compare', () => {
  it('opens with both editors empty and asks for JSON', () => {
    render(<Compare />)
    expect(getEditorText('Left JSON')).toBe('')
    expect(getEditorText('Right JSON')).toBe('')
    expect(screen.getByText('Paste JSON on both sides')).toBeInTheDocument()
    expect(screen.queryByText(/invalid JSON/)).not.toBeInTheDocument()
  })

  it('shows the differences between two documents', () => {
    render(<Compare />)
    loadSample()
    expect(screen.getByRole('heading', { name: 'Compare JSON' })).toBeInTheDocument()
    expect(screen.getByText('6 differences')).toBeInTheDocument()
    expect(screen.getByText('2 added')).toBeInTheDocument()
    expect(screen.getByText('1 removed')).toBeInTheDocument()
    expect(screen.getByText('3 changed')).toBeInTheDocument()
    expect(screen.getByText('scripts.test')).toBeInTheDocument()
    expect(screen.getByText('tags[2]')).toBeInTheDocument()
  })

  it('shows both panes as editable editors named Left and Right', () => {
    render(<Compare />)
    expect(screen.getByRole('heading', { name: 'Left' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Right' })).toBeInTheDocument()
    expect(getEditor('Left JSON')).toBeDefined()
    expect(getEditor('Right JSON')).toBeDefined()
  })

  it('updates the differences as either side is edited', () => {
    render(<Compare />)
    setEditorText('Left JSON', '{"a": 1}')
    setEditorText('Right JSON', '{"a": 2, "b": 3}')
    expect(screen.getByText('2 differences')).toBeInTheDocument()
    expect(screen.getByText('1 added')).toBeInTheDocument()
    expect(screen.getByText('1 changed')).toBeInTheDocument()

    setEditorText('Right JSON', '{ "a": 1 }')
    expect(screen.getByText('No differences')).toBeInTheDocument()
    expect(screen.getByText('Identical')).toBeInTheDocument()
  })

  it('shows the old and new value of a changed key', () => {
    render(<Compare />)
    setEditorText('Left JSON', '{"version": "1.0"}')
    setEditorText('Right JSON', '{"version": "2.0"}')
    const row = screen.getByText('version').closest('li') as HTMLElement
    expect(within(row).getByText('"1.0"')).toBeInTheDocument()
    expect(within(row).getByText('"2.0"')).toBeInTheDocument()
  })

  it('explains invalid JSON, names the side and the line, and stops comparing', () => {
    render(<Compare />)
    setEditorText('Left JSON', '{\n  "a": 1,\n}')
    expect(screen.getByText('Line 3 · Expected a quoted key')).toBeInTheDocument()
    expect(screen.getByText('The left side contains invalid JSON')).toBeInTheDocument()
    expect(screen.queryByText(/^\d+ differences?$/)).not.toBeInTheDocument()

    setEditorText('Right JSON', '{')
    expect(screen.getByText('Both sides contain invalid JSON')).toBeInTheDocument()
  })

  it('recovers once the JSON is fixed', () => {
    render(<Compare />)
    setEditorText('Right JSON', '{"a": 2}')
    setEditorText('Left JSON', '{"a": ')
    expect(screen.getByText(/contains invalid JSON/)).toBeInTheDocument()
    setEditorText('Left JSON', '{"a": 1}')
    expect(screen.queryByText(/invalid JSON/)).not.toBeInTheDocument()
    expect(screen.getByText(/^\d+ differences?$/)).toBeInTheDocument()
  })

  it('asks for JSON when a side is empty, without showing an error', () => {
    render(<Compare />)
    loadSample()
    setEditorText('Left JSON', '')
    expect(screen.getByText('Paste JSON on both sides')).toBeInTheDocument()
    expect(screen.queryByText(/invalid JSON/)).not.toBeInTheDocument()
  })

  it('tints the changed lines in the editors', () => {
    const { container } = render(<Compare />)
    loadSample()
    expect(container.querySelectorAll('.cm-line.cm-diff-chg').length).toBeGreaterThan(0)
    expect(container.querySelectorAll('.cm-line.cm-diff-add').length).toBeGreaterThan(0)
    expect(container.querySelectorAll('.cm-line.cm-diff-del').length).toBeGreaterThan(0)
    setEditorText('Right JSON', getEditorText('Left JSON'))
    expect(container.querySelector('.cm-line.cm-diff-chg')).toBeNull()
  })

  it('formats a side with Format and empties it with Clear', async () => {
    const user = userEvent.setup()
    render(<Compare />)
    setEditorText('Left JSON', '{"a":1,"b":[1,2]}')

    await user.click(screen.getAllByRole('button', { name: 'Format' })[0])
    expect(getEditorText('Left JSON')).toBe('{\n  "a": 1,\n  "b": [\n    1,\n    2\n  ]\n}')

    await user.click(screen.getAllByRole('button', { name: 'Clear' })[0])
    expect(getEditorText('Left JSON')).toBe('')
    expect(screen.getAllByRole('button', { name: 'Clear' })[0]).toBeDisabled()
    expect(screen.getAllByRole('button', { name: 'Format' })[0]).toBeDisabled()
  })

  it('disables Format while a side is invalid', () => {
    render(<Compare />)
    setEditorText('Left JSON', '{"a": 1}')
    setEditorText('Right JSON', '{oops')
    expect(screen.getAllByRole('button', { name: 'Format' })[1]).toBeDisabled()
    expect(screen.getAllByRole('button', { name: 'Format' })[0]).toBeEnabled()
  })

  it('can ignore array order', async () => {
    const user = userEvent.setup()
    render(<Compare />)
    setEditorText('Left JSON', '{"a":[1,2,3]}')
    setEditorText('Right JSON', '{"a":[3,2,1]}')
    expect(screen.getByText(/^\d+ differences?$/)).toBeInTheDocument()

    await user.click(screen.getByLabelText('Ignore array order'))
    expect(screen.getByText('No differences')).toBeInTheDocument()
  })

  describe('filtering the differences', () => {
    it('only appears when there are differences', () => {
      render(<Compare />)
      loadSample()
      expect(screen.getByLabelText('Filter differences')).toBeInTheDocument()
      setEditorText('Right JSON', getEditorText('Left JSON'))
      expect(screen.queryByLabelText('Filter differences')).not.toBeInTheDocument()
    })

    it('narrows the list by path and shows how many match', async () => {
      const user = userEvent.setup()
      render(<Compare />)
      loadSample()
      await user.type(screen.getByLabelText('Filter differences'), 'scripts')
      expect(screen.getByText('2 of 6')).toBeInTheDocument()
      expect(screen.getByText('scripts.test')).toBeInTheDocument()
      expect(screen.getByText('scripts.lint')).toBeInTheDocument()
      expect(screen.queryByText('version')).not.toBeInTheDocument()
      // The totals in the header describe all differences, not the filtered ones.
      expect(screen.getByText('6 differences')).toBeInTheDocument()
    })

    it('also matches values, ignoring case', async () => {
      const user = userEvent.setup()
      render(<Compare />)
      loadSample()
      await user.type(screen.getByLabelText('Filter differences'), 'LOVELACE')
      expect(screen.getByText('1 of 6')).toBeInTheDocument()
      expect(screen.getByText('author.name')).toBeInTheDocument()
    })

    it('says so when nothing matches, and Escape clears the filter', async () => {
      const user = userEvent.setup()
      render(<Compare />)
      loadSample()
      const input = screen.getByLabelText('Filter differences')
      await user.type(input, 'nothing-like-this')
      expect(screen.getByText(/No differences match/)).toBeInTheDocument()

      await user.keyboard('{Escape}')
      expect(input).toHaveValue('')
      expect(screen.getByText('scripts.test')).toBeInTheDocument()
    })
  })

  it('pastes from and copies to the clipboard on each side', async () => {
    const user = userEvent.setup()
    render(<Compare />)
    await navigator.clipboard.writeText('{"a": 1}')
    await user.click(screen.getAllByRole('button', { name: 'Paste' })[1])
    await waitFor(() => expect(getEditorText('Right JSON')).toBe('{"a": 1}'))
    expect(getEditorText('Left JSON')).toBe('')

    await user.click(screen.getAllByRole('button', { name: 'Copy' })[1])
    expect(await navigator.clipboard.readText()).toBe('{"a": 1}')
    expect(screen.getAllByRole('button', { name: 'Copy' })[0]).toBeDisabled()
  })
})

