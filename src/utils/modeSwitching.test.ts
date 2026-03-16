import { detectModeSwitch, notifyListening } from './modeSwitching';
import { playEarcon } from '../services/earconService';

jest.mock('../services/earconService', () => ({
  playEarcon: jest.fn(),
}));

describe('Voice Mode Switching Utility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should detect "document" from a command', () => {
    expect(detectModeSwitch('Switch to Document mode')).toBe('document');
    expect(detectModeSwitch('Change to document')).toBe('document');
  });

  it('should detect "medication" from a command', () => {
    expect(detectModeSwitch('Enter medication mode')).toBe('medication');
  });

  it('should detect "environment" from a command', () => {
    expect(detectModeSwitch('Go to environment mode')).toBe('environment');
  });

  it('should detect "grocery" from a command', () => {
    expect(detectModeSwitch('Switch back to grocery')).toBe('grocery');
  });

  it('should return null if no mode switch command is detected', () => {
    expect(detectModeSwitch('How much does this cost?')).toBeNull();
  });

  it('should trigger playEarcon("listen") when notifyListening is called', () => {
    notifyListening();
    expect(playEarcon).toHaveBeenCalledWith('listen');
  });
});
