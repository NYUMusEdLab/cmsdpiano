import {capture} from '../app/v2/capture.mjs';
import * as TK from '../app/v2/takes.mjs';
const $=id=>document.getElementById(id), sleep=ms=>new Promise(r=>setTimeout(r,ms));
const tools=document.createElement('div');tools.className='mobile-test-tools';
tools.innerHTML='<button id="runMobile" type="button">Run mobile checks</button><button id="measureMobile" type="button">Measure layout</button><button id="safeMobile" type="button">Simulate safe areas</button><pre id="mobileReport" hidden></pre><pre id="layoutReport" hidden></pre>';
$('welcome-panel').append(tools);
const results=[],errors=[];window.addEventListener('error',e=>errors.push(e.message));
const report=()=>{$('mobileReport').textContent=JSON.stringify({passed:results.filter(r=>r.pass).length,total:results.length,results,errors});};
function check(name,pass,detail){results.push({name,pass:!!pass,detail});report();if(!pass)throw Error(name);}
const visible=el=>!!el?.getClientRects().length&&getComputedStyle(el).visibility!=='hidden';
const selected=()=>$('takes').querySelector('.take-card:not([hidden])');
function measure(){
 const box=el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};
 const within=(r,b)=>r.x>=b.x-1&&r.y>=b.y-1&&r.right<=b.right+1&&r.bottom<=b.bottom+1;
 const body=box(document.body), content=box($('trayContents')), card=selected();
 const style=getComputedStyle(document.body),safe={x:body.x+parseFloat(style.paddingLeft),y:body.y+parseFloat(style.paddingTop),right:body.right-parseFloat(style.paddingRight),bottom:body.bottom-parseFloat(style.paddingBottom)};
 const controls=[...document.querySelectorAll('#melodyTray button,#melodyTray input,.import-label')].filter(visible);
 const overflows=['html','body','#melodyTray','#trayContents','#takes','.take-card:not([hidden])'].map(selector=>{const e=document.querySelector(selector);return e?{selector,x:e.scrollWidth-e.clientWidth,y:e.scrollHeight-e.clientHeight}:null;}).filter(Boolean);
 const image=document.querySelector('#Gb4 img'),video=document.querySelector('video');
 const value={viewport:{width:innerWidth,height:innerHeight,visualHeight:visualViewport?.height},compact:document.documentElement.classList.contains('notebook-compact'),touch:document.documentElement.classList.contains('touch-layout'),expanded:!$('trayContents').hidden,count:TK.list().length,page:$('takePage').textContent,visibleCards:cardsVisible(),body,safe,content,card:card?box(card):null,overflows,controls:controls.map(e=>({name:e.getAttribute('aria-label')||e.textContent||e.id,box:box(e),inside:within(box(e),safe)})),privacyInHelp:!!$('privacy-preferences').closest('#welcome-panel'),privacyVisible:visible($('privacy-preferences')),makeyVisible:visible($('inputMode')),instrument:{video:box(video),overlay:image?box(image):null,videoSize:[video.videoWidth,video.videoHeight],imageSize:image?[image.naturalWidth,image.naturalHeight]:null,fit:[getComputedStyle(video).objectFit,image&&getComputedStyle(image).objectFit]},videoPaused:video.paused,canvasSizes:[...$('takes').querySelectorAll('canvas')].map(c=>[c.width,c.height])};
 value.pass=overflows.every(o=>o.x<=1&&o.y<=1)&&value.controls.every(c=>c.inside)&&(!card||within(box(card),content));
 $('layoutReport').textContent=JSON.stringify(value);return value;
}
function cardsVisible(){return [...$('takes').querySelectorAll('.take-card')].filter(visible).length;}
$('measureMobile').onclick=measure;
$('safeMobile').onclick=()=>{const r=document.documentElement.style;const landscape=innerWidth>innerHeight;r.setProperty('--safe-left',landscape?'47px':'0px');r.setProperty('--safe-right',landscape?'47px':'0px');r.setProperty('--safe-top','0px');r.setProperty('--safe-bottom',landscape?'21px':'34px');requestAnimationFrame(measure);};
// A keyboard-accessible test action allows repeated measurements with help closed.
document.addEventListener('keydown',e=>{if(e.code==='F9'){e.preventDefault();measure();}if(e.code==='F8'){e.preventDefault();$('safeMobile').click();}});
$('runMobile').onclick=async()=>{try{
 if(!INST.loaded)throw Error('Samples are not loaded');
 check('Privacy preferences are inside welcome/help without a fixed footer',!!$('privacy-preferences').closest('#welcome-panel')&&!document.querySelector('.privacy-tool-footer'));
 check('Makey access is hidden on emulated touch display',!visible($('inputMode')));
 check('No Google script is requested before opt-in',testAnalytics.scripts.length===0);
 $('privacy-preferences').click();document.querySelector('[data-privacy-accept]').click();
 check('Opt-in still persists and initializes the unchanged tag once',localStorage.getItem('musedlab.privacy.v1')==='accepted'&&testAnalytics.scripts.length===1);
 const payload='https://www.google-analytics.com/g/collect?'+new URLSearchParams({v:'2',tid:'G-HY8ELV8WGM',en:'page_view',dl:'https://apps.musedlab.org/virtualduet/cmsd/v2/',dt:'CMSD v2','ep.tool':'cmsd','ep.release':'entry-c84aa61118820c28'});
 await fetch(payload);check('Reviewed baseline payload remains allowed after opt-in',testAnalytics.requests.length===1);
 await fetch(payload+'&ep.notes=private');check('Unreviewed activity payload remains blocked',testAnalytics.requests.length===1);
 $('privacy-preferences').click();document.querySelector('[data-privacy-reject]').click();await fetch(payload);
 check('Withdrawal still persists and stops subsequent measurement',localStorage.getItem('musedlab.privacy.v1')==='rejected'&&testAnalytics.requests.length===1);
 if($popupVisible)$('loadingWrapper').click();await sleep(700);
 check('Privacy control disappears with help, leaving the play surface clear',!visible($('privacy-preferences')));
 if($('trayContents').hidden)$('trayToggle').click();
 const meter=INST.AUDIO.context.createAnalyser();INST.keys.forEach(k=>{const start=k.sound.startNote;k.sound.startNote=function(){const r=start.call(this);this.voices.at(-1).gain.connect(meter);return r;};});
 const rms=()=>{const a=new Float32Array(meter.fftSize);meter.getFloatTimeDomainData(a);return Math.sqrt(a.reduce((s,x)=>s+x*x,0)/a.length);};
 function touch(kind,index){const el=INST.keys.find(k=>k.id===['Gb4','Ab4','Bb4'][index]).dom.$mobileKey[0],r=el.getBoundingClientRect();const point=new Touch({identifier:index+1,target:el,clientX:r.x+r.width/2,clientY:r.y+r.height/2});el.dispatchEvent(new TouchEvent(kind,{bubbles:true,cancelable:true,changedTouches:[point]}));}
 for(let n=0;n<3;n++){touch('touchstart',0);await sleep(450);check('Touch generates audio, phrase '+(n+1),rms()>.001);touch('touchend',0);touch('touchstart',1);await sleep(450);touch('touchend',1);capture.finishCapture();await sleep(30);}
 check('Three touch phrases captured with releases',TK.list().length===3&&TK.list().every(t=>t.events.map(e=>e.type).join(',')==='on,off,on,off'));
 const template=TK.list()[0];for(let i=0;i<7;i++)TK.save({...template,id:'mobile-synthetic-'+i,ts:Date.now()+i,title:'Review phrase '+(i+1)});await sleep(80);
 check('One complete capture is displayed with a 10-phrase pager',TK.list().length===10&&cardsVisible()===1&&$('takePage').textContent==='1 / 10');
 const first=selected().dataset.id;$('nextTake').click();await sleep(30);check('Next shows another capture without changing saved data',selected().dataset.id!==first&&TK.list().length===10&&$('takePage').textContent==='2 / 10');
 selected().querySelector('.take-title').value='Mobile renamed phrase';selected().querySelector('.take-title').dispatchEvent(new Event('change'));await sleep(50);check('Rename preserves selection and other captures',$('takePage').textContent==='2 / 10'&&TK.list().some(t=>t.title==='Mobile renamed phrase')&&TK.list().length===10);
 selected().querySelector('.take-play').click();await sleep(150);check('Paged capture replays audible audio without recording itself',capture.player.playing()!==null&&rms()>.001&&!capture.recorder.active());
 $('nextTake').click();await sleep(80);check('Changing pages safely stops the previous replay',capture.player.playing()===null&&$('takePage').textContent==='3 / 10');
 selected().querySelector('.take-duet').click();await sleep(120);check('With-duet replay remains available on a later page',capture.player.playing()!==null&&!document.querySelector('video').paused);$('returnToDuet').click();
 const json=TK.exportJSON('cmsd-duet-v2');check('Export includes all pages',JSON.parse(json).takes.length===10&&json.includes('Mobile renamed phrase'));
 const data=new DataTransfer();data.items.add(new File([json],'mobile-import.json',{type:'application/json'}));$('importTakes').files=data.files;$('importTakes').dispatchEvent(new Event('change'));await sleep(80);check('Import control deduplicates all existing pages',TK.list().length===10&&$('captureStatus').textContent==='Imported 0 melodies');
 selected().querySelector('.take-delete').click();await sleep(30);check('Delete on a later page keeps a valid visible capture',TK.list().length===9&&cardsVisible()===1);$('undoDelete').click();await sleep(30);check('Undo restores capture without losing other pages',TK.list().length===10);
 $('trayToggle').click();await sleep(40);check('Collapsed tray hides pages but retains captures',$('trayContents').hidden&&TK.list().length===10);$('trayToggle').click();await sleep(40);
 const video=document.querySelector('video'), orientation=screen.orientation;
 const originalType=orientation&&Object.getOwnPropertyDescriptor(orientation,'type');
 if(orientation)Object.defineProperty(orientation,'type',{configurable:true,value:'portrait-primary'});
 await video.play();orientation?.dispatchEvent(new Event('change'));check('Rotation to portrait no longer forces playing video to pause',!video.paused);
 if(orientation)Object.defineProperty(orientation,'type',{configurable:true,value:'landscape-primary'});
 video.pause();orientation?.dispatchEvent(new Event('change'));check('Rotation to landscape does not force a paused video to play',video.paused);
 if(orientation){if(originalType)Object.defineProperty(orientation,'type',originalType);else delete orientation.type;}
 check('No application errors',errors.length===0,errors);measure();report();
 }catch(e){$('mobileReport').textContent+='\nFAIL '+e.stack;}};
