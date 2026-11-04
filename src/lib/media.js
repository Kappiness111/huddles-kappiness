// URLs for files in /public. They must be prefixed with Vite's BASE_URL so they resolve both
// locally ("/") and when deployed under a sub-path such as GitHub Pages ("/huddles-kappiness/").
export const publicUrl = (path) => `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`

export const LOGO_SRC = publicUrl('brand/kappiness-logo-transparent.png')

// Local cover/poster paths (files are downloaded by scripts/fetch-media.mjs).
export const mediaSrc = (kind, id) => publicUrl(`media/${kind}/${id}.jpg`)
