import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { matchesQuery } from '../lib/catalog'
import { assetUrl, loadCatalog, openCatalogImage, openLocalFile } from '../state/editor-store'
import type { CatalogImage } from '../types'
import { useEditor } from './use-editor'

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
}: {
  image: CatalogImage
  selected: boolean
  eager: boolean
  buttonRef: RefObject<HTMLButtonElement | null>
  onPick: () => void
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
  const visible = useMemo(() => state.catalog.filter((image) => (
    (!category || image.categoryTitle === category) && matchesQuery(image, query)
  )).slice(0, 80), [state.catalog, category, query])
  const selectionKey = `${category}\u0000${query}`
  const selectedId = state.image?.source.id
  const searching = query.trim().length > 0
  const [expanded, setExpanded] = useState(false)
  const [previewPane, setPreviewPane] = useState<HTMLElement | null>(null)
  const [headerActions, setHeaderActions] = useState<HTMLElement | null>(null)
  const seenSource = useRef('')
  const collapsePicker = () => setExpanded(false)
  const expandPicker = () => setExpanded(true)

  useEffect(() => {
    if (state.catalog.length === 0 && !state.catalogLoading && !state.catalogError) void loadCatalog()
  }, [state.catalog.length, state.catalogLoading, state.catalogError])

  useEffect(() => {
    const sourceId = selectedId ?? ''
    if (sourceId && sourceId !== seenSource.current) setExpanded(false)
    seenSource.current = sourceId
  }, [selectedId])

  useEffect(() => {
    setPreviewPane(document.getElementById('preview-pane'))
    setHeaderActions(document.getElementById('header-actions'))
  }, [])

  useEffect(() => {
    if (expanded) selectedRef.current?.scrollIntoView({ inline: 'nearest', block: 'nearest' })
  }, [selectedId, expanded])

  // Warm up only the first screen of thumbnails once the index is in, and hold off while OCR owns the CPU.
  useEffect(() => {
    if (!visible.length || state.ocrStatus === 'loading' || prefersSaveData()) return
    const queue = visible.slice(0, PRELOAD_THUMBS)
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
  }, [visible, state.ocrStatus])

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
                ? (visible.length
                  ? `找到 ${visible.length} 张，文件名或分类里有这段字。`
                  : `文件名和分类里没有「${query.trim()}」。图上的字如果没写进文件名，这里搜不到。索引共 ${state.catalog.length} 张。`)
                : `索引 ${state.catalog.length} 张。搜索只看文件名和分类，不看图上的字。`}
            </p>
          )}
          <div className="thumbs-scroll">
            <div className="thumbs thumbs-grid">
              {visible.map((image, index) => (
                <ThumbTile
                  // Remount on search/filter changes so no tile keeps a stale loading or error state.
                  key={`${selectionKey}:${image.src}`}
                  image={image}
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
