const desktopRoute = [
  [47, 78], [66, 121], [83, 214], [86, 335], [71, 421], [52, 471], [29, 500], [14, 595],
  [17, 723], [34, 814], [56, 824], [76, 868], [89, 976], [78, 1081], [57, 1150], [34, 1170],
  [17, 1256], [11, 1373], [26, 1465], [47, 1505], [65, 1571], [86, 1685], [82, 1809],
  [66, 1867], [45, 1885], [25, 1980], [13, 2101], [24, 2225], [46, 2260], [69, 2323], [50, 2508],
];

const mobileRoute = [
  [48, 62], [70, 132], [82, 237], [73, 340], [50, 393], [27, 453], [17, 557], [23, 665],
  [47, 723], [72, 783], [82, 891], [76, 986], [51, 1044], [28, 1094], [16, 1204], [24, 1304],
  [48, 1355], [72, 1425], [83, 1535], [70, 1645], [44, 1690], [20, 1770], [16, 1878],
  [34, 1973], [59, 2038], [80, 2118], [75, 2223], [51, 2313], [27, 2371], [23, 2483], [50, 2632],
];

// Desktop and mobile sizes in CSS pixels for the decor on the map.
const scenerySizes = {
  grove: [213, 141],
  pine: [154, 97],
  cottage: [176, 115],
  drift: [123, 77],
  lantern: [82, 54],
  parcels: [89, 62],
  finale: [520, 320],
};
const finaleArtwork = { width: 472, height: 576, trimTop: 60 };
const woodland = ["grove", "grove", "pine", "grove", "grove", "pine", "drift", "grove", "lantern", "grove", "cottage", "parcels"];

export function mountTrail(track, days) {
  const cord = track.querySelector("#garland-cord");
  const landscape = track.querySelector("#scenery");
  const lights = track.querySelector("#scenery-lights");
  let previousWidth = 0;
  let geometry;
  let images;

  function renderLandscapes() {
    if (!images || !geometry) return;
    const { waypoints, finale, width, height, phone } = geometry;
    const landmarks = placeLandmarks(waypoints, finale, width, height, phone);
    paintWoodland(landscape, landmarks, images, width, height, phone);
    addLights(lights, landmarks);
  }

  function layout() {
    const width = track.clientWidth;
    if (!width || width === previousWidth) return;
    previousWidth = width;

    const phone = width < 700;
    const waypoints = (phone ? mobileRoute : desktopRoute).map(([x, y]) => ({ x: width * x / 100, y }));
    const star = waypoints.at(-1);
    const size = Math.min(scenerySizes.finale[phone ? 1 : 0], width - 32);
    const treeScale = size / finaleArtwork.width;
    const treeHeight = finaleArtwork.height * treeScale;
    const treeTop = star.y + 14 - finaleArtwork.trimTop * treeScale;
    const treeBottom = treeTop + treeHeight;
    const finale = { kind: "finale", x: star.x, y: treeTop + treeHeight * 0.6, size, mirror: false };
    const height = treeBottom + (phone ? 72 : 88);

    track.style.height = `${height}px`;
    days.at(-1).node.style.setProperty("--finale-tree-depth", `${treeBottom - star.y}px`);
    days.forEach(({ node, caption }, index) => {
      const { x, y } = waypoints[index];
      node.style.left = `${x}px`;
      node.style.top = `${y}px`;
      caption.classList.toggle("day__caption--left", x > width * 0.54);
    });
    const sockets = days.map(({ node }, index) => ({
      x: waypoints[index].x,
      y: waypoints[index].y - node.offsetHeight / 2,
    }));
    sockets[sockets.length - 1] = star;
    paintGarlandCord(cord, sockets, width, height);
    geometry = { waypoints, finale, width, height, phone };
    renderLandscapes();
  }

  layout();
  new ResizeObserver(layout).observe(track);
  loadLandscape().then((assets) => {
    images = assets;
    renderLandscapes();
  });
}

function randomSequence(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function prepareSurface(canvas, width, height) {
  // Limit the backing surface for long pages and high-density mobile screens.
  const scale = Math.min(window.devicePixelRatio || 1, 1.6, 4000 / Math.max(width, height), Math.sqrt(9e6 / (width * height)));
  const pixelWidth = Math.round(width * scale);
  const pixelHeight = Math.round(height * scale);
  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
  }
  const context = canvas.getContext("2d");
  context?.setTransform(scale, 0, 0, scale, 0, 0);
  context?.clearRect(0, 0, width, height);
  return context;
}

function paintGarlandCord(canvas, sockets, width, height) {
  const context = prepareSurface(canvas, width, height);
  if (!context) return;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.beginPath();
  context.moveTo(sockets[0].x, sockets[0].y);
  for (let index = 1; index < sockets.length; index++) {
    const previous = sockets[index - 1];
    const next = sockets[index];
    const sag = Math.min(22, Math.abs(next.x - previous.x) * 0.12);
    context.quadraticCurveTo((previous.x + next.x) / 2, (previous.y + next.y) / 2 + sag, next.x, next.y);
  }
  context.lineWidth = 3;
  context.strokeStyle = "#96a9ac43";
  context.stroke();
  context.lineWidth = 1.8;
  context.strokeStyle = "#1d3233bb";
  context.stroke();
}

function placeLandmarks(waypoints, finale, width, height, phone) {
  const random = randomSequence(311226);
  const pieces = [];
  const columns = Math.max(3, Math.round(width / (phone ? 100 : 148)));
  const rowHeight = phone ? 100 : 133;
  const cottages = [];

  for (let y = 76; y < height - 12; y += rowHeight) {
    for (let column = 0; column < columns; column++) {
      const x = (column + 0.2 + random() * 0.6) * width / columns;
      const spotY = y + (random() - 0.5) * rowHeight * 0.7;
      let kind = woodland[Math.floor(random() * woodland.length)];
      if (kind === "cottage" && cottages.some((spot) => Math.hypot(spot.x - x, spot.y - spotY) < (phone ? 282 : 425))) kind = "pine";
      const size = scenerySizes[kind][phone ? 1 : 0] * (0.82 + random() * 0.43);
      const mirror = random() > 0.5;
      const clearance = (phone ? 16 : 21) + size * 0.29;
      const nearBulb = waypoints.some((point) => (point.x - x) ** 2 + (point.y - spotY) ** 2 < clearance ** 2);
      if (nearBulb || Math.hypot(x - finale.x, spotY - finale.y) < finale.size * 0.68) continue;
      if (kind === "cottage") cottages.push({ x, y: spotY });
      pieces.push({ kind, x, y: spotY, size, mirror });
    }
  }

  pieces.push(finale);
  return pieces.sort((a, b) => a.y - b.y);
}

async function loadLandscape() {
  const sources = [
    ["woodland", "./assets/woodland.jpg"],
    ...Object.keys(scenerySizes).map((kind) => [kind, `./assets/trail-${kind}.png`]),
  ];
  const images = await Promise.all(sources.map(async ([kind, source]) => {
    const image = new Image();
    image.src = source;
    try {
      await image.decode();
      // The interactive star takes the place of the one in the tree artwork.
      const trimTop = kind === "finale" ? finaleArtwork.trimTop : 0;
      return [kind, kind === "woodland" ? image : softenSnowBase(image, trimTop)];
    } catch {
      return [kind, null];
    }
  }));
  return Object.fromEntries(images);
}

function softenSnowBase(image, trimTop) {
  const sprite = document.createElement("canvas");
  sprite.width = image.naturalWidth;
  sprite.height = image.naturalHeight;
  const context = sprite.getContext("2d");
  if (!context) return image;

  context.drawImage(image, 0, 0);
  if (trimTop) context.clearRect(0, 0, sprite.width, trimTop);
  context.globalCompositeOperation = "destination-in";
  const snow = context.createLinearGradient(0, 0, 0, sprite.height);
  snow.addColorStop(0, "#000");
  snow.addColorStop(0.62, "#000");
  snow.addColorStop(0.86, "#000c");
  snow.addColorStop(1, "transparent");
  context.fillStyle = snow;
  context.fillRect(0, 0, sprite.width, sprite.height);
  return sprite;
}

function paintWoodland(canvas, landmarks, images, width, height, phone) {
  const context = prepareSurface(canvas, width, height);
  if (!context) return;

  function groundPatch(x, y, radiusX, radiusY, color) {
    context.save();
    context.translate(x, y);
    context.scale(radiusX, radiusY);
    const shade = context.createRadialGradient(0, 0, 0, 0, 0, 1);
    shade.addColorStop(0, color);
    shade.addColorStop(1, "transparent");
    context.fillStyle = shade;
    context.fillRect(-1, -1, 2, 2);
    context.restore();
  }

  if (images.woodland) {
    for (const { kind, x, y, size } of landmarks) {
      if (kind === "grove" || kind === "pine") groundPatch(x, y + size * 0.06, size * 1.04, size * 0.75, "#000d");
    }
    const edgeWidth = Math.min(235, width * 0.25);
    for (let y = 90; y < height; y += 255) {
      groundPatch(0, y, edgeWidth, 195, "#000d");
      groundPatch(width, y + 120, edgeWidth, 210, "#000d");
    }

    context.globalCompositeOperation = "source-in";
    const tile = context.createPattern(images.woodland, "repeat");
    const tileScale = (phone ? 350 : 560) / images.woodland.width;
    tile.setTransform(new DOMMatrix().scale(tileScale));
    context.fillStyle = tile;
    context.fillRect(0, 0, width, height);

    context.globalCompositeOperation = "destination-out";
    for (const { kind, x, y, size } of landmarks) {
      if (kind === "cottage" || kind === "finale") groundPatch(x, y, size * 0.78, size * 0.69, "#000f");
    }
    context.globalCompositeOperation = "source-over";
  }

  for (const { kind, x, y, size, mirror } of landmarks) {
    const image = images[kind];
    if (!image) continue;
    const imageHeight = size * image.height / image.width;
    groundPatch(x - size * 0.08, y + imageHeight * 0.26, size * 0.47, imageHeight * 0.19, "#0a1b31ad");
    groundPatch(x, y + imageHeight * 0.28, size * 0.32, imageHeight * 0.11, "#a3bad382");
    context.save();
    context.translate(x, y);
    if (mirror) context.scale(-1, 1);
    context.drawImage(image, -size / 2, -imageHeight * 0.6, size, imageHeight);
    context.restore();
  }
}

function addLights(container, landmarks) {
  const lights = document.createDocumentFragment();
  landmarks.forEach(({ kind, x, y, size }, index) => {
    if (kind !== "cottage" && kind !== "lantern" && kind !== "finale") return;
    const light = document.createElement("span");
    light.style.left = `${x}px`;
    light.style.top = `${y + size * 0.28}px`;
    light.style.setProperty("--pool-width", `${size * 1.65}px`);
    light.style.setProperty("--glow-delay", `${-index * 0.57}s`);
    lights.append(light);
  });
  container.replaceChildren(lights);
}
