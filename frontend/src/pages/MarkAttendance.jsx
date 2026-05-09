import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../context/ToastContext';
import ConfirmModal from '../components/ui/ConfirmModal';
import Skeleton from '../components/ui/Skeleton';
import {
  Search,
  Save,
  Calendar,
  Plus,
  Trash2,
  Users,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

// Avatar color palette
const AVATAR_COLORS = [
  '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#84cc16',
];
const getColor = (name = '') => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];

const MarkAttendance = () => {
  const { userProfile } = useAuth();
  const { addToast } = useToast();
  const scrollRef = useRef(null);

  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [session, setSession] = useState(null);
  const [students, setStudents] = useState([]);
  const [attendanceState, setAttendanceState] = useState({});
  const [existingAttendance, setExistingAttendance] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [cleanupModalOpen, setCleanupModalOpen] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [newTopic, setNewTopic] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newType, setNewType] = useState('offline');
  const [newDuration, setNewDuration] = useState(2.0);
  const [cleaningUp, setCleaningUp] = useState(false);

  // Load all sessions + students on mount
  useEffect(() => {
    fetchInitialData();
  }, []);

  // Load attendance when session changes
  useEffect(() => {
    if (selectedSessionId) {
      const sess = sessions.find(s => s.id.toString() === selectedSessionId.toString());
      setSession(sess || null);
      if (sess) fetchAttendance(sess.id);
    }
  }, [selectedSessionId, sessions]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [{ data: sessData }, { data: stuData }] = await Promise.all([
        supabase.from('sessions').select('*').order('date', { ascending: false }),
        supabase.from('students').select('*').eq('is_active', true).order('name'),
      ]);
      setSessions(sessData || []);
      setStudents(stuData || []);
      if (sessData && sessData.length > 0) {
        setSelectedSessionId(sessData[0].id.toString());
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendance = async (sessionId) => {
    const { data: attData } = await supabase
      .from('attendance')
      .select('student_id, present')
      .eq('session_id', sessionId);

    const attMap = {};
    const existMap = {};
    if (attData) {
      attData.forEach(row => {
        attMap[row.student_id] = row.present;
        existMap[row.student_id] = row.present;
      });
    }
    // Default: all present
    students.forEach(s => {
      if (attMap[s.id] === undefined) attMap[s.id] = true;
    });
    setAttendanceState(attMap);
    setExistingAttendance(existMap);
  };

  const toggleAttendance = (studentId) => {
    setAttendanceState(prev => ({ ...prev, [studentId]: !prev[studentId] }));
  };

  const markAll = (present) => {
    const newState = {};
    students.forEach(s => { newState[s.id] = present; });
    setAttendanceState(newState);
  };

  const handleSaveClick = () => {
    const hasChanges = Object.entries(attendanceState).some(
      ([id, present]) => existingAttendance[parseInt(id)] !== present
    );
    if (Object.keys(existingAttendance).length > 0 && hasChanges) {
      setConfirmModalOpen(true);
    } else {
      executeSave();
    }
  };

  const executeSave = async () => {
    if (!session) return;
    setSaving(true);
    try {
      const records = Object.entries(attendanceState).map(([studentId, present]) => ({
        student_id: parseInt(studentId),
        session_id: session.id,
        present,
        marked_by: userProfile?.email || 'mentor',
      }));
      const { error } = await supabase
        .from('attendance')
        .upsert(records, { onConflict: 'student_id,session_id' });
      if (error) throw error;
      addToast({ title: 'Attendance Saved', message: `Updated ${records.length} student records.` });
      const newExist = {};
      records.forEach(r => { newExist[r.student_id] = r.present; });
      setExistingAttendance(newExist);
    } catch (err) {
      addToast({ title: 'Error', message: err.message, type: 'error' });
    } finally {
      setSaving(false);
      setConfirmModalOpen(false);
    }
  };

  const handleCreateSession = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('sessions')
        .insert({
          date: newDate,
          topic: newTopic,
          month_number: new Date(newDate).getMonth() + 1,
          duration_hours: newDuration,
          session_type: newType,
        })
        .select()
        .single();
      if (error) throw error;
      addToast({ title: 'Session Created', message: `${newTopic} scheduled for ${newDate}.` });
      setScheduleModalOpen(false);
      setNewTopic('');
      await fetchInitialData();
      setSelectedSessionId(data.id.toString());
    } catch (err) {
      addToast({ title: 'Error', message: err.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleCleanup = async () => {
    setCleaningUp(true);
    try {
      const importedSessions = sessions.filter(s => s.topic?.startsWith('Imported:'));
      if (importedSessions.length === 0) {
        addToast({ title: 'Nothing to clean', message: 'No imported sessions found.' });
        setCleanupModalOpen(false);
        return;
      }
      const ids = importedSessions.map(s => s.id);
      const { error } = await supabase.from('sessions').delete().in('id', ids);
      if (error) throw error;
      addToast({ title: 'Cleaned Up', message: `Removed ${ids.length} imported sessions.` });
      setCleanupModalOpen(false);
      await fetchInitialData();
    } catch (err) {
      addToast({ title: 'Error', message: err.message, type: 'error' });
    } finally {
      setCleaningUp(false);
    }
  };

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.usn.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const presentCount = Object.values(attendanceState).filter(Boolean).length;
  const absentCount = students.length - presentCount;

  const formatSessionDate = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00');
    return {
      month: d.toLocaleString('en-US', { month: 'short' }).toUpperCase(),
      day: d.getDate(),
      year: d.getFullYear(),
    };
  };

  const scroll = (dir) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir * 220, behavior: 'smooth' });
    }
  };

  return (
    <div className="pb-32 space-y-8">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-accent-glow" />
            <span className="text-[11px] font-bold text-accent-glow uppercase tracking-[0.2em]">Mark Attendance</span>
          </div>
          <h1 className="text-[36px] font-bold text-fg-primary tracking-tight">Class Management</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCleanupModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-danger/10 border border-danger/20 text-danger text-sm font-bold hover:bg-danger/20 transition-all"
          >
            <Trash2 className="w-4 h-4" />
            Cleanup Imported Sessions
          </button>
          <button
            onClick={() => setScheduleModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white text-void text-sm font-bold hover:bg-fg-secondary transition-all"
          >
            <Plus className="w-4 h-4" />
            Schedule New Class
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-48 w-full rounded-[32px]" />
          <Skeleton className="h-16 w-full rounded-2xl" />
          <div className="grid grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
          </div>
        </div>
      ) : (
        <>
          {/* ── Recently Scheduled ── */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-bold text-fg-tertiary uppercase tracking-[0.2em]">Recently Scheduled</span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-fg-tertiary">{sessions.length} sessions total</span>
                <button onClick={() => scroll(-1)} className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all">
                  <ChevronLeft className="w-4 h-4 text-fg-secondary" />
                </button>
                <button onClick={() => scroll(1)} className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all">
                  <ChevronRight className="w-4 h-4 text-fg-secondary" />
                </button>
              </div>
            </div>
            <div
              ref={scrollRef}
              className="flex gap-4 overflow-x-auto pb-2 scrollbar-none"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {sessions.map(sess => {
                const { month, day, year } = formatSessionDate(sess.date);
                const isActive = sess.id.toString() === selectedSessionId;
                return (
                  <div
                    key={sess.id}
                    onClick={() => setSelectedSessionId(sess.id.toString())}
                    className={`flex-shrink-0 w-[200px] p-5 rounded-[24px] border cursor-pointer transition-all hover:border-accent-glow/40 ${
                      isActive
                        ? 'bg-accent-glow/10 border-accent-glow/60 shadow-[0_0_20px_rgba(99,102,241,0.15)]'
                        : 'bg-surface-raised border-white/5 hover:bg-white/5'
                    }`}
                  >
                    <div className={`w-14 h-14 rounded-full flex flex-col items-center justify-center mb-4 text-white font-bold ${isActive ? 'bg-accent-glow' : 'bg-white/10'}`}>
                      <span className="text-[9px] uppercase tracking-widest leading-none">{month}</span>
                      <span className="text-[22px] leading-tight">{day}</span>
                      <span className="text-[9px] leading-none opacity-70">{year}</span>
                    </div>
                    <p className="text-[13px] font-bold text-fg-primary mb-3 leading-snug line-clamp-2">{sess.topic}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold text-fg-tertiary uppercase tracking-wider">
                        {sess.session_type || 'offline'}
                      </span>
                      <span className="text-[11px] text-fg-tertiary">{sess.duration_hours} hrs</span>
                    </div>
                  </div>
                );
              })}
              {sessions.length === 0 && (
                <div className="flex items-center justify-center w-full py-12 text-fg-tertiary text-sm">
                  No sessions yet. Create one using "Schedule New Class".
                </div>
              )}
            </div>
          </div>

          {/* ── Controls Row ── */}
          {session && (
            <div className="flex flex-col sm:flex-row items-end gap-4">
              <div className="flex-1 min-w-0">
                <label className="block text-[11px] font-bold text-fg-tertiary uppercase tracking-widest mb-2">Active Session</label>
                <select
                  value={selectedSessionId}
                  onChange={e => setSelectedSessionId(e.target.value)}
                  className="w-full bg-surface-raised border border-white/10 rounded-2xl h-12 px-4 text-fg-primary text-sm focus:outline-none focus:border-accent-glow/50 transition-all appearance-none"
                >
                  {sessions.map(s => (
                    <option key={s.id} value={s.id}>
                      {new Date(s.date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}: {s.topic}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1 min-w-0">
                <label className="block text-[11px] font-bold text-fg-tertiary uppercase tracking-widest mb-2">Search Student</label>
                <div className="relative">
                  <Search className="w-4 h-4 text-fg-tertiary absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Name or USN..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full bg-surface-raised border border-white/10 rounded-2xl h-12 pl-10 pr-4 text-fg-primary text-sm placeholder:text-fg-tertiary focus:outline-none focus:border-accent-glow/50 transition-all"
                  />
                </div>
              </div>
              <button
                onClick={() => markAll(true)}
                className="flex items-center gap-2 px-6 h-12 rounded-2xl bg-surface-raised border border-white/10 text-fg-primary text-sm font-bold hover:bg-white/10 transition-all whitespace-nowrap"
              >
                <Users className="w-4 h-4" />
                Mark All Present
              </button>
              <button
                onClick={handleSaveClick}
                disabled={saving}
                className="flex items-center gap-2 px-6 h-12 rounded-2xl bg-white text-void text-sm font-bold hover:bg-fg-secondary transition-all whitespace-nowrap disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Attendance'}
              </button>
            </div>
          )}

          {/* ── Stats Bar ── */}
          {session && (
            <div className="flex items-center gap-6 px-6 py-4 bg-surface-raised border border-white/5 rounded-2xl">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-white/40" />
                <span className="text-sm font-semibold text-fg-secondary">Total: <span className="text-fg-primary font-bold">{students.length}</span></span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-success" />
                <span className="text-sm font-semibold text-fg-secondary">Present: <span className="text-success font-bold">{presentCount}</span></span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-danger" />
                <span className="text-sm font-semibold text-fg-secondary">Absent: <span className="text-danger font-bold">{absentCount}</span></span>
              </div>
            </div>
          )}

          {/* ── Student Cards Grid ── */}
          {session && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredStudents.map(student => {
                const isPresent = attendanceState[student.id] ?? true;
                const color = getColor(student.name);
                return (
                  <div
                    key={student.id}
                    onClick={() => toggleAttendance(student.id)}
                    className={`relative p-5 rounded-[20px] border cursor-pointer transition-all select-none ${
                      isPresent
                        ? 'bg-surface-raised border-success/30 shadow-[0_0_15px_rgba(16,185,129,0.08)]'
                        : 'bg-surface-raised border-white/5 opacity-70'
                    } hover:scale-[1.02] active:scale-95`}
                  >
                    {/* Status icon top-right */}
                    <div className={`absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center ${
                      isPresent ? 'bg-success/20 text-success' : 'bg-white/10 text-fg-tertiary'
                    }`}>
                      {isPresent
                        ? <CheckCircle2 className="w-4 h-4" strokeWidth={2.5} />
                        : <XCircle className="w-4 h-4" strokeWidth={2} />
                      }
                    </div>

                    {/* Avatar */}
                    <div
                      className="w-10 h-10 rounded-[14px] flex items-center justify-center text-white text-[16px] font-black mb-3 shadow-lg"
                      style={{ backgroundColor: color }}
                    >
                      {student.name.charAt(0).toUpperCase()}
                    </div>

                    {/* Name & USN */}
                    <p className="text-[14px] font-bold text-fg-primary leading-snug mb-0.5 pr-8 truncate">{student.name}</p>
                    <p className="text-[11px] font-medium text-fg-tertiary font-mono tracking-wide">{student.usn}</p>
                  </div>
                );
              })}
              {filteredStudents.length === 0 && (
                <div className="col-span-4 flex flex-col items-center justify-center py-16 text-fg-tertiary/40">
                  <Users className="w-16 h-16 mb-4" strokeWidth={0.5} />
                  <p className="text-sm">No students found</p>
                </div>
              )}
            </div>
          )}

          {/* ── No Session Selected ── */}
          {!session && !loading && (
            <div className="flex flex-col items-center justify-center py-24 text-fg-tertiary/40">
              <Calendar className="w-20 h-20 mb-4" strokeWidth={0.5} />
              <p className="text-lg font-medium">Select a session to start marking attendance</p>
              <button
                onClick={() => setScheduleModalOpen(true)}
                className="mt-6 flex items-center gap-2 px-6 py-3 rounded-2xl bg-accent-glow text-white font-bold hover:shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all"
              >
                <Plus className="w-4 h-4" />
                Schedule New Class
              </button>
            </div>
          )}
        </>
      )}

      {/* ── Schedule Modal ── */}
      {scheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-void/80 backdrop-blur-sm p-4">
          <div className="bg-[#13131a] border border-white/10 rounded-[32px] p-8 w-full max-w-md shadow-2xl">
            <h2 className="text-[22px] font-bold text-fg-primary mb-6">Schedule New Class</h2>
            <form onSubmit={handleCreateSession} className="space-y-5">
              <div>
                <label className="block text-[11px] font-bold text-fg-tertiary uppercase tracking-widest mb-2">Session Topic</label>
                <input
                  type="text"
                  required
                  value={newTopic}
                  onChange={e => setNewTopic(e.target.value)}
                  placeholder="e.g., Introduction to React"
                  className="w-full bg-void border border-white/10 rounded-2xl h-12 px-5 text-fg-primary placeholder:text-fg-tertiary text-sm focus:outline-none focus:border-accent-glow/50 transition-all"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-fg-tertiary uppercase tracking-widest mb-2">Date</label>
                <input
                  type="date"
                  required
                  value={newDate}
                  onChange={e => setNewDate(e.target.value)}
                  className="w-full bg-void border border-white/10 rounded-2xl h-12 px-5 text-fg-primary text-sm focus:outline-none focus:border-accent-glow/50 transition-all"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-fg-tertiary uppercase tracking-widest mb-2">Type</label>
                  <select
                    value={newType}
                    onChange={e => setNewType(e.target.value)}
                    className="w-full bg-void border border-white/10 rounded-2xl h-12 px-4 text-fg-primary text-sm focus:outline-none appearance-none"
                  >
                    <option value="offline">Offline</option>
                    <option value="online">Online</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-fg-tertiary uppercase tracking-widest mb-2">Duration (hrs)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    required
                    value={newDuration}
                    onChange={e => setNewDuration(parseFloat(e.target.value))}
                    className="w-full bg-void border border-white/10 rounded-2xl h-12 px-5 text-fg-primary text-sm focus:outline-none focus:border-accent-glow/50 transition-all"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setScheduleModalOpen(false)}
                  className="flex-1 h-12 rounded-2xl border border-white/10 text-fg-secondary text-sm font-bold hover:bg-white/5 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 h-12 rounded-2xl bg-accent-glow text-white text-sm font-bold hover:shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all disabled:opacity-50"
                >
                  {saving ? 'Creating...' : 'Create Session'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Confirm Save Modal ── */}
      <ConfirmModal
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={executeSave}
        title="Override Existing Records?"
        message="Attendance has already been saved for this session. Do you want to overwrite it with the current changes?"
        confirmText="Save Changes"
        isDestructive={false}
      />

      {/* ── Cleanup Confirm Modal ── */}
      <ConfirmModal
        isOpen={cleanupModalOpen}
        onClose={() => setCleanupModalOpen(false)}
        onConfirm={handleCleanup}
        title="Cleanup Imported Sessions?"
        message="This will permanently delete all sessions whose topic starts with 'Imported:' and all their attendance records. This cannot be undone."
        confirmText={cleaningUp ? 'Cleaning...' : 'Delete Imported Sessions'}
        isDestructive={true}
      />
    </div>
  );
};

export default MarkAttendance;
