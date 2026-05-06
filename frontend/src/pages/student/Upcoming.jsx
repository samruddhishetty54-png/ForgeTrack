import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import Skeleton from '../../components/ui/Skeleton';
import { 
  Calendar, 
  Clock, 
  BookOpen, 
  AlertCircle,
  TrendingUp,
  ArrowRight
} from 'lucide-react';

const Upcoming = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchUpcoming() {
      try {
        setLoading(true);
        setError(null);
        const todayStr = new Date().toISOString().split('T')[0];

        const { data, error } = await supabase
          .from('sessions')
          .select('*')
          .order('date', { ascending: true });

        if (error) throw error;
        
        const upcoming = data.filter(s => s.date >= todayStr);
        // Fallback to all sessions for demo
        setSessions(upcoming.length > 0 ? upcoming : data);
        
      } catch (err) {
        console.error("Error fetching upcoming sessions:", err);
        setError(err.message || "Failed to connect to the database.");
      } finally {
        setLoading(false);
      }
    }

    fetchUpcoming();
  }, []);

  return (
    <div className="space-y-10 pb-12">
      <div>
        <h1 className="text-[40px] font-bold text-fg-primary tracking-tight mb-2">Upcoming Sessions</h1>
        <p className="text-body-lg text-fg-tertiary">Stay ahead by reviewing your future class schedule and curriculum.</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-64 rounded-[40px]" />)}
        </div>
      ) : error ? (
        <div className="card-hero border-danger/20 bg-danger/5 flex flex-col items-center justify-center py-20 text-center rounded-[40px]">
          <div className="w-16 h-16 rounded-full bg-danger/10 flex items-center justify-center mb-6">
            <AlertCircle className="w-8 h-8 text-danger" />
          </div>
          <h2 className="text-[24px] font-bold text-fg-primary mb-2">Sync Error</h2>
          <p className="text-fg-tertiary mb-8 max-w-md">{error}</p>
          <button onClick={() => window.location.reload()} className="bg-white text-void px-8 py-3 rounded-2xl font-bold">Retry</button>
        </div>
      ) : sessions.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {sessions.map((session) => {
            const isPast = session.date < new Date().toISOString().split('T')[0];
            return (
              <div key={session.id} className={`card bg-surface-raised border border-white/5 rounded-[40px] p-8 flex flex-col group transition-all hover:border-white/10 ${isPast ? 'opacity-60 grayscale-[0.3]' : ''}`}>
                <div className="flex items-start justify-between mb-8">
                  <div className={`flex items-center gap-2.5 px-4 py-2 rounded-2xl border ${isPast ? 'bg-white/5 border-white/5 text-fg-tertiary' : 'bg-accent-glow/10 border-accent-glow/20 text-accent-glow'}`}>
                    <Calendar className="w-4 h-4" />
                    <span className="text-[12px] font-bold tracking-tight">{session.date ? new Date(session.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) : 'N/A'}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-bold text-fg-tertiary uppercase tracking-widest mb-1">COHORT</span>
                    <span className="text-[14px] font-bold text-fg-primary">BATCH {session.month_number}</span>
                  </div>
                </div>
                
                <h3 className="text-[24px] font-bold text-fg-primary mb-2 group-hover:text-accent-glow transition-colors leading-tight">{session.topic}</h3>
                {isPast ? (
                  <span className="text-[11px] font-bold text-danger uppercase tracking-[0.2em] mb-6">Completed</span>
                ) : (
                  <span className="text-[11px] font-bold text-success uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                    <TrendingUp className="w-3 h-3" /> Scheduled
                  </span>
                )}
                
                <div className="mt-auto pt-6 border-t border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-4 text-[13px] text-fg-tertiary">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      <span>{session.duration_hours}h</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4" />
                      <span className="capitalize">{session.session_type}</span>
                    </div>
                  </div>
                  {!isPast && (
                    <ArrowRight className="w-5 h-5 text-accent-glow opacity-0 group-hover:opacity-100 transition-all -translate-x-4 group-hover:translate-x-0" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card bg-surface-raised border border-white/5 rounded-[40px] flex flex-col items-center justify-center py-24 text-center">
          <div className="w-20 h-20 rounded-[32px] bg-white/5 flex items-center justify-center mb-6">
            <Calendar className="w-10 h-10 text-fg-tertiary/20" />
          </div>
          <h3 className="text-[24px] font-bold text-fg-primary mb-2">No Upcoming Sessions</h3>
          <p className="text-fg-tertiary max-w-md">
            You don't have any future sessions scheduled. Take this time to review previous materials or work on projects.
          </p>
        </div>
      )}
    </div>
  );
};

export default Upcoming;
