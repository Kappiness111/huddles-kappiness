// Abstract editorial line-art motifs — one visual idea per quiz option / personality.
// Fine strokes in currentColor, one solid accent shape. 120×120 viewBox.
import { motion } from 'framer-motion'

const MOTIFS = {
  ripple: (a) => (
    <>
      {[14, 26, 38, 50].map((r) => <circle key={r} cx="60" cy="60" r={r} />)}
      <circle cx="60" cy="60" r="7" fill={a} stroke="none" />
    </>
  ),
  prism: (a) => (
    <>
      <path d="M60 22 L96 86 H24Z" />
      <path d="M6 66 L46 58" />
      <path d="M74 56 L116 40 M76 62 L116 60 M74 68 L116 80" />
      <path d="M60 22 L96 86 H24Z" fill={a} stroke="none" opacity=".25" />
    </>
  ),
  page: (a) => (
    <>
      <path d="M60 34 C46 26 28 26 16 30 V92 C28 88 46 88 60 96 C74 88 92 88 104 92 V30 C92 26 74 26 60 34Z" />
      <path d="M60 34 V96" />
      <path d="M26 44 h24 M26 54 h24 M26 64 h20 M70 44 h24 M70 54 h24 M70 64 h18" />
      <circle cx="88" cy="78" r="5" fill={a} stroke="none" />
    </>
  ),
  lattice: (a) => {
    const pts = [[24, 30], [60, 20], [96, 34], [36, 66], [78, 60], [26, 98], [62, 96], [98, 92]]
    const links = [[0, 1], [1, 2], [0, 3], [1, 4], [2, 4], [3, 4], [3, 5], [4, 6], [4, 7], [5, 6], [6, 7]]
    return (
      <>
        {links.map(([i, j]) => <path key={`${i}${j}`} d={`M${pts[i][0]} ${pts[i][1]} L${pts[j][0]} ${pts[j][1]}`} />)}
        {pts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={i === 4 ? 6 : 3.5} fill={i === 4 ? a : 'currentColor'} stroke="none" />)}
      </>
    )
  },
  orbit: (a) => (
    <>
      <circle cx="46" cy="60" r="28" />
      <circle cx="74" cy="60" r="28" />
      <path d="M60 36 A28 28 0 0 1 60 84 A28 28 0 0 1 60 36Z" fill={a} stroke="none" opacity=".85" />
    </>
  ),
  maze: (a) => (
    <>
      <path d="M20 20 H100 V100 H32 V32 H88 V88 H44 V44 H76 V76 H56 V56" />
      <circle cx="66" cy="66" r="5" fill={a} stroke="none" />
    </>
  ),
  portrait: (a) => (
    <>
      <path d="M30 104 V50 A30 30 0 0 1 90 50 V104Z" />
      <circle cx="60" cy="56" r="11" fill={a} stroke="none" />
      <path d="M38 104 C40 84 50 76 60 76 C70 76 80 84 82 104" />
    </>
  ),
  spiral: (a) => (
    <>
      <path d="M60 60 m0 -4 a4 4 0 1 1 -4 4 a10 10 0 1 1 10 10 a18 18 0 1 1 -18 -18 a26 26 0 1 1 26 26 a34 34 0 1 1 -34 -34 a42 42 0 1 1 42 42" />
      <circle cx="60" cy="60" r="3" fill={a} stroke="none" />
    </>
  ),
  arch: (a) => (
    <>
      <path d="M12 100 H108" />
      {[16, 46, 76].map((x) => <path key={x} d={`M${x} 100 V58 A14 14 0 0 1 ${x + 28} 58 V100`} />)}
      <path d="M10 44 H110 M14 38 H106" />
      <circle cx="60" cy="74" r="6" fill={a} stroke="none" />
    </>
  ),
  horizon: (a) => (
    <>
      <path d="M8 86 H112" />
      <circle cx="60" cy="58" r="22" fill={a} stroke="none" />
      <ellipse cx="60" cy="58" rx="40" ry="9" transform="rotate(-14 60 58)" />
      {[[20, 24], [96, 20], [104, 44], [28, 46]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1.8" fill="currentColor" stroke="none" />)}
      <path d="M20 98 H100 M34 108 H86" />
    </>
  ),
  window: (a) => (
    <>
      <rect x="26" y="20" width="68" height="76" />
      <path d="M60 20 V96 M26 58 H94" />
      <path d="M18 96 H102" />
      <path d="M44 96 V84 C44 78 50 74 50 74 M50 74 C54 80 58 82 60 84" />
      <circle cx="78" cy="38" r="8" fill={a} stroke="none" />
    </>
  ),
  moon: (a) => (
    <>
      <path d="M74 20 A40 40 0 1 0 100 76 A32 32 0 0 1 74 20Z" fill={a} stroke="none" opacity=".9" />
      <path d="M74 20 A40 40 0 1 0 100 76 A32 32 0 0 1 74 20Z" />
      {[[96, 24], [108, 44], [86, 40]].map(([x, y], i) => <path key={i} d={`M${x} ${y - 4} V${y + 4} M${x - 4} ${y} H${x + 4}`} />)}
    </>
  ),
  layers: (a) => (
    <>
      {[34, 50, 66, 82].map((y, i) => <path key={y} d={`M10 ${y} C34 ${y - 12} 50 ${y + 10} 70 ${y} C86 ${y - 8} 100 ${y + 4} 110 ${y}`} opacity={1 - i * 0.15} />)}
      <circle cx="70" cy="50" r="4.5" fill={a} stroke="none" />
    </>
  ),
  zigzag: (a) => (
    <>
      <path d="M12 86 L36 46 L52 72 L74 30 L90 56 L108 22" />
      <path d="M96 22 H108 V34" />
      <circle cx="74" cy="30" r="5" fill={a} stroke="none" />
    </>
  ),
  seed: (a) => (
    <>
      <path d="M18 92 H102" />
      <ellipse cx="60" cy="98" rx="14" ry="5" fill={a} stroke="none" />
      <path d="M60 92 V46" />
      <path d="M60 64 C46 62 36 52 36 40 C48 40 58 50 60 64Z" />
      <path d="M60 52 C70 48 80 38 82 26 C70 26 60 36 60 52Z" />
    </>
  ),
  crowd: (a) => (
    <>
      {[[24, 60], [46, 52], [68, 58], [90, 50]].map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="7" fill={i === 2 ? a : 'none'} stroke={i === 2 ? 'none' : 'currentColor'} />
          <path d={`M${x - 12} ${y + 40} C${x - 12} ${y + 20} ${x + 12} ${y + 20} ${x + 12} ${y + 40}`} />
        </g>
      ))}
      <path d="M8 100 H112" />
    </>
  ),
  sunrise: (a) => (
    <>
      <path d="M30 80 A30 30 0 0 1 90 80Z" fill={a} stroke="none" />
      <path d="M8 80 H112 M20 92 H100 M36 104 H84" />
      {[-60, -30, 0, 30, 60].map((r) => <path key={r} d="M60 40 V28" transform={`rotate(${r} 60 80)`} />)}
    </>
  ),
  door: (a) => (
    <>
      <path d="M34 104 V22 H80 V104" />
      <path d="M80 22 L58 30 V112 L80 104" fill={a} stroke="none" opacity=".35" />
      <path d="M80 22 L58 30 V112 L80 104Z" />
      <path d="M58 104 L18 116 M80 104 L108 116" opacity=".5" />
      <circle cx="64" cy="68" r="2.5" fill="currentColor" stroke="none" />
    </>
  ),
  threads: (a) => (
    <>
      <path d="M10 70 C30 30 50 30 60 60 C70 90 90 90 110 50" />
      <path d="M10 50 C30 90 50 90 60 60 C70 30 90 30 110 70" />
      <circle cx="60" cy="60" r="6" fill={a} stroke="none" />
    </>
  ),
  compass: (a) => (
    <>
      <circle cx="60" cy="60" r="42" />
      <circle cx="60" cy="60" r="34" opacity=".4" />
      <path d="M60 22 L68 60 L60 98 L52 60Z" />
      <path d="M60 22 L68 60 H52Z" fill={a} stroke="none" />
      <path d="M22 60 L60 54 L98 60 L60 66Z" opacity=".5" />
    </>
  ),
}

export default function Motif({ name, accent = '#A65D36', className = '', strokeWidth = 1.5, animate = false }) {
  const draw = MOTIFS[name] ?? MOTIFS.ripple
  return (
    <motion.svg
      viewBox="0 0 120 120"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      initial={animate ? { opacity: 0, scale: 0.92, rotate: -6 } : false}
      animate={animate ? { opacity: 1, scale: 1, rotate: 0 } : undefined}
      transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
    >
      {draw(accent)}
    </motion.svg>
  )
}
