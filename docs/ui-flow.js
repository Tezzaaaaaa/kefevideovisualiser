'use strict';
(()=>{
  const workspace=document.querySelector('.workspace');
  const topbar=document.querySelector('.topbar');
  const flow=document.querySelector('.flow-shell');
  const controls=document.querySelector('.flow-controls');
  if(!workspace||!flow||!controls)return;

  if(!document.querySelector('.lina-hero')){
    const hero=document.createElement('section');
    hero.className='lina-hero';
    hero.setAttribute('aria-label','Welcome to LINA');
    hero.innerHTML=`<div class="lina-hero-inner"><div class="lina-hero-mark">LINA</div><div class="lina-hero-kicker">Lyric Video Visualizer</div><h1>Make the lyrics feel like part of the music.</h1><p>Bring in a song, sync the words, shape the motion and turn it into a polished lyric video without fighting the interface.</p><div class="lina-hero-actions"><button class="lina-hero-start" type="button">Start creating</button></div><div class="lina-hero-scroll">Your visualizer is below</div></div>`;
    workspace.before(hero);
    hero.querySelector('.lina-hero-start').addEventListener('click',()=>workspace.scrollIntoView({behavior:'smooth',block:'start'}));
  }

  const updateDock=()=>{
    const r=flow.getBoundingClientRect();
    const shouldFloat=r.bottom<90||r.top<-40;
    controls.classList.toggle('workflow-floating',shouldFloat);
    document.body.classList.toggle('workflow-dock-on',shouldFloat);
  };
  let raf=0;
  const queueDock=()=>{if(raf)return;raf=requestAnimationFrame(()=>{raf=0;updateDock()})};
  addEventListener('scroll',queueDock,{passive:true});
  addEventListener('resize',queueDock,{passive:true});
  updateDock();

  const next=document.querySelector('#nextStep');
  const prev=document.querySelector('#prevStep');
  if(next)next.onclick=()=>{
    if(activeStep===STEPS.length-1){document.querySelector('.stage-export')?.scrollIntoView({behavior:'smooth',block:'center'});return;}
    goStep(activeStep+1);
    queueDock();
  };
  if(prev)prev.onclick=()=>{goStep(activeStep-1);queueDock()};

  document.querySelectorAll('.navbtn').forEach(btn=>btn.addEventListener('click',queueDock));
  document.querySelector('.brand')?.addEventListener('click',()=>document.querySelector('.lina-hero')?.scrollIntoView({behavior:'smooth',block:'start'}));
  if(topbar)topbar.classList.add('lina-centered-brand');
})();
