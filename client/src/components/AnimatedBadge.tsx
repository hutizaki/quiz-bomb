import { motion } from 'framer-motion'

/**
 * Minimal Framer Motion component to verify setup.
 * Used on home or in layout for a quick "motion works" check.
 */
export function AnimatedBadge() {
  return (
    <motion.span
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 15 }}
      whileHover={{ scale: 1.05 }}
      style={{
        display: 'inline-block',
        padding: '0.25rem 0.5rem',
        background: 'var(--accent)',
        borderRadius: 6,
        fontSize: '0.75rem',
        fontWeight: 600,
      }}
    >
      Live
    </motion.span>
  )
}
