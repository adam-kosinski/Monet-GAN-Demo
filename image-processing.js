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

// image reading  ------------------------------

imageInput.addEventListener("change", (event) => {
  const filename = event.target.files[0];
  if (!filename) return;

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    runPipeline(reader.result);
  });
  reader.readAsDataURL(filename);
});

// run AI model ---------------------------------

async function runPipeline(imgSrc) {
  if (session === undefined) {
    alert("Model not loaded yet, please wait a few moments and try again");
    return;
  }

  // clear canvases
  inputCtx.clearRect(0, 0, inputCanvas.width, inputCanvas.height);
  outputCtx.clearRect(0, 0, inputCanvas.width, inputCanvas.height);
  // hide the input canvas for now, so not showing until the painting animation finishes
  inputCanvas.style.display = "none";

  await sleep(50);

  setSliderPosition(0);
  canvasContainer.classList.remove("slider-active");

  const img = new Image();
  img.src = imgSrc;

  // wait for image to load
  await new Promise((resolve) =>
    img.addEventListener("load", resolve, { once: true })
  );

  // get image data from the image, square cropped in the center
  if (img.width >= img.height) {
    const dWidth = (256 * img.width) / img.height;
    const offsetX = -0.5 * (dWidth - 256);
    inputCtx.drawImage(img, offsetX, 0, dWidth, 256);
  } else {
    const dHeight = (256 * img.height) / img.width;
    const offsetY = -0.5 * (dHeight - 256);
    inputCtx.drawImage(img, 0, offsetY, 256, dHeight);
  }
  const inputImgData = inputCtx.getImageData(
    0,
    0,
    inputCanvas.width,
    inputCanvas.height
  );

  // run AI model
  const inputTensor = await ort.Tensor.fromImage(inputImgData);
  const feeds = { input: inputTensor }; // "input" is the name of the input as specified in the ONNX export
  const t0 = performance.now();
  const results = await session.run(feeds);
  console.log(`Model inference took ${Math.round(performance.now() - t0)} ms`);
  const outputTensor = results.output;

  // convert output to image data
  // make it fully transparent to start so it can be animated in
  const outputImgData = outputTensor.toImageData();

  // display output
  await animatePainting(outputImgData);

  // show the input canvas again
  inputCanvas.style.display = "block";

  // enable slider functionality
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
