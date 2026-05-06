import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import Skeleton from '../../components/ui/Skeleton';
import { 
  CheckCircle2, 
  XCircle, 
  Calendar, 
  TrendingUp,
  Award,
  AlertCircle,
  Clock
} from 'lucide-react';

const MyAttendance = () => {
  const { userProfile } = useAuth();
  const [attendance, setAttendance] = useState([]);
  const [stats, setStats] = useState({ present: 0, total: 0, percentage: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchMyAttendance() {
      if (!userProfile?.student_id) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const { data, error } = await supabase
          .from('attendance')
          .select(`
            id,
            present,
            marked_at,
            sessions (
              date,
              topic,
              duration_hours
            )
          `)
          .eq('student_id', userProfile.student_id)
          .order('marked_at', { ascending: false });

        if (error) throw error;

        if (data) {
          const present = data.filter(a => a.present).length;
          const total = data.length;
          const percentage = total > 0 ? (present / total) * 100 : 0;
          setAttendance(data);
          setStats({ present, total, percentage });
        }
      } catch (err) {
        console.error("Error fetching attendance:", err);
        setError(err.message || "Failed to connect to Supabase.");
      } finally {
        setLoading(false);
      }
    }
    fetchMyAttendance();
  }, [userProfile]);

  if (!loading && !userProfile?.student_id) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <div className="w-20 h-20 rounded-[32px] bg-warning/10 flex items-center justify-center mb-6">
          <AlertCircle className="w-10 h-10 text-warning" />
        </div>
        <h2 className="text-[32px] font-bold text-fg-primary mb-2 tracking-tight">Profile Not Linked</h2>
        <p className="text-body-lg text-fg-tertiary max-w-md">
          Your account isn't linked to a student record. Please contact your mentor to synchronize your profile.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-12">
      <div>
        <h1 className="text-[40px] font-bold text-fg-primary tracking-tight mb-2">My Attendance</h1>
        <p className="text-body-lg text-fg-tertiary">Track your bootcamp progress and session participation.</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 rounded-[40px]" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Attendance Rate */}
          <div className="card bg-surface-raised border border-white/5 rounded-[40px] p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-2xl bg-accent-glow/10 border border-accent-glow/20 flex items-center justify-center text-accent-glow">
                <TrendingUp className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-bold text-fg-tertiary uppercase tracking-widest">Attendance Rate</span>
            </div>
            <div className="flex items-baseline gap-2 mb-6">
              <span className="text-[56px] font-black text-fg-primary leading-none">{Math.round(stats.percentage)}%</span>
              <span className="text-sm font-medium text-fg-tertiary uppercase tracking-widest">Score</span>
            </div>
            <div className="h-2 w-full bg-void/50 rounded-full overflow-hidden border border-white/5">
              <div 
                className={`h-full transition-all duration-1000 ${stats.percentage >= 75 ? 'bg-success shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-danger shadow-[0_0_10px_rgba(244,63,94,0.5)]'}`}
                style={{ width: `${stats.percentage}%` }}
              ></div>
            </div>
          </div>

          {/* Sessions Present */}
          <div className="card bg-surface-raised border border-white/5 rounded-[40px] p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-2xl bg-success/10 border border-success/20 flex items-center justify-center text-success">
                <Award className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-bold text-fg-tertiary uppercase tracking-widest">Sessions Attended</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-[56px] font-black text-fg-primary leading-none">{stats.present}</span>
              <span className="text-sm font-medium text-fg-tertiary uppercase tracking-widest">/ {stats.total} total</span>
            </div>
            <p className="text-[13px] text-fg-tertiary mt-6">Sessions completed so far.</p>
          </div>

          {/* Status Level */}
          <div className="card bg-surface-raised border border-white/5 rounded-[40px] p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-2xl bg-warning/10 border border-warning/20 flex items-center justify-center text-warning">
                <AlertCircle className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-bold text-fg-tertiary uppercase tracking-widest">Status Level</span>
            </div>
            <div className={`text-[32px] font-black mb-4 ${stats.percentage >= 75 ? 'text-success' : 'text-danger'}`}>
              {stats.percentage >= 75 ? 'On Track' : 'Risk Warning'}
            </div>
            <p className="text-[13px] leading-relaxed text-fg-tertiary">
              {stats.percentage >= 75 
                ? 'Excellent work! You are meeting the minimum attendance requirement for certification.' 
                : 'Attention: Your attendance is below 75%. This may affect your certification eligibility.'}
            </p>
          </div>
        </div>
      )}

      {/* History Log */}
      <div className="card bg-surface-raised border border-white/5 rounded-[40px] overflow-hidden">
        <div className="p-10 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
          <h3 className="text-[24px] font-bold text-fg-primary">Recent Activity Log</h3>
          <Calendar className="w-6 h-6 text-fg-tertiary" />
        </div>

        {loading ? (
          <div className="p-10 space-y-4">
            <Skeleton className="h-16 w-full rounded-2xl" />
            <Skeleton className="h-16 w-full rounded-2xl" />
            <Skeleton className="h-16 w-full rounded-2xl" />
          </div>
        ) : attendance.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-void/30">
                  <th className="px-10 py-5 text-[11px] font-bold text-fg-tertiary uppercase tracking-widest">SESSION DATE</th>
                  <th className="px-10 py-5 text-[11px] font-bold text-fg-tertiary uppercase tracking-widest">TOPIC COVERED</th>
                  <th className="px-10 py-5 text-[11px] font-bold text-fg-tertiary uppercase tracking-widest text-right">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {attendance.map((record) => (
                  <tr key={record.id} className="group hover:bg-white/[0.02] transition-colors">
                    <td className="px-10 py-6">
                      <div className="flex items-center gap-3">
                        <Clock className="w-4 h-4 text-accent-glow" />
                        <span className="text-fg-secondary font-medium">
                          {record.sessions?.date ? new Date(record.sessions.date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                        </span>
                      </div>
                    </td>
                    <td className="px-10 py-6">
                      <span className="text-fg-primary font-bold group-hover:text-accent-glow transition-colors">
                        {record.sessions?.topic || 'Untitled Session'}
                      </span>
                    </td>
                    <td className="px-10 py-6 text-right">
                      <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-black tracking-widest ${
                        record.present ? 'bg-success/10 text-success border border-success/20' : 'bg-danger/10 text-danger border border-danger/20'
                      }`}>
                        {record.present ? 'PRESENT' : 'ABSENT'}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-20 text-center">
            <Clock className="w-12 h-12 text-fg-tertiary/20 mx-auto mb-4" />
            <p className="text-fg-tertiary">No sessions recorded yet. Your activity will appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyAttendance;
