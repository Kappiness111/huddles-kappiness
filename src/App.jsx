import { useEffect } from 'react'
import { MotionConfig, motion } from 'framer-motion'
import { ExperienceProvider, useExperience } from './state/ExperienceContext.jsx'
import { I18nProvider } from './i18n/index.jsx'
import IdleGuard from './components/layout/IdleGuard.jsx'
import WelcomeScreen from './screens/WelcomeScreen.jsx'
import RegisterScreen from './screens/RegisterScreen.jsx'
import MindLabScreen from './screens/MindLabScreen.jsx'
import QuizScreen from './screens/QuizScreen.jsx'
import RevealScreen from './screens/RevealScreen.jsx'
import BookScreen from './screens/BookScreen.jsx'
import MovieScreen from './screens/MovieScreen.jsx'
import ReceiptScreen from './screens/ReceiptScreen.jsx'
import ThanksScreen from './screens/ThanksScreen.jsx'

const SCREENS = {
  welcome: WelcomeScreen,
  register: RegisterScreen,
  mindlab: MindLabScreen,
  quiz: QuizScreen,
  reveal: RevealScreen,
  book: BookScreen,
  movie: MovieScreen,
  receipt: ReceiptScreen,
  thanks: ThanksScreen,
}

// Screens that need earlier steps' data fall back to the start (e.g. after a reset).
const NEEDS = {
  mindlab: (s) => s.attendee.name,
  quiz: (s) => s.attendee.name,
  reveal: (s) => s.result,
  book: (s) => s.result && s.prefs.book,
  movie: (s) => s.result && s.prefs.movie,
  receipt: (s) => s.result && s.prefs.book,
}

function Screens() {
  const { state } = useExperience()
  const ok = NEEDS[state.step] ? NEEDS[state.step](state) : true
  const step = ok ? state.step : 'welcome'
  const Screen = SCREENS[step]

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [step])

  return (
    // Fade-in only: navigation never waits on an exit animation (a stalled exit would blank a kiosk).
    // Keyed by session so a reset remounts everything and no component keeps old local state.
    <motion.div key={`${state.sessionId}-${step}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <Screen />
    </motion.div>
  )
}

function WithI18n({ children }) {
  const { state } = useExperience()
  return <I18nProvider lang={state.uiLang}>{children}</I18nProvider>
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <ExperienceProvider>
        <WithI18n>
          <Screens />
          <IdleGuard />
        </WithI18n>
      </ExperienceProvider>
    </MotionConfig>
  )
}
