/** Saves `text` as a file. A byte-order mark is added for CSV so Excel reads UTF-8 correctly. */
export function downloadText(text: string, filename: string, type: string, bom = false) {
  const blob = new Blob(bom ? ['﻿', text] : [text], { type: `${type};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.append(a)
  a.click()
  a.remove()
  // Revoking right away can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
