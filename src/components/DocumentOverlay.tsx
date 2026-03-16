'use client';

interface DocumentOverlayProps {
  active: boolean;
  status?: 'searching' | 'aligned' | 'capturing';
}

export default function DocumentOverlay({ active, status = 'searching' }: DocumentOverlayProps) {
  return (
    <div 
      className={`absolute inset-0 z-10 transition-opacity duration-300 pointer-events-none ${active ? 'opacity-100' : 'opacity-0'}`}
      data-testid="document-overlay"
    >
      {/* Corner guides */}
      <div className="absolute inset-12 border-2 border-dashed border-zinc-500 rounded-lg flex items-center justify-center">
        {status === 'aligned' && (
          <div className="bg-green-500/20 text-green-400 px-4 py-2 rounded-full border border-green-500/50 text-sm font-medium animate-pulse">
            Document Aligned
          </div>
        )}
        {status === 'searching' && (
          <div className="bg-zinc-900/50 text-zinc-400 px-4 py-2 rounded-full border border-zinc-700 text-sm">
            Align document within frame
          </div>
        )}
        {status === 'capturing' && (
          <div className="bg-blue-500/20 text-blue-400 px-4 py-2 rounded-full border border-blue-500/50 text-sm font-medium">
            Capturing...
          </div>
        )}
      </div>
    </div>
  );
}
