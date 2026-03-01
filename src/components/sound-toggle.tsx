'use client';
import { useSoundEffects } from '@/hooks/use-sound-effects';
import { Volume2, VolumeX } from 'lucide-react';

export function SoundToggle() {
  const { enabled, toggle } = useSoundEffects();

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md transition-colors text-emerald-300 hover:text-emerald-100 hover:bg-emerald-900/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
      aria-label={enabled ? 'Disable sound effects' : 'Enable sound effects'}
    >
      {enabled ? (
        <Volume2 className="w-4 h-4 text-emerald-400" />
      ) : (
        <VolumeX className="w-4 h-4 text-slate-500" />
      )}
      <span className="font-mono">
        Sound FX: {enabled ? 'ON' : 'OFF'}
      </span>
    </button>
  );
}
