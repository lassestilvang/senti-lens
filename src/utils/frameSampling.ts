interface FrameSamplerOptions {
  motionThreshold: number;
}

export class FrameSampler {
  private motionThreshold: number;
  private wasSpeaking: boolean = false;
  private wasInMotion: boolean = false;

  constructor(options: FrameSamplerOptions) {
    this.motionThreshold = options.motionThreshold;
  }

  shouldCapture(isSpeaking: boolean, motionLevel: number): boolean {
    let capture = false;

    // Trigger on VAD (speech start)
    if (isSpeaking && !this.wasSpeaking) {
      capture = true;
    }
    this.wasSpeaking = isSpeaking;

    // Trigger on motion stabilization
    const isCurrentlyInMotion = motionLevel > this.motionThreshold;
    if (isCurrentlyInMotion && !this.wasInMotion) {
      // Capture when motion first appears so newly introduced objects
      // can be analyzed without waiting for stabilization.
      capture = true;
    }
    if (!isCurrentlyInMotion && this.wasInMotion) {
      capture = true;
    }
    this.wasInMotion = isCurrentlyInMotion;

    return capture;
  }
}
