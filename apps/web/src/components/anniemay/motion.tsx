'use client';

/**
 * Motion primitives for the Annie May site: long editorial reveals on
 * refined easing curves for content, physical springs only for
 * interactive elements, everything degrading gracefully under
 * prefers-reduced-motion.
 *
 * In-view detection is our own IntersectionObserver hook (framer's
 * whileInView proved unreliable in this Next 15 / React 19 stack);
 * framer-motion still drives the actual transforms.
 */

import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';

export const ease = {
  outExpo: [0.16, 1, 0.3, 1] as const,
  outQuint: [0.22, 1, 0.36, 1] as const,
  inOutExpo: [0.87, 0, 0.13, 1] as const,
};

/** Apple-profile spring for buttons and interactive elements only. */
export const spring = { type: 'spring' as const, mass: 1, stiffness: 180, damping: 18 };

/** True once the element has entered the viewport (fires immediately when
 *  mounted in view). Latches — it never goes back to false. */
export function useInViewOnce<T extends Element>(margin = '-10% 0px') {
  const ref = useRef<T | null>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    if (typeof IntersectionObserver === 'undefined') {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSeen(true);
          io.disconnect();
        }
      },
      { rootMargin: margin, threshold: 0.01 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [seen]);
  return { ref, seen };
}

/** Slow editorial fade-and-rise, tied to entering the viewport. */
export function Reveal({
  children,
  delay = 0,
  y = 36,
  style,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  style?: React.CSSProperties;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const { ref, seen } = useInViewOnce<HTMLDivElement>();
  const shown = seen || Boolean(reduced);
  return (
    <motion.div
      ref={ref}
      className={className}
      style={style}
      initial={false}
      animate={shown ? { opacity: 1, y: 0 } : { opacity: 0, y }}
      transition={{ duration: reduced ? 0 : 1.1, delay, ease: ease.outExpo }}
    >
      {children}
    </motion.div>
  );
}

/** Headline mask reveal — each line rises out of an overflow-hidden strip. */
export function MaskLines({
  lines,
  as: Tag = 'h1',
  className,
  style,
  delay = 0,
  stagger = 0.14,
}: {
  lines: string[];
  as?: 'h1' | 'h2' | 'h3' | 'p';
  className?: string;
  style?: React.CSSProperties;
  delay?: number;
  stagger?: number;
}) {
  const reduced = useReducedMotion();
  const { ref, seen } = useInViewOnce<HTMLElement>('-6% 0px');
  const shown = seen || Boolean(reduced);
  return (
    <Tag ref={ref as React.Ref<never>} className={className} style={style}>
      {lines.map((line, i) => (
        // the strip gets descender headroom so masks never clip g / y / commas
        <span key={i} style={{ display: 'block', overflow: 'hidden', paddingBottom: '0.14em', marginBottom: '-0.14em' }}>
          <motion.span
            style={{ display: 'block', willChange: 'transform' }}
            initial={false}
            animate={{ y: shown ? '0%' : '112%' }}
            transition={{ duration: reduced ? 0 : 1.4, delay: delay + i * stagger, ease: ease.outExpo }}
          >
            {line}
          </motion.span>
        </span>
      ))}
    </Tag>
  );
}

/**
 * Image that drifts slowly against scroll (parallax) inside a clipping
 * frame. The scale headroom hides the drift; GPU transforms only.
 */
export function ParallaxImage({
  src,
  alt,
  drift = 12,
  style,
  imgStyle,
  className,
}: {
  src: string;
  alt: string;
  drift?: number; // % of own height the image travels
  style?: React.CSSProperties;
  imgStyle?: React.CSSProperties;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [`-${drift}%`, `${drift}%`]);
  return (
    <div ref={ref} className={className} style={{ overflow: 'hidden', position: 'relative', ...style }}>
      <motion.img
        src={src}
        alt={alt}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
          willChange: 'transform',
          y: reduced ? 0 : y,
          scale: reduced ? 1 : 1 + drift / 45,
          ...imgStyle,
        }}
      />
    </div>
  );
}

/** Image revealed by a curtain wipe as it enters the viewport. */
export function CurtainImage({
  src,
  alt,
  style,
  className,
  delay = 0,
}: {
  src: string;
  alt: string;
  style?: React.CSSProperties;
  className?: string;
  delay?: number;
}) {
  const reduced = useReducedMotion();
  const { ref, seen } = useInViewOnce<HTMLDivElement>();
  const shown = seen || Boolean(reduced);
  return (
    <div ref={ref} className={className} style={{ overflow: 'hidden', position: 'relative', ...style }}>
      <motion.img
        src={src}
        alt={alt}
        initial={false}
        animate={{ scale: shown ? 1 : 1.14 }}
        transition={{ duration: reduced ? 0 : 1.6, delay, ease: ease.outExpo }}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', willChange: 'transform' }}
      />
      <motion.div
        aria-hidden
        initial={false}
        animate={{ scaleY: shown ? 0 : 1 }}
        transition={{ duration: reduced ? 0 : 1.1, delay, ease: ease.inOutExpo }}
        style={{ position: 'absolute', inset: 0, background: 'var(--am-paper)', transformOrigin: 'top', willChange: 'transform' }}
      />
    </div>
  );
}
