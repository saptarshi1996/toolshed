import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { getEditor, getEditorText, setEditorText } from '../../test/editor'
import { Parse } from './Parse'

describe('Parse', () => {
  it('opens with both editors empty', () => {
    render(<Parse />)
    expect(screen.getByRole('heading', { name: 'Parse JSON' })).toBeInTheDocument()
    expect(getEditorText('String input')).toBe('')
    expect(getEditorText('Parsed output')).toBe('')
    expect(screen.getByRole('button', { name: 'Copy' })).toBeDisabled()
  })

  it('clears the output when the input is emptied or becomes invalid', () => {
    render(<Parse />)
    setEditorText('String input', '"[1]"')
    expect(getEditorText('Parsed output')).not.toBe('')
    setEditorText('String input', '"')
    expect(getEditorText('Parsed output')).toBe('')
    setEditorText('String input', '"[1]"')
    setEditorText('String input', '')
    expect(getEditorText('Parsed output')).toBe('')
  })

  it('updates as the string is edited', () => {
    render(<Parse />)
    setEditorText('String input', '"{\\"a\\":1}"')
    expect(getEditorText('Parsed output')).toBe('{\n  "a": 1\n}')
    expect(screen.getByText('3 lines')).toBeInTheDocument()
  })

  it('accepts a string without quotes', () => {
    render(<Parse />)
    setEditorText('String input', '[\\"x\\"]')
    expect(getEditorText('Parsed output')).toBe('[\n  "x"\n]')
  })

  it('always pretty prints, with no switches', () => {
    render(<Parse />)
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    setEditorText('String input', '"{\\"a\\": [1, 2]}"')
    expect(getEditorText('Parsed output')).toBe('{\n  "a": [\n    1,\n    2\n  ]\n}')
  })

  it('reports a string that cannot be decoded', () => {
    render(<Parse />)
    setEditorText('String input', '{"a": "bad "quote""}')
    expect(screen.getByText('Not a valid escaped string')).toBeInTheDocument()
    expect(getEditorText('Parsed output')).toBe('')
    expect(screen.getByRole('button', { name: 'Copy' })).toBeDisabled()
  })

  it('shows the decoded text and the line when it is not JSON', () => {
    render(<Parse />)
    setEditorText('String input', '"{\\n  \\"a\\": 1\\n  \\"b\\": 2\\n}"')
    expect(screen.getByText('Line 3 · Decoded text is not JSON: Expected "," or "}"')).toBeInTheDocument()
    expect(getEditorText('Parsed output')).toBe('{\n  "a": 1\n  "b": 2\n}')
  })

  it('copies the output', async () => {
    const user = userEvent.setup()
    render(<Parse />)
    setEditorText('String input', '"[1]"')
    await user.click(screen.getByRole('button', { name: 'Copy' }))
    expect(await navigator.clipboard.readText()).toBe('[\n  1\n]')
    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument()
  })

  it('makes the output pane read-only', () => {
    render(<Parse />)
    expect(getEditor('Parsed output').state.readOnly).toBe(true)
    expect(getEditor('String input').state.readOnly).toBe(false)
  })

  it('pastes the clipboard into the input', async () => {
    const user = userEvent.setup()
    render(<Parse />)
    await navigator.clipboard.writeText('"[1]"')
    await user.click(screen.getByRole('button', { name: 'Paste' }))
    await waitFor(() => expect(getEditorText('String input')).toBe('"[1]"'))
    expect(getEditorText('Parsed output')).toBe('[\n  1\n]')
  })
})
