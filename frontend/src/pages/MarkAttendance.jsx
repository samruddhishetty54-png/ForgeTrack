import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../context/ToastContext';
import ConfirmModal from '../components/ui/ConfirmModal';
import Skeleton from '../components/ui/Skeleton';
import { 
  Search, 
  Save, 
  Calendar as CalendarIcon, 
  CheckSquare, 
  Square,
  Users,
  CheckCircle2,
  XCircle,
  Clock
} from 'lucide-react';

const MarkAttendance = () => {
  const { userProfile } = useAuth();
  const { addToast } = useToast();
  
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [session, setSession] = useState(null);
  const [students, setStudents] = useState([]);
  const [attendanceState, setAttendanceState] = useState({}); // { student_id: present (boolean) }
  const [existingAttendance, setExistingAttendance] = useState({}); 
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Create Session Form State
  const [newTopic, setNewTopic] = useState('');
  const [newType, setNewType] = useState('offline');
  const [newDuration, setNewDuration] = useState(2.0);

  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

  useEffect(() => {
    fetchDataForDate(selectedDate);
  }, [selectedDate]);

  const fetchDataForDate = async (dateStr) => {
    setLoading(true);
    setSession(null);
    setStudents([]);
    setAttendanceState({});
    setExistingAttendance({});
    setError(null);
    
    try {
      const { data: studentsData, error: stuErr } = await supabase
        .from('students')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (stuErr) throw stuErr;
      setStudents(studentsData || []);

      const { data: sessionData, error: sessErr } = await supabase
        .from('sessions')
        .select('*')
        .eq('date', dateStr)
        .single();
        
      if (sessionData) {
        setSession(sessionData);
        const { data: attData } = await supabase
          .from('attendance')
          .select('student_id, present')
          .eq('session_id', sessionData.id);
          
        const attMap = {};
        const existMap = {};
        if (attData) {
          attData.forEach(row => {
            attMap[row.student_id] = row.present;
            existMap[row.student_id] = row.present;
          });
        }
        
        studentsData?.forEach(s => {
          if (attMap[s.id] === undefined) {
            attMap[s.id] = true; // Default present
          }
        });
        
        setAttendanceState(attMap);
        setExistingAttendance(existMap);
      }
    } catch (err) {
      console.error(err);
      if (err.code !== 'PGRST116') {
        setError(err.message || "Failed to connect to Supabase.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSession = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const monthNumber = new Date(selectedDate).getMonth() + 1;
      const { data, error } = await supabase
        .from('sessions')
        .insert({
          date: selectedDate,
          topic: newTopic,
          month_number: monthNumber,
          duration_hours: newDuration,
          session_type: newType
        })
        .select()
        .single();
        
      if (error) throw error;
      addToast({ title: 'Session Created', message: 'You can now mark attendance.' });
      fetchDataForDate(selectedDate);
    } catch (error) {
      addToast({ title: 'Error', message: error.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const toggleAttendance = (studentId) => {
    setAttendanceState(prev => ({
      ...prev,
      [studentId]: !prev[studentId]
    }));
  };

  const markAll = (present) => {
    const newState = {};
    students.forEach(s => {
      newState[s.id] = present;
    });
    setAttendanceState(newState);
  };

  const handleSaveClick = () => {
    const hasExisting = Object.keys(existingAttendance).length > 0;
    let hasChanges = false;
    for (const [id, present] of Object.entries(attendanceState)) {
      if (existingAttendance[id] !== undefined && existingAttendance[id] !== present) {
        hasChanges = true;
        break;
      }
    }

    if (hasExisting && hasChanges) {
      setConfirmModalOpen(true);
    } else {
      executeSave();
    }
  };

  const executeSave = async () => {
    setSaving(true);
    try {
      const recordsToUpsert = Object.entries(attendanceState).map(([studentId, present]) => ({
        student_id: parseInt(studentId),
        session_id: session.id,
        present: present,
        marked_by: userProfile.id
      }));

      const { error } = await supabase
        .from('attendance')
        .upsert(recordsToUpsert, { onConflict: 'student_id,session_id' });

      if (error) throw error;
      addToast({ 
        title: 'Attendance Saved', 
        message: `Updated records for ${recordsToUpsert.length} students.` 
      });
      
      const newExistMap = {};
      recordsToUpsert.forEach(r => { newExistMap[r.student_id] = r.present });
      setExistingAttendance(newExistMap);
    } catch (error) {
      addToast({ title: 'Error Saving', message: error.message, type: 'error' });
    } finally {
      setSaving(false);
      setConfirmModalOpen(false);
    }
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.usn.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const presentCount = Object.values(attendanceState).filter(Boolean).length;
  const absentCount = students.length - presentCount;

  return (
    <div className="pb-32">
      {/* Header matching dashboard style */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10">
        <div>
          <h1 className="text-[40px] font-bold text-fg-primary tracking-tight mb-2">Mark Attendance</h1>
          <p className="text-body-lg text-fg-tertiary">Select a date and record student presence for the session.</p>
        </div>
        
        <div className="bg-surface-raised border border-white/5 p-4 rounded-[24px] flex items-center gap-4">
          <span className="text-[11px] font-bold text-fg-tertiary uppercase tracking-widest pl-2">Session Date</span>
          <div className="relative">
            <CalendarIcon className="w-4 h-4 text-accent-glow absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-void border border-white/10 rounded-xl h-10 pl-10 pr-4 text-sm text-fg-primary focus:outline-none focus:border-accent-glow/50 transition-all cursor-pointer"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <Skeleton className="h-96 w-full rounded-[40px]" />
      ) : error ? (
        <div className="card-hero border-danger/20 bg-danger/5 flex flex-col items-center justify-center py-20 text-center rounded-[40px]">
          <div className="w-16 h-16 rounded-full bg-danger/10 flex items-center justify-center mb-6">
            <XCircle className="w-8 h-8 text-danger" />
          </div>
          <h2 className="text-[24px] font-bold text-fg-primary mb-2">Something went wrong</h2>
          <p className="text-fg-tertiary mb-8 max-w-md">{error}</p>
          <button onClick={() => fetchDataForDate(selectedDate)} className="bg-white text-void px-8 py-3 rounded-2xl font-bold">Retry</button>
        </div>
      ) : !session ? (
        <div className="max-w-2xl mx-auto card bg-surface-raised border border-white/5 rounded-[40px] p-10">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-accent-glow/10 border border-accent-glow/20 flex items-center justify-center text-accent-glow">
              <CalendarIcon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-[24px] font-bold text-fg-primary">No Session Found</h2>
              <p className="text-fg-tertiary">Create a session for {selectedDate} to start marking attendance.</p>
            </div>
          </div>
          
          <form onSubmit={handleCreateSession} className="space-y-6">
            <div>
              <label className="block text-[11px] font-bold text-fg-tertiary uppercase tracking-widest mb-3">SESSION TOPIC</label>
              <input 
                type="text" 
                required 
                value={newTopic}
                onChange={e => setNewTopic(e.target.value)}
                placeholder="e.g., Introduction to Neural Networks" 
                className="w-full bg-void border border-white/10 rounded-2xl h-14 px-6 text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:border-accent-glow/50 transition-all"
              />
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-[11px] font-bold text-fg-tertiary uppercase tracking-widest mb-3">TYPE</label>
                <select 
                  value={newType}
                  onChange={e => setNewType(e.target.value)}
                  className="w-full bg-void border border-white/10 rounded-2xl h-14 px-6 text-fg-primary focus:outline-none focus:border-accent-glow/50 transition-all appearance-none"
                >
                  <option value="offline">Offline Class</option>
                  <option value="online">Online Class</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-fg-tertiary uppercase tracking-widest mb-3">DURATION (HRS)</label>
                <input 
                  type="number" 
                  step="0.5" 
                  required 
                  value={newDuration}
                  onChange={e => setNewDuration(parseFloat(e.target.value))}
                  className="w-full bg-void border border-white/10 rounded-2xl h-14 px-6 text-fg-primary focus:outline-none focus:border-accent-glow/50 transition-all"
                />
              </div>
            </div>
            <button type="submit" disabled={saving} className="w-full bg-accent-glow text-white h-14 rounded-2xl font-bold hover:shadow-[0_0_30px_rgba(99,102,241,0.3)] transition-all">
              {saving ? 'Creating...' : 'Initialize Session'}
            </button>
          </form>
        </div>
      ) : (
        <div className="card bg-surface-raised border border-white/5 rounded-[40px] overflow-hidden">
          {/* List Header */}
          <div className="p-10 border-b border-white/5 bg-white/[0.02]">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-[24px] bg-accent-glow border border-accent-glow/50 flex items-center justify-center text-white shadow-[0_0_20px_rgba(99,102,241,0.3)]">
                  <Users className="w-8 h-8" />
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold text-fg-tertiary uppercase tracking-widest">
                      {session.session_type}
                    </span>
                    <span className="text-fg-tertiary text-sm flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      {session.duration_hours} Hours
                    </span>
                  </div>
                  <h2 className="text-[28px] font-bold text-fg-primary leading-tight">{session.topic}</h2>
                </div>
              </div>
              
              <div className="flex items-center gap-3 w-full md:w-auto bg-void/50 p-2 rounded-[24px] border border-white/5">
                <button onClick={() => markAll(true)} className="flex-1 md:flex-none px-6 py-3 rounded-2xl text-sm font-bold text-success hover:bg-success/10 transition-all">
                  All Present
                </button>
                <button onClick={() => markAll(false)} className="flex-1 md:flex-none px-6 py-3 rounded-2xl text-sm font-bold text-danger hover:bg-danger/10 transition-all">
                  All Absent
                </button>
              </div>
            </div>
          </div>

          {/* Search Box */}
          <div className="px-10 py-6 border-b border-white/5">
            <div className="relative group">
              <Search className="w-5 h-5 text-fg-tertiary absolute left-5 top-1/2 -translate-y-1/2 group-focus-within:text-accent-glow transition-colors" />
              <input 
                type="text" 
                placeholder="Find a student by name or USN..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-void/50 border border-white/5 rounded-2xl h-14 pl-14 pr-6 text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:border-white/20 transition-all"
              />
            </div>
          </div>

          {/* Students Grid/Table */}
          <div className="max-h-[600px] overflow-y-auto px-4 pb-4">
            <table className="w-full border-separate border-spacing-y-3">
              <tbody>
                {filteredStudents.map((student) => {
                  const isPresent = attendanceState[student.id];
                  return (
                    <tr 
                      key={student.id} 
                      onClick={() => toggleAttendance(student.id)}
                      className={`group cursor-pointer transition-all ${isPresent ? 'opacity-100' : 'opacity-60 grayscale-[0.5]'}`}
                    >
                      <td className="bg-void/40 border-y border-l border-white/5 rounded-l-[24px] pl-8 py-5 w-20">
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                          isPresent ? 'bg-success text-void shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'border-2 border-white/10'
                        }`}>
                          {isPresent && <CheckCircle2 className="w-4 h-4" strokeWidth={3} />}
                        </div>
                      </td>
                      <td className="bg-void/40 border-y border-white/5 py-5">
                        <div className="flex flex-col">
                          <span className="text-[17px] font-bold text-fg-primary mb-0.5 group-hover:text-accent-glow transition-colors">{student.name}</span>
                          <span className="text-[12px] font-medium text-fg-tertiary tracking-wider font-mono">{student.usn}</span>
                        </div>
                      </td>
                      <td className="bg-void/40 border-y border-r border-white/5 rounded-r-[24px] pr-8 text-right">
                        <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-black tracking-[0.1em] transition-all ${
                          isPresent ? 'bg-success/10 text-success border border-success/20' : 'bg-white/5 text-fg-tertiary border border-white/10'
                        }`}>
                          {isPresent ? 'PRESENT' : 'ABSENT'}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modern Sticky Footer */}
      {!loading && session && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 md:translate-x-0 md:left-[320px] md:right-12 h-20 bg-[#0B0B11]/90 backdrop-blur-xl border border-white/10 rounded-[28px] px-8 flex items-center justify-between shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-40 transition-all hover:border-white/20">
          <div className="flex items-center gap-10">
            <div className="flex items-center gap-4">
              <div className="w-3 h-3 rounded-full bg-success shadow-[0_0_10px_rgba(16,185,129,0.8)]"></div>
              <div className="flex flex-col">
                <span className="text-[18px] font-bold text-fg-primary leading-none">{presentCount}</span>
                <span className="text-[10px] font-bold text-fg-tertiary uppercase tracking-widest mt-1">PRESENT</span>
              </div>
            </div>
            <div className="w-px h-8 bg-white/10"></div>
            <div className="flex items-center gap-4">
              <div className="w-3 h-3 rounded-full bg-danger shadow-[0_0_10px_rgba(244,63,94,0.8)]"></div>
              <div className="flex flex-col">
                <span className="text-[18px] font-bold text-fg-primary leading-none">{absentCount}</span>
                <span className="text-[10px] font-bold text-fg-tertiary uppercase tracking-widest mt-1">ABSENT</span>
              </div>
            </div>
          </div>
          
          <button 
            onClick={handleSaveClick}
            disabled={saving}
            className="bg-white text-void hover:bg-fg-secondary font-black py-3 px-10 rounded-2xl flex items-center gap-3 transition-all active:scale-95 disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            {saving ? 'SAVING...' : 'SYNC ATTENDANCE'}
          </button>
        </div>
      )}

      <ConfirmModal 
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={executeSave}
        title="Override Existing Records?"
        message="You have already saved attendance for this session. Do you want to sync the new data?"
        confirmText="Sync Now"
        isDestructive={true}
      />
    </div>
  );
};

export default MarkAttendance;
