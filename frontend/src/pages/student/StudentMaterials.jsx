import { useEffect, useState } from 'react';

import { supabase } from '../../lib/supabase';
import Skeleton from '../../components/ui/Skeleton';
import { 
  FileText, 
  Video, 
  Link as LinkIcon, 
  ExternalLink,
  Search,
  BookOpen,
  AlertCircle
} from 'lucide-react';


const StudentMaterials = () => {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function fetchMaterials() {
      try {
        setLoading(true);
        setError(null);

        const { data, error } = await supabase
          .from('materials')
          .select(`
            id,
            title,
            type,
            url,
            description,
            sessions (
              date,
              topic
            )
          `)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setMaterials(data || []);
      } catch (err) {
        console.error("Error fetching materials:", err);
        setError(err.message || "Failed to connect to Supabase.");
      } finally {
        setLoading(false);
      }

    }

    fetchMaterials();
  }, []);

  const filteredMaterials = materials.filter(m => {
    const titleMatch = m.title?.toLowerCase().includes(searchTerm.toLowerCase());
    const topicMatch = m.sessions?.topic?.toLowerCase().includes(searchTerm.toLowerCase());
    return titleMatch || topicMatch;
  });


  const getIcon = (type) => {
    switch (type.toLowerCase()) {
      case 'slides': return <FileText className="w-5 h-5 text-accent-glow" />;
      case 'recording': return <Video className="w-5 h-5 text-success" />;
      case 'document': return <FileText className="w-5 h-5 text-info" />;
      case 'link': return <LinkIcon className="w-5 h-5 text-warning" />;
      default: return <BookOpen className="w-5 h-5 text-fg-tertiary" />;
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-display-lg text-fg-primary mb-2">Class Materials</h1>
          <p className="text-body-lg text-fg-secondary">Access slides, recordings, and handouts.</p>
        </div>
        
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-tertiary" />
          <input
            type="text"
            placeholder="Search materials or topics..."
            className="input-field pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : error ? (
        <div className="card border-danger/50 bg-danger/5 flex flex-col items-center justify-center py-12 text-center">
          <div className="w-12 h-12 rounded-full bg-danger/10 flex items-center justify-center mb-4 text-danger">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-h3 text-fg-primary mb-2">Connection Error</h3>
          <p className="text-body text-fg-secondary max-w-md mb-6">
            {error}. Check your .env.local file.
          </p>
          <button onClick={() => window.location.reload()} className="btn-secondary">
            Retry Connection
          </button>
        </div>
      ) : filteredMaterials.length > 0 ? (

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMaterials.map((material) => (
            <div key={material.id} className="card flex flex-col hover:border-accent-glow/50 transition-colors group">
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-full bg-surface-inset flex items-center justify-center">
                  {getIcon(material.type)}
                </div>
                <span className="pill bg-surface-inset text-fg-secondary text-micro border border-border-default uppercase">
                  {material.type}
                </span>
              </div>
              
              <h3 className="text-h3 text-fg-primary mb-1 group-hover:text-accent-glow transition-colors">{material.title}</h3>
              <p className="text-caption text-fg-tertiary mb-4">
                Session: {material.sessions?.topic || 'General'} • {material.sessions?.date ? new Date(material.sessions.date).toLocaleDateString() : 'N/A'}
              </p>
              
              {material.description && (
                <p className="text-body-sm text-fg-secondary mb-6 line-clamp-2">
                  {material.description}
                </p>
              )}
              
              <a 
                href={material.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="mt-auto btn-secondary w-full flex items-center justify-center gap-2 py-2"
              >
                <span>View Resource</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          ))}
        </div>
      ) : (
        <div className="card flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-surface-inset flex items-center justify-center mb-4">
            <BookOpen className="w-8 h-8 text-fg-tertiary" />
          </div>
          <h3 className="text-h3 text-fg-primary mb-2">No Materials Found</h3>
          <p className="text-body text-fg-secondary max-w-md">
            {searchTerm ? "No materials match your search criteria." : "Your mentor hasn't uploaded any materials yet."}
          </p>
        </div>
      )}
    </div>
  );
};

export default StudentMaterials;
