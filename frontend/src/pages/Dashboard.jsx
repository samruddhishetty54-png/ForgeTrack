import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import {
  Users,
  TrendingUp,
  Zap,
  Clock,
  ArrowRight,
  Plus,
  CalendarCheck,
  AlertCircle,
} from 'lucide-react';

const Dashboard = () => {
  const { userProfile } = useAuth();
  const [stats, setStats] = useState(null);
  const [latestSession, setLatestSession] = useState(null);
  const [upcomingSessions, setUpcomingSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  const firstName = userProfile?.display_name?.split(' ')[0] || 'Mentor';
  const role = userProfile?.role === 'mentor' ? 'Lead Mentor' : 'Student';

  useEffect(() => { fetchDashboardData(); }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const todayStr = new Date().toISOString().split('T')[0];
      const [
        { count: activeStudents },
        { data: allAtt },
        { data: lastSessData },
        { data: upcomingSess },
      ] = await Promise.all([
        supabase.from('students').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('attendance').select('present'),
        supabase.from('sessions').select('*').order('date', { ascending: false }).limit(1),
        supabase.from('sessions').select('*').gte('date', todayStr).order('date', { ascending: true }).limit(5),
      ]);
      const avgAttendance = allAtt?.length > 0
        ? parseFloat(((allAtt.filter(a => a.present).length / allAtt.length) * 100).toFixed(1))
        : 0;
      setStats({ activeStudents: activeStudents ?? 0, avgAttendance });
      setLatestSession(lastSessData?.[0] || null);
      setUpcomingSessions(upcomingSess || []);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const deadlines = [
    { title: 'AI Assignment', dueInDays: 10, dueDate: '19/5/2026', urgent: false },
  ];

  if (loading) {
    return (
      <div className="space-y-5 pb-12 animate-pulse">
        <div className="h-20 w-80 bg-white/5 rounded-2xl" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-40 bg-white/5 rounded-2xl" />)}
        </div>
        <div className="h-18 bg-white/5 rounded-2xl" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-52 bg-white/5 rounded-2xl" />
          <div className="h-52 bg-white/5 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-12">

      {/* ── Welcome Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-fg-tertiary mb-1">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          <h1 className="text-[34px] font-bold text-fg-primary tracking-tight leading-tight">
            Welcome back, <span className="text-accent-glow">{firstName}</span>
          </h1>
          <p className="text-[13px] text-fg-tertiary mt-1">
            A birds-eye view of your cohort's performance and engagement.
          </p>
        </div>
        <div className="flex flex-col items-end mt-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-fg-tertiary">Role</p>
          <p className="text-[13px] font-bold text-accent-glow">{role}</p>
        </div>
      </div>

      {/* ── 3 Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

        {/* Cohort Size */}
        <div className="relative overflow-hidden bg-[#0f0f17] border border-white/[0.06] rounded-2xl p-6">
          <div className="absolute inset-0 bg-gradient-to-br from-accent-glow/5 to-transparent pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-5">
              <div className="w-8 h-8 rounded-xl bg-accent-glow/15 flex items-center justify-center">
                <Users className="w-4 h-4 text-accent-glow" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-fg-tertiary">Cohort Size</span>
            </div>
            <div className="text-[48px] font-black text-fg-primary leading-none tabular-nums">
              {stats?.activeStudents ?? 0}
            </div>
            <p className="text-[12px] text-fg-tertiary mt-2">Active Students</p>
          </div>
        </div>

        {/* Avg Attendance */}
        <div className="relative overflow-hidden bg-[#0f0f17] border border-white/[0.06] rounded-2xl p-6">
          <div className="absolute inset-0 bg-gradient-to-br from-success/5 to-transparent pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-5">
              <div className="w-8 h-8 rounded-xl bg-success/15 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-success" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-fg-tertiary">Avg Attendance</span>
            </div>
            <div className="text-[48px] font-black text-fg-primary leading-none tabular-nums">
              {stats?.avgAttendance ?? 0}
              <span className="text-[28px] font-bold text-fg-tertiary">%</span>
            </div>
            {/* Mini progress bar */}
            <div className="mt-3 h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-success transition-all duration-700"
                style={{ width: `${Math.min(stats?.avgAttendance ?? 0, 100)}%` }}
              />
            </div>
            <p className="text-[12px] text-fg-tertiary mt-1.5">Across all sessions</p>
          </div>
        </div>

        {/* Quick Links */}
        <div className="relative overflow-hidden bg-[#0f0f17] border border-white/[0.06] rounded-2xl p-6">
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
          <div className="relative z-10 flex flex-col h-full">
            <div className="flex items-center justify-between mb-5">
              <div className="w-8 h-8 rounded-xl bg-white/8 flex items-center justify-center">
                <Zap className="w-4 h-4 text-fg-secondary" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-fg-tertiary">Quick Actions</span>
            </div>
            <div className="flex flex-col gap-2.5 mt-auto">
              <Link
                to="/attendance"
                className="w-full h-10 rounded-xl bg-white text-void text-[13px] font-bold flex items-center justify-center gap-2 hover:bg-fg-secondary transition-all group"
              >
                <CalendarCheck className="w-4 h-4 group-hover:scale-110 transition-transform" />
                Take Attendance
              </Link>
              <Link
                to="/attendance"
                className="w-full h-10 rounded-xl bg-white/5 border border-white/8 text-fg-secondary text-[13px] font-semibold flex items-center justify-center gap-2 hover:bg-white/10 hover:text-fg-primary transition-all"
              >
                <Plus className="w-4 h-4" />
                Schedule Class
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── Upcoming Schedule Banner ── */}
      <div className="bg-[#0f0f17] border border-white/[0.06] rounded-2xl px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="w-9 h-9 rounded-full bg-accent-glow flex items-center justify-center shrink-0 shadow-[0_0_16px_rgba(99,102,241,0.4)]">
          <Clock className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1">
          <p className="text-[14px] font-bold text-fg-primary">Upcoming Schedule Reminder</p>
          <p className="text-[12px] text-fg-tertiary mt-0.5">
            You have <span className="text-fg-secondary font-semibold">{upcomingSessions.length}</span> session{upcomingSessions.length !== 1 ? 's' : ''} planned for this week.
          </p>
        </div>
        <div className="flex items-center gap-4 flex-shrink-0">
          {upcomingSessions.length === 0 ? (
            <p className="text-[12px] text-fg-tertiary italic">No upcoming sessions scheduled.</p>
          ) : (
            <p className="text-[12px] text-fg-secondary">
              Next: <span className="text-fg-primary font-semibold">{upcomingSessions[0]?.topic}</span>
            </p>
          )}
          <Link
            to="/attendance"
            className="px-4 h-8 rounded-xl bg-white/5 border border-white/8 text-fg-primary text-[12px] font-semibold flex items-center gap-1.5 hover:bg-white/10 transition-all"
          >
            View All <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* ── Bottom 2-col ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Latest Session Activity */}
        <div className="bg-[#0f0f17] border border-white/[0.06] rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[15px] font-bold text-fg-primary">Latest Session Activity</p>
            {latestSession && (
              <span className="text-[11px] font-mono text-fg-tertiary bg-white/5 border border-white/5 px-2.5 py-1 rounded-lg">
                {latestSession.date}
              </span>
            )}
          </div>

          {latestSession ? (
            <div className="bg-void border border-white/5 rounded-xl p-5 space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent-glow">Current Topic</p>
              <p className="text-[18px] font-bold text-fg-primary leading-snug">{latestSession.topic}</p>
              <div className="flex items-center gap-2 pt-1">
                <Link
                  to="/attendance"
                  className="px-4 h-9 rounded-xl bg-white text-void text-[13px] font-bold flex items-center gap-1.5 hover:bg-fg-secondary transition-all"
                >
                  Edit Attendance
                </Link>
                <span className="text-[11px] text-fg-tertiary uppercase tracking-wider border border-white/8 rounded-lg px-2.5 py-1">
                  {latestSession.session_type || 'Offline'}
                </span>
                <span className="text-[11px] text-fg-tertiary">{latestSession.duration_hours} hrs</span>
              </div>
            </div>
          ) : (
            <div className="bg-void border border-white/5 rounded-xl p-8 flex flex-col items-center justify-center gap-3 text-center">
              <CalendarCheck className="w-8 h-8 text-fg-tertiary/30" />
              <p className="text-fg-tertiary text-[13px]">No sessions recorded yet.</p>
              <Link
                to="/attendance"
                className="flex items-center gap-1.5 text-accent-glow text-[13px] font-semibold hover:underline"
              >
                <Plus className="w-3.5 h-3.5" /> Create First Session
              </Link>
            </div>
          )}
        </div>

        {/* Upcoming Deadlines */}
        <div className="bg-[#0f0f17] border border-white/[0.06] rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[15px] font-bold text-fg-primary">Upcoming Deadlines</p>
            <span className="px-2.5 py-1 rounded-lg bg-accent-glow/10 border border-accent-glow/15 text-[10px] font-bold text-accent-glow uppercase tracking-wider">
              Assignments
            </span>
          </div>

          <div className="space-y-2.5">
            {deadlines.map((d, i) => (
              <div
                key={i}
                className="flex items-center justify-between bg-void border border-white/5 rounded-xl px-4 py-3.5 group hover:border-accent-glow/20 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${d.urgent ? 'bg-danger shadow-[0_0_8px_rgba(244,63,94,0.6)]' : 'bg-accent-glow'}`} />
                  <div>
                    <p className="text-[14px] font-semibold text-fg-primary group-hover:text-accent-glow transition-colors">{d.title}</p>
                    <p className="text-[11px] text-fg-tertiary">
                      {d.urgent ? <span className="text-danger"><AlertCircle className="w-3 h-3 inline mr-1" />Urgent — </span> : ''}
                      Due in {d.dueInDays} days
                    </p>
                  </div>
                </div>
                <span className="text-[12px] text-fg-tertiary font-mono">{d.dueDate}</span>
              </div>
            ))}
            {deadlines.length === 0 && (
              <p className="text-center text-fg-tertiary text-[13px] py-6">No upcoming deadlines.</p>
            )}
          </div>

          <button className="w-full text-center text-[13px] text-accent-glow font-semibold hover:underline pt-1">
            Manage All Assignments →
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
