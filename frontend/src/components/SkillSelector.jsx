import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { fadeUp, popIn, stagger } from '../lib/motion'
import { PRESETS } from '../lib/presets'

function Chip({ option, selected, onToggle, kind }) {
  return (
    <motion.button
      type="button"
      layout
      variants={popIn}
      onClick={() => onToggle(option.name)}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.96 }}
      aria-pressed={selected}
      className={`group relative overflow-hidden rounded-2xl border px-4 py-3 text-left transition-colors ${
        selected
          ? 'border-violet-400/60 bg-violet-500/15'
          : 'border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.07]'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className={`text-sm font-medium leading-snug ${
            selected ? 'text-white' : 'text-slate-300'
          }`}
        >
          {option.name}
        </span>
        <motion.span
          animate={{
            scale: selected ? 1 : 0.8,
            opacity: selected ? 1 : 0.25,
            rotate: selected ? 0 : -90,
          }}
          transition={{ type: 'spring', stiffness: 400, damping: 24 }}
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
            selected ? 'bg-violet-400 text-ink-950' : 'bg-white/10 text-slate-400'
          }`}
        >
          ✓
        </motion.span>
      </div>

      {kind === 'software' && option.examples?.length > 0 && (
        <p className="mt-1.5 truncate font-mono text-[11px] text-slate-500">
          {option.examples.slice(0, 3).join(' · ')}
        </p>
      )}

      <div className="mt-2 flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-wider text-slate-600">
          {option.reach} roles
        </span>
        {option.hot && (
          <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-semibold text-rose-300">
            Hot
          </span>
        )}
        {option.in_demand && (
          <span className="rounded-full bg-lime-500/15 px-2 py-0.5 text-[10px] font-semibold text-lime-300">
            In demand
          </span>
        )}
      </div>
    </motion.button>
  )
}

export default function SkillSelector({
  catalog,
  selectedSoftware,
  selectedEssential,
  onToggleSoftware,
  onToggleEssential,
  onApplyPreset,
  onClear,
  onSubmit,
  busy,
}) {
  const [tab, setTab] = useState('software')
  const [query, setQuery] = useState('')

  const options = tab === 'software' ? catalog.software : catalog.essential
  const selected = tab === 'software' ? selectedSoftware : selectedEssential
  const toggle = tab === 'software' ? onToggleSoftware : onToggleEssential

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return options
    return options.filter(
      (option) =>
        option.name.toLowerCase().includes(needle) ||
        option.examples?.some((example) =>
          example.toLowerCase().includes(needle),
        ),
    )
  }, [options, query])

  const totalSelected = selectedSoftware.size + selectedEssential.size
  const chosen = [
    ...[...selectedSoftware].map((name) => ({ name, kind: 'software' })),
    ...[...selectedEssential].map((name) => ({ name, kind: 'essential' })),
  ]

  return (
    <motion.section
      variants={stagger(0.08)}
      initial="hidden"
      animate="show"
      className="mx-auto mt-12 max-w-5xl px-4 pb-24 sm:px-6"
    >
      <motion.div variants={fadeUp} className="glass p-5 sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white sm:text-2xl">
              What can you already do?
            </h2>
            <p className="mt-1.5 text-sm text-slate-400">
              Pick everything that applies. The more you select, the sharper the
              match.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-3xl font-bold text-violet-300">
              {totalSelected}
            </span>
            <span className="text-xs uppercase tracking-wider text-slate-500">
              selected
            </span>
          </div>
        </div>

        <motion.div variants={fadeUp} className="mt-6">
          <p className="mb-2 text-xs uppercase tracking-[0.16em] text-slate-500">
            Quick start
          </p>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((preset) => (
              <motion.button
                key={preset.label}
                type="button"
                onClick={() => onApplyPreset(preset)}
                whileHover={{ scale: 1.05, y: -1 }}
                whileTap={{ scale: 0.96 }}
                className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-xs font-medium text-slate-300 hover:border-violet-400/50 hover:text-white"
              >
                {preset.icon} {preset.label}
              </motion.button>
            ))}
            {totalSelected > 0 && (
              <motion.button
                type="button"
                onClick={onClear}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                whileTap={{ scale: 0.96 }}
                className="rounded-full border border-rose-400/25 bg-rose-500/10 px-4 py-1.5 text-xs font-medium text-rose-300 hover:bg-rose-500/20"
              >
                Clear all
              </motion.button>
            )}
          </div>
        </motion.div>

        <AnimatePresence initial={false}>
          {chosen.length > 0 && (
            <motion.div
              layout
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-6 overflow-hidden"
            >
              <div className="flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-ink-900/60 p-3">
                <AnimatePresence mode="popLayout">
                  {chosen.map((item) => (
                    <motion.button
                      key={`${item.kind}-${item.name}`}
                      layout
                      layoutId={`chip-${item.kind}-${item.name}`}
                      variants={popIn}
                      initial="hidden"
                      animate="show"
                      exit="exit"
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.94 }}
                      onClick={() =>
                        item.kind === 'software'
                          ? onToggleSoftware(item.name)
                          : onToggleEssential(item.name)
                      }
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${
                        item.kind === 'software'
                          ? 'bg-violet-500/20 text-violet-200'
                          : 'bg-cyan-500/20 text-cyan-200'
                      }`}
                    >
                      {item.name}
                      <span className="opacity-60">×</span>
                    </motion.button>
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          variants={fadeUp}
          className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center"
        >
          <div className="relative flex w-full shrink-0 rounded-full border border-white/10 bg-white/[0.03] p-1 sm:w-auto">
            {[
              {
                id: 'software',
                short: `Tools (${catalog.software.length})`,
                label: `Tools & software (${catalog.software.length})`,
              },
              {
                id: 'essential',
                short: `Core (${catalog.essential.length})`,
                label: `Core skills (${catalog.essential.length})`,
              },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setTab(item.id)
                  setQuery('')
                }}
                className="relative flex-1 whitespace-nowrap rounded-full px-3 py-2 text-xs font-semibold transition-colors sm:flex-none sm:px-4"
              >
                {tab === item.id && (
                  <motion.span
                    layoutId="tab-pill"
                    className="absolute inset-0 rounded-full bg-gradient-to-r from-violet-500 to-cyan-400"
                    transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                  />
                )}
                <span
                  className={`relative z-10 ${
                    tab === item.id ? 'text-ink-950' : 'text-slate-400'
                  }`}
                >
                  <span className="sm:hidden">{item.short}</span>
                  <span className="hidden sm:inline">{item.label}</span>
                </span>
              </button>
            ))}
          </div>

          {tab === 'software' && (
            <div className="relative flex-1">
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search tools, e.g. Excel, Python, Figma…"
                className="w-full rounded-full border border-white/10 bg-white/[0.03] py-2.5 pl-11 pr-4 text-sm text-white placeholder:text-slate-500 focus:border-violet-400/50 focus:outline-none"
              />
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                ⌕
              </span>
            </div>
          )}
        </motion.div>

        <div className="scroll-slim mt-5 max-h-[26rem] overflow-y-auto pr-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={tab + query}
              variants={stagger(0.015)}
              initial="hidden"
              animate="show"
              exit={{ opacity: 0, transition: { duration: 0.12 } }}
              className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3"
            >
              {visible.map((option) => (
                <Chip
                  key={option.name}
                  option={option}
                  kind={tab}
                  selected={selected.has(option.name)}
                  onToggle={toggle}
                />
              ))}
            </motion.div>
          </AnimatePresence>

          {visible.length === 0 && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-12 text-center text-sm text-slate-500"
            >
              Nothing matches “{query}”. Try a broader term.
            </motion.p>
          )}
        </div>
      </motion.div>

      <motion.div variants={fadeUp} className="mt-8 flex justify-center">
        <motion.button
          type="button"
          disabled={totalSelected === 0 || busy}
          onClick={onSubmit}
          whileHover={totalSelected > 0 ? { scale: 1.04 } : undefined}
          whileTap={totalSelected > 0 ? { scale: 0.97 } : undefined}
          className="inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 px-9 py-4 text-sm font-bold text-ink-950 shadow-xl shadow-violet-900/30 disabled:cursor-not-allowed disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-500 disabled:shadow-none"
        >
          {busy ? 'Matching…' : 'Show my career matches'}
          {totalSelected > 0 && !busy && (
            <span className="rounded-full bg-ink-950/20 px-2.5 py-0.5 font-mono text-xs">
              {totalSelected}
            </span>
          )}
        </motion.button>
      </motion.div>
    </motion.section>
  )
}
