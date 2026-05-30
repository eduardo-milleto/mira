import { useEffect, useRef, useState } from "react";

// easing suave de saida: rapido no inicio, desacelera no fim
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

// preferencia do SO por menos animacao (SSR-safe)
function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

// Anima um inteiro do valor exibido atual ate `target` via requestAnimationFrame.
// Quando `target` muda (ex: saldo atualiza apos uma movimentacao), re-anima a partir
// de onde esta visualmente, sem pulo. Respeita prefers-reduced-motion (vai direto pro final).
export function useCountUp(target: number, durationMs = 1000): number {
  const reduced = prefersReducedMotion();
  const [value, setValue] = useState(reduced ? target : 0);
  const valueRef = useRef(reduced ? target : 0); // ultimo valor exibido, sem causar render
  const frameRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (reduced) {
      valueRef.current = target;
      setValue(target);
      return;
    }

    const from = valueRef.current;
    if (from === target) return; // nada a animar

    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const next = Math.round(from + (target - from) * easeOutCubic(t));
      valueRef.current = next;
      setValue(next);
      if (t < 1) frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current !== undefined) cancelAnimationFrame(frameRef.current);
    };
  }, [target, durationMs, reduced]);

  return value;
}
