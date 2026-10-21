(() => {
  'use strict';

  const MESSAGE = '正在打开编辑器…';
  const SLOW_MESSAGE = '打开较慢，请稍候，也可以再次点击编辑';
  const SLOW_MS = 10000;
  const MODIFIER_KEYS = ['metaKey', 'ctrlKey', 'shiftKey', 'altKey'];
  const MAKER_PATH = /\/maker(?:\/(?:index\.html)?)?\/?$/i;

  const attr = (node, name) => (node && typeof node.getAttribute === 'function' ? node.getAttribute(name) : null);
  const has = (node, name) => Boolean(node && typeof node.hasAttribute === 'function' && node.hasAttribute(name));

  /** Walk up from the event target (inclusive) and return the first matching element. */
  function climb(node, test) {
    for (let current = node; current; current = current.parentElement) {
      if (current.tagName && test(current)) return current;
    }
    return null;
  }

  function linkOf(node) {
    return climb(node, (element) => element.tagName === 'A' && has(element, 'href'));
  }

  function hasClass(node, name) {
    return (attr(node, 'class') || '').split(/\s+/).includes(name);
  }

  function isDisabled(link) {
    return Boolean(climb(link, (element) => attr(element, 'aria-disabled') === 'true'));
  }

  /** Same-origin link that actually navigates this page; null when it does not. */
  function navigationTarget(link, location) {
    let url;
    try { url = new URL(link.getAttribute('href'), location.href); } catch { return null; }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    if (url.origin !== location.origin) return null;
    if (url.pathname === location.pathname && url.search === location.search) return null;
    return url;
  }

  /** Static edit links, search-result edit links, and any link pointing at the Maker. */
  function isMakerEntry(link, location) {
    if (!link) return false;
    const url = navigationTarget(link, location);
    if (!url) return false;
    return link.id === 'preview-maker' || hasClass(link, 'image-edit') || MAKER_PATH.test(url.pathname);
  }

  /** Only plain primary-button clicks that navigate this page; modified clicks keep browser behaviour. */
  function isPlainNavigation(event, link) {
    if (!event || !link) return false;
    if (event.defaultPrevented) return false;
    if (event.button !== undefined && event.button !== 0) return false;
    if (MODIFIER_KEYS.some((key) => event[key] === true)) return false;
    if (has(link, 'download')) return false;
    const target = attr(link, 'target');
    if (target && target !== '_self') return false;
    return !isDisabled(link);
  }

  function createLoadingHint({ document: doc, window: win, message = MESSAGE, slowMessage = SLOW_MESSAGE, slowAfter = SLOW_MS }) {
    if (!doc || !win) throw new Error('loading hint needs document and window');
    let timer = 0;

    function layer() {
      return doc.querySelector('#nav-loading');
    }

    function setText(value) {
      const node = layer();
      const text = node && node.querySelector('.nav-loading-text');
      if (text) text.textContent = value;
    }

    function clearTimer() {
      if (timer) { win.clearTimeout(timer); timer = 0; }
    }

    function reset() {
      clearTimer();
      const node = layer();
      if (!node) return;
      node.hidden = true;
      if (node.parentElement !== doc.body) doc.body.append(node);
      setText(message);
      const main = doc.querySelector('#main');
      if (main) main.removeAttribute('aria-busy');
    }

    function show() {
      const node = layer();
      if (!node) return;
      // 原图预览是模态 dialog，会盖住普通 fixed 层；把提示挂进打开中的 dialog 才能留在最上层。
      const host = doc.querySelector('dialog[open]') || doc.body;
      host.append(node);
      setText(message);
      node.hidden = false;
      const main = doc.querySelector('#main');
      if (main) main.setAttribute('aria-busy', 'true');
      clearTimer();
      // 等得久不要藏起来：只把文案换成慢提示，保持可见且 pointer-events:none 不阻断操作。
      timer = win.setTimeout(() => { timer = 0; setText(slowMessage); }, slowAfter);
    }

    function handleClick(event) {
      const link = linkOf(event.target);
      if (!link || !isMakerEntry(link, win.location)) return;
      if (!isPlainNavigation(event, link)) return;
      // 不调用 preventDefault：原生导航照常进行，这里只补一个非阻断的等待提示。
      show();
    }

    return { show, reset, handleClick };
  }

  function startLoadingHints(doc = document, win = window) {
    const hint = createLoadingHint({ document: doc, window: win });
    doc.addEventListener('click', hint.handleClick);
    // 后退/前进缓存恢复时导航没有真的发生，必须把提示、aria-busy 和定时器一起复位。
    win.addEventListener('pageshow', hint.reset);
    return hint;
  }

  const api = { createLoadingHint, startLoadingHints, isMakerEntry, isPlainNavigation, linkOf, MESSAGE, SLOW_MESSAGE };
  if (typeof globalThis !== 'undefined') globalThis.BQBLoading = api;
  if (typeof document !== 'undefined' && typeof window !== 'undefined') startLoadingHints(document, window);
})();
