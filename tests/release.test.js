import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, stat} from 'node:fs/promises';
import {resolve} from 'node:path';

const root=resolve(import.meta.dirname,'..');
const read=path=>readFile(resolve(root,path),'utf8');

test('site uses one public brand and no third-party runtime scripts',async()=>{
  const html=await read('index.html');
  assert.match(html,/PixelLilt Studio/);
  assert.doesNotMatch(html,/drop\s*shrink/i);
  assert.doesNotMatch(html,/<script[^>]+src=['"]https?:/i);
  assert.doesNotMatch(html,/google-analytics|googletagmanager|hotjar|segment\.io/i);
});

test('release has a restrictive security policy and no runtime dependencies',async()=>{
  const headers=await read('_headers');
  const pkg=JSON.parse(await read('package.json'));
  assert.match(headers,/Content-Security-Policy:/);
  assert.match(headers,/default-src 'none'/);
  assert.doesNotMatch(headers,/unsafe-inline|unsafe-eval/);
  assert.equal(Object.keys(pkg.dependencies||{}).length,0);
  assert.equal(Object.keys(pkg.devDependencies||{}).length,0);
});

test('first-party browser resources stay under a small transfer budget',async()=>{
  const files=['index.html','styles.css','sw.js','src/app.js','src/core.js','src/zip.js'];
  const sizes=await Promise.all(files.map(async p=>(await stat(resolve(root,p))).size));
  assert.ok(sizes.reduce((a,b)=>a+b,0)<128*1024,'browser JS, HTML and CSS must remain under 128 KiB uncompressed');
});


test('PWA icons, social preview, and deployment docs are packaged',async()=>{
  const manifest=JSON.parse(await read('manifest.webmanifest'));
  const iconSizes=new Set(manifest.icons.map(icon=>icon.sizes));
  assert.ok(iconSizes.has('192x192'));
  assert.ok(iconSizes.has('512x512'));
  const html=await read('index.html');
  assert.match(html,/assets\/social-card\.png/);
  for(const file of ['assets/icon-192.png','assets/icon-512.png','assets/social-card.png','docs/DEPLOYMENT.md']) {
    assert.ok((await stat(resolve(root,file))).size>100, `${file} missing or empty`);
  }
});

test('public README links to supported contributor and deployment docs',async()=>{
  const readme=await read('README.md');
  for(const heading of ['## Run locally','## Build and test','## Privacy and security','## Contributing']){
    assert.ok(readme.includes(heading));
  }
  for(const link of ['docs/DEPLOYMENT.md','CONTRIBUTING.md','SECURITY.md']){
    assert.ok(readme.includes(link));
  }
});
