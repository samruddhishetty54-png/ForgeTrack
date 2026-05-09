import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Search } from 'lucide-react';

const TopBar = () => {
  const { userProfile } = useAuth();
  const location = useLocation();

  const pathSegments = location.pathname.split('/').filter(Boolean);
  const breadcrumb = pathSegments.length > 0 
    ? pathSegments[pathSegments.length - 1].charAt(0).toUpperCase() + pathSegments[pathSegments.length - 1].slice(1).replace('-', ' ')
    : 'Overview';

  return (
    <header className="h-[80px] border-b border-white/5 bg-[#08080C]/80 backdrop-blur-2xl flex items-center justify-between px-8 lg:px-12 sticky top-0 z-50">
      {/* Breadcrumbs matching image */}
      <div className="flex items-center gap-2 text-[13px] font-medium text-fg-tertiary">
        <span>Overview</span>
        <span className="opacity-30">/</span>
        <span className="text-fg-secondary">
          {breadcrumb === 'Attendance' ? 'My Attendance' : breadcrumb}
        </span>
      </div>

      <div className="flex items-center gap-8">
        {/* Search Input matching image */}
        <div className="hidden md:flex items-center relative group">
          <Search className="w-4 h-4 text-fg-tertiary absolute left-5 group-focus-within:text-accent-glow transition-colors" />
          <input 
            type="text" 
            placeholder="Search students, sessions..." 
            className="w-[320px] lg:w-[420px] bg-white/[0.03] border border-white/5 rounded-full h-11 pl-12 pr-6 text-[14px] text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:border-accent-glow/30 focus:bg-white/[0.05] transition-all"
          />
        </div>
        
        {/* Profile Section with Divider */}
        <div className="flex items-center gap-6 h-10 border-l border-white/10 pl-8">
          <div className="flex flex-col items-end">
            <span className="text-[14px] font-bold text-fg-primary leading-tight tracking-tight">
              {userProfile?.display_name || 'Anonymous User'}
            </span>
            <span className="text-[11px] font-bold text-fg-tertiary uppercase tracking-widest opacity-60">
              {userProfile?.role || 'Guest'}
            </span>
          </div>
          <div className="w-10 h-10 rounded-full bg-accent-glow/20 border border-accent-glow/30 flex items-center justify-center text-accent-glow font-black text-sm shadow-[0_0_20px_rgba(99,102,241,0.2)]">
            {(userProfile?.display_name || 'U').charAt(0).toUpperCase()}
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopBar;
