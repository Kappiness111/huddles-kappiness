// A real cover / poster (API URL or bundled file). Live covers can take a few seconds (Open Library
// redirects through archive.org), so a soft shimmer shows until the image arrives, then it fades in.
//
// Fitting: every frame is a 2:3 book/poster shape. Images close to that shape fill it (object-cover,
// so a slightly off ratio is trimmed invisibly). Images that are clearly NOT 2:3 (square or wide
// covers, scans with margins) are shown whole, centred over a soft blurred copy of themselves, so
// nothing is stretched or cropped badly. Tiny "no image" placeholders count as missing.
// If an image is missing or fails, a designed typographic cover is shown instead.
import { useState } from 'react'
import { motion } from 'framer-motion'

const TARGET = 2 / 3
const TOLERANCE = 0.09 // ratios within 0.58–0.76 fill the frame
const MIN_WIDTH = 60 // smaller than this is a placeholder pixel, not a cover

export default function CoverImage({ src, title, sub, alt, className = '', eager = false }) {
  const [state, setState] = useState('loading') // loading | loaded | failed
  const [fit, setFit] = useState('cover') // cover | contain
  const [failedSrc, setFailedSrc] = useState(null)
  // A new src (e.g. "Not for me" → next pick reusing this component) gets a fresh attempt.
  const [lastSrc, setLastSrc] = useState(src)
  if (src !== lastSrc) {
    setLastSrc(src)
    setState('loading')
    setFit('cover')
  }

  if (!src || state === 'failed' || failedSrc === src) {
    return (
      <div role="img" aria-label={alt} className={`flex flex-col justify-between bg-teal p-[8%] text-cream ${className}`}>
        <span className="font-display text-[0.8em] opacity-80">{sub}</span>
        <span className="font-display text-[1.3em] font-bold leading-tight">{title}</span>
      </div>
    )
  }

  const onLoad = (e) => {
    const { naturalWidth: w, naturalHeight: h } = e.currentTarget
    if (!w || !h || w < MIN_WIDTH) {
      setFailedSrc(src)
      setState('failed')
      return
    }
    setFit(Math.abs(w / h - TARGET) > TOLERANCE ? 'contain' : 'cover')
    setState('loaded')
  }

  return (
    <div className={`relative overflow-hidden bg-sand ${className}`}>
      {state === 'loading' && (
        <motion.div
          className="absolute inset-0 bg-[linear-gradient(110deg,transparent_30%,rgb(255_255_255/0.55)_50%,transparent_70%)] bg-[length:250%_100%]"
          animate={{ backgroundPositionX: ['100%', '-100%'] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
          aria-hidden="true"
        />
      )}
      {fit === 'contain' && state === 'loaded' && (
        <img src={src} alt="" aria-hidden="true" referrerPolicy="no-referrer" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-60 blur-xl" />
      )}
      <img
        src={src}
        alt={alt}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        referrerPolicy="no-referrer"
        onLoad={onLoad}
        onError={() => {
          setFailedSrc(src)
          setState('failed')
        }}
        className={`relative h-full w-full transition-opacity duration-500 ${fit === 'contain' ? 'object-contain drop-shadow-[0_6px_14px_rgba(36,25,21,.35)]' : 'object-cover'} ${state === 'loaded' ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  )
}
