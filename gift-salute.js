const recordingUrl = new URL("./assets/firework-salute.m4a", import.meta.url);
const clips = [
  { offset: 0, duration: 0.71 },
  { offset: 0.8, duration: 0.5 },
  { offset: 1.4, duration: 0.93 },
];
const playing = new Set();
let audio;
let recording;
let volume;
let playbackVersion = 0;

function loadRecording(decoder) {
  recording ??= fetch(recordingUrl).then((response) => {
    if (!response.ok) throw new Error("Firework audio unavailable");
    return response.arrayBuffer();
  }).then((bytes) => decoder.decodeAudioData(bytes)).catch(() => {
    recording = undefined;
    return null;
  });
  return recording;
}

if (window.AudioContext && window.OfflineAudioContext) {
  try {
    loadRecording(new OfflineAudioContext(2, 1, 44100));
  } catch {
    // Load on the first opening if early decoding is unavailable.
  }
}

export function prepareGiftSalute() {
  if (!window.AudioContext) return;
  try {
    audio ??= new AudioContext();
    if (audio.state !== "running") audio.resume().catch(() => {});
    loadRecording(audio);
  } catch {
    // The gift can still open if audio is unavailable.
  }
}

export function playGiftSalute(bursts) {
  if (!audio || audio.state === "closed") return;
  const version = playbackVersion;
  const openedAt = performance.now();

  loadRecording(audio).then((buffer) => {
    if (!buffer || version !== playbackVersion || audio.state === "closed") return;
    if (!volume) {
      volume = audio.createGain();
      volume.gain.value = 0.34;
      volume.connect(audio.destination);
    }

    const elapsed = (performance.now() - openedAt) / 1000;
    const now = audio.currentTime;
    bursts.forEach(({ delay }, index) => {
      const wait = delay / 1000 - elapsed;
      if (wait < -0.08) return;

      const { offset, duration } = clips[index % clips.length];
      const source = audio.createBufferSource();
      source.buffer = buffer;
      source.connect(volume);
      source.addEventListener("ended", () => {
        playing.delete(source);
        source.disconnect();
      }, { once: true });
      source.start(now + Math.max(0, wait), offset, duration);
      playing.add(source);
    });
  });
}

export function stopGiftSalute() {
  playbackVersion++;
  for (const source of playing) source.stop();
  playing.clear();
}
