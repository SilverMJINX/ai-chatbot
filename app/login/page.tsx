"use client";

import { useState, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  // Redirect if already logged in
  useEffect(() => {
    if (status === "authenticated") router.push("/");
  }, [status, router]);

  // Show error from URL params (e.g. NextAuth callback errors)
  useEffect(() => {
    const err = searchParams.get("error");
    if (err === "CredentialsSignin") setError("Invalid email or password.");
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError("Please fill in all fields."); return; }
    setLoading(true);
    setError("");

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      setError("Invalid email or password.");
    } else {
      router.push("/");
    }
  };

  if (status === "loading") return null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=DM+Sans:wght@300;400;500&family=DM+Mono:wght@400&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; }

        body {
          font-family: 'DM Sans', sans-serif;
          background: #0d0d0f;
          color: #e8e6e1;
          min-height: 100vh;
        }

        :root {
          --ink:        #0d0d0f;
          --ink-2:      #16161a;
          --ink-3:      #1f1f24;
          --ink-4:      #2a2a32;
          --blue:       #4a90d9;
          --blue-glow:  rgba(74,144,217,0.18);
          --blue-mid:   #bfdbfe;
          --gold-light: #e8c97a;
          --text:       #e8e6e1;
          --text-mid:   #9b9890;
          --text-dim:   #5a5854;
          --border:     rgba(255,255,255,0.06);
          --border-mid: rgba(255,255,255,0.11);
          --serif:      'Cormorant Garamond', Georgia, serif;
          --sans:       'DM Sans', sans-serif;
          --mono:       'DM Mono', monospace;
        }

        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #2a2a32; border-radius: 2px; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        /* ── Layout ── */
        .auth-layout {
          min-height: 100vh;
          display: grid;
          grid-template-columns: 1fr 1fr;
        }

        /* ── Left panel — decorative ── */
        .auth-left {
          position: relative;
          background: linear-gradient(160deg, #0d0d0f 0%, #13131a 60%, #0a0a10 100%);
          display: flex; flex-direction: column;
          justify-content: space-between;
          padding: 48px;
          overflow: hidden;
        }

        .auth-left::before {
          content: '';
          position: absolute; top: -20%; left: -10%;
          width: 500px; height: 500px; border-radius: 50%;
          background: radial-gradient(circle, rgba(74,144,217,0.1) 0%, transparent 70%);
          pointer-events: none;
        }

        .auth-left::after {
          content: '';
          position: absolute; bottom: -10%; right: -10%;
          width: 350px; height: 350px; border-radius: 50%;
          background: radial-gradient(circle, rgba(201,168,76,0.06) 0%, transparent 70%);
          pointer-events: none;
        }

        /* Book stack decoration */
        .book-stack {
          position: absolute;
          right: 40px; top: 50%;
          transform: translateY(-50%);
          display: flex; flex-direction: column; gap: 5px;
          opacity: 0.15;
        }

        .book-spine {
          height: 180px;
          border-radius: 3px;
          background: linear-gradient(180deg, var(--ink-3), var(--ink-4));
        }

        .auth-brand {
          position: relative; z-index: 2;
          display: flex; align-items: center; gap: 10px;
          text-decoration: none;
        }

        .auth-brand-logo {
          width: 36px; height: 36px; border-radius: 10px;
          background: linear-gradient(135deg, var(--blue), #6baee8);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 16px var(--blue-glow);
        }

        .auth-brand-name {
          font-family: var(--serif); font-size: 1.5rem; font-weight: 600;
          color: var(--text); letter-spacing: 0.01em;
        }

        .auth-brand-name em { color: var(--blue); font-style: normal; }

        .auth-left-content {
          position: relative; z-index: 2;
        }

        .auth-left-quote {
          font-family: var(--serif); font-size: 2.2rem; font-weight: 300;
          line-height: 1.2; color: var(--text);
          letter-spacing: -0.01em; margin-bottom: 20px;
        }

        .auth-left-quote em { font-style: italic; color: var(--gold-light); }

        .auth-left-sub {
          font-size: 0.88rem; font-weight: 300;
          color: var(--text-mid); line-height: 1.7;
          max-width: 340px;
        }

        .auth-left-footer {
          position: relative; z-index: 2;
          font-family: var(--mono); font-size: 0.62rem;
          color: var(--text-dim); letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        /* ── Right panel — form ── */
        .auth-right {
          background: var(--ink-2);
          display: flex; align-items: center; justify-content: center;
          padding: 48px;
          border-left: 1px solid var(--border);
        }

        .auth-form-wrap {
          width: 100%; max-width: 380px;
          animation: fadeUp 0.6s cubic-bezier(0.22,1,0.36,1) both;
        }

        .auth-form-eyebrow {
          display: inline-flex; align-items: center; gap: 7px;
          font-family: var(--mono); font-size: 0.65rem;
          letter-spacing: 0.16em; text-transform: uppercase;
          color: var(--blue); margin-bottom: 20px;
          padding: 5px 10px; border: 1px solid rgba(74,144,217,0.25);
          border-radius: 4px; background: rgba(74,144,217,0.06);
        }

        .auth-eyebrow-dot {
          width: 5px; height: 5px; border-radius: 50%;
          background: var(--blue); animation: pulse 2.5s ease infinite;
        }

        .auth-form-title {
          font-family: var(--serif); font-size: 2.4rem; font-weight: 300;
          color: var(--text); letter-spacing: -0.01em;
          line-height: 1.1; margin-bottom: 8px;
        }

        .auth-form-title em { font-style: italic; color: var(--gold-light); }

        .auth-form-sub {
          font-size: 0.82rem; color: var(--text-dim);
          margin-bottom: 32px; line-height: 1.6;
        }

        /* ── Form fields ── */
        .field { margin-bottom: 16px; }

        .field-label {
          display: block; font-size: 0.72rem; font-weight: 500;
          color: var(--text-mid); letter-spacing: 0.04em;
          text-transform: uppercase; margin-bottom: 7px;
        }

        .field-input-wrap { position: relative; }

        .field-input {
          width: 100%; padding: 12px 16px;
          background: rgba(255,255,255,0.04);
          border: 1px solid var(--border-mid);
          border-radius: 8px;
          font-family: var(--sans); font-size: 0.9rem;
          color: var(--text); outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
          caret-color: var(--blue);
        }

        .field-input::placeholder { color: var(--text-dim); }

        .field-input:focus {
          border-color: rgba(74,144,217,0.5);
          box-shadow: 0 0 0 3px rgba(74,144,217,0.1);
          background: rgba(74,144,217,0.04);
        }

        .field-input.has-icon { padding-right: 44px; }

        .field-icon-btn {
          position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
          background: none; border: none; cursor: pointer;
          color: var(--text-dim); padding: 4px;
          display: flex; align-items: center; justify-content: center;
          transition: color 0.15s; border-radius: 4px;
        }

        .field-icon-btn:hover { color: var(--text-mid); }

        /* ── Error ── */
        .auth-error {
          display: flex; align-items: center; gap: 8px;
          background: rgba(248,113,113,0.08);
          border: 1px solid rgba(248,113,113,0.25);
          border-radius: 8px; padding: 10px 14px;
          font-size: 0.8rem; color: #fca5a5;
          margin-bottom: 16px;
          animation: fadeUp 0.2s ease;
        }

        /* ── Submit button ── */
        .auth-submit {
          width: 100%; padding: 13px;
          border-radius: 8px; border: none;
          background: linear-gradient(135deg, var(--blue), #6baee8);
          color: white; font-family: var(--sans);
          font-size: 0.9rem; font-weight: 500;
          cursor: pointer; letter-spacing: 0.02em;
          box-shadow: 0 6px 20px var(--blue-glow);
          transition: all 0.18s; margin-top: 8px;
          display: flex; align-items: center; justify-content: center; gap: 8px;
        }

        .auth-submit:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 10px 28px rgba(74,144,217,0.35); }
        .auth-submit:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }

        .spinner {
          width: 16px; height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white; border-radius: 50%;
          animation: spin 0.65s linear infinite;
        }

        /* ── Divider ── */
        .auth-divider {
          display: flex; align-items: center; gap: 12px;
          margin: 20px 0;
        }

        .auth-divider-line {
          flex: 1; height: 1px; background: var(--border-mid);
        }

        .auth-divider-text {
          font-size: 0.7rem; color: var(--text-dim);
          font-family: var(--mono); letter-spacing: 0.08em;
        }

        /* ── Switch link ── */
        .auth-switch {
          text-align: center; font-size: 0.8rem; color: var(--text-dim);
        }

        .auth-switch a {
          color: var(--blue); text-decoration: none; font-weight: 500;
          transition: opacity 0.15s;
        }

        .auth-switch a:hover { opacity: 0.75; }

        /* ── Responsive ── */
        @media (max-width: 768px) {
          .auth-layout { grid-template-columns: 1fr; }
          .auth-left { display: none; }
          .auth-right { padding: 32px 24px; }
        }
      `}</style>

      <div className="auth-layout">

        {/* Left decorative panel */}
        <div className="auth-left">
          <div className="book-stack">
            {[60,45,55,40,50,48,52].map((w, i) => (
              <div key={i} className="book-spine" style={{ width: w }} />
            ))}
          </div>

          <Link href="/" className="auth-brand">
            <div className="auth-brand-logo">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/>
                <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/>
              </svg>
            </div>
            <span className="auth-brand-name">At<em>las</em></span>
          </Link>

          <div className="auth-left-content">
            <div className="auth-left-quote">
              Books that <em>heal,</em><br />stories that stay
            </div>
            <p className="auth-left-sub">
              Your personal AI therapist and reading companion. Sign in to continue your journey.
            </p>
          </div>

          <div className="auth-left-footer">
            Powered by Gemini · ElevenLabs · Project Gutenberg
          </div>
        </div>

        {/* Right form panel */}
        <div className="auth-right">
          <div className="auth-form-wrap">

            <div className="auth-form-eyebrow">
              <span className="auth-eyebrow-dot" />
              Welcome back
            </div>

            <h1 className="auth-form-title">
              Sign in to<br /><em>Atlas</em>
            </h1>
            <p className="auth-form-sub">
              Enter your email and password to continue your session.
            </p>

            <form onSubmit={handleSubmit}>
              {error && (
                <div className="auth-error">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  {error}
                </div>
              )}

              <div className="field">
                <label className="field-label" htmlFor="email">Email address</label>
                <div className="field-input-wrap">
                  <input
                    id="email"
                    type="email"
                    className="field-input"
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <div className="field">
                <label className="field-label" htmlFor="password">Password</label>
                <div className="field-input-wrap">
                  <input
                    id="password"
                    type={showPass ? "text" : "password"}
                    className="field-input has-icon"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    className="field-icon-btn"
                    onClick={() => setShowPass(p => !p)}
                    tabIndex={-1}
                    aria-label={showPass ? "Hide password" : "Show password"}
                  >
                    {showPass ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="auth-submit"
                disabled={loading}
              >
                {loading ? (
                  <><div className="spinner" /> Signing in…</>
                ) : (
                  <>
                    Sign in
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="5" y1="12" x2="19" y2="12"/>
                      <polyline points="12 5 19 12 12 19"/>
                    </svg>
                  </>
                )}
              </button>
            </form>

            <div className="auth-divider">
              <div className="auth-divider-line" />
              <span className="auth-divider-text">or</span>
              <div className="auth-divider-line" />
            </div>

            <p className="auth-switch">
              Don&apos;t have an account?{" "}
              <Link href="/register">Create one</Link>
            </p>

          </div>
        </div>
      </div>
    </>
  );
}