import { FilesetResolver, FaceLandmarker } from '@mediapipe/tasks-vision';

export class FaceTracker {
  constructor(options = {}) {
    this.videoElement = null;
    this.canvasElement = null;
    this.canvasCtx = null;
    this.landmarker = null;
    this.isRunning = false;
    this.isModelLoaded = false;
    this.onFrameCallback = options.onFrame || null;
    this.showMesh = false;
    this.mirrored = true;

    // Calibration & Thresholds
    this.neutralPitch = null;
    this.sensitivity = 1.0; // 0.5 (low) to 2.0 (high)
    this.activeTriggerType = 'look_up'; // 'look_up', 'jaw_open', 'smile', 'tilt_side'

    // Smoothed values to avoid jitter
    this.smoothedPitch = 0;
    this.smoothedEyeLookUp = 0;
    this.smoothedJawOpen = 0;
    this.smoothedSmile = 0;
    this.smoothedRoll = 0;
    this.smoothedTriggerProgress = 0;

    this.lastVideoTime = -1;
    this.animFrameId = null;
  }

  async init(videoElement, canvasElement) {
    this.videoElement = videoElement;
    this.canvasElement = canvasElement;
    if (this.canvasElement) {
      this.canvasCtx = this.canvasElement.getContext('2d');
    }

    try {
      // Initialize MediaPipe Vision Tasks
      // Try local wasm first, fallback to CDN if needed
      let vision;
      try {
        vision = await FilesetResolver.forVisionTasks('./wasm');
      } catch (wasmErr) {
        console.warn('Local wasm load fallback to CDN:', wasmErr);
        vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
        );
      }

      // Try local model first, fallback to CDN
      let modelPath = './models/face_landmarker.task';
      try {
        const check = await fetch(modelPath, { method: 'HEAD' });
        if (!check.ok) throw new Error('Local model not found');
      } catch (_) {
        modelPath = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';
      }

      this.landmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: modelPath,
          delegate: 'GPU'
        },
        outputFaceBlendshapes: true,
        outputFacialTransformationMatrixes: true,
        runningMode: 'VIDEO',
        numFaces: 1
      });

      this.isModelLoaded = true;
      return true;
    } catch (err) {
      console.error('Failed to initialize FaceLandmarker:', err);
      throw err;
    }
  }

  async startCamera(deviceId = null) {
    if (!this.videoElement) return;

    let stream = null;
    const constraints = {
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: deviceId ? undefined : 'user',
        deviceId: deviceId ? { exact: deviceId } : undefined
      },
      audio: false
    };

    try {
      stream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err) {
      console.warn('Initial 720p camera constraints failed, attempting fallback to basic video:', err);
      // Fallback: request any video camera without strict resolution
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: deviceId ? { deviceId: { exact: deviceId } } : true,
          audio: false
        });
      } catch (fallbackErr) {
        console.error('All camera requests failed:', fallbackErr);
        throw fallbackErr;
      }
    }

    this.videoElement.muted = true;
    this.videoElement.playsInline = true;
    this.videoElement.autoplay = true;
    this.videoElement.setAttribute('muted', '');
    this.videoElement.setAttribute('playsinline', '');
    this.videoElement.setAttribute('autoplay', '');
    this.videoElement.srcObject = stream;

    return new Promise((resolve) => {
      let isResolved = false;

      const finishStartup = async () => {
        if (isResolved) return;
        isResolved = true;

        try {
          await this.videoElement.play();
        } catch (playErr) {
          console.warn('Video element play() was deferred by browser:', playErr);
        }

        this.isRunning = true;
        this.startDetectionLoop();
        resolve(stream);
      };

      // If video metadata is already loaded
      if (this.videoElement.readyState >= 1) {
        finishStartup();
      } else {
        this.videoElement.onloadedmetadata = () => finishStartup();
        this.videoElement.onloadeddata = () => finishStartup();
        this.videoElement.oncanplay = () => finishStartup();
        // Failsafe timeout so the camera startup is never hung waiting for events
        setTimeout(finishStartup, 400);
      }
    });
  }

  async startWithStream(stream) {
    if (!this.videoElement || !stream) return;
    this.videoElement.srcObject = stream;
    this.videoElement.muted = true;
    this.videoElement.playsInline = true;
    this.videoElement.autoplay = true;

    try {
      await this.videoElement.play();
    } catch (_) {}

    this.isRunning = true;
    this.startDetectionLoop();
    return stream;
  }

  stopCamera() {
    this.isRunning = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.videoElement && this.videoElement.srcObject) {
      const tracks = this.videoElement.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      this.videoElement.srcObject = null;
    }
  }

  calibrateNeutral() {
    // Current smoothed pitch becomes the new zero baseline
    this.neutralPitch = this.smoothedPitch;
    return this.neutralPitch;
  }

  setSensitivity(val) {
    this.sensitivity = Math.max(0.4, Math.min(2.5, val));
  }

  setTriggerType(type) {
    this.activeTriggerType = type;
  }

  setShowMesh(show) {
    this.showMesh = show;
  }

  setMirrored(mirrored) {
    this.mirrored = mirrored;
  }

  startDetectionLoop() {
    const loop = (timestamp) => {
      if (!this.isRunning) return;

      if (this.videoElement.readyState >= 2 && this.videoElement.currentTime !== this.lastVideoTime) {
        this.lastVideoTime = this.videoElement.currentTime;

        try {
          const results = this.landmarker.detectForVideo(this.videoElement, timestamp);
          this.processResults(results);
        } catch (e) {
          console.warn('Detection error:', e);
        }
      }

      this.animFrameId = requestAnimationFrame(loop);
    };

    this.animFrameId = requestAnimationFrame(loop);
  }

  processResults(results) {
    if (!results || !results.faceLandmarks || results.faceLandmarks.length === 0) {
      // No face detected - decay trigger progress
      this.smoothedTriggerProgress *= 0.85;
      if (this.canvasElement && this.canvasCtx && this.showMesh) {
        this.canvasCtx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
      }
      if (this.onFrameCallback) {
        this.onFrameCallback({
          hasFace: false,
          triggerProgress: this.smoothedTriggerProgress,
          isTriggered: false,
          pitchDeg: 0,
          blendshapes: {}
        });
      }
      return;
    }

    const landmarks = results.faceLandmarks[0];
    const blendshapesList = results.faceBlendshapes && results.faceBlendshapes[0]
      ? results.faceBlendshapes[0].categories
      : [];

    // Map blendshapes into an easy lookup object
    const blendMap = {};
    for (const b of blendshapesList) {
      blendMap[b.categoryName] = b.score;
    }

    // 1. Calculate Geometric 3D Head Pitch Angle
    // Landmark 10: Forehead top center
    // Landmark 1: Nose tip
    // Landmark 152: Chin center bottom
    const forehead = landmarks[10];
    const nose = landmarks[1];
    const chin = landmarks[152];
    const leftEyeOuter = landmarks[33];
    const rightEyeOuter = landmarks[263];

    // Compute 3D pitch angle (Z forward/back relative to Y vertical)
    const dy = forehead.y - chin.y; // Negative since forehead is higher (lower y)
    const dz = forehead.z - chin.z; // In MediaPipe: -z is closer to camera, +z is further away
    // When looking up: forehead tilts back (+z), chin tilts up and closer (-z), so (forehead.z - chin.z) is positive!
    const pitchRad = Math.atan2(dz, Math.abs(dy));
    const rawPitchDeg = (pitchRad * 180) / Math.PI;

    // Roll angle (tilt head left / right)
    const eyeDx = rightEyeOuter.x - leftEyeOuter.x;
    const eyeDy = rightEyeOuter.y - leftEyeOuter.y;
    const rollDeg = (Math.atan2(eyeDy, eyeDx) * 180) / Math.PI;

    // Blendshape metrics
    const eyeLookUp = Math.max(blendMap['eyeLookUpLeft'] || 0, blendMap['eyeLookUpRight'] || 0);
    const jawOpen = blendMap['jawOpen'] || 0;
    const smile = ((blendMap['mouthSmileLeft'] || 0) + (blendMap['mouthSmileRight'] || 0)) / 2;

    // Exponential smoothing (alpha = 0.3 for responsive feel without noise)
    const alpha = 0.3;
    this.smoothedPitch = this.smoothedPitch * (1 - alpha) + rawPitchDeg * alpha;
    this.smoothedEyeLookUp = this.smoothedEyeLookUp * (1 - alpha) + eyeLookUp * alpha;
    this.smoothedJawOpen = this.smoothedJawOpen * (1 - alpha) + jawOpen * alpha;
    this.smoothedSmile = this.smoothedSmile * (1 - alpha) + smile * alpha;
    this.smoothedRoll = this.smoothedRoll * (1 - alpha) + rollDeg * alpha;

    // Default neutral pitch baseline if not manually calibrated
    if (this.neutralPitch === null) {
      this.neutralPitch = this.smoothedPitch;
    }

    // 2. Compute Progress for All Actions Concurrently
    // A) Look Up Progress (Head Pitch + Eye Look Up)
    const pitchDelta = this.smoothedPitch - this.neutralPitch;
    const pitchThreshold = 16 / this.sensitivity;
    const pitchProgress = Math.max(0, Math.min(1.0, pitchDelta / pitchThreshold));
    const eyeProgress = Math.max(0, Math.min(1.0, (this.smoothedEyeLookUp - 0.15) / (0.40 / this.sensitivity)));
    const lookUpProgress = Math.max(pitchProgress, pitchProgress * 0.7 + eyeProgress * 0.4);

    // B) Jaw Open (Shocked) Progress
    const jawThreshold = 0.30 / this.sensitivity;
    const jawOpenProgress = Math.max(0, Math.min(1.0, this.smoothedJawOpen / jawThreshold));

    // C) Smile Progress
    const smileThreshold = 0.35 / this.sensitivity;
    const smileProgress = Math.max(0, Math.min(1.0, this.smoothedSmile / smileThreshold));

    // D) Tilt Side Progress
    const rollThreshold = 20 / this.sensitivity;
    const tiltSideProgress = Math.max(0, Math.min(1.0, Math.abs(this.smoothedRoll) / rollThreshold));

    // Determine target progress and dominant action
    let targetProgress = 0;
    let dominantAction = this.activeTriggerType;

    if (this.activeTriggerType === 'auto_all') {
      // Auto Mode: Dynamically pick whichever gesture is currently strongest!
      let maxScore = 0;
      dominantAction = 'look_up';

      if (lookUpProgress > maxScore) {
        maxScore = lookUpProgress;
        dominantAction = 'look_up';
      }
      if (jawOpenProgress > maxScore) {
        maxScore = jawOpenProgress;
        dominantAction = 'jaw_open';
      }
      if (smileProgress > maxScore) {
        maxScore = smileProgress;
        dominantAction = 'smile';
      }

      targetProgress = maxScore;
    } else if (this.activeTriggerType === 'look_up') {
      targetProgress = lookUpProgress;
      dominantAction = 'look_up';
    } else if (this.activeTriggerType === 'jaw_open') {
      targetProgress = jawOpenProgress;
      dominantAction = 'jaw_open';
    } else if (this.activeTriggerType === 'smile') {
      targetProgress = smileProgress;
      dominantAction = 'smile';
    } else if (this.activeTriggerType === 'tilt_side') {
      targetProgress = tiltSideProgress;
      dominantAction = 'tilt_side';
    }

    // Smooth trigger progress
    const progressAlpha = targetProgress > this.smoothedTriggerProgress ? 0.35 : 0.20;
    this.smoothedTriggerProgress = this.smoothedTriggerProgress * (1 - progressAlpha) + targetProgress * progressAlpha;
    if (this.smoothedTriggerProgress < 0.02) this.smoothedTriggerProgress = 0;
    if (this.smoothedTriggerProgress > 0.98) this.smoothedTriggerProgress = 1;

    const isTriggered = this.smoothedTriggerProgress >= 0.85;

    // 3. Render AR Mesh if enabled
    if (this.showMesh && this.canvasElement && this.canvasCtx) {
      this.drawMesh(landmarks, isTriggered);
    } else if (this.canvasCtx && !this.showMesh) {
      this.canvasCtx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
    }

    // 4. Fire Callback
    if (this.onFrameCallback) {
      this.onFrameCallback({
        hasFace: true,
        landmarks,
        triggerProgress: this.smoothedTriggerProgress,
        isTriggered,
        pitchDeg: this.smoothedPitch - this.neutralPitch,
        eyeLookUp: this.smoothedEyeLookUp,
        jawOpen: this.smoothedJawOpen,
        smile: this.smoothedSmile,
        rollDeg: this.smoothedRoll,
        nosePos: { x: nose.x, y: nose.y },
        activeTriggerType: this.activeTriggerType,
        dominantAction,
        actionsProgress: {
          look_up: lookUpProgress,
          jaw_open: jawOpenProgress,
          smile: smileProgress
        }
      });
    }
  }

  drawMesh(landmarks, isTriggered) {
    const ctx = this.canvasCtx;
    const w = this.canvasElement.width;
    const h = this.canvasElement.height;

    ctx.clearRect(0, 0, w, h);

    // Dynamic glowing color based on trigger state
    const color = isTriggered ? '#00f0ff' : 'rgba(0, 240, 255, 0.45)';
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.2;
    ctx.fillStyle = isTriggered ? '#ff0055' : 'rgba(0, 240, 255, 0.6)';

    // Key facial feature loops
    const faceOvalIndices = [
      10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400,
      377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109, 10
    ];

    const lipsIndices = [
      61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95, 61
    ];

    const leftEyeIndices = [33, 160, 158, 133, 153, 144, 33];
    const rightEyeIndices = [362, 385, 387, 263, 373, 380, 362];

    const drawLoop = (indices) => {
      ctx.beginPath();
      indices.forEach((idx, i) => {
        const pt = landmarks[idx];
        const x = this.mirrored ? (1 - pt.x) * w : pt.x * w;
        const y = pt.y * h;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    };

    drawLoop(faceOvalIndices);
    drawLoop(lipsIndices);
    drawLoop(leftEyeIndices);
    drawLoop(rightEyeIndices);

    // Draw nose & pitch pointer line
    const nose = landmarks[1];
    const nx = this.mirrored ? (1 - nose.x) * w : nose.x * w;
    const ny = nose.y * h;
    const pitchOffset = (this.smoothedPitch - this.neutralPitch) * 2.5;

    ctx.beginPath();
    ctx.arc(nx, ny, 4, 0, Math.PI * 2);
    ctx.fill();

    // Futuristic direction vector pointing up when tilted up
    ctx.beginPath();
    ctx.moveTo(nx, ny);
    ctx.lineTo(nx, ny - pitchOffset);
    ctx.strokeStyle = isTriggered ? '#ff0055' : '#00f0ff';
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }
}
