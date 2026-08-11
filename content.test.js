/**
 * Unit tests for looksLikeSpeed and parseRate functions in content.js
 */

// Mock the environment needed for content.js to load without errors
globalThis.HTMLMediaElement = class {
  get playbackRate() { return 1; }
  set playbackRate(val) {}
};
globalThis.window = {
  addEventListener: () => {},
};
globalThis.MutationObserver = class {
  constructor() {}
  observe() {}
};
globalThis.document = {
  readyState: 'complete',
  addEventListener: () => {},
  documentElement: {},
  head: {},
  getElementById: () => null,
  createElement: () => ({ id: '', textContent: '', appendChild: () => {} }),
  querySelectorAll: () => []
};

// Now require the exported functions
const { looksLikeSpeed, parseRate } = require('./content.js');

describe('looksLikeSpeed', () => {
  test('returns true for exact speed format with x or × (case-insensitive)', () => {
    expect(looksLikeSpeed({ textContent: '2x' })).toBe(true);
    expect(looksLikeSpeed({ textContent: '1.5x' })).toBe(true);
    expect(looksLikeSpeed({ textContent: '3.5×' })).toBe(true);
    expect(looksLikeSpeed({ textContent: '4X' })).toBe(true);
    expect(looksLikeSpeed({ textContent: '  2.5x  ' })).toBe(true);
    expect(looksLikeSpeed({ textContent: '0.75×' })).toBe(true);
  });

  test('returns false if text length is greater than 10', () => {
    expect(looksLikeSpeed({ textContent: '1.25x speed option' })).toBe(false);
    expect(looksLikeSpeed({ textContent: '1234567890x' })).toBe(false); // length is 11
    expect(looksLikeSpeed({ textContent: '123456789x' })).toBe(true);  // length is 10
  });

  test('returns false if it does not contain a speed multiplier indicator', () => {
    expect(looksLikeSpeed({ textContent: '2.5' })).toBe(false);
    expect(looksLikeSpeed({ textContent: 'abc' })).toBe(false);
    expect(looksLikeSpeed({ textContent: '2y' })).toBe(false);
    expect(looksLikeSpeed({ textContent: '' })).toBe(false);
  });

  test('handles whitespace edge cases properly', () => {
    expect(looksLikeSpeed({ textContent: '  2  x  ' })).toBe(true);
    expect(looksLikeSpeed({ textContent: '\t1.5\n×\r' })).toBe(true);
  });
});

describe('parseRate', () => {
  test('extracts correct rate from speed string with x or ×', () => {
    expect(parseRate({ textContent: '2x' })).toBe(2);
    expect(parseRate({ textContent: '1.5x' })).toBe(1.5);
    expect(parseRate({ textContent: '3.5×' })).toBe(3.5);
    expect(parseRate({ textContent: '4X' })).toBe(4);
    expect(parseRate({ textContent: '  2.5x  ' })).toBe(2.5);
    expect(parseRate({ textContent: '0.75×' })).toBe(0.75);
  });

  test('returns null if no matching speed multiplier pattern is found', () => {
    expect(parseRate({ textContent: 'abc' })).toBeNull();
    expect(parseRate({ textContent: '2' })).toBeNull();
    expect(parseRate({ textContent: '' })).toBeNull();
    expect(parseRate({ textContent: 'x' })).toBeNull();
  });

  test('extracts first matching pattern in string', () => {
    expect(parseRate({ textContent: '2.5x and 3x' })).toBe(2.5);
  });
});
