import { motion, useReducedMotion } from 'framer-motion'

const SPARKS = [
  { cx: 152, cy: 62, r: 3, delay: 0 },
  { cx: 166, cy: 84, r: 2.2, delay: 1 },
  { cx: 142, cy: 44, r: 2.4, delay: 1.9 },
]

const BARS = [
  { x: 47, height: 15, delay: 0 },
  { x: 59, height: 26, delay: 0.25 },
  { x: 71, height: 10, delay: 0.5 },
]

const BAR_BASE = 77

export default function WorkingPersonLogo({ size = 148 }) {
  const reduced = useReducedMotion()
  const loop = (definition) => (reduced ? undefined : definition)

  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      role="img"
      aria-label="Illustration of a person working at a laptop"
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
    >
      <defs>
        <linearGradient id="logo-ring" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#22d3ee" />
        </linearGradient>
        <linearGradient id="logo-shirt" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#6d28d9" />
        </linearGradient>
        <linearGradient id="logo-surface" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1e2148" />
          <stop offset="100%" stopColor="#0d1030" />
        </linearGradient>
      </defs>

      {/* Badge surface, so the darker illustration details stay readable */}
      <circle
        cx="100"
        cy="100"
        r="84"
        fill="url(#logo-surface)"
        stroke="rgba(255,255,255,0.14)"
        strokeWidth="1.5"
      />

      <motion.circle
        cx="100"
        cy="100"
        r="93"
        stroke="url(#logo-ring)"
        strokeWidth="2"
        strokeDasharray="12 16"
        strokeLinecap="round"
        opacity="0.7"
        style={{ originX: '100px', originY: '100px' }}
        animate={loop({ rotate: 360 })}
        transition={{ duration: 26, repeat: Infinity, ease: 'linear' }}
      />

      {/* Floating dashboard the person is working on */}
      <motion.g
        animate={loop({ y: [0, -4, 0] })}
        transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut' }}
      >
        <rect
          x="36"
          y="38"
          width="50"
          height="46"
          rx="8"
          fill="#0b1030"
          stroke="#5b6ba8"
          strokeWidth="2"
        />
        <rect x="44" y="46" width="20" height="3.5" rx="1.75" fill="#64748b" />
        {BARS.map((bar) => (
          <motion.rect
            key={bar.x}
            x={bar.x}
            width="7"
            rx="3.5"
            fill="url(#logo-ring)"
            y={BAR_BASE - bar.height}
            height={bar.height}
            style={{ originY: `${BAR_BASE}px` }}
            animate={loop({ scaleY: [0.4, 1, 0.65, 1] })}
            transition={{
              duration: 2.6,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: bar.delay,
            }}
          />
        ))}
      </motion.g>

      {!reduced &&
        SPARKS.map((spark) => (
          <motion.circle
            key={`${spark.cx}-${spark.cy}`}
            cx={spark.cx}
            cy={spark.cy}
            r={spark.r}
            fill="#22d3ee"
            animate={{
              y: [0, -14, -24],
              opacity: [0, 0.95, 0],
              scale: [0.6, 1, 0.5],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              delay: spark.delay,
              ease: 'easeOut',
            }}
          />
        ))}

      {/* Person */}
      <motion.g
        animate={loop({ y: [0, -3, 0] })}
        transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <path
          d="M60 152c0-23 18-40 40-40s40 17 40 40z"
          fill="url(#logo-shirt)"
        />
        <path
          d="M66 136c-8 6-11 12-12 18"
          stroke="#8b5cf6"
          strokeWidth="11"
          strokeLinecap="round"
        />
        <path
          d="M134 136c8 6 11 12 12 18"
          stroke="#8b5cf6"
          strokeWidth="11"
          strokeLinecap="round"
        />

        <motion.g
          animate={loop({ rotate: [-2, 2, -2] })}
          transition={{ duration: 4.4, repeat: Infinity, ease: 'easeInOut' }}
          style={{ originX: '100px', originY: '112px' }}
        >
          <rect x="92" y="98" width="16" height="16" rx="6" fill="#cbd5e1" />
          {/* Hair is a slightly larger disc behind an offset face disc, which
              leaves a clean crescent without hand-tuned arc maths. */}
          <circle cx="100" cy="78" r="24" fill="#5b3fb8" />
          <circle cx="100" cy="83" r="21" fill="#e8eef7" />
          <circle cx="92" cy="82" r="2.6" fill="#1e293b" />
          <circle cx="108" cy="82" r="2.6" fill="#1e293b" />
          <path
            d="M94 91q6 5 12 0"
            stroke="#1e293b"
            strokeWidth="2.2"
            strokeLinecap="round"
            fill="none"
          />
        </motion.g>
      </motion.g>

      {/* Desk */}
      <rect x="26" y="164" width="148" height="9" rx="4.5" fill="#5b6ba8" />

      {/* Laptop */}
      <rect x="54" y="152" width="92" height="12" rx="5" fill="#3b4676" />
      <rect x="64" y="157" width="72" height="3" rx="1.5" fill="#8ea0d8" />

      <motion.circle
        cx="72"
        cy="149"
        r="7.5"
        fill="#e8eef7"
        animate={loop({ y: [0, -4, 0] })}
        transition={{ duration: 0.5, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.circle
        cx="128"
        cy="149"
        r="7.5"
        fill="#e8eef7"
        animate={loop({ y: [0, -4, 0] })}
        transition={{
          duration: 0.5,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 0.25,
        }}
      />

      {/* Coffee, because this is what working looks like */}
      <rect x="150" y="150" width="15" height="14" rx="2.5" fill="#94a3b8" />
      <path
        d="M165 153h4a3.5 3.5 0 0 1 0 7h-4z"
        fill="none"
        stroke="#94a3b8"
        strokeWidth="2"
      />
      {!reduced && (
        <motion.path
          d="M157 145c-2.5-4 2.5-6 0-10"
          stroke="#94a3b8"
          strokeWidth="2"
          strokeLinecap="round"
          animate={{ opacity: [0, 0.85, 0], y: [0, -6, -11] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut' }}
        />
      )}
    </motion.svg>
  )
}
