import { render, screen, fireEvent, act } from '@testing-library/react';
import Page from './page';
import { analyzeFrame } from '../services/geminiVision';
import { evaluateProactiveSuggestion } from '../services/orchestrator';

// Mock AI services
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

// Mock CameraStream to intercept onFrameCapture
jest.mock('../components/CameraStream', () => {
  return jest.fn(({ onFrameCapture }) => {
    return <div data-testid="mock-camera" onClick={() => onFrameCapture('mock-frame')} />;
  });
});

describe('Aha! Moment End-to-End Integration', () => {
  it('should trigger proactive suggestion when camera sees an object matching the goal', async () => {
    (analyzeFrame as jest.Mock).mockResolvedValue({
      objects: ['Oatmeal'],
      text: 'Healthy',
      environment: 'grocery store'
    });
    
    (evaluateProactiveSuggestion as jest.Mock).mockResolvedValue({
      shouldSuggest: true,
      suggestionPrompt: 'Oatmeal is a great healthy choice!'
    });

    render(<Page />);

    // 1. Set User Goal
    const input = screen.getByPlaceholderText(/e.g., find healthy cereal/i);
    const button = screen.getByRole('button', { name: /^Set$/i });
    fireEvent.change(input, { target: { value: 'find healthy cereal' } });
    fireEvent.click(button);

    // 2. Trigger Frame Capture (Simulation via mock click)
    const mockCamera = screen.getByTestId('mock-camera');
    await act(async () => {
      fireEvent.click(mockCamera);
    });

    // 3. Verify UI Outcome
    expect(screen.getByText(/Oatmeal is a great healthy choice!/i)).toBeInTheDocument();
  });
});
