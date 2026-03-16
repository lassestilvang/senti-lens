'use client';

export type AssistantMode = 'grocery' | 'document' | 'medication' | 'environment';

interface ModeSelectorProps {
  currentMode: AssistantMode;
  onModeChange: (mode: AssistantMode) => void;
}

const MODES: { id: AssistantMode; label: string; icon: string }[] = [
  { id: 'grocery', label: 'Grocery', icon: '🛒' },
  { id: 'document', label: 'Document', icon: '📄' },
  { id: 'medication', label: 'Medication', icon: '💊' },
  { id: 'environment', label: 'Environment', icon: '🌍' },
];

export function ModeSelector({ currentMode, onModeChange }: ModeSelectorProps) {
  return (
    <div className="flex bg-zinc-900/80 backdrop-blur border border-zinc-800 rounded-2xl p-1 gap-1 shadow-lg">
      {MODES.map((mode) => (
        <button
          key={mode.id}
          onClick={() => onModeChange(mode.id)}
          className={`flex flex-col items-center justify-center py-2 px-3 rounded-xl transition-all duration-200 min-w-[72px] ${
            currentMode === mode.id
              ? 'bg-blue-600 text-white shadow-md scale-105'
              : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'
          }`}
        >
          <span className="text-xl mb-1">{mode.icon}</span>
          <span className="text-[10px] font-bold uppercase tracking-tight">{mode.label}</span>
        </button>
      ))}
    </div>
  );
}
