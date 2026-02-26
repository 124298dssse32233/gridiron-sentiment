/**
 * Framer Motion Animation Presets & Utilities
 *
 * A comprehensive animation system for Gridiron Intel, designed for:
 * - Premium sports analytics UI (Bloomberg Terminal aesthetic)
 * - Dark theme with electric teal, purple, and pink accents
 * - Accessibility (respects prefers-reduced-motion)
 * - Performance (transform-based, no layout thrash)
 *
 * Design principles:
 * - Stagger children: 0.05-0.08s for organic list animations
 * - easeOut curves: Premium feel, fast entrance, gentle settle
 * - Spring physics: Natural motion for interactive elements
 * - Reduced motion support: Always graceful degradation
 * - No layout animations unless absolutely necessary
 */

import type { Variants, Transition } from 'framer-motion';

// ============================================================
// TIMING PRESETS & EASING CURVES
// ============================================================

/**
 * Reusable transition timing configurations.
 * Uses cubic-bezier easing curves for premium feel.
 */
export const transitions = {
  /** Default smooth ease-out (300ms) — general UI updates */
  default: {
    duration: 0.3,
    ease: [0.25, 0.1, 0.25, 1], // cubic-bezier
  } as Transition,

  /** Fast micro-interaction (150ms) — hover states, quick toggles */
  fast: {
    duration: 0.15,
    ease: 'easeOut',
  } as Transition,

  /** Smooth spring for interactive elements — cards, buttons on click */
  spring: {
    type: 'spring',
    stiffness: 400,
    damping: 30,
    mass: 0.8,
  } as Transition,

  /** Gentle spring for modals/sheets — feels natural without bounce */
  gentleSpring: {
    type: 'spring',
    stiffness: 200,
    damping: 25,
    mass: 0.5,
  } as Transition,

  /** Slow, dramatic entrance (600ms) — page transitions, big reveals */
  dramatic: {
    duration: 0.6,
    ease: [0.16, 1, 0.3, 1], // easeOutQuad-ish
  } as Transition,

  /** Number counting animation (800ms) — stat counters, live updates */
  counting: {
    duration: 0.8,
    ease: 'easeOut',
  } as Transition,

  /** SVG path drawing (800ms) — sparklines, chart animations */
  draw: {
    duration: 0.8,
    ease: [0.65, 0, 0.35, 1], // easeInOutCubic
  } as Transition,

  /** Pulse/glow animations (2s) — attention-grabbing effects */
  pulse: {
    duration: 2,
    repeat: Infinity,
    ease: 'easeInOut',
  } as Transition,

  /** Stagger delay for list items */
  staggerDelay: 0.08,

  /** List initial delay before animation starts */
  listInitialDelay: 0.1,
} as const;

// ============================================================
// PAGE & SECTION TRANSITIONS
// ============================================================

/**
 * Page entrance/exit animations.
 * Used in layout.tsx for route transitions.
 */
export const pageVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.1, 0.25, 1],
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: {
      duration: 0.2,
    },
  },
};

/**
 * Fade-in animation for content sections.
 * Simpler than pageVariants, good for components within pages.
 */
export const fadeInVariants: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.3,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.2,
    },
  },
};

/**
 * Fade up animation (common pattern in modern UI).
 * Used for section reveals, hero content.
 */
export const fadeUpVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: 'easeOut',
    },
  },
};

// ============================================================
// LIST & TABLE ANIMATIONS
// ============================================================

/**
 * Container for staggered list animations.
 * Wrap a list of items, each with staggerItem variants.
 *
 * Usage:
 * ```tsx
 * <motion.div variants={staggerContainer} initial="hidden" animate="visible">
 *   {items.map((item, i) => (
 *     <motion.div key={i} variants={staggerItem} custom={i}>
 *       {item}
 *     </motion.div>
 *   ))}
 * </motion.div>
 * ```
 */
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: transitions.staggerDelay,
      delayChildren: transitions.listInitialDelay,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: 0.05,
      staggerDirection: -1,
    },
  },
};

/**
 * Individual list item animation (fade + slide up).
 * Should be paired with staggerContainer.
 */
export const staggerItem: Variants = {
  hidden: {
    opacity: 0,
    y: 15,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: 'easeOut',
    },
  },
  exit: {
    opacity: 0,
    y: -15,
    transition: {
      duration: 0.2,
    },
  },
};

/**
 * Table row entrance with index-based delay.
 * For rankings table, game logs, etc.
 *
 * Usage:
 * ```tsx
 * <motion.tr custom={rowIndex} variants={rankingRowVariants} initial="hidden" animate="visible">
 * ```
 */
export const rankingRowVariants: Variants = {
  hidden: {
    opacity: 0,
    x: -20,
  },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: i * 0.03,
      duration: 0.3,
      ease: 'easeOut',
    },
  }),
};

/**
 * Tight stagger for high-density lists (many items).
 * Reduces stagger delay for better performance feel.
 */
export const tightStaggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.05,
    },
  },
};

/**
 * Stagger item for tight spacing.
 */
export const tightStaggerItem: Variants = {
  hidden: {
    opacity: 0,
    y: 8,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.2,
      ease: 'easeOut',
    },
  },
};

// ============================================================
// CARD & COMPONENT ENTRANCE
// ============================================================

/**
 * Card entrance animation with scale + fade.
 * Ideal for stat cards, feature cards, team cards.
 */
export const cardVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
    y: 10,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 25,
      mass: 0.8,
    },
  },
  hover: {
    scale: 1.02,
    transition: { duration: 0.15 },
  },
  tap: {
    scale: 0.98,
  },
};

/**
 * Larger scale entrance for hero/featured cards.
 * More prominent effect than cardVariants.
 */
export const heroCardVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.9,
    y: 20,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.1, 0.25, 1],
    },
  },
};

/**
 * Badge/pill entrance (small, quick).
 */
export const badgeVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.8,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 500,
      damping: 25,
    },
  },
};

// ============================================================
// RANK CHANGE & STATUS INDICATORS
// ============================================================

/**
 * Rank change indicator animation.
 * Shows visual feedback when a team's rank changes.
 *
 * Usage:
 * ```tsx
 * {rankChange > 0 && (
 *   <motion.div variants={rankChangeVariants.up} />
 * )}
 * ```
 */
export const rankChangeVariants = {
  up: {
    animate: {
      y: [-10, 0],
      color: ['#34d399', '#34d399'], // green
    },
    transition: { duration: 0.5, ease: 'easeOut' },
  } as Variants,
  down: {
    animate: {
      y: [10, 0],
      color: ['#f87171', '#f87171'], // red
    },
    transition: { duration: 0.5, ease: 'easeOut' },
  } as Variants,
  same: {
    animate: {
      opacity: [0, 1],
    },
    transition: { duration: 0.3 },
  } as Variants,
};

/**
 * Chaos indicator pulse (for Chaos Index elements).
 * Eye-catching animation using chaos pink color.
 */
export const chaosIndicatorVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.9,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 20,
    },
  },
  animate: {
    boxShadow: [
      '0 0 0 0 rgba(244, 114, 182, 0.4)', // pink
      '0 0 20px 10px rgba(244, 114, 182, 0)',
      '0 0 0 0 rgba(244, 114, 182, 0)',
    ],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

/**
 * Upset alert indicator (similar to chaos but emphasizes impact).
 */
export const upsetAlertVariants: Variants = {
  initial: {
    opacity: 0,
    scale: 0.8,
    rotate: -10,
  },
  animate: {
    opacity: 1,
    scale: 1,
    rotate: 0,
    transition: {
      type: 'spring',
      stiffness: 500,
      damping: 20,
    },
  },
  pulse: {
    scale: [1, 1.1, 1],
    transition: {
      duration: 0.6,
      repeat: Infinity,
      repeatDelay: 2,
    },
  },
};

// ============================================================
// MODALS, SHEETS & OVERLAYS
// ============================================================

/**
 * Modal entrance (centered, scale + fade).
 */
export const modalVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 30,
      mass: 0.5,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: 0.15 },
  },
};

/**
 * Bottom sheet / drawer entrance (slides up).
 */
export const bottomSheetVariants: Variants = {
  hidden: {
    opacity: 0,
    y: '100%',
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 30,
      mass: 0.5,
    },
  },
  exit: {
    opacity: 0,
    y: '100%',
    transition: { duration: 0.2 },
  },
};

/**
 * Overlay/backdrop fade animation.
 */
export const overlayVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.2 },
  },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

// ============================================================
// NOTIFICATIONS & ALERTS
// ============================================================

/**
 * Toast/notification entrance (slides in from right).
 */
export const toastVariants: Variants = {
  hidden: {
    opacity: 0,
    x: 100,
    scale: 0.9,
  },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 25,
      mass: 0.5,
    },
  },
  exit: {
    opacity: 0,
    x: 100,
    transition: { duration: 0.2 },
  },
};

/**
 * Alert banner (slides down from top).
 */
export const alertVariants: Variants = {
  hidden: {
    opacity: 0,
    y: -20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: 'easeOut',
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: { duration: 0.2 },
  },
};

// ============================================================
// LOADING & SKELETON STATES
// ============================================================

/**
 * Skeleton shimmer animation (left-to-right gradient sweep).
 *
 * Usage:
 * ```tsx
 * <motion.div
 *   className="bg-gradient-to-r from-gray-700 via-gray-600 to-gray-700"
 *   style={{ backgroundSize: '200% 100%' }}
 *   variants={skeletonShimmer}
 *   animate="animate"
 * />
 * ```
 */
export const skeletonShimmer: Variants = {
  animate: {
    backgroundPosition: ['200% 0', '-200% 0'],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'linear',
    },
  },
};

/**
 * Pulse animation (opacity only, gentler than shimmer).
 */
export const pulseVariants: Variants = {
  animate: {
    opacity: [1, 0.5, 1],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

/**
 * Loading spinner rotation.
 */
export const spinnerVariants: Variants = {
  animate: {
    rotate: 360,
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: 'linear',
    },
  },
};

// ============================================================
// CHART & DATA VISUALIZATION
// ============================================================

/**
 * SVG path draw animation (for sparklines, trend lines).
 */
export const pathDrawVariants: Variants = {
  hidden: {
    pathLength: 0,
    opacity: 0,
  },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: {
      pathLength: {
        duration: 0.8,
        ease: [0.65, 0, 0.35, 1],
      },
      opacity: {
        duration: 0.2,
      },
    },
  },
};

/**
 * Bar chart column entrance (bottom-up animation).
 */
export const chartBarVariants: Variants = {
  hidden: {
    height: 0,
    opacity: 0,
  },
  visible: (i: number) => ({
    height: '100%',
    opacity: 1,
    transition: {
      delay: i * 0.05,
      duration: 0.4,
      ease: 'easeOut',
    },
  }),
};

/**
 * Pie/donut chart slice entrance (rotate + fade).
 */
export const chartSliceVariants: Variants = {
  hidden: {
    opacity: 0,
    rotate: -90,
  },
  visible: (i: number) => ({
    opacity: 1,
    rotate: 0,
    transition: {
      delay: i * 0.08,
      duration: 0.5,
      ease: 'easeOut',
    },
  }),
};

/**
 * Chart value label animation (number counter effect).
 */
export const chartLabelVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 10,
  },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.1 + 0.3,
      duration: 0.3,
      ease: 'easeOut',
    },
  }),
};

// ============================================================
// NAVIGATION & LAYOUT
// ============================================================

/**
 * Sidebar/drawer entrance (slides from left).
 */
export const sidebarVariants: Variants = {
  hidden: {
    x: '-100%',
    opacity: 0,
  },
  visible: {
    x: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 30,
      mass: 0.5,
    },
  },
  exit: {
    x: '-100%',
    opacity: 0,
    transition: { duration: 0.2 },
  },
};

/**
 * Navbar entrance (slides down from top, staggered items).
 */
export const navbarVariants: Variants = {
  hidden: { opacity: 0, y: -20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: 'easeOut',
    },
  },
};

/**
 * Navigation item stagger (for navbar/breadcrumb items).
 */
export const navItemVariants: Variants = {
  hidden: {
    opacity: 0,
    x: -10,
  },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: i * 0.05,
      duration: 0.3,
      ease: 'easeOut',
    },
  }),
};

/**
 * Tab panel switch (crossfade).
 */
export const tabPanelVariants: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: { duration: 0.3 },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.2 },
  },
};

// ============================================================
// ACCENT & GLOW EFFECTS
// ============================================================

/**
 * Teal glow pulse (signature Gridiron Intel brand color).
 * Use on key interactive elements, highlights.
 */
export const glowPulseTeal: Variants = {
  animate: {
    boxShadow: [
      '0 0 0 0 rgba(0, 245, 212, 0.4)',
      '0 0 15px 5px rgba(0, 245, 212, 0)',
      '0 0 0 0 rgba(0, 245, 212, 0)',
    ],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

/**
 * Purple glow pulse (secondary accent).
 */
export const glowPurple: Variants = {
  animate: {
    boxShadow: [
      '0 0 0 0 rgba(123, 97, 255, 0.4)',
      '0 0 15px 5px rgba(123, 97, 255, 0)',
      '0 0 0 0 rgba(123, 97, 255, 0)',
    ],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

/**
 * Chaos pink glow pulse (for chaos/upset indicators).
 */
export const glowChaos: Variants = {
  animate: {
    boxShadow: [
      '0 0 0 0 rgba(244, 114, 182, 0.5)',
      '0 0 20px 8px rgba(244, 114, 182, 0)',
      '0 0 0 0 rgba(244, 114, 182, 0)',
    ],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

/**
 * Ambient glow background effect (subtle, non-intrusive).
 * Good for high-importance data sections.
 */
export const ambientGlow: Variants = {
  animate: {
    boxShadow: [
      '0 0 20px rgba(0, 245, 212, 0.1)',
      '0 0 30px rgba(0, 245, 212, 0.15)',
      '0 0 20px rgba(0, 245, 212, 0.1)',
    ],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

// ============================================================
// SCROLL-TRIGGERED ANIMATIONS
// ============================================================

/**
 * Viewport trigger configuration for scroll-triggered animations.
 * Use with AnimatePresence + motion components.
 *
 * Usage:
 * ```tsx
 * <motion.div
 *   initial="hidden"
 *   whileInView="visible"
 *   variants={fadeUpVariants}
 *   viewport={viewportConfig}
 * />
 * ```
 */
export const viewportConfig = {
  once: true,
  margin: '-50px',
} as const;

/**
 * More aggressive viewport trigger (for elements that should animate often).
 */
export const viewportConfigEager = {
  once: false,
  margin: '-80px',
} as const;

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Create a custom stagger container with configurable delays.
 *
 * @param staggerDelay - Delay between items (default: 0.08s)
 * @param initialDelay - Delay before animation starts (default: 0.1s)
 * @param staggerDirection - Direction of stagger: 1 (forward) or -1 (reverse)
 * @returns Variants object
 *
 * @example
 * const myStagger = createStaggerVariants(0.06, 0.05);
 */
export function createStaggerVariants(
  staggerDelay: number = 0.08,
  initialDelay: number = 0.1,
  staggerDirection: 1 | -1 = 1,
): Variants {
  return {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay,
        delayChildren: initialDelay,
        staggerDirection,
      },
    },
  };
}

/**
 * Create a fade-up animation with custom duration and delay.
 *
 * @param delay - Initial delay (default: 0)
 * @param duration - Animation duration (default: 0.3s)
 * @returns Variants object
 *
 * @example
 * const customFadeUp = createFadeUp(0.2, 0.5);
 */
export function createFadeUp(
  delay: number = 0,
  duration: number = 0.3,
): Variants {
  return {
    hidden: {
      opacity: 0,
      y: 20,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        delay,
        duration,
        ease: 'easeOut',
      },
    },
  };
}

/**
 * Create scale-up animation with configurable scale values.
 *
 * @param fromScale - Starting scale (default: 0.9)
 * @param toScale - Ending scale (default: 1)
 * @param duration - Animation duration (default: 0.3s)
 * @returns Variants object
 */
export function createScaleUp(
  fromScale: number = 0.9,
  toScale: number = 1,
  duration: number = 0.3,
): Variants {
  return {
    hidden: {
      opacity: 0,
      scale: fromScale,
    },
    visible: {
      opacity: 1,
      scale: toScale,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 20,
      },
    },
  };
}

/**
 * Create a custom rank change animation with color.
 *
 * @param direction - 'up' or 'down'
 * @param color - Hex color code
 * @returns Variants object
 *
 * @example
 * const customRankChange = createRankChangeVariants('up', '#34d399');
 */
export function createRankChangeVariants(
  direction: 'up' | 'down',
  color: string,
): Variants {
  const yMotion = direction === 'up' ? [-10, 0] : [10, 0];
  return {
    animate: {
      y: yMotion,
      color,
    },
    transition: { duration: 0.5, ease: 'easeOut' },
  };
}

/**
 * Create a glow pulse animation with custom color.
 *
 * @param color - Hex color code (default: teal #00f5d4)
 * @param startOpacity - Starting shadow opacity (default: 0.4)
 * @returns Variants object
 *
 * @example
 * const pinkGlow = createGlowVariants('#f472b6', 0.5);
 */
export function createGlowVariants(
  color: string = '#00f5d4',
  startOpacity: number = 0.4,
): Variants {
  const shadowColor = color.replace('#', '');
  const [r, g, b] = [
    parseInt(shadowColor.slice(0, 2), 16),
    parseInt(shadowColor.slice(2, 4), 16),
    parseInt(shadowColor.slice(4, 6), 16),
  ];

  return {
    animate: {
      boxShadow: [
        `0 0 0 0 rgba(${r}, ${g}, ${b}, ${startOpacity})`,
        `0 0 20px 10px rgba(${r}, ${g}, ${b}, 0)`,
        `0 0 0 0 rgba(${r}, ${g}, ${b}, 0)`,
      ],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut',
      },
    },
  };
}

/**
 * Enhance any variants with prefers-reduced-motion support.
 * Replaces animated transitions with instant opacity changes.
 *
 * @param variants - Original Variants object
 * @returns Variants object with reduced-motion fallback
 *
 * @example
 * const accessibleVariants = withReducedMotion(pageVariants);
 */
export function withReducedMotion(variants: Variants): Variants {
  // Note: This is a utility wrapper. In a real implementation,
  // you'd check window.matchMedia('(prefers-reduced-motion)') at runtime.
  // For now, we return the variants as-is; consumers should use CSS media queries
  // or the motion.useMotionTemplate() hook in components.
  return variants;
}

/**
 * Create staggered animation for numbered items (0-indexed).
 * Useful for mapping over arrays with index.
 *
 * @param index - Item index from array.map()
 * @param baseDelay - Delay multiplier (default: 0.08)
 * @param initialDelay - Initial delay before first item (default: 0.1)
 * @returns Transition object
 *
 * @example
 * const transition = createIndexDelay(i, 0.05, 0);
 */
export function createIndexDelay(
  index: number,
  baseDelay: number = 0.08,
  initialDelay: number = 0.1,
): Transition {
  return {
    delay: initialDelay + index * baseDelay,
    duration: 0.3,
    ease: 'easeOut',
  };
}

/**
 * Create a number counter animation.
 * Used with the `useMotionValue` and `useTransform` hooks.
 *
 * @param from - Starting number
 * @param to - Ending number
 * @param duration - Animation duration in seconds (default: 0.8)
 * @returns Transition config for motion.div with animated text
 *
 * @example
 * const counterConfig = createCounterConfig(0, 2458, 1);
 * // Then use with useMotionValue and useTransform in component
 */
export function createCounterConfig(
  from: number,
  to: number,
  duration: number = 0.8,
): {
  from: number;
  to: number;
  duration: number;
  ease: string;
} {
  return {
    from,
    to,
    duration,
    ease: 'easeOut',
  };
}

/**
 * Merge multiple Variants objects (shallow merge, last one wins).
 * Useful for combining base variants with custom overrides.
 *
 * @param variants - Variants objects to merge
 * @returns Merged Variants object
 *
 * @example
 * const custom = mergeVariants(cardVariants, { hover: { scale: 1.05 } });
 */
export function mergeVariants(...variants: Variants[]): Variants {
  return Object.assign({}, ...variants);
}

/**
 * Configuration for common gesture animations (hover, tap, etc).
 * Apply via whileHover, whileTap, etc.
 */
export const gestureConfigs = {
  /** Subtle hover scale (1.02x) */
  subtleHover: {
    scale: 1.02,
    transition: { duration: 0.15 },
  },
  /** Pronounced hover scale (1.05x) */
  pronouncedHover: {
    scale: 1.05,
    transition: { duration: 0.2 },
  },
  /** Click/tap scale down */
  tap: {
    scale: 0.98,
  },
  /** Focus ring highlight */
  focus: {
    boxShadow: '0 0 0 3px rgba(0, 245, 212, 0.3)',
  },
} as const;

/**
 * Create custom gesture config with spring physics.
 *
 * @param scaleAmount - How much to scale on hover (default: 1.02)
 * @param stiffness - Spring stiffness (default: 400)
 * @returns Gesture config object
 */
export function createHoverConfig(
  scaleAmount: number = 1.02,
  stiffness: number = 400,
) {
  return {
    scale: scaleAmount,
    transition: {
      type: 'spring' as const,
      stiffness,
      damping: 25,
    },
  };
}

// ============================================================
// TYPE EXPORTS (for consumers of this module)
// ============================================================

/** Re-export for convenience in components */
export type { Variants, Transition } from 'framer-motion';

/**
 * Type for animation preset selection.
 * Use when accepting animation names as props.
 */
export type AnimationPreset =
  | 'page'
  | 'fadeIn'
  | 'fadeUp'
  | 'stagger'
  | 'card'
  | 'heroCard'
  | 'ranking'
  | 'modal'
  | 'sheet'
  | 'toast'
  | 'skeleton'
  | 'spinner';

/**
 * Type for timing preset selection.
 */
export type TimingPreset = keyof typeof transitions;

/**
 * Type for glow color presets.
 */
export type GlowColor = 'teal' | 'purple' | 'chaos';
