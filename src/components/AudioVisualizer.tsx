import { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  isPlaying: boolean;
  color?: string;
  barCount?: number;
}

export default function AudioVisualizer({
  isPlaying,
  color = '#00FFCC',
  barCount = 36,
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

      // Background subtle grid line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();

      const barWidth = (width / barCount) * 0.55;
      const gap = (width / barCount) * 0.45;

      for (let i = 0; i < barCount; i++) {
        let barHeight = 4;
        if (isPlaying) {
          // Dynamic wave formula simulating multi-frequency audio energy
          const frequency1 = Math.sin(phase * 0.08 + i * 0.35);
          const frequency2 = Math.cos(phase * 0.12 + i * 0.2);
          const frequency3 = Math.sin(phase * 0.05 + i * 0.7);
          const combined = (Math.abs(frequency1) * 0.45 + Math.abs(frequency2) * 0.35 + Math.abs(frequency3) * 0.2);
          
          // Edge damping for natural bell curve
          const normalizedCenter = 1 - Math.abs((i - barCount / 2) / (barCount / 2));
          barHeight = Math.max(6, combined * height * 0.88 * (0.35 + 0.65 * normalizedCenter));
        } else {
          // Subtle idle resting pulse
          barHeight = 4 + Math.sin(i * 0.5) * 2;
        }

        const x = i * (barWidth + gap) + gap / 2;
        const y = (height - barHeight) / 2;

        // Electric cyan gradient with glow
        const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
        gradient.addColorStop(0, '#00FFCC');
        gradient.addColorStop(1, '#0099FF');

        ctx.fillStyle = isPlaying ? gradient : '#333333';
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 2);
        ctx.fill();

        // Subtle geometric cap tick when active
        if (isPlaying && barHeight > 14) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(x, y - 2, barWidth, 1.5);
          ctx.fillRect(x, y + barHeight + 0.5, barWidth, 1.5);
        }
      }

      if (isPlaying) {
        phase += 1;
      }
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
    <div id="audio-visualizer-container" className="w-full h-16 bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl flex items-center justify-center p-2 relative overflow-hidden">
      <canvas
        ref={canvasRef}
        width={500}
        height={60}
        className="w-full h-full"
      />
    </div>
  );
}
