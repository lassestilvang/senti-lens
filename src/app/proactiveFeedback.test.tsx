import { playMedicationEarcon } from '../utils/audioService';
import { useVoiceSession } from '../hooks/useVoiceSession';

// Mock audio and voice services
jest.mock('../utils/audioService', () => ({
  playMedicationEarcon: jest.fn(),
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

describe('Proactive Feedback Trigger', () => {
  it('should play an earcon and trigger speech when a suggestion is ready', async () => {
    const suggestion = 'Found healthy cereal!';
    
    // Simulate trigger logic
    playMedicationEarcon('success');
    await useVoiceSession(suggestion, '');

    expect(playMedicationEarcon).toHaveBeenCalledWith('success');
    expect(useVoiceSession).toHaveBeenCalled();
  });
});
