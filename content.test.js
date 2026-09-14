const { looksLikeSpeed, parseRate } = require('./content');

describe('looksLikeSpeed', () => {
  test('returns true for standard speed labels', () => {
    const el = { textContent: '2x' };
    expect(looksLikeSpeed(el)).toBe(true);

    const elCross = { textContent: '2.5×' };
    expect(looksLikeSpeed(elCross)).toBe(true);

    const elUpper = { textContent: '3X' };
    expect(looksLikeSpeed(elUpper)).toBe(true);
  });

  test('ignores whitespace around text content and speed indicator', () => {
    const el1 = { textContent: '  1.5x  ' };
    expect(looksLikeSpeed(el1)).toBe(true);

    const el2 = { textContent: '2  ×' };
    expect(looksLikeSpeed(el2)).toBe(true);

    const el3 = { textContent: '\n3.5x\t' };
    expect(looksLikeSpeed(el3)).toBe(true);
  });

  test('returns false when text length is strictly greater than 10', () => {
    // "1234.5678x" has length 10 -> true
    const elExactly10 = { textContent: '1234.5678x' };
    expect(looksLikeSpeed(elExactly10)).toBe(true);

    // "12345.6789x" has length 11 -> false
    const el11Chars = { textContent: '12345.6789x' };
    expect(looksLikeSpeed(el11Chars)).toBe(false);

    // "  1234.5678x  " has untrimmed length 14, but trimmed is 10 -> true
    const elUntrimmed10 = { textContent: '  1234.5678x  ' };
    expect(looksLikeSpeed(elUntrimmed10)).toBe(true);
  });

  test('returns false for strings without speed patterns', () => {
    const el1 = { textContent: 'normal text' };
    expect(looksLikeSpeed(el1)).toBe(false);

    const el2 = { textContent: 'x2' };
    expect(looksLikeSpeed(el2)).toBe(false);

    const el3 = { textContent: '2.5' };
    expect(looksLikeSpeed(el3)).toBe(false);

    const el4 = { textContent: '2' };
    expect(looksLikeSpeed(el4)).toBe(false);

    const el5 = { textContent: '' };
    expect(looksLikeSpeed(el5)).toBe(false);
  });

  test('throws TypeError if element or textContent is null/undefined', () => {
    expect(() => looksLikeSpeed(null)).toThrow();
    expect(() => looksLikeSpeed({})).toThrow();
    expect(() => looksLikeSpeed({ textContent: null })).toThrow();
  });
});

describe('parseRate', () => {
  test('correctly extracts numeric playback rate', () => {
    expect(parseRate({ textContent: '2.5x' })).toBe(2.5);
    expect(parseRate({ textContent: '3×' })).toBe(3);
    expect(parseRate({ textContent: '  1.25x  ' })).toBe(1.25);
    expect(parseRate({ textContent: '0.75×' })).toBe(0.75);
  });

  test('returns null when rate cannot be parsed', () => {
    expect(parseRate({ textContent: 'normal' })).toBeNull();
    expect(parseRate({ textContent: 'abc' })).toBeNull();
    expect(parseRate({ textContent: '' })).toBeNull();
  });

  test('throws TypeError if element or textContent is null/undefined', () => {
    expect(() => parseRate(null)).toThrow();
    expect(() => parseRate({})).toThrow();
    expect(() => parseRate({ textContent: null })).toThrow();
  });
});

describe('findSpeedContainer', () => {
  const { findSpeedContainer } = require('./content');

  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = '';
  });

  test('should return null when no speed items are found', () => {
    expect(findSpeedContainer()).toBeNull();
  });

  test('should identify container with multiple speed-like items', () => {
    document.body.innerHTML = `
      <div id="container">
        <button>0.5x</button>
        <button>1x</button>
        <button>1.5x</button>
        <button>2x</button>
      </div>
      <div>
        <button>Play</button>
        <button>Pause</button>
      </div>
    `;

    const container = document.getElementById('container');
    expect(findSpeedContainer()).toBe(container);
  });

  test('should ignore standalone speed items (less than 3 items)', () => {
    document.body.innerHTML = `
      <div id="container">
        <button>0.5x</button>
        <button>1x</button>
      </div>
    `;

    expect(findSpeedContainer()).toBeNull();
  });

  test('should identify container with most speed items if multiple exist', () => {
    document.body.innerHTML = `
      <div id="small-container">
        <button>1x</button>
        <button>2x</button>
        <button>3x</button>
      </div>
      <div id="large-container">
        <button>0.5x</button>
        <button>1x</button>
        <button>1.5x</button>
        <button>2x</button>
        <button>3x</button>
      </div>
    `;

    const largeContainer = document.getElementById('large-container');
    expect(findSpeedContainer()).toBe(largeContainer);
  });

  test('should skip elements without parent or where parent is body/html', () => {
    // Note: In jsdom, document.body is the parent of top-level elements
    // so we place them directly in the body
    document.body.innerHTML = `
      <button>1x</button>
      <button>1.5x</button>
      <button>2x</button>
      <button>3x</button>
    `;

    expect(findSpeedContainer()).toBeNull();
  });
});
