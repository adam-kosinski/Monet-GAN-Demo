const imageInput = document.getElementById("image-input");
const sliderTarget = document.getElementById("slider-event-target");
const sliderBar = document.getElementById("slider-bar");
const thoughtBubble = document.getElementById("thought-bubble");

const canvasContainer = document.getElementById("canvas-container");
const inputCanvas = document.getElementById("input-canvas");
const outputCanvas = document.getElementById("output-canvas");
const thoughtCanvas = document.getElementById("thought-canvas");
const inputCtx = inputCanvas.getContext("2d", { willReadFrequently: true });
const outputCtx = outputCanvas.getContext("2d", { willReadFrequently: true });
const thoughtCtx = thoughtCanvas.getContext("2d");

// load onnx model ------------------------------------
let session;
async function loadModel() {
  session = await ort.InferenceSession.create("./generator_g.onnx", {
    executionProviders: ["webgpu", "wasm", "webgl"],
  }).catch((err) => {
    alert("Error!\n" + err);
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

function drawSquareCrop(img, ctx) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  if (img.width >= img.height) {
    const dWidth = (w * img.width) / img.height;
    const offsetX = -0.5 * (dWidth - w);
    ctx.drawImage(img, offsetX, 0, dWidth, h);
  } else {
    const dHeight = (h * img.height) / img.width;
    const offsetY = -0.5 * (dHeight - h);
    ctx.drawImage(img, 0, offsetY, w, dHeight);
  }
}

// run AI model ---------------------------------

async function runPipeline(imgSrc) {
  if (session === undefined) {
    alert("Model not loaded yet, please wait a few moments and try again");
    return;
  }

  // reset
  document.getElementById("download").classList.remove("active");
  inputCtx.clearRect(0, 0, inputCanvas.width, inputCanvas.height);
  outputCtx.clearRect(0, 0, inputCanvas.width, inputCanvas.height);
  setSliderPosition(0);
  document.body.classList.remove("slider-active");
  // hide the input canvas for now, so not showing until the painting animation finishes
  inputCanvas.style.display = "none";

  const img = new Image();
  img.src = imgSrc;

  // wait for image to load
  await new Promise((resolve) =>
    img.addEventListener("load", resolve, { once: true })
  );

  // get image data from the image, square cropped in the center
  drawSquareCrop(img, inputCtx);
  const inputImgData = inputCtx.getImageData(
    0,
    0,
    inputCanvas.width,
    inputCanvas.height
  );
  // animate thought bubble
  drawSquareCrop(img, thoughtCtx);
  thoughtBubble.className = "show";
  await new Promise((resolve) =>
    thoughtBubble.addEventListener("animationstart", resolve, { once: true })
  );

  // run AI model
  const inputTensor = await ort.Tensor.fromImage(inputImgData);
  const feeds = { input: inputTensor }; // "input" is the name of the input as specified in the ONNX export
  const t0 = performance.now();
  const results = await session.run(feeds);
  console.log(`Model inference took ${Math.round(performance.now() - t0)} ms`);
  const outputTensor = results.output;

  // clear the thought bubble, wait for transition to finish
  thoughtBubble.className = "hide";
  await new Promise((resolve) =>
    thoughtBubble.addEventListener("animationend", resolve, { once: true })
  );

  // convert output to image data
  // make it fully transparent to start so it can be animated in
  const outputImgData = outputTensor.toImageData();

  // display output
  await animatePainting(outputImgData);

  // show the input canvas again
  inputCanvas.style.display = "block";

  // enable slider functionality
  document.body.classList.add("slider-active");
  inputCanvas.style.opacity = 1;

  // enable download
  document.getElementById("download").classList.add("active");
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

// download --------------------------------------------------

document.getElementById("download").addEventListener("click", () => {
  const link = document.createElement("a"); // Create a temporary link element
  link.download = "fake-monet-painting.png";
  link.href = outputCanvas.toDataURL("image/png");
  link.click();
});
