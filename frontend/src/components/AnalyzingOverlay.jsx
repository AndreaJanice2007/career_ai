import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'

const MESSAGES = [
  'Encoding your skill profile…',
  'Comparing against 923 occupations…',
  'Scoring skill overlap…',
  'Ranking your best-fit careers…',
]

export default function AnalyzingOverlay() {
  const [index, setIndex] = useState(0)
  const reduced = useReducedMotion()

  useEffect(() => {
    const timer = setInterval(
      () => setIndex((value) => (value + 1) % MESSAGES.length),
      900,
    )
    return () => clearInterval(timer)
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex min-h-[60vh] flex-col items-center justify-center px-6"
    >
      <div className="relative flex h-40 w-40 items-center justify-center">
        {!reduced &&
          [0, 1, 2].map((ring) => (
            <motion.span
              key={ring}
              className="absolute rounded-full border border-violet-400/40"
              style={{ width: 64, height: 64 }}
              animate={{ scale: [1, 2.4], opacity: [0.55, 0] }}
              transition={{
                duration: 2.4,
                repeat: Infinity,
                delay: ring * 0.8,
                ease: 'easeOut',
              }}
            />
          ))}

        <motion.div
          className="h-16 w-16 rounded-full bg-gradient-to-br from-violet-400 via-fuchsia-400 to-cyan-300 blur-[2px]"
          animate={
            reduced
              ? undefined
              : { scale: [1, 1.15, 1], rotate: [0, 180, 360] }
          }
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <div className="mt-8 h-6 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.p
            key={index}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
            className="text-sm font-medium text-slate-300"
          >
            {MESSAGES[index]}
          </motion.p>
        </AnimatePresence>
      </div>

      <div className="mt-5 h-1 w-56 overflow-hidden rounded-full bg-white/8">
        <motion.div
          className="h-full w-1/3 rounded-full bg-gradient-to-r from-violet-400 to-cyan-300"
          animate={{ x: ['-100%', '300%'] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>
    </motion.div>
  )
}
