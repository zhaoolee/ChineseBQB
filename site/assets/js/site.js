(() => {
  'use strict';
  const $ = (selector) => document.querySelector(selector);
  const base = new URL(document.body.dataset.base, location.origin);
  const asset = (path) => new URL(path, base).href;
  let toastTimer;
  function toast(message) {
    const node = $('#toast');
    node.textContent = message;
    node.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { node.hidden = true; }, 3200);
  }
  const normalize = (text) => text.normalize('NFKC').toLocaleLowerCase();
  const matches = (text, query) => normalize(query).trim().split(/\s+/).every(word => normalize(text).includes(word));

  const sidebar = $('#sidebar'), menu = $('#menu-button'), backdrop = $('#nav-backdrop');
  const mobile = matchMedia('(max-width: 800px)');
  function closeMenu() {
    sidebar.classList.remove('is-open');
    menu.setAttribute('aria-expanded', 'false');
    backdrop.hidden = true;
    sidebar.inert = mobile.matches;
    $('.site-main').inert = false;
    document.body.style.overflow = '';
  }
  closeMenu();
  mobile.addEventListener('change', closeMenu);
  menu.addEventListener('click', () => {
    if (menu.getAttribute('aria-expanded') === 'true') return closeMenu();
    sidebar.classList.add('is-open');
    sidebar.inert = false;
    menu.setAttribute('aria-expanded', 'true');
    backdrop.hidden = false;
    $('.site-main').inert = true;
    document.body.style.overflow = 'hidden';
  });
  backdrop.addEventListener('click', closeMenu);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') { closeMenu(); menu.focus(); }
  });
  $('#category-filter').addEventListener('input', event => {
    let found = 0;
    document.querySelectorAll('[data-category-label]').forEach(item => {
      item.hidden = !matches(item.dataset.categoryLabel, event.target.value);
      if (!item.hidden) found++;
    });
    $('#no-categories').hidden = found !== 0;
  });
  const active = $('.sidebar-nav [aria-current]');
  if (active && !mobile.matches) sidebar.scrollTop = Math.max(0, active.offsetTop - 280);

  const preview = $('#preview');
  let previewItems = [], previewIndex = 0;
  function showPreview(index) {
    previewIndex = (index + previewItems.length) % previewItems.length;
    const item = previewItems[previewIndex];
    $('#preview-title').textContent = item.dataset.name;
    $('#preview-title').title = item.dataset.name;
    $('#preview-image').src = item.dataset.src;
    $('#preview-image').alt = item.dataset.name;
    $('#preview-download').href = item.dataset.src;
    $('#preview-download').download = item.dataset.name;
    $('#preview-original').href = item.dataset.src;
    updateMakerLink(item);
    $('#preview-position').textContent = `${previewIndex + 1} / ${previewItems.length}`;
    $('#preview-prev').disabled = $('#preview-next').disabled = previewItems.length < 2;
  }
  document.addEventListener('click', event => {
    const link = event.target.closest('[data-preview]');
    if (!link || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    previewItems = Array.from(document.querySelectorAll('[data-preview]')).filter(item => !item.closest('[hidden]'));
    showPreview(previewItems.indexOf(link));
    preview.showModal();
  });
  function catalogMediaPath(src) {
    let url;
    try { url = new URL(src, base); } catch { return null; }
    if (url.origin !== location.origin) return null;
    const prefix = base.pathname.endsWith('/') ? base.pathname : `${base.pathname}/`;
    if (!url.pathname.startsWith(prefix)) return null;
    let relative = '';
    try { relative = decodeURIComponent(url.pathname.slice(prefix.length)); } catch { return null; }
    if (relative.includes('..') || relative.includes('\\') || !/^media\/[a-f0-9]{64}\.[a-z0-9]+$/i.test(relative)) return null;
    return relative;
  }
  function makerHref(relative) {
    const href = new URL('maker/', base);
    href.searchParams.set('src', relative);
    return href.href;
  }
  function editLink(relative, label) {
    const link = document.createElement('a');
    link.className = 'image-edit';
    link.href = makerHref(relative);
    link.target = '_blank';
    link.rel = 'noopener';
    const message = `编辑这张图：${label}`;
    link.title = message;
    link.setAttribute('aria-label', message);
    const icon = document.createElement('span');
    icon.className = 'image-edit-icon';
    icon.setAttribute('aria-hidden', 'true');
    link.append(icon);
    return link;
  }
  function updateMakerLink(item) {
    const maker = $('#preview-maker');
    const note = $('#preview-maker-note');
    if (!maker || !note) return;
    const relative = catalogMediaPath(item.dataset.src || '');
    const animated = item.dataset.animated === 'true';
    if (!relative) {
      maker.setAttribute('aria-disabled', 'true');
      maker.removeAttribute('href');
      note.hidden = false;
      note.textContent = '这张图片不能在 Maker 里打开。';
      return;
    }
    maker.href = makerHref(relative);
    maker.removeAttribute('aria-disabled');
    note.hidden = !animated;
    note.textContent = '这是动图。GIF 会把改字套到每一帧并导出整张；动画 WebP 仍然只有当前这一帧。';
  }
  $('#preview-maker')?.addEventListener('click', event => {
    if ($('#preview-maker').getAttribute('aria-disabled') === 'true') event.preventDefault();
  });
  $('#preview-close').addEventListener('click', () => preview.close());
  $('#preview-prev').addEventListener('click', () => showPreview(previewIndex - 1));
  $('#preview-next').addEventListener('click', () => showPreview(previewIndex + 1));
  $('#preview-image').addEventListener('error', () => { $('#preview-position').textContent = '原图加载失败，请检查网络后重新打开。'; });
  preview.addEventListener('close', () => { $('#preview-image').removeAttribute('src'); });
  preview.addEventListener('click', event => {
    if (event.target === preview) {
      const bounds = preview.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) preview.close();
    }
  });
  preview.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft') { event.preventDefault(); showPreview(previewIndex - 1); }
    if (event.key === 'ArrowRight') { event.preventDefault(); showPreview(previewIndex + 1); }
  });
  $('#gallery-filter')?.addEventListener('input', event => {
    let count = 0;
    document.querySelectorAll('#image-grid .image-card').forEach(card => {
      card.hidden = !matches(card.dataset.name, event.target.value);
      if (!card.hidden) count++;
    });
    $('#gallery-empty').hidden = count > 0;
  });

  $('#download-pack')?.addEventListener('click', async event => {
    const button = event.currentTarget, originalLabel = button.textContent;
    button.disabled = true;
    const controller = new AbortController();
    async function get(path) {
      const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(60000)]);
      const response = await fetch(asset(path), { signal });
      if (!response.ok) throw new Error('下载失败');
      return response;
    }
    try {
      const slug = document.body.dataset.category;
      const images = await (await get(`catalog/${slug}.json`)).json();
      const files = [];
      button.textContent = `准备下载 0 / ${images.length}`;
      // Four concurrent requests keep large collections responsive without flooding Pages.
      for (let start = 0; start < images.length; start += 4) {
        const batch = await Promise.all(images.slice(start, start + 4).map(async image => ({
          name: image.path, bytes: new Uint8Array(await (await get(image.src)).arrayBuffer())
        })));
        files.push(...batch);
        button.textContent = `正在打包 ${files.length} / ${images.length}`;
      }
      const archive = BQBZip.createZip(files);
      const link = document.createElement('a');
      const url = URL.createObjectURL(archive);
      link.href = url;
      link.download = button.dataset.filename;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      toast('打包完成，已开始下载。');
    } catch {
      controller.abort();
      toast('打包失败，请检查网络后重试，也可以逐张保存。');
    } finally {
      button.disabled = false;
      button.textContent = originalLabel;
    }
  });

  const shareMimeTypes = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', bmp: 'image/bmp', avif: 'image/avif', svg: 'image/svg+xml' };
  function shareMime(name, type) {
    if (type && type.startsWith('image/')) return type;
    const match = /\.([a-z0-9]+)$/i.exec(name);
    return (match && shareMimeTypes[match[1].toLowerCase()]) || 'application/octet-stream';
  }
  const canShareFiles = () => window.isSecureContext && typeof navigator.share === 'function' && typeof navigator.canShare === 'function';
  let preparedShare = null, sharing = false;
  async function fetchShareFile(src, name) {
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, 20000);
    try {
      const response = await fetch(src, { signal: controller.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      return new File([blob], name, { type: shareMime(name, blob.type) });
    } catch (error) {
      if (timedOut) throw new DOMException('分享原图加载超时', 'TimeoutError');
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }
  async function shareImage(button, src, name) {
    if (sharing) return;
    sharing = true;
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    let file = preparedShare && preparedShare.src === src && preparedShare.file.name === name ? preparedShare.file : null;
    try {
      if (!file) {
        file = await fetchShareFile(src, name);
        preparedShare = { src, file };
        // Fetching can outlive transient user activation; the cached File lets the next click share synchronously.
        if (navigator.userActivation?.isActive === false) {
          toast('图片已准备好，请再点一次分享。');
          return;
        }
      }
      if (!navigator.canShare({ files: [file] })) {
        preparedShare = null;
        toast('这个浏览器不能分享这种格式的图片，请用旁边的下载按钮保存原图。');
        return;
      }
      await navigator.share({ files: [file] });
      preparedShare = null;
    } catch (error) {
      if (error?.name === 'AbortError') { preparedShare = null; return; }
      if (error?.name === 'TimeoutError') {
        preparedShare = null;
        toast('原图加载超时，请检查网络后再试一次。');
        return;
      }
      if (error?.name === 'NotAllowedError') {
        if (file) preparedShare = { src, file };
        toast('请再点一次分享；若仍无法分享，请用下载按钮保存原图。');
        return;
      }
      preparedShare = null;
      toast('分享失败，请稍后再试，也可以用旁边的下载按钮保存原图。');
    } finally {
      sharing = false;
      button.disabled = false;
      button.removeAttribute('aria-busy');
    }
  }
  document.addEventListener('click', event => {
    const button = event.target.closest('.image-share');
    if (!button || button.disabled) return;
    const src = button.dataset.src, name = button.dataset.name;
    if (!src || !name) return;
    if (!canShareFiles()) {
      toast('当前环境不支持图片分享，请用旁边的下载按钮保存原图。');
      return;
    }
    shareImage(button, src, name);
  });

  if (!$('#search-form')) return;
  let searchIndex, searchPromise, results = [], shown = 0, sequence = 0, debounce;
  const input = $('#search-query'), status = $('#search-status'), resultsNode = $('#search-results');
  function cardFor(item) {
    const card = document.createElement('article');
    card.className = 'image-card';
    const link = document.createElement('a');
    link.className = 'image-preview';
    link.href = asset(item.src);
    link.dataset.preview = '';
    link.dataset.name = item.name;
    link.dataset.src = link.href;
    link.dataset.animated = item.animated ? 'true' : 'false';
    const image = document.createElement('img');
    image.src = asset(item.animated ? item.src : item.thumb);
    image.alt = item.label;
    image.loading = 'lazy';
    image.width = 360;
    image.height = 300;
    link.append(image);
    const info = document.createElement('div');
    info.className = 'image-info';
    const caption = document.createElement('div');
    caption.className = 'image-caption';
    const title = document.createElement('span');
    title.textContent = title.title = item.label;
    caption.append(title);
    const category = document.createElement('a');
    category.className = 'search-category';
    category.href = asset(item.categoryUrl);
    category.textContent = item.categoryTitle;
    const actions = document.createElement('div');
    actions.className = 'image-actions';
    const download = document.createElement('a');
    download.className = 'image-download';
    download.href = asset(item.src); download.download = item.name; download.title = '下载原图';
    download.setAttribute('aria-label', `保存 ${item.name}`);
    const downloadLabel = document.createElement('span');
    downloadLabel.textContent = '下载';
    download.append(downloadLabel);
    const share = document.createElement('button');
    share.type = 'button';
    share.className = 'image-share';
    share.dataset.src = asset(item.src);
    share.dataset.name = item.name;
    share.title = '分享原图';
    share.setAttribute('aria-label', `分享 ${item.name}`);
    const shareLabel = document.createElement('span');
    shareLabel.textContent = '分享';
    share.append(shareLabel);
    actions.append(download, share);
    info.append(caption, category, actions);
    card.append(link, info);
    const relative = catalogMediaPath(item.src);
    if (relative) card.append(editLink(relative, item.label || item.name));
    return card;
  }
  function showMore() {
    const fragment = document.createDocumentFragment();
    results.slice(shown, shown + 60).forEach(item => fragment.append(cardFor(item)));
    shown += Math.min(60, results.length - shown);
    resultsNode.append(fragment);
    $('#load-more').hidden = shown >= results.length;
  }
  async function search() {
    const request = ++sequence, query = input.value.trim();
    resultsNode.replaceChildren();
    $('#load-more').hidden = true;
    status.hidden = !query;
    if (!query) { status.textContent = ''; return; }
    status.textContent = '正在翻找表情包…';
    try {
      if (!searchIndex) {
        searchPromise ||= fetch(asset('catalog/search.json')).then(response => {
          if (!response.ok) throw new Error('搜索索引加载失败');
          return response.json();
        }).catch(error => { searchPromise = null; throw error; });
        searchIndex = await searchPromise;
      }
      if (request !== sequence) return;
      results = searchIndex.filter(item => matches(`${item.name} ${item.categoryTitle} ${item.folder}`, query));
      shown = 0;
      status.textContent = results.length ? `「${query}」找到 ${results.length.toLocaleString()} 张表情包` : `没有找到「${query}」，试试更短的词，或到左侧按分类找找。`;
      showMore();
    } catch {
      if (request === sequence) status.textContent = '搜索暂时加载失败，请检查网络，再点一次搜索。';
    }
  }
  function updateQuery(push = false) {
    const url = new URL(location.href);
    url.search = ''; url.hash = '';
    if (input.value.trim()) url.searchParams.set('q', input.value.trim());
    if (url.href !== location.href) history[push ? 'pushState' : 'replaceState'](null, '', url);
    search();
  }
  input.value = new URLSearchParams(location.search).get('q') || '';
  $('#search-form').addEventListener('submit', event => { event.preventDefault(); clearTimeout(debounce); updateQuery(true); });
  input.addEventListener('input', event => {
    clearTimeout(debounce);
    if (!event.isComposing) debounce = setTimeout(updateQuery, 250);
  });
  input.addEventListener('compositionend', () => { clearTimeout(debounce); debounce = setTimeout(updateQuery, 250); });
  window.addEventListener('popstate', () => { input.value = new URLSearchParams(location.search).get('q') || ''; search(); });
  $('#load-more').addEventListener('click', showMore);
  search();
})();
