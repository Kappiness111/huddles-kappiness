// A real cover / poster (API URL or bundled file). Live covers can take a few seconds (Open Library
// redirects through archive.org), so a soft shimmer shows until the image arrives, then it fades in.
// If it fails, a designed typographic cover is shown instead.
import { useState } from 'react'
import { motion } from 'framer-motion'

export default function CoverImage({ src, title, sub, alt, className = '', eager = false }) {
  const [state, setState] = useState('loading') // loading | loaded | failed
  if (!src || state === 'failed') {
    return (
      <div role="img" aria-label={alt} className={`flex flex-col justify-between bg-teal p-[8%] text-cream ${className}`}>
        <span className="font-display text-[0.8em] opacity-80">{sub}</span>
        <span className="font-display text-[1.3em] font-bold leading-tight">{title}</span>
      </div>
    )
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
      <img
        src={src}
        alt={alt}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        referrerPolicy="no-referrer"
        onLoad={() => setState('loaded')}
        onError={() => setState('failed')}
        className={`h-full w-full object-cover transition-opacity duration-500 ${state === 'loaded' ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  )
}
