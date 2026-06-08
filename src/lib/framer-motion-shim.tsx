'use client';
// Lightweight framer-motion shim - renders plain elements without animation
// This saves ~150KB of JS bundle size and reduces memory usage

import React from 'react';

type MotionProps = {
  initial?: any;
  animate?: any;
  exit?: any;
  transition?: any;
  whileHover?: any;
  whileTap?: any;
  whileDrag?: any;
  whileFocus?: any;
  whileInView?: any;
  drag?: any;
  dragConstraints?: any;
  dragElastic?: any;
  layout?: any;
  layoutId?: any;
  variants?: any;
  viewport?: any;
  onAnimationComplete?: any;
  onDragStart?: any;
  onDrag?: any;
  onDragEnd?: any;
  style?: React.CSSProperties;
  className?: string;
  children?: React.ReactNode;
  key?: string;
  id?: string;
  onClick?: any;
  onMouseEnter?: any;
  onMouseLeave?: any;
  ref?: any;
  [key: string]: any;
};

function createMotionElement(tag: string) {
  const Component = React.forwardRef<HTMLElement, MotionProps>(
    ({ initial, animate, exit, transition, whileHover, whileTap, whileDrag, whileFocus, whileInView, drag, dragConstraints, dragElastic, layout, layoutId, variants, viewport, onAnimationComplete, onDragStart, onDrag, onDragEnd, style, ...rest }, ref) => {
      // Apply animate values as static inline styles (since we have no animation runtime)
      // Merge with any existing style prop, with animate values taking priority
      const mergedStyle: React.CSSProperties = {
        ...style,
        ...(animate || {}),
      };
      return React.createElement(tag, { ...rest, style: mergedStyle, ref });
    }
  );
  Component.displayName = `motion.${tag}`;
  return Component;
}

export const motion = new Proxy({} as Record<string, React.ComponentType<any>>, {
  get: (_target, prop: string) => {
    return createMotionElement(prop);
  },
});

export function AnimatePresence({ children }: { children: React.ReactNode; mode?: string }) {
  return <>{children}</>;
}
