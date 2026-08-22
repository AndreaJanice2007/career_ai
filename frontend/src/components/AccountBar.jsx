import { motion } from 'framer-motion'
import Avatar from './Avatar'

export default function AccountBar({
  user,
  savedCount,
  onOpenPaths,
  onEditAvatar,
  onLogout,
  showingPaths,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="safe-top sticky top-0 z-30 border-b border-white/5 bg-ink-950/70 backdrop-blur-xl"
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <motion.button
            type="button"
            onClick={onEditAvatar}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.95 }}
            title="Change your profile picture"
            aria-label="Change your profile picture"
            className="group relative rounded-full"
          >
            <Avatar src={user.avatar} username={user.username} size={38} />
            {/* Always visible on touch, where there is no hover to reveal it. */}
            <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border border-ink-950 bg-violet-500 text-[8px] text-white">
              <svg
                viewBox="0 0 24 24"
                className="h-2.5 w-2.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M4 8h3l2-2h6l2 2h3v11H4z" />
                <circle cx="12" cy="13" r="3.2" />
              </svg>
            </span>
          </motion.button>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-semibold text-white">
              {user.username}
            </p>
            <p className="text-[11px] text-slate-500">
              {savedCount} saved path{savedCount === 1 ? '' : 's'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <motion.button
            type="button"
            onClick={onOpenPaths}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            className={
              showingPaths
                ? 'rounded-full border border-violet-400/50 bg-violet-500/15 px-5 py-2 text-xs font-semibold text-white'
                : 'rounded-full border border-white/15 bg-white/5 px-5 py-2 text-xs font-semibold text-slate-200 hover:border-violet-400/50 hover:text-white'
            }
          >
            {showingPaths ? '← Back to matches' : 'My paths'}
            {!showingPaths && savedCount > 0 && (
              <span className="ml-2 rounded-full bg-violet-500/25 px-1.5 py-0.5 font-mono text-[10px] text-violet-200">
                {savedCount}
              </span>
            )}
          </motion.button>

          <button
            type="button"
            onClick={onLogout}
            className="rounded-full px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-200"
          >
            Sign out
          </button>
        </div>
      </div>
    </motion.div>
  )
}
