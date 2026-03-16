import { render, screen } from '@testing-library/react';
import Page from './page';

// Mock services that use Google AI SDK
jest.mock('../services/geminiVision', () => ({
  analyzeFrame: jest.fn(),
}));
jest.mock('../services/orchestrator', () => ({
  evaluateProactiveSuggestion: jest.fn(),
}));
jest.mock('../hooks/useVoiceSession', () => ({
  useVoiceSession: jest.fn(() => ({
    isConnected: false,
    isCapturing: false,
    isGrounded: false,
    transcript: '',
    lastResponse: '',
    lastToolCall: null,
    eventLog: [],
    analyzer: null,
    error: null,
    startSession: jest.fn(),
    endSession: jest.fn(),
    toggleCapture: jest.fn(),
    sendText: jest.fn(),
    sendToolResult: jest.fn(),
    interrupt: jest.fn(),
  })),
}));
jest.mock('../utils/audioService', () => ({
  playMedicationEarcon: jest.fn(),
}));

describe('UI Shell', () => {
  it('renders the SentiLens main container', () => {
    render(<Page />)
    const heading = screen.getByRole('heading', { name: /SentiLens/i })
    expect(heading).toBeInTheDocument()
    
    // There should be a container for camera stream
    const cameraContainer = screen.getByTestId('camera-container')
    expect(cameraContainer).toBeInTheDocument()

    // There should be a status indicator
    const statusIndicator = screen.getByTestId('status-indicator')
    expect(statusIndicator).toBeInTheDocument()
  })
})