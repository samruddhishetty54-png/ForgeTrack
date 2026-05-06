import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import Skeleton from '../components/ui/Skeleton';
import { 
  Search, 
  User, 
  CheckCircle2, 
  XCircle, 
  TrendingUp, 
  Award,
  Calendar,
  AlertCircle
} from 'lucide-react';

const StudentHistory = () => {
  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  
  const [studentProfile, setStudentProfile] = useState(null);
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    async function fetchStudents() {
      const { data } = await supabase.from('students').select('*').eq('is_active', true).order('name');
      setStudents(data || []);
      setInitialLoading(false);
    }
    fetchStudents();
  }, []);

  useEffect(() => {
    if (!selectedStudentId) return;

    async function fetchStudentHistory() {
      setLoading(true);
      try {
        const profile = students.find(s => s.id.toString() === selectedStudentId);
        setStudentProfile(profile);

        const { data: sessionsData } = await supabase
          .from('sessions')
          .select('*')
          .order('date', { ascending: false });

        const { data: attData } = await supabase
          .from('attendance')
          .select('session_id, present, marked_at')
          .eq('student_id', selectedStudentId);

        const attMap = {};
        if (attData) {
          attData.forEach(a => attMap[a.session_id] = a);
        }

        const history = (sessionsData || []).map(session => ({
          ...session,
          attendance: attMap[session.id] || null
        }));

        setAttendanceData(history);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    fetchStudentHistory();
  }, [selectedStudentId, students]);

  const sessionsWithRecords = attendanceData.filter(h => h.attendance !== null);
  const presentCount = sessionsWithRecords.filter(h => h.attendance.present).length;
  const totalCount = sessionsWithRecords.length;
  const percentage = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;
  
  const healthColor = percentage >= 75 ? 'text-success' : percentage >= 50 ? 'text-warning' : 'text-danger';

  return (
    <div className="pb-12 space-y-10">
      <div>
        <h1 className="text-[40px] font-bold text-fg-primary tracking-tight mb-2">Student History</h1>
        <p className="text-body-lg text-fg-tertiary">Monitor individual student performance and attendance patterns.</p>
      </div>
      
      {/* Search/Select Area */}
      <div className="card bg-surface-raised border border-white/5 rounded-[40px] p-10">
        <div className="flex flex-col md:flex-row items-center gap-8">
          <div className="w-20 h-20 rounded-[32px] bg-accent-glow/10 border border-accent-glow/20 flex items-center justify-center text-accent-glow">
            <Search className="w-10 h-10" />
          </div>
          <div className="flex-1 w-full">
            <label className="block text-[11px] font-bold text-fg-tertiary uppercase tracking-widest mb-3">SELECT A STUDENT TO AUDIT</label>
            {initialLoading ? <Skeleton className="h-14 w-full rounded-2xl" /> : (
              <div className="relative group">
                <select 
                  value={selectedStudentId}
                  onChange={e => setSelectedStudentId(e.target.value)}
                  className="w-full bg-void border border-white/10 rounded-2xl h-14 px-6 text-fg-primary focus:outline-none focus:border-accent-glow/50 transition-all appearance-none cursor-pointer"
                >
                  <option value="" disabled>Search or select a student...</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.usn})</option>
                  ))}
                </select>
                <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-fg-tertiary group-hover:text-fg-primary transition-colors">
                  <TrendingUp className="w-5 h-5 rotate-90" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {!selectedStudentId && !initialLoading && (
        <div className="flex flex-col items-center justify-center py-24 text-fg-tertiary/20">
          <User className="w-32 h-32 mb-6" strokeWidth={0.5} />
          <p className="text-[20px] font-medium tracking-tight">Select a student profile to begin the audit.</p>
        </div>
      )}

      {selectedStudentId && loading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Skeleton className="h-96 rounded-[40px]" />
          <Skeleton className="lg:col-span-2 h-96 rounded-[40px]" />
        </div>
      )}

      {selectedStudentId && !loading && studentProfile && (
        <div className="space-y-10">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Profile Overview Card */}
            <div className="card bg-surface-raised border border-white/5 rounded-[40px] p-10 flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-[32px] bg-accent-glow border border-accent-glow/50 flex items-center justify-center text-[32px] font-black text-white mb-6 shadow-[0_0_30px_rgba(99,102,241,0.3)]">
                {studentProfile.name.charAt(0)}
              </div>
              <h2 className="text-[32px] font-bold text-fg-primary leading-tight mb-2">{studentProfile.name}</h2>
              <p className="text-body-lg text-fg-tertiary font-mono mb-8">{studentProfile.usn}</p>
              
              <div className="flex flex-wrap justify-center gap-3 mb-10">
                <span className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[11px] font-bold text-fg-tertiary uppercase tracking-widest">{studentProfile.branch_code}</span>
                <span className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[11px] font-bold text-fg-tertiary uppercase tracking-widest">BATCH {studentProfile.batch || '2025'}</span>
              </div>

              <div className="mt-auto w-full pt-8 border-t border-white/5">
                <div className="flex items-center justify-center gap-2 mb-2">
                   <TrendingUp className={`w-4 h-4 ${healthColor}`} />
                   <span className="text-[11px] font-bold text-fg-tertiary uppercase tracking-widest">ATTENDANCE SCORE</span>
                </div>
                <div className={`text-[64px] font-black leading-none mb-4 ${healthColor}`}>
                  {percentage}%
                </div>
                <p className="text-[13px] font-medium text-fg-tertiary">
                  {presentCount} sessions attended out of {totalCount}
                </p>
              </div>
            </div>

            {/* Performance Matrix Card */}
            <div className="card lg:col-span-2 bg-surface-raised border border-white/5 rounded-[40px] p-10">
              <div className="flex justify-between items-center mb-10">
                <h3 className="text-[24px] font-bold text-fg-primary">Performance Matrix</h3>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-success"></div>
                    <span className="text-[11px] font-bold text-fg-tertiary uppercase tracking-widest">PRESENT</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-danger"></div>
                    <span className="text-[11px] font-bold text-fg-tertiary uppercase tracking-widest">ABSENT</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-4 sm:grid-cols-7 md:grid-cols-10 gap-3">
                {[...attendanceData].reverse().map(session => {
                  let statusColor = "bg-white/5 border-white/10";
                  if (session.attendance?.present === true) statusColor = "bg-success border-success/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]";
                  if (session.attendance?.present === false) statusColor = "bg-danger border-danger/50 shadow-[0_0_15px_rgba(244,63,94,0.2)]";
                  
                  return (
                    <div 
                      key={session.id} 
                      title={`${session.date}: ${session.topic}`}
                      className={`aspect-square rounded-2xl border flex items-center justify-center transition-all hover:scale-110 cursor-help ${statusColor}`}
                    >
                      <span className={`text-[12px] font-bold ${session.attendance === null ? 'text-fg-tertiary/30' : 'text-void'}`}>
                        {new Date(session.date).getDate()}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* KPI Mini-Cards */}
              <div className="grid grid-cols-2 gap-6 mt-10">
                <div className="bg-void/50 border border-white/5 rounded-[32px] p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <Award className="w-5 h-5 text-accent-glow" />
                    <span className="text-[11px] font-bold text-fg-tertiary uppercase tracking-widest">STREAK</span>
                  </div>
                  <div className="text-[28px] font-bold text-fg-primary">8 Sessions</div>
                </div>
                <div className="bg-void/50 border border-white/5 rounded-[32px] p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <AlertCircle className="w-5 h-5 text-warning" />
                    <span className="text-[11px] font-bold text-fg-tertiary uppercase tracking-widest">RISK LEVEL</span>
                  </div>
                  <div className={`text-[28px] font-bold ${healthColor}`}>
                    {percentage >= 75 ? 'Low' : percentage >= 50 ? 'Medium' : 'Critical'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Audit Log Table */}
          <div className="card bg-surface-raised border border-white/5 rounded-[40px] overflow-hidden">
            <div className="p-10 border-b border-white/5 bg-white/[0.02]">
              <h3 className="text-[24px] font-bold text-fg-primary">Detailed Audit Log</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-void/50">
                    <th className="px-10 py-5 text-[11px] font-bold text-fg-tertiary uppercase tracking-[0.2em]">DATE</th>
                    <th className="px-10 py-5 text-[11px] font-bold text-fg-tertiary uppercase tracking-[0.2em]">SESSION TOPIC</th>
                    <th className="px-10 py-5 text-[11px] font-bold text-fg-tertiary uppercase tracking-[0.2em] text-right">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {attendanceData.map(session => (
                    <tr key={session.id} className="group hover:bg-white/[0.02] transition-all">
                      <td className="px-10 py-6">
                        <div className="flex items-center gap-3">
                          <Calendar className="w-4 h-4 text-accent-glow" />
                          <span className="text-fg-secondary font-medium">{new Date(session.date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                      </td>
                      <td className="px-10 py-6 text-fg-primary font-bold group-hover:text-accent-glow transition-colors">
                        {session.topic}
                      </td>
                      <td className="px-10 py-6 text-right">
                        {session.attendance === null ? (
                          <span className="text-fg-tertiary/40 italic text-sm">Awaiting Record</span>
                        ) : (
                          <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-black tracking-widest ${
                            session.attendance.present ? 'bg-success/10 text-success border border-success/20' : 'bg-danger/10 text-danger border border-danger/20'
                          }`}>
                            {session.attendance.present ? 'PRESENT' : 'ABSENT'}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentHistory;
