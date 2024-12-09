const imageInput = document.getElementById("image-input");

const inputCanvas = document.getElementById("input-canvas");
const outputCanvas = document.getElementById("output-canvas");
const inputCtx = inputCanvas.getContext("2d");
const outputCtx = outputCanvas.getContext("2d");

// load onnx model
let session;
async function loadModel() {
  session = await ort.InferenceSession.create("./generator_g.onnx", {
    executionProviders: ["wasm", "webgl"],
  });
  console.log("Model is Loaded!");
}
loadModel();

// image handling functions ---------------------

imageInput.addEventListener("change", (event) => {
  const file = event.target.files[0];
  readImage(file, (src) => {
    const img = new Image();
    img.src = src;
    img.onload = async () => {
      inputCtx.drawImage(img, 0, 0, 256, 256);
      outputCtx.clearRect(
        0,
        0,
        outputCtx.canvas.width,
        outputCtx.canvas.height
      );
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
  const results = await session.run(feeds);
  const outputTensor = results.output;

  // display output
  const imgData = outputTensor.toImageData();
  outputCtx.putImageData(imgData, 0, 0);
}
