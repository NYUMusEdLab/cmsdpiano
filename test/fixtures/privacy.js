/* Local, optional analytics preferences. No third-party code runs before opt-in. */
'use strict';
(() => {
  // The containing application owns measurement for embedded tools. This is an
  // explicit integration setting, never inferred from a private frame URL.
  if (document.querySelector('meta[name="musedlab-analytics-owner"]')?.content === 'parent') return;
  // One owner per document, even if a template includes this file twice.
  if (window.musedlabReachPreferences) return;
  window.musedlabReachPreferences = true;
  const key = 'musedlab.privacy.v1';
  // Fixed, source-pinned entries only. No tool name, release, URL or event data is
  // accepted from callers, query parameters, titles, editor state or messages.
  const registry = Object.freeze({
    'gp-account-r2': {tool:'groove_pizza',release:'groovepizza-account-work-r1',
      url:'https://ruthmann.github.io/rengongfu-sandbox/workbench/participants/account-work-r1/',
      title:'Groove Pizza private workspace',manual:true},
    'gp-legacy-20261018': {tool:'groove_pizza',release:'entry-3855bcb1fdfed1c7',
      url:'https://apps.musedlab.org/groovepizza/',title:'Groove Pizza'},
    'gp-preview-20261020': {tool:'groove_pizza',release:'entry-f61c08c0e0ba50be',
      url:'https://nyumusedlab.github.io/groovepizza-dev-site/',title:'Groove Pizza development preview'},
    'cmsd-v1-20261018': {tool:'cmsd',release:'entry-1b6ea5975282fc52',
      url:'https://apps.musedlab.org/virtualduet/cmsd/',title:'CMSD'},
    'cmsd-v2-20261020': {tool:'cmsd',release:'entry-c84aa61118820c28',
      url:'https://apps.musedlab.org/virtualduet/cmsd/v2/',title:'CMSD v2'}
  });
  const entry=registry[document.querySelector('meta[name="musedlab-access-entry"]')?.content];
  const id=entry?'G-HY8ELV8WGM':'';
  const meta = name => document.querySelector('meta[name="' + name + '"]')?.content || '';
  const publicLocation = entry?.url || '';
  const publicTitle = entry?.title || '';
  // Only static, reviewed production page metadata is eligible. Never infer a
  // location/title from URLs, activity names, the editor, or a participant record.
  const configured = /^G-[A-Z0-9]+$/.test(id || '') &&
    /^https:\/\/[^?#]+$/.test(publicLocation) && Boolean(publicTitle);
  const zh = /^zh/i.test(document.documentElement.lang) || new URLSearchParams(location.search).get('lang') === 'zh';
  const label = (en, cn) => zh ? cn : en;
  let panel = document.querySelector('#privacy-panel');
  let open = document.querySelector('#privacy-preferences');
  const toolControls = !panel || !open;
  if (!panel || !open) {
    open = document.createElement('button');
    open.id = 'privacy-preferences'; open.type = 'button';
    open.textContent = label('Privacy preferences', '隐私设置');
    open.setAttribute('aria-controls', 'privacy-panel');
    panel = document.createElement('section'); panel.id = 'privacy-panel';
    panel.setAttribute('aria-labelledby', 'privacy-title');
    panel.innerHTML = '<h2 id="privacy-title"></h2><p data-privacy-description></p><p data-privacy-status role="status"></p><div class="privacy-actions"><button type="button" data-privacy-reject></button><button type="button" data-privacy-accept></button><button type="button" data-privacy-close></button></div>';
    panel.querySelector('#privacy-title').textContent = label('Optional analytics', '可选访问统计');
    panel.querySelector('[data-privacy-description]').textContent = label('Allow Google Analytics to measure page visits and tool openings, approximate region, device type, and time spent? Google uses browser/session identifiers after acceptance. We do not send account or research-session IDs, phone numbers, credentials, recordings, entered text, or creative work. Private saving works with analytics off. You can withdraw here.', '是否允许 Google Analytics 统计页面访问、工具打开、大致地区、设备类型和使用时长？允许后，Google 会使用浏览器和会话标识符。我们不发送账号或研究会话标识、手机号、密码、录音、输入文字或作品。关闭统计不影响私人保存，可在此撤回许可。');
    panel.querySelector('[data-privacy-accept]').textContent = label('Accept analytics', '允许统计');
    panel.querySelector('[data-privacy-close]').textContent = label('Close', '关闭');
    document.body.appendChild(panel);
    document.body.appendChild(open);
  }
  let choice = null, loaded = false, previousFocus = null;
  let toolWasOpened=Boolean(entry&&!entry.manual),toolReported=false;
  try { const stored = localStorage.getItem(key); if (stored === 'accepted' || stored === 'rejected' || stored === 'dismissed') choice = stored; } catch (_) {}
  // GA can queue an enhanced event before withdrawal and flush it on pagehide.
  // Check consent again at transport time; allow only reviewed baseline payloads.
  // Unrelated application requests retain their original browser behavior.
  if (configured) {
    const fields = new Set(('v tid gtm _p gcs gcd npa dma_cps dma cid frm ir ngs pscdl rcb sr uaa uab uafvl uamb uam uap uapv uaw ul _s tag_exp dl dt dr ci cn cs cm ck cc sid sct seg _tu tfd en _fv _nsi _ss _ee _eu ae _et _dbg ep.tool ep.release').split(' '));
    const events = new Set(['page_view', 'tool_open', 'user_engagement', 'first_visit', 'session_start']);
    function permits(url, body) {
      let target;
      try { target = new URL(typeof Request !== 'undefined' && url instanceof Request ? url.url : String(url), location.href); } catch (_) { return true; }
      const google = /(^|\.)google-analytics\.com$/.test(target.hostname) ||
          target.hostname === 'analytics.google.com' || target.hostname === 'stats.g.doubleclick.net' ||
          target.hostname === 'www.googletagmanager.com';
      if (!google) return true;
      if (choice !== 'accepted' || window['ga-disable-' + id] === true || target.protocol !== 'https:') return false;
      if (body != null && typeof body !== 'string' && !(body instanceof URLSearchParams)) return false;
      const batches = body ? String(body).split('\n').filter(Boolean) : [''];
      return batches.every(line => {
        const params = new URLSearchParams(target.search);
        for (const [name, value] of new URLSearchParams(line)) params.append(name, value);
        if (params.get('tid') !== id || !events.has(params.get('en')) ||
            params.get('dl') !== publicLocation || params.get('dt') !== publicTitle || params.get('dr')) return false;
        if (['page_view','tool_open'].includes(params.get('en')) &&
            (params.get('ep.tool')!==entry.tool || params.get('ep.release')!==entry.release)) return false;
        for (const [name, value] of params) {
          if (!fields.has(name)) return false;
          if (['ci', 'cn', 'cs', 'cm', 'ck', 'cc'].includes(name) && value) return false;
          if (name==='ep.tool' && value!==entry.tool || name==='ep.release' && value!==entry.release) return false;
          if (name === 'tid' && value !== id || name === 'dl' && value !== publicLocation ||
              name === 'dt' && value !== publicTitle || name === 'dr' && value ||
              name === 'en' && !events.has(value)) return false;
        }
        return true;
      });
    }
    if (navigator.sendBeacon) {
      const send = navigator.sendBeacon.bind(navigator);
      navigator.sendBeacon = (url, body) => permits(url, body) ? send(url, body) : true;
    }
    if (window.fetch) {
      const fetch = window.fetch.bind(window);
      window.fetch = (url, options) => permits(url, options?.body || (typeof Request !== 'undefined' && url instanceof Request ? {} : null))
        ? fetch(url, options) : Promise.resolve(new Response(null, {status: 204}));
    }
    const xhrURLs = new WeakMap(), openXHR = XMLHttpRequest.prototype.open, sendXHR = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function (method, url, ...args) { xhrURLs.set(this, url); return openXHR.call(this, method, url, ...args); };
    XMLHttpRequest.prototype.send = function (body) { if (permits(xhrURLs.get(this), body)) return sendXHR.call(this, body); this.abort(); };
    const imageSrc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
    if (imageSrc?.set && imageSrc.configurable) Object.defineProperty(HTMLImageElement.prototype, 'src', {
      ...imageSrc, set(url) { if (permits(url, null)) imageSrc.set.call(this, url); }
    });
  }
  const status = panel.querySelector('[data-privacy-status]');
  function describe(extra = '') {
    panel.querySelector('[data-privacy-reject]').textContent = choice === 'accepted' ? label('Withdraw analytics', '撤回统计许可') : label('Reject analytics', '拒绝统计');
    status.textContent = (choice === 'accepted' ? label('Optional analytics are accepted.', '已允许可选访问统计。') : label('Optional analytics are off.', '可选访问统计已关闭。')) + extra;
  }
  const queue = function () { window.musedlabReachLayer.push(arguments); };
  function reportTool(){
    if(!configured||choice!=='accepted'||!loaded||!toolWasOpened||toolReported)return;
    toolReported=true;
    queue('event','tool_open',{page_location:publicLocation,page_title:publicTitle,page_referrer:'',
      tool:entry.tool,release:entry.release,send_to:id});
  }
  // Zero-argument, fixed metadata hook. Duplicate mounts/calls cannot inflate a
  // navigation. A fresh document creates a new page/tool visit.
  window.musedlabReachToolOpened=()=>{toolWasOpened=true;reportTool();};
  function analytics() {
    if (!configured || choice !== 'accepted') return;
    window['ga-disable-' + id] = false;
    if (loaded) {
      queue('consent', 'update', {analytics_storage: 'granted'});
      reportTool();
      return;
    }
    loaded = true;
    // A dedicated queue keeps legacy app event helpers separate from reach data.
    window.musedlabReachLayer = [];
    queue('consent', 'default', {analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied'});
    queue('js', new Date());
    const page = {page_location: publicLocation, page_title: publicTitle, page_referrer: ''};
    queue('set', page);
    queue('config', id, {...page, send_page_view: false,
      allow_google_signals: false, allow_ad_personalization_signals: false,
      cookie_domain: 'none', cookie_expires: 15552000, cookie_flags: 'SameSite=Lax;Secure',
      ignore_referrer: true, campaign_id: '', campaign_name: '', campaign_source: '',
      campaign_medium: '', campaign_term: '', campaign_content: ''});
    queue('event', 'page_view', {...page,tool:entry.tool,release:entry.release,send_to: id});
    reportTool();
    const script = document.createElement('script');
    script.id = 'optional-analytics'; script.async = true;
    script.referrerPolicy = 'no-referrer';
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id) + '&l=musedlabReachLayer';
    document.head.appendChild(script);
  }
  function clearAnalyticsCookies() {
    const parts = location.hostname.split('.');
    const domains = [''];
    for (let i = 0; i < parts.length - 1; i++) domains.push(parts.slice(i).join('.'), '.' + parts.slice(i).join('.'));
    const paths = ['/'];
    const segments = location.pathname.split('/');
    for (let i = 1; i < segments.length; i++) paths.push(segments.slice(0, i).join('/') || '/');
    document.cookie.split(';').forEach(cookie => {
      const name = cookie.split('=')[0].trim();
      if (!/^(_ga($|_)|_gid$|_gat)/.test(name)) return;
      domains.forEach(domain => paths.forEach(path => { document.cookie = name + '=; Max-Age=0; path=' + path + (domain ? '; domain=' + domain : '') + '; SameSite=Lax'; }));
    });
  }
  function resetEmbeds() {
    document.querySelectorAll('[data-embed]').forEach(box => {
      const iframe = box.querySelector('iframe'); if (iframe) iframe.remove();
      box.querySelector('[data-load-embed]').hidden = false;
    });
  }
  function setChoice(next) {
    choice = next;
    let persisted = true;
    try { localStorage.setItem(key, next); } catch (_) { persisted = false; }
    if (next === 'accepted') analytics();
    else {
      if (id) window['ga-disable-' + id] = true;
      // Remove unprocessed commands too; transport checks still block any work
      // already held internally by Google's script.
      if(window.musedlabReachLayer)window.musedlabReachLayer.length=0;
      clearAnalyticsCookies(); resetEmbeds();
      // The GA disable switch stops subsequent measurement without reloading an
      // editor, interrupting audio, or discarding unsaved work.
    }
    describe(persisted ? '' : ' Your browser could not save this preference; it applies to this visit only.');
    if (persisted) { panel.hidden = true; open.setAttribute('aria-expanded', 'false'); if (previousFocus) previousFocus.focus(); }
  }
  let footer = document.querySelector('[data-privacy-footer]');
  if (!footer) {
    footer = document.createElement('div'); footer.className = 'privacy-footer';
    if (toolControls) footer.classList.add('privacy-tool-footer');
    document.body.appendChild(footer);
  }
  footer.appendChild(open);
  open.hidden = false;
  open.addEventListener('click', () => {
    previousFocus = open; panel.hidden = !panel.hidden;
    open.setAttribute('aria-expanded', String(!panel.hidden));
    if (!panel.hidden) { describe(); panel.querySelector('button').focus(); }
  });
  panel.querySelector('[data-privacy-accept]').addEventListener('click', () => setChoice('accepted'));
  panel.querySelector('[data-privacy-reject]').addEventListener('click', () => setChoice('rejected'));
  function dismiss() {
    if (choice === null) { choice = 'dismissed'; try { localStorage.setItem(key, choice); } catch (_) {} }
    panel.hidden = true; open.setAttribute('aria-expanded', 'false');
    if (previousFocus) open.focus();
  }
  panel.querySelector('[data-privacy-close]').addEventListener('click', dismiss);
  panel.addEventListener('keydown', event => {
    // Preference controls should not trigger the instrument's global shortcuts.
    event.stopPropagation();
    if (event.key === 'Escape') dismiss();
  });
  open.addEventListener('keydown', event => event.stopPropagation());
  document.querySelectorAll('[data-embed]').forEach(box => {
    const button = box.querySelector('[data-load-embed]'); button.hidden = false;
    button.addEventListener('click', () => {
      if (box.querySelector('iframe')) return;
      const iframe = document.createElement('iframe');
      iframe.title = box.dataset.title || 'Embedded content'; iframe.src = box.dataset.embed;
      iframe.allowFullscreen = true; iframe.referrerPolicy = 'strict-origin-when-cross-origin';
      iframe.allow = 'fullscreen; picture-in-picture';
      box.insertBefore(iframe, box.firstChild); button.hidden = true;
      iframe.focus();
    });
  });
  window.addEventListener('storage', event => {
    if (event.key !== key && event.key !== null) return;
    choice = event.key !== null && event.newValue === 'accepted' ? 'accepted' : 'rejected';
    if (choice === 'accepted') analytics();
    else { if (id) window['ga-disable-' + id] = true;if(window.musedlabReachLayer)window.musedlabReachLayer.length=0; clearAnalyticsCookies(); resetEmbeds(); }
    describe();
  });
  describe(); panel.hidden = choice !== null || !configured;
  open.setAttribute('aria-expanded', String(!panel.hidden));
  if (choice === 'accepted') analytics(); else { if (id) window['ga-disable-' + id] = true; clearAnalyticsCookies(); }
})();
