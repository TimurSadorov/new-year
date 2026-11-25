const desktopRoute = [
  [47, 78], [66, 121], [83, 214], [86, 335], [71, 421], [52, 471], [29, 500], [14, 595],
  [17, 723], [34, 814], [56, 824], [76, 868], [89, 976], [78, 1081], [57, 1150], [34, 1170],
  [17, 1256], [11, 1373], [26, 1465], [47, 1505], [65, 1571], [86, 1685], [82, 1809],
  [66, 1867], [45, 1885], [25, 1980], [13, 2101], [24, 2225], [46, 2260], [69, 2323], [60, 2508],
];

const mobileRoute = [
  [48, 62], [70, 132], [82, 237], [73, 340], [50, 393], [27, 453], [17, 557], [23, 665],
  [47, 723], [72, 783], [82, 891], [76, 986], [51, 1044], [28, 1094], [16, 1204], [24, 1304],
  [48, 1355], [72, 1425], [83, 1535], [70, 1645], [44, 1690], [20, 1770], [16, 1878],
  [34, 1973], [59, 2038], [80, 2118], [75, 2223], [51, 2313], [27, 2371], [23, 2483], [51, 2632],
];

// Desktop and mobile sizes in CSS pixels for the decor on the map.
const scenerySizes = {
  grove: [213, 141],
  pine: [154, 97],
  cottage: [176, 115],
  drift: [123, 77],
  lantern: [82, 54],
  parcels: [89, 62],
  finale: [250, 164],
};
const woodland = ["grove", "grove", "pine", "grove", "grove", "pine", "drift", "grove", "lantern", "grove", "cottage", "parcels"];

export function mountTrail(track, days) {
  const canvas = track.querySelector("#track-path");
  const landscape = track.querySelector("#scenery");
  const lights = track.querySelector("#scenery-lights");
  let previousWidth = 0;
  let geometry;
  let images;

  function renderLandscapes() {
    if (!images || !geometry) return;
    const { route, last, width, height, halfWidth, phone } = geometry;
    const landmarks = placeLandmarks(route, last, width, height, halfWidth, phone);
    paintWoodland(landscape, route, landmarks, images, width, height, halfWidth, phone);
    addLights(lights, landmarks);
  }

  function layout() {
    const width = track.clientWidth;
    if (!width || width === previousWidth) return;
    previousWidth = width;

    const phone = width < 700;
    const waypoints = (phone ? mobileRoute : desktopRoute).map(([x, y]) => ({ x: width * x / 100, y }));
    const first = waypoints[0];
    const last = waypoints.at(-1);
    const height = last.y + (phone ? 108 : 140);
    const halfWidth = phone ? Math.min(40, Math.max(24, width * 0.078)) : Math.min(71, Math.max(38, width * 0.048));
    const route = sampleRoute([
      { x: first.x - width * 0.08, y: 8 },
      ...waypoints,
      { x: last.x + width * 0.04, y: last.y + 36 },
    ]);

    track.style.height = `${height}px`;
    days.forEach(({ node, caption }, index) => {
      const { x, y } = waypoints[index];
      node.style.left = `${x}px`;
      node.style.top = `${y}px`;
      caption.classList.toggle("day__caption--left", x > width * 0.54 || index === waypoints.length - 1);
    });
    paintSnowPath(canvas, route, width, height, halfWidth);
    geometry = { route, last, width, height, halfWidth, phone };
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

function sampleRoute(points) {
  const samples = [];

  function interpolate(before, start, end, after, t) {
    const startTangent = (end - before) * 0.4;
    const endTangent = (after - start) * 0.4;
    return (2 * t ** 3 - 3 * t ** 2 + 1) * start
      + (t ** 3 - 2 * t ** 2 + t) * startTangent
      + (-2 * t ** 3 + 3 * t ** 2) * end
      + (t ** 3 - t ** 2) * endTangent;
  }

  for (let index = 0; index < points.length - 1; index++) {
    const start = points[index];
    const end = points[index + 1];
    const before = points[index - 1] ?? start;
    const after = points[index + 2] ?? end;
    const steps = Math.max(12, Math.ceil(Math.hypot(end.x - start.x, end.y - start.y) / 5));

    for (let step = index === 0 ? 0 : 1; step <= steps; step++) {
      const t = step / steps;
      samples.push({
        x: interpolate(before.x, start.x, end.x, after.x, t),
        y: interpolate(before.y, start.y, end.y, after.y, t),
      });
    }
  }

  let distance = 0;
  return samples.map((point, index) => {
    const before = samples[index - 1] ?? point;
    const after = samples[index + 1] ?? point;
    const dx = after.x - before.x;
    const dy = after.y - before.y;
    const length = Math.hypot(dx, dy) || 1;
    distance += Math.hypot(point.x - before.x, point.y - before.y);
    return { ...point, distance, normalX: -dy / length, normalY: dx / length };
  });
}

function prepareSurface(canvas, width, height) {
  // Limit the backing surface for long pages and high-density mobile screens.
  const scale = Math.min(window.devicePixelRatio || 1, 1.6, 4000 / Math.max(width, height), Math.sqrt(9e6 / (width * height)));
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const context = canvas.getContext("2d");
  context?.setTransform(scale, 0, 0, scale, 0, 0);
  return { context, scale };
}

function paintSnowPath(canvas, route, width, height, halfWidth) {
  const { context, scale } = prepareSurface(canvas, width, height);
  if (!context) return;

  const end = route.at(-1).distance;
  // Overlapping circles give the banks soft bends, including the hairpin turns.
  function fillSnow(radius, color) {
    context.beginPath();
    for (let index = 1; index < route.length - 1; index += 2) {
      const point = route[index];
      const distance = point.distance;
      const taper = Math.sqrt(Math.min(1, distance / 53, (end - distance) / 68));
      const drift = 1 + 0.135 * Math.sin(distance / 68) + 0.055 * Math.sin(distance / 22) + 0.026 * Math.sin(distance / 9);
      const offset = halfWidth * (0.085 * Math.sin(distance / 46) + 0.06 * Math.sin(distance / 29));
      const x = point.x + point.normalX * offset;
      const y = point.y + point.normalY * offset;
      const r = radius * drift * taper;
      context.moveTo(x + r, y);
      context.arc(x, y, r, 0, Math.PI * 2);
    }
    context.fillStyle = color;
    context.fill();
  }

  const powder = context.createLinearGradient(0, 0, width, height);
  powder.addColorStop(0, "#d4e3ed27");
  powder.addColorStop(0.28, "#ccdce82d");
  powder.addColorStop(0.55, "#d3e4ed2a");
  powder.addColorStop(0.79, "#b9cfdf2a");
  powder.addColorStop(1, "#d8e1e630");

  context.shadowColor = "#b3cadd67";
  context.shadowBlur = 17 * scale;
  fillSnow(halfWidth * 1.19, "#b6cde23b");
  context.shadowBlur = 0;
  for (const layer of [1.14, 1.08, 1.03, 0.98, 0.93, 0.87, 0.81]) fillSnow(halfWidth * layer, powder);

  const random = randomSequence(1201);
  let nextFootstep = 35;
  let stepsInPatch = 0;

  for (const point of route) {
    if (point.distance < 30 || point.distance > end - 44) continue;

    // The two snowbanks have scattered powder and slate-blue ice grains.
    for (let grain = 0; grain < 4; grain++) {
      const across = (random() * 1.83 - 0.915) * halfWidth;
      const x = point.x + point.normalX * across + (random() - 0.5) * 5;
      const y = point.y + point.normalY * across + (random() - 0.5) * 6;
      context.fillStyle = random() > 0.46 ? "#edf6fc49" : "#50748f3b";
      context.beginPath();
      context.ellipse(x, y, 0.45 + random() * 1.6, 0.35 + random() * 1.1, 0.3, 0, Math.PI * 2);
      context.fill();
    }

    if (point.distance >= nextFootstep) {
      const side = stepsInPatch % 2 === 0 ? -1 : 1;
      const across = Math.sin(point.distance / 67) * halfWidth * 0.21 + side * 4;
      const x = point.x + point.normalX * across;
      const y = point.y + point.normalY * across;
      const angle = Math.atan2(point.normalY, point.normalX) + side * 0.18;
      context.fillStyle = "#395a7491";
      context.beginPath();
      context.ellipse(x, y, 2.15, 3.9, angle, 0, Math.PI * 2);
      context.ellipse(x - point.normalY * 4.7, y + point.normalX * 4.7, 1.6, 1.6, angle, 0, Math.PI * 2);
      context.fill();
      stepsInPatch++;
      nextFootstep += stepsInPatch % 5 === 0 ? 45 + random() * 45 : 12 + random() * 4;
    }
  }
}

function placeLandmarks(route, finish, width, height, halfWidth, phone) {
  const random = randomSequence(311226);
  const pieces = [];
  const finishX = width * (phone ? 0.76 : 0.73);
  const finishY = finish.y - (phone ? 46 : 64);
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
      const clearance = halfWidth * 1.09 + size * 0.33;
      const onPath = route.some((point) => (point.x - x) ** 2 + (point.y - spotY) ** 2 < clearance ** 2);
      if (onPath || Math.hypot(x - finishX, spotY - finishY) < (phone ? 116 : 188)) continue;
      if (kind === "cottage") cottages.push({ x, y: spotY });
      pieces.push({ kind, x, y: spotY, size, mirror });
    }
  }

  pieces.push({ kind: "finale", x: finishX, y: finishY, size: scenerySizes.finale[phone ? 1 : 0], mirror: false });
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
      return [kind, kind === "woodland" ? image : softenSnowBase(image)];
    } catch {
      return [kind, null];
    }
  }));
  return Object.fromEntries(images);
}

function softenSnowBase(image) {
  const sprite = document.createElement("canvas");
  sprite.width = image.naturalWidth;
  sprite.height = image.naturalHeight;
  const context = sprite.getContext("2d");
  if (!context) return image;

  context.drawImage(image, 0, 0);
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

function paintWoodland(canvas, route, landmarks, images, width, height, halfWidth, phone) {
  const { context, scale } = prepareSurface(canvas, width, height);
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

    // The continuous forest recedes around the snowy route and its clearings.
    context.globalCompositeOperation = "destination-out";
    context.beginPath();
    context.moveTo(route[0].x, route[0].y);
    for (const point of route) context.lineTo(point.x, point.y);
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = "#000b";
    context.lineWidth = halfWidth * 2.48;
    context.shadowColor = "#0007";
    context.shadowBlur = 18 * scale;
    context.stroke();
    context.shadowBlur = 0;
    context.lineWidth = halfWidth * 2.02;
    context.strokeStyle = "#000";
    context.stroke();
    for (const { kind, x, y, size } of landmarks) {
      if (kind === "cottage" || kind === "finale") groundPatch(x, y, size * 0.78, size * 0.69, "#000f");
    }
    context.globalCompositeOperation = "source-over";
  }

  for (const { kind, x, y, size } of landmarks) {
    if (kind !== "cottage" || !images.cottage) continue;
    let nearest = route[0];
    let distance = Infinity;
    for (const point of route) {
      const fromDoor = Math.hypot(x - point.x, y + size * 0.25 - point.y);
      if (fromDoor < distance) {
        nearest = point;
        distance = fromDoor;
      }
    }
    if (distance > (phone ? 150 : 258)) continue;
    context.beginPath();
    context.moveTo(x, y + size * 0.25);
    context.quadraticCurveTo(x + (nearest.x - x) * 0.37, nearest.y + 32, nearest.x, nearest.y);
    context.lineCap = "round";
    context.lineWidth = phone ? 19 : 34;
    context.strokeStyle = "#bbd0df58";
    context.shadowColor = "#b9d1e258";
    context.shadowBlur = 9 * scale;
    context.stroke();
    context.shadowBlur = 0;
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
