// The Kappiness cup — a minimal, fine-line mascot. Always happy. Used sparingly:
// welcome, Mind Lab completion, receipt and thank-you.
import { motion } from 'framer-motion'

const INK = '#33231F'

function Face({ mood }) {
  const s = { stroke: INK, strokeWidth: 2.2, strokeLinecap: 'round', fill: 'none' }
  const eyes =
    mood === 'joy' ? (
      <>
        <path d="M41 70 q4 -5 8 0" {...s} />
        <path d="M63 70 q4 -5 8 0" {...s} />
      </>
    ) : mood === 'wink' ? (
      <>
        <circle cx="45" cy="69" r="2.6" fill={INK} />
        <path d="M63 70 q4 -5 8 0" {...s} />
      </>
    ) : (
      <>
        <circle cx="45" cy="69" r="2.6" fill={INK} />
        <circle cx="67" cy="69" r="2.6" fill={INK} />
      </>
    )
  return (
    <g>
      {eyes}
      <path d="M49 78 q7 6 14 0" {...s} />
      <ellipse cx="38" cy="78" rx="4.5" ry="2.4" fill="#D9A45B" opacity=".55" />
      <ellipse cx="74" cy="78" rx="4.5" ry="2.4" fill="#D9A45B" opacity=".55" />
    </g>
  )
}

/** mood: 'smile' | 'joy' | 'wink' — happy only, by design. */
export default function Cup({ mood = 'smile', className = 'w-20', steam = true, float = true, label }) {
  return (
    <motion.div
      className={className}
      animate={float ? { y: [0, -3, 0] } : undefined}
      transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <svg viewBox="0 0 120 130" className="h-auto w-full overflow-visible">
        {steam &&
          [44, 58, 72].map((x, i) => (
            <motion.path
              key={x}
              d={`M${x} 32 c-5 -6 5 -10 0 -17`}
              stroke="#B87945"
              strokeWidth="1.8"
              strokeLinecap="round"
              fill="none"
              animate={{ opacity: [0, 0.8, 0], y: [3, -3, -6] }}
              transition={{ duration: 3, repeat: Infinity, delay: i * 0.8, ease: 'easeInOut' }}
            />
          ))}
        {/* saucer */}
        <ellipse cx="56" cy="116" rx="46" ry="7" fill="#E8D0B0" stroke={INK} strokeWidth="1.8" />
        {/* handle */}
        <path d="M92 56 c18 0 18 34 -3 36" fill="none" stroke={INK} strokeWidth="1.8" strokeLinecap="round" />
        {/* body */}
        <path d="M20 40 H92 L86 103 a10 10 0 0 1 -10 9 H36 a10 10 0 0 1 -10 -9 Z" fill="#FBF6EE" stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M24.2 92 H87.8 L87 100 H25Z" fill="#A65D36" opacity=".9" />
        {/* coffee surface */}
        <ellipse cx="56" cy="40" rx="36" ry="6.5" fill="#6B4632" stroke={INK} strokeWidth="1.8" />
        <path d="M44 39 q12 -3 22 0" stroke="#D9A45B" strokeWidth="1.6" fill="none" strokeLinecap="round" opacity=".8" />
        <Face mood={mood} />
      </svg>
    </motion.div>
  )
}
