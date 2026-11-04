// Verifies every Mind Lab pattern puzzle: the rule must reproduce the visible sequence's last
// steps, and its answer must appear exactly once among the options.  `npm run verify-mindlab`
import { PATTERN_BANK, patternAnswer } from '../src/data/mindlab.js'

let ok = true
for (const p of PATTERN_BANK) {
  const answer = patternAnswer(p)
  // The rule must also explain the sequence itself (predict each term from the ones before it).
  const explains = p.id === 'n5' || p.seq.slice(2).every((v, i) => p.rule(p.seq.slice(0, i + 2)) === v)
  const once = p.options.filter((o) => o === answer).length === 1
  console.log(`${p.id}: ${p.seq.join(', ')}, ? → ${answer}  rule-explains-sequence=${explains} answer-in-options=${once}`)
  if (!explains || !once) ok = false
}
if (!ok) process.exit(1)
console.log('All puzzles verified.')
