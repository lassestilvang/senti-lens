'use client';

import { useState } from 'react';

interface DebugPanelProps {
  visible: boolean;
  grounded?: boolean;
  memory?: string[];
  sessionId?: string;
  wsConnected?: boolean;
  lastToolCall?: { name: string; input: Record<string, unknown> } | null;
  lastAnalysis?: Record<string, unknown> | null;
  latencyMs?: number | null;
}

export default function DebugPanel({
  visible,
  grounded,
  memory = [],
  sessionId,
  wsConnected,
  lastToolCall,
  lastAnalysis,
  latencyMs,
}: DebugPanelProps) {
  const [expanded, setExpanded] = useState(true);

  if (!visible) return null;

  return (
    <div
      className="bg-zinc-900/95 backdrop-blur-sm border border-zinc-700 rounded-2xl overflow-hidden shadow-2xl"
      data-testid="debug-panel"
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-zinc-800/50 border-b border-zinc-700 hover:bg-zinc-800/80 transition-colors"
        data-testid="debug-toggle"
      >
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
            🔍 Debug Panel
          </span>
          {sessionId && (
            <span className="text-[9px] text-zinc-600 font-mono">
              {sessionId.slice(0, 8)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {wsConnected !== undefined && (
            <span className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase ${wsConnected ? 'text-green-400' : 'text-zinc-500'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${wsConnected ? 'bg-green-400' : 'bg-zinc-600'}`} />
              {wsConnected ? 'Voice' : 'No Voice'}
            </span>
          )}
          {grounded && (
            <span className="text-[9px] text-emerald-400 font-bold uppercase">✓ Grounded</span>
          )}
          <span className="text-zinc-500 text-xs">{expanded ? '▾' : '▸'}</span>
        </div>
      </button>

      {/* Body */}
      {expanded && (
        <div className="p-3 space-y-3 max-h-64 overflow-y-auto">
          {/* Latency */}
          {latencyMs !== undefined && latencyMs !== null && (
            <div>
              <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">Latency</span>
              <p className={`text-xs font-mono mt-0.5 ${latencyMs <= 1500 ? 'text-green-400' : 'text-amber-400'}`}>
                {latencyMs}ms {latencyMs <= 1500 ? '✓' : '⚠ slow'}
              </p>
            </div>
          )}

          {/* Last Tool Call */}
          {lastToolCall && (
            <div>
              <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">Last Tool Call</span>
              <pre className="text-[10px] font-mono text-blue-300 mt-0.5 bg-zinc-950 rounded-lg p-2 overflow-x-auto">
{JSON.stringify({ tool: lastToolCall.name, input: lastToolCall.input }, null, 2)}
              </pre>
            </div>
          )}

          {/* Last Analysis */}
          {lastAnalysis && (
            <div>
              <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">Last Analysis</span>
              <pre className="text-[10px] font-mono text-purple-300 mt-0.5 bg-zinc-950 rounded-lg p-2 overflow-x-auto max-h-24 overflow-y-auto">
{JSON.stringify(lastAnalysis, null, 2)}
              </pre>
            </div>
          )}

          {/* World Memory */}
          <div>
            <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">
              World Memory ({memory.length})
            </span>
            {memory.length === 0 ? (
              <p className="text-[10px] text-zinc-600 mt-0.5 italic">No observations yet</p>
            ) : (
              <pre className="text-[10px] font-mono text-emerald-300 mt-0.5 bg-zinc-950 rounded-lg p-2 overflow-x-auto max-h-32 overflow-y-auto">
{JSON.stringify(memory, null, 2)}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
