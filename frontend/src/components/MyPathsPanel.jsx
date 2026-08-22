import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import MatchRing from './MatchRing'
import { fadeUp, stagger } from '../lib/motion'

function formatDate(iso) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function SkillRow({ label, items }) {
  if (!items.length) return null
  return (
    <div className="mt-3">
      <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {items.map((item) => (
          <span
            key={item}
            className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-slate-300"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}

function PathCard({ record, onDelete, busy }) {
  const [open, setOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    if (!confirming) return undefined
    // A confirm prompt left sitting there should not stay armed.
    const timer = setTimeout(() => setConfirming(false), 5000)
    return () => clearTimeout(timer)
  }, [confirming])

  return (
    <motion.article
      variants={fadeUp}
      layout
      exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.2 } }}
      className="glass overflow-hidden p-5 sm:p-6"
    >
      <div className="flex items-start gap-3 sm:gap-4">
        <MatchRing
          value={record.readiness}
          gradientId={`saved-ring-${record.id}`}
          size={56}
          label="ready"
        />

        <div className="min-w-0 flex-1">
          <h3 className="text-pretty text-base font-bold text-white">
            {record.career}
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            Saved {formatDate(record.saved_at)} · {Math.round(record.match)}%
            match
          </p>
          <p className="mt-2 text-xs text-slate-500">
            {record.software_skills.length + record.essential_skills.length}{' '}
            skills recorded · {record.next_steps.length} next steps
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="rounded-full border border-white/12 px-4 py-1.5 text-[11px] font-semibold text-slate-300 hover:border-violet-400/50 hover:text-white"
          >
            {open ? 'Hide' : 'View'}
          </button>

          <AnimatePresence mode="wait" initial={false}>
            {confirming ? (
              <motion.div
                key="confirm"
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2"
              >
                <button
                  type="button"
                  onClick={() => onDelete(record.id)}
                  disabled={busy}
                  className="rounded-full bg-rose-500/20 px-3 py-1 text-[11px] font-semibold text-rose-200 hover:bg-rose-500/30 disabled:opacity-50"
                >
                  {busy ? 'Deleting…' : 'Confirm'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  className="text-[11px] font-semibold text-slate-500 hover:text-slate-300"
                >
                  Cancel
                </button>
              </motion.div>
            ) : (
              <motion.button
                key="delete"
                type="button"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setConfirming(true)}
                className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 hover:text-rose-300"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-3.5 w-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  aria-hidden
                >
                  <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12h10l1-12M9 7V4h6v3" />
                </svg>
                Delete
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-5 border-t border-white/8 pt-4">
              {record.next_steps.length > 0 && (
                <div>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
                    Learning roadmap
                  </p>
                  <ol className="mt-2 space-y-1.5">
                    {record.next_steps.map((step, index) => (
                      <li
                        key={step}
                        className="flex items-center gap-3 text-sm text-slate-300"
                      >
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-500/15 font-mono text-[10px] text-violet-200">
                          {index + 1}
                        </span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
              <SkillRow label="Software" items={record.software_skills} />
              <SkillRow label="Essential skills" items={record.essential_skills} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  )
}

export default function MyPathsPanel({
  paths,
  loading,
  busyId,
  onDelete,
  onStartNew,
}) {
  return (
    <motion.section
      variants={stagger(0.07)}
      initial="hidden"
      animate="show"
      className="mx-auto max-w-4xl px-4 pb-24 pt-10 sm:px-6"
    >
      <motion.div variants={fadeUp}>
        <h2 className="text-2xl font-bold text-white sm:text-3xl">My paths</h2>
        <p className="mt-1.5 text-sm text-slate-400">
          Every career path you have saved, with the skills and next steps you
          had at the time.
        </p>
      </motion.div>

      {loading ? (
        <div className="mt-8 space-y-4">
          {[0, 1, 2].map((row) => (
            <div
              key={row}
              className="shimmer relative h-28 overflow-hidden rounded-3xl bg-white/[0.04]"
            />
          ))}
        </div>
      ) : paths.length === 0 ? (
        <motion.div
          variants={fadeUp}
          className="glass mt-8 p-10 text-center"
        >
          <motion.div
            className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-violet-500/15 text-2xl"
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            ✦
          </motion.div>
          <h3 className="mt-4 text-lg font-bold text-white">
            Nothing saved yet
          </h3>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-400">
            Pick your skills, run a match, and press Done at the end to keep the
            path here.
          </p>
          <motion.button
            type="button"
            onClick={onStartNew}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            className="mt-6 rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 px-7 py-3 text-sm font-semibold text-ink-950"
          >
            Find my career match
          </motion.button>
        </motion.div>
      ) : (
        <motion.div variants={stagger(0.06)} className="mt-8 space-y-4">
          <AnimatePresence initial={false}>
            {paths.map((record) => (
              <PathCard
                key={record.id}
                record={record}
                onDelete={onDelete}
                busy={busyId === record.id}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </motion.section>
  )
}
