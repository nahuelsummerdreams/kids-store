"use client";

import { useEffect, useState } from "react";

// Número que "sube" hasta su valor. Respeta prefers-reduced-motion.
export function CountUp({ value, format = (n: number) => String(Math.round(n)), duration = 1000 }: {
  value: number; format?: (n: number) => string; duration?: number;
}) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t0 = performance.now();
    const step = (t: number) => {
      const p = reduce ? 1 : Math.min((t - t0) / duration, 1);
      setV(value * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <>{format(v)}</>;
}
