# Echo360 Speed Enhancer

Adds **2.5×, 3×, 3.5×, and 4×** playback speed options directly into Echo360's existing speed toggle at `echo360.net.au`.

---

## Install – Firefox / Zen

1. Open Firefox and go to `about:debugging`
2. Click **This Firefox** in the left sidebar
3. Click **Load Temporary Add-on…**
4. Navigate to the `echo360-speed-enhancer` folder and select **manifest.json**
5. The extension is now active for this Firefox session

> **Permanent install:** Submit to [addons.mozilla.org](https://addons.mozilla.org) or sign the XPI via [web-ext](https://extensionworkshop.com/documentation/develop/getting-started-with-web-ext/).
> For personal use you can also set `xpinstall.signatures.required` to `false` in `about:config` (not recommended for general use).

---

## Install – Chrome / Brave / Edge

1. Go to `chrome://extensions` (or `edge://extensions`, etc.)
2. Enable **Developer mode** (toggle, top-right)
3. Click **Load unpacked**
4. Select the `echo360-speed-enhancer` folder
5. Done – the extension loads automatically on Echo360 pages

---

## How it works

When you click the speed toggle in the Echo360 player, the extension:

1. Detects when the speed panel opens (via `MutationObserver`)
2. Finds the container holding the existing speed buttons (0.5×–2×) by scanning for elements whose text content matches a speed label
3. Clones the 2× button four times, updating each clone for 2.5×, 3×, 3.5×, and 4×
4. Attaches a click handler that calls `video.playbackRate = rate` on the underlying `<video>` element
5. Re-injects whenever React unmounts and remounts the panel

Because it uses `video.playbackRate` directly (the standard HTML5 API), the speed change is real — not a visual trick.

---

## Customising speeds

Open `content.js` and edit the first line inside the IIFE:

```js
const EXTRA_SPEEDS = [2.5, 3, 3.5, 4];
```

Change, add, or remove values. After saving, reload the extension in your browser.

## Files

```
echo360-speed-enhancer/
├── manifest.json   ← Extension metadata (Manifest; works in Firefox & Chromium)
└── content.js      ← All logic; runs on echo360.net.au pages
```

No background scripts. No network requests. No permissions beyond running on Echo360 pages.
