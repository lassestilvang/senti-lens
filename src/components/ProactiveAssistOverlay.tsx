import React from 'react';

interface ProactiveAssistOverlayProps {
  suggestion: string;
}

export default function ProactiveAssistOverlay({ suggestion }: ProactiveAssistOverlayProps) {
  if (!suggestion) return null;

  const isHazard = suggestion.includes('Hazard');

  return (
    <div 
      className={`absolute bottom-4 left-4 right-4 ${isHazard ? 'bg-red-600/95 border-red-400' : 'bg-blue-600/95 border-blue-400'} backdrop-blur p-4 rounded-2xl border shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500`}
      data-testid="proactive-overlay"
    >
      <p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-70">
        {isHazard ? 'Safety Alert' : 'AI Insight'}
      </p>
      <p className="text-sm leading-snug font-medium">{suggestion}</p>
    </div>
  );
}
