import { readFileSync } from 'node:fs'
import vm from 'node:vm'

// site.js 的加载提示拆成了独立脚本（site/assets/js/loading.js），这里用最小的 DOM stub
// 在 Node 里真实跑一遍点击/pageshow 行为。放在 maker/tests 是因为 CI 只有这个 JS 测试运行器。
const SOURCE = readFileSync(new URL('../../site/assets/js/loading.js', import.meta.url), 'utf8')
const SITE = 'https://zhaoolee.com/ChineseBQB/'
const PAGE = `${SITE}cat/`

type Attributes = Record<string, string>
type Handler = (event: any) => void

class FakeElement {
  readonly tagName: string
  parentElement: FakeElement | null = null
  children: FakeElement[] = []
  attributes: Attributes
  hidden = false
  textContent = ''

  constructor(tagName: string, attributes: Attributes = {}) {
    this.tagName = tagName.toUpperCase()
    this.attributes = { ...attributes }
  }

  get id(): string {
    return this.attributes.id ?? ''
  }

  getAttribute(name: string): string | null {
    return this.attributes[name] ?? null
  }

  hasAttribute(name: string): boolean {
    return Object.hasOwn(this.attributes, name)
  }

  setAttribute(name: string, value: string): void {
    this.attributes[name] = value
  }

  removeAttribute(name: string): void {
    delete this.attributes[name]
  }

  append(child: FakeElement): FakeElement {
    if (child.parentElement) {
      child.parentElement.children = child.parentElement.children.filter((item) => item !== child)
    }
    child.parentElement = this
    this.children.push(child)
    return child
  }

  matches(selector: string): boolean {
    const parsed = /^([a-z]+)?(#[\w-]+)?(\.[\w-]+)?(?:\[([\w-]+)(?:="([^"]*)")?\])?$/i.exec(selector)
    if (!parsed) throw new Error(`stub 不支持的选择器：${selector}`)
    const [, tag, id, className, attributeName, attributeValue] = parsed
    if (tag && this.tagName !== tag.toUpperCase()) return false
    if (id && this.id !== id.slice(1)) return false
    if (className && !(this.attributes.class ?? '').split(/\s+/).includes(className.slice(1))) return false
    if (attributeName) {
      if (attributeValue === undefined) {
        if (!this.hasAttribute(attributeName)) return false
      } else if (this.getAttribute(attributeName) !== attributeValue) {
        return false
      }
    }
    return true
  }

  querySelector(selector: string): FakeElement | null {
    return [this, ...this.flat()].find((node) => node.matches(selector)) ?? null
  }

  private flat(): FakeElement[] {
    return this.children.flatMap((child) => [child, ...child.flat()])
  }
}

type Hints = {
  startLoadingHints(doc: unknown, win: unknown): { show(): void; reset(): void }
  MESSAGE: string
  SLOW_MESSAGE: string
}

function loadHints(): Hints {
  const context = vm.createContext({ URL, setTimeout, clearTimeout })
  vm.runInContext(SOURCE, context)
  return (context as unknown as { BQBLoading: Hints }).BQBLoading
}

const node = (tagName: string, attributes: Attributes = {}, text = '') => {
  const element = new FakeElement(tagName, attributes)
  element.textContent = text
  return element
}

function makePage() {
  const body = node('body')
  const main = body.append(node('main', { id: 'main' }))
  const layer = body.append(node('div', { id: 'nav-loading', class: 'nav-loading' }))
  layer.hidden = true
  const label = layer.append(node('span', { class: 'nav-loading-text' }, '正在打开编辑器…'))

  const documentHandlers = new Map<string, Handler[]>()
  const windowHandlers = new Map<string, Handler[]>()
  const timers = new Map<number, () => void>()
  let nextTimer = 0

  const documentStub = {
    body,
    addEventListener(type: string, handler: Handler) {
      documentHandlers.set(type, [...(documentHandlers.get(type) ?? []), handler])
    },
    querySelector(selector: string) {
      return body.querySelector(selector)
    },
  }
  const windowStub = {
    location: { href: PAGE, origin: 'https://zhaoolee.com', pathname: '/ChineseBQB/cat/', search: '' },
    setTimeout(handler: () => void) {
      timers.set(++nextTimer, handler)
      return nextTimer
    },
    clearTimeout(id: number) {
      timers.delete(id)
    },
    addEventListener(type: string, handler: Handler) {
      windowHandlers.set(type, [...(windowHandlers.get(type) ?? []), handler])
    },
  }

  const hints = loadHints()
  hints.startLoadingHints(documentStub, windowStub)

  const click = (target: FakeElement, overrides: Record<string, unknown> = {}) => {
    let prevented = false
    const event: Record<string, unknown> = {
      target,
      button: 0,
      defaultPrevented: false,
      preventDefault() {
        prevented = true
        event.defaultPrevented = true
      },
      ...overrides,
    }
    for (const handler of documentHandlers.get('click') ?? []) handler(event)
    return { prevented }
  }

  return {
    body,
    main,
    layer,
    label,
    hints,
    click,
    mount(attributes: Attributes) {
      const link = node('a', attributes)
      const icon = link.append(node('span'))
      body.append(link)
      return { link, icon }
    },
    openDialog() {
      const dialog = body.append(node('dialog', { open: '' }))
      const link = dialog.append(node('a', { id: 'preview-maker', href: `${SITE}maker/` }))
      return { dialog, link }
    },
    pageshow() {
      for (const handler of windowHandlers.get('pageshow') ?? []) handler({ type: 'pageshow', persisted: true })
    },
    runTimers() {
      const pending = [...timers.values()]
      timers.clear()
      for (const handler of pending) handler()
    },
    pendingTimers: () => timers.size,
  }
}

describe('站内 maker 入口的加载提示', () => {
  it('普通点击立即显示提示，并且不阻止原生导航', () => {
    const page = makePage()
    const { link, icon } = page.mount({ class: 'image-edit', href: '/ChineseBQB/maker/?src=media%2Fabc.png' })

    const { prevented } = page.click(icon)

    expect(page.layer.hidden).toBe(false)
    expect(page.label.textContent).toBe(page.hints.MESSAGE)
    expect(page.main.getAttribute('aria-busy')).toBe('true')
    expect(prevented).toBe(false)
    expect(page.pendingTimers()).toBe(1)
    expect(link.getAttribute('href')).toBe('/ChineseBQB/maker/?src=media%2Fabc.png')
  })

  it('搜索结果是后插入的链接，点击仍然生效', () => {
    const page = makePage()
    const card = page.body.append(node('article', { class: 'image-card' }))
    const link = card.append(node('a', { class: 'image-edit', href: '/ChineseBQB/maker/?src=media%2Fnew.png' }))
    const icon = link.append(node('span'))

    page.click(icon)

    expect(page.layer.hidden).toBe(false)
  })

  it('纯 href 指向 maker 的入口也会触发', () => {
    const page = makePage()
    const entry = page.mount({ href: '/ChineseBQB/maker/index.html' })

    page.click(entry.link)

    expect(page.layer.hidden).toBe(false)
  })

  for (const key of ['metaKey', 'ctrlKey', 'shiftKey', 'altKey']) {
    it(`${key} 点击交给浏览器，不显示当前页提示`, () => {
      const page = makePage()
      const { icon } = page.mount({ class: 'image-edit', href: '/ChineseBQB/maker/?src=media%2Fabc.png' })

      const { prevented } = page.click(icon, { [key]: true })

      expect(page.layer.hidden).toBe(true)
      expect(prevented).toBe(false)
      expect(page.main.getAttribute('aria-busy')).toBeNull()
    })
  }

  it('aria-disabled、已取消的点击和下载链接都不触发', () => {
    const disabledPage = makePage()
    const disabled = disabledPage.mount({ class: 'image-edit', href: '/ChineseBQB/maker/', 'aria-disabled': 'true' })
    disabledPage.click(disabled.icon)
    expect(disabledPage.layer.hidden).toBe(true)

    const wrappedPage = makePage()
    const wrapper = wrappedPage.body.append(node('span', { 'aria-disabled': 'true' }))
    const wrapped = wrapper.append(node('a', { class: 'image-edit', href: '/ChineseBQB/maker/' }))
    const wrappedIcon = wrapped.append(node('span'))
    wrappedPage.click(wrappedIcon)
    expect(wrappedPage.layer.hidden).toBe(true)

    const cancelledPage = makePage()
    const cancelled = cancelledPage.mount({ class: 'image-edit', href: '/ChineseBQB/maker/' })
    cancelledPage.click(cancelled.icon, { defaultPrevented: true })
    expect(cancelledPage.layer.hidden).toBe(true)

    const downloadPage = makePage()
    const download = downloadPage.mount({ class: 'image-edit', href: '/ChineseBQB/maker/', download: '' })
    downloadPage.click(download.icon)
    expect(downloadPage.layer.hidden).toBe(true)
  })

  it('新窗口、中键和其他站内链接不显示当前页提示', () => {
    const blankPage = makePage()
    const blank = blankPage.mount({ class: 'image-edit', href: '/ChineseBQB/maker/', target: '_blank' })
    blankPage.click(blank.icon)
    expect(blankPage.layer.hidden).toBe(true)

    const middlePage = makePage()
    const middle = middlePage.mount({ class: 'image-edit', href: '/ChineseBQB/maker/' })
    middlePage.click(middle.icon, { button: 1 })
    expect(middlePage.layer.hidden).toBe(true)

    const otherPage = makePage()
    const other = otherPage.mount({ class: 'image-preview', href: '/ChineseBQB/cat/' })
    otherPage.click(other.icon)
    expect(otherPage.layer.hidden).toBe(true)

    const foreignPage = makePage()
    const foreign = foreignPage.mount({ class: 'image-edit', href: 'https://example.com/maker/' })
    foreignPage.click(foreign.icon)
    expect(foreignPage.layer.hidden).toBe(true)
  })

  it('原图弹窗里的入口把提示放进 top layer', () => {
    const page = makePage()
    const { dialog, link } = page.openDialog()

    page.click(link)

    expect(page.layer.hidden).toBe(false)
    expect(page.layer.parentElement).toBe(dialog)
  })

  it('pageshow 复位提示、aria-busy 和定时器（含弹窗内的提示）', () => {
    const page = makePage()
    const { link } = page.openDialog()
    page.click(link)
    expect(page.pendingTimers()).toBe(1)

    page.pageshow()

    expect(page.layer.hidden).toBe(true)
    expect(page.layer.parentElement).toBe(page.body)
    expect(page.main.getAttribute('aria-busy')).toBeNull()
    expect(page.pendingTimers()).toBe(0)
  })

  it('等待变长时继续提示，只换成慢文案并仍然非阻断', () => {
    const page = makePage()
    const { icon } = page.mount({ class: 'image-edit', href: '/ChineseBQB/maker/' })
    page.click(icon)
    expect(page.label.textContent).toBe(page.hints.MESSAGE)

    page.runTimers()

    expect(page.layer.hidden).toBe(false)
    expect(page.label.textContent).toBe(page.hints.SLOW_MESSAGE)
    expect(page.main.getAttribute('aria-busy')).toBe('true')

    // 用户再次点击入口：回到初始文案，并重新开始计时。
    page.click(icon)
    expect(page.label.textContent).toBe(page.hints.MESSAGE)
    expect(page.layer.hidden).toBe(false)
    expect(page.pendingTimers()).toBe(1)
  })

  it('pageshow 彻底清理慢提示：隐藏、复位文案、去掉 aria-busy 和定时器', () => {
    const page = makePage()
    const { icon } = page.mount({ class: 'image-edit', href: '/ChineseBQB/maker/' })
    page.click(icon)
    page.runTimers()
    expect(page.label.textContent).toBe(page.hints.SLOW_MESSAGE)

    page.pageshow()

    expect(page.layer.hidden).toBe(true)
    expect(page.label.textContent).toBe(page.hints.MESSAGE)
    expect(page.main.getAttribute('aria-busy')).toBeNull()
    expect(page.pendingTimers()).toBe(0)
  })
})
