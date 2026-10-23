import { FaceTracker } from './vision/faceTracker.js';
import { MemeController, MEME_PRESETS } from './transition/memeController.js';
import { sounds } from './audio/soundEffects.js';
import { VirtualCamManager } from './virtualcam/virtualCamManager.js';

// Clean Cam Mode URL check (?clean=true)
const urlParams = new URLSearchParams(window.location.search);
const isCleanMode = urlParams.get('clean') === 'true';
if (isCleanMode) {
  document.body.classList.add('clean-cam-mode');
}

// DOM Elements
const webcam = document.getElementById('webcam');
const memeImage = document.getElementById('meme-image');
const meshCanvas = document.getElementById('mesh-canvas');
const cinematicOverlay = document.getElementById('cinematic-overlay');
const captionTop = document.getElementById('caption-top');
const captionBottom = document.getElementById('caption-bottom');
const statusDot = document.getElementById('status-dot');
const hudStatusText = document.getElementById('hud-status-text');
const hudPitchValue = document.getElementById('hud-pitch-value');
const hudActionHint = document.getElementById('hud-action-hint');
const meterFill = document.getElementById('meter-fill');
const meterText = document.getElementById('meter-text');
const loadingOverlay = document.getElementById('loading-overlay');
const loadingStatus = document.getElementById('loading-status');
const vcamStandbyOverlay = document.getElementById('vcam-standby-overlay');
const viewportFrame = document.getElementById('viewport-frame');

// Controls
const btnVcamMasterToggle = document.getElementById('btn-vcam-master-toggle');
const vcamMasterDot = document.getElementById('vcam-master-dot');
const vcamMasterText = document.getElementById('vcam-master-text');
const vcamBroadcastBar = document.getElementById('vcam-broadcast-bar');

const btnBarPopout = document.getElementById('btn-bar-popout');
const btnBarPip = document.getElementById('btn-bar-pip');
const btnBarCopy = document.getElementById('btn-bar-copy');
const copyBtnText = document.getElementById('copy-btn-text');
const btnBarGuide = document.getElementById('btn-bar-guide');
const btnGuideToggle = document.getElementById('btn-guide-toggle');

const modalVirtualCam = document.getElementById('modal-virtualcam');
const btnModalClose = document.getElementById('btn-modal-close');
const btnModalDone = document.getElementById('btn-modal-done');
const btnOpenPopout = document.getElementById('btn-open-popout');
const btnPipToggle = document.getElementById('btn-pip-toggle');
const obsUrl = document.getElementById('obs-url');

const btnCalibrate = document.getElementById('btn-calibrate');
const btnRecalibrateDrawer = document.getElementById('btn-recalibrate-drawer');
const btnMeshToggle = document.getElementById('btn-mesh-toggle');
const btnMirrorToggle = document.getElementById('btn-mirror-toggle');
const btnSoundToggle = document.getElementById('btn-sound-toggle');
const btnDrawerToggle = document.getElementById('btn-drawer-toggle');
const btnDrawerClose = document.getElementById('btn-drawer-close');
const drawerPanel = document.getElementById('drawer-panel');

const inputTopText = document.getElementById('input-top-text');
const inputBottomText = document.getElementById('input-bottom-text');
const selectTriggerAction = document.getElementById('select-trigger-action');
const sliderSensitivity = document.getElementById('slider-sensitivity');
const labelSensitivity = document.getElementById('label-sensitivity');

const presetsContainer = document.getElementById('presets-container');
const btnUploadTrigger = document.getElementById('btn-upload-trigger');
const fileUpload = document.getElementById('file-upload');
const btnSnapshot = document.getElementById('btn-snapshot');
const btnRecord = document.getElementById('btn-record');
const recordText = document.getElementById('record-text');

let isMuted = true; // Sound muted by default as requested
let isMeshEnabled = false;
let isMirrored = true;
let isRecording = false;
let recordTimeout = null;

// Initialize Meme Controller
const memeController = new MemeController({
  container: document.getElementById('viewport-frame'),
  videoElement: webcam,
  memeImageElement: memeImage,
  overlayElement: cinematicOverlay,
  captionTop: captionTop,
  captionBottom: captionBottom
});

// Initialize Virtual Cam Manager
const virtualCam = new VirtualCamManager({
  videoElement: webcam,
  memeController: memeController
});

// Initialize Face Tracker
const tracker = new FaceTracker({
  onFrame: handleVisionFrame
});

function handleVisionFrame(data) {
  const { hasFace, triggerProgress, isTriggered, pitchDeg, activeTriggerType, dominantAction } = data;

  if (!hasFace) {
    statusDot.className = 'status-dot';
    hudStatusText.textContent = 'LOOK AT CAMERA TO ACTIVATE';
    meterFill.style.width = '0%';
    memeController.updateTransition(0, false, dominantAction);
    return;
  }

  // Update Telemetry
  hudPitchValue.textContent = `${pitchDeg >= 0 ? '+' : ''}${pitchDeg.toFixed(1)}°`;

  const isAuto = activeTriggerType === 'auto_all';
  const currentAction = isAuto ? (dominantAction || 'look_up') : activeTriggerType;

  if (isTriggered) {
    statusDot.className = 'status-dot triggered';
    hudStatusText.textContent = `${getActionName(currentAction).toUpperCase()} TRIGGERED!`;
    meterText.textContent = `🔥 ${getActionName(currentAction).toUpperCase()} ACTIVE 🔥`;
  } else if (triggerProgress > 0.20) {
    statusDot.className = 'status-dot active';
    hudStatusText.textContent = `${getActionName(currentAction).toUpperCase()} (${Math.round(triggerProgress * 100)}%)`;
    meterText.textContent = `${Math.round(triggerProgress * 100)}% - ${getActionHint(currentAction)}`;
  } else {
    statusDot.className = 'status-dot active';
    if (isAuto) {
      hudStatusText.textContent = 'AUTO MODE • DO ANY ACTION';
      meterText.textContent = 'LOOK UP ⬆️ • OPEN MOUTH 😮 • SMILE 😊';
    } else {
      hudStatusText.textContent = 'READY • ' + getActionHint(currentAction);
      meterText.textContent = getActionHint(currentAction) + ' TO TRIGGER';
    }
  }

  // Update Trigger Bar Fill
  meterFill.style.width = `${Math.min(100, triggerProgress * 100)}%`;

  // Update Visuals & Audio in Controller
  memeController.updateTransition(triggerProgress, isTriggered, dominantAction);
}

function getActionName(type) {
  switch (type) {
    case 'look_up': return 'Willem Dafoe';
    case 'jaw_open': return 'Shocked';
    case 'smile': return 'Smile Meme';
    case 'auto_all': return 'Auto';
    default: return 'Meme';
  }
}

function getActionHint(type) {
  switch (type) {
    case 'look_up': return 'LOOK UP ⬆️';
    case 'jaw_open': return 'OPEN MOUTH 😮';
    case 'smile': return 'SMILE 😊';
    case 'auto_all': return 'ANY GESTURE ⚡';
    case 'tilt_side': return 'TILT HEAD 🔄';
    default: return 'ACTION';
  }
}

// Adjust Canvas Resolution to Video Aspect Ratio
function syncCanvasSize() {
  if (webcam.videoWidth && webcam.videoHeight) {
    meshCanvas.width = webcam.videoWidth;
    meshCanvas.height = webcam.videoHeight;
  }
}
webcam.addEventListener('loadedmetadata', syncCanvasSize);
window.addEventListener('resize', syncCanvasSize);

// App Startup Flow
async function startup() {
  try {
    loadingStatus.textContent = 'Loading MediaPipe Face AI Models...';
    await tracker.init(webcam, meshCanvas);

    loadingStatus.textContent = 'Requesting Camera Access...';

    // Race camera start with a 3.5s timeout so UI is never permanently blocked
    const cameraPromise = tracker.startCamera();
    const timeoutPromise = new Promise(resolve => setTimeout(() => resolve('timeout'), 3500));

    const outcome = await Promise.race([cameraPromise, timeoutPromise]);

    // Fade out loading screen
    loadingOverlay.style.opacity = '0';
    setTimeout(() => {
      loadingOverlay.style.display = 'none';
    }, 450);

    if (outcome === 'timeout') {
      hudStatusText.textContent = 'CLICK CAMERA TO ALLOW ACCESS';
      cameraPromise.then(() => {
        hudStatusText.textContent = 'READY';
      }).catch(err => {
        console.warn('Camera deferred access notice:', err);
        hudStatusText.textContent = 'CAMERA ACCESS PAUSED (CLICK TO RETRY)';
      });
    }

    // Initial audio prompt: start AudioContext on first user gesture
    const enableAudio = () => {
      sounds.init();
      window.removeEventListener('click', enableAudio);
      window.removeEventListener('touchstart', enableAudio);
    };
    window.addEventListener('click', enableAudio);
    window.addEventListener('touchstart', enableAudio);

  } catch (err) {
    console.error('Startup error:', err);
    // Dismiss loading overlay so controls remain usable
    loadingOverlay.style.opacity = '0';
    setTimeout(() => {
      loadingOverlay.style.display = 'none';
    }, 450);
    hudStatusText.textContent = 'CAMERA ERROR - CLICK TO RETRY';
  }
}

// Click viewport to retry camera if needed
if (viewportFrame) {
  viewportFrame.addEventListener('click', async () => {
    if (!tracker.isRunning) {
      hudStatusText.textContent = 'CONNECTING CAMERA...';
      try {
        await tracker.startCamera();
        hudStatusText.textContent = 'READY';
      } catch (e) {
        console.warn('Manual camera restart error:', e);
        hudStatusText.textContent = 'CAMERA BLOCKED / PERMISSION NEEDED';
      }
    }
  });
}

// Virtual Camera UI Sync & Handlers
function updateVirtualCamUI(isOn) {
  if (btnVcamMasterToggle) {
    if (isOn) {
      btnVcamMasterToggle.classList.add('active');
      vcamMasterText.textContent = 'Virtual Cam: ON';
      if (vcamBroadcastBar) vcamBroadcastBar.classList.add('visible');
    } else {
      btnVcamMasterToggle.classList.remove('active');
      vcamMasterText.textContent = 'Virtual Cam: OFF';
      if (vcamBroadcastBar) vcamBroadcastBar.classList.remove('visible');
    }
  }

  if (vcamStandbyOverlay) {
    if (!isOn) {
      vcamStandbyOverlay.classList.add('active');
    } else {
      vcamStandbyOverlay.classList.remove('active');
    }
  }
}

virtualCam.onStateChange = (isOn) => {
  updateVirtualCamUI(isOn);
};

if (btnVcamMasterToggle) {
  btnVcamMasterToggle.addEventListener('click', () => {
    sounds.playClick();
    const newState = virtualCam.toggleVirtualCamera();
    updateVirtualCamUI(newState);
  });
}

function openGuideModal() {
  if (obsUrl) {
    obsUrl.textContent = `${window.location.origin}${window.location.pathname}?clean=true`;
  }
  if (modalVirtualCam) modalVirtualCam.classList.add('open');
}

if (btnGuideToggle) btnGuideToggle.addEventListener('click', openGuideModal);
if (btnBarGuide) btnBarGuide.addEventListener('click', openGuideModal);
if (btnModalClose) btnModalClose.addEventListener('click', () => modalVirtualCam.classList.remove('open'));
if (btnModalDone) btnModalDone.addEventListener('click', () => modalVirtualCam.classList.remove('open'));

if (btnOpenPopout) {
  btnOpenPopout.addEventListener('click', () => {
    virtualCam.toggleVirtualCamera(true);
    virtualCam.openCleanWindow();
  });
}

if (btnBarPopout) {
  btnBarPopout.addEventListener('click', () => {
    virtualCam.openCleanWindow();
  });
}

if (btnPipToggle) {
  btnPipToggle.addEventListener('click', async () => {
    virtualCam.toggleVirtualCamera(true);
    await virtualCam.togglePictureInPicture();
  });
}

if (btnBarPip) {
  btnBarPip.addEventListener('click', async () => {
    await virtualCam.togglePictureInPicture();
  });
}

if (btnBarCopy) {
  btnBarCopy.addEventListener('click', async () => {
    const url = `${window.location.origin}${window.location.pathname}?clean=true`;
    try {
      await navigator.clipboard.writeText(url);
      if (copyBtnText) copyBtnText.textContent = '✅ Copied!';
      setTimeout(() => { if (copyBtnText) copyBtnText.textContent = '📋 Copy OBS URL'; }, 2000);
    } catch (_) {
      prompt('Copy this clean URL for OBS Studio:', url);
    }
  });
}

// Clean Mode Receiver (when opened as ?clean=true)
if (isCleanMode) {
  virtualCam.toggleVirtualCamera(true);
  updateVirtualCamUI(true);
  virtualCam.sync.onMessage = (msg) => {
    if (msg.type === 'UPDATE_SETTING') {
      const { name, value } = msg.payload;
      if (name === 'preset') memeController.setPreset(value);
      if (name === 'sensitivity') tracker.setSensitivity(value);
      if (name === 'action') tracker.setTriggerType(value);
      if (name === 'captions') memeController.setCaptions(value.top, value.bottom);
      if (name === 'neutralPitch') tracker.neutralPitch = value;
    } else if (msg.type === 'VIRTUAL_CAM_STATE') {
      virtualCam.isOn = !!msg.payload.isOn;
      updateVirtualCamUI(virtualCam.isOn);
    }
  };
}

// Calibration
function triggerCalibration() {
  const newPitch = tracker.calibrateNeutral();
  sounds.playClick();
  virtualCam.broadcastSetting('neutralPitch', newPitch);
  hudStatusText.textContent = 'CALIBRATED TO CURRENT POSE!';
  setTimeout(() => {
    hudStatusText.textContent = 'READY';
  }, 1500);
}

btnCalibrate.addEventListener('click', triggerCalibration);
btnRecalibrateDrawer.addEventListener('click', triggerCalibration);

// Mesh Toggle
btnMeshToggle.addEventListener('click', () => {
  sounds.playClick();
  isMeshEnabled = !isMeshEnabled;
  tracker.setShowMesh(isMeshEnabled);
  btnMeshToggle.style.borderColor = isMeshEnabled ? 'var(--accent-cyan)' : 'var(--surface-border)';
  btnMeshToggle.style.color = isMeshEnabled ? 'var(--accent-cyan)' : 'var(--text-main)';
});

// Mirror Toggle
btnMirrorToggle.addEventListener('click', () => {
  sounds.playClick();
  isMirrored = !isMirrored;
  webcam.dataset.mirrored = isMirrored ? 'true' : 'false';
  tracker.setMirrored(isMirrored);
});

// Sound Toggle (Muted by default as requested)
btnSoundToggle.addEventListener('click', () => {
  isMuted = !isMuted;
  sounds.setMuted(isMuted);
  btnSoundToggle.textContent = isMuted ? '🔇' : '🔊';
  btnSoundToggle.title = isMuted ? 'Sound Muted' : 'Sound Enabled';
});

// Drawer Open / Close
btnDrawerToggle.addEventListener('click', () => {
  sounds.playClick();
  drawerPanel.classList.toggle('open');
});

btnDrawerClose.addEventListener('click', () => {
  sounds.playClick();
  drawerPanel.classList.remove('open');
});

// Caption Inputs Live Update (Broadcasts in real time)
function onCaptionChange() {
  memeController.setCaptions(inputTopText.value, inputBottomText.value);
  virtualCam.broadcastSetting('captions', { top: inputTopText.value, bottom: inputBottomText.value });
}
inputTopText.addEventListener('input', onCaptionChange);
inputBottomText.addEventListener('input', onCaptionChange);

// Sensitivity Slider (Broadcasts in real time)
sliderSensitivity.addEventListener('input', (e) => {
  const val = parseFloat(e.target.value);
  tracker.setSensitivity(val);
  labelSensitivity.textContent = `${val.toFixed(1)}x`;
  virtualCam.broadcastSetting('sensitivity', val);
});

// Trigger Action Select (Broadcasts in real time)
selectTriggerAction.addEventListener('change', (e) => {
  const action = e.target.value;
  tracker.setTriggerType(action);
  hudActionHint.textContent = `(${getActionHint(action)})`;
  virtualCam.broadcastSetting('action', action);
});

// Meme Presets Selection (Broadcasts in real time)
presetsContainer.addEventListener('click', (e) => {
  const chip = e.target.closest('.preset-chip');
  if (!chip || chip.id === 'btn-upload-trigger') return;

  const presetId = chip.dataset.preset;
  if (!presetId) return;

  sounds.playClick();
  document.querySelectorAll('.preset-chip').forEach(c => c.classList.remove('active'));
  chip.classList.add('active');

  const preset = memeController.setPreset(presetId);
  if (preset) {
    tracker.setTriggerType(preset.action);
    selectTriggerAction.value = preset.action;
    inputTopText.value = preset.defaultTopText;
    inputBottomText.value = preset.defaultBottomText;
    hudActionHint.textContent = `(${getActionHint(preset.action)})`;
    virtualCam.broadcastSetting('preset', presetId);
  }
});

// Custom Meme Upload
btnUploadTrigger.addEventListener('click', () => {
  sounds.playClick();
  fileUpload.click();
});

fileUpload.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    const dataUrl = event.target.result;
    document.querySelectorAll('.preset-chip').forEach(c => c.classList.remove('active'));
    btnUploadTrigger.classList.add('active');

    const top = inputTopText.value || '';
    const bottom = inputBottomText.value || '';
    const action = selectTriggerAction.value || 'look_up';

    memeController.setCustomImage(dataUrl, action, top, bottom);
  };
  reader.readAsDataURL(file);
});

// Snap Photo
btnSnapshot.addEventListener('click', () => {
  memeController.captureSnapshot();
});

// Record Video (5 seconds reaction recording)
btnRecord.addEventListener('click', async () => {
  if (isRecording) {
    memeController.stopRecording();
    isRecording = false;
    recordText.textContent = 'Record';
    btnRecord.classList.remove('btn-danger');
    if (recordTimeout) clearTimeout(recordTimeout);
    return;
  }

  if (!webcam.srcObject) return;

  sounds.playClick();
  const ok = await memeController.startRecording(webcam.srcObject);
  if (ok) {
    isRecording = true;
    recordText.textContent = 'Stop (5s)';
    btnRecord.classList.add('btn-danger');

    // Auto stop after 5 seconds
    recordTimeout = setTimeout(() => {
      if (isRecording) {
        memeController.stopRecording();
        isRecording = false;
        recordText.textContent = 'Record';
        btnRecord.classList.remove('btn-danger');
      }
    }, 5000);
  }
});

// Run
startup();
