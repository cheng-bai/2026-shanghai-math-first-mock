(() => {
  const directory = new URL('.', document.currentScript.src);
  const siteRoot = new URL('..', directory);
  const route = decodeURIComponent(location.pathname.slice(siteRoot.pathname.length));
  const main = document.querySelector('main');
  const article = main?.querySelector(':scope > .read') || main;
  const fy27 = window.fy27PrintPaper;
  const multi = document.body.dataset.mode;
  const student = document.body.classList.contains('student') || multi === '学生版' || /学生版|-student\.html$/.test(document.title + route);
  const edition = student ? '学生版' : '教师版';
  const paperMatch = /^FY27分类汇编\/整卷\/(\d{2}-(?:教师|学生)版)\.html$/.exec(route);
  const analysis = route.startsWith('FY27分类汇编/') && !fy27;
  const title = (analysis || route.startsWith('上海高考真题分类汇编/') ? document.querySelector('header h1') : null)
    || main?.querySelector('h1') || document.querySelector('h1');
  const original = article?.querySelector(':scope > section[id] > .stem');
  const sourceCards = analysis ? [...main?.querySelectorAll('article[id^="q"]') || []] : original ? [...article.querySelectorAll(':scope > section[id]:has(> .stem)')] : [];
  const synthesis = route.startsWith('上海高考真题分类汇编/') && !article?.querySelector(':scope > h3[id]')
    && article?.querySelector(':scope > details.answer');
  const questionHeading = synthesis ? 'h2[id]' : article?.classList.contains('read') ? 'h3' : 'h3[id]';
  const flatQuestions = article?.querySelector(`:scope > ${questionHeading}, :scope > .question-card`);
  if (!title || (!fy27 && !sourceCards.length && !flatQuestions)) return;

  const make = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text) element.textContent = text;
    return element;
  };
  const loadStyle = href => new Promise((resolve, reject) => {
    const stylesheet = make('link');
    stylesheet.rel = 'stylesheet';
    stylesheet.href = href;
    stylesheet.onload = resolve;
    stylesheet.onerror = reject;
    document.head.append(stylesheet);
  });
  const styleReady = loadStyle(new URL('试卷.css', directory));
  const titleText = title.textContent.trim().replace(/\s*[｜·]\s*(?:按解题机制分类汇编|整卷解析(?:初稿)?)$/, '')
    .replace(/\s*[（(](?:教师|学生)版[）)]$|[-\s·]+(?:教师|学生)版$/, '')
    .replace(/^\d{2}-|\s*-详解版$/g, '');
  const scope = /^(?:多年度分类汇编扩展\/)?(\d{4})([一二]模)/.exec(route);
  const district = /^多年度分类汇编扩展\/\d{4}[一二]模\/原卷阅读\/([^/]+)卷\//.exec(route)?.[1];
  const legacyDistrict = /^2026一模-原卷网页制作\/web\/([^/]+)\.html$/.exec(route)?.[1];
  const districtName = district || legacyDistrict;
  const period = scope ? `${scope[1]}年${scope[2]}` : '';
  const districtLabel = districtName && (/(区|县)$/.test(districtName) ? districtName : `${districtName}${districtName === '浦东' ? '新区' : '区'}`);
  const historicalPaper = /^FY27分类汇编\/FY27[^/]+\/(\d{2})(?:-[^/]+)?\/整卷解析\.html$/.exec(route)?.[1]
    || (route === 'FY27分类汇编/FY27整卷解析-首批/首批解析.html' ? '01' : '')
    || (route.startsWith('FY27分类汇编/虹口25一模解析页/') ? '15' : '');
  const subject = titleText.replace(/^上海高考(?:数学)?\s*[｜·-]?\s*/, '')
    .replace(/^(?:2026一模|上海高中数学)\s*[｜·：-]?\s*/, '');
  const prefix = districtLabel ? `${districtLabel}高三数学${period}`
    : period ? `高三数学${period}${subject}`
    : route.startsWith('上海高考真题分类汇编/') && !synthesis ? `高考数学${subject}` : `高三数学${subject}`;
  const defaultName = `上海-${prefix}${edition}20261119.pdf`.replace(/[\\/:*?"<>|]/g, '');
  const encodedRoute = route.replace(/\.html$/, '.pdf').split('/').map(encodeURIComponent).join('/');
  const download = make('a', 'site-pdf-download', '下载 PDF');
  download.download = defaultName;
  download.href = new URL(`文件/${encodedRoute}`, directory);
  const print = document.getElementById('print-topic') || make('button');
  print.textContent = '打印';
  print.type = 'button';
  const status = make('span', 'site-pdf-status');
  status.setAttribute('role', 'status');

  if (print.isConnected) {
    print.before(download);
    print.after(status);
  } else {
    const toolbar = make('div', 'site-pdf-tools');
    toolbar.append(download, print, status);
    title.after(toolbar);
  }

  const namingReady = new Promise((resolve, reject) => {
    if (!paperMatch && !historicalPaper) return resolve();
    download.hidden = true;
    const naming = make('script');
    naming.src = new URL('FY27分类汇编/整卷/PDF命名.js', siteRoot);
    naming.onload = () => {
      try {
        download.download = paperMatch ? fy27PaperPdfName(paperMatch[1])
          : fy27PaperPdfName(`${historicalPaper}-教师版`).replace(/教师版(?=\d{8}\.pdf$)/, '解析稿');
        if (paperMatch) download.href = `./PDF/${encodeURIComponent(download.download)}`;
        download.hidden = false;
        resolve();
      } catch (error) {
        reject(error);
      }
    };
    naming.onerror = () => reject(new Error('未加载 PDF 文件命名'));
    document.head.append(naming);
  });
  namingReady.catch(() => { status.textContent = '未加载到本卷的 PDF 下载入口，请刷新后重试。'; });

  const topics = '.exam-points,.question-topics';
  const writing = '.print-answer-space,.writing-space';
  const omit = 'a[id]:empty,nav,button,footer,.footer,.difficulty-badge,.source-ref,.source-link,.source-meta,.edition-tip,.grade,.reader-note,.exam-overview,.knowledge-summary,.class-guide';
  const isSource = node => node.matches('p,blockquote') && /^\s*(?:【?来源|核对来源|原题位置|原图核验)[：:]/.test(node.textContent);
  const sourceSuffix = /\s*2025\s*版上海高考真题及模拟训练合集(?:\s*[（(][上下]册[）)])?\s*$/;
  const isTopic = node => node.matches(topics) || node.matches('p') && /^\s*(?:核心|关联)?考点[：:]/.test(node.textContent);
  const isDifficulty = node => node.matches('p') && /^\s*难度(?:依据|分级|初估)?[：:]/.test(node.textContent);

  const clone = source => {
    const copy = source.cloneNode(true);
    copy.removeAttribute('hidden');
    return copy;
  };

  function addTopicStyle(node) {
    node.classList.add('paper-topic');
    for (const marker of node.querySelectorAll('strong')) {
      if (!/^难度(?:依据|分级|初估)?[：:]/.test(marker.textContent)) continue;
      const separator = marker.previousSibling;
      if (separator?.nodeName === 'BR') separator.remove();
      while (marker.nextSibling) marker.nextSibling.remove();
      marker.remove();
    }
    if (node.querySelector(':scope > strong')) return;
    const prefix = /^\s*((?:核心|关联)?考点[：:])\s*/;
    const first = node.firstChild;
    const match = first?.nodeType === Node.TEXT_NODE && first.data.match(prefix);
    if (match) first.data = first.data.slice(match[0].length);
    node.prepend(make('strong', '', match ? match[1] : '考点：'));
  }

  function exportQuestion(heading, nodes, index, groupName) {
    const question = make('article', 'paper-question');
    const stem = make('div', 'body');
    const content = make('div', 'answer-inner');
    const label = make('span', 'paper-number', `${index}. `);
    const originalNumber = Number(heading?.textContent.match(/第\s*(\d+)\s*题/)?.[1]);
    const number = analysis || original || districtName ? originalNumber || index : index;
    label.textContent = `${number}. `;
    let hasAnswer = false;
    for (const node of nodes) {
      if (node.matches(omit) || node.matches(writing) || isDifficulty(node)) continue;
      if (node.matches('details')) {
        if (student) continue;
        const copy = clone(node);
        copy.querySelector(':scope > summary')?.remove();
        for (const lazy of copy.querySelectorAll('noscript[data-lazy-answer]')) {
          lazy.insertAdjacentHTML('beforebegin', lazy.textContent);
          lazy.remove();
        }
        content.append(...copy.childNodes);
        hasAnswer = true;
      } else if (isTopic(node)) {
        if (student) continue;
        const topic = clone(node);
        addTopicStyle(topic);
        content.append(topic);
      } else {
        stem.append(clone(node));
      }
    }
    const first = [...stem.children].find(element => !element.matches('.issue,.notice') && !isSource(element));
    if (first?.matches('p')) first.prepend(label);
    else if (first?.matches('.stem') && first.firstElementChild?.matches('p')) first.firstElementChild.prepend(label);
    else {
      const numberLine = make('p');
      numberLine.append(label);
      stem.prepend(numberLine);
    }
    question.append(stem);
    if (content.childElementCount) question.append(content);
    if (hasAnswer) question.dataset.hasAnswer = '';
    if (student) {
      const space = make('div', 'writing-space');
      const stemHasSubquestions = stem.querySelector('ol') || /[（(][23][）)]/.test(stem.textContent);
      const lines = /解答题/.test(groupName) || originalNumber >= 17 || stemHasSubquestions ? 4 : 1;
      for (let line = 0; line < lines; line++) space.append(make('div', 'writing-line'));
      question.append(space);
    }
    return question;
  }

  function buildGenericPaper() {
    const paper = make('section', 'paper-print');
    const header = make('header');
    const paperTitle = period ? `${period} · ${districtLabel ? `${districtLabel}数学卷` : subject}` : titleText;
    header.append(make('h1', '', paperTitle), make('p', '', edition));
    paper.append(header);
    if (synthesis) {
      header.append(make('p', 'paper-notice', '本页为新编迁移练习，不是高考真题。'));
    } else if (main?.querySelector('.draft') || analysis || route.startsWith('上海高考真题分类汇编/')) {
      header.append(make('p', 'paper-notice', '教研阅读稿，尚未完成全量审定。使用前请核对待核题目。'));
    }
    if (sourceCards.length) {
      for (const [index, card] of sourceCards.entries()) {
        paper.append(exportQuestion(card.firstElementChild, Array.from(card.children).slice(1), index + 1, ''));
      }
    } else {
      let group = null;
      let question = null;
      let index = 0;
      const flush = () => {
        if (!question) return;
        if (group && group.parentElement !== paper) paper.append(group);
        paper.append(exportQuestion(question.heading, question.nodes, ++index, group?.textContent || ''));
        question = null;
      };
      for (const node of article.children) {
        if (node.matches(questionHeading)) {
          flush();
          if (synthesis) group = make('h2', 'paper-section', node.textContent.trim());
          question = { heading: node, nodes: [] };
        } else if (node.matches('h2')) {
          flush();
          group = make('h2', 'paper-section', node.textContent.trim());
        } else if (node.matches('.question-card')) {
          question = { heading: node.firstElementChild, nodes: Array.from(node.children).slice(1) };
          flush();
        } else if (question) {
          if (synthesis && node.matches('p') && /^\s*母题[：:]/.test(node.textContent)) continue;
          question.nodes.push(node);
        }
      }
      flush();
    }
    return paper;
  }

  let paper;
  function prepare() {
    if (paper) return paper;
    paper = fy27 ? fy27() : buildGenericPaper();
    if (!fy27) paper.classList.add('paper-generic');
    paper.querySelectorAll(omit).forEach(element => element.remove());
    paper.querySelectorAll('p,blockquote').forEach(element => {
      if (isSource(element)) {
        if (/未核对原图/.test(element.textContent)) {
          element.classList.add('paper-notice');
          element.textContent = '本题尚未核对原图。';
        } else element.remove();
      } else if (isDifficulty(element) || student && isTopic(element)) element.remove();
      else if (isTopic(element) && !element.classList.contains('paper-topic')) addTopicStyle(element);
      const tail = element.lastChild;
      if (route.startsWith('上海高考真题分类汇编/') && tail?.nodeType === Node.TEXT_NODE) {
        tail.data = tail.data.replace(sourceSuffix, '');
      }
    });
    paper.querySelectorAll('[id]').forEach(element => {
      if (!element.closest('svg')) element.removeAttribute('id');
    });
    paper.querySelectorAll('img').forEach(image => { image.loading = 'eager'; });
    document.body.classList.add('has-paper-print');
    document.body.append(paper);
    return paper;
  }

  async function ready() {
    await styleReady;
    const output = prepare();
    output.dataset.preparing = '';
    try {
      output.getBoundingClientRect();
      const images = [...output.querySelectorAll('img')];
      const decoded = await Promise.allSettled(images.map(image => image.decode()));
      await document.fonts.ready;
      return images.filter((image, index) => decoded[index].status === 'rejected').map(image => image.currentSrc || image.src);
    } finally {
      delete output.dataset.preparing;
    }
  }

  print.addEventListener('click', async () => {
    print.disabled = true;
    status.textContent = '正在准备公式和图片…';
    try {
      await namingReady;
      const missing = await ready();
      if (missing.length) {
        status.textContent = `${missing.length} 张图片未加载，请刷新后重试。`;
        return;
      }
      status.textContent = '';
      const previousTitle = document.title;
      document.title = download.download.replace(/\.pdf$/, '');
      try {
        window.print();
      } finally {
        document.title = previousTitle;
      }
    } catch {
      status.textContent = '打印准备失败，请刷新后重试。';
    } finally {
      print.disabled = false;
    }
  });
  window.addEventListener('beforeprint', prepare);
  window.sitePdf = { ready, prepare, download, student, namingReady };
})();
