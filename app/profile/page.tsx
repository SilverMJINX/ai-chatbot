"use client";

import { useState, useEffect, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type UserProfile = {
  id:        string;
  name:      string;
  email:     string;
  createdAt: string;
};

// Helpers 
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-MY", {
    year: "month", month: "long", day: "numeric",
  });
}

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map(w => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// User Menu 
function UserMenu({ name }: { name: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div className="user-menu-wrap" ref={ref}>
      <button className="user-menu-btn" onClick={() => setOpen(o => !o)}>
        <div className="user-avatar-sm">{name.charAt(0).toUpperCase()}</div>
        <span className="user-name-sm">{name}</span>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      {open && (
        <div className="user-dropdown">
          <Link href="/chat"    className="user-dropdown-item" onClick={() => setOpen(false)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            Chat with Atlas
          </Link>
          <Link href="/books"   className="user-dropdown-item" onClick={() => setOpen(false)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
            My Library
          </Link>
          <Link href="/profile" className="user-dropdown-item" onClick={() => setOpen(false)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            Profile
          </Link>
          <div className="user-dropdown-divider"/>
          <button className="user-dropdown-item user-dropdown-signout" onClick={() => signOut({ callbackUrl: "/login" })}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

// Main Page 
export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [profile,   setProfile]   = useState<UserProfile | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");
  const [editName,  setEditName]  = useState("");
  const [editing,   setEditing]   = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [saveMsg,   setSaveMsg]   = useState("");

  // Redirect if not logged in
  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  // Fetch profile from MongoDB
  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/profile")
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); return; }
        setProfile(data);
        setEditName(data.name);
      })
      .catch(() => setError("Failed to load profile."))
      .finally(() => setLoading(false));
  }, [status]);

  const handleSaveName = async () => {
    if (!editName.trim() || editName === profile?.name) { setEditing(false); return; }
    setSaving(true);
    try {
      const res  = await fetch("/api/profile", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ name: editName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setProfile(prev => prev ? { ...prev, name: editName } : prev);
      setSaveMsg("Name updated!");
      setEditing(false);
      setTimeout(() => setSaveMsg(""), 3000);
    } catch (e: any) {
      setError(e.message || "Failed to update name.");
    } finally {
      setSaving(false);
    }
  };

  const displayName = profile?.name || session?.user?.name || "Reader";

  if (status === "loading" || loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#0d0d0f", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4a90d9" strokeWidth="2" style={{ animation: "spin 0.8s linear infinite" }}>
            <path d="M21 12a9 9 0 1 1-6.22-8.56"/>
          </svg>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.7rem", color: "#5a5854", letterSpacing: "0.1em", textTransform: "uppercase" }}>
            Loading profile…
          </span>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=DM+Sans:wght@300;400;500&family=DM+Mono:wght@400&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { min-height: 100vh; }

        :root {
          --ink:        #0d0d0f;
          --ink-2:      #16161a;
          --ink-3:      #1f1f24;
          --ink-4:      #2a2a32;
          --blue:       #4a90d9;
          --blue-glow:  rgba(74,144,217,0.18);
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

        body { font-family: var(--sans); background: var(--ink); color: var(--text); }

        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: var(--ink-2); }
        ::-webkit-scrollbar-thumb { background: var(--ink-4); border-radius: 2px; }

        @keyframes spin       { to { transform: rotate(360deg); } }
        @keyframes fadeUp     { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse      { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        @keyframes dropdownIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes avatarGlow { 0%, 100% { box-shadow: 0 0 0 0 rgba(74,144,217,0.25); } 50% { box-shadow: 0 0 32px 8px rgba(74,144,217,0.12); } }

        /* ── Nav ── */
        .nav {
          position: sticky; top: 0; z-index: 50;
          height: 64px; padding: 0 48px;
          display: flex; align-items: center; gap: 12px;
          background: rgba(13,13,15,0.92);
          border-bottom: 1px solid var(--border);
          backdrop-filter: blur(14px);
        }

        .nav-brand { display: flex; align-items: center; gap: 10px; text-decoration: none; flex-shrink: 0; }
        .nav-logo  { width: 32px; height: 32px; border-radius: 9px; background: linear-gradient(135deg, var(--blue), #6baee8); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 16px var(--blue-glow); }
        .nav-name  { font-family: var(--serif); font-size: 1.45rem; font-weight: 600; color: var(--text); letter-spacing: 0.01em; }
        .nav-name em { color: var(--blue); font-style: normal; }
        .nav-divider { width: 1px; height: 22px; background: var(--border); }
        .nav-link { font-size: 0.8rem; font-weight: 500; color: var(--text-mid); text-decoration: none; padding: 6px 13px; border-radius: 20px; border: 1px solid transparent; transition: all 0.15s; }
        .nav-link:hover { color: var(--text); border-color: var(--border-mid); background: rgba(255,255,255,0.04); }
        .nav-spacer { flex: 1; }

        .user-menu-wrap { position: relative; }
        .user-menu-btn  { display: flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.04); border: 1px solid var(--border-mid); border-radius: 20px; padding: 5px 12px 5px 5px; cursor: pointer; transition: all 0.15s; color: var(--text); }
        .user-menu-btn:hover { background: rgba(255,255,255,0.07); border-color: rgba(255,255,255,0.18); }
        .user-avatar-sm { width: 26px; height: 26px; border-radius: 50%; background: linear-gradient(135deg, var(--blue), #6baee8); display: flex; align-items: center; justify-content: center; font-size: 0.68rem; font-weight: 700; color: white; flex-shrink: 0; }
        .user-name-sm   { font-size: 0.78rem; font-weight: 500; color: var(--text); }
        .user-dropdown  { position: absolute; top: calc(100% + 8px); right: 0; min-width: 180px; background: var(--ink-2); border: 1px solid var(--border-mid); border-radius: 10px; padding: 6px; box-shadow: 0 16px 40px rgba(0,0,0,0.5); animation: dropdownIn 0.18s cubic-bezier(0.22,1,0.36,1) both; z-index: 200; }
        .user-dropdown-item { display: flex; align-items: center; gap: 9px; width: 100%; padding: 9px 12px; border-radius: 6px; font-size: 0.78rem; font-weight: 500; color: var(--text-mid); text-decoration: none; background: none; border: none; cursor: pointer; transition: all 0.12s; text-align: left; font-family: var(--sans); }
        .user-dropdown-item:hover { background: rgba(255,255,255,0.05); color: var(--text); }
        .user-dropdown-divider { height: 1px; background: var(--border); margin: 4px 0; }
        .user-dropdown-signout { color: #f87171 !important; }
        .user-dropdown-signout:hover { background: rgba(248,113,113,0.08) !important; color: #fca5a5 !important; }

        /* ── Page body ── */
        .profile-page {
          min-height: calc(100vh - 64px);
          background: linear-gradient(160deg, #0d0d0f 0%, #13131a 60%, #0a0a10 100%);
          background-image:
            radial-gradient(ellipse 60% 40% at 80% 10%, rgba(74,144,217,0.07) 0%, transparent 60%),
            radial-gradient(ellipse 40% 30% at 10% 90%, rgba(201,168,76,0.04) 0%, transparent 50%),
            linear-gradient(160deg, #0d0d0f 0%, #13131a 60%, #0a0a10 100%);
          padding: 60px 24px 80px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .profile-wrap {
          width: 100%;
          max-width: 680px;
          animation: fadeUp 0.6s cubic-bezier(0.22,1,0.36,1) both;
        }

        /* ── Page header ── */
        .page-eyebrow {
          display: inline-flex; align-items: center; gap: 7px;
          font-family: var(--mono); font-size: 0.65rem;
          letter-spacing: 0.16em; text-transform: uppercase;
          color: var(--blue); margin-bottom: 16px;
          padding: 5px 10px; border: 1px solid rgba(74,144,217,0.25);
          border-radius: 4px; background: rgba(74,144,217,0.06);
        }

        .page-eyebrow-dot {
          width: 5px; height: 5px; border-radius: 50%;
          background: var(--blue); animation: pulse 2.5s ease infinite;
        }

        .page-title {
          font-family: var(--serif); font-size: 2.6rem; font-weight: 300;
          color: var(--text); letter-spacing: -0.01em; line-height: 1.1;
          margin-bottom: 6px;
        }

        .page-title em { font-style: italic; color: var(--gold-light); }

        .page-sub {
          font-size: 0.84rem; color: var(--text-dim);
          margin-bottom: 40px;
        }

        /* ── Avatar card ── */
        .avatar-card {
          background: var(--ink-2);
          border: 1px solid var(--border-mid);
          border-radius: 20px;
          padding: 36px;
          display: flex;
          align-items: center;
          gap: 28px;
          margin-bottom: 20px;
          position: relative;
          overflow: hidden;
        }

        .avatar-card::before {
          content: '';
          position: absolute; top: -40%; right: -5%;
          width: 220px; height: 220px; border-radius: 50%;
          background: radial-gradient(circle, rgba(74,144,217,0.07) 0%, transparent 70%);
          pointer-events: none;
        }

        .avatar-lg {
          width: 96px; height: 96px; border-radius: 50%;
          background: linear-gradient(135deg, var(--blue), #6baee8);
          display: flex; align-items: center; justify-content: center;
          font-family: var(--serif); font-size: 2.4rem; font-weight: 400;
          color: white; flex-shrink: 0;
          box-shadow: 0 8px 32px rgba(74,144,217,0.3);
          animation: avatarGlow 4s ease-in-out infinite;
        }

        .avatar-info { flex: 1; min-width: 0; }

        .avatar-name {
          font-family: var(--serif); font-size: 1.8rem; font-weight: 400;
          color: var(--text); letter-spacing: -0.01em; line-height: 1.2;
          margin-bottom: 4px;
        }

        .avatar-email {
          font-family: var(--mono); font-size: 0.75rem;
          color: var(--text-mid); letter-spacing: 0.04em;
          margin-bottom: 12px;
        }

        .avatar-badge {
          display: inline-flex; align-items: center; gap: 6px;
          font-family: var(--mono); font-size: 0.6rem;
          letter-spacing: 0.12em; text-transform: uppercase;
          color: var(--gold); padding: 4px 10px;
          border: 1px solid rgba(201,168,76,0.3); border-radius: 4px;
          background: rgba(201,168,76,0.06);
        }

        /* ── Info cards grid ── */
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
          margin-bottom: 20px;
        }

        .info-card {
          background: var(--ink-2);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 22px 24px;
          transition: border-color 0.15s;
        }

        .info-card:hover { border-color: var(--border-mid); }

        .info-card-label {
          font-family: var(--mono); font-size: 0.6rem;
          letter-spacing: 0.14em; text-transform: uppercase;
          color: var(--text-dim); margin-bottom: 8px;
          display: flex; align-items: center; gap: 7px;
        }

        .info-card-label svg { opacity: 0.5; }

        .info-card-value {
          font-family: var(--serif); font-size: 1.15rem; font-weight: 400;
          color: var(--text); line-height: 1.3;
        }

        .info-card-sub {
          font-size: 0.72rem; color: var(--text-dim);
          margin-top: 4px;
        }

        /* ── Stat row ── */
        .stat-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
          margin-bottom: 20px;
        }

        .stat-card {
          background: var(--ink-2);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 20px;
          text-align: center;
        }

        .stat-num {
          font-family: var(--serif); font-size: 2rem; font-weight: 300;
          color: var(--text); line-height: 1;
          letter-spacing: -0.02em; margin-bottom: 6px;
        }

        .stat-label {
          font-family: var(--mono); font-size: 0.58rem;
          letter-spacing: 0.12em; text-transform: uppercase;
          color: var(--text-dim);
        }

        /* ── Edit name panel ── */
        .edit-panel {
          background: var(--ink-2);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 24px;
          margin-bottom: 20px;
        }

        .edit-panel-title {
          font-family: var(--mono); font-size: 0.62rem;
          letter-spacing: 0.14em; text-transform: uppercase;
          color: var(--text-dim); margin-bottom: 14px;
          display: flex; align-items: center; gap: 8px;
        }

        .edit-row {
          display: flex; gap: 10px; align-items: flex-end;
        }

        .edit-field {
          flex: 1;
          display: flex; flex-direction: column; gap: 6px;
        }

        .edit-label {
          font-size: 0.72rem; font-weight: 500;
          color: var(--text-mid); letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .edit-input {
          width: 100%; padding: 11px 14px;
          background: rgba(255,255,255,0.03);
          border: 1px solid var(--border-mid); border-radius: 8px;
          font-family: var(--sans); font-size: 0.9rem;
          color: var(--text); outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
          caret-color: var(--blue);
        }

        .edit-input::placeholder { color: var(--text-dim); }
        .edit-input:focus {
          border-color: rgba(74,144,217,0.5);
          box-shadow: 0 0 0 3px rgba(74,144,217,0.1);
        }

        .edit-input:disabled {
          opacity: 0.5; cursor: not-allowed;
        }

        .edit-actions { display: flex; gap: 8px; flex-shrink: 0; }

        .btn-save {
          padding: 11px 20px; border-radius: 8px; border: none;
          background: linear-gradient(135deg, var(--blue), #6baee8);
          color: white; font-family: var(--sans); font-size: 0.82rem; font-weight: 500;
          cursor: pointer; transition: all 0.15s;
          box-shadow: 0 4px 14px var(--blue-glow);
          display: flex; align-items: center; gap: 6px;
          white-space: nowrap;
        }

        .btn-save:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(74,144,217,0.35); }
        .btn-save:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

        .btn-cancel {
          padding: 10px 16px; border-radius: 8px;
          border: 1px solid var(--border-mid);
          background: rgba(255,255,255,0.03); color: var(--text-mid);
          font-family: var(--sans); font-size: 0.82rem; font-weight: 500;
          cursor: pointer; transition: all 0.15s; white-space: nowrap;
        }

        .btn-cancel:hover { background: rgba(255,255,255,0.06); color: var(--text); }

        .save-success {
          display: inline-flex; align-items: center; gap: 6px;
          font-family: var(--mono); font-size: 0.65rem;
          color: #4adda0; letter-spacing: 0.06em;
          padding: 6px 12px; border-radius: 6px;
          background: rgba(74,217,160,0.08);
          border: 1px solid rgba(74,217,160,0.2);
          margin-top: 10px;
          animation: fadeUp 0.2s ease;
        }

        /* ── Danger zone ── */
        .danger-zone {
          background: var(--ink-2);
          border: 1px solid rgba(248,113,113,0.15);
          border-radius: 14px;
          padding: 22px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }

        .danger-text h3 {
          font-family: var(--mono); font-size: 0.72rem;
          letter-spacing: 0.1em; text-transform: uppercase;
          color: #f87171; margin-bottom: 4px;
        }

        .danger-text p {
          font-size: 0.78rem; color: var(--text-dim);
        }

        .btn-signout {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 10px 18px; border-radius: 8px;
          border: 1px solid rgba(248,113,113,0.3);
          background: rgba(248,113,113,0.06); color: #f87171;
          font-family: var(--sans); font-size: 0.82rem; font-weight: 500;
          cursor: pointer; transition: all 0.15s; white-space: nowrap;
        }

        .btn-signout:hover { background: rgba(248,113,113,0.12); border-color: rgba(248,113,113,0.5); }

        /* ── Error ── */
        .profile-error {
          display: flex; align-items: center; gap: 8px;
          background: rgba(248,113,113,0.08);
          border: 1px solid rgba(248,113,113,0.2);
          border-radius: 8px; padding: 12px 16px;
          font-size: 0.82rem; color: #fca5a5;
          margin-bottom: 20px;
        }

        @media (max-width: 640px) {
          .nav { padding: 0 20px; }
          .profile-page { padding: 36px 16px 60px; }
          .avatar-card { flex-direction: column; text-align: center; padding: 28px 20px; }
          .info-grid  { grid-template-columns: 1fr; }
          .stat-row   { grid-template-columns: repeat(3, 1fr); }
          .danger-zone { flex-direction: column; align-items: flex-start; }
          .edit-row { flex-direction: column; }
          .edit-actions { width: 100%; }
          .btn-save, .btn-cancel { flex: 1; justify-content: center; }
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
        <div className="nav-divider" />
        <Link href="/chat"  className="nav-link">Chat</Link>
        <Link href="/books" className="nav-link">Library</Link>
        <div className="nav-spacer" />
        <UserMenu name={displayName} />
      </nav>

      {/* ── BODY ── */}
      <div className="profile-page">
        <div className="profile-wrap">

          {/* Header */}
          <div className="page-eyebrow">
            <span className="page-eyebrow-dot" />
            Account
          </div>
          <h1 className="page-title">Your <em>profile</em></h1>
          <p className="page-sub">Manage your account details and preferences.</p>

          {/* Error */}
          {error && (
            <div className="profile-error">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {error}
            </div>
          )}

          {profile && (
            <>
              {/* Avatar card */}
              <div className="avatar-card">
                <div className="avatar-lg">{getInitials(profile.name)}</div>
                <div className="avatar-info">
                  <h2 className="avatar-name">{profile.name}</h2>
                  <p className="avatar-email">{profile.email}</p>
                  <span className="avatar-badge">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z"/></svg>
                    Atlas Member
                  </span>
                </div>
              </div>

              {/* Stats */}
              <div className="stat-row">
                <div className="stat-card">
                  <div className="stat-num">{daysSince(profile.createdAt)}</div>
                  <div className="stat-label">Days with Atlas</div>
                </div>
                <div className="stat-card">
                  <div className="stat-num" style={{ color: "var(--blue)", fontSize: "1.1rem", paddingTop: 6 }}>
                    {new Date(profile.createdAt).toLocaleDateString("en-MY", { month: "short", year: "numeric" })}
                  </div>
                  <div className="stat-label">Member since</div>
                </div>
                <div className="stat-card">
                  <div className="stat-num" style={{ fontSize: "1.4rem", paddingTop: 4 }}>
                    {getInitials(profile.name)}
                  </div>
                  <div className="stat-label">Initials</div>
                </div>
              </div>

              {/* Info grid */}
              <div className="info-grid">
                <div className="info-card">
                  <div className="info-card-label">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    Full name
                  </div>
                  <div className="info-card-value">{profile.name}</div>
                </div>

                <div className="info-card">
                  <div className="info-card-label">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                    Email address
                  </div>
                  <div className="info-card-value" style={{ fontSize: "0.95rem", fontFamily: "var(--mono)", letterSpacing: "0.02em" }}>
                    {profile.email}
                  </div>
                </div>

                <div className="info-card">
                  <div className="info-card-label">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    Account created
                  </div>
                  <div className="info-card-value">
                    {new Date(profile.createdAt).toLocaleDateString("en-MY", { year: "numeric", month: "long", day: "numeric" })}
                  </div>
                  <div className="info-card-sub">
                    {new Date(profile.createdAt).toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>

                <div className="info-card">
                  <div className="info-card-label">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    Account ID
                  </div>
                  <div className="info-card-value" style={{ fontSize: "0.72rem", fontFamily: "var(--mono)", color: "var(--text-dim)", letterSpacing: "0.04em", wordBreak: "break-all" }}>
                    {profile.id}
                  </div>
                </div>
              </div>

              {/* Edit name */}
              <div className="edit-panel">
                <div className="edit-panel-title">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  Edit display name
                </div>
                <div className="edit-row">
                  <div className="edit-field">
                    <label className="edit-label" htmlFor="editName">Display name</label>
                    <input
                      id="editName"
                      type="text"
                      className="edit-input"
                      value={editName}
                      onChange={e => { setEditName(e.target.value); setEditing(true); }}
                      placeholder="Your name"
                      disabled={saving}
                    />
                  </div>
                  <div className="edit-actions">
                    <button
                      className="btn-save"
                      onClick={handleSaveName}
                      disabled={saving || !editName.trim() || editName === profile.name}
                    >
                      {saving
                        ? <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: "spin 0.7s linear infinite" }}><path d="M21 12a9 9 0 1 1-6.22-8.56"/></svg>Saving…</>
                        : <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>Save</>
                      }
                    </button>
                    {editing && editName !== profile.name && (
                      <button className="btn-cancel" onClick={() => { setEditName(profile.name); setEditing(false); }}>
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
                {saveMsg && (
                  <div className="save-success">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    {saveMsg}
                  </div>
                )}
              </div>

              {/* Danger zone */}
              <div className="danger-zone">
                <div className="danger-text">
                  <h3>Sign out</h3>
                  <p>End your current session and return to the login page.</p>
                </div>
                <button className="btn-signout" onClick={() => signOut({ callbackUrl: "/login" })}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                    <polyline points="16 17 21 12 16 7"/>
                    <line x1="21" y1="12" x2="9" y2="12"/>
                  </svg>
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}