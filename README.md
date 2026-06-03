# PsychAxis

A virtual therapy companion that **sees, hears, speaks, responds — and guides you through calming exercises.**

You enable your webcam and mic, then simply talk. PsychAxis:

1. **Reads your facial expression** live, in the browser (private — nothing uploaded).
2. **Transcribes your speech** and, hands-free, replies when you pause.
3. **Sees your face + hears your words**, reasoning over both with a multimodal model.
4. **Speaks back** as a warm therapist persona ("Vera").
5. **Suggests and runs guided exercises** — breathing, grounding, thought work, mood lifts, and gentle movement — with an animated figure to follow along.

---

## Features

- **Live emotion detection** — `face-api.js` runs in-browser for the real-time "emotional read" bars.
- **Vera sees you** — each turn sends the webcam frame to **Llama 4 Scout** (multimodal) on Groq, so Vera reasons over face + tone + words together.
- **Hands-free conversation** — silence detection auto-sends your turn; tap the mic to send early, or toggle to manual.
- **Dynamic exercise suggestions** — based on your detected emotion and what you say, Vera offers the right exercise from a 21-item library.
- **Guided therapy mode** — paced narration + a timer + an **animated human figure** that performs each movement. Browse the full library any time via the *Exercises* button.

### The exercise library
- **Calm the body:** box breathing, progressive muscle relaxation, body scan, safe-place visualization
- **Ground & refocus:** 5-4-3-2-1 grounding, mindful observation, name-it-to-tame-it
- **Work with thoughts:** thought reframe (CBT), cognitive defusion, worry postponement
- **Lift & reconnect:** gratitude, self-compassion break, one small step, loving-kindness
- **Move & release:** neck & shoulder release, full-body stretch, shake it out, gentle yoga flow, mindful walking, butterfly hug, grounded standing

> The animated figure is a clean, vector-rigged human (stylized, not photoreal). It's structured so you can later swap in real instructor videos if you host them.

---

## Setup

### 1. Backend (Flask + Groq)
```bash
cd flask-server
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt

export GROQ_API_KEY="gsk_..."     # free key: https://console.groq.com/keys
python server.py                  # http://localhost:5003
```
Verify at <http://localhost:5003/api/health> — `key_present` should be `true`.

### 2. Frontend (React + Vite)
```bash
npm install
npm run dev                       # open the printed http://localhost:5173 in Chrome/Edge
```
Vite proxies `/api` to Flask automatically.

---

## Notes

- **Browser:** speech recognition works best in **Chrome / Edge**; in others a text box appears instead. Headphones recommended so the mic doesn't pick up Vera's voice.
- **Privacy:** webcam frames are sent to Groq only at the moment you take a turn (for Vera's reasoning); the live emotion bars never leave your device.
- **Model:** override with `GROQ_MODEL`. Scout is multimodal; a text-only model will disable the "sees you" part.
- **Safety:** Vera is a supportive companion, not a substitute for professional care or a crisis service.

## Customising
- **Exercises:** add or edit entries in `src/therapy/exercises.ts` (and the matching id list in `server.py`). New `goodFor` tags feed the dynamic suggestions automatically.
- **Figure animations:** poses live in `src/therapy/HumanFigure.css`.
- **Persona / suggestion logic:** `SYSTEM_PROMPT` in `flask-server/server.py`.
- **Hands-free sensitivity:** `SILENCE_MS` near the top of `src/App.tsx`.
