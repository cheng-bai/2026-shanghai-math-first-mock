(() => {
  const article = document.querySelector('.read');
  const outline = document.getElementById('outline');
  const search = document.getElementById('question-search');
  if (!article || !outline || !search) return;
  const groups = [];
  let group;
  for (const node of [...article.children]) {
    if (node.tagName === 'H2' && /^class-\d+$/.test(node.id)) {
      group = {heading: node, guide: null, cards: []};
      groups.push(group);
    } else if (node.tagName === 'H3' && group) {
      const card = document.createElement('section');
      card.className = 'question-card';
      node.before(card);
      card.append(node);
      group.cards.push({element: card, heading: node});
    } else if (group && group.cards.length) {
      group.cards[group.cards.length - 1].element.append(node);
    } else if (group && node.classList.contains('class-guide')) {
      group.guide = node;
    }
  }
  const panels = [...article.querySelectorAll('details')];
  const mount = panel => {
    const source = panel.querySelector('noscript[data-lazy-answer]');
    if (source) {
      source.insertAdjacentHTML('beforebegin', source.textContent);
      source.remove();
    }
  };
  panels.forEach(panel => panel.addEventListener('toggle', () => { if (panel.open) mount(panel); }));
  document.getElementById('open-all')?.addEventListener('click', () => panels.forEach(panel => { mount(panel); panel.open = true; }));
  document.getElementById('close-all')?.addEventListener('click', () => panels.forEach(panel => { panel.open = false; }));
  outline.replaceChildren();
  for (const item of groups) {
    const container = document.createElement('div');
    container.className = 'outline-group';
    const head = document.createElement('div');
    head.className = 'outline-head';
    const link = document.createElement('a');
    link.href = `#${item.heading.id}`;
    link.textContent = `${item.heading.textContent} (${item.cards.length})`;
    const toggle = document.createElement('button');
    toggle.className = 'outline-toggle';
    toggle.type = 'button';
    toggle.textContent = '▾';
    toggle.setAttribute('aria-label', `折叠或展开${item.heading.textContent}的题目`);
    toggle.setAttribute('aria-expanded', 'true');
    const list = document.createElement('div');
    list.className = 'outline-questions';
    list.id = `outline-${item.heading.id}`;
    toggle.setAttribute('aria-controls', list.id);
    toggle.addEventListener('click', () => {
      list.hidden = !list.hidden;
      toggle.setAttribute('aria-expanded', String(!list.hidden));
    });
    head.append(toggle, link);
    container.append(head, list);
    outline.append(container);
    item.container = container;
    item.list = list;
    item.toggle = toggle;
    for (const card of item.cards) {
      const questionLink = document.createElement('a');
      questionLink.href = `#${card.heading.id}`;
      questionLink.textContent = card.heading.childNodes[0].textContent.trim();
      list.append(questionLink);
      card.link = questionLink;
      const text = [...card.element.childNodes].map(node => {
        if (node.nodeType === Node.TEXT_NODE) return node.textContent;
        if (node.nodeType !== Node.ELEMENT_NODE || node.matches('details,.issue')) return '';
        if (!node.querySelector('details,.issue')) return node.textContent;
        const copy = node.cloneNode(true);
        copy.querySelectorAll('details,.issue').forEach(element => element.remove());
        return copy.textContent;
      }).join('');
      card.text = `${card.heading.id} ${text}`.toLocaleLowerCase();
    }
  }
  const cards = groups.flatMap(item => item.cards);
  const status = document.getElementById('search-status');
  const empty = document.getElementById('empty-result');
  const clearSearch = document.createElement('button');
  clearSearch.type = 'button';
  clearSearch.textContent = '清除搜索';
  clearSearch.hidden = true;
  search.after(clearSearch);
  let searchOutline = null;
  let searchExpanded = new Set();
  const setHidden = (element, hidden) => {
    if (element.hidden !== hidden) element.hidden = hidden;
  };
  const filter = () => {
    const query = search.value.trim().toLocaleLowerCase();
    setHidden(clearSearch, !search.value);
    if (query && !searchOutline) {
      searchOutline = groups.map(item => item.list.hidden);
      searchExpanded = new Set();
    } else if (!query && searchOutline) {
      groups.forEach((item, index) => {
        item.list.hidden = searchOutline[index];
        item.toggle.setAttribute('aria-expanded', String(!item.list.hidden));
      });
      searchOutline = null;
      searchExpanded.clear();
    }
    let count = 0;
    for (const item of groups) {
      let visible = 0;
      for (const card of item.cards) {
        const match = !query || card.text.includes(query);
        setHidden(card.element, !match);
        setHidden(card.link, !match);
        if (match) { visible++; count++; }
      }
      setHidden(item.heading, !visible);
      setHidden(item.container, !visible);
      if (item.guide) setHidden(item.guide, !visible);
      if (query && visible && !searchExpanded.has(item)) {
        item.list.hidden = false;
        item.toggle.setAttribute('aria-expanded', 'true');
        searchExpanded.add(item);
      }
    }
    status.textContent = query ? `找到 ${count} / ${cards.length} 题` : `共 ${cards.length} 题`;
    setHidden(empty, count !== 0);
  };
  search.addEventListener('input', filter);
  clearSearch.addEventListener('click', () => {
    search.value = '';
    filter();
    search.focus();
  });
  let sectionNavigation = null;
  const clearSectionNavigation = () => { sectionNavigation = null; };
  window.addEventListener('wheel', clearSectionNavigation, {passive: true});
  window.addEventListener('touchmove', clearSectionNavigation, {passive: true});
  search.addEventListener('input', clearSectionNavigation);
  window.addEventListener('pointerdown', event => {
    if (event.target === document.documentElement) clearSectionNavigation();
  });
  window.addEventListener('keydown', event => {
    if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(event.key) && !event.target.matches?.('input, textarea, select, [contenteditable="true"]')) clearSectionNavigation();
  });
  const revealHash = (hash = location.hash, focusTarget = false) => {
    let id;
    try { id = decodeURIComponent(hash.slice(1)); } catch { return; }
    const item = groups.find(group => group.heading.id === id || group.cards.some(card => card.heading.id === id));
    if (!item) return;
    clearSectionNavigation();
    if (search.value) { search.value = ''; filter(); }
    item.list.hidden = false;
    item.toggle.setAttribute('aria-expanded', 'true');
    const target = document.getElementById(id);
    target?.scrollIntoView({behavior: 'instant'});
    if (focusTarget && target) {
      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
      target.focus({preventScroll: true});
    }
    if (target) sectionNavigation = {id, scrollY: window.scrollY, top: target.getBoundingClientRect().top};
  };
  window.addEventListener('hashchange', () => revealHash());
  outline.addEventListener('click', event => {
    const link = event.target.closest('a');
    if (link && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
      event.preventDefault();
      if (location.hash !== link.hash) history.pushState(null, '', link.hash);
      revealHash(link.hash, true);
    }
  });
  const updateVersionTarget = event => {
    if (event.type === 'auxclick' && event.button !== 1) return;
    const readingLine = Math.min(innerHeight * .25, 180);
    let current = '';
    let cardAtReadingLine = false;
    let firstVisibleCard = '';
    for (const item of groups) {
      if (!item.heading.hidden && item.heading.getBoundingClientRect().top <= readingLine) current = item.heading.id;
      for (const card of item.cards) {
        if (card.element.hidden) continue;
        const bounds = card.element.getBoundingClientRect();
        if (bounds.top <= readingLine) {
          current = card.heading.id;
          if (bounds.bottom > 0) cardAtReadingLine = true;
        }
        if (!firstVisibleCard && bounds.top < innerHeight && bounds.bottom > 0) firstVisibleCard = card.heading.id;
      }
    }
    if (search.value.trim() && !cardAtReadingLine && firstVisibleCard) current = firstVisibleCard;
    let anchoredId = '';
    try { anchoredId = decodeURIComponent(location.hash.slice(1)); } catch {}
    const anchoredGroup = groups.find(item => item.heading.id === anchoredId && !item.heading.hidden);
    const anchoredCard = groups.flatMap(item => item.cards).find(card => card.heading.id === anchoredId && !card.element.hidden);
    const anchoredTarget = anchoredGroup?.heading || anchoredCard?.heading;
    if (sectionNavigation?.id === anchoredId && anchoredTarget && Math.abs(window.scrollY - sectionNavigation.scrollY) <= 2) {
      const top = anchoredTarget.getBoundingClientRect().top;
      if (Math.abs(top - sectionNavigation.top) <= 2 && top >= 0 && top < innerHeight) current = anchoredId;
    }
    event.currentTarget.hash = current;
  };
  const versionLink = document.getElementById('version-link');
  versionLink?.addEventListener('click', updateVersionTarget);
  versionLink?.addEventListener('auxclick', updateVersionTarget);
  versionLink?.addEventListener('contextmenu', updateVersionTarget);
  let printState;
  const preparePrint = () => {
    if (printState) return;
    printState = {query: search.value, open: panels.map(panel => panel.open), outline: groups.map(item => item.list.hidden), searchOutline, searchExpanded: new Set(searchExpanded)};
    search.value = '';
    filter();
    panels.forEach(panel => { mount(panel); panel.open = true; });
    article.querySelectorAll('img').forEach(image => { image.loading = 'eager'; });
  };
  const restorePrint = () => {
    if (!printState) return;
    panels.forEach((panel, index) => { panel.open = printState.open[index]; });
    search.value = printState.query;
    filter();
    searchOutline = printState.searchOutline;
    searchExpanded = printState.searchExpanded;
    groups.forEach((item, index) => {
      item.list.hidden = printState.outline[index];
      item.toggle.setAttribute('aria-expanded', String(!item.list.hidden));
    });
    printState = null;
  };
  window.addEventListener('beforeprint', preparePrint);
  window.addEventListener('afterprint', restorePrint);
  document.getElementById('print-topic')?.addEventListener('click', async event => {
    const button = event.currentTarget;
    button.disabled = true;
    button.textContent = '正在准备公式和图片…';
    let timeout;
    try {
      let resources;
      try {
        preparePrint();
        article.getBoundingClientRect();
        resources = Promise.all([document.fonts.ready, ...[...article.querySelectorAll('img')].map(image => image.decode())]);
      } finally {
        restorePrint();
      }
      await Promise.race([
        resources,
        new Promise((resolve, reject) => { timeout = setTimeout(() => reject(new Error('打印资源准备超时')), 15000); })
      ]);
      preparePrint();
      window.print();
    } catch {
      restorePrint();
      status.textContent = '公式或图片尚未加载完成，请检查网络后重试打印。';
    } finally {
      clearTimeout(timeout);
      button.disabled = false;
      button.textContent = '打印 / 保存 PDF';
    }
  });
  document.querySelectorAll('[data-enhancement]').forEach(element => { element.hidden = false; });
  filter();
  if (location.hash) revealHash();
})();
