import { describe, expect, it } from 'vitest'
import { ServiceSimulator } from './simulator'
import type { Scenario } from './telemetry'

function seededRandom(seed: number): () => number {
  let state = seed
  return () => {
    state = (state * 1_664_525 + 1_013_904_223) % 4_294_967_296
    return state / 4_294_967_296
  }
}

function evolve(scenario: Scenario) {
  const simulator = new ServiceSimulator(scenario, seededRandom(42))
  let frame = simulator.next(0.25)
  for (let index = 0; index < 80; index += 1) {
    frame = simulator.next(0.25)
  }
  return frame
}

describe('ServiceSimulator', () => {
  it('evolves scenarios toward distinct telemetry signatures', () => {
    const normal = evolve('NORMAL')
    expect(evolve('TRAFFIC_SURGE').requestRate).toBeGreaterThan(
      normal.requestRate * 2,
    )
    expect(evolve('LATENCY_DEGRADATION').latencyP99Ms).toBeGreaterThan(
      normal.latencyP99Ms * 4,
    )
    expect(evolve('ERROR_STORM').errorRate).toBeGreaterThan(
      normal.errorRate * 10,
    )
    expect(
      evolve('DEPENDENCY_DEGRADATION').dependencyLatencyMs,
    ).toBeGreaterThan(normal.dependencyLatencyMs * 5)
  })

  it('produces changing values instead of a canned constant', () => {
    const simulator = new ServiceSimulator('NORMAL', seededRandom(7))
    const values = Array.from(
      { length: 20 },
      () => simulator.next(0.25).requestRate,
    )
    expect(new Set(values).size).toBeGreaterThan(10)
  })
})
