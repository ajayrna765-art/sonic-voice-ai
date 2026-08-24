import { Play, Square, Sparkles, Volume2, CheckCircle2 } from 'lucide-react';
import { VoiceOption } from '../types';

interface VoiceCardProps {
  key?: string;
  voice: VoiceOption;
  isSelected: boolean;
  onSelect: (voice: VoiceOption) => void;
  onAudition: (voice: VoiceOption) => void;
  isAuditioning: boolean;
}

export default function VoiceCard({
  voice,
  isSelected,
  onSelect,
  onAudition,
  isAuditioning,
}: VoiceCardProps) {
  const getGenderBadge = (gender: string) => {
    switch (gender) {
      case 'Female':
        return 'text-[#FF77B0] border-[#552233] bg-[#220D15]';
      case 'Male':
        return 'text-[#00FFCC] border-[#005544] bg-[#00221A]';
      default:
        return 'text-[#A78BFA] border-[#3B256B] bg-[#170E2E]';
    }
  };

  return (
    <div
      id={`voice-card-${voice.id.toLowerCase()}`}
      onClick={() => onSelect(voice)}
      className={`group relative flex flex-col justify-between p-4 rounded-xl border transition-all duration-200 cursor-pointer text-left ${
        isSelected
          ? 'border-[#00FFCC] bg-[#1A1A1A] shadow-[0_0_15px_rgba(0,255,204,0.12)] ring-1 ring-[#00FFCC]/50'
          : 'border-[#2A2A2A] bg-[#161616] hover:border-[#444] hover:bg-[#1A1A1A]'
      }`}
    >
      {/* Active Glowing Beacon */}
      {isSelected && (
        <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-[#00FFCC] shadow-[0_0_8px_rgba(0,255,204,0.7)]"></div>
      )}

      <div>
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-base border transition-all ${
                isSelected
                  ? 'bg-[#00FFCC] text-black border-[#00FFCC] shadow-[0_0_10px_rgba(0,255,204,0.3)]'
                  : 'bg-[#2A2A2A] text-[#E0E0E0] border-[#333] group-hover:border-[#555]'
              }`}
            >
              {voice.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-[#F0F0F0] tracking-tight">
                  {voice.name}
                  {voice.hindiName && (
                    <span className="ml-1.5 text-xs text-[#00FFCC] font-normal">
                      ({voice.hindiName})
                    </span>
                  )}
                </h3>
              </div>
              <p className="text-[10px] font-mono text-[#888] mt-0.5 tracking-tight">
                {voice.accent}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {voice.language === 'Hindi' && (
              <span className="text-[9px] px-1.5 py-0.5 rounded border border-[#005544] bg-[#00221A] text-[#00FFCC] font-mono uppercase font-bold tracking-wider">
                🇮🇳 HINDI
              </span>
            )}
            <span
              className={`text-[9px] px-2 py-0.5 rounded border font-mono uppercase tracking-wider ${getGenderBadge(
                voice.gender
              )}`}
            >
              {voice.gender}
            </span>
          </div>
        </div>

        <p className="text-xs text-[#AAAAAA] leading-relaxed mb-3 line-clamp-2">
          {voice.description}
        </p>

        {/* Minimal geometric indicator bar */}
        <div className="h-4 w-full flex items-center gap-[2px] mb-3">
          <div className="flex-1 bg-[#282828] h-[1px] relative">
            {isSelected && (
              <>
                <div className="absolute top-[-3px] left-[25%] w-[1px] h-2 bg-[#00FFCC]"></div>
                <div className="absolute top-[-5px] left-[55%] w-[1px] h-3 bg-[#00FFCC]"></div>
                <div className="absolute top-[-2px] left-[80%] w-[1px] h-1.5 bg-[#00FFCC]"></div>
              </>
            )}
          </div>
        </div>

        {/* Traits badges */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {voice.traits.map((trait) => (
            <span
              key={trait}
              className={`text-[10px] px-2 py-0.5 rounded font-medium border ${
                trait.includes('Exact') || trait.includes('अक्षरशः')
                  ? 'bg-[#00221A] border-[#005544] text-[#00FFCC]'
                  : 'bg-[#111111] border-[#2A2A2A] text-[#999]'
              }`}
            >
              {trait}
            </span>
          ))}
        </div>
      </div>

      <div className="pt-2.5 border-t border-[#222] flex items-center justify-between">
        <span className="text-[9px] uppercase tracking-widest text-[#555] font-bold font-mono">
          24kHz • EXACT PHONETIC
        </span>

        <button
          id={`audition-btn-${voice.id.toLowerCase()}`}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onAudition(voice);
          }}
          className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded border transition-all ${
            isAuditioning
              ? 'bg-[#00FFCC] text-black border-[#00FFCC]'
              : 'border-[#333] text-[#CCC] bg-[#111] hover:bg-white hover:text-black hover:border-white'
          }`}
          title="Listen to sample audio clip"
        >
          {isAuditioning ? (
            <>
              <Square className="w-3 h-3 fill-current" />
              <span>Playing</span>
            </>
          ) : (
            <>
              <Play className="w-3 h-3 fill-current" />
              <span>Preview</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
