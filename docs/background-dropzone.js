'use strict';
(()=>{
  const $=s=>document.querySelector(s);

  function stash(){
    let el=$('#backgroundUploadSourceStash');
    if(!el){
      el=document.createElement('div');
      el.id='backgroundUploadSourceStash';
      el.className='background-upload-source-stash';
      el.hidden=true;
      document.body.append(el);
    }
    return el;
  }

  function kindOf(file){
    const type=String(file?.type||'').toLowerCase();
    const name=String(file?.name||'').toLowerCase();
    if(type.startsWith('video/')||/\.(mp4|mov|m4v|webm|avi|mkv)$/i.test(name))return 'video';
    if(type.startsWith('image/')||/\.(png|jpe?g|webp|gif|heic|heif|avif)$/i.test(name))return 'image';
    return '';
  }

  function setState(mode,title,detail=''){
    const state=$('#backgroundLoadState');
    const section=$('#backgroundDropZone')?.closest('.subsection');
    if(!state)return;
    state.className=mode?`is-${mode}`:'';
    state.innerHTML=`<div class="background-load-mark">${mode==='success'?'✓':mode==='error'?'!':'…'}</div><div class="background-load-copy"><b>${title}</b><span>${detail}</span></div>`;
    section?.classList.toggle('background-media-ready',mode==='success');
    const meta=section?.querySelector(':scope > .subhead > span');
    if(meta)meta.textContent=mode==='success'?'Ready':'Image or video';
  }

  function setDropCopy(mode,file){
    const zone=$('#backgroundDropZone');
    if(!zone)return;
    const b=zone.querySelector('.background-drop-copy b');
    const s=zone.querySelector('.background-drop-copy span');
    if(mode==='success'){
      if(b)b.textContent='Drop another image or video here to replace it';
      if(s)s.textContent=file?.name||'Current background is ready in Preview.';
    }else{
      if(b)b.textContent='Drop background image or video here';
      if(s)s.textContent='or click anywhere here to choose a file';
    }
  }

  function confirmMedia(file,kind){
    const media=$('#bg')?.querySelector(kind==='video'?'video':'img');
    const success=()=>{
      setState('success',`Background ${kind} loaded`,`${file.name} is ready in the Preview.`);
      setDropCopy('success',file);
    };
    const fail=()=>{
      setState('error',`Could not load that ${kind}`,'Choose another image or video file.');
      setDropCopy('idle');
    };
    if(!media){setTimeout(success,80);return;}
    if(kind==='video'){
      if(media.readyState>=1){success();return;}
      media.addEventListener('loadedmetadata',success,{once:true});
      media.addEventListener('error',fail,{once:true});
    }else{
      if(media.complete&&media.naturalWidth>0){success();return;}
      media.addEventListener('load',success,{once:true});
      media.addEventListener('error',fail,{once:true});
    }
  }

  function route(file){
    if(!file)return;
    const kind=kindOf(file);
    if(!kind){
      setState('error','Unsupported background file','Use an image or video file.');
      return;
    }
    const target=$(kind==='video'?'#bgVideoFile':'#bgImageFile');
    if(!target){
      setState('error','Background uploader unavailable','The original media input could not be found.');
      return;
    }
    setState('loading',`Loading background ${kind}…`,file.name);
    try{
      const dt=new DataTransfer();
      dt.items.add(file);
      target.files=dt.files;
      target.dispatchEvent(new Event('change',{bubbles:true}));
      setTimeout(()=>confirmMedia(file,kind),0);
    }catch(err){
      console.error('LINA background drop failed',err);
      setState('error','Could not load that file','Choose the file again.');
    }
  }

  function build(){
    const image=$('#bgImageFile'),video=$('#bgVideoFile'),status=$('#bgStatus');
    if(!image||!video||!status||$('#backgroundDropZone'))return false;
    const section=image.closest('.subsection')||video.closest('.subsection');
    if(!section)return false;

    const sourceStash=stash();
    const imageLabel=image.closest('label');
    const videoLabel=video.closest('label');
    if(imageLabel)sourceStash.append(imageLabel);
    if(videoLabel)sourceStash.append(videoLabel);

    const zone=document.createElement('label');
    zone.id='backgroundDropZone';
    zone.className='background-dropzone';
    zone.innerHTML='<span class="background-drop-copy"><span class="background-drop-icon">▣</span><b>Drop background image or video here</b><span>or click anywhere here to choose a file</span></span><input id="backgroundMediaFile" type="file" accept="image/*,video/*">';

    const state=document.createElement('div');
    state.id='backgroundLoadState';
    state.setAttribute('role','status');
    state.setAttribute('aria-live','polite');

    const head=section.querySelector(':scope > .subhead');
    if(head)head.after(zone,state);
    else section.prepend(zone,state);

    const unified=$('#backgroundMediaFile');
    unified?.addEventListener('change',e=>route(e.target.files?.[0]));

    for(const type of ['dragenter','dragover'])zone.addEventListener(type,e=>{e.preventDefault();zone.classList.add('is-dragging')});
    for(const type of ['dragleave','dragend','drop'])zone.addEventListener(type,e=>{e.preventDefault();zone.classList.remove('is-dragging')});
    zone.addEventListener('drop',e=>route(e.dataTransfer?.files?.[0]));

    $('#removeBg')?.addEventListener('click',()=>setTimeout(()=>{
      setState('','','');
      setDropCopy('idle');
      unified.value='';
    },0));

    // Restore a clear success indication for persisted projects too.
    setTimeout(()=>{
      const media=$('#bg')?.querySelector('video,img');
      const text=status.textContent.trim();
      if(media&&text&&!/No background selected/i.test(text)){
        const kind=media.tagName==='VIDEO'?'video':'image';
        setState('success',`Background ${kind} loaded`,`${text.replace(/^(Video|Image):\s*/i,'')} is ready in the Preview.`);
        setDropCopy('success',{name:text.replace(/^(Video|Image):\s*/i,'')});
      }
    },180);

    document.documentElement.dataset.backgroundDropzone='ready';
    return true;
  }

  function init(){let tries=0;const run=()=>{tries++;if(!build()&&tries<50)setTimeout(run,60)};run()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
