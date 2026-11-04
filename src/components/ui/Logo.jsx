// The official Kappiness logo, unmodified (white margin trimmed, white made transparent).
// On dark surfaces it sits on a small cream plate so the brown wordmark keeps its contrast.
import { LOGO_SRC } from '../../lib/media.js'

export default function Logo({ className = 'h-9', onDark = false }) {
  const img = <img src={LOGO_SRC} alt="Kappiness" className={`w-auto select-none ${className}`} draggable={false} />
  if (!onDark) return img
  return <span className="inline-flex rounded-xl bg-cream px-2.5 py-1.5">{img}</span>
}
