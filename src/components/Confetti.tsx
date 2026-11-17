"use client";

const COLORS = ["#fce408", "#0b0b0b", "#fce408", "#ffffff", "#fff4a6"];
// Pseudoaleatorio determinístico (render puro): mismo `fire` => mismo confeti.
const rnd = (i: number, k: number) => Math.abs((Math.sin(i * 12.9898 + k * 78.233) * 43758.5453) % 1);

export function Confetti({ fire }: { fire: number }) {
  if (!fire) return null;
  return (
    <div key={fire} className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden>
      {Array.from({ length: 46 }, (_, i) => {
        const angle = rnd(i, fire) * Math.PI * 2;
        const dist = 160 + rnd(i, fire + 1) * 360;
        return (
          <span
            key={i}
            className="confetti-piece"
            style={{
              background: COLORS[i % COLORS.length],
              border: "1.5px solid #0b0b0b",
              animationDelay: `${rnd(i, fire + 2) * 120}ms`,
              ["--x" as string]: `${Math.cos(angle) * dist}px`,
              ["--y" as string]: `${Math.sin(angle) * dist * 0.8 + 180}px`,
              ["--r" as string]: `${(rnd(i, fire + 3) - 0.5) * 900}deg`,
            } as React.CSSProperties}
          />
        );
      })}
    </div>
  );
}
