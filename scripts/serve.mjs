import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const port=Number(process.env.PORT||4173);
const allowlist=new Map([
  ['/','index.html'],['/index.html','index.html'],['/styles.css','styles.css'],['/sw.js','sw.js'],
  ['/manifest.webmanifest','manifest.webmanifest'],['/robots.txt','robots.txt'],
  ['/src/app.js','src/app.js'],['/src/core.js','src/core.js'],['/src/zip.js','src/zip.js'],
  ['/assets/favicon.svg','assets/favicon.svg'],['/assets/social-card.svg','assets/social-card.svg'],['/assets/social-card.png','assets/social-card.png'],['/assets/icon-192.png','assets/icon-192.png'],['/assets/icon-512.png','assets/icon-512.png']
]);
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json','.txt':'text/plain; charset=utf-8'};
const extension=path=>path.substring(path.lastIndexOf('.'));
const headers={
 'X-Content-Type-Options':'nosniff', 'Referrer-Policy':'no-referrer', 'X-Frame-Options':'DENY',
 'Permissions-Policy':'camera=(), microphone=(), geolocation=(), payment=(), usb=(), accelerometer=(), gyroscope=()',
 'Content-Security-Policy':"default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; img-src 'self' blob: data:; font-src 'self'; style-src 'self'; script-src 'self'; connect-src 'self'; worker-src 'self'; manifest-src 'self'",
 'Cross-Origin-Opener-Policy':'same-origin','Cross-Origin-Resource-Policy':'same-origin',
 'Cache-Control':'no-cache'
};
if(!Number.isInteger(port)||port<1||port>65535)throw new Error('Invalid PORT');
const server=createServer(async(req,res)=>{
  for(const [key,value] of Object.entries(headers))res.setHeader(key,value);
  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405,{'Allow':'GET, HEAD'});res.end();return;}
  let pathname;
  try{pathname=new URL(req.url,'http://localhost').pathname;}catch{res.writeHead(400);res.end();return;}
  const relative=allowlist.get(pathname);
  if(!relative){res.writeHead(404,{'Content-Type':'text/plain'});res.end('Not found');return;}
  try{
    const data=await readFile(join(root,relative));
    res.writeHead(200,{'Content-Type':types[extension(relative)]||'application/octet-stream','Content-Length':data.length});
    if(req.method==='HEAD')res.end();else res.end(data);
  }catch{res.writeHead(500);res.end('File unavailable');}
});
server.listen(port,'127.0.0.1',()=>console.log(`PixelLilt running at http://localhost:${port}`));
