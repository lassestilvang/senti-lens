interface DocumentFrame {
  hasRectangularShape: boolean;
  aspectRatio: number;
  motionLevel: number;
}

interface DocumentFramingOptions {
  stabilityThreshold: number;
  motionThreshold: number;
}

export class DocumentFraming {
  private stabilityThreshold: number;
  private motionThreshold: number;
  private stableCount: number = 0;

  constructor(options: DocumentFramingOptions) {
    this.stabilityThreshold = options.stabilityThreshold;
    this.motionThreshold = options.motionThreshold;
  }

  isDocumentAligned(frame: DocumentFrame): boolean {
    if (frame.motionLevel > this.motionThreshold) {
      return false;
    }

    if (!frame.hasRectangularShape) {
      return false;
    }

    // A4 is ~1.41, US Letter is ~1.29. 
    // We allow a range between 1.2 and 1.6
    const isGoodAspectRatio = frame.aspectRatio >= 1.2 && frame.aspectRatio <= 1.6;
    
    return isGoodAspectRatio;
  }

  shouldCapture(frame: DocumentFrame): boolean {
    if (this.isDocumentAligned(frame)) {
      this.stableCount++;
    } else {
      this.stableCount = 0;
    }

    if (this.stableCount >= this.stabilityThreshold) {
      this.stableCount = 0; // Reset after trigger
      return true;
    }

    return false;
  }
}
