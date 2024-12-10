const imageInput = document.getElementById("image-input");
const sliderTarget = document.getElementById("slider-event-target");
const sliderBar = document.getElementById("slider-bar");

const canvasContainer = document.getElementById("canvas-container");
const inputCanvas = document.getElementById("input-canvas");
const outputCanvas = document.getElementById("output-canvas");
const inputCtx = inputCanvas.getContext("2d", { willReadFrequently: true });
const outputCtx = outputCanvas.getContext("2d", { willReadFrequently: true });

// load onnx model ------------------------------------
let session;
async function loadModel() {
  session = await ort.InferenceSession.create("./generator_g.onnx", {
    executionProviders: ["wasm", "webgl"],
    graphOptimizationLevel: "all",
  });
  console.log("Model is Loaded!");
}
loadModel();

// image handling functions ---------------------

imageInput.addEventListener("change", (event) => {
  const file = event.target.files[0];

  readImage(file, (src) => {
    inputCanvas.style.opacity = 0;
    canvasContainer.classList.remove("slider-active");

    const img = new Image();
    img.src = src;

    img.onload = async () => {
      // center crop a square of the image
      if (img.width >= img.height) {
        const dWidth = (256 * img.width) / img.height;
        const offsetX = -0.5 * (dWidth - 256);
        inputCtx.drawImage(img, offsetX, 0, dWidth, 256);
      } else {
        const dHeight = (256 * img.height) / img.width;
        const offsetY = -0.5 * (dHeight - 256);
        inputCtx.drawImage(img, 0, offsetY, 256, dHeight);
      }
      // wait a moment before running the model so the input image can render
      setTimeout(convertToMonet, 50);
    };
  });
});

function readImage(filename, callback) {
  if (!filename) return;
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    callback(reader.result);
  });
  reader.readAsDataURL(filename);
}

// run AI model ---------------------------------

async function convertToMonet() {
  if (session === undefined) {
    console.warn("Model not loaded yet");
    return;
  }
  const inputData = inputCtx.getImageData(
    0,
    0,
    inputCanvas.width,
    inputCanvas.height
  );
  const inputTensor = await ort.Tensor.fromImage(inputData);
  const feeds = { input: inputTensor }; // "input" is the name of the input as specified in the ONNX export
  const t0 = performance.now();
  const results = await session.run(feeds);
  console.log(`Model inference took ${Math.round(performance.now() - t0)} ms`);
  const outputTensor = results.output;

  // convert output to image data
  // make it fully transparent to start so it can be animated in
  const imgData = outputTensor.toImageData();

  // display output
  outputCtx.putImageData(imgData, 0, 0);

  await animatePainting();

  // enable slider functionality
  setSliderPosition(0);
  canvasContainer.classList.add("slider-active");
  inputCanvas.style.opacity = 1;
}

// slider -------------------------------------------------

sliderTarget.addEventListener("mousemove", (e) => {
  if (e.buttons === 1) {
    setSliderPosition(e.clientX);
  }
});
sliderTarget.addEventListener("touchmove", (e) => {
  e.preventDefault(); // stop mousemove from firing as well
  setSliderPosition(e.touches[0].clientX);
});

function setSliderPosition(clientX) {
  const rect = outputCanvas.getBoundingClientRect();
  const offsetX = Math.max(0, Math.min(rect.width, clientX - rect.x));
  sliderBar.style.left = offsetX + "px";
  outputCanvas.style.clipPath = `inset(0 0 0 ${offsetX}px)`;
}
