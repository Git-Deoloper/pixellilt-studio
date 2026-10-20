# Deployment

PixelLilt is a static site. It needs no API keys, server-side rendering, accounts, database, or paid runtime service. Build output is generated into `dist/`.

## Cloudflare Pages

1. Push the project to a new GitHub repository.
2. In Cloudflare, create a Pages project using that repository.
3. Set the build command to `npm run build` and the build output directory to `dist`.
4. Deploy. Verify that response headers from `_headers` are applied on your domain.

## Netlify

Import the repository into Netlify, use `npm run build` as the build command and `dist` as the publish directory. The `_headers` file applies to the deployed static site.

## Other static hosts

Run `npm ci && npm run build` and upload the contents of `dist/` to any HTTPS static web host. Configure equivalent response headers from `_headers` at the host/CDN, since not every host understands that file.

## Before announcing the live website

- Serve over HTTPS and check the service worker/offline behavior.
- Test uploads, image formats, browser storage, ZIP downloads, keyboard navigation, and mobile sizing in real browsers.
- Update `index.html` with your deployed absolute canonical URL and a fully qualified `og:image` URL; a relative Open Graph image URL may not render reliably in social previews.
- Add a production sitemap once you know the final public URL; point to it from `robots.txt`.
- Verify there are no unintended network requests while processing a user-selected image.
- Check image output quality on real sample files, including transparency and animated GIF inputs.
- Confirm the brand and any domain are available for your intended use.

You can share the public source repository before setting up a domain, but visitors need a live HTTPS deployment to use the app immediately.
