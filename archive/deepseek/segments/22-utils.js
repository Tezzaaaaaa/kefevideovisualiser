import { DEFAULT_STATE } from './config.js';

class AppState {
  constructor() {
    this.state = this.loadState();
    this.media = { image: null, video: null };
    this.audioURL = null;
    this.backgroundURL = null;
    this.albumArtworkImage = null;
    this.albumArtworkURL = null;
    this.mediaTagsLoadPromise = null;
    this.audioLoadToken = 0;
    this.backgroundLoadToken = 0;
    this.pendingProjectMetadata = null;
    this.exportClockTime = null;
    this.previewTimeBeforeExport = 0;
    this.renderLoopId = null;
    this.isExporting = false;
    this.userScrubbing = false;
    this.lastVideoHardSync = -Infinity;
    this.exportCanvas = null;
    this.exportCtx = null;
    this.exportCancelled = false;
    this.exportAbortController = null;
    this.previewRestored = false;
    this.lastVideoFrame = document.createElement("canvas");
    this.lastVideoFrameCtx = this.lastVideoFrame.getContext("2d");
    this.hasLastVideoFrame = false;
  }

  loadState() {
    const LINA_PREFS_KEY = 'lina-visualiser-prefs-v1';