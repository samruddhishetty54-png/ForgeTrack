import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Loader2, AlertTriangle } from 'lucide-react';

const Login = () => {
  const [isMentor, setIsMentor] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { session } = useAuth();
  const [dbStatus, setDbStatus] = useState({ students: 0, sessions: 0, checking: true });

  // Check if we were redirected here due to a missing profile
  const searchParams = new URLSearchParams(location.search);
  const noProfileReason = searchParams.get('reason') === 'no_profile';

  useEffect(() => {
    async function checkDb() {
      try {
        const { count: students } = await supabase
          .from('students')
          .select('*', { count: 'exact', head: true });
        const { count: sessions } = await supabase
          .from('sessions')
          .select('*', { count: 'exact', head: true });
        setDbStatus({ students: students || 0, sessions: sessions || 0, checking: false });
      } catch (err) {
        setDbStatus({ students: 0, sessions: 0, checking: false, error: true });
      }
    }
    checkDb();
  }, []);

  // If already logged in and has a valid session, redirect away
  if (session) {
    return <Navigate to="/" replace />;
  }

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const email = isMentor ? identifier : `${identifier.trim().toUpperCase()}@forge.local`;

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      if (signInError.message.includes('Invalid login credentials')) {
        setError(
          isMentor
            ? 'Invalid email or password. Check your mentor credentials.'
            : `Invalid USN or password. Make sure you use your USN as the password (e.g. 4SH24CS001).`
        );
      } else {
        setError(signInError.message);
      }
      setLoading(false);
    } else {
      // Navigate to root — RootRedirect will send to the right page based on role
      navigate(location.state?.from?.pathname || '/');
    }
  };

  return (
    <div className="min-h-screen bg-void bg-cosmic-glow bg-no-repeat flex flex-col items-center justify-center p-6">
      <div className="card w-full max-w-[440px] px-8 py-12 flex flex-col items-center">

        {/* Logo/Brand */}
        <div className="w-12 h-12 bg-accent-glow/20 border border-accent-glow/50 rounded-xl mb-4 flex items-center justify-center">
          <div className="w-6 h-6 bg-accent-glow rounded-md shadow-[0_0_20px_rgba(99,102,241,0.4)]"></div>
        </div>
        <h2 className="text-h2 font-display mb-8">ForgeTrack</h2>

        {/* No-profile banner: shown after auto sign-out due to stale session */}
        {noProfileReason && (
          <div className="w-full mb-6 p-3 rounded-lg bg-warning/10 border border-warning/30 flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-warning mt-0.5 shrink-0" />
            <p className="text-caption text-warning leading-relaxed">
              Your previous session was reset because your account profile wasn't found.
              Please sign in again.
            </p>
          </div>
        )}

        {/* Tab Toggle */}
        <div className="flex w-full bg-surface-inset rounded-full p-1 mb-8 border border-border-default">
          <button
            type="button"
            className={`flex-1 text-sm font-medium py-2 rounded-full transition-colors ${
              !isMentor
                ? 'bg-surface-raised text-fg-primary shadow-[0_1px_2px_rgba(0,0,0,0.3),0_0_0_1px_rgba(255,255,255,0.06)]'
                : 'text-fg-tertiary hover:text-fg-secondary'
            }`}
            onClick={() => { setIsMentor(false); setIdentifier(''); setError(null); }}
          >
            Student Login
          </button>
          <button
            type="button"
            className={`flex-1 text-sm font-medium py-2 rounded-full transition-colors ${
              isMentor
                ? 'bg-surface-raised text-fg-primary shadow-[0_1px_2px_rgba(0,0,0,0.3),0_0_0_1px_rgba(255,255,255,0.06)]'
                : 'text-fg-tertiary hover:text-fg-secondary'
            }`}
            onClick={() => { setIsMentor(true); setIdentifier(''); setError(null); }}
          >
            Mentor Login
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="w-full space-y-5">
          {error && (
            <div className="bg-danger-bg border border-danger-border text-danger p-3 rounded-md text-caption leading-relaxed">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="block text-label text-fg-secondary">
              {isMentor ? 'EMAIL ADDRESS' : 'USN'}
            </label>
            <input
              type={isMentor ? 'email' : 'text'}
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="input-field"
              placeholder={isMentor ? 'nischay@theboringpeople.in' : '4SH24CS001'}
              autoComplete={isMentor ? 'email' : 'username'}
            />
          </div>

          <div className="space-y-2">
            <label className="block text-label text-fg-secondary">PASSWORD</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
              placeholder={isMentor ? '••••••••' : 'Your USN (e.g. 4SH24CS001)'}
              autoComplete="current-password"
            />
            {!isMentor && (
              <p className="text-[11px] text-fg-tertiary">
                Default password is your USN (e.g. <code className="bg-surface-inset px-1 rounded">4SH24CS001</code>)
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !identifier || !password}
            className="btn-primary w-full mt-8"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign In'}
          </button>
        </form>

        {/* Database Status */}
        <div className="mt-8 pt-8 border-t border-border-subtle w-full flex flex-col items-center">
          <p className="text-micro text-fg-tertiary uppercase mb-3 tracking-widest">Database Sync Status</p>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                dbStatus.checking
                  ? 'bg-fg-tertiary animate-pulse'
                  : dbStatus.students > 0
                    ? 'bg-success shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                    : 'bg-danger shadow-[0_0_8px_rgba(244,63,94,0.5)]'
              }`} />
              <span className="text-caption text-fg-secondary">
                {dbStatus.checking ? 'Checking...' : `${dbStatus.students} Students`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                dbStatus.checking
                  ? 'bg-fg-tertiary animate-pulse'
                  : dbStatus.sessions > 0
                    ? 'bg-success shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                    : 'bg-danger shadow-[0_0_8px_rgba(244,63,94,0.5)]'
              }`} />
              <span className="text-caption text-fg-secondary">
                {dbStatus.checking ? 'Checking...' : `${dbStatus.sessions} Sessions`}
              </span>
            </div>
          </div>
          {dbStatus.students === 0 && dbStatus.sessions === 0 && !dbStatus.checking && (
            <p className="mt-4 text-[11px] text-danger/80 text-center leading-relaxed">
              Data not found. Run <code className="bg-danger/10 px-1 rounded">seed.sql</code> in your Supabase SQL Editor.
            </p>
          )}
        </div>

      </div>
    </div>
  );
};

export default Login;
