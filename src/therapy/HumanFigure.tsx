import { useEffect, useRef } from "react";
import type { FigurePose } from "./exercises";
import "./HumanFigure.css";

interface Props {
  pose?: FigurePose;
  breath?: "in" | "hold" | "out" | "rest";
}

// A calm, vector-rigged human figure. Each body part is a separate group with
// its own pivot, so CSS can animate recognisable movements (neck rolls,
// stretches, walking, butterfly-hug taps, etc.) for the user to follow along.
export default function HumanFigure({ pose = "sitCalm", breath }: Props) {
  const chestRef = useRef<SVGGElement>(null);

  // Drive the chest inflate/deflate from the breath cue so it stays in sync
  // with Vera's counting, overriding the gentle idle breathing.
  useEffect(() => {
    const chest = chestRef.current;
    if (!chest) return;
    if (!breath) {
      chest.style.animation = "";
      chest.style.transform = "";
      chest.style.transition = "";
      return;
    }
    chest.style.animation = "none";
    chest.style.transition = "transform 3.6s cubic-bezier(0.4, 0, 0.4, 1)";
    const scale =
      breath === "in" || breath === "hold" ? "scale(1.14)" : "scale(0.94)";
    chest.style.transform = scale;
  }, [breath, pose]);

  return (
    <svg
      className={`hf-figure pose-${pose}`}
      viewBox="0 0 200 320"
      role="img"
      aria-label={`Figure performing ${pose}`}
    >
      <defs>
        <linearGradient id="hf-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffd9a8" />
          <stop offset="100%" stopColor="#e0925a" />
        </linearGradient>
        <radialGradient id="hf-glow" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="rgba(240,182,127,0.35)" />
          <stop offset="100%" stopColor="rgba(240,182,127,0)" />
        </radialGradient>
      </defs>

      <ellipse className="hf-aura" cx="100" cy="150" rx="92" ry="150" fill="url(#hf-glow)" />

      <g className="hf-root">
        {/* Legs */}
        <g className="hf-leg hf-leg-l">
          <rect x="80" y="182" width="18" height="100" rx="9" fill="url(#hf-body)" />
        </g>
        <g className="hf-leg hf-leg-r">
          <rect x="102" y="182" width="18" height="100" rx="9" fill="url(#hf-body)" />
        </g>

        {/* Arms */}
        <g className="hf-arm hf-arm-l">
          <rect x="60" y="94" width="15" height="92" rx="7.5" fill="url(#hf-body)" />
          <circle className="hf-hand" cx="67.5" cy="186" r="9" fill="#ffd9a8" />
        </g>
        <g className="hf-arm hf-arm-r">
          <rect x="125" y="94" width="15" height="92" rx="7.5" fill="url(#hf-body)" />
          <circle className="hf-hand" cx="132.5" cy="186" r="9" fill="#ffd9a8" />
        </g>

        {/* Torso (bends from the hips) with a breathing chest */}
        <g className="hf-torso">
          <rect x="72" y="92" width="56" height="96" rx="22" fill="url(#hf-body)" />
          <g className="hf-chest" ref={chestRef}>
            <ellipse cx="100" cy="124" rx="22" ry="26" fill="rgba(255,255,255,0.18)" />
          </g>
        </g>

        {/* Head (pivots at the neck) */}
        <g className="hf-head">
          <rect x="94" y="74" width="12" height="22" rx="6" fill="url(#hf-body)" />
          <circle cx="100" cy="54" r="27" fill="url(#hf-body)" />
        </g>
      </g>
    </svg>
  );
}
