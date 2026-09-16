import type { TelemetryFrame } from './telemetry'

export interface SensoryFrame {
  intensity: number
  tempo: number
  texture: number
  spatialPosition: number
  modulation: number
}

export interface SensoryCodec {
  readonly version: string
  encode(telemetry: TelemetryFrame): SensoryFrame
}

function normalize(value: number, healthy: number, severe: number): number {
  return Math.min(1, Math.max(0, (value - healthy) / (severe - healthy)))
}

export class CodecV0 implements SensoryCodec {
  readonly version = 'codec-v0'

  encode(telemetry: TelemetryFrame): SensoryFrame {
    return {
      intensity: normalize(telemetry.latencyP99Ms, 100, 1_100),
      tempo: normalize(telemetry.requestRate, 80, 420),
      texture: normalize(telemetry.errorRate, 0.002, 0.2),
      spatialPosition: normalize(
        telemetry.dependencyLatencyMs,
        60,
        1_000,
      ) * 2 - 1,
      modulation: normalize(telemetry.dependencyLatencyMs, 80, 1_000),
    }
  }
}

export const codecV0 = new CodecV0()
