(() => {
  const family = document.body?.dataset.readerFamily || '';
  const TOPICS = [
    {key: '集合与逻辑', name: '集合与逻辑专题', slug: '集合与逻辑-双版', number: '01'},
    {key: '不等式', name: '不等式专题', slug: '不等式-双版', number: '02'},
    {key: '函数与导数', name: '函数与导数专题', slug: '函数与导数-双版', number: '03'},
    {key: '三角函数', name: '三角函数与解三角形专题', slug: '三角函数与解三角形-双版', number: '04'},
    {key: '数列', name: '数列专题', slug: '数列-双版', number: '05'},
    {key: '向量', name: '向量专题', number: '06', file: {teacher: '2026一模-向量复数专题-原卷重建版/HTML阅读版/vector.html', student: '2026一模-向量复数专题-原卷重建版/HTML阅读版/vector-student.html'}},
    {key: '复数', name: '复数专题', number: '07', file: {teacher: '2026一模-向量复数专题-原卷重建版/HTML阅读版/complex.html', student: '2026一模-向量复数专题-原卷重建版/HTML阅读版/complex-student.html'}},
    {key: '解析几何', name: '解析几何专题', slug: '解析几何-双版', number: '08'},
    {key: '立体几何', name: '立体几何专题', slug: '立体几何-双版', number: '09'},
    {key: '计数', name: '计数原理与二项式专题', slug: '计数原理与二项式-双版', number: '10'},
    {key: '概率', name: '概率与统计专题', slug: '概率与统计-双版', number: '11'},
    {key: '新定义', name: '新定义与综合专题', slug: '新定义与综合-双版', number: '12'}
  ];

  const siteRoot = () => {
    const link = document.querySelector('link[data-reader-adapter]');
    const href = link?.getAttribute('href') || '';
    return href.replace(/(?:%E9%98%85%E8%AF%BB%E6%A8%A1%E6%9D%BF\/)?%E7%BB%9F%E4%B8%80%E9%98%85%E8%AF%BB%E9%80%82%E9%85%8D\.css.*$/, '')
      .replace(/阅读模板\/统一阅读适配\.css.*$/, '');
  };
  const root = siteRoot();
  const homeHref = `${root}index.html`;
  const catalogHref = `${root}2026一模-全卷分类汇编-进行中/阅读入口.html`;

  const currentFile = () => {
    const file = decodeURIComponent(location.pathname).split('/').pop();
    return file || 'index.html';
  };
  const studentEdition = () => /学生|student/i.test(currentFile());
  const makeLink = (href, text, current) => {
    const link = document.createElement('a');
    link.href = href;
    link.textContent = text;
    if (current) {
      link.setAttribute('aria-current', 'page');
      link.classList.add('active');
    }
    if (text === '首页') link.dataset.siteHome = 'true';
    return link;
  };
  const topicByPath = () => {
    const file = currentFile();
    if (file.startsWith('vector')) return TOPICS.find(topic => topic.key === '向量');
    if (file.startsWith('complex')) return TOPICS.find(topic => topic.key === '复数');
    const path = decodeURIComponent(location.pathname);
    return TOPICS.find(topic => topic.slug && path.includes(topic.slug));
  };
  const topicHref = (topic, student) => {
    if (topic.file) return root + (student ? topic.file.student : topic.file.teacher);
    return `${root}2026一模-全卷分类汇编-进行中/${topic.slug}/${student ? '学生版.html' : '教师版.html'}`;
  };

  const decodeHash = () => {
    if (!location.hash || location.hash === '#') return '';
    try { return decodeURIComponent(location.hash.slice(1)); }
    catch { return ''; }
  };

  const headerOffset = () => {
    const header = document.querySelector('header.top, body[data-reader-family="paper"] > header');
    return (header?.offsetHeight || 0) + 12;
  };

  let userScrolled = false;
  let alignToken = 0;
  const noteUserScroll = () => { userScrolled = true; };
  window.addEventListener('wheel', noteUserScroll, {passive: true, once: true});
  window.addEventListener('touchmove', noteUserScroll, {passive: true, once: true});
  window.addEventListener('keydown', event => {
    if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(event.key)) noteUserScroll();
  }, {once: true});

  const alignToHash = () => {
    const id = decodeHash();
    const token = ++alignToken;
    if (!id) {
      document.documentElement.classList.remove('hold-anchor', 'anchor-settling');
      return;
    }
    document.documentElement.classList.add('anchor-settling');
    let stable = 0;
    let last = null;
    let frames = 0;
    const tick = () => {
      if (token !== alignToken) return;
      const target = document.getElementById(id);
      frames += 1;
      if (!target) {
        if (frames < 60) requestAnimationFrame(tick);
        else document.documentElement.classList.remove('hold-anchor', 'anchor-settling');
        return;
      }
      const top = Math.max(0, target.getBoundingClientRect().top + window.scrollY - headerOffset());
      if (!userScrolled && Math.abs(window.scrollY - top) > 2) window.scrollTo(0, top);
      if (last !== null && Math.abs(top - last) < 1) stable += 1;
      else stable = 0;
      last = top;
      if (frames === 2) document.documentElement.classList.remove('hold-anchor');
      if (!userScrolled && stable < 8 && frames < 120) requestAnimationFrame(tick);
      else document.documentElement.classList.remove('hold-anchor');
      if (typeof window.__readerSpy === 'function') window.__readerSpy();
    };
    requestAnimationFrame(tick);
  };

  const bindEdition = switcher => {
    switcher.querySelectorAll('a:not([aria-current]):not(.pdf-download):not([download])').forEach(link => {
      link.addEventListener('click', () => {
        const hash = decodeHash();
        if (hash) {
          link.hash = hash;
          return;
        }
        const current = document.querySelector('aside.side .section-links a.is-current');
        if (current) {
          link.hash = current.getAttribute('href').slice(1);
          return;
        }
        const line = headerOffset();
        const anchors = [...document.querySelectorAll('article.read a[id]')];
        const hit = anchors.filter(anchor => anchor.getBoundingClientRect().top <= line).pop();
        if (hit) link.hash = hit.id;
      });
    });
  };

  const placeBatchControls = () => {
    const controls = document.querySelector('.batch-controls');
    if (!controls) return;
    const wide = window.matchMedia('(min-width: 761px)').matches;
    const side = document.querySelector('aside.side, body[data-reader-family="paper"] aside');
    const hero = document.querySelector('main .hero, main.page > .hero, section.hero');
    if (family === 'topic' && wide && side) side.append(controls);
    else if (hero && controls.parentElement !== hero) hero.append(controls);
  };

  const rebuildOtherTopics = aside => {
    aside.querySelectorAll('details.other-topics').forEach(details => details.remove());
    [...aside.childNodes].forEach(node => {
      if (node.nodeType === Node.TEXT_NODE && /全卷覆盖清单|仅本地对账/.test(node.textContent)) node.remove();
    });
    const current = topicByPath();
    const student = studentEdition();
    const details = document.createElement('details');
    details.className = 'other-topics';
    const summary = document.createElement('summary');
    summary.textContent = '其他专题';
    details.append(summary);
    TOPICS.forEach(topic => {
      if (current && topic.key === current.key) return;
      const link = document.createElement('a');
      link.href = topicHref(topic, student);
      link.textContent = topic.name;
      details.append(link);
    });
    const controls = aside.querySelector('.batch-controls');
    if (controls) aside.insertBefore(details, controls);
    else aside.append(details);
  };

  const installScrollSpy = () => {
    const links = [...document.querySelectorAll('aside.side .section-links a[href^="#"]')];
    const items = links.map(link => {
      let id = link.getAttribute('href').slice(1);
      try { id = decodeURIComponent(id); } catch { /* keep raw id */ }
      return {link, target: document.getElementById(id)};
    }).filter(item => item.target);
    if (!items.length) return;
    const spy = () => {
      const line = headerOffset();
      let current = items[0];
      items.forEach(item => {
        if (item.target.getBoundingClientRect().top <= line) current = item;
      });
      const hash = decodeHash();
      const hashed = items.find(item => item.target.id === hash);
      if (hashed && !userScrolled) current = hashed;
      items.forEach(item => {
        const on = item === current;
        item.link.classList.toggle('is-current', on);
        if (on) item.link.setAttribute('aria-current', 'location');
        else if (item.link.getAttribute('aria-current') === 'location') item.link.removeAttribute('aria-current');
      });
    };
    window.__readerSpy = spy;
    window.addEventListener('scroll', spy, {passive: true});
    window.addEventListener('resize', () => { placeBatchControls(); spy(); });
    spy();
  };

  const stripInternalCopy = () => {
    document.querySelectorAll('article.read blockquote').forEach(quote => {
      const text = quote.textContent;
      if (text.includes('MinerU') || text.includes('仅本地对账') || text.includes('旧汇编未用作')) quote.remove();
    });
  };

  const numberTopic = () => {
    const heading = document.querySelector('main .hero h1, section.hero h1');
    const label = document.querySelector('main .hero .label, section.hero .label');
    if (!heading || !label) return;
    const topic = TOPICS.find(item => heading.textContent.trim() === item.name);
    if (!topic) return;
    label.textContent = `TOPIC ${topic.number} / 2026 FIRST MOCK`;
  };

  const enhanceTopic = () => {
    stripInternalCopy();
    numberTopic();
    const identity = document.querySelector('header.top .identity');
    if (identity && !identity.querySelector('a')) {
      const link = makeLink(homeHref, identity.textContent.trim(), false);
      identity.replaceChildren(link);
    }
    const nav = document.querySelector('header.top nav');
    if (nav && !nav.querySelector('.site-levels')) {
      const pdfs = [...nav.querySelectorAll('a.pdf-download, a[download]')];
      [...nav.childNodes].forEach(node => { if (!pdfs.includes(node)) node.remove(); });
      const levels = document.createElement('span');
      levels.className = 'site-levels';
      levels.append(
        makeLink(homeHref, '首页', false),
        makeLink(catalogHref, '本届专题目录', false),
        makeLink(currentFile(), '本专题', true)
      );
      nav.prepend(levels);
    }
    const existing = document.querySelector('.edition-switch');
    if (existing && nav && !nav.contains(existing)) {
      const fresh = existing.cloneNode(true);
      existing.remove();
      fresh.querySelectorAll('a.pdf-download, a[download]').forEach(link => link.remove());
      const pdf = nav.querySelector('a.pdf-download, a[download]');
      if (pdf) nav.insertBefore(fresh, pdf);
      else nav.append(fresh);
      bindEdition(fresh);
    }
    const aside = document.querySelector('aside.side');
    if (aside) {
      const heading = [...aside.querySelectorAll('h2')].find(node => node.textContent.trim() === '专题导航');
      if (heading) {
        const dropped = [];
        let node = heading.nextSibling;
        while (node && !(node.nodeType === 1 && node.tagName === 'H2')) {
          dropped.push(node);
          node = node.nextSibling;
        }
        dropped.forEach(item => item.remove());
        const here = makeLink(currentFile(), '本专题', true);
        const catalog = makeLink(catalogHref, '本届专题目录', false);
        const home = makeLink(homeHref, '首页', false);
        heading.after(here);
        heading.after(catalog);
        heading.after(home);
      }
      placeBatchControls();
      rebuildOtherTopics(aside);
    }
    installScrollSpy();
  };

  const enhancePaper = () => {
    const header = document.querySelector('body[data-reader-family="paper"] > header');
    if (!header) return;
    const strong = header.querySelector('strong');
    if (strong && !strong.querySelector('a')) {
      const link = makeLink(homeHref, strong.textContent.trim(), false);
      link.classList.add('brand-home');
      strong.replaceChildren(link);
    }
    header.querySelectorAll('a').forEach(link => {
      const text = link.textContent.trim();
      if (text.includes('汇编总入口')) link.textContent = '首页';
      if (text.includes('返回专题汇编') || text === '专题双版') link.textContent = '本届专题目录';
    });
    const slot = header.querySelector('nav') || header.querySelector('.bar');
    if (slot && ![...header.querySelectorAll('a')].some(link => link.textContent.trim() === '首页')) {
      slot.prepend(makeLink(homeHref, '首页', false));
    }
    placeBatchControls();
  };

  if (family === 'topic') enhanceTopic();
  if (family === 'paper') enhancePaper();
  alignToHash();
  const realign = () => {
    if (decodeHash() && !userScrolled) alignToHash();
    else document.documentElement.classList.remove('hold-anchor');
    if (typeof window.__readerSpy === 'function') window.__readerSpy();
  };
  window.addEventListener('load', realign);
  document.fonts?.ready?.then(realign);
  const observedHeader = document.querySelector('header.top, body[data-reader-family="paper"] > header');
  if (observedHeader && 'ResizeObserver' in window && decodeHash()) {
    const observer = new ResizeObserver(() => { if (!userScrolled) alignToHash(); });
    observer.observe(observedHeader);
    setTimeout(() => observer.disconnect(), 4000);
  }
  window.addEventListener('resize', placeBatchControls);
})();
