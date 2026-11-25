import { useDeferredValue, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { CopyButton } from '../../components/ClipboardButtons'
import { Editor } from '../../components/Editor'
import { Icon } from '../../components/Icon'
import { downloadText } from '../../lib/download'
import { csvText, jsonToCsv } from '../../lib/jsonCsv'
import { parseJson } from '../../lib/jsonDiff'
import { prettyJson } from '../../lib/jsonParse'
import { decodeJsonFile, sanitizeJson } from '../../lib/jsonSanitize'
import '../../components/ToolPage.css'
import './ToCsv.css'

/** Files up to this size open in the editor in full and stay editable. */
const EDITABLE_CHARS = 1_000_000
/** Bigger files show only this much of their start; the whole file is still converted. */
const PREVIEW_CHARS = 100_000
const PREVIEW_ROWS = 200
const MAX_FILE_BYTES = 100 * 1024 * 1024

interface FileInfo {
  name: string
  size: number
  fixes: string[]
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10240 ? 1 : 0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

/** The start of a big text, cut at a line break when there is one so no line is shown half way. */
function previewOf(text: string) {
  if (text.length <= PREVIEW_CHARS) return text
  const cut = text.slice(0, PREVIEW_CHARS)
  const nl = cut.lastIndexOf('\n')
  return nl > PREVIEW_CHARS / 2 ? cut.slice(0, nl) : cut
}

export function ToCsv() {
  const [text, setText] = useState('')
  const [file, setFile] = useState<FileInfo | null>(null)
  // Set only for files too big for the editor: the full text lives here, the editor shows a preview.
  const [large, setLarge] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [fileError, setFileError] = useState('')
  const [dragging, setDragging] = useState(false)
  const picker = useRef<HTMLInputElement>(null)

  const source = large ?? text
  const deferred = useDeferredValue(source)
  const result = useMemo(() => jsonToCsv(deferred), [deferred])
  const error = !result.ok && !result.empty ? result : null
  const shown = large !== null ? previewOf(large) : text

  const full = useMemo(() => (result.ok ? csvText(result) : ''), [result])
  const preview = useMemo(() => (result.ok ? csvText(result, PREVIEW_ROWS) : ''), [result])
  const rows = result.ok ? result.records.length : 0
  const truncated = rows > PREVIEW_ROWS

  function reset(next: string) {
    setText(next)
    setLarge(null)
    setFile(null)
    setFileError('')
  }

  async function load(f: File) {
    if (f.size > MAX_FILE_BYTES) {
      setFileError(`${f.name} is ${formatSize(f.size)}. Files over ${formatSize(MAX_FILE_BYTES)} are too big for the browser to handle here.`)
      return
    }
    setBusy(true)
    setFileError('')
    try {
      const decoded = decodeJsonFile(await f.arrayBuffer())
      const { text: cleaned, fixes } = sanitizeJson(decoded.text)
      const check = jsonToCsv(cleaned)
      if (!check.ok && check.nested) {
        setFileError(`${f.name} was not loaded. ${check.message}`)
        return
      }
      setFile({ name: f.name, size: f.size, fixes: [...decoded.fixes, ...fixes] })
      if (cleaned.length > EDITABLE_CHARS) {
        setLarge(cleaned)
        setText('')
      } else {
        setLarge(null)
        setText(parseJson(cleaned).ok ? prettyJson(cleaned) : cleaned)
      }
    } catch {
      setFileError(`Could not read ${f.name}.`)
    } finally {
      setBusy(false)
    }
  }

  function onPick(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    e.target.value = '' // so choosing the same file again still fires
    if (f) void load(f)
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) void load(f)
  }

  const download = () =>
    downloadText(full, `${file ? file.name.replace(/\.[^.]*$/, '') || 'data' : 'data'}.csv`, 'text/csv', true)

  const inputStatus =
    error && error.line > 0 ? `Line ${error.line} · ${error.message}` : error ? error.message : file ? `${file.name} · ${formatSize(file.size)}` : ''

  return (
    <div className="tool-page">
      <div className="tool-head">
        <h1>JSON to CSV</h1>
      </div>
      <p className="tool-sub">
        Paste JSON or upload a file, then download it as CSV. Uploads are cleaned up first; pasted text is left for you to fix.
      </p>

      <div className="tool-work">
        <div className="panes">
          <section
            className={dragging ? 'pane pane-drop' : 'pane'}
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
          >
            <header className="pane-head">
              <h2>JSON</h2>
              <span className={error ? 'pane-status pane-status-bad' : 'pane-status'}>{busy ? 'Reading file…' : inputStatus}</span>
              <input ref={picker} type="file" accept=".json,.jsonl,.ndjson,.txt,application/json" hidden aria-label="Upload JSON file" onChange={onPick} />
              <button className="link" disabled={source === '' && !file} onClick={() => reset('')}>
                Clear
              </button>
            </header>
            {fileError && (
              <p className="pane-note pane-note-bad" role="alert">
                {fileError}
              </p>
            )}
            {file && file.fixes.length > 0 && (
              <p className="pane-note" role="status">
                Cleaned up: {file.fixes.join('; ')}.
              </p>
            )}
            {large !== null && (
              <p className="pane-note" role="status">
                Large file. The editor shows the first {formatSize(PREVIEW_CHARS)} and can’t be edited; the whole file is converted.
              </p>
            )}
            <div className="pane-body">
              <Editor
                value={shown}
                onChange={setText}
                marks={error && error.line > 0 ? { [error.line]: 'err' } : {}}
                label="JSON input"
                readOnly={large !== null}
                wrap={large !== null}
              />
              {shown === '' && !busy && (
                <div className="empty">
                  <span className="empty-icon" aria-hidden="true">
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M8 10.5V2.5M5 5.5l3-3 3 3" />
                      <path d="M2.5 10v2A1.5 1.5 0 0 0 4 13.5h8a1.5 1.5 0 0 0 1.5-1.5v-2" />
                    </svg>
                  </span>
                  <h3>Drop a JSON file here</h3>
                  <p>or paste JSON into this pane. Files over 1 MB open as a preview.</p>
                  <button className="link link-primary" onClick={() => picker.current?.click()}>
                    Upload
                  </button>
                </div>
              )}
            </div>
          </section>

          <section className="pane">
            <header className="pane-head">
              <h2>CSV</h2>
              <span className="pane-status">{result.ok ? `${rows.toLocaleString()} rows · ${result.columns} columns` : ''}</span>
              <CopyButton text={full} />
              <button className="link link-primary" disabled={!result.ok} onClick={download}>
                Download CSV
              </button>
            </header>
            {result.ok && result.unwrapped !== undefined && (
              <p className="pane-note" role="status">
                Using the “{result.unwrapped}” array as the rows.
              </p>
            )}
            {truncated && (
              <p className="pane-note" role="status">
                Showing the first {PREVIEW_ROWS} of {rows.toLocaleString()} rows. Copy and Download include all of them.
              </p>
            )}
            <div className="pane-body">
              <Editor value={preview} onChange={() => {}} marks={{}} label="CSV output" readOnly plain />
              {preview === '' && (
                <div className="empty">
                  <span className="empty-icon" aria-hidden="true">
                    <Icon name="csv" />
                  </span>
                  <h3>{error ? 'Fix the JSON to see the CSV' : 'Your CSV appears here'}</h3>
                  <p>{error ? 'The error is shown above the editor, with its line.' : 'Each object becomes a row, and each key a column.'}</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
