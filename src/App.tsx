import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { WebAudioRenderer } from './audio/WebAudioRenderer'
import { ResultsView } from './components/ResultsView'
import { TelemetryPanel } from './components/TelemetryPanel'
import { codecV0 } from './domain/codec'
import {
  createExperimentId,
  loadTrials,
  nextSessionNumber,
  saveTrial,
  type TrialResult,
} from './domain/experiments'
import { ServiceSimulator } from './domain/simulator'
import {
  SCENARIOS,
  SCENARIO_LABELS,
  type Scenario,
} from './domain/telemetry'

type Mode = 'learn' | 'blind' | 'results'

function randomScenario(): Scenario {
  return SCENARIOS[Math.floor(Math.random() * SCENARIOS.length)]
}

function App() {
  const [initialExperiment] = useState(() => {
    try {
      const storedTrials = loadTrials()
      return {
        storedTrials,
        sessionNumber: nextSessionNumber(storedTrials),
        sessionId: createExperimentId(),
        storageError: '',
      }
    } catch (error) {
      return {
        storedTrials: [],
        sessionNumber: 1,
        sessionId: createExperimentId(),
        storageError:
          error instanceof Error
            ? error.message
            : 'Local experiment data is unavailable.',
      }
    }
  })
  const [initialSimulator] = useState(() => new ServiceSimulator('NORMAL'))
  const [mode, setMode] = useState<Mode>('learn')
  const [learnScenario, setLearnScenario] = useState<Scenario>('NORMAL')
  const [blindScenario, setBlindScenario] = useState<Scenario | null>(null)
  const [trialStartedAt, setTrialStartedAt] = useState<number | null>(null)
  const [lastTrial, setLastTrial] = useState<TrialResult | null>(null)
  const [trials, setTrials] = useState<TrialResult[]>(
    initialExperiment.storedTrials,
  )
  const [audioEnabled, setAudioEnabled] = useState(false)
  const [audioError, setAudioError] = useState('')
  const [storageError, setStorageError] = useState(
    initialExperiment.storageError,
  )
  const [trialNotice, setTrialNotice] = useState('')

  const sessionNumber = initialExperiment.sessionNumber
  const simulator = useRef(initialSimulator)
  const renderer = useRef<WebAudioRenderer | null>(null)
  const [telemetry, setTelemetry] = useState(() => initialSimulator.next(0.25))
  const sensoryFrame = codecV0.encode(telemetry)

  useEffect(() => {
    let previous = performance.now()
    const interval = window.setInterval(() => {
      const now = performance.now()
      setTelemetry(simulator.current.next((now - previous) / 1_000))
      previous = now
    }, 250)
    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    if (audioEnabled) renderer.current?.render(sensoryFrame)
  }, [audioEnabled, sensoryFrame])

  useEffect(
    () => () => {
      void renderer.current?.stop()
    },
    [],
  )

  useEffect(() => {
    function synchronizeTrials(): void {
      try {
        const storedTrials = loadTrials()
        setTrials((currentTrials) => {
          const merged = new Map(
            storedTrials.map((trial) => [trial.id, trial]),
          )
          for (const trial of currentTrials) {
            merged.set(trial.id, trial)
          }
          return [...merged.values()].sort((left, right) =>
            left.timestamp.localeCompare(right.timestamp),
          )
        })
      } catch (error) {
        setStorageError(
          error instanceof Error
            ? error.message
            : 'Local experiment data is unavailable.',
        )
      }
    }

    window.addEventListener('storage', synchronizeTrials)
    return () => window.removeEventListener('storage', synchronizeTrials)
  }, [])

  function cancelActiveTrial(notice = ''): void {
    setBlindScenario(null)
    setTrialStartedAt(null)
    setTrialNotice(notice)
  }

  function switchMode(nextMode: Mode): void {
    setMode(nextMode)
    setLastTrial(null)
    if (nextMode !== 'blind') cancelActiveTrial()
    if (nextMode === 'learn') {
      simulator.current = new ServiceSimulator(learnScenario)
    } else if (nextMode === 'blind') {
      simulator.current = new ServiceSimulator('NORMAL')
    }
  }

  function changeLearnScenario(scenario: Scenario): void {
    setLearnScenario(scenario)
    simulator.current = new ServiceSimulator(scenario)
  }

  async function toggleAudio(): Promise<boolean> {
    if (audioEnabled) {
      await renderer.current?.stop()
      renderer.current = null
      setAudioEnabled(false)
      if (blindScenario !== null) {
        cancelActiveTrial('Trial cancelled because audio was stopped.')
      }
      return false
    }

    try {
      const nextRenderer = new WebAudioRenderer()
      await nextRenderer.start()
      nextRenderer.render(sensoryFrame)
      renderer.current = nextRenderer
      setAudioEnabled(true)
      setAudioError('')
      return true
    } catch (error) {
      setAudioError(
        error instanceof Error ? error.message : 'Audio could not be started.',
      )
      return false
    }
  }

  function startBlindTrial(event: MouseEvent<HTMLButtonElement>): void {
    if (!audioEnabled) return
    const scenario = randomScenario()
    simulator.current = new ServiceSimulator(scenario)
    setTelemetry(simulator.current.next(0.25))
    setBlindScenario(scenario)
    setTrialStartedAt(event.timeStamp)
    setLastTrial(null)
    setTrialNotice('')
  }

  function classify(
    answer: Scenario,
    event: MouseEvent<HTMLButtonElement>,
  ): void {
    if (blindScenario === null || trialStartedAt === null) return

    const result: TrialResult = {
      id: createExperimentId(),
      sessionId: initialExperiment.sessionId,
      timestamp: new Date().toISOString(),
      scenario: blindScenario,
      answer,
      correct: answer === blindScenario,
      reactionTimeMs: Math.round(event.timeStamp - trialStartedAt),
      sessionNumber,
      codecVersion: codecV0.version,
    }
    const nextTrials = [...trials, result]
    try {
      saveTrial(result)
      setStorageError('')
    } catch (error) {
      setStorageError(
        error instanceof Error
          ? `Trial is in memory but was not persisted: ${error.message}`
          : 'Trial is in memory but could not be persisted.',
      )
    }
    setTrials(nextTrials)
    setLastTrial(result)
    setBlindScenario(null)
    setTrialStartedAt(null)
    simulator.current = new ServiceSimulator('NORMAL')
  }

  return (
    <main>
      <header className="masthead">
        <div>
          <p className="brand">HORUS / PULSE</p>
          <h1>Hear the shape of a system.</h1>
          <p className="lede">
            A trainer for learning continuous software telemetry as sound.
          </p>
        </div>
        <div className="audio-control">
          <span className={audioEnabled ? 'status active' : 'status'} />
          <button className="secondary" onClick={() => void toggleAudio()}>
            {audioEnabled ? 'Stop audio' : 'Start audio'}
          </button>
          {audioError && <p className="error">{audioError}</p>}
          {storageError && <p className="error">{storageError}</p>}
        </div>
      </header>

      <nav aria-label="Trainer mode">
        {(['learn', 'blind', 'results'] as const).map((item) => (
          <button
            className={mode === item ? 'nav-button selected' : 'nav-button'}
            key={item}
            onClick={() => switchMode(item)}
          >
            {item === 'blind' ? 'Blind test' : item}
          </button>
        ))}
      </nav>

      <div className="workspace">
        {mode === 'learn' && (
          <section>
            <div className="section-heading">
              <div>
                <p className="eyebrow">Learn mode</p>
                <h2>{SCENARIO_LABELS[learnScenario]}</h2>
              </div>
              <label>
                Scenario
                <select
                  value={learnScenario}
                  onChange={(event) =>
                    changeLearnScenario(event.target.value as Scenario)
                  }
                >
                  {SCENARIOS.map((scenario) => (
                    <option key={scenario} value={scenario}>
                      {SCENARIO_LABELS[scenario]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <TelemetryPanel telemetry={telemetry} />
            <div className="sensory-strip">
              <span>Codec V0</span>
              <div>
                {Object.entries(sensoryFrame).map(([name, value]) => (
                  <label key={name}>
                    {name}
                    <progress
                      max="1"
                      value={
                        name === 'spatialPosition'
                          ? (value + 1) / 2
                          : value
                      }
                    />
                  </label>
                ))}
              </div>
            </div>
          </section>
        )}

        {mode === 'blind' && (
          <section className="blind-panel">
            <p className="eyebrow">Blind test / Session {sessionNumber}</p>
            {blindScenario === null ? (
              <div className="trial-ready">
                {lastTrial ? (
                  <>
                    <p className={lastTrial.correct ? 'verdict correct' : 'verdict'}>
                      {lastTrial.correct ? 'Correct' : 'Not this time'}
                    </p>
                    <h2>{SCENARIO_LABELS[lastTrial.scenario]}</h2>
                    <p>
                      You answered {SCENARIO_LABELS[lastTrial.answer]} in{' '}
                      {(lastTrial.reactionTimeMs / 1_000).toFixed(1)} seconds.
                    </p>
                  </>
                ) : (
                  <>
                    <h2>Classify a hidden system state</h2>
                    <p>
                      {trialNotice ||
                        'A new randomized sequence is generated for every trial.'}
                    </p>
                  </>
                )}
                <button
                  className="primary"
                  disabled={!audioEnabled}
                  onClick={startBlindTrial}
                >
                  {!audioEnabled
                    ? 'Start audio to begin'
                    : lastTrial
                      ? 'Start next trial'
                      : 'Start blind trial'}
                </button>
              </div>
            ) : (
              <div className="trial-active">
                <div className="pulse-mark" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </div>
                <h2>What state are you hearing?</h2>
                <p>Telemetry and scenario identity are hidden.</p>
                <div className="answer-grid">
                  {SCENARIOS.map((scenario) => (
                    <button
                      className="answer"
                      key={scenario}
                      onClick={(event) => classify(scenario, event)}
                    >
                      {SCENARIO_LABELS[scenario]}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {mode === 'results' && <ResultsView trials={trials} />}
      </div>

      <footer>
        <span>{codecV0.version}</span>
        <span>Local-only experiment data</span>
      </footer>
    </main>
  )
}

export default App
