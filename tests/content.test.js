const vm = require('vm');
const fs = require('fs');
const path = require('path');

const contentSrc = fs.readFileSync(path.resolve(__dirname, '../content.js'), 'utf-8');

describe('broadcastRate cross-origin errors', () => {
  let context;

  beforeEach(() => {
    // Setup a clean VM context for each test
    context = vm.createContext({
      window: {
        addEventListener: () => {}
      },
      document: {
        querySelectorAll: (selector) => {
          if (selector === 'iframe') {
            return context.__mockIframes || [];
          }
          return [];
        },
        documentElement: {},
        addEventListener: () => {}
      },
      HTMLMediaElement: { prototype: {} },
      MutationObserver: class { observe() {} },
      module: { exports: {} },
      setTimeout: setTimeout,
      clearTimeout: clearTimeout,
      console: console
    });
  });

  it('should swallow errors when posting to iframe contentWindow throws', () => {
    // Mock window === window.top
    context.window.top = context.window;

    // Mock an iframe whose contentWindow throws
    context.__mockIframes = [{
      get contentWindow() {
        throw new Error('Cross-origin access denied');
      }
    }];

    vm.runInContext(contentSrc, context);

    expect(() => {
      context.module.exports.broadcastRate(2.0);
    }).not.toThrow();
  });

  it('should swallow errors when getting window.parent throws', () => {
    // Mock window !== window.top
    context.window.top = {};

    Object.defineProperty(context.window, 'parent', {
      get() {
        throw new Error('Cross-origin parent access denied');
      }
    });

    vm.runInContext(contentSrc, context);

    expect(() => {
      context.module.exports.broadcastRate(2.0);
    }).not.toThrow();
  });

  it('should swallow errors when window.parent.postMessage throws', () => {
    // Mock window !== window.top
    context.window.top = {};

    context.window.parent = {
      postMessage: () => {
        throw new Error('postMessage access denied');
      }
    };

    vm.runInContext(contentSrc, context);

    expect(() => {
      context.module.exports.broadcastRate(2.0);
    }).not.toThrow();
  });

  it('should actually post message to iframe contentWindow if accessible', () => {
    context.window.top = context.window;

    let postedMessage = null;
    let targetOrigin = null;

    context.__mockIframes = [{
      contentWindow: {
        postMessage: (msg, origin) => {
          postedMessage = msg;
          targetOrigin = origin;
        }
      }
    }];

    vm.runInContext(contentSrc, context);
    context.module.exports.broadcastRate(2.5);

    expect(postedMessage).toEqual({ type: 'echo360-speed-enhancer-set-rate', rate: 2.5 });
    expect(targetOrigin).toBe('*');
  });

  it('should actually post message to window.parent if accessible and not top window', () => {
    context.window.top = {};

    let postedMessage = null;
    let targetOrigin = null;

    context.window.parent = {
      postMessage: (msg, origin) => {
        postedMessage = msg;
        targetOrigin = origin;
      }
    };

    vm.runInContext(contentSrc, context);
    context.module.exports.broadcastRate(3.0);

    expect(postedMessage).toEqual({ type: 'echo360-speed-enhancer-set-rate', rate: 3.0 });
    expect(targetOrigin).toBe('*');
  });
});
