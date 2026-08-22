import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, MotionConfig, motion } from 'framer-motion'
import AccountBar from './components/AccountBar'
import AnalyzingOverlay from './components/AnalyzingOverlay'
import AnimatedBackground from './components/AnimatedBackground'
import AuthGate from './components/AuthGate'
import AvatarPicker from './components/AvatarPicker'
import CelebrationOverlay from './components/CelebrationOverlay'
import Hero from './components/Hero'
import MyPathsPanel from './components/MyPathsPanel'
import ResultsPanel from './components/ResultsPanel'
import SkillSelector from './components/SkillSelector'
import StepProgress from './components/StepProgress'
import WorkingPersonLogo from './components/WorkingPersonLogo'
import * as api from './api'

// The overlay animation needs a beat to be seen; the API usually answers faster.
const MIN_ANALYZE_MS = 1400

function toggleIn(set, value) {
  const next = new Set(set)
  if (next.has(value)) next.delete(value)
  else next.add(value)
  return next
}

export default function App() {
  const [session, setSession] = useState(null)
  const [booting, setBooting] = useState(true)

  const [catalog, setCatalog] = useState(null)
  const [metrics, setMetrics] = useState(null)
  const [bootError, setBootError] = useState(null)

  const [software, setSoftware] = useState(() => new Set())
  const [essential, setEssential] = useState(() => new Set())

  const [view, setView] = useState('match')
  const [step, setStep] = useState('skills')
  const [recommendations, setRecommendations] = useState([])
  const [skillsUsed, setSkillsUsed] = useState(0)
  const [selectedCareer, setSelectedCareer] = useState(null)
  const [analysis, setAnalysis] = useState(null)
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [error, setError] = useState(null)

  const [avatarOpen, setAvatarOpen] = useState(false)
  const [celebrateOpen, setCelebrateOpen] = useState(false)
  const [savedRecord, setSavedRecord] = useState(null)
  const [savedPaths, setSavedPaths] = useState([])
  const [pathsLoading, setPathsLoading] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  const selectorRef = useRef(null)

  // Restore the previous sign-in, if the stored token is still valid.
  useEffect(() => {
    if (!api.getToken()) {
      setBooting(false)
      return
    }
    api
      .me()
      .then(setSession)
      .catch(() => api.setToken(null))
      .finally(() => setBooting(false))
  }, [])

  useEffect(() => {
    if (!session || catalog) return
    Promise.all([api.getSkills(), api.getMetrics()])
      .then(([skills, modelMetrics]) => {
        setCatalog(skills)
        setMetrics(modelMetrics)
      })
      .catch((problem) => setBootError(problem.message))
  }, [session, catalog])

  const authenticate = useCallback(async (mode, credentials) => {
    const result =
      mode === 'register'
        ? await api.register(credentials)
        : await api.login(credentials)
    api.setToken(result.token)
    setSession(result.user)
  }, [])

  const signOut = useCallback(async () => {
    try {
      await api.logout()
    } catch {
      // The token is being discarded either way.
    }
    api.setToken(null)
    setSession(null)
    setView('match')
    setStep('skills')
    setSoftware(new Set())
    setEssential(new Set())
    setRecommendations([])
    setAnalysis(null)
    setSelectedCareer(null)
    setSavedRecord(null)
    setSavedPaths([])
  }, [])

  const applyPreset = useCallback(
    (preset) => {
      if (!catalog) return
      const knownSoftware = new Set(catalog.software.map((item) => item.name))
      const knownEssential = new Set(catalog.essential.map((item) => item.name))
      setSoftware(new Set(preset.software.filter((name) => knownSoftware.has(name))))
      setEssential(
        new Set(preset.essential.filter((name) => knownEssential.has(name))),
      )
    },
    [catalog],
  )

  // An expired or revoked token should drop straight back to the login screen.
  const reportError = useCallback((problem) => {
    if (problem.status === 401) {
      api.setToken(null)
      setSession(null)
      return
    }
    setError(problem.message)
  }, [])

  const loadAnalysis = useCallback(
    async (title, peers) => {
      setAnalysisLoading(true)
      try {
        const result = await api.analyze({
          career: title,
          software_skills: [...software],
          essential_skills: [...essential],
          peers,
        })
        setAnalysis(result)
      } catch (problem) {
        reportError(problem)
      } finally {
        setAnalysisLoading(false)
      }
    },
    [software, essential, reportError],
  )

  const savePath = useCallback(
    async () => {
      const match = recommendations.find(
        (item) => item.title === analysis?.career.title,
      )
      const record = await api.savePath({
        career: analysis.career.title,
        match: match ? match.match : 0,
        readiness: analysis.readiness,
        software_skills: [...software],
        essential_skills: [...essential],
        next_steps: analysis.roadmap.map((step) => step.skill),
      })
      setSavedRecord(record)
      setSavedPaths((current) => [record, ...current])
      setSession((current) =>
        current ? { ...current, saved_paths: current.saved_paths + 1 } : current,
      )
      return record
    },
    [analysis, recommendations, software, essential],
  )

  const openMyPaths = useCallback(async () => {
    setView('paths')
    window.scrollTo({ top: 0, behavior: 'smooth' })
    setPathsLoading(true)
    try {
      setSavedPaths(await api.getSavedPaths())
    } catch (problem) {
      reportError(problem)
    } finally {
      setPathsLoading(false)
    }
  }, [reportError])

  const saveAvatar = useCallback(async (avatar) => {
    setSession(await api.setAvatar(avatar))
  }, [])

  const closeCelebration = useCallback(() => setCelebrateOpen(false), [])

  const viewPathsFromCelebration = useCallback(() => {
    setCelebrateOpen(false)
    openMyPaths()
  }, [openMyPaths])

  // Finishing a path starts a clean profile: the saved copy keeps the old
  // selections, so the builder comes back empty.
  const buildAnother = useCallback(() => {
    setCelebrateOpen(false)
    setView('match')
    setStep('skills')
    setSoftware(new Set())
    setEssential(new Set())
    setRecommendations([])
    setSkillsUsed(0)
    setAnalysis(null)
    setSelectedCareer(null)
    setSavedRecord(null)
    // The builder only mounts once the results view has finished animating out.
    setTimeout(
      () =>
        selectorRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        }),
      650,
    )
  }, [])

  const deletePath = useCallback(
    async (id) => {
      setDeletingId(id)
      try {
        await api.deleteSavedPath(id)
        setSavedPaths((current) => current.filter((item) => item.id !== id))
        setSession((current) =>
          current
            ? { ...current, saved_paths: Math.max(0, current.saved_paths - 1) }
            : current,
        )
        setSavedRecord((current) => (current?.id === id ? null : current))
      } catch (problem) {
        reportError(problem)
      } finally {
        setDeletingId(null)
      }
    },
    [reportError],
  )

  const runMatch = useCallback(async () => {
    setError(null)
    setSavedRecord(null)
    setStep('analyzing')
    const startedAt = Date.now()

    try {
      const result = await api.recommend({
        software_skills: [...software],
        essential_skills: [...essential],
        top_n: 5,
      })

      const elapsed = Date.now() - startedAt
      if (elapsed < MIN_ANALYZE_MS) {
        await new Promise((resolve) =>
          setTimeout(resolve, MIN_ANALYZE_MS - elapsed),
        )
      }

      const peers = result.recommendations.map((item) => item.title)
      setRecommendations(result.recommendations)
      setSkillsUsed(result.skills_used)
      setSelectedCareer(peers[0] ?? null)
      setStep('results')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      if (peers[0]) loadAnalysis(peers[0], peers)
    } catch (problem) {
      reportError(problem)
      setStep('skills')
    }
  }, [software, essential, loadAnalysis, reportError])

  const selectCareer = useCallback(
    (title) => {
      if (title === selectedCareer) return
      // The saved plan belongs to the career it was saved for.
      setSavedRecord(null)
      setSelectedCareer(title)
      loadAnalysis(
        title,
        recommendations.map((item) => item.title),
      )
    },
    [selectedCareer, recommendations, loadAnalysis],
  )

  const scrollToSelector = () =>
    selectorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  if (booting) {
    return (
      <>
        <AnimatedBackground />
        <div className="flex min-h-dvh items-center justify-center">
          <motion.div
            animate={{ opacity: [0.55, 1, 0.55] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          >
            <WorkingPersonLogo size={112} />
          </motion.div>
        </div>
      </>
    )
  }

  if (!session) {
    return (
      <MotionConfig reducedMotion="user">
        <AnimatedBackground />
        <AuthGate onSubmit={authenticate} />
      </MotionConfig>
    )
  }

  if (bootError) {
    return (
      <>
        <AnimatedBackground />
        <div className="flex min-h-dvh items-center justify-center px-5">
          <div className="glass max-w-md p-8 text-center">
            <h1 className="text-lg font-bold text-white">
              The API is not responding
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              {bootError}
            </p>
            <p className="mt-4 rounded-xl bg-ink-900/70 p-3 text-left font-mono text-xs text-slate-400">
              python backend/train.py
              <br />
              python -m uvicorn backend.app.main:app --reload
            </p>
          </div>
        </div>
      </>
    )
  }

  return (
    <MotionConfig reducedMotion="user">
      <AnimatedBackground />

      <main className="relative min-h-dvh">
        <AccountBar
          user={session}
          savedCount={session.saved_paths}
          showingPaths={view === 'paths'}
          onOpenPaths={() => {
            if (view === 'paths') {
              setView('match')
              window.scrollTo({ top: 0, behavior: 'smooth' })
            } else {
              openMyPaths()
            }
          }}
          onEditAvatar={() => setAvatarOpen(true)}
          onLogout={signOut}
        />

        <AvatarPicker
          open={avatarOpen}
          username={session.username}
          avatar={session.avatar}
          onSave={saveAvatar}
          onClose={() => setAvatarOpen(false)}
        />

        <AnimatePresence mode="wait">
          {view === 'paths' && (
            <motion.div
              key="paths"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              <MyPathsPanel
                paths={savedPaths}
                loading={pathsLoading}
                busyId={deletingId}
                onDelete={deletePath}
                onStartNew={() => {
                  setView('match')
                  setStep('skills')
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
              />
            </motion.div>
          )}

          {view === 'match' && step === 'skills' && (
            <motion.div
              key="skills"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
            >
              <Hero stats={metrics?.stats} onStart={scrollToSelector} />

              <div ref={selectorRef} className="scroll-mt-20">
                <StepProgress current="skills" />
                {catalog ? (
                  <SkillSelector
                    catalog={catalog}
                    selectedSoftware={software}
                    selectedEssential={essential}
                    onToggleSoftware={(name) =>
                      setSoftware((current) => toggleIn(current, name))
                    }
                    onToggleEssential={(name) =>
                      setEssential((current) => toggleIn(current, name))
                    }
                    onApplyPreset={applyPreset}
                    onClear={() => {
                      setSoftware(new Set())
                      setEssential(new Set())
                    }}
                    onSubmit={runMatch}
                    busy={false}
                  />
                ) : (
                  <div className="mx-auto mt-12 max-w-5xl px-6">
                    <div className="shimmer relative h-96 overflow-hidden rounded-3xl bg-white/[0.04]" />
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {view === 'match' && step === 'analyzing' && (
            <motion.div key="analyzing" className="pt-16">
              <StepProgress current="analyzing" />
              <AnalyzingOverlay />
            </motion.div>
          )}

          {view === 'match' && step === 'results' && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="pt-10">
                <StepProgress current="results" />
              </div>
              <ResultsPanel
                recommendations={recommendations}
                analysis={analysis}
                analysisLoading={analysisLoading}
                selectedCareer={selectedCareer}
                onSelectCareer={selectCareer}
                onRestart={() => {
                  setStep('skills')
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
                onDone={() => setCelebrateOpen(true)}
                onViewPaths={openMyPaths}
                savedRecord={savedRecord}
                metrics={metrics}
                skillsUsed={skillsUsed}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <CelebrationOverlay
          open={celebrateOpen && Boolean(analysis)}
          career={analysis?.career.title}
          username={session.username}
          onSave={savePath}
          onBuildAnother={buildAnother}
          onViewPaths={viewPathsFromCelebration}
          onClose={closeCelebration}
        />

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              className="safe-bottom fixed bottom-6 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2"
            >
              <div className="flex items-center gap-3 rounded-2xl border border-rose-400/30 bg-rose-950/80 px-5 py-3 backdrop-blur sm:rounded-full">
                <span className="min-w-0 flex-1 text-sm text-rose-200">
                  {error}
                </span>
                <button
                  type="button"
                  onClick={() => setError(null)}
                  aria-label="Dismiss"
                  className="shrink-0 px-1 text-lg leading-none text-rose-300/70 hover:text-rose-200"
                >
                  ×
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <footer className="safe-bottom text-balance border-t border-white/5 px-6 py-8 text-center text-xs leading-relaxed text-slate-600">
          <span className="font-semibold tracking-[0.2em] text-slate-500">
            CAREER NOVA
          </span>
          <span className="mx-2">·</span>
          Built on O*NET occupational data · Training profiles are synthetic, so
          treat match scores as guidance rather than assessment
        </footer>
      </main>
    </MotionConfig>
  )
}
