import * as TK from './takes.mjs';

const $ = id => document.getElementById(id);
const TOOL = 'cmsd-duet-v2';
const pitches = [66,68,70,73,75,78,80,82,83,85];
const names = ['G♭4','A♭4','B♭4','D♭5','E♭5','G♭5','A♭5','B♭5','B5','D♭6'];
const audioNames = ['gb4','ab4','bb4','db5','eb5','gb5','ab5','bb5','b5','db6'];
const ids = ['Gb4','Ab4','Bb4','Db5','Eb5','Gb5','Ab5','Bb5','B5','Db6'];
const colors = ['#d84863','#c4a023','#59a15c','#4c76c4','#ae66b0','#d84863','#c4a023','#59a15c','#329ead','#4c76c4'];
const video = document.querySelector('video');
const held = new Map();
let liveRaf = 0, replayId = null, replayVoices = [], removed = null;
let playbackStates = new Map(), priorVideo = null, duetReplay = false;
let recorder, player;
const status = text => { $('captureStatus').textContent = text; };
const midiFor = key => pitches[audioNames.indexOf(window.KEYMAP[key.id].audio)];
const rollOptions = {pitches, labels:m=>names[pitches.indexOf(m)], barFor:m=>colors[pitches.indexOf(m)], colors:{grid:'#d6dfd7',head:'#172f30',text:'#627068'}};
const keyFor = midi => window.INST.keys.find(k=>k.id===ids[pitches.indexOf(midi)]);

function storageStatus() {
  $('storageStatus').textContent = TK.storageAvailable() ? 'Saved in this browser · Latest 60 phrases · Export to keep a copy' : 'Browser storage unavailable · Kept for this visit only · Export to keep your phrases';
}
function currentEvents() {
  const current = recorder.current();
  if (!current) return [];
  const time = performance.now()-current.t0;
  return current.events.concat([...current.held].map(([code,midi])=>({type:'off',code,midi,t:time})));
}
function drawLive() {
  const current = recorder.current();
  TK.drawRoll($('liveMini'), currentEvents(), {...rollOptions,labels:null,duration:current?performance.now()-current.t0:1000});
  if (recorder.active()) liveRaf=requestAnimationFrame(drawLive);
}
function finishCapture() { if (recorder?.active()) recorder.finish(); }
function drawCards() {
  if ($('trayContents').hidden) return;
  for (const card of $('takes').querySelectorAll('.take-card')) {
    const take=TK.get(card.dataset.id);
    if (take) TK.drawRoll(card.querySelector('canvas'),take.events,{...rollOptions,duration:take.duration});
  }
}
function toggleTray() {
  const expanded=$('trayToggle').getAttribute('aria-expanded')!=='true';
  $('trayToggle').setAttribute('aria-expanded',String(expanded));
  $('trayContents').hidden=!expanded;
  try { localStorage.setItem('cmsd.duet.v2.tray',String(expanded)); } catch(_) {}
  if (expanded) requestAnimationFrame(drawCards);
  $('container').focus({preventScroll:true});
}
function releaseReplayVoice(voice) {
  try {
    const now=window.INST.AUDIO.context.currentTime;
    voice.gain.gain.cancelScheduledValues(now);
    voice.gain.gain.setValueAtTime(1,now);
    voice.gain.gain.linearRampToValueAtTime(0,now+.03);
    voice.source.stop(now+.03);
  } catch(_) {}
}
function clearReplayHighlights() {
  for (const midi of playbackStates.keys()) if (![...held.values()].includes(midi)) keyFor(midi)?.dom.endNote();
  playbackStates.clear();
}
function stopReplay(keepDuet=false, natural=false) {
  if (!replayId) return;
  player.stop(true);
  clearReplayHighlights();
  if (!natural) replayVoices.forEach(releaseReplayVoice);
  replayVoices=[];
  replayId=null;
  if (priorVideo) {
    if (!duetReplay) video.currentTime=priorVideo.time;
    if (keepDuet || priorVideo.playing) video.play().catch(()=>{}); else video.pause();
  }
  priorVideo=null;
  status('Ready for your next phrase');
  renderTakes();
}
function startReplay(take, withDuet) {
  finishCapture();
  stopReplay();
  window.INST.keys.forEach(k=>k.sound.stopNote?.());
  if (window.INST.AUDIO.context?.state==='suspended') window.INST.AUDIO.context.resume();
  replayId=take.id;
  duetReplay=withDuet;
  priorVideo={time:video.currentTime,playing:!video.paused};
  if (withDuet) {video.currentTime=Number.isFinite(take.media?.offset)?Math.max(0,Math.min(video.duration||0,take.media.offset)):0;video.play().catch(()=>status('Press play on the duet video to continue.'));}
  else video.pause();
  status(withDuet?'Replaying with the duet':'Replaying your melody');
  player.play(take,{
    onTick(ms) {
      const card=[...$('takes').children].find(c=>c.dataset.id===take.id);
      if (card&&!$('trayContents').hidden) TK.drawRoll(card.querySelector('canvas'),take.events,{...rollOptions,duration:take.duration,playhead:ms});
    },
    onEnd() {stopReplay(false,true);}
  });
  renderTakes();
  $('container').focus({preventScroll:true});
}
function formatTime(seconds) {const m=Math.floor(seconds/60),s=Math.floor(seconds%60);return `${m}:${String(s).padStart(2,'0')}`;}
function renderTakes() {
  const takes=TK.list(TOOL);
  $('takeCount').textContent=String(takes.length);
  $('exportTakes').disabled=!takes.length;
  const host=$('takes');
  host.replaceChildren();
  if (!takes.length) {
    const empty=document.createElement('div');empty.className='empty-notebook';
    empty.innerHTML='<span class="empty-symbol" aria-hidden="true">♪</span><div><strong>Your next melody starts here.</strong><p>Play two or more notes over at least 0.8 seconds. Your timing, held notes and chords appear here automatically.</p></div>';
    host.append(empty);
  }
  takes.forEach((take,i)=>{
    const card=document.createElement('article');card.className='take-card'+(replayId===take.id?' playing':'');card.dataset.id=take.id;
    const title=take.title||'Melody '+new Date(take.ts).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit'});
    const noteCount=take.events.filter(e=>e.type==='on').length;
    card.innerHTML='<div class="take-heading"><input class="take-title" type="text" maxlength="80" /></div><p class="take-meta"></p><canvas class="take-roll" width="252" height="92" role="img"></canvas><div class="take-actions"><button class="take-play" type="button"></button><button class="take-duet" type="button">With duet</button><button class="take-delete" type="button">×</button></div>';
    const input=card.querySelector('input');input.value=title;input.setAttribute('aria-label','Name for '+title);const saveTitle=()=>{const value=input.value.trim().slice(0,80);if(value!==(TK.get(take.id)?.title||'')&&value!==title)TK.rename(take.id,value);};input.onchange=saveTitle;input.onblur=saveTitle;input.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();input.blur();}};
    const time=new Date(take.ts).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
    card.querySelector('.take-meta').textContent=`${time} · ${(take.duration/1000).toFixed(1)} s · ${noteCount} notes · Duet ${formatTime(Number(take.media?.offset)||0)}`;
    card.querySelector('canvas').setAttribute('aria-label',`${title}, ${noteCount} notes: ${take.events.filter(e=>e.type==='on').map(e=>names[pitches.indexOf(e.midi)]).join(', ')}`);
    const play=card.querySelector('.take-play');play.textContent=replayId===take.id?'■ Stop':'▶ Replay';play.setAttribute('aria-label',(replayId===take.id?'Stop ':'Replay ')+title);play.onclick=()=>replayId===take.id?stopReplay():startReplay(take,false);
    const duet=card.querySelector('.take-duet');duet.setAttribute('aria-label','Play '+title+' with duet');duet.onclick=()=>startReplay(take,true);
    const del=card.querySelector('.take-delete');del.setAttribute('aria-label','Delete '+title);del.onclick=()=>{if(replayId===take.id)stopReplay();removed=take;TK.remove(take.id);$('undoNotice').hidden=false;status('Phrase removed. Undo is available.');};
    host.append(card);
  });
  storageStatus();
  requestAnimationFrame(drawCards);
}

recorder=TK.createRecorder({
  tool:TOOL,
  cfg:()=>({instrument:'CMSD piano',pitches,version:2,mode:$('inputMode').getAttribute('aria-pressed')==='true'?'makey':'keyboard'}),
  media:()=>({kind:'cmsd-duet',offset:video.currentTime,playing:!video.paused}),
  onStart(){cancelAnimationFrame(liveRaf);status('Recording · pause to save');$('captureStatus').classList.add('recording');$('finishTake').disabled=false;liveRaf=requestAnimationFrame(drawLive);},
  onEnd(take){cancelAnimationFrame(liveRaf);$('captureStatus').classList.remove('recording');$('finishTake').disabled=true;
    if(take){status('Melody saved');TK.drawRoll($('liveMini'),take.events,{...rollOptions,labels:null,duration:take.duration});}
    else status('Keep playing · two notes over 0.8 seconds');
    renderTakes();
  }
});

// Wrap the existing duet's successful note gestures, not raw browser keys.
// Keyboard repeat, Makey aliases, focus cleanup and native video controls keep
// using the tested original controller. A note's duration ends on release;
// its piano audio is still free to ring out naturally.
const originalStart=window.INST.DOM.prototype.startNote;
const originalEnd=window.INST.DOM.prototype.endNote;
window.INST.DOM.prototype.startNote=function(){
  stopReplay(true);
  const result=originalStart.apply(this,arguments);
  const midi=midiFor(this.key);
  if(midi!==undefined&&!held.has(this.key.id)){held.set(this.key.id,midi);recorder.noteOn(midi,this.key.id);}
  return result;
};
window.INST.DOM.prototype.endNote=function(){
  const result=originalEnd.apply(this,arguments);
  if(held.has(this.key.id)){recorder.noteOff(held.get(this.key.id),this.key.id);held.delete(this.key.id);}
  return result;
};
player=TK.createPlayer({
  noteOn(midi){
    const key=keyFor(midi);if(!key)return;
    key.sound.startNote();
    if(key.sound.voices?.length) replayVoices.push(key.sound.voices.at(-1));
    playbackStates.set(midi,(playbackStates.get(midi)||0)+1);
    key.dom.$img.css('opacity',1);key.dom.$mobileKey?.css('opacity',1);
  },
  noteOff(midi){
    const count=(playbackStates.get(midi)||1)-1;
    if(count>0)playbackStates.set(midi,count);
    else {playbackStates.delete(midi);if(![...held.values()].includes(midi))originalEnd.call(keyFor(midi).dom);}
  }
});

// Wait until the original controller has registered its cleanup listeners so
// we close held notes before saving a take at a focus or lifecycle boundary.
function bindCleanup(){
  if(!window.INST.loaded){setTimeout(bindCleanup,50);return;}
  const boundary=()=>{finishCapture();stopReplay();};
  document.querySelector('.keyboard-mobile').addEventListener('touchcancel',()=>{
    for(const key of window.INST.keys){key.dom.isDown=false;key.dom.endNote();}
    finishCapture();
  });
  window.addEventListener('blur',boundary);
  window.addEventListener('pagehide',boundary);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)boundary();});
  document.addEventListener('focusin',e=>{if(e.target.closest('input,textarea,select,button,a,[contenteditable=true]'))finishCapture();});
  $('inputMode').addEventListener('click',boundary);
  document.querySelector('.helpBtn').addEventListener('click',boundary);
}
bindCleanup();
$('trayToggle').onclick=toggleTray;
$('finishTake').onclick=()=>{finishCapture();$('container').focus({preventScroll:true});};
$('undoDelete').onclick=()=>{if(removed){TK.save(removed);removed=null;}$('undoNotice').hidden=true;status('Phrase restored');};
$('exportTakes').onclick=()=>{
  finishCapture();const url=URL.createObjectURL(new Blob([TK.exportJSON(TOOL)],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download='cmsd-melodies-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
$('importTakes').onchange=async()=>{
  const file=$('importTakes').files[0];if(!file)return;
  try{if(file.size>5*1024*1024)throw Error('too large');const count=TK.importJSON(await file.text());status(`Imported ${count} ${count===1?'melody':'melodies'}`);}
  catch(_){status('Could not import. Choose a CMSD melody JSON export.');}
  $('importTakes').value='';
};
document.addEventListener('cmsd:takes',renderTakes);
window.addEventListener('storage',e=>{if(e.key==='cmsd.duet.v2.takes')renderTakes();});
new ResizeObserver(()=>{drawCards();if(!recorder.active())TK.drawRoll($('liveMini'),[],{...rollOptions,labels:null});}).observe($('melodyTray'));
try{if(localStorage.getItem('cmsd.duet.v2.tray')==='false')toggleTray();}catch(_){}
renderTakes();

// Dedicated test fixtures can observe this public adapter without changing
// production storage or input code. It is never an alternate input path.
export const capture = { recorder, player, held, finishCapture, pitches };
