import { useEffect, useRef } from 'react'
import { EditorState, RangeSet, StateEffect, StateField, type Text } from '@codemirror/state'
import {
  Decoration,
  EditorView,
  GutterMarker,
  gutterLineClass,
  keymap,
  lineNumbers,
  placeholder,
  type DecorationSet,
} from '@codemirror/view'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { bracketMatching, HighlightStyle, indentUnit, syntaxHighlighting } from '@codemirror/language'
import { json } from '@codemirror/lang-json'
import { tags } from '@lezer/highlight'
import type { LineMarks } from '../lib/jsonDiff'

interface Props {
  value: string
  onChange: (value: string) => void
  /** Line number (1-based) to diff state, painted behind the line and in the gutter. */
  marks: LineMarks
  label: string
  placeholderText?: string
}

class MarkGutter extends GutterMarker {
  elementClass: string
  constructor(cls: string) {
    super()
    this.elementClass = cls
  }
  eq(other: MarkGutter) {
    return other.elementClass === this.elementClass
  }
}

interface MarkState {
  lines: DecorationSet
  gutter: RangeSet<GutterMarker>
}

const setMarks = StateEffect.define<LineMarks>()

function buildMarks(doc: Text, marks: LineMarks): MarkState {
  const lines = []
  const gutter = []
  for (const [n, kind] of Object.entries(marks)) {
    const num = Number(n)
    if (num < 1 || num > doc.lines) continue
    const from = doc.line(num).from
    const cls = `cm-diff-${kind}`
    lines.push(Decoration.line({ class: cls }).range(from))
    gutter.push(new MarkGutter(cls).range(from))
  }
  return { lines: Decoration.set(lines, true), gutter: RangeSet.of(gutter, true) }
}

const markField = StateField.define<MarkState>({
  create: () => ({ lines: Decoration.none, gutter: RangeSet.empty }),
  update(value, tr) {
    for (const e of tr.effects) if (e.is(setMarks)) return buildMarks(tr.state.doc, e.value)
    if (tr.docChanged) return { lines: value.lines.map(tr.changes), gutter: value.gutter.map(tr.changes) }
    return value
  },
  provide: (f) => [
    EditorView.decorations.from(f, (v) => v.lines),
    gutterLineClass.from(f, (v) => v.gutter),
  ],
})

const theme = EditorView.theme({
  '&': { height: '100%', fontSize: '12.5px', backgroundColor: 'transparent' },
  '&.cm-focused': { outline: 'none' },
  '.cm-scroller': { fontFamily: 'var(--mono)', lineHeight: '20px', overflow: 'auto' },
  '.cm-content': { padding: '6px 0', caretColor: 'var(--text)' },
  '.cm-line': { padding: '0 14px 0 4px' },
  '.cm-gutters': { backgroundColor: 'transparent', color: 'var(--text3)', border: 'none' },
  '.cm-lineNumbers .cm-gutterElement': { padding: '0 12px 0 14px', minWidth: '44px' },
  '.cm-content ::selection, .cm-content::selection': { backgroundColor: 'var(--accent-soft)' },
  '.cm-placeholder': { color: 'var(--text3)' },
  '.cm-matchingBracket': { backgroundColor: 'var(--fill-strong)', outline: 'none' },
  '.cm-diff-add': { backgroundColor: 'var(--add-bg)' },
  '.cm-diff-del': { backgroundColor: 'var(--del-bg)' },
  '.cm-diff-chg': { backgroundColor: 'var(--chg-bg)' },
  '.cm-diff-err': { backgroundColor: 'var(--del-bg)' },
  '.cm-gutterElement.cm-diff-add': { color: 'var(--add)' },
  '.cm-gutterElement.cm-diff-del, .cm-gutterElement.cm-diff-err': { color: 'var(--del)' },
  '.cm-gutterElement.cm-diff-chg': { color: 'var(--chg)' },
})

const highlight = syntaxHighlighting(
  HighlightStyle.define([
    { tag: tags.propertyName, color: 'var(--syn-key)' },
    { tag: tags.string, color: 'var(--syn-string)' },
    { tag: tags.number, color: 'var(--syn-number)' },
    { tag: [tags.bool, tags.null], color: 'var(--syn-const)' },
    { tag: [tags.punctuation, tags.separator], color: 'var(--text2)' },
  ]),
)

export function Editor({ value, onChange, marks, label, placeholderText }: Props) {
  const host = useRef<HTMLDivElement>(null)
  const view = useRef<EditorView | null>(null)
  const initial = useRef({ value, marks })
  const onChangeRef = useRef(onChange)

  useEffect(() => {
    onChangeRef.current = onChange
  })

  useEffect(() => {
    const v = new EditorView({
      parent: host.current!,
      state: EditorState.create({
        doc: initial.current.value,
        extensions: [
          lineNumbers(),
          history(),
          keymap.of([...defaultKeymap, ...historyKeymap]),
          json(),
          highlight,
          bracketMatching(),
          indentUnit.of('  '),
          EditorState.tabSize.of(2),
          markField,
          theme,
          placeholderText ? placeholder(placeholderText) : [],
          EditorView.contentAttributes.of({ 'aria-label': label, spellcheck: 'false' }),
          EditorView.updateListener.of((u) => {
            if (u.docChanged) onChangeRef.current(u.state.doc.toString())
          }),
        ],
      }),
    })
    v.dispatch({ effects: setMarks.of(initial.current.marks) })
    view.current = v
    return () => {
      v.destroy()
      view.current = null
    }
  }, [label, placeholderText])

  // Replace the document when the value is changed from outside (Format, Clear).
  useEffect(() => {
    const v = view.current
    if (v && v.state.doc.toString() !== value) {
      v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: value } })
    }
  }, [value])

  useEffect(() => {
    view.current?.dispatch({ effects: setMarks.of(marks) })
  }, [marks])

  return <div className="editor" ref={host} />
}
