/**
 * @jest-environment jsdom
 */

const { getAllVideos } = require('../content.js');

describe('getAllVideos', () => {
  beforeEach(() => {
    // Clear DOM before each test
    document.body.innerHTML = '';
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('collects videos from the main document', () => {
    const v1 = document.createElement('video');
    const v2 = document.createElement('video');
    document.body.appendChild(v1);
    document.body.appendChild(v2);

    const result = getAllVideos();
    expect(result).toHaveLength(2);
    expect(result).toContain(v1);
    expect(result).toContain(v2);
  });

  it('collects videos from same-origin iframes', () => {
    const iframe = document.createElement('iframe');
    document.body.appendChild(iframe);

    // Mock iframe.contentDocument (JSDOM handles same-origin iframes well if they are empty)
    const v1 = document.createElement('video');
    iframe.contentDocument.body.appendChild(v1);

    const result = getAllVideos();
    expect(result).toHaveLength(1);
    expect(result).toContain(v1);
  });

  it('safely handles cross-origin iframes that throw security errors', () => {
    const v0 = document.createElement('video');
    document.body.appendChild(v0);

    const iframe = document.createElement('iframe');
    document.body.appendChild(iframe);

    // Override the contentDocument getter to throw a cross-origin error
    Object.defineProperty(iframe, 'contentDocument', {
      get: () => {
        throw new Error('Blocked a frame with origin "null" from accessing a cross-origin frame.');
      }
    });
    Object.defineProperty(iframe, 'contentWindow', {
      get: () => {
        throw new Error('Blocked a frame with origin "null" from accessing a cross-origin frame.');
      }
    });

    // Should not crash and should return the video from the main document
    const result = getAllVideos();
    expect(result).toHaveLength(1);
    expect(result).toContain(v0);
  });
});
