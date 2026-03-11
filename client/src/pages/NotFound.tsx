import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

export function NotFound() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ textAlign: 'center', padding: '2rem' }}
    >
      <h1>404</h1>
      <p>Page not found.</p>
      <Link to="/" style={{ color: 'var(--accent)' }}>Go home</Link>
    </motion.div>
  )
}
