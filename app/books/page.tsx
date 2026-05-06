"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useElevenLabsTTS } from "../../hooks/useElevenLabsTTS";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";

interface Book {
  id: number;
  title: string;
  authors: { name: string }[];
  subjects: string[];
  formats: Record<string, string>;
  download_count: number;
}

// Text helpers
function stripBoilerplate(text: string): string {
  text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const startMatch = text.match(/\*{3}\s*START OF (?:THE|THIS) PROJECT GUTENBERG EBOOK[^\n]*/i);
  if (startMatch && startMatch.index !== undefined) {
    const afterMarker = text.indexOf("\n", startMatch.index);
    text = text.slice(afterMarker + 1);
  }
  const endMatch = text.match(/\*{3}\s*END OF (?:THE|THIS) PROJECT GUTENBERG EBOOK/i)
    || text.match(/End of (?:the )?Project Gutenberg/i);
  if (endMatch && endMatch.index !== undefined) {
    text = text.slice(0, endMatch.index);
  }
  return text.trim();
}

function splitChapters(rawText: string): string[] {
  const text = stripBoilerplate(rawText);
  const chunks = text
    .split(/(?=^\s*(?:CHAPTER|PART|BOOK|SECTION)\s+(?:[IVXLCDM]+|\d+|ONE|TWO|THREE|FOUR|FIVE|SIX|SEVEN|EIGHT|NINE|TEN)\b)/im)
    .map(c => c.trim())
    .filter(c => c.length > 80);
  return chunks.length > 1 ? chunks : [text];
}

function splitLines(section: string): string[] {
  const paragraphs: string[] = [];
  let current = "";
  for (const raw of section.split("\n")) {
    const line = raw.trim();
    if (line === "") {
      if (current.trim().length > 0) { paragraphs.push(current.trim()); current = ""; }
    } else {
      current = current ? current + " " + line : line;
    }
  }
  if (current.trim()) paragraphs.push(current.trim());
  return paragraphs.filter(p => {
    if (p.length < 45) return false;
    if (p === p.toUpperCase() && /[A-Z]{4,}/.test(p)) return false;
    if (/^\d+\s/.test(p) && p.length < 60) return false;
    return true;
  });
}

const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5] as const;

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
  const lineRefs  = useRef<(HTMLDivElement | null)[]>([]);
  const playingRef = useRef(false);
  const lineIdxRef = useRef(0);
  const speedRef   = useRef(1);
  const linesRef   = useRef<string[]>([]);

  useEffect(() => {
    setLoading(true); setError("");
    fetch(`/api/books/${book.id}/text`)
      .then(r => r.ok ? r.text() : Promise.reject("unavailable"))
      .then(t => setText(t))
      .catch(() => setError("Full text unavailable for this book."))
      .finally(() => setLoading(false));
    return () => stop();
  }, [book.id]);

  const chapters = splitChapters(text);
  const lines    = splitLines(chapters[chapter] ?? "");
  const total    = lines.length;
  const progress = total > 0 ? ((lineIdx + 1) / total) * 100 : 0;

  useEffect(() => { linesRef.current = lines; }, [lines]);
  useEffect(() => { lineIdxRef.current = lineIdx; }, [lineIdx]);
  useEffect(() => { speedRef.current = speed; }, [speed]);
  useEffect(() => { playingRef.current = playing; }, [playing]);
  useEffect(() => { lineRefs.current[lineIdx]?.scrollIntoView({ block: "nearest", behavior: "smooth" }); }, [lineIdx]);
  useEffect(() => { stop(); setPlaying(false); setLineIdx(0); }, [chapter]);

  const speakParagraph = useCallback((idx: number) => {
    const currentLines = linesRef.current;
    if (!currentLines[idx]) return;
    speak(currentLines[idx], () => {
      if (!playingRef.current) return;
      const next = lineIdxRef.current + 1;
      if (next >= linesRef.current.length) { setPlaying(false); playingRef.current = false; return; }
      const gap = Math.round(350 / speedRef.current);
      setTimeout(() => {
        if (!playingRef.current) return;
        setLineIdx(next); lineIdxRef.current = next; speakParagraph(next);
      }, gap);
    });
  }, [speak]);

  const togglePlay = () => {
    if (playing) { stop(); setPlaying(false); playingRef.current = false; }
    else { setPlaying(true); playingRef.current = true; speakParagraph(lineIdx); }
  };

  const skipLines = (n: number) => {
    const next = Math.max(0, Math.min(total - 1, lineIdx + n));
    stop(); setLineIdx(next); lineIdxRef.current = next;
    if (playing) speakParagraph(next);
  };

  const jumpToLine = (i: number) => {
    stop(); setLineIdx(i); lineIdxRef.current = i;
    if (playing) speakParagraph(i);
  };

  const changeSpeed = (s: number) => { setSpeed(s); speedRef.current = s; };

  return (
    <div className="reader-backdrop" onClick={onClose}>
      <div className="reader-panel" onClick={e => e.stopPropagation()}>
        <div className="reader-header">
          <div className="reader-header-left">
            <div className="reader-avatar">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
              </svg>
            </div>
            <div>
              <h2 className="reader-title">{book.title}</h2>
              <p className="reader-author">{book.authors.map(a => a.name).join(", ") || "Unknown author"}</p>
            </div>
          </div>
          <button className="reader-close" onClick={onClose}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {loading && (
          <div className="reader-status">
            <div className="reader-dots"><span/><span/><span/></div>
            <p style={{ marginTop: 12, color: "var(--text-dim)" }}>Loading book text…</p>
          </div>
        )}
        {error && <p className="reader-status" style={{ color: "#f87171" }}>{error}</p>}

        {!loading && !error && (
          <>
            <div className="reader-controls">
              <div className="reader-progress-row">
                <div className="reader-track"><div className="reader-fill" style={{ width: `${progress}%` }}/></div>
                <span className="reader-label">{lineIdx + 1} / {total}</span>
              </div>

              <div className="reader-btn-row">
                <button className="ctrl-chip" onClick={() => skipLines(-5)}>⏮ 5</button>
                <button className="ctrl-chip" onClick={() => skipLines(-1)}>‹ 1</button>
                <button className={`play-btn${playing ? " playing" : ""}${status === "loading" ? " loading" : ""}`} onClick={togglePlay}>
                  {status === "loading" ? "Loading…" : playing ? "⏸ Pause" : "▶ Play"}
                </button>
                <button className="ctrl-chip" onClick={() => skipLines(1)}>1 ›</button>
                <button className="ctrl-chip" onClick={() => skipLines(5)}>5 ⏭</button>
                <div style={{ flex: 1 }}/>
                <span className="reader-label">Speed:</span>
                {SPEED_OPTIONS.map(s => (
                  <button key={s} className={`ctrl-chip${speed === s ? " active" : ""}`} onClick={() => changeSpeed(s)}>{s}×</button>
                ))}
              </div>

              <div className="reader-btn-row">
                <button className="ctrl-chip" disabled={chapter === 0} onClick={() => setChapter(c => c - 1)}>← Prev chapter</button>
                <span className="reader-label">Chapter {chapter + 1} of {chapters.length}</span>
                <button className="ctrl-chip" disabled={chapter >= chapters.length - 1} onClick={() => setChapter(c => c + 1)}>Next chapter →</button>
                <div style={{ flex: 1 }}/>
                <span className="reader-label" style={{ opacity: 0.5 }}>ElevenLabs TTS</span>
              </div>
            </div>

            <div className="reader-body">
              {lines.length === 0 && (
                <p style={{ color: "var(--text-dim)", fontSize: 13, textAlign: "center", padding: "40px 0" }}>No readable paragraphs found in this chapter.</p>
              )}
              {lines.map((line, i) => (
                <div
                  key={i}
                  ref={el => { lineRefs.current[i] = el; }}
                  className={`reader-line${i === lineIdx ? " active" : ""}`}
                  onClick={() => jumpToLine(i)}
                >{line}</div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// UserMenu
function UserMenu({ name }: { name: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const initial = name?.charAt(0).toUpperCase() || "U";

  return (
    <div className="user-menu-wrap" ref={ref}>
      <button className="user-menu-btn" onClick={() => setOpen(o => !o)}>
        <div className="user-avatar">{initial}</div>
        <span className="user-name">{name}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      {open && (
        <div className="user-dropdown">
          <Link href="/chat" className="dropdown-item" onClick={() => setOpen(false)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            Chat with Atlas
          </Link>
          <Link href="/books" className="dropdown-item" onClick={() => setOpen(false)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
            </svg>
            Search Books
          </Link>
          <div className="dropdown-divider"/>
          <button className="dropdown-item signout" onClick={() => signOut({ callbackUrl: "/login" })}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

// BooksPage
export default function BooksPage() {
  const { data: session, status } = useSession();
  const isLoading = status === "loading";
  const userName  = session?.user?.name || session?.user?.email || "User";

  const [query, setQuery]       = useState("");
  const [books, setBooks]       = useState<Book[]>([]);
  const [loading, setLoading]   = useState(false);
  const [searched, setSearched] = useState(false);
  const [selected, setSelected] = useState<Book | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true); setSearched(true);
    try {
      const res  = await fetch(`/api/books/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setBooks(data.results ?? []);
    } catch { setBooks([]); }
    setLoading(false);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=DM+Sans:wght@300;400;500&family=DM+Mono:wght@400&display=swap');

        :root {
          --ink:        #0d0d0f;
          --ink-2:      #16161a;
          --ink-3:      #1f1f24;
          --ink-4:      #2a2a32;
          --blue:       #4a90d9;
          --blue-glow:  rgba(74,144,217,0.18);
          --blue-dim:   rgba(74,144,217,0.08);
          --gold:       #c9a84c;
          --gold-light: #e8c97a;
          --text:       #e8e6e1;
          --text-mid:   #9b9890;
          --text-dim:   #5a5854;
          --border:     rgba(255,255,255,0.06);
          --border-mid: rgba(255,255,255,0.10);
          --serif:      'Cormorant Garamond', Georgia, serif;
          --sans:       'DM Sans', sans-serif;
          --mono:       'DM Mono', monospace;
        }

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; }
        body { font-family: var(--sans); background: var(--ink); color: var(--text); min-height: 100vh; overflow-x: hidden; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: var(--ink-2); }
        ::-webkit-scrollbar-thumb { background: var(--ink-4); border-radius: 2px; }

        @keyframes fadeUp    { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes shimmer   { 0% { background-position: -400px 0; } 100% { background-position: 400px 0; } }
        @keyframes bounce    { 0%, 60%, 100% { transform: translateY(0); opacity: 0.4; } 30% { transform: translateY(-6px); opacity: 1; } }
        @keyframes spin      { to { transform: rotate(360deg); } }
        @keyframes dropIn    { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes modalIn   { from { opacity: 0; transform: translateY(20px) scale(0.97); } to { opacity: 1; transform: none; } }
        @keyframes backdropIn{ from { opacity: 0; } to { opacity: 1; } }
        @keyframes ttsGlow   { 0%,100% { box-shadow: 0 0 0 0 rgba(74,217,120,0.3); } 50% { box-shadow: 0 0 0 6px rgba(74,217,120,0); } }
        .spin { animation: spin 0.7s linear infinite; }

        /* ── NAV ── */
        .nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 100;
          height: 68px; padding: 0 48px;
          display: flex; align-items: center; gap: 8px;
          background: linear-gradient(to bottom, rgba(13,13,15,0.96) 0%, transparent 100%);
          backdrop-filter: blur(14px);
          border-bottom: 1px solid var(--border);
        }
        .nav-brand { display: flex; align-items: center; gap: 10px; text-decoration: none; margin-right: 8px; }
        .nav-logo { width: 32px; height: 32px; border-radius: 9px; background: linear-gradient(135deg, var(--blue), #6baee8); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 16px var(--blue-glow); flex-shrink: 0; }
        .nav-name { font-family: var(--serif); font-size: 1.5rem; font-weight: 600; color: var(--text); letter-spacing: 0.01em; }
        .nav-name em { color: var(--blue); font-style: normal; }
        .nav-divider { width: 1px; height: 20px; background: var(--border-mid); margin: 0 6px; }
        .nav-badge { font-family: var(--mono); font-size: 0.6rem; letter-spacing: 0.14em; text-transform: uppercase; color: var(--blue); padding: 4px 10px; border: 1px solid rgba(74,144,217,0.25); border-radius: 4px; background: rgba(74,144,217,0.06); display: flex; align-items: center; gap: 6px; }
        .nav-badge-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--blue); }
        .nav-link { font-size: 0.8rem; font-weight: 500; color: var(--text-mid); text-decoration: none; padding: 7px 14px; border-radius: 20px; border: 1px solid transparent; transition: all 0.15s; }
        .nav-link:hover { color: var(--text); border-color: var(--border-mid); background: rgba(255,255,255,0.04); }
        .nav-link-active { color: var(--text); border-color: var(--border-mid); background: rgba(255,255,255,0.04); }
        .nav-spacer { flex: 1; }

        /* User menu */
        .user-menu-wrap { position: relative; }
        .user-menu-btn { display: flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.04); border: 1px solid var(--border-mid); border-radius: 20px; padding: 5px 12px 5px 5px; cursor: pointer; transition: all 0.15s; color: var(--text); }
        .user-menu-btn:hover { background: rgba(255,255,255,0.07); border-color: rgba(255,255,255,0.18); }
        .user-avatar { width: 28px; height: 28px; border-radius: 50%; background: linear-gradient(135deg, var(--blue), #6baee8); display: flex; align-items: center; justify-content: center; font-size: 0.72rem; font-weight: 700; color: white; flex-shrink: 0; box-shadow: 0 2px 8px var(--blue-glow); }
        .user-name { font-size: 0.8rem; font-weight: 500; color: var(--text); }
        .user-dropdown { position: absolute; top: calc(100% + 8px); right: 0; min-width: 180px; background: var(--ink-2); border: 1px solid var(--border-mid); border-radius: 10px; padding: 6px; box-shadow: 0 16px 40px rgba(0,0,0,0.5); animation: dropIn 0.18s cubic-bezier(0.22,1,0.36,1) both; z-index: 200; }
        .dropdown-item { display: flex; align-items: center; gap: 9px; width: 100%; padding: 9px 12px; border-radius: 6px; font-size: 0.8rem; font-weight: 500; color: var(--text-mid); text-decoration: none; background: none; border: none; cursor: pointer; transition: all 0.12s; text-align: left; font-family: var(--sans); }
        .dropdown-item:hover { background: rgba(255,255,255,0.05); color: var(--text); }
        .dropdown-divider { height: 1px; background: var(--border); margin: 4px 0; }
        .signout { color: #f87171 !important; }
        .signout:hover { background: rgba(248,113,113,0.08) !important; color: #fca5a5 !important; }

        /* ── PAGE ── */
        .page-wrap { padding-top: 68px; min-height: 100vh; }

        /* ── Page header ── */
        .page-header {
          padding: 48px 64px 36px;
          border-bottom: 1px solid var(--border);
          background: linear-gradient(to bottom, rgba(74,144,217,0.04), transparent);
        }
        .page-header-inner { max-width: 860px; margin: 0 auto; }
        .page-eyebrow { display: inline-flex; align-items: center; gap: 8px; font-family: var(--mono); font-size: 0.62rem; letter-spacing: 0.16em; text-transform: uppercase; color: var(--blue); margin-bottom: 14px; padding: 4px 10px; border: 1px solid rgba(74,144,217,0.25); border-radius: 4px; background: rgba(74,144,217,0.06); }
        .page-title { font-family: var(--serif); font-size: clamp(2rem, 3.5vw, 2.8rem); font-weight: 300; color: var(--text); letter-spacing: -0.01em; line-height: 1.1; margin-bottom: 8px; }
        .page-title em { font-style: italic; color: var(--gold-light); }
        .page-sub { font-size: 0.85rem; color: var(--text-mid); font-weight: 300; }
        .page-chips { display: flex; gap: 8px; margin-top: 18px; flex-wrap: wrap; }
        .page-chip { font-family: var(--mono); font-size: 0.6rem; letter-spacing: 0.1em; text-transform: uppercase; padding: 4px 10px; border-radius: 4px; border: 1px solid var(--border-mid); color: var(--text-dim); background: rgba(255,255,255,0.02); }

        /* ── Main ── */
        .books-main { max-width: 860px; margin: 0 auto; padding: 40px 64px 80px; }

        /* ── Search ── */
        .search-wrap { display: flex; align-items: center; gap: 10px; background: var(--ink-2); border: 1px solid var(--border-mid); border-radius: 8px; padding: 10px 10px 10px 20px; transition: border-color 0.2s, box-shadow 0.2s; margin-bottom: 36px; }
        .search-wrap:focus-within { border-color: rgba(74,144,217,0.5); box-shadow: 0 0 0 3px rgba(74,144,217,0.08); }
        .search-input { flex: 1; border: none; outline: none; background: transparent; font-family: var(--sans); font-size: 0.9rem; color: var(--text); caret-color: var(--blue); }
        .search-input::placeholder { color: var(--text-dim); }
        .search-btn { width: 38px; height: 38px; border-radius: 6px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, var(--blue), #6baee8); color: white; box-shadow: 0 4px 14px var(--blue-glow); transition: all 0.15s; flex-shrink: 0; }
        .search-btn:hover { transform: scale(1.05); }
        .search-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }

        /* ── Grid ── */
        .books-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
        .book-card { background: var(--ink-2); border: 1px solid var(--border); border-radius: 10px; padding: 18px; cursor: pointer; transition: all 0.18s; animation: fadeUp 0.3s cubic-bezier(0.22,1,0.36,1) both; }
        .book-card:hover { border-color: rgba(74,144,217,0.3); transform: translateY(-3px); box-shadow: 0 8px 28px rgba(0,0,0,0.3), 0 0 0 1px rgba(74,144,217,0.15); }
        .book-card-icon { width: 36px; height: 36px; border-radius: 8px; background: rgba(74,144,217,0.1); border: 1px solid rgba(74,144,217,0.2); display: flex; align-items: center; justify-content: center; margin-bottom: 14px; }
        .book-card-title { font-family: var(--serif); font-size: 1rem; font-weight: 400; color: var(--text); line-height: 1.35; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; margin-bottom: 6px; }
        .book-card-author { font-size: 0.72rem; color: var(--text-dim); font-family: var(--mono); display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; margin-bottom: 16px; }
        .book-card-footer { display: flex; align-items: center; justify-content: space-between; }
        .book-read-tag { font-family: var(--mono); font-size: 0.58rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--blue); padding: 3px 8px; border: 1px solid rgba(74,144,217,0.25); border-radius: 3px; background: rgba(74,144,217,0.06); }
        .book-downloads { font-size: 0.65rem; color: var(--text-dim); font-family: var(--mono); }

        /* ── Empty states ── */
        .empty-state { text-align: center; padding: 72px 0; animation: fadeUp 0.4s ease both; }
        .empty-icon { font-family: var(--serif); font-size: 3rem; margin-bottom: 16px; opacity: 0.4; }
        .empty-title { font-family: var(--serif); font-size: 1.3rem; font-weight: 300; color: var(--text-mid); margin-bottom: 6px; }
        .empty-sub { font-size: 0.78rem; color: var(--text-dim); font-family: var(--mono); letter-spacing: 0.04em; }

        /* ── Reader modal ── */
        .reader-backdrop { position: fixed; inset: 0; background: rgba(8,8,10,0.84); backdrop-filter: blur(12px); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 24px; animation: backdropIn 0.2s ease both; }
        .reader-panel { background: var(--ink-2); border: 1px solid var(--border-mid); border-radius: 16px; width: 100%; max-width: 760px; max-height: 88vh; display: flex; flex-direction: column; box-shadow: 0 32px 80px rgba(0,0,0,0.7); overflow: hidden; animation: modalIn 0.28s cubic-bezier(0.22,1,0.36,1) both; }

        .reader-header { padding: 20px 24px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-shrink: 0; }
        .reader-header-left { display: flex; align-items: center; gap: 14px; min-width: 0; }
        .reader-avatar { width: 38px; height: 38px; border-radius: 10px; background: linear-gradient(135deg, var(--blue), #6baee8); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px var(--blue-glow); flex-shrink: 0; }
        .reader-title { font-family: var(--serif); font-size: 1rem; font-weight: 400; color: var(--text); display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }
        .reader-author { font-size: 0.7rem; color: var(--text-dim); font-family: var(--mono); margin-top: 2px; }
        .reader-close { width: 32px; height: 32px; border-radius: 8px; border: 1px solid var(--border-mid); background: var(--ink-3); color: var(--text-mid); display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; transition: all 0.15s; }
        .reader-close:hover { background: var(--ink-4); color: var(--text); }

        .reader-controls { padding: 14px 24px; border-bottom: 1px solid var(--border); display: flex; flex-direction: column; gap: 10px; flex-shrink: 0; }
        .reader-progress-row { display: flex; align-items: center; gap: 10px; }
        .reader-track { flex: 1; height: 3px; background: var(--ink-4); border-radius: 2px; overflow: hidden; }
        .reader-fill { height: 100%; background: linear-gradient(90deg, var(--blue), #6baee8); border-radius: 2px; transition: width 0.35s ease; }
        .reader-label { font-family: var(--mono); font-size: 0.62rem; color: var(--text-dim); white-space: nowrap; }
        .reader-btn-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }

        .ctrl-chip { font-family: var(--mono); font-size: 0.65rem; padding: 5px 11px; border-radius: 4px; border: 1px solid var(--border-mid); background: var(--ink-3); color: var(--text-mid); cursor: pointer; transition: all 0.12s; white-space: nowrap; }
        .ctrl-chip:hover { background: var(--ink-4); color: var(--text); border-color: rgba(74,144,217,0.3); }
        .ctrl-chip:disabled { opacity: 0.3; cursor: not-allowed; }
        .ctrl-chip.active { color: var(--blue); background: rgba(74,144,217,0.1); border-color: rgba(74,144,217,0.35); }

        .play-btn { font-family: var(--sans); font-size: 0.78rem; font-weight: 500; padding: 7px 18px; border-radius: 6px; border: 1px solid rgba(74,144,217,0.4); background: linear-gradient(135deg, var(--blue), #6baee8); color: white; cursor: pointer; transition: all 0.15s; box-shadow: 0 4px 14px var(--blue-glow); min-width: 82px; }
        .play-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(74,144,217,0.35); }
        .play-btn.playing { background: rgba(74,217,120,0.15); border-color: rgba(74,217,120,0.4); color: #4ad978; animation: ttsGlow 2s ease-in-out infinite; }
        .play-btn.loading { opacity: 0.6; cursor: wait; }

        .reader-status { padding: 48px 0; text-align: center; font-size: 0.88rem; }
        .reader-dots { display: flex; align-items: center; gap: 5px; justify-content: center; }
        .reader-dots span { width: 7px; height: 7px; border-radius: 50%; background: var(--blue); animation: bounce 1.3s infinite ease-in-out; }
        .reader-dots span:nth-child(2) { animation-delay: 0.15s; }
        .reader-dots span:nth-child(3) { animation-delay: 0.3s; }

        .reader-body { flex: 1; overflow-y: auto; padding: 24px 28px; display: flex; flex-direction: column; gap: 2px; }
        .reader-body::-webkit-scrollbar { width: 3px; }
        .reader-body::-webkit-scrollbar-thumb { background: var(--ink-4); border-radius: 2px; }

        .reader-line { font-family: var(--serif); font-size: 1.05rem; line-height: 1.9; color: var(--text-mid); padding: 8px 14px; margin: 0 -14px; border-radius: 6px; cursor: pointer; transition: background 0.15s, color 0.15s; border-left: 2px solid transparent; }
        .reader-line:hover { background: rgba(255,255,255,0.03); color: var(--text); }
        .reader-line.active { color: var(--text) !important; background: rgba(74,144,217,0.07) !important; border-left-color: var(--blue); padding-left: 16px; }

        @media (max-width: 900px) {
          .nav { padding: 0 24px; }
          .page-header { padding: 36px 24px 28px; }
          .books-main { padding: 32px 24px 60px; }
        }
        @media (max-width: 600px) {
          .books-grid { grid-template-columns: 1fr 1fr; }
          .page-chips { display: none; }
          .reader-panel { max-height: 95vh; }
          .reader-body { padding: 16px 18px; }
        }
      `}</style>

      {/* ── NAV ── */}
      <nav className="nav">
        <Link href="/" className="nav-brand">
          <div className="nav-logo">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/>
              <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/>
            </svg>
          </div>
          <span className="nav-name">At<em>las</em></span>
        </Link>

        <div className="nav-divider"/>
        <div className="nav-badge">
          <span className="nav-badge-dot"/>
          Books
        </div>

        <Link href="/chat" className="nav-link">Chat with Atlas</Link>
        <span className="nav-link nav-link-active">Search Books</span>

        <div className="nav-spacer"/>

        {isLoading ? (
          <div style={{ width: 80, height: 34, borderRadius: 20, background: "rgba(255,255,255,0.04)" }}/>
        ) : (
          <UserMenu name={userName}/>
        )}
      </nav>

      <div className="page-wrap">
        {/* ── Page header ── */}
        <div className="page-header">
          <div className="page-header-inner">
            <div className="page-eyebrow">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
              </svg>
              Atlas · Book Library
            </div>
            <h1 className="page-title">
              Classics, read <em>aloud</em>
            </h1>
            <p className="page-sub">Search 70,000+ public domain books — read the full text, or listen via ElevenLabs narration</p>
            <div className="page-chips">
              <span className="page-chip">Project Gutenberg</span>
              <span className="page-chip">Free &amp; Public Domain</span>
              <span className="page-chip">ElevenLabs TTS</span>
            </div>
          </div>
        </div>

        {/* ── Main ── */}
        <main className="books-main">
          <div className="search-wrap">
            <input
              ref={inputRef}
              className="search-input"
              placeholder="Search by title or author… e.g. Shakespeare, Frankenstein"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && search()}
            />
            <button className="search-btn" onClick={search} disabled={!query.trim() || loading} title="Search">
              {loading ? (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="spin">
                  <path d="M21 12a9 9 0 1 1-6.22-8.56"/>
                </svg>
              ) : (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
              )}
            </button>
          </div>

          {!searched && (
            <div className="empty-state">
              <div className="empty-icon">📚</div>
              <p className="empty-title">Search for a book to begin</p>
              <p className="empty-sub">title · author · subject</p>
            </div>
          )}

          {searched && !loading && books.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">🔍</div>
              <p className="empty-title">No books found</p>
              <p className="empty-sub">try a different search term</p>
            </div>
          )}

          <div className="books-grid">
            {books.map((book, i) => (
              <div
                key={book.id}
                className="book-card"
                style={{ animationDelay: `${i * 30}ms` }}
                onClick={() => setSelected(book)}
              >
                <div className="book-card-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4a90d9" strokeWidth="1.5">
                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                  </svg>
                </div>
                <p className="book-card-title">{book.title}</p>
                <p className="book-card-author">{book.authors.map(a => a.name).join(", ") || "Unknown author"}</p>
                <div className="book-card-footer">
                  <span className="book-read-tag">Read + Listen</span>
                  <span className="book-downloads">{book.download_count?.toLocaleString() ?? "—"}</span>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>

      {selected && <BookReader book={selected} onClose={() => setSelected(null)}/>}
    </>
  );
}