/** Grapheme clusters. Intl.Segmenter is preferred; a code-point fallback covers older engines. */
export function segmentGraphemes(text: string): string[] {
  const segmenter = (Intl as typeof Intl & { Segmenter?: typeof Intl.Segmenter }).Segmenter
  if (typeof segmenter === 'function') {
    return [...new segmenter(undefined, { granularity: 'grapheme' }).segment(text)].map((part) => part.segment)
  }
  return [...text]
}

export function graphemeSlice(text: string, start: number, end: number): string {
  return segmentGraphemes(text).slice(start, end).join('')
}

/** One typed cell can hold several characters. Each character becomes its own cell. */
export function spreadCellValue(cells: string[], index: number, value: string): { cells: string[]; focus: number } {
  const graphemes = segmentGraphemes(value)
  if (graphemes.length <= 1) {
    const next = cells.slice()
    next[index] = graphemes[0] ?? ''
    return { cells: next, focus: index }
  }
  return {
    cells: [...cells.slice(0, index), ...graphemes, ...cells.slice(index + 1)],
    focus: index + graphemes.length - 1,
  }
}
