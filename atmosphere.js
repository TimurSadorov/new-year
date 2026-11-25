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
    context.fillStyle = "#f2f8ff";

    const count = Math.min(132, Math.max(42, Math.round(width * height / 10500)));
    flakes = Array.from({ length: count }, () => {
      const depth = Math.random() ** 2;
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        radius: 0.65 + depth * 2.2,
        speed: 14 + depth * 44,
        drift: 3 + depth * 13,
        opacity: 0.24 + depth * 0.58,
        phase: Math.random() * Math.PI * 2,
      };
    });
    draw(0);
  }

  function draw(seconds) {
    elapsed += seconds;
    context.clearRect(0, 0, width, height);
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

setUpSnow();
setUpMusic();
