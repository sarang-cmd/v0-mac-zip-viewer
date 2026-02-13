"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { getZipEngine } from "@/lib/zip-engine";
import { Play, Pause, Volume2 } from "lucide-react";

interface AudioPreviewProps {
  filePath: string;
  extension: string;
  fileName: string;
}

function getMimeType(ext: string): string {
  const map: Record<string, string> = {
    mp3: "audio/mpeg", wav: "audio/wav", ogg: "audio/ogg",
    flac: "audio/flac", aac: "audio/aac", m4a: "audio/mp4",
  };
  return map[ext] || "audio/mpeg";
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function AudioPreview({ filePath, extension, fileName }: AudioPreviewProps) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const engine = getZipEngine();
    const mime = getMimeType(extension);

    engine
      .getFileAsBlob(filePath, mime)
      .then(async (blob) => {
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        setObjectUrl(url);

        // Generate simple waveform from audio data
        try {
          const audioCtx = new AudioContext();
          const arrayBuf = await blob.arrayBuffer();
          const audioBuf = await audioCtx.decodeAudioData(arrayBuf);
          const rawData = audioBuf.getChannelData(0);
          const samples = 80;
          const blockSize = Math.floor(rawData.length / samples);
          const bars: number[] = [];
          for (let i = 0; i < samples; i++) {
            let sum = 0;
            for (let j = 0; j < blockSize; j++) {
              sum += Math.abs(rawData[i * blockSize + j]);
            }
            bars.push(sum / blockSize);
          }
          const max = Math.max(...bars, 0.01);
          setWaveformData(bars.map((b) => b / max));
          audioCtx.close();
        } catch {
          // Waveform is optional
          setWaveformData(Array(80).fill(0.3));
        }

        setLoading(false);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filePath, extension]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    audio.currentTime = pct * duration;
  }, [duration]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 rounded-full border-2 border-[hsl(var(--mac-selection))] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (error || !objectUrl) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <p className="text-xs text-[hsl(var(--destructive))]">{error || "Failed to load audio"}</p>
      </div>
    );
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 p-8">
      <audio
        ref={audioRef}
        src={objectUrl}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime ?? 0)}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)}
        onEnded={() => setIsPlaying(false)}
      />

      {/* Album art placeholder */}
      <div className="w-28 h-28 rounded-2xl bg-gradient-to-br from-[hsl(var(--mac-selection)/0.2)] to-[hsl(var(--mac-selection)/0.05)] flex items-center justify-center">
        <Volume2 className="w-12 h-12 text-[hsl(var(--mac-selection))]" />
      </div>

      <div className="text-center">
        <p className="text-sm font-medium text-[hsl(var(--mac-text-primary))] text-balance">{fileName}</p>
        <p className="text-[10px] text-[hsl(var(--mac-text-tertiary))] mt-0.5">
          {duration > 0 ? formatTime(duration) : "Loading..."}
        </p>
      </div>

      {/* Waveform */}
      <div
        className="w-full max-w-sm h-16 flex items-end gap-[2px] cursor-pointer rounded-lg"
        onClick={handleSeek}
        role="slider"
        aria-label="Audio progress"
        aria-valuenow={Math.round(progress)}
        aria-valuemin={0}
        aria-valuemax={100}
        tabIndex={0}
      >
        {waveformData.map((v, i) => {
          const pct = (i / waveformData.length) * 100;
          const isPlayed = pct <= progress;
          return (
            <div
              key={i}
              className="flex-1 rounded-sm waveform-bar"
              style={{
                height: `${Math.max(v * 100, 4)}%`,
                background: isPlayed
                  ? "hsl(var(--mac-selection))"
                  : "hsl(var(--mac-text-tertiary) / 0.25)",
              }}
            />
          );
        })}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        <span className="text-[10px] tabular-nums text-[hsl(var(--mac-text-tertiary))] w-10 text-right">
          {formatTime(currentTime)}
        </span>
        <button
          onClick={togglePlay}
          className="w-10 h-10 rounded-full bg-[hsl(var(--mac-selection))] flex items-center justify-center hover:opacity-90 mac-transition mac-focus-ring"
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 text-[hsl(var(--mac-selection-text))]" />
          ) : (
            <Play className="w-4 h-4 text-[hsl(var(--mac-selection-text))] ml-0.5" />
          )}
        </button>
        <span className="text-[10px] tabular-nums text-[hsl(var(--mac-text-tertiary))] w-10">
          {formatTime(duration)}
        </span>
      </div>
    </div>
  );
}
