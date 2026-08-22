import { motion } from 'framer-motion'
import WorkingPersonLogo from './WorkingPersonLogo'
import { fadeUp, stagger, useCountUp } from '../lib/motion'

function Stat({ value, suffix = '', label }) {
  const display = useCountUp(value, 1.4)
  return (
    <motion.div variants={fadeUp} className="text-center sm:text-left">
      <div className="font-mono text-2xl font-semibold text-white sm:text-3xl">
        {Math.round(display).toLocaleString()}
        {suffix}
      </div>
      <div className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">
        {label}
      </div>
    </motion.div>
  )
}

export default function Hero({ stats, onStart }) {
  return (
    <motion.header
      variants={stagger(0.09)}
      initial="hidden"
      animate="show"
      className="relative mx-auto max-w-5xl px-6 pt-20 pb-14 text-center sm:pt-28"
    >
      <motion.div variants={fadeUp} className="flex justify-center">
        <WorkingPersonLogo />
      </motion.div>

      <motion.p
        variants={fadeUp}
        className="mt-3 pl-[0.42em] text-sm font-bold uppercase tracking-[0.42em] text-transparent bg-gradient-to-r from-violet-300 to-cyan-300 bg-clip-text sm:text-base"
      >
        Career Nova
      </motion.p>

      <motion.h1
        variants={fadeUp}
        className="mt-4 text-balance text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-6xl"
      >
        <span className="text-gradient">Find the work</span>
        <br />
        <span className="text-white">your skills point to.</span>
      </motion.h1>

      <motion.p
        variants={fadeUp}
        className="mx-auto mt-6 max-w-2xl text-pretty text-base leading-relaxed text-slate-400 sm:text-lg"
      >
        Tick off the tools and skills you already have. A model trained on
        thousands of occupational skill profiles ranks the careers that fit,
        shows exactly what you are missing, and turns the gap into a roadmap.
      </motion.p>

      <motion.div variants={fadeUp} className="mt-9">
        <motion.button
          type="button"
          onClick={onStart}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 px-8 py-3.5 text-sm font-semibold text-ink-950 shadow-lg shadow-violet-900/40"
        >
          <span className="relative z-10">Build my profile</span>
          <motion.span
            className="relative z-10"
            animate={{ x: [0, 4, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          >
            →
          </motion.span>
          <span className="absolute inset-0 -translate-x-full bg-white/30 transition-transform duration-500 group-hover:translate-x-0" />
        </motion.button>
      </motion.div>

      {stats && (
        <motion.div
          variants={stagger(0.08, 0.2)}
          className="mx-auto mt-16 grid max-w-3xl grid-cols-2 gap-6 sm:grid-cols-4"
        >
          <Stat value={stats.careers_total} label="Careers" />
          <Stat value={stats.features} label="Skill signals" />
          <Stat value={stats.students} label="Training profiles" />
          <Stat value={stats.careers_trained} label="Modelled roles" />
        </motion.div>
      )}
    </motion.header>
  )
}
