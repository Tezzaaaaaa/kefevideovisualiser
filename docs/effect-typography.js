'use strict';
(()=>{
  const $=s=>document.querySelector(s);

  const PROFILES={
    apple:{
      name:'Apple Music',
      fonts:[
        ['apple-system','SF Pro / Apple system'],
        ['helvetica','Helvetica Neue'],
        ['avenir','Avenir Next']
      ],
      stacks:{
        'apple-system':'-apple-system,BlinkMacSystemFont,"SF Pro Display","SF Pro Text","Helvetica Neue",Arial,sans-serif',
        helvetica:'"Helvetica Neue",Helvetica,Arial,sans-serif',
        avenir:'"Avenir Next",Avenir,"Helvetica Neue",Arial,sans-serif'
      }
    },
    charli:{
      name:'Charli xcx · Apple',
      fonts:[
        ['charli-condensed','Arial Narrow / Helvetica Neue Condensed'],
        ['charli-heavy','Helvetica Neue Heavy'],
        ['charli-black','Arial Black / Impact']
      ],
      stacks:{
        'charli-condensed':'"Arial Narrow","Helvetica Neue Condensed","Helvetica Neue",Arial,sans-serif',
        'charli-heavy':'"Helvetica Neue",Helvetica,Arial,sans-serif',
        'charli-black':'"Arial Black",Impact,"Helvetica Neue",Arial,sans-serif'
      }
    },
    eternal:{
      name:'Eternal Sunshine',
      fonts:[
        ['eternal-hand','Bradley Hand / Noteworthy'],
        ['eternal-chalk','Chalkboard SE'],
        ['eternal-print','Segoe Print / handwritten']
      ],
      stacks:{
        'eternal-hand':'"Bradley Hand","Noteworthy","Chalkboard SE","Segoe Print",cursive',
        'eternal-chalk':'"Chalkboard SE","Bradley Hand","Noteworthy","Segoe Print",cursive',
        'eternal-print':'"Segoe Print","Bradley Hand","Noteworthy","Chalkboard SE",cursive'
      }
    }
  };

  const chosen={apple:'apple-system',charli:'charli-condensed',eternal:'eternal-hand'};

  function effect(){
    return $('#previewEffectSelect')?.value||$('#lyricEffect')?.value||$('#story')?.dataset.lyricEffect||'apple';
  }

  function applyFont(key){
    const e=effect(),p=PROFILES[e]||PROFILES.apple;
    const safe=p.stacks[key]?key:p.fonts[0][0];
    chosen[e]=safe;
    const stack=p.stacks[safe];
    const story=$('#story');
    const lyrics=$('#lyrics');
    if(story)story.style.setProperty('--lina-effect-font',stack);
    if(lyrics)lyrics.style.fontFamily=stack;
    try{window.invalidateLinaMotion?.(true)}catch{}
    try{window.render?.((Number($('#audio')?.currentTime)||0)*1000)}catch{}
  }

  function syncTypography(){
    const select=$('#fontChoice');
    if(!select)return false;
    const e=effect(),p=PROFILES[e]||PROFILES.apple;
    const current=chosen[e]||p.fonts[0][0];
    select.replaceChildren(...p.fonts.map(([value,label])=>{
      const o=document.createElement('option');o.value=value;o.textContent=label;return o;
    }));
    select.value=current;

    const section=select.closest('.subsection');
    const title=section?.querySelector('.subhead b');
    const meta=section?.querySelector('.subhead span');
    if(title)title.textContent=`Typography · ${p.name}`;
    if(meta)meta.textContent='For the selected effect';
    const helper=section?.querySelector('.helper');
    if(helper)helper.textContent=`These font choices belong to ${p.name}. Change the lyric effect under Preview to see that effect’s typography choices.`;

    applyFont(current);
    return true;
  }

  function bind(){
    const select=$('#fontChoice');
    if(select&&select.dataset.effectTypographyBound!=='true'){
      select.dataset.effectTypographyBound='true';
      select.addEventListener('change',()=>applyFont(select.value));
    }
    const effectSelect=$('#previewEffectSelect');
    if(effectSelect&&effectSelect.dataset.typographyBound!=='true'){
      effectSelect.dataset.typographyBound='true';
      effectSelect.addEventListener('change',()=>setTimeout(syncTypography,0));
    }
    document.addEventListener('click',e=>{
      if(e.target.closest?.('.effect-option[data-effect]'))setTimeout(syncTypography,0);
    },true);
  }

  function init(){
    let tries=0;
    const run=()=>{
      tries++;
      const ok=syncTypography();
      bind();
      if((!ok||!$('#previewEffectSelect'))&&tries<50)setTimeout(run,60);
      else document.documentElement.dataset.effectTypography='ready';
    };
    run();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
