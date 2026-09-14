const { JSDOM } = require("jsdom");

const dom = new JSDOM(`
<!DOCTYPE html>
<html>
<body>
  <div>
    <ul>
      <li>1x</li>
      <li>1.5x</li>
      <li>2x</li>
      <li>2.5x</li>
    </ul>
  </div>
  <div>
    ${'<span>other</span>'.repeat(5000)}
  </div>
</body>
</html>
`);
global.document = dom.window.document;
global.window = dom.window;

const looksLikeSpeed = (el) => {
    const txt = el.textContent.trim();
    if (txt.length > 8) return false;
    return /^\d+(?:\.\d+)?\s*[x×]$/i.test(txt);
};
global.looksLikeSpeed = looksLikeSpeed;

function findSpeedContainerOld() {
    const candidates = document.querySelectorAll(
      'button, li, div, span, a, [role="option"], [role="menuitem"], [role="radio"]'
    );

    const counts = new Map();
    candidates.forEach(el => {
      if (!looksLikeSpeed(el)) return;
      const p = el.parentElement;
      if (!p || p === document.body || p === document.documentElement) return;
      counts.set(p, (counts.get(p) ?? 0) + 1);
    });

    let best = null, bestN = 2;
    counts.forEach((n, p) => { if (n > bestN) { bestN = n; best = p; } });
    return best;
}

let cachedSpeedContainer = null;
function findSpeedContainerNew() {
    if (cachedSpeedContainer && document.contains(cachedSpeedContainer)) {
        return cachedSpeedContainer;
    }
    const candidates = document.querySelectorAll(
      'button, li, div, span, a, [role="option"], [role="menuitem"], [role="radio"]'
    );

    const counts = new Map();
    candidates.forEach(el => {
      if (!looksLikeSpeed(el)) return;
      const p = el.parentElement;
      if (!p || p === document.body || p === document.documentElement) return;
      counts.set(p, (counts.get(p) ?? 0) + 1);
    });

    let best = null, bestN = 2;
    counts.forEach((n, p) => { if (n > bestN) { bestN = n; best = p; } });

    if (best) {
        cachedSpeedContainer = best;
    }
    return best;
}

// Warmup
for (let i = 0; i < 50; i++) {
    findSpeedContainerOld();
    findSpeedContainerNew();
}

// Benchmark old
const t0 = performance.now();
for (let i = 0; i < 500; i++) {
    findSpeedContainerOld();
}
const t1 = performance.now();
console.log(`Old: ${t1 - t0} ms`);

// Benchmark new
const t2 = performance.now();
for (let i = 0; i < 500; i++) {
    findSpeedContainerNew();
}
const t3 = performance.now();
console.log(`New: ${t3 - t2} ms`);
