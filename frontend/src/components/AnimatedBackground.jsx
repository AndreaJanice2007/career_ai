import { memo } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

const BLOBS = [
  {
    className: 'left-[-12%] top-[-10%] h-[38rem] w-[38rem] bg-violet-600/30',
    drift: { x: [0, 120, -40, 0], y: [0, 70, 140, 0] },
    duration: 26,
  },
  {
    className: 'right-[-14%] top-[12%] h-[32rem] w-[32rem] bg-cyan-500/25',
    drift: { x: [0, -110, 50, 0], y: [0, 110, -60, 0] },
    duration: 32,
  },
  {
    className: 'left-[24%] bottom-[-18%] h-[36rem] w-[36rem] bg-fuchsia-600/20',
    drift: { x: [0, 90, -80, 0], y: [0, -90, 40, 0] },
    duration: 38,
  },
]

function AnimatedBackground() {
  const reduced = useReducedMotion()

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-ink-950" />

      {BLOBS.map((blob, index) => (
        <motion.div
          key={index}
          className={`absolute rounded-full blur-[120px] ${blob.className}`}
          animate={reduced ? undefined : blob.drift}
          transition={{
            duration: blob.duration,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}

      <div
        className="absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(148,163,184,0.16) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.16) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          maskImage:
            'radial-gradient(ellipse 80% 60% at 50% 0%, black 20%, transparent 75%)',
        }}
      />

      {/* Slow vertical sweep so the page never feels completely static. */}
      {!reduced && (
        <motion.div
          className="absolute inset-x-0 h-64 bg-gradient-to-b from-transparent via-cyan-400/[0.07] to-transparent"
          animate={{ y: ['-20vh', '120vh'] }}
          transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
        />
      )}

      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-ink-950" />
    </div>
  )
}

export default memo(AnimatedBackground)
