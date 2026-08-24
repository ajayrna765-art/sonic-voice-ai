import { BookOpen, Radio, Sparkles, Film, Mic, Volume2 } from 'lucide-react';
import { PRESET_SCRIPTS } from '../data/voices';
import { PresetScript } from '../types';

interface PresetPickerProps {
  onSelectPreset: (preset: PresetScript) => void;
  activePresetId?: string;
}

export default function PresetPicker({
  onSelectPreset,
  activePresetId,
}: PresetPickerProps) {
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Radio':
        return <Radio className="w-3.5 h-3.5 text-[#00FFCC]" />;
      case 'Sparkles':
        return <Sparkles className="w-3.5 h-3.5 text-[#00FFCC]" />;
      case 'BookOpen':
        return <BookOpen className="w-3.5 h-3.5 text-[#00FFCC]" />;
      case 'Film':
        return <Film className="w-3.5 h-3.5 text-[#00FFCC]" />;
      case 'Mic':
        return <Mic className="w-3.5 h-3.5 text-[#00FFCC]" />;
      default:
        return <Volume2 className="w-3.5 h-3.5 text-[#00FFCC]" />;
    }
  };

  return (
    <div id="preset-picker-section" className="space-y-2.5">
      <div className="flex items-center justify-between">
        <label className="text-[10px] text-[#666666] uppercase font-bold tracking-[0.2em] block">
          Preset Script Templates
        </label>
        <span className="text-[10px] font-mono text-[#555]">6 Presets</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {PRESET_SCRIPTS.map((preset) => {
          const isSelected = activePresetId === preset.id;
          return (
            <button
              key={preset.id}
              id={`preset-btn-${preset.id}`}
              type="button"
              onClick={() => onSelectPreset(preset)}
              className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer group ${
                isSelected
                  ? 'border-[#00FFCC] bg-[#1A1A1A] shadow-[0_0_12px_rgba(0,255,204,0.15)] ring-1 ring-[#00FFCC]'
                  : 'border-[#2A2A2A] bg-[#161616] hover:border-[#444] hover:bg-[#1A1A1A]'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                {getIcon(preset.icon)}
                <span className="text-xs font-bold text-[#E0E0E0] line-clamp-1 group-hover:text-white">
                  {preset.title}
                </span>
              </div>
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="text-[#00FFCC] font-semibold">{preset.recommendedVoice}</span>
                <span className="text-[#666] uppercase">{preset.category.split(' ')[0]}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
