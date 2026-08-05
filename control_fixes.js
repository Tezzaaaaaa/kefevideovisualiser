// Lyric Video Visualier — typography control hardening.
// Removes artificial lower limits, adds spacing controls, persists values,
// and keeps preview + canvas export typography in sync.
(function(){
'use strict';
const $=s=>document.querySelector(s);
const KEY='lyricVideoVisualier.typeControls.v2';
const defaults={size:54,lineSpacing:0.98,letterSpacing:-0.035};
function load(){try{return {...defaults,...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch{return {...defaults}}}
let state=load();
function save(){try{localStorage.setItem(KEY,JSON.stringify(state))}catch{}}
function clamp(n,min,max){n=Number(n);return Number.isFinite(n)?Math.max(min,Math.min(max,n)):min}
function ensureValueLabel(input,suffix=''){let out=input.parentElement?.querySelector(`[data-value-for="${input.id}"]`);if(!out){out=document.createElement('span');out.dataset.valueFor=input.id;out.className='range-value';input.insertAdjacentElement('beforebegin',out)}out.textContent=`${input.value}${suffix}`;return out}
function applyPreview(){const layer=$('#lyricsLayer');if(!layer)return;state.size=clamp(state.size,6,200);state.lineSpacing=clamp(state.lineSpacing,.55,2.5);state.letterSpacing=clamp(state.letterSpacing,-.12,.5);layer.style.fontSize=`${state.size}px`;layer.style.lineHeight=String(state.lineSpacing);layer.style.letterSpacing=`${state.letterSpacing}em`;layer.style.setProperty('--lv-line-spacing',state.lineSpacing);layer.style.setProperty('--lv-letter-spacing',`${state.letterSpacing}em`)}
function configureSize(){const input=$('#size');if(!input)return;input.min='6';input.max='200';input.step='1';input.value=String(clamp(state.size,6,200));ensureValueLabel(input,' px');const sync=()=>{state.size=+input.value;ensureValueLabel(input,' px');applyPreview();save()};input.addEventListener('input',sync,{capture:true});input.addEventListener('change',sync,{capture:true});}
function addSpacingControls(){const size=$('#size');const grid=size?.closest('.grid');if(!grid)return;
 let line=$('#lineSpacing');if(!line){const label=document.createElement('label');label.innerHTML='Line spacing <span data-value-for="lineSpacing"></span><input id="lineSpacing" type="range" min="0.55" max="2.50" step="0.01">';const sizeLabel=size.closest('label');sizeLabel?.insertAdjacentElement('afterend',label);line=label.querySelector('input')}
 let letter=$('#letterSpacing');if(!letter){const label=document.createElement('label');label.innerHTML='Letter spacing <span data-value-for="letterSpacing"></span><input id="letterSpacing" type="range" min="-0.12" max="0.50" step="0.005">';const lineLabel=line.closest('label');lineLabel?.insertAdjacentElement('afterend',label);letter=label.querySelector('input')}
 line.value=String(clamp(state.lineSpacing,.55,2.5));letter.value=String(clamp(state.letterSpacing,-.12,.5));
 ensureValueLabel(line,'×');ensureValueLabel(letter,' em');
 const syncLine=()=>{state.lineSpacing=+line.value;ensureValueLabel(line,'×');applyPreview();save()};
 const syncLetter=()=>{state.letterSpacing=+letter.value;ensureValueLabel(letter,' em');applyPreview();save()};
 line.addEventListener('input',syncLine,{capture:true});line.addEventListener('change',syncLine,{capture:true});
 letter.addEventListener('input',syncLetter,{capture:true});letter.addEventListener('change',syncLetter,{capture:true});
}
function installMutationGuard(){const layer=$('#lyricsLayer');if(!layer)return;const mo=new MutationObserver(()=>requestAnimationFrame(applyPreview));mo.observe(layer,{childList:true,subtree:true});}
function installCSS(){if($('#lv-control-fixes-style'))return;const s=document.createElement('style');s.id='lv-control-fixes-style';s.textContent=`
.grid label{position:relative}.range-value{display:block;justify-self:end;margin-top:-18px;font:700 10px/1 "Helvetica Neue",Helvetica,Arial,sans-serif;color:#f3f3f3;font-variant-numeric:tabular-nums;pointer-events:none}.grid input[type=range]{min-width:0;touch-action:pan-y}.lyrics-layer{line-height:var(--lv-line-spacing,.98)!important;letter-spacing:var(--lv-letter-spacing,-.035em)!important}
`;document.head.appendChild(s)}
function patchExportTypography(){
 // drawTextLine is defined by export.js. Replacing it here keeps the exact same
 // export path while applying the typography controls to rendered video.
 if(typeof window.drawTextLine!=='function'&&typeof drawTextLine!=='function')return;
 const replacement=function(ctx,text,x,y,maxWidth,fontPx,align='center',alpha=1,weight=800){ctx.save();ctx.globalAlpha=alpha;ctx.font=`${weight} ${fontPx}px ${typeof exportFontFamily==='function'?exportFontFamily():'Helvetica,Arial,sans-serif'}`;if('letterSpacing' in ctx)try{ctx.letterSpacing=`${state.letterSpacing*fontPx}px`}catch{}ctx.textAlign=align;ctx.textBaseline='middle';ctx.lineJoin='round';ctx.strokeStyle='rgba(0,0,0,.28)';ctx.lineWidth=Math.max(3,fontPx*.08);const lines=typeof wrapWords==='function'?wrapWords(ctx,text,maxWidth):[String(text||'')],lh=fontPx*state.lineSpacing,total=(lines.length-1)*lh;lines.forEach((line,i)=>{ctx.strokeText(line,x,y-total/2+i*lh);ctx.fillText(line,x,y-total/2+i*lh)});ctx.restore()};
 try{window.drawTextLine=replacement}catch{}
 try{drawTextLine=replacement}catch{}
}
function repairRanges(){document.querySelectorAll('input[type="range"]').forEach(r=>{if(r.min!==''&&r.max!==''&&+r.min>+r.max){const a=r.min;r.min=r.max;r.max=a}if(!Number.isFinite(+r.step)||+r.step<=0)r.step='any'});}
function init(){installCSS();configureSize();addSpacingControls();repairRanges();applyPreview();installMutationGuard();patchExportTypography();setTimeout(()=>{repairRanges();applyPreview();patchExportTypography()},400)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
