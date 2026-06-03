import "regenerator-runtime/runtime";
import { useState, useRef, useEffect, useCallback } from "react";
import Webcam from "react-webcam";
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";
import * as faceapi from "@vladmandic/face-api";
import {
  FiMic,
  FiSquare,
  FiVolume2,
  FiVolumeX,
  FiRefreshCw,
  FiSend,
  FiActivity,
  FiZap,
} from "react-icons/fi";
import TherapyMode from "./therapy/TherapyMode";
import { exerciseById } from "./therapy/exercises";
import "./App.css";

const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model";

const EMOTION_COLORS: Record<string, string> = {
  happy: "#f0c277",
  neutral: "#b6aca0",
  sad: "#8fb3d9",
  angry: "#e0846f",
  fearful: "#bba6e6",
  disgusted: "#a6c7b4",
  surprised: "#f2a98c",
};
const EMOTION_ORDER = ["happy", "neutral", "sad", "surprised", "angry", "fearful", "disgusted"];

type Phase = "setup" | "loading" | "ready" | "listening" | "thinking" | "speaking";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  emotion?: string;
}
interface EmotionReading {
  name: string;
  score: number;
}
interface Suggestion {
  id: string;
  name: string;
  reason: string;
}

const uid = () => Math.random().toString(36).slice(2, 10);
const colorFor = (name?: string) => (name && EMOTION_COLORS[name]) || EMOTION_COLORS.neutral;
const SILENCE_MS = 2300; // hands-free: auto-send after this much quiet

export default function App() {
  const [phase, setPhase] = useState<Phase>("setup");
  const [messages, setMessages] = useState<Message[]>([]);
  const [emotion, setEmotion] = useState<EmotionReading>({ name: "neutral", score: 0 });
  const [expressions, setExpressions] = useState<Record<string, number>>({});
  const [faceDetected, setFaceDetected] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const [handsFree, setHandsFree] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typedInput, setTypedInput] = useState("");
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [therapyOpen, setTherapyOpen] = useState(false);
  const [therapyStartId, setTherapyStartId] = useState<string | null>(null);

  const webcamRef = useRef<Webcam>(null);
  const detectTimer = useRef<number | null>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const silenceTimer = useRef<number | null>(null);

  const emotionRef = useRef(emotion);
  const phaseRef = useRef(phase);
  const messagesRef = useRef(messages);
  const therapyRef = useRef(therapyOpen);
  emotionRef.current = emotion;
  phaseRef.current = phase;
  messagesRef.current = messages;
  therapyRef.current = therapyOpen;

  const { transcript, resetTranscript, browserSupportsSpeechRecognition } =
    useSpeechRecognition();

  // ----- TTS voices -----
  useEffect(() => {
    const load = () => { voicesRef.current = window.speechSynthesis?.getVoices() ?? []; };
    load();
    if (window.speechSynthesis) window.speechSynthesis.onvoiceschanged = load;
    return () => { if (window.speechSynthesis) window.speechSynthesis.onvoiceschanged = null; };
  }, []);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, phase]);

  // Chrome silently parks speech synthesis after a while; nudge it to stay alive.
  useEffect(() => {
    const id = window.setInterval(() => {
      const s = window.speechSynthesis;
      if (s && s.speaking) s.resume();
    }, 5000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    return () => {
      if (detectTimer.current) window.clearInterval(detectTimer.current);
      if (silenceTimer.current) window.clearTimeout(silenceTimer.current);
      window.speechSynthesis?.cancel();
      SpeechRecognition.stopListening();
    };
  }, []);

  // ----- Facial-expression loop (face-api, live, in-browser) -----
  const startDetectionLoop = useCallback(() => {
    if (detectTimer.current) window.clearInterval(detectTimer.current);
    detectTimer.current = window.setInterval(async () => {
      const video = webcamRef.current?.video as HTMLVideoElement | undefined;
      if (!video || video.readyState !== 4) return;
      try {
        const result = await faceapi
          .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.4 }))
          .withFaceExpressions();
        if (result && result.expressions) {
          const exp = result.expressions as unknown as Record<string, number>;
          const sorted = Object.entries(exp).sort((a, b) => b[1] - a[1]);
          setExpressions(exp);
          if (sorted[0] && sorted[0][1] > 0.3) setEmotion({ name: sorted[0][0], score: sorted[0][1] });
          setFaceDetected(true);
        } else {
          setFaceDetected(false);
        }
      } catch { /* dropped frame */ }
    }, 1200);
  }, []);

  // ----- TTS -----
  const cancelSpeech = useCallback(() => window.speechSynthesis?.cancel(), []);
  const speak = useCallback(
    (text: string, onDone?: () => void) => {
      const synth = window.speechSynthesis;
      let finished = false;
      let startCheck = 0;
      let watchdog = 0;
      const finish = () => {
        if (finished) return;
        finished = true;
        window.clearTimeout(startCheck);
        window.clearTimeout(watchdog);
        onDone?.();
      };
      if (!voiceOn || !synth) { finish(); return; }
      synth.cancel();
      synth.resume(); // Chrome can leave the engine paused after a cancel
      const u = new SpeechSynthesisUtterance(text);
      const v = voicesRef.current;
      const pref =
        v.find((x) => /Samantha|Jenny|Aria|Google US English|Zira/i.test(x.name)) ||
        v.find((x) => x.lang?.startsWith("en") && /female/i.test(x.name)) ||
        v.find((x) => x.lang?.startsWith("en"));
      if (pref) u.voice = pref;
      u.rate = 0.96;
      u.onend = finish;
      u.onerror = finish;
      synth.speak(u);
      // If synthesis never actually starts, don't hang — advance shortly.
      startCheck = window.setTimeout(() => { if (!synth.speaking) finish(); }, 1300);
      // Backstop: if onend never fires mid-utterance, advance on a time estimate.
      const words = text.trim().split(/\s+/).length;
      const estMs = Math.max(4000, (words / 2.4) * 1000 + 2500);
      watchdog = window.setTimeout(finish, estMs);
    },
    [voiceOn]
  );

  // ----- Listening -----
  const beginListening = useCallback(() => {
    if (therapyRef.current) return;
    if (!browserSupportsSpeechRecognition) { setPhase("ready"); return; }
    resetTranscript();
    setPhase("listening");
    SpeechRecognition.startListening({ continuous: true, interimResults: true });
  }, [browserSupportsSpeechRecognition, resetTranscript]);

  // ----- Send a turn (captures frame + emotion, gets reply + suggestion) -----
  const sendTurn = useCallback(
    async (text: string) => {
      const clean = text.trim();
      if (!clean) { setPhase("ready"); return; }
      if (silenceTimer.current) window.clearTimeout(silenceTimer.current);
      SpeechRecognition.stopListening();
      setSuggestion(null);

      const snapshot = faceDetected ? emotionRef.current.name : undefined;
      const frame = webcamRef.current?.getScreenshot?.() ?? null; // base64 data URL

      const userMsg: Message = { id: uid(), role: "user", content: clean, emotion: snapshot };
      const history = [...messagesRef.current, userMsg];
      setMessages(history);
      resetTranscript();
      setTypedInput("");
      setPhase("thinking");
      setError(null);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: history.map((m) => ({ role: m.role, content: m.content })),
            emotion: snapshot ? { name: snapshot, score: Math.round(emotionRef.current.score * 100) } : null,
            image: frame,
          }),
        });
        if (!res.ok) throw new Error((await res.text()) || `Server ${res.status}`);
        const data = await res.json();
        const reply: string = data.reply ?? "I'm here with you.";
        setMessages((prev) => [...prev, { id: uid(), role: "assistant", content: reply }]);

        // Dynamic exercise suggestion from the model
        if (data.suggestion) {
          const ex = exerciseById(data.suggestion);
          if (ex) setSuggestion({ id: ex.id, name: ex.name, reason: data.reason || "" });
        }

        setPhase("speaking");
        speak(reply, () => beginListening());
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Something went wrong.";
        setError(`Couldn't reach the therapist service. ${msg} — is the Flask server running on port 5003 with a GROQ_API_KEY set?`);
        setPhase("ready");
      }
    },
    [faceDetected, resetTranscript, speak, beginListening]
  );

  // ----- Hands-free: auto-send after a pause in speech -----
  useEffect(() => {
    if (!handsFree || phase !== "listening") return;
    if (!transcript.trim()) return;
    if (silenceTimer.current) window.clearTimeout(silenceTimer.current);
    silenceTimer.current = window.setTimeout(() => {
      if (phaseRef.current === "listening") sendTurn(transcript);
    }, SILENCE_MS);
    return () => { if (silenceTimer.current) window.clearTimeout(silenceTimer.current); };
  }, [transcript, phase, handsFree, sendTurn]);

  const handleMic = useCallback(() => {
    if (phase === "listening") sendTurn(transcript);
    else if (phase === "speaking") { cancelSpeech(); beginListening(); }
    else if (phase === "ready") beginListening();
  }, [phase, transcript, sendTurn, beginListening, cancelSpeech]);

  // ----- First run -----
  const handleEnable = useCallback(async () => {
    setError(null);
    setPhase("loading");
    try {
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
      ]);
    } catch {
      setError("Couldn't load the facial-expression models. Check your connection and try again.");
      setPhase("setup");
      return;
    }
    const wait = window.setInterval(() => {
      const video = webcamRef.current?.video as HTMLVideoElement | undefined;
      if (video && video.readyState === 4) {
        window.clearInterval(wait);
        startDetectionLoop();
        const greeting =
          "Hi, I'm Vera. I'm really glad you're here. Whenever you feel ready, just start talking — tell me what's on your mind. There's no rush.";
        setMessages([{ id: uid(), role: "assistant", content: greeting }]);
        setPhase("speaking");
        speak(greeting, () => beginListening());
      }
    }, 250);
  }, [startDetectionLoop, speak, beginListening]);

  const handleReset = useCallback(() => {
    cancelSpeech();
    SpeechRecognition.stopListening();
    setSuggestion(null);
    resetTranscript();
    const greeting = "Let's start fresh. I'm here whenever you're ready — what would you like to talk about?";
    setMessages([{ id: uid(), role: "assistant", content: greeting }]);
    setPhase("speaking");
    speak(greeting, () => beginListening());
  }, [resetTranscript, speak, beginListening, cancelSpeech]);

  const toggleVoice = useCallback(() => {
    setVoiceOn((v) => { if (v) window.speechSynthesis?.cancel(); return !v; });
  }, []);

  // ----- Therapy mode open/close -----
  const openTherapy = useCallback((startId: string | null) => {
    cancelSpeech();
    SpeechRecognition.stopListening();
    if (silenceTimer.current) window.clearTimeout(silenceTimer.current);
    setTherapyStartId(startId);
    setTherapyOpen(true);
    setPhase("ready");
  }, [cancelSpeech]);

  const closeTherapy = useCallback(() => {
    setTherapyOpen(false);
    setTherapyStartId(null);
    setSuggestion(null);
    // If the user entered exercises straight from the landing page without
    // enabling the mic, don't try to auto-start listening — just drop them
    // back on the landing screen.
    if (phase === "setup" || phase === "loading") return;
    window.setTimeout(() => beginListening(), 300);
  }, [beginListening, phase]);

  const handleExercises = useCallback(() => {
    cancelSpeech();
    setTherapyStartId(null);
    setTherapyOpen(true);
  }, [cancelSpeech]);

  // ===================== RENDER =====================

  if (phase === "setup" || phase === "loading") {
    return (
      <div className="vc-stage">
        <div className="vc-setup">
          <div className="vc-setup-inner">
            <div className="vc-orb" />
            <div className="vc-brand-eyebrow">
              <span className="vc-brand-dot" />
              <span>Welcome to</span>
            </div>
            <h1 className="vc-hero-title">Psych<em>Axis</em></h1>
            <p className="vc-hero-tagline">A calmer place to talk it through.</p>
            <p className="lead">
              <strong>PsychAxis</strong> is a quiet space to slow down. Pick a calming exercise to
              follow along with, or open up to Vera — whichever feels right today.
            </p>
            <p className="vc-vera-intro">
              <span className="vc-vera-label">Meet Vera</span> — your warm, attentive virtual
              therapist. She sees your expression, hears your tone, and responds with a gentle
              reflection or one open question.
            </p>
            <div className="vc-cta-row">
              <button
                className="vc-cta"
                onClick={handleEnable}
                disabled={phase === "loading"}
              >
                {phase === "loading" ? "Preparing your space" : "Chat with Vera"}
              </button>
              <button
                className="vc-cta vc-cta-ghost"
                onClick={handleExercises}
                disabled={phase === "loading"}
              >
                Browse guided exercises
              </button>
            </div>
            {phase === "loading" ? (
              <div className="vc-loading-text">Warming up the room<span className="vc-dots" /></div>
            ) : (
              <div className="vc-permnote">
                <span>Chatting with Vera needs camera & mic — exercises don't.</span>
              </div>
            )}
            {error && <div className="vc-error" style={{ marginTop: 22 }}>{error}</div>}
          </div>
          {phase === "loading" && (
            <div style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", opacity: 0 }}>
              <Webcam ref={webcamRef} audio={false} mirrored screenshotFormat="image/jpeg" />
            </div>
          )}
        </div>
        {therapyOpen && (
          <TherapyMode
            startExerciseId={therapyStartId}
            speak={speak}
            cancelSpeech={cancelSpeech}
            onExit={closeTherapy}
          />
        )}
      </div>
    );
  }

  const stateLabel =
    phase === "listening" ? "Listening…"
    : phase === "thinking" ? "Thinking…"
    : phase === "speaking" ? "Speaking…"
    : "Here with you";

  return (
    <div className="vc-stage">
      <div className="vc-shell">
        <header className="vc-topbar">
          <div className="vc-brand">
            <span className="vc-brand-dot" />
            <span className="vc-brand-name">Psych<em>Axis</em></span>
          </div>
          <div className="vc-topbar-actions">
            <button className="vc-ghost-btn" onClick={() => openTherapy(null)} title="Open guided exercises">
              <FiActivity /> Exercises
            </button>
            <button className={`vc-ghost-btn ${handsFree ? "is-on" : ""}`} onClick={() => setHandsFree((h) => !h)} title="Toggle hands-free turns">
              <FiZap /> {handsFree ? "Hands-free" : "Tap to talk"}
            </button>
            <button className={`vc-ghost-btn ${voiceOn ? "is-on" : ""}`} onClick={toggleVoice} title="Toggle Vera's voice">
              {voiceOn ? <FiVolume2 /> : <FiVolumeX />} {voiceOn ? "Voice on" : "Voice off"}
            </button>
            <button className="vc-ghost-btn" onClick={handleReset} title="Start over">
              <FiRefreshCw /> New session
            </button>
          </div>
        </header>

        <div className="vc-grid">
          {/* Camera + emotion */}
          <section className="vc-panel">
            <div className="vc-cam-wrap">
              <Webcam ref={webcamRef} audio={false} mirrored screenshotFormat="image/jpeg" />
              <div className="vc-cam-vignette" />
              {!faceDetected && <div className="vc-noface">Looking for your face — make sure you're centered and well lit.</div>}
              {faceDetected && (
                <div className="vc-emotion-tag" style={{ color: colorFor(emotion.name) }}>
                  <span className="vc-emotion-swatch" />
                  <span style={{ color: "var(--ink)" }}>{emotion.name} · {Math.round(emotion.score * 100)}%</span>
                </div>
              )}
            </div>
            <div className="vc-bars">
              <p className="vc-bars-title">Emotional read</p>
              {EMOTION_ORDER.map((name) => {
                const val = expressions[name] ?? 0;
                return (
                  <div className="vc-bar-row" key={name}>
                    <span className="vc-bar-label">{name}</span>
                    <span className="vc-bar-track">
                      <span className="vc-bar-fill" style={{ width: `${Math.round(val * 100)}%`, background: colorFor(name) }} />
                    </span>
                    <span className="vc-bar-val">{Math.round(val * 100)}</span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Conversation */}
          <section className="vc-panel vc-convo">
            <div className="vc-convo-head">
              <span className={`vc-presence ${phase === "speaking" ? "is-speaking" : ""}`} />
              <div>
                <div className="vc-presence-name">Vera</div>
                <div className="vc-presence-state">{stateLabel}</div>
              </div>
            </div>

            <div className="vc-thread" ref={threadRef}>
              {messages.map((m) => (
                <div key={m.id} className={`vc-msg ${m.role}`}>
                  <div className="vc-bubble">{m.content}</div>
                  {m.role === "user" && m.emotion && (
                    <div className="vc-msg-emotion">
                      <span className="vc-emotion-swatch" style={{ background: colorFor(m.emotion) }} />
                      looked {m.emotion}
                    </div>
                  )}
                </div>
              ))}
              {phase === "thinking" && (
                <div className="vc-msg assistant"><div className="vc-bubble vc-typing"><span /><span /><span /></div></div>
              )}
            </div>

            {suggestion && (
              <div className="vc-suggestion">
                <div className="vc-suggestion-text">
                  <FiActivity />
                  <span>Try <strong>{suggestion.name}</strong>{suggestion.reason ? ` — ${suggestion.reason}` : ""}</span>
                </div>
                <div className="vc-suggestion-actions">
                  <button className="vc-sugg-btn primary" onClick={() => openTherapy(suggestion.id)}>Start</button>
                  <button className="vc-sugg-btn" onClick={() => setSuggestion(null)}>Not now</button>
                </div>
              </div>
            )}

            {error && <div className="vc-error">{error}</div>}

            <div className="vc-composer">
              {browserSupportsSpeechRecognition ? (
                <>
                  <div className={`vc-interim ${transcript ? "" : "empty"}`}>
                    {phase === "listening" ? (transcript || "I'm listening…")
                      : phase === "speaking" ? "Vera is speaking…"
                      : phase === "thinking" ? "Reflecting…"
                      : handsFree ? "Start talking whenever you're ready." : "Tap the mic when you'd like to talk."}
                  </div>
                  <div className="vc-composer-row">
                    <button
                      className={`vc-mic ${phase === "listening" ? "listening" : ""}`}
                      onClick={handleMic}
                      disabled={phase === "thinking"}
                      title={phase === "listening" ? "Tap to send now" : "Tap to talk"}
                    >
                      {phase === "listening" ? <FiSquare /> : <FiMic />}
                    </button>
                    <span className="vc-mic-hint">
                      {phase === "listening" ? (handsFree ? <><strong>Listening.</strong> I'll respond when you pause — or tap to send now.</> : <><strong>Listening.</strong> Tap the square when you're done.</>)
                        : phase === "thinking" ? "Reflecting on what you said…"
                        : phase === "speaking" ? "Vera is speaking — tap the mic to jump in."
                        : handsFree ? <><strong>Hands-free.</strong> Just speak — I'm listening.</> : <><strong>Tap to talk.</strong> I'll wait.</>}
                    </span>
                  </div>
                </>
              ) : (
                <div className="vc-composer-row">
                  <div className="vc-text-fallback">
                    <input
                      value={typedInput}
                      onChange={(e) => setTypedInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && sendTurn(typedInput)}
                      placeholder="Speech isn't supported here — type to Vera instead…"
                      disabled={phase === "thinking" || phase === "speaking"}
                    />
                    <button onClick={() => sendTurn(typedInput)} disabled={phase === "thinking" || phase === "speaking"}><FiSend /></button>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>

        <p className="vc-disclaimer">
          PsychAxis is a supportive AI companion for reflection — not a substitute for professional
          care or a crisis service. If you're in danger or thinking about harming yourself, please
          contact your local emergency number or a crisis line right away.
        </p>
      </div>

      {therapyOpen && (
        <TherapyMode
          startExerciseId={therapyStartId}
          speak={speak}
          cancelSpeech={cancelSpeech}
          onExit={closeTherapy}
        />
      )}
    </div>
  );
}
