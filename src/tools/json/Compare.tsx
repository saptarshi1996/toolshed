import { useMemo, useState } from 'react'
import { CopyButton, PasteButton } from '../../components/ClipboardButtons'
import { Editor } from '../../components/Editor'
import { compareJson, type Change, type SideResult } from '../../lib/jsonDiff'
import '../../components/ToolPage.css'
import './Compare.css'

const SYMBOL = { add: '+', del: '−', chg: '~' } as const

function show(v: unknown) {
  const t = JSON.stringify(v)
  return t.length > 70 ? `${t.slice(0, 67)}…` : t
}

function prettify(text: string) {
  try {
    return JSON.stringify(JSON.parse(text), null, 2)
  } catch {
    return text
  }
}

function status(side: SideResult) {
  if (side.error) return `Line ${side.error.line} · ${side.error.message}`
  return side.empty ? '' : `${side.lineCount} ${side.lineCount === 1 ? 'line' : 'lines'}`
}

function Pane(props: {
  title: string
  value: string
  onChange: (v: string) => void
  result: SideResult
}) {
  const { title, value, onChange, result } = props
  return (
    <section className="pane">
      <header className="pane-head">
        <h2>{title}</h2>
        <span className={result.error ? 'pane-status pane-status-bad' : 'pane-status'}>{status(result)}</span>
        <PasteButton onPaste={onChange} />
        <CopyButton text={value} />
        <button className="link" disabled={!!result.error || result.empty} onClick={() => onChange(prettify(value))}>
          Format
        </button>
        <button className="link" disabled={value === ''} onClick={() => onChange('')}>
          Clear
        </button>
      </header>
      <Editor
        value={value}
        onChange={onChange}
        marks={result.marks}
        label={`${title} JSON`}
        placeholderText="Paste JSON here"
      />
    </section>
  )
}

function Summary(props: {
  changes: Change[] | null
  note: { title: string; hint: string } | null
  query: string
  onQueryChange: (q: string) => void
}) {
  const { changes, note, query, onQueryChange } = props
  if (!changes) {
    return (
      <div className="summary-head">
        <b>{note?.title}</b>
        <span className="summary-hint">{note?.hint}</span>
      </div>
    )
  }
  const count = (k: Change['kind']) => changes.filter((c) => c.kind === k).length
  const q = query.trim().toLowerCase()
  const visible = q
    ? changes.filter((c) =>
        `${c.path} ${c.before === undefined ? '' : JSON.stringify(c.before)} ${c.after === undefined ? '' : JSON.stringify(c.after)}`
          .toLowerCase()
          .includes(q),
      )
    : changes
  return (
    <>
      <div className="summary-head">
        {changes.length === 0 ? (
          <>
            <b>No differences</b>
            <span className="pill pill-add">Identical</span>
          </>
        ) : (
          <>
            <b>
              {changes.length} difference{changes.length > 1 ? 's' : ''}
            </b>
            {count('add') > 0 && <span className="pill pill-add">{count('add')} added</span>}
            {count('del') > 0 && <span className="pill pill-del">{count('del')} removed</span>}
            {count('chg') > 0 && <span className="pill pill-chg">{count('chg')} changed</span>}
          </>
        )}
        {changes.length > 0 && (
          <label className="filter">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              <circle cx="7" cy="7" r="5" />
              <path d="m11 11 3.5 3.5" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Escape' && onQueryChange('')}
              placeholder="Filter differences"
              aria-label="Filter differences"
            />
            {q && (
              <span className="filter-count">
                {visible.length} of {changes.length}
              </span>
            )}
          </label>
        )}
      </div>
      {q && visible.length === 0 && <p className="no-match">No differences match “{query.trim()}”.</p>}
      <ul className="changes">
        {visible.map((c, i) => (
          <li className={`change change-${c.kind}`} key={`${c.path}-${i}`}>
            <span className="change-mark">{SYMBOL[c.kind]}</span>
            <span className="change-path">{c.path || '(root)'}</span>
            <span className="change-value">
              {c.kind !== 'add' && <s>{show(c.before)}</s>}
              {c.kind === 'chg' && ' → '}
              {c.kind !== 'del' && <em>{show(c.after)}</em>}
            </span>
          </li>
        ))}
      </ul>
    </>
  )
}

export function Compare() {
  const [left, setLeft] = useState('')
  const [right, setRight] = useState('')
  const [sort, setSort] = useState(false)
  const [filter, setFilter] = useState('')

  const result = useMemo(() => compareJson(left, right, { sortArrays: sort }), [left, right, sort])

  let note: { title: string; hint: string } | null = null
  if (!result.changes) {
    const bad = [result.left.error && 'left', result.right.error && 'right'].filter(Boolean)
    note = bad.length
      ? {
          title: bad.length === 2 ? 'Both sides contain invalid JSON' : `The ${bad[0]} side contains invalid JSON`,
          hint: 'Fix the red line to see the differences',
        }
      : { title: 'Paste JSON on both sides', hint: 'Differences appear as you type' }
  }

  return (
    <div className="tool-page">
      <div className="tool-head">
        <h1>Compare JSON</h1>
        <label className="switch">
          <input type="checkbox" checked={sort} onChange={(e) => setSort(e.target.checked)} />
          Ignore array order
        </label>
      </div>
      <p className="tool-sub">
        Paste two JSON documents to see exactly what was added, removed, or changed.
      </p>

      <div className="compare-work">
        <div className="panes">
          <Pane title="Left" value={left} onChange={setLeft} result={result.left} />
          <Pane title="Right" value={right} onChange={setRight} result={result.right} />
        </div>
        <section className="summary" aria-live="polite">
          <Summary changes={result.changes} note={note} query={filter} onQueryChange={setFilter} />
        </section>
      </div>
    </div>
  )
}
