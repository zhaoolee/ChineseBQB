import type { CatalogImage } from '../types'

export const GALLERY_BATCH_SIZE = 80
const GAP = 10
const MIN_COLUMN_WIDTH = 148
// Two 6px paddings, two 1px borders, an 18px caption and its 4px top margin.
const CARD_CHROME = 36

/** Append-only placement: adding a batch never moves earlier cards at the same width. */
export function galleryLayout(images: CatalogImage[], width: number) {
  if (width <= 0) return { cards: [], height: 0 }
  const columns = Math.max(1, Math.floor((width + GAP) / (MIN_COLUMN_WIDTH + GAP)))
  const columnWidth = (width - GAP * (columns - 1)) / columns
  const heights = Array<number>(columns).fill(0)
  const cards = images.map(image => {
    const valid = Number.isFinite(image.width) && Number.isFinite(image.height) && image.width! > 0 && image.height! > 0
    const ratio = valid ? image.height! / image.width! : 1
    const column = heights.indexOf(Math.min(...heights))
    const card = { left: column * (columnWidth + GAP), top: heights[column], width: columnWidth,
      height: Math.max(1, columnWidth - 14) * ratio + CARD_CHROME }
    heights[column] += card.height + GAP
    return card
  })
  return { cards, height: Math.max(0, ...heights) - (images.length ? GAP : 0) }
}
