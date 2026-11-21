import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { getEditorText } from '../test/editor'
import { Editor } from './Editor'

const noop = () => {}

describe('Editor', () => {
  it('follows the value when it is changed from outside', () => {
    const { rerender } = render(<Editor value="a" onChange={noop} marks={{}} label="Box" />)
    rerender(<Editor value="b" onChange={noop} marks={{}} label="Box" />)
    expect(getEditorText('Box')).toBe('b')
  })

  // Changing the placeholder rebuilds the editor. It must come back with the current
  // value and marks, not the ones it was first rendered with.
  it('keeps the current value and marks when it is rebuilt', () => {
    const props = { onChange: noop, label: 'Box' }
    const { rerender, container } = render(<Editor {...props} value="a" marks={{}} placeholderText="one" />)
    rerender(<Editor {...props} value="b" marks={{ 1: 'err' }} placeholderText="one" />)
    rerender(<Editor {...props} value="b" marks={{ 1: 'err' }} placeholderText="two" />)
    expect(getEditorText('Box')).toBe('b')
    expect(container.querySelector('.cm-line.cm-diff-err')).not.toBeNull()
  })
})
