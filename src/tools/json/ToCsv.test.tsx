import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getEditor, getEditorText, setEditorText } from '../../test/editor'
import { ToCsv } from './ToCsv'

function upload(content: string, name = 'data.json') {
  const input = screen.getByLabelText('Upload JSON file')
  fireEvent.change(input, { target: { files: [new File([content], name, { type: 'application/json' })] } })
}

afterEach(() => vi.restoreAllMocks())

describe('ToCsv', () => {
  it('opens with both editors empty and the buttons disabled', () => {
    render(<ToCsv />)
    expect(screen.getByRole('heading', { name: 'JSON to CSV' })).toBeInTheDocument()
    expect(getEditorText('JSON input')).toBe('')
    expect(getEditorText('CSV output')).toBe('')
    expect(screen.getByRole('button', { name: 'Download CSV' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Copy' })).toBeDisabled()
  })

  it('converts pasted JSON as it is edited', () => {
    render(<ToCsv />)
    setEditorText('JSON input', '[{"a":1,"b":"x"},{"a":2,"b":"y"}]')
    expect(getEditorText('CSV output')).toBe('a,b\n1,x\n2,y')
    expect(screen.getByText('2 rows · 2 columns')).toBeInTheDocument()
  })

  it('does not clean up pasted text, it reports the error', () => {
    render(<ToCsv />)
    setEditorText('JSON input', '[\n{"a":1},\n]')
    expect(screen.getByText(/^Line 3 ·/)).toBeInTheDocument()
    expect(getEditorText('JSON input')).toBe('[\n{"a":1},\n]')
    expect(getEditorText('CSV output')).toBe('')
    expect(screen.getByRole('button', { name: 'Download CSV' })).toBeDisabled()
  })

  it('cleans up an uploaded file and says what it did', async () => {
    render(<ToCsv />)
    upload('﻿[{"a":1,},]')
    await waitFor(() => expect(getEditorText('JSON input')).toBe('[\n  {\n    "a": 1\n  }\n]'))
    await waitFor(() => expect(getEditorText('CSV output')).toBe('a\n1'))
    expect(screen.getByRole('status')).toHaveTextContent('Cleaned up: Removed a byte-order mark; Removed 2 trailing commas.')
    expect(screen.getByText(/data\.json · /)).toBeInTheDocument()
  })

  it('shows only a preview of a very large file, but converts all of it', async () => {
    render(<ToCsv />)
    const rows = Array.from({ length: 60_000 }, (_, i) => ({ id: i, name: `user ${i}` }))
    upload(JSON.stringify(rows), 'big.json')
    await waitFor(() => expect(screen.getByText(/Large file/)).toBeInTheDocument(), { timeout: 5000 })
    expect(getEditor('JSON input').state.readOnly).toBe(true)
    expect(getEditorText('JSON input').length).toBeLessThanOrEqual(100_000)
    await waitFor(() => expect(screen.getByText('60,000 rows · 2 columns')).toBeInTheDocument())
    expect(screen.getByText(/Showing the first 200 of 60,000 rows/)).toBeInTheDocument()
    expect(getEditorText('CSV output').split('\n')).toHaveLength(201)
  })

  it('goes back to an editable, empty editor on Clear', async () => {
    const user = userEvent.setup()
    render(<ToCsv />)
    upload('[1]')
    await waitFor(() => expect(getEditorText('CSV output')).not.toBe(''))
    await user.click(screen.getByRole('button', { name: 'Clear' }))
    expect(getEditorText('JSON input')).toBe('')
    expect(getEditorText('CSV output')).toBe('')
    expect(screen.queryByText(/data\.json/)).not.toBeInTheDocument()
  })

  it('downloads the whole CSV with a name taken from the uploaded file', async () => {
    const user = userEvent.setup()
    const url = vi.fn(() => 'blob:x')
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: url, revokeObjectURL: vi.fn() }))
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      expect(this.download).toBe('people.csv')
    })
    render(<ToCsv />)
    upload('[{"a":1}]', 'people.json')
    await waitFor(() => expect(screen.getByRole('button', { name: 'Download CSV' })).toBeEnabled())
    await user.click(screen.getByRole('button', { name: 'Download CSV' }))
    expect(click).toHaveBeenCalledOnce()
    const blob = (url.mock.calls[0] as unknown as [Blob])[0]
    const bytes = new Uint8Array(await blob.arrayBuffer())
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf])
    expect(new TextDecoder().decode(bytes)).toBe('a\r\n1')
  })

  it('names the download data.csv when the JSON was pasted', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: () => 'blob:x', revokeObjectURL: vi.fn() }))
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      expect(this.download).toBe('data.csv')
    })
    render(<ToCsv />)
    setEditorText('JSON input', '[1]')
    await user.click(screen.getByRole('button', { name: 'Download CSV' }))
  })

  it('rejects an uploaded file that is nested, and leaves the editors as they were', async () => {
    render(<ToCsv />)
    setEditorText('JSON input', '[1]')
    upload('[{"a":{"b":1}}]', 'nested.json')
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('nested.json was not loaded. Nested JSON is not supported: "a" in the row'))
    expect(getEditorText('JSON input')).toBe('[1]')
    expect(screen.queryByText(/nested\.json ·/)).not.toBeInTheDocument()
  })

  it('shows the same message for nested JSON that is pasted', () => {
    render(<ToCsv />)
    setEditorText('JSON input', '[{"a":[1]}]')
    expect(screen.getByText(/Nested JSON is not supported/)).toBeInTheDocument()
    expect(getEditorText('CSV output')).toBe('')
  })

  it('rejects files over the size limit without reading them', async () => {
    render(<ToCsv />)
    const big = new File(['x'], 'huge.json')
    Object.defineProperty(big, 'size', { value: 200 * 1024 * 1024 })
    await act(async () => {
      fireEvent.change(screen.getByLabelText('Upload JSON file'), { target: { files: [big] } })
    })
    expect(screen.getByRole('alert')).toHaveTextContent('huge.json is 200.0 MB')
    expect(getEditorText('JSON input')).toBe('')
  })

  it('opens the file picker from the Upload button in the empty state, and has no toolbar Upload or Paste', async () => {
    const user = userEvent.setup()
    render(<ToCsv />)
    expect(screen.queryByRole('button', { name: 'Paste' })).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Upload' })).toHaveLength(1)
    const click = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {})
    await user.click(screen.getByRole('button', { name: 'Upload' }))
    expect(click).toHaveBeenCalledOnce()
    setEditorText('JSON input', '[1]')
    expect(screen.queryByRole('button', { name: 'Upload' })).not.toBeInTheDocument()
  })

  it('makes the output pane read-only', () => {
    render(<ToCsv />)
    expect(getEditor('CSV output').state.readOnly).toBe(true)
    expect(getEditor('JSON input').state.readOnly).toBe(false)
  })
})
