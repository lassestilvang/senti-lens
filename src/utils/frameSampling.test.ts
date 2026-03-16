import { FrameSampler } from './frameSampling'

describe('FrameSampler', () => {
  let sampler: FrameSampler

  beforeEach(() => {
    sampler = new FrameSampler({ motionThreshold: 5.0 })
  })

  it('captures frame when speech starts (VAD)', () => {
    expect(sampler.shouldCapture(false, 0)).toBe(false)
    // Transition to speaking
    expect(sampler.shouldCapture(true, 0)).toBe(true)
    // Continues speaking, don't capture again immediately
    expect(sampler.shouldCapture(true, 0)).toBe(false)
  })

  it('captures frame when camera stabilizes after motion', () => {
    // Motion starts, capture once to catch newly introduced objects.
    expect(sampler.shouldCapture(false, 10.0)).toBe(true)
    expect(sampler.shouldCapture(false, 8.0)).toBe(false)
    
    // Motion drops below threshold, indicating stabilization
    expect(sampler.shouldCapture(false, 2.0)).toBe(true)
    
    // Stays stable, no capture
    expect(sampler.shouldCapture(false, 1.0)).toBe(false)
  })
})
