function setUpTimeOfDay() {
  const root = document.documentElement;
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
      document.dispatchEvent(new Event("winter-time-change"));
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

function setUpSnow() {
  const canvas = document.querySelector("#snowfall");
  const context = canvas.getContext("2d");
  if (!context) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const climates = {
    dawn: { spacing: 2300, min: 230, max: 620, fall: 29, speed: 61, wind: 119, gust: 52, streak: 0.042 },
    day: { spacing: 2600, min: 205, max: 550, fall: 18, speed: 39, wind: 8, gust: 10, streak: 0 },
    night: { spacing: 3250, min: 155, max: 460, fall: 8, speed: 24, wind: 2, gust: 3, streak: 0 },
  };
  let width;
  let height;
  let flakes = [];
  let weather;
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
    flakes = [];
    updateWeather();
  }

  function updateWeather() {
    weather = climates[document.documentElement.dataset.time] ?? climates.night;
    const count = Math.min(weather.max, Math.max(weather.min, Math.round(width * height / weather.spacing)));
    while (flakes.length < count) {
      const depth = Math.random() ** 2;
      flakes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: 0.48 + depth * 1.22,
        depth,
        opacity: 0.29 + depth * 0.56,
        phase: Math.random() * Math.PI * 2,
      });
    }
    flakes.length = count;
    draw(0);
  }

  function draw(seconds) {
    elapsed += seconds;
    context.clearRect(0, 0, width, height);
    const daylight = weather !== climates.night;
    const gust = weather.gust * (0.58 * Math.sin(elapsed * 0.83) + 0.28 * Math.sin(elapsed * 1.63));
    for (const flake of flakes) {
      const sideways = (weather.wind + gust) * (0.66 + flake.depth * 0.63) + 5 * Math.sin(elapsed * 1.25 + flake.phase);
      const downward = weather.fall + flake.depth * weather.speed;
      flake.x += sideways * seconds;
      flake.y += downward * seconds;
      if (flake.x > width + 15) flake.x = -15;
      if (flake.x < -15) flake.x = width + 15;
      if (flake.y > height + 15) flake.y = -15;

      if (weather.streak && flake.depth > 0.27) {
        context.globalAlpha = flake.opacity * 0.48;
        context.strokeStyle = "#edf7ff";
        context.lineWidth = flake.radius * 0.76;
        context.beginPath();
        context.moveTo(flake.x - sideways * weather.streak, flake.y - downward * weather.streak);
        context.lineTo(flake.x, flake.y);
        context.stroke();
      }

      context.globalAlpha = flake.opacity;
      context.beginPath();
      context.arc(flake.x, flake.y, flake.radius, 0, Math.PI * 2);
      context.fill();
      if (daylight && flake.radius > 1.12) {
        context.globalAlpha = flake.opacity * 0.43;
        context.strokeStyle = "#52738f";
        context.lineWidth = 0.35;
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
  document.addEventListener("winter-time-change", updateWeather);
  document.addEventListener("visibilitychange", updateMotion);
}

function setUpMusic() {
  const music = document.querySelector("#winter-music");
  const toggle = document.querySelector("#music-toggle");
  const preferenceKey = "sweet-december:music";
  const recordings = {
    dawn: "./assets/morning-snow.m4a?v=2",
    day: "./assets/sunlit-path.m4a?v=2",
    night: "./assets/evening-stillness.m4a",
  };
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

  function changeRecording() {
    music.src = recordings[document.documentElement.dataset.time] ?? recordings.night;
    updateControl();
    start();
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
  document.addEventListener("winter-time-change", changeRecording);
  changeRecording();
}

setUpTimeOfDay();
setUpSnow();
setUpMusic();
