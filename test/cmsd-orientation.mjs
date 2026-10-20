import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

// Exercise the shipped orientation handler, with video methods as observables.
// The audio engine below this handler is covered by the browser audio fixture.
const source = readFileSync(new URL('../app/js/Inst.js', import.meta.url), 'utf8');
const setup = source.slice(0, source.indexOf('var INST = (function ()'));
let checks = 0;
for (const responsive of [true, false]) {
  for (const type of ['portrait-primary', 'landscape-primary']) {
    let handler;
    const calls = [];
    const context = vm.createContext({
      Modernizr: {load() {}}, $() {}, window: {},
      screen: {orientation: {type, addEventListener(_event, callback) {handler = callback;}}},
      document: {
        documentElement: {hasAttribute: () => responsive},
        getElementsByTagName: () => [{pause: () => calls.push('pause'), play: () => calls.push('play')}]
      }
    });
    vm.runInContext(setup, context);
    handler();
    assert.deepEqual(calls, [], 'Opening help preserves playback');
    context.$popupVisible = false;
    handler();
    assert.deepEqual(calls, responsive ? [] : [type.startsWith('portrait') ? 'pause' : 'play']);
    checks += 2;
  }
}
console.log(`PASS: ${checks} responsive/legacy orientation assertions.`);
