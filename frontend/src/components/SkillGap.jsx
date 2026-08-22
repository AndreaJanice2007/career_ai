import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { stagger } from '../lib/motion'

const COLLAPSED = 8

function Column({ title, subtitle, items, tone, icon }) {
  const [expanded, setExpanded] = useState(false)
  const visible = expanded ? items : items.slice(0, COLLAPSED)
  const hidden = items.length - visible.length

  return (
    <div className="glass-soft p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h4 className="text-sm font-bold text-white">{title}</h4>
        <span className={`font-mono text-lg font-bold ${tone.count}`}>
          {items.length}
        </span>
      </div>
      <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>

      {items.length === 0 ? (
        <p className="mt-4 text-sm text-slate-600">Nothing here.</p>
      ) : (
        <>
          <motion.ul
            variants={stagger(0.035)}
            initial="hidden"
            animate="show"
            className="mt-4 space-y-1.5"
          >
            <AnimatePresence initial={false}>
              {visible.map((skill) => (
                <motion.li
                  key={skill}
                  layout
                  variants={{
                    hidden: { opacity: 0, x: -12 },
                    show: { opacity: 1, x: 0 },
                  }}
                  exit={{ opacity: 0, x: -12 }}
                  className="flex items-start gap-2.5 text-sm"
                >
                  <span
                    className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${tone.badge}`}
                  >
                    {icon}
                  </span>
                  <span className="leading-snug text-slate-300">{skill}</span>
                </motion.li>
              ))}
            </AnimatePresence>
          </motion.ul>

          {(hidden > 0 || expanded) && (
            <button
              type="button"
              onClick={() => setExpanded((value) => !value)}
              className="mt-3 text-xs font-semibold text-violet-300 hover:text-violet-200"
            >
              {expanded ? 'Show less' : `Show ${hidden} more`}
            </button>
          )}
        </>
      )}
    </div>
  )
}

export default function SkillGap({ matched, missing }) {
  const have = [...matched.essential, ...matched.software]
  const need = [...missing.essential, ...missing.software]

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Column
        title="Skills you have"
        subtitle="Already matching this role's requirements"
        items={have}
        icon="✓"
        tone={{ badge: 'bg-lime-400/20 text-lime-300', count: 'text-lime-300' }}
      />
      <Column
        title="Skills you need"
        subtitle="The gap between you and this role"
        items={need}
        icon="→"
        tone={{ badge: 'bg-rose-400/20 text-rose-300', count: 'text-rose-300' }}
      />
    </div>
  )
}
