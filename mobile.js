// Milestone 5: iPhone-first controls, PWA installation and local project persistence.
const PROJECTS_KEY='storyLyrics.projects.v1';
const ACTIVE_KEY='storyLyrics.active.v1';
let deferredInstallPrompt=null;
let toastTimer=0;
function notify(message){const t=$('#toast');t.textContent=message;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),1800)}
function projectSnapshot(){return {
  id:localStorage.getItem(ACTIVE_KEY)||crypto.randomUUID(),
  name:$('#projectName').value.trim()||'Untitled Story',
  updated_at:new Date().toISOString(),effect,duration,accent,offset,letterCase,
  lyrics:clone(doc),originalLyrics:clone(original),transform:clone(transformState),
  controls:{size:+$('#size').value,position:+$('#position').value,align:$('#align').value,backdrop:$('#backdrop').value,blur:+$('#blur').value,dim:+$('#dim').value,gradient:$('#gradient').value,fit:background.classList.contains('fit-contain')?'contain':'cover',fontStyle:$('#fontStyle')?.value||'rounded'},
  songName:$('#songName').textContent
}}
function savedProjects(){try{return JSON.parse(localStorage.getItem(PROJECTS_KEY)||'[]')}catch{return []}}
function writeProjects(items){localStorage.setItem(PROJECTS_KEY,JSON.stringify(items))}
function saveCurrentProject(silent=false){const p=projectSnapshot(),items=savedProjects(),i=items.findIndex(x=>x.id===p.id);if(i>=0)items[i]=p;else items.unshift(p);writeProjects(items.slice(0,30));localStorage.setItem(ACTIVE_KEY,p.id);renderSavedProjects();if(!silent)notify('Project saved on this iPhone')}
function loadProject(id){const p=savedProjects().find(x=>x.id===id);if(!p)return;localStorage.setItem(ACTIVE_KEY,p.id);$('#projectName').value=p.name;effect=p.effect||'stack';duration=p.duration||15;accent=p.accent||'#fff';offset=p.offset||0;letterCase=p.letterCase||'original';doc=clone(p.lyrics||{lines:[]});original=clone(p.originalLyrics||p.lyrics||{lines:[]});transformState=clone(p.transform||{x:0,y:0,scale:1,rotation:0});
 document.documentElement.style.setProperty('--accent',accent);$('#colorBtn').style.background=accent;$('#offset').value=offset;$('#offsetLabel').textContent=`${offset>0?'+':''}${offset} ms`;$('#songName').textContent=p.songName||'Original audio';if($('#letterCase'))$('#letterCase').value=letterCase;
 const c=p.controls||{};for(const [id,val] of Object.entries({size:c.size||54,position:c.position||50,align:c.align||'center',backdrop:c.backdrop||'none',blur:c.blur||0,dim:c.dim??20,gradient:c.gradient||'none',fontStyle:c.fontStyle||'rounded'})){const el=$('#'+id);if(el)el.value=val}
 $('#lyricsLayer').style.fontSize=$('#size').value+'px';$('#lyricsLayer').style.top=$('#position').value+'%';$('#lyricsLayer').style.textAlign=$('#align').value;background.style.setProperty('--background-blur',$('#blur').value+'px');story.style.setProperty('--story-dim',+$('#dim').value/100);gradientLayer.style.background=gradients[$('#gradient').value]||'transparent';background.classList.toggle('fit-contain',c.fit==='contain');background.classList.toggle('fit-cover',c.fit!=='contain');
 document.querySelectorAll('.effect-card').forEach(x=>x.classList.toggle('active',x.dataset.effect===effect));document.querySelectorAll('[data-duration]').forEach(x=>x.classList.toggle('active',+x.dataset.duration===duration));$('#scrubber').max=Math.min(duration,audio.duration||duration);setStoryClass();applyFontStyle();applyTransform();renderTimeline();renderAt(audio.currentTime*1000);notify('Project opened')}
function renderSavedProjects(){const box=$('#savedProjects'),items=savedProjects();box.innerHTML=items.length?items.map(p=>`<button class="saved-project" data-open-project="${p.id}"><span><b>${esc(p.name)}</b><small>${new Date(p.updated_at).toLocaleString()}</small></span><span>Open</span></button>`).join(''):'<p class="hint">No saved projects on this device yet.</p>'}
function newProject(){localStorage.removeItem(ACTIVE_KEY);$('#projectName').value='Untitled Story';doc={lines:[]};original={lines:[]};effect='stack';duration=15;offset=0;letterCase='original';if($('#letterCase'))$('#letterCase').value=letterCase;resetTransform();setStoryClass();applyFontStyle();$('#lyricsLayer').innerHTML='<div class="placeholder">Add lyrics to begin</div>';$('#timeline').textContent='Import LRC, enhanced LRC, SRT, or TXT lyrics.';$('#formatBadge').textContent='No lyrics';notify('New project created')}
$('#saveProject').addEventListener('click',()=>saveCurrentProject());$('#newProject').addEventListener('click',newProject);$('#openProjects').addEventListener('click',()=>{$('#savedProjects').classList.toggle('hidden');renderSavedProjects()});$('#savedProjects').addEventListener('click',e=>{const b=e.target.closest('[data-open-project]');if(b)loadProject(b.dataset.openProject)});$('#homeBtn').addEventListener('click',()=>{activateMobilePanel('project');$('#savedProjects').classList.remove('hidden');renderSavedProjects()});
function activateMobilePanel(name){document.querySelectorAll('.mobile-tabs button').forEach(b=>b.classList.toggle('active',b.dataset.panel===name));document.querySelectorAll('[data-panel-content]').forEach(p=>p.classList.toggle('mobile-active',p.dataset.panelContent===name))}
document.querySelector('.mobile-tabs').addEventListener('click',e=>{const b=e.target.closest('[data-panel]');if(b)activateMobilePanel(b.dataset.panel)});activateMobilePanel('style');
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstallPrompt=e;$('#installBtn').classList.remove('hidden')});$('#installBtn').addEventListener('click',async()=>{if(deferredInstallPrompt){deferredInstallPrompt.prompt();await deferredInstallPrompt.userChoice;deferredInstallPrompt=null;$('#installBtn').classList.add('hidden')}else notify('On iPhone: Share → Add to Home Screen')});
if(/iphone|ipad|ipod/i.test(navigator.userAgent)&&!window.matchMedia('(display-mode: standalone)').matches)$('#installBtn').classList.remove('hidden');
if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}));
let autosaveTimer=0;document.addEventListener('input',()=>{clearTimeout(autosaveTimer);autosaveTimer=setTimeout(()=>{if(doc.lines.length)saveCurrentProject(true)},900)});document.addEventListener('change',()=>{clearTimeout(autosaveTimer);autosaveTimer=setTimeout(()=>{if(doc.lines.length)saveCurrentProject(true)},500)});
window.addEventListener('pagehide',()=>{if(doc.lines.length)saveCurrentProject(true)});
renderSavedProjects();
