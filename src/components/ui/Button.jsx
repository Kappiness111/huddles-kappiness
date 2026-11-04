import { motion } from 'framer-motion'

// Refined, flat buttons: solid ink / accent, or hairline outline. No novelty shadows.
const VARIANTS = {
  primary: 'bg-espresso text-cream hover:bg-ink',
  accent: 'bg-terracotta text-cream hover:bg-[#93502d]',
  light: 'bg-cream text-espresso hover:bg-paper',
  outline: 'bg-transparent text-current ring-1 ring-inset ring-current/30 hover:ring-current/70',
  ghost: 'bg-transparent text-current hover:bg-current/5',
}

const SIZES = {
  sm: 'min-h-11 px-4 text-sm gap-2',
  md: 'min-h-12 px-6 text-[0.95rem] gap-2',
  lg: 'min-h-14 px-7 text-base gap-2.5',
}

export default function Button({ variant = 'primary', size = 'md', className = '', children, ...props }) {
  return (
    <motion.button
      whileTap={props.disabled ? undefined : { scale: 0.98 }}
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold leading-tight transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-40 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  )
}
