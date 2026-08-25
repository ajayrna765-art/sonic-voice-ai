import { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  isPlaying: boolean;
  color?: string;
  barCount?: number;
  label?: string;
}

export default function AudioVisualizer({
  isPlaying,
  color = '#00FFCC',
  barCount = 48,
  label,
}: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let phase = 0;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      // Center baseline glow
      const centerY = height / 2;
      ctx.strokeStyle = isPlaying ? 'rgba(0, 255, 204, 0.25)' : 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, centerY);
      ctx.lineTo(width, centerY);
      ctx.stroke();

      // Continuous Oscillating Vibration Wave Line (Soundwave vibration)
      ctx.beginPath();
      ctx.lineWidth = isPlaying ? 2.5 : 1;
      ctx.strokeStyle = isPlaying ? '#00FFCC' : '#444444';
      ctx.shadowBlur = isPlaying ? 12 : 0;
      ctx.shadowColor = '#00FFCC';

      for (let x = 0; x <= width; x += 4) {
        const normX = x / width;
        const bell = Math.sin(normX * Math.PI); // Envelope to taper ends
        let yOffset = 0;

        if (isPlaying) {
          yOffset =
            Math.sin(normX * 14 + phase * 0.12) * 12 * bell +
            Math.cos(normX * 24 - phase * 0.09) * 8 * bell +
            Math.sin(normX * 40 + phase * 0.15) * 4 * bell;
        } else {
          yOffset = Math.sin(normX * 8 + phase * 0.03) * 2 * bell;
        }

        const y = centerY + yOffset;
        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
      ctx.shadowBlur = 0; // reset shadow for crisp bars

      // Secondary Harmonizing Vibration Wave
      if (isPlaying) {
        ctx.beginPath();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = 'rgba(0, 180, 255, 0.7)';
        for (let x = 0; x <= width; x += 6) {
          const normX = x / width;
          const bell = Math.sin(normX * Math.PI);
          const yOffset =
            Math.sin(normX * 18 - phase * 0.1) * 9 * bell +
            Math.cos(normX * 32 + phase * 0.08) * 5 * bell;
          const y = centerY + yOffset;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      // Vertical Equalizer Frequency Bars
      const barWidth = (width / barCount) * 0.45;
      const gap = (width / barCount) * 0.55;

      for (let i = 0; i < barCount; i++) {
        let barHeight = 4;
        if (isPlaying) {
          const f1 = Math.sin(phase * 0.1 + i * 0.3);
          const f2 = Math.cos(phase * 0.14 + i * 0.18);
          const f3 = Math.sin(phase * 0.06 + i * 0.6);
          const energy = Math.abs(f1) * 0.45 + Math.abs(f2) * 0.35 + Math.abs(f3) * 0.2;
          const centerFactor = 1 - Math.abs((i - barCount / 2) / (barCount / 2));
          barHeight = Math.max(6, energy * (height * 0.75) * (0.35 + 0.65 * centerFactor));
        } else {
          barHeight = 4 + Math.sin(i * 0.4 + phase * 0.02) * 2;
        }

        const x = i * (barWidth + gap) + gap / 2;
        const y = centerY - barHeight / 2;

        const grad = ctx.createLinearGradient(0, y, 0, y + barHeight);
        if (isPlaying) {
          grad.addColorStop(0, '#00FFCC');
          grad.addColorStop(0.5, '#00B4D8');
          grad.addColorStop(1, '#9D4EDD');
        } else {
          grad.addColorStop(0, '#333333');
          grad.addColorStop(1, '#222222');
        }

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 2);
        ctx.fill();

        // White glowing cap ticks
        if (isPlaying && barHeight > 16) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(x, y - 2, barWidth, 1.5);
          ctx.fillRect(x, y + barHeight + 0.5, barWidth, 1.5);
        }
      }

      phase += isPlaying ? 1 : 0.4;
      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, color, barCount]);

  return (
    <div
      id="audio-visualizer-container"
      className="w-full h-16 bg-[#0B0B0B] border border-[#262626] rounded-xl flex flex-col justify-center px-3 py-2 relative overflow-hidden shadow-inner"
    >
      {label && (
        <div className="absolute top-1.5 left-3 flex items-center gap-1.5 z-10">
          <span className={`w-1.5 h-1.5 rounded-full ${isPlaying ? 'bg-[#00FFCC] animate-ping' : 'bg-[#555]'}`} />
          <span className="text-[9px] font-mono text-[#888] uppercase tracking-wider">
            {label} {isPlaying && '• Live Output Waveform'}
          </span>
        </div>
      )}
      <canvas
        ref={canvasRef}
        width={600}
        height={64}
        className="w-full h-full"
      />
    </div>
  );
}
