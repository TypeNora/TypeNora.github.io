# Known Issues

- Service worker registration has no error handling; failures are silent (see `index.html` lines 385-390).
- Animation loop uses `setInterval` instead of `requestAnimationFrame`, which may cause jank on some devices (`index.html` line 302).
- Modern syntax such as nullish coalescing is used without a build step, limiting browser compatibility (`index.html` line 339).
- Service worker pre-cache list duplicates './' and './index.html', and lacks `self.skipWaiting()` for immediate activation (`sw.js` lines 8-24).
- Fetch handler uses optional catch binding and provides only a generic offline fallback (`sw.js` lines 67-70).
- `manifest.webmanifest` is missing a trailing newline, which can cause diff noise in some tools (`manifest.webmanifest` line 21).
