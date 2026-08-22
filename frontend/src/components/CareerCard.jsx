import { motion } from 'framer-motion'
import MatchRing from './MatchRing'

const INTEREST_TONE = {
  Realistic: 'bg-amber-500/15 text-amber-200',
  Investigative: 'bg-cyan-500/15 text-cyan-200',
  Artistic: 'bg-fuchsia-500/15 text-fuchsia-200',
  Social: 'bg-lime-500/15 text-lime-200',
  Enterprising: 'bg-orange-500/15 text-orange-200',
  Conventional: 'bg-sky-500/15 text-sky-200',
}

export default function CareerCard({ career, rank, active, onSelect }) {
  return (
    <motion.button
      type="button"
      layout
      onClick={() => onSelect(career.title)}
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: rank * 0.09,
        duration: 0.55,
        ease: [0.16, 1, 0.3, 1],
      }}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.99 }}
      aria-pressed={active}
      className={`group relative w-full overflow-hidden rounded-3xl border p-5 text-left transition-colors sm:p-6 ${
        active
          ? 'border-violet-400/60 bg-violet-500/10'
          : 'border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.06]'
      }`}
    >
      {active && (
        <motion.span
          layoutId="active-career-glow"
          className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-inset ring-violet-400/40"
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        />
      )}

      <div className="flex items-start gap-4 sm:gap-5">
        <div className="flex flex-col items-center gap-2">
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-full font-mono text-xs font-bold ${
              rank === 0
                ? 'bg-gradient-to-br from-violet-400 to-cyan-300 text-ink-950'
                : 'bg-white/10 text-slate-400'
            }`}
          >
            {rank + 1}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="text-pretty text-base font-bold leading-snug text-white sm:text-lg">
            {career.title}
          </h3>
          <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-slate-400">
            {career.description}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {career.interests.slice(0, 3).map((interest) => (
              <span
                key={interest}
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                  INTEREST_TONE[interest] ?? 'bg-white/10 text-slate-300'
                }`}
              >
                {interest}
              </span>
            ))}
            <span className="font-mono text-[11px] text-slate-600">
              {career.required_software} tools · {career.required_essential} core
              skills
            </span>
          </div>
        </div>

        <div className="flex flex-col items-center gap-1">
          <MatchRing
            value={career.match}
            gradientId={`ring-${career.code}`}
            label={`Match for ${career.title}`}
          />
          <span className="text-[10px] uppercase tracking-wider text-slate-500">
            match
          </span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 border-t border-white/5 pt-3">
        {[
          { label: 'Skill fit', value: career.fit },
          { label: 'Readiness', value: career.readiness },
          { label: 'Model conf.', value: career.confidence },
        ].map((metric) => (
          <div key={metric.label}>
            <div className="mb-1 flex items-baseline justify-between">
              <span className="text-[10px] uppercase tracking-wider text-slate-500">
                {metric.label}
              </span>
              <span className="font-mono text-[11px] text-slate-300">
                {metric.value.toFixed(1)}%
              </span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-white/8">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-violet-400 to-cyan-300"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: Math.min(1, metric.value / 100) }}
                transition={{
                  delay: rank * 0.09 + 0.3,
                  duration: 0.8,
                  ease: [0.16, 1, 0.3, 1],
                }}
                style={{ originX: 0 }}
              />
            </div>
          </div>
        ))}
      </div>
    </motion.button>
  )
}
