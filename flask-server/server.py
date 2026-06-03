"""
PsychAxis backend — secure multimodal proxy.

Primary provider: Google Gemini Flash (multimodal).
Fallback provider: Groq Llama 4 Scout (multimodal) — used automatically when
Gemini is unreachable or returns a quota / rate-limit error.

Run:
    export GEMINI_API_KEY="..."       # https://aistudio.google.com/apikey
    export GROQ_API_KEY="gsk_..."     # https://console.groq.com/keys (fallback)
    python server.py                  # http://localhost:5003
"""

import json
import os

import requests
from flask import Flask, jsonify, request
from flask_cors import CORS

try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

app = Flask(__name__)
CORS(app)

# Primary: Gemini Flash via Google's native Generative Language API.
# (We use the native endpoint instead of the OpenAI-compat one because AI Studio
# API keys auth via `?key=...` query param, not `Authorization: Bearer`.)
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")
GEMINI_URL_TMPL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"

# Fallback: Groq Llama 4 Scout (multimodal, OpenAI-compatible).
GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = os.environ.get("GROQ_MODEL", "meta-llama/llama-4-scout-17b-16e-instruct")

# HTTP statuses that should trigger a fallback rather than be surfaced as a hard error.
FALLBACK_STATUSES = {402, 403, 408, 409, 429, 500, 502, 503, 504}

# The exercise library Vera can draw on. Keep ids in sync with src/therapy/exercises.ts.
CATALOG = """
calm the body:
  box-breathing — anxious, panicky, racing heart
  pmr — bodily tension, stress
  body-scan — restless, winding down
  safe-place — anxious, fearful, overwhelmed
ground & refocus:
  grounding-54321 — panic, overwhelmed, dissociated
  mindful-observation — busy mind, rumination
  emotion-labeling — overwhelmed, can't name the feeling
work with thoughts:
  cbt-reframe — self-critical, anxious thoughts, rumination
  defusion — sticky repetitive thoughts
  worry-postponement — worry spirals
lift & reconnect:
  gratitude — low, flat mood
  self-compassion — self-critical, ashamed
  behavioral-activation — stuck, unmotivated, low
  loving-kindness — lonely, disconnected, angry
move & release:
  neck-shoulder — physical tension, tired
  full-stretch — tense, sluggish
  shake-out — restless, agitated, angry energy
  yoga-flow — stressed, tense
  mindful-walking — restless, low, stuck
  butterfly-hug — anxious, needs soothing
  grounded-standing — anxious, dissociated, unsteady
"""

SYSTEM_PROMPT = (
    "You are Vera, a warm, grounded virtual therapy companion in an app called "
    "PsychAxis. You can see the user through their webcam and hear them.\n\n"
    "Each turn you receive: the user's words, a note about their detected facial "
    "emotion, and (when available) an image of their face. Use all of it. Treat "
    "the face as a soft clue, not a verdict, and gently note when words and face "
    "diverge.\n\n"
    "Style: warm and human, like a thoughtful counsellor. Keep replies short "
    "(2-4 sentences) because they're read aloud. Validate the feeling, reflect "
    "the situation, and ask one gentle, open question. No bullet points, no "
    "jargon, no diagnosing.\n\n"
    "When the person seems anxious, low, overwhelmed, tense, ruminating, angry, "
    "or stuck, you may offer ONE guided exercise from this library by its id. "
    "Only suggest when it genuinely fits; otherwise leave it empty. Library:\n"
    f"{CATALOG}\n"
    "Safety: if they mention suicide, self-harm, or danger, respond with calm "
    "compassion and gently encourage them to reach out now to a local crisis "
    "line, emergency services, or someone they trust.\n\n"
    'Respond ONLY with strict JSON, no markdown, in this exact shape:\n'
    '{"reply": "<your spoken reply>", "suggestion": "<exercise id or empty '
    'string>", "reason": "<short phrase, max 10 words, why — or empty>"}'
)


def _parse_model_json(raw):
    """Parse the model's JSON-shaped reply, with a tolerant fallback."""
    raw = (raw or "").strip()
    reply, suggestion, reason = raw, "", ""
    try:
        if raw.startswith("```"):
            raw = raw.strip("`")
            raw = raw[raw.find("{"):]
        parsed = json.loads(raw)
        reply = (parsed.get("reply") or "").strip() or "I'm here with you."
        suggestion = (parsed.get("suggestion") or "").strip()
        reason = (parsed.get("reason") or "").strip()
    except Exception:
        pass  # keep raw text as the reply
    return reply, suggestion, reason


def _split_data_url(data_url):
    """Split a 'data:<mime>;base64,<payload>' URL into (mime, base64-payload).
    Falls back to image/jpeg if the prefix is missing or malformed."""
    if not data_url:
        return None, None
    if data_url.startswith("data:") and "," in data_url:
        header, payload = data_url.split(",", 1)
        mime = "image/jpeg"
        if ";" in header:
            mime = header.split(":", 1)[1].split(";", 1)[0] or mime
        return mime, payload
    return "image/jpeg", data_url


def _call_gemini(messages, image, system_prompt, temperature, max_tokens):
    """Call Gemini's native generateContent endpoint. Returns (ok, parsed_or_err, status)."""
    contents = []
    for idx, m in enumerate(messages):
        role = "model" if m["role"] == "assistant" else "user"
        parts = [{"text": m["content"]}]
        is_last_user = idx == len(messages) - 1 and m["role"] == "user"
        if is_last_user and image:
            mime, b64 = _split_data_url(image)
            if b64:
                parts.append({"inline_data": {"mime_type": mime, "data": b64}})
        contents.append({"role": role, "parts": parts})

    payload = {
        "system_instruction": {"parts": [{"text": system_prompt}]},
        "contents": contents,
        "generationConfig": {
            "temperature": temperature,
            "maxOutputTokens": max_tokens,
            "responseMimeType": "application/json",
            # Gemini 2.5 Flash thinks by default; thinking tokens consume
            # maxOutputTokens and would truncate Vera's reply mid-JSON.
            # Vera wants snappy 2–4-sentence answers, not deep reasoning.
            "thinkingConfig": {"thinkingBudget": 0},
        },
    }
    url = GEMINI_URL_TMPL.format(model=GEMINI_MODEL, key=GEMINI_API_KEY)
    try:
        r = requests.post(url, json=payload, timeout=40)
    except requests.RequestException as exc:
        return False, f"network error talking to gemini: {exc}", 502
    if r.status_code != 200:
        return False, f"gemini error {r.status_code}: {r.text}", r.status_code
    try:
        data = r.json()
        text = data["candidates"][0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError, ValueError) as exc:
        return False, f"gemini response parse error: {exc}: {r.text[:300]}", 502
    return True, _parse_model_json(text), 200


def _call_groq(messages, image, system_prompt, emotion_msg, temperature, max_tokens):
    """Call Groq's OpenAI-compatible chat-completions endpoint."""
    convo = [{"role": "system", "content": system_prompt}]
    for idx, m in enumerate(messages):
        is_last_user = idx == len(messages) - 1 and m["role"] == "user"
        if is_last_user and image:
            convo.append({
                "role": "user",
                "content": [
                    {"type": "text", "text": m["content"]},
                    {"type": "image_url", "image_url": {"url": image}},
                ],
            })
        else:
            convo.append({"role": m["role"], "content": m["content"]})
    if emotion_msg:
        convo.append({"role": "system", "content": emotion_msg})

    payload = {
        "model": GROQ_MODEL,
        "messages": convo,
        "temperature": temperature,
        "max_tokens": max_tokens,
        "response_format": {"type": "json_object"},
    }
    try:
        r = requests.post(
            GROQ_URL,
            headers={"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"},
            json=payload,
            timeout=40,
        )
    except requests.RequestException as exc:
        return False, f"network error talking to groq: {exc}", 502
    if r.status_code != 200:
        return False, f"groq error {r.status_code}: {r.text}", r.status_code
    raw = r.json()["choices"][0]["message"]["content"]
    return True, _parse_model_json(raw), 200


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify(
        ok=True,
        primary={"provider": "gemini", "model": GEMINI_MODEL, "key_present": bool(GEMINI_API_KEY)},
        fallback={"provider": "groq", "model": GROQ_MODEL, "key_present": bool(GROQ_API_KEY)},
    )


@app.route("/api/chat", methods=["POST"])
def chat():
    if not GEMINI_API_KEY and not GROQ_API_KEY:
        return ("No AI provider configured. Set GEMINI_API_KEY (primary) and/or "
                "GROQ_API_KEY (fallback) before starting server.py."), 500

    body = request.get_json(force=True, silent=True) or {}
    incoming = body.get("messages", [])
    emotion = body.get("emotion")
    image = body.get("image")  # base64 data URL or None

    cleaned = [
        m for m in incoming
        if m.get("role") in ("user", "assistant") and (m.get("content") or "").strip()
    ]

    emotion_msg = ""
    if emotion and emotion.get("name"):
        emotion_msg = (
            f"Detected facial emotion this turn: {emotion['name']} "
            f"({emotion.get('score', 0)}% confidence)."
        )

    # Gemini takes the emotion note as an extra system instruction line.
    gemini_system = SYSTEM_PROMPT + (f"\n\n{emotion_msg}" if emotion_msg else "")

    temperature, max_tokens = 0.7, 600
    attempts = []

    if GEMINI_API_KEY:
        ok, result, status = _call_gemini(cleaned, image, gemini_system, temperature, max_tokens)
        if ok:
            reply, suggestion, reason = result
            return jsonify(reply=reply, suggestion=suggestion or None, reason=reason, provider="gemini")
        attempts.append(result)
        # Only fall back on quota/rate-limit/availability errors. Surface real config errors (400, 401, 404).
        if status not in FALLBACK_STATUSES:
            return result, status
        app.logger.warning("Gemini failed (%s), falling back to Groq: %s", status, result)

    if GROQ_API_KEY:
        ok, result, status = _call_groq(cleaned, image, SYSTEM_PROMPT, emotion_msg, temperature, max_tokens)
        if ok:
            reply, suggestion, reason = result
            return jsonify(reply=reply, suggestion=suggestion or None, reason=reason, provider="groq")
        attempts.append(result)
        return f"All providers failed. {' | '.join(attempts)}", status

    # Gemini was tried (and exhausted) but no Groq key configured.
    return f"Primary provider failed and no fallback configured. {' | '.join(attempts)}", 502


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5003, debug=True)
