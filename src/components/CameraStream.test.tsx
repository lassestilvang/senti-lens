import { render, screen, waitFor } from '@testing-library/react'
import CameraStream from './CameraStream'

describe('CameraStream', () => {
  let mockGetUserMedia: jest.Mock

  beforeEach(() => {
    mockGetUserMedia = jest.fn().mockResolvedValue({
      getTracks: () => [
        { stop: jest.fn() }
      ]
    } as unknown as MediaStream)

    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: mockGetUserMedia,
      },
      writable: true,
    })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('requests camera access on mount', async () => {
    render(<CameraStream />)
    
    await waitFor(() => {
      expect(mockGetUserMedia).toHaveBeenCalledWith({
        video: { facingMode: 'environment' },
        audio: false
      })
    })
  })

  it('displays a video element', () => {
    render(<CameraStream />)
    const videoElement = screen.getByTestId('video-stream')
    expect(videoElement).toBeInTheDocument()
    expect(videoElement.tagName).toBe('VIDEO')
  })

  it('shows error message when camera access fails', async () => {
    mockGetUserMedia.mockRejectedValue(new Error('Permission denied'))
    
    render(<CameraStream />)
    
    await waitFor(() => {
      expect(screen.getByText(/Unable to access camera/i)).toBeInTheDocument()
    })
  })
})