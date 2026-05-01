"use client";
import { useState, useEffect, useRef } from "react";
import { useElevenLabsTTS } from "../../hooks/useElevenLabsTTS";

interface Book {
  id: number;
  title: string;
  authors: { name: string }[];
  subjects: string[];
  formats: Record<string, string>;
  download_count: number;
}

// Book Reader Modal
function BookReader({ book, onClose }: { book: Book; onClose: () => void }) {
  const [text, setText]       = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [section, setSection] = useState(0);
  const { speak, stop, status } = useElevenLabsTTS();

  // Split into ~3000 char readable sections
  const sections = text
    .split(/\n{3,}/)
    .map(s => s.trim())
    .filter(s => s.length > 100);

  const current = sections[section] ?? '';

  useEffect(() => {
    setLoading(true);
    fetch(`/api/books/${book.id}/text`)
      .then(r => r.ok ? r.text() : Promise.reject())
      .then(t => setText(t))
      .catch(() => setError('Full text unavailable for this book.'))
      .finally(() => setLoading(false));
    return () => stop(); // stop audio when modal closes
  }, [book.id]);

  return (
    <>
      <style>{`
        .reader-overlay {
          position: fixed; inset: 0;
          background: rgba(30,58,95,0.5);
          backdrop-filter: blur(4px);
          z-index: 100;
          display: flex; align-items: center; justify-content: center;
          padding: 24px;
        }
        .reader-panel {
          background: #ffffff;
          border-radius: 20px;
          width: 100%; max-width: 720px;
          max-height: 88vh;
          display: flex; flex-direction: column;
          box-shadow: 0 4px 20px rgba(37,99,168,0.1);
          overflow: hidden;
        }
        .reader-header {
          padding: 20px 24px;
          border-bottom: 1px solid #d0e4f7;
          display: flex; align-items: flex-start;
          justify-content: space-between; gap: 12px;
          flex-shrink: 0;
        }
        .reader-title  { font-size: 1rem; font-weight: 700; color: #1e3a5f; }
        .reader-author { font-size: 0.8rem; color: #8aaac8; margin-top: 3px; }
        .reader-controls {
          padding: 12px 20px;
          border-bottom: 1px solid #d0e4f7;
          display: flex; align-items: center; gap: 10px;
          flex-shrink: 0; flex-wrap: wrap;
        }
        .reader-body { flex: 1; overflow-y: auto; padding: 24px; }
        .reader-text {
          white-space: pre-wrap; word-break: break-word;
          font-family: Georgia, serif;
          font-size: 0.97rem; line-height: 1.9;
          color: #1e3a5f;
        }
        .reader-status {
          padding: 48px 24px; text-align: center; color: #8aaac8;
          font-size: 0.9rem;
        }
        .reader-status.error { color: #b91c1c; }
        .section-label { font-size: 0.72rem; color: #8aaac8; margin-left: auto; }
        .close-btn {
          width: 32px; height: 32px; border-radius: 10px;
          border: 1.5px solid #d0e4f7; background: #f0f6ff;
          color: #4a6080; cursor: pointer; font-size: 1rem;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .close-btn:hover { background: #dbeafe; }
        .nav-btn {
          font-size: 0.75rem; font-weight: 600;
          padding: 6px 14px; border-radius: 20px;
          border: 1.5px solid #bfdbfe;
          background: #eff6ff; color: #2563a8;
          cursor: pointer;
        }
        .nav-btn:disabled { opacity: 0.35; cursor: not-allowed; }
        .tts-reader-btn {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 0.76rem; font-weight: 600;
          padding: 6px 14px 6px 11px; border-radius: 20px;
          border: 1.5px solid #bfdbfe; background: #ffffff;
          color: #2563a8; cursor: pointer;
          box-shadow: 0 1px 4px rgba(37,99,168,0.10);
        }
        .tts-reader-btn.playing {
          background: #f0fdf4; border-color: #86efac; color: #166534;
        }
        .tts-reader-btn.loading { opacity: 0.7; cursor: wait; }
      `}</style>

      <div className="reader-overlay" onClick={onClose}>
        <div className="reader-panel" onClick={e => e.stopPropagation()}>

          <div className="reader-header">
            <div>
              <p className="reader-title">{book.title}</p>
              <p className="reader-author">
                {book.authors.map(a => a.name).join(', ')}
              </p>
            </div>
            <button className="close-btn" onClick={onClose}>✕</button>
          </div>

          {!loading && !error && sections.length > 0 && (
            <div className="reader-controls">
              <button
                className={`tts-reader-btn ${status === 'playing' ? 'playing' : ''} ${status === 'loading' ? 'loading' : ''}`}
                onClick={() => status === 'playing' ? stop() : speak(current)}
              >
                {status === 'idle'    && <><span>▶</span> Listen</>}
                {status === 'loading' && <><span className="spin">↻</span> Loading…</>}
                {status === 'playing' && <><span>⏹</span> Stop</>}
              </button>

              <button className="nav-btn" disabled={section === 0}
                onClick={() => { stop(); setSection(s => s - 1); }}>
                ← Prev
              </button>
              <button className="nav-btn" disabled={section >= sections.length - 1}
                onClick={() => { stop(); setSection(s => s + 1); }}>
                Next →
              </button>

              <span className="section-label">
                Part {section + 1} of {sections.length}
              </span>
            </div>
          )}

          <div className="reader-body">
            {loading && <p className="reader-status">Loading book text…</p>}
            {error   && <p className="reader-status error">{error}</p>}
            {!loading && !error && (
              <pre className="reader-text">{current}</pre>
            )}
          </div>

        </div>
      </div>
    </>
  );
}

// Books Search Page
export default function BooksPage() {
  const [query, setQuery]       = useState('');
  const [books, setBooks]       = useState<Book[]>([]);
  const [loading, setLoading]   = useState(false);
  const [selected, setSelected] = useState<Book | null>(null);
  const [searched, setSearched] = useState(false);

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res  = await fetch(`/api/books/search?q=${encodeURIComponent(query)}`);
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
        /* paste your full <style> block from chat/page.tsx here */
        /* plus these book-page specific styles: */
        .books-page {
          max-width: 900px; margin: 0 auto;
          padding: 36px 24px;
        }
        .books-title {
          font-family: 'Fraunces', Georgia, serif;
          font-size: 1.6rem; font-weight: 600;
          color: #1e3a5f; margin-bottom: 6px;
        }
        .books-subtitle {
          font-size: 0.82rem; color: #8aaac8; margin-bottom: 28px;
        }
        .search-row {
          display: flex; gap: 10px; margin-bottom: 32px;
        }
        .search-input {
          flex: 1; border: 2px solid #d0e4f7;
          border-radius: 14px; padding: 12px 18px;
          font-size: 0.9rem; font-family: 'Plus Jakarta Sans', sans-serif;
          color: #1e3a5f; outline: none; background: #ffffff;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .search-input:focus {
          border-color: #4a90d9;
          box-shadow: 0 0 0 4px rgba(74,144,217,0.12);
        }
        .search-btn {
          padding: 12px 22px; border-radius: 14px; border: none;
          background: linear-gradient(135deg, #4a90d9, #6baee8);
          color: white; font-weight: 600; font-size: 0.88rem;
          cursor: pointer; white-space: nowrap;
          box-shadow: 0 4px 14px rgba(74,144,217,0.25);
          font-family: 'Plus Jakarta Sans', sans-serif;
        }
        .search-btn:hover { transform: translateY(-1px); }
        .books-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 16px;
        }
        .book-card {
          background: #ffffff; border: 1px solid #d0e4f7;
          border-radius: 16px; padding: 18px;
          cursor: pointer; transition: all 0.18s;
          box-shadow: 0 1px 4px rgba(37,99,168,0.07);
        }
        .book-card:hover {
          border-color: #4a90d9;
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(74,144,217,0.15);
        }
        .book-card-title {
          font-size: 0.88rem; font-weight: 700;
          color: #1e3a5f; margin-bottom: 5px;
          line-height: 1.4;
          display: -webkit-box; -webkit-line-clamp: 2;
          -webkit-box-orient: vertical; overflow: hidden;
        }
        .book-card-author {
          font-size: 0.74rem; color: #8aaac8; margin-bottom: 12px;
          display: -webkit-box; -webkit-line-clamp: 1;
          -webkit-box-orient: vertical; overflow: hidden;
        }
        .book-card-footer {
          display: flex; align-items: center;
          justify-content: space-between;
        }
        .empty-state {
          text-align: center; padding: 60px 0;
          color: #8aaac8; font-size: 0.9rem;
        }
      `}</style>

      <div className="books-page">
        <h1 className="books-title">📚 Book Library</h1>
        <p className="books-subtitle">
          Search 70,000+ free classic books · read full text · listen via ElevenLabs
        </p>

        <div className="search-row">
          <input
            className="search-input"
            placeholder="Search by title or author… e.g. Shakespeare, Frankenstein"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && search()}
          />
          <button className="search-btn" onClick={search} disabled={loading}>
            {loading ? 'Searching…' : 'Search'}
          </button>
        </div>

        {!searched && (
          <p className="empty-state">Search for a book above to get started</p>
        )}

        {searched && !loading && books.length === 0 && (
          <p className="empty-state">No books found — try a different search</p>
        )}

        <div className="books-grid">
          {books.map(book => (
            <div key={book.id} className="book-card" onClick={() => setSelected(book)}>
              <p className="book-card-title">{book.title}</p>
              <p className="book-card-author">
                {book.authors.map(a => a.name).join(', ') || 'Unknown author'}
              </p>
              <div className="book-card-footer">
                <span className="chip chip-blue" style={{ fontSize: '0.68rem' }}>
                  Read + Listen
                </span>
                <span style={{ fontSize: '0.68rem', color: '#8aaac8' }}>
                  #{book.id}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selected && (
        <BookReader book={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}