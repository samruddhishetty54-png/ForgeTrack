import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import Skeleton from '../components/ui/Skeleton';
import { Search, User, CheckCircle2, XCircle } from 'lucide-react';

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
        // 1. Profile
        const profile = students.find(s => s.id.toString() === selectedStudentId);
        setStudentProfile(profile);

        // 2. All sessions
        const { data: sessionsData } = await supabase
          .from('sessions')
          .select('*')
          .order('date', { ascending: false });

        // 3. This student's attendance
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

  // Calculations
  const sessionsWithRecords = attendanceData.filter(h => h.attendance !== null);
  const presentCount = sessionsWithRecords.filter(h => h.attendance.present).length;
  const totalCount = sessionsWithRecords.length;
  const percentage = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;
  
  const healthColor = percentage >= 75 ? 'text-success' : percentage >= 50 ? 'text-warning' : 'text-danger';

  return (
    <div className="pb-12 space-y-6">
      <h1 className="text-h1 text-fg-primary mb-2">Student History</h1>
      
      {/* Search/Select */}
      <div className="card max-w-2xl">
        <label className="block text-label text-fg-secondary mb-2">SELECT STUDENT</label>
        {initialLoading ? <Skeleton className="h-11 w-full" /> : (
          <div className="relative">
            <Search className="w-5 h-5 text-fg-tertiary absolute left-3 top-1/2 -translate-y-1/2" />
            <select 
              value={selectedStudentId}
              onChange={e => setSelectedStudentId(e.target.value)}
              className="input-field pl-10 appearance-none bg-surface-inset border-border-default cursor-pointer"
            >
              <option value="" disabled>Search or select a student...</option>
              {students.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.usn})</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {!selectedStudentId && !initialLoading && (
        <div className="flex flex-col items-center justify-center py-20 text-fg-tertiary">
          <User className="w-16 h-16 mb-4 opacity-50" strokeWidth={1} />
          <p className="text-body-lg">Select a student to view their history.</p>
        </div>
      )}

      {selectedStudentId && loading && <Skeleton className="h-96 w-full mt-6" />}

      {selectedStudentId && !loading && studentProfile && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Profile Card */}
            <div className="card flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-surface-raised border border-border-default flex items-center justify-center text-display-sm text-fg-secondary mb-4">
                {studentProfile.name.charAt(0)}
              </div>
              <h2 className="text-h2 text-fg-primary mb-1">{studentProfile.name}</h2>
              <p className="text-body text-fg-secondary font-mono mb-6">{studentProfile.usn}</p>
              
              <div className="flex flex-wrap justify-center gap-2 mb-8">
                <span className="pill bg-surface-inset border border-border-default text-fg-tertiary font-normal">{studentProfile.branch_code}</span>
                <span className="pill bg-surface-inset border border-border-default text-fg-tertiary font-normal">{studentProfile.batch}</span>
              </div>

              <div className="mt-auto pt-6 border-t border-border-subtle w-full">
                <p className="text-label text-fg-secondary mb-2">OVERALL ATTENDANCE</p>
                <div className="flex items-end justify-center gap-2">
                  <span className={`text-display-md tabular-nums ${healthColor}`}>
                    {percentage}%
                  </span>
                </div>
                <p className="text-body-sm text-fg-tertiary mt-2">
                  {presentCount} of {totalCount} sessions attended
                </p>
              </div>
            </div>

            {/* Heatmap Card */}
            <div className="card lg:col-span-2">
              <h3 className="text-h3 text-fg-primary mb-6">Attendance Heatmap</h3>
              <div className="flex flex-wrap gap-2">
                {/* Reverse array to show oldest first, typical for a left-to-right reading calendar */}
                {[...attendanceData].reverse().map(session => {
                  let blockClass = "bg-surface-inset border border-border-default"; // No record
                  if (session.attendance?.present === true) blockClass = "bg-success-bg border border-success-border text-success";
                  if (session.attendance?.present === false) blockClass = "bg-danger-bg border border-danger-border text-danger";
                  
                  return (
                    <div 
                      key={session.id} 
                      title={`${new Date(session.date).toLocaleDateString()}: ${session.topic}`}
                      className={`w-8 h-8 rounded-md flex items-center justify-center transition-transform hover:scale-110 cursor-help ${blockClass}`}
                    >
                      <span className="text-micro font-medium opacity-50">
                        {new Date(session.date).getDate()}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-4 mt-8 pt-6 border-t border-border-subtle text-caption text-fg-secondary">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-success-bg border border-success-border"></div> Present
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-danger-bg border border-danger-border"></div> Absent
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-surface-inset border border-border-default"></div> Unmarked
                </div>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="card p-0 overflow-hidden mt-6">
            <div className="p-6 border-b border-border-subtle bg-surface-inset">
              <h3 className="text-h3 text-fg-primary">Session Log</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="table-container">
                <thead>
                  <tr>
                    <th className="table-th">Date</th>
                    <th className="table-th">Topic</th>
                    <th className="table-th">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceData.map(session => (
                    <tr key={session.id} className="table-tr">
                      <td className="table-td text-fg-secondary">
                        {new Date(session.date).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="table-td">{session.topic}</td>
                      <td className="table-td">
                        {session.attendance === null ? (
                          <span className="text-fg-tertiary text-body-sm italic">Not marked</span>
                        ) : session.attendance.present ? (
                          <span className="pill pill-success"><CheckCircle2 className="w-3 h-3" /> Present</span>
                        ) : (
                          <span className="pill pill-danger"><XCircle className="w-3 h-3" /> Absent</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {attendanceData.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-fg-tertiary">No sessions recorded yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default StudentHistory;
