import { expect, it } from 'vitest'
import { galleryLayout } from '../src/lib/gallery-layout'
import type { CatalogImage } from '../src/types'

function images(count: number): CatalogImage[] {
  return Array.from({ length: count }, (_, i) => ({ name: `test-${i}`, label: `test-${i}`, src: `media/test-${i}.png`, thumb: `thumbs/test-${i}.webp`, animated: false,
    width: 320, height: [160, 320, 480, 240][i % 4] }))
}

it('loads beyond the old 80-card boundary without moving any previously visible card', () => {
  const items = images(241)
  for (const width of [160, 366, 1240]) {
    const first = galleryLayout(items.slice(0, 80), width)
    const next = galleryLayout(items.slice(0, 160), width)
    const all = galleryLayout(items, width)
    expect(next.cards.slice(0, 80)).toEqual(first.cards)
    expect(all.cards.slice(0, 160)).toEqual(next.cards)
    expect(all.cards).toHaveLength(241)
    expect(all.height).toBeGreaterThan(next.height)
  }
})

it('fits all cards inside narrow and wide containers without overlapping or clipping the final row', () => {
  for (const width of [100, 366, 800]) {
    const { cards, height } = galleryLayout(images(200), width)
    cards.forEach((card, i) => {
      expect(card.left).toBeGreaterThanOrEqual(0)
      expect(card.left + card.width).toBeLessThanOrEqual(width + 0.001)
      expect(card.top + card.height).toBeLessThanOrEqual(height + 0.001)
      for (const previous of cards.slice(0, i)) {
        if (previous.left === card.left) expect(previous.top + previous.height).toBeLessThanOrEqual(card.top)
      }
    })
  }
})

it('keeps skeleton geometry valid when metadata is absent or invalid', () => {
  const items = images(4)
  items[0].width = undefined
  items[1].width = 0
  items[2].height = Number.NaN
  items[3].height = Number.POSITIVE_INFINITY
  const { cards } = galleryLayout(items, 300)
  expect(cards.every(card => Number.isFinite(card.height))).toBe(true)
  expect(cards.map(card => card.height)).toEqual(Array(4).fill(cards[0].height))
  expect(galleryLayout([], 300)).toEqual({cards: [], height: 0})
  expect(galleryLayout(items, 0)).toEqual({cards: [], height: 0})
})
