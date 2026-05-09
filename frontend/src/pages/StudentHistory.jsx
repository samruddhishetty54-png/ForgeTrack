import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { TrendingUp, TrendingDown, Users, Search, Download } from 'lucide-react';
import Skeleton from '../components/ui/Skeleton';

const AVATAR_COLORS = [
  '#6366f1','#10b981','#f59e0b','#ef4444','#3b82f6',
  '#8b5cf6','#ec4899','#14b8a6','#f97316','#84cc16',
];
const getColor = (name = '') => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];

const StatusBadge = ({ pct }) => {
  if (pct >= 85) return (
    <span className="px-3 py-1 rounded-full text-[10px] font-black tracking-widest bg-success/10 text-success border border-success/20">
      EXCELLENT
    </span>
  );
  if (pct >= 75) return (
    <span className="px-3 py-1 rounded-full text-[10px] font-black tracking-widest bg-warning/10 text-warning border border-warning/20">
      WARNING
    </span>
  );
  return (
    <span className="px-3 py-1 rounded-full text-[10px] font-black tracking-widest bg-danger/10 text-danger border border-danger/20">
      CRITICAL
    </span>
  );
};

const ProgressBar = ({ pct }) => {
  const color = pct >= 85 ? '#10b981' : pct >= 75 ? '#f59e0b' : '#ef4444';
  return (
    <div className="flex items-center gap-3">
      <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-[13px] font-bold text-fg-primary w-10 text-right tabular-nums">{pct}%</span>
    </div>
  );
};

const FILTERS = ['All', '> 85%', '75-85%', '< 75%'];

const StudentHistory = () => {
  const [students, setStudents] = useState([]);
  const [totalSessions, setTotalSessions] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [
        { data: stuData },
        { count: sessCount },
        { data: attData },
      ] = await Promise.all([
        supabase.from('students').select('id, name, usn, branch_code').eq('is_active', true).order('name'),
        supabase.from('sessions').select('*', { count: 'exact', head: true }),
        supabase.from('attendance').select('student_id, present'),
      ]);

      setTotalSessions(sessCount ?? 0);

      // Build per-student stats
      const attMap = {};
      (attData || []).forEach(a => {
        if (!attMap[a.student_id]) attMap[a.student_id] = { total: 0, present: 0 };
        attMap[a.student_id].total++;
        if (a.present) attMap[a.student_id].present++;
      });

      const enriched = (stuData || []).map(s => {
        const rec = attMap[s.id] || { total: 0, present: 0 };
        const pct = rec.total > 0 ? parseFloat(((rec.present / rec.total) * 100).toFixed(1)) : 0;
        return { ...s, sessions: rec.total, attended: rec.present, pct };
      });

      setStudents(enriched);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const rows = [['Name', 'USN', 'Branch', 'Sessions', 'Attended', 'Percentage']];
    students.forEach(s => rows.push([s.name, s.usn, s.branch_code, s.sessions, s.attended, `${s.pct}%`]));
    const csv = rows.map(r => r.join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'student_history.csv';
    a.click();
  };

  // Derived stats
  const avgAttendance = students.length > 0
    ? parseFloat((students.reduce((s, x) => s + x.pct, 0) / students.length).toFixed(1))
    : 0;
  const lowCount = students.filter(s => s.pct < 75).length;

  // Filtering
  const filtered = students
    .filter(s => {
      const q = search.toLowerCase();
      return s.name.toLowerCase().includes(q) || s.usn.toLowerCase().includes(q);
    })
    .filter(s => {
      if (filter === '> 85%') return s.pct > 85;
      if (filter === '75-85%') return s.pct >= 75 && s.pct <= 85;
      if (filter === '< 75%') return s.pct < 75;
      return true;
    });

  return (
    <div className="space-y-6 pb-12">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <TrendingUp className="w-4 h-4 text-accent-glow" />
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-accent-glow">Analytics</span>
          </div>
          <h1 className="text-[32px] font-bold text-fg-primary tracking-tight">Student History</h1>
          <p className="text-[13px] text-fg-tertiary mt-1">Track long-term attendance and engagement across all sessions.</p>
        </div>
        <div className="flex items-center gap-3 mt-1">
          <div className="relative">
            <Search className="w-4 h-4 text-fg-tertiary absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search USN or Name..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-[#111118] border border-white/8 rounded-xl h-9 pl-9 pr-4 text-[13px] text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:border-accent-glow/40 transition-all w-52"
            />
          </div>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 h-9 rounded-xl bg-[#111118] border border-white/8 text-[13px] font-semibold text-fg-secondary hover:text-fg-primary hover:bg-white/5 transition-all"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* ── 3 Stat Cards ── */}
      {loading ? (
        <div className="grid grid-cols-3 gap-4">
          {[1,2,3].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="relative overflow-hidden bg-[#111118] border border-white/[0.06] rounded-2xl px-6 py-5 flex items-center gap-5">
            <div className="absolute inset-0 bg-gradient-to-br from-accent-glow/8 to-transparent pointer-events-none" />
            <div className="w-10 h-10 rounded-xl bg-accent-glow/15 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-accent-glow" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-fg-tertiary">Total Students</p>
              <p className="text-[32px] font-black text-fg-primary leading-none mt-0.5">{students.length}</p>
            </div>
          </div>

          <div className="relative overflow-hidden bg-[#111118] border border-white/[0.06] rounded-2xl px-6 py-5 flex items-center gap-5">
            <div className="absolute inset-0 bg-gradient-to-br from-success/8 to-transparent pointer-events-none" />
            <div className="w-10 h-10 rounded-xl bg-success/15 flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-fg-tertiary">Avg Attendance</p>
              <p className="text-[32px] font-black text-fg-primary leading-none mt-0.5">{avgAttendance}%</p>
            </div>
          </div>

          <div className="relative overflow-hidden bg-[#111118] border border-white/[0.06] rounded-2xl px-6 py-5 flex items-center gap-5">
            <div className="absolute inset-0 bg-gradient-to-br from-danger/8 to-transparent pointer-events-none" />
            <div className="w-10 h-10 rounded-xl bg-danger/15 flex items-center justify-center shrink-0">
              <TrendingDown className="w-5 h-5 text-danger" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-fg-tertiary">Low Attendance</p>
              <p className="text-[32px] font-black text-fg-primary leading-none mt-0.5">{lowCount} <span className="text-[16px] font-bold text-fg-tertiary">Students</span></p>
            </div>
          </div>
        </div>
      )}

      {/* ── Filter Tabs + Count ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 bg-[#111118] border border-white/[0.06] rounded-xl p-1">
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-lg text-[12px] font-bold transition-all ${
                filter === f
                  ? 'bg-accent-glow text-white shadow-[0_0_12px_rgba(99,102,241,0.3)]'
                  : 'text-fg-tertiary hover:text-fg-primary hover:bg-white/5'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-fg-tertiary">
          Showing {filtered.length} of {students.length} Students
        </span>
      </div>

      {/* ── Table ── */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      ) : (
        <div className="bg-[#0d0d14] border border-white/[0.06] rounded-2xl overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-[2fr_1fr_1fr_1.5fr_1fr] gap-4 px-6 py-3 border-b border-white/5 bg-white/[0.02]">
            {['STUDENT INFO', 'SESSIONS', 'ATTENDED', 'PERCENTAGE', 'STATUS'].map(h => (
              <span key={h} className="text-[10px] font-bold uppercase tracking-[0.15em] text-fg-tertiary">{h}</span>
            ))}
          </div>

          {/* Rows */}
          <div className="divide-y divide-white/[0.04]">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-fg-tertiary/30 gap-3">
                <Users className="w-12 h-12" strokeWidth={0.5} />
                <p className="text-sm">No students match your filter.</p>
              </div>
            ) : (
              filtered.map(student => (
                <div
                  key={student.id}
                  className="grid grid-cols-[2fr_1fr_1fr_1.5fr_1fr] gap-4 items-center px-6 py-4 hover:bg-white/[0.02] transition-all group"
                >
                  {/* Student Info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[14px] font-black shrink-0 shadow-md"
                      style={{ backgroundColor: getColor(student.name) }}
                    >
                      {student.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[14px] font-bold text-fg-primary group-hover:text-accent-glow transition-colors truncate">
                        {student.name}
                      </p>
                      <p className="text-[11px] text-fg-tertiary font-mono tracking-wide">{student.usn}</p>
                    </div>
                  </div>

                  {/* Sessions */}
                  <span className="text-[14px] font-semibold text-fg-secondary tabular-nums">{totalSessions}</span>

                  {/* Attended */}
                  <span className="text-[14px] font-semibold text-fg-secondary tabular-nums">{student.attended}</span>

                  {/* Progress + % */}
                  <ProgressBar pct={student.pct} />

                  {/* Status */}
                  <StatusBadge pct={student.pct} />
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentHistory;
