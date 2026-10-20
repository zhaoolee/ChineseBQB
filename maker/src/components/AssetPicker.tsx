import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { matchesQuery } from '../lib/catalog'
import { assetUrl, loadCatalog, openCatalogImage, openLocalFile } from '../state/editor-store'
import type { CatalogImage } from '../types'
import { useEditor } from './use-editor'
import { GALLERY_BATCH_SIZE, galleryLayout } from '../lib/gallery-layout'

/** First visible thumbnails decode eagerly; the rest stay lazy so the sheet is not one big decode burst. */
const EAGER_THUMBS = 4
/** Bounded warm-up for the first thumbnails, skipped when the network is metered or OCR is busy. */
const PRELOAD_THUMBS = 12

function prefersSaveData(): boolean {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
  return connection?.saveData === true
}

function thumbRatio(image: CatalogImage): string {
  const width = image.width ?? 0
  const height = image.height ?? 0
  const valid = Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0
  return valid ? `${width} / ${height}` : '1 / 1'
}

type ThumbStatus = 'thumb-loading' | 'thumb-loaded' | 'thumb-error'

function ThumbTile({
  image,
  selected,
  eager,
  buttonRef,
  onPick,
  style,
}: {
  image: CatalogImage
  selected: boolean
  eager: boolean
  buttonRef: RefObject<HTMLButtonElement | null>
  onPick: () => void
  style: CSSProperties
}) {
  const [status, setStatus] = useState<ThumbStatus>('thumb-loading')
  const imgRef = useRef<HTMLImageElement>(null)

  // A cached thumbnail can finish before the load handler is attached, so settle from the element itself.
  useEffect(() => {
    const node = imgRef.current
    if (node?.complete) setStatus(node.naturalWidth > 0 ? 'thumb-loaded' : 'thumb-error')
  }, [])

  return (
    <button
      ref={selected ? buttonRef : undefined}
      type="button"
      className={selected ? 'thumb selected' : 'thumb'}
      aria-pressed={selected}
      title={image.label}
      style={style}
      onClick={onPick}
    >
      <span className={`thumb-media ${status}`} style={{ aspectRatio: thumbRatio(image) }}>
        <img
          ref={imgRef}
          src={assetUrl(image.thumb)}
          alt=""
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={eager ? 'auto' : 'low'}
          onLoad={() => setStatus('thumb-loaded')}
          onError={() => setStatus('thumb-error')}
        />
        {status === 'thumb-error' && <span className="thumb-fallback">缩略图没加载出来</span>}
        {image.animated && <em>动图</em>}
      </span>
      <span className="thumb-label">{image.label}</span>
    </button>
  )
}

export function AssetPicker() {
  const state = useEditor()
  const selectedRef = useRef<HTMLButtonElement>(null)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const categories = useMemo(
    () => [...new Set(state.catalog.map((image) => image.categoryTitle).filter((title): title is string => Boolean(title)))],
    [state.catalog],
  )
  const matched = useMemo(() => state.catalog.filter((image) => (
    (!category || image.categoryTitle === category) && matchesQuery(image, query)
  )), [state.catalog, category, query])
  const selectionKey = `${category}\u0000${query}`
  const [page, setPage] = useState({ key: selectionKey, limit: GALLERY_BATCH_SIZE })
  const limit = page.key === selectionKey ? page.limit : GALLERY_BATCH_SIZE
  const visible = useMemo(() => matched.slice(0, limit), [matched, limit])
  const warmImages = useMemo(() => matched.slice(0, PRELOAD_THUMBS), [matched])
  const hasMore = visible.length < matched.length
  const scrollRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const moreRef = useRef<HTMLDivElement>(null)
  const [gridWidth, setGridWidth] = useState(0)
  const layout = useMemo(() => galleryLayout(visible, gridWidth), [visible, gridWidth])
  const selectedId = state.image?.source.id
  const searching = query.trim().length > 0
  const [expanded, setExpanded] = useState(
    () => !(new URLSearchParams(location.search).get("src") ?? "").trim(),
  )
  const [previewPane, setPreviewPane] = useState<HTMLElement | null>(null)
  const [headerActions, setHeaderActions] = useState<HTMLElement | null>(null)
  const seenSource = useRef('')
  // Collapsing unmounts the scroll DOM, so the offset has to live in a ref. `key === null` means this
  // filter never had a recorded position, which lets the first open still focus the selected thumb.
  const scrollMemory = useRef<{ key: string | null; top: number }>({ key: null, top: 0 })
  const restorePending = useRef(false)
  const rememberedKey = useRef<string | null>(null)
  const rememberScroll = () => {
    const scroller = scrollRef.current
    if (scroller) scrollMemory.current = { key: selectionKey, top: scroller.scrollTop }
  }
  const collapsePicker = () => {
    rememberScroll()
    setExpanded(false)
  }
  const expandPicker = () => {
    // One-shot: the restore pass below consumes this so later batches and re-renders leave scrollTop alone.
    restorePending.current = true
    setExpanded(true)
  }

  const loadMore = () => setPage(current => ({ key: selectionKey,
    limit: Math.min(matched.length, (current.key === selectionKey ? current.limit : GALLERY_BATCH_SIZE) + GALLERY_BATCH_SIZE),
  }))

  useLayoutEffect(() => {
    const grid = gridRef.current
    if (!expanded || !grid) return
    const measure = () => setGridWidth(grid.clientWidth)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(grid)
    return () => observer.disconnect()
  }, [expanded, previewPane])

  useLayoutEffect(() => {
    setPage({ key: selectionKey, limit: GALLERY_BATCH_SIZE })
    if (scrollRef.current) scrollRef.current.scrollTop = 0
    // A filter change starts at the top, and that top becomes this filter's saved position so a reopen
    // never restores the previous filter's offset. The mount pass records nothing for the same reason
    // the first open may still focus the selected thumb.
    if (rememberedKey.current !== null && rememberedKey.current !== selectionKey) {
      scrollMemory.current = { key: selectionKey, top: 0 }
    }
    rememberedKey.current = selectionKey
  }, [selectionKey])

  // Restore only once per expand, and only after width and height are settled: restoring against a stale
  // height would let the browser clamp scrollTop before the taller grid exists.
  useLayoutEffect(() => {
    if (!expanded || !restorePending.current) return
    const scroller = scrollRef.current
    const grid = gridRef.current
    if (!scroller || !grid) return
    const width = grid.clientWidth
    if (width <= 0 || width !== gridWidth) return
    if (visible.length > 0 && layout.height <= 0) return
    const saved = scrollMemory.current
    restorePending.current = false
    if (saved.key === selectionKey) scroller.scrollTop = saved.top
    else selectedRef.current?.scrollIntoView({ inline: 'nearest', block: 'nearest' })
  }, [expanded, previewPane, gridWidth, layout.height, selectionKey])

  useEffect(() => {
    const root = scrollRef.current
    const sentinel = moreRef.current
    if (!expanded || !hasMore || gridWidth <= 0 || !root || !sentinel || typeof IntersectionObserver === 'undefined') return
    let requested = false
    const observer = new IntersectionObserver(entries => {
      if (!requested && entries.some(entry => entry.isIntersecting)) {
        requested = true
        loadMore()
      }
    }, { root, rootMargin: '600px 0px' })
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [expanded, hasMore, gridWidth, visible.length, selectionKey, matched.length])

  useEffect(() => {
    if (state.catalog.length === 0 && !state.catalogLoading && !state.catalogError) void loadCatalog()
  }, [state.catalog.length, state.catalogLoading, state.catalogError])

  useEffect(() => {
    const sourceId = selectedId ?? ''
    // Same collapse path as the toggle so picking an image still records the offset it was picked from.
    if (sourceId && sourceId !== seenSource.current) collapsePicker()
    seenSource.current = sourceId
  }, [selectedId])

  useEffect(() => {
    setPreviewPane(document.getElementById('preview-pane'))
    setHeaderActions(document.getElementById('header-actions'))
  }, [])

  // Warm up only the first screen of thumbnails once the index is in, and hold off while OCR owns the CPU.
  useEffect(() => {
    if (!warmImages.length || state.ocrStatus === 'loading' || prefersSaveData()) return
    const queue = warmImages
    if (!queue.length) return
    const preloaded: HTMLImageElement[] = []
    let cancelled = false
    const start = () => {
      if (cancelled) return
      for (const image of queue) {
        const img = new Image()
        img.decoding = 'async'
        img.fetchPriority = 'low'
        img.src = assetUrl(image.thumb)
        preloaded.push(img)
      }
    }
    const canIdle = typeof window.requestIdleCallback === 'function'
    const handle = canIdle
      ? window.requestIdleCallback(start, { timeout: 1500 })
      : window.setTimeout(start, 300)
    return () => {
      cancelled = true
      if (canIdle) window.cancelIdleCallback(handle)
      else window.clearTimeout(handle)
      for (const img of preloaded) img.src = ''
    }
  }, [warmImages, state.ocrStatus])

  const pickLocalFile = (file: File | undefined) => {
    if (!file) return
    collapsePicker()
    void openLocalFile(file)
  }

  const togglePicker = expanded ? collapsePicker : expandPicker

  const previewChrome = previewPane && createPortal(
    <>
      {expanded && (
        <div className={state.image || state.imageLoading ? 'asset-sheet with-export' : 'asset-sheet'}>
          <div className="asset-bar">
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="按文件名或分类搜索" aria-label="搜索素材" />
            <select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="按分类筛选">
              <option value="">全部分类</option>
              {categories.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
          </div>
          {state.catalogLoading && <p className="muted">正在读取素材索引…</p>}
          {state.catalogError && (
            <p className="error">
              {state.catalogError}
              <button type="button" onClick={() => void loadCatalog()}>重试</button>
            </p>
          )}
          {!state.catalogLoading && state.catalog.length > 0 && (
            <p className="muted">
              {searching
                ? (matched.length
                  ? `找到 ${matched.length} 张，已加载 ${visible.length} 张。搜索只看文件名和分类。`
                  : `文件名和分类里没有「${query.trim()}」。图上的字如果没写进文件名，这里搜不到。索引共 ${state.catalog.length} 张。`)
                : `${category ? '本分类' : '索引'} ${matched.length} 张，已加载 ${visible.length} 张。搜索只看文件名和分类，不看图上的字。`}
            </p>
          )}
          <div
            className="thumbs-scroll"
            ref={scrollRef}
            onScroll={(event) => {
              scrollMemory.current = { key: selectionKey, top: event.currentTarget.scrollTop }
            }}
          >
            <div className="thumbs thumbs-grid" ref={gridRef} style={{ height: layout.height }}>
              {visible.map((image, index) => (
                <ThumbTile
                  // Remount on search/filter changes so no tile keeps a stale loading or error state.
                  key={`${selectionKey}:${image.src}`}
                  image={image}
                  style={layout.cards[index] ? { position: 'absolute', ...layout.cards[index] } : { visibility: 'hidden' }}
                  selected={selectedId === image.src}
                  eager={index < EAGER_THUMBS}
                  buttonRef={selectedRef}
                  onPick={() => {
                    collapsePicker()
                    void openCatalogImage(image)
                  }}
                />
              ))}
            </div>
            {!state.catalogLoading && matched.length > 0 && (
              <div className="gallery-more" ref={moreRef}>
                {hasMore
                  ? <button type="button" onClick={loadMore}>加载更多（已加载 {visible.length} / {matched.length}）</button>
                  : <span role="status">已显示全部 {matched.length} 张</span>}
              </div>
            )}
          </div>
        </div>
      )}
    </>,
    previewPane,
  )
  const headerChrome = headerActions && createPortal(
    <>
      <UploadButton onPick={pickLocalFile} />
      <button type="button" onClick={togglePicker}>{expanded ? '收起' : '图库'}</button>
    </>,
    headerActions,
  )

  return (
    <>
      {headerChrome}
      {previewChrome}
    </>
  )
}

function UploadButton({ onPick, label = '上传图片' }: { onPick: (file: File | undefined) => void; label?: string }) {
  return (
    <label className="upload">
      {label}
      <input
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={(event) => {
          onPick(event.target.files?.[0])
          event.target.value = ''
        }}
      />
    </label>
  )
}
