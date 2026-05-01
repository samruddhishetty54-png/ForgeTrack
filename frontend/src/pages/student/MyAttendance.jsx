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
  AlertCircle
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


  // Profile not linked to a student record yet
  if (!loading && !userProfile?.student_id) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <div className="w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-warning" />
        </div>
        <h2 className="text-h2 text-fg-primary mb-2">Profile Not Set Up</h2>
        <p className="text-body text-fg-secondary max-w-md">
          Your account isn't linked to a student record yet. Please ask your mentor to run the database setup script, then log out and back in.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="text-display-lg text-fg-primary mb-2">My Attendance</h1>
        <p className="text-body-lg text-fg-secondary">Track your progress and participation.</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card-hero">
          <div className="flex items-center gap-3 mb-4 text-fg-tertiary">
            <TrendingUp className="w-5 h-5" />
            <span className="text-label uppercase">Attendance Rate</span>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-display-md text-fg-primary tabular-nums">{Math.round(stats.percentage)}%</span>
            <span className="text-body-sm text-fg-tertiary mb-2">of total sessions</span>
          </div>
          <div className="mt-4 h-1.5 w-full bg-surface-inset rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-1000 ${stats.percentage >= 75 ? 'bg-success' : 'bg-warning'}`}
              style={{ width: `${stats.percentage}%` }}
            ></div>
          </div>
        </div>

        <div className="card-hero">
          <div className="flex items-center gap-3 mb-4 text-fg-tertiary">
            <Award className="w-5 h-5" />
            <span className="text-label uppercase">Sessions Present</span>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-display-md text-fg-primary tabular-nums">{stats.present}</span>
            <span className="text-body-sm text-fg-tertiary mb-2">/ {stats.total}</span>
          </div>
        </div>

        <div className="card-hero">
          <div className="flex items-center gap-3 mb-4 text-fg-tertiary">
            <AlertCircle className="w-5 h-5" />
            <span className="text-label uppercase">Status</span>
          </div>
          <div>
            <span className={`pill ${stats.percentage >= 75 ? 'pill-success' : 'pill-danger'}`}>
              {stats.percentage >= 75 ? 'On Track' : 'Needs Attention'}
            </span>
            <p className="text-caption text-fg-tertiary mt-4">
              Minimum 75% attendance required for certification.
            </p>
          </div>
        </div>
      </div>

      {/* Attendance History */}
      <div className="card">
        <h3 className="text-h3 text-fg-primary mb-6">Attendance History</h3>
        
        {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : error ? (
        <div className="card border-danger/50 bg-danger/5 flex flex-col items-center justify-center py-12 text-center">
          <div className="w-12 h-12 rounded-full bg-danger/10 flex items-center justify-center mb-4 text-danger">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-h3 text-fg-primary mb-2">Connection Error</h3>
          <p className="text-body text-fg-secondary max-w-md mb-6">
            {error}. Check your .env.local file.
          </p>
          <button onClick={() => window.location.reload()} className="btn-secondary">
            Retry Connection
          </button>
        </div>
      ) : attendance.length > 0 ? (

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border-subtle">
                  <th className="py-4 text-label text-fg-tertiary uppercase">Date</th>
                  <th className="py-4 text-label text-fg-tertiary uppercase">Topic</th>
                  <th className="py-4 text-label text-fg-tertiary uppercase">Status</th>
                  <th className="py-4 text-label text-fg-tertiary uppercase text-right">Marked At</th>
                </tr>
              </thead>
              <tbody>
                {attendance.map((record) => (
                  <tr key={record.id} className="border-b border-border-subtle hover:bg-surface-inset transition-colors">
                    <td className="py-4">
                      <div className="flex items-center gap-2 text-fg-primary font-medium">
                        <Calendar className="w-4 h-4 text-fg-tertiary" />
                        {record.sessions?.date ? new Date(record.sessions.date).toLocaleDateString() : 'N/A'}
                      </div>
                    </td>
                    <td className="py-4 text-body text-fg-secondary">
                      {record.sessions?.topic || 'Unknown Topic'}
                    </td>

                    <td className="py-4">
                      <div className="flex items-center gap-2">
                        {record.present ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-success" />
                            <span className="text-body-sm text-success font-medium">Present</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-4 h-4 text-danger" />
                            <span className="text-body-sm text-danger font-medium">Absent</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="py-4 text-caption text-fg-tertiary text-right">
                      {new Date(record.marked_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-body text-fg-tertiary">No attendance records found yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyAttendance;
