import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { getEditor, getEditorText, setEditorText } from '../../test/editor'
import { Stringify } from './Stringify'

describe('Stringify', () => {
  it('opens with both editors empty', () => {
    render(<Stringify />)
    expect(screen.getByRole('heading', { name: 'Stringify JSON' })).toBeInTheDocument()
    expect(getEditorText('JSON input')).toBe('')
    expect(getEditorText('Stringified output')).toBe('')
    expect(screen.getByRole('button', { name: 'Copy' })).toBeDisabled()
  })

  it('clears the output when the input is emptied or becomes invalid', () => {
    render(<Stringify />)
    setEditorText('JSON input', '{ "a": 1 }')
    expect(getEditorText('Stringified output')).not.toBe('')
    setEditorText('JSON input', '{')
    expect(getEditorText('Stringified output')).toBe('')
    setEditorText('JSON input', '[1]')
    expect(getEditorText('Stringified output')).toBe('"[1]"')
    setEditorText('JSON input', '')
    expect(getEditorText('Stringified output')).toBe('')
  })

  it('updates as the JSON is edited', () => {
    render(<Stringify />)
    setEditorText('JSON input', '{ "a": 1 }')
    expect(getEditorText('Stringified output')).toBe('"{\\"a\\":1}"')
    expect(screen.getByText('11 characters')).toBeInTheDocument()
  })

  it('always minifies and wraps in quotes, with no switches', () => {
    render(<Stringify />)
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    setEditorText('JSON input', '{\n  "a": 1\n}')
    expect(getEditorText('Stringified output')).toBe('"{\\"a\\":1}"')
  })

  it('reports invalid JSON and clears the output', () => {
    render(<Stringify />)
    setEditorText('JSON input', '{\n  "a": 1\n  "b": 2\n}')
    expect(screen.getByText('Line 3 · Expected "," or "}"')).toBeInTheDocument()
    expect(getEditorText('Stringified output')).toBe('')
    expect(screen.getByRole('button', { name: 'Copy' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Format' })).toBeDisabled()
  })

  it('copies the output', async () => {
    const user = userEvent.setup()
    render(<Stringify />)
    setEditorText('JSON input', '[1]')
    await user.click(screen.getByRole('button', { name: 'Copy' }))
    expect(await navigator.clipboard.readText()).toBe('"[1]"')
    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument()
  })

  it('makes the output pane read-only', () => {
    render(<Stringify />)
    expect(getEditor('Stringified output').state.readOnly).toBe(true)
    expect(getEditor('JSON input').state.readOnly).toBe(false)
  })

  it('pastes the clipboard into the input', async () => {
    const user = userEvent.setup()
    render(<Stringify />)
    await navigator.clipboard.writeText('[1, 2]')
    await user.click(screen.getByRole('button', { name: 'Paste' }))
    await waitFor(() => expect(getEditorText('JSON input')).toBe('[1, 2]'))
    expect(getEditorText('Stringified output')).toBe('"[1,2]"')
  })
})
