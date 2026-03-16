'use client';

/**
 * GeminiLiveSession - manages direct streaming to Gemini 3.0 Flash via Multimodal Live API (WebSocket).
 * 
 * Handles:
 * - WebSocket bidirectional session
 * - Audio capture from microphone (PCM 16-bit, 16kHz mono)
 * - Sending audio/text/tools to Gemini
 * - Receiving and playing audio response chunks
 * - Tool call events and transcript events
 */

export interface VoiceSessionConfig {
  sessionId: string;
  memoryContext?: string;
  userGoal?: string;
  apiKey?: string;
  modelId?: string;
}

export type VoiceEventType =
  | 'connected'
  | 'disconnected'
  | 'sessionStarted'
  | 'sessionEnded'
  | 'audio'
  | 'text'
  | 'transcript'
  | 'toolUse'
  | 'turnComplete'
  | 'reconnecting'
  | 'error';

export interface VoiceEvent {
  type: VoiceEventType;
  audio?: ArrayBuffer;
  text?: string;
  toolName?: string;
  toolUseId?: string;
  toolInput?: Record<string, unknown>;
  error?: string;
  reconnectAttempt?: number;
}

type VoiceEventCallback = (event: VoiceEvent) => void;

function buildSystemPrompt(memoryContext?: string, userGoal?: string): string {
  const base = `You are SentiLens, an AI assistant that helps users understand the world around them through their camera and voice. You are friendly, conversational, and proactive.

CRITICAL RULES:
YOU HAVE REAL-TIME EYES! You receive a continuous stream of video frames. You can see the user's environment in real-time. 
1. ACT PROACTIVELY: If you see something relevant to the user's goal, a safety hazard, or an interesting change in the scene, mention it naturally WITHOUT waiting for a question.
2. USE TOOLS FOR PRECISION: While you can see generally via the stream, use the "analyze_frame" tool when you need high-precision details (like reading small text on a bottle or identifying specific cereal brands).
3. Do NOT ask the user to describe the scene if you can see it.
`;

  let prompt = base;
  if (userGoal) {
    prompt += `\n\nCURRENT USER GOAL: ${userGoal}`;
  }
  if (memoryContext) {
    prompt += `\n\nCurrent World Memory:\n${memoryContext}`;
  }
  return prompt;
}

function getGeminiTools() {
  return [
    {
      name: 'analyze_frame',
      description:
        'Analyze the current camera frame to identify objects, text, and environment type. Call this when the user asks about what they see or when you need visual context.',
      parameters: {
        type: 'object',
        properties: {
          question: {
            type: 'string',
            description: 'What to look for in the frame',
          },
        },
      },
    },
    {
      name: 'update_memory',
      description:
        'Update the world memory with new observations. Call this when new important objects or context are detected.',
      parameters: {
        type: 'object',
        properties: {
          observations: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of new observations to add to memory',
          },
          userGoal: {
            type: 'string',
            description: 'Updated user goal if detected from conversation',
          },
        },
      },
    },
  ];
}

export class GeminiLiveSession {
  private config: VoiceSessionConfig;
  private callbacks: VoiceEventCallback[] = [];
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private workletNode: AudioWorkletNode | ScriptProcessorNode | null = null;
  private isCapturing = false;

  private ws: WebSocket | null = null;
  private isActive = false;
  private playbackContext: AudioContext | null = null;
  private nextPlaybackTime = 0;
  private analyzer: AnalyserNode | null = null;
  private activeSources: Set<AudioBufferSourceNode> = new Set();

  private isSetupComplete = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;

  constructor(config: VoiceSessionConfig) {
    this.config = config;
  }

  onEvent(callback: VoiceEventCallback): void {
    this.callbacks.push(callback);
  }

  private emit(event: VoiceEvent): void {
    for (const cb of this.callbacks) {
      try {
        cb(event);
      } catch (err) {
        console.error('[GeminiLiveSession] Callback error:', err);
      }
    }
  }

  private stopPlayback(): void {
    this.activeSources.forEach((source) => {
      try {
        source.stop();
      } catch {
        // Source might have already ended or not started.
      }
      source.disconnect();
    });
    this.activeSources.clear();

    if (this.playbackContext) {
      this.nextPlaybackTime = this.playbackContext.currentTime;
    }
  }

  async connect(): Promise<void> {
    if (this.isActive && this.ws?.readyState === WebSocket.OPEN) return;

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    const apiKey = this.config.apiKey || process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error('Missing Google API Key (NEXT_PUBLIC_GOOGLE_API_KEY)');
    }

    // Use the latest native audio model for the best experience
    const modelId = /*process.env.NEXT_PUBLIC_GEMINI_MODEL_ID || this.config.modelId ||*/ 'gemini-2.5-flash-native-audio-preview-12-2025';
    const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${apiKey}`;

    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.isActive = true;
      this.reconnectAttempts = 0;
      this.emit({ type: 'connected' });

      // ... rest of setup ...

      // Send setup message (using camelCase for protocol consistency)
      const setupMsg = {
        setup: {
          model: `models/${modelId}`,
          generationConfig: {
            responseModalities: ['audio'],
          },
          systemInstruction: {
            parts: [{ text: buildSystemPrompt(this.config.memoryContext, this.config.userGoal) }],
          },
          tools: [
            {
              functionDeclarations: getGeminiTools(),
            },
          ],
        },
      };
      this.ws?.send(JSON.stringify(setupMsg));
    };

    this.ws.onmessage = (event) => {
      this.processOutputEvent(event.data);
    };

    this.ws.onclose = (event) => {
      this.isActive = false;
      this.emit({ type: 'disconnected' });

      // Attempt reconnection if not closed cleanly
      if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.attemptReconnection();
      } else {
        this.emit({ type: 'sessionEnded' });
      }
    };

    this.ws.onerror = (err) => {
      console.error('[GeminiLiveSession] WebSocket error:', err);
      this.emit({ type: 'error', error: 'WebSocket connection failed' });
    };
  }

  private processOutputEvent(data: Blob | string): void {
    if (typeof data !== 'string') {
      // Data might be binary audio if configured as such, but Multimodal Live API 
      // usually sends JSON with base64 audio in this alpha version.
      return;
    }

    try {
      const payload = JSON.parse(data);

      if (payload.setupComplete) {
        console.log('[GeminiLiveSession] Setup complete');
        this.isSetupComplete = true;
        this.emit({ type: 'sessionStarted' });
        return;
      }

      if (payload.serverContent) {
        const content = payload.serverContent;

        if (content.modelTurn) {
          const parts = content.modelTurn.parts || [];
          for (const part of parts) {
            if (part.inlineData && part.inlineData.mimeType.startsWith('audio/')) {
              const audioBytes = Uint8Array.from(atob(part.inlineData.data), c => c.charCodeAt(0));
              this.playAudio(audioBytes.buffer);
              this.emit({ type: 'audio', audio: audioBytes.buffer });
            }
            if (part.text) {
              this.emit({ type: 'text', text: part.text });
            }
          }
        }

        if (content.turnComplete) {
          this.emit({ type: 'turnComplete' });
        }

        if (content.interrupted) {
          this.stopPlayback();
        }
        return;
      }

      if (payload.toolCall) {
        const toolCalls = payload.toolCall.functionCalls || [];
        for (const tc of toolCalls) {
          this.emit({
            type: 'toolUse',
            toolUseId: tc.id,
            toolName: tc.name,
            toolInput: tc.args || {},
          });
        }
        return;
      }

    } catch (err) {
      console.error('[GeminiLiveSession] Error processing output event:', err);
    }
  }

  async startCapture(): Promise<void> {
    if (this.isCapturing) return;

    try {
      this.audioContext = new AudioContext({ sampleRate: 16000 });
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      const analyzer = this.audioContext.createAnalyser();
      analyzer.fftSize = 512;
      source.connect(analyzer);
      this.analyzer = analyzer;

      const bufferSize = 4096;
      const processor = this.audioContext.createScriptProcessor(bufferSize, 1, 1);
      this.workletNode = processor;

      processor.onaudioprocess = (event) => {
        if (!this.isCapturing || !this.isActive) return;

        const inputData = event.inputBuffer.getChannelData(0);
        const pcmData = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }

        this.sendAudio(pcmData);
      };

      source.connect(processor);
      processor.connect(this.audioContext.destination);
      this.isCapturing = true;
    } catch (err) {
      console.error('[GeminiLiveSession] Audio capture error:', err);
      this.emit({ type: 'error', error: 'Failed to access microphone' });
    }
  }

  stopCapture(): void {
    this.isCapturing = false;
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(console.error);
      this.audioContext = null;
    }
  }

  private sendAudio(pcmData: Int16Array): void {
    if (!this.isSetupComplete || !this.isActive || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const b64 = pcmData ? btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer))) : '';
    const msg = {
      realtimeInput: {
        audio: {
          data: b64,
          mimeType: 'audio/pcm;rate=16000',
        },
      },
    };
    this.ws.send(JSON.stringify(msg));
  }

  sendVideoFrame(base64Data: string): void {
    if (!this.isSetupComplete || !this.isActive || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const b64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
    const msg = {
      realtimeInput: {
        video: {
          data: b64,
          mimeType: 'image/jpeg',
        },
      },
    };
    this.ws.send(JSON.stringify(msg));
  }

  sendText(text: string): void {
    if (!this.isActive || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const msg = {
      realtimeInput: {
        text,
      },
    };
    this.ws.send(JSON.stringify(msg));
  }

  sendToolResult(toolUseId: string, result: string | Record<string, unknown>): void {
    if (!this.isActive || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const msg = {
      toolResponse: {
        functionResponses: [
          {
            id: toolUseId,
            response: typeof result === 'string' ? { output: { result } } : { output: result },
          },
        ],
      },
    };
    this.ws.send(JSON.stringify(msg));
  }

  interrupt(): void {
    this.stopPlayback();
    if (this.isActive && this.ws && this.ws.readyState === WebSocket.OPEN) {
      // Multimodal Live API supports client interrupts
      this.ws.send(JSON.stringify({ clientContent: { turnComplete: true, interrupt: true } }));
    }
    this.emit({ type: 'text', text: '[Interrupted]' });
  }

  async disconnect(): Promise<void> {
    this.stopCapture();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isActive = false;
  }

  get connected(): boolean {
    return this.isActive;
  }

  get capturing(): boolean {
    return this.isCapturing;
  }

  get analyzerNode(): AnalyserNode | null {
    return this.analyzer;
  }

  private async playAudio(pcmData: ArrayBuffer): Promise<void> {
    try {
      const sourceSampleRate = 24000; // Gemini defaults to 24kHz for response audio usually
      if (!this.playbackContext) {
        this.playbackContext = new AudioContext({ sampleRate: sourceSampleRate });
        this.nextPlaybackTime = this.playbackContext.currentTime;
      }
      const ctx = this.playbackContext;
      if (ctx.state === 'suspended') {
        await ctx.resume().catch(() => undefined);
      }

      const int16 = new Int16Array(pcmData);
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) {
        float32[i] = int16[i] / 32768;
      }

      const audioBuffer = ctx.createBuffer(1, float32.length, sourceSampleRate);
      audioBuffer.getChannelData(0).set(float32);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      this.activeSources.add(source);

      const startTime = Math.max(ctx.currentTime, this.nextPlaybackTime);
      source.start(startTime);
      this.nextPlaybackTime = startTime + audioBuffer.duration;

      source.onended = () => {
        this.activeSources.delete(source);
      };
    } catch (err) {
      console.error('[GeminiLiveSession] Audio playback error:', err);
    }
  }

  private attemptReconnection(): void {
    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);

    this.emit({
      type: 'reconnecting',
      reconnectAttempt: this.reconnectAttempts
    });

    this.reconnectTimeout = setTimeout(() => {
      console.log(`[GeminiLiveSession] Reconnecting... (attempt ${this.reconnectAttempts})`);
      this.connect().catch(err => {
        console.error('[GeminiLiveSession] Reconnection failed:', err);
      });
    }, delay);
  }
}
