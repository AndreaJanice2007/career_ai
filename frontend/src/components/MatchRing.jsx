import { motion } from 'framer-motion'
import { useCountUp } from '../lib/motion'

export default function MatchRing({
  value,
  size = 72,
  stroke = 6,
  gradientId = 'ring-gradient',
  label,
}) {
  const radius = (size - stroke) / 2
  const display = useCountUp(value)

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${label ?? 'Match'}: ${Math.round(value)} percent`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: Math.min(1, Math.max(0, value / 100)) }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-mono font-bold text-white"
          style={{ fontSize: size / 4.5 }}
        >
          {Math.round(display)}
        </span>
        <span
          className="text-slate-500"
          style={{ fontSize: size / 9 }}
        >
          %
        </span>
      </div>
    </div>
  )
}
