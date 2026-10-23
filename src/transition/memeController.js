import { sounds } from '../audio/soundEffects.js';

export const ACTION_MEME_MAP = {
  look_up: {
    image: './dafoe_looking_up.png',
    soundType: 'cinematic',
    name: 'Willem Dafoe',
    hint: 'LOOK UP ⬆️'
  },
  jaw_open: {
    image: './shocked_meme.png',
    soundType: 'vine_boom',
    name: 'Shocked',
    hint: 'OPEN MOUTH 😮'
  },
  smile: {
    image: './smile_meme.png',
    soundType: 'cheerful',
    name: 'Smile Meme',
    hint: 'SMILE 😊'
  }
};

export const MEME_PRESETS = [
  {
    id: 'dafoe_looking_up',
    name: 'Willem Dafoe Looking Up',
    action: 'look_up',
    actionName: 'Tilt Head Up ⬆️',
    image: './dafoe_looking_up.png',
    defaultTopText: '',
    defaultBottomText: '',
    colorTheme: 'blue-cinematic',
    soundType: 'cinematic'
  },
  {
    id: 'shocked_jaw',
    name: 'Shocked / Open Mouth',
    action: 'jaw_open',
    actionName: 'Open Mouth / Drop Jaw 😮',
    image: './shocked_meme.png',
    defaultTopText: '',
    defaultBottomText: '',
    colorTheme: 'high-contrast',
    soundType: 'vine_boom'
  },
  {
    id: 'approving_nod',
    name: 'Smile Meme',
    action: 'smile',
    actionName: 'Smile 😊',
    image: './smile_meme.png',
    defaultTopText: '',
    defaultBottomText: '',
    colorTheme: 'warm-vintage',
    soundType: 'cheerful'
  },
  {
    id: 'auto_all',
    name: 'Auto (All Reactions)',
    action: 'auto_all',
    actionName: 'Auto Detect (Look Up, Mouth Open, or Smile) ⚡',
    image: './dafoe_looking_up.png',
    defaultTopText: '',
    defaultBottomText: '',
    colorTheme: 'dynamic',
    soundType: 'dynamic'
  }
];

export class MemeController {
  constructor(options = {}) {
    this.container = options.container;
    this.videoElement = options.videoElement;
    this.memeImageElement = options.memeImageElement;
    this.overlayElement = options.overlayElement;
    this.captionTop = options.captionTop;
    this.captionBottom = options.captionBottom;

    this.currentPreset = MEME_PRESETS[0];
    this.activeSoundType = 'cinematic';
    this.currentAutoAction = 'look_up';
    this.customImageUrl = null;
    this.isTriggered = false;
    this.wasTriggered = false;
    this.topText = this.currentPreset.defaultTopText;
    this.bottomText = this.currentPreset.defaultBottomText;

    // Recorder
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.isRecording = false;

    this.updateCaptions();
  }

  setPreset(presetId) {
    const preset = MEME_PRESETS.find(p => p.id === presetId);
    if (!preset) return;

    this.currentPreset = preset;
    this.topText = preset.defaultTopText || '';
    this.bottomText = preset.defaultBottomText || '';

    if (preset.id === 'auto_all') {
      this.memeImageElement.src = ACTION_MEME_MAP.look_up.image;
      this.activeSoundType = ACTION_MEME_MAP.look_up.soundType;
    } else {
      this.memeImageElement.src = this.customImageUrl && presetId === 'custom'
        ? this.customImageUrl
        : preset.image;
      this.activeSoundType = preset.soundType || 'cinematic';
    }

    this.updateCaptions();
    return preset;
  }

  setCustomImage(dataUrl, action = 'look_up', topText = '', bottomText = '') {
    this.customImageUrl = dataUrl;
    this.currentPreset = {
      id: 'custom',
      name: 'Custom User Meme',
      action: action,
      actionName: 'Custom Action',
      image: dataUrl,
      defaultTopText: topText,
      defaultBottomText: bottomText,
      colorTheme: 'cinematic',
      soundType: 'cinematic'
    };
    this.topText = topText;
    this.bottomText = bottomText;
    this.memeImageElement.src = dataUrl;
    this.activeSoundType = 'cinematic';
    this.updateCaptions();
  }

  setCaptions(top, bottom) {
    this.topText = top;
    this.bottomText = bottom;
    this.updateCaptions();
  }

  updateCaptions() {
    if (this.captionTop) {
      this.captionTop.textContent = this.topText;
      this.captionTop.style.display = this.topText.trim() ? 'block' : 'none';
    }
    if (this.captionBottom) {
      this.captionBottom.textContent = this.bottomText;
      this.captionBottom.style.display = this.bottomText.trim() ? 'block' : 'none';
    }
  }

  // Update visual transition based on real-time face tracking progress (0.0 to 1.0)
  updateTransition(progress, triggered, dominantAction = 'look_up') {
    this.isTriggered = triggered;
    this.triggerProgress = progress;

    // In Auto All mode: dynamically switch meme image and sound to match whichever action the user is doing!
    if (this.currentPreset.id === 'auto_all') {
      const targetAction = dominantAction && ACTION_MEME_MAP[dominantAction] ? dominantAction : 'look_up';
      if (this.currentAutoAction !== targetAction && progress > 0.10) {
        this.currentAutoAction = targetAction;
        const config = ACTION_MEME_MAP[targetAction];
        if (config) {
          this.memeImageElement.src = config.image;
          this.activeSoundType = config.soundType;
        }
      }
    }

    // Audio cues
    sounds.updateRiser(progress);

    if (this.isTriggered && !this.wasTriggered) {
      // Instant dramatic impact audio!
      const soundToPlay = this.currentPreset.id === 'auto_all'
        ? (this.activeSoundType || 'cinematic')
        : (this.currentPreset.soundType || 'cinematic');

      sounds.playMemeImpact(soundToPlay);
      this.triggerFlash();
    } else if (!this.isTriggered && this.wasTriggered) {
      sounds.playWhoosh();
    }
    this.wasTriggered = this.isTriggered;

    // Visual calculations:
    // Gentle 3% zoom so it NEVER feels zoomed in or cropped!
    const camZoom = 1.0 + progress * 0.03;
    const blueIntensity = progress * 0.75;
    const vignetteOpacity = progress * 0.85;

    // Meme image opacity crossfade:
    // Starts appearing at 20%, fully visible by 80%
    const memeOpacity = Math.max(0, Math.min(1.0, (progress - 0.20) / 0.60));

    if (this.videoElement) {
      this.videoElement.style.transform = `scale(${camZoom}) ${this.videoElement.dataset.mirrored === 'true' ? 'scaleX(-1)' : ''}`;
      this.videoElement.style.filter = `
        brightness(${1.0 - progress * 0.12})
        contrast(${1.0 + progress * 0.25})
        saturate(${1.0 + progress * 0.15})
      `;
    }

    if (this.memeImageElement) {
      this.memeImageElement.style.opacity = memeOpacity;
      // Gentle 2% scale without zooming in or cutting off hands/face
      const memeScale = 1.0 + progress * 0.02;
      this.memeImageElement.style.transform = `translate(-50%, -50%) scale(${memeScale})`;
    }

    if (this.overlayElement) {
      this.overlayElement.style.setProperty('--vignette-opacity', vignetteOpacity);
      this.overlayElement.style.setProperty('--blue-grade', blueIntensity);
    }

    // Toggle meme captions visibility when triggered or close to triggered
    const captionsContainer = document.getElementById('meme-captions');
    if (captionsContainer) {
      captionsContainer.style.opacity = (this.topText.trim() || this.bottomText.trim()) && progress > 0.65 ? '1' : '0';
      captionsContainer.style.transform = `scale(${0.95 + progress * 0.05})`;
    }
  }

  triggerFlash() {
    this.flashProgress = 0.85;
    const flashEl = document.getElementById('trigger-flash');
    if (flashEl) {
      flashEl.classList.remove('active');
      void flashEl.offsetWidth; // Force reflow
      flashEl.classList.add('active');
    }
  }

  // Export current meme snapshot as clean PNG
  captureSnapshot() {
    sounds.playClick();
    const canvas = document.createElement('canvas');
    const w = 1280;
    const h = 720;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');

    // Draw either meme image or current video frame
    const sourceImg = this.isTriggered ? this.memeImageElement : this.videoElement;

    try {
      ctx.drawImage(sourceImg, 0, 0, w, h);
    } catch (_) {
      // Fallback to meme image if video security blocks drawImage
      ctx.drawImage(this.memeImageElement, 0, 0, w, h);
    }

    // Draw captions
    ctx.font = '900 48px Impact, Anton, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 8;
    ctx.lineJoin = 'miter';

    if (this.topText.trim()) {
      ctx.strokeText(this.topText.toUpperCase(), w / 2, 70);
      ctx.fillText(this.topText.toUpperCase(), w / 2, 70);
    }

    if (this.bottomText.trim()) {
      ctx.strokeText(this.bottomText.toUpperCase(), w / 2, h - 40);
      ctx.fillText(this.bottomText.toUpperCase(), w / 2, h - 40);
    }

    // Watermark
    ctx.font = '600 18px Outfit, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fillText('AR Meme Experience', w - 120, h - 15);

    // Download PNG
    const link = document.createElement('a');
    link.download = `ar_meme_${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  // Record 5-second reaction clip
  async startRecording(stream) {
    if (this.isRecording) return;
    this.recordedChunks = [];

    try {
      const options = { mimeType: 'video/webm;codecs=vp9' };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options.mimeType = 'video/webm';
      }

      this.mediaRecorder = new MediaRecorder(stream, options);
      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          this.recordedChunks.push(e.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ar_meme_reaction_${Date.now()}.webm`;
        a.click();
        URL.revokeObjectURL(url);
      };

      this.mediaRecorder.start();
      this.isRecording = true;
      return true;
    } catch (e) {
      console.error('Failed to start recording:', e);
      return false;
    }
  }

  stopRecording() {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.isRecording = false;
    }
  }
}
