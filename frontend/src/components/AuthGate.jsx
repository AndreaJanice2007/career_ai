import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import WorkingPersonLogo from './WorkingPersonLogo'
import { fadeUp, stagger } from '../lib/motion'
import * as api from '../api'

const MODES = [
  { id: 'login', label: 'Sign in' },
  { id: 'register', label: 'Create account' },
]

const PERKS = [
  'Match your skills against 1,000+ occupations',
  'See exactly which skills you are missing',
  'Keep every career path you save in one place',
]

function EyeIcon({ off }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4.5 w-4.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
      {off && <path d="M4 20 20 4" />}
    </svg>
  )
}

export default function AuthGate({ onSubmit }) {
  const [mode, setMode] = useState('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [availability, setAvailability] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const usernameRef = useRef(null)

  useEffect(() => {
    const focus = setTimeout(() => usernameRef.current?.focus(), 350)
    return () => clearTimeout(focus)
  }, [])

  // While creating an account, check the name against the server as they type
  // so a taken username is obvious before they submit.
  useEffect(() => {
    const candidate = username.trim()
    if (mode !== 'register' || candidate.length < 3) {
      setAvailability(null)
      return undefined
    }

    let cancelled = false
    setAvailability({ state: 'checking' })
    const timer = setTimeout(() => {
      api
        .checkUsername(candidate)
        .then((result) => {
          if (cancelled || result.username !== candidate) return
          setAvailability({
            state: result.available ? 'free' : 'taken',
            reason: result.reason,
          })
        })
        .catch(() => {
          if (!cancelled) setAvailability(null)
        })
    }, 400)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [username, mode])

  const switchMode = (next) => {
    if (next === mode) return
    setMode(next)
    setError(null)
    setAvailability(null)
  }

  const taken = mode === 'register' && availability?.state === 'taken'

  const submit = async (event) => {
    event.preventDefault()
    if (!username.trim() || !password) {
      setError('Enter a username and password to continue.')
      return
    }
    if (taken) {
      setError(availability.reason)
      return
    }

    setBusy(true)
    setError(null)
    try {
      await onSubmit(mode, { username: username.trim(), password })
    } catch (problem) {
      setError(problem.message)
      setBusy(false)
    }
  }

  const field =
    'mt-2 w-full rounded-xl border border-white/12 bg-ink-900/70 px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-violet-400/60 focus:outline-none focus:ring-2 focus:ring-violet-500/25'

  return (
    <div className="relative flex min-h-dvh items-center justify-center px-5 py-10 sm:px-6 sm:py-14">
      <motion.div
        variants={stagger(0.1)}
        initial="hidden"
        animate="show"
        className="grid w-full max-w-5xl items-center gap-8 sm:gap-12 lg:grid-cols-[1fr_minmax(0,420px)]"
      >
        <motion.div variants={fadeUp} className="text-center lg:text-left">
          <div className="flex justify-center lg:justify-start">
            <span className="scale-90 sm:scale-100">
              <WorkingPersonLogo size={128} />
            </span>
          </div>
          <p className="mt-3 pl-[0.42em] text-sm font-bold uppercase tracking-[0.42em] text-transparent bg-gradient-to-r from-violet-300 to-cyan-300 bg-clip-text">
            Career Nova
          </p>
          <h1 className="mt-4 text-balance text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
            <span className="text-gradient">Your skills,</span>{' '}
            <span className="text-white">mapped to a career.</span>
          </h1>
          {/* Decorative on a phone, where the form should be reachable without
              scrolling past a sales pitch. */}
          <ul className="mx-auto mt-7 hidden max-w-md space-y-3 text-left sm:block lg:mx-0">
            {PERKS.map((perk, index) => (
              <motion.li
                key={perk}
                initial={{ opacity: 0, x: -14 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + index * 0.12, duration: 0.5 }}
                className="flex items-start gap-3 text-sm text-slate-400"
              >
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-[11px] text-violet-200">
                  ✓
                </span>
                {perk}
              </motion.li>
            ))}
          </ul>
        </motion.div>

        <motion.div
          variants={fadeUp}
          className="glass relative overflow-hidden p-6 sm:p-8"
        >
          <motion.div
            aria-hidden
            className="pointer-events-none absolute -left-20 -top-20 h-48 w-48 rounded-full bg-cyan-500/20 blur-3xl"
            animate={{ opacity: [0.45, 0.8, 0.45] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          />

          <div className="relative flex gap-1 rounded-full border border-white/10 bg-white/[0.04] p-1">
            {MODES.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => switchMode(item.id)}
                className="relative flex-1 rounded-full px-4 py-2 text-xs font-semibold"
              >
                {mode === item.id && (
                  <motion.span
                    layoutId="auth-tab"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    className="absolute inset-0 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
                  />
                )}
                <span
                  className={
                    mode === item.id
                      ? 'relative z-10 text-white'
                      : 'relative z-10 text-slate-400'
                  }
                >
                  {item.label}
                </span>
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="relative mt-6">
            <AnimatePresence mode="wait">
              <motion.p
                key={mode}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22 }}
                className="text-sm leading-relaxed text-slate-400"
              >
                {mode === 'login'
                  ? 'Welcome back. Sign in to pick up your saved career paths.'
                  : 'First time here? Create an account and your saved paths stay with you.'}
              </motion.p>
            </AnimatePresence>

            <label
              htmlFor="auth-username"
              className="mt-6 block text-xs font-semibold text-slate-300"
            >
              Username
            </label>
            <input
              id="auth-username"
              ref={usernameRef}
              value={username}
              onChange={(event) => {
                setUsername(event.target.value)
                if (error) setError(null)
              }}
              autoComplete="username"
              maxLength={32}
              placeholder="andrea"
              className={
                taken ? `${field} border-rose-400/60 focus:border-rose-400` : field
              }
            />

            <AnimatePresence mode="wait">
              {availability && (
                <motion.p
                  key={availability.state}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={
                    availability.state === 'taken'
                      ? 'mt-2 text-xs text-rose-300'
                      : availability.state === 'free'
                        ? 'mt-2 text-xs text-emerald-300'
                        : 'mt-2 text-xs text-slate-500'
                  }
                >
                  {availability.state === 'checking'
                    ? 'Checking availability…'
                    : availability.state === 'free'
                      ? `“${username.trim()}” is available`
                      : availability.reason}
                </motion.p>
              )}
            </AnimatePresence>

            <label
              htmlFor="auth-password"
              className="mt-5 block text-xs font-semibold text-slate-300"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="auth-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value)
                  if (error) setError(null)
                }}
                autoComplete={
                  mode === 'login' ? 'current-password' : 'new-password'
                }
                maxLength={128}
                placeholder={
                  mode === 'login' ? 'Your password' : 'At least 6 characters'
                }
                className={`${field} pr-12`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                title={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-1.5 top-1/2 mt-1 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 hover:bg-white/5 hover:text-slate-200"
              >
                <EyeIcon off={showPassword} />
              </button>
            </div>

            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-4 rounded-xl border border-rose-400/25 bg-rose-950/40 px-4 py-3 text-xs leading-relaxed text-rose-200"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <motion.button
              type="submit"
              disabled={busy || taken}
              whileHover={{ scale: busy || taken ? 1 : 1.02 }}
              whileTap={{ scale: busy || taken ? 1 : 0.98 }}
              className="mt-7 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 px-6 py-3.5 text-sm font-semibold text-ink-950 shadow-lg shadow-violet-900/40 disabled:opacity-70"
            >
              {busy ? (
                <>
                  <motion.span
                    className="h-3.5 w-3.5 rounded-full border-2 border-ink-950/30 border-t-ink-950"
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 0.8,
                      repeat: Infinity,
                      ease: 'linear',
                    }}
                  />
                  {mode === 'login' ? 'Signing in' : 'Creating account'}
                </>
              ) : mode === 'login' ? (
                'Sign in'
              ) : (
                'Create my account'
              )}
            </motion.button>

            <p className="mt-4 text-center text-xs text-slate-500">
              {mode === 'login' ? (
                <>
                  New here?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('register')}
                    className="font-semibold text-violet-300 hover:text-violet-200"
                  >
                    Create an account
                  </button>
                </>
              ) : (
                <>
                  Already have one?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
                    className="font-semibold text-violet-300 hover:text-violet-200"
                  >
                    Sign in
                  </button>
                </>
              )}
            </p>
          </form>
        </motion.div>
      </motion.div>
    </div>
  )
}
