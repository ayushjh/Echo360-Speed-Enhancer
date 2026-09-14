const { performance } = require('perf_hooks');

function looksLikeSpeed_old(el) {
  const t = el.textContent.trim();
  return t.length <= 10 && /\d+(?:\.\d+)?\s*[x×]/i.test(t);
}

function looksLikeSpeed_new(el) {
  if (el.textContent.length > 50) return false;
  const t = el.textContent.trim();
  return t.length <= 10 && /\d+(?:\.\d+)?\s*[x×]/i.test(t);
}

// Create a mock element with massive text content
// Top level layout divs can have a LOT of text content in a real DOM
const longText = ' '.repeat(50000) + 'Hello world' + ' '.repeat(50000);
const shortText = '  1.5x  ';

const elLong = { textContent: longText };
const elShort = { textContent: shortText };

const iterations = 100000;

let start = performance.now();
for (let i = 0; i < iterations; i++) {
  looksLikeSpeed_old(elLong);
}
let timeOldLong = performance.now() - start;

start = performance.now();
for (let i = 0; i < iterations; i++) {
  looksLikeSpeed_new(elLong);
}
let timeNewLong = performance.now() - start;

console.log(`Long string - Old: ${timeOldLong.toFixed(2)}ms, New: ${timeNewLong.toFixed(2)}ms`);

start = performance.now();
for (let i = 0; i < iterations; i++) {
  looksLikeSpeed_old(elShort);
}
let timeOldShort = performance.now() - start;

start = performance.now();
for (let i = 0; i < iterations; i++) {
  looksLikeSpeed_new(elShort);
}
let timeNewShort = performance.now() - start;

console.log(`Short string - Old: ${timeOldShort.toFixed(2)}ms, New: ${timeNewShort.toFixed(2)}ms`);
