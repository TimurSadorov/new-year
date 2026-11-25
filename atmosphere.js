function setUpTimeOfDay() {
  const root = document.documentElement;
  const frost = document.querySelector("#window-frost");
  const params = new URLSearchParams(location.search);
  const requestedTime = params.get("time");
  const previewTime = params.get("preview") === "1" && ["dawn", "day", "night"].includes(requestedTime)
    ? requestedTime
    : null;
  let timer;

  function updateTimeOfDay() {
    const now = new Date();
    const hour = now.getHours();
    const timeOfDay = previewTime ?? (hour < 6 || hour >= 17 ? "night" : hour < 11 ? "dawn" : "day");

    if (root.dataset.time !== timeOfDay) {
      root.dataset.time = timeOfDay;
      if (timeOfDay === "dawn" && !frost.childElementCount) addFrostPatches(frost);
    }

    if (previewTime) return;
    const next = new Date(now);
    next.setHours(hour < 6 ? 6 : hour < 11 ? 11 : hour < 17 ? 17 : 30, 0, 0, 0);
    clearTimeout(timer);
    timer = setTimeout(updateTimeOfDay, Math.min(next - now, 60_000));
  }

  updateTimeOfDay();
  window.addEventListener("focus", updateTimeOfDay);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) updateTimeOfDay();
  });
}

function addFrostPatches(container) {
  const zones = [
    [3, 11, 24, 41], [87, 97, 22, 38],
    [2, 15, 66, 86], [86, 99, 62, 83],
    [29, 55, 92, 102],
  ];
  const between = (from, to) => from + Math.random() * (to - from);

  for (const [left, right, top, bottom] of zones) {
    const patch = document.createElement("span");
    patch.style.left = `${between(left, right)}%`;
    patch.style.top = `${between(top, bottom)}%`;
    patch.style.setProperty("--frost-size", `${between(17, 26)}vmin`);
    patch.style.setProperty("--frost-tilt", `${between(-140, 140)}deg`);
    patch.style.setProperty("--frost-strength", between(0.61, 0.88));
    container.append(patch);
  }
}

function setUpSnow() {
  const canvas = document.querySelector("#snowfall");
  const context = canvas.getContext("2d");
  if (!context) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let width;
  let height;
  let flakes;
  let frame = 0;
  let lastTime = 0;
  let elapsed = 0;

  function resize() {
    const bounds = canvas.getBoundingClientRect();
    width = bounds.width;
    height = bounds.height;
    const scale = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    context.setTransform(scale, 0, 0, scale, 0, 0);
    context.fillStyle = "#f6faff";
    context.strokeStyle = "#52738f";
    context.lineWidth = 0.5;

    const count = Math.min(320, Math.max(96, Math.round(width * height / 4500)));
    flakes = Array.from({ length: count }, () => {
      const depth = Math.random() ** 2;
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        radius: 0.72 + depth * 2.45,
        speed: 17 + depth * 49,
        drift: 3 + depth * 16,
        opacity: 0.26 + depth * 0.62,
        phase: Math.random() * Math.PI * 2,
      };
    });
    draw(0);
  }

  function draw(seconds) {
    elapsed += seconds;
    context.clearRect(0, 0, width, height);
    const daylight = document.documentElement.dataset.time !== "night";
    for (const flake of flakes) {
      flake.x += (flake.drift + 7 * Math.sin(elapsed * 1.25 + flake.phase)) * seconds;
      flake.y += flake.speed * seconds;
      if (flake.x > width + 4) flake.x = -4;
      if (flake.x < -4) flake.x = width + 4;
      if (flake.y > height + 4) flake.y = -4;

      context.globalAlpha = flake.opacity;
      context.beginPath();
      context.arc(flake.x, flake.y, flake.radius, 0, Math.PI * 2);
      context.fill();
      if (daylight && flake.radius > 1.6) {
        context.globalAlpha = flake.opacity * 0.43;
        context.stroke();
      }
    }
  }

  function tick(time) {
    draw(lastTime ? Math.min((time - lastTime) / 1000, 0.04) : 0);
    lastTime = time;
    frame = requestAnimationFrame(tick);
  }

  function updateMotion() {
    cancelAnimationFrame(frame);
    lastTime = 0;
    if (!reducedMotion.matches && !document.hidden) frame = requestAnimationFrame(tick);
  }

  resize();
  updateMotion();
  new ResizeObserver(resize).observe(canvas);
  reducedMotion.addEventListener("change", updateMotion);
  document.addEventListener("visibilitychange", updateMotion);
}

function setUpMusic() {
  const music = document.querySelector("#winter-music");
  const toggle = document.querySelector("#music-toggle");
  const preferenceKey = "sweet-december:music";
  let enabled = true;

  try {
    enabled = localStorage.getItem(preferenceKey) !== "off";
  } catch {
    // The control still works when browser storage is unavailable.
  }

  music.volume = 0.45;
  toggle.hidden = false;

  function updateControl() {
    toggle.setAttribute("aria-pressed", String(!music.paused));
    toggle.title = music.paused ? "Включить музыку" : "Выключить музыку";
  }

  function start() {
    if (enabled && music.paused) music.play().catch(updateControl);
  }

  toggle.addEventListener("click", () => {
    enabled = music.paused;
    if (enabled) start();
    else music.pause();
    updateControl();

    try {
      localStorage.setItem(preferenceKey, enabled ? "on" : "off");
    } catch {
      // Keep the current preference until the page closes.
    }
  });

  music.addEventListener("play", updateControl);
  music.addEventListener("pause", updateControl);
  // Browsers may require a click before they allow audio with sound.
  document.addEventListener("click", (event) => {
    if (event.isTrusted && !toggle.contains(event.target)) start();
  }, { capture: true });
  start();
}

setUpTimeOfDay();
setUpSnow();
setUpMusic();
