import { type Variants } from 'framer-motion';

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.05 },
  },
};

export const cardSpringUp: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 120, damping: 20 },
  },
};

export const heroFadeDown: Variants = {
  hidden: { opacity: 0, y: -40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } },
};

export const logoEntry: Variants = {
  hidden: { opacity: 0, scale: 0, rotate: -180 },
  visible: {
    opacity: 1,
    scale: 1,
    rotate: 0,
    transition: { type: 'spring', stiffness: 150, damping: 15, delay: 0.1 },
  },
};

export const buttonShineSweep: Variants = {
  hidden: { left: '-110%' },
  hover: {
    left: ['-110%', '130%'],
    transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.1 },
  },
};

export const accordionContent: Variants = {
  hidden: { height: 0, opacity: 0, overflow: 'hidden' },
  visible: {
    height: 'auto',
    opacity: 1,
    transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
  },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0, y: -10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

export const styleTokens = {
  cardBase:
    'p-6 bg-white/[0.02] border border-white/5 rounded-2xl relative overflow-hidden',
  inputBase:
    'w-full px-4 py-3.5 bg-black/40 border border-white/10 rounded-xl focus:outline-none focus:border-blue-500/50 focus:bg-blue-500/5 text-white placeholder-neutral-600 transition-all text-sm',
  btnPrimary:
    'w-full py-3.5 bg-white text-black font-bold rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all hover:bg-neutral-200 active:scale-[0.98] disabled:opacity-50',
  btnSecondary:
    'px-4 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl text-xs font-medium text-white transition-all',
  btnDanger:
    'p-2 text-red-400/50 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors',
  tableHeader: 'border-b border-white/10 text-xs text-neutral-500 uppercase tracking-wider',
  tableRow: 'border-b border-white/5 transition-colors hover:bg-white/[0.02]',
  tagBase: 'text-[10px] px-2 py-0.5 bg-white/5 border border-white/10 rounded-md text-neutral-400',
  badgeActive: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  badgeInactive: 'bg-white/5 text-neutral-500 border border-white/10',
  focusRing:
    'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-50 dark:focus-visible:ring-offset-neutral-950',
  navbarFrosted:
    'sticky top-0 z-50 border-b border-neutral-200/70 bg-white/75 backdrop-blur-xl dark:border-neutral-800/80 dark:bg-neutral-950/75',
  cardFrosted:
    'bg-white/70 dark:bg-neutral-950/70 backdrop-blur-xl border-2 border-neutral-100 dark:border-neutral-800 rounded-xl transition-all duration-300 hover:border-emerald-400/80 dark:hover:border-emerald-500/80 hover:bg-neutral-50/70 dark:hover:bg-neutral-800/70 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-50 dark:focus-visible:ring-offset-neutral-950',
  btnDownloadFrosted:
    'relative group overflow-hidden flex sm:inline-flex w-full sm:w-auto items-center justify-center gap-2 sm:gap-2.5 px-6 py-3.5 sm:px-10 sm:py-4 bg-gradient-to-r from-emerald-600/85 to-lime-600/80 backdrop-blur-sm text-white font-semibold text-lg sm:text-xl rounded-full transition-all duration-300 ease-out hover:from-emerald-600 hover:to-lime-500 hover:scale-105 active:scale-95 drop-shadow-[0_0_18px_rgba(34,197,94,0.45)] dark:drop-shadow-[0_0_22px_rgba(34,197,94,0.28)] hover:drop-shadow-[0_0_28px_rgba(34,197,94,0.72)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-50 dark:focus-visible:ring-offset-neutral-950',
  textPrimary: 'text-neutral-900 dark:text-neutral-100',
  textSecondary: 'text-neutral-500 dark:text-neutral-400',
};
