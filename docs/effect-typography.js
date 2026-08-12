'use strict';
(()=>{
  const $=s=>document.querySelector(s);

  const PROFILES={
    apple:{
      name:'Apple Music',
      fonts:[['apple-system','SF Pro / Apple system'],['helvetica','Helvetica Neue'],['avenir','Avenir Next']],
      stacks:{
        'apple-system':'-apple-system,BlinkMacSystemFont,"SF Pro Display","SF Pro Text","Helvetica Neue",Arial,sans-serif',
        helvetica:'"Helvetica Neue",Helvetica,Arial,sans-serif',
        avenir:'"Avenir Next",Avenir,"Helvetica Neue",Arial,sans-serif'
      },
      defaults:{font:'apple-system',weight:'700',align:'left',lineHeight:'1.02',spacing:'-0.02'}
    },
    charli:{
      name:'Charli xcx · Apple',
      fonts:[['charli-condensed','Arial Narrow / Helvetica Neue Condensed'],['charli-heavy','Helvetica Neue Heavy'],['charli-black','Arial Black / Impact']],
      stacks:{
        'charli-condensed':'"Arial Narrow","Helvetica Neue Condensed","Helvetica Neue",Arial,sans-serif',
        'charli-heavy':'"Helvetica Neue",Helvetica,Arial,sans-serif',
        'charli-black':'"Arial Black",Impact,"Helvetica Neue",Arial,sans-serif'
      },
      defaults:{font:'charli-condensed',weight:'900',align:'center',lineHeight:'0.84',spacing:'-0.055'}
    },
    eternal:{
      name:'Eternal Sunshine',
      fonts:[['eternal-reenie','Reenie Beanie · recommended'],['eternal-sunrise','Waiting for the Sunrise'],['eternal-grace','Covered By Your Grace']],
      stacks:{
        'eternal-reenie':'"Reenie Beanie","Waiting for the Sunrise","Segoe Print","Bradley Hand",cursive',
        'eternal-sunrise':'"Waiting for the Sunrise","Reenie Beanie","Segoe Print","Bradley Hand",cursive',
        'eternal-grace':'"Covered By Your Grace","Reenie Beanie","Segoe Print","Bradley Hand",cursive'
      },
      defaults:{font:'eternal-reenie',weight:'400',align:'left',lineHeight:'1.02',spacing:'0.005'}
    }
  };

  const state={};
  for(const [key,p] of Object.entries(PROFILES))state[key]={...p.defaults};
  let activeKey='apple';

  function effect(){
    const hidden=$('#lyricEffect')?.value;
    const data=$('#story')?.dataset.lyricEffect;
    return PROFILES[hidden]?hidden:PROFILES[data]?data:PROFILES[$('#quickEffect')?.value]?$('#quickEffect').value:PROFILES[$('#styleEffectSelect')?.value]?$('#styleEffectSelect').value:'apple';
  }

  function ensureWeightOptions(){
    const select=$('#fontWeight');
    if(!select)return;
    const opts=[['400','Regular'],['500','Medium'],['600','Semibold'],['700','Bold'],['800','Heavy'],['900','Black']];
    const current=select.value;
    select.replaceChildren(...opts.map(([value,label])=>{const o=document.createElement('option');o.value=value;o.textContent=label;return o;}));
    if(opts.some(([v])=>v===current))select.value=current;
  }

  function seedFromControls(key=effect()){
    key=PROFILES[key]?key:'apple';
    const s=state[key],p=PROFILES[key];
    const font=$('#fontChoice')?.value;
    if(p.fonts.some(([v])=>v===font))s.font=font;
    const weight=$('#fontWeight')?.value;if(weight)s.weight=weight;
    const align=$('#textAlign')?.value;if(['left','center','right'].includes(align))s.align=align;
    const lh=Number($('#lineHeight')?.value);if(Number.isFinite(lh))s.lineHeight=String(lh);
    const sp=Number($('#letterSpacing')?.value);if(Number.isFinite(sp))s.spacing=String(sp);
    return s;
  }

  function setSourceValues(key){
    const s=state[key],p=PROFILES[key];
    const font=$('#fontChoice');
    if(font){
      font.replaceChildren(...p.fonts.map(([value,label])=>{const o=document.createElement('option');o.value=value;o.textContent=label;return o;}));
      font.value=s.font;
    }
    ensureWeightOptions();
    if($('#fontWeight'))$('#fontWeight').value=s.weight;
    if($('#textAlign'))$('#textAlign').value=s.align;
    if($('#lineHeight'))$('#lineHeight').value=s.lineHeight;
    if($('#letterSpacing'))$('#letterSpacing').value=s.spacing;
    if($('#lineHeightVal'))$('#lineHeightVal').textContent=Number(s.lineHeight).toFixed(2);
    if($('#letterSpacingVal'))$('#letterSpacingVal').textContent=`${Number(s.spacing).toFixed(3).replace(/0+$/,'').replace(/\.$/,'')}em`;

    const section=font?.closest('.subsection');
    const title=section?.querySelector('.subhead b');
    const meta=section?.querySelector('.subhead span');
    const helper=section?.querySelector('.helper');
    if(title)title.textContent=`Typography · ${p.name}`;
    if(meta)meta.textContent='Live';
    if(helper)helper.textContent=key==='eternal'?'Reenie Beanie is the recommended free commercial-safe handwriting match.':'Every typography control below applies directly to this effect.';
  }

  function apply(key=activeKey,redraw=true){
    const p=PROFILES[key]||PROFILES.apple,s=state[key]||state.apple;
    const stack=p.stacks[s.font]||p.stacks[p.defaults.font];
    const story=$('#story'),lyrics=$('#lyrics');
    if(story){
      story.style.setProperty('--lina-effect-font',stack);
      story.style.setProperty('--lina-effect-weight',s.weight);
      story.style.setProperty('--lina-effect-align',s.align);
      story.style.setProperty('--lina-effect-lh',s.lineHeight);
      story.style.setProperty('--lina-effect-spacing',`${s.spacing}em`);
    }
    document.documentElement.style.setProperty('--lyric-weight',s.weight);
    document.documentElement.style.setProperty('--lyric-lh',s.lineHeight);
    if(lyrics){
      lyrics.style.fontFamily=stack;
      lyrics.style.fontWeight=s.weight;
      lyrics.style.textAlign=s.align;
      lyrics.style.lineHeight=s.lineHeight;
      lyrics.style.letterSpacing=`${s.spacing}em`;
    }
    if(key==='eternal')document.fonts?.load?.(`32px ${stack.split(',')[0]}`).catch(()=>{});
    if(redraw){
      try{window.invalidateLinaMotion?.(true)}catch{}
      try{window.render?.((Number($('#audio')?.currentTime)||0)*1000)}catch{}
    }
  }

  function activate(key=effect()){
    activeKey=PROFILES[key]?key:'apple';
    setSourceValues(activeKey);
    apply(activeKey,true);
    setTimeout(()=>window.linaQuickSettingsSync?.(),0);
    return activeKey;
  }

  function capture(){
    const s=state[activeKey];
    if(!s)return;
    if($('#fontChoice'))s.font=$('#fontChoice').value;
    if($('#fontWeight'))s.weight=$('#fontWeight').value;
    if($('#textAlign'))s.align=$('#textAlign').value;
    if($('#lineHeight'))s.lineHeight=$('#lineHeight').value;
    if($('#letterSpacing'))s.spacing=$('#letterSpacing').value;
    if($('#lineHeightVal'))$('#lineHeightVal').textContent=Number(s.lineHeight).toFixed(2);
    if($('#letterSpacingVal'))$('#letterSpacingVal').textContent=`${Number(s.spacing).toFixed(3).replace(/0+$/,'').replace(/\.$/,'')}em`;
    apply(activeKey,true);
    setTimeout(()=>window.linaQuickSettingsSync?.(),0);
  }

  function bind(){
    for(const id of ['fontChoice','fontWeight','textAlign','lineHeight','letterSpacing']){
      const el=$('#'+id);
      if(el&&el.dataset.effectTypographyControl!=='true'){
        el.dataset.effectTypographyControl='true';
        el.addEventListener(id==='lineHeight'||id==='letterSpacing'?'input':'change',capture);
      }
    }
    for(const effectSelect of [$('#styleEffectSelect'),$('#quickEffect'),$('#previewEffectSelect'),$('#lyricEffect')]){
      if(effectSelect&&effectSelect.dataset.typographyBound!=='true'){
        effectSelect.dataset.typographyBound='true';
        effectSelect.addEventListener('change',()=>setTimeout(()=>activate(effect()),0));
      }
    }
    document.addEventListener('click',e=>{if(e.target.closest?.('.effect-option[data-effect]'))setTimeout(()=>activate(effect()),0)},true);
  }

  window.linaSyncTypography=()=>activate(effect());
  window.linaTypographyCapture=()=>{activeKey=effect();seedFromControls(activeKey);apply(activeKey,true);return state[activeKey]};
  window.linaTypographyProfiles=PROFILES;
  window.linaTypographyState=state;

  function init(){
    let tries=0;
    const run=()=>{
      tries++;
      if(!$('#fontChoice')||!$('#story')){if(tries<50)setTimeout(run,60);return;}
      ensureWeightOptions();
      activeKey=effect();
      seedFromControls(activeKey);
      bind();
      activate(activeKey);
      document.documentElement.dataset.effectTypography='ready';
    };
    run();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
