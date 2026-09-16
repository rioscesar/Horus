import { SCENARIOS, type Scenario } from './telemetry'

export interface TrialResult {
  id: string
  sessionId: string
  timestamp: string
  scenario: Scenario
  answer: Scenario
  correct: boolean
  reactionTimeMs: number
  sessionNumber: number
  codecVersion: string
}

const LEGACY_STORAGE_KEY = 'horus-pulse-trials-v0'
const TRIAL_STORAGE_PREFIX = 'horus-pulse-trial-v0:'

function isScenario(value: unknown): value is Scenario {
  return typeof value === 'string' && SCENARIOS.includes(value as Scenario)
}

type TrialFields = Omit<TrialResult, 'id' | 'sessionId'>

function hasTrialFields(value: unknown): value is TrialFields {
  if (typeof value !== 'object' || value === null) return false
  const trial = value as Record<string, unknown>
  return (
    typeof trial.timestamp === 'string' &&
    isScenario(trial.scenario) &&
    isScenario(trial.answer) &&
    typeof trial.correct === 'boolean' &&
    typeof trial.reactionTimeMs === 'number' &&
    typeof trial.sessionNumber === 'number' &&
    typeof trial.codecVersion === 'string'
  )
}

export function loadTrials(): TrialResult[] {
  try {
    const trials = new Map<string, TrialResult>()
    const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY)

    if (legacyRaw !== null) {
      const parsed: unknown = JSON.parse(legacyRaw)
      if (!Array.isArray(parsed) || !parsed.every(hasTrialFields)) {
        throw new Error('Legacy experiment data has an invalid shape.')
      }
      parsed.forEach((trial, index) => {
        const migrated: TrialResult = {
          ...trial,
          id: `legacy-${index}-${trial.timestamp}`,
          sessionId: `legacy-session-${trial.sessionNumber}`,
        }
        trials.set(migrated.id, migrated)
      })
    }

    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index)
      if (key === null || !key.startsWith(TRIAL_STORAGE_PREFIX)) continue
      const raw = localStorage.getItem(key)
      if (raw === null) continue
      const parsed: unknown = JSON.parse(raw)
      if (
        !hasTrialFields(parsed) ||
        typeof (parsed as Record<string, unknown>).id !== 'string' ||
        typeof (parsed as Record<string, unknown>).sessionId !== 'string'
      ) {
        throw new Error(`Experiment record ${key} has an invalid shape.`)
      }
      const trial = parsed as TrialResult
      trials.set(trial.id, trial)
    }

    return [...trials.values()].sort((left, right) =>
      left.timestamp.localeCompare(right.timestamp),
    )
  } catch (error) {
    throw new Error('Horus could not read local experiment data.', {
      cause: error,
    })
  }
}

export function saveTrial(trial: TrialResult): void {
  localStorage.setItem(
    `${TRIAL_STORAGE_PREFIX}${trial.id}`,
    JSON.stringify(trial),
  )
}

export function nextSessionNumber(trials: TrialResult[]): number {
  return trials.reduce(
    (maximum, trial) => Math.max(maximum, trial.sessionNumber),
    0,
  ) + 1
}

export function createExperimentId(): string {
  return crypto.randomUUID()
}

export function exportTrials(trials: TrialResult[]): void {
  const blob = new Blob([JSON.stringify(trials, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `horus-pulse-trials-${new Date().toISOString()}.json`
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}
