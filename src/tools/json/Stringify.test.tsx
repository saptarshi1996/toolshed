import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { getEditor, getEditorText, setEditorText } from '../../test/editor'
import { Stringify } from './Stringify'

describe('Stringify', () => {
  it('opens with a sample already stringified', () => {
    render(<Stringify />)
    expect(screen.getByRole('heading', { name: 'Stringify JSON' })).toBeInTheDocument()
    const out = getEditorText('Stringified output')
    expect(out.startsWith('"{\\"name\\":\\"toolshed\\"')).toBe(true)
    expect(JSON.parse(out)).toContain('"tags":["json","diff","cli"]')
  })

  it('updates as the JSON is edited', () => {
    render(<Stringify />)
    setEditorText('JSON input', '{ "a": 1 }')
    expect(getEditorText('Stringified output')).toBe('"{\\"a\\":1}"')
    expect(screen.getByText('11 characters')).toBeInTheDocument()
  })

  it('honours the two options', async () => {
    const user = userEvent.setup()
    render(<Stringify />)
    setEditorText('JSON input', '{\n  "a": 1\n}')

    await user.click(screen.getByLabelText('Wrap in quotes'))
    expect(getEditorText('Stringified output')).toBe('{\\"a\\":1}')

    await user.click(screen.getByLabelText('Minify first'))
    expect(getEditorText('Stringified output')).toBe('{\\n  \\"a\\": 1\\n}')
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
})
