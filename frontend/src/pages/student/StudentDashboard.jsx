import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  BookOpen, 
  ArrowRight
} from 'lucide-react';

const StudentDashboard = () => {
  const { userProfile } = useAuth();
  const [stats, setStats] = useState({ present: 0, total: 0, percentage: 0 });
  const [nextSession, setNextSession] = useState(null);
  const [recentMaterials, setRecentMaterials] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        // Only fetch attendance if student_id is available
        if (userProfile?.student_id) {
          const { data: attData } = await supabase
            .from('attendance')
            .select('present')
            .eq('student_id', userProfile.student_id);

          if (attData) {
            const present = attData.filter(a => a.present).length;
            const total = attData.length;
            const percentage = total > 0 ? (present / total) * 100 : 0;
            setStats({ present, total, percentage });
          }
        }

        // Fetch next upcoming session (always attempt)
        const todayStr = new Date().toISOString().split('T')[0];
        const { data: sessData } = await supabase
          .from('sessions')
          .select('*')
          .gte('date', todayStr)
          .order('date', { ascending: true })
          .limit(1);
        if (sessData && sessData.length > 0) setNextSession(sessData[0]);

        // Fetch latest material (always attempt)
        const { data: matData } = await supabase
          .from('materials')
          .select('*, sessions(topic)')
          .order('created_at', { ascending: false })
          .limit(1);
        setRecentMaterials(matData || []);

      } catch (err) {
        console.error('[StudentDashboard] fetch error:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [userProfile]);

  const name = userProfile?.display_name?.split(' ')[0] || 'Student';

  return (
    <div className="space-y-10 pb-20">
      
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[44px] font-bold text-fg-primary tracking-tight leading-tight">
            Welcome back, <span className="text-accent-glow">{name}</span>
          </h1>
          <p className="text-body-lg text-fg-tertiary mt-2">
            Track your learning journey and upcoming milestones.
          </p>
        </div>
        <div className="text-right pt-2">
          <p className="text-[10px] font-black text-fg-tertiary uppercase tracking-widest mb-1">CURRENT STATUS</p>
          <p className="text-[15px] font-bold text-success">Active Learner</p>
        </div>
      </div>

      {/* ── Top KPI Row ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">

        {/* Attendance Card */}
        <div className="bg-surface-raised/40 border border-white/5 rounded-[28px] p-7 flex flex-col shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <div className="w-10 h-10 rounded-xl bg-accent-glow/10 border border-accent-glow/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-accent-glow" />
            </div>
            <span className="text-[10px] font-black text-fg-tertiary uppercase tracking-widest">ATTENDANCE</span>
          </div>
          <div className="mt-auto">
            <div className="text-[38px] font-bold text-fg-primary leading-none mb-2">
              {loading ? '...' : `${Math.round(stats.percentage)}%`}
            </div>
            <div className="text-[11px] font-medium text-fg-tertiary">Overall Participation</div>
          </div>
        </div>

        {/* Classes Card */}
        <div className="bg-surface-raised/40 border border-white/5 rounded-[28px] p-7 flex flex-col shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <div className="w-10 h-10 rounded-xl bg-success/10 border border-success/20 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-success" />
            </div>
            <span className="text-[10px] font-black text-fg-tertiary uppercase tracking-widest">CLASSES</span>
          </div>
          <div className="mt-auto">
            <div className="text-[38px] font-bold text-fg-primary leading-none mb-2">
              {loading ? '...' : <span>{stats.present} <span className="text-[22px] text-fg-tertiary">/ {stats.total}</span></span>}
            </div>
            <div className="text-[11px] font-medium text-fg-tertiary">Sessions Attended</div>
          </div>
        </div>

        {/* Next Class Card — spans 2 cols */}
        <div className="md:col-span-2 bg-surface-raised/40 border border-white/5 rounded-[28px] p-7 flex items-center justify-between shadow-xl">
          <div>
            <h3 className="text-[22px] font-bold text-fg-primary mb-3">Your Next Class</h3>
            {loading ? (
              <div className="h-4 w-40 bg-white/5 rounded animate-pulse" />
            ) : nextSession ? (
              <div>
                <p className="text-accent-glow font-bold text-[17px] mb-1">{nextSession.topic}</p>
                <p className="text-fg-tertiary text-sm flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {new Date(nextSession.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                </p>
              </div>
            ) : (
              <p className="text-fg-tertiary text-[15px]">No sessions scheduled yet.</p>
            )}
          </div>
          <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-fg-tertiary flex-shrink-0">
            <Clock className="w-8 h-8" />
          </div>
        </div>
      </div>

      {/* ── Bottom Row ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* New Resources */}
        <div className="lg:col-span-2 bg-surface-raised/40 border border-white/5 rounded-[28px] p-8 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[19px] font-bold text-fg-primary">New Resources Available</h2>
            <Link to="/me/materials" className="text-[13px] font-bold text-accent-glow flex items-center gap-1.5 hover:gap-3 transition-all">
              All Materials <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {loading ? (
            <div className="border-2 border-dashed border-white/5 rounded-2xl h-24 animate-pulse bg-white/[0.02]" />
          ) : recentMaterials.length > 0 ? (
            <div className="space-y-3">
              {recentMaterials.map(m => (
                <a key={m.id} href={m.url} target="_blank" rel="noopener noreferrer"
                   className="flex items-center gap-4 border border-white/5 rounded-2xl p-5 hover:bg-white/[0.03] transition-all group">
                  <div className="w-10 h-10 rounded-xl bg-accent-glow/10 border border-accent-glow/20 flex items-center justify-center text-accent-glow flex-shrink-0">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-fg-primary group-hover:text-accent-glow transition-colors truncate">{m.title}</p>
                    <p className="text-sm text-fg-tertiary">{m.sessions?.topic}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-fg-tertiary group-hover:text-accent-glow transition-colors flex-shrink-0" />
                </a>
              ))}
            </div>
          ) : (
            <div className="border-2 border-dashed border-white/[0.07] rounded-2xl py-10 flex items-center justify-center">
              <p className="text-fg-tertiary text-[15px] font-medium">No materials uploaded yet.</p>
            </div>
          )}
        </div>

        {/* Quick Navigation */}
        <div className="bg-surface-raised/40 border border-white/5 rounded-[28px] p-8 shadow-xl">
          <h2 className="text-[19px] font-bold text-fg-primary mb-6">Quick Navigation</h2>
          <div className="space-y-4">

            <Link to="/me/attendance"
              className="group flex items-center gap-4 p-5 bg-white/[0.03] border border-white/5 rounded-2xl hover:bg-white/[0.06] hover:border-accent-glow/20 transition-all">
              <div className="w-11 h-11 rounded-xl bg-accent-glow/10 border border-accent-glow/20 flex items-center justify-center text-accent-glow flex-shrink-0 group-hover:scale-110 transition-transform">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[15px] font-bold text-fg-primary group-hover:text-accent-glow transition-colors">Check History</p>
                <p className="text-[10px] font-black text-fg-tertiary uppercase tracking-widest opacity-60">FULL RECORDS</p>
              </div>
            </Link>

            <Link to="/me/materials"
              className="group flex items-center gap-4 p-5 bg-white/[0.03] border border-white/5 rounded-2xl hover:bg-white/[0.06] hover:border-accent-glow/20 transition-all">
              <div className="w-11 h-11 rounded-xl bg-accent-glow/10 border border-accent-glow/20 flex items-center justify-center text-accent-glow flex-shrink-0 group-hover:scale-110 transition-transform">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[15px] font-bold text-fg-primary group-hover:text-accent-glow transition-colors">Study Notes</p>
                <p className="text-[10px] font-black text-fg-tertiary uppercase tracking-widest opacity-60">RESOURCES</p>
              </div>
            </Link>

          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
