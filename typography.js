/* KEFE Visualiser — canonical typography system */
(() => {
  'use strict';
  const scale={ratio:1.25,micro:10,caption:12.5,label:15.625,body:19.53125,bodyLarge:24.414,title:30.518,display:38.147,displayXL:47.684};
  const families={ui:'Open Sans',apple:'Open Sans',brat:'Arial Narrow',eternal:'Homemade Apple',aurora:'Permanent Marker',typewriter:'Triplicate, Courier Prime',instagram:'Inter Tight',fadeup:'DM Sans',mixedmedia:'Open Sans'};
  const effects={
    apple:{family:families.apple,weight:700,min:42,max:150,lineHeight:1.10,tracking:-.018,align:'center',case:'none'},
    brat:{family:families.brat,weight:900,min:36,max:150,lineHeight:.98,tracking:-.035,align:'center',case:'none'},
    eternal:{family:families.eternal,weight:400,min:34,max:150,lineHeight:1,tracking:0,align:'left',case:'none'},
    aurora:{family:families.aurora,weight:400,min:38,max:150,lineHeight:1,tracking:-.01,align:'center',case:'none'},
    typewriter:{family:families.typewriter,weight:400,min:32,max:140,lineHeight:1,tracking:.012,align:'center',case:'none'},
    instagram:{family:families.instagram,weight:800,min:48,max:150,lineHeight:.80,tracking:-.032,align:'center',case:'upper'},
    fadeup:{family:families.fadeup,weight:700,min:34,max:150,lineHeight:1.10,tracking:-.012,align:'center',case:'none'},
    mixedmedia:{family:families.mixedmedia,weight:800,min:34,max:150,lineHeight:1.0,tracking:.012,align:'center',case:'none'}
  };
  const fontFaces=['400 1em "Open Sans"','700 1em "Open Sans"','800 1em "Open Sans"','900 1em "Montserrat"','800 1em "Montserrat"','700 1em "DM Sans"','400 1em "Permanent Marker"','400 1em "Homemade Apple"','400 1em "Triplicate"','400 1em "Courier Prime"','800 1em "Inter Tight"'];
  const ready=(async()=>{if(!document.fonts?.ready)return true;await document.fonts.ready;await Promise.all(fontFaces.map(face=>document.fonts.load(face).catch(()=>null)));return true;})();
  window.KEFE_TYPE=Object.freeze({scale,families,effects,ready});window.kefeTypographyReady=ready;
  const guarded=new WeakSet();
  function guard(button){if(!button||guarded.has(button))return;guarded.add(button);button.addEventListener('click',event=>{if(button.dataset.kefeFontsReady==='1')return;event.preventDefault();event.stopImmediatePropagation();button.disabled=true;ready.finally(()=>{button.disabled=false;button.dataset.kefeFontsReady='1';button.click();});},true);}
  function installGuards(){['exportBtn','exportBottom','confirmExport'].forEach(id=>guard(document.getElementById(id)));}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installGuards,{once:true});else installGuards();
  ready.then(()=>window.dispatchEvent(new CustomEvent('kefe:fonts-ready')));
})();
