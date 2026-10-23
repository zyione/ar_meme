# AR Meme: Real-Time Face & Reaction Camera 🎭

An interactive AR web experience powered by computer vision. The app tracks your face, head pitch angle, and facial expressions in real-time through your webcam. When you **look up**, your camera feed smoothly and dramatically transitions into the iconic **Willem Dafoe Looking Up** meme (Vincent van Gogh in *At Eternity's Gate*), complete with cinematic color grading, sound effects, and customizable meme captions.

![AR Meme Banner](./public/dafoe_looking_up.png)

---

## ✨ Features

- **Real-Time 3D Face & Action Tracking**:
  - Uses Google's **MediaPipe Vision Tasks** (`FaceLandmarker`) running entirely in-browser via WebAssembly and WebGL.
  - Detects 3D head pitch (upward tilt), eye gaze vector, jaw opening, and smiles.
- **Cinematic Meme Transition**:
  - Smooth anticipation zoom as you start looking up.
  - Cold blue / teal color grading matching the Van Gogh scene palette.
  - Seamless cross-dissolve into the Willem Dafoe photo at the peak of your reaction.
  - Trigger white flash and animated HUD gauges.
- **Web Audio API Procedural Sound Engine**:
  - Eerie ascending Shepard-style tension drone as pitch increases.
  - Massive cinematic D-minor choir chord + 808 sub-bass drop when the meme triggers.
  - Zero external audio files required—100% reliable and instantaneous.
- **Multiple Reaction Presets & Custom Upload**:
  - ⬆️ **Willem Dafoe Looking Up**: Triggered by looking up.
  - 😮 **Shocked / Jaw Drop**: Triggered by opening your mouth.
  - 😊 **Approval Nod**: Triggered by smiling or nodding.
  - 📁 **Custom Image Upload**: Drop in any image, set custom captions, and pick your trigger action!
- **Meme Studio & Controls**:
  - Edit top and bottom caption text with live preview in classic meme font.
  - **Calibrate Neutral**: Zero-out your baseline sitting posture for perfect accuracy.
  - **Sensitivity Slider**: Fine-tune trigger angle.
  - **AR Mesh Wireframe Toggle**: View real-time cyberpunk 3D facial landmarks and direction vectors.
  - **Mirror Camera**: Flip horizontal view.
  - **Snap Meme**: Download full-resolution meme PNG with captions.
  - **Record Video**: Record 5-second reaction clips directly as WebM video.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Local Development Server
```bash
npm run dev
```

Open your browser at `http://localhost:5173/` (or the port indicated in terminal) and allow camera access.

### 3. Build for Production
```bash
npm run build
```
Production assets will be built into the `dist/` folder, ready for deployment to GitHub Pages, Vercel, or Netlify.

---

## 🛠️ Tech Stack

- **Frontend**: HTML5, Vanilla CSS3 (Glassmorphism, CSS Custom Properties), Modern ES Modules
- **Bundler**: Vite
- **Vision AI**: `@mediapipe/tasks-vision`
- **Audio**: Web Audio API (procedural synthesis)
- **Media**: HTML5 `MediaRecorder` & Canvas 2D API