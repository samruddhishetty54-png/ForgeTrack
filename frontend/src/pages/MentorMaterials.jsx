import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import Skeleton from '../components/ui/Skeleton';
import { Search, Plus, ExternalLink, PlayCircle, FileText, Link as LinkIcon, Calendar } from 'lucide-react';

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
      
      addToast({ title: 'Material Added', message: 'Resource linked to session successfully.' });
      setIsModalOpen(false);
      setMatTitle('');
      setMatUrl('');
      fetchMaterials(); // refresh
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
    <div className="pb-12 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
        <div>
          <h1 className="text-h1 text-fg-primary mb-2">Materials Library</h1>
          <p className="text-body text-fg-secondary">Manage and share class resources.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative">
            <Search className="w-4 h-4 text-fg-tertiary absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search materials..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="input-field pl-10 w-full sm:w-64"
            />
          </div>
          <button onClick={() => setIsModalOpen(true)} className="btn-primary w-full sm:w-auto shrink-0">
            <Plus className="w-4 h-4" /> Add Material
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredSessions.map(session => (
            <div key={session.id} className="card flex flex-col">
              <div className="flex items-center gap-2 text-caption text-fg-tertiary font-mono mb-2">
                <Calendar className="w-3 h-3" />
                {new Date(session.date).toLocaleDateString()}
              </div>
              <h3 className="text-h3 text-fg-primary mb-4">{session.topic}</h3>
              
              <div className="mt-auto space-y-2 pt-4 border-t border-border-subtle">
                {session.materials && session.materials.length > 0 ? (
                  session.materials.map(mat => (
                    <a 
                      key={mat.id}
                      href={mat.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2 rounded-md hover:bg-surface-raised transition-colors text-fg-secondary hover:text-accent-glow group"
                    >
                      <span className="text-fg-tertiary group-hover:text-accent-glow">{getIconForType(mat.type)}</span>
                      <span className="text-body-sm flex-1 truncate">{mat.title}</span>
                      <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </a>
                  ))
                ) : (
                  <p className="text-body-sm text-fg-tertiary italic p-2">No materials attached.</p>
                )}
              </div>
            </div>
          ))}
          {filteredSessions.length === 0 && (
            <div className="col-span-full py-12 text-center text-fg-tertiary">
              No sessions or materials found.
            </div>
          )}
        </div>
      )}

      {/* Add Material Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <h2 className="text-h2 text-fg-primary mb-6">Add Material</h2>
            
            <form onSubmit={handleAddMaterial} className="space-y-4">
              <div>
                <label className="block text-label text-fg-secondary mb-2">SESSION</label>
                <select 
                  required
                  value={selectedSessionId}
                  onChange={e => setSelectedSessionId(e.target.value)}
                  className="input-field bg-surface-inset border-border-default cursor-pointer"
                >
                  <option value="" disabled>Select a session...</option>
                  {sessions.map(s => (
                    <option key={s.id} value={s.id}>
                      {new Date(s.date).toLocaleDateString()} - {s.topic}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-label text-fg-secondary mb-2">TITLE</label>
                <input 
                  type="text" 
                  required 
                  value={matTitle}
                  onChange={e => setMatTitle(e.target.value)}
                  placeholder="e.g., Python Generators Deep Dive" 
                  className="input-field" 
                />
              </div>

              <div>
                <label className="block text-label text-fg-secondary mb-2">TYPE</label>
                <select 
                  value={matType}
                  onChange={e => setMatType(e.target.value)}
                  className="input-field cursor-pointer"
                >
                  <option value="link">General Link</option>
                  <option value="video">Video Recording</option>
                  <option value="slides">Slides / PDF</option>
                </select>
              </div>

              <div>
                <label className="block text-label text-fg-secondary mb-2">URL</label>
                <input 
                  type="url" 
                  required 
                  value={matUrl}
                  onChange={e => setMatUrl(e.target.value)}
                  placeholder="https://..." 
                  className="input-field" 
                />
              </div>

              <div className="flex justify-end gap-3 mt-8">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={submitting || !selectedSessionId} className="btn-primary">
                  {submitting ? 'Adding...' : 'Add Material'}
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
