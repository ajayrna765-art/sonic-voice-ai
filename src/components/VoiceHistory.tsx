import { Play, Download, Trash2, Clock } from 'lucide-react';
import { GeneratedAudioItem } from '../types';

interface VoiceHistoryProps {
  history: GeneratedAudioItem[];
  onPlayItem: (item: GeneratedAudioItem) => void;
  onDeleteItem: (id: string) => void;
  onClearHistory: () => void;
}

export default function VoiceHistory({
  history,
  onPlayItem,
  onDeleteItem,
  onClearHistory,
}: VoiceHistoryProps) {
  if (history.length === 0) {
    return (
      <div id="voice-history-empty" className="p-8 text-center bg-[#111111] border border-[#2A2A2A] rounded-2xl">
        <div className="w-10 h-10 mx-auto rounded-full bg-[#1A1A1A] border border-[#333] flex items-center justify-center text-[#555] mb-3">
          <Clock className="w-5 h-5" />
        </div>
        <h4 className="text-xs font-mono font-bold uppercase tracking-[0.2em] text-[#888] mb-1">
          Session Cache Empty
        </h4>
        <p className="text-xs text-[#555] max-w-sm mx-auto font-sans">
          Select or input your script above and click "Generate Speech" to synthesize your first audio clip.
        </p>
      </div>
    );
  }

  const formatTimestamp = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const handleDownload = (item: GeneratedAudioItem) => {
    if (!item.audioUrl) return;
    const a = document.createElement('a');
    a.href = item.audioUrl;
    a.download = `sonic-${item.voiceName.toLowerCase()}-${item.timestamp}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div id="voice-history-panel" className="bg-[#111111] border border-[#2A2A2A] rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-[#222]">
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-[#00FFCC]" />
          <h3 className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[#E0E0E0]">
            Generated Audio Logs ({history.length})
          </h3>
        </div>

        <button
          type="button"
          onClick={onClearHistory}
          className="text-[10px] font-mono uppercase tracking-wider text-[#666] hover:text-red-400 transition-colors flex items-center gap-1 cursor-pointer"
        >
          <Trash2 className="w-3 h-3" />
          Clear Logs
        </button>
      </div>

      <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
        {history.map((item) => (
          <div
            key={item.id}
            className="p-3 rounded-xl border border-[#222] bg-[#161616] hover:border-[#333] hover:bg-[#1A1A1A] transition-all flex items-center justify-between gap-3 group"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <button
                type="button"
                onClick={() => onPlayItem(item)}
                className="w-8 h-8 rounded-full bg-[#222] group-hover:bg-[#00FFCC] text-[#AAA] group-hover:text-black flex items-center justify-center shrink-0 border border-[#333] group-hover:border-[#00FFCC] transition-all active:scale-95 cursor-pointer"
                title="Play audio clip"
              >
                <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
              </button>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-bold text-[#F0F0F0] tracking-tight">
                    {item.voiceName}
                  </span>
                  {item.isDialogue && (
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded border border-[#552233] bg-[#220D15] text-[#FF77B0] uppercase">
                      Dialogue
                    </span>
                  )}
                  {item.style && (
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded border border-[#333] bg-[#111] text-[#888] uppercase">
                      {item.style}
                    </span>
                  )}
                  <span className="text-[10px] text-[#555] font-mono ml-auto">
                    {formatTimestamp(item.timestamp)}
                  </span>
                </div>
                <p className="text-xs text-[#888] truncate font-sans">"{item.text}"</p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {item.audioUrl && (
                <button
                  type="button"
                  onClick={() => handleDownload(item)}
                  className="p-2 text-[#666] hover:text-[#00FFCC] hover:bg-[#111] rounded transition-colors"
                  title="Download WAV file"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => onDeleteItem(item.id)}
                className="p-2 text-[#555] hover:text-red-400 hover:bg-[#200] rounded transition-colors"
                title="Delete log"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
