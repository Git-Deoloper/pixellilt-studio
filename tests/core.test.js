import test from 'node:test';
import assert from 'node:assert/strict';
import {formatBytes, planDimensions, normalizedStem, outputName, savingsPercentage, validateSettings, fileIssue, LIMITS} from '../src/core.js';
import {buildZip, crc32} from '../src/zip.js';

test('human friendly sizes and savings', () => {
  assert.equal(formatBytes(0),'0 B');
  assert.equal(formatBytes(1024),'1.00 KB');
  assert.equal(formatBytes(-1),'—');
  assert.equal(savingsPercentage(100,25),75);
  assert.equal(savingsPercentage(0,0),0);
});
test('safe proportional resizing never enlarges', () => {
  assert.deepEqual(planDimensions(4000,2000,1200),{width:1200,height:600});
  assert.deepEqual(planDimensions(800,600,1200),{width:800,height:600});
  assert.deepEqual(planDimensions(10000,1000,0),{width:8192,height:819});
  assert.throws(()=>planDimensions(100000,200000,1200), /safety limit/);
  assert.throws(()=>planDimensions(0,0,0), /Invalid/);
});
test('prevents unsafe filenames and collisions', () => {
  assert.equal(normalizedStem('../../x<>?.jpg'),'x');
  const used = new Set();
  assert.equal(outputName('hello.png','webp',used),'hello.webp');
  assert.equal(outputName('HELLO.jpg','webp',used),'HELLO-2.webp');
  assert.equal(outputName('c\\d.PNG','jpeg',used),'d.jpg');
});
test('validates UI settings and file safety', () => {
  assert.deepEqual(validateSettings({format:'png',quality:80,maxEdge:1920}),{format:'png',quality:80,maxEdge:1920});
  assert.throws(()=>validateSettings({format:'svg',quality:80,maxEdge:0}));
  assert.throws(()=>validateSettings({format:'png',quality:200,maxEdge:0}));
  assert.equal(fileIssue({type:'image/svg+xml',size:100})?.startsWith('Unsupported'),true);
  assert.equal(fileIssue({type:'image/png',size:LIMITS.maxFileBytes+1})?.includes('30 MB'),true);
});
test('CRC32 known standard check vector',()=>{
  assert.equal(crc32(new TextEncoder().encode('123456789')),0xcbf43926);
});
test('creates standards-compatible ZIP headers with UTF-8 and rejects unsafe entries',()=>{
  const zip=buildZip([{name:'résumé.webp',bytes:new Uint8Array([1,2,3])}]);
  const view=new DataView(zip.buffer);
  assert.equal(view.getUint32(0,true),0x04034b50);
  assert.equal(view.getUint16(6,true),0x0800);
  assert.equal(view.getUint32(zip.length-22,true),0x06054b50);
  assert.throws(()=>buildZip([{name:'../a.png',bytes:new Uint8Array(0)},{name:'a.png',bytes:new Uint8Array(0)}]),/Duplicate/);
});
