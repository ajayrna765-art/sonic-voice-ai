import { useState, useRef, useEffect, ChangeEvent } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Download,
  Copy,
  Check,
  Sparkles,
  Radio,
} from 'lucide-react';
import AudioVisualizer from './AudioVisualizer';

interface AudioPlayerProps {
  audioUrl: string | null;
  text: string;
  voiceName: string;
  isNativeSpeechPlaying?: boolean;
  onStopNativeSpeech?: () => void;
  onPlayNativeSpeech?: () => void;
  styleName?: string;
}

export default function AudioPlayer({
  audioUrl,
  text,
  voiceName,
  isNativeSpeechPlaying = false,
  onStopNativeSpeech,
  onPlayNativeSpeech,
  styleName,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [copied, setCopied] = useState(false);

  const activePlaying = isNativeSpeechPlaying || isPlaying;

  // Sync state with audio element
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => {
      setDuration(audio.duration || 0);
      setCurrentTime(0);
      audio.play().catch(() => {});
    };
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, [audioUrl]);

  const togglePlayPause = () => {
    if (audioUrl) {
      const audio = audioRef.current;
      if (!audio) return;
      if (isPlaying) {
        audio.pause();
      } else {
        audio.play().catch((err) => console.log('Playback prevented:', err));
      }
    } else if (onStopNativeSpeech && onPlayNativeSpeech) {
      if (isNativeSpeechPlaying) {
        onStopNativeSpeech();
      } else {
        onPlayNativeSpeech();
      }
    }
  };

  const handleSeek = (e: ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const handleVolumeChange = (e: ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    if (audioRef.current) {
      audioRef.current.volume = vol;
      audioRef.current.muted = vol === 0;
    }
    setIsMuted(vol === 0);
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleRateChange = (rate: number) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '0:00';
    const minutes = Math.floor(secs / 60);
    const seconds = Math.floor(secs % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleDownload = () => {
    if (!audioUrl) return;
    const a = document.createElement('a');
    a.href = audioUrl;
    const cleanVoiceName = voiceName.replace(/\s+/g, '-').toLowerCase();
    a.download = `sonic-tts-${cleanVoiceName}-${Date.now()}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div
      id="studio-audio-player"
      className="bg-[#111111] border border-[#2A2A2A] rounded-2xl p-5 shadow-2xl transition-all"
    >
      {audioUrl && <audio ref={audioRef} src={audioUrl} preload="auto" />}

      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-[#222]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#1A1A1A] border border-[#333] text-[#00FFCC] flex items-center justify-center font-bold">
            <Radio className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#F0F0F0]">
                Active Output: <span className="text-[#00FFCC]">{voiceName}</span>
              </span>
              {styleName && (
                <span className="text-[10px] px-2 py-0.5 rounded border border-[#005544] bg-[#00221A] text-[#00FFCC] font-mono uppercase tracking-wider">
                  {styleName}
                </span>
              )}
            </div>
            <p className="text-xs text-[#888888] line-clamp-1 max-w-md mt-0.5">
              "{text}"
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="copy-script-btn"
            type="button"
            onClick={handleCopyText}
            className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded border border-[#333] bg-[#161616] text-[#AAA] hover:text-white hover:border-[#555] transition-colors"
            title="Copy script text"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-[#00FFCC]" />
                <span className="text-[#00FFCC]">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy Script</span>
              </>
            )}
          </button>

          {audioUrl && (
            <button
              id="download-wav-btn"
              type="button"
              onClick={handleDownload}
              className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded bg-[#00FFCC] text-black hover:bg-[#00E6B8] shadow-[0_0_12px_rgba(0,255,204,0.25)] transition-all cursor-pointer"
              title="Download high-quality WAV audio"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export WAV</span>
            </button>
          )}
        </div>
      </div>

      {/* Visualizer */}
      <div className="mb-4">
        <AudioVisualizer isPlaying={activePlaying} color="#00FFCC" />
      </div>

      {/* Scrubber / Progress */}
      {audioUrl && (
        <div className="space-y-1.5 mb-4">
          <input
            id="audio-scrubber-slider"
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 bg-[#222222] rounded-lg appearance-none cursor-pointer accent-[#00FFCC]"
          />
          <div className="flex justify-between text-[10px] text-[#666666] font-mono tracking-wider">
            <span className="text-[#00FFCC]">{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      )}

      {/* Playback Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            id="master-play-pause-btn"
            type="button"
            onClick={togglePlayPause}
            className="w-11 h-11 rounded-full bg-[#00FFCC] hover:bg-[#00E6B8] active:scale-95 text-black flex items-center justify-center shadow-[0_0_15px_rgba(0,255,204,0.3)] transition-transform cursor-pointer"
            aria-label={activePlaying ? 'Pause audio' : 'Play audio'}
          >
            {activePlaying ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current ml-0.5" />
            )}
          </button>

          {audioUrl && (
            <button
              id="replay-audio-btn"
              type="button"
              onClick={() => {
                if (audioRef.current) {
                  audioRef.current.currentTime = 0;
                  audioRef.current.play();
                }
              }}
              className="p-2 rounded border border-[#333] bg-[#161616] text-[#AAA] hover:text-white hover:border-[#555] transition-colors"
              title="Restart from beginning"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Playback speed buttons */}
          {audioUrl && (
            <div className="flex items-center rounded border border-[#333] bg-[#0D0D0D] p-0.5">
              {[0.75, 1, 1.25, 1.5].map((rate) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => handleRateChange(rate)}
                  className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded transition-colors ${
                    playbackRate === rate
                      ? 'bg-[#00FFCC] text-black'
                      : 'text-[#666] hover:text-[#AAA]'
                  }`}
                >
                  {rate}x
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Volume controls & Format label */}
        <div className="flex items-center gap-4">
          <div className="text-[9px] font-mono text-[#555] uppercase tracking-widest hidden sm:block">
            24,000 HZ • MONO PCM
          </div>

          {audioUrl && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleMute}
                className="p-1 text-[#666] hover:text-[#AAA] transition-colors"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-3.5 h-3.5 text-[#555]" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5" />
                )}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 h-1.5 bg-[#222] rounded appearance-none cursor-pointer accent-[#00FFCC]"
                aria-label="Volume slider"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
