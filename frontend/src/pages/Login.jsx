import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Loader2, AlertTriangle, Fingerprint, Mail, ShieldCheck, Database } from 'lucide-react';

const Login = () => {
  const [isMentor, setIsMentor] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { session, userProfile, loading: authLoading } = useAuth();
  const [dbStatus, setDbStatus] = useState({ students: 0, sessions: 0, checking: true });

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

  // Only auto-redirect if we have BOTH a session AND a loaded profile
  // If profile is null (missing from DB), stay on login so user can see the error
  if (!authLoading && session && userProfile) {
    return <Navigate to="/" replace />;
  }

  const handleLogin = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const email = isMentor ? identifier.trim().toLowerCase() : `${identifier.trim().toLowerCase()}@example.com`;
    // For students, the default password is their USN (usually uppercase)
    const authPassword = isMentor ? password : password.trim().toUpperCase();

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: authPassword,
    });

    if (signInError) {
      if (signInError.message.includes('Invalid login credentials')) {
        setError(
          isMentor
            ? 'Invalid email or password. Verify your mentor credentials.'
            : `Invalid USN or password. Use your USN as the default password.`
        );
      } else {
        setError(signInError.message);
      }
      setSubmitting(false);
    } else {
      navigate(location.state?.from?.pathname || '/');
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0B11] relative overflow-hidden flex flex-col items-center justify-center p-6">
      {/* Background Aesthetic Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent-glow/10 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-success/5 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute top-[20%] right-[10%] w-[20%] h-[20%] bg-accent-glow/5 blur-[80px] rounded-full pointer-events-none"></div>

      {/* Main Login Card */}
      <div className="relative w-full max-w-[480px] z-10">
        <div className="bg-surface-raised/40 backdrop-blur-2xl border border-white/10 rounded-[48px] px-10 py-14 shadow-[0_40px_100px_rgba(0,0,0,0.6)]">
          
          {/* Logo & Header */}
          <div className="flex flex-col items-center mb-12">
            <div className="w-16 h-16 bg-accent-glow border-4 border-white/10 rounded-[24px] mb-6 flex items-center justify-center shadow-[0_0_30px_rgba(99,102,241,0.4)]">
               <Fingerprint className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-[32px] font-bold text-fg-primary tracking-tight mb-2">ForgeTrack</h1>
            <p className="text-fg-tertiary font-medium">Bootcamp Intelligence Platform</p>
          </div>

          {/* Banner for stale sessions */}
          {noProfileReason && (
            <div className="mb-8 p-4 rounded-2xl bg-warning/5 border border-warning/20 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-warning shrink-0" />
              <p className="text-sm text-warning leading-relaxed font-medium">
                Your session was reset as your profile data wasn't found. Please log in again.
              </p>
            </div>
          )}

          {/* Role Selection Tabs */}
          <div className="flex bg-void/50 rounded-2xl p-1.5 mb-10 border border-white/5">
            <button
              type="button"
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all duration-300 ${
                !isMentor
                  ? 'bg-white text-void shadow-[0_10px_20px_rgba(0,0,0,0.2)]'
                  : 'text-fg-tertiary hover:text-fg-secondary'
              }`}
              onClick={() => { setIsMentor(false); setIdentifier(''); setError(null); }}
            >
              <ShieldCheck className={`w-4 h-4 ${!isMentor ? 'text-void' : 'text-fg-tertiary'}`} />
              Student
            </button>
            <button
              type="button"
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all duration-300 ${
                isMentor
                  ? 'bg-white text-void shadow-[0_10px_20px_rgba(0,0,0,0.2)]'
                  : 'text-fg-tertiary hover:text-fg-secondary'
              }`}
              onClick={() => { setIsMentor(true); setIdentifier(''); setError(null); }}
            >
              <Mail className={`w-4 h-4 ${isMentor ? 'text-void' : 'text-fg-tertiary'}`} />
              Mentor
            </button>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="bg-danger/10 border border-danger/20 text-danger p-4 rounded-2xl text-sm font-medium leading-relaxed animate-in fade-in slide-in-from-top-2">
                {error}
              </div>
            )}

            <div className="space-y-3">
              <label className="block text-[11px] font-bold text-fg-tertiary uppercase tracking-widest ml-1">
                {isMentor ? 'Email Address' : 'Identification USN'}
              </label>
              <div className="relative group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-fg-tertiary group-focus-within:text-accent-glow transition-colors">
                   {isMentor ? <Mail className="w-5 h-5" /> : <Fingerprint className="w-5 h-5" />}
                </div>
                <input
                  type={isMentor ? 'email' : 'text'}
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full bg-void/50 border border-white/5 rounded-2xl h-14 pl-14 pr-6 text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:border-accent-glow/50 transition-all font-medium"
                  placeholder={isMentor ? 'mentor@theforge.com' : '4SH24CS001'}
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-[11px] font-bold text-fg-tertiary uppercase tracking-widest ml-1">Secure Password</label>
              <div className="relative group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-fg-tertiary group-focus-within:text-accent-glow transition-colors">
                   <ShieldCheck className="w-5 h-5" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-void/50 border border-white/5 rounded-2xl h-14 pl-14 pr-6 text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:border-accent-glow/50 transition-all font-medium"
                  placeholder="••••••••"
                />
              </div>
              {!isMentor && (
                <p className="text-[11px] text-fg-tertiary/60 ml-1">
                   Initial password is your USN (uppercase).
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting || !identifier || !password}
              className="w-full bg-accent-glow text-white h-16 rounded-[24px] font-bold text-[17px] hover:shadow-[0_20px_40px_rgba(99,102,241,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-3 mt-4"
            >
              {submitting ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Enter Platform'}
            </button>
          </form>

          {/* DB Status Footer */}
          <div className="mt-12 pt-10 border-t border-white/5 flex flex-col items-center">
            <div className="flex items-center gap-2 mb-4 bg-void/30 px-4 py-2 rounded-full border border-white/5">
              <Database className="w-3.5 h-3.5 text-fg-tertiary" />
              <span className="text-[10px] font-black text-fg-tertiary uppercase tracking-[0.2em]">Live Database State</span>
            </div>
            
            <div className="flex gap-8">
              <div className="flex flex-col items-center">
                <span className={`text-[20px] font-bold mb-1 ${dbStatus.students > 0 ? 'text-fg-primary' : 'text-danger'}`}>
                   {dbStatus.checking ? '...' : dbStatus.students}
                </span>
                <span className="text-[9px] font-bold text-fg-tertiary uppercase tracking-widest">Students</span>
              </div>
              <div className="w-px h-8 bg-white/5"></div>
              <div className="flex flex-col items-center">
                <span className={`text-[20px] font-bold mb-1 ${dbStatus.sessions > 0 ? 'text-fg-primary' : 'text-danger'}`}>
                   {dbStatus.checking ? '...' : dbStatus.sessions}
                </span>
                <span className="text-[9px] font-bold text-fg-tertiary uppercase tracking-widest">Sessions</span>
              </div>
            </div>
            
            {dbStatus.students === 0 && !dbStatus.checking && (
              <div className="mt-8 p-3 rounded-xl bg-danger/5 border border-danger/20">
                 <p className="text-[10px] font-bold text-danger text-center">
                    SYSTEM SYNC REQUIRED: Run RECOVERY.sql
                 </p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default Login;
