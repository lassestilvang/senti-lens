import { render } from '@testing-library/react';
import CameraStream from './CameraStream';
import { FrameSampler } from '../utils/frameSampling';
import React from 'react';

// Mock FrameSampler
jest.mock('../utils/frameSampling', () => ({
  FrameSampler: jest.fn().mockImplementation(() => ({
    shouldCapture: jest.fn(),
  })),
}));

describe('CameraStream Sampling Integration', () => {
  let mockGetUserMedia: jest.Mock;

  beforeEach(() => {
    mockGetUserMedia = jest.fn().mockResolvedValue({
      getTracks: () => [{ stop: jest.fn() }]
    });

    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: mockGetUserMedia },
      writable: true,
      configurable: true
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should initialize FrameSampler on mount', () => {
    render(<CameraStream />);
    expect(FrameSampler).toHaveBeenCalledWith({ motionThreshold: 5.0 });
  });

  it('should trigger heartbeat capture every 5 seconds', async () => {
    jest.useFakeTimers();
    const mockOnFrameCapture = jest.fn();
    
    // Mock video dimensions so the interval loop proceeds
    Object.defineProperty(HTMLVideoElement.prototype, 'videoWidth', { value: 640, configurable: true });
    Object.defineProperty(HTMLVideoElement.prototype, 'videoHeight', { value: 480, configurable: true });

    // Mock canvas getContext
    const mockCtx = {
      drawImage: jest.fn(),
      getImageData: jest.fn().mockReturnValue({ data: new Uint8Array(640 * 480 * 4) }),
    };
    HTMLCanvasElement.prototype.getContext = jest.fn().mockReturnValue(mockCtx);
    HTMLCanvasElement.prototype.toDataURL = jest.fn().mockReturnValue('data:image/jpeg;base64,test');

    render(<CameraStream onFrameCapture={mockOnFrameCapture} />);

    // Wait for the async setupCamera to finish
    await React.act(async () => {
      await Promise.resolve(); // Flush microtasks
    });

    // Fast-forward 4.8 seconds (24 ticks * 200ms)
    await React.act(async () => {
      jest.advanceTimersByTime(4800);
    });
    expect(mockOnFrameCapture).not.toHaveBeenCalled();

    // Advance to 5 seconds (25th tick)
    await React.act(async () => {
      jest.advanceTimersByTime(200);
    });
    expect(mockOnFrameCapture).toHaveBeenCalled();
    
    // Advance another 5 seconds
    await React.act(async () => {
      jest.advanceTimersByTime(5000);
    });
    expect(mockOnFrameCapture).toHaveBeenCalledTimes(2);

    jest.useRealTimers();
  });
});
