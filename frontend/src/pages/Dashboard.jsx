import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import Skeleton from '../components/ui/Skeleton';
import { 
  Calendar as CalendarIcon, 
  Users, 
  Percent, 
  Clock, 
  CheckCircle2, 
  XCircle,
  ArrowRight
} from 'lucide-react';

const Dashboard = () => {
  const { userProfile } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true);
        setError(null);
        const todayStr = new Date().toISOString().split('T')[0];

        // 1. Ticker stats
        const { count: totalSessions, error: sessErr } = await supabase
          .from('sessions')
          .select('*', { count: 'exact', head: true });
        if (sessErr) throw sessErr;

        const { count: activeStudents, error: stuErr } = await supabase
          .from('students')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true);
        if (stuErr) throw stuErr;

        // 2. Today's session (no .single() to avoid PGRST116 when no session today)
        const { data: todaySessions, error: todayErr } = await supabase
          .from('sessions')
          .select('*')
          .eq('date', todayStr)
          .limit(1);
        if (todayErr) throw todayErr;
        const todaySession = todaySessions?.[0] || null;

        // 3. Today's attendance (if session exists)
        let todayAttendance = { present: 0, total: 0, absentList: [] };
        if (todaySession) {
          const { data: attData, error: attErr } = await supabase
            .from('attendance')
            .select('present, students(name)')
            .eq('session_id', todaySession.id);
          if (attErr) throw attErr;

          if (attData) {
            todayAttendance.total = attData.length;
            todayAttendance.present = attData.filter(a => a.present).length;
            todayAttendance.absentList = attData
              .filter(a => !a.present)
              .map(a => a.students?.name || 'Unknown');
          }
        }

        // 4. Overall Attendance %
        const { data: allAtt, error: allAttErr } = await supabase
          .from('attendance')
          .select('present');
        if (allAttErr) throw allAttErr;

        let overallPercent = 0;
        if (allAtt && allAtt.length > 0) {
          overallPercent = (allAtt.filter(a => a.present).length / allAtt.length) * 100;
        }

        // 5. Recent Activity
        const { data: recentAct, error: recentErr } = await supabase
          .from('attendance')
          .select('marked_at, present, students(name)')
          .order('marked_at', { ascending: false })
          .limit(5);
        if (recentErr) throw recentErr;

        setStats({
          totalSessions: totalSessions ?? 0,
          activeStudents: activeStudents ?? 0,
          overallPercent: overallPercent.toFixed(1),
          todaySession,
          todayAttendance,
          recentActivity: recentAct || []
        });
      } catch (err) {
        console.error('Dashboard fetch error:', err);
        setError(err.message || 'Failed to fetch data from Supabase.');
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  return (
    <div className="space-y-12 pb-12">
      {/* Hero Row */}
      <div>
        <h1 className="text-display-lg text-fg-primary mb-2">Welcome Back, {userProfile?.display_name?.split(' ')[0]}</h1>
        <p className="text-body-sm text-fg-secondary">Last login: {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}</p>
      </div>

      {error ? (
        <div className="card-hero border-danger/50 bg-danger/5 flex flex-col items-center justify-center py-12 text-center">
          <div className="w-12 h-12 rounded-full bg-danger/10 flex items-center justify-center mb-4">
            <XCircle className="w-6 h-6 text-danger" />
          </div>
          <h3 className="text-h3 text-fg-primary mb-2">Configuration Error</h3>
          <p className="text-body text-fg-secondary max-w-md mb-6">
            {error}. This usually means your Supabase URL or Anon Key in .env.local is incorrect.
          </p>
          <button onClick={() => window.location.reload()} className="btn-secondary">
            Retry Connection
          </button>
        </div>
      ) : (
        <>
          {/* Ticker Strip */}

      <div className="flex overflow-x-auto pb-4 gap-6 no-scrollbar">
        <TickerItem icon={CalendarIcon} label="TOTAL SESSIONS" value={loading || !stats ? '-' : stats.totalSessions} />
        <div className="w-[1px] h-10 bg-border-subtle my-auto"></div>
        <TickerItem icon={Percent} label="OVERALL ATTENDANCE" value={loading || !stats ? '-' : `${stats.overallPercent}%`} />
        <div className="w-[1px] h-10 bg-border-subtle my-auto"></div>
        <TickerItem icon={Users} label="ACTIVE STUDENTS" value={loading || !stats ? '-' : stats.activeStudents} />
        <div className="w-[1px] h-10 bg-border-subtle my-auto"></div>
        <TickerItem icon={Clock} label="LAST SESSION" value={loading || !stats ? '-' : (stats?.todaySession ? 'Today' : 'None Yet')} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Session */}
        <div className="card-hero flex flex-col">
          <div className="flex items-center gap-2 text-fg-tertiary mb-6">
            <span className="text-label uppercase">TODAY'S SESSION</span>
            {stats?.todaySession && <div className="w-2 h-2 rounded-full bg-success shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>}
          </div>
          
          {loading ? (
            <Skeleton className="h-32 w-full" />
          ) : stats?.todaySession ? (
            <div className="flex-1 flex flex-col">
              <h3 className="text-display-sm text-fg-primary mb-2">{stats.todaySession.topic}</h3>
              <p className="text-body text-fg-secondary mb-8">
                {stats.todaySession.session_type === 'offline' ? 'Offline Class' : 'Online Class'} • {stats.todaySession.duration_hours} Hours
              </p>
              <Link to="/attendance" className="btn-primary w-fit mt-auto">
                Mark Attendance
              </Link>
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-center items-center text-center">
              <p className="text-body-lg text-fg-secondary mb-4">No session scheduled for today.</p>
              <Link to="/attendance" className="btn-secondary w-fit">
                Create Session
              </Link>
            </div>
          )}
        </div>

        {/* Today's Attendance */}
        <div className="card-hero flex flex-col">
          <div className="text-label text-fg-tertiary mb-6 uppercase">TODAY'S ATTENDANCE</div>
          
          {loading ? (
            <Skeleton className="h-32 w-full" />
          ) : !stats?.todaySession ? (
             <div className="flex-1 flex items-center justify-center text-fg-tertiary">Waiting for session...</div>
          ) : stats.todayAttendance.total === 0 ? (
            <div className="flex-1 flex flex-col justify-center items-center text-center">
              <p className="text-body-lg text-fg-secondary mb-4">Attendance not marked yet.</p>
              <Link to="/attendance" className="text-accent-glow hover:text-white transition-colors text-body font-medium inline-flex items-center gap-1">
                Go to Mark Attendance <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div>
              <div className="flex items-end gap-3 mb-4">
                <span className="text-display-md text-fg-primary tabular-nums">{stats.todayAttendance.present}</span>
                <span className="text-body-lg text-fg-secondary mb-2 tabular-nums">/ {stats.todayAttendance.total}</span>
                <span className="pill pill-success mb-3 ml-auto text-micro">
                  {Math.round((stats.todayAttendance.present / stats.todayAttendance.total) * 100)}%
                </span>
              </div>
              
              {/* Progress Bar */}
              <div className="h-2 w-full bg-surface-inset rounded-full overflow-hidden mb-6">
                <div 
                  className="h-full bg-success transition-all duration-1000" 
                  style={{ width: `${(stats.todayAttendance.present / stats.todayAttendance.total) * 100}%` }}
                ></div>
              </div>

              {stats.todayAttendance.absentList.length > 0 && (
                <div>
                  <p className="text-caption text-fg-tertiary mb-2">ABSENT STUDENTS</p>
                  <div className="flex flex-wrap gap-2">
                    {stats.todayAttendance.absentList.slice(0, 5).map(name => (
                      <span key={name} className="pill pill-danger text-micro opacity-80">{name}</span>
                    ))}
                    {stats.todayAttendance.absentList.length > 5 && (
                      <span className="pill bg-surface-inset text-fg-secondary text-micro border border-border-default">
                        +{stats.todayAttendance.absentList.length - 5} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Program Overview */}
        <div className="card">
          <h3 className="text-h3 text-fg-primary mb-6">Program Overview</h3>
          {loading || !stats ? <Skeleton className="h-40 w-full" /> : (
            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-border-subtle">
                <span className="text-body text-fg-secondary">Active Students</span>
                <span className="text-body font-medium tabular-nums text-fg-primary">{stats.activeStudents}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-border-subtle">
                <span className="text-body text-fg-secondary">Total Sessions Completed</span>
                <span className="text-body font-medium tabular-nums text-fg-primary">{stats.totalSessions}</span>
              </div>
              <div className="flex justify-between items-center py-3">
                <span className="text-body text-fg-secondary">Overall Health</span>
                <span className="pill pill-success">Good</span>
              </div>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="card">
          <h3 className="text-h3 text-fg-primary mb-6">Recent Activity</h3>
          {loading || !stats ? <Skeleton className="h-40 w-full" /> : (
            <div className="space-y-4">
              {stats?.recentActivity?.length > 0 ? stats.recentActivity.map((act, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {act.present ? <CheckCircle2 className="w-4 h-4 text-success" /> : <XCircle className="w-4 h-4 text-danger" />}
                  </div>
                  <div>
                    <p className="text-body-sm text-fg-primary">
                      Marked <span className="font-medium text-fg-primary">{act.students?.name}</span> as <span className={act.present ? 'text-success font-medium' : 'text-danger font-medium'}>{act.present ? 'Present' : 'Absent'}</span>
                    </p>
                    <p className="text-caption text-fg-tertiary">
                      {new Date(act.marked_at).toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                </div>
              )) : (
                <p className="text-body text-fg-tertiary">No recent activity.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )}
</div>
);
};


const TickerItem = ({ icon: Icon, label, value }) => (
  <div className="flex items-center gap-3 shrink-0">
    <div className="w-10 h-10 rounded-full bg-surface border border-border-default flex items-center justify-center text-fg-secondary">
      <Icon className="w-5 h-5 stroke-[1.5px]" />
    </div>
    <div>
      <p className="text-caption text-fg-tertiary uppercase">{label}</p>
      <p className="text-display-sm text-fg-primary tracking-tight tabular-nums mt-0.5">{value}</p>
    </div>
  </div>
);

export default Dashboard;
