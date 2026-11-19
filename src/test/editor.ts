import { act } from '@testing-library/react'
import { screen } from '@testing-library/react'
import { EditorView } from '@codemirror/view'

/** Finds a CodeMirror editor by its accessible name, e.g. "Left JSON". */
export function getEditor(label: string) {
  const view = EditorView.findFromDOM(screen.getByLabelText(label))
  if (!view) throw new Error(`No editor labelled "${label}"`)
  return view
}

/** Replaces the whole document, as if the user had pasted over it. */
export function setEditorText(label: string, text: string) {
  const view = getEditor(label)
  act(() => {
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: text } })
  })
}

export function getEditorText(label: string) {
  return getEditor(label).state.doc.toString()
}
