// Test fixture only. No participant history or analytics transport is used.
const testStore = new Map();
Object.defineProperty(window, 'localStorage', {value: {
  getItem: key => testStore.get(key) || null,
  setItem: (key,value) => testStore.set(key,String(value)),
  removeItem: key => testStore.delete(key)
}});
window.testAnalytics = {scripts: [], requests: []};
const testAppend = Node.prototype.appendChild;
Node.prototype.appendChild = function(node) {
  if (node.tagName === 'SCRIPT' && /googletagmanager\.com/.test(node.src)) {
    testAnalytics.scripts.push(node.src); node.removeAttribute('src');
  }
  return testAppend.call(this,node);
};
const testFetch = window.fetch.bind(window);
window.fetch = (url,options) => {
  if (/google-analytics\.com/.test(String(url))) {
    testAnalytics.requests.push(String(url)); return Promise.resolve(new Response(null,{status:204}));
  }
  return testFetch(url,options);
};
// Emulates the input capabilities only; browser pixels still come from real layout.
if (new URLSearchParams(location.search).get('touch') === '1') {
  const nativeMatch = window.matchMedia.bind(window);
  window.matchMedia = query => query.includes('any-pointer: coarse') ? {matches:true,media:query,addEventListener(){},removeEventListener(){}} : nativeMatch(query);
}
