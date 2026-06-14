// @ts-nocheck
'use client';

import { useState, useEffect, useRef } from 'react';

// ─── Animated Counter Hook (Style 2) ──────────────────────────────

export function useAnimatedCount(target: number, duration = 400) {
  const [count, setCount] = useState(target);
  const prevRef = useRef(target);
  useEffect(() => {
    const start = prevRef.current;
    const end = target;
    if (start === end) return;
    const startTime = Date.now();
    const step = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      setCount(Math.round(start + (end - start) * eased));
      if (progress < 1) requestAnimationFrame(step);
      else prevRef.current = end;
    };
    requestAnimationFrame(step);
  }, [target, duration]);
  return count;
}
