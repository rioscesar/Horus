import { describe, expect, it } from 'vitest'
import { codecV0 } from './codec'
import type { TelemetryFrame } from './telemetry'

const baseline: TelemetryFrame = {
  timestamp: 0,
  requestRate: 80,
  latencyP99Ms: 100,
  errorRate: 0.002,
  dependencyLatencyMs: 60,
}

describe('CodecV0', () => {
  it('is deterministic and versioned', () => {
    expect(codecV0.version).toBe('codec-v0')
    expect(codecV0.encode(baseline)).toEqual(codecV0.encode(baseline))
  })

  it('maps each telemetry dimension independently', () => {
    expect(
      codecV0.encode({ ...baseline, requestRate: 420 }).tempo,
    ).toBe(1)
    expect(
      codecV0.encode({ ...baseline, latencyP99Ms: 1_100 }).intensity,
    ).toBe(1)
    expect(
      codecV0.encode({ ...baseline, errorRate: 0.2 }).texture,
    ).toBe(1)
    const dependency = codecV0.encode({
      ...baseline,
      dependencyLatencyMs: 1_000,
    })
    expect(dependency.spatialPosition).toBe(1)
    expect(dependency.modulation).toBe(1)
  })
})
