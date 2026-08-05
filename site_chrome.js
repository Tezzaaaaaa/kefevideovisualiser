// Lyric Video Visualier — persistent site identity, navigation and footer.
(function(){
'use strict';
const q=s=>document.querySelector(s);
function jump(sel){const el=q(sel);if(!el)return;el.scrollIntoView({behavior:'smooth',block:'start'});}
function installStyles(){if(document.getElementById('lv-site-chrome-style'))return;const style=document.createElement('style');style.id='lv-site-chrome-style';style.textContent=`
.lv-site-nav,.lv-site-intro,.lv-site-footer{font-family:"Helvetica Neue",Helvetica,Arial,sans-serif}
.lv-site-nav{display:grid;grid-template-columns:minmax(260px,1.2fr) 2fr;gap:24px;align-items:end;padding:16px 22px;border-bottom:1px solid rgba(255,255,255,.22);background:#050505;color:#fff;position:relative;z-index:20}
.lv-nav-wordmark{display:grid;gap:2px;cursor:pointer}.lv-nav-wordmark strong{font-size:clamp(20px,2.2vw,34px);line-height:.95;letter-spacing:-.05em;font-weight:850}.lv-nav-wordmark span{font-size:9px;letter-spacing:.09em;color:#8b8b8b}
.lv-nav-links{display:flex;justify-content:flex-end;align-items:center;gap:18px;flex-wrap:wrap}.lv-nav-links button,.lv-nav-links a{font:700 10px/1 "Helvetica Neue",Helvetica,Arial,sans-serif;letter-spacing:.06em;color:#f7f7f7;background:none;border:0;padding:0;text-decoration:none;cursor:pointer}.lv-nav-links button:hover,.lv-nav-links a:hover{opacity:.55}
.lv-site-intro{background:#050505;color:#fff;padding:58px 22px 68px;border-bottom:1px solid rgba(255,255,255,.22)}.lv-kicker{margin:0 0 22px;font-size:10px;font-weight:800;letter-spacing:.10em}.lv-site-intro h1{margin:0;font-size:clamp(54px,9vw,142px);line-height:.82;letter-spacing:-.07em;font-weight:850;max-width:1200px}.lv-intro-meta{margin-top:34px;padding-top:16px;border-top:1px solid rgba(255,255,255,.3);display:grid;grid-template-columns:1.5fr 1fr;gap:36px}.lv-intro-meta p{margin:0;max-width:720px;font-size:12px;line-height:1.45;color:#d0d0d0}.lv-intro-meta p:last-child{font-size:10px;color:#858585;letter-spacing:.035em;line-height:1.6}
.lv-site-footer{background:#030303;color:#f5f5f5;border-top:1px solid rgba(255,255,255,.28);padding:44px 22px 18px}.lv-footer-title{font-size:clamp(48px,8vw,120px);line-height:.82;letter-spacing:-.07em;font-weight:850;margin-bottom:42px}.lv-footer-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:28px;padding-top:16px;border-top:1px solid rgba(255,255,255,.25)}.lv-footer-grid section{display:flex;flex-direction:column;gap:8px;min-width:0}.lv-footer-label{margin:0 0 8px;font-size:9px;font-weight:800;letter-spacing:.10em;color:#797979}.lv-footer-grid a,.lv-footer-grid span{font-size:11px;line-height:1.35;color:#d6d6d6;text-decoration:none}.lv-footer-grid a:hover{color:#fff}.lv-footer-bottom{margin-top:42px;padding-top:12px;border-top:1px solid rgba(255,255,255,.2);display:grid;grid-template-columns:1fr 1fr auto;align-items:center;gap:18px;font-size:9px;letter-spacing:.055em;color:#7f7f7f}.lv-footer-bottom button{border:0;background:none;color:#f3f3f3;font:700 9px/1 "Helvetica Neue",Helvetica,Arial,sans-serif;letter-spacing:.06em;cursor:pointer;padding:0}
@media(max-width:850px){.lv-site-nav{grid-template-columns:1fr;align-items:start;gap:14px}.lv-nav-links{justify-content:flex-start;gap:14px}.lv-site-intro{padding-top:42px}.lv-intro-meta{grid-template-columns:1fr}.lv-footer-grid{grid-template-columns:1fr 1fr}.lv-footer-bottom{grid-template-columns:1fr;align-items:start}.lv-footer-bottom button{text-align:left}.lv-footer-title{margin-bottom:30px}}
@media(max-width:520px){.lv-footer-grid{grid-template-columns:1fr}.lv-site-intro h1{font-size:clamp(48px,17vw,78px)}.lv-nav-wordmark strong{font-size:25px}.lv-nav-links{row-gap:11px}}
`;document.head.append(style)}
function build(){
 if(document.querySelector('.lv-site-nav'))return;
 installStyles();
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
     <section><p class="lv-footer-label">PROJECT / CONTACT</p><a href="https://github.com/Tezzaaaaaa/lyricvideovisualiser" target="_blank" rel="noopener noreferrer">GitHub Repository ↗</a><a href="https://github.com/Tezzaaaaaa" target="_blank" rel="noopener noreferrer">Developer Profile ↗</a><a href="https://github.com/Tezzaaaaaa/lyricvideovisualiser/issues" target="_blank" rel="noopener noreferrer">Contact / Feedback ↗</a><span>Lyric Video Visualier</span><span>Independent web application</span></section>
     <section><p class="lv-footer-label">WORKFLOW</p><span>Apple Music track-link identification</span><span>Synced LRC collection + local generator</span><span>Helvetica-first lyric system</span><span>Metadata-heavy export workflow</span><span>Fail-safe project recovery</span></section>
     <section><p class="lv-footer-label">INFORMATION</p><span>Audio and project media are processed locally where supported.</span><span>Apple Music is used for track identification, metadata and sharing links only.</span><span>This project does not bypass DRM or provide protected Apple Music audio.</span></section>
   </div>
   <div class="lv-footer-bottom"><span>© ${new Date().getFullYear()} LYRIC VIDEO VISUALIER</span><span>HELVETICA / BLACK / WHITE / SYSTEM 01</span><button type="button" data-top>BACK TO TOP ↑</button></div>`;
 app.insertAdjacentElement('afterend',footer);

 document.addEventListener('click',e=>{
   const j=e.target.closest('[data-jump]'); if(j){e.preventDefault();jump(j.dataset.jump);return;}
   const lrc=e.target.closest('[data-open-lrc]'); if(lrc){e.preventDefault();q('#openCollector')?.click();return;}
   const ex=e.target.closest('[data-export]'); if(ex){e.preventDefault();q('#exportBtn')?.click();return;}
   if(e.target.closest('[data-top]'))window.scrollTo({top:0,behavior:'smooth'});
 });
 nav.querySelector('.lv-nav-wordmark')?.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();jump('.editor')}});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',build,{once:true});else build();
})();
