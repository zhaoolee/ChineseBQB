export type Point = { x: number; y: number }

export type FreeTextPresetId = 'white-outline-black' | 'black-outline-white' | 'black-outline-yellow' | 'white-outline-red'

/** A preset id, or 'custom' once the user opens the manual style controls. */
export type FreeTextStylePreset = FreeTextPresetId | 'custom'

export type TextStyle = {
  fontFamily: string
  fontSize: number
  fill: string
  stroke?: string
  strokeWidth?: number
  /** Faint outline and shadow, used when the picture has no text to copy a color from. */
  softOutline?: boolean
  weight?: number | string
  /** Chosen free-text style. Drawing still reads fill/stroke only; font size drags keep it. */
  preset?: FreeTextStylePreset
}

export type OcrBlock = {
  segmentId?: string
  /** Subtitle cues use half-open ranges in the decoded GIF's frame timeline. */
  startFrame?: number
  endFrame?: number
  /** OCR locations for each observed frame; no frame pixels enter undo history. */
  framePolygons?: { frame: number; polygon: [Point, Point, Point, Point] }[]
  id: string
  originalText: string
  targetText: string
  score: number
  polygon: [Point, Point, Point, Point]
  layout: 'horizontal' | 'vertical' | 'unknown'
  enabled: boolean
  /** User-adjusted erase region in source pixels. Estimated boxes are never labeled as model output. */
  manualPolygon?: Point[]
  /** When true, the local erase is included in the composite. Safe edits default this on. */
  applyLocal: boolean
  /** Full-line redraw. Used when the line is not horizontal and a per-character box would be unreliable. */
  lineRedraw: boolean
  /** True after the user edits font, color, or stroke. Automatic contrast stops overriding it. */
  styleCustomized?: boolean
  textStyle: TextStyle
}

export type FreeText = {
  segmentId?: string
  id: string
  text: string
  x: number
  y: number
  textStyle: TextStyle
}

export type ImageSource = {
  kind: 'catalog' | 'local'
  id: string
  name: string
  animated: boolean
}

export type ImageDocument = {
  source: ImageSource
  naturalWidth: number
  naturalHeight: number
  blocks: OcrBlock[]
  freeTexts: FreeText[]
}

export type TextChange = {
  kind: 'replace' | 'insert' | 'delete'
  oldStart: number
  oldEnd: number
  newStart: number
  newEnd: number
  oldText: string
  newText: string
}

export type EditSafety = 'safe' | 'review' | 'manual'

export type CatalogImage = {
  name: string
  src: string
  thumb: string
  label: string
  animated: boolean
  width?: number
  height?: number
  category?: string
  categoryTitle?: string
  folder?: string
  path?: string
}
