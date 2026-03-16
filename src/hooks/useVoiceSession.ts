'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { GeminiLiveSession, VoiceEvent, VoiceSessionConfig } from '../services/geminiLiveSession';

export interface UseVoiceSessionReturn {
  /** Start the voice session */
  startSession: () => Promise<void>;
  /** End the voice session */
  endSession: () => Promise<void>;
  /** Toggle microphone capture */
  toggleCapture: () => Promise<void>;
  /** Send text (fallback when mic unavailable) */
  sendText: (text: string) => void;
  /** Send a tool result back to Gemini */
  sendToolResult: (toolUseId: string, result: string | Record<string, unknown>) => void;
  /** Send a video frame to Gemini */
  sendVideoFrame: (base64Data: string) => void;
  /** Interrupt current playback */
  interrupt: () => void;
  /** Whether connected to the WebSocket */
  isConnected: boolean;
  /** Whether currently reconnecting */
  isReconnecting: boolean;
  /** Whether microphone is capturing */
  isCapturing: boolean;
  /** Current transcription from Gemini */
  transcript: string;
  /** Last text response */
  lastResponse: string;
  /** Last tool call info */
  lastToolCall: { name: string; input: Record<string, unknown>; toolUseId: string } | null;
  /** Voice events log (last 20) */
  eventLog: VoiceEvent[];
  /** Audio analyzer node for VAD */
  analyzer: AnalyserNode | null;
  /** Whether the session is grounded and ready for interaction */
  isGrounded: boolean;
  /** Current error */
  error: string | null;
}

export function useVoiceSession(
  sessionId: string,
  options?: { memoryContext?: string; userGoal?: string }
): UseVoiceSessionReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [lastResponse, setLastResponse] = useState('');
  const [lastToolCall, setLastToolCall] = useState<{ name: string; input: Record<string, unknown>; toolUseId: string } | null>(null);
  const [eventLog, setEventLog] = useState<VoiceEvent[]>([]);
  const [isGrounded, setIsGrounded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analyzer, setAnalyzer] = useState<AnalyserNode | null>(null);
  const sessionRef = useRef<GeminiLiveSession | null>(null);

  const addEvent = useCallback((event: VoiceEvent) => {
    setEventLog((prev) => [...prev.slice(-19), event]);
  }, []);

  const startSession = useCallback(async () => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
    if (!apiKey) {
      setError('Google API Key not configured (NEXT_PUBLIC_GOOGLE_API_KEY)');
      return;
    }

    try {
      setError(null);

      const config: VoiceSessionConfig = {
        sessionId,
        memoryContext: options?.memoryContext,
        userGoal: options?.userGoal,
        apiKey,
      };

      const session = new GeminiLiveSession(config);
      sessionRef.current = session;

      const appendWithSpace = (prev: string, next: string) => {
        if (!prev) return next;
        if (!next) return prev;
        const needsSpace = !/\s$/.test(prev) && !/^\s/.test(next);
        return needsSpace ? `${prev} ${next}` : `${prev}${next}`;
      };

      session.onEvent((event: VoiceEvent) => {
        addEvent(event);

        switch (event.type) {
          case 'connected':
            setIsConnected(true);
            setIsReconnecting(false);
            break;
            
          case 'reconnecting':
            setIsConnected(false);
            setIsReconnecting(true);
            break;

          case 'disconnected':
            setIsConnected(false);
            setIsReconnecting(false);
            setIsCapturing(false);
            break;

          case 'sessionStarted':
            setIsGrounded(true);
            break;

          case 'text':
            if (event.text) {
              const text = event.text;
              setLastResponse((prev) => appendWithSpace(prev, text));
            }
            break;

          case 'transcript':
            if (event.text) {
              const text = event.text;
              setTranscript((prev) => appendWithSpace(prev, text));
            }
            break;

          case 'toolUse':
            if (event.toolName && event.toolUseId) {
              setLastToolCall({
                name: event.toolName,
                input: event.toolInput || {},
                toolUseId: event.toolUseId,
              });
            }
            break;

          case 'turnComplete':
            break;

          case 'error':
            setError(event.error || 'Unknown voice error');
            break;
        }
      });

      await session.connect();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start voice session');
    }
  }, [sessionId, addEvent, options]);

  const endSession = useCallback(async () => {
    if (sessionRef.current) {
      await sessionRef.current.disconnect();
      sessionRef.current = null;
    }
    setIsConnected(false);
    setIsCapturing(false);
    setIsGrounded(false);
  }, []);

  const toggleCapture = useCallback(async () => {
    if (!sessionRef.current) return;

    if (isCapturing) {
      sessionRef.current.stopCapture();
      setIsCapturing(false);
      setAnalyzer(null);
    } else {
      try {
        await sessionRef.current.startCapture();
        setIsCapturing(true);
        setAnalyzer(sessionRef.current.analyzerNode);
      } catch (err) {
        if (err instanceof Error) {
          if (err.name === 'NotAllowedError') {
             setError('Microphone access denied. Please enable it in browser settings.');
          } else if (err.name === 'NotFoundError') {
             setError('No microphone found on this device.');
          } else {
             setError(err.message);
          }
        } else {
          setError('Failed to start microphone capture');
        }
      }
    }
  }, [isCapturing]);

  const sendText = useCallback((text: string) => {
    if (sessionRef.current) {
      sessionRef.current.sendText(text);
    }
  }, []);

  const sendToolResult = useCallback((toolUseId: string, result: string | Record<string, unknown>) => {
    if (sessionRef.current) {
      sessionRef.current.sendToolResult(toolUseId, result);
    }
  }, []);

  const sendVideoFrame = useCallback((base64Data: string) => {
    if (sessionRef.current) {
      sessionRef.current.sendVideoFrame(base64Data);
    }
  }, []);

  const interrupt = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current.interrupt();
    }
  }, []);

  // Barge-in check (VAD)
  useEffect(() => {
    if (!isCapturing || !analyzer || !isConnected) return;

    let rafId: number;
    const buffer = new Uint8Array(analyzer.fftSize);
    const threshold = 50; // Simple threshold for barge-in

    const checkVolume = () => {
      analyzer.getByteTimeDomainData(buffer);
      let maxVal = 0;
      for (let i = 0; i < buffer.length; i++) {
        const val = Math.abs(buffer[i] - 128);
        if (val > maxVal) maxVal = val;
      }

      if (maxVal > threshold) {
        // User is speaking, trigger local interrupt
        const session = sessionRef.current;
        if (session) {
           session.interrupt();
        }
      }
      rafId = requestAnimationFrame(checkVolume);
    };

    rafId = requestAnimationFrame(checkVolume);
    return () => cancelAnimationFrame(rafId);
  }, [isCapturing, analyzer, isConnected]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sessionRef.current) {
        sessionRef.current.disconnect().catch(console.error);
      }
    };
  }, []);

  return {
    startSession,
    endSession,
    toggleCapture,
    sendText,
    sendVideoFrame,
    sendToolResult,
    interrupt,
    isConnected,
    isReconnecting,
    isCapturing,
    isGrounded,
    transcript,
    lastResponse,
    lastToolCall,
    eventLog,
    analyzer,
    error,
  };
}
