import type { SensoryFrame } from '../domain/codec'

export class WebAudioRenderer {
  private context: AudioContext | null = null
  private carrier: OscillatorNode | null = null
  private carrierGain: GainNode | null = null
  private pulse: OscillatorNode | null = null
  private pulseDepth: GainNode | null = null
  private noiseGain: GainNode | null = null
  private panner: StereoPannerNode | null = null

  async start(): Promise<void> {
    if (this.context !== null) {
      await this.context.resume()
      return
    }

    const context = new AudioContext()
    const carrier = context.createOscillator()
    const carrierGain = context.createGain()
    const pulse = context.createOscillator()
    const pulseDepth = context.createGain()
    const noiseGain = context.createGain()
    const panner = context.createStereoPanner()
    const master = context.createGain()

    carrier.type = 'sine'
    carrier.frequency.value = 180
    carrierGain.gain.value = 0.08
    pulse.type = 'sine'
    pulse.frequency.value = 1
    pulseDepth.gain.value = 0.025
    noiseGain.gain.value = 0
    master.gain.value = 0.5

    const noise = context.createBufferSource()
    const noiseBuffer = context.createBuffer(
      1,
      context.sampleRate * 2,
      context.sampleRate,
    )
    const channel = noiseBuffer.getChannelData(0)
    for (let index = 0; index < channel.length; index += 1) {
      channel[index] = Math.random() * 2 - 1
    }
    noise.buffer = noiseBuffer
    noise.loop = true

    const noiseFilter = context.createBiquadFilter()
    noiseFilter.type = 'bandpass'
    noiseFilter.frequency.value = 1_600
    noiseFilter.Q.value = 0.7

    pulse.connect(pulseDepth)
    pulseDepth.connect(carrierGain.gain)
    carrier.connect(carrierGain)
    carrierGain.connect(panner)
    noise.connect(noiseFilter)
    noiseFilter.connect(noiseGain)
    noiseGain.connect(panner)
    panner.connect(master)
    master.connect(context.destination)

    carrier.start()
    pulse.start()
    noise.start()

    this.context = context
    this.carrier = carrier
    this.carrierGain = carrierGain
    this.pulse = pulse
    this.pulseDepth = pulseDepth
    this.noiseGain = noiseGain
    this.panner = panner
  }

  render(frame: SensoryFrame): void {
    if (
      this.context === null ||
      this.carrier === null ||
      this.carrierGain === null ||
      this.pulse === null ||
      this.pulseDepth === null ||
      this.noiseGain === null ||
      this.panner === null
    ) {
      return
    }

    const now = this.context.currentTime
    const timeConstant = 0.08
    this.carrier.frequency.setTargetAtTime(
      170 + frame.intensity * 330,
      now,
      timeConstant,
    )
    this.carrierGain.gain.setTargetAtTime(
      0.055 + frame.intensity * 0.075,
      now,
      timeConstant,
    )
    this.pulse.frequency.setTargetAtTime(
      0.7 + frame.tempo * 5.3,
      now,
      timeConstant,
    )
    this.pulseDepth.gain.setTargetAtTime(
      0.012 + frame.modulation * 0.04,
      now,
      timeConstant,
    )
    this.noiseGain.gain.setTargetAtTime(
      frame.texture * 0.09,
      now,
      timeConstant,
    )
    this.panner.pan.setTargetAtTime(
      frame.spatialPosition,
      now,
      timeConstant,
    )
  }

  async stop(): Promise<void> {
    if (this.context === null) return
    await this.context.close()
    this.context = null
    this.carrier = null
    this.carrierGain = null
    this.pulse = null
    this.pulseDepth = null
    this.noiseGain = null
    this.panner = null
  }
}
