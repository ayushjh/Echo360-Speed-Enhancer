# Echo360 Speed Enhancer

A lightweight, permission-less browser extension that adds **2.5×, 3×, 3.5×, and 4×** playback speed options directly into Echo360's video player controls. Works seamlessly on Firefox, Zen, Chrome, Brave, Edge, Opera and other Chromium-based browsers.

---

## Features

- **Custom Speed Controls**: Adds high-speed options (2.5×, 3×, 3.5×, 4×) to the default Echo360 speed panel.
- **Robust Speed Enforcement**: Bypasses player-level rate resets via prototype monkey-patching and capture-phase listeners.
- **(Not so) Flawless UI Synchronization**: Auto-positions active checkmarks (`✓`) and updates the control-bar speed toggle pill in real-time, even when React re-renders. (Known bug)
- **Cross-Frame Communication**: Automatically propagates speed settings across player frames (e.g., lecture portals vs. embedded players).

---

## Installation

### Firefox / Zen Browser

1. Open Firefox or Zen Browser and navigate to `about:debugging`.
2. Click **This Firefox** (or **This Browser** in Zen) in the left sidebar.
3. Click **Load Temporary Add-on…**.
4. Navigate to the `echo360-speed-enhancer` folder and select the `manifest.json` file.
5. The extension is now loaded and active.

> **Note**: Temporary add-ons are removed when you restart the browser. To make the installation permanent, you can package the extension as an `.xpi` and sign it using the [Mozilla developer tools](https://extensionworkshop.com/documentation/develop/getting-started-with-web-ext/).

### Chrome / Brave / Edge / Opera

1. Open your browser and navigate to `chrome://extensions` (or `edge://extensions`, etc.).
2. Enable **Developer mode** using the toggle switch in the top-right corner.
3. Click the **Load unpacked** button in the top-left.
4. Select the `echo360-speed-enhancer` folder.
5. The extension is loaded and will run automatically on matching Echo360 domains.

---

## How It Works

Echo360 players use a React framework that enforces video playback rates. Simply setting `video.playbackRate = rate` from a standard content script fails because the player's internal state machine resets the rate to the last-selected native speed (usually 2× or lower).

To circumvent this, this extension does the following:

1. **Main World execution**: The script is configured with `"world": "MAIN"` in `manifest.json`, injecting it directly into the web page's primary execution context rather than an isolated extension world.
2. **Prototype Monkey-patching**: It intercepts writes to `HTMLMediaElement.prototype.playbackRate`. When you select a custom rate, it updates an internal `enforcedRate` variable. Any subsequent write attempts by the player's React code to change the video's speed are silently redirected to our `enforcedRate`.
3. **Capture-Phase Event Listening**: It listens to capture-phase `ratechange` events at the `document` level. If the browser resets the video's speed (e.g., during video source transitions or re-mounts), the listener re-applies the custom speed using the native prototype setter.
4. **UI Synchronization**: A `MutationObserver` watches the DOM for React renders. When the speed menu is loaded or updated, the extension injects the custom buttons, syncs the active checkmark (`✓`), hides checkmarks on other options, and updates the pill label on the bottom playback control bar.

---

## Customizing Speeds

You can change, add, or remove speed options by editing the `EXTRA_SPEEDS` array in [content.js].

```javascript
const EXTRA_SPEEDS = [2.5, 3, 3.5, 4];
```

For example, to add `5×` playback, change it to:

```javascript
const EXTRA_SPEEDS = [2.5, 3, 3.5, 4, 5];
```

After modifying the file, save it and reload the extension in your browser's extension manager.

---

## Files

```text
echo360-speed-enhancer/
├── manifest.json   ← Extension manifest (Manifest V3; configures main-world script injection)
└── content.js      ← Injection, speed enforcement, and UI synchronization logic
```

No background scripts. No third-party dependencies. No trackers or network calls.
