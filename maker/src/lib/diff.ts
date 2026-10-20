import { graphemeSlice, segmentGraphemes } from './grapheme'
import type { TextChange } from '../types'

/**
 * Grapheme diff. A shared prefix and suffix catch the common one-character edit.
 * Anything left in the middle uses LCS so an insertion does not mark every later
 * character as changed.
 */
export function describeChange(change: TextChange): string {
  if (change.kind === 'replace') return `${change.oldText} → ${change.newText}`
  if (change.kind === 'insert') return `插入「${change.newText}」`
  return `删除「${change.oldText}」`
}

export function diffText(oldText: string, newText: string): TextChange[] {
  const oldParts = segmentGraphemes(oldText)
  const newParts = segmentGraphemes(newText)
  let start = 0
  const maxStart = Math.min(oldParts.length, newParts.length)
  while (start < maxStart && oldParts[start] === newParts[start]) start += 1

  let oldEnd = oldParts.length
  let newEnd = newParts.length
  while (oldEnd > start && newEnd > start && oldParts[oldEnd - 1] === newParts[newEnd - 1]) {
    oldEnd -= 1
    newEnd -= 1
  }

  if (start === oldEnd && start === newEnd) return []
  return coalesce(diffMiddle(oldParts, newParts, start, oldEnd, start, newEnd))
    .flatMap(item => splitUnequalReplacement(item, oldParts.length))
}

/** Keep the shared replacement in its old slots; only surplus characters are inserted or deleted. */
function splitUnequalReplacement(item: TextChange, originalLength: number): TextChange[] {
  if (item.kind !== 'replace') return [item]
  const oldParts = segmentGraphemes(item.oldText)
  const newParts = segmentGraphemes(item.newText)
  const paired = Math.min(oldParts.length, newParts.length)
  if (oldParts.length === newParts.length) return [item]
  // A longer opening phrase grows to the left of the unchanged suffix:
  // 我从不失恋 → 老娘从不失恋 inserts 老 before replacing 我 with 娘.
  if (item.oldStart === 0 && item.newStart === 0 && item.oldEnd < originalLength && newParts.length > paired) {
    const surplus = newParts.length - paired
    return [{
      kind: 'insert', oldStart: 0, oldEnd: 0, newStart: 0, newEnd: surplus,
      oldText: '', newText: newParts.slice(0, surplus).join(''),
    }, {
      ...item, newStart: surplus, newText: newParts.slice(surplus).join(''),
    }]
  }
  const replacement: TextChange = {
    ...item,
    oldEnd: item.oldStart + paired,
    newEnd: item.newStart + paired,
    oldText: oldParts.slice(0, paired).join(''),
    newText: newParts.slice(0, paired).join(''),
  }
  return [replacement, {
    kind: oldParts.length > paired ? 'delete' : 'insert',
    oldStart: replacement.oldEnd,
    oldEnd: item.oldEnd,
    newStart: replacement.newEnd,
    newEnd: item.newEnd,
    oldText: oldParts.slice(paired).join(''),
    newText: newParts.slice(paired).join(''),
  }]
}

function diffMiddle(
  oldParts: string[],
  newParts: string[],
  oldStart: number,
  oldEnd: number,
  newStart: number,
  newEnd: number,
): TextChange[] {
  const a = oldParts.slice(oldStart, oldEnd)
  const b = newParts.slice(newStart, newEnd)
  const n = a.length
  const m = b.length
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }

  const changes: TextChange[] = []
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      i += 1
      j += 1
      continue
    }
    if (dp[i + 1][j] >= dp[i][j + 1]) {
      changes.push(change('delete', oldStart + i, oldStart + i + 1, newStart + j, newStart + j, oldParts, newParts))
      i += 1
    } else {
      changes.push(change('insert', oldStart + i, oldStart + i, newStart + j, newStart + j + 1, oldParts, newParts))
      j += 1
    }
  }
  while (i < n) {
    changes.push(change('delete', oldStart + i, oldStart + i + 1, newStart + j, newStart + j, oldParts, newParts))
    i += 1
  }
  while (j < m) {
    changes.push(change('insert', oldStart + i, oldStart + i, newStart + j, newStart + j + 1, oldParts, newParts))
    j += 1
  }
  return changes
}

function change(
  kind: TextChange['kind'],
  oldStart: number,
  oldEnd: number,
  newStart: number,
  newEnd: number,
  oldParts: string[],
  newParts: string[],
): TextChange {
  return {
    kind,
    oldStart,
    oldEnd,
    newStart,
    newEnd,
    oldText: oldParts.slice(oldStart, oldEnd).join(''),
    newText: newParts.slice(newStart, newEnd).join(''),
  }
}

function coalesce(changes: TextChange[]): TextChange[] {
  const merged: TextChange[] = []
  for (const item of changes) {
    const prev = merged.at(-1)
    if (!prev || prev.oldEnd !== item.oldStart || prev.newEnd !== item.newStart) {
      merged.push({ ...item })
      continue
    }
    prev.oldEnd = item.oldEnd
    prev.newEnd = item.newEnd
    prev.oldText += item.oldText
    prev.newText += item.newText
    prev.kind = prev.oldText && prev.newText ? 'replace' : prev.newText ? 'insert' : 'delete'
  }
  return merged.map((item) => ({
    ...item,
    oldText: item.oldText || graphemeSlice(item.oldText, 0, 0),
    newText: item.newText,
  }))
}
