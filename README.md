# Creative_Coding_FaceVision_AR

An interactive **p5.js** project that performs **real-time face detection** in the browser and overlays virtual props (hat, beard, suit) using the webcam. Built for a creative coding coursework to explore computer vision and web graphics.

**Demo:** https://www.youtube.com/watch?v=0gbKhgNpmfs

---

## Overview

FaceVision AR combines **objectdetect.js** for face detection with **p5.js** for rendering. When a face is detected, overlay images are positioned and scaled in real time to align with the detected region. Runs entirely in the browser—no Python backend.

---

## Features

- Live webcam input with face detection (objectdetect.js)
- Real-time overlays (hat, beard, suit) drawn via p5.js
- Lightweight, browser-only stack (HTML/CSS/JS)
- Adjustable positioning/scaling for better alignment

---

## File Overview

| File/Folder | Purpose |
|---|---|
| `index.html` | Main page; includes libraries and assets |
| `sketch.js` | p5.js sketch: camera capture, detection loop, overlay logic |
| `libraries/p5.min.js`, `libraries/p5.dom.js` | p5.js libraries |
| `libraries/objectdetect.js`, `libraries/objectdetect.frontalface.js` | Face detection |
| `assets/hat.png`, `assets/beard.png`, `assets/suit.png` | Overlay images |

---

## Run Locally

1. Clone the repository:

    ```bash
    git clone https://github.com/yourusername/Creative_Coding_FaceVision_AR.git
    ```

2. Change into the project directory:

    ```bash
    cd Creative_Coding_FaceVision_AR
    ```

3. Open `index.html` in your browser **or** serve the folder with a simple static server (recommended for webcam permissions):

    - Using Node.js:

        ```bash
        npx http-server -p 8000
        ```
        Visit http://localhost:8000 and allow camera access.

    - Using VS Code Live Server: right-click `index.html` → **Open with Live Server**.

> Note: Browsers generally allow `getUserMedia` on **https** origins or **localhost**. If you open the file directly and the camera doesn’t load, use a local server as shown above.

---

## How It Works

1. Capture webcam frames with p5.js (`createCapture(VIDEO)`).
2. Run face detection on the current frame via `objectdetect.frontalface`.
3. Compute overlay positions/scales from the detected bounding box.
4. Draw overlays with `image()` each frame for smooth, real-time AR.

---

## Tech Stack

- **p5.js** for rendering and webcam capture  
- **objectdetect.js** for face detection  
- **HTML5/CSS3/JavaScript** for the web app shell

---

## Future Improvements

- Facial landmark detection for more precise alignment  
- Toggleable/drag-to-adjust overlays  
- Mobile layout and touch controls
