import type { Plugin } from 'vite'

export const APP_STYLE_MARKER = 'data-maker-app-styles'
export const APP_STYLE_READY = 'data-maker-app-styles-ready'

const STYLESHEET_LINK = /<link\b[^>]*\brel=["']stylesheet["'][^>]*>/gi

function stripAttribute(attributes: string, name: string): string {
  return attributes.replace(new RegExp(`\\s+${name}(?:=["'][^"']*["'])?`, 'gi'), '')
}

/**
 * Turn Vite's render-blocking stylesheet into a low-priority async load.
 *
 * The inline boot skeleton in index.html has its own styles, so the page paints
 * before this file arrives. main.tsx waits for the ready marker before replacing
 * the skeleton, which keeps the first React paint from flashing unstyled markup.
 */
export function makeStylesheetAsync(html: string): string {
  return html.replace(STYLESHEET_LINK, (tag) => {
    if (tag.includes(APP_STYLE_MARKER)) return tag
    const href = /\bhref=["']([^"']+)["']/i.exec(tag)?.[1] ?? ''
    // Only rewrite the app bundle Vite emitted; leave third-party stylesheets alone.
    if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(href) || !/\.css(?:[?#]|$)/i.test(href)) return tag

    const attributes = stripAttribute(
      stripAttribute(tag.replace(/^<link\b/i, '').replace(/\/?>\s*$/i, '').trim(), 'media'),
      'onload',
    )
    const asyncTag = `<link ${APP_STYLE_MARKER} ${attributes} media="print" onload="this.media='all';this.dataset.makerAppStylesReady='true';this.onload=null">`
    const fallbackTag = `<link ${attributes}>`
    return `${asyncTag}\n    <noscript>${fallbackTag}</noscript>`
  })
}

export function asyncAppStyles(): Plugin {
  return {
    name: 'chinesebqb-maker-async-app-styles',
    apply: 'build',
    enforce: 'post',
    transformIndexHtml(html) {
      return makeStylesheetAsync(html)
    },
  }
}
