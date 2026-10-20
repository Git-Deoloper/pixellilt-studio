# Quality assurance matrix

## Automated (runs in CI)

`npm run verify` checks JavaScript syntax, Node unit/integration tests, and the static production build. ZIP interoperability should be checked against an independent ZIP reader. Complete the manual browser matrix below before deploying to a new production environment.

## Manual browser acceptance

| Scenario | Chrome | Firefox | Safari on macOS | Safari on iPhone |
|---|---|---|---|---|
| Landing, FAQ and responsive layouts | □ | □ | □ | □ |
| Keyboard-select file and drag-and-drop | □ | □ | □ | □ |
| Try a sample, convert to JPG | □ | □ | □ | □ |
| Export WebP/JPG/PNG and inspect actual bytes | □ | □ | □ | □ |
| Transparent PNG to white-background JPG | □ | □ | □ | □ |
| Export from AVIF and animated GIF (first frame) | □ | □ | □ | □ |
| Resize to 640 and verify aspect ratio | □ | □ | □ | □ |
| Duplicate input filename collision handling | □ | □ | □ | □ |
| ZIP download and unzip all outputs | □ | □ | □ | □ |
| Disabled actions during processing | □ | □ | □ | □ |
| Offline use after first HTTPS load | □ | □ | □ | □ |
| No requests carrying image data in Network inspector | □ | □ | □ | □ |
| No console exceptions and no horizontal overflow | □ | □ | □ | □ |

Also test invalid/malformed files, large images near limits, repeated import/clear, no-JavaScript messaging if accessibility requirements demand it, `prefers-reduced-motion`, high zoom, keyboard focus, and VoiceOver/NVDA labels. Performance and memory need real-device testing; do not claim all browsers are verified before completing this matrix.
