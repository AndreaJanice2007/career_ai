export default function Avatar({ src, username, size = 36, className = '' }) {
  const initial = (username ?? '?').slice(0, 1).toUpperCase()

  return (
    <span
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 font-bold text-ink-950 ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {src ? (
        <img
          src={src}
          alt={`${username}'s profile picture`}
          className="h-full w-full object-cover"
        />
      ) : (
        initial
      )}
    </span>
  )
}
