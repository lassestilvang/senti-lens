import { playEarcon, resetSharedContext } from './earconService';

describe('EarconService', () => {
  type MockOscillator = {
    connect: jest.Mock;
    frequency: { setValueAtTime: jest.Mock };
    start: jest.Mock;
    stop: jest.Mock;
    type?: OscillatorType;
  };

  type MockGain = {
    connect: jest.Mock;
    gain: {
      setValueAtTime: jest.Mock;
      exponentialRampToValueAtTime: jest.Mock;
      linearRampToValueAtTime: jest.Mock;
    };
  };

  type MockAudioContext = {
    createOscillator: jest.Mock<MockOscillator, []>;
    createGain: jest.Mock<MockGain, []>;
    destination: object;
    currentTime: number;
  };

  type AudioWindow = Window & { AudioContext?: typeof AudioContext };

  let mockAudioContext: MockAudioContext;
  let mockOscillator: MockOscillator;
  let mockGain: MockGain;

  beforeEach(() => {
    resetSharedContext();
    mockOscillator = {
      connect: jest.fn(),
      frequency: { setValueAtTime: jest.fn() },
      start: jest.fn(),
      stop: jest.fn(),
    };

    mockGain = {
      connect: jest.fn(),
      gain: { 
        setValueAtTime: jest.fn(),
        exponentialRampToValueAtTime: jest.fn(),
        linearRampToValueAtTime: jest.fn()
      },
    };

    mockAudioContext = {
      createOscillator: jest.fn(() => mockOscillator),
      createGain: jest.fn(() => mockGain),
      destination: {},
      currentTime: 100,
    };

    const windowWithAudio = window as AudioWindow;
    windowWithAudio.AudioContext = jest.fn(() => mockAudioContext) as unknown as typeof AudioContext;
  });

  afterEach(() => {
    jest.resetAllMocks();
    const windowWithAudio = window as AudioWindow;
    delete windowWithAudio.AudioContext;
  });

  it('plays a chime for proactive observation', () => {
    playEarcon('chime');
    expect(mockAudioContext.createOscillator).toHaveBeenCalled();
    expect(mockOscillator.start).toHaveBeenCalledWith(100);
    expect(mockOscillator.stop).toHaveBeenCalled();
  });

  it('plays a click when frame is processed', () => {
    playEarcon('click');
    expect(mockAudioContext.createOscillator).toHaveBeenCalled();
    expect(mockOscillator.start).toHaveBeenCalledWith(100);
    expect(mockOscillator.stop).toHaveBeenCalled();
  });

  it('plays a listening tone when AI detects speech', () => {
    playEarcon('listen');
    expect(mockAudioContext.createOscillator).toHaveBeenCalled();
    expect(mockOscillator.start).toHaveBeenCalledWith(100);
    expect(mockOscillator.stop).toHaveBeenCalled();
  });

  it('does nothing gracefully if AudioContext is not supported', () => {
    const windowWithAudio = window as AudioWindow;
    delete windowWithAudio.AudioContext;
    expect(() => playEarcon('chime')).not.toThrow();
  });
});
