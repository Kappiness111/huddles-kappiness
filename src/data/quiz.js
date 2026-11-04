// This or That — the ONLY preference quiz. Text lives in the locale files under `quiz.<id>`.
// Each option adds weight to genre dimensions and storytelling traits.
// `motif` picks the abstract editorial line-art drawn behind the option (see Motif.jsx).

export const QUIZ = [
  {
    id: 'q1', // What makes a story memorable?
    a: { motif: 'ripple', genres: { drama: 3, relationships: 2, romance: 1 }, traits: { heart: 2 } },
    b: { motif: 'prism', genres: { psychological: 2, philosophy: 2, scifi: 1 }, traits: { mind: 2 } },
  },
  {
    id: 'q2', // What would you rather read?
    a: { motif: 'page', genres: { literary: 3, romance: 1, historical: 1 }, traits: { calm: 1, dreamy: 1 } },
    b: { motif: 'lattice', genres: { philosophy: 3, scifi: 1, psychological: 1 }, traits: { mind: 2 } },
  },
  {
    id: 'q3', // Which subject interests you more?
    a: { motif: 'orbit', genres: { relationships: 3, romance: 2, drama: 1 }, traits: { heart: 2 } },
    b: { motif: 'maze', genres: { psychological: 3, mystery: 1, thriller: 1 }, traits: { mind: 1, grounded: 1 } },
  },
  {
    id: 'q4', // Your ideal movie?
    a: { motif: 'portrait', genres: { drama: 3, literary: 1, contemporary: 1 }, traits: { heart: 1, grounded: 1 } },
    b: { motif: 'spiral', genres: { thriller: 3, psychological: 2, mystery: 2 }, traits: { bold: 1, mind: 1 } },
    interlude: 'i1',
  },
  {
    id: 'q5', // Which world attracts you?
    a: { motif: 'arch', genres: { historical: 3, literary: 1, romance: 1 }, traits: { calm: 1, grounded: 1 } },
    b: { motif: 'horizon', genres: { scifi: 3, adventure: 1, philosophy: 1 }, traits: { dreamy: 1, bold: 1 } },
  },
  {
    id: 'q6', // What do you value in storytelling?
    a: { motif: 'window', genres: { contemporary: 3, drama: 1, relationships: 1 }, traits: { grounded: 2 } },
    b: { motif: 'moon', genres: { fantasy: 3, scifi: 1, adventure: 1 }, traits: { dreamy: 2 } },
  },
  {
    id: 'q7', // Choose your narrative style.
    a: { motif: 'layers', genres: { literary: 2, historical: 1, drama: 1, selfDiscovery: 1 }, traits: { calm: 2 } },
    b: { motif: 'zigzag', genres: { thriller: 2, adventure: 2, mystery: 1 }, traits: { bold: 2 } },
    interlude: 'i2',
  },
  {
    id: 'q8', // Which would you explore?
    a: { motif: 'seed', genres: { selfDiscovery: 3, drama: 1 }, traits: { heart: 1, calm: 1 } },
    b: { motif: 'crowd', genres: { philosophy: 2, contemporary: 2, historical: 1 }, traits: { mind: 1, grounded: 1 } },
  },
  {
    id: 'q9', // How should a story end?
    a: { motif: 'sunrise', genres: { selfDiscovery: 2, romance: 1, contemporary: 1 }, traits: { heart: 1, dreamy: 1 } },
    b: { motif: 'door', genres: { literary: 2, psychological: 1, mystery: 1, philosophy: 1 }, traits: { mind: 1, calm: 1 } },
  },
  {
    id: 'q10', // Which would you rather follow?
    a: { motif: 'threads', genres: { romance: 3, relationships: 2 }, traits: { heart: 2 } },
    b: { motif: 'compass', genres: { adventure: 3, fantasy: 2, mystery: 1 }, traits: { bold: 2 } },
  },
]
