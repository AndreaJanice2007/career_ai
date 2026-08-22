import { AnimatePresence, motion } from 'framer-motion'
import CareerCard from './CareerCard'
import ModelPanel from './ModelPanel'
import ReadinessGauge from './ReadinessGauge'
import Roadmap from './Roadmap'
import SkillGap from './SkillGap'
import { fadeUp, stagger } from '../lib/motion'

function DetailSkeleton() {
  return (
    <div className="space-y-4">
      {[0, 1, 2].map((row) => (
        <div
          key={row}
          className="shimmer relative h-24 overflow-hidden rounded-2xl bg-white/[0.04]"
        />
      ))}
    </div>
  )
}

function DoneBar({ analysis, savedRecord, onDone, onViewPaths }) {
  return (
    <motion.div
      variants={fadeUp}
      className="glass mt-8 flex flex-wrap items-center justify-between gap-5 p-6 sm:p-7"
    >
      <AnimatePresence mode="wait" initial={false}>
        {savedRecord ? (
          <motion.div
            key="saved"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-3"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300">
              ✓
            </span>
            <div>
              <p className="text-sm font-bold text-white">
                Saved to your account
              </p>
              <p className="mt-0.5 text-xs text-slate-400">
                {savedRecord.career} · {Math.round(savedRecord.readiness)}%
                ready · {savedRecord.next_steps.length} next steps
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="prompt"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <p className="text-sm font-bold text-white">
              Happy with this path?
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Press Done to finish and keep{' '}
              {analysis?.career.title ?? 'your plan'} in your account.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={savedRecord ? onViewPaths : onDone}
        disabled={!analysis}
        whileHover={{ scale: analysis ? 1.04 : 1 }}
        whileTap={{ scale: analysis ? 0.96 : 1 }}
        className={
          savedRecord
            ? 'rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-slate-200 hover:border-violet-400/50 hover:text-white'
            : 'rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-900/40 disabled:opacity-50'
        }
      >
        {savedRecord ? 'View my paths' : 'Done'}
      </motion.button>
    </motion.div>
  )
}

export default function ResultsPanel({
  recommendations,
  analysis,
  analysisLoading,
  selectedCareer,
  onSelectCareer,
  onRestart,
  onDone,
  onViewPaths,
  savedRecord,
  metrics,
  skillsUsed,
}) {
  const matchedCount = analysis
    ? analysis.matched.software.length + analysis.matched.essential.length
    : 0
  const totalCount = analysis
    ? matchedCount +
      analysis.missing.software.length +
      analysis.missing.essential.length
    : 0

  return (
    <motion.section
      variants={stagger(0.08)}
      initial="hidden"
      animate="show"
      className="mx-auto max-w-6xl px-4 pb-24 sm:px-6"
    >
      <motion.div
        variants={fadeUp}
        className="flex flex-wrap items-end justify-between gap-4 pt-10"
      >
        <div>
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            Your strongest career matches
          </h2>
          <p className="mt-1.5 text-sm text-slate-400">
            Ranked from the {skillsUsed} skill
            {skillsUsed === 1 ? '' : 's'} you selected. Tap any card to break it
            down.
          </p>
        </div>
        <motion.button
          type="button"
          onClick={onRestart}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          className="rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-xs font-semibold text-slate-200 hover:border-violet-400/50 hover:text-white"
        >
          ← Edit my skills
        </motion.button>
      </motion.div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.05fr_1fr]">
        <div className="space-y-3.5">
          {recommendations.map((career, index) => (
            <CareerCard
              key={career.code}
              career={career}
              rank={index}
              active={career.title === selectedCareer}
              onSelect={onSelectCareer}
            />
          ))}
        </div>

        {/* Offset clears the sticky account bar above. */}
        <div className="lg:sticky lg:top-20 lg:self-start">
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedCareer}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="glass p-6 sm:p-7"
            >
              {analysisLoading || !analysis ? (
                <DetailSkeleton />
              ) : (
                <>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                    Career readiness
                  </p>
                  <h3 className="mt-1 text-pretty text-lg font-bold text-white">
                    {analysis.career.title}
                  </h3>

                  <div className="mt-5">
                    <ReadinessGauge
                      value={analysis.readiness}
                      matched={matchedCount}
                      total={totalCount}
                    />
                  </div>

                  <p className="mt-5 text-sm leading-relaxed text-slate-400">
                    {analysis.career.description}
                  </p>

                  <div className="mt-7">
                    <h4 className="mb-3 text-sm font-bold text-white">
                      Skill gap analysis
                    </h4>
                    <SkillGap
                      matched={analysis.matched}
                      missing={analysis.missing}
                    />
                  </div>

                  <div className="mt-8">
                    <h4 className="mb-1 text-sm font-bold text-white">
                      Your learning roadmap
                    </h4>
                    <p className="mb-5 text-xs text-slate-500">
                      Ordered from what underpins any job, to what is broadly
                      transferable, to what makes this role distinct.
                    </p>
                    <Roadmap steps={analysis.roadmap} />
                  </div>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <DoneBar
        analysis={analysis}
        savedRecord={savedRecord}
        onDone={onDone}
        onViewPaths={onViewPaths}
      />

      <ModelPanel metrics={metrics} />
    </motion.section>
  )
}
