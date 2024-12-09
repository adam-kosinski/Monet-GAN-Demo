const imageInput = document.getElementById("image-input");

const inputCanvas = document.getElementById("input-canvas");
const outputCanvas = document.getElementById("output-canvas");
const inputCtx = inputCanvas.getContext("2d");
const outputCtx = outputCanvas.getContext("2d");

document.getElementById("run").addEventListener("click", convertToMonet);

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
      setTimeout(convertToMonet, 10);
    };
  });
});

function readImage(filename, callback) {
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    callback(reader.result);
  });
  reader.readAsDataURL(filename);
}

// load onnx model
let session;
async function loadModel() {
  session = await ort.InferenceSession.create("./generator_g.onnx", {
    executionProviders: ["wasm", "webgl"],
  });
  console.log("Model is Loaded!");
}
loadModel();

async function runModel(inputTensor) {
  if (session === undefined) {
    console.warn("Model not loaded yet");
    return;
  }
  //   const inputTensor = new ort.Tensor("float32", input, [1, 3, 256, 256]);
  const feeds = { input: inputTensor }; // "input" is the name of the input as specified in the ONNX export
  const results = await session.run(feeds);
  //   const output = Array.from(results.output.data); // "output" is the name of the output as specified in the ONNX export
  return results.output;
}

async function convertToMonet() {
  const inputCtx = inputCanvas.getContext("2d");
  const inputData = inputCtx.getImageData(
    0,
    0,
    inputCanvas.width,
    inputCanvas.height
  );
  const inputTensor = await ort.Tensor.fromImage(inputData);
  console.log(inputTensor);
  const output = await runModel(inputTensor);
  console.log(output);

  // display output
  const imgData = output.toImageData();
  const outputCtx = outputCanvas.getContext("2d");
  outputCtx.putImageData(imgData, 0, 0);
}

async function getModelInput(canvas) {
  const ctx = canvas.getContext("2d");
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const tensor = ort.Tensor.fromImage(imageData);
  console.log(imageData);
  console.log(tensor);
  return tensor;

  // const pixelValues = [];
  // for (let y = 0; y < img.height; y++) {
  //   for (let x = 0; x < img.width; x++) {
  //     const pixelIndex = y * img.width + x;
  //     for (let i = 0; i < 3; i++) {
  //       pixelValues.push(img.data[pixelIndex + i] / 255);
  //     }
  //   }
  // }
  // return pixelValues;
}
