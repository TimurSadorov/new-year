const calendarYear = 2026;
const dayCount = 31;
const preview = new URLSearchParams(location.search).get("preview") === "1";
const viewedKey = `sweet-december:${calendarYear}:${preview ? "preview" : "viewed"}`;
const placeholderImage = "./assets/gift-placeholder.jpg";

const track = document.querySelector("#track");
const canvas = document.querySelector("#track-path");
const daysList = document.querySelector("#days");
const status = document.querySelector("#calendar-status");
const trailLink = document.querySelector("#trail-link");
const dialog = document.querySelector("#gift-dialog");
const giftArt = document.querySelector("#gift-art");
const giftImage = document.querySelector("#gift-image");
const giftTitle = document.querySelector("#gift-title");
const giftDate = document.querySelector("#gift-date");
const giftMessage = document.querySelector("#gift-message");

const positions = [
  50, 61, 72, 70, 59, 42, 29, 28, 38, 55, 69, 72, 60, 42, 28, 29,
  42, 58, 71, 72, 61, 45, 30, 27, 38, 54, 68, 73, 69, 61, 50,
];
const rows = positions.map((x, index) => ({
  x,
  y: 43 + index * 76 + (index === dayCount - 1 ? 42 : 0),
}));
const trackHeight = rows.at(-1).y + 53;
// Place scenery in the clearings alongside the day markers.
const decorations = [
  [1, 16, 34, "pine"], [2, 87, -14, "lantern"], [3, 24, 26, "parcels"],
  [5, 86, 12, "pine", true], [7, 78, -12, "lantern"], [8, 14, 36, "parcels"],
  [10, 16, -12, "pine"], [11, 88, 22, "lantern", true], [13, 82, 12, "parcels"],
  [15, 79, 6, "pine"], [16, 15, 33, "lantern"], [18, 15, -10, "parcels"],
  [20, 18, 20, "pine"], [21, 88, 13, "lantern"], [23, 79, -4, "parcels"],
  [24, 88, 20, "pine", true], [26, 15, 12, "lantern"], [28, 25, -14, "pine"],
  [30, 85, 5, "lantern"], [31, 27, -23, "parcels"], [31, 81, -17, "pine", true],
];

let viewed = readViewedDays();
let giftRequest;
let selection = 0;
let dateKey;

document.querySelector("#edition").textContent = `Декабрь ${calendarYear}`;
document.querySelector("#preview-badge").hidden = !preview;
track.style.height = `${trackHeight}px`;

const scenery = document.querySelector("#scenery");
decorations.forEach(([day, x, offset, kind, small], index) => {
  const decoration = document.createElement("span");
  decoration.className = `decoration decoration--${kind}${small ? " decoration--small" : ""}`;
  decoration.style.left = `${x}%`;
  decoration.style.top = `${rows[day - 1].y + offset}px`;
  decoration.style.setProperty("--glow-delay", `${-index * 0.47}s`);

  const image = document.createElement("img");
  image.src = `./assets/trail-${kind}.png`;
  image.alt = "";
  image.decoding = "async";
  image.width = 384;
  image.height = 384;
  decoration.append(image);
  scenery.append(decoration);
});

const days = rows.map(({ x, y }, index) => {
  const day = index + 1;
  const node = document.createElement("li");
  node.className = day === dayCount ? "day day--end" : "day";
  node.id = `day-${day}`;
  node.style.left = `${x}%`;
  node.style.top = `${y}px`;

  if (day === dayCount) {
    const fir = document.createElement("span");
    fir.className = "fir";
    fir.setAttribute("aria-hidden", "true");
    node.append(fir);
  }

  const button = document.createElement("button");
  button.type = "button";
  button.className = "day__button";
  button.setAttribute("aria-haspopup", "dialog");
  button.addEventListener("click", () => openDay(day));

  const number = document.createElement("span");
  number.className = "day__number";
  number.textContent = day;

  const mark = document.createElement("span");
  mark.setAttribute("aria-hidden", "true");
  button.append(number, mark);

  const caption = document.createElement("span");
  caption.className = "day__caption";
  caption.classList.toggle("day__caption--left", x > 54);
  caption.setAttribute("aria-hidden", "true");
  node.append(button, caption);
  daysList.append(node);
  return { node, button, mark, caption };
});

function readViewedDays() {
  try {
    const saved = JSON.parse(localStorage.getItem(viewedKey) ?? "[]");
    return new Set(Array.isArray(saved) ? saved : []);
  } catch {
    return new Set();
  }
}

function markViewed(day) {
  if (viewed.has(day)) return;
  viewed.add(day);
  try {
    localStorage.setItem(viewedKey, JSON.stringify([...viewed]));
  } catch {
    // The calendar remains usable when the browser blocks storage.
  }
  refreshDays();
}

function currentDate() {
  const now = new Date();
  const start = new Date(calendarYear, 11, 1);
  const end = new Date(calendarYear + 1, 0, 1);
  const today = now >= start && now < end ? now.getDate() : null;
  const available = now >= end ? dayCount : (today ?? 0);
  return { today, available: preview ? dayCount : available };
}

function refreshDays() {
  const { today, available } = currentDate();
  dateKey = `${today}:${available}`;

  days.forEach(({ button, mark, caption }, index) => {
    const day = index + 1;
    const open = day <= available;
    const seen = open && viewed.has(day);
    button.dataset.open = String(open);
    button.setAttribute("aria-label", `${day} декабря, ${!open ? "подарок закрыт" : seen ? "подарок просмотрен" : "открыть подарок"}`);
    if (day === today) button.setAttribute("aria-current", "date");
    else button.removeAttribute("aria-current");

    mark.hidden = open && !seen;
    mark.className = `day__mark${seen ? " day__mark--viewed" : open ? "" : " day__mark--locked"}`;
    mark.textContent = seen ? "✓" : "";

    caption.textContent = day === today ? "Сегодня" : day === dayCount ? "Новый год" : "";
    caption.hidden = !caption.textContent;
  });

  status.textContent = preview
    ? "В демо можно открыть любой день."
    : today ? `Сегодня ${today} декабря`
    : available ? "Все подарки открыты."
    : `Первый подарок откроется 1 декабря ${calendarYear} года.`;

  trailLink.textContent = today && !preview ? "К сегодняшнему дню" : "На тропинку";
  trailLink.href = today && !preview ? `#day-${today}` : "#trail";
  drawPath();
}

function drawPath() {
  const width = track.clientWidth;
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(trackHeight * ratio);

  const ctx = canvas.getContext("2d");
  if (!ctx || !width) return;
  ctx.scale(ratio, ratio);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  function trace(count) {
    ctx.beginPath();
    ctx.moveTo(rows[0].x * width / 100, rows[0].y);
    for (let index = 1; index < count; index++) {
      const previous = rows[index - 1];
      const next = rows[index];
      const middle = (previous.y + next.y) / 2;
      ctx.bezierCurveTo(previous.x * width / 100, middle, next.x * width / 100, middle, next.x * width / 100, next.y);
    }
  }

  function stroke(color, lineWidth, dash = []) {
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.setLineDash(dash);
    ctx.stroke();
  }

  trace(rows.length);
  stroke("#122039a6", 16);
  stroke("#a7bfd462", 9);
  stroke("#daebf791", 2, [3, 10]);

  const { available } = currentDate();
  if (available > 1) {
    trace(available);
    stroke("#634e33de", 9);
    stroke("#f6cc86cb", 2.2, [3, 9]);
  }
}

function checkDate() {
  const { today, available } = currentDate();
  if (`${today}:${available}` !== dateKey) refreshDays();
}

function loadGifts() {
  if (!giftRequest) {
    giftRequest = fetch("./gifts.json").then(async (response) => {
      if (!response.ok) throw new Error("Gift list unavailable");
      return new Map((await response.json()).map((gift) => [gift.day, gift]));
    }).catch(() => {
      giftRequest = null;
      return null;
    });
  }
  return giftRequest;
}

async function openDay(day) {
  const request = ++selection;
  checkDate();

  if (day > currentDate().available) {
    showDialog(day, "Подарок пока закрыт", `Откроется ${day} декабря.`);
    return;
  }

  // Preview always uses sample cards, even after the real gifts are added.
  const gift = preview
    ? { name: day === dayCount ? "Особый подарок" : `Сюрприз №${day}`, image: null }
    : (await loadGifts())?.get(day);
  if (request !== selection) return;
  if (day > currentDate().available) {
    checkDate();
    showDialog(day, "Подарок пока закрыт", `Откроется ${day} декабря.`);
    return;
  }
  if (!gift?.name) {
    showDialog(day, "Подарок не загрузился", "Попробуй снова чуть позже.");
    return;
  }

  markViewed(day);
  showDialog(day, gift.name, "", gift.image || placeholderImage);
}

function showDialog(day, title, message, image) {
  giftDate.textContent = `${day} декабря`;
  giftTitle.textContent = title;
  giftMessage.textContent = message;
  giftMessage.hidden = !message;
  giftArt.hidden = !image;
  if (image) {
    giftImage.toggleAttribute("data-placeholder", image === placeholderImage);
    giftImage.src = image;
  } else {
    giftImage.removeAttribute("src");
  }
  if (!dialog.open) dialog.showModal();
}

giftImage.addEventListener("error", () => {
  if (giftArt.hidden) return;
  if (giftImage.hasAttribute("data-placeholder")) {
    giftArt.hidden = true;
    return;
  }
  giftImage.setAttribute("data-placeholder", "");
  giftImage.src = placeholderImage;
});

document.querySelector("#dismiss").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => {
  if (event.target !== dialog) return;
  const bounds = dialog.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) {
    dialog.close();
  }
});

window.addEventListener("storage", (event) => {
  if (event.key !== viewedKey && event.key !== null) return;
  viewed = readViewedDays();
  refreshDays();
});

new ResizeObserver(drawPath).observe(track);
window.addEventListener("focus", checkDate);
document.addEventListener("visibilitychange", checkDate);
window.setInterval(checkDate, 30_000);

refreshDays();
const { today } = currentDate();
if (!preview && today && today > 1 && !location.hash) {
  window.addEventListener("load", () => {
    if (window.scrollY === 0) days[today - 1].node.scrollIntoView({ block: "center" });
  }, { once: true });
}
