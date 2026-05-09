import React, { useState } from 'react';
import { ClipboardList, Calendar, Plus, ChevronRight, Award, Users, Clock, X } from 'lucide-react';

// Static data — swap with Supabase table once you add one
const INITIAL_ASSIGNMENTS = [
  {
    id: 1,
    title: 'AI',
    description: '10 pages assignment on MEANS-ENDS ANALYSIS',
    status: 'active',
    dueDate: '2026-05-19',
    maxPoints: 50,
    submissions: 28,
    totalStudents: 66,
  },
];

const STATUS_STYLES = {
  active:   { label: 'Active',   bg: 'bg-accent-glow/15', text: 'text-accent-glow',   border: 'border-accent-glow/25' },
  upcoming: { label: 'Upcoming', bg: 'bg-warning/10',     text: 'text-warning',       border: 'border-warning/20' },
  closed:   { label: 'Closed',   bg: 'bg-white/5',        text: 'text-fg-tertiary',   border: 'border-white/10' },
};

const formatDue = (dateStr) => {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'numeric', year: 'numeric' });
};

const daysUntil = (dateStr) => {
  const diff = new Date(dateStr + 'T00:00:00') - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

const Assignments = () => {
  const [assignments, setAssignments] = useState(INITIAL_ASSIGNMENTS);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState('All');

  const [form, setForm] = useState({ title: '', description: '', dueDate: '', maxPoints: 50, status: 'active' });

  const handleAdd = (e) => {
    e.preventDefault();
    const newItem = { ...form, id: Date.now(), submissions: 0, totalStudents: 66, maxPoints: Number(form.maxPoints) };
    setAssignments(prev => [newItem, ...prev]);
    setForm({ title: '', description: '', dueDate: '', maxPoints: 50, status: 'active' });
    setShowModal(false);
  };

  const filtered = assignments.filter(a => filter === 'All' || a.status === filter.toLowerCase());

  const active   = assignments.filter(a => a.status === 'active').length;
  const upcoming = assignments.filter(a => a.status === 'upcoming').length;
  const closed   = assignments.filter(a => a.status === 'closed').length;

  return (
    <div className="space-y-6 pb-12">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <ClipboardList className="w-4 h-4 text-accent-glow" />
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-accent-glow">Activities</span>
          </div>
          <h1 className="text-[32px] font-bold text-fg-primary tracking-tight">Assignments</h1>
          <p className="text-[13px] text-fg-tertiary mt-1">Manage and track student assignments and submissions.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-void text-[13px] font-bold hover:bg-fg-secondary transition-all self-start mt-1"
        >
          <Plus className="w-4 h-4" />
          New Assignment
        </button>
      </div>

      {/* ── Summary Row ── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Active', value: active,   color: 'text-accent-glow', bg: 'from-accent-glow/8' },
          { label: 'Upcoming', value: upcoming, color: 'text-warning',    bg: 'from-warning/8' },
          { label: 'Closed', value: closed,   color: 'text-fg-tertiary', bg: 'from-white/4' },
        ].map(s => (
          <div key={s.label} className={`relative overflow-hidden bg-[#111118] border border-white/[0.06] rounded-2xl px-5 py-4`}>
            <div className={`absolute inset-0 bg-gradient-to-br ${s.bg} to-transparent pointer-events-none`} />
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-fg-tertiary">{s.label}</p>
            <p className={`text-[32px] font-black leading-none mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Filter Tabs ── */}
      <div className="flex items-center gap-1 bg-[#111118] border border-white/[0.06] rounded-xl p-1 self-start w-fit">
        {['All', 'Active', 'Upcoming', 'Closed'].map(f => (
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

      {/* ── Assignment Cards Grid ── */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-fg-tertiary/30 gap-4">
          <ClipboardList className="w-16 h-16" strokeWidth={0.5} />
          <p className="text-[15px] font-medium">No assignments in this category.</p>
          <button onClick={() => setShowModal(true)} className="text-accent-glow text-sm font-semibold hover:underline flex items-center gap-1">
            <Plus className="w-4 h-4" /> Create one now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map(a => {
            const st = STATUS_STYLES[a.status] || STATUS_STYLES.active;
            const days = daysUntil(a.dueDate);
            const submissionPct = a.totalStudents > 0 ? Math.round((a.submissions / a.totalStudents) * 100) : 0;

            return (
              <div
                key={a.id}
                className="group bg-[#0f0f17] border border-white/[0.06] rounded-2xl p-6 flex flex-col gap-4 hover:border-accent-glow/20 transition-all hover:shadow-[0_0_24px_rgba(99,102,241,0.07)]"
              >
                {/* Top row */}
                <div className="flex items-center justify-between">
                  <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black tracking-widest border ${st.bg} ${st.text} ${st.border}`}>
                    {st.label.toUpperCase()}
                  </span>
                  <div className="flex items-center gap-1.5 text-fg-tertiary text-[12px]">
                    <Calendar className="w-3.5 h-3.5" />
                    Due: {formatDue(a.dueDate)}
                  </div>
                </div>

                {/* Title + Desc */}
                <div>
                  <h3 className="text-[20px] font-black text-accent-glow leading-tight mb-1">{a.title}</h3>
                  <p className="text-[13px] text-fg-secondary leading-relaxed line-clamp-2">{a.description}</p>
                </div>

                {/* Divider */}
                <div className="h-px bg-white/[0.06]" />

                {/* Metadata row */}
                <div className="flex items-center justify-between gap-3 text-[12px]">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-fg-tertiary">Max Points</p>
                      <p className="text-[18px] font-black text-fg-primary">{a.maxPoints}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-fg-tertiary">Due In</p>
                      <p className={`text-[18px] font-black ${days <= 3 ? 'text-danger' : days <= 7 ? 'text-warning' : 'text-fg-primary'}`}>
                        {days > 0 ? `${days}d` : 'Past'}
                      </p>
                    </div>
                  </div>
                  <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-fg-primary text-[12px] font-bold hover:bg-white/10 hover:border-white/20 transition-all group-hover:border-accent-glow/30">
                    View Submissions
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Submission progress */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5 text-fg-tertiary text-[11px]">
                      <Users className="w-3.5 h-3.5" />
                      <span>{a.submissions}/{a.totalStudents} submitted</span>
                    </div>
                    <span className="text-[11px] font-bold text-fg-tertiary">{submissionPct}%</span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-accent-glow transition-all duration-700"
                      style={{ width: `${submissionPct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Add Assignment Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-void/80 backdrop-blur-sm p-4">
          <div className="bg-[#13131a] border border-white/10 rounded-[28px] p-8 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[20px] font-bold text-fg-primary">New Assignment</h2>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all">
                <X className="w-4 h-4 text-fg-tertiary" />
              </button>
            </div>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-fg-tertiary mb-2">Title</label>
                <input
                  required value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="e.g., AI"
                  className="w-full bg-void border border-white/10 rounded-xl h-11 px-4 text-[13px] text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:border-accent-glow/50 transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-fg-tertiary mb-2">Description</label>
                <textarea
                  required value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="e.g., 10 pages on Means-Ends Analysis"
                  rows={3}
                  className="w-full bg-void border border-white/10 rounded-xl px-4 py-3 text-[13px] text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:border-accent-glow/50 transition-all resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-fg-tertiary mb-2">Due Date</label>
                  <input
                    type="date" required value={form.dueDate}
                    onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))}
                    className="w-full bg-void border border-white/10 rounded-xl h-11 px-4 text-[13px] text-fg-primary focus:outline-none focus:border-accent-glow/50 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-fg-tertiary mb-2">Max Points</label>
                  <input
                    type="number" min="1" required value={form.maxPoints}
                    onChange={e => setForm(p => ({ ...p, maxPoints: e.target.value }))}
                    className="w-full bg-void border border-white/10 rounded-xl h-11 px-4 text-[13px] text-fg-primary focus:outline-none focus:border-accent-glow/50 transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-fg-tertiary mb-2">Status</label>
                <select
                  value={form.status}
                  onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                  className="w-full bg-void border border-white/10 rounded-xl h-11 px-4 text-[13px] text-fg-primary focus:outline-none appearance-none"
                >
                  <option value="active">Active</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 h-11 rounded-xl border border-white/10 text-fg-secondary text-[13px] font-bold hover:bg-white/5 transition-all">
                  Cancel
                </button>
                <button type="submit"
                  className="flex-1 h-11 rounded-xl bg-accent-glow text-white text-[13px] font-bold hover:shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all">
                  Create Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Assignments;
