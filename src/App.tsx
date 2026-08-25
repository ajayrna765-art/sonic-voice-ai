import { useState, useRef, useEffect } from 'react';
import {
  Mic,
  Sparkles,
  Users,
  Globe,
  Sliders,
  Radio,
  AlertCircle,
  Activity,
  Cpu,
  Layers,
  Clock,
  Play,
  RotateCcw,
  Volume2,
  CheckCircle2,
  Zap,
} from 'lucide-react';
import { GEMINI_VOICES, SPEECH_STYLES } from './data/voices';
import {
  VoiceOption,
  SpeechStyle,
  EmotionStrength,
  GeneratedAudioItem,
  DialogueLine,
  PresetScript,
} from './types';
import VoiceCard from './components/VoiceCard';
import AudioPlayer from './components/AudioPlayer';
import AudioVisualizer from './components/AudioVisualizer';
import DialogueEditor from './components/DialogueEditor';
import BrowserVoicesPicker from './components/BrowserVoicesPicker';
import PresetPicker from './components/PresetPicker';
import VoiceHistory from './components/VoiceHistory';

// Client-side cache to avoid repeated network requests
const clientAudioCache = new Map<string, string>();

export default function App() {
  // Tabs: AI Studio Single, AI Dialogue Mode, Native Browser Voices
  const [activeTab, setActiveTab] = useState<'ai-single' | 'ai-dialogue' | 'browser-native'>('ai-single');

  // Single Voice Mode States (Defaults to Ananya - Hindi Exact Phonetic)
  const [selectedVoice, setSelectedVoice] = useState<VoiceOption>(GEMINI_VOICES[0]);
  const [text, setText] = useState<string>(
    'नमस्ते! यहाँ हर शब्द को बिल्कुल वैसे ही पढ़ा जाएगा जैसा लिखा है। उदाहरण के लिए: zhunti, zaban, khushi, qila, ghazal, farak — बिना किसी बदलाव के सटीक ध्वनियां।'
  );
  const [speechStyle, setSpeechStyle] = useState<SpeechStyle>('hindi-shudh');
  const [speed, setSpeed] = useState<number>(1.0);
  const [emotionStrength, setEmotionStrength] = useState<EmotionStrength>('neutral');
  const [genderFilter, setGenderFilter] = useState<'All' | 'Female' | 'Male' | 'Neutral'>('All');
  const [languageFilter, setLanguageFilter] = useState<'All' | 'Hindi' | 'English'>('All');
  
  // Generation & Player States
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string | null>(null);
  const [currentAudioText, setCurrentAudioText] = useState<string>('');
  const [currentPlayingVoice, setCurrentPlayingVoice] = useState<string>('');
  const [currentStyleName, setCurrentStyleName] = useState<string>('');
  const [auditioningVoiceId, setAuditioningVoiceId] = useState<string | null>(null);
  
  // Native Browser Speech State
  const [isNativePlaying, setIsNativePlaying] = useState<boolean>(false);
  
  // Rate Limit / Cooldown State
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(0);
  const [rateLimitNotice, setRateLimitNotice] = useState<string | null>(null);
  const [fallbackNotice, setFallbackNotice] = useState<string | null>(null);

  // History & Presets
  const [history, setHistory] = useState<GeneratedAudioItem[]>([]);
  const [activePresetId, setActivePresetId] = useState<string | undefined>('hindi-phonetic-test');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const auditionAudioRef = useRef<HTMLAudioElement | null>(null);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setCooldownSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setRateLimitNotice(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  // Filter voices based on gender & language
  const filteredVoices = GEMINI_VOICES.filter((v) => {
    const matchesGender = genderFilter === 'All' || v.gender === genderFilter;
    const matchesLang = languageFilter === 'All' || v.language === languageFilter;
    return matchesGender && matchesLang;
  });

  // Calculate metrics
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const estimatedSeconds = Math.max(1, Math.round((wordCount / (140 * speed)) * 60));

  // Handle Preset Script Selection
  const handleSelectPreset = (preset: PresetScript) => {
    setActivePresetId(preset.id);
    setText(preset.text);
    const matchedVoice = GEMINI_VOICES.find((v) => v.name.toLowerCase() === preset.recommendedVoice.toLowerCase());
    if (matchedVoice) {
      setSelectedVoice(matchedVoice);
    }
    setSpeechStyle(preset.recommendedStyle);
  };

  /**
   * Helper: Synthesizes browser speech fallback matched to a voice's pitch/tone and language profile
   */
  const playVoiceViaBrowserSpeech = (voiceName: string, textToSpeak: string, onEnd?: () => void) => {
    if (!('speechSynthesis' in window)) {
      if (onEnd) onEnd();
      return;
    }

    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(textToSpeak);
    const voices = window.speechSynthesis.getVoices();

    // Map voice personas to speech synthesis attributes
    if (voiceName === 'Aarav') {
      utter.pitch = 0.85;
      utter.rate = 1.0;
      const hindiMale = voices.find(
        (v) =>
          (v.lang.startsWith('hi') || v.lang === 'hi-IN') &&
          (v.name.includes('Male') || v.name.includes('Madhur') || v.name.includes('Hemant') || v.name.includes('Neel'))
      );
      const anyHindi = voices.find((v) => v.lang.startsWith('hi') || v.lang === 'hi-IN' || v.name.includes('Hindi'));
      if (hindiMale) utter.voice = hindiMale;
      else if (anyHindi) utter.voice = anyHindi;
    } else if (voiceName === 'Kabir') {
      utter.pitch = 1.1;
      utter.rate = 1.12;
      const hindiMale = voices.find(
        (v) =>
          (v.lang.startsWith('hi') || v.lang === 'hi-IN') &&
          (v.name.includes('Male') || v.name.includes('Madhur') || v.name.includes('Neel'))
      );
      const anyHindi = voices.find((v) => v.lang.startsWith('hi') || v.lang === 'hi-IN' || v.name.includes('Hindi'));
      if (hindiMale) utter.voice = hindiMale;
      else if (anyHindi) utter.voice = anyHindi;
    } else if (voiceName === 'Vikram') {
      utter.pitch = 0.68;
      utter.rate = 0.9;
      const hindiMale = voices.find(
        (v) =>
          (v.lang.startsWith('hi') || v.lang === 'hi-IN') &&
          (v.name.includes('Male') || v.name.includes('Hemant') || v.name.includes('Madhur'))
      );
      const anyHindi = voices.find((v) => v.lang.startsWith('hi') || v.lang === 'hi-IN' || v.name.includes('Hindi'));
      if (hindiMale) utter.voice = hindiMale;
      else if (anyHindi) utter.voice = anyHindi;
    } else if (voiceName === 'Rohan') {
      utter.pitch = 0.95;
      utter.rate = 1.02;
      const anyHindi = voices.find((v) => v.lang.startsWith('hi') || v.lang === 'hi-IN' || v.name.includes('Hindi'));
      if (anyHindi) utter.voice = anyHindi;
    } else if (voiceName === 'Ananya') {
      utter.pitch = 1.05;
      utter.rate = 0.98;
      const hindiFemale = voices.find(
        (v) =>
          (v.lang.startsWith('hi') || v.lang === 'hi-IN') &&
          (v.name.includes('Female') || v.name.includes('Kalpana') || v.name.includes('Swara') || v.name.includes('Google हिन्दी') || v.name.includes('Lekha'))
      );
      const anyHindi = voices.find((v) => v.lang.startsWith('hi') || v.lang === 'hi-IN' || v.name.includes('Hindi'));
      if (hindiFemale) utter.voice = hindiFemale;
      else if (anyHindi) utter.voice = anyHindi;
    } else if (voiceName === 'Kavya') {
      utter.pitch = 1.15;
      utter.rate = 0.92;
      const anyHindi = voices.find((v) => v.lang.startsWith('hi') || v.lang === 'hi-IN' || v.name.includes('Hindi'));
      if (anyHindi) utter.voice = anyHindi;
    } else if (voiceName === 'Kore') {
      utter.pitch = 1.1;
      utter.rate = 0.95;
      const female = voices.find((v) => v.lang.startsWith('en') && (v.name.includes('Female') || v.name.includes('Samantha') || v.name.includes('Zira')));
      if (female) utter.voice = female;
    } else if (voiceName === 'Puck') {
      utter.pitch = 1.25;
      utter.rate = 1.15;
      const upbeat = voices.find((v) => v.lang.startsWith('en') && (v.name.includes('David') || v.name.includes('Alex')));
      if (upbeat) utter.voice = upbeat;
    } else if (voiceName === 'Charon') {
      utter.pitch = 0.65;
      utter.rate = 0.88;
      const deep = voices.find((v) => v.lang.startsWith('en') && (v.name.includes('Male') || v.name.includes('David') || v.name.includes('Mark')));
      if (deep) utter.voice = deep;
    } else if (voiceName === 'Fenrir') {
      utter.pitch = 0.72;
      utter.rate = 0.92;
    } else if (voiceName === 'Aoede') {
      utter.pitch = 1.15;
      utter.rate = 0.9;
    } else {
      utter.pitch = 1.0;
      utter.rate = 1.0;
    }

    utter.onstart = () => {
      setIsNativePlaying(true);
    };
    utter.onend = () => {
      setIsNativePlaying(false);
      if (onEnd) onEnd();
    };
    utter.onerror = () => {
      setIsNativePlaying(false);
      if (onEnd) onEnd();
    };

    window.speechSynthesis.speak(utter);
  };

  // Handle Voice Audition (Preview clip)
  const handleAudition = async (voice: VoiceOption) => {
    if (auditioningVoiceId === voice.id) {
      if (auditionAudioRef.current) {
        auditionAudioRef.current.pause();
        auditionAudioRef.current = null;
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setAuditioningVoiceId(null);
      return;
    }

    setAuditioningVoiceId(voice.id);
    setErrorMessage(null);
    setFallbackNotice(null);

    const sampleText = voice.sampleText || `Hi, I am ${voice.name}. Ready to speak your words.`;
    const cacheKey = `audition:${voice.name}:${sampleText}`;

    // Check client-side cache first
    if (clientAudioCache.has(cacheKey)) {
      const cachedAudioData = clientAudioCache.get(cacheKey)!;
      const audio = new Audio(cachedAudioData);
      auditionAudioRef.current = audio;
      audio.onended = () => setAuditioningVoiceId(null);
      audio.onerror = () => setAuditioningVoiceId(null);
      try {
        await audio.play();
        return;
      } catch {
        setAuditioningVoiceId(null);
        return;
      }
    }

    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: sampleText,
          voice: voice.name,
          style: voice.language === 'Hindi' ? 'hindi-shudh' : 'natural',
          speed: 1.0,
        }),
      });

      const data = await res.json();

      if (res.status === 429 || data.rateLimited) {
        // Free tier rate limit: Seamlessly fallback to browser speech synthesis
        const delay = data.retryDelay || 20;
        setCooldownSeconds(delay);
        setRateLimitNotice(`API quota cooling down (${delay}s). Previewing using device acoustic engine.`);
        playVoiceViaBrowserSpeech(voice.name, sampleText, () => setAuditioningVoiceId(null));
        return;
      }

      if (!res.ok || !data.audioData) {
        throw new Error(data.error || 'Failed to preview voice.');
      }

      // Cache the audition audio clip so it never hits the API again
      clientAudioCache.set(cacheKey, data.audioData);

      const audio = new Audio(data.audioData);
      auditionAudioRef.current = audio;
      audio.onended = () => setAuditioningVoiceId(null);
      audio.onerror = () => setAuditioningVoiceId(null);
      await audio.play();
    } catch (err: any) {
      console.warn('Audition API fallback:', err);
      // Seamless browser speech fallback
      playVoiceViaBrowserSpeech(voice.name, sampleText, () => setAuditioningVoiceId(null));
    }
  };

  // Handle Full Speech Generation (Single Voice)
  const handleGenerateSpeech = async () => {
    if (!text.trim()) {
      setErrorMessage('कृपया ऊपर टेक्स्ट बॉक्स में कुछ शब्द या वाक्य टाइप करें जिसे आप आवाज़ में बदलना चाहते हैं।');
      return;
    }

    setIsGenerating(true);
    setErrorMessage(null);
    setFallbackNotice(null);

    const cacheKey = `single:${selectedVoice.name}:${speechStyle}:${speed.toFixed(2)}:${emotionStrength}:${text.trim()}`;
    if (clientAudioCache.has(cacheKey)) {
      const cachedData = clientAudioCache.get(cacheKey)!;
      setCurrentAudioUrl(cachedData);
      setCurrentAudioText(text.trim());
      setCurrentPlayingVoice(selectedVoice.name);
      const matchedStyle = SPEECH_STYLES.find((s) => s.id === speechStyle);
      setCurrentStyleName(matchedStyle ? matchedStyle.name : speechStyle);
      setIsGenerating(false);
      return;
    }

    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text.trim(),
          voice: selectedVoice.name,
          style: speechStyle,
          speed: speed,
          emotion_strength: emotionStrength,
        }),
      });

      const data = await res.json();

      if (res.status === 429 || data.rateLimited) {
        const delay = data.retryDelay || 20;
        setCooldownSeconds(delay);
        setRateLimitNotice(
          `Gemini API दर सीमा कूलडाउन में है (${delay}s शेष)। बैकअप इंजन से आपकी आवाज़ तुरंत बज रही है!`
        );
        setCurrentAudioUrl(null);
        setCurrentAudioText(text.trim());
        setCurrentPlayingVoice(selectedVoice.name);
        const matchedStyle = SPEECH_STYLES.find((s) => s.id === speechStyle);
        setCurrentStyleName(matchedStyle ? matchedStyle.name : speechStyle);
        setIsGenerating(false);
        playVoiceViaBrowserSpeech(selectedVoice.name, text.trim());
        return;
      }

      if (!res.ok || !data.audioData) {
        throw new Error(data.error || 'Failed to synthesize speech.');
      }

      clientAudioCache.set(cacheKey, data.audioData);

      setCurrentAudioUrl(data.audioData);
      setCurrentAudioText(text.trim());
      setCurrentPlayingVoice(selectedVoice.name);
      
      const matchedStyle = SPEECH_STYLES.find((s) => s.id === speechStyle);
      setCurrentStyleName(matchedStyle ? matchedStyle.name : speechStyle);

      // Add to Session History
      const newHistoryItem: GeneratedAudioItem = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        text: text.trim(),
        voiceName: selectedVoice.name,
        voiceCategory: 'gemini-ai',
        language: selectedVoice.language,
        style: speechStyle,
        audioUrl: data.audioData,
      };
      setHistory((prev) => [newHistoryItem, ...prev]);
    } catch (err: any) {
      console.warn('Speech API error, seamlessly playing via browser speech fallback:', err);
      setCurrentAudioUrl(null);
      setCurrentAudioText(text.trim());
      setCurrentPlayingVoice(selectedVoice.name);
      setFallbackNotice('ऑडियो सीधे बैकअप इंजन से तुरंत प्ले किया गया।');
      playVoiceViaBrowserSpeech(selectedVoice.name, text.trim());
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle Dialogue Generation (Multi-Speaker)
  const handleGenerateDialogue = async (
    lines: DialogueLine[],
    voiceA: string,
    voiceB: string
  ) => {
    setIsGenerating(true);
    setErrorMessage(null);
    setFallbackNotice(null);

    const scriptFormatted = lines.map((l) => `${l.speaker}: ${l.text}`).join('\n');
    const cacheKey = `dialogue:${voiceA}:${voiceB}:${scriptFormatted}`;

    if (clientAudioCache.has(cacheKey)) {
      const cachedData = clientAudioCache.get(cacheKey)!;
      setCurrentAudioUrl(cachedData);
      const combinedText = lines.map((l) => `${l.speaker}: ${l.text}`).join(' | ');
      setCurrentAudioText(combinedText);
      setCurrentPlayingVoice(`${voiceA} & ${voiceB}`);
      setCurrentStyleName('Dialogue Conversation');
      setIsGenerating(false);
      return;
    }

    try {
      const res = await fetch('/api/tts-dialogue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lines,
          speakerAVoice: voiceA,
          speakerBVoice: voiceB,
        }),
      });

      const data = await res.json();

      if (res.status === 429 || data.rateLimited) {
        const delay = data.retryDelay || 20;
        setCooldownSeconds(delay);
        setRateLimitNotice(
          `Gemini Free Tier दर सीमा कूलडाउन में है (${delay}s)।`
        );
        setIsGenerating(false);
        const combinedText = lines.map((l) => `${l.speaker}: ${l.text}`).join('। ');
        playVoiceViaBrowserSpeech(voiceA, combinedText);
        return;
      }

      if (!res.ok || !data.audioData) {
        throw new Error(data.error || 'Failed to synthesize dialogue audio.');
      }

      clientAudioCache.set(cacheKey, data.audioData);

      setCurrentAudioUrl(data.audioData);
      const combinedText = lines.map((l) => `${l.speaker}: ${l.text}`).join(' | ');
      setCurrentAudioText(combinedText);
      setCurrentPlayingVoice(`${voiceA} & ${voiceB}`);
      setCurrentStyleName('Dialogue Conversation');

      // Add to history
      const newHistoryItem: GeneratedAudioItem = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        text: combinedText,
        voiceName: `${voiceA} & ${voiceB}`,
        voiceCategory: 'gemini-ai',
        isDialogue: true,
        audioUrl: data.audioData,
      };
      setHistory((prev) => [newHistoryItem, ...prev]);
    } catch (err: any) {
      console.warn('Dialogue error, falling back:', err);
      const combinedText = lines.map((l) => `${l.speaker}: ${l.text}`).join('। ');
      playVoiceViaBrowserSpeech(voiceA, combinedText);
    } finally {
      setIsGenerating(false);
    }
  };

  // Instant fallback speech using current active buffer
  const handleInstantDeviceSpeak = () => {
    if (!('speechSynthesis' in window)) {
      setErrorMessage('Browser Speech Synthesis is not available on this browser.');
      return;
    }
    playVoiceViaBrowserSpeech(selectedVoice.name, text.trim(), () => {
      setIsNativePlaying(false);
    });
    setIsNativePlaying(true);
    setCurrentPlayingVoice(`${selectedVoice.name} (Device Mode)`);
    setCurrentAudioText(text.trim());
    setCurrentStyleName('Device Synthesis');
    setCurrentAudioUrl(null);
  };

  // Browser Native Speech synthesis handlers
  const handleNativeSpeak = (
    textToSpeak: string,
    voice: SpeechSynthesisVoice,
    rate: number,
    pitch: number
  ) => {
    if (!('speechSynthesis' in window)) {
      setErrorMessage('Browser Speech Synthesis is not supported in this browser.');
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(textToSpeak || text);
    utterance.voice = voice;
    utterance.rate = rate;
    utterance.pitch = pitch;

    utterance.onstart = () => {
      setIsNativePlaying(true);
      setCurrentPlayingVoice(voice.name);
      setCurrentAudioText(textToSpeak || text);
      setCurrentStyleName('Native Voice');
      setCurrentAudioUrl(null);
    };

    utterance.onend = () => setIsNativePlaying(false);
    utterance.onerror = () => setIsNativePlaying(false);

    window.speechSynthesis.speak(utterance);
  };

  const handleStopNativeSpeak = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsNativePlaying(false);
    }
  };

  // Quick word insertion helper
  const handleInsertWord = (word: string) => {
    setText((prev) => (prev ? `${prev} ${word}` : word));
    setActivePresetId(undefined);
  };

  // Replay from history
  const handlePlayHistoryItem = (item: GeneratedAudioItem) => {
    if (item.audioUrl) {
      setCurrentAudioUrl(item.audioUrl);
      setCurrentAudioText(item.text);
      setCurrentPlayingVoice(item.voiceName);
      setCurrentStyleName(item.style || 'Custom');
    }
  };

  const handleDeleteHistoryItem = (id: string) => {
    setHistory((prev) => prev.filter((item) => item.id !== id));
  };

  const handleClearHistory = () => {
    setHistory([]);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#E0E0E0] font-sans antialiased selection:bg-[#00FFCC] selection:text-black">
      {/* Header with Geometric Balance styling */}
      <header className="sticky top-0 z-30 bg-[#0D0D0D] border-b border-[#2A2A2A]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#00FFCC] rounded-sm flex items-center justify-center shadow-[0_0_12px_rgba(0,255,204,0.3)]">
              <div className="w-1 h-4 bg-black mx-0.5"></div>
              <div className="w-1 h-2 bg-black mx-0.5"></div>
              <div className="w-1 h-5 bg-black mx-0.5"></div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold tracking-tighter uppercase text-white font-mono">
                  Sonic<span className="text-[#00FFCC]">.TTS</span>
                </span>
                <span className="text-[9px] font-mono font-bold tracking-widest uppercase px-1.5 py-0.5 rounded bg-[#1A1A1A] text-[#00FFCC] border border-[#333]">
                  Hindi & Multilingual V3.4
                </span>
              </div>
              <p className="text-[10px] text-[#666] font-mono hidden sm:block uppercase tracking-wider">
                Exact Phonetics • अक्षरशः शुद्ध उच्चारण
              </p>
            </div>
          </div>

          {/* Navigation Bar */}
          <nav className="flex items-center gap-2 sm:gap-4">
            <button
              id="tab-single-voice"
              type="button"
              onClick={() => setActiveTab('ai-single')}
              className={`text-xs font-bold tracking-widest uppercase px-3 py-1.5 rounded transition-all cursor-pointer ${
                activeTab === 'ai-single'
                  ? 'text-[#00FFCC] bg-[#161616] border border-[#333]'
                  : 'text-[#888] hover:text-white'
              }`}
            >
              Voices & Hindi
            </button>

            <button
              id="tab-dialogue-mode"
              type="button"
              onClick={() => setActiveTab('ai-dialogue')}
              className={`text-xs font-bold tracking-widest uppercase px-3 py-1.5 rounded transition-all cursor-pointer ${
                activeTab === 'ai-dialogue'
                  ? 'text-[#00FFCC] bg-[#161616] border border-[#333]'
                  : 'text-[#888] hover:text-white'
              }`}
            >
              Dialogue Mode
            </button>

            <button
              id="tab-browser-voices"
              type="button"
              onClick={() => setActiveTab('browser-native')}
              className={`text-xs font-bold tracking-widest uppercase px-3 py-1.5 rounded transition-all cursor-pointer ${
                activeTab === 'browser-native'
                  ? 'text-[#00FFCC] bg-[#161616] border border-[#333]'
                  : 'text-[#888] hover:text-white'
              }`}
            >
              Device Engine
            </button>
          </nav>

          {/* System Telemetry Header Widget */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-lg bg-[#11221C] border border-[#005544] text-[#00FFCC] text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-[#00FFCC] animate-pulse" />
              <span>Unlimited Neural Synthesis</span>
            </div>

            <div className="flex items-center gap-4 border-l border-[#222] pl-3">
              <div className="text-right">
                <div className="text-[9px] text-[#666] uppercase font-bold tracking-wider font-mono">
                  Audio Engine Status
                </div>
                <div className="text-xs font-mono text-[#00FFCC] flex items-center justify-end gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${cooldownSeconds > 0 ? 'bg-[#FFAA00]' : 'bg-[#00FFCC]'} animate-pulse`}></span>
                  {cooldownSeconds > 0 ? `Cooling down (${cooldownSeconds}s)` : '24kHz Ready'}
                </div>
              </div>
              <div className="w-9 h-9 rounded-full border border-[#2A2A2A] bg-gradient-to-br from-[#1A1A1A] to-[#0A0A0A] flex items-center justify-center text-xs font-mono font-bold text-[#00FFCC]">
                हिन्दी
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Rate Limit Cooldown Notice Banner */}
        {rateLimitNotice && (
          <div
            id="rate-limit-banner"
            className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl bg-[#1A1505] border border-[#FFAA00]/40 text-[#FFE082] text-xs font-mono gap-3 shadow-lg"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#332200] border border-[#FFAA00]/50 flex items-center justify-center text-[#FFAA00] shrink-0 font-bold">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-[#FFD54F] flex items-center gap-2">
                  <span>Gemini Free Tier Rate Limit Active</span>
                  {cooldownSeconds > 0 && (
                    <span className="px-2 py-0.5 rounded bg-[#FFAA00] text-black font-mono text-[10px] font-bold">
                      {cooldownSeconds}s Cooldown
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#D4B56C] mt-0.5 font-sans">
                  Free tier allows 3 requests/min. You can play your script immediately using the zero-latency Device Voice Engine!
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              <button
                type="button"
                onClick={handleInstantDeviceSpeak}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00FFCC] hover:bg-[#00E6B8] text-black font-bold uppercase text-[10px] tracking-wider transition-all cursor-pointer shadow-[0_0_10px_rgba(0,255,204,0.3)]"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>Play on Device Engine</span>
              </button>
              <button
                type="button"
                onClick={() => setRateLimitNotice(null)}
                className="text-[10px] uppercase font-mono px-2 py-1 text-[#888] hover:text-white"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* General Error Alert if any */}
        {errorMessage && (
          <div
            id="error-banner"
            className="flex items-center justify-between p-4 rounded-xl bg-[#220D0D] border border-[#661111] text-[#FFAAAA] text-xs font-mono"
          >
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-[#FF4444] shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-[10px] font-bold uppercase tracking-wider hover:underline text-[#FF8888]"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Tab 1: Single AI Voice Studio */}
        {activeTab === 'ai-single' && (
          <div className="space-y-8">
            {/* Script Presets Quick Bar */}
            <PresetPicker
              onSelectPreset={handleSelectPreset}
              activePresetId={activePresetId}
            />



            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column: Script Editor & Delivery Controls (7 Cols) */}
              <div className="lg:col-span-7 space-y-6">
                {/* Script Input Card */}
                <div className="bg-[#111111] border border-[#2A2A2A] rounded-2xl p-5 shadow-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[#AAA] flex items-center gap-2">
                      <Mic className="w-3.5 h-3.5 text-[#00FFCC]" />
                      Input Script Buffer (Hindi, Hinglish & English)
                    </label>
                    <button
                      type="button"
                      onClick={() => setText('')}
                      className="text-[10px] font-mono text-[#666] hover:text-[#AAA] transition-colors uppercase tracking-wider cursor-pointer"
                    >
                      Clear Buffer
                    </button>
                  </div>

                  <div className="relative">
                    <textarea
                      id="tts-text-input"
                      rows={5}
                      value={text}
                      onChange={(e) => {
                        setText(e.target.value);
                        setActivePresetId(undefined);
                      }}
                      placeholder="Type Hindi (हिंदी), Hinglish, or English text to convert to speech exactly as spelled..."
                      className="w-full text-sm p-4 rounded-xl border border-[#2A2A2A] bg-[#0A0A0A] text-[#E0E0E0] placeholder:text-[#555] focus:bg-[#0D0D0D] focus:outline-none focus:border-[#00FFCC] transition-all resize-y leading-relaxed font-sans"
                    />
                  </div>

                  {/* Character & Word Metrics */}
                  <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono text-[#777] pt-2 border-t border-[#222]">
                    <div className="flex items-center gap-4">
                      <span>
                        <strong className="text-[#CCC]">{text.length}</strong> Chars
                      </span>
                      <span>
                        <strong className="text-[#CCC]">{wordCount}</strong> Words
                      </span>
                      <span>
                        Est. Time: <strong className="text-[#00FFCC]">~{estimatedSeconds}s</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-[10px]">
                      <span className="text-[#666]">Active Voice:</span>
                      <span className="font-bold text-[#00FFCC]">
                        {selectedVoice.name} {selectedVoice.hindiName ? `(${selectedVoice.hindiName})` : ''}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Delivery Style & Speed Customization */}
                <div className="bg-[#111111] border border-[#2A2A2A] rounded-2xl p-5 shadow-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[#AAA] flex items-center gap-2">
                      <Sliders className="w-3.5 h-3.5 text-[#00FFCC]" />
                      Vocal Delivery & Style Modulation
                    </h3>
                  </div>

                  {/* Style Chips Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {SPEECH_STYLES.map((style) => {
                      const isSelected = speechStyle === style.id;
                      return (
                        <button
                          key={style.id}
                          id={`style-btn-${style.id}`}
                          type="button"
                          onClick={() => setSpeechStyle(style.id)}
                          className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer group ${
                            isSelected
                              ? 'border-[#00FFCC] bg-[#1A1A1A] text-white shadow-[0_0_12px_rgba(0,255,204,0.15)] ring-1 ring-[#00FFCC]'
                              : 'border-[#2A2A2A] bg-[#161616] hover:border-[#444] text-[#AAA]'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="text-sm">{style.emoji}</span>
                            <span className="text-[11px] font-bold tracking-tight line-clamp-1">{style.name}</span>
                          </div>
                          <span className="text-[9px] text-[#666] line-clamp-1 font-sans">
                            {style.description}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Speed Rate Slider */}
                  <div className="pt-3 border-t border-[#222] flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#AAA] block">
                        Synthesis Velocity / Tempo
                      </label>
                      <span className="text-[10px] text-[#666] font-sans">
                        Pacing control (0.70x – 1.40x)
                      </span>
                    </div>

                    <div className="flex items-center gap-3 w-48">
                      <input
                        id="speed-rate-slider"
                        type="range"
                        min={0.7}
                        max={1.4}
                        step={0.05}
                        value={speed}
                        onChange={(e) => setSpeed(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-[#222] rounded appearance-none cursor-pointer accent-[#00FFCC]"
                      />
                      <span className="text-xs font-mono font-bold text-[#00FFCC] min-w-[40px] text-right">
                        {speed.toFixed(2)}x
                      </span>
                    </div>
                  </div>

                  {/* Emotional Intensity Slider & Toggles */}
                  <div className="pt-3 border-t border-[#222] space-y-3">
                    <div className="flex items-center justify-between gap-4">
                      <div className="space-y-0.5">
                        <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#AAA] block flex items-center gap-1.5">
                          <span>Emotional Intensity</span>
                          <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold uppercase tracking-normal ${
                            emotionStrength === 'expressive'
                              ? 'bg-[#FF0055]/20 text-[#FF5588] border border-[#FF0055]/40'
                              : emotionStrength === 'subtle'
                              ? 'bg-[#00AAFF]/20 text-[#66CCFF] border border-[#00AAFF]/40'
                              : 'bg-[#00FFCC]/20 text-[#00FFCC] border border-[#00FFCC]/40'
                          }`}>
                            {emotionStrength.toUpperCase()}
                          </span>
                        </label>
                        <span className="text-[10px] text-[#666] font-sans">
                          Vocal affect & dynamic emotional inflection
                        </span>
                      </div>

                      {/* 3-Step Range Slider */}
                      <div className="flex items-center gap-3 w-48">
                        <input
                          id="emotion-intensity-slider"
                          type="range"
                          min={0}
                          max={2}
                          step={1}
                          value={emotionStrength === 'subtle' ? 0 : emotionStrength === 'neutral' ? 1 : 2}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            if (val === 0) setEmotionStrength('subtle');
                            else if (val === 1) setEmotionStrength('neutral');
                            else setEmotionStrength('expressive');
                          }}
                          className="w-full h-1.5 bg-[#222] rounded appearance-none cursor-pointer accent-[#00FFCC]"
                        />
                        <span className="text-xs font-mono font-bold text-[#00FFCC] min-w-[70px] text-right capitalize">
                          {emotionStrength}
                        </span>
                      </div>
                    </div>

                    {/* Quick 3-Level Segmented Buttons */}
                    <div className="grid grid-cols-3 gap-2 pt-1">
                      <button
                        id="emotion-btn-subtle"
                        type="button"
                        onClick={() => setEmotionStrength('subtle')}
                        className={`py-2 px-2.5 rounded-lg border text-center transition-all cursor-pointer ${
                          emotionStrength === 'subtle'
                            ? 'border-[#00AAFF] bg-[#0A1A24] text-[#66CCFF] shadow-[0_0_10px_rgba(0,170,255,0.2)] font-bold'
                            : 'border-[#222] bg-[#141414] hover:border-[#333] text-[#888]'
                        }`}
                      >
                        <div className="text-[11px] font-mono">Subtle</div>
                        <div className="text-[9px] text-[#666] line-clamp-1">Restrained & Mild</div>
                      </button>

                      <button
                        id="emotion-btn-neutral"
                        type="button"
                        onClick={() => setEmotionStrength('neutral')}
                        className={`py-2 px-2.5 rounded-lg border text-center transition-all cursor-pointer ${
                          emotionStrength === 'neutral'
                            ? 'border-[#00FFCC] bg-[#0A201A] text-[#00FFCC] shadow-[0_0_10px_rgba(0,255,204,0.2)] font-bold'
                            : 'border-[#222] bg-[#141414] hover:border-[#333] text-[#888]'
                        }`}
                      >
                        <div className="text-[11px] font-mono">Neutral</div>
                        <div className="text-[9px] text-[#666] line-clamp-1">Balanced & Natural</div>
                      </button>

                      <button
                        id="emotion-btn-expressive"
                        type="button"
                        onClick={() => setEmotionStrength('expressive')}
                        className={`py-2 px-2.5 rounded-lg border text-center transition-all cursor-pointer ${
                          emotionStrength === 'expressive'
                            ? 'border-[#FF0055] bg-[#240A14] text-[#FF5588] shadow-[0_0_10px_rgba(255,0,85,0.2)] font-bold'
                            : 'border-[#222] bg-[#141414] hover:border-[#333] text-[#888]'
                        }`}
                      >
                        <div className="text-[11px] font-mono">Expressive</div>
                        <div className="text-[9px] text-[#666] line-clamp-1">Dynamic & Vivid</div>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Primary Action Buttons */}
                <div className="space-y-3">
                  <button
                    id="synthesize-speech-btn"
                    type="button"
                    disabled={isGenerating}
                    onClick={handleGenerateSpeech}
                    className={`w-full py-4 px-6 rounded-xl font-black uppercase text-xs tracking-widest transition-all flex items-center justify-center gap-2.5 cursor-pointer ${
                      !text.trim()
                        ? 'bg-[#333] text-[#888] hover:bg-[#444]'
                        : 'bg-[#00FFCC] hover:bg-[#00E6B8] text-black shadow-[0_4px_20px_rgba(0,255,204,0.25)] hover:shadow-[0_0_25px_rgba(0,255,204,0.5)]'
                    }`}
                  >
                    {isGenerating ? (
                      <>
                        <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                        <span>Generating Audio...</span>
                      </>
                    ) : (
                      <>
                        <Radio className="w-4 h-4" />
                        <span>
                          Generate Voice with {selectedVoice.name} {selectedVoice.hindiName ? `(${selectedVoice.hindiName})` : ''}
                        </span>
                      </>
                    )}
                  </button>

                  {/* Immediate in-panel Audio Player with direct Download button */}
                  {(currentAudioUrl || isNativePlaying) && (
                    <div className="mt-4 pt-4 border-t border-[#262626]">
                      <AudioPlayer
                        audioUrl={currentAudioUrl}
                        text={currentAudioText}
                        voiceName={currentPlayingVoice}
                        styleName={currentStyleName}
                        isNativeSpeechPlaying={isNativePlaying}
                        onStopNativeSpeech={handleStopNativeSpeak}
                        onPlayNativeSpeech={() => {
                          if ('speechSynthesis' in window && currentAudioText) {
                            const utter = new SpeechSynthesisUtterance(currentAudioText);
                            window.speechSynthesis.speak(utter);
                          }
                        }}
                      />
                    </div>
                  )}

                  {/* Quick fallback button if cooldown active */}
                  {cooldownSeconds > 0 && (
                    <button
                      type="button"
                      onClick={handleInstantDeviceSpeak}
                      className="w-full py-2.5 px-4 rounded-xl border border-[#005544] bg-[#00221A] hover:border-[#00FFCC] text-[#00FFCC] text-[11px] font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Speak with Device Engine Instantly (Zero Cooldown)</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Right Column: Voice Options Library (5 Cols) */}
              <div className="lg:col-span-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-mono font-bold uppercase tracking-[0.2em] text-[#E0E0E0]">
                      Available Neural Tones
                    </h2>
                    <p className="text-[10px] text-[#666] font-mono">
                      Hindi & English Audio Profiles
                    </p>
                  </div>

                  {/* Filters: Gender & Language */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Gender Tabs */}
                    <div className="flex items-center bg-[#111] p-0.5 rounded border border-[#333] text-[10px] font-mono">
                      {(['All', 'Male', 'Female'] as const).map((g) => (
                        <button
                          key={g}
                          id={`gender-filter-${g.toLowerCase()}`}
                          type="button"
                          onClick={() => setGenderFilter(g)}
                          className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                            genderFilter === g
                              ? 'bg-[#00FFCC] text-black font-bold'
                              : 'text-[#888] hover:text-[#CCC]'
                          }`}
                        >
                          {g === 'Male' ? '👨 पुरुष (Male)' : g === 'Female' ? '👩 महिला (Female)' : 'All'}
                        </button>
                      ))}
                    </div>

                    {/* Language Tabs */}
                    <div className="flex items-center bg-[#111] p-0.5 rounded border border-[#333] text-[10px] font-mono">
                      {(['All', 'Hindi', 'English'] as const).map((lang) => (
                        <button
                          key={lang}
                          type="button"
                          onClick={() => setLanguageFilter(lang)}
                          className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                            languageFilter === lang
                              ? 'bg-white text-black font-bold'
                              : 'text-[#888] hover:text-[#CCC]'
                          }`}
                        >
                          {lang === 'Hindi' ? '🇮🇳 Hindi' : lang}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Voice Cards Grid */}
                <div className="space-y-3">
                  {filteredVoices.map((voice) => (
                    <VoiceCard
                      key={voice.id}
                      voice={voice}
                      isSelected={selectedVoice.id === voice.id}
                      onSelect={(v) => setSelectedVoice(v)}
                      onAudition={handleAudition}
                      isAuditioning={auditioningVoiceId === voice.id}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Multi-Speaker Dialogue Mode */}
        {activeTab === 'ai-dialogue' && (
          <div className="max-w-4xl mx-auto">
            <div className="mb-6">
              <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                Multi-Speaker <span className="text-[#00FFCC]">Dialogue Studio</span>
              </h2>
              <p className="text-xs text-[#888] font-mono mt-0.5">
                Synthesize Hindi, Hinglish, and English multi-character conversations with dual neural vocal channels.
              </p>
            </div>

            <DialogueEditor
              voices={GEMINI_VOICES}
              onGenerateDialogue={handleGenerateDialogue}
              isGenerating={isGenerating}
            />
          </div>
        )}

        {/* Tab 3: Native Browser / Device Voices */}
        {activeTab === 'browser-native' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-[#111111] border border-[#2A2A2A] rounded-2xl p-5 shadow-xl">
              <label className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[#AAA] block mb-2">
                Native Text Input Buffer
              </label>
              <textarea
                rows={4}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Enter Hindi or English text to speak with browser hardware voices..."
                className="w-full text-sm p-3 rounded-xl border border-[#2A2A2A] bg-[#0A0A0A] text-[#E0E0E0] focus:border-[#00FFCC] focus:outline-none font-sans"
              />
            </div>

            <BrowserVoicesPicker
              textToSpeak={text}
              onSpeak={handleNativeSpeak}
              onStop={handleStopNativeSpeak}
              isPlaying={isNativePlaying}
            />
          </div>
        )}



        {/* Session History Section */}
        <section id="session-history-section" className="pt-4">
          <VoiceHistory
            history={history}
            onPlayItem={handlePlayHistoryItem}
            onDeleteItem={handleDeleteHistoryItem}
            onClearHistory={handleClearHistory}
          />
        </section>
      </main>

      {/* Geometric Balance Footer */}
      <footer className="border-t border-[#222] bg-[#050505] py-5 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] text-[#555] font-mono font-bold uppercase tracking-widest">
          <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
            <span className="text-[#888]">Connected to Neural Synthesis Node</span>
            <span>•</span>
            <span className="text-[#00FFCC]">24kHz WAV Output</span>
            <span>•</span>
            <span className="text-[#AAA]">Hindi & Multilingual Support</span>
          </div>
          <div className="flex items-center gap-4">
            <span>Model: gemini-3.1-flash-tts-preview</span>
            <span>•</span>
            <span>Build 04.23.00</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
