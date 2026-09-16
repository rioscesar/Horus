import { describe, expect, it } from 'vitest'
import { summarizeTrials } from './analytics'
import type { TrialResult } from './experiments'

const trials: TrialResult[] = [
  {
    id: 'trial-1',
    sessionId: 'session-1',
    timestamp: '2026-09-15T00:00:00.000Z',
    scenario: 'NORMAL',
    answer: 'NORMAL',
    correct: true,
    reactionTimeMs: 1_000,
    sessionNumber: 1,
    codecVersion: 'codec-v0',
  },
  {
    id: 'trial-2',
    sessionId: 'session-1',
    timestamp: '2026-09-15T00:01:00.000Z',
    scenario: 'ERROR_STORM',
    answer: 'NORMAL',
    correct: false,
    reactionTimeMs: 3_000,
    sessionNumber: 1,
    codecVersion: 'codec-v0',
  },
]

describe('summarizeTrials', () => {
  it('calculates accuracy, response time, sessions, and confusion', () => {
    const summary = summarizeTrials(trials)
    expect(summary.overallAccuracy).toBe(0.5)
    expect(summary.averageReactionTimeMs).toBe(2_000)
    expect(summary.bySession[0].accuracy).toBe(0.5)
    expect(summary.confusionMatrix.ERROR_STORM.NORMAL).toBe(1)
  })
})
