import { useState, useEffect } from 'react';
import { Play, Square, Globe, Sliders } from 'lucide-react';

interface BrowserVoicesPickerProps {
  onSpeak: (text: string, voice: SpeechSynthesisVoice, rate: number, pitch: number) => void;
  onStop: () => void;
  isPlaying: boolean;
  textToSpeak: string;
}

export default function BrowserVoicesPicker({
  onSpeak,
  onStop,
  isPlaying,
  textToSpeak,
}: BrowserVoicesPickerProps) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceIndex, setSelectedVoiceIndex] = useState<number>(0);
  const [rate, setRate] = useState<number>(1);
  const [pitch, setPitch] = useState<number>(1);
  const [languageFilter, setLanguageFilter] = useState<string>('all');

  useEffect(() => {
    const loadVoices = () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const availableVoices = window.speechSynthesis.getVoices();
        if (availableVoices.length > 0) {
          setVoices(availableVoices);
          const defaultIdx = availableVoices.findIndex(
            (v) => v.lang.startsWith('en') && (v.name.includes('Natural') || v.default)
          );
          if (defaultIdx !== -1) {
            setSelectedVoiceIndex(defaultIdx);
          }
        }
      }
    };

    loadVoices();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  const languages = Array.from(new Set(voices.map((v) => v.lang.split('-')[0]))).sort() as string[];

  const filteredVoices = voices.filter((v) => {
    if (languageFilter === 'all') return true;
    return v.lang.startsWith(languageFilter);
  });

  const handlePlayToggle = () => {
    if (isPlaying) {
      onStop();
    } else {
      const selectedVoice = voices[selectedVoiceIndex] || voices[0];
      if (selectedVoice) {
        onSpeak(textToSpeak, selectedVoice, rate, pitch);
      }
    }
  };

  return (
    <div id="browser-voices-panel" className="space-y-4 p-5 bg-[#111111] border border-[#2A2A2A] rounded-2xl">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#222]">
        <div>
          <h3 className="text-xs font-mono font-bold uppercase tracking-[0.2em] text-[#00FFCC] flex items-center gap-2">
            <Globe className="w-3.5 h-3.5" />
            Device Native Voices Engine
          </h3>
          <p className="text-[11px] text-[#888] mt-0.5 font-sans">
            Instant local synthesis utilizing your operating system's voice hardware ({voices.length} voices loaded).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-[10px] font-mono text-[#666] uppercase tracking-wider">Filter:</label>
          <select
            value={languageFilter}
            onChange={(e) => setLanguageFilter(e.target.value)}
            className="text-[10px] font-mono font-bold px-2 py-1 rounded border border-[#333] bg-[#161616] text-[#CCC] focus:outline-none focus:border-[#00FFCC]"
          >
            <option value="all">ALL LANGS ({voices.length})</option>
            {languages.map((lang) => (
              <option key={lang} value={lang}>
                {lang.toUpperCase()}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Voice Selection */}
      <div>
        <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#AAA] mb-1.5">
          Select Installed Hardware Voice:
        </label>
        <select
          id="browser-voice-select"
          value={selectedVoiceIndex}
          onChange={(e) => setSelectedVoiceIndex(parseInt(e.target.value, 10))}
          className="w-full text-xs font-mono px-3 py-2.5 rounded-xl border border-[#333] bg-[#161616] text-[#E0E0E0] focus:ring-1 focus:ring-[#00FFCC] focus:border-[#00FFCC]"
        >
          {filteredVoices.map((voice) => {
            const originalIndex = voices.indexOf(voice);
            return (
              <option key={`${voice.name}-${originalIndex}`} value={originalIndex}>
                {voice.name} ({voice.lang}) {voice.default ? '★ System Default' : ''}
              </option>
            );
          })}
        </select>
      </div>

      {/* Sliders for Rate & Pitch */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-[#161616] rounded-xl border border-[#2A2A2A]">
        <div>
          <div className="flex justify-between text-xs font-mono mb-1.5">
            <span className="text-[#888]">Rate Speed</span>
            <span className="text-[#00FFCC] font-bold">{rate}x</span>
          </div>
          <div className="h-1.5 bg-[#222] rounded-full relative overflow-hidden">
            <input
              type="range"
              min={0.5}
              max={2.0}
              step={0.1}
              value={rate}
              onChange={(e) => setRate(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-transparent appearance-none cursor-pointer accent-[#00FFCC]"
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs font-mono mb-1.5">
            <span className="text-[#888]">Voice Pitch</span>
            <span className="text-[#00FFCC] font-bold">{pitch}</span>
          </div>
          <div className="h-1.5 bg-[#222] rounded-full relative overflow-hidden">
            <input
              type="range"
              min={0.5}
              max={1.8}
              step={0.1}
              value={pitch}
              onChange={(e) => setPitch(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-transparent appearance-none cursor-pointer accent-[#00FFCC]"
            />
          </div>
        </div>
      </div>

      {/* Action Button */}
      <button
        id="speak-browser-voice-btn"
        type="button"
        onClick={handlePlayToggle}
        className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-widest transition-all cursor-pointer ${
          isPlaying
            ? 'bg-[#FF4444] hover:bg-[#EE3333] text-white shadow-[0_0_12px_rgba(255,68,68,0.3)]'
            : 'bg-[#00FFCC] hover:bg-[#00E6B8] text-black shadow-[0_0_12px_rgba(0,255,204,0.25)]'
        }`}
      >
        {isPlaying ? (
          <>
            <Square className="w-3.5 h-3.5 fill-current" />
            <span>Halt Playback</span>
          </>
        ) : (
          <>
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Speak with Device Voice</span>
          </>
        )}
      </button>
    </div>
  );
}
