import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const TopBar = () => {
  const { userProfile } = useAuth();
  const location = useLocation();

  const pathSegments = location.pathname.split('/').filter(Boolean);
  const breadcrumb = pathSegments.length > 0 
    ? pathSegments[pathSegments.length - 1].charAt(0).toUpperCase() + pathSegments[pathSegments.length - 1].slice(1)
    : 'Overview';

  return (
    <header className="h-[64px] border-b border-border-subtle bg-canvas/50 backdrop-blur-md flex items-center justify-between px-6 md:px-8 lg:px-12 sticky top-0 z-10">
      <div className="flex items-center gap-2 text-fg-secondary text-body-sm">
        <span>Overview</span>
        <span className="text-border-strong">/</span>
        <span className="text-fg-primary font-medium">{breadcrumb}</span>
      </div>

      <div className="flex items-center gap-6">
        {/* Search Input matching image */}
        <div className="hidden md:flex items-center relative group">
          <svg className="w-4 h-4 text-fg-tertiary absolute left-3 group-focus-within:text-accent-glow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input 
            type="text" 
            placeholder="Search..." 
            className="w-64 lg:w-80 bg-surface-inset border border-white/5 rounded-full h-10 pl-10 pr-4 text-body-sm text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:border-accent-glow/50 transition-all"
          />
        </div>
        
        {/* Profile Section */}
        <div className="flex items-center gap-6 h-10 border-l border-white/10 pl-6">
          <div className="flex flex-col items-end">
            <span className="text-sm font-bold text-fg-primary leading-tight">
              {userProfile?.display_name || 'User'}
            </span>
            <span className="text-[11px] font-medium text-fg-tertiary capitalize">
              {userProfile?.role || 'Guest'}
            </span>
          </div>
          <div className="w-10 h-10 rounded-full bg-accent-glow/10 border border-accent-glow/20 flex items-center justify-center text-accent-glow font-bold shadow-lg">
            {(userProfile?.display_name || 'U').charAt(0).toUpperCase()}
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopBar;
