import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { TrendingUp, TrendingDown, Users, Search, Download, ChevronDown, CheckCircle2, XCircle, ArrowUpDown } from 'lucide-react';
import Skeleton from '../components/ui/Skeleton';

const AVATAR_COLORS = [
  '#6366f1','#10b981','#f59e0b','#ef4444','#3b82f6',
  '#8b5cf6','#ec4899','#14b8a6','#f97316','#84cc16',
];
const getColor = (name = '') => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];

const StatusBadge = ({ pct }) => {
  if (pct >= 85) return <span className="px-3 py-1 rounded-full text-[10px] font-black tracking-widest bg-success/10 text-success border border-success/20">EXCELLENT</span>;
  if (pct >= 75) return <span className="px-3 py-1 rounded-full text-[10px] font-black tracking-widest bg-warning/10 text-warning border border-warning/20">WARNING</span>;
  return <span className="px-3 py-1 rounded-full text-[10px] font-black tracking-widest bg-danger/10 text-danger border border-danger/20">CRITICAL</span>;
};

const ProgressBar = ({ pct }) => {
  const color = pct >= 85 ? '#10b981' : pct >= 75 ? '#f59e0b' : '#ef4444';
  return (
    <div className="flex items-center gap-3">
      <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }} />
      </div>
      <span className="text-[13px] font-bold text-fg-primary w-10 text-right tabular-nums">{pct}%</span>
    </div>
  );
};

const FILTERS = ['All', '> 85%', '75-85%', '< 75%'];
const SORT_OPTIONS = { field: 'name', dir: 'asc' };

// ── Expandable session history row ──
const SessionGrid = ({ studentId }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: sessions } = await supabase.from('sessions').select('id, date, topic').order('date', { ascending: true });
      const { data: att } = await supabase.from('attendance').select('session_id, present').eq('student_id', studentId);
      const attMap = {};
      (att || []).forEach(a => { attMap[a.session_id] = a.present; });
      setHistory((sessions || []).map(s => ({ ...s, present: attMap[s.id] ?? null })));
      setLoading(false);
    }
    load();
  }, [studentId]);

  if (loading) return <div className="py-4 flex gap-2">{[...Array(8)].map((_, i) => <Skeleton key={i} className="w-8 h-8 rounded-lg" />)}</div>;

  return (
    <div className="pt-3 pb-1">
      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-fg-tertiary mb-3">Session-by-Session Attendance</p>
      <div className="flex flex-wrap gap-2">
        {history.map(s => (
          <div
            key={s.id}
            title={`${s.date}: ${s.topic}`}
            className={`w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold cursor-help transition-all hover:scale-110 ${
              s.present === true  ? 'bg-success/20 text-success border border-success/30' :
              s.present === false ? 'bg-danger/15 text-danger border border-danger/20' :
              'bg-white/5 text-fg-tertiary/40 border border-white/5'
            }`}
          >
            {new Date(s.date + 'T00:00:00').getDate()}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-5 mt-3 text-[11px] text-fg-tertiary">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-success/20 border border-success/30 inline-block" /> Present</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-danger/15 border border-danger/20 inline-block" /> Absent</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-white/5 border border-white/5 inline-block" /> No record</span>
      </div>
    </div>
  );
};

const StudentHistory = () => {
  const [students, setStudents] = useState([]);
  const [totalSessions, setTotalSessions] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [expandedId, setExpandedId] = useState(null);
  const [sort, setSort] = useState(SORT_OPTIONS);

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

  const toggleSort = (field) => {
    setSort(prev => ({ field, dir: prev.field === field && prev.dir === 'asc' ? 'desc' : 'asc' }));
  };

  const toggleExpand = (id) => setExpandedId(prev => prev === id ? null : id);

  const avgAttendance = students.length > 0
    ? parseFloat((students.reduce((s, x) => s + x.pct, 0) / students.length).toFixed(1)) : 0;
  const lowCount = students.filter(s => s.pct < 75).length;

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
    })
    .sort((a, b) => {
      const { field, dir } = sort;
      let va = a[field], vb = b[field];
      if (typeof va === 'string') va = va.toLowerCase(), vb = vb.toLowerCase();
      if (va < vb) return dir === 'asc' ? -1 : 1;
      if (va > vb) return dir === 'asc' ? 1 : -1;
      return 0;
    });

  const SortHeader = ({ label, field }) => (
    <button onClick={() => toggleSort(field)} className="flex items-center gap-1.5 group">
      <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-fg-tertiary group-hover:text-fg-secondary transition-colors">{label}</span>
      <ArrowUpDown className={`w-3 h-3 transition-colors ${sort.field === field ? 'text-accent-glow' : 'text-fg-tertiary/40 group-hover:text-fg-tertiary'}`} />
    </button>
  );

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
                filter === f ? 'bg-accent-glow text-white shadow-[0_0_12px_rgba(99,102,241,0.3)]' : 'text-fg-tertiary hover:text-fg-primary hover:bg-white/5'
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
        <div className="space-y-3">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      ) : (
        <div className="bg-[#0d0d14] border border-white/[0.06] rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[2fr_1fr_1fr_1.5fr_1fr_40px] gap-4 px-6 py-3 border-b border-white/5 bg-white/[0.02]">
            <SortHeader label="Student Info" field="name" />
            <SortHeader label="Sessions" field="sessions" />
            <SortHeader label="Attended" field="attended" />
            <SortHeader label="Percentage" field="pct" />
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-fg-tertiary">Status</span>
            <span />
          </div>

          {/* Rows */}
          <div className="divide-y divide-white/[0.04]">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-fg-tertiary/30 gap-3">
                <Users className="w-12 h-12" strokeWidth={0.5} />
                <p className="text-sm">No students match your filter.</p>
              </div>
            ) : filtered.map(student => (
              <div key={student.id}>
                {/* Main Row */}
                <div
                  onClick={() => toggleExpand(student.id)}
                  className={`grid grid-cols-[2fr_1fr_1fr_1.5fr_1fr_40px] gap-4 items-center px-6 py-4 cursor-pointer transition-all group ${
                    expandedId === student.id ? 'bg-white/[0.03]' : 'hover:bg-white/[0.02]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[14px] font-black shrink-0 shadow-md"
                      style={{ backgroundColor: getColor(student.name) }}
                    >
                      {student.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[14px] font-bold text-fg-primary group-hover:text-accent-glow transition-colors truncate">{student.name}</p>
                      <p className="text-[11px] text-fg-tertiary font-mono tracking-wide">{student.usn}</p>
                    </div>
                  </div>
                  <span className="text-[14px] font-semibold text-fg-secondary tabular-nums">{totalSessions}</span>
                  <span className="text-[14px] font-semibold text-fg-secondary tabular-nums">{student.attended}</span>
                  <ProgressBar pct={student.pct} />
                  <StatusBadge pct={student.pct} />
                  <ChevronDown className={`w-4 h-4 text-fg-tertiary transition-transform ${expandedId === student.id ? 'rotate-180' : ''}`} />
                </div>

                {/* Expanded Row */}
                {expandedId === student.id && (
                  <div className="px-6 pb-5 bg-white/[0.015] border-t border-white/[0.04]">
                    <SessionGrid studentId={student.id} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentHistory;
