import { useCallback, useEffect, useRef, useState } from "react";
import {
  EXERCISES,
  CATEGORY_LABELS,
  exerciseById,
  exercisesByCategory,
  type Exercise,
  type ExerciseCategory,
  type FigurePose,
} from "./exercises";
import HumanFigure from "./HumanFigure";
import { FiX, FiPause, FiPlay, FiChevronRight, FiArrowLeft } from "react-icons/fi";
import "./TherapyMode.css";

interface Props {
  startExerciseId?: string | null;
  speak: (text: string, onDone?: () => void) => void;
  cancelSpeech: () => void;
  onExit: () => void;
}

const CATEGORY_TINT: Record<ExerciseCategory, string> = {
  calm: "#8fb3d9",
  ground: "#a6c7b4",
  thoughts: "#bba6e6",
  lift: "#f0c277",
  move: "#f2a98c",
};

interface SeqItem {
  kind: "intro" | "step" | "outro";
  text: string;
  seconds: number;
  pose?: FigurePose;
  breath?: "in" | "hold" | "out" | "rest";
}

const introOutroSeconds = (t: string) => Math.min(12, Math.max(5, Math.round(t.length / 12)));

function buildSequence(ex: Exercise): SeqItem[] {
  return [
    { kind: "intro", text: ex.intro, seconds: introOutroSeconds(ex.intro), pose: "standCalm" },
    ...ex.steps.map((s) => ({ kind: "step" as const, text: s.text, seconds: s.seconds, pose: s.pose, breath: s.breath })),
    { kind: "outro", text: ex.outro, seconds: introOutroSeconds(ex.outro), pose: "sitCalm" },
  ];
}

export default function TherapyMode({ startExerciseId, speak, cancelSpeech, onExit }: Props) {
  const [current, setCurrent] = useState<Exercise | null>(
    startExerciseId ? exerciseById(startExerciseId) ?? null : null
  );
  const [seq, setSeq] = useState<SeqItem[]>([]);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [done, setDone] = useState(false);

  const timerRef = useRef<number | null>(null);
  const startedAtRef = useRef<number>(0);
  const remainingRef = useRef<number>(0);
  const grouped = exercisesByCategory();

  const clearTimer = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = null;
  };

  // Advance to the next item, or finish.
  const goTo = useCallback(
    (i: number, sequence: SeqItem[]) => {
      clearTimer();
      if (i >= sequence.length) {
        setDone(true);
        cancelSpeech();
        return;
      }
      setIndex(i);
      const item = sequence[i];
      speak(item.text);
      remainingRef.current = item.seconds * 1000;
      startedAtRef.current = Date.now();
      timerRef.current = window.setTimeout(() => goTo(i + 1, sequence), remainingRef.current);
    },
    [speak, cancelSpeech]
  );

  const startExercise = useCallback(
    (ex: Exercise) => {
      const sequence = buildSequence(ex);
      setCurrent(ex);
      setSeq(sequence);
      setDone(false);
      setPaused(false);
      setIndex(0);
      // slight delay lets the overlay settle before Vera begins
      window.setTimeout(() => goTo(0, sequence), 250);
    },
    [goTo]
  );

  // Auto-start if launched from a suggestion.
  useEffect(() => {
    if (current && seq.length === 0 && !done) startExercise(current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => clearTimer(), []);

  const pause = () => {
    clearTimer();
    cancelSpeech();
    remainingRef.current -= Date.now() - startedAtRef.current;
    setPaused(true);
  };
  const resume = () => {
    setPaused(false);
    startedAtRef.current = Date.now();
    timerRef.current = window.setTimeout(
      () => goTo(index + 1, seq),
      Math.max(500, remainingRef.current)
    );
  };
  const skip = () => goTo(index + 1, seq);

  const backToMenu = () => {
    clearTimer();
    cancelSpeech();
    setCurrent(null);
    setSeq([]);
    setDone(false);
    setIndex(0);
  };

  const exit = () => {
    clearTimer();
    cancelSpeech();
    onExit();
  };

  // ---------------- MENU ----------------
  if (!current) {
    return (
      <div className="tm-overlay">
        <div className="tm-menu">
          <div className="tm-menu-head">
            <div>
              <h2>Guided exercises</h2>
              <p>Pick one, or tell Vera how you're feeling and she'll suggest the right one.</p>
            </div>
            <button className="tm-icon-btn" onClick={exit} aria-label="Close">
              <FiX />
            </button>
          </div>
          <div className="tm-menu-scroll">
            {(Object.keys(grouped) as ExerciseCategory[]).map((cat) => (
              <div className="tm-group" key={cat}>
                <h3 style={{ color: CATEGORY_TINT[cat] }}>{CATEGORY_LABELS[cat]}</h3>
                <div className="tm-cards">
                  {grouped[cat].map((ex) => (
                    <button
                      key={ex.id}
                      className="tm-card"
                      onClick={() => startExercise(ex)}
                      style={{ ["--tint" as string]: CATEGORY_TINT[cat] }}
                    >
                      <span className="tm-card-name">{ex.name}</span>
                      <span className="tm-card-blurb">{ex.blurb}</span>
                      <FiChevronRight className="tm-card-arrow" />
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <p className="tm-count">{EXERCISES.length} exercises · move within your comfort, and skip anything that hurts.</p>
          </div>
        </div>
      </div>
    );
  }

  // ---------------- PLAYER ----------------
  const item = seq[index];
  const total = seq.length;
  const tint = CATEGORY_TINT[current.category];

  return (
    <div className="tm-overlay">
      <div className="tm-player" style={{ ["--tint" as string]: tint }}>
        <div className="tm-player-head">
          <button className="tm-icon-btn" onClick={backToMenu} aria-label="Back to exercises">
            <FiArrowLeft />
          </button>
          <span className="tm-player-title">{current.name}</span>
          <button className="tm-icon-btn" onClick={exit} aria-label="Exit">
            <FiX />
          </button>
        </div>

        <div className="tm-stage">
          <div className="tm-figure-wrap">
            <HumanFigure pose={done ? "sitCalm" : item?.pose} breath={done ? undefined : item?.breath} />
          </div>

          {!done && item && (
            <div className="tm-step">
              <div
                className="tm-ring"
                key={index}
                style={{ animationDuration: `${item.seconds}s`, animationPlayState: paused ? "paused" : "running" }}
              />
              <p className="tm-step-text">{item.text}</p>
              {item.breath && <p className="tm-breath-cue">{item.breath === "rest" ? "hold" : item.breath}</p>}
            </div>
          )}

          {done && (
            <div className="tm-done">
              <p className="tm-done-text">That's complete. Take a moment to notice how you feel.</p>
              <div className="tm-done-actions">
                <button className="tm-btn" onClick={() => startExercise(current)}>Again</button>
                <button className="tm-btn ghost" onClick={backToMenu}>More exercises</button>
                <button className="tm-btn primary" onClick={exit}>Back to Vera</button>
              </div>
            </div>
          )}
        </div>

        {!done && (
          <div className="tm-controls">
            <div className="tm-progress">
              {seq.map((_, i) => (
                <span key={i} className={`tm-dot ${i === index ? "active" : ""} ${i < index ? "past" : ""}`} />
              ))}
            </div>
            <div className="tm-control-row">
              <button className="tm-btn ghost" onClick={skip}>Skip</button>
              <button className="tm-play" onClick={paused ? resume : pause} aria-label={paused ? "Resume" : "Pause"}>
                {paused ? <FiPlay /> : <FiPause />}
              </button>
              <span className="tm-step-count">{Math.min(index + 1, total)} / {total}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
