// Editorial landscape: layered hills, a winding path, an abstract figure with a book, a stack of
// books on the horizon. Flat shapes, no outlines — refined rather than cartoon.
import { motion } from 'framer-motion'

const PALETTES = {
  dawn: { sky: ['#F5EBDD', '#EBD3B3'], sun: '#D9A45B', far: '#D8B892', mid: '#B9906A', near: '#8A9A7B', front: '#4F5D47', path: '#FBF6EE', rows: '#7B8B6C', figure: '#33231F', coat: '#A65D36' },
  dusk: { sky: ['#2F3A4F', '#8E6E66'], sun: '#E8B97A', far: '#6E5A63', mid: '#5A4B55', near: '#3F4A45', front: '#26302C', path: '#E8D0B0', rows: '#33403A', figure: '#F5EBDD', coat: '#D9A45B' },
}

export function Figure({ x, y, scale = 1, coat, ink, book = '#F5EBDD', walking = true }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      {/* legs */}
      <motion.path
        d="M-3 0 L-6 22 M3 0 L7 22"
        stroke={ink}
        strokeWidth="3"
        strokeLinecap="round"
        animate={walking ? { d: ['M-3 0 L-6 22 M3 0 L7 22', 'M-3 0 L-1 22 M3 0 L2 22', 'M-3 0 L-6 22 M3 0 L7 22'] } : undefined}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* long coat */}
      <path d="M-8 -30 C-10 -18 -11 -6 -10 4 L10 4 C11 -6 10 -18 8 -30 C4 -34 -4 -34 -8 -30Z" fill={coat} />
      {/* book held open */}
      <path d="M6 -18 l9 -3 l0 9 l-9 3z M6 -18 l-1 9 l1 0" fill={book} />
      {/* head */}
      <circle cx="0" cy="-39" r="6.5" fill={ink} />
    </g>
  )
}

export default function Landscape({ variant = 'dawn', className = '', figure = true, children }) {
  const p = PALETTES[variant]
  return (
    <div className={`grain overflow-hidden ${className}`}>
      <svg viewBox="0 0 400 520" preserveAspectRatio="xMidYMax slice" className="h-full w-full" aria-hidden="true">
        <defs>
          <linearGradient id={`sky-${variant}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={p.sky[0]} />
            <stop offset="1" stopColor={p.sky[1]} />
          </linearGradient>
        </defs>
        <rect width="400" height="520" fill={`url(#sky-${variant})`} />
        <motion.circle cx="268" cy="196" r="74" fill={p.sun} opacity=".9" initial={{ cy: 230 }} animate={{ cy: 196 }} transition={{ duration: 2.4, ease: [0.22, 1, 0.36, 1] }} />
        {variant === 'dusk' &&
          [[60, 70], [120, 40], [330, 60], [200, 30], [370, 120], [30, 150]].map(([cx, cy], i) => <circle key={i} cx={cx} cy={cy} r="1.4" fill="#F5EBDD" opacity=".8" />)}
        {/* birds */}
        {[[96, 148], [118, 136], [132, 158]].map(([bx, by], i) => (
          <motion.path key={i} d={`M${bx} ${by} q5 -5 10 0 q5 -5 10 0`} stroke={p.figure} strokeWidth="1.4" fill="none" strokeLinecap="round" opacity=".55" animate={{ x: [0, 14, 0], y: [0, -4, 0] }} transition={{ duration: 9 + i, repeat: Infinity, ease: 'easeInOut' }} />
        ))}
        <path d="M0 290 C70 250 140 262 200 282 C260 302 320 254 400 262 V520 H0Z" fill={p.far} />
        {/* book stack on the horizon */}
        <g transform="translate(70 238)">
          <rect x="0" y="22" width="54" height="11" fill={p.coat} />
          <rect x="5" y="11" width="46" height="11" fill={p.mid} />
          <rect x="2" y="0" width="50" height="11" fill={p.front} />
        </g>
        <path d="M0 340 C90 300 170 312 236 334 C300 356 352 318 400 322 V520 H0Z" fill={p.mid} />
        {[0, 1, 2, 3, 4].map((i) => (
          <path key={i} d={`M0 ${362 + i * 13} C90 ${324 + i * 13} 170 ${336 + i * 13} 236 ${358 + i * 13} C300 ${380 + i * 13} 352 ${342 + i * 13} 400 ${346 + i * 13}`} fill="none" stroke={p.rows} strokeWidth="1.2" strokeDasharray="2 5" opacity=".7" />
        ))}
        <path d="M0 418 C100 388 200 396 268 414 C326 430 370 410 400 408 V520 H0Z" fill={p.near} />
        {/* winding path */}
        <path d="M150 520 C170 486 250 476 236 446 C224 420 176 418 196 392 C210 374 248 368 252 344" fill="none" stroke={p.path} strokeWidth="16" strokeLinecap="round" opacity=".9" />
        <path d="M0 470 C110 452 230 458 400 466 V520 H0Z" fill={p.front} />
        {figure && <Figure x={212} y={396} scale={1.05} coat={p.coat} ink={p.figure} book={variant === 'dusk' ? '#33231F' : '#F5EBDD'} />}
      </svg>
      {children}
    </div>
  )
}
