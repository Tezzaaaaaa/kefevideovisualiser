'use strict';
(()=>{
  const $=s=>document.querySelector(s);
  function field(id,label,create){let c=$('#'+id);if(!c){c=create();c.id=id}let w=c.closest('label');if(!w){w=document.createElement('label');w.className='field';w.innerHTML=`<span>${label}</span>`;w.append(c)}return w}
  function select(id,label,options,value){return field(id,label,()=>{const e=document.createElement('select');e.innerHTML=options.map(([v,t])=>`<option value="${v}">${t}</option>`).join('');e.value=value;return e})}
  function range(id,label,min,max,step,value){return field(id,label,()=>{const e=document.createElement('input');e.type='range';Object.assign(e,{min:String(min),max:String(max),step:String(step),value:String(value)});return e})}
  function toggle(id,label,checked=false){return field(id,label,()=>{const e=document.createElement('input');e.type='checkbox';e.checked=checked;return e})}
  function move(id,target){const e=$('#'+id),w=e?.closest('label')||e;if(w&&target)target.append(w)}
  function ensureEffectControl(){const old=$('#lyricEffect');if(old?.tagName==='SELECT')return;const value=old?.value||'apple';const next=document.createElement('select');next.id='lyricEffect';next.innerHTML='<option value="apple">Apple Music</option><option value="charli">Charli xcx · Apple</option><option value="eternal">Eternal Sunshine</option>';next.value=value;old?.replaceWith(next)}
  function build(){
    const stage=$('.stage');if(!stage||$('#previewQuickControls'))return !!stage;
    ensureEffectControl();
    const box=document.createElement('section');box.id='previewQuickControls';box.className='preview-quick-controls';box.innerHTML=`
      <div class="quick-control-head"><b>Finalise video</b><span>Preview and export use these exact settings.</span></div>
      <div class="quick-group"><div class="quick-group-head"><b>1. Lyrics & title</b><span>Effect · type · timing</span></div><div class="quick-control-grid" data-final="lyrics"></div></div>
      <div class="quick-group"><div class="quick-group-head"><b>2. Background & framing</b><span>Readability · crop · position</span></div><div class="quick-control-grid" data-final="background"></div><div class="quick-background-actions"></div></div>
      <div class="quick-group"><div class="quick-group-head"><b>3. Export</b><span>Frame · quality · guides</span></div><div class="quick-control-grid" data-final="export"></div></div>
      <div class="quick-actions"><a id="resetProjectVisible" class="btn subtle" href="reset.html?v=p110-single-controller" role="button" data-lina-owner="project-hard-v3">Reset entire project</a><div data-export-action></div></div>`;
    stage.after(box);
    const lyrics=box.querySelector('[data-final="lyrics"]'),bg=box.querySelector('[data-final="background"]'),out=box.querySelector('[data-final="export"]');
    lyrics.append(
      select('lyricEffect','Effect',[['apple','Apple Music'],['charli','Charli xcx · Apple'],['eternal','Eternal Sunshine']],'apple'),
      select('fontChoice','Font',[['apple-system','SF Pro / Apple system'],['helvetica','Helvetica Neue'],['avenir','Avenir Next']],'apple-system'),
      range('size','Text size',18,82,1,52),toggle('showTitle','Show title card',true),
      select('titleDuration','Title-card duration',[['1.5','1.5 seconds'],['2','2 seconds'],['2.5','2.5 seconds'],['3','3 seconds'],['4','4 seconds']],'2.5'),
      select('fontWeight','Weight',[['400','Regular'],['500','Medium'],['600','Semibold'],['700','Bold'],['800','Heavy'],['900','Black']],'700'),
      select('textAlign','Alignment',[['left','Left'],['center','Centre'],['right','Right']],'left'),
      select('letterCase','Letter case',[['original','Original'],['upper','UPPERCASE'],['lower','lowercase']],'original'),
      field('textColor','Text colour',()=>{const e=document.createElement('input');e.type='color';e.value='#ffffff';return e}),
      select('contextMode','Lyrics on screen',[['3','3 lines — classic'],['5','5 lines — flowing'],['7','7 lines — chat view'],['9','9 lines — full feed'],['current','Current lyric only']],'3'),
      range('lineHeight','Line height',.75,1.35,.01,1.02),range('letterSpacing','Letter spacing',-.08,.1,.005,-.02),
      range('glow','Glow',0,180,1,100),range('yPos','Vertical position',18,82,1,50),range('offset','Lyric offset',-5000,5000,50,0));
    for(const id of ['dim','blur','bgFit','cropZoom','cropX','cropY'])move(id,bg);
    for(const id of ['resetCrop','removeBg']){const e=$('#'+id);if(e)box.querySelector('.quick-background-actions').append(e)}
    out.append(select('aspect','Aspect ratio',[['9:16','9:16 Story'],['4:5','4:5 Portrait'],['1:1','1:1 Square'],['16:9','16:9 Landscape']],'9:16'),select('quality','Quality',[['720','720p'],['1080','1080p']],'720'),toggle('safeToggle','Safe-area guides'));
    $('.preview-controls')?.remove();$('.stage-export')?.remove();$('[data-panel="style"]')?.remove();$('.navbtn[data-tool="style"]')?.remove();
    for(const id of ['resetBtn','exportBottomBtn','simpleControlSummary','previewEffectSwitcher','previewTitleControls'])$('#'+id)?.remove();
    const exportButton=$('#exportBtn');if(exportButton){exportButton.textContent='Export video';box.querySelector('[data-export-action]').replaceWith(exportButton)}
    $('#lyricEffect')?.addEventListener('change',e=>window.linaRuntime?.setEffect?.(e.target.value));
    $('#showTitle')?.addEventListener('change',()=>{const d=$('#titleDuration');if(d)d.disabled=!$('#showTitle').checked});
    document.documentElement.dataset.previewFinalise='single-source';return true;
  }
  function init(){let n=0;const run=()=>{if(!build()&&++n<60)setTimeout(run,50)};run()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
