import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { easeOut } from '../lib/motion'

const QUOTES = [
  {
    text: 'Choose a job you love, and you will never have to work a day in your life.',
    author: 'Confucius',
  },
  {
    text: 'The only way to do great work is to love what you do.',
    author: 'Steve Jobs',
  },
  {
    text: 'The future depends on what you do today.',
    author: 'Mahatma Gandhi',
  },
  {
    text: 'Success is the sum of small efforts, repeated day in and day out.',
    author: 'Robert Collier',
  },
  {
    text: "Opportunities don't happen. You create them.",
    author: 'Chris Grosser',
  },
  {
    text: "It always seems impossible until it's done.",
    author: 'Nelson Mandela',
  },
  {
    text: "Believe you can and you're halfway there.",
    author: 'Theodore Roosevelt',
  },
]

// How long the "saved" confirmation stays up before the builder returns.
const RETURN_DELAY_MS = 2200

const CONFETTI = [
  { x: 18, color: '#a78bfa', delay: 0, rotate: 140 },
  { x: 42, color: '#22d3ee', delay: 0.45, rotate: -120 },
  { x: 68, color: '#fb7185', delay: 0.15, rotate: 200 },
  { x: 96, color: '#a3e635', delay: 0.8, rotate: -160 },
  { x: 138, color: '#22d3ee', delay: 0.3, rotate: 180 },
  { x: 168, color: '#a78bfa', delay: 0.95, rotate: -100 },
  { x: 196, color: '#fbbf24', delay: 0.6, rotate: 220 },
  { x: 218, color: '#fb7185', delay: 1.1, rotate: -180 },
]

function CelebrationScene() {
  const reduced = useReducedMotion()
  const loop = (definition) => (reduced ? undefined : definition)

  return (
    <svg
      viewBox="0 0 240 210"
      className="mx-auto w-full max-w-xs"
      role="img"
      aria-label="Illustration of a person celebrating at their new job"
    >
      <defs>
        <linearGradient id="joy-shirt" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#6d28d9" />
        </linearGradient>
        <linearGradient id="joy-line" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#22d3ee" />
        </linearGradient>
      </defs>

      <motion.circle
        cx="120"
        cy="104"
        r="74"
        fill="#8b5cf6"
        opacity="0.14"
        animate={loop({ scale: [1, 1.06, 1], opacity: [0.12, 0.2, 0.12] })}
        style={{ originX: '120px', originY: '104px' }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />

      {!reduced &&
        CONFETTI.map((piece) => (
          <motion.rect
            key={piece.x}
            x={piece.x}
            y="-12"
            width="6"
            height="10"
            rx="2"
            fill={piece.color}
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: [-20, 120, 205], opacity: [0, 1, 0], rotate: piece.rotate }}
            transition={{
              duration: 3.4,
              repeat: Infinity,
              delay: piece.delay,
              ease: 'easeIn',
            }}
          />
        ))}

      {/* Screen behind, with a trend line that keeps climbing */}
      <motion.g
        animate={loop({ y: [0, -4, 0] })}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      >
        <rect
          x="150"
          y="44"
          width="72"
          height="54"
          rx="8"
          fill="#0b1030"
          stroke="#5b6ba8"
          strokeWidth="2"
        />
        <motion.polyline
          points="160,86 176,70 190,78 212,54"
          fill="none"
          stroke="url(#joy-line)"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.2, delay: 0.4, ease: easeOut }}
        />
        <motion.circle
          cx="212"
          cy="54"
          r="4"
          fill="#22d3ee"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 1.5, type: 'spring', stiffness: 400 }}
        />
      </motion.g>

      {/* Person, arms up */}
      <motion.g
        animate={loop({ y: [0, -7, 0] })}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
      >
        <path
          d="M96 176v-36a24 24 0 0 1 48 0v36z"
          fill="url(#joy-shirt)"
        />
        <motion.g
          style={{ originX: '104px', originY: '132px' }}
          animate={loop({ rotate: [-6, 6, -6] })}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        >
          <path
            d="M104 136 82 104"
            stroke="#8b5cf6"
            strokeWidth="11"
            strokeLinecap="round"
          />
          <circle cx="80" cy="100" r="7" fill="#e8eef7" />
        </motion.g>
        <motion.g
          style={{ originX: '136px', originY: '132px' }}
          animate={loop({ rotate: [6, -6, 6] })}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        >
          <path
            d="M136 136 158 104"
            stroke="#8b5cf6"
            strokeWidth="11"
            strokeLinecap="round"
          />
          <circle cx="160" cy="100" r="7" fill="#e8eef7" />
        </motion.g>

        <rect x="112" y="122" width="16" height="16" rx="6" fill="#cbd5e1" />
        {/* Hair is a larger disc behind an offset face disc, which leaves a
            clean crescent without hand-tuned arc maths. */}
        <circle cx="120" cy="98" r="24" fill="#5b3fb8" />
        <circle cx="120" cy="103" r="21" fill="#e8eef7" />
        <path
          d="M110 100q2.5-3 5 0"
          stroke="#1e293b"
          strokeWidth="2.4"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M125 100q2.5-3 5 0"
          stroke="#1e293b"
          strokeWidth="2.4"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M112 110q8 8 16 0"
          stroke="#1e293b"
          strokeWidth="2.4"
          strokeLinecap="round"
          fill="none"
        />
      </motion.g>

      {/* Desk and laptop */}
      <rect x="30" y="176" width="180" height="9" rx="4.5" fill="#5b6ba8" />
      <rect x="52" y="162" width="52" height="14" rx="4" fill="#3b4676" />
      <rect x="60" y="168" width="36" height="3" rx="1.5" fill="#8ea0d8" />

      {/* Badge, for the new role */}
      <motion.g
        initial={{ scale: 0, rotate: -25 }}
        animate={{ scale: 1, rotate: -12 }}
        transition={{ delay: 0.9, type: 'spring', stiffness: 260, damping: 14 }}
      >
        <circle cx="42" cy="76" r="20" fill="#0b1030" stroke="#22d3ee" strokeWidth="2" />
        <path
          d="M42 64l4.2 8.6 9.4 1.4-6.8 6.6 1.6 9.4-8.4-4.4-8.4 4.4 1.6-9.4-6.8-6.6 9.4-1.4z"
          fill="#22d3ee"
          transform="scale(0.72) translate(16 26)"
        />
      </motion.g>
    </svg>
  )
}

function SavedCheck() {
  return (
    <svg viewBox="0 0 52 52" className="h-12 w-12">
      <motion.circle
        cx="26"
        cy="26"
        r="23"
        fill="none"
        stroke="rgb(52 211 153)"
        strokeWidth="2.5"
        initial={{ pathLength: 0, opacity: 0.2 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: easeOut }}
      />
      <motion.path
        d="M16 27.5 L23 34 L37 19"
        fill="none"
        stroke="rgb(110 231 183)"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.45, delay: 0.3, ease: easeOut }}
      />
    </svg>
  )
}

export default function CelebrationOverlay({
  open,
  career,
  username,
  onSave,
  onBuildAnother,
  onViewPaths,
  onClose,
}) {
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)
  const returnTimer = useRef(null)

  const cancelReturn = () => {
    clearTimeout(returnTimer.current)
    returnTimer.current = null
  }

  const quote = useMemo(
    () => QUOTES[Math.floor(Math.random() * QUOTES.length)],
    // A fresh quote each time the overlay is opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [open],
  )

  useEffect(() => {
    if (!open) return undefined
    setStatus('idle')
    setError(null)
    const onKey = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [open, onClose])

  // Kept separate from the effect above, whose cleanup runs on every re-render
  // and would cancel a pending return before it fires.
  useEffect(() => {
    if (!open) cancelReturn()
    return cancelReturn
  }, [open])

  const save = async () => {
    setStatus('saving')
    setError(null)
    try {
      await onSave()
      setStatus('saved')
      // Let the confirmation land, then drop them back into the builder.
      returnTimer.current = setTimeout(onBuildAnother, RETURN_DELAY_MS)
    } catch (problem) {
      setError(problem.message)
      setStatus('idle')
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto px-5 py-8"
        >
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="absolute inset-0 cursor-default bg-ink-950/85 backdrop-blur-sm"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Career path complete"
            initial={{ opacity: 0, y: 34, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            className="glass relative my-auto w-full max-w-lg overflow-hidden p-7 text-center sm:p-9"
          >
            <motion.div
              aria-hidden
              className="pointer-events-none absolute -top-24 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-violet-500/25 blur-3xl"
              animate={{ opacity: [0.5, 0.9, 0.5] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            />

            <div className="relative">
              <CelebrationScene />

              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35, duration: 0.5 }}
                className="mt-2 text-[11px] uppercase tracking-[0.2em] text-cyan-300/80"
              >
                Your path is ready
              </motion.p>

              <motion.h2
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45, duration: 0.5 }}
                className="mt-2 text-pretty text-2xl font-extrabold leading-tight text-white"
              >
                {career}
              </motion.h2>

              <motion.blockquote
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.65, duration: 0.6 }}
                className="mx-auto mt-6 max-w-sm border-l-2 border-violet-400/50 pl-4 text-left"
              >
                <p className="text-pretty text-sm leading-relaxed text-slate-300 sm:text-base">
                  “{quote.text}”
                </p>
                <footer className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  {quote.author}
                </footer>
              </motion.blockquote>

              <AnimatePresence mode="wait">
                {status === 'saved' ? (
                  <motion.div
                    key="saved"
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-8"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <SavedCheck />
                      <p className="text-sm font-semibold text-white">
                        Saved to {username}
                      </p>
                      <p className="text-xs text-slate-400">
                        Find it any time under My paths.
                      </p>
                    </div>

                    <div className="mx-auto mt-6 max-w-xs">
                      <p className="text-xs text-slate-500">
                        Starting a fresh profile for you…
                      </p>
                      <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
                        <motion.div
                          className="h-full rounded-full bg-gradient-to-r from-violet-400 to-cyan-300"
                          initial={{ width: '0%' }}
                          animate={{ width: '100%' }}
                          transition={{
                            duration: RETURN_DELAY_MS / 1000,
                            ease: 'linear',
                          }}
                        />
                      </div>
                    </div>

                    <div className="mt-6 flex flex-col gap-3 sm:flex-row-reverse sm:justify-center">
                      <motion.button
                        type="button"
                        onClick={() => {
                          cancelReturn()
                          onBuildAnother()
                        }}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        className="rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 px-7 py-3.5 text-sm font-semibold text-ink-950 shadow-lg shadow-violet-900/40"
                      >
                        Go now
                      </motion.button>
                      <button
                        type="button"
                        onClick={() => {
                          cancelReturn()
                          onViewPaths()
                        }}
                        className="rounded-full border border-white/12 px-7 py-3.5 text-sm font-semibold text-slate-300 hover:border-white/25 hover:text-white"
                      >
                        View my paths
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="actions"
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: 0.85, duration: 0.5 }}
                    className="mt-8"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row-reverse sm:justify-center">
                      <motion.button
                        type="button"
                        onClick={save}
                        disabled={status === 'saving'}
                        whileHover={{ scale: status === 'saving' ? 1 : 1.03 }}
                        whileTap={{ scale: status === 'saving' ? 1 : 0.97 }}
                        className="flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 px-7 py-3.5 text-sm font-semibold text-ink-950 shadow-lg shadow-violet-900/40 disabled:opacity-70"
                      >
                        {status === 'saving' ? (
                          <>
                            <motion.span
                              className="h-3.5 w-3.5 rounded-full border-2 border-ink-950/30 border-t-ink-950"
                              animate={{ rotate: 360 }}
                              transition={{
                                duration: 0.8,
                                repeat: Infinity,
                                ease: 'linear',
                              }}
                            />
                            Saving
                          </>
                        ) : (
                          'Save my career path'
                        )}
                      </motion.button>
                      <button
                        type="button"
                        onClick={onBuildAnother}
                        className="rounded-full border border-white/12 px-7 py-3.5 text-sm font-semibold text-slate-300 hover:border-white/25 hover:text-white"
                      >
                        Skip and start fresh
                      </button>
                    </div>

                    <AnimatePresence>
                      {error && (
                        <motion.p
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="mt-4 text-xs text-rose-300"
                        >
                          {error}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
