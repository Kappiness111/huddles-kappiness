// Abstract editorial line-art motifs — one visual idea per quiz option / personality.
// One visual language throughout, like a printed book plate: hairline geometry in currentColor,
// engraved hatching for shade, and a single solid accent shape. 120×120 viewBox.
import { useId } from 'react'
import { motion } from 'framer-motion'

const range = (from, to, step) => Array.from({ length: Math.floor((to - from) / step) + 1 }, (_, i) => from + i * step)

/** Engraved shading: fine parallel lines clipped to `shape`. Ids are per instance (many motifs share a page). */
function Hatch({ id, shape, angle = 45, gap = 3.6, opacity = 0.5 }) {
  return (
    <>
      <clipPath id={id}>{shape}</clipPath>
      <g clipPath={`url(#${id})`} strokeWidth={0.6} opacity={opacity}>
        <g transform={`rotate(${angle} 60 60)`}>
          {range(-60, 180, gap).map((x) => (
            <path key={x} d={`M${x} -60 V180`} />
          ))}
        </g>
      </g>
    </>
  )
}

const MOTIFS = {
  // Emotional depth: a single drop and the rings it leaves.
  ripple: (a) => (
    <>
      {[12, 24, 36, 48, 58].map((rx, i) => (
        <ellipse key={rx} cx="60" cy="78" rx={rx} ry={rx * 0.36} opacity={1 - i * 0.18} />
      ))}
      <path d="M60 44 V70" strokeWidth="0.6" opacity=".5" />
      <circle cx="60" cy="30" r="10" fill={a} stroke="none" />
    </>
  ),

  // A new perspective: a lens turned to a new angle, half light, half shade.
  prism: (a, id) => (
    <g transform="rotate(-32 60 60)">
      <path d="M20 60 A40 40 0 0 1 100 60Z" fill={a} stroke="none" />
      <Hatch id={`${id}-p`} shape={<path d="M20 60 A40 40 0 0 0 100 60Z" />} angle={90} gap={3.4} opacity={0.55} />
      <circle cx="60" cy="60" r="40" />
      <path d="M6 60 H114" strokeWidth="0.7" />
    </g>
  ),

  // Beautiful prose: a typeset page with an illuminated initial.
  page: (a) => (
    <>
      <rect x="28" y="14" width="64" height="92" />
      <rect x="36" y="23" width="15" height="15" fill={a} stroke="none" />
      <g strokeWidth="0.8" opacity=".7">
        {[25, 31, 37].map((y) => <path key={y} d={`M56 ${y} H84`} />)}
        {[44, 50, 56, 62, 68].map((y, i) => <path key={y} d={`M36 ${y} H${i === 4 ? 66 : 84}`} />)}
        {[78, 84, 90, 96].map((y, i) => <path key={y} d={`M${i ? 36 : 42} ${y} H${i === 3 ? 58 : 84}`} />)}
      </g>
    </>
  ),

  // Challenging ideas: a geometric construction.
  lattice: (a) => (
    <>
      <circle cx="60" cy="60" r="42" />
      <path d="M60 18 L96.4 81 H23.6Z" />
      <g strokeWidth="0.6" opacity=".5">
        <path d="M60 18 V81 M96.4 81 L41.8 49.5 M23.6 81 L78.2 49.5" />
        <circle cx="60" cy="60" r="21" />
      </g>
      {[[60, 18], [96.4, 81], [23.6, 81]].map(([x, y]) => <circle key={x} cx={x} cy={y} r="2.6" fill="currentColor" stroke="none" />)}
      <circle cx="60" cy="60" r="5.5" fill={a} stroke="none" />
    </>
  ),

  // Relationships: two lives overlapping.
  orbit: (a, id) => (
    <>
      <Hatch id={`${id}-o`} shape={<circle cx="44" cy="60" r="30" />} angle={45} opacity={0.3} />
      <circle cx="44" cy="60" r="30" />
      <circle cx="76" cy="60" r="30" />
      <path d="M60 34.6 A30 30 0 0 1 60 85.4 A30 30 0 0 1 60 34.6Z" fill={a} stroke="none" />
    </>
  ),

  // Psychology: a labyrinth of broken rings around a still centre.
  maze: (a) => (
    <>
      {[46, 36, 26, 16].map((r, i) => {
        const c = 2 * Math.PI * r
        return <circle key={r} cx="60" cy="60" r={r} strokeDasharray={`${c - 12} 12`} transform={`rotate(${i * 97 + 20} 60 60)`} />
      })}
      <circle cx="60" cy="60" r="5.5" fill={a} stroke="none" />
    </>
  ),

  // Character drama: a cameo portrait in an arched frame.
  portrait: (a, id) => {
    const arch = 'M32 104 V52 A28 28 0 0 1 88 52 V104Z'
    return (
      <>
        <Hatch id={`${id}-pt`} shape={<path d={arch} />} angle={45} opacity={0.35} />
        <path d={arch} />
        <circle cx="60" cy="58" r="11" fill={a} stroke="none" />
        <path d="M40 104 C42 84 50 75 60 75 C70 75 78 84 80 104Z" fill={a} stroke="none" />
        <path d="M22 104 H98" />
      </>
    )
  },

  // Psychological thriller: the golden spiral, closing in.
  spiral: (a) => (
    <>
      <g strokeWidth="0.7" opacity=".5">
        <rect x="12" y="30.4" width="96" height="59.3" />
        <path d="M71.3 30.4 V89.7 M71.3 67.1 H108 M85.4 67.1 V89.7 M71.3 75.6 H85.4 M79.8 67.1 V75.6" />
      </g>
      <rect x="71.3" y="67.1" width="8.5" height="8.5" fill={a} stroke="none" />
      <path d="M12 89.7 A59.3 59.3 0 0 1 71.3 30.4 A36.7 36.7 0 0 1 108 67.1 A22.6 22.6 0 0 1 85.4 89.7 A14.1 14.1 0 0 1 71.3 75.6 A8.5 8.5 0 0 1 79.8 67.1" />
    </>
  ),

  // The past: a classical arch with its keystone.
  arch: (a, id) => (
    <>
      <Hatch id={`${id}-a`} shape={<path d="M40 104 V58 A20 20 0 0 1 80 58 V104Z" />} angle={0} gap={3.2} opacity={0.4} />
      <circle cx="60" cy="86" r="9" fill={a} stroke="none" />
      <path d="M28 104 V56 A32 32 0 0 1 92 56 V104" />
      <path d="M40 104 V58 A20 20 0 0 1 80 58 V104" />
      <path d="M55 22 H65 L63 38 H57Z" />
      <path d="M77.3 46 L87.7 40 M70 38.7 L76 28.3 M50 38.7 L44 28.3 M42.7 46 L32.3 40" strokeWidth="0.7" />
      <path d="M14 104 H106" />
      <path d="M26 110 H94" strokeWidth="0.7" opacity=".5" />
    </>
  ),

  // The future: a world rising over the horizon, a moon on its orbit.
  horizon: (a, id) => (
    <>
      <Hatch id={`${id}-h`} shape={<path d="M30 78 A30 30 0 0 1 90 78Z" />} angle={90} gap={3.2} opacity={0.55} />
      <path d="M30 78 A30 30 0 0 1 90 78" />
      <ellipse cx="60" cy="64" rx="46" ry="12" transform="rotate(-12 60 64)" strokeWidth="0.8" />
      <circle cx="105" cy="54.4" r="5.5" fill={a} stroke="none" />
      <path d="M8 78 H112" />
      <g strokeWidth="0.7">
        <path d="M22 87 H98" opacity=".6" />
        <path d="M36 95 H84" opacity=".4" />
        <path d="M48 103 H72" opacity=".25" />
      </g>
      <circle cx="24" cy="28" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="94" cy="20" r="1.2" fill="currentColor" stroke="none" />
    </>
  ),

  // Realism: a window onto an ordinary day.
  window: (a, id) => (
    <>
      <Hatch id={`${id}-w`} shape={<rect x="30" y="58" width="30" height="40" />} angle={45} opacity={0.45} />
      <circle cx="76" cy="40" r="9" fill={a} stroke="none" />
      <rect x="30" y="18" width="60" height="80" />
      <path d="M60 18 V98 M30 58 H90" />
      <path d="M22 98 H98" />
      <path d="M26 104 H94" strokeWidth="0.7" opacity=".5" />
    </>
  ),

  // Imagination: a crescent, its dark side engraved.
  moon: (a, id) => (
    <>
      <mask id={`${id}-m`}>
        <circle cx="60" cy="60" r="38" fill="#fff" />
        <circle cx="78" cy="48" r="32" fill="#000" />
      </mask>
      <circle cx="60" cy="60" r="38" fill={a} stroke="none" mask={`url(#${id}-m)`} />
      <clipPath id={`${id}-mc`}>
        <circle cx="60" cy="60" r="38" />
      </clipPath>
      <g clipPath={`url(#${id}-mc)`}>
        <Hatch id={`${id}-mh`} shape={<circle cx="78" cy="48" r="32" />} angle={-45} opacity={0.4} />
      </g>
      <circle cx="60" cy="60" r="38" />
      <circle cx="104" cy="22" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="112" cy="40" r="1" fill="currentColor" stroke="none" />
    </>
  ),

  // Slow and layered: contour lines, one beneath the next.
  layers: (a) => (
    <>
      <circle cx="78" cy="26" r="7" fill={a} stroke="none" />
      {range(0, 5, 1).map((i) => {
        const y = 46 + i * 12
        return <path key={i} d={`M8 ${y + 8} C30 ${y - 8} 48 ${y - 8} 64 ${y + 1} S96 ${y + 12} 112 ${y + 2}`} opacity={1 - i * 0.14} />
      })}
    </>
  ),

  // Fast and unpredictable: a comet and its streaks.
  zigzag: (a) => (
    <g transform="rotate(-24 60 60)">
      {[
        [38, 30, 84],
        [46, 14, 88],
        [54, 36, 92],
        [62, 8, 92],
        [70, 26, 90],
        [78, 44, 86],
      ].map(([y, x1, x2], i) => (
        <path key={y} d={`M${x1} ${y} H${x2}`} strokeWidth={i === 3 ? 1.4 : 0.8} opacity={i === 3 ? 1 : 0.55} />
      ))}
      <circle cx="102" cy="62" r="9" fill={a} stroke="none" />
    </g>
  ),

  // Personal transformation: one circle, growing.
  seed: (a) => (
    <>
      {[44, 32, 22, 13].map((r, i) => (
        <circle key={r} cx="60" cy={104 - r} r={r} opacity={0.35 + i * 0.2} />
      ))}
      <circle cx="60" cy="98" r="6" fill={a} stroke="none" />
      <path d="M10 104 H110" strokeWidth="0.7" />
    </>
  ),

  // Society: a community of points, one of them you.
  crowd: (a) => {
    const pts = range(0, 29, 1).map((i) => [25 + (i % 6) * 14, 32 + Math.floor(i / 6) * 14])
    const me = 14
    const near = [8, 13, 15, 20]
    return (
      <>
        <g strokeWidth="0.6" opacity=".55">
          {near.map((j) => <path key={j} d={`M${pts[me][0]} ${pts[me][1]} L${pts[j][0]} ${pts[j][1]}`} />)}
        </g>
        {pts.map(([x, y], i) =>
          i === me ? null : near.includes(i) ? (
            <circle key={i} cx={x} cy={y} r="3.2" />
          ) : (
            <circle key={i} cx={x} cy={y} r="2.2" fill="currentColor" stroke="none" opacity={0.75} />
          ),
        )}
        <circle cx={pts[me][0]} cy={pts[me][1]} r="6" fill={a} stroke="none" />
      </>
    )
  },

  // A hopeful ending: a striped sun on the horizon, like an old travel print.
  sunrise: (a, id) => (
    <>
      <clipPath id={`${id}-s`}>
        {[[44, 16], [62, 9], [73, 5], [80, 2]].map(([y, h]) => <rect key={y} x="0" y={y} width="120" height={h} />)}
      </clipPath>
      <circle cx="60" cy="82" r="36" fill={a} stroke="none" clipPath={`url(#${id}-s)`} />
      <path d="M8 82 H112" />
      <g strokeWidth="0.7">
        <path d="M22 91 H98" opacity=".6" />
        <path d="M36 99 H84" opacity=".4" />
        <path d="M48 107 H72" opacity=".25" />
      </g>
    </>
  ),

  // An open ending: a door ajar, light spilling across the floor.
  door: (a, id) => (
    <>
      <path d="M36 104 L84 104 L108 118 L12 118Z" fill={a} stroke="none" opacity=".55" />
      <path d="M36 104 V20 H84 V104" />
      <Hatch id={`${id}-d`} shape={<path d="M84 20 L100 28 V110 L84 104Z" />} angle={0} gap={3} opacity={0.5} />
      <path d="M84 20 L100 28 V110 L84 104Z" />
      <circle cx="95" cy="66" r="1.8" fill="currentColor" stroke="none" />
      <path d="M8 104 H36 M84 104 H112" strokeWidth="0.7" opacity=".5" />
    </>
  ),

  // A love story: two lines that keep finding each other.
  threads: (a) => (
    <>
      <path d="M8 66 C30 22 50 22 60 60 C70 98 90 98 112 54" />
      <path d="M8 54 C30 98 50 98 60 60 C70 22 90 22 112 66" />
      <g strokeWidth="0.6" opacity=".4">
        <path d="M8 72 C30 30 50 30 60 66 C70 104 90 104 112 60" />
        <path d="M8 48 C30 90 50 90 60 54 C70 16 90 16 112 72" />
      </g>
      <circle cx="60" cy="60" r="6" fill={a} stroke="none" />
    </>
  ),

  // A journey into the unknown: a compass rose with fine graduations.
  compass: (a) => (
    <>
      <circle cx="60" cy="60" r="44" />
      <circle cx="60" cy="60" r="34" strokeWidth="0.6" opacity=".45" />
      <g strokeWidth="0.6">
        {range(0, 71, 1).map((i) => (
          <path key={i} d={`M60 ${i % 9 === 0 ? 16 : 19} V${i % 9 === 0 ? 26 : 22}`} transform={`rotate(${i * 5} 60 60)`} opacity={i % 9 === 0 ? 1 : 0.55} />
        ))}
      </g>
      <path d="M60 28 L65 60 L60 92 L55 60Z" />
      <path d="M60 28 L65 60 H55Z" fill={a} stroke="none" />
      <circle cx="60" cy="60" r="2" fill="currentColor" stroke="none" />
    </>
  ),
}

export const MOTIF_NAMES = Object.keys(MOTIFS)

export default function Motif({ name, accent = '#A65D36', className = '', strokeWidth = 1.25, animate = false }) {
  const draw = MOTIFS[name] ?? MOTIFS.ripple
  const id = `mf${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
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
      {draw(accent, id)}
    </motion.svg>
  )
}
