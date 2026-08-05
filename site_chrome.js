// Lyric Video Visualier — persistent site identity, navigation and footer.
(function(){
'use strict';
const q=s=>document.querySelector(s);
function jump(sel){const el=q(sel);if(!el)return;el.scrollIntoView({behavior:'smooth',block:'start'});}
function build(){
 if(document.querySelector('.lv-site-nav'))return;
 const app=q('.app'); if(!app)return;
 document.documentElement.classList.add('lv-site-shell');
 const nav=document.createElement('nav');
 nav.className='lv-site-nav';
 nav.setAttribute('aria-label','Primary navigation');
 nav.innerHTML=`
   <div class="lv-nav-wordmark" role="link" tabindex="0" data-jump=".editor">
     <strong>LYRIC VIDEO VISUALIER</strong>
     <span>LYRIC VIDEO STUDIO / APPLE MUSIC–READY WORKFLOW</span>
   </div>
   <div class="lv-nav-links">
     <button type="button" data-jump=".editor">CREATE</button>
     <button type="button" data-open-lrc>LYRICS / LRC</button>
     <button type="button" data-jump="[data-panel-content='style']">STYLE</button>
     <button type="button" data-jump="[data-panel-content='timing']">TIMING</button>
     <button type="button" data-jump="[data-panel-content='project']">PROJECT</button>
     <button type="button" data-export>EXPORT</button>
     <a href="https://github.com/Tezzaaaaaa/lyricvideovisualiser" target="_blank" rel="noopener noreferrer">GITHUB ↗</a>
   </div>`;
 app.insertBefore(nav,app.firstChild);

 const info=document.createElement('section');
 info.className='lv-site-intro';
 info.innerHTML=`
   <p class="lv-kicker">LYRIC VIDEO VISUALIER / WEB STUDIO</p>
   <h1>BUILD. SYNC.<br>VISUALISE LYRICS.</h1>
   <div class="lv-intro-meta">
     <p>Browser-based lyric video studio for importing or generating timed lyrics, styling motion, and exporting social-ready video.</p>
     <p>LOCAL-FIRST MEDIA PROCESSING<br>APPLE MUSIC LINK + METADATA SUPPORT<br>LRC / ENHANCED LRC / SRT / TXT</p>
   </div>`;
 nav.insertAdjacentElement('afterend',info);

 const footer=document.createElement('footer');
 footer.className='lv-site-footer';
 footer.innerHTML=`
   <div class="lv-footer-title">LYRIC VIDEO<br>VISUALIER</div>
   <div class="lv-footer-grid">
     <section><p class="lv-footer-label">NAVIGATION</p><a href="#" data-jump=".editor">Create</a><a href="#" data-open-lrc>Lyrics / LRC Collector</a><a href="#" data-jump="[data-panel-content='style']">Style</a><a href="#" data-jump="[data-panel-content='timing']">Timing</a><a href="#" data-jump="[data-panel-content='project']">Projects</a><a href="#" data-export>Export</a></section>
     <section><p class="lv-footer-label">PROJECT</p><a href="https://github.com/Tezzaaaaaa/lyricvideovisualiser" target="_blank" rel="noopener noreferrer">GitHub Repository ↗</a><a href="https://github.com/Tezzaaaaaa" target="_blank" rel="noopener noreferrer">Developer Profile ↗</a><a href="https://github.com/Tezzaaaaaa/lyricvideovisualiser/issues" target="_blank" rel="noopener noreferrer">Contact / Feedback ↗</a><span>Lyric Video Visualier</span><span>Independent web application</span></section>
     <section><p class="lv-footer-label">WORKFLOW</p><span>Apple Music track-link identification</span><span>Synced LRC collection + local generator</span><span>Helvetica-first lyric system</span><span>Metadata-heavy export workflow</span><span>Fail-safe project recovery</span></section>
     <section><p class="lv-footer-label">INFORMATION</p><span>Audio and project media are processed locally where supported.</span><span>Apple Music is used for track identification, metadata and sharing links only.</span><span>This project does not bypass DRM or provide protected Apple Music audio.</span></section>
   </div>
   <div class="lv-footer-bottom"><span>© ${new Date().getFullYear()} LYRIC VIDEO VISUALIER</span><span>HELVETICA / BLACK / WHITE / SYSTEM 01</span><button type="button" data-top>BACK TO TOP ↑</button></div>`;
 app.insertAdjacentElement('afterend',footer);

 document.addEventListener('click',e=>{
   const j=e.target.closest('[data-jump]'); if(j){e.preventDefault();jump(j.dataset.jump);return;}
   const lrc=e.target.closest('[data-open-lrc]'); if(lrc){e.preventDefault();q('#openCollector')?.click();return;}
   const ex=e.target.closest('[data-export]'); if(ex){e.preventDefault();q('#exportBtn')?.click();return;}
   if(e.target.closest('[data-top]')){window.scrollTo({top:0,behavior:'smooth'});}
 });
 nav.querySelector('.lv-nav-wordmark')?.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();jump('.editor')}});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',build,{once:true});else build();
})();
