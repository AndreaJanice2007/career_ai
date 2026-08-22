import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

export default function ModelPanel({ metrics }) {
  const [open, setOpen] = useState(false)

  if (!metrics) return null

  const best = Math.max(...metrics.metrics.map((row) => row.accuracy))

  return (
    <div className="glass mt-10 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
      >
        <div>
          <h3 className="text-sm font-bold text-white">Under the hood</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Model comparison, training data and how the match score is built
          </p>
        </div>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.3 }}
          className="text-slate-400"
        >
          ⌄
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="border-t border-white/8 px-6 py-6">
              <div className="space-y-2">
                {metrics.metrics.map((row, index) => (
                  <motion.div
                    key={row.model}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="grid grid-cols-[1fr_auto] items-center gap-4"
                  >
                    <div>
                      <div className="mb-1 flex items-baseline justify-between gap-3">
                        <span className="text-xs font-medium text-slate-300">
                          {row.model}
                          {row.accuracy === best && (
                            <span className="ml-2 rounded-full bg-lime-500/15 px-2 py-0.5 text-[10px] font-semibold text-lime-300">
                              best
                            </span>
                          )}
                        </span>
                        <span className="font-mono text-xs text-slate-400">
                          {(row.accuracy * 100).toFixed(2)}%
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
                        <motion.div
                          className="h-full rounded-full bg-gradient-to-r from-violet-400 to-cyan-300"
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: row.accuracy }}
                          transition={{
                            delay: index * 0.05 + 0.15,
                            duration: 0.7,
                            ease: [0.16, 1, 0.3, 1],
                          }}
                          style={{ originX: 0 }}
                        />
                      </div>
                    </div>
                    <span className="font-mono text-[11px] text-slate-600">
                      F1 {(row.f1 * 100).toFixed(1)}
                    </span>
                  </motion.div>
                ))}
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                {[
                  { label: 'Training profiles', value: metrics.stats.students },
                  { label: 'Skill features', value: metrics.stats.features },
                  { label: 'Held-out rows', value: metrics.stats.test_rows },
                ].map((item) => (
                  <div key={item.label} className="glass-soft p-4">
                    <div className="font-mono text-xl font-bold text-white">
                      {item.value.toLocaleString()}
                    </div>
                    <div className="mt-0.5 text-[11px] uppercase tracking-wider text-slate-500">
                      {item.label}
                    </div>
                  </div>
                ))}
              </div>

              <p className="mt-5 text-xs leading-relaxed text-slate-500">
                The served model is {metrics.served_model}, chosen because it
                returns calibrated probabilities. Its confidence is blended with
                a skill-fit score that compares your selections against each
                occupation&apos;s real requirement list, weighting rare skills
                more heavily than ubiquitous ones. Training profiles are
                synthesised from O*NET requirements, so the accuracies above are
                an experimental benchmark rather than a measure of performance on
                real people.
              </p>
              <p className="mt-3 font-mono text-[11px] text-slate-600">
                Model trained {new Date(metrics.trained_at).toLocaleString()}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
