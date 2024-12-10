// units of percent, [x, y] format
const PAINT_PATH = [
  [8, 13],
  [29, 7],
  [9, 34],
  [33, 10],
  [33, 30],
  [55, 8],
  [48, 31],
  [89, 4],
  [85, 26],
  [95, 17],
  [90, 41],
  [90, 59],
  [88, 44],
  [69, 61],
  [75, 30],
  [56, 50],
  [56, 32],
  [24, 57],
  [28, 38],
  [11, 55],
  [2, 63],
  [4, 71],
  [25, 69],
  [18, 83],
  [41, 63],
  [36, 80],
  [50, 65],
  [57, 81],
  [76, 72],
  [86, 75],
  [96, 72],
  [90, 93],
  [73, 93],
  [58, 99],
  [42, 88],
  [13, 100],
  [3, 84],
  [5, 48],
  [4, 20],
  [5, 5],
  [43, 3],
  [79, 3],
  [100, 6],
  [46, 52],
];
const FPS = 10;
const BRUSH_RADIUS = 24; // percent of width

// // utility for creating the PAINT_PATH
// const p = [];
// outputCanvas.addEventListener("click", (e) => {
//   const x = Math.round((100 * e.offsetX) / 256);
//   const y = Math.round((100 * e.offsetY) / 256);
//   p.push([x, y]);
//   console.log(JSON.stringify(p));
//   const imgData = getImageDataMask(p.length, p);
//   outputCtx.clearRect(0, 0, 256, 256);
//   outputCtx.putImageData(imgData, 0, 0);
// });

function getImageDataMask(step, path = PAINT_PATH) {
  // use a hidden canvas to draw a black vs. transparent mask
  const canvas = document.getElementById("paint-mask");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "black";
  ctx.lineWidth = 0.01 * canvas.width * BRUSH_RADIUS;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.filter = "blur(5px)";

  ctx.beginPath();

  for (let i = 0; i <= step && i < path.length; i++) {
    let [x, y] = path[i];
    x *= 0.01 * canvas.width;
    y *= 0.01 * canvas.height;

    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.stroke();

  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function moveMonet(monetRect, canvasRect, x, y) {
  // x and y are in units of percent (0-100), relative to output canvas

  const monetOrigin = [15, 170]; // where on monet should be aligned w the spot being painted

  const clientX = canvasRect.x + x * 0.01 * canvasRect.width;
  const clientY = canvasRect.y + y * 0.01 * canvasRect.height;
  const offsetX = clientX - monetRect.x - monetOrigin[0];
  const offsetY = clientY - monetRect.y - monetOrigin[1];
  const maxRotDeg = 15;
  const rotation = (maxRotDeg * (x - 50)) / 50;
  monet.style.transform = `translate(${offsetX}px, ${offsetY}px) rotateZ(${rotation}deg)`;
}

async function animatePainting() {
  // setup
  const monet = document.getElementById("monet");
  monet.style.transitionDuration = "750ms";

  const monetRect = monet.getBoundingClientRect();
  const canvasRect = outputCanvas.getBoundingClientRect();
  const contexts = [inputCtx, outputCtx];
  const imgDatas = contexts.map((ctx) =>
    ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height)
  );

  // move monet to canvas, wait until he gets there
  moveMonet(monetRect, canvasRect, PAINT_PATH[0][0], PAINT_PATH[0][1]);
  await new Promise((resolve) =>
    monet.addEventListener("transitionend", resolve, { once: true })
  );
  monet.style.transitionDuration = "300ms";

  // go through painting steps
  for (let i = 0; i < PAINT_PATH.length; i++) {
    // monet movement -------------------------------------
    // take local average so monet doesn't jerk around so much
    let x = 0;
    let y = 0;
    let n = 0;
    for (const j of [-1, 0, 1]) {
      if (!PAINT_PATH[i + j]) continue;
      x += PAINT_PATH[i + j][0];
      y += PAINT_PATH[i + j][1];
      n++;
    }
    x /= n;
    y /= n;

    moveMonet(monetRect, canvasRect, x, y);

    // painting animation ----------------------------------------------
    const mask = getImageDataMask(i);
    // apply alpha mask to each canvas context
    contexts.forEach((ctx, idx) => {
      for (let i = 0; i < imgDatas[idx].data.length; i += 4) {
        imgDatas[idx].data[i + 3] = mask.data[i + 3];
      }
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.putImageData(imgDatas[idx], 0, 0);
    });

    await sleep(1000 / FPS);
  }

  // move monet back
  monet.style.transitionDuration = "750ms";
  monet.style.transform = "translate(0, 0)";
  await new Promise((resolve) =>
    monet.addEventListener("transitionend", resolve, { once: true })
  );
}
