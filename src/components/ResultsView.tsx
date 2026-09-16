import { summarizeTrials } from '../domain/analytics'
import { exportTrials, type TrialResult } from '../domain/experiments'
import { SCENARIOS, SCENARIO_LABELS } from '../domain/telemetry'

interface ResultsViewProps {
  trials: TrialResult[]
}

function percentage(value: number): string {
  return `${Math.round(value * 100)}%`
}

export function ResultsView({ trials }: ResultsViewProps) {
  const summary = summarizeTrials(trials)

  if (trials.length === 0) {
    return (
      <section className="empty-state">
        <p className="eyebrow">Experiment results</p>
        <h2>No blind trials yet</h2>
        <p>Complete a blind trial to begin measuring recognition.</p>
      </section>
    )
  }

  return (
    <section>
      <div className="section-heading">
        <div>
          <p className="eyebrow">Experiment results</p>
          <h2>Learning evidence</h2>
        </div>
        <button className="secondary" onClick={() => exportTrials(trials)}>
          Export raw JSON
        </button>
      </div>

      <div className="summary-grid">
        <article>
          <strong>{summary.totalTrials}</strong>
          <span>Trials</span>
        </article>
        <article>
          <strong>{percentage(summary.overallAccuracy)}</strong>
          <span>Overall accuracy</span>
        </article>
        <article>
          <strong>{(summary.averageReactionTimeMs / 1_000).toFixed(1)}s</strong>
          <span>Average response</span>
        </article>
        <article>
          <strong>{percentage(1 / SCENARIOS.length)}</strong>
          <span>Chance baseline</span>
        </article>
      </div>

      <div className="results-columns">
        <div>
          <h3>Accuracy by scenario</h3>
          <table>
            <thead>
              <tr>
                <th>Scenario</th>
                <th>Correct</th>
                <th>Accuracy</th>
              </tr>
            </thead>
            <tbody>
              {summary.byScenario.map((row) => (
                <tr key={row.scenario}>
                  <td>{SCENARIO_LABELS[row.scenario]}</td>
                  <td>
                    {row.correct}/{row.total}
                  </td>
                  <td>{percentage(row.accuracy)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div>
          <h3>Performance by session</h3>
          <table>
            <thead>
              <tr>
                <th>Session</th>
                <th>Accuracy</th>
                <th>Avg. response</th>
              </tr>
            </thead>
            <tbody>
              {summary.bySession.map((row) => (
                <tr key={row.sessionId}>
                  <td>{row.sessionNumber}</td>
                  <td>{percentage(row.accuracy)}</td>
                  <td>{(row.averageReactionTimeMs / 1_000).toFixed(1)}s</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="matrix-wrap">
        <h3>Confusion matrix</h3>
        <p className="table-note">Rows are actual; columns are answers.</p>
        <table className="matrix">
          <thead>
            <tr>
              <th>Actual</th>
              {SCENARIOS.map((scenario) => (
                <th key={scenario}>{SCENARIO_LABELS[scenario]}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SCENARIOS.map((actual) => (
              <tr key={actual}>
                <th>{SCENARIO_LABELS[actual]}</th>
                {SCENARIOS.map((answer) => (
                  <td key={answer}>
                    {summary.confusionMatrix[actual][answer]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
