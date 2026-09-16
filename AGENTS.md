# Horus engineering guide

This file is the continuation contract for coding agents and contributors.
Read `README.md` first for the product thesis, Codec V0 mapping, experiment
protocol, and Milestone 0 definition of done.

## Current product state

Horus Pulse Milestone 0 is a local React trainer for testing whether a person
can learn to classify hidden software-system states from continuous sound.

The repository was an implementation-free concept before Milestone 0. The
`pre-hackathon-2026` tag identifies that baseline. Milestone 0 replaced an empty
Python requirements file and obsolete Python 2.7 Wercker template with the
current TypeScript application.

Milestone 0 is complete when the tests, lint, production build, and the
Learn-to-Blind-to-Results browser journey work. Do not reinterpret it as a
production monitoring product.

## Public repository boundary

This repository is public and must remain self-contained.

- Never commit secrets, credentials, proprietary data, private endpoint names,
  internal identifiers, or non-public telemetry.
- Do not add private service adapters or organization-specific integrations.
- Demonstrations using non-public systems or data must live outside this
  repository. Keep this project limited to public contracts, synthetic fixtures,
  and reusable sensory-learning behavior.
- Do not add cloud infrastructure, authentication, remote persistence, AI/LLM
  features, OpenTelemetry ingestion, mobile clients, or custom hardware unless a
  later milestone explicitly changes the public product scope.

## Architectural invariants

The central dependency direction is:

```text
telemetry generation -> sensory codec -> renderer
```

Preserve these boundaries:

1. `TelemetryFrame` represents machine state and knows nothing about sensory
   encoding or audio.
2. `SensoryCodec` is a pure transformation from `TelemetryFrame` to
   `SensoryFrame`. It must not import browser, React, or Web Audio APIs.
3. `SensoryFrame` is renderer-neutral. A future haptic or visual renderer should
   be able to consume it without changing telemetry generation.
4. `WebAudioRenderer` consumes sensory values. It must not infer scenarios or
   read raw telemetry.
5. Analytics are derived from immutable raw trials. Never replace raw trial data
   with aggregates.

Do not bypass the codec by mapping telemetry directly in a component or
renderer. Do not place simulation behavior in React components.

## Source map

| Path | Responsibility |
| --- | --- |
| `src/domain/telemetry.ts` | Shared scenario names, labels, and `TelemetryFrame` |
| `src/domain/simulator.ts` | Stateful evolving telemetry with randomized drift |
| `src/domain/codec.ts` | Renderer-neutral `SensoryFrame`, codec contract, Codec V0 |
| `src/audio/WebAudioRenderer.ts` | Smooth continuous Web Audio synthesis |
| `src/domain/experiments.ts` | Trial schema, local records, migration, export |
| `src/domain/analytics.ts` | Accuracy, reaction time, sessions, confusion matrix |
| `src/components/TelemetryPanel.tsx` | Visible Learn-mode telemetry |
| `src/components/ResultsView.tsx` | Derived experiment results |
| `src/App.tsx` | Mode and trial lifecycle orchestration |
| `src/main.tsx` | React application entry point |
| `src/index.css` | Global responsive presentation |
| `index.html`, `public/favicon.svg` | Browser shell and public identity |

Pure domain behavior has colocated `*.test.ts` files.

## Experiment integrity

These are correctness requirements, not optional polish:

- Every simulator instance begins with randomized normal conditions and evolves
  toward its scenario over several seconds. Do not replace this with fixed
  samples or immediate static target values.
- A blind trial creates a new simulator. It must never replay Learn-mode frames.
- Blind mode must not reveal scenario identity or raw telemetry before an answer.
- Audio must be active before a trial begins. Reaction timing starts with hidden
  scenario generation, not browser audio startup.
- Leaving Blind mode or stopping audio cancels the active trial.
- Blind mode creates a fresh Normal simulator before and between trials. This is
  the standardized pre-trial baseline; do not preserve Learn-mode or prior-trial
  audio in the ready state.
- Codec V0 is frozen as `codec-v0`. Any mapping change requires a new codec
  version and results must retain the version used.
- Each raw trial has unique `id` and `sessionId` values. Storage synchronization
  merges by trial ID so concurrent tabs cannot replace or erase records.
- `sessionNumber` is a human-readable local sequence and can collide across tabs.
  Group and merge by `sessionId`, never by `sessionNumber`.
- If persistence fails, keep the trial available in memory and surface the
  failure. Never report successful persistence when the write failed.

## Trial data contract

`TrialResult` currently stores:

```text
id
sessionId
timestamp
scenario
answer
correct
reactionTimeMs
sessionNumber
codecVersion
```

New fields should be additive and optional until a migration exists. Changes to
stored data must preserve readable historical trials. Export remains raw JSON so
later analysis does not depend on the current UI.

Individual records use the `horus-pulse-trial-v0:` local-storage prefix. The
legacy whole-array key is `horus-pulse-trials-v0`. Loading is intentionally
strict: one malformed record makes the stored dataset unavailable and surfaces
an error. Never make an existing field newly required without adding migration
and backfill logic before validation. Extra fields are currently tolerated.

## Codec evolution

`codecV0` is currently a module-level singleton hardwired in `App.tsx` for
encoding, trial version recording, and the footer. There is no runtime codec
selector. Do not edit `CodecV0` to experiment with a new mapping. Instead:

1. Add another `SensoryCodec` implementation with a new stable version.
2. Document every input range and sensory output mapping.
3. Add deterministic boundary tests.
4. Introduce one codec injection point selected once when a session begins.
5. Record that selected version in every trial and display it consistently.
6. Do not add a control that can switch codecs within an active session.

Renderer-only sound design changes can still affect perception. Treat material
renderer changes as experiment-version changes even when normalized codec output
is unchanged.

## Scenario evolution

When adding or changing a scenario:

1. Update `SCENARIOS`, `Scenario`, and `SCENARIO_LABELS`.
2. Define a target signature in `simulator.ts` while retaining gradual onset and
   random drift.
3. Add simulator evidence that the signature becomes distinguishable without
   eliminating within-scenario variation.
4. Update every classification surface, result table, confusion matrix, chance
   baseline, protocol description, and mapping documentation.

Avoid shortcuts that make labels detectable from timing, sequence length, UI
behavior, or any signal outside the sensory representation.

## Local workflow

Requires Node.js 22 or newer.

```powershell
npm install
npm run dev
```

Before considering a change complete:

```powershell
npm test
npm run lint
npm run build
```

Tests run with Vitest in its default Node environment. No DOM, jsdom, or browser
test environment is configured; adding one should be a deliberate dependency
decision. Oxlint uses `.oxlintrc.json`. There is currently no hosted CI.

For behavioral changes, manually exercise:

1. Start audio in Learn mode.
2. Listen to all five scenarios long enough for each state to emerge.
3. Start a Blind trial and verify telemetry and identity remain hidden.
4. Classify it and inspect reaction time and feedback.
5. Reload the page and verify Results retains the raw trial.
6. Confirm JSON export contains the raw record and codec version.

Use headphones when evaluating dependency degradation because stereo position is
part of Codec V0.

## Smallest safe extension strategy

Prefer vertical, evidence-producing changes:

1. Define the product hypothesis and measurable trial data first.
2. Extend pure domain types and tests.
3. Implement or version the codec.
4. Adapt the renderer without crossing dependency boundaries.
5. Expose the behavior in Learn mode.
6. Include it in fresh Blind trials.
7. Add derived analysis and documentation.

Do not add infrastructure in anticipation of a future need.

Dependency additions require a concrete Milestone need and license review.
Prefer platform APIs and existing dependencies. `node_modules` and generated
`dist` output are ignored and must not be committed. The repository currently
has no license file, so do not assume permission to copy code into or out of it
and do not select a license without owner approval.

## Known Milestone 0 limitations

- Training duration and blind-trial exposure duration are participant-controlled.
- Sessions are browser-local and not participant identities.
- Headphone use, volume, ambient noise, and hardware are uncontrolled.
- Results are descriptive; the application does not yet calculate confidence
  intervals or statistical significance against the 20% chance baseline.
- Synthetic scenario distributions are intentionally understandable and have
  not been calibrated against a real production workload.

These limitations are candidates for future public milestones. Resolve them only
when they advance a stated learning hypothesis.
