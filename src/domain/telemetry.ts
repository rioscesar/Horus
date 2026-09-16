export const SCENARIOS = [
  'NORMAL',
  'TRAFFIC_SURGE',
  'LATENCY_DEGRADATION',
  'ERROR_STORM',
  'DEPENDENCY_DEGRADATION',
] as const

export type Scenario = (typeof SCENARIOS)[number]

export interface TelemetryFrame {
  timestamp: number
  requestRate: number
  latencyP99Ms: number
  errorRate: number
  dependencyLatencyMs: number
}

export const SCENARIO_LABELS: Record<Scenario, string> = {
  NORMAL: 'Normal',
  TRAFFIC_SURGE: 'Traffic surge',
  LATENCY_DEGRADATION: 'Latency degradation',
  ERROR_STORM: 'Error storm',
  DEPENDENCY_DEGRADATION: 'Dependency degradation',
}
