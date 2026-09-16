import type { TelemetryFrame } from '../domain/telemetry'

interface TelemetryPanelProps {
  telemetry: TelemetryFrame
}

export function TelemetryPanel({ telemetry }: TelemetryPanelProps) {
  const metrics = [
    ['Request rate', telemetry.requestRate.toFixed(0), 'req/s'],
    ['P99 latency', telemetry.latencyP99Ms.toFixed(0), 'ms'],
    ['Error rate', (telemetry.errorRate * 100).toFixed(1), '%'],
    ['Dependency latency', telemetry.dependencyLatencyMs.toFixed(0), 'ms'],
  ]

  return (
    <div className="metric-grid" aria-label="Current telemetry">
      {metrics.map(([label, value, unit]) => (
        <article className="metric" key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
          <small>{unit}</small>
        </article>
      ))}
    </div>
  )
}
