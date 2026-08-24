import { useState } from 'react';
import { Plus, Trash2, MessageSquare, ArrowRight, Radio, Zap } from 'lucide-react';
import { DialogueLine, VoiceOption } from '../types';

interface DialogueEditorProps {
  voices: VoiceOption[];
  onGenerateDialogue: (
    lines: DialogueLine[],
    voiceA: string,
    voiceB: string
  ) => void;
  isGenerating: boolean;
  creditsRemaining?: number;
  onOpenRecharge?: () => void;
}

const DEFAULT_DIALOGUE: DialogueLine[] = [
  {
    id: '1',
    speaker: 'Speaker A',
    voice: 'Ananya',
    text: 'नमस्ते आरव! क्या आपने नया सटीक उच्चारण इंजन टेस्ट किया?',
  },
  {
    id: '2',
    speaker: 'Speaker B',
    voice: 'Aarav',
    text: 'हाँ अनन्या! चाहे zhunti जैसा कठिन शब्द हो या कोई भी कठिन वाक्य, उच्चारण एकदम सटीक है।',
  },
  {
    id: '3',
    speaker: 'Speaker A',
    voice: 'Ananya',
    text: 'That is wonderful! This makes Hindi and Hinglish podcasts sound completely natural.',
  },
  {
    id: '4',
    speaker: 'Speaker B',
    voice: 'Aarav',
    text: 'बिलकुल! चलिए पूरा संवाद जनरेट करके सुनते हैं।',
  },
];

export default function DialogueEditor({
  voices,
  onGenerateDialogue,
  isGenerating,
  creditsRemaining = 10,
  onOpenRecharge,
}: DialogueEditorProps) {
  const [lines, setLines] = useState<DialogueLine[]>(DEFAULT_DIALOGUE);
  const [speakerAVoice, setSpeakerAVoice] = useState<string>('Ananya');
  const [speakerBVoice, setSpeakerBVoice] = useState<string>('Aarav');

  const addLine = (speaker: 'Speaker A' | 'Speaker B') => {
    const newLine: DialogueLine = {
      id: Date.now().toString(),
      speaker,
      voice: speaker === 'Speaker A' ? speakerAVoice : speakerBVoice,
      text: '',
    };
    setLines([...lines, newLine]);
  };

  const updateLineText = (id: string, text: string) => {
    setLines(lines.map((l) => (l.id === id ? { ...l, text } : l)));
  };

  const toggleLineSpeaker = (id: string) => {
    setLines(
      lines.map((l) => {
        if (l.id !== id) return l;
        const newSpeaker = l.speaker === 'Speaker A' ? 'Speaker B' : 'Speaker A';
        return {
          ...l,
          speaker: newSpeaker,
          voice: newSpeaker === 'Speaker A' ? speakerAVoice : speakerBVoice,
        };
      })
    );
  };

  const removeLine = (id: string) => {
    if (lines.length <= 1) return;
    setLines(lines.filter((l) => l.id !== id));
  };

  const handleGenerate = () => {
    const validLines = lines.filter((l) => l.text.trim().length > 0);
    if (validLines.length === 0) return;
    onGenerateDialogue(validLines, speakerAVoice, speakerBVoice);
  };

  return (
    <div id="dialogue-editor-container" className="space-y-6">
      {/* Speaker Voice Configuration */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-[#0D0D0D] border border-[#2A2A2A] rounded-2xl">
        <div className="p-4 bg-[#161616] rounded-xl border border-[#2A2A2A]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[#00FFCC] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#00FFCC] shadow-[0_0_6px_rgba(0,255,204,0.6)]"></span>
              Speaker A (Alex)
            </span>
          </div>
          <label className="block text-[10px] font-mono text-[#777] mb-1.5 uppercase tracking-wider">
            Assigned Voice
          </label>
          <select
            id="speaker-a-voice-select"
            value={speakerAVoice}
            onChange={(e) => setSpeakerAVoice(e.target.value)}
            className="w-full text-xs font-mono font-bold px-3 py-2.5 rounded-lg border border-[#333] bg-[#111] text-[#E0E0E0] focus:outline-none focus:border-[#00FFCC]"
          >
            {voices.map((v) => (
              <option key={`a-${v.id}`} value={v.id}>
                {v.name} ({v.gender}, {v.accent})
              </option>
            ))}
          </select>
        </div>

        <div className="p-4 bg-[#161616] rounded-xl border border-[#2A2A2A]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[#FFAA00] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#FFAA00] shadow-[0_0_6px_rgba(255,170,0,0.6)]"></span>
              Speaker B (Jordan)
            </span>
          </div>
          <label className="block text-[10px] font-mono text-[#777] mb-1.5 uppercase tracking-wider">
            Assigned Voice
          </label>
          <select
            id="speaker-b-voice-select"
            value={speakerBVoice}
            onChange={(e) => setSpeakerBVoice(e.target.value)}
            className="w-full text-xs font-mono font-bold px-3 py-2.5 rounded-lg border border-[#333] bg-[#111] text-[#E0E0E0] focus:outline-none focus:border-[#FFAA00]"
          >
            {voices.map((v) => (
              <option key={`b-${v.id}`} value={v.id}>
                {v.name} ({v.gender}, {v.accent})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Script Lines */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[#888] flex items-center gap-2">
            <MessageSquare className="w-3.5 h-3.5 text-[#00FFCC]" />
            Dialogue Script Track
          </h4>
          <span className="text-[10px] font-mono text-[#555]">
            {lines.length} {lines.length === 1 ? 'Line' : 'Lines'}
          </span>
        </div>

        <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
          {lines.map((line) => {
            const isSpeakerA = line.speaker === 'Speaker A';
            const voiceName = isSpeakerA ? speakerAVoice : speakerBVoice;

            return (
              <div
                key={line.id}
                className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row gap-3 items-start ${
                  isSpeakerA
                    ? 'bg-[#111] border-[#2A2A2A] hover:border-[#00FFCC]/50'
                    : 'bg-[#111] border-[#2A2A2A] hover:border-[#FFAA00]/50'
                }`}
              >
                <div className="flex sm:flex-col items-center justify-between w-full sm:w-auto gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => toggleLineSpeaker(line.id)}
                    className={`text-[10px] px-2.5 py-1 rounded font-mono font-bold uppercase tracking-wider cursor-pointer transition-colors ${
                      isSpeakerA
                        ? 'bg-[#00FFCC] text-black hover:bg-[#00E6B8]'
                        : 'bg-[#FFAA00] text-black hover:bg-[#E69900]'
                    }`}
                    title="Click to toggle speaker"
                  >
                    {line.speaker}
                  </button>
                  <span className="text-[10px] font-mono text-[#777]">
                    Voice: <strong className="text-[#CCC]">{voiceName}</strong>
                  </span>
                </div>

                <div className="w-full flex-1">
                  <textarea
                    rows={2}
                    value={line.text}
                    onChange={(e) => updateLineText(line.id, e.target.value)}
                    placeholder={`Enter line for ${line.speaker}...`}
                    className="w-full text-xs p-2.5 rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] text-[#E0E0E0] placeholder:text-[#555] focus:outline-none focus:border-[#00FFCC] resize-none font-sans"
                  />
                </div>

                {lines.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeLine(line.id)}
                    className="p-1.5 text-[#555] hover:text-red-400 hover:bg-[#200] rounded transition-colors self-end sm:self-center"
                    title="Delete line"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Add line buttons */}
        <div className="flex flex-wrap gap-2 pt-2">
          <button
            type="button"
            onClick={() => addLine('Speaker A')}
            className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider px-3 py-2 rounded-lg border border-[#005544] bg-[#00221A] text-[#00FFCC] hover:border-[#00FFCC] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Line: Speaker A ({speakerAVoice})
          </button>
          <button
            type="button"
            onClick={() => addLine('Speaker B')}
            className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider px-3 py-2 rounded-lg border border-[#553300] bg-[#221500] text-[#FFAA00] hover:border-[#FFAA00] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Line: Speaker B ({speakerBVoice})
          </button>
        </div>
      </div>

      {/* Generate Action Button & Credits notice */}
      <div className="pt-2 space-y-2">
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#141414] border border-[#2A2A2A] text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${creditsRemaining > 0 ? 'bg-[#00FFCC]' : 'bg-[#FF3366] animate-ping'}`} />
            <span className="text-[#AAA]">
              Available Credits: <strong className={creditsRemaining > 0 ? 'text-[#00FFCC]' : 'text-[#FF3366]'}>{creditsRemaining} Left</strong>
            </span>
          </div>
          {onOpenRecharge && (
            <button
              type="button"
              onClick={onOpenRecharge}
              className="text-[11px] font-bold text-[#00FFCC] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Zap className="w-3 h-3 fill-current" />
              <span>{creditsRemaining <= 0 ? 'Buy Credits (₹20)' : '+Recharge ₹20'}</span>
            </button>
          )}
        </div>

        <button
          id="synthesize-dialogue-btn"
          type="button"
          disabled={isGenerating || lines.every((l) => !l.text.trim())}
          onClick={handleGenerate}
          className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-white hover:bg-[#00FFCC] text-black font-black uppercase text-xs tracking-widest transition-all shadow-[0_4px_20px_rgba(255,255,255,0.1)] cursor-pointer disabled:opacity-40"
        >
          {isGenerating ? (
            <>
              <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              <span>Synthesizing Dual Neural Speech...</span>
            </>
          ) : creditsRemaining <= 0 ? (
            <>
              <Zap className="w-4 h-4 text-[#FF3366]" />
              <span>Recharge ₹20 to Synthesize Dialogue</span>
            </>
          ) : (
            <>
              <Radio className="w-4 h-4" />
              <span>Synthesize Multi-Speaker Dialogue</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
