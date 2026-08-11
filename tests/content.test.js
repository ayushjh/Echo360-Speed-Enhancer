const fs = require('fs');
const path = require('path');

const contentJsCode = fs.readFileSync(path.resolve(__dirname, '../content.js'), 'utf8');

describe('Echo360 Speed Enhancer content.js tests', () => {
  let originalDescriptor;
  let listeners;
  let observers;

  beforeAll(() => {
    // Save original playbackRate descriptor to restore it in afterEach
    originalDescriptor = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'playbackRate');
  });

  beforeEach(() => {
    // Set up a clean body & head
    document.body.innerHTML = '';
    document.head.innerHTML = '';

    // Tracking event listeners to manually clean them up
    listeners = [];
    const origDocAdd = document.addEventListener;
    jest.spyOn(document, 'addEventListener').mockImplementation((type, listener, options) => {
      listeners.push({ target: document, type, listener, options });
      origDocAdd.call(document, type, listener, options);
    });

    const origWinAdd = window.addEventListener;
    jest.spyOn(window, 'addEventListener').mockImplementation((type, listener, options) => {
      listeners.push({ target: window, type, listener, options });
      origWinAdd.call(window, type, listener, options);
    });

    // Tracking and cleaning up MutationObservers
    observers = [];
    const OrigMutationObserver = window.MutationObserver;
    jest.spyOn(window, 'MutationObserver').mockImplementation((callback) => {
      const obs = new OrigMutationObserver(callback);
      observers.push(obs);
      return obs;
    });

    // Mock readyState to 'complete' by default so boot() runs immediately
    Object.defineProperty(document, 'readyState', {
      get() { return 'complete'; },
      configurable: true,
    });

    jest.useFakeTimers();
  });

  afterEach(() => {
    // Restore original playbackRate descriptor
    if (originalDescriptor) {
      Object.defineProperty(HTMLMediaElement.prototype, 'playbackRate', originalDescriptor);
    }
    delete HTMLMediaElement.prototype._spdPatched;

    // Disconnect all mutation observers to prevent cross-test pollution
    observers.forEach(obs => obs.disconnect());

    // Clean up event listeners to prevent cross-test pollution
    listeners.forEach(({ target, type, listener, options }) => {
      target.removeEventListener(type, listener, options);
    });

    jest.restoreAllMocks();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  function runContentScript() {
    // Evaluate the content.js code
    eval(contentJsCode);
  }

  test('should defer boot if document.readyState is "loading"', () => {
    // Mock readyState to 'loading'
    Object.defineProperty(document, 'readyState', {
      get() { return 'loading'; },
      configurable: true,
    });

    runContentScript();

    // The media element shouldn't be patched yet
    expect(HTMLMediaElement.prototype._spdPatched).toBeUndefined();

    // Trigger DOMContentLoaded event
    document.dispatchEvent(new Event('DOMContentLoaded'));

    // It should be patched now
    expect(HTMLMediaElement.prototype._spdPatched).toBe(true);
  });

  test('should monkeypatch playbackRate and control video writes based on enforcedRate', () => {
    // Set up the DOM panel BEFORE running the script
    document.body.innerHTML = `
      <div class="speed-menu">
        <button class="spd-btn">1x</button>
        <button class="spd-btn">1.5x</button>
        <button class="spd-btn">2x</button>
      </div>
    `;

    runContentScript();

    expect(HTMLMediaElement.prototype._spdPatched).toBe(true);

    const video = document.createElement('video');
    document.body.appendChild(video);

    // When enforcedRate is null, setting playbackRate should pass through
    video.playbackRate = 1.75;
    expect(video.playbackRate).toBe(1.75);

    const button3 = document.querySelector('[data-spd-rate="3"]');
    expect(button3).not.toBeNull();
    button3.click();

    // Video's rate should now be 3
    expect(video.playbackRate).toBe(3);

    // Further attempts to set rate externally should be ignored and redirected to 3
    video.playbackRate = 1.5;
    expect(video.playbackRate).toBe(3);
  });

  test('should inject custom speed buttons in an ascending speed panel', () => {
    document.body.innerHTML = `
      <div class="speed-menu">
        <button class="spd-btn">1x</button>
        <button class="spd-btn">1.5x</button>
        <button class="spd-btn">2x</button>
      </div>
    `;

    runContentScript();
    jest.advanceTimersByTime(100);

    const container = document.querySelector('.speed-menu');
    expect(container.hasAttribute('data-spd-enhanced')).toBe(true);

    // The EXTRA_SPEEDS are [2.5, 3, 3.5, 4]
    // They should be appended in ascending order at the end of the container
    const children = Array.from(container.children);
    expect(children.length).toBe(7); // 3 native + 4 custom

    expect(children[3].getAttribute('data-spd-rate')).toBe('2.5');
    expect(children[3].textContent).toContain('2.5');
    expect(children[4].getAttribute('data-spd-rate')).toBe('3');
    expect(children[4].textContent).toContain('3');
    expect(children[5].getAttribute('data-spd-rate')).toBe('3.5');
    expect(children[5].textContent).toContain('3.5');
    expect(children[6].getAttribute('data-spd-rate')).toBe('4');
    expect(children[6].textContent).toContain('4');
  });

  test('should inject custom speed buttons in a descending speed panel', () => {
    document.body.innerHTML = `
      <div class="speed-menu">
        <button class="spd-btn">2x</button>
        <button class="spd-btn">1.5x</button>
        <button class="spd-btn">1x</button>
      </div>
    `;

    runContentScript();
    jest.advanceTimersByTime(100);

    const container = document.querySelector('.speed-menu');
    expect(container.hasAttribute('data-spd-enhanced')).toBe(true);

    // They should be prepended in descending order at the start of the container
    const children = Array.from(container.children);
    expect(children.length).toBe(7); // 4 custom + 3 native

    expect(children[0].getAttribute('data-spd-rate')).toBe('4');
    expect(children[0].textContent).toContain('4');
    expect(children[1].getAttribute('data-spd-rate')).toBe('3.5');
    expect(children[1].textContent).toContain('3.5');
    expect(children[2].getAttribute('data-spd-rate')).toBe('3');
    expect(children[2].textContent).toContain('3');
    expect(children[3].getAttribute('data-spd-rate')).toBe('2.5');
    expect(children[3].textContent).toContain('2.5');
  });

  test('should update button styling and tick mark on clicking custom speed button', () => {
    document.body.innerHTML = `
      <div class="speed-menu">
        <button class="spd-btn active">1x</button>
        <button class="spd-btn">1.5x</button>
        <button class="spd-btn">2x</button>
      </div>
    `;

    const video = document.createElement('video');
    document.body.appendChild(video);

    runContentScript();
    jest.advanceTimersByTime(100);

    const button3 = document.querySelector('[data-spd-rate="3"]');
    button3.click();

    expect(video.playbackRate).toBe(3);
    expect(button3.getAttribute('data-spd-active')).toBe('true');
    expect(button3.classList.contains('active')).toBe(true);
    expect(button3.textContent).toContain('✓ 3');

    // Other buttons should not be active, and native buttons should have spd-native-inactive class
    const button1 = document.querySelectorAll('.spd-btn')[0]; // native 1x
    expect(button1.classList.contains('active')).toBe(false);
    expect(button1.classList.contains('spd-native-inactive')).toBe(true);
    expect(button1.textContent).not.toContain('✓');
  });

  test('should update enforcedRate and UI state when native buttons are clicked', () => {
    document.body.innerHTML = `
      <div class="speed-menu">
        <button class="spd-btn">1x</button>
        <button class="spd-btn">1.5x</button>
        <button class="spd-btn">2x</button>
      </div>
    `;

    const video = document.createElement('video');
    document.body.appendChild(video);

    runContentScript();
    jest.advanceTimersByTime(100);

    const button15 = document.querySelectorAll('.spd-btn')[1]; // native 1.5x
    button15.click();

    // Clicking native button updates enforcedRate.
    // Thus any write to video.playbackRate should be redirected to 1.5!
    video.playbackRate = 2.0;
    expect(video.playbackRate).toBe(1.5);

    expect(button15.classList.contains('active')).toBe(true);
    expect(button15.textContent).toContain('✓ 1.5');

    // custom buttons should be inactive
    const button3 = document.querySelector('[data-spd-rate="3"]');
    expect(button3.getAttribute('data-spd-active')).toBe('false');
    expect(button3.classList.contains('active')).toBe(false);
  });

  test('should enforce rate on external ratechange events', () => {
    document.body.innerHTML = `
      <div class="speed-menu">
        <button class="spd-btn">1x</button>
        <button class="spd-btn">1.5x</button>
        <button class="spd-btn">2x</button>
      </div>
    `;

    const video = document.createElement('video');
    document.body.appendChild(video);

    runContentScript();
    jest.advanceTimersByTime(100);

    // 1. With enforcedRate = null:
    // Bypass monkeypatch to set to 1.5
    originalDescriptor.set.call(video, 1.5);
    // Since there's no enforcedRate, dispatching ratechange doesn't force it back
    video.dispatchEvent(new Event('ratechange', { bubbles: true }));
    expect(originalDescriptor.get.call(video)).toBe(1.5);

    // 2. With enforcedRate = 3:
    const button3 = document.querySelector('[data-spd-rate="3"]');
    button3.click(); // This sets enforcedRate = 3 and applies it (video.playbackRate = 3)
    expect(originalDescriptor.get.call(video)).toBe(3);

    // Try to bypass monkeypatch and set to 1.5
    originalDescriptor.set.call(video, 1.5);

    // Since the ratechange event is synchronously dispatched by originalDescriptor.set in JSDOM,
    // the capture listener on document should have synchronously restored it back to 3!
    expect(originalDescriptor.get.call(video)).toBe(3);
  });

  test('should broadcast speed changes to iframe windows', () => {
    document.body.innerHTML = `
      <div class="speed-menu">
        <button class="spd-btn">1x</button>
        <button class="spd-btn">1.5x</button>
        <button class="spd-btn">2x</button>
      </div>
      <iframe id="test-iframe"></iframe>
    `;

    const iframe = document.getElementById('test-iframe');
    const mockPostMessage = jest.fn();
    // JSDOM has iframe.contentWindow
    Object.defineProperty(iframe, 'contentWindow', {
      value: { postMessage: mockPostMessage },
      writable: true,
    });

    runContentScript();
    jest.advanceTimersByTime(100);

    const button3 = document.querySelector('[data-spd-rate="3"]');
    button3.click();

    expect(mockPostMessage).toHaveBeenCalledWith(
      { type: 'echo360-speed-enhancer-set-rate', rate: 3 },
      '*'
    );
  });

  test('should listen to message broadcasts from other frames', () => {
    document.body.innerHTML = `
      <div class="speed-menu">
        <button class="spd-btn">1x</button>
        <button class="spd-btn">1.5x</button>
        <button class="spd-btn">2x</button>
      </div>
    `;

    const video = document.createElement('video');
    document.body.appendChild(video);

    runContentScript();
    jest.advanceTimersByTime(100);

    // Simulate receiving a broadcast from parent frame
    const event = new MessageEvent('message', {
      data: { type: 'echo360-speed-enhancer-set-rate', rate: 3.5 },
    });
    window.dispatchEvent(event);

    expect(video.playbackRate).toBe(3.5);
    const button35 = document.querySelector('[data-spd-rate="3.5"]');
    expect(button35.getAttribute('data-spd-active')).toBe('true');
  });

  test('should update control-bar speed toggle buttons', () => {
    document.body.innerHTML = `
      <div class="speed-menu">
        <button class="spd-btn">1x</button>
        <button class="spd-btn">1.5x</button>
        <button class="spd-btn">2x</button>
      </div>
      <div class="player-controls">
        <button class="player-speed-toggle-btn">1x</button>
      </div>
    `;

    runContentScript();
    jest.advanceTimersByTime(100);

    const toggleBtn = document.querySelector('.player-speed-toggle-btn');
    expect(toggleBtn.textContent).toBe('1x');

    // Click custom speed button 3x
    const button3 = document.querySelector('[data-spd-rate="3"]');
    button3.click();

    expect(toggleBtn.textContent).toBe('3x');
  });
});
