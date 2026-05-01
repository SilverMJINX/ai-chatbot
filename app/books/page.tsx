'use client';
import { useState } from 'react';
import { BookReader } from '@/components/BookReader';

interface Book {
  id: number; title: string;
  authors: { name: string }[];
  subjects: string[];
  formats: Record<string, string>;
  download_count: number;
}

export default function BooksPage() {
  const [query, setQuery]     = useState('');
  const [books, setBooks]     = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Book | null>(null);

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true);
    const res  = await fetch(`/api/books/search?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    setBooks(data.results ?? []);
    setLoading(false);
  };

  return (
    <>
      {/* Reuse your topnav here */}
      <main style={{ maxWidth: 860, margin: '0 auto', padding: '32px 24px' }}>
        <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: '1.6rem', marginBottom: 24 }}>
          Find a Book
        </h1>

        <div className="input-wrapper" style={{ marginBottom: 32 }}>
          <input
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: '0.9rem',
                     fontFamily: 'Plus Jakarta Sans, sans-serif', color: 'var(--text)' }}
            placeholder="Search by title, author, or topic…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && search()}
          />
          <button className="icon-btn send-btn" onClick={search} type="button">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </button>
        </div>

        {loading && <p style={{ color: 'var(--text-soft)' }}>Searching…</p>}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px,1fr))', gap: 16 }}>
          {books.map(book => (
            <div key={book.id}
                 className="ai-bubble"  // reuses your card style
                 style={{ padding: 18, cursor: 'pointer', borderRadius: 16 }}
                 onClick={() => setSelected(book)}>
              <p style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 4 }}>
                {book.title}
              </p>
              <p style={{ fontSize: '0.77rem', color: 'var(--text-soft)', marginBottom: 10 }}>
                {book.authors.map(a => a.name).join(', ')}
              </p>
              <span className="chip chip-blue">
                {book.download_count.toLocaleString()} downloads
              </span>
            </div>
          ))}
        </div>
      </main>

      {selected && (
        <BookReader book={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}