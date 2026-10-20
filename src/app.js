import {LIMITS, OUTPUT_TYPES, fileIssue, formatBytes, outputName, planDimensions, savingsPercentage, validateSettings} from './core.js';
import {buildZip} from './zip.js';

const $ = selector => document.querySelector(selector);
const elements = {
  picker: $('#file-input'), dropzone: $('#dropzone'), demo: $('#demo-btn'),
  fileList: $('#file-list'), empty: $('#queue-empty'), count: $('#file-count'),
  clear: $('#clear-btn'), summary: $('#queue-summary'), queueTotal: $('#queue-total'), processedTotal: $('#processed-total'),
  format: $('#format'), quality: $('#quality'), qualityValue: $('#quality-value'), qualityGroup: $('#quality-group'), maxEdge: $('#max-edge'),
  process: $('#process-btn'), zip: $('#download-all-btn'), status: $('#studio-status'), toast: $('#toast')
};
const state = {items:[], busy:false, importing:false, nextId:1, toastTimer:null};
$('#current-year').textContent = new Date().getFullYear().toString();

function announce(message, isError=false) {
  elements.status.textContent = message;
  elements.status.classList.toggle('error',isError);
}
function toast(message) {
  clearTimeout(state.toastTimer);
  elements.toast.textContent = message;
  elements.toast.hidden = false;
  state.toastTimer = setTimeout(()=>{ elements.toast.hidden = true; },4300);
}
function settings() { return validateSettings({format:elements.format.value, quality:elements.quality.value,maxEdge:Number(elements.maxEdge.value)}); }
function makeElement(tag, className, content) {
  const el = document.createElement(tag);
  if (className) el.className=className;
  if (content !== undefined) el.textContent=String(content);
  return el;
}
function makeButton(label, title, onClick, disabled=false) {
  const button=makeElement('button','icon-btn',label);
  button.type='button'; button.title=title; button.setAttribute('aria-label',title); button.disabled=disabled;
  button.addEventListener('click',onClick);
  return button;
}
function render() {
  const count=state.items.length;
  const ready=state.items.filter(item=>item.resultBlob && item.status==='done');
  elements.count.textContent=String(count);
  elements.empty.hidden=count>0;
  elements.summary.hidden=count===0;
  elements.clear.disabled=count===0 || state.busy || state.importing;
  elements.process.disabled=count===0 || state.busy || state.importing;
  elements.zip.disabled=ready.length===0 || state.busy;
  elements.picker.disabled=state.busy || state.importing;
  elements.dropzone.setAttribute('aria-disabled',String(state.busy || state.importing));
  elements.queueTotal.textContent=`${formatBytes(state.items.reduce((sum,item)=>sum+item.file.size,0))} across ${count} ${count===1?'image':'images'}`;
  elements.processedTotal.textContent=ready.length ? `${ready.length} optimized • ${formatBytes(ready.reduce((sum,item)=>sum+item.resultBlob.size,0))}` : 'Ready when you are';
  elements.fileList.replaceChildren();
  for (const item of state.items) {
    const row=makeElement('li','file-item');
    const image=makeElement('img','file-thumb'); image.src=item.url; image.alt=''; image.loading='lazy';
    row.append(image);
    const info=makeElement('div','file-info');
    const name=makeElement('div','file-name',item.file.name); name.title=item.file.name; info.append(name);
    const dimensionText=item.width&&item.height?`${item.width} × ${item.height}`:'Dimensions unknown';
    info.append(makeElement('div','file-meta',`${formatBytes(item.file.size)}  ·  ${dimensionText}`));
    if(item.status==='done' && item.resultBlob){
      const saved=savingsPercentage(item.file.size,item.resultBlob.size);
      const result=makeElement('div',saved>=0?'file-results':'file-results grew',`${formatBytes(item.resultBlob.size)}  ·  ${saved>=0?`${saved}% smaller`:`${Math.abs(saved)}% larger`}  ·  ${item.outputFileName}`);
      info.append(result);
    } else if(item.status==='error') info.append(makeElement('div','file-results is-error',item.error));
    else if(item.status==='processing') info.append(makeElement('div','file-results','Optimizing…'));
    row.append(info);
    const actions=makeElement('div','file-actions');
    actions.append(makeButton('↓',`Download ${item.file.name}`,()=>downloadItem(item),!item.resultBlob||item.status!=='done'||state.busy));
    actions.append(makeButton('×',`Remove ${item.file.name}`,()=>removeItem(item.id),state.busy));
    row.append(actions); elements.fileList.append(row);
  }
}
function resetResults() {
  if(state.busy) return;
  for(const item of state.items){item.resultBlob=null;item.outputFileName=null;item.status='queued';item.error=null;}
  render();
  announce(state.items.length?'Settings changed. Optimize images to apply them.':'Choose images to begin.');
}
function updateQuality() {
  elements.qualityValue.textContent=`${elements.quality.value}%`;
  const isLossless=elements.format.value==='png';
  elements.qualityGroup.hidden=isLossless;
  resetResults();
}
for (const control of [elements.format,elements.maxEdge]) control.addEventListener('change',()=>{if(control===elements.format)updateQuality(); else resetResults();});
elements.quality.addEventListener('input',()=>{elements.qualityValue.textContent=`${elements.quality.value}%`;resetResults();});

async function measureImage(url) {
  const image=new Image(); image.decoding='async'; image.src=url;
  if(typeof image.decode==='function') await image.decode();
  else await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(new Error('Unable to decode this image'));});
  const width=image.naturalWidth, height=image.naturalHeight;
  if(!width||!height)throw new Error('Unable to read the image dimensions');
  if(width*height>LIMITS.maxSourcePixels)throw new Error('Image exceeds the 50 megapixel safety limit');
  return {width,height,image};
}
async function importFiles(files) {
  if(state.busy || state.importing) return;
  state.importing=true;
  render();
  let total=state.items.reduce((sum,item)=>sum+item.file.size,0);
  const failures=[];
  for(const file of files) {
    if(state.items.length >= LIMITS.maxFiles){failures.push('Maximum 20 images per batch.');break;}
    const issue=fileIssue(file);
    if(issue){failures.push(`${file.name||'File'}: ${issue}`);continue;}
    if(total+file.size > LIMITS.maxTotalBytes){failures.push('Total batch limit: 150 MB.');break;}
    const url=URL.createObjectURL(file);
    try {
      const {width,height}=await measureImage(url);
      state.items.push({id:state.nextId++,file,url,width,height,status:'queued',error:null,resultBlob:null,outputFileName:null});
      total+=file.size;
    } catch(error){URL.revokeObjectURL(url);failures.push(`${file.name}: ${error.message||'Unable to decode'}`);}
  }
  render();
  if(failures.length){announce(failures.slice(0,2).join(' '),true);toast(`${failures.length} file(s) could not be added.`);}
  else if(state.items.length){announce(`${state.items.length} ${state.items.length===1?'image':'images'} ready to optimize.`);}
  elements.picker.value='';
  state.importing=false;
  render();
}
function removeItem(id) {
  if(state.busy || state.importing)return;
  const index=state.items.findIndex(item=>item.id===id);
  if(index<0)return;
  URL.revokeObjectURL(state.items[index].url);
  state.items.splice(index,1);
  render();
  announce(state.items.length?'Image removed.':'Choose images to begin.');
}
function clearItems() {
  if(state.busy || state.importing)return;
  for (const item of state.items) URL.revokeObjectURL(item.url);
  state.items=[];
  render();announce('Workspace cleared. Your images remained on your device.');
}
function downloadBlob(blob, filename) {
  const url=URL.createObjectURL(blob);
  const anchor=document.createElement('a'); anchor.href=url; anchor.download=filename;
  document.body.append(anchor);anchor.click();anchor.remove();
  setTimeout(()=>URL.revokeObjectURL(url),60_000);
}
function downloadItem(item) {
  if(item.resultBlob && item.status==='done') downloadBlob(item.resultBlob,item.outputFileName);
}
async function convertImage(item, config) {
  const {image,width,height}=await measureImage(item.url);
  const planned=planDimensions(width,height,config.maxEdge);
  const canvas=document.createElement('canvas'); canvas.width=planned.width;canvas.height=planned.height;
  const context=canvas.getContext('2d',{alpha:config.format!=='jpeg'});
  if(!context)throw new Error('Your browser cannot create an image canvas');
  if(config.format==='jpeg'){context.fillStyle='#ffffff';context.fillRect(0,0,planned.width,planned.height);}
  context.imageSmoothingEnabled=true;context.imageSmoothingQuality='high';
  context.drawImage(image,0,0,planned.width,planned.height);
  const expected=OUTPUT_TYPES[config.format];
  const result=await new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Conversion failed: not enough browser memory?')),expected,config.quality/100));
  canvas.width=0;canvas.height=0;
  if(result.type!==expected)throw new Error(`Your browser cannot encode ${config.format.toUpperCase()}. Try JPG or PNG.`);
  return result;
}
async function processAll() {
  if(state.busy||state.importing||!state.items.length)return;
  let config;
  try{config=settings();}catch(error){announce(error.message,true);return;}
  state.busy=true;
  const usedNames=new Set();
  for(const item of state.items){item.resultBlob=null;item.status='queued';item.error=null;item.outputFileName=null;}
  render();
  let completed=0;
  try {
    for(const item of state.items){
      item.status='processing';render();
      announce(`Optimizing ${completed+1} of ${state.items.length}…`);
      await new Promise(resolve=>setTimeout(resolve,0));
      try {
        item.resultBlob=await convertImage(item,config);
        item.outputFileName=outputName(item.file.name,config.format,usedNames);
        item.status='done';completed++;
      } catch(error){item.status='error';item.error=error.message||'Could not optimize this image';}
    }
  } finally {
    state.busy=false;render();
    const errors=state.items.length-completed;
    announce(completed?`${completed} ${completed===1?'image':'images'} ready to download${errors?`; ${errors} failed`:''}.`:`No images could be optimized. Try JPG or PNG.`,!completed);
    toast(completed?`${completed} optimized ${completed===1?'image is':'images are'} ready!`:'Conversion could not finish.');
  }
}
async function downloadZip() {
  if(state.busy||state.importing)return;
  const ready=state.items.filter(item=>item.resultBlob&&item.status==='done');
  if(!ready.length)return;
  state.busy=true;render(); announce('Preparing your ZIP…');
  try{
    const entries=[];
    for(const item of ready)entries.push({name:item.outputFileName,bytes:new Uint8Array(await item.resultBlob.arrayBuffer())});
    const zip=buildZip(entries);
    downloadBlob(new Blob([zip],{type:'application/zip'}),'pixellilt-optimized.zip');
    announce(`${ready.length} ${ready.length===1?'image':'images'} downloaded as a ZIP.`);
  }catch(error){announce(error.message||'Could not prepare ZIP',true);toast('ZIP creation failed. Try individual downloads.');}
  finally{state.busy=false;render();}
}
async function addSample() {
  if(state.busy || state.importing)return;
  if(state.items.length>=LIMITS.maxFiles){toast('Workspace is full. Clear an image to try the sample.');return;}
  try {
    const canvas=document.createElement('canvas');canvas.width=2400;canvas.height=1600;
    const ctx=canvas.getContext('2d');
    const gradient=ctx.createLinearGradient(0,0,2400,1600);gradient.addColorStop(0,'#f8b09d');gradient.addColorStop(.5,'#ddcf96');gradient.addColorStop(1,'#7cbea2');
    ctx.fillStyle=gradient;ctx.fillRect(0,0,2400,1600);
    for(let i=0;i<18;i++) {ctx.beginPath();ctx.arc((i*137+500)%2400,(i*191+270)%1600,150+i*8,0,Math.PI*2);ctx.fillStyle=`hsla(${80+i*18},40%,${38+i%3*9}%,.12)`;ctx.fill();}
    ctx.fillStyle='#213c35';ctx.font='bold 185px system-ui';ctx.fillText('Less weight.',155,720);ctx.fillText('More wow.',155,925);
    ctx.font='40px system-ui';ctx.fillText('A sample made entirely inside your browser',165,1080);
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.95));
    canvas.width=0;canvas.height=0;
    if(!blob)throw new Error('Sample generation failed');
    await importFiles([new File([blob],'try-pixellilt.jpg',{type:'image/jpeg'})]);
    $('#studio').scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
    toast('Sample image added — customize your settings and optimize!');
  }catch(error){toast(error.message||'Unable to make a sample image');}
}

// Drop actions use local File objects and never send bytes over the network.
elements.dropzone.addEventListener('click',()=>{if(!state.busy && !state.importing)elements.picker.click();});
elements.dropzone.addEventListener('keydown',event=>{if((event.key==='Enter'||event.key===' ')&&!state.busy&&!state.importing){event.preventDefault();elements.picker.click();}});
elements.picker.addEventListener('change',event=>{void importFiles(Array.from(event.target.files||[]));});
for(const eventName of ['dragenter','dragover']) elements.dropzone.addEventListener(eventName,event=>{event.preventDefault();if(!state.busy&&!state.importing)elements.dropzone.classList.add('is-dragging');});
for(const eventName of ['dragleave','drop']) elements.dropzone.addEventListener(eventName,event=>{event.preventDefault();elements.dropzone.classList.remove('is-dragging');});
elements.dropzone.addEventListener('drop',event=>{if(!state.busy&&!state.importing)void importFiles(Array.from(event.dataTransfer?.files||[]));});
window.addEventListener('dragover',event=>{if(event.dataTransfer?.types?.includes('Files'))event.preventDefault();});
window.addEventListener('drop',event=>{if(event.dataTransfer?.types?.includes('Files'))event.preventDefault();});
elements.clear.addEventListener('click',clearItems);
elements.process.addEventListener('click',()=>{void processAll();});
elements.zip.addEventListener('click',()=>{void downloadZip();});
elements.demo.addEventListener('click',()=>{void addSample();});
window.addEventListener('pagehide',()=>{for(const item of state.items)URL.revokeObjectURL(item.url);});
render();
if('serviceWorker' in navigator && (location.protocol==='https:'||location.hostname==='localhost'||location.hostname==='127.0.0.1')) {
  window.addEventListener('load',()=>{navigator.serviceWorker.register('./sw.js').catch(()=>{});});
}
