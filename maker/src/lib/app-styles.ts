const APP_STYLE_MARKER = 'data-maker-app-styles'
const APP_STYLE_READY_PROPERTY = 'makerAppStylesReady'

type StyleLink = {
  dataset: DOMStringMap
  media: string
  sheet: CSSStyleSheet | null
  addEventListener(type: 'load', listener: () => void, options?: AddEventListenerOptions): void
  removeEventListener(type: 'load', listener: () => void, options?: EventListenerOptions): void
}

type Lookup = {
  querySelector(selectors: string): StyleLink | null
}

/**
 * Keep the static boot skeleton on screen until the async application stylesheet
 * has been applied. In development there is no marked link (Vite injects styles
 * through JavaScript), so this resolves immediately.
 */
export function waitForAppStyles(doc: Lookup = document): Promise<void> {
  const link = doc.querySelector(`link[${APP_STYLE_MARKER}]`)
  if (!link) return Promise.resolve()
  const apply = () => {
    link.media = 'all'
    link.dataset[APP_STYLE_READY_PROPERTY] = 'true'
  }
  if (link.dataset[APP_STYLE_READY_PROPERTY] === 'true') return Promise.resolve()
  // A cached stylesheet may have loaded before this module ran.
  if (link.sheet) {
    apply()
    return Promise.resolve()
  }
  return new Promise((resolve) => {
    const settle = () => {
      apply()
      link.removeEventListener('load', settle)
      resolve()
    }
    link.addEventListener('load', settle, { once: true })
  })
}
