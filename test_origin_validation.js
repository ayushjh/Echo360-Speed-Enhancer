/**
 * Test Suite for origin validation logic.
 * Reads content.js, extracts the `isAllowedOrigin` function via Regex or evaluating
 * in a mocked environment, and runs test assertions.
 */

const fs = require('fs');
const path = require('path');

// Read content.js
const contentJsPath = path.join(__dirname, 'content.js');
const contentJsCode = fs.readFileSync(contentJsPath, 'utf8');

// Use Regex to extract the body of `isAllowedOrigin`
const isAllowedOriginRegex = /function isAllowedOrigin\(origin\) \{([\s\S]*?)\n  \}/;
const match = contentJsCode.match(isAllowedOriginRegex);

if (!match) {
  console.error("Error: Could not find `isAllowedOrigin` function in `content.js`.");
  process.exit(1);
}

const functionBody = match[1];

// Re-create the function under a test context
function makeIsAllowedOrigin(windowOrigin) {
  const window = {
    location: {
      origin: windowOrigin
    }
  };
  // Return the function bound to our mock window context
  return new Function('window', 'URL', `
    return function isAllowedOrigin(origin) {
      ${functionBody}
    }
  `)(window, URL);
}

// Test runner helper
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`[PASS] ${message}`);
  } else {
    failed++;
    console.error(`[FAIL] ${message}`);
  }
}

console.log("Starting Echo360 Speed Enhancer - Origin Validation Security Tests...\n");

// Set the window origin to a typical Echo360 portal page
const testWindowOrigin = "https://echo360.com.au";
const isAllowedOrigin = makeIsAllowedOrigin(testWindowOrigin);

// Test same-origin
assert(isAllowedOrigin("https://echo360.com.au") === true, "Should allow exactly same-origin");

// Test valid Echo360 domains
assert(isAllowedOrigin("https://echo360.com") === true, "Should allow https://echo360.com");
assert(isAllowedOrigin("https://sub.echo360.com") === true, "Should allow subdomains of echo360.com");
assert(isAllowedOrigin("https://echo360.org.au") === true, "Should allow https://echo360.org.au");
assert(isAllowedOrigin("https://sub.echo360.org.au") === true, "Should allow subdomains of echo360.org.au");
assert(isAllowedOrigin("https://echo360.net.au") === true, "Should allow https://echo360.net.au");
assert(isAllowedOrigin("https://sub.echo360.net.au") === true, "Should allow subdomains of echo360.net.au");

// Test HTTP vs HTTPS protocols
assert(isAllowedOrigin("http://echo360.com") === true, "Should allow http version of echo360.com");

// Test malicious / spoofed domains
assert(isAllowedOrigin("https://fakeecho360.com") === false, "Should block domains that end in but are not subdomains (fakeecho360.com)");
assert(isAllowedOrigin("https://echo360.com.evil.com") === false, "Should block subdomain takeovers or trailing domains (echo360.com.evil.com)");
assert(isAllowedOrigin("https://echo360.net.au.evil.com") === false, "Should block echo360.net.au.evil.com");
assert(isAllowedOrigin("https://evil-echo360.com") === false, "Should block evil-echo360.com");

// Test other invalid / empty origins
assert(isAllowedOrigin(null) === false, "Should block null origin");
assert(isAllowedOrigin(undefined) === false, "Should block undefined origin");
assert(isAllowedOrigin("") === false, "Should block empty origin");
assert(isAllowedOrigin("not-a-valid-url") === false, "Should block malformed urls");
assert(isAllowedOrigin("javascript:alert(1)") === false, "Should block non http/https protocols like javascript:");
assert(isAllowedOrigin("file:///usr/bin") === false, "Should block non http/https protocols like file:");

// Test when the page itself runs under a different domain (e.g. echo360.net.au)
const netAuOrigin = "https://echo360.net.au";
const isAllowedOriginNetAu = makeIsAllowedOrigin(netAuOrigin);
assert(isAllowedOriginNetAu("https://echo360.net.au") === true, "Should allow same-origin for net.au");
assert(isAllowedOriginNetAu("https://echo360.com") === true, "Should allow echo360.com even when window origin is echo360.net.au");
assert(isAllowedOriginNetAu("https://evil.com") === false, "Should block evil.com when window origin is echo360.net.au");

console.log(`\nTests finished: ${passed} passed, ${failed} failed.`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log("All origin validation tests passed successfully! 🔒");
}
