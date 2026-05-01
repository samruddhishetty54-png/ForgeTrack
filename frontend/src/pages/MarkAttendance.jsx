import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import ConfirmModal from '../components/ui/ConfirmModal';
import Skeleton from '../components/ui/Skeleton';
import { Search, Save, Calendar as CalendarIcon, CheckSquare, Square } from 'lucide-react';

const MarkAttendance = () => {
  const { userProfile } = useAuth();
  const { addToast } = useToast();
  
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [session, setSession] = useState(null);
  const [students, setStudents] = useState([]);
  const [attendanceState, setAttendanceState] = useState({}); // { student_id: present (boolean) }
  const [existingAttendance, setExistingAttendance] = useState({}); // To check if we are overriding
  
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

      // 1. Fetch active students
      const { data: studentsData } = await supabase
        .from('students')
        .select('*')
        .eq('is_active', true)
        .order('name');
        
      setStudents(studentsData || []);

      // 2. Fetch session for date
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('*')
        .eq('date', dateStr)
        .single();
        
      if (sessionData) {
        setSession(sessionData);
        
        // 3. Fetch existing attendance
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
        
        // Fill remaining students as present by default
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
      setError(err.message || "Failed to connect to Supabase.");
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
      fetchDataForDate(selectedDate); // Re-fetch
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
    // Check if we are modifying existing records
    const hasExisting = Object.keys(existingAttendance).length > 0;
    
    // Check if any record has changed from existing
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

      const presentCount = recordsToUpsert.filter(r => r.present).length;
      const absentCount = recordsToUpsert.length - presentCount;

      addToast({ 
        title: 'Attendance Saved', 
        message: `Marked ${presentCount} present, ${absentCount} absent.` 
      });
      
      // Update existing records state
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
    <div className="pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
        <div>
          <h1 className="text-h1 text-fg-primary mb-2">Mark Attendance</h1>
          <p className="text-body text-fg-secondary">Record daily attendance for students.</p>
        </div>
        
        <div className="w-full md:w-auto">
          <label className="block text-label text-fg-secondary mb-2">SESSION DATE</label>
          <div className="relative">
            <CalendarIcon className="w-4 h-4 text-fg-tertiary absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="date" 
              value={selectedDate}
              min="2025-08-04"
              max={new Date().toISOString().split('T')[0]}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="input-field pl-10 bg-surface text-fg-primary cursor-pointer w-full md:w-48"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <Skeleton className="h-96 w-full" />
      ) : error ? (
        <div className="card-hero border-danger/50 bg-danger/5 flex flex-col items-center justify-center py-12 text-center max-w-xl mx-auto">
          <div className="w-12 h-12 rounded-full bg-danger/10 flex items-center justify-center mb-4 text-danger">
            <CheckSquare className="w-6 h-6" />
          </div>
          <h3 className="text-h3 text-fg-primary mb-2">Connection Error</h3>
          <p className="text-body text-fg-secondary max-w-md mb-6">
            {error}. Please check your .env.local configuration.
          </p>
          <button onClick={() => fetchDataForDate(selectedDate)} className="btn-secondary">
            Retry Connection
          </button>
        </div>
      ) : !session ? (

        <div className="card max-w-xl mx-auto">
          <div className="w-12 h-12 rounded-full bg-surface-inset border border-border-default flex items-center justify-center mb-6 text-fg-tertiary">
            <CalendarIcon className="w-6 h-6" strokeWidth={1.5} />
          </div>
          <h2 className="text-h2 text-fg-primary mb-2">No Session Found</h2>
          <p className="text-body text-fg-secondary mb-8">
            There is no session recorded for {new Date(selectedDate).toLocaleDateString()}. Create one to mark attendance.
          </p>
          
          <form onSubmit={handleCreateSession} className="space-y-4">
            <div>
              <label className="block text-label text-fg-secondary mb-2">TOPIC COVERED</label>
              <input 
                type="text" 
                required 
                value={newTopic}
                onChange={e => setNewTopic(e.target.value)}
                placeholder="e.g., Python Basics" 
                className="input-field" 
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-label text-fg-secondary mb-2">TYPE</label>
                <select 
                  value={newType}
                  onChange={e => setNewType(e.target.value)}
                  className="input-field"
                >
                  <option value="offline">Offline</option>
                  <option value="online">Online</option>
                </select>
              </div>
              <div>
                <label className="block text-label text-fg-secondary mb-2">DURATION (HOURS)</label>
                <input 
                  type="number" 
                  step="0.5" 
                  required 
                  value={newDuration}
                  onChange={e => setNewDuration(parseFloat(e.target.value))}
                  className="input-field" 
                />
              </div>
            </div>
            <button type="submit" disabled={saving || !newTopic} className="btn-primary w-full mt-4">
              {saving ? 'Creating...' : 'Create Session'}
            </button>
          </form>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden flex flex-col">
          {/* Header */}
          <div className="p-6 md:p-8 border-b border-border-subtle bg-surface-inset">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="pill bg-surface-raised border border-border-default text-fg-secondary">{session.session_type}</span>
                  <span className="text-caption text-fg-tertiary">• {session.duration_hours} Hrs</span>
                </div>
                <h2 className="text-h2 text-fg-primary">{session.topic}</h2>
              </div>
              
              <div className="flex items-center gap-3 w-full md:w-auto">
                <button onClick={() => markAll(true)} className="btn-secondary text-sm h-10 py-0 flex-1 md:flex-none">
                  Mark All Present
                </button>
                <button onClick={() => markAll(false)} className="btn-secondary text-sm h-10 py-0 flex-1 md:flex-none">
                  Mark All Absent
                </button>
              </div>
            </div>
          </div>
          
          {/* Search */}
          <div className="p-4 border-b border-border-subtle bg-surface">
            <div className="relative w-full max-w-md">
              <Search className="w-4 h-4 text-fg-tertiary absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Search students by name or USN..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="input-field pl-10 h-10"
              />
            </div>
          </div>

          {/* Student List */}
          <div className="flex-1 max-h-[50vh] overflow-y-auto">
            <table className="table-container">
              <tbody>
                {filteredStudents.map((student) => {
                  const present = attendanceState[student.id];
                  return (
                    <tr 
                      key={student.id} 
                      className={`table-tr cursor-pointer ${!present ? 'bg-danger-bg/5' : ''}`}
                      onClick={() => toggleAttendance(student.id)}
                    >
                      <td className="w-12 pl-6 md:pl-8 py-4 border-b border-border-subtle">
                        <div className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${
                          present ? 'bg-success text-[#0B0B11]' : 'border border-border-strong bg-transparent'
                        }`}>
                          {present && <CheckSquare className="w-4 h-4" strokeWidth={2.5} />}
                        </div>
                      </td>
                      <td className="py-4 border-b border-border-subtle">
                        <p className="text-body-lg font-medium text-fg-primary">{student.name}</p>
                        <p className="text-caption text-fg-tertiary font-mono">{student.usn}</p>
                      </td>
                      <td className="py-4 text-right pr-6 md:pr-8 border-b border-border-subtle">
                        <span className={`pill ${present ? 'pill-success' : 'pill-danger opacity-80'}`}>
                          {present ? 'Present' : 'Absent'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {filteredStudents.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-12 text-center text-fg-tertiary text-body border-b border-border-subtle">
                      No students found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Sticky Footer */}
          <div className="fixed bottom-0 left-0 right-0 md:left-[260px] p-4 bg-canvas/80 backdrop-blur-md border-t border-border-subtle flex justify-between items-center z-10">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-success shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                <span className="text-body text-fg-primary font-medium">{presentCount} Present</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-danger shadow-[0_0_8px_rgba(244,63,94,0.5)]"></div>
                <span className="text-body text-fg-primary font-medium">{absentCount} Absent</span>
              </div>
            </div>
            
            <button 
              onClick={handleSaveClick}
              disabled={saving}
              className="btn-primary"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Attendance'}
            </button>
          </div>
        </div>
      )}

      <ConfirmModal 
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={executeSave}
        title="Overwrite Existing Records?"
        message="You are about to overwrite previously saved attendance records for this session. Are you sure you want to continue?"
        confirmText="Overwrite Records"
        isDestructive={true}
      />
    </div>
  );
};

export default MarkAttendance;
