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

      <div className="flex items-center gap-4">
        {/* Placeholder Search */}
        <div className="hidden md:block w-64">
          <input 
            type="text" 
            placeholder="Search..." 
            className="w-full bg-surface-inset border border-border-default rounded-md h-8 px-3 text-body-sm text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:border-accent-glow"
          />
        </div>
        
        <div className="flex items-center gap-3">
          <span className="text-body-sm font-medium text-fg-primary hidden sm:block">
            {userProfile?.display_name || 'User'}
          </span>
          <div className="w-8 h-8 rounded-full bg-surface-raised border border-border-default flex items-center justify-center text-body font-medium text-fg-primary shadow-sm">
            {(userProfile?.display_name || 'U').charAt(0).toUpperCase()}
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopBar;
