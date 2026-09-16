import {
  SCENARIOS,
  type Scenario,
} from './telemetry'
import type { TrialResult } from './experiments'

export interface ScenarioAccuracy {
  scenario: Scenario
  correct: number
  total: number
  accuracy: number
}

export interface SessionPerformance {
  sessionId: string
  sessionNumber: number
  correct: number
  total: number
  accuracy: number
  averageReactionTimeMs: number
}

export interface ExperimentSummary {
  totalTrials: number
  overallAccuracy: number
  averageReactionTimeMs: number
  byScenario: ScenarioAccuracy[]
  bySession: SessionPerformance[]
  confusionMatrix: Record<Scenario, Record<Scenario, number>>
}

function ratio(correct: number, total: number): number {
  return total === 0 ? 0 : correct / total
}

function average(values: number[]): number {
  return values.length === 0
    ? 0
    : values.reduce((sum, value) => sum + value, 0) / values.length
}

export function summarizeTrials(trials: TrialResult[]): ExperimentSummary {
  const confusionMatrix = Object.fromEntries(
    SCENARIOS.map((actual) => [
      actual,
      Object.fromEntries(SCENARIOS.map((answer) => [answer, 0])),
    ]),
  ) as Record<Scenario, Record<Scenario, number>>

  for (const trial of trials) {
    confusionMatrix[trial.scenario][trial.answer] += 1
  }

  const byScenario = SCENARIOS.map((scenario) => {
    const scenarioTrials = trials.filter((trial) => trial.scenario === scenario)
    const correct = scenarioTrials.filter((trial) => trial.correct).length
    return {
      scenario,
      correct,
      total: scenarioTrials.length,
      accuracy: ratio(correct, scenarioTrials.length),
    }
  })

  const sessions = [
    ...new Map(
      trials.map((trial) => [
        trial.sessionId,
        {
          sessionId: trial.sessionId,
          sessionNumber: trial.sessionNumber,
        },
      ]),
    ).values(),
  ]
  const bySession = sessions.map(({ sessionId, sessionNumber }) => {
    const sessionTrials = trials.filter(
      (trial) => trial.sessionId === sessionId,
    )
    const correct = sessionTrials.filter((trial) => trial.correct).length
    return {
      sessionId,
      sessionNumber,
      correct,
      total: sessionTrials.length,
      accuracy: ratio(correct, sessionTrials.length),
      averageReactionTimeMs: average(
        sessionTrials.map((trial) => trial.reactionTimeMs),
      ),
    }
  })

  const correct = trials.filter((trial) => trial.correct).length
  return {
    totalTrials: trials.length,
    overallAccuracy: ratio(correct, trials.length),
    averageReactionTimeMs: average(
      trials.map((trial) => trial.reactionTimeMs),
    ),
    byScenario,
    bySession,
    confusionMatrix,
  }
}
