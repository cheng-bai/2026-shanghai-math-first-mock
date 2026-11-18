
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
let printState=null;
window.addEventListener('beforeprint',()=>{if(printState!==null)return;printState={answers:[...document.querySelectorAll('.answer')].map(item=>[item,item.open]),cards:cards.map(card=>[card,card.hidden])};printState.answers.forEach(([item])=>item.open=true);printState.cards.forEach(([card])=>card.hidden=false)});
window.addEventListener('afterprint',()=>{if(printState===null)return;printState.answers.forEach(([item,wasOpen])=>item.open=wasOpen);printState.cards.forEach(([card,wasHidden])=>card.hidden=wasHidden);printState=null});
document.getElementById('print-topic').addEventListener('click',async()=>{await document.fonts.ready;window.print()});
