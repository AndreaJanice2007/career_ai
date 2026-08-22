import { motion } from 'framer-motion'

const STEPS = [
  { id: 'skills', label: 'Your skills' },
  { id: 'analyzing', label: 'Matching' },
  { id: 'results', label: 'Your paths' },
]

export default function StepProgress({ current }) {
  const activeIndex = Math.max(
    0,
    STEPS.findIndex((step) => step.id === current),
  )

  return (
    <div className="mx-auto flex max-w-md items-center px-6">
      {STEPS.map((step, index) => {
        const done = index < activeIndex
        const active = index === activeIndex

        return (
          <div key={step.id} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-2">
              <motion.div
                animate={{
                  scale: active ? 1.15 : 1,
                  backgroundColor: done || active ? '#8b5cf6' : 'rgba(255,255,255,0.08)',
                  borderColor:
                    done || active ? '#a78bfa' : 'rgba(255,255,255,0.15)',
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                className="relative flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold text-white"
              >
                {active && (
                  <motion.span
                    className="absolute inset-0 rounded-full border border-violet-400"
                    animate={{ scale: [1, 1.6], opacity: [0.6, 0] }}
                    transition={{ duration: 1.8, repeat: Infinity }}
                  />
                )}
                {done ? '✓' : index + 1}
              </motion.div>
              <span
                className={`text-[11px] font-medium tracking-wide transition-colors ${
                  active ? 'text-white' : 'text-slate-500'
                }`}
              >
                {step.label}
              </span>
            </div>

            {index < STEPS.length - 1 && (
              <div className="mx-3 mb-6 h-px flex-1 overflow-hidden bg-white/10">
                <motion.div
                  className="h-full bg-gradient-to-r from-violet-500 to-cyan-400"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: index < activeIndex ? 1 : 0 }}
                  transition={{ duration: 0.5, ease: 'easeInOut' }}
                  style={{ originX: 0 }}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
