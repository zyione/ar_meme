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
- **Multiple Reaction Presets & Auto Detection**:
  - ⬆️ **Willem Dafoe Looking Up**: Triggered by looking up.
  - 😮 **Shocked / Jaw Drop**: Triggered by opening your mouth.
  - 😊 **Smile Meme**: Triggered by smiling.
  - ⚡ **Auto (All Reactions)**: Dynamically triggers Willem Dafoe, Shocked guy, or Smiling kid based on whichever gesture you perform in real-time!
  - 📁 **Custom Image Upload**: Drop in any image, set custom captions, and pick your trigger action!
- **AR Meme Studio (Dev Test & Realtime Settings)**:
  - **Master Virtual Camera ON / OFF Switch**: Toggle broadcasting on/off with standby privacy screen.
  - Edit top and bottom caption text with live preview in classic meme font.
  - Real-time sync across windows via `BroadcastChannel` API.
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

## 📹 How to Use as a Virtual Camera (Discord, Zoom, Meet)

AR Meme features a built-in **Virtual Camera mode** that separates the **Dev Test / Realtime Settings Studio** from a **100% clean video feed** (`?clean=true`) with no UI buttons or HUD overlays.

### 🌟 Option C: OBS Virtual Camera (Use as a Real Webcam in Discord & Zoom)

This is the recommended setup to use AR Meme as your actual webcam device inside **Discord**, **Zoom**, **Google Meet**, or **Microsoft Teams**:

#### Step 1: Open the AR Meme Studio & Turn Virtual Cam ON
1. Run `npm run dev` and open `http://localhost:5174/` in your browser.
2. In the top header, click the **`Virtual Cam: OFF`** switch to turn it **`Virtual Cam: ON`** (it will glow green and show the live broadcast indicator).

#### Step 2: Add Browser Source in OBS Studio
1. Open **OBS Studio**.
2. Under the **Sources** dock, click **`+`** ➔ select **`Browser`**.
3. Name it `AR Meme Camera` and configure:
   - **URL**: `http://localhost:5174/?clean=true` (or click *Copy OBS URL* in the AR Meme header).
   - **Width**: `1280`
   - **Height**: `720`
   - **FPS**: `60`
   - Check **"Shutdown source when not visible"**: *Unchecked* (keep active in background).
4. Click **OK**. The clean camera and meme transition feed will appear on your OBS canvas!

#### Step 3: Start OBS Virtual Camera
1. In OBS Studio under the **Controls** dock (bottom right), click **Start Virtual Camera**.

#### Step 4: Select OBS Virtual Camera in Your App
1. Open **Discord**, **Zoom**, **Google Meet**, or **Teams**.
2. Go to **Settings ➔ Voice & Video (or Video Settings)**.
3. Under **Camera**, select **`OBS Virtual Camera`**.

#### Step 5: Real-Time Live Control from the Studio
- Keep the main AR Meme Studio open on a second monitor or side-by-side window.
- Any time you look up, open your mouth, or smile, the meme transition immediately plays into your Discord / Zoom camera!
- You can change presets (Willem Dafoe, Shocked, Smile, or Auto), tune sensitivity, type captions, or hit the **Virtual Cam Master Toggle (OFF/ON)** to show an offline standby screen whenever you want privacy. All changes sync across windows in real-time via `BroadcastChannel`!

---

### Quick Alternatives:
- **Option A (Instant Window Share)**: In the Studio, click **`🪟 Clean Pop-out`** to open a standalone clean video window. In Discord or Zoom, choose *Share Screen ➔ Window* and select this pop-out window.
- **Option B (Floating PiP)**: Click **`📌 Float PiP`** to pop out the live stream into an always-on-top Picture-in-Picture window.

---

- **Frontend**: HTML5, Vanilla CSS3 (Glassmorphism, CSS Custom Properties), Modern ES Modules
- **Bundler**: Vite
- **Vision AI**: `@mediapipe/tasks-vision`
- **Audio**: Web Audio API (procedural synthesis)
- **Media**: HTML5 `MediaRecorder` & Canvas 2D API