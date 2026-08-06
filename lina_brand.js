// LINA — primary brand heading and Helvetica masthead treatment.
(function(){
'use strict';
function install(){
  if(document.getElementById('lina-brand-style'))return;
  const style=document.createElement('style');
  style.id='lina-brand-style';
  style.textContent=`
    .lv-nav-wordmark{gap:4px!important}
    .lv-nav-wordmark strong{display:flex!important;align-items:baseline!important;gap:.22em!important;font-family:"Helvetica Neue",Helvetica,Arial,sans-serif!important;font-size:clamp(30px,4.4vw,68px)!important;line-height:.86!important;letter-spacing:-.065em!important;font-weight:850!important;text-transform:none!important;white-space:nowrap}
    .lv-nav-wordmark strong .lina-mark{font-weight:900!important;letter-spacing:-.075em!important}
    .lv-nav-wordmark strong .lina-name{font-weight:650!important;letter-spacing:-.055em!important}
    .lv-nav-wordmark span{font-family:"Helvetica Neue",Helvetica,Arial,sans-serif!important;font-size:9px!important;font-weight:700!important;letter-spacing:.10em!important;color:#8a8a8a!important;text-transform:uppercase}
    .lv-site-intro .lv-kicker{font-weight:800!important;letter-spacing:.12em!important}
    @media(max-width:700px){.lv-nav-wordmark strong{font-size:clamp(25px,8vw,42px)!important;white-space:normal;line-height:.9!important}.lv-nav-wordmark strong .lina-name{display:block}}
  `;
  document.head.appendChild(style);

  const wordmark=document.querySelector('.lv-nav-wordmark strong');
  if(wordmark)wordmark.innerHTML='<span class="lina-mark">LINA:</span><span class="lina-name">Lyric Video Visualiser</span>';
  const sub=document.querySelector('.lv-nav-wordmark span');
  if(sub)sub.textContent='LYRIC VIDEO STUDIO / APPLE MUSIC–READY WORKFLOW';

  const brand=document.querySelector('header .brand');
  if(brand)brand.innerHTML='LINA: Lyric Video Visualiser <small>Helvetica lyric video studio</small>';

  document.title='LINA: Lyric Video Visualiser';
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,0),{once:true});else setTimeout(install,0);
})();
