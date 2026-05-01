"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useElevenLabsTTS } from "../../hooks/useElevenLabsTTS";

const USERNAME = "Admin";

interface Book {
  id: number;
  title: string;
  authors: { name: string }[];
  subjects: string[];
  formats: Record<string, string>;
  download_count: number;
}

// Helpers 

function splitChapters(text: string): string[] {
  const chunks = text
    .split(/(?=\bCHAPTER\s+[IVXLCDM\d]+\b)/i)
    .map(c => c.trim())
    .filter(Boolean);
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

// BookReader 

function BookReader({ book, onClose }: { book: Book; onClose: () => void }) {
  const [text, setText]       = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
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
    setError("");
    fetch(`/api/books/${book.id}/text`)
      .then(r => r.ok ? r.text() : Promise.reject("unavailable"))
      .then(t => {
        console.log("text bytes:", t.length, "| chapters:", splitChapters(t).length);
        setText(t);
      })
      .catch(() => setError("Full text unavailable for this book."))
      .finally(() => setLoading(false));
    return () => { clearInterval(timerRef.current!); };
  }, [book.id]);

  const chapters = splitChapters(text);
  const lines    = splitLines(chapters[chapter] ?? "");
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
    lineRefs.current[lineIdx]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [lineIdx]);

  // Speak active line when it changes while playing
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

  return (
    <div className="reader-overlay" onClick={onClose}>
      <div className="reader-panel" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="reader-header">
          <div className="reader-header-left">
            <div className="ai-avatar-lg">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
              </svg>
            </div>
            <div>
              <h2 className="reader-title">{book.title}</h2>
              <p className="reader-author">
                {book.authors.map(a => a.name).join(", ") || "Unknown author"}
              </p>
            </div>
          </div>
          <button className="reader-close-btn" onClick={onClose} type="button">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {loading && (
          <div className="reader-status">
            <div className="typing-bubble" style={{ justifyContent: "center" }}>
              <span className="dot"/><span className="dot"/><span className="dot"/>
            </div>
            <p style={{ marginTop: 12 }}>Loading book text…</p>
          </div>
        )}
        {error && <p className="reader-status reader-error">{error}</p>}

        {!loading && !error && (
          <>
            {/* Controls */}
            <div className="reader-tts-bar">

              {/* Progress bar */}
              <div className="reader-progress-row">
                <div className="reader-progress-track">
                  <div className="reader-progress-fill" style={{ width: `${progress}%` }} />
                </div>
                <span className="tts-label" style={{ whiteSpace: "nowrap" }}>
                  {lineIdx + 1} / {total}
                </span>
              </div>

              {/* Playback */}
              <div className="reader-btn-row">
                <button className="chip chip-blue reader-ctrl-btn" onClick={() => skipLines(-5)} title="Back 5 lines" type="button">⏮ 5</button>
                <button className="chip chip-blue reader-ctrl-btn" onClick={() => skipLines(-1)} title="Previous line" type="button">‹ 1</button>

                <button
                  className={`tts-btn ${playing ? "tts-playing" : ""} ${status === "loading" ? "tts-loading" : ""}`}
                  onClick={togglePlay}
                  type="button"
                  style={{ minWidth: 82 }}
                >
                  {status === "loading" && <span>Loading…</span>}
                  {status !== "loading" && (playing
                    ? <><span>⏸</span><span>Pause</span></>
                    : <><span>▶</span><span>Play</span></>
                  )}
                </button>

                <button className="chip chip-blue reader-ctrl-btn" onClick={() => skipLines(1)} title="Next line" type="button">1 ›</button>
                <button className="chip chip-blue reader-ctrl-btn" onClick={() => skipLines(5)} title="Skip 5 lines" type="button">5 ⏭</button>

                <div style={{ flex: 1 }} />

                <span className="tts-label">Speed:</span>
                {SPEED_OPTIONS.map(s => (
                  <button
                    key={s}
                    className={`chip reader-ctrl-btn ${speed === s ? "chip-speed-active" : "chip-blue"}`}
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
                <span className="tts-label">Chapter {chapter + 1} of {chapters.length}</span>
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
                <p style={{ color: "#b91c1c", fontSize: 13 }}>
                  No lines found — text length: {text.length}, chapters: {chapters.length}
                </p>
              )}
              {lines.map((line, i) => (
                <div
                  key={i}
                  ref={el => { lineRefs.current[i] = el; }}
                  className={`reader-line${i === lineIdx ? " reader-line-active" : ""}`}
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

// BooksPage 

export default function BooksPage() {
  const [query, setQuery]     = useState("");
  const [books, setBooks]     = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selected, setSelected] = useState<Book | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`/api/books/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setBooks(data.results ?? []);
    } catch {
      setBooks([]);
    }
    setLoading(false);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Fraunces:ital,wght@0,600;1,400&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --blue:        #4a90d9;
          --blue-dark:   #2563a8;
          --blue-deeper: #1a4a80;
          --blue-light:  #dbeafe;
          --blue-soft:   #eff6ff;
          --blue-mid:    #bfdbfe;
          --blue-glow:   rgba(74,144,217,0.25);
          --coral:       #f87171;
          --coral-light: #fff5f5;
          --bg:          #f0f6ff;
          --white:       #ffffff;
          --text:        #1e3a5f;
          --text-mid:    #4a6080;
          --text-soft:   #8aaac8;
          --border:      #d0e4f7;
          --shadow-sm:   0 1px 4px rgba(37,99,168,0.07);
          --shadow-md:   0 4px 20px rgba(37,99,168,0.1);
        }

        html, body { height: 100%; }

        body {
          font-family: 'Plus Jakarta Sans', sans-serif;
          background: var(--bg);
          color: var(--text);
          min-height: 100vh;
          background-image:
            radial-gradient(ellipse 55% 40% at 90% 5%,  rgba(74,144,217,0.12) 0%, transparent 60%),
            radial-gradient(ellipse 45% 45% at 5%  95%, rgba(74,144,217,0.08) 0%, transparent 60%);
        }

        .page-wrap {
          display: grid;
          grid-template-rows: 64px 1fr;
          min-height: 100vh;
        }

        .topnav {
          background: var(--white);
          border-bottom: 1px solid var(--border);
          display: flex; align-items: center;
          padding: 0 32px; gap: 16px;
          box-shadow: var(--shadow-sm); z-index: 20;
        }

        .brand {
          display: flex; align-items: center; gap: 10px;
          text-decoration: none; flex-shrink: 0;
        }
        .brand-icon {
          width: 36px; height: 36px; border-radius: 12px;
          background: linear-gradient(135deg, var(--blue), #6baee8);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 12px var(--blue-glow);
        }
        .brand-name {
          font-family: 'Fraunces', Georgia, serif;
          font-size: 1.3rem; font-weight: 600;
          color: var(--text); letter-spacing: -0.02em;
        }
        .brand-name span { color: var(--blue); }

        .nav-divider { width: 1px; height: 24px; background: var(--border); margin: 0 4px; }

        .nav-badge {
          display: flex; align-items: center; gap: 6px;
          background: var(--blue-soft); color: var(--blue-dark);
          font-size: 0.72rem; font-weight: 600;
          padding: 5px 12px; border-radius: 20px;
          border: 1px solid var(--blue-mid);
        }

        .nav-books-link {
          font-size: 0.82rem; font-weight: 600;
          color: var(--white); text-decoration: none;
          padding: 6px 14px; border-radius: 20px;
          background: linear-gradient(135deg, var(--blue), #6baee8);
          border: 1.5px solid var(--blue);
          box-shadow: 0 2px 8px var(--blue-glow);
          white-space: nowrap;
        }
        .nav-chat-link {
          font-size: 0.82rem; font-weight: 600;
          color: var(--blue-dark); text-decoration: none;
          padding: 6px 14px; border-radius: 20px;
          background: var(--blue-soft);
          border: 1.5px solid var(--blue-mid);
          transition: all 0.15s; white-space: nowrap;
        }
        .nav-chat-link:hover { background: var(--blue-light); border-color: var(--blue); }

        .nav-spacer { flex: 1; }

        .nav-user {
          display: flex; align-items: center; gap: 10px;
          padding: 6px 12px; border-radius: 12px;
          cursor: pointer; transition: background 0.15s;
        }
        .nav-user:hover { background: var(--bg); }
        .nav-user-avatar {
          width: 32px; height: 32px; border-radius: 50%;
          background: linear-gradient(135deg, var(--blue), #6baee8);
          display: flex; align-items: center; justify-content: center;
          font-size: 0.78rem; font-weight: 700; color: white;
          box-shadow: 0 2px 8px var(--blue-glow);
        }
        .nav-user-name { font-size: 0.85rem; font-weight: 600; color: var(--text); }

        .books-main {
          max-width: 900px; width: 100%;
          margin: 0 auto; padding: 36px 24px;
          overflow-y: auto;
        }

        .books-subheader {
          display: flex; align-items: center; gap: 14px;
          padding-bottom: 24px;
          border-bottom: 1px solid var(--border);
          margin-bottom: 28px;
        }
        .ai-avatar-lg {
          width: 46px; height: 46px; border-radius: 14px;
          background: linear-gradient(135deg, var(--blue), #6baee8);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 14px var(--blue-glow); flex-shrink: 0;
        }
        .books-subheader-text h2 { font-size: 0.98rem; font-weight: 700; color: var(--text); }
        .books-subheader-text p  { font-size: 0.74rem; color: var(--text-soft); margin-top: 2px; }
        .subheader-chips { margin-left: auto; display: flex; gap: 8px; }

        .chip {
          font-size: 0.71rem; font-weight: 600;
          padding: 5px 11px; border-radius: 20px;
          border: 1.5px solid; white-space: nowrap; cursor: default;
        }
        .chip-blue  { color: var(--blue-dark); background: var(--blue-soft); border-color: var(--blue-mid); }
        .chip-coral { color: #b91c1c; background: var(--coral-light); border-color: #fca5a5; }
        .chip-speed-active {
          color: var(--blue-dark); background: var(--blue-light);
          border-color: var(--blue); font-weight: 700;
        }

        .search-wrapper {
          display: flex; align-items: center; gap: 10px;
          background: var(--white);
          border: 2px solid var(--border);
          border-radius: 20px;
          padding: 10px 10px 10px 20px;
          transition: border-color 0.2s, box-shadow 0.2s;
          box-shadow: var(--shadow-sm);
          margin-bottom: 28px;
        }
        .search-wrapper:focus-within {
          border-color: var(--blue);
          box-shadow: 0 0 0 4px rgba(74,144,217,0.12);
        }
        .search-input {
          flex: 1; border: none; outline: none;
          background: transparent;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 0.9rem; color: var(--text);
          caret-color: var(--blue);
        }
        .search-input::placeholder { color: var(--text-soft); }

        .icon-btn {
          width: 38px; height: 38px; border-radius: 12px;
          border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.18s; flex-shrink: 0;
        }
        .send-btn {
          background: linear-gradient(135deg, var(--blue), #6baee8);
          color: white; box-shadow: 0 4px 14px var(--blue-glow);
        }
        .send-btn:hover { transform: scale(1.05); box-shadow: 0 6px 20px rgba(74,144,217,0.4); }
        .send-btn:disabled {
          background: var(--blue-light); color: var(--text-soft);
          box-shadow: none; cursor: not-allowed; transform: none;
        }

        .books-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 16px;
        }
        .book-card {
          background: var(--white);
          border: 1px solid var(--border);
          border-radius: 20px; padding: 18px;
          cursor: pointer; transition: all 0.18s;
          box-shadow: var(--shadow-sm);
          animation: fadeUp 0.28s cubic-bezier(0.22,1,0.36,1);
        }
        .book-card:hover {
          border-color: var(--blue); transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(74,144,217,0.15);
        }
        .book-card-title {
          font-size: 0.88rem; font-weight: 700;
          color: var(--text); margin-bottom: 5px; line-height: 1.4;
          display: -webkit-box; -webkit-line-clamp: 2;
          -webkit-box-orient: vertical; overflow: hidden;
        }
        .book-card-author {
          font-size: 0.74rem; color: var(--text-soft); margin-bottom: 14px;
          display: -webkit-box; -webkit-line-clamp: 1;
          -webkit-box-orient: vertical; overflow: hidden;
        }
        .book-card-footer {
          display: flex; align-items: center; justify-content: space-between;
        }
        .book-card-downloads { font-size: 0.68rem; color: var(--text-soft); }

        .empty-state {
          text-align: center; padding: 60px 0;
          color: var(--text-soft); font-size: 0.9rem;
        }
        .empty-icon { font-size: 2.5rem; margin-bottom: 12px; }

        .typing-bubble { display: flex; align-items: center; gap: 5px; }
        .dot {
          width: 7px; height: 7px; border-radius: 50%;
          background: var(--blue); display: inline-block;
          animation: bounce 1.3s infinite ease-in-out;
        }
        .dot:nth-child(2) { animation-delay: 0.15s; }
        .dot:nth-child(3) { animation-delay: 0.3s; }

        .tts-btn {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 0.76rem; font-weight: 600;
          font-family: 'Plus Jakarta Sans', sans-serif;
          padding: 6px 14px 6px 11px; border-radius: 20px;
          border: 1.5px solid var(--blue-mid);
          background: var(--white); color: var(--blue-dark);
          cursor: pointer; transition: all 0.15s ease;
          white-space: nowrap;
          box-shadow: 0 1px 4px rgba(37,99,168,0.10);
        }
        .tts-btn:hover {
          background: var(--blue-soft); border-color: var(--blue);
          transform: translateY(-1px);
          box-shadow: 0 3px 10px rgba(74,144,217,0.2);
        }
        .tts-btn.tts-playing {
          background: #f0fdf4; border-color: #86efac; color: #166534;
          animation: ttsGlow 2s ease-in-out infinite;
        }
        .tts-btn.tts-loading { opacity: 0.7; cursor: wait; }
        .tts-label { font-size: 0.64rem; color: var(--text-soft); letter-spacing: 0.02em; }

        /* Reader modal */
        .reader-overlay {
          position: fixed; inset: 0;
          background: rgba(30,58,95,0.5);
          backdrop-filter: blur(6px);
          z-index: 100;
          display: flex; align-items: center; justify-content: center;
          padding: 24px;
          animation: fadeUp 0.2s ease;
        }
        .reader-panel {
          background: var(--white);
          border-radius: 20px;
          width: 100%; max-width: 740px; max-height: 88vh;
          display: flex; flex-direction: column;
          box-shadow: var(--shadow-md);
          overflow: hidden;
          border: 1px solid var(--border);
        }
        .reader-header {
          padding: 18px 20px;
          border-bottom: 1px solid var(--border);
          display: flex; align-items: center;
          justify-content: space-between; gap: 14px;
          flex-shrink: 0;
        }
        .reader-header-left {
          display: flex; align-items: center; gap: 14px; min-width: 0;
        }
        .reader-title {
          font-size: 0.95rem; font-weight: 700;
          color: var(--text); line-height: 1.3;
          display: -webkit-box; -webkit-line-clamp: 1;
          -webkit-box-orient: vertical; overflow: hidden;
        }
        .reader-author { font-size: 0.74rem; color: var(--text-soft); margin-top: 2px; }
        .reader-close-btn {
          width: 34px; height: 34px; border-radius: 10px;
          border: 1.5px solid var(--border);
          background: var(--bg); color: var(--text-mid);
          cursor: pointer; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.15s;
        }
        .reader-close-btn:hover { background: var(--blue-light); border-color: var(--blue); color: var(--blue-dark); }

        /* Controls bar */
        .reader-tts-bar {
          padding: 12px 20px;
          border-bottom: 1px solid var(--border);
          display: flex; flex-direction: column; gap: 10px;
          flex-shrink: 0;
        }
        .reader-progress-row { display: flex; align-items: center; gap: 10px; }
        .reader-progress-track {
          flex: 1; height: 4px;
          background: var(--blue-mid); border-radius: 2px; overflow: hidden;
        }
        .reader-progress-fill {
          height: 100%; background: var(--blue);
          border-radius: 2px; transition: width 0.35s ease;
        }
        .reader-btn-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
        .reader-ctrl-btn { cursor: pointer !important; }
        .reader-ctrl-btn:disabled { opacity: 0.35; cursor: not-allowed !important; }

        /* Line reader body */
        .reader-body { flex: 1; overflow-y: auto; padding: 20px 24px; }
        .reader-body::-webkit-scrollbar { width: 5px; }
        .reader-body::-webkit-scrollbar-track { background: transparent; }
        .reader-body::-webkit-scrollbar-thumb { background: var(--blue-mid); border-radius: 3px; }

        .reader-line {
          font-family: 'Georgia', serif;
          font-size: 0.97rem; line-height: 1.85;
          color: var(--text-mid);
          padding: 3px 8px; margin: 0 -8px;
          border-radius: 6px; cursor: pointer;
          transition: background 0.15s, color 0.15s;
        }
        .reader-line:hover { background: var(--blue-soft); color: var(--text); }
        .reader-line-active {
          color: var(--text) !important;
          background: var(--blue-light) !important;
          border-left: 2px solid var(--blue);
          padding-left: 10px;
        }

        .reader-status {
          padding: 48px 0; text-align: center;
          color: var(--text-soft); font-size: 0.88rem;
        }
        .reader-error { color: #b91c1c; }

        /* Animations */
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.45; }
          30% { transform: translateY(-7px); opacity: 1; }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes ttsGlow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(134,239,172,0.4); }
          50%       { box-shadow: 0 0 0 6px rgba(134,239,172,0); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 0.7s linear infinite; }

        /* Responsive */
        @media (max-width: 768px) {
          .topnav { padding: 0 16px; }
          .books-main { padding: 24px 16px; }
          .subheader-chips { display: none; }
          .reader-panel { max-height: 95vh; }
        }
        @media (max-width: 480px) {
          .brand-name { display: none; }
          .nav-badge { display: none; }
          .books-grid { grid-template-columns: 1fr 1fr; gap: 10px; }
        }
      `}</style>

      <div className="page-wrap">
        <nav className="topnav">
          <div className="brand">
            <div className="brand-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/>
                <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/>
              </svg>
            </div>
            <span className="brand-name">At<span>las</span></span>
          </div>

          <div className="nav-divider" />

          <div className="nav-badge">
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--blue)", display: "inline-block" }} />
            Book Library
          </div>

          <a href="/chat" className="nav-chat-link">💬 <span>Chat</span></a>
          <span className="nav-books-link">📚 Books</span>

          <div className="nav-spacer" />

          <div className="nav-user">
            <div className="nav-user-avatar">{USERNAME.charAt(0)}</div>
            <span className="nav-user-name">{USERNAME}</span>
          </div>
        </nav>

        <main className="books-main">
          <div className="books-subheader">
            <div className="ai-avatar-lg">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
              </svg>
            </div>
            <div className="books-subheader-text">
              <h2>Atlas · Book Library</h2>
              <p>Search 70,000+ classic books · read full text · listen via ElevenLabs</p>
            </div>
            <div className="subheader-chips">
              <span className="chip chip-blue">Project Gutenberg</span>
              <span className="chip chip-blue">Free &amp; Public Domain</span>
            </div>
          </div>

          <div className="search-wrapper">
            <input
              ref={inputRef}
              className="search-input"
              placeholder="Search by title or author… e.g. Shakespeare, Frankenstein"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && search()}
            />
            <button
              className="icon-btn send-btn"
              onClick={search}
              disabled={!query.trim() || loading}
              type="button"
              title="Search"
            >
              {loading ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="spin">
                  <path d="M21 12a9 9 0 1 1-6.22-8.56"/>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="11" cy="11" r="8"/>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
              )}
            </button>
          </div>

          {!searched && (
            <div className="empty-state">
              <div className="empty-icon">📚</div>
              <p>Search for a book above to get started</p>
            </div>
          )}

          {searched && !loading && books.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">🔍</div>
              <p>No books found — try a different search</p>
            </div>
          )}

          <div className="books-grid">
            {books.map(book => (
              <div key={book.id} className="book-card" onClick={() => setSelected(book)}>
                <p className="book-card-title">{book.title}</p>
                <p className="book-card-author">
                  {book.authors.map(a => a.name).join(", ") || "Unknown author"}
                </p>
                <div className="book-card-footer">
                  <span className="chip chip-blue" style={{ fontSize: "0.67rem" }}>Read + Listen</span>
                  <span className="book-card-downloads">
                    {book.download_count?.toLocaleString() ?? "—"} downloads
                  </span>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>

      {selected && (
        <BookReader book={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}