import { useRef, useState } from 'react';

const VOICE_ID = "299hhEjoz44O862N5H4G";
const API_KEY  = process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY || "";

// Splits long text into ~500-char chunks at sentence boundaries
function chunkText(text: string, size = 500): string[] {
  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > size) {
    let cut = remaining.lastIndexOf('. ', size);
    if (cut === -1) cut = size;
    else cut += 1;
    chunks.push(remaining.slice(0, cut).trim());
    remaining = remaining.slice(cut).trim();
  }
  if (remaining) chunks.push(remaining);
  return chunks;
}

async function fetchAudio(text: string): Promise<HTMLAudioElement> {
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'xi-api-key': API_KEY },
      body: JSON.stringify({
        text,
        model_id: 'eleven_turbo_v2_5',
        voice_settings: { stability: 0.5, similarity_boost: 0.8, style: 0.2, use_speaker_boost: true },
      }),
    }
  );
  if (!res.ok) throw new Error('ElevenLabs TTS failed');
  const blob = await res.blob();
  return new Audio(URL.createObjectURL(blob));
}

export function useElevenLabsTTS() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'playing'>('idle');
  const audioRef   = useRef<HTMLAudioElement | null>(null);
  const chunksRef  = useRef<string[]>([]);
  const indexRef   = useRef(0);
  const onEndRef   = useRef<(() => void) | undefined>(undefined); // stores the callback

  const playChain = async () => {
    const chunks = chunksRef.current;
    if (indexRef.current >= chunks.length) {
      setStatus('idle');
      onEndRef.current?.(); // all chunks done — fire onEnd to advance paragraph
      onEndRef.current = undefined;
      return;
    }

    setStatus('loading');
    try {
      const audio = await fetchAudio(chunks[indexRef.current]);
      audioRef.current = audio;
      audio.onended = () => {
        URL.revokeObjectURL(audio.src);
        indexRef.current++;
        playChain(); // next chunk in same paragraph
      };
      await audio.play();
      setStatus('playing');
    } catch {
      setStatus('idle');
      onEndRef.current = undefined;
    }
  };

  // onEnd fires once the entire paragraph (all its chunks) finishes playing
  const speak = (text: string, onEnd?: () => void) => {
    stop();
    onEndRef.current  = onEnd;
    chunksRef.current = chunkText(text);
    indexRef.current  = 0;
    playChain();
  };

  const stop = () => {
    if (audioRef.current) {
      audioRef.current.onended = null; // prevent onEnd firing on manual stop
      audioRef.current.pause();
      URL.revokeObjectURL(audioRef.current.src);
      audioRef.current = null;
    }
    chunksRef.current = [];
    indexRef.current  = 0;
    onEndRef.current  = undefined;
    setStatus('idle');
  };

  return { speak, stop, status };
}