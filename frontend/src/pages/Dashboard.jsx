import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import {
  CalendarDays,
  Percent,
  Users,
  Clock,
  Plus,
  Activity,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';

const Dashboard = () => {
  const { userProfile } = useAuth();
  const [stats, setStats] = useState(null);
  const [todaySession, setTodaySession] = useState(null);
  const [programOverview, setProgramOverview] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true);

        // 1. Total Sessions
        const { count: totalSessions } = await supabase
          .from('sessions')
          .select('*', { count: 'exact', head: true });

        // 2. Active Students
        const { count: activeStudents } = await supabase
          .from('students')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true);

        // 3. Overall Attendance %
        const { data: allAtt } = await supabase
          .from('attendance')
          .select('present');
        let avgAttendance = 0;
        if (allAtt && allAtt.length > 0) {
          avgAttendance = (allAtt.filter(a => a.present).length / allAtt.length) * 100;
        }

        // 4. Last Session Date
        const { data: lastSessionData } = await supabase
          .from('sessions')
          .select('date, topic')
          .order('date', { ascending: false })
          .limit(1);
        const lastSession = lastSessionData?.[0] || null;

        setStats({
          totalSessions: totalSessions ?? 0,
          activeStudents: activeStudents ?? 0,
          avgAttendance: parseFloat(avgAttendance.toFixed(1)),
          lastSession,
        });

        // 5. Today's Session
        const todayStr = new Date().toISOString().split('T')[0];
        const { data: todaySess } = await supabase
          .from('sessions')
          .select('*')
          .eq('date', todayStr)
          .limit(1)
          .maybeSingle();
        setTodaySession(todaySess || null);

        // 6. Program Overview — per-student attendance rates
        const { data: studentAtt } = await supabase
          .from('attendance')
          .select('student_id, present, students(name)');

        if (studentAtt && studentAtt.length > 0) {
          const map = {};
          studentAtt.forEach(a => {
            const sid = a.student_id;
            const name = a.students?.name || 'Unknown';
            if (!map[sid]) map[sid] = { name, total: 0, present: 0 };
            map[sid].total++;
            if (a.present) map[sid].present++;
          });
          const entries = Object.values(map).map(s => ({
            name: s.name,
            pct: parseFloat(((s.present / s.total) * 100).toFixed(1)),
          }));
          const sorted = [...entries].sort((a, b) => b.pct - a.pct);
          setProgramOverview({
            highest: sorted[0] || null,
            lowest: sorted[sorted.length - 1] || null,
          });
        }

        // 7. Recent Activity — last 5 import_log or sessions
        const { data: importLogs } = await supabase
          .from('import_log')
          .select('filename, uploaded_at, imported_rows, status')
          .order('uploaded_at', { ascending: false })
          .limit(5);
        setRecentActivity(importLogs || []);

      } catch (err) {
        console.error('Dashboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const timeAgo = (dateStr) => {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  if (loading) {
    return (
      <div className="space-y-6 pb-12 animate-pulse">
        <div className="h-16 w-72 bg-white/5 rounded-xl" />
        <div className="grid grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-28 bg-white/5 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="h-44 bg-white/5 rounded-2xl" />
          <div className="h-44 bg-white/5 rounded-2xl" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="h-52 bg-white/5 rounded-2xl" />
          <div className="h-52 bg-white/5 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Welcome Header */}
      <div>
        <h1 className="text-[32px] font-bold text-fg-primary tracking-tight leading-tight">
          Welcome back, {userProfile?.display_name?.split(' ')[0] || 'Mentor'}
        </h1>
        <p className="text-[13px] text-fg-tertiary mt-1">{today}</p>
      </div>

      {/* ── Row 1: 4 KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Sessions */}
        <div className="bg-[#111118] border border-white/[0.07] rounded-2xl p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-fg-tertiary">Total Sessions</span>
            <CalendarDays className="w-4 h-4 text-fg-tertiary/60" />
          </div>
          <div className="text-[40px] font-bold text-fg-primary leading-none">
            {stats?.totalSessions ?? 0}
          </div>
        </div>

        {/* Overall Attendance */}
        <div className="bg-[#111118] border border-white/[0.07] rounded-2xl p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-fg-tertiary">Overall Attendance</span>
            <Percent className="w-4 h-4 text-fg-tertiary/60" />
          </div>
          <div className="text-[40px] font-bold text-fg-primary leading-none">
            {stats?.avgAttendance ?? 0}%
          </div>
        </div>

        {/* Active Students */}
        <div className="bg-[#111118] border border-white/[0.07] rounded-2xl p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-fg-tertiary">Active Students</span>
            <Users className="w-4 h-4 text-fg-tertiary/60" />
          </div>
          <div className="text-[40px] font-bold text-fg-primary leading-none">
            {stats?.activeStudents ?? 0}
          </div>
        </div>

        {/* Last Session */}
        <div className="bg-[#111118] border border-white/[0.07] rounded-2xl p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-fg-tertiary">Last Session</span>
            <Clock className="w-4 h-4 text-fg-tertiary/60" />
          </div>
          <div className="text-[22px] font-bold text-fg-primary leading-tight">
            {stats?.lastSession ? formatDate(stats.lastSession.date) : 'No sessions'}
          </div>
        </div>
      </div>

      {/* ── Row 2: Today's Session + Today's Attendance ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Today's Session */}
        <div className="bg-[#111118] border border-white/[0.07] rounded-2xl p-6">
          <div className="mb-4">
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-fg-tertiary">Today's Session</span>
          </div>
          {todaySession ? (
            <div className="space-y-3">
              <p className="text-fg-primary font-semibold text-[16px]">{todaySession.topic || 'Untitled Session'}</p>
              <p className="text-fg-tertiary text-[13px]">{todaySession.notes || 'No notes added.'}</p>
              <Link
                to="/attendance"
                className="inline-flex items-center gap-2 bg-accent-glow text-white text-[13px] font-semibold px-4 py-2 rounded-lg hover:bg-accent-glow/90 transition-colors mt-2"
              >
                Mark Attendance
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-fg-tertiary text-[14px]">No session scheduled for today.</p>
              <Link
                to="/attendance"
                className="inline-flex items-center gap-2 bg-accent-glow text-white text-[13px] font-semibold px-4 py-2 rounded-lg hover:bg-accent-glow/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Session
              </Link>
            </div>
          )}
        </div>

        {/* Today's Attendance */}
        <div className="bg-[#111118] border border-white/[0.07] rounded-2xl p-6">
          <div className="mb-4">
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-fg-tertiary">Today's Attendance</span>
          </div>
          {todaySession ? (
            <div className="space-y-2">
              <p className="text-fg-secondary text-[14px]">Session is scheduled. Mark attendance to begin tracking.</p>
              <Link
                to="/attendance"
                className="inline-flex items-center gap-2 text-accent-glow text-[13px] font-semibold hover:underline mt-1"
              >
                Go to Attendance <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ) : (
            <p className="text-fg-tertiary text-[14px]">Create a session first to mark attendance.</p>
          )}
        </div>
      </div>

      {/* ── Row 3: Program Overview + Recent Activity ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Program Overview */}
        <div className="bg-[#111118] border border-white/[0.07] rounded-2xl p-6">
          <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-fg-tertiary block mb-5">Program Overview</span>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[14px] text-fg-secondary">Total Sessions</span>
              <span className="text-[14px] font-bold text-fg-primary">{stats?.totalSessions ?? 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[14px] text-fg-secondary">Average Attendance</span>
              <span className="text-[14px] font-bold text-fg-primary">{stats?.avgAttendance ?? 0}%</span>
            </div>
            <div className="h-px bg-white/5 my-2" />
            {/* Highest */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-success" />
                <div>
                  <p className="text-[10px] text-fg-tertiary uppercase tracking-wider">Highest Attendance</p>
                  <p className="text-[13px] font-bold text-fg-primary">
                    {programOverview?.highest?.name || '—'}
                  </p>
                </div>
              </div>
              {programOverview?.highest && (
                <span className="text-[13px] font-bold text-success">{programOverview.highest.pct}%</span>
              )}
            </div>
            {/* Lowest */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-danger" />
                <div>
                  <p className="text-[10px] text-fg-tertiary uppercase tracking-wider">Lowest Attendance</p>
                  <p className="text-[13px] font-bold text-fg-primary">
                    {programOverview?.lowest?.name || '—'}
                  </p>
                </div>
              </div>
              {programOverview?.lowest && (
                <span className="text-[13px] font-bold text-danger">{programOverview.lowest.pct}%</span>
              )}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-[#111118] border border-white/[0.07] rounded-2xl p-6">
          <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-fg-tertiary block mb-5">Recent Activity</span>
          {recentActivity.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-28 gap-2">
              <Activity className="w-8 h-8 text-fg-tertiary/30" />
              <p className="text-fg-tertiary text-[13px]">No recent activity found.</p>
              <Link to="/upload" className="text-accent-glow text-[12px] font-semibold hover:underline">
                Upload a CSV to get started →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentActivity.map((log, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-accent-glow/20 border border-accent-glow/30 flex items-center justify-center mt-0.5 shrink-0">
                    <Activity className="w-2.5 h-2.5 text-accent-glow" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-fg-primary truncate">
                      Marked attendance for{' '}
                      <span className="font-semibold">{log.filename?.replace(/\.[^/.]+$/, '') || 'Import'}</span>
                    </p>
                    <p className="text-[11px] text-fg-tertiary">{timeAgo(log.uploaded_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
