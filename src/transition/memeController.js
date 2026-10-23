import { sounds } from '../audio/soundEffects.js';

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
    soundType: 'cinematic'
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
    this.topText = preset.defaultTopText;
    this.bottomText = preset.defaultBottomText;
    this.memeImageElement.src = this.customImageUrl && presetId === 'custom'
      ? this.customImageUrl
      : preset.image;

    this.updateCaptions();
    return preset;
  }

  setCustomImage(dataUrl, action = 'look_up', topText = 'WHEN YOU LOOK UP', bottomText = '') {
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
  updateTransition(progress, triggered) {
    this.isTriggered = triggered;

    // Audio cues
    sounds.updateRiser(progress);

    if (this.isTriggered && !this.wasTriggered) {
      // Instant dramatic impact audio!
      sounds.playMemeImpact(this.currentPreset.soundType || 'cinematic');
      this.triggerFlash();
    } else if (!this.isTriggered && this.wasTriggered) {
      sounds.playWhoosh();
    }
    this.wasTriggered = this.isTriggered;

    // Visual calculations:
    // When progress goes 0 -> 1:
    // 1. Camera scale zooms in slightly (1.0 -> 1.18)
    const camZoom = 1.0 + progress * 0.18;
    // 2. Cold blue color grading intensifies
    const blueIntensity = progress * 0.75;
    // 3. Vignette intensifies
    const vignetteOpacity = progress * 0.85;
    // 4. Meme image opacity crossfade:
    // Starts appearing at 30%, fully visible by 85%
    const memeOpacity = Math.max(0, Math.min(1.0, (progress - 0.25) / 0.60));

    if (this.videoElement) {
      this.videoElement.style.transform = `scale(${camZoom}) ${this.videoElement.dataset.mirrored === 'true' ? 'scaleX(-1)' : ''}`;
      this.videoElement.style.filter = `
        brightness(${1.0 - progress * 0.15})
        contrast(${1.0 + progress * 0.35})
        saturate(${1.0 + progress * 0.2})
      `;
    }

    if (this.memeImageElement) {
      this.memeImageElement.style.opacity = memeOpacity;
      // Slight dolly zoom into Willem Dafoe's eyes
      const memeScale = 1.08 - (1 - progress) * 0.08;
      this.memeImageElement.style.transform = `scale(${memeScale})`;
    }

    if (this.overlayElement) {
      this.overlayElement.style.setProperty('--vignette-opacity', vignetteOpacity);
      this.overlayElement.style.setProperty('--blue-grade', blueIntensity);
    }

    // Toggle meme captions visibility when triggered or close to triggered
    const captionsContainer = document.getElementById('meme-captions');
    if (captionsContainer) {
      captionsContainer.style.opacity = progress > 0.65 ? '1' : '0';
      captionsContainer.style.transform = `scale(${0.9 + progress * 0.1})`;
    }
  }

  triggerFlash() {
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
