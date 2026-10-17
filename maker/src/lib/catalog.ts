import type { CatalogImage } from '../types'

const MEDIA_PATH = /^media\/[a-f0-9]{64}\.(?:png|jpe?g|webp|gif|avif|bmp)$/i

export function makerBaseUrl(base = import.meta.env.BASE_URL, origin = 'https://zhaoolee.com'): URL {
  return new URL(base, origin.endsWith('/') ? origin : `${origin}/`)
}

/** Hugo site root is the parent of the Maker base `/ChineseBQB/maker/`. */
export function siteBaseFrom(makerBase: URL): URL {
  return new URL('../', makerBase)
}

export function siteAsset(path: string, siteBase: URL): string {
  return new URL(path.replace(/^\/+/, ''), siteBase).href
}

export function normalizeQueryPath(raw: string | null | undefined): string | null {
  if (!raw) return null
  const value = raw.trim()
  if (!value || value.includes('\\') || value.includes('..')) return null
  if (/^[a-z][a-z0-9+.-]*:/i.test(value) || value.startsWith('//')) return null
  if (value.includes('?') || value.includes('#')) return null
  let decoded = value
  try {
    decoded = decodeURIComponent(value)
  } catch {
    return null
  }
  if (decoded.includes('..') || decoded.includes('\\') || decoded.includes('?') || decoded.includes('#')) return null
  const path = decoded.replace(/^\/+/, '')
  return MEDIA_PATH.test(path) ? path : null
}

export function sameOriginMedia(src: string, siteBase: URL, origin: string): boolean {
  const url = new URL(src, siteBase)
  const mediaRoot = new URL('media/', siteBase)
  return url.origin === origin && url.href.startsWith(mediaRoot.href)
}

export function readCatalog(payload: unknown): CatalogImage[] {
  if (!Array.isArray(payload)) throw new Error('素材索引不是列表')
  const images: CatalogImage[] = []
  for (const entry of payload) {
    if (!entry || typeof entry !== 'object') continue
    const record = entry as Record<string, unknown>
    const src = typeof record.src === 'string' ? normalizeQueryPath(record.src) : null
    const thumb = typeof record.thumb === 'string' ? record.thumb : ''
    const name = typeof record.name === 'string' ? record.name : ''
    if (!src || !name || !thumb.startsWith('thumbs/')) continue
    const image: CatalogImage = {
      name,
      src,
      thumb,
      label: typeof record.label === 'string' ? record.label : name,
      animated: record.animated === true,
      width: typeof record.width === 'number' ? record.width : undefined,
      height: typeof record.height === 'number' ? record.height : undefined,
      category: typeof record.category === 'string' ? record.category : undefined,
      categoryTitle: typeof record.categoryTitle === 'string' ? record.categoryTitle : undefined,
      folder: typeof record.folder === 'string' ? record.folder : undefined,
      path: typeof record.path === 'string' ? record.path : undefined,
    }
    const previous = images.find((item) => item.src === src)
    if (!previous) {
      images.push(image)
      continue
    }
    if (labelScore(image.label) > labelScore(previous.label)) {
      images[images.indexOf(previous)] = image
    }
  }
  return images
}

function labelScore(label: string): number {
  const cjk = label.replace(/[^\u3400-\u9fff]/g, '').length
  return cjk * 100 + label.length
}

export function catalogIndex(images: CatalogImage[]): Map<string, CatalogImage> {
  return new Map(images.map((image) => [image.src, image]))
}

export type SrcDecision =
  | { ok: true; image: CatalogImage }
  | { ok: false; reason: string }

export function decideCatalogSrc(raw: string | null | undefined, images: CatalogImage[]): SrcDecision {
  const path = normalizeQueryPath(raw ?? '')
  if (!path) return { ok: false, reason: '链接不是本站素材，已回到素材列表。' }
  const image = catalogIndex(images).get(path)
  if (!image) return { ok: false, reason: '这张图不在当前素材索引里。' }
  return { ok: true, image }
}

export function matchesQuery(image: CatalogImage, query: string): boolean {
  const normalize = (value: string) => value.normalize('NFKC').toLocaleLowerCase()
  const haystack = normalize(`${image.name} ${image.label} ${image.categoryTitle ?? ''} ${image.folder ?? ''}`)
  const words = normalize(query).trim().split(/\s+/).filter(Boolean)
  return words.every((word) => haystack.includes(word))
}
