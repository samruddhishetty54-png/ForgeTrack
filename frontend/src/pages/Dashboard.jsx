import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import Skeleton from '../components/ui/Skeleton';
import { 
  Users, 
  TrendingUp, 
  AlertTriangle, 
  Calendar,
  ArrowRight,
  Edit2
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
        
        // 1. Cohort Size (Active Students)
        const { count: activeStudents, error: stuErr } = await supabase
          .from('students')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true);
        if (stuErr) throw stuErr;

        // 2. Average Attendance
        const { data: allAtt, error: allAttErr } = await supabase
          .from('attendance')
          .select('present');
        if (allAttErr) throw allAttErr;

        let avgAttendance = 0;
        if (allAtt && allAtt.length > 0) {
          avgAttendance = (allAtt.filter(a => a.present).length / allAtt.length) * 100;
        }

        // 3. Students At Risk (Below 75%)
        const { data: studentAtt, error: riskErr } = await supabase
          .from('attendance')
          .select('student_id, present');
        
        let atRiskCount = 0;
        if (studentAtt && studentAtt.length > 0) {
          const studentMap = {};
          studentAtt.forEach(a => {
            if (!studentMap[a.student_id]) studentMap[a.student_id] = { total: 0, present: 0 };
            studentMap[a.student_id].total++;
            if (a.present) studentMap[a.student_id].present++;
          });
          
          atRiskCount = Object.values(studentMap).filter(s => (s.present / s.total) < 0.75).length;
        } else {
          // If no attendance records yet, all active students are technically "at risk" or just 0
          atRiskCount = 0;
        }

        // 4. Latest Session
        const { data: latestSessions, error: latestErr } = await supabase
          .from('sessions')
          .select('*')
          .order('date', { ascending: false })
          .limit(1);
        if (latestErr) throw latestErr;
        const latestSession = latestSessions?.[0] || null;

        setStats({
          activeStudents: activeStudents ?? 0,
          avgAttendance: Math.round(avgAttendance),
          atRiskCount,
          latestSession
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

  if (loading) {
    return (
      <div className="space-y-10 pb-12 animate-pulse">
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-6 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-40 rounded-3xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="col-span-2 h-64 rounded-3xl" />
          <Skeleton className="h-64 rounded-3xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-12">
      {/* Header Section */}
      <div>
        <h1 className="text-[40px] font-bold text-fg-primary tracking-tight mb-2">ForgeTrack Intelligence</h1>
        <p className="text-body-lg text-fg-tertiary">A birds-eye view of your cohort's performance and engagement.</p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Cohort Size */}
        <div className="card bg-surface-raised border border-white/5 rounded-[32px] p-8 group hover:border-white/10 transition-all">
          <div className="flex justify-between items-start mb-8">
            <div className="w-12 h-12 rounded-2xl bg-accent-glow/10 border border-accent-glow/20 flex items-center justify-center text-accent-glow group-hover:scale-110 transition-transform">
              <Users className="w-6 h-6" />
            </div>
            <span className="text-[12px] font-bold text-fg-tertiary tracking-[0.15em] uppercase">COHORT SIZE</span>
          </div>
          <div>
            <div className="text-[48px] font-bold text-fg-primary leading-none mb-2">{stats.activeStudents}</div>
            <div className="text-body-sm text-fg-tertiary">Active Students</div>
          </div>
        </div>

        {/* Avg Attendance */}
        <div className="card bg-surface-raised border border-white/5 rounded-[32px] p-8 group hover:border-white/10 transition-all">
          <div className="flex justify-between items-start mb-8">
            <div className="w-12 h-12 rounded-2xl bg-success/10 border border-success/20 flex items-center justify-center text-success group-hover:scale-110 transition-transform">
              <TrendingUp className="w-6 h-6" />
            </div>
            <span className="text-[12px] font-bold text-fg-tertiary tracking-[0.15em] uppercase">AVG ATTENDANCE</span>
          </div>
          <div>
            <div className="text-[48px] font-bold text-fg-primary leading-none mb-2">{stats.avgAttendance}%</div>
            <div className="text-body-sm text-fg-tertiary">Across all sessions</div>
          </div>
        </div>

        {/* At Risk */}
        <div className="card bg-surface-raised border border-white/5 rounded-[32px] p-8 group hover:border-white/10 transition-all">
          <div className="flex justify-between items-start mb-8">
            <div className="w-12 h-12 rounded-2xl bg-danger/10 border border-danger/20 flex items-center justify-center text-danger group-hover:scale-110 transition-transform">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <span className="text-[12px] font-bold text-fg-tertiary tracking-[0.15em] uppercase">AT RISK</span>
          </div>
          <div>
            <div className="text-[48px] font-bold text-fg-primary leading-none mb-2">{stats.atRiskCount}</div>
            <div className="text-body-sm text-fg-tertiary">Below 75% threshold</div>
          </div>
        </div>

        {/* Next Step */}
        <Link to="/attendance" className="card bg-accent-glow/10 border border-accent-glow/20 rounded-[32px] p-8 group hover:bg-accent-glow/15 transition-all">
          <div className="flex justify-between items-start mb-8">
            <div className="w-12 h-12 rounded-2xl bg-accent-glow border border-accent-glow/50 flex items-center justify-center text-white group-hover:scale-110 transition-transform shadow-[0_0_20px_rgba(99,102,241,0.3)]">
              <Calendar className="w-6 h-6" />
            </div>
            <span className="text-[12px] font-bold text-fg-tertiary tracking-[0.15em] uppercase">NEXT STEP</span>
          </div>
          <div>
            <div className="flex items-center gap-3 text-fg-primary group-hover:gap-5 transition-all duration-300">
              <span className="text-[20px] font-bold">Mark Attendance</span>
              <ArrowRight className="w-6 h-6" />
            </div>
          </div>
        </Link>
      </div>

      {/* Secondary Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Latest Session Activity */}
        <div className="lg:col-span-2 card bg-surface-raised border border-white/5 rounded-[40px] p-10">
          <div className="flex justify-between items-center mb-10">
            <h2 className="text-[24px] font-bold text-fg-primary">Latest Session Activity</h2>
            <div className="text-fg-tertiary font-mono text-sm tracking-widest">
              {stats.latestSession?.date || 'N/A'}
            </div>
          </div>

          <div className="bg-[#0B0B11] rounded-[32px] p-8 border border-white/5 flex justify-between items-center">
            <div>
              <div className="text-[12px] font-bold text-accent-glow uppercase tracking-[0.2em] mb-3">CURRENT TOPIC</div>
              <h3 className="text-[32px] font-bold text-fg-primary mb-2 capitalize">
                {stats.latestSession?.topic || 'No sessions found'}
              </h3>
              <p className="text-fg-tertiary italic">
                {stats.latestSession?.notes || 'No notes for this session'}
              </p>
            </div>
            {stats.latestSession && (
              <Link to="/attendance" className="bg-white text-[#0B0B11] hover:bg-fg-secondary font-bold py-4 px-8 rounded-2xl transition-all flex items-center gap-2 group">
                <Edit2 className="w-4 h-4" />
                Edit Attendance
              </Link>
            )}
          </div>
        </div>

        {/* Priority Tasks */}
        <div className="card bg-surface-raised border border-white/5 rounded-[40px] p-10">
          <h2 className="text-[24px] font-bold text-fg-primary mb-10">Priority Tasks</h2>
          
          <div className="space-y-6">
            {/* Task: Low Attendance Intervention */}
            {stats.atRiskCount > 0 && (
              <div className="bg-[#0B0B11]/50 border border-white/10 rounded-3xl p-6 relative overflow-hidden group hover:border-danger/50 transition-all">
                <div className="flex gap-4">
                  <div className="w-2 h-2 rounded-full bg-danger mt-2 shadow-[0_0_8px_rgba(244,63,94,0.8)]"></div>
                  <Link to="/history" className="flex-1">
                    <h4 className="font-bold text-fg-primary mb-1">Attendance Intervention</h4>
                    <p className="text-body-sm text-fg-tertiary leading-relaxed">
                      {stats.atRiskCount} students are currently below the 75% threshold.
                    </p>
                  </Link>
                </div>
              </div>
            )}

            {/* Task: Upload Pending Data */}
            <div className="bg-[#0B0B11]/50 border border-white/10 rounded-3xl p-6 relative overflow-hidden group hover:border-accent-glow/50 transition-all">
              <div className="flex gap-4">
                <div className="w-2 h-2 rounded-full bg-accent-glow mt-2 shadow-[0_0_8px_rgba(99,102,241,0.8)]"></div>
                <Link to="/upload" className="flex-1">
                  <h4 className="font-bold text-fg-primary mb-1">Bulk Sync Required</h4>
                  <p className="text-body-sm text-fg-tertiary leading-relaxed">
                    Import batch data from the latest program spreadsheets.
                  </p>
                </Link>
              </div>
            </div>

            {/* Task: Content Update */}
            <div className="bg-[#0B0B11]/50 border border-white/10 rounded-3xl p-6 relative overflow-hidden group hover:border-success/50 transition-all">
              <div className="flex gap-4">
                <div className="w-2 h-2 rounded-full bg-success mt-2 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
                <Link to="/materials" className="flex-1">
                  <h4 className="font-bold text-fg-primary mb-1">Resource Linking</h4>
                  <p className="text-body-sm text-fg-tertiary leading-relaxed">
                    Ensure all recent sessions have materials attached.
                  </p>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
