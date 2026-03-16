'use client';

/**
 * GeminiLiveSession - manages direct streaming to Gemini 2.0 Flash via Multimodal Live API (WebSocket).
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
  | 'error';

export interface VoiceEvent {
  type: VoiceEventType;
  audio?: ArrayBuffer;
  text?: string;
  toolName?: string;
  toolUseId?: string;
  toolInput?: Record<string, unknown>;
  error?: string;
}

type VoiceEventCallback = (event: VoiceEvent) => void;

function buildSystemPrompt(memoryContext?: string, userGoal?: string): string {
  const base = `You are SentiLens, an AI assistant that helps users understand the world around them through their camera and voice. You are friendly, conversational, and proactive.

CRITICAL RULES:
1. YOU HAVE EYES! Use the "analyze_frame" tool whenever the user asks "what do you see?", "where is X?", or for any visual context. Do NOT ask the user to describe the scene; use the tool instead.
2. BE PROACTIVE: If you see something relevant to the user's goal or a significant change in the scene, mention it naturally. 
3. GREET THE USER: When you first connect, greet the user warmly and ask how you can help based on their current goal.
4. SYSTEM OBSERVATIONS: You may receive messages starting with "[System Observation]". These are direct updates from the computer vision loop. Treat them as your own observations and respond to them proactively if they are important.
5. If you cannot clearly see or read something AFTER using the tool, say so honestly.
6. For medical/legal/financial content, always include a safety disclaimer.
7. Be concise and conversational - the user is having a real-time conversation, not reading an essay.
8. If the user hasn't set a goal, ask them what they are looking for today.`;

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
    if (this.isActive) return;

    const apiKey = this.config.apiKey || process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error('Missing Google API Key (NEXT_PUBLIC_GOOGLE_API_KEY)');
    }

    const modelId = this.config.modelId || 'gemini-2.0-flash-exp';
    const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${apiKey}`;

    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.isActive = true;
      this.emit({ type: 'connected' });

      // Send setup message
      const setupMsg = {
        setup: {
          model: `models/${modelId}`,
          generation_config: {
            response_modalities: ['audio'],
          },
          system_instruction: {
            parts: [{ text: buildSystemPrompt(this.config.memoryContext, this.config.userGoal) }],
          },
          tools: [
            {
              function_declarations: getGeminiTools(),
            },
          ],
        },
      };
      this.ws?.send(JSON.stringify(setupMsg));
    };

    this.ws.onmessage = (event) => {
      this.processOutputEvent(event.data);
    };

    this.ws.onclose = () => {
      this.isActive = false;
      this.emit({ type: 'disconnected' });
      this.emit({ type: 'sessionEnded' });
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
    if (!this.isActive || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const b64 = btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)));
    const msg = {
      realtime_input: {
        media_chunks: [
          {
            data: b64,
            mime_type: 'audio/pcm;rate=16000',
          },
        ],
      },
    };
    this.ws.send(JSON.stringify(msg));
  }

  sendText(text: string): void {
    if (!this.isActive || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const msg = {
      realtime_input: {
        text,
      },
    };
    this.ws.send(JSON.stringify(msg));
  }

  sendToolResult(toolUseId: string, result: string | Record<string, unknown>): void {
    if (!this.isActive || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const msg = {
      tool_response: {
        function_responses: [
          {
            id: toolUseId,
            response: typeof result === 'string' ? { result } : result,
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
        this.ws.send(JSON.stringify({ client_content: { turn_complete: true, interrupt: true } }));
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
}
