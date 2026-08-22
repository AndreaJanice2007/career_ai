import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Avatar from './Avatar'
import { PRESETS, fileToAvatar, presetAvatar } from '../lib/avatar'

export default function AvatarPicker({ open, username, avatar, onSave, onClose }) {
  const [draft, setDraft] = useState(avatar ?? null)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)
  const fileRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    setDraft(avatar ?? null)
    setStatus('idle')
    setError(null)
    const onKey = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [open, avatar, onClose])

  const pickFile = async (event) => {
    const file = event.target.files?.[0]
    // Reset so choosing the same file twice still fires a change event.
    event.target.value = ''
    if (!file) return
    setError(null)
    try {
      setDraft(await fileToAvatar(file))
    } catch (problem) {
      setError(problem.message)
    }
  }

  const save = async () => {
    setStatus('saving')
    setError(null)
    try {
      await onSave(draft)
      onClose()
    } catch (problem) {
      setError(problem.message)
      setStatus('idle')
    }
  }

  const changed = (draft ?? null) !== (avatar ?? null)

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto px-5 py-8"
        >
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="absolute inset-0 cursor-default bg-ink-950/80 backdrop-blur-sm"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Choose a profile picture"
            initial={{ opacity: 0, y: 26, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            className="glass relative my-auto w-full max-w-md overflow-hidden p-7"
          >
            <motion.div
              aria-hidden
              className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-cyan-500/20 blur-3xl"
              animate={{ opacity: [0.5, 0.85, 0.5] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            />

            <div className="relative">
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                Profile picture
              </p>
              <h3 className="mt-1.5 text-xl font-bold text-white">
                Put a face to {username}
              </h3>

              <div className="mt-6 flex items-center gap-5">
                <motion.div
                  key={draft ?? 'none'}
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 22 }}
                >
                  <Avatar
                    src={draft}
                    username={username}
                    size={88}
                    className="ring-2 ring-white/15"
                  />
                </motion.div>

                <div className="flex-1 space-y-2">
                  <motion.button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/[0.04] px-4 py-2.5 text-xs font-semibold text-slate-200 hover:border-violet-400/50 hover:text-white"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <path d="M12 16V4m0 0L8 8m4-4 4 4" />
                      <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
                    </svg>
                    Upload from device
                  </motion.button>
                  <p className="text-[11px] leading-relaxed text-slate-500">
                    Your gallery, camera roll or files. The image is cropped to a
                    square and shrunk before it is saved.
                  </p>
                </div>
              </div>

              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={pickFile}
                className="hidden"
              />

              <p className="mt-7 text-xs font-semibold text-slate-300">
                Or pick a colour
              </p>
              <div className="mt-3 flex flex-wrap gap-2.5">
                {PRESETS.map((preset) => (
                  <motion.button
                    key={preset.id}
                    type="button"
                    title={preset.label}
                    aria-label={`${preset.label} avatar`}
                    onClick={() => {
                      setError(null)
                      setDraft(presetAvatar(preset, username))
                    }}
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.94 }}
                    className="h-11 w-11 rounded-full ring-1 ring-white/15"
                    style={{
                      backgroundImage: `linear-gradient(135deg, ${preset.from}, ${preset.to})`,
                    }}
                  />
                ))}
              </div>

              <AnimatePresence>
                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mt-5 text-xs text-rose-300"
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>

              <div className="mt-7 flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full border border-white/12 px-5 py-3 text-sm font-semibold text-slate-300 hover:border-white/25 hover:text-white"
                >
                  Cancel
                </button>
                {draft && (
                  <button
                    type="button"
                    onClick={() => setDraft(null)}
                    className="text-xs font-semibold text-slate-500 hover:text-rose-300"
                  >
                    Remove
                  </button>
                )}
                <motion.button
                  type="button"
                  onClick={save}
                  disabled={status === 'saving' || !changed}
                  whileHover={{ scale: status === 'saving' || !changed ? 1 : 1.02 }}
                  whileTap={{ scale: status === 'saving' || !changed ? 1 : 0.98 }}
                  className="ml-auto flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 px-6 py-3 text-sm font-semibold text-ink-950 disabled:opacity-50"
                >
                  {status === 'saving' ? (
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
                      Saving
                    </>
                  ) : (
                    'Save picture'
                  )}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
