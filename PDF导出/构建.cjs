const { readFile, readdir, mkdir, rename, writeFile } = require('node:fs/promises');
const { resolve, dirname, relative, join, sep } = require('node:path');
const { pathToFileURL, fileURLToPath } = require('node:url');
const { chromium } = require('playwright');

const root = resolve(__dirname, '..');
const scripts = /(?:阅读导出\.js|阅读模板\/(?:阅读|多年度阅读)\.js|assets\/app\.js)/;
const readPage = /class="(?:card|read|stem)"|<h3 id="q\d+"|<article id="q\d+"|<details class="answer"/;

async function discover(directory) {
  const pages = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.name.startsWith('.') || ['PDF', '文件', 'assets', 'images', 'node_modules'].includes(entry.name)) continue;
    if (entry.isDirectory()) pages.push(...await discover(path));
    else if (entry.isFile() && entry.name.endsWith('.html') && entry.name !== 'index.html') {
      const html = await readFile(path, 'utf8');
      if (readPage.test(html)) pages.push({ path, connected: scripts.test(decodeURI(html.match(/<script[^>]*src=[^>]*>/g)?.join('\n') || '')) });
    }
  }
  return pages;
}

async function run() {
  const args = process.argv.slice(2);
  const check = args.includes('--check');
  const filters = args.filter(value => value !== '--check');
  const pages = (await discover(root)).filter(entry => !filters.length || filters.some(value => relative(root, entry.path).includes(value)));
  if (!pages.length) throw new Error('未找到符合条件的阅读页');
  if (pages.some(entry => !entry.connected)) {
    throw new Error(`有阅读页未接入 PDF 导出：\n${pages.filter(entry => !entry.connected).map(entry => relative(root, entry.path)).join('\n')}`);
  }

  const results = [];
  const errors = [];
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE });
  try {
    const queue = pages.slice();
    await Promise.all(Array.from({ length: Math.min(4, pages.length) }, async () => {
      const page = await browser.newPage();
      await page.route(/^https?:/, route => route.abort());
      while (queue.length) {
        const { path } = queue.shift();
        const source = relative(root, path);
        try {
          await page.goto(pathToFileURL(path).href, { waitUntil: 'load' });
          await page.waitForFunction(() => window.sitePdf, { timeout: 8000 });
          const result = await page.evaluate(async () => {
            const { ready, prepare, download, student, namingReady } = window.sitePdf;
            await namingReady;
            const missing = await ready();
            const paper = prepare();
            const sourceQuestions = document.querySelectorAll('main .card[id^="q"], main article[id^="q"], main .read > h3, main .question-card, main section[id]:has(> .stem), main > h3[id]').length
              || document.querySelectorAll('main > details.answer').length;
            const questions = [...paper.querySelectorAll('.paper-question')];
            const answers = paper.querySelectorAll('.answer-inner').length;
            const empty = questions.filter(question => !question.querySelector('.body')?.textContent.trim().replace(/^\d+\.\s*/, '') && !question.querySelector('.body img, .body svg'));
            if (!questions.length || questions.length !== sourceQuestions) throw new Error(`题数不符：原页 ${sourceQuestions}，导出 ${questions.length}`);
            if (empty.length) throw new Error(`${empty.length} 道题无题干`);
            if (student && (answers || paper.querySelector('details, .paper-topic, .solution, .answer-body'))) throw new Error('学生版出现答案或考点');
            if (student && questions.some(question => !question.querySelector('.writing-line'))) throw new Error('学生版缺少作答区');
            if (!student && (answers !== questions.length || questions.some(question => !question.querySelector('.answer-inner')?.textContent.trim()))) {
              throw new Error(`教师版答案或解析不完整：${answers}/${questions.length} 题有解析区`);
            }
            if (missing.length) throw new Error(`题图未加载：${missing.join(', ')}`);
            document.title = download.download.replace(/\.pdf$/, '');
            return { name: download.download, url: download.href, questions: questions.length, answers, student,
              topics: paper.querySelectorAll('.paper-topic').length, images: paper.querySelectorAll('img').length,
              math: paper.querySelectorAll('.katex').length };
          });
          const output = fileURLToPath(result.url);
          if (!output.startsWith(`${root}${sep}`) || !output.endsWith('.pdf')) throw new Error(`PDF 路径不在站点内：${output}`);
          result.output = relative(root, output);
          if (check) {
            const buffer = await readFile(output);
            if (buffer.subarray(0, 5).toString() !== '%PDF-') throw new Error(`下载文件不是 PDF：${result.output}`);
            result.bytes = buffer.length;
          } else {
            await mkdir(dirname(output), { recursive: true });
            const buffer = await page.pdf({ preferCSSPageSize: true, printBackground: true, displayHeaderFooter: false });
            const staging = `${output}.part`;
            await writeFile(staging, buffer);
            await rename(staging, output);
            result.bytes = buffer.length;
          }
          results.push({ source, ...result });
          if (results.length % 20 === 0 || pages.length < 20) console.log(`${results.length}/${pages.length} ${source} · ${result.questions} 题`);
        } catch (error) {
          const reason = error.message.split('\n')[0];
          errors.push({ source, reason });
          console.error(`${source}：${reason}`);
        }
      }
      await page.close();
    }));
  } finally {
    await browser.close();
  }
  if (process.env.PDF_BUILD_REPORT) await writeFile(process.env.PDF_BUILD_REPORT, JSON.stringify({ results, errors }, null, 2));
  console.log(`已${check ? '核验' : '生成'} ${results.length}/${pages.length} 份；失败 ${errors.length} 份`);
  if (errors.length) process.exitCode = 1;
}

run().catch(error => { console.error(error); process.exitCode = 1; });
