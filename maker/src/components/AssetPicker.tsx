import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { matchesQuery } from '../lib/catalog'
import { assetUrl, loadCatalog, openCatalogImage, openLocalFile } from '../state/editor-store'
import { useEditor } from './use-editor'

export function AssetPicker() {
  const state = useEditor()
  const selectedRef = useRef<HTMLButtonElement>(null)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const categories = useMemo(
    () => [...new Set(state.catalog.map((image) => image.categoryTitle).filter((title): title is string => Boolean(title)))],
    [state.catalog],
  )
  const visible = state.catalog.filter((image) => (
    (!category || image.categoryTitle === category) && matchesQuery(image, query)
  )).slice(0, 80)
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
              {visible.map((image) => {
                const selected = selectedId === image.src
                return (
                  <button
                    key={`${image.src}:${image.label}`}
                    ref={selected ? selectedRef : undefined}
                    type="button"
                    className={selected ? 'thumb selected' : 'thumb'}
                    aria-pressed={selected}
                    title={image.label}
                    onClick={() => {
                      collapsePicker()
                      void openCatalogImage(image)
                    }}
                  >
                    <img src={assetUrl(image.thumb)} alt="" />
                    <span>{image.label}</span>
                    {image.animated && <em>动图</em>}
                  </button>
                )
              })}
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
