/** Deterministic dependency-free static production build. */
import {cp, mkdir, rm, readFile, stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';
const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const destination=join(root,'dist');
const files=['index.html','styles.css','sw.js','manifest.webmanifest','robots.txt','_headers','assets/favicon.svg','assets/social-card.svg','assets/social-card.png','assets/icon-192.png','assets/icon-512.png','src/app.js','src/core.js','src/zip.js'];
await rm(destination,{recursive:true,force:true});
for(const file of files){
  const source=join(root,file),target=join(destination,file);
  await stat(source);await mkdir(dirname(target),{recursive:true});await cp(source,target);
}
const html=await readFile(join(destination,'index.html'),'utf8');
for(const token of ['id="studio"','id="file-input"','src="src/app.js"','href="styles.css"']){
  if(!html.includes(token))throw new Error(`Missing critical interface reference: ${token}`);
}
console.log(`Production site ready in dist/ (${files.length} assets; no server required).`);
