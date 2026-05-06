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
  AlertCircle,
  PlayCircle,
  Calendar
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
      case 'video':
      case 'recording': return <PlayCircle className="w-5 h-5 text-success" />;
      case 'document': return <FileText className="w-5 h-5 text-accent-glow" />;
      case 'link': return <LinkIcon className="w-5 h-5 text-warning" />;
      default: return <BookOpen className="w-5 h-5 text-fg-tertiary" />;
    }
  };

  return (
    <div className="space-y-10 pb-12">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div>
          <h1 className="text-[40px] font-bold text-fg-primary tracking-tight mb-2">Class Materials</h1>
          <p className="text-body-lg text-fg-tertiary">Access all session slides, recordings, and documentation.</p>
        </div>
        
        <div className="relative group w-full lg:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-tertiary group-focus-within:text-accent-glow transition-colors" />
          <input
            type="text"
            placeholder="Search resources or topics..."
            className="bg-surface-raised border border-white/5 rounded-2xl h-14 pl-12 pr-6 text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:border-white/10 transition-all w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-64 rounded-[40px]" />)}
        </div>
      ) : error ? (
        <div className="card-hero border-danger/20 bg-danger/5 flex flex-col items-center justify-center py-20 text-center rounded-[40px]">
          <div className="w-16 h-16 rounded-full bg-danger/10 flex items-center justify-center mb-6">
            <AlertCircle className="w-8 h-8 text-danger" />
          </div>
          <h2 className="text-[24px] font-bold text-fg-primary mb-2">Connection Error</h2>
          <p className="text-fg-tertiary mb-8 max-w-md">{error}</p>
          <button onClick={() => window.location.reload()} className="bg-white text-void px-8 py-3 rounded-2xl font-bold">Retry</button>
        </div>
      ) : filteredMaterials.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredMaterials.map((material) => (
            <div key={material.id} className="card bg-surface-raised border border-white/5 rounded-[40px] p-8 flex flex-col hover:border-white/10 transition-all group">
              <div className="flex items-start justify-between mb-6">
                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-fg-tertiary group-hover:text-accent-glow transition-colors">
                  {getIcon(material.type)}
                </div>
                <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold text-fg-tertiary uppercase tracking-widest">
                  {material.type}
                </span>
              </div>
              
              <h3 className="text-[24px] font-bold text-fg-primary mb-2 group-hover:text-accent-glow transition-colors leading-tight">{material.title}</h3>
              
              <div className="flex items-center gap-2 text-[12px] font-medium text-fg-tertiary mb-6">
                <Calendar className="w-3.5 h-3.5" />
                <span>{material.sessions?.topic || 'General'}</span>
                {material.sessions?.date && (
                  <>
                    <span className="opacity-30">•</span>
                    <span>{new Date(material.sessions.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                  </>
                )}
              </div>
              
              {material.description && (
                <p className="text-sm leading-relaxed text-fg-tertiary mb-8 line-clamp-2">
                  {material.description}
                </p>
              )}
              
              <a 
                href={material.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="mt-auto bg-void/50 border border-white/5 hover:border-white/10 hover:bg-void/80 text-fg-secondary hover:text-fg-primary h-12 rounded-2xl flex items-center justify-center gap-3 transition-all font-bold group/btn"
              >
                <span>View Resource</span>
                <ExternalLink className="w-4 h-4 transition-transform group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1" />
              </a>
            </div>
          ))}
        </div>
      ) : (
        <div className="card bg-surface-raised border border-white/5 rounded-[40px] flex flex-col items-center justify-center py-24 text-center">
          <div className="w-20 h-20 rounded-[32px] bg-white/5 flex items-center justify-center mb-6">
            <BookOpen className="w-10 h-10 text-fg-tertiary/20" />
          </div>
          <h3 className="text-[24px] font-bold text-fg-primary mb-2">No Materials Found</h3>
          <p className="text-fg-tertiary max-w-md">
            {searchTerm ? "No materials match your search criteria." : "Your mentor hasn't uploaded any resources yet."}
          </p>
        </div>
      )}
    </div>
  );
};

export default StudentMaterials;
