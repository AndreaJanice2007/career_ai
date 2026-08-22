import { useEffect, useState } from 'react'
import { animate, useReducedMotion } from 'framer-motion'

export const easeOut = [0.16, 1, 0.3, 1]

export const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: easeOut },
  },
}

export const fadeIn = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.5, ease: easeOut } },
}

export const stagger = (staggerChildren = 0.06, delayChildren = 0) => ({
  hidden: {},
  show: { transition: { staggerChildren, delayChildren } },
})

export const popIn = {
  hidden: { opacity: 0, scale: 0.9, y: 10 },
  show: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 340, damping: 26 },
  },
  exit: { opacity: 0, scale: 0.85, transition: { duration: 0.15 } },
}

/** Animates a number towards `value`, settling immediately for reduced motion. */
export function useCountUp(value, duration = 1.1) {
  const reduced = useReducedMotion()
  const [display, setDisplay] = useState(reduced ? value : 0)

  useEffect(() => {
    if (reduced) {
      setDisplay(value)
      return undefined
    }
    const controls = animate(0, value, {
      duration,
      ease: easeOut,
      onUpdate: setDisplay,
    })
    return () => controls.stop()
  }, [value, duration, reduced])

  return display
}
