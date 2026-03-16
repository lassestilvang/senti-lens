import { render, screen, act } from '@testing-library/react';
import CameraStream, { CameraStreamHandle } from './CameraStream';
import React from 'react';

describe('CameraStream Frame Capture', () => {
  let mockDrawImage: jest.Mock;
  let mockToDataURL: jest.Mock;
  let mockGetUserMedia: jest.Mock;

  beforeEach(() => {
    mockDrawImage = jest.fn();
    mockToDataURL = jest.fn().mockReturnValue('data:image/jpeg;base64,mock-frame');

    // Mock Canvas context
    const mockContext: Partial<CanvasRenderingContext2D> = {
      drawImage: mockDrawImage,
    };

    // Mock HTMLCanvasElement
    const mockCanvas = {
      getContext: jest.fn().mockReturnValue(mockContext),
      toDataURL: mockToDataURL,
      width: 0,
      height: 0,
    };

    jest.spyOn(document, 'createElement').mockImplementation((tagName) => {
      if (tagName === 'canvas') return mockCanvas as unknown as HTMLCanvasElement;
      return originalCreateElement(tagName);
    });

    mockGetUserMedia = jest.fn().mockResolvedValue({
      getTracks: () => [{ stop: jest.fn() }]
    });

    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: mockGetUserMedia },
      writable: true,
      configurable: true
    });
  });

  const originalCreateElement = document.createElement.bind(document);

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should capture a frame from the video element using the exposed ref handle', async () => {
    const ref = React.createRef<CameraStreamHandle>();
    render(<CameraStream ref={ref} />);
    
    await act(async () => {
      // Simulate video dimensions being set
      const video = screen.getByTestId('video-stream') as HTMLVideoElement;
      Object.defineProperty(video, 'videoWidth', { value: 640 });
      Object.defineProperty(video, 'videoHeight', { value: 480 });
    });

    let frame: string | null = null;
    act(() => {
      frame = ref.current?.captureFrame() || null;
    });

    expect(frame).toBe('data:image/jpeg;base64,mock-frame');
    expect(mockDrawImage).toHaveBeenCalled();
  });
});
