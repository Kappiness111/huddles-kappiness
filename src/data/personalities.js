// Story identities — creative entertainment labels, not psychological categories.
// Text lives in the locale files under `personalities.<id>`. `affinity` weights genres + traits;
// the engine picks the best match for the attendee's profile, while making sure the same identity
// isn't handed to the next visitor (see pickPersonality). `tone` colours the reveal.
// Each identity leans on its own lead genre so all 14 come up regularly. `balance` is a small
// calibration factor (measured over thousands of simulated visitors) so blended identities, which
// average several dimensions, aren't crowded out by single-genre ones.

export const PERSONALITIES = [
  {
    id: 'quiet-dreamer',
    affinity: { selfDiscovery: 1.5, literary: 1, fantasy: 1, dreamy: 2.5, calm: 2.5 },
    balance: 1.12,
    tone: { bg: '#2F3A4F', ink: '#F5EBDD', accent: '#D9A45B', motif: 'moon' },
  },
  {
    id: 'mystery-seeker',
    affinity: { mystery: 3, thriller: 1, mind: 1.5 },
    tone: { bg: '#24312F', ink: '#F5EBDD', accent: '#D9A45B', motif: 'maze' },
  },
  {
    id: 'romantic-soul',
    affinity: { romance: 3, drama: 1, heart: 2 },
    tone: { bg: '#7A3E2C', ink: '#F5EBDD', accent: '#E8D0B0', motif: 'threads' },
  },
  {
    id: 'curious-explorer',
    affinity: { scifi: 3, adventure: 1, philosophy: 1, bold: 1, mind: 1 },
    tone: { bg: '#1F3B44', ink: '#F5EBDD', accent: '#D9A45B', motif: 'compass' },
  },
  {
    id: 'thoughtful-observer',
    affinity: { contemporary: 2.5, drama: 1.5, psychological: 0.5, grounded: 2 },
    balance: 0.97,
    tone: { bg: '#4A3A2E', ink: '#F5EBDD', accent: '#D9A45B', motif: 'window' },
  },
  {
    id: 'hopeful-storyteller',
    affinity: { selfDiscovery: 2.5, drama: 1.5, romance: 0.5, heart: 1.5 },
    balance: 1.05,
    tone: { bg: '#A65D36', ink: '#F5EBDD', accent: '#F5EBDD', motif: 'sunrise' },
  },
  {
    id: 'intellectual-wanderer',
    affinity: { philosophy: 3, literary: 1, mind: 2 },
    tone: { bg: '#33231F', ink: '#F5EBDD', accent: '#D9A45B', motif: 'prism' },
  },
  {
    id: 'time-traveller',
    affinity: { historical: 3, adventure: 1, literary: 0.5, dreamy: 1, calm: 0.5 },
    tone: { bg: '#5A4632', ink: '#F5EBDD', accent: '#E8D0B0', motif: 'arch' },
  },
  {
    id: 'kindred-spirit',
    affinity: { relationships: 3, contemporary: 1, drama: 0.5, heart: 2 },
    tone: { bg: '#6B4636', ink: '#F5EBDD', accent: '#E8D0B0', motif: 'crowd' },
  },
  {
    id: 'thrill-chaser',
    affinity: { thriller: 3, adventure: 1.5, mystery: 0.5, bold: 2 },
    balance: 0.96,
    tone: { bg: '#2A2523', ink: '#F5EBDD', accent: '#D9A45B', motif: 'zigzag' },
  },
  {
    id: 'poetic-soul',
    affinity: { literary: 3, romance: 1, calm: 1.5, dreamy: 1 },
    tone: { bg: '#4E3B4A', ink: '#F5EBDD', accent: '#E8D0B0', motif: 'page' },
  },
  {
    id: 'free-spirit',
    affinity: { adventure: 2.5, selfDiscovery: 2.5, bold: 1.5, dreamy: 1 },
    balance: 1.08,
    tone: { bg: '#3E5A4C', ink: '#F5EBDD', accent: '#E8D0B0', motif: 'seed' },
  },
  {
    id: 'deep-diver',
    affinity: { psychological: 3, drama: 1, mind: 1.5 },
    balance: 1.05,
    tone: { bg: '#1E2A3A', ink: '#F5EBDD', accent: '#D9A45B', motif: 'spiral' },
  },
  {
    id: 'myth-maker',
    affinity: { fantasy: 2, adventure: 1, historical: 0.5, dreamy: 1 },
    balance: 0.95,
    tone: { bg: '#3B2F4F', ink: '#F5EBDD', accent: '#D9A45B', motif: 'door' },
  },
]
