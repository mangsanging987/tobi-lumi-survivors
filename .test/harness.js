const noop = () => {};
const gradStub = { addColorStop: noop };
function ctxStub() {
  return new Proxy({}, { get: (t, k) => {
    if (k === 'createLinearGradient' || k === 'createRadialGradient') return () => gradStub;
    if (k === 'measureText') return () => ({ width: 10 });
    if (k === 'getImageData') return () => ({ data: [] });
    return noop;
  }, set: () => true });
}
const elStub = () => {
  const el = { style: {}, classList: { add: noop, remove: noop, toggle: noop }, children: [], _handlers: {},
    querySelector: () => null, innerHTML: '', textContent: '', width: 400, height: 800, getContext: () => ctxStub(),
    dataset: {} };
  el.appendChild = (c) => { el.children.push(c); };
  el.addEventListener = (ev, fn) => { (el._handlers[ev] = el._handlers[ev] || []).push(fn); };
  el.click = () => { (el._handlers['click'] || []).forEach(fn => fn()); };
  return el;
};
const byId = {};
global.document = {
  createElement: () => elStub(),
  getElementById: (id) => (byId[id] = byId[id] || elStub()),
  querySelectorAll: () => [],
};
global.window = global;
global.innerWidth = 430; global.innerHeight = 930;
global.addEventListener = noop;
global.Image = class { constructor() { this.complete = false; } set src(v) { this._src = v; } };
global.requestAnimationFrame = noop;
global.localStorage = { getItem: () => null, setItem: noop };
const fs = require('fs');
eval(fs.readFileSync(process.argv[2], 'utf8') + '\n' + fs.readFileSync(process.argv[3], 'utf8'));
