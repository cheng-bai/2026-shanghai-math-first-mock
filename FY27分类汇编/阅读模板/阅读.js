
document.getElementById('open-all')?.addEventListener('click',()=>document.querySelectorAll('.answer').forEach(item=>item.open=true));
document.getElementById('close-all')?.addEventListener('click',()=>document.querySelectorAll('.answer').forEach(item=>item.open=false));
const cards=[...document.querySelectorAll('.card')],search=document.getElementById('question-search'),jump=document.getElementById('question-jump'),status=document.getElementById('finder-status'),empty=document.getElementById('empty-result'),version=document.getElementById('version-link');
const springQuestion=cards.find(card=>card.querySelector('.source-link')?.textContent.includes('来源：26春考回忆·15'));
if(springQuestion){
  const vectorImages={'da2e3b76158d3a54.jpg':'fy27-26spring-q15-a.svg','029e7e5e326f01bc.jpg':'fy27-26spring-q15-b.svg','0b2a5c8a0a6a26d8.jpg':'fy27-26spring-q15-c.svg','634506053df97865.jpg':'fy27-26spring-q15-d.svg','d738ea81f89408a0.jpg':'fy27-26spring-q15-solution.svg'};
  for(const image of springQuestion.querySelectorAll('img')){
    const original=new URL(image.src);
    const replacement=vectorImages[original.pathname.split('/').pop()];
    if(replacement)image.src=new URL(replacement,original).href;
  }
  const optionFigures=[...springQuestion.querySelectorAll('.body > figure')];
  if(optionFigures.length===4&&optionFigures.every(figure=>figure.previousElementSibling?.matches('ol'))){
    const optionStyle=document.createElement('style');
    optionStyle.textContent='.spring-q15-options{display:grid;grid-template-columns:repeat(4,minmax(0,160px));gap:.5rem;margin:.6rem 0 1rem}.spring-q15-option{display:flex;align-items:flex-start;min-width:0}.spring-q15-option ol{margin:0;padding-left:1.4em}.spring-q15-option figure{margin:0;min-width:0}.spring-q15-option img{display:block;width:128px;max-width:100%;height:auto}.spring-q15-option figcaption{display:none}@media(max-width:600px){.spring-q15-options{grid-template-columns:repeat(2,minmax(0,160px))}}';
    document.head.append(optionStyle);
    const options=document.createElement('div');
    options.className='spring-q15-options';
    optionFigures[0].previousElementSibling.before(options);
    for(const figure of optionFigures){
      const option=document.createElement('div');
      option.className='spring-q15-option';
      option.append(figure.previousElementSibling,figure);
      options.append(option);
    }
  }
}
const versionBase=version.getAttribute('href');
const searchText=new Map(cards.map(card=>[card,(card.querySelector('h2').textContent+' '+card.querySelector('.meta').textContent).toLocaleLowerCase()]));
document.getElementById('finder').hidden=false;
function filterQuestions(){const query=search.value.trim().toLocaleLowerCase();let shown=0;for(const card of cards){const text=searchText.get(card);card.hidden=!!query&&!text.includes(query);if(!card.hidden)shown++}status.textContent=query?`找到 ${shown} / ${cards.length} 题（搜索来源、题号和考点）`:'';empty.hidden=shown!==0;updateVersionLink()}
search.addEventListener('input',filterQuestions);
let selectedCard=cards.find(card=>card.id===location.hash.slice(1))||null;
function revealOutline(){const link=[...document.querySelectorAll('.sidebar .outline-questions a')].find(item=>{const target=new URL(item.href);return target.pathname===location.pathname&&target.hash===location.hash&&target.hash});if(!link)return;link.closest('.outline-topic').open=true;link.closest('.outline-group').open=true;document.querySelectorAll('.outline-questions a[aria-current]').forEach(item=>item.removeAttribute('aria-current'));link.setAttribute('aria-current','location')}
revealOutline();
document.querySelector('.sidebar nav').addEventListener('click',event=>{const link=event.target.closest('a');if(!link)return;const target=new URL(link.href);if(target.pathname!==location.pathname||!target.hash)return;const card=cards.find(item=>item.id===target.hash.slice(1));if(!card)return;if(card.hidden){search.value='';filterQuestions()}selectedCard=card;updateVersionLink()});
jump.addEventListener('change',()=>{const card=cards.find(item=>item.id===jump.value);if(!card)return;if(card.hidden){search.value='';filterQuestions()}selectedCard=card;location.hash=card.id;card.scrollIntoView({behavior:'instant',block:'start'});updateVersionLink()});
function updateVersionLink(){const visible=cards.filter(card=>!card.hidden);if(!visible.length){version.setAttribute('href',versionBase);return}let current=selectedCard&&!selectedCard.hidden?selectedCard:visible[0];if(!selectedCard||selectedCard.hidden)for(const card of visible){if(card.getBoundingClientRect().top<=150)current=card;else break}version.setAttribute('href',versionBase+'#'+current.id)}
function resumeScrollTracking(){selectedCard=null}
window.addEventListener('wheel',resumeScrollTracking,{passive:true});window.addEventListener('touchmove',resumeScrollTracking,{passive:true});window.addEventListener('keydown',event=>{if(!event.target.closest('input,select,textarea,button')&&['ArrowDown','ArrowUp','PageDown','PageUp','Home','End',' '].includes(event.key))resumeScrollTracking()});
let scrollPending=false;window.addEventListener('scroll',()=>{if(scrollPending)return;scrollPending=true;requestAnimationFrame(()=>{updateVersionLink();scrollPending=false})},{passive:true});window.addEventListener('hashchange',()=>{selectedCard=cards.find(card=>card.id===location.hash.slice(1))||null;if(selectedCard&&selectedCard.hidden){search.value='';filterQuestions();selectedCard.scrollIntoView({behavior:'instant',block:'start'})}revealOutline();updateVersionLink()});updateVersionLink();
const paperMatch=decodeURIComponent(location.pathname).match(/\/整卷\/(\d{2}-(教师|学生)版)\.html$/);
if(paperMatch)addPaperSwitcher(paperMatch[1].slice(0,2),`${paperMatch[2]}版`);

function addPaperSwitcher(currentNumber,edition){
  const outline=document.querySelector('.sidebar nav[aria-label="本卷题目"]');
  if(!outline)return;
  if(!selectedCard)outline.querySelectorAll('.outline-topic[open]').forEach(topic=>topic.open=false);
  const names=['26春考回忆','25春考','24春考','24秋考','23春考','虹口26二模','奉贤26高三下练','金山26高三下监控','闵行26二模','长宁26高三下调研','徐汇26一模','浦东26高三上期末','青浦26一模','杨浦25一模','虹口25一模','静安25一模','崇明25二模','长宁25二模','黄浦24一模','闵行24一模'];
  const switcher=document.createElement('nav');
  switcher.className='paper-switcher';
  switcher.setAttribute('aria-labelledby','paper-switcher-title');
  const label=document.createElement('h2');
  label.id='paper-switcher-title';
  label.textContent='切换来源卷';
  const list=document.createElement('ul');
  for(const [index,name] of names.entries()){
    const number=String(index+1).padStart(2,'0');
    const item=document.createElement('li');
    if(number===currentNumber){
      item.setAttribute('aria-current','page');
      item.textContent=`${number} ${name}（当前）`;
    }else{
      const link=document.createElement('a');
      link.href=`./${number}-${edition}.html`;
      link.textContent=`${number} ${name}`;
      item.append(link);
    }
    list.append(item);
  }
  switcher.append(label,list);
  outline.after(switcher);
}

const printButton=document.getElementById('print-topic');
const hongkouWritingLines=new Map([[9,2],[10,2],[11,3],[12,3],[16,3]]);
if(printButton){
  const edition=document.body.classList.contains('student')?'学生':'教师';
  window.fy27PrintPaper=clone=>buildPaperPrint(edition,clone);
  const exportScript=document.createElement('script');
  exportScript.src=new URL('../../PDF导出/阅读导出.js',document.currentScript.src).href;
  document.head.append(exportScript);
}

function buildPaperPrint(edition,clone=node=>node.cloneNode(true)){
  const paper=document.createElement('section');
  paper.className='paper-print';
  const header=document.createElement('header');
  const title=document.createElement('h1');
  title.textContent=document.querySelector('main h1').textContent.trim();
  const subtitle=document.createElement('p');
  subtitle.textContent=`${edition}版`;
  header.append(title,subtitle);
  for(const item of document.querySelectorAll('main > header .notice')){
    const notice=item.cloneNode(true);
    notice.classList.add('paper-notice');
    header.append(notice);
  }
  paper.append(header);

  for(const [index,card] of cards.entries()){
    const question=document.createElement('article');
    question.className='paper-question';
    const body=clone(card.querySelector('.body'));
    const questionNumber=paperMatch?Number(card.id.slice(1)):index+1;
    const number=document.createElement('span');
    number.className='paper-number';
    number.textContent=`${questionNumber}. `;
    body.firstElementChild.prepend(number);
    question.append(body);

    if(edition==='教师'){
      const answerInner=card.querySelector('.answer-inner');
      const content=answerInner&&clone(answerInner);
      if(content){
        const [answer,solution]=content.querySelectorAll(':scope > h3');
        if(answer){
          const key=document.createElement('div');
          key.className='paper-key';
          const value=document.createElement('div');
          answer.before(key);
          key.append(answer,value);
          while(key.nextElementSibling&&key.nextElementSibling!==solution)value.append(key.nextElementSibling);
          const topic=card.querySelector('.meta > p');
          if(topic?.textContent.startsWith('考点：')){
            const line=document.createElement('p');
            line.className='paper-topic';
            const label=document.createElement('strong');
            label.textContent='考点：';
            line.append(label,topic.textContent.slice(label.textContent.length));
            key.after(line);
          }
        }
        for(const image of content.querySelectorAll(':scope > p:has(> img)')){
          const next=image.nextElementSibling;
          if(!next?.matches('p:has(> img)'))continue;
          const row=document.createElement('div');
          row.className='paper-figures';
          image.before(row);
          row.append(image,next);
        }
        question.append(content);
      }
    }else{
      const space=card.querySelector('.writing-space')?.cloneNode(true);
      if(space){
        const lines=[...space.querySelectorAll('.writing-line')];
        const compactLines=lines.length<=3?1:lines.length<=5?2:lines.length;
        const customLines=paperMatch?.[1]==='06-学生版'?hongkouWritingLines.get(questionNumber):undefined;
        lines.slice(customLines??compactLines).forEach(line=>line.remove());
        if(paperMatch?.[1]==='07-学生版'&&questionNumber===21)space.classList.add('paper-writing-compact');
        if(['15-学生版','17-学生版'].includes(paperMatch?.[1])&&questionNumber===19){
          question.classList.add('paper-question-with-answer-page');
          space.querySelector('.writing-label').textContent=`第 ${questionNumber} 题 · 作答区`;
        }
        question.append(space);
      }
    }
    paper.append(question);
  }
  return paper;
}
