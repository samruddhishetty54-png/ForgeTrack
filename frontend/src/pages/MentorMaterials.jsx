import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import Skeleton from '../components/ui/Skeleton';
import { 
  Search, 
  Plus, 
  ExternalLink, 
  PlayCircle, 
  FileText, 
  Link as LinkIcon, 
  Calendar,
  BookOpen,
  X
} from 'lucide-react';

const MentorMaterials = () => {
  const { addToast } = useToast();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Form State
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [matTitle, setMatTitle] = useState('');
  const [matType, setMatType] = useState('link');
  const [matUrl, setMatUrl] = useState('');

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select(`
          id, date, topic,
          materials ( id, title, type, url )
        `)
        .order('date', { ascending: false });
        
      if (error) throw error;
      setSessions(data || []);
    } catch (error) {
      console.error(error);
      addToast({ title: 'Error fetching materials', message: error.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddMaterial = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('materials')
        .insert({
          session_id: selectedSessionId,
          title: matTitle,
          type: matType,
          url: matUrl
        });
        
      if (error) throw error;
      
      addToast({ title: 'Material Added', message: 'Resource linked successfully.' });
      setIsModalOpen(false);
      setMatTitle('');
      setMatUrl('');
      fetchMaterials();
    } catch (error) {
      addToast({ title: 'Error', message: error.message, type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const getIconForType = (type) => {
    switch (type) {
      case 'video': return <PlayCircle className="w-4 h-4" />;
      case 'slides': return <FileText className="w-4 h-4" />;
      default: return <LinkIcon className="w-4 h-4" />;
    }
  };

  const filteredSessions = sessions.filter(s => 
    s.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.materials.some(m => m.title.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="pb-12 space-y-10">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 mb-10">
        <div>
          <h1 className="text-[40px] font-bold text-fg-primary tracking-tight mb-2">Materials Library</h1>
          <p className="text-body-lg text-fg-tertiary">Central repository for all bootcamp session resources.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
          <div className="relative group">
            <Search className="w-4 h-4 text-fg-tertiary absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-accent-glow transition-colors" />
            <input 
              type="text" 
              placeholder="Search library..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-surface-raised border border-white/5 rounded-2xl h-14 pl-12 pr-6 text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:border-white/10 transition-all w-full sm:w-80"
            />
          </div>
          <button 
            onClick={() => setIsModalOpen(true)} 
            className="bg-accent-glow text-white px-8 h-14 rounded-2xl font-bold flex items-center justify-center gap-3 hover:shadow-[0_0_30px_rgba(99,102,241,0.3)] transition-all shrink-0"
          >
            <Plus className="w-5 h-5" /> Add Material
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-64 rounded-[40px]" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {filteredSessions.map(session => (
            <div key={session.id} className="card bg-surface-raised border border-white/5 rounded-[40px] p-8 flex flex-col group hover:border-white/10 transition-all">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2 text-[11px] font-bold text-fg-tertiary tracking-widest uppercase">
                  <Calendar className="w-3.5 h-3.5 text-accent-glow" />
                  {new Date(session.date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
                <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-fg-tertiary">
                   <BookOpen className="w-4 h-4" />
                </div>
              </div>
              <h3 className="text-[24px] font-bold text-fg-primary mb-8 group-hover:text-accent-glow transition-colors leading-tight">{session.topic}</h3>
              
              <div className="mt-auto space-y-3">
                {session.materials && session.materials.length > 0 ? (
                  session.materials.map(mat => (
                    <a 
                      key={mat.id}
                      href={mat.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-4 p-4 rounded-2xl bg-void/30 border border-white/5 hover:bg-void/50 hover:border-white/10 transition-all group/mat"
                    >
                      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-fg-tertiary group-hover/mat:text-accent-glow transition-colors">
                        {getIconForType(mat.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-fg-secondary truncate group-hover/mat:text-fg-primary transition-colors">{mat.title}</p>
                        <p className="text-[10px] font-bold text-fg-tertiary uppercase tracking-widest mt-0.5">{mat.type}</p>
                      </div>
                      <ExternalLink className="w-4 h-4 text-fg-tertiary opacity-0 group-hover/mat:opacity-100 transition-all -translate-x-2 group-hover/mat:translate-x-0" />
                    </a>
                  ))
                ) : (
                  <div className="py-8 text-center bg-void/20 rounded-2xl border border-dashed border-white/5">
                    <p className="text-sm font-medium text-fg-tertiary italic">No resources attached</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Material Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-void/80 backdrop-blur-md">
          <div className="bg-surface-raised border border-white/10 rounded-[40px] w-full max-w-xl p-10 shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-in fade-in zoom-in duration-300">
            <div className="flex justify-between items-center mb-10">
              <h2 className="text-[32px] font-bold text-fg-primary tracking-tight">Add Material</h2>
              <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 rounded-full hover:bg-white/5 flex items-center justify-center text-fg-tertiary hover:text-fg-primary transition-all">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleAddMaterial} className="space-y-6">
              <div>
                <label className="block text-[11px] font-bold text-fg-tertiary uppercase tracking-widest mb-3">SELECT SESSION</label>
                <select 
                  required
                  value={selectedSessionId}
                  onChange={e => setSelectedSessionId(e.target.value)}
                  className="w-full bg-void border border-white/10 rounded-2xl h-14 px-6 text-fg-primary focus:outline-none focus:border-accent-glow/50 transition-all cursor-pointer appearance-none"
                >
                  <option value="" disabled>Link to a session...</option>
                  {sessions.map(s => (
                    <option key={s.id} value={s.id}>
                      {new Date(s.date).toLocaleDateString()} - {s.topic}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-[11px] font-bold text-fg-tertiary uppercase tracking-widest mb-3">RESOURCE TITLE</label>
                <input 
                  type="text" 
                  required 
                  value={matTitle}
                  onChange={e => setMatTitle(e.target.value)}
                  placeholder="e.g., Session Recording: Week 4" 
                  className="w-full bg-void border border-white/10 rounded-2xl h-14 px-6 text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:border-accent-glow/50 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-[11px] font-bold text-fg-tertiary uppercase tracking-widest mb-3">RESOURCE TYPE</label>
                  <select 
                    value={matType}
                    onChange={e => setMatType(e.target.value)}
                    className="w-full bg-void border border-white/10 rounded-2xl h-14 px-6 text-fg-primary focus:outline-none focus:border-accent-glow/50 transition-all appearance-none"
                  >
                    <option value="link">General Link</option>
                    <option value="video">Video Recording</option>
                    <option value="slides">Slides / PDF</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-fg-tertiary uppercase tracking-widest mb-3">RESOURCE URL</label>
                  <input 
                    type="url" 
                    required 
                    value={matUrl}
                    onChange={e => setMatUrl(e.target.value)}
                    placeholder="https://..." 
                    className="w-full bg-void border border-white/10 rounded-2xl h-14 px-6 text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:border-accent-glow/50 transition-all"
                  />
                </div>
              </div>

              <div className="flex gap-4 mt-10">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 h-14 rounded-2xl font-bold border border-white/10 text-fg-secondary hover:bg-white/5 transition-all">
                  Cancel
                </button>
                <button type="submit" disabled={submitting || !selectedSessionId} className="flex-1 bg-white text-void h-14 rounded-2xl font-black hover:bg-fg-secondary transition-all">
                  {submitting ? 'Linking...' : 'Add Resource'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MentorMaterials;
