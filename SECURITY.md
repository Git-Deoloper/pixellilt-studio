# Security policy

## Design

PixelLilt is a static client-only image processor. It has no upload API, third-party dependencies, client-side analytics, accounts, or remote scripts. Images are decoded and re-encoded using browser canvas APIs. Exported images have common image metadata stripped by canvas re-encoding; do not assume this is a full forensic metadata sanitization tool.

For maximum protection: host over HTTPS, preserve the `/_headers` security policy in production, avoid adding external JavaScript, do not process untrusted file types beyond the allowlist, and maintain a small file-size budget. The local development server serves only explicit public assets.

## Threats and tradeoffs

- Malformed image files are parsed by the browser's image decoder; keep browsers updated.
- Large images may exhaust memory. Input limits are 20 files, 30 MiB per file, 150 MiB per batch, and 50 MP per source. Encoded results and ZIP creation also use device memory.
- Animated GIFs become one still frame and color profiles may change after decoding.
- PWA cache stores only application assets, not user images. The service worker is optional.
- `/_headers` applies to hosts supporting Netlify-style custom response headers, such as Cloudflare Pages and Netlify. If hosting elsewhere, recreate these headers in the CDN or web server.
- The no-upload design is implemented by the absence of upload code and limited by CSP `connect-src 'self'` (no external connections; same-origin fetch is needed by the offline service worker), but extensions, malicious browser software, or the host page itself may alter the threat model. Only trust deployments you control.
- Action versions in CI are major release tags rather than immutable SHA pins. Pin audited action SHAs before high-trust production use.

## Reporting vulnerabilities

Please **do not publish exploit details in a public issue**. Use the repository’s **Security → Report a vulnerability** action when private vulnerability reporting is available. Please do not disclose exploit details in a public issue. If private reporting is unavailable, open a non-sensitive issue requesting a private contact method.

Do not commit passwords, credentials, or personal image files. Immediately revoke any accidentally exposed credentials and report sensitive security issues through a private channel.
