"use client";
import { useState, useEffect, useRef, useCallback } from 'react';
import { useElevenLabsTTS } from '@/hooks/useElevenLabsTTS';

interface Book {
  id: number;
  title: string;
  authors: { name: string }[];
  formats: Record<string, string>;
}

function splitChapters(text: string): string[] {
  const chunks = text
    .split(/(?=\bCHAPTER\s+[IVXLCDM\d]+\b)/i)
    .map(c => c.trim())
    .filter(Boolean);
  // If no chapter headings found, return whole text as one chunk
  return chunks.length > 1 ? chunks : [text.trim()];
}

function splitLines(section: string): string[] {
  return section
    .split(/\n+/)
    .map(l => l.trim())
    .filter(l => l.length > 20);
}

const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5] as const;
const BASE_INTERVAL = 2800;

export function BookReader({ book, onClose }: { book: Book; onClose: () => void }) {
  const [text, setText]       = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [chapter, setChapter] = useState(0);
  const [lineIdx, setLineIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed]     = useState<number>(1);

  const { speak, stop, status } = useElevenLabsTTS();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Fetch text 
  useEffect(() => {
    setLoading(true);
    setError('');
    fetch(`/api/books/${book.id}/text`)
      .then(r => r.ok ? r.text() : Promise.reject('unavailable'))
      .then(t => {
        console.log('text bytes:', t.length, '| chapters:', splitChapters(t).length);
        setText(t);
      })
      .catch(() => setError('Full text unavailable for this book.'))
      .finally(() => setLoading(false));
    return () => { clearInterval(timerRef.current!); };
  }, [book.id]);

  const chapters = splitChapters(text);
  const lines    = splitLines(chapters[chapter] ?? '');
  const total    = lines.length;
  const progress = total > 0 ? ((lineIdx + 1) / total) * 100 : 0;

  // Reset on chapter change 
  useEffect(() => {
    stop();
    setPlaying(false);
    setLineIdx(0);
    clearInterval(timerRef.current!);
  }, [chapter]);

  // Scroll active line into view 
  useEffect(() => {
    lineRefs.current[lineIdx]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [lineIdx]);

  // Speak active line whenever it changes while playing 
  useEffect(() => {
    if (playing && lines[lineIdx]) speak(lines[lineIdx]);
  }, [lineIdx, playing]);

  // Auto-advance timer 
  const startTimer = useCallback(() => {
    clearInterval(timerRef.current!);
    timerRef.current = setInterval(() => {
      setLineIdx(prev => {
        if (prev >= total - 1) {
          setPlaying(false);
          clearInterval(timerRef.current!);
          return prev;
        }
        return prev + 1;
      });
    }, BASE_INTERVAL / speed);
  }, [speed, total]);

  useEffect(() => {
    if (playing) startTimer();
    else clearInterval(timerRef.current!);
    return () => clearInterval(timerRef.current!);
  }, [playing, startTimer]);

  // Controls 
  const togglePlay = () => {
    if (playing) { stop(); setPlaying(false); }
    else { setPlaying(true); }
  };

  const skipLines = (n: number) => {
    clearInterval(timerRef.current!);
    setLineIdx(prev => Math.max(0, Math.min(total - 1, prev + n)));
    if (playing) startTimer();
  };

  const jumpToLine = (i: number) => {
    clearInterval(timerRef.current!);
    setLineIdx(i);
    if (playing) { speak(lines[i]); startTimer(); }
  };

  const changeSpeed = (s: number) => {
    setSpeed(s);
    if (playing) {
      clearInterval(timerRef.current!);
      timerRef.current = setInterval(() => {
        setLineIdx(prev => {
          if (prev >= total - 1) { setPlaying(false); clearInterval(timerRef.current!); return prev; }
          return prev + 1;
        });
      }, BASE_INTERVAL / s);
    }
  };

  console.log('state:', { loading, error, textLen: text.length, chapters: chapters.length, lines: lines.length });

  return (
    <div className="reader-overlay" onClick={onClose}>
      <div className="reader-panel" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="reader-header">
          <div>
            <h2 className="reader-title">{book.title}</h2>
            <p className="reader-author">{book.authors.map(a => a.name).join(', ')}</p>
          </div>
          <button className="icon-btn" onClick={onClose} title="Close" type="button">✕</button>
        </div>

        {loading && <p className="reader-status">Loading text…</p>}
        {error   && <p className="reader-status error">{error}</p>}

        {!loading && !error && (
          <>
            {/* Controls bar */}
            <div className="reader-tts-bar">

              {/* Progress */}
              <div className="reader-progress-row">
                <div className="reader-progress-track">
                  <div className="reader-progress-fill" style={{ width: `${progress}%` }} />
                </div>
                <span className="tts-label" style={{ whiteSpace: 'nowrap' }}>
                  {lineIdx + 1} / {total}
                </span>
              </div>

              {/* Playback buttons */}
              <div className="reader-btn-row">
                <button
                  className="chip chip-blue reader-ctrl-btn"
                  onClick={() => skipLines(-5)}
                  title="Back 5 lines"
                  type="button"
                >⏮ 5</button>

                <button
                  className="chip chip-blue reader-ctrl-btn"
                  onClick={() => skipLines(-1)}
                  title="Previous line"
                  type="button"
                >‹ 1</button>

                <button
                  className={`tts-btn ${playing ? 'tts-playing' : ''} ${status === 'loading' ? 'tts-loading' : ''}`}
                  onClick={togglePlay}
                  type="button"
                  style={{ minWidth: 82 }}
                >
                  {status === 'loading' && <span>Loading…</span>}
                  {status !== 'loading' && (playing
                    ? <><span style={{ fontSize: 11 }}>⏸</span><span>Pause</span></>
                    : <><span style={{ fontSize: 11 }}>▶</span><span>Play</span></>
                  )}
                </button>

                <button
                  className="chip chip-blue reader-ctrl-btn"
                  onClick={() => skipLines(1)}
                  title="Next line"
                  type="button"
                >1 ›</button>

                <button
                  className="chip chip-blue reader-ctrl-btn"
                  onClick={() => skipLines(5)}
                  title="Skip 5 lines"
                  type="button"
                >5 ⏭</button>

                <div style={{ flex: 1 }} />

                <span className="tts-label">Speed:</span>
                {SPEED_OPTIONS.map(s => (
                  <button
                    key={s}
                    className={`chip reader-ctrl-btn ${speed === s ? 'chip-speed-active' : 'chip-blue'}`}
                    onClick={() => changeSpeed(s)}
                    type="button"
                  >{s}×</button>
                ))}
              </div>

              {/* Chapter nav */}
              <div className="reader-btn-row">
                <button
                  className="chip chip-blue reader-ctrl-btn"
                  disabled={chapter === 0}
                  onClick={() => setChapter(c => c - 1)}
                  type="button"
                >← Prev chapter</button>
                <span className="tts-label">
                  Chapter {chapter + 1} of {chapters.length}
                </span>
                <button
                  className="chip chip-blue reader-ctrl-btn"
                  disabled={chapter >= chapters.length - 1}
                  onClick={() => setChapter(c => c + 1)}
                  type="button"
                >Next chapter →</button>
                <div style={{ flex: 1 }} />
                <span className="tts-label" style={{ opacity: 0.6 }}>ElevenLabs TTS</span>
              </div>
            </div>

            {/* Line-by-line body */}
            <div className="reader-body">
              {lines.length === 0 && (
                <p style={{ color: 'red', fontSize: 13 }}>
                  No lines found — text length: {text.length}, chapters: {chapters.length}
                </p>
              )}
              {lines.map((line, i) => (
                <div
                  key={i}
                  ref={el => { lineRefs.current[i] = el; }}
                  className={`reader-line${i === lineIdx ? ' reader-line-active' : ''}`}
                  onClick={() => jumpToLine(i)}
                >
                  {line}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}