import { mountTrail } from "./trail.js?v=4";
import { prepareGiftSalute, playGiftSalute, stopGiftSalute } from "./gift-salute.js";

const calendarYear = 2026;
const dayCount = 31;
const preview = new URLSearchParams(location.search).get("preview") === "1";
const viewedKey = `sweet-december:${calendarYear}:${preview ? "preview" : "viewed"}`;
const placeholderImage = "./assets/gift-placeholder.jpg";

const track = document.querySelector("#track");
const daysList = document.querySelector("#days");
const status = document.querySelector("#calendar-status");
const trailLink = document.querySelector("#trail-link");
const dialog = document.querySelector("#gift-dialog");
const giftArt = document.querySelector("#gift-art");
const giftImage = document.querySelector("#gift-image");
const giftTitle = document.querySelector("#gift-title");
const giftDate = document.querySelector("#gift-date");
const giftMessage = document.querySelector("#gift-message");
const fireworks = document.querySelector("#gift-fireworks");
const finaleOverlay = document.querySelector("#gift-finale");
const finaleFireworks = document.querySelector("#finale-fireworks");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

const goldSparks = ["#fff5d0", "#ffcb76", "#ff9d58"];
const roseSparks = ["#fff0dc", "#ffc3d2", "#ffb767"];
const blueSparks = ["#fff3cb", "#afe0ff", "#ffd583"];
const violetSparks = ["#f9e8ff", "#c6aafe", "#ffe8b0"];
const giftBursts = [
  { x: 0.50, y: 0.40, delay: 370, reach: 0.34, colors: goldSparks },
  { x: 0.24, y: 0.49, delay: 560, reach: 0.23, colors: roseSparks },
  { x: 0.77, y: 0.40, delay: 700, reach: 0.24, colors: blueSparks },
];
const finaleBursts = [
  { x: 0.19, y: 0.30, delay: 160, reach: 0.27, colors: goldSparks },
  { x: 0.80, y: 0.23, delay: 420, reach: 0.24, colors: blueSparks },
  { x: 0.25, y: 0.73, delay: 710, reach: 0.29, colors: violetSparks },
  { x: 0.72, y: 0.71, delay: 980, reach: 0.30, colors: roseSparks },
  { x: 0.52, y: 0.20, delay: 1260, reach: 0.27, colors: goldSparks },
  { x: 0.14, y: 0.52, delay: 1550, reach: 0.26, colors: blueSparks },
  { x: 0.86, y: 0.55, delay: 1810, reach: 0.28, colors: violetSparks },
  { x: 0.48, y: 0.81, delay: 2150, reach: 0.27, colors: goldSparks },
  { x: 0.32, y: 0.28, delay: 2450, reach: 0.30, colors: roseSparks },
  { x: 0.68, y: 0.30, delay: 2690, reach: 0.32, colors: goldSparks },
];

let viewed = readViewedDays();
let giftRequest;
let selection = 0;
let renderedDate;
let fireworksFrame = 0;
let celebrationTimer;

document.querySelector("#edition").textContent = `Декабрь ${calendarYear}`;
document.querySelector("#preview-badge").hidden = !preview;

const days = Array.from({ length: dayCount }, (_, index) => {
  const day = index + 1;
  const node = document.createElement("li");
  node.className = day === dayCount ? "day day--end" : "day";
  node.id = `day-${day}`;

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
  caption.setAttribute("aria-hidden", "true");
  node.append(button, caption);
  if (day === dayCount) {
    const title = document.createElement("span");
    title.className = "day__finale-title";
    title.textContent = "Новый год";
    node.append(title);
  }
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
  const followingDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const today = now >= start && now < end ? now.getDate() : null;
  const tomorrow = followingDate >= start && followingDate < end ? followingDate.getDate() : null;
  const available = preview || now >= end ? dayCount : (today ?? 0);
  return { today, tomorrow, available, dateKey: now.toDateString() };
}

function calendarProgress() {
  const date = currentDate();
  let completed = 0;
  while (completed < date.available && viewed.has(completed + 1)) completed++;
  const nextDay = completed < date.available ? completed + 1 : null;
  const upcomingDay = !nextDay && completed < dayCount ? completed + 1 : null;
  return { ...date, completed, nextDay, upcomingDay };
}

function openingTime(day, tomorrow) {
  return day === tomorrow ? "завтра" : `${day} декабря`;
}

function refreshDays() {
  const { today, tomorrow, available, dateKey, completed, nextDay, upcomingDay } = calendarProgress();
  renderedDate = dateKey;

  days.forEach(({ button, mark, caption }, index) => {
    const day = index + 1;
    const seen = day <= completed;
    const ready = day === nextDay;
    const upcoming = day === upcomingDay;
    const open = seen || ready;
    button.dataset.open = String(open);
    button.toggleAttribute("data-next", ready);
    button.toggleAttribute("data-upcoming", upcoming);
    if (day === today) button.setAttribute("aria-current", "date");
    else button.removeAttribute("aria-current");

    mark.className = `day__mark ${seen ? "day__mark--viewed" : ready ? "day__mark--next" : "day__mark--locked"}`;
    mark.textContent = seen ? "✓" : ready ? "✦" : "";

    const opening = upcoming ? `Откроется ${openingTime(day, tomorrow)}` : null;
    const giftState = seen ? "подарок просмотрен" : ready ? "открыть подарок" : "подарок закрыт";
    button.setAttribute("aria-label", opening ? `${day} декабря. ${opening}` : `${day} декабря, ${giftState}`);
    caption.textContent = opening ?? (ready ? "Можно открыть" : day === today ? "Сегодня" : "");
    caption.hidden = !caption.textContent;
  });

  if (!available) {
    status.textContent = tomorrow === 1
      ? "Первый подарок откроется завтра."
      : `Первый подарок откроется 1 декабря ${calendarYear} года.`;
  } else if (completed === dayCount) status.textContent = "Все подарки открыты.";
  else if (nextDay) status.textContent = `Открывай по порядку. Дальше — ${nextDay} декабря.`;
  else status.textContent = `Следующий подарок откроется ${openingTime(upcomingDay, tomorrow)}.`;

  const nextStop = nextDay ?? upcomingDay;
  const jumpToNext = nextStop > 1;
  trailLink.textContent = jumpToNext ? "К следующему подарку" : "К календарю";
  trailLink.href = jumpToNext ? `#day-${nextStop}` : "#trail";
}

function checkDate() {
  if (new Date().toDateString() !== renderedDate) refreshDays();
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

  if (showLockedDay(day)) return;
  if (!viewed.has(day)) prepareGiftSalute();

  // Preview always uses sample cards, even after the real gifts are added.
  const gift = preview
    ? { name: day === dayCount ? "Особый подарок" : `Сюрприз №${day}`, image: null }
    : (await loadGifts())?.get(day);
  if (request !== selection) return;
  checkDate();
  if (showLockedDay(day)) return;
  if (!gift?.name) {
    showDialog(day, "Подарок не загрузился", "Попробуй снова чуть позже.");
    return;
  }

  showDialog(day, gift.name, "", gift.image || placeholderImage, !viewed.has(day));
  markViewed(day);
}

function showLockedDay(day) {
  const { available, completed, nextDay, tomorrow } = calendarProgress();
  const message = day > available
    ? `Откроется ${openingTime(day, tomorrow)}.`
    : day > completed && day !== nextDay ? `Сначала открой подарок за ${nextDay} декабря.` : null;
  if (!message) return false;
  showDialog(day, "Подарок пока закрыт", message);
  return true;
}

function showDialog(day, title, message, image, firstOpening = false) {
  stopGiftCelebration();
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
  const finale = firstOpening && day === dayCount;
  const animate = firstOpening && !reducedMotion.matches;
  dialog.toggleAttribute("data-celebrate", animate && !finale);
  dialog.toggleAttribute("data-finale", finale);
  finaleOverlay.hidden = !finale;
  if (finale) dialog.setAttribute("aria-labelledby", "gift-finale-title");
  if (!dialog.open) dialog.showModal();

  if (firstOpening) {
    const bursts = finale ? finaleBursts : giftBursts;
    const lifetime = finale ? 1180 : 980;
    playGiftSalute(bursts);
    if (animate) playGiftFireworks(finale ? finaleFireworks : fireworks, bursts, lifetime, finale ? 48 : 26);
    celebrationTimer = window.setTimeout(stopGiftCelebration, bursts.at(-1).delay + lifetime);
  }
}

function stopGiftAnimation() {
  cancelAnimationFrame(fireworksFrame);
  dialog.removeAttribute("data-celebrate");
  fireworks.width = 0;
  finaleFireworks.width = 0;
}

function stopGiftCelebration() {
  clearTimeout(celebrationTimer);
  stopGiftSalute();
  stopGiftAnimation();
  finaleOverlay.hidden = true;
  dialog.removeAttribute("data-finale");
  dialog.setAttribute("aria-labelledby", "gift-title");
}

function playGiftFireworks(canvas, layout, lifetime, sparkCount) {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const context = canvas.getContext("2d");
  if (!context || !width || !height) return;

  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  context.scale(ratio, ratio);
  context.lineCap = "round";
  context.globalCompositeOperation = "lighter";

  const bursts = layout.map((burst) => ({
    ...burst,
    sparks: Array.from({ length: sparkCount }, (_, index) => {
      const angle = (index + Math.random() * 0.72) / sparkCount * Math.PI * 2;
      const distance = Math.min(width, height) * burst.reach * (0.45 + Math.random() * 0.55);
      return {
        dx: Math.cos(angle) * distance,
        dy: Math.sin(angle) * distance,
        size: 0.85 + Math.random() * 1.25,
        color: burst.colors[index % burst.colors.length],
      };
    }),
  }));

  const start = performance.now();

  function draw(now) {
    const elapsed = now - start;
    context.clearRect(0, 0, width, height);

    for (const burst of bursts) {
      const age = (elapsed - burst.delay) / lifetime;
      if (age < 0 || age >= 1) continue;

      const centerX = width * burst.x;
      const centerY = height * burst.y;
      const spread = 1 - (1 - age) ** 2.35;
      const tailAge = Math.max(0, age - 0.12);
      const tailSpread = 1 - (1 - tailAge) ** 2.35;
      const fade = (1 - age) ** 1.4;

      for (const spark of burst.sparks) {
        const x = centerX + spark.dx * spread;
        const y = centerY + spark.dy * spread + 26 * age ** 2;
        context.globalAlpha = 0.58 * fade;
        context.strokeStyle = spark.color;
        context.lineWidth = spark.size;
        context.beginPath();
        context.moveTo(centerX + spark.dx * tailSpread, centerY + spark.dy * tailSpread + 26 * tailAge ** 2);
        context.lineTo(x, y);
        context.stroke();

        context.globalAlpha = fade;
        context.fillStyle = spark.color;
        context.beginPath();
        context.arc(x, y, spark.size, 0, Math.PI * 2);
        context.fill();
      }
    }

    if (elapsed < bursts.at(-1).delay + lifetime) fireworksFrame = requestAnimationFrame(draw);
  }

  fireworksFrame = requestAnimationFrame(draw);
}

giftImage.addEventListener("error", () => {
  if (giftArt.hidden) return;
  if (giftImage.hasAttribute("data-placeholder")) {
    giftArt.hidden = true;
    if (!dialog.hasAttribute("data-finale")) stopGiftCelebration();
    return;
  }
  giftImage.setAttribute("data-placeholder", "");
  giftImage.src = placeholderImage;
});

document.querySelector("#dismiss").addEventListener("click", () => dialog.close());
dialog.addEventListener("close", () => {
  if (!dialog.open) stopGiftCelebration();
});
reducedMotion.addEventListener("change", (event) => {
  if (event.matches) stopGiftAnimation();
});
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

mountTrail(track, days);
window.addEventListener("focus", checkDate);
document.addEventListener("visibilitychange", checkDate);
window.setInterval(checkDate, 30_000);

refreshDays();
const { today, nextDay, upcomingDay } = calendarProgress();
const firstStop = nextDay ?? upcomingDay ?? today;
if (!preview && firstStop > 1 && !location.hash) {
  window.addEventListener("load", () => {
    if (window.scrollY === 0) days[firstStop - 1].node.scrollIntoView({ block: "center" });
  }, { once: true });
}
