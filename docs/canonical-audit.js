'use strict';
(()=>{
  const $=s=>document.querySelector(s);
  function audit(){
    const missing=[];
    const require=(ok,name)=>{if(!ok)missing.push(name)};
    require(!!window.linaRuntime,'runtime');
    require(window.render===window.linaRuntime?.render,'render-owner');
    require(String(document.documentElement.dataset.transportOwner||'').startsWith('canonical'),'transport-owner');
    require(String(document.documentElement.dataset.exportOwner||'').startsWith('canonical'),'export-owner');
    require(document.documentElement.dataset.projectResetOwner==='hard-v2','project-reset-owner');
    require(document.documentElement.dataset.controlsOwner==='canonical-v1','controls-owner');
    require(document.documentElement.dataset.uiOwner==='canonical-v1','ui-owner');
    require($('#resetProjectVisible')?.dataset.linaOwner==='project-hard-v3','full-project-reset');
    require(!$('#quickResetLayout')&&!$('#linaFreshReset')&&!$('#resetLyricsBtn')&&!$('#resetBtn'),'retired-reset-control-present');
    require($('#quickEffect')?.dataset.linaOwner==='canonical','quick-effect-owner');
    require(!$('#styleEffectSelect')&&!$('#nav [data-tool="style"]')&&!$('[data-panel="style"]'),'retired-style-ui-present');
    require(!$('#rightsConfirm'),'retired-rights-control-present');
    require(!!$('.preview-sticky-shell')&&!!$('.stage-wrap')&&!!$('#story'),'preview-stack');
    require(!!$('#previewQuickControls'),'quick-settings');
    require(!window.linaPreviewRuntime,'retired-preview-runtime-present');
    require(!window.linaPreviewRecovery,'retired-preview-recovery-present');
    const result={checked:15,missing,passed:15-missing.length,mode:'read-only',owners:{render:document.documentElement.dataset.renderOwner,layout:document.documentElement.dataset.layoutOwner,effect:document.documentElement.dataset.effectOwner,transport:document.documentElement.dataset.transportOwner,export:document.documentElement.dataset.exportOwner,projectReset:document.documentElement.dataset.projectResetOwner,controls:document.documentElement.dataset.controlsOwner,ui:document.documentElement.dataset.uiOwner,reset:$('#resetProjectVisible')?.dataset.linaOwner||'missing'}};
    window.linaSystemAudit=result;return result;
  }
  window.linaAuditSystem=audit;
  document.documentElement.dataset.auditMode='read-only';
  audit();
})();
