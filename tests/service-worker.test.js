import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

test('service worker upgrades preserve other applications on the same origin',async()=>{
  const listeners=new Map(),deleted=[];
  const current='pixellilt-shell-v4',previous='pixellilt-shell-v3',unrelated='another-app-shell-v1';
  const context={
    self:{addEventListener:(name,callback)=>listeners.set(name,callback),clients:{claim:async()=>{}}},
    caches:{keys:async()=>[previous,current,unrelated],delete:async name=>{deleted.push(name);return true}},URL
  };
  vm.runInNewContext(await readFile(new URL('../sw.js',import.meta.url),'utf8'),context);
  let completion;
  listeners.get('activate')({waitUntil:promise=>{completion=promise}});
  await completion;
  assert.deepEqual(deleted,[previous]);
});
