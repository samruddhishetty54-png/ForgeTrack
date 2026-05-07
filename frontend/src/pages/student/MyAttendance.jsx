import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import Skeleton from '../../components/ui/Skeleton';
import { 
  CheckCircle2, 
  XCircle, 
  Calendar, 
  TrendingUp,
  LayoutDashboard,
  Clock,
  ArrowUpRight,
  CheckSquare
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
        // Even if empty, we want to show the layout, so we'll just stop loading
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

  const CircularProgress = ({ percentage }) => {
    const radius = 45;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    return (
      <div className="relative flex items-center justify-center">
        <svg className="w-32 h-32 transform -rotate-90">
          <circle
            cx="64"
            cy="64"
            r={radius}
            stroke="currentColor"
            strokeWidth="10"
            fill="transparent"
            className="text-white/5"
          />
          <circle
            cx="64"
            cy="64"
            r={radius}
            stroke="currentColor"
            strokeWidth="10"
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="text-accent-glow transition-all duration-1000 ease-out"
          />
        </svg>
        <span className="absolute text-2xl font-black text-fg-primary">{Math.round(percentage)}%</span>
      </div>
    );
  };

  return (
    <div className="space-y-12 pb-20 animate-in fade-in duration-700">
      
      {/* Page Title Section */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
           <TrendingUp className="w-5 h-5 text-accent-glow" />
           <span className="text-[11px] font-bold text-accent-glow uppercase tracking-[0.3em]">My Progress</span>
        </div>
        <h1 className="text-[48px] font-black text-fg-primary tracking-tighter leading-tight mt-1">
          Attendance Overview
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Progress Card */}
        <div className="lg:col-span-2 bg-surface-raised/40 backdrop-blur-xl border border-white/5 rounded-[48px] p-10 flex flex-col md:flex-row items-center gap-10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)]">
          <CircularProgress percentage={stats.percentage} />
          <div className="flex-1 text-center md:text-left">
            <h3 className="text-[28px] font-bold text-fg-primary mb-3">
              {stats.percentage >= 75 ? "You're doing great!" : (stats.total === 0 ? "Welcome aboard!" : "Focus required!")}
            </h3>
            <p className="text-fg-tertiary text-[17px] leading-relaxed max-w-[400px]">
              Your current attendance is <span className="text-fg-primary font-bold">{Math.round(stats.percentage)}%</span>. 
              Keep it above 75% to stay eligible for certifications.
            </p>
          </div>
        </div>

        {/* Sessions Summary Card */}
        <div className="bg-surface-raised/40 backdrop-blur-xl border border-white/5 rounded-[48px] p-10 flex flex-col justify-center shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] group hover:border-accent-glow/20 transition-colors">
          <span className="text-[11px] font-black text-fg-tertiary uppercase tracking-[0.3em] mb-6 block">Classes Attended</span>
          <div className="flex items-baseline gap-3">
            <span className="text-[72px] font-black text-fg-primary leading-none group-hover:text-accent-glow transition-colors">{stats.present}</span>
            <span className="text-[24px] font-bold text-fg-tertiary leading-none">/ {stats.total}</span>
          </div>
        </div>
      </div>

      {/* Detailed History Section */}
      <div className="space-y-8 mt-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
             <Calendar className="w-5 h-5 text-accent-glow" />
          </div>
          <h2 className="text-[28px] font-bold text-fg-primary tracking-tight">Detailed History</h2>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 w-full rounded-3xl" />)}
          </div>
        ) : attendance.length > 0 ? (
          <div className="grid gap-4">
            {attendance.map((record) => (
              <div 
                key={record.id}
                className="group relative bg-surface-raised/30 backdrop-blur-md border border-white/5 rounded-[32px] p-8 flex items-center justify-between hover:bg-white/[0.04] hover:border-white/10 transition-all duration-300"
              >
                <div className="flex items-center gap-6">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                    record.present ? 'bg-success/10 text-success' : 'bg-white/5 text-fg-tertiary'
                  }`}>
                    {record.present ? <CheckSquare className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
                  </div>
                  <div>
                    <h4 className="text-[19px] font-bold text-fg-primary group-hover:text-accent-glow transition-colors">
                      {record.sessions?.topic || 'Untitled Session'}
                    </h4>
                    <p className="text-fg-tertiary font-medium mt-1">
                      {record.sessions?.date ? new Date(record.sessions.date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-10">
                   <div className={`px-5 py-2 rounded-xl text-[11px] font-black tracking-widest border transition-all duration-300 ${
                     record.present 
                      ? 'bg-success/10 text-success border-success/20' 
                      : 'bg-white/5 text-fg-tertiary border-white/10'
                   }`}>
                     {record.present ? 'PRESENT' : 'PENDING'}
                   </div>
                   <button className="hidden md:flex w-12 h-12 rounded-xl bg-white/5 items-center justify-center text-fg-tertiary group-hover:bg-accent-glow group-hover:text-white transition-all duration-300">
                      <ArrowUpRight className="w-5 h-5" />
                   </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Show empty state cards to maintain layout as requested */
          <div className="grid gap-4">
             <div className="bg-surface-raised/10 border border-dashed border-white/10 rounded-[32px] py-24 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-[24px] bg-white/5 flex items-center justify-center mb-6">
                   <Clock className="w-8 h-8 text-fg-tertiary/20" />
                </div>
                <h3 className="text-lg font-bold text-fg-primary mb-2">No Attendance Records</h3>
                <p className="text-fg-tertiary max-w-[300px]">When your mentor marks your attendance, it will appear here in detail.</p>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyAttendance;
