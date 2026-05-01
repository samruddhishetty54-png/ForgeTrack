import { useEffect, useState } from 'react';

import { supabase } from '../../lib/supabase';
import Skeleton from '../../components/ui/Skeleton';
import { Calendar, Clock, BookOpen, AlertCircle } from 'lucide-react';


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

        
        // Fetch sessions. We fetch all sessions and then filter to show upcoming ones.
        // If there are no upcoming ones (due to old seed data), we might just show the latest ones as a fallback for demonstration.
        const { data, error } = await supabase
          .from('sessions')
          .select('*')
          .order('date', { ascending: true });

        if (error) throw error;
        
        const upcoming = data.filter(s => s.date >= todayStr);
        // If no upcoming sessions found, show all sessions for demo purposes so the screen isn't empty
        setSessions(upcoming.length > 0 ? upcoming : data);
        
      } catch (err) {
        console.error("Error fetching upcoming sessions:", err);
        setError(err.message || "Failed to connect to the database. Please check your configuration.");
      } finally {
        setLoading(false);
      }

    }

    fetchUpcoming();
  }, []);

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="text-display-lg text-fg-primary mb-2">Upcoming Sessions</h1>
        <p className="text-body-lg text-fg-secondary">View your scheduled classes and topics.</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : error ? (
        <div className="card border-danger/50 bg-danger/5 flex flex-col items-center justify-center py-12 text-center">
          <div className="w-12 h-12 rounded-full bg-danger/10 flex items-center justify-center mb-4">
            <AlertCircle className="w-6 h-6 text-danger" />
          </div>
          <h3 className="text-h3 text-fg-primary mb-2">Connection Error</h3>
          <p className="text-body text-fg-secondary max-w-md mb-6">
            {error}
          </p>
          <button 
            onClick={() => window.location.reload()} 
            className="btn-secondary"
          >
            Retry Connection
          </button>
        </div>
      ) : sessions.length > 0 ? (

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sessions.map((session) => {
            const isPast = session.date < new Date().toISOString().split('T')[0];
            return (
              <div key={session.id} className={`card flex flex-col h-full ${isPast ? 'opacity-70' : ''}`}>
                <div className="flex items-start justify-between mb-4">
                  <div className={`flex items-center gap-2 ${isPast ? 'text-fg-tertiary' : 'text-accent-glow'}`}>
                    <Calendar className="w-4 h-4" />
                    <span className="text-label font-medium">{session.date ? new Date(session.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}</span>
                  </div>
                  <span className="pill bg-surface-inset text-fg-secondary text-micro border border-border-default uppercase">
                    Month {session.month_number}
                  </span>
                </div>
                
                <h3 className="text-h3 text-fg-primary mb-2">{session.topic}</h3>
                {isPast && <span className="text-caption text-danger mb-2 block">Passed</span>}
                
                <div className="mt-auto pt-6 space-y-2">
                  <div className="flex items-center gap-2 text-body-sm text-fg-secondary">
                    <Clock className="w-4 h-4 text-fg-tertiary" />
                    <span>{session.duration_hours} Hours</span>
                  </div>
                  <div className="flex items-center gap-2 text-body-sm text-fg-secondary">
                    <BookOpen className="w-4 h-4 text-fg-tertiary" />
                    <span className="capitalize">{session.session_type} Class</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-surface-inset flex items-center justify-center mb-4">
            <Calendar className="w-8 h-8 text-fg-tertiary" />
          </div>
          <h3 className="text-h3 text-fg-primary mb-2">No Upcoming Sessions</h3>
          <p className="text-body text-fg-secondary max-w-md">
            You don't have any sessions scheduled for the future. Check back later when your mentor adds new classes.
          </p>
        </div>
      )}
    </div>
  );
};

export default Upcoming;
