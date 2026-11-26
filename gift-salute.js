let audio;
let pop;
let volume;
const playing = new Set();

export function prepareGiftSalute() {
  if (!window.AudioContext) return;
  try {
    audio ??= new AudioContext();
    if (audio.state !== "running") audio.resume().catch(() => {});
  } catch {
    // The gift can still open if audio is unavailable.
  }
}

function createFireworkPop() {
  const rate = audio.sampleRate;
  const buffer = audio.createBuffer(1, Math.round(rate * 0.84), rate);
  const samples = buffer.getChannelData(0);
  let low = 0;
  let previous = 0;

  for (let index = 0; index < samples.length; index++) {
    const time = index / rate;
    const noise = Math.random() * 2 - 1;
    low += (noise - low) * 0.025;
    const snap = (noise - previous) * 0.2 * Math.exp(-time * 36);
    const thump = (low * 0.82 + Math.sin(2 * Math.PI * (91 * time - 37 * time ** 2)) * 0.24) * Math.exp(-time * 13);
    samples[index] = (snap + thump) * (1 - Math.exp(-time * 1150));
    previous = noise;
  }

  for (let spark = 0; spark < 28; spark++) {
    const delay = 0.05 + Math.random() * 0.66;
    const start = Math.round(delay * rate);
    const length = Math.round((0.009 + Math.random() * 0.028) * rate);
    const strength = (0.035 + Math.random() * 0.09) * (1 - delay);
    for (let index = 0; index < length; index++) {
      const fade = Math.sin(Math.PI * index / length) * Math.exp(-3 * index / length);
      samples[start + index] += (Math.random() * 2 - 1) * fade * strength;
    }
  }
  return buffer;
}

export function playGiftSalute(bursts) {
  if (!audio || audio.state === "closed") return;
  pop ??= createFireworkPop();
  if (!volume) {
    volume = audio.createGain();
    volume.gain.value = 0.41;
    volume.connect(audio.destination);
  }

  const start = audio.currentTime;
  bursts.forEach(({ delay }, index) => {
    const source = audio.createBufferSource();
    source.buffer = pop;
    source.playbackRate.value = 0.92 + (index % 4) * 0.06;
    source.connect(volume);
    source.addEventListener("ended", () => {
      playing.delete(source);
      source.disconnect();
    }, { once: true });
    source.start(start + delay / 1000);
    playing.add(source);
  });
}

export function stopGiftSalute() {
  for (const source of playing) source.stop();
  playing.clear();
}
