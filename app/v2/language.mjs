// UI-only language. Never rebuild the piano, recorder, notebook or media.
const dictionary={
 'Virtual Piano Duet':'虚拟钢琴二重奏','Virtual piano':'虚拟钢琴','MELODY NOTEBOOK':'旋律笔记本',
 'Please enable javascript for this page to work':'请启用 JavaScript 以使用此页面',
 "Oh no! We can't fit everything on your screen.":'当前屏幕无法完整显示界面。','Please rotate your device.':'请旋转设备。',
 'Makey Makey: Off':'Makey Makey：关','Makey Makey: On':'Makey Makey：开','Makey Makey: ON':'Makey Makey：开',
 'Help and settings':'帮助与设置',
 'Your browser does not support the video tag.':'此浏览器不支持视频播放。',
 'Melody notebook':'旋律笔记本','Play a phrase to begin':'演奏一个乐句，开始记录','Live melody contour':'实时旋律曲线',
 'Save phrase':'保存乐句','Play along':'跟随演奏','Saved melodies':'已保存的旋律',
 'Play freely. Pause for 2.5 seconds to save a piano roll.':'自由演奏。松开琴键并停顿 2.5 秒，即可保存为钢琴卷帘图。',
 'Export all':'导出全部','Import':'导入','Your next melody starts here.':'在这里开始你的下一段旋律。',
 'Play two or more notes over at least 0.8 seconds. Your timing, held notes and chords appear here automatically.':'演奏至少两个音符，持续至少 0.8 秒。节奏、延音和和弦会自动显示在这里。',
 'Saved in this browser · Latest 60 phrases · Export to keep a copy':'保存在此浏览器 · 保留最近 60 个乐句 · 请导出备份',
 'Browser storage unavailable · Kept for this visit only · Export to keep your phrases':'浏览器存储不可用 · 仅在本次访问中保留 · 请导出乐句',
 'Phrase removed.':'已移除乐句。','Undo':'撤销','Original duet':'原版二重奏',
 "Press the 'z' through '/' keys on the bottom row of your computer keyboard to play along with the video. Your melodies are captured automatically in the notebook below.":'按电脑键盘最下排的 Z 到 / 键，跟随视频演奏。旋律会自动记录在下方笔记本中。',
 'Music composed and performed by':'作曲与演奏：','...':'……','and YOU!':'还有你！','Designed & coded by the':'设计与编程：',
 '. HTML 5 web audio code adapted from': '。HTML5 网页音频代码改编自',
 'users: Turn Makey Makey on with the button above, then connect to play using w, a, s, d, f, g, left, up, right, down and space keys. G and Left play the same note. Turn the mode off to restore normal arrow and space controls.':'用户：用上方按钮开启 Makey Makey，然后连接设备，使用 W、A、S、D、F、G、方向键和空格键演奏。G 与左方向键演奏同一个音。关闭此模式后，方向键和空格键恢复通常功能。',
 'Touch the multicolored squares to play along with the video. Pause between phrases to save your melodies below.':'轻触彩色方块，跟随视频演奏。乐句之间稍作停顿，即可将旋律保存到下方。',
 'Loading...':'正在加载…','Press play on the duet video to continue.':'请按视频播放按钮继续。','Ready for your next phrase':'可以开始下一段乐句',
 'Replaying with the duet':'正在与视频同步回放','Replaying your melody':'正在回放你的旋律','With duet':'与视频合奏',
 '■ Stop':'■ 停止','▶ Replay':'▶ 回放','Phrase removed. Undo is available.':'已移除乐句，可撤销。',
 'Recording · pause to save':'正在记录 · 停顿后保存','Melody saved':'旋律已保存','Keep playing · two notes over 0.8 seconds':'请继续演奏 · 至少两个音符，持续 0.8 秒',
 'Phrase restored':'乐句已恢复','Could not import. Choose a CMSD melody JSON export.':'无法导入。请选择 CMSD 旋律的 JSON 导出文件。'
};
export const normalize=value=>/^en$/i.test(value||'')?'en':/^zh(?:-cn|-hans)?$/i.test(value||'')?'zh':null;
const records=new WeakMap(),key='cmsd.duet.v2.language';
let language='en';
function translate(source){
 if(language==='en')return source;
 const text=source.trim().replace(/\s+/g,' ');let out=dictionary[text];
 if(out===undefined){
  const patterns=[[/^Imported (\d+) melod(?:y|ies)$/,(_,n)=>`已导入 ${n} 段旋律`],
   [/^Name for (.+)$/,(_,n)=>`名称：${n}`],[/^Replay (.+)$/,(_,n)=>`回放 ${n}`],[/^Stop (.+)$/,(_,n)=>`停止 ${n}`],
   [/^Delete (.+)$/,(_,n)=>`删除 ${n}`],[/^Play (.+) with duet$/,(_,n)=>`与视频合奏：${n}`],
   [/^(.+), (\d+) notes: (.+)$/,(_,n,c,p)=>`${n}，${c} 个音符：${p}`],
   [/^(.+) · ([\d.]+) s · (\d+) notes · Duet (.+)$/,(_,t,s,n,v)=>`${t} · ${s} 秒 · ${n} 个音符 · 视频 ${v}`]];
  for(const [re,fn]of patterns)if(re.test(text)){out=text.replace(re,fn);break;}
 }
 return out===undefined?source:source.replace(source.trim(),out);
}
function value(node,key,current,set){let rec=records.get(node)||{};const prior=rec[key],source=prior&&prior.output===current?prior.source:current,output=translate(source);rec[key]={source,output};records.set(node,rec);if(output!==current)set(output);}
function walk(node){
 if(node.nodeType===3){if(!node.parentElement?.closest('script,style,textarea,pre,.workshop-language,[data-no-translate]'))value(node,'text',node.nodeValue,v=>node.nodeValue=v);return;}
 if(node.nodeType!==1||node.closest('script,style,textarea,pre,.workshop-language,[data-no-translate]'))return;
 for(const attr of ['title','aria-label','placeholder'])if(node.hasAttribute(attr))value(node,attr,node.getAttribute(attr),v=>node.setAttribute(attr,v));
 for(const child of node.childNodes)walk(child);
}
const allowed=new Set([location.origin,'https://ruthmann.github.io','https://www.musedlab.org','https://workshop.musedlab.org']);
let parentOrigin=null;try{const origin=new URL(document.referrer).origin;if(allowed.has(origin))parentOrigin=origin;}catch{}
function setLanguage(next,persist=true,announce=true){
 if(!normalize(next))return;language=normalize(next);document.documentElement.lang=language==='zh'?'zh-CN':'en';
 for(const b of document.querySelectorAll('.workshop-language button'))b.setAttribute('aria-pressed',String(b.dataset.language===language));
 walk(document.body);
 if(persist){try{localStorage.setItem(key,language);}catch{}const url=new URL(location.href);url.searchParams.set('lang',language);history.replaceState(null,'',url);}
 if(announce&&parentOrigin&&parent!==window)parent.postMessage({type:'rgf-language',language},parentOrigin);
}
const query=new URLSearchParams(location.search);let stored;try{stored=localStorage.getItem(key);}catch{}
setLanguage(normalize(query.get('lang'))||normalize(query.get('launcherlang'))||normalize(stored)||'en',false,false);
for(const button of document.querySelectorAll('.workshop-language button')){button.addEventListener('pointerdown',e=>e.preventDefault());button.addEventListener('click',()=>setLanguage(button.dataset.language));}
new MutationObserver(changes=>{for(const change of changes){if(change.type==='childList')change.addedNodes.forEach(walk);else walk(change.target);}}).observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['title','aria-label','placeholder']});
addEventListener('message',event=>{const d=event.data;if(parent===window||event.source!==parent||event.origin!==parentOrigin||!d||Object.keys(d).length!==2||d.type!=='rgf-language'||!['en','zh'].includes(d.language)||d.language===language)return;setLanguage(d.language,true,false);});
