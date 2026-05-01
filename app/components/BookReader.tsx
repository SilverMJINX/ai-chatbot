'use client';
import { useState, useEffect } from 'react';
import { useElevenLabsTTS } from '@/hooks/useElevenLabsTTS';

interface Book {
  id: number;
  title: string;
  authors: { name: string }[];
  formats: Record<string, string>;
}

// Reuse your TTSButton pattern — adapted for the reader
function ReaderTTSButton({ text }: { text: string }) {
  const { speak, stop, status } = useElevenLabsTTS();
  return (
    <button
      className={`tts-btn ${status === 'playing' ? 'tts-playing' : ''} ${status === 'loading' ? 'tts-loading' : ''}`}
      onClick={() => status === 'playing' ? stop() : speak(text)}
      type="button"
    >
      {status === 'idle'    && <span>▶ Listen to Chapter</span>}
      {status === 'loading' && <span>Loading…</span>}
      {status === 'playing' && <span>⏹ Stop</span>}
    </button>
  );
}

// Split text into rough "chapters" by double newlines / chapter headings
function splitChapters(text: string): string[] {
  return text
    .split(/\n{3,}|(?=\bCHAPTER\b)/i)
    .map(c => c.trim())
    .filter(c => c.length > 200); // skip stubs
}

export function BookReader({ book, onClose }: { book: Book; onClose: () => void }) {
  const [text, setText]       = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [chapter, setChapter] = useState(0);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/books/${book.id}/text`)
      .then(r => r.ok ? r.text() : Promise.reject('unavailable'))
      .then(t => setText(t))
      .catch(() => setError('Full text unavailable for this book.'))
      .finally(() => setLoading(false));
  }, [book.id]);

  const chapters = splitChapters(text);
  const current  = chapters[chapter] ?? '';

  return (
    <div className="reader-overlay" onClick={onClose}>
      <div className="reader-panel" onClick={e => e.stopPropagation()}>
        <div className="reader-header">
          <div>
            <h2 className="reader-title">{book.title}</h2>
            <p className="reader-author">
              {book.authors.map(a => a.name).join(', ')}
            </p>
          </div>
          <button className="icon-btn" onClick={onClose} title="Close">✕</button>
        </div>

        {loading && <p className="reader-status">Loading text…</p>}
        {error   && <p className="reader-status error">{error}</p>}

        {!loading && !error && (
          <>
            <div className="reader-tts-bar">
              <ReaderTTSButton text={current} />
              <span className="tts-label">
                Section {chapter + 1} of {chapters.length}
              </span>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                <button
                  className="chip chip-blue"
                  disabled={chapter === 0}
                  onClick={() => setChapter(c => c - 1)}
                >← Prev</button>
                <button
                  className="chip chip-blue"
                  disabled={chapter >= chapters.length - 1}
                  onClick={() => setChapter(c => c + 1)}
                >Next →</button>
              </div>
            </div>

            <div className="reader-body">
              <pre className="reader-text">{current}</pre>
            </div>
          </>
        )}
      </div>
    </div>
  );
}