# Horus Pulse

Can a human brain learn to "see" heat? Horus generalizes that question: can
complex machine information become a persistent sensory representation that a
person learns to interpret intuitively?

Horus Pulse is Milestone 0: a local experiment that translates synthetic
software-system telemetry into continuous audio. It is deliberately not a
production observability platform.

Coding agents and contributors should read [`AGENTS.md`](AGENTS.md) for the
architecture invariants, experiment-integrity requirements, stored-data
contract, extension workflow, and public repository boundary.

## Milestone 0 hypothesis

After training, a participant can classify one of five hidden system states from
the Horus sensory representation substantially better than the 20% chance
baseline.

The five states are Normal, Traffic surge, Latency degradation, Error storm, and
Dependency degradation.

## Architecture

The implementation keeps three concerns separate:

```text
ServiceSimulator -> TelemetryFrame -> Codec V0 -> SensoryFrame -> WebAudioRenderer
                                          |
                                          +-> future non-audio renderer
```

- `src/domain/simulator.ts` generates evolving, noisy telemetry. Every simulator
  instance creates a new sequence; blind tests do not replay Learn mode data.
- `src/domain/codec.ts` is a pure, deterministic, versioned transformation. It
  has no browser or audio dependency.
- `src/audio/WebAudioRenderer.ts` interprets normalized sensory dimensions using
  Web Audio and smoothly ramps between frames.
- `src/domain/experiments.ts` stores raw trials in browser local storage and
  supports JSON export. Trials use unique records so another open tab cannot
  replace existing history.
- `src/domain/analytics.ts` derives aggregate results without altering raw data.

## Codec V0

Codec V0 is frozen as `codec-v0` for comparable sessions. Each output is
normalized to 0–1 except spatial position, which spans -1 (left) to +1 (right).

| Telemetry input | Sensory dimension | Audio interpretation |
| --- | --- | --- |
| Request rate, 80–420 req/s | Tempo | Pulse rate, 0.7–6 Hz |
| P99 latency, 100–1100 ms | Intensity | Carrier pitch and level |
| Error rate, 0.2%–20% | Texture | Amount of band-limited noise |
| Dependency latency, 60–1000 ms | Spatial position | Stereo movement from left to right |
| Dependency latency, 80–1000 ms | Modulation | Pulse depth |

Values outside a mapping range are clamped. The renderer's sound design can
evolve in later codec versions, but an experiment must use one version
throughout.

## Experiment protocol

1. Use **Learn** mode with audio enabled. Spend equal time with all five
   scenarios and observe the visible telemetry while listening.
2. Enable audio, then open **Blind test** and start a trial. A new simulator and
   randomized sequence are created; telemetry and identity stay hidden. Audio
   activation happens before timing so browser startup latency is excluded.
3. Listen until you can classify the state. Reaction time starts when the trial
   starts and stops when an answer is selected.
4. Repeat across multiple sessions. Do not change Codec V0 during the experiment.
5. Review overall accuracy, per-scenario accuracy, reaction time, session
   performance, and the confusion matrix. Export raw JSON before clearing browser
   storage or changing browsers, and verify that the JSON file was downloaded.

Blind mode uses a newly generated Normal baseline before and between trials.
This standardizes the sound preceding each hidden sequence without replaying a
Learn-mode sample.

This prototype does not control exposure duration, participant identity,
headphones, ambient noise, or training time. Those controls are candidates for
a later experimental protocol, not Milestone 0.

## Run the trainer

Requires Node.js 22 or newer.

```powershell
npm install
npm run dev
```

Open the local URL printed by Vite. Browser autoplay rules require pressing
**Start audio** before sound begins. Headphones are recommended because
dependency degradation uses stereo position.

```powershell
npm test
npm run lint
npm run build
```

## Definition of done

- Synthetic telemetry changes continuously with realistic random drift and five
  scenarios emerge over time rather than jumping to static values.
- Telemetry generation, Codec V0, and Web Audio rendering are separate.
- Learn mode displays scenario and telemetry while rendering sound.
- Blind mode hides both, generates a fresh sequence, records classification and
  reaction time, and identifies the codec version.
- Raw trials persist locally and remain exportable.
- Results include overall and per-scenario accuracy, average reaction time,
  session performance, and a confusion matrix.
- Pure simulator, codec, and analytics behavior is covered by automated tests.

## Explicit non-goals

No Azure integration, authentication, cloud storage, AI/LLM integration,
OpenTelemetry ingestion, mobile application, custom hardware, or production
alerting behavior is included in Milestone 0.
