import { StudioSync } from './broadcastSync.js';

export class VirtualCamManager {
  constructor(options = {}) {
    this.videoElement = options.videoElement;
    this.memeController = options.memeController;
    this.onStateChange = options.onStateChange || null;

    this.isOn = false;
    this.popoutWindow = null;
    this.pipVideo = null;
    this.isPiPActive = false;

    this.canvas = document.createElement('canvas');
    this.canvas.width = 1280;
    this.canvas.height = 720;
    this.ctx = this.canvas.getContext('2d');
    this.stream = null;
    this.animId = null;

    // Sync between Studio Editor and clean Virtual Cam windows
    this.sync = new StudioSync((msg) => this.handleSyncMessage(msg));

    this.initCompositor();
  }

  initCompositor() {
    this.pipVideo = document.createElement('video');
    this.pipVideo.id = 'pip-video-stream';
    this.pipVideo.muted = true;
    this.pipVideo.autoplay = true;
    this.pipVideo.playsInline = true;
    this.pipVideo.style.display = 'none';
    document.body.appendChild(this.pipVideo);

    try {
      this.stream = this.canvas.captureStream(60);
      this.pipVideo.srcObject = this.stream;
    } catch (e) {
      console.warn('captureStream error:', e);
    }

    this.startRenderLoop();
  }

  // Toggle Virtual Camera ON / OFF
  toggleVirtualCamera(forceState = null) {
    this.isOn = forceState !== null ? forceState : !this.isOn;

    if (this.onStateChange) {
      this.onStateChange(this.isOn);
    }

    // Broadcast state to any connected windows
    this.sync.emit('VIRTUAL_CAM_STATE', { isOn: this.isOn });

    return this.isOn;
  }

  startRenderLoop() {
    const render = () => {
      this.drawCompositedFrame();
      this.animId = requestAnimationFrame(render);
    };
    this.animId = requestAnimationFrame(render);
  }

  drawCompositedFrame() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.clearRect(0, 0, w, h);

    if (!this.isOn) {
      // Standby / Offline Screen when Virtual Cam is OFF
      ctx.fillStyle = '#07090e';
      ctx.fillRect(0, 0, w, h);

      // Cyberpunk grid lines
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.06)';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      ctx.font = '700 28px Outfit, sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.textAlign = 'center';
      ctx.fillText('AR MEME VIRTUAL CAMERA', w / 2, h / 2 - 15);

      ctx.font = '500 16px Outfit, sans-serif';
      ctx.fillStyle = '#ff0055';
      ctx.fillText('● VIRTUAL CAMERA IS OFF / STANDBY', w / 2, h / 2 + 25);
      return;
    }

    // 1. Draw Live Mirrored Camera Stream
    if (this.videoElement && this.videoElement.readyState >= 2) {
      ctx.save();
      const isMirrored = this.videoElement.dataset.mirrored === 'true';
      if (isMirrored) {
        ctx.translate(w, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(this.videoElement, 0, 0, w, h);
      ctx.restore();
    } else {
      ctx.fillStyle = '#0a0f1a';
      ctx.fillRect(0, 0, w, h);
    }

    const progress = this.memeController ? (this.memeController.triggerProgress || 0) : 0;

    // 2. Cold Blue Cinematic Color Grade & Vignette
    if (progress > 0.05) {
      ctx.save();
      ctx.fillStyle = `rgba(13, 43, 69, ${progress * 0.45})`;
      ctx.fillRect(0, 0, w, h);

      const gradient = ctx.createRadialGradient(w / 2, h / 2, w * 0.25, w / 2, h / 2, w * 0.65);
      gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
      gradient.addColorStop(1, `rgba(2, 6, 15, ${progress * 0.75})`);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }

    // 3. Draw Meme Image Layer with proper aspect ratio (no over-zooming!)
    const memeImg = this.memeController ? this.memeController.memeImageElement : null;
    if (memeImg && memeImg.complete && memeImg.naturalWidth > 0 && progress > 0.15) {
      const memeOpacity = Math.max(0, Math.min(1.0, (progress - 0.15) / 0.65));
      ctx.save();
      ctx.globalAlpha = memeOpacity;

      const maxW = w * 0.88;
      const maxH = h * 0.88;
      const imgAspect = memeImg.naturalWidth / memeImg.naturalHeight;
      let drawW, drawH;

      if (maxW / maxH > imgAspect) {
        drawH = maxH;
        drawW = drawH * imgAspect;
      } else {
        drawW = maxW;
        drawH = drawW / imgAspect;
      }

      const dx = (w - drawW) / 2;
      const dy = (h - drawH) / 2;

      ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
      ctx.shadowBlur = 30;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 15;

      ctx.drawImage(memeImg, dx, dy, drawW, drawH);
      ctx.restore();
    }

    // 4. Trigger White Flash
    if (this.memeController && this.memeController.flashProgress > 0) {
      ctx.fillStyle = `rgba(255, 255, 255, ${this.memeController.flashProgress})`;
      ctx.fillRect(0, 0, w, h);
      this.memeController.flashProgress *= 0.85;
      if (this.memeController.flashProgress < 0.02) this.memeController.flashProgress = 0;
    }

    // 5. Captions
    const topText = this.memeController ? this.memeController.topText : '';
    const bottomText = this.memeController ? this.memeController.bottomText : '';
    if ((topText.trim() || bottomText.trim()) && progress > 0.6) {
      ctx.save();
      ctx.font = '900 52px Impact, Anton, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 8;
      ctx.lineJoin = 'miter';

      if (topText.trim()) {
        ctx.strokeText(topText.toUpperCase(), w / 2, 75);
        ctx.fillText(topText.toUpperCase(), w / 2, 75);
      }
      if (bottomText.trim()) {
        ctx.strokeText(bottomText.toUpperCase(), w / 2, h - 35);
        ctx.fillText(bottomText.toUpperCase(), w / 2, h - 35);
      }
      ctx.restore();
    }
  }

  // Pop-out Clean Broadcast Window
  openCleanWindow() {
    const cleanUrl = `${window.location.origin}${window.location.pathname}?clean=true`;
    if (this.popoutWindow && !this.popoutWindow.closed) {
      this.popoutWindow.focus();
      return this.popoutWindow;
    }
    this.popoutWindow = window.open(
      cleanUrl,
      'AR_Meme_Virtual_Cam',
      'width=1280,height=720,menubar=no,toolbar=no,location=no,status=no,resizable=yes'
    );
    if (this.popoutWindow) this.popoutWindow.focus();
    return this.popoutWindow;
  }

  // Picture-in-Picture floating camera
  async togglePictureInPicture() {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        this.isPiPActive = false;
        return false;
      } else if (this.pipVideo) {
        await this.pipVideo.play();
        await this.pipVideo.requestPictureInPicture();
        this.isPiPActive = true;
        return true;
      }
    } catch (e) {
      console.warn('PiP error:', e);
      this.openCleanWindow();
      return false;
    }
  }

  handleSyncMessage(msg) {
    if (!msg || !msg.type) return;

    if (msg.type === 'VIRTUAL_CAM_STATE') {
      this.isOn = !!msg.payload.isOn;
      if (this.onStateChange) this.onStateChange(this.isOn);
    }
  }

  broadcastSetting(name, value) {
    this.sync.emit('UPDATE_SETTING', { name, value });
  }
}
