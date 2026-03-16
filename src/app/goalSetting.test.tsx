import { render, screen, fireEvent } from '@testing-library/react';
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

describe('Goal Setting UI', () => {
  it('should allow user to set a goal', () => {
    render(<Page />);
    const input = screen.getByPlaceholderText(/e.g., find healthy cereal/i);
    const button = screen.getByRole('button', { name: /^Set$/i });

    fireEvent.change(input, { target: { value: 'find gluten free options' } });
    fireEvent.click(button);

    expect(screen.getByText(/Goal: find gluten free options/i)).toBeInTheDocument();
  });
});
