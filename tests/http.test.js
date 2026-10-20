import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {setTimeout as sleep} from 'node:timers/promises';

// Local server integration test: ensures static serving + production safety headers.
test('localhost static server enforces security headers, module MIME types and asset allowlist', {timeout: 10_000}, async () => {
  const port=45000+Math.floor(Math.random()*10000);
  const child=spawn(process.execPath,['scripts/serve.mjs'],{cwd:fileURLToPath(new URL('..',import.meta.url)),env:{...process.env,PORT:String(port)},stdio:'ignore'});
  try{
    let res=null;
    for(let i=0;i<30;i++){
      try{res=await fetch(`http://127.0.0.1:${port}/`);break;}catch{await sleep(100);}
    }
    assert.ok(res,'Server did not start');
    assert.equal(res.status,200);
    assert.match(res.headers.get('content-security-policy'), /script-src 'self'/);
    assert.match(res.headers.get('content-security-policy'), /connect-src 'self'/);
    assert.equal(res.headers.get('x-content-type-options'),'nosniff');
    assert.match(await res.text(),/PixelLilt Studio/);
    const script=await fetch(`http://127.0.0.1:${port}/src/app.js`);
    assert.equal(script.status,200);
    assert.match(script.headers.get('content-type'),/text\/javascript/);
    assert.equal((await fetch(`http://127.0.0.1:${port}/SECURITY.md`)).status,404);
    assert.equal((await fetch(`http://127.0.0.1:${port}/.git/config`)).status,404);
    assert.equal((await fetch(`http://127.0.0.1:${port}/`,{method:'POST'})).status,405);
  }finally{child.kill();}
});
