/* 探索留痕 · Takes — automatic capture, storage, piano-roll drawing and
   playback of timestamped note events. Tool-agnostic: 字母琴 feeds it key
   events; 续旋律 and 配色板 can feed it the phrases they play.

   A take is
     { id, tool, ts, title, cfg, duration, events:[{t, type:'on'|'off', midi, code?}], media? }
   with t in milliseconds from the first note-on. All state is local
   (localStorage + JSON export); nothing is sent anywhere.

   Borrowed from the Variation Playground's "My Musical Explorations":
   capture starts with the gesture, not with a record button; a card appears
   by itself when the gesture ends; tapping a card replays it through the same
   engine that played it live. Different here: the event stream is notes
   with real timestamps, so simultaneity is preserved and drawn.            */

// Adapted from rengongfu-sandbox fc87b127, assets/js/takes.mjs.
const KEY = 'cmsd.duet.v2.takes';
const MAX_TAKES = 60;

/* ── storage ─────────────────────────────────────────── */
let memory = [];
let persistent = true;
const PITCHES = new Set([66, 68, 70, 73, 75, 78, 80, 82, 83, 85]);
export function validTake(t) {
  return !!(t && typeof t.id === 'string' && t.id.length < 120 && t.tool === 'cmsd-duet-v2' &&
    Number.isFinite(t.ts) && Number.isFinite(t.duration) && t.duration >= 0 && t.duration <= 91000 &&
    Array.isArray(t.events) && t.events.length > 0 && t.events.length <= 12000 &&
    t.events.every(e => e && (e.type === 'on' || e.type === 'off') && PITCHES.has(e.midi) && Number.isFinite(e.t) && e.t >= 0 && e.t <= 91000 && (!e.code || (typeof e.code === 'string' && e.code.length < 80))));
}
function readAll() {
  if (!persistent) return memory;
  try {
    const data = JSON.parse(localStorage.getItem(KEY) || '[]');
    if (!Array.isArray(data)) throw new Error('Invalid stored takes');
    memory = data.filter(validTake).slice(0, MAX_TAKES);
  } catch (_) { persistent = false; }
  return memory;
}
function writeAll(list) {
  memory = list.slice(0, MAX_TAKES);
  try { localStorage.setItem(KEY, JSON.stringify(memory)); persistent = true; }
  catch (_) { persistent = false; }
}
export function storageAvailable() { return persistent; }
export function list(tool) { return readAll().filter((t) => !tool || t.tool === tool); }
export function get(id) { return readAll().find((t) => t.id === id) || null; }
export function save(take) {
  const all = readAll().filter((t) => t.id !== take.id);
  all.unshift(take);
  writeAll(all);
  document.dispatchEvent(new CustomEvent('cmsd:takes', { detail: { id: take.id } }));
  return take;
}
export function remove(id) {
  writeAll(readAll().filter((t) => t.id !== id));
  document.dispatchEvent(new CustomEvent('cmsd:takes', { detail: { id, removed: true } }));
}
export function rename(id, title) {
  const all = readAll(); const t = all.find((x) => x.id === id);
  if (t) { t.title = title; writeAll(all); document.dispatchEvent(new CustomEvent('cmsd:takes', { detail: { id } })); }
}
export function exportJSON(tool) {
  return JSON.stringify({ format: 'cmsd-duet-takes', version: 1, exported: new Date().toISOString(), takes: list(tool) }, null, 2);
}
export function importJSON(text) {
  const data = JSON.parse(text);
  const incoming = Array.isArray(data) ? data : data.takes;
  if (!Array.isArray(incoming)) throw new Error('not a takes file');
  const all = readAll().slice();
  let n = 0;
  for (const t of incoming) {
    if (!validTake(t)) throw new Error('Invalid piano take');
    if (!all.some((x) => x.id === t.id)) { all.push(t); n++; }
  }
  all.sort((a, b) => (b.ts || 0) - (a.ts || 0));
  writeAll(all);
  document.dispatchEvent(new CustomEvent('cmsd:takes', { detail: { imported: n } }));
  return n;
}

/* ── recorder: gesture-bounded, silence-terminated ──── */
/* A take begins at the first note-on. It ends when every key is up and no
   new note-on arrives within `gap` ms, or at `maxLen`. Shorter than `minLen`
   or fewer than `minNotes` note-ons and it is discarded, like the
   Playground's one-second rule. */
export function createRecorder(opts) {
  const o = Object.assign({ tool: 'cmsd-duet-v2', gap: 2500, maxLen: 90000, minLen: 800, minNotes: 2, cfg: () => ({}), media: () => null, onStart: () => {}, onEnd: () => {}, onEvent: () => {} }, opts);
  let cur = null;          /* { t0, events, held:Set, timer } */
  let idCount = 0;

  function now() { return performance.now(); }
  function arm() {
    clearTimeout(cur.timer);
    if (cur.held.size === 0) cur.timer = setTimeout(() => finish('gap'), o.gap);
    
  }
  function finish(reason) {
    if (!cur) return;
    clearTimeout(cur.timer);
    clearTimeout(cur.maxTimer);
    const take = cur; cur = null;
    /* close anything still held */
    const tEnd = now() - take.t0;
    for (const [code, midi] of take.held) take.events.push({ t: Math.min(o.maxLen, Math.round(tEnd)), type: 'off', midi, code });
    const ons = take.events.filter((e) => e.type === 'on').length;
    const duration = take.events.length ? take.events[take.events.length - 1].t : 0;
    if (ons < o.minNotes || duration < o.minLen) { o.onEnd(null, reason); return; }
    const rec = {
      id: 'tk_' + Date.now().toString(36) + '_' + (idCount++).toString(36),
      tool: o.tool, ts: Date.now(), title: '', cfg: take.cfg, media: take.media,
      duration, events: take.events
    };
    save(rec);
    o.onEnd(rec, reason);
  }
  return {
    noteOn(midi, code) {
      if (!cur) {
        cur = { t0: now(), events: [], held: new Map(), timer: null, maxTimer: setTimeout(() => finish('max'), o.maxLen), cfg: o.cfg(), media: o.media() };
        o.onStart();
      }
      code = code || String(midi);
      if (cur.held.has(code)) return;
      cur.held.set(code, midi);
      cur.events.push({ t: Math.round(now() - cur.t0), type: 'on', midi, code });
      o.onEvent(cur);
      arm();
    },
    noteOff(midi, code) {
      code = code || String(midi);
      if (!cur || !cur.held.has(code)) return;
      cur.held.delete(code);
      cur.events.push({ t: Math.round(now() - cur.t0), type: 'off', midi, code });
      o.onEvent(cur);
      arm();
    },
    /* the live, unfinished take (for drawing while playing) */
    current() { return cur ? { events: cur.events, t0: cur.t0, held: cur.held } : null; },
    finish: () => finish('manual'),
    active: () => !!cur
  };
}

/* ── notes → bars, and chord grouping ────────────────── */
export function toBars(events) {
  const open = new Map(); const bars = [];
  for (const e of events) {
    const token = e.code || String(e.midi);
    if (e.type === 'on') { if (open.has(token)) open.get(token).end = e.t; open.set(token, { midi: e.midi, start: e.t, end: null }); bars.push(open.get(token)); }
    else if (e.type === 'off' && open.has(token)) { open.get(token).end = e.t; open.delete(token); }
  }
  const last = events.length ? events[events.length - 1].t : 0;
  for (const b of bars) if (b.end === null) b.end = last;
  return bars;
}
/* note-ons within `win` ms of each other count as one chord */
export function toChords(events, win = 60) {
  const ons = events.filter((e) => e.type === 'on').sort((a, b) => a.t - b.t);
  const chords = [];
  for (const e of ons) {
    const last = chords[chords.length - 1];
    if (last && e.t - last.t <= win) { if (!last.midis.includes(e.midi)) last.midis.push(e.midi); }
    else chords.push({ t: e.t, midis: [e.midi] });
  }
  for (const c of chords) c.midis.sort((a, b) => a - b);
  return chords;
}

/* ── piano roll ──────────────────────────────────────── */
/* rows are the scale's pitches (low → high, bottom → top); notes outside the
   scale are still drawn, on their nearest row edge, hollow. */
export function drawRoll(canvas, events, opts) {
  const o = Object.assign({ pitches: null, duration: null, playhead: null, colors: {}, dpr: window.devicePixelRatio || 1, labels: null, pad: 2 }, opts);
  const W = canvas.clientWidth || canvas.width, H = canvas.clientHeight || canvas.height;
  if (canvas.width !== Math.round(W * o.dpr) || canvas.height !== Math.round(H * o.dpr)) { canvas.width = Math.round(W * o.dpr); canvas.height = Math.round(H * o.dpr); }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(o.dpr, 0, 0, o.dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  const c = Object.assign({ bar: '#b4442c', barEdge: '#9c3a25', tonic: '#b8923e', grid: '#e6dfd2', text: '#7a7165', head: '#5c7a6a' }, o.colors);
  const bars = toBars(events);
  const dur = Math.max(o.duration || 0, bars.reduce((m, b) => Math.max(m, b.end), 0), 1000);
  const midis = o.pitches && o.pitches.length ? o.pitches.slice() : [...new Set(bars.map((b) => b.midi))].sort((a, b) => a - b);
  if (!midis.length) return;
  const lo = midis[0], hi = midis[midis.length - 1];
  const rowOf = new Map(midis.map((m, i) => [m, i]));
  const rows = midis.length;
  const left = o.labels ? 36 : o.pad, right = W - o.pad, top = o.pad, bottom = H - o.pad;
  const rh = (bottom - top) / rows;
  const x = (t) => left + (t / dur) * (right - left);
  const y = (row) => bottom - (row + 1) * rh;
  /* faint rows, tonic rows tinted */
  for (let i = 0; i < rows; i++) {
    ctx.fillStyle = (o.tonicSet && o.tonicSet.has(midis[i])) ? 'rgba(184,146,62,.12)' : (i % 2 ? 'rgba(0,0,0,.025)' : 'transparent');
    ctx.fillRect(left, y(i), right - left, rh);
  }
  ctx.strokeStyle = c.grid; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(left, top); ctx.lineTo(left, bottom); ctx.stroke();
  if (o.labels) { ctx.fillStyle = c.text; ctx.font = '10px Georgia, "Noto Serif SC", serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (let i = 0; i < rows; i++) if (rh >= 9) ctx.fillText(o.labels(midis[i]), left - 3, y(i) + rh / 2); }
  /* bars */
  for (const b of bars) {
    let row = rowOf.get(b.midi), hollow = false;
    if (row === undefined) { hollow = true; row = b.midi < lo ? -0.5 : b.midi > hi ? rows - 0.5 : midis.findIndex((m) => m > b.midi) - 0.5; }
    const bx = x(b.start), bw = Math.max(2, x(b.end) - x(b.start));
    const by = y(row) + Math.max(1, rh * 0.15), bh = Math.max(2, rh * 0.7);
    ctx.fillStyle = o.barFor ? o.barFor(b.midi) : c.bar; ctx.strokeStyle = c.barEdge; ctx.lineWidth = 1;
    if (hollow) { ctx.strokeRect(bx + .5, by + .5, bw - 1, bh - 1); }
    else { ctx.fillRect(bx, by, bw, bh); }
  }
  /* playhead */
  if (typeof o.playhead === 'number') {
    ctx.strokeStyle = c.head; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x(o.playhead) + .5, top); ctx.lineTo(x(o.playhead) + .5, bottom); ctx.stroke();
  }
}

/* ── playback ────────────────────────────────────────── */
/* Replays a take's events with the same timing through `sink.noteOn/noteOff`,
   calling `onTick(ms)` per animation frame and `onEnd()` afterwards. One
   player at a time per page is enough. */
export function createPlayer(sink) {
  let active = null;
  function stop(silent) {
    if (!active) return;
    cancelAnimationFrame(active.raf);
    for (const e of active.sounding.values()) sink.noteOff(e.midi, e.code);
    const ended = active; active = null;
    if (!silent && ended.onEnd) ended.onEnd();
  }
  return {
    playing: () => active ? active.take.id : null,
    stop,
    play(take, hooks = {}) {
      stop(true);
      const t0 = performance.now();
      const ev = take.events.slice().sort((a, b) => a.t - b.t);
      let i = 0;
      const st = { take, sounding: new Map(), raf: 0, onEnd: hooks.onEnd };   /* midi → code */
      active = st;
      const tick = () => {
        if (active !== st) return;
        const now = performance.now() - t0;
        while (i < ev.length && ev[i].t <= now) {
          const e = ev[i++];
          if (e.type === 'on') { sink.noteOn(e.midi, e.code); st.sounding.set(e.code || String(e.midi), e); }
          else { sink.noteOff(e.midi, e.code); st.sounding.delete(e.code || String(e.midi)); }
        }
        if (hooks.onTick) hooks.onTick(Math.min(now, take.duration));
        if (i >= ev.length && now >= take.duration) { stop(); return; }
        st.raf = requestAnimationFrame(tick);
      };
      st.raf = requestAnimationFrame(tick);
    }
  };
}

