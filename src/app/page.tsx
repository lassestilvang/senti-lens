'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import CameraStream from '../components/CameraStream';
import { ModeSelector, AssistantMode } from '../components/ModeSelector';
import DocumentOverlay from '../components/DocumentOverlay';
import DebugPanel from '../components/DebugPanel';
import { analyzeFrame, analyzeDocument, analyzeEnvironment, SceneAnalysis, EnvironmentAnalysis } from '../services/geminiVision';
import { evaluateProactiveSuggestion } from '../services/orchestrator';
import { optimizeMemory, addObservationToMemory, buildMemoryContext } from '../utils/memoryContext';
import { playEarcon } from '../services/earconService';
import { suggestModeFromScene } from '../utils/modeDetection';
import { isImmediateHazard } from '../utils/safetyInterrupt';
import { handleServiceError } from '../services/fallbackHandler';
import { useVoiceSession } from '../hooks/useVoiceSession';
import { findGoalObjectMatch } from '../utils/goalMatching';
import { inferGoalFromQuestion } from '../utils/goalInference';

const PROACTIVE_OBSERVATION_COOLDOWN_MS = 3_000;
const OBJECT_REAPPEARANCE_MS = 1_500;

export default function Page() {
  const [mode, setMode] = useState<AssistantMode>('grocery');
  const [goal, setGoal] = useState<string>('');
  const [inputValue, setInputValue] = useState<string>('');
  const [memory, setMemory] = useState<string[]>([]);
  const [lastSuggestion, setLastSuggestion] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [modeSuggestion, setModeSuggestion] = useState<AssistantMode | null>(null);
  const [showDebug, setShowDebug] = useState<boolean>(true);
  const [lastAnalysis, setLastAnalysis] = useState<Record<string, unknown> | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const handledToolCalls = useRef<Set<string>>(new Set());
  const greetingSentRef = useRef<boolean>(false);
  const lastSpokenObservationRef = useRef<{ text: string; timestamp: number }>({ text: '', timestamp: 0 });
  const inferredGoalRef = useRef<string>('');
  const pendingObservationRef = useRef<string | null>(null);
  const objectPresenceRef = useRef<{ object: string; lastSeenAt: number }>({ object: '', lastSeenAt: 0 });

  // Session ID — stable across the session lifecycle
  const sessionIdRef = useRef<string>('');
  useEffect(() => {
    sessionIdRef.current = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `session-${Date.now()}`;
  }, []);

  // Voice session hook
  const voice = useVoiceSession(sessionIdRef.current, {
    userGoal: goal,
    memoryContext: buildMemoryContext(memory),
  });

  // Refs for state accessed inside onFrameCapture — avoids stale closures
  // which would cause CameraStream to restart on every state change.
  const goalRef = useRef(goal);
  const memoryRef = useRef(memory);
  const lastSuggestionRef = useRef(lastSuggestion);
  const modeRef = useRef(mode);
  const voiceConnectedRef = useRef(false);
  useEffect(() => {
    goalRef.current = goal;
    if (goal.trim()) {
      inferredGoalRef.current = goal.trim();
    }
  }, [goal]);
  useEffect(() => { memoryRef.current = memory; }, [memory]);
  useEffect(() => { lastSuggestionRef.current = lastSuggestion; }, [lastSuggestion]);
  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => {
    voiceConnectedRef.current = voice.isConnected;
    if (!voice.isConnected) {
      return;
    }

    const pendingObservation = pendingObservationRef.current;
    if (!pendingObservation) {
      return;
    }

    pendingObservationRef.current = null;
    lastSpokenObservationRef.current = { text: pendingObservation, timestamp: Date.now() };
    voice.interrupt();
    voice.sendText(`${pendingObservation} Please tell the user this immediately in one short sentence.`);
  }, [voice.isConnected, voice.interrupt, voice.sendText]);

  const handleSetGoal = () => {
    const trimmedGoal = inputValue.trim();
    if (trimmedGoal) {
      inferredGoalRef.current = trimmedGoal;
      setGoal(trimmedGoal);
      setInputValue('');
    }
  };

  const handleVoiceToggle = async () => {
    if (!voice.isConnected) {
      // Start session in the background to avoid delaying the mic permission prompt.
      void voice.startSession();
      await voice.toggleCapture();
    } else if (voice.isCapturing) {
      await voice.toggleCapture();
    } else {
      await voice.toggleCapture();
    }
  };

  const onFrameCapture = useCallback(async (frameData: string) => {
    // Read current state from refs to avoid re-creating this callback
    const currentMode = modeRef.current;
    const currentGoal = goalRef.current;
    const currentMemory = memoryRef.current;
    const currentLastSuggestion = lastSuggestionRef.current;

    try {
      setIsProcessing(true);
      setAnalysisError(null);
      const startTime = Date.now();

      let analysis;
      if (currentMode === 'document') {
        analysis = await analyzeDocument(frameData);
      } else if (currentMode === 'environment') {
        analysis = await analyzeEnvironment(frameData);
      } else {
        analysis = await analyzeFrame(frameData);
      }

      setLatencyMs(Date.now() - startTime);
      setLastAnalysis(analysis as unknown as Record<string, unknown>);

      const objects = 'safetyObjects' in analysis
        ? (analysis as EnvironmentAnalysis).safetyObjects
        : 'objects' in analysis ? (analysis as SceneAnalysis).objects : [];
      const context = 'sceneContext' in analysis
        ? (analysis as EnvironmentAnalysis).sceneContext
        : 'environment' in analysis ? (analysis as SceneAnalysis).environment : '';
      const sceneAnalysis: SceneAnalysis = {
        objects,
        text: 'text' in analysis ? (analysis as SceneAnalysis).text : '',
        environment: context || 'unknown',
      };

      // Proactive Sight: If AI sees something related to the goal
      const goalText = (currentGoal || inferredGoalRef.current).toLowerCase().trim();
      const now = Date.now();
      
      console.error('[Orchestrator] Vision analysis:', { objects, goalText, mode: currentMode });

      if (goalText) {
        const matchedObject = findGoalObjectMatch(goalText, objects);
        console.error('[Orchestrator] Match check:', { goalText, matchedObject });

        if (matchedObject) {
          const recentlySeenSameObject =
            objectPresenceRef.current.object === matchedObject
            && now - objectPresenceRef.current.lastSeenAt < OBJECT_REAPPEARANCE_MS;
          objectPresenceRef.current = { object: matchedObject, lastSeenAt: now };

          if (!recentlySeenSameObject) {
            const observation = `[System Observation] I can see ${matchedObject} in frame right now.`;
            const { text: previousObservation, timestamp: previousTimestamp } = lastSpokenObservationRef.current;
            const isDuplicateWithinCooldown =
              previousObservation === observation && now - previousTimestamp < PROACTIVE_OBSERVATION_COOLDOWN_MS;

            console.error('[Orchestrator] Sighting state:', { recentlySeenSameObject, isDuplicateWithinCooldown, voiceConnected: voiceConnectedRef.current });

            if (!isDuplicateWithinCooldown) {
              setLastSuggestion(`Spotted ${matchedObject} in frame.`);
              playEarcon('chime');

              if (voiceConnectedRef.current) {
                console.error('[Orchestrator] EMITTING TO VOICE:', observation);
                lastSpokenObservationRef.current = { text: observation, timestamp: now };
                voice.interrupt();
                voice.sendSystemMessage(`${observation} Please tell the user this immediately in one short sentence.`);
              } else {
                console.error('[Orchestrator] Queuing observation (voice not connected)');
                pendingObservationRef.current = observation;
              }
            }
          }
        } else if (now - objectPresenceRef.current.lastSeenAt > OBJECT_REAPPEARANCE_MS) {
          objectPresenceRef.current = { object: '', lastSeenAt: 0 };
        }
      }

      // 1. Check for Immediate Hazards (Safety First)
      if (isImmediateHazard(objects)) {
        const hazard = objects.find((o: string) => o.includes('red') || o.includes('obstacle'));
        setLastSuggestion(`Hazard Detected: ${hazard}`);
        voice.interrupt();
        playEarcon('chime');
      }

      // 2. Suggest Mode Improvements
      const suggested = suggestModeFromScene({
        objects,
        environment: context || '',
      }, currentMode);
      setModeSuggestion(suggested);

      // 3. Update Memory
      let updatedMemory = [...currentMemory];
      objects.forEach((obj: string) => {
        if (!updatedMemory.includes(obj)) {
          updatedMemory = addObservationToMemory(updatedMemory, obj, 100);
        }
      });

      const optimization = optimizeMemory(updatedMemory);
      if (optimization.isSummarized) {
        updatedMemory = optimization.memory;
      }
      setMemory(updatedMemory);

      // 4. Proactive Advice
      const effectiveGoal = currentGoal || inferredGoalRef.current;
      if (effectiveGoal || currentMode === 'environment') {
        const suggestionResult = await evaluateProactiveSuggestion({
          environment: sceneAnalysis.environment,
          objects_seen: currentMemory,
          user_goal: effectiveGoal || 'stay safe',
        }, sceneAnalysis);

        if (suggestionResult.shouldSuggest && suggestionResult.suggestionPrompt) {
          if (suggestionResult.suggestionPrompt !== currentLastSuggestion) {
            setLastSuggestion(suggestionResult.suggestionPrompt);
            playEarcon('chime');
            if (voiceConnectedRef.current) {
              voice.interrupt();
              voice.sendSystemMessage(
                `[System Observation] ${suggestionResult.suggestionPrompt} Please tell the user this immediately in one concise sentence.`
              );
            }
          }
        }
      }
    } catch (err) {
      const fallback = handleServiceError('vision', err);
      console.error('Error in orchestration loop:', fallback.userMessage);
      setAnalysisError(fallback.userMessage);
    } finally {
      setIsProcessing(false);
    }
  }, []); // Stable reference — reads state via refs

  // Handle Tool Calls from Gemini Live
  useEffect(() => {
    if (voice.lastToolCall) {
      const { name, input, toolUseId } = voice.lastToolCall;
      
      if (handledToolCalls.current.has(toolUseId)) return;
      handledToolCalls.current.add(toolUseId);
      
      console.log(`[Page] Handling Tool Call: ${name}`, { input, toolUseId });

      if (name === 'analyze_frame') {
        const askedQuestion = typeof input.question === 'string' ? input.question : '';
        const inferredGoal = inferGoalFromQuestion(askedQuestion);
        if (inferredGoal) {
          inferredGoalRef.current = inferredGoal;
          if (!goalRef.current.trim()) {
            setGoal(inferredGoal);
          }
        }

        // Return the latest analysis context
        const context = lastAnalysis
          ? JSON.stringify(lastAnalysis)
          : 'No visual data available yet. Please wait for the next frame.';
        console.log(`[Page] Returning Analysis Context:`, context);
        voice.sendToolResult(toolUseId, context);
      } else if (name === 'update_memory') {
        const obs = (input.observations as string[]) || [];
        const newGoal = input.userGoal as string;

        if (obs.length > 0) {
          setMemory((prev) => {
            let updated = [...prev];
            obs.forEach((o) => {
              if (!updated.includes(o)) {
                updated = addObservationToMemory(updated, o, 100);
              }
            });
            return updated;
          });
        }

        if (newGoal) {
          inferredGoalRef.current = newGoal;
          setGoal(newGoal);
        }

        voice.sendToolResult(toolUseId, 'Memory and goals updated.');
      }
    }
  }, [voice.lastToolCall, lastAnalysis, voice.sendToolResult]);

  // Handle Initial Greeting
  useEffect(() => {
    console.log('[Page] Greeting Effect check:', { isGrounded: voice.isGrounded, isConnected: voice.isConnected, greetingSent: greetingSentRef.current });
    if (voice.isGrounded && !greetingSentRef.current) {
      greetingSentRef.current = true;
      const currentGoal = goalRef.current;
      const greeting = currentGoal 
        ? `Hello! I'm grounded and ready to help you with ${currentGoal}. What should I look for?`
        : "Hello! I'm ready to help. What are we looking for today?";
      voice.sendText(greeting);
    } else if (!voice.isConnected) {
      greetingSentRef.current = false;
    }
  }, [voice.isGrounded, voice.isConnected, voice.sendText]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-zinc-950 text-white relative overflow-hidden safe-area-padding">
      <div className="w-full max-w-md flex flex-col gap-4 z-10">
        {/* Header */}
        <header className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">SentiLens</h1>
          <p className="text-sm text-zinc-400 mt-1 tracking-wide uppercase font-semibold">
            {mode} Mode
          </p>
        </header>

        {/* Camera + Overlays */}
        <section
          className="aspect-[3/4] bg-zinc-900 rounded-3xl border border-zinc-800 flex items-center justify-center relative overflow-hidden shadow-2xl shadow-black/50"
          data-testid="camera-container"
        >
          <CameraStream
            onFrameCapture={onFrameCapture}
            onVideoStream={(frame) => {
              if (voice.isGrounded) {
                voice.sendVideoFrame(frame);
              }
            }}
            analyser={voice.analyzer}
            heartbeatIntervalMs={goal.trim() ? 1500 : 5000}
          />

          <DocumentOverlay active={mode === 'document'} status={isProcessing ? 'capturing' : 'searching'} />

          {/* Voice Transcript Overlay */}
          {voice.transcript && (
            <div className="absolute top-14 left-4 right-4 bg-zinc-950/80 backdrop-blur p-3 rounded-xl border border-zinc-700 animate-in fade-in">
              <p className="text-[10px] font-black uppercase tracking-widest mb-1 text-zinc-500">Transcript</p>
              <p className="text-sm text-zinc-200 italic">&ldquo;{voice.transcript}&rdquo;</p>
            </div>
          )}

          {/* AI Insight / Hazard Alert */}
          {lastSuggestion && (
            <div className={`absolute bottom-4 left-4 right-4 ${lastSuggestion.includes('Hazard') ? 'bg-red-600/95 border-red-400' : 'bg-blue-600/95 border-blue-400'} backdrop-blur p-4 rounded-2xl border shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500`}>
              <p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-70">
                {lastSuggestion.includes('Hazard') ? 'Safety Alert' : 'AI Insight'}
              </p>
              <p className="text-sm leading-snug font-medium">{lastSuggestion}</p>
            </div>
          )}

          {/* Mode Suggestion */}
          {modeSuggestion && (
            <div className="absolute top-4 left-4 right-4 bg-zinc-900/90 backdrop-blur p-3 rounded-xl border border-zinc-700 flex items-center justify-between animate-in slide-in-from-top-4">
              <p className="text-xs text-zinc-300">Suggest switching to <b>{modeSuggestion}</b>?</p>
              <button
                onClick={() => { setMode(modeSuggestion); setModeSuggestion(null); }}
                className="text-[10px] bg-white text-black px-2 py-1 rounded font-bold uppercase"
              >
                Switch
              </button>
            </div>
          )}
        </section>

        {/* Voice & Voice Error */}
        {voice.error && (
          <div className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">
            {voice.error}
          </div>
        )}

        {/* Mode Selector */}
        <ModeSelector currentMode={mode} onModeChange={setMode} />

        {/* Voice Button + Text Input */}
        <div className="space-y-3">
          {/* Voice Mic Button */}
          <button
            onClick={handleVoiceToggle}
            className={`w-full flex items-center justify-center gap-3 px-5 py-3.5 rounded-2xl text-sm font-bold transition-all shadow-lg ${
              voice.isCapturing
                ? 'bg-red-600 hover:bg-red-500 shadow-red-900/30 animate-pulse-subtle'
                : voice.isConnected
                ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/30'
                : 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/30'
            }`}
            data-testid="voice-button"
          >
            <span className="text-lg">
              {voice.isCapturing ? '🔴' : voice.isConnected ? '🎙️' : '🎤'}
            </span>
            {voice.isCapturing
              ? 'Listening... Tap to stop'
              : voice.isConnected
              ? 'Tap to speak'
              : 'Start Voice Session'}
          </button>

          {/* Goal Input */}
          {mode !== 'environment' && (
            <>
              {goal && (
                <div className="px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400 text-xs font-bold uppercase tracking-tight">
                  Current Goal: {goal}
                </div>
              )}

              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSetGoal()}
                  placeholder={mode === 'medication' ? 'e.g., check dosage' : 'e.g., find healthy cereal'}
                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-all placeholder:text-zinc-600"
                />
                <button
                  onClick={handleSetGoal}
                  className="bg-blue-600 hover:bg-blue-500 active:scale-95 px-5 py-3 rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-900/20"
                >
                  Set
                </button>
              </div>
            </>
          )}
        </div>

        {/* Debug Panel */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowDebug(!showDebug)}
            className="text-[10px] text-zinc-500 uppercase tracking-widest hover:text-zinc-300 transition-colors"
          >
            {showDebug ? 'Hide' : 'Show'} Debug
          </button>
        </div>
        <DebugPanel
          visible={showDebug}
          grounded={true}
          memory={memory}
          sessionId={sessionIdRef.current}
          wsConnected={voice.isConnected}
          lastToolCall={voice.lastToolCall}
          lastAnalysis={lastAnalysis}
          latencyMs={latencyMs}
        />

        {/* Analysis Error Banner */}
        {analysisError && (
          <div className="flex items-start gap-3 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-2xl">
            <span className="text-red-400 text-lg leading-none mt-0.5">⚠️</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold uppercase tracking-widest text-red-400 mb-1">Error</p>
              <p className="text-sm text-red-300 leading-snug">{analysisError}</p>
            </div>
            <button
              onClick={() => setAnalysisError(null)}
              className="text-red-500 hover:text-red-300 text-xs font-bold uppercase"
            >
              ✕
            </button>
          </div>
        )}

        {/* Status Footer */}
        <footer className="flex flex-col items-center gap-2 pb-4">
          <div
            className="flex items-center gap-3 px-5 py-2.5 bg-zinc-900/50 rounded-full border border-zinc-800 backdrop-blur"
            data-testid="status-indicator"
          >
            <div className={`w-2.5 h-2.5 rounded-full ${isProcessing ? 'bg-amber-500 animate-pulse' : 'bg-green-500'}`} />
            <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">
              {isProcessing ? 'Processing' : 'Live Loop'}
            </span>
          </div>
        </footer>
      </div>
    </main>
  );
}
