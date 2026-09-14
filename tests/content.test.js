const { parseRate } = require('../content');

describe('parseRate', () => {
  test('correctly extracts numeric playback rate for standard inputs', () => {
    expect(parseRate({ textContent: '2x' })).toBe(2);
    expect(parseRate({ textContent: '2.5x' })).toBe(2.5);
    expect(parseRate({ textContent: '3×' })).toBe(3);
    expect(parseRate({ textContent: '3.5×' })).toBe(3.5);
    expect(parseRate({ textContent: '4x' })).toBe(4);
    expect(parseRate({ textContent: '10.25X' })).toBe(10.25);
  });

  test('correctly extracts numeric playback rate with leading/trailing whitespaces', () => {
    expect(parseRate({ textContent: '  1.25x  ' })).toBe(1.25);
    expect(parseRate({ textContent: '\n2.0×\t' })).toBe(2.0);
    expect(parseRate({ textContent: ' 5 x ' })).toBe(5);
  });

  test('returns null when rate cannot be parsed', () => {
    expect(parseRate({ textContent: 'normal' })).toBeNull();
    expect(parseRate({ textContent: 'abc' })).toBeNull();
    expect(parseRate({ textContent: '' })).toBeNull();
    expect(parseRate({ textContent: 'x2' })).toBeNull();
    expect(parseRate({ textContent: '2.5' })).toBeNull();
    expect(parseRate({ textContent: '2' })).toBeNull();
  });

  test('handles null/undefined inputs by throwing TypeError', () => {
    expect(() => parseRate(null)).toThrow(TypeError);
    expect(() => parseRate(undefined)).toThrow(TypeError);
    expect(() => parseRate({})).toThrow(TypeError); // textContent is undefined -> textContent.match throws
    expect(() => parseRate({ textContent: null })).toThrow(TypeError); // null.match throws
  });
});
