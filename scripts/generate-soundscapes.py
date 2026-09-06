"""Generate three original, royalty-free ambient loops with only the Python standard library.
Run: python3 scripts/generate-soundscapes.py
No samples, external services, or copyrighted recordings are used.
"""
import array, math, os, random, wave
from pathlib import Path

RATE = 22050
ROOT = Path(__file__).resolve().parents[1] / 'public' / 'audio'
ROOT.mkdir(parents=True, exist_ok=True)

def render(name, duration, chords, seed):
    rng = random.Random(seed)
    length = int(duration * RATE)
    audio = array.array('f', [0.0]) * length
    chord_seconds = 12
    for start in range(0, duration, chord_seconds):
        chord = chords[(start // chord_seconds) % len(chords)]
        for note in chord:
            frequency = 440 * 2 ** ((note - 69) / 12)
            phase = rng.random() * math.tau
            total = min(int((chord_seconds + 4) * RATE), length - start * RATE)
            for i in range(total):
                t = i / RATE
                envelope = min(1, t / 3.5) * min(1, max(0, (chord_seconds + 4 - t) / 5))
                soft = math.sin(math.tau * frequency * t + phase) * .57
                soft += math.sin(math.tau * frequency * 1.002 * t + phase) * .22
                soft += math.sin(math.tau * frequency * .5 * t) * .16
                soft += math.sin(math.tau * frequency * 2 * t) * .035
                audio[start * RATE + i] += soft * envelope * .065
        # Widely spaced soft bell notes with a naturally decaying envelope.
        for beat in (1, 4.5, 8):
            note = rng.choice(chord) + 12
            frequency = 440 * 2 ** ((note - 69) / 12)
            offset = int((start + beat) * RATE)
            total = min(6 * RATE, length - offset)
            for i in range(max(0, total)):
                t = i / RATE
                envelope = min(1, t / .025) * math.exp(-t * 1.25)
                sound = math.sin(math.tau * frequency * t) + .13 * math.sin(math.tau * frequency * 2.002 * t)
                audio[offset + i] += sound * envelope * .07
    # A gentle cross-delay adds space without introducing any hard percussion.
    delay = int(.43 * RATE)
    for i in range(delay, length):
        audio[i] += audio[i - delay] * .17
    peak = max(abs(sample) for sample in audio) or 1
    pcm = array.array('h')
    for i, sample in enumerate(audio):
        fade = min(1, i / (RATE * 3), (length - i) / (RATE * 5))
        pcm.append(int(max(-1, min(1, sample / peak * .66 * fade)) * 32767))
    with wave.open(str(ROOT / name), 'wb') as file:
        file.setnchannels(1)
        file.setsampwidth(2)
        file.setframerate(RATE)
        file.writeframes(pcm.tobytes())
    print(f'Created {name}: {duration}s', flush=True)

render('slow-mornings.wav', 72, [[48, 55, 59, 62], [45, 52, 55, 59], [41, 48, 52, 55], [43, 50, 55, 57]], 21)
render('somewhere-softer.wav', 84, [[50, 57, 61, 64], [47, 54, 57, 61], [43, 50, 54, 57], [45, 52, 57, 59]], 42)
render('quiet-blue.wav', 96, [[46, 53, 57, 60], [43, 50, 53, 57], [39, 46, 50, 53], [41, 48, 53, 55]], 63)
