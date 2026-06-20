/**
 * Echo360 Speed Enhancer – content.js (v6)
 *
 * Adds 2.5×, 3×, 3.5×, and 4× playback speed options to the Echo360 player.
 * Runs in the MAIN page context to ensure the HTMLMediaElement prototype
 * monkeypatch successfully intercepts all speed resets by Echo360 React code.
 */
(function () {
  'use strict';

  /* ── Config ──────────────────────────────────────────────────────── */

  const EXTRA_SPEEDS   = [2.5, 3, 3.5, 4];
  const CONTAINER_ATTR = 'data-spd-enhanced';
  const BUTTON_ATTR    = 'data-spd-rate';
  const MSG_TYPE       = 'echo360-speed-enhancer-set-rate';

  /**
   * The rate we want enforced. Set when a custom or native button is
   * clicked. The patched playbackRate setter uses this to override
   * Echo360's player writes. null = no enforcement (pass-through).
   */
  let enforcedRate = null;

  /* ── Speed-label detection ───────────────────────────────────────── */

  /** Returns true if el's text content looks like a playback-speed label. */
  function looksLikeSpeed(el) {
    const t = el.textContent.trim();
    return t.length <= 10 && /\d+(?:\.\d+)?\s*[x×]/i.test(t);
  }

  /** Extract the numeric rate from an element's text, or null. */
  function parseRate(el) {
    const m = el.textContent.match(/(\d+(?:\.\d+)?)\s*[x×]/i);
    return m ? parseFloat(m[1]) : null;
  }

  /* ── playbackRate prototype patch ───────────────────────────────── */

  const nativePBR = Object.getOwnPropertyDescriptor(
    HTMLMediaElement.prototype, 'playbackRate'
  );

  /**
   * Monkey-patch HTMLMediaElement.prototype.playbackRate.
   * Redirects all writes to enforcedRate when non-null.
   */
  function patchPlaybackRate() {
    if (!nativePBR || HTMLMediaElement.prototype._spdPatched) return;
    HTMLMediaElement.prototype._spdPatched = true;

    Object.defineProperty(HTMLMediaElement.prototype, 'playbackRate', {
      get() {
        return nativePBR.get.call(this);
      },
      set(val) {
        const target = (enforcedRate !== null) ? enforcedRate : val;
        const current = nativePBR.get.call(this);
        // Skip no-op writes to avoid infinite loops
        if (Math.abs(current - target) >= 0.01) {
          nativePBR.set.call(this, target);
        }
      },
      configurable: true,
      enumerable: true,
    });

    console.debug('[Speed+] playbackRate prototype patched in this frame');
  }

  /* ── Video helpers ──────────────────────────────────────────────── */

  /** Collect all <video> elements in this frame and same-origin iframes. */
  function getAllVideos() {
    const videos = [...document.querySelectorAll('video')];
    document.querySelectorAll('iframe').forEach(iframe => {
      try {
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (doc) videos.push(...doc.querySelectorAll('video'));
      } catch (_) {}
    });
    return videos;
  }

  /** Apply rate to all reachable video elements and sync UI. */
  function applyRate(rate, broadcast = true) {
    enforcedRate = rate;

    getAllVideos().forEach(v => {
      if (nativePBR) {
        nativePBR.set.call(v, rate);
      } else {
        v.playbackRate = rate;
      }
    });

    if (broadcast) broadcastRate(rate);

    // Sync UI styling and toggle label immediately
    syncUI(rate);
  }

  /** Post rate to every reachable frame. */
  function broadcastRate(rate) {
    const msg = { type: MSG_TYPE, rate };
    document.querySelectorAll('iframe').forEach(iframe => {
      try { iframe.contentWindow.postMessage(msg, '*'); } catch (_) {}
    });
    if (window !== window.top) {
      try { window.parent.postMessage(msg, '*'); } catch (_) {}
    }
  }

  /* Listen for rate broadcasts from other frames. */
  window.addEventListener('message', e => {
    if (e.data?.type === MSG_TYPE && typeof e.data.rate === 'number') {
      applyRate(e.data.rate, /* broadcast */ false);
    }
  });

  /* Enforce speed on any external ratechange events (capture phase). */
  document.addEventListener('ratechange', e => {
    if (enforcedRate === null) return;
    const video = e.target;
    if (video instanceof HTMLMediaElement) {
      const cur = nativePBR ? nativePBR.get.call(video) : video.playbackRate;
      if (Math.abs(cur - enforcedRate) >= 0.01) {
        console.debug('[Speed+] Enforcing rate on ratechange event:', enforcedRate);
        if (nativePBR) {
          nativePBR.set.call(video, enforcedRate);
        } else {
          video.playbackRate = enforcedRate;
        }
      }
    }
  }, true);

  /* ── DOM helpers ────────────────────────────────────────────────── */

  function walkTextNodes(el, test) {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let n; (n = walker.nextNode()); ) { if (test(n)) return n; }
    return null;
  }

  function gatherActiveClasses(container) {
    const found = new Set();
    container.querySelectorAll('[class]').forEach(el =>
      el.classList.forEach(c => {
        if (/\bactive\b|\bselected\b|\bcurrent\b|\bhighlight/i.test(c)) found.add(c);
      })
    );
    return [...found];
  }

  /* ── CSS Injection ──────────────────────────────────────────────── */

  function injectStyles() {
    if (document.getElementById('spd-enhancer-styles')) return;
    const style = document.createElement('style');
    style.id = 'spd-enhancer-styles';
    style.textContent = [
      /* Hide checkmark/icon sub-elements inside custom buttons by default */
      `[${BUTTON_ATTR}] svg,`,
      `[${BUTTON_ATTR}] [class*="check" i],`,
      `[${BUTTON_ATTR}] [class*="tick" i],`,
      `[${BUTTON_ATTR}] [class*="icon" i] {`,
      `  display: none !important;`,
      `}`,
      /* Show checkmark/icon sub-elements inside active custom buttons */
      `[${BUTTON_ATTR}][data-spd-active="true"] svg,`,
      `[${BUTTON_ATTR}][data-spd-active="true"] [class*="check" i],`,
      `[${BUTTON_ATTR}][data-spd-active="true"] [class*="tick" i],`,
      `[${BUTTON_ATTR}][data-spd-active="true"] [class*="icon" i] {`,
      `  display: inline-block !important;`,
      `}`,
      /* Force hide checkmark/icon sub-elements inside native buttons that should be inactive */
      `.spd-native-inactive svg,`,
      `.spd-native-inactive [class*="check" i],`,
      `.spd-native-inactive [class*="tick" i],`,
      `.spd-native-inactive [class*="icon" i] {`,
      `  display: none !important;`,
      `}`,
      /* Suppress pseudo-element checkmarks on inactive custom buttons or overridden native buttons */
      `[${BUTTON_ATTR}]:not([data-spd-active="true"])::before,`,
      `[${BUTTON_ATTR}]:not([data-spd-active="true"])::after,`,
      `[${BUTTON_ATTR}]:not([data-spd-active="true"]) *::before,`,
      `[${BUTTON_ATTR}]:not([data-spd-active="true"]) *::after,`,
      `.spd-native-inactive::before,`,
      `.spd-native-inactive::after,`,
      `.spd-native-inactive *::before,`,
      `.spd-native-inactive *::after {`,
      `  content: none !important;`,
      `  display: none !important;`,
      `}`
    ].join('\n');
    (document.head || document.documentElement).appendChild(style);
  }

  /* ── Finding the speed panel container ──────────────────────────── */

  function findSpeedContainer() {
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

  /* ── Build one custom speed button ──────────────────────────────── */

  function buildButton(template, rate) {
    const btn = template.cloneNode(true);

    // Strip unicode checkmarks initially
    const cw = document.createTreeWalker(btn, NodeFilter.SHOW_TEXT);
    let tn;
    while ((tn = cw.nextNode())) {
      tn.textContent = tn.textContent.replace(/[✓✔☑✅✕✗✘⬤●]\s*/gu, '');
    }

    // Update speed label text
    const node = walkTextNodes(btn, n => /\d/.test(n.textContent));
    if (node) {
      node.textContent = node.textContent.replace(/\d+(?:\.\d+)?/, rate);
    } else {
      btn.textContent = `${rate}×`;
    }

    // Clean active/selected states initially
    Array.from(btn.classList)
      .filter(c => /\bactive\b|\bselected\b|\bcurrent\b|\bhighlight/i.test(c))
      .forEach(c => btn.classList.remove(c));
    ['aria-pressed', 'aria-selected', 'aria-checked'].forEach(attr => {
      if (btn.hasAttribute(attr)) btn.setAttribute(attr, 'false');
    });

    // Update rate-related attributes
    ['data-rate', 'data-speed', 'data-value', 'data-playback-rate'].forEach(attr => {
      if (btn.hasAttribute(attr)) btn.setAttribute(attr, rate);
    });

    const al = btn.getAttribute('aria-label');
    if (al) btn.setAttribute('aria-label', `${rate}× playback speed`);

    btn.removeAttribute(CONTAINER_ATTR);
    btn.setAttribute(BUTTON_ATTR, String(rate));
    btn.setAttribute('data-spd-active', 'false');

    btn.addEventListener('click', () => {
      applyRate(rate);
    });

    return btn;
  }

  /* ── Main injection ─────────────────────────────────────────────── */

  function inject() {
    const container = findSpeedContainer();
    if (!container) return false;
    if (container.hasAttribute(CONTAINER_ATTR)) return true;

    const speedItems = Array.from(container.children).filter(looksLikeSpeed);
    if (speedItems.length < 3) return false;

    container.setAttribute(CONTAINER_ATTR, '');
    injectStyles();

    const firstRate = parseRate(speedItems[0]);
    const lastRate  = parseRate(speedItems[speedItems.length - 1]);
    const descending = firstRate !== null && lastRate !== null && firstRate > lastRate;

    const template = descending ? speedItems[0] : speedItems[speedItems.length - 1];

    if (descending) {
      const refNode = speedItems[0];
      [...EXTRA_SPEEDS].reverse().forEach(rate => {
        if (container.querySelector(`[${BUTTON_ATTR}="${rate}"]`)) return;
        container.insertBefore(buildButton(template, rate), refNode);
      });
    } else {
      EXTRA_SPEEDS.forEach(rate => {
        if (container.querySelector(`[${BUTTON_ATTR}="${rate}"]`)) return;
        container.appendChild(buildButton(template, rate));
      });
    }

    // Hook native speed buttons so they update enforcedRate
    Array.from(container.children).forEach(item => {
      if (item.hasAttribute(BUTTON_ATTR)) return;
      if (!looksLikeSpeed(item)) return;
      if (item.hasAttribute('data-spd-hooked')) return;
      item.setAttribute('data-spd-hooked', 'true');

      item.addEventListener('click', () => {
        const r = parseRate(item);
        if (r !== null) {
          enforcedRate = r;
          console.debug('[Speed+] Native speed selected:', r + '×');
          syncUI(r);
        }
      }, true); // capture phase
    });

    console.info('[Speed+] ✓ Injected', EXTRA_SPEEDS.map(r => r + '×').join(', '),
      `(${descending ? 'descending' : 'ascending'} panel)`);
    return true;
  }

  /* ── UI Synchronization ─────────────────────────────────────────── */

  function syncUI(rate) {
    if (rate === null) return;
    const container = findSpeedContainer();
    if (!container) return;

    const activeClasses = gatherActiveClasses(container);

    Array.from(container.children).forEach(el => {
      if (!looksLikeSpeed(el)) return;

      const elRate = parseRate(el);
      const isActive = elRate !== null && Math.abs(elRate - rate) < 0.01;

      // Update custom status attribute
      el.setAttribute('data-spd-active', isActive ? 'true' : 'false');

      // Update ARIA attributes
      ['aria-pressed', 'aria-selected', 'aria-checked'].forEach(attr => {
        if (el.hasAttribute(attr)) {
          el.setAttribute(attr, isActive ? 'true' : 'false');
        }
      });

      // Update active styling classes
      if (isActive) {
        if (activeClasses.length) {
          activeClasses.forEach(c => el.classList.add(c));
        } else {
          el.classList.add('active');
        }
        el.classList.remove('spd-native-inactive');
      } else {
        activeClasses.forEach(c => el.classList.remove(c));
        if (!el.hasAttribute(BUTTON_ATTR)) {
          el.classList.add('spd-native-inactive');
        }
      }

      // Sync unicode checkmarks in text content
      const textNode = walkTextNodes(el, n => /\d/.test(n.textContent));
      if (textNode) {
        const hasCheck = /[✓✔☑✅]/.test(textNode.textContent);
        if (isActive && !hasCheck) {
          textNode.textContent = '✓ ' + textNode.textContent.trim().replace(/^[✓✔☑✅✕✗✘⬤●]\s*/gu, '');
        } else if (!isActive && hasCheck) {
          textNode.textContent = textNode.textContent.replace(/^[✓✔☑✅✕✗✘⬤●]\s*/gu, '');
        }
      }
    });

    // Update the control-bar speed toggle button
    updateToggleLabel(rate);
  }

  /* ── Update the label on the control-bar toggle button ──────────── */

  function updateToggleLabel(rate) {
    const container = document.querySelector(`[${CONTAINER_ATTR}]`);
    const candidates = document.querySelectorAll(
      'button, [role="button"], [class*="speed" i], [class*="rate" i], [class*="control" i], [class*="player" i]'
    );
    candidates.forEach(el => {
      if (container?.contains(el)) return;
      if (el.hasAttribute(BUTTON_ATTR)) return;

      const t = el.textContent.trim();
      if (t.length > 10 || !/^\d+(?:\.\d+)?\s*[x×]$/i.test(t)) return;

      const node = walkTextNodes(el, n => /\d/.test(n.textContent));
      if (node) {
        const oldText = node.textContent;
        const newText = oldText.replace(/\d+(?:\.\d+)?/, rate);
        if (oldText !== newText) {
          node.textContent = newText;
          console.debug('[Speed+] Updated toggle label from:', oldText, 'to:', newText);
        }
      }
    });
  }

  /* ── Watcher & Boot ─────────────────────────────────────────────── */

  let debounce = null;
  function handleMutations() {
    inject();
    if (enforcedRate !== null) {
      syncUI(enforcedRate);
    }
  }

  function scheduleMutationHandling() {
    clearTimeout(debounce);
    debounce = setTimeout(handleMutations, 50);
  }

  function boot() {
    patchPlaybackRate();
    inject();
    [600, 1500, 3000, 6000].forEach(ms => setTimeout(handleMutations, ms));

    new MutationObserver(scheduleMutationHandling).observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();
