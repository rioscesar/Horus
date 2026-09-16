import type { Scenario, TelemetryFrame } from './telemetry'

type MetricValues = Omit<TelemetryFrame, 'timestamp'>
type RandomSource = () => number

const NORMAL: MetricValues = {
  requestRate: 110,
  latencyP99Ms: 120,
  errorRate: 0.005,
  dependencyLatencyMs: 75,
}

const TARGETS: Record<Scenario, MetricValues> = {
  NORMAL,
  TRAFFIC_SURGE: {
    requestRate: 390,
    latencyP99Ms: 245,
    errorRate: 0.012,
    dependencyLatencyMs: 105,
  },
  LATENCY_DEGRADATION: {
    requestRate: 125,
    latencyP99Ms: 1_050,
    errorRate: 0.018,
    dependencyLatencyMs: 155,
  },
  ERROR_STORM: {
    requestRate: 150,
    latencyP99Ms: 310,
    errorRate: 0.19,
    dependencyLatencyMs: 115,
  },
  DEPENDENCY_DEGRADATION: {
    requestRate: 105,
    latencyP99Ms: 485,
    errorRate: 0.028,
    dependencyLatencyMs: 980,
  },
}

const NOISE_SCALE: MetricValues = {
  requestRate: 18,
  latencyP99Ms: 35,
  errorRate: 0.006,
  dependencyLatencyMs: 28,
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value))
}

function mix(from: number, to: number, amount: number): number {
  return from + (to - from) * amount
}

export class ServiceSimulator {
  readonly scenario: Scenario

  private readonly random: RandomSource
  private elapsedSeconds = 0
  private values: MetricValues
  private noise: MetricValues = {
    requestRate: 0,
    latencyP99Ms: 0,
    errorRate: 0,
    dependencyLatencyMs: 0,
  }

  constructor(
    scenario: Scenario,
    random: RandomSource = Math.random,
  ) {
    this.scenario = scenario
    this.random = random
    this.values = {
      requestRate: NORMAL.requestRate * (0.92 + this.random() * 0.16),
      latencyP99Ms: NORMAL.latencyP99Ms * (0.9 + this.random() * 0.2),
      errorRate: NORMAL.errorRate * (0.8 + this.random() * 0.4),
      dependencyLatencyMs:
        NORMAL.dependencyLatencyMs * (0.9 + this.random() * 0.2),
    }
  }

  next(deltaSeconds: number): TelemetryFrame {
    const dt = clamp(deltaSeconds, 0.01, 1)
    this.elapsedSeconds += dt

    // The scenario emerges over several seconds while low-frequency noise drifts.
    const scenarioBlend =
      this.scenario === 'NORMAL'
        ? 1
        : 1 - Math.exp(-this.elapsedSeconds / 4.5)
    const target = TARGETS[this.scenario]
    const response = 1 - Math.exp(-dt / 1.8)

    this.noise = {
      requestRate: this.drift(this.noise.requestRate, NOISE_SCALE.requestRate),
      latencyP99Ms: this.drift(
        this.noise.latencyP99Ms,
        NOISE_SCALE.latencyP99Ms,
      ),
      errorRate: this.drift(this.noise.errorRate, NOISE_SCALE.errorRate),
      dependencyLatencyMs: this.drift(
        this.noise.dependencyLatencyMs,
        NOISE_SCALE.dependencyLatencyMs,
      ),
    }

    const desired: MetricValues = {
      requestRate:
        mix(NORMAL.requestRate, target.requestRate, scenarioBlend) +
        this.noise.requestRate,
      latencyP99Ms:
        mix(NORMAL.latencyP99Ms, target.latencyP99Ms, scenarioBlend) +
        this.noise.latencyP99Ms,
      errorRate:
        mix(NORMAL.errorRate, target.errorRate, scenarioBlend) +
        this.noise.errorRate,
      dependencyLatencyMs:
        mix(
          NORMAL.dependencyLatencyMs,
          target.dependencyLatencyMs,
          scenarioBlend,
        ) + this.noise.dependencyLatencyMs,
    }

    this.values = {
      requestRate: mix(this.values.requestRate, desired.requestRate, response),
      latencyP99Ms: mix(
        this.values.latencyP99Ms,
        desired.latencyP99Ms,
        response,
      ),
      errorRate: mix(this.values.errorRate, desired.errorRate, response),
      dependencyLatencyMs: mix(
        this.values.dependencyLatencyMs,
        desired.dependencyLatencyMs,
        response,
      ),
    }

    return {
      timestamp: Date.now(),
      requestRate: Math.max(0, this.values.requestRate),
      latencyP99Ms: Math.max(1, this.values.latencyP99Ms),
      errorRate: clamp(this.values.errorRate, 0, 1),
      dependencyLatencyMs: Math.max(1, this.values.dependencyLatencyMs),
    }
  }

  private drift(previous: number, scale: number): number {
    const impulse = (this.random() * 2 - 1) * scale
    return previous * 0.82 + impulse * 0.18
  }
}
