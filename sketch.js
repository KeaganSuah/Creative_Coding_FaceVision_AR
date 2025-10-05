// ------------------------------
// Global Constants and Variables
// ------------------------------
const CELL_WIDTH = 160;
const CELL_HEIGHT = 120;
// 14 original filters + 1 extra face recognition = 15 cells.
// Using 3 columns means GRID_ROWS = Math.ceil(15/3) = 5
const GRID_COLS = 3;
const TOTAL_CELLS = 14 + 1;
const GRID_ROWS = Math.ceil(TOTAL_CELLS / GRID_COLS);
const EXTRA_MARGIN = 200; // Extra space at the bottom for sliders
const ROW_GAP = 30;

let video;
let gridCells = []; // Array of GridCell objects
let faceCanvas;
let detections = [];
// (Assuming faceapi or objectdetect library is loaded)
let detector; // for face detection
let classifier = objectdetect.frontalface; // ensure your library is loaded
let pixelSize = 5;
let currentFilterText = "Face Tom";

// User image globals for custom overlay:
let userUploadedImage = null;
let placementOption = "middle"; // default placement for user overlay
let fileInput, uploadImageButton;

// Captions array for original 14 images and 1 extra face-detection cell
let captions = [
  // Original 14 captions:
  "Original Image",
  "Grayscale Image",
  "Pixelated Image",
  "Red Channel",
  "Green Channel",
  "Blue Channel",
  "Red Thresholded",
  "Green Thresholded",
  "Blue Thresholded",
  "Webcam (Repeated)",
  "TCbCr Image",
  "HSV Image",
  "Threshold TCbCr",
  "Threshold HSV",
  "Face Detection Filters",
];

// Global slider variables (RGB and threshold sliders from your original code)
let redSlider, greenSlider, blueSlider;
let tcbrThresholdSlider, hsvThresholdSlider;

// ------------------------------
// Face Recognition Functions Array
// ------------------------------
let faceFunctions = [
  faceBox,
  blackAndWhiteThresholdImage,
  faceBlur, // 3
  faceInvert,
  facePixelate,
  faceAbstract, // 2
  meshOnFace, // 4
  userImageOverlay, // 5 - New: overlays user-uploaded image with placement
];
let faceFunctionNames = [
  "Face Box",
  "Face Greyscale",
  "Face Blur",
  "Face Invert",
  "Face Pixelate",
  "Face Abstract",
  "Mesh on Face",
  "User Image Overlay",
];
// Global index to track current face recognition effect.
let faceRecognitionIndex = 0;

// ------------------------------
// Classes
// ------------------------------

// GridCell encapsulates an off–screen canvas and its caption.
class GridCell {
  constructor(width, height, caption) {
    this.width = width;
    this.height = height;
    this.caption = caption;
    this.graphics = createGraphics(width, height);
  }
  draw(img) {
    this.graphics.clear();
    // Draw image with a 1-pixel border (width-2 x height-2)
    this.graphics.image(img, 0, 0, this.width - 2, this.height - 2);
    // Draw caption centered at bottom
    this.graphics.textAlign(CENTER, BOTTOM);
    this.graphics.textSize(10);
    this.graphics.fill(255);
    this.graphics.text(this.caption, this.width / 2, this.height - 5);
  }
}

// ImageProcessor encapsulates static image–processing methods.
class ImageProcessor {
  static convertToGrayscale(inputImage) {
    let img = createImage(inputImage.width, inputImage.height);
    img.copy(
      inputImage,
      0,
      0,
      inputImage.width,
      inputImage.height,
      0,
      0,
      img.width,
      img.height
    );
    img.loadPixels();
    for (let i = 0; i < img.pixels.length; i += 4) {
      let gray =
        0.299 * img.pixels[i] +
        0.587 * img.pixels[i + 1] +
        0.114 * img.pixels[i + 2];
      img.pixels[i] = img.pixels[i + 1] = img.pixels[i + 2] = gray;
    }
    img.updatePixels();
    return img;
  }

  static convertToPixelate(inputImage, pixelSize) {
    let img = inputImage.get();
    img.loadPixels();
    for (let y = 0; y < img.height; y += pixelSize) {
      for (let x = 0; x < img.width; x += pixelSize) {
        let sumR = 0,
          sumG = 0,
          sumB = 0,
          count = 0;
        for (let j = 0; j < pixelSize; j++) {
          for (let i = 0; i < pixelSize; i++) {
            let px = x + i,
              py = y + j;
            if (px < img.width && py < img.height) {
              let idx = (py * img.width + px) * 4;
              sumR += img.pixels[idx];
              sumG += img.pixels[idx + 1];
              sumB += img.pixels[idx + 2];
              count++;
            }
          }
        }
        let aveR = sumR / count,
          aveG = sumG / count,
          aveB = sumB / count;
        for (let j = 0; j < pixelSize; j++) {
          for (let i = 0; i < pixelSize; i++) {
            let px = x + i,
              py = y + j;
            if (px < img.width && py < img.height) {
              let idx = (py * img.width + px) * 4;
              img.pixels[idx] = aveR;
              img.pixels[idx + 1] = aveG;
              img.pixels[idx + 2] = aveB;
            }
          }
        }
      }
    }
    img.updatePixels();
    return img;
  }

  static extractChannel(inputImage, channel) {
    let img = createImage(inputImage.width, inputImage.height);
    inputImage.loadPixels();
    img.loadPixels();
    let c = channel === "r" ? 0 : channel === "g" ? 1 : 2;
    for (let i = 0; i < inputImage.pixels.length; i += 4) {
      img.pixels[i] = c === 0 ? inputImage.pixels[i] : 0;
      img.pixels[i + 1] = c === 1 ? inputImage.pixels[i + 1] : 0;
      img.pixels[i + 2] = c === 2 ? inputImage.pixels[i + 2] : 0;
      img.pixels[i + 3] = 255;
    }
    img.updatePixels();
    return img;
  }

  static thresholdColorChannel(inputImage, threshold, channel) {
    let img = createImage(inputImage.width, inputImage.height);
    inputImage.loadPixels();
    img.loadPixels();
    let offset = channel === "r" ? 0 : channel === "g" ? 1 : 2;
    for (let i = 0; i < inputImage.pixels.length; i += 4) {
      let val = inputImage.pixels[i + offset];
      if (val > threshold) {
        img.pixels[i] = channel === "r" ? val : 0;
        img.pixels[i + 1] = channel === "g" ? val : 0;
        img.pixels[i + 2] = channel === "b" ? val : 0;
        img.pixels[i + 3] = 255;
      } else {
        img.pixels[i] = img.pixels[i + 1] = img.pixels[i + 2] = 0;
        img.pixels[i + 3] = 255;
      }
    }
    img.updatePixels();
    return img;
  }

  static convertToTCbCr(inputImage) {
    let img = createImage(inputImage.width, inputImage.height);
    img.copy(
      inputImage,
      0,
      0,
      inputImage.width,
      inputImage.height,
      0,
      0,
      img.width,
      img.height
    );
    img.loadPixels();
    for (let i = 0; i < img.pixels.length; i += 4) {
      let r = img.pixels[i],
        g = img.pixels[i + 1],
        b = img.pixels[i + 2];
      let Y = 0.299 * r + 0.587 * g + 0.114 * b;
      let Cb = -0.1687 * r - 0.3313 * g + 0.5 * b + 128;
      let Cr = 0.5 * r - 0.4187 * g - 0.0813 * b + 128;
      img.pixels[i] = Y;
      img.pixels[i + 1] = Cb;
      img.pixels[i + 2] = Cr;
      img.pixels[i + 3] = 255;
    }
    img.updatePixels();
    return img;
  }

  static convertToHSV(inputImage) {
    let img = createImage(inputImage.width, inputImage.height);
    img.copy(
      inputImage,
      0,
      0,
      inputImage.width,
      inputImage.height,
      0,
      0,
      img.width,
      img.height
    );
    img.loadPixels();
    for (let i = 0; i < img.pixels.length; i += 4) {
      let r = img.pixels[i] / 255,
        g = img.pixels[i + 1] / 255,
        b = img.pixels[i + 2] / 255;
      let maxVal = max(r, g, b);
      let minVal = min(r, g, b);
      let delta = maxVal - minVal;
      let hue = 0,
        saturation = 0,
        value = maxVal * 100;
      if (delta !== 0) {
        if (maxVal === r) {
          hue = (g - b) / delta + (g < b ? 6 : 0);
        } else if (maxVal === g) {
          hue = (b - r) / delta + 2;
        } else {
          hue = (r - g) / delta + 4;
        }
        saturation = (delta / maxVal) * 100;
      }
      img.pixels[i] = hue * 60;
      img.pixels[i + 1] = saturation;
      img.pixels[i + 2] = value;
      img.pixels[i + 3] = 255;
    }
    img.updatePixels();
    return img;
  }

  static calculateIntensity(red, green, blue) {
    return (red + green + blue) / 1.7;
  }

  static applyThresholdColourSpace(inputImage, threshold, thresholdSlider) {
    let img = createImage(inputImage.width, inputImage.height);
    img.copy(
      inputImage,
      0,
      0,
      inputImage.width,
      inputImage.height,
      0,
      0,
      img.width,
      img.height
    );
    img.loadPixels();
    for (let i = 0; i < img.pixels.length; i += 4) {
      let r = img.pixels[i],
        g = img.pixels[i + 1],
        b = img.pixels[i + 2];
      let intensity = this.calculateIntensity(r, g, b);
      intensity = thresholdSlider.value() > intensity ? 0 : intensity;
      img.pixels[i] = r * (intensity / 255);
      img.pixels[i + 1] = g * (intensity / 255);
      img.pixels[i + 2] = b * (intensity / 255);
    }
    img.updatePixels();
    return img;
  }

  static tcbrImageThreshold(inputImage, thresholdVal) {
    let tcbrImage = this.convertToTCbCr(inputImage);
    let thresholdedImage = this.applyThresholdColourSpace(
      tcbrImage,
      tcbrThresholdSlider.value(),
      tcbrThresholdSlider
    );
    return thresholdedImage;
  }

  static hsvImageThreshold(inputImage, thresholdVal) {
    let hsvImg = this.convertToHSV(inputImage);
    let thresholdedImage = this.applyThresholdColourSpace(
      hsvImg,
      hsvThresholdSlider.value(),
      hsvThresholdSlider
    );
    return thresholdedImage;
  }
}

// ------------------------------
// Extra Face–Detection Functions
// ------------------------------

function faceBox(inputImg) {
  let output = inputImg.get();
  let g = createGraphics(output.width, output.height);
  g.image(output, 0, 0);

  let faces = detector.detect(inputImg.canvas);

  // Set to draw only the outline of the rectangle (no fill)
  g.noFill();
  g.stroke(255); // white stroke
  g.strokeWeight(2); // adjust the thickness as needed

  for (let i = 0; i < faces.length; i++) {
    let face = faces[i];
    // Check the detection confidence (face[4])
    if (face[4] > 0.3) {
      // face[0]: x, face[1]: y, face[2]: width, face[3]: height
      g.rect(face[0], face[1], face[2], face[3]);
    }
  }

  return g.get();
}

function faceAbstract(inputImg) {
  let output = inputImg.get();
  let g = createGraphics(output.width, output.height);
  g.image(output, 0, 0);
  let faces = detector.detect(inputImg.canvas);
  g.noStroke();
  g.fill(255, 255, 0, 150);
  for (let i = 0; i < faces.length; i++) {
    let face = faces[i];
    if (face[4] > 0.3) {
      g.ellipse(face[0] + face[2] / 2, face[1] + face[3] / 2, face[2], face[3]);
    }
  }
  return g.get();
}

function faceBlur(inputImg) {
  let output = inputImg.get();
  let faces = detector.detect(inputImg.canvas);
  for (let i = 0; i < faces.length; i++) {
    let face = faces[i];
    if (face[4] > 0.3) {
      let faceRegion = output.get(face[0], face[1], face[2], face[3]);
      faceRegion.filter(BLUR, 5);
      output.copy(
        faceRegion,
        0,
        0,
        faceRegion.width,
        faceRegion.height,
        face[0],
        face[1],
        face[2],
        face[3]
      );
    }
  }
  return output;
}

function facePixelate(inputImg) {
  let pixelSize = 5;
  // 1) Copy the input image into a p5.Graphics so we can modify pixel data
  let g = createGraphics(inputImg.width, inputImg.height);
  g.image(inputImg, 0, 0);

  // 2) Detect faces (assuming 'detector' is your face detector instance)
  let faces = detector.detect(inputImg.canvas);

  // 3) Access pixel array of our graphics buffer
  g.loadPixels();

  // 4) For each detected face, pixelate only that bounding box
  for (let i = 0; i < faces.length; i++) {
    let face = faces[i];
    // Face[4] is often the confidence score
    if (face[4] > 0.3) {
      // Extract bounding box (round and clamp to avoid partial/out-of-bounds)
      let xMin = Math.floor(face[0]);
      let yMin = Math.floor(face[1]);
      let xMax = Math.floor(face[0] + face[2]);
      let yMax = Math.floor(face[1] + face[3]);

      // Clamp to image edges
      xMin = Math.max(0, xMin);
      yMin = Math.max(0, yMin);
      xMax = Math.min(g.width, xMax);
      yMax = Math.min(g.height, yMax);

      // 5) Standard block–averaging pixelation inside (xMin, yMin) -> (xMax, yMax)
      for (let y = yMin; y < yMax; y += pixelSize) {
        for (let x = xMin; x < xMax; x += pixelSize) {
          let sumR = 0,
            sumG = 0,
            sumB = 0;
          let count = 0;

          // (a) Sum up color in the current pixelSize×pixelSize block
          for (let yy = 0; yy < pixelSize; yy++) {
            for (let xx = 0; xx < pixelSize; xx++) {
              let px = x + xx;
              let py = y + yy;
              if (px < xMax && py < yMax) {
                let idx = 4 * (py * g.width + px);
                sumR += g.pixels[idx];
                sumG += g.pixels[idx + 1];
                sumB += g.pixels[idx + 2];
                count++;
              }
            }
          }

          // (b) Compute average color for this block
          let aveR = sumR / count;
          let aveG = sumG / count;
          let aveB = sumB / count;

          // (c) Overwrite each pixel in the block with the average color
          for (let yy = 0; yy < pixelSize; yy++) {
            for (let xx = 0; xx < pixelSize; xx++) {
              let px = x + xx;
              let py = y + yy;
              if (px < xMax && py < yMax) {
                let idx = 4 * (py * g.width + px);
                g.pixels[idx] = aveR;
                g.pixels[idx + 1] = aveG;
                g.pixels[idx + 2] = aveB;
                g.pixels[idx + 3] = 255; // Full opacity
              }
            }
          }
        }
      }
    }
  }

  // 6) Update pixel data in our graphics buffer, then return it
  g.updatePixels();
  return g.get();
}

function faceInvert(inputImg) {
  let output = inputImg.get();
  let faces = detector.detect(inputImg.canvas);
  for (let i = 0; i < faces.length; i++) {
    let face = faces[i];
    if (face[4] > 0.3) {
      let faceRegion = output.get(face[0], face[1], face[2], face[3]);
      faceRegion.filter(GRAY);
      faceRegion.filter(INVERT);
      output.copy(
        faceRegion,
        0,
        0,
        faceRegion.width,
        faceRegion.height,
        face[0],
        face[1],
        face[2],
        face[3]
      );
    }
  }
  return output;
}

function blackAndWhiteThresholdImage(inputImage) {
  let threshold = 128;
  let img = createImage(inputImage.width, inputImage.height);
  img.copy(
    inputImage,
    0,
    0,
    inputImage.width,
    inputImage.height,
    0,
    0,
    img.width,
    img.height
  );
  img.loadPixels();
  for (let i = 0; i < img.pixels.length; i += 4) {
    let gray =
      0.299 * img.pixels[i] +
      0.587 * img.pixels[i + 1] +
      0.114 * img.pixels[i + 2];
    let newColor = gray > threshold ? 255 : 0;
    img.pixels[i] = img.pixels[i + 1] = img.pixels[i + 2] = newColor;
  }
  img.updatePixels();
  return img;
}

function meshOnFace(inputImg) {
  let output = inputImg.get();
  let g = createGraphics(output.width, output.height);
  g.image(output, 0, 0);
  let faces = detector.detect(inputImg.canvas);
  g.stroke(160, 32, 240);
  g.strokeWeight(2);
  for (let i = 0; i < faces.length; i++) {
    let face = faces[i];
    if (face[4] > 0.3) {
      let cols = 10,
        rows = 10;
      for (let c = 0; c <= cols; c++) {
        let posX = face[0] + (c / cols) * face[2];
        g.line(posX, face[1], posX, face[1] + face[3]);
      }
      for (let r = 0; r <= rows; r++) {
        let posY = face[1] + (r / rows) * face[3];
        g.line(face[0], posY, face[0] + face[2], posY);
      }
    }
  }
  return g.get();
}

// NEW: User Image Overlay Function
function userImageOverlay(inputImg) {
  let output = inputImg.get();
  let tempGraphics = createGraphics(inputImg.width, inputImg.height);
  tempGraphics.image(inputImg, 0, 0);
  let faces = detector.detect(tempGraphics.canvas);
  tempGraphics.remove();

  // If no user image has been uploaded, display a prompt on the image.
  if (!userUploadedImage) {
    let promptGraphics = createGraphics(inputImg.width, inputImg.height);
    promptGraphics.image(output, 0, 0);
    promptGraphics.textAlign(CENTER, CENTER);
    promptGraphics.textSize(14);
    promptGraphics.fill(255); // red text color for visibility
    promptGraphics.text(
      "Please upload an image",
      inputImg.width / 2,
      inputImg.height / 2
    );
    return promptGraphics.get();
  }

  // If the user image is available, overlay it onto each detected face.
  for (let i = 0; i < faces.length; i++) {
    let face = faces[i];
    if (face[4] > 0.3) {
      let x, y, w, h;
      w = face[2];
      h = face[3];
      // Determine placement based on the placementOption set via number keys.
      if (placementOption === "middle") {
        x = face[0];
        y = face[1];
      } else if (placementOption === "top") {
        x = face[0];
        y = face[1] - h;
      } else if (placementOption === "bottom") {
        x = face[0];
        y = face[1] + h;
      } else if (placementOption === "left") {
        x = face[0] - w;
        y = face[1];
      } else if (placementOption === "right") {
        x = face[0] + w;
        y = face[1];
      } else {
        x = face[0];
        y = face[1];
      }
      output.copy(
        userUploadedImage,
        0,
        0,
        userUploadedImage.width,
        userUploadedImage.height,
        x,
        y,
        w,
        h
      );
    }
  }
  return output;
}

function setup() {
  // Create canvas with extra margin at bottom for sliders if needed
  let canvas = createCanvas(
    CELL_WIDTH * GRID_COLS,
    CELL_HEIGHT * GRID_ROWS + EXTRA_MARGIN
  );
  textFont("Arial", 12);

  // Setup video capture
  video = createCapture(VIDEO, () => {
    video.size(CELL_WIDTH, CELL_HEIGHT);
  });
  video.hide();

  // Create grid cells: 14 for original processing, then 1 extra for face detection.
  for (let i = 0; i < TOTAL_CELLS; i++) {
    gridCells.push(new GridCell(CELL_WIDTH, CELL_HEIGHT, captions[i]));
  }

  // Setup UI buttons (assumes you have these elements in your HTML)
  let saveImageButton = select("#saveImageButton");
  saveImageButton.mousePressed(saveImage);
  let captureButton = select("#captureButton");
  captureButton.mousePressed(captureAndApplyFilters);
  let unfreezeButton = select("#unfreezeButton");
  unfreezeButton.mousePressed(uncaptureAndUnfreeze);

  // Setup Upload Image button and hidden file input.
  fileInput = createFileInput(handleUserImage);
  fileInput.hide();
  uploadImageButton = select("#uploadImageButton");
  uploadImageButton.mousePressed(() => {
    fileInput.elt.click();
  });

  // --- Slider Positioning Code (for RGB and threshold sliders) ---
  let sliderWidth = 100;
  let sliderX0 = 0 + (CELL_WIDTH - sliderWidth) / 2 + 350;
  let sliderX1 = CELL_WIDTH + (CELL_WIDTH - sliderWidth) / 2 + 350;
  let sliderX2 = 2 * CELL_WIDTH + (CELL_WIDTH - sliderWidth) / 2 + 360;
  let gridTotalHeight = GRID_ROWS * (CELL_HEIGHT + ROW_GAP) - ROW_GAP;
  let sliderY = gridTotalHeight - 290;
  redSlider = createSlider(0, 180, 90);
  greenSlider = createSlider(0, 180, 90);
  blueSlider = createSlider(0, 180, 90);
  redSlider.style("width", sliderWidth + "px");
  greenSlider.style("width", sliderWidth + "px");
  blueSlider.style("width", sliderWidth + "px");
  redSlider.position(sliderX0, sliderY);
  greenSlider.position(sliderX1, sliderY);
  blueSlider.position(sliderX2, sliderY);
  let sliderY2 = sliderY + 300;
  tcbrThresholdSlider = createSlider(0, 255, 90);
  hsvThresholdSlider = createSlider(0, 255, 90);
  tcbrThresholdSlider.style("width", sliderWidth + "px");
  hsvThresholdSlider.style("width", sliderWidth + "px");
  tcbrThresholdSlider.position(sliderX0, sliderY2);
  hsvThresholdSlider.position(sliderX1, sliderY2);
  // --- End Slider Positioning Code ---

  faceCanvas = createGraphics(CELL_WIDTH, CELL_HEIGHT);

  // Setup face detector (adjust parameters as needed)
  pixelDensity(1);
  let w = CELL_WIDTH,
    h = CELL_HEIGHT;
  detector = new objectdetect.detector(w, h, 1.2, classifier);

  // Preset: ensure video is playing initially
  uncaptureAndUnfreeze();
}

function draw() {
  background(255);
  if (video.loadedmetadata) {
    // Capture current video frame and scale it:
    let scaledImage = createImage(CELL_WIDTH, CELL_HEIGHT);
    scaledImage.copy(
      video,
      0,
      0,
      video.width,
      video.height,
      0,
      0,
      CELL_WIDTH,
      CELL_HEIGHT
    );

    // Process images using ImageProcessor methods for the first 14 grid cells.
    let original = scaledImage;
    let grayscale = ImageProcessor.convertToGrayscale(scaledImage);
    let pixelated = ImageProcessor.convertToPixelate(scaledImage, pixelSize);
    let channelR = ImageProcessor.extractChannel(scaledImage, "r");
    let channelG = ImageProcessor.extractChannel(scaledImage, "g");
    let channelB = ImageProcessor.extractChannel(scaledImage, "b");
    let redThres = ImageProcessor.thresholdColorChannel(
      channelR,
      redSlider.value(),
      "r"
    );
    let greenThres = ImageProcessor.thresholdColorChannel(
      channelG,
      greenSlider.value(),
      "g"
    );
    let blueThres = ImageProcessor.thresholdColorChannel(
      channelB,
      blueSlider.value(),
      "b"
    );
    let tcbrImg = ImageProcessor.convertToTCbCr(scaledImage);
    let hsvImg = ImageProcessor.convertToHSV(scaledImage);
    let tcbrThres = ImageProcessor.tcbrImageThreshold(
      scaledImage,
      tcbrThresholdSlider.value()
    );
    let hsvThres = ImageProcessor.hsvImageThreshold(
      scaledImage,
      hsvThresholdSlider.value()
    );

    // Assign processed images to grid cells (cells 0–13).
    gridCells[0].draw(original);
    gridCells[1].draw(grayscale);
    gridCells[2].draw(pixelated);
    gridCells[3].draw(channelR);
    gridCells[4].draw(channelG);
    gridCells[5].draw(channelB);
    gridCells[6].draw(redThres);
    gridCells[7].draw(greenThres);
    gridCells[8].draw(blueThres);
    gridCells[9].draw(original);
    gridCells[10].draw(tcbrImg);
    gridCells[11].draw(hsvImg);
    gridCells[12].draw(tcbrThres);
    gridCells[13].draw(hsvThres);

    // For the extra face–detection cell (cell index 14), use the currently selected function.
    let faceOutput = faceFunctions[faceRecognitionIndex](scaledImage);
    gridCells[14].draw(faceOutput);

    // Draw grid cells onto the main canvas.
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        let index = row * GRID_COLS + col;
        if (index < gridCells.length) {
          image(
            gridCells[index].graphics,
            col * CELL_WIDTH,
            row * (CELL_HEIGHT + ROW_GAP)
          );
        }
      }
    }

    // Display current face recognition mode in the extra margin.
    fill(0);
    textAlign(CENTER);
    textSize(16);
    text(
      `Face Detection: ${faceFunctionNames[faceRecognitionIndex]}`,
      width / 2,
      height - 20
    );
    // If the current function is the custom user overlay, display placement instructions.
    if (faceFunctionNames[faceRecognitionIndex] === "User Image Overlay") {
      textSize(14);
      text(
        `Placement: ${placementOption} (1: Middle, 2: Top, 3: Bottom, 4: Left, 5: Right)`,
        width / 2,
        height - 40
      );
    }
  }
}

// ------------------------------
// Key Pressed Handling
// ------------------------------

// Pressing D will cycle through the face recognition functions.
// Number keys 1-5 set the placement for the user image overlay.
function keyPressed() {
  if (key >= "1" && key <= "5") {
    if (key === "1") {
      placementOption = "middle";
    } else if (key === "2") {
      placementOption = "top";
    } else if (key === "3") {
      placementOption = "bottom";
    } else if (key === "4") {
      placementOption = "left";
    } else if (key === "5") {
      placementOption = "right";
    }
    console.log("Placement set to:", placementOption);
  } else if (key === "d" || key === "D") {
    faceRecognitionIndex = (faceRecognitionIndex + 1) % faceFunctions.length;
    currentFilterText = faceFunctionNames[faceRecognitionIndex];
    console.log("Switched face recognition to:", currentFilterText);
  } else if (key === "c" || key === "C") {
    captureAndApplyFilters();
  } else if (key === "v" || key === "V") {
    uncaptureAndUnfreeze();
  } else if (key === "s" || key === "S") {
    saveImage();
  }
}

function captureAndApplyFilters() {
  if (!isCapturing) {
    video.pause();
    gridCells.forEach((cell) => cell.graphics.clear());
    isCapturing = true;
  } else {
    video.play();
    gridCells.forEach((cell) => cell.graphics.clear());
    isCapturing = false;
  }
}

function uncaptureAndUnfreeze() {
  video.play();
  gridCells.forEach((cell) => cell.graphics.clear());
  isCapturing = false;
  unfreeze();
}

function unfreeze() {
  video.loop();
}

function saveImage() {
  video.pause();
  let fullGridImage = createGraphics(width, height);
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      let index = row * GRID_COLS + col;
      if (index < gridCells.length) {
        let capturedImage = gridCells[index].graphics.get();
        fullGridImage.image(capturedImage, col * CELL_WIDTH, row * CELL_HEIGHT);
      }
    }
  }
  fullGridImage.save("full_grid_image.png");
  video.play();
}

// ------------------------------
// Utility: Pixelate Function (used in faceBlur effect)
// ------------------------------
function pixelate(img, resolution) {
  img.loadPixels();
  for (let x = 0; x < img.width; x += resolution) {
    for (let y = 0; y < img.height; y += resolution) {
      let avePixInt = calculateAveragePixelIntensity(img, x, y, resolution);
      for (let i = 0; i < resolution; i++) {
        for (let j = 0; j < resolution; j++) {
          let pixelX = x + i;
          let pixelY = y + j;
          if (pixelX < img.width && pixelY < img.height) {
            img.set(pixelX, pixelY, img.get(pixelX, pixelY));
          }
        }
      }
    }
  }
  img.updatePixels();
}

function calculateAveragePixelIntensity(img, startX, startY, resolution) {
  let sum = 0;
  for (let i = 0; i < resolution; i++) {
    for (let j = 0; j < resolution; j++) {
      let index = (startY + j) * img.width + (startX + i);
      sum += img.pixels[index * 4];
    }
  }
  return sum / (resolution * resolution);
}

// ------------------------------
// File Upload Handler for User Image
// ------------------------------
function handleUserImage(file) {
  if (file.type === "image") {
    userUploadedImage = loadImage(file.data, () => {
      console.log("User image loaded.");
    });
  } else {
    console.log("Not an image file!");
  }
}
