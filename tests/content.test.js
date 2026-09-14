const { looksLikeSpeed, parseRate, gatherActiveClasses, walkTextNodes } = require('../content.js');

describe('Speed helpers', () => {
  describe('looksLikeSpeed', () => {
    it('returns true for normal speeds (e.g. 1x, 2x, 1.5x)', () => {
      expect(looksLikeSpeed({ textContent: '1x' })).toBe(true);
      expect(looksLikeSpeed({ textContent: '2x' })).toBe(true);
      expect(looksLikeSpeed({ textContent: '1.5x' })).toBe(true);
      expect(looksLikeSpeed({ textContent: '3.5×' })).toBe(true); // Unicode multiplication sign
      expect(looksLikeSpeed({ textContent: '1.25 x' })).toBe(true);
    });

    it('returns false for text that does not look like a speed', () => {
      expect(looksLikeSpeed({ textContent: 'Play' })).toBe(false);
      expect(looksLikeSpeed({ textContent: '100% volume' })).toBe(false);
      expect(looksLikeSpeed({ textContent: 'This is a long text containing 1x somewhere' })).toBe(false); // Length > 10
      expect(looksLikeSpeed({ textContent: 'x' })).toBe(false);
      expect(looksLikeSpeed({ textContent: '123' })).toBe(false);
    });
  });

  describe('parseRate', () => {
    it('extracts numeric rate from valid speed text', () => {
      expect(parseRate({ textContent: '1x' })).toBe(1);
      expect(parseRate({ textContent: '1.5x' })).toBe(1.5);
      expect(parseRate({ textContent: '3.5×' })).toBe(3.5);
      expect(parseRate({ textContent: '  2.75  x ' })).toBe(2.75);
    });

    it('returns null for text with no valid rate', () => {
      expect(parseRate({ textContent: 'Play' })).toBeNull();
      expect(parseRate({ textContent: 'Volume 100' })).toBeNull();
    });
  });

  describe('gatherActiveClasses', () => {
    it('finds expected active classes in a container', () => {
      document.body.innerHTML = `
        <div id="container">
          <button class="menu-item active">1x</button>
          <button class="menu-item selected highlight custom-btn">2x</button>
          <button class="current speed-btn">3x</button>
          <button class="normal">4x</button>
        </div>
      `;
      const container = document.getElementById('container');
      const activeClasses = gatherActiveClasses(container);

      expect(activeClasses).toContain('active');
      expect(activeClasses).toContain('selected');
      expect(activeClasses).toContain('highlight');
      expect(activeClasses).toContain('current');

      expect(activeClasses).not.toContain('menu-item');
      expect(activeClasses).not.toContain('custom-btn');
      expect(activeClasses).not.toContain('speed-btn');
      expect(activeClasses).not.toContain('normal');
    });

    it('returns empty array if no active classes found', () => {
      document.body.innerHTML = `
        <div id="container">
          <button class="menu-item">1x</button>
        </div>
      `;
      const container = document.getElementById('container');
      const activeClasses = gatherActiveClasses(container);

      expect(activeClasses).toEqual([]);
    });
  });

  describe('walkTextNodes', () => {
    it('finds the first text node matching the condition', () => {
      document.body.innerHTML = `
        <div id="container">
          <span>Some non-matching text</span>
          <button>
            <span>Nested 1.5x speed</span>
          </button>
        </div>
      `;
      const container = document.getElementById('container');
      const foundNode = walkTextNodes(container, n => /\d/.test(n.textContent));

      expect(foundNode).not.toBeNull();
      expect(foundNode.textContent).toContain('1.5x');
    });

    it('returns null if no text node matches the condition', () => {
      document.body.innerHTML = `
        <div id="container">
          <span>Some non-matching text</span>
        </div>
      `;
      const container = document.getElementById('container');
      const foundNode = walkTextNodes(container, n => /\d/.test(n.textContent));

      expect(foundNode).toBeNull();
    });
  });
});
