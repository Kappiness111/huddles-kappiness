// Story identities — creative entertainment labels, not psychological categories.
// Text lives in the locale files under `personalities.<id>`. `affinity` weights genres + traits;
// the engine picks the best match for the attendee's profile. `tone` colours the reveal.

export const PERSONALITIES = [
  {
    id: 'quiet-dreamer',
    affinity: { fantasy: 2, literary: 1.5, selfDiscovery: 1.5, dreamy: 2, calm: 1 },
    tone: { bg: '#2F3A4F', ink: '#F5EBDD', accent: '#D9A45B', motif: 'moon' },
  },
  {
    id: 'mystery-seeker',
    affinity: { mystery: 3, thriller: 1.5, psychological: 1, mind: 1.5 },
    tone: { bg: '#24312F', ink: '#F5EBDD', accent: '#D9A45B', motif: 'maze' },
  },
  {
    id: 'romantic-soul',
    affinity: { romance: 3, relationships: 2, drama: 1, heart: 2 },
    tone: { bg: '#7A3E2C', ink: '#F5EBDD', accent: '#E8D0B0', motif: 'threads' },
  },
  {
    id: 'curious-explorer',
    affinity: { scifi: 2.5, adventure: 2.5, fantasy: 1, bold: 2 },
    tone: { bg: '#1F3B44', ink: '#F5EBDD', accent: '#D9A45B', motif: 'compass' },
  },
  {
    id: 'thoughtful-observer',
    affinity: { contemporary: 2.5, psychological: 1.5, drama: 1.5, relationships: 1, grounded: 2 },
    tone: { bg: '#4A3A2E', ink: '#F5EBDD', accent: '#D9A45B', motif: 'window' },
  },
  {
    id: 'hopeful-storyteller',
    affinity: { selfDiscovery: 2.5, drama: 1.5, romance: 1, contemporary: 1, heart: 1.5 },
    tone: { bg: '#A65D36', ink: '#F5EBDD', accent: '#F5EBDD', motif: 'sunrise' },
  },
  {
    id: 'intellectual-wanderer',
    affinity: { philosophy: 3, historical: 1.5, literary: 1.5, mind: 2 },
    tone: { bg: '#33231F', ink: '#F5EBDD', accent: '#D9A45B', motif: 'prism' },
  },
]
