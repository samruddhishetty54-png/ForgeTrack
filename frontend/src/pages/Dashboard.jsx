import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import {
  Users,
  TrendingUp,
  Calendar,
  Clock,
  ArrowRight,
  Plus,
} from 'lucide-react';

const Dashboard = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [latestSession, setLatestSession] = useState(null);
  const [upcomingSessions, setUpcomingSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  const firstName = userProfile?.display_name?.split(' ')[0] || 'Mentor';
  const role = userProfile?.role === 'mentor' ? 'Lead Mentor' : 'Student';

  useEffect(() => {
    fetchDashboardData();
  }, []);

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

      const avgAttendance = allAtt && allAtt.length > 0
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

  // Fake deadlines — replace with real data if you add an assignments table
  const deadlines = [
    { title: 'AI', dueInDays: 10, dueDate: '19/5/2026' },
  ];

  if (loading) {
    return (
      <div className="space-y-6 pb-12 animate-pulse">
        <div className="h-16 w-72 bg-white/5 rounded-xl" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-36 bg-white/5 rounded-2xl" />)}
        </div>
        <div className="h-16 bg-white/5 rounded-2xl" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-48 bg-white/5 rounded-2xl" />
          <div className="h-48 bg-white/5 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">

      {/* ── Welcome Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[32px] font-bold text-fg-primary tracking-tight">
            Welcome back, <span className="text-accent-glow">{firstName}</span>
          </h1>
          <p className="text-[14px] text-fg-tertiary mt-1">
            A birds-eye view of your cohort's performance and engagement.
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-fg-tertiary">Role</p>
          <p className="text-[14px] font-bold text-accent-glow">{role}</p>
        </div>
      </div>

      {/* ── 3-Column Stats Row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

        {/* Cohort Size */}
        <div className="bg-[#111118] border border-white/[0.07] rounded-2xl p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-accent-glow/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-accent-glow" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-fg-tertiary">Cohort Size</span>
          </div>
          <div>
            <div className="text-[40px] font-bold text-fg-primary leading-none">{stats?.activeStudents ?? 0}</div>
            <p className="text-[12px] text-fg-tertiary mt-1">Active Students</p>
          </div>
        </div>

        {/* Avg Attendance */}
        <div className="bg-[#111118] border border-white/[0.07] rounded-2xl p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-success/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-success" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-fg-tertiary">Avg Attendance</span>
          </div>
          <div>
            <div className="text-[40px] font-bold text-fg-primary leading-none">{stats?.avgAttendance ?? 0}%</div>
            <p className="text-[12px] text-fg-tertiary mt-1">Across all sessions</p>
          </div>
        </div>

        {/* Quick Links */}
        <div className="bg-[#111118] border border-white/[0.07] rounded-2xl p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-fg-secondary" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-fg-tertiary">Quick Link</span>
          </div>
          <div className="flex flex-col gap-2 mt-auto">
            <Link
              to="/attendance"
              className="w-full h-10 rounded-xl bg-white text-void text-[13px] font-bold flex items-center justify-center hover:bg-fg-secondary transition-all"
            >
              Take Attendance
            </Link>
            <Link
              to="/attendance"
              className="w-full h-10 rounded-xl bg-void border border-white/10 text-fg-primary text-[13px] font-semibold flex items-center justify-center hover:bg-white/5 transition-all"
            >
              Schedule Class
            </Link>
          </div>
        </div>
      </div>

      {/* ── Upcoming Schedule Reminder Banner ── */}
      <div className="bg-[#111118] border border-white/[0.07] rounded-2xl px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex items-center gap-4 flex-1">
          <div className="w-10 h-10 rounded-full bg-accent-glow flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-[15px] font-bold text-fg-primary">Upcoming Schedule Reminder</p>
            <p className="text-[13px] text-fg-tertiary mt-0.5">
              You have {upcomingSessions.length} session{upcomingSessions.length !== 1 ? 's' : ''} planned for this week.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 flex-shrink-0">
          {upcomingSessions.length === 0 ? (
            <p className="text-[13px] text-fg-tertiary italic">No upcoming sessions scheduled.</p>
          ) : (
            <p className="text-[13px] text-fg-secondary">
              Next: <span className="text-fg-primary font-semibold">{upcomingSessions[0]?.topic}</span>
            </p>
          )}
          <Link
            to="/attendance"
            className="px-5 h-9 rounded-xl bg-[#1c1c26] border border-white/10 text-fg-primary text-[13px] font-semibold flex items-center gap-1.5 hover:bg-white/5 transition-all"
          >
            View All <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* ── Bottom Two-Column ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Latest Session Activity */}
        <div className="bg-[#111118] border border-white/[0.07] rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[15px] font-bold text-fg-primary">Latest Session Activity</p>
            {latestSession && (
              <span className="text-[12px] text-fg-tertiary font-mono">{latestSession.date}</span>
            )}
          </div>

          {latestSession ? (
            <div className="bg-void border border-white/5 rounded-xl p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent-glow mb-2">Current Topic</p>
              <div className="flex items-center justify-between gap-4">
                <p className="text-[18px] font-bold text-fg-primary leading-snug flex-1">{latestSession.topic}</p>
                <Link
                  to="/attendance"
                  className="px-4 h-9 rounded-xl bg-white text-void text-[13px] font-bold flex items-center gap-1.5 hover:bg-fg-secondary transition-all shrink-0"
                >
                  Edit Attendance
                </Link>
              </div>
            </div>
          ) : (
            <div className="bg-void border border-white/5 rounded-xl p-5 flex flex-col items-center justify-center py-10 gap-3 text-center">
              <Calendar className="w-8 h-8 text-fg-tertiary/30" />
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
        <div className="bg-[#111118] border border-white/[0.07] rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[15px] font-bold text-fg-primary">Upcoming Deadlines</p>
            <span className="px-2.5 py-0.5 rounded-full bg-accent-glow/10 border border-accent-glow/20 text-[10px] font-bold text-accent-glow uppercase tracking-wider">
              Assignments
            </span>
          </div>

          <div className="space-y-2">
            {deadlines.map((d, i) => (
              <div key={i} className="flex items-center justify-between bg-void border border-white/5 rounded-xl px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-accent-glow" />
                  <div>
                    <p className="text-[14px] font-semibold text-fg-primary">{d.title}</p>
                    <p className="text-[11px] text-fg-tertiary">Due in {d.dueInDays} days</p>
                  </div>
                </div>
                <span className="text-[12px] text-fg-tertiary font-mono">{d.dueDate}</span>
              </div>
            ))}
          </div>

          <button className="w-full text-center text-[13px] text-accent-glow font-semibold hover:underline">
            Manage All Assignments
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
