const {
  gatherActiveClasses,
  walkTextNodes,
  looksLikeSpeed,
  parseRate
} = require('./content');

describe('content.js testing suite', () => {

  describe('gatherActiveClasses', () => {
    let container;

    beforeEach(() => {
      container = document.createElement('div');
    });

    test('should gather active classes from element and nested elements', () => {
      container.innerHTML = `
        <div class="active">
          <span class="selected"></span>
          <p class="current highlight-active"></p>
        </div>
      `;
      const result = gatherActiveClasses(container);
      expect(result).toContain('active');
      expect(result).toContain('selected');
      expect(result).toContain('current');
      expect(result).toContain('highlight-active');
      expect(result.length).toBe(4);
    });

    test('should return a unique list of matched classes', () => {
      container.innerHTML = `
        <div class="active">
          <span class="active"></span>
          <p class="active selected"></p>
        </div>
      `;
      const result = gatherActiveClasses(container);
      expect(result).toEqual(['active', 'selected']);
    });

    test('should handle case insensitivity', () => {
      container.innerHTML = `
        <div class="Active">
          <span class="SELECTED"></span>
          <p class="Current HIGHLIGHT-me"></p>
        </div>
      `;
      const result = gatherActiveClasses(container);
      expect(result).toContain('Active');
      expect(result).toContain('SELECTED');
      expect(result).toContain('Current');
      expect(result).toContain('HIGHLIGHT-me');
      expect(result.length).toBe(4);
    });

    test('should handle boundaries correctly according to the regex', () => {
      container.innerHTML = `
        <div class="inactive selecteditem currently non-matching">
          <span class="selected-item highlight-green"></span>
        </div>
      `;
      const result = gatherActiveClasses(container);
      // 'inactive', 'selecteditem', 'currently', 'non-matching' should not be matched
      expect(result).not.toContain('inactive');
      expect(result).not.toContain('selecteditem');
      expect(result).not.toContain('currently');
      expect(result).not.toContain('non-matching');
      // 'selected-item' matches because '-' is a word boundary.
      // 'highlight-green' matches because 'highlight' does not have a trailing word boundary in the regex.
      expect(result).toContain('selected-item');
      expect(result).toContain('highlight-green');
      expect(result.length).toBe(2);
    });

    test('should return empty array if no matches found', () => {
      container.innerHTML = `
        <div class="btn main-button nav">
          <span>Some text</span>
        </div>
      `;
      const result = gatherActiveClasses(container);
      expect(result).toEqual([]);
    });

    test('should return empty array if container has no elements with class', () => {
      container.innerHTML = `
        <div>
          <span>Plain text</span>
        </div>
      `;
      const result = gatherActiveClasses(container);
      expect(result).toEqual([]);
    });
  });

  describe('walkTextNodes', () => {
    let el;

    beforeEach(() => {
      el = document.createElement('div');
    });

    test('should find a text node matching the predicate', () => {
      el.innerHTML = 'Hello <span>World</span>!';
      const found = walkTextNodes(el, node => node.textContent.includes('World'));
      expect(found).not.toBeNull();
      expect(found.textContent).toBe('World');
    });

    test('should return null if no text node matches the predicate', () => {
      el.innerHTML = 'Hello <span>World</span>!';
      const found = walkTextNodes(el, node => node.textContent.includes('Universe'));
      expect(found).toBeNull();
    });

    test('should search deeply nested text nodes', () => {
      el.innerHTML = '<div><div><p>Deep <span>Text</span></p></div></div>';
      const found = walkTextNodes(el, node => node.textContent === 'Text');
      expect(found).not.toBeNull();
      expect(found.textContent).toBe('Text');
    });
  });

  describe('looksLikeSpeed', () => {
    test('should return true for valid speed formats under or equal to 10 characters', () => {
      const cases = ['2x', '3.5×', '4X', '2.5 ×', '10x', '0.5x'];
      cases.forEach(text => {
        const el = document.createElement('span');
        el.textContent = text;
        expect(looksLikeSpeed(el)).toBe(true);
      });
    });

    test('should return false for invalid speed formats or content', () => {
      const cases = ['abc', '2', '×', 'speed', 'x', 'abc2'];
      cases.forEach(text => {
        const el = document.createElement('span');
        el.textContent = text;
        expect(looksLikeSpeed(el)).toBe(false);
      });
    });

    test('should return false for speed formats longer than 10 characters', () => {
      const el = document.createElement('span');
      el.textContent = '1.23456789x'; // 11 characters
      expect(looksLikeSpeed(el)).toBe(false);
    });
  });

  describe('parseRate', () => {
    test('should extract rate correctly', () => {
      const cases = [
        { text: '2.5x', expected: 2.5 },
        { text: '3×', expected: 3 },
        { text: '4.0X', expected: 4 },
        { text: '✓ 1.5x', expected: 1.5 }
      ];
      cases.forEach(({ text, expected }) => {
        const el = document.createElement('span');
        el.textContent = text;
        expect(parseRate(el)).toBe(expected);
      });
    });

    test('should return null if rate cannot be parsed', () => {
      const el = document.createElement('span');
      el.textContent = 'abc';
      expect(parseRate(el)).toBeNull();
    });
  });

});
