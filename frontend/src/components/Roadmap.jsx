import { motion, useReducedMotion } from 'framer-motion'

const PHASE_TONE = {
  Foundations: 'from-rose-400 to-orange-300',
  'Core Tools': 'from-violet-400 to-fuchsia-300',
  Specialisation: 'from-cyan-400 to-lime-300',
}

export default function Roadmap({ steps }) {
  const reduced = useReducedMotion()

  if (steps.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        No gaps to close for this role — you already cover every listed
        requirement.
      </p>
    )
  }

  let lastPhase = null

  return (
    <div className="relative pl-8">
      {/* The spine draws itself downward as the steps appear. */}
      <motion.div
        className="absolute left-[11px] top-2 w-px bg-gradient-to-b from-violet-400/70 via-cyan-400/50 to-transparent"
        initial={{ height: 0 }}
        whileInView={{ height: 'calc(100% - 1rem)' }}
        viewport={{ once: true, amount: 0.1 }}
        transition={{ duration: reduced ? 0 : 1.1, ease: 'easeInOut' }}
      />

      <ol className="space-y-5">
        {steps.map((step, index) => {
          const newPhase = step.phase !== lastPhase
          lastPhase = step.phase

          return (
            <motion.li
              key={`${step.kind}-${step.skill}`}
              initial={{ opacity: 0, x: 18 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{
                delay: reduced ? 0 : index * 0.08,
                duration: 0.5,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="relative"
            >
              <motion.span
                className={`absolute -left-8 top-1 flex h-[22px] w-[22px] items-center justify-center rounded-full bg-gradient-to-br text-[10px] font-bold text-ink-950 ${
                  PHASE_TONE[step.phase] ?? 'from-slate-400 to-slate-300'
                }`}
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true }}
                transition={{
                  delay: reduced ? 0 : index * 0.08 + 0.15,
                  type: 'spring',
                  stiffness: 400,
                  damping: 20,
                }}
              >
                {step.order}
              </motion.span>

              {newPhase && (
                <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  {step.phase}
                </p>
              )}

              <div className="glass-soft p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h5 className="text-sm font-semibold text-white">
                    {step.skill}
                  </h5>
                  {step.hot && (
                    <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-semibold text-rose-300">
                      Hot
                    </span>
                  )}
                  {step.in_demand && (
                    <span className="rounded-full bg-lime-500/15 px-2 py-0.5 text-[10px] font-semibold text-lime-300">
                      In demand
                    </span>
                  )}
                </div>

                <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
                  {step.why}
                </p>

                {step.examples.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {step.examples.map((example) => (
                      <span
                        key={example}
                        className="rounded-md bg-white/[0.06] px-2 py-1 font-mono text-[11px] text-slate-300"
                      >
                        {example}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </motion.li>
          )
        })}
      </ol>
    </div>
  )
}
