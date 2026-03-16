import { DocumentFraming } from './documentFraming';

describe('DocumentFraming', () => {
  let framing: DocumentFraming;

  beforeEach(() => {
    framing = new DocumentFraming({
      stabilityThreshold: 3,
      motionThreshold: 2.0
    });
  });

  it('should not detect document when motion is high', () => {
    const frame = {
      hasRectangularShape: true,
      aspectRatio: 1.41, // A4 aspect ratio
      motionLevel: 5.0
    };
    expect(framing.isDocumentAligned(frame)).toBe(false);
  });

  it('should detect document when rectangular shape is present and motion is low', () => {
    const frame = {
      hasRectangularShape: true,
      aspectRatio: 1.41,
      motionLevel: 1.0
    };
    expect(framing.isDocumentAligned(frame)).toBe(true);
  });

  it('should not detect document if aspect ratio is too off (e.g., square)', () => {
    const frame = {
      hasRectangularShape: true,
      aspectRatio: 1.0,
      motionLevel: 1.0
    };
    expect(framing.isDocumentAligned(frame)).toBe(false);
  });

  it('should trigger capture after stable alignment', () => {
    const frame = {
      hasRectangularShape: true,
      aspectRatio: 1.41,
      motionLevel: 1.0
    };

    // Not yet stable
    expect(framing.shouldCapture(frame)).toBe(false);
    expect(framing.shouldCapture(frame)).toBe(false);
    
    // Stable after 3 checks
    expect(framing.shouldCapture(frame)).toBe(true);
  });

  it('should reset stability when alignment is lost', () => {
    const frame = {
      hasRectangularShape: true,
      aspectRatio: 1.41,
      motionLevel: 1.0
    };

    expect(framing.shouldCapture(frame)).toBe(false);
    expect(framing.shouldCapture({ ...frame, motionLevel: 5.0 })).toBe(false);
    expect(framing.shouldCapture(frame)).toBe(false);
  });

  it('should not detect document if rectangular shape is missing', () => {
    const frame = {
      hasRectangularShape: false,
      aspectRatio: 1.41,
      motionLevel: 1.0
    };
    expect(framing.isDocumentAligned(frame)).toBe(false);
  });
});
