import { motion } from 'framer-motion'
import { useCountUp } from '../lib/motion'

const RADIUS = 88
const CIRCUMFERENCE = Math.PI * RADIUS

function verdict(value) {
  if (value >= 70) return { text: 'Nearly there', tone: 'text-lime-300' }
  if (value >= 45) return { text: 'Solid base', tone: 'text-cyan-300' }
  if (value >= 20) return { text: 'Getting started', tone: 'text-violet-300' }
  return { text: 'Early days', tone: 'text-rose-300' }
}

export default function ReadinessGauge({ value, matched, total }) {
  const display = useCountUp(value, 1.3)
  const { text, tone } = verdict(value)

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <svg width={RADIUS * 2 + 20} height={RADIUS + 30}>
          <defs>
            <linearGradient id="gauge-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#fb7185" />
              <stop offset="50%" stopColor="#a78bfa" />
              <stop offset="100%" stopColor="#a3e635" />
            </linearGradient>
          </defs>

          <path
            d={`M 10 ${RADIUS + 10} A ${RADIUS} ${RADIUS} 0 0 1 ${RADIUS * 2 + 10} ${RADIUS + 10}`}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="14"
            strokeLinecap="round"
          />
          <motion.path
            d={`M 10 ${RADIUS + 10} A ${RADIUS} ${RADIUS} 0 0 1 ${RADIUS * 2 + 10} ${RADIUS + 10}`}
            fill="none"
            stroke="url(#gauge-gradient)"
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            initial={{ strokeDashoffset: CIRCUMFERENCE }}
            animate={{
              strokeDashoffset: CIRCUMFERENCE * (1 - Math.min(1, value / 100)),
            }}
            transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
          />
        </svg>

        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center">
          <span className="font-mono text-4xl font-bold text-white">
            {display.toFixed(0)}
            <span className="text-xl text-slate-500">%</span>
          </span>
          <span className={`mt-0.5 text-sm font-semibold ${tone}`}>{text}</span>
        </div>
      </div>

      <p className="mt-3 text-center text-xs text-slate-500">
        You hold{' '}
        <span className="font-mono text-slate-300">
          {matched}/{total}
        </span>{' '}
        of the skills this role calls for
      </p>
    </div>
  )
}
