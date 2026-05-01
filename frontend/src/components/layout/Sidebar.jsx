import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  LayoutDashboard, 
  CheckSquare, 
  Users, 
  BookOpen, 
  Upload, 
  UserCheck, 
  Calendar, 
  Settings, 
  LogOut 
} from 'lucide-react';

const Sidebar = () => {
  const { userProfile, signOut } = useAuth();
  const location = useLocation();
  const role = userProfile?.role;

  const mentorLinks = [
    { label: 'Overview', items: [
      { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard }
    ]},
    { label: 'Activity', items: [
      { name: 'Mark Attendance', path: '/attendance', icon: CheckSquare },
      { name: 'Student History', path: '/history', icon: Users },
      { name: 'Materials', path: '/materials', icon: BookOpen }
    ]},
    { label: 'Data', items: [
      { name: 'Upload CSV', path: '/upload', icon: Upload }
    ]}
  ];

  const studentLinks = [
    { label: 'Overview', items: [
      { name: 'My Attendance', path: '/me/attendance', icon: UserCheck },
      { name: 'Upcoming', path: '/me/upcoming', icon: Calendar },
      { name: 'Materials', path: '/me/materials', icon: BookOpen }
    ]}
  ];

  const links = role === 'mentor' ? mentorLinks : studentLinks;

  const isActive = (path) => location.pathname === path;

  return (
    <aside className="w-[260px] flex-shrink-0 border-r border-border-subtle bg-canvas hidden md:flex flex-col h-screen">
      <div className="h-16 flex items-center px-6 border-b border-border-subtle">
        <h1 className="text-h2 font-display text-fg-primary tracking-tight">ForgeTrack</h1>
      </div>
      
      <div className="px-6 py-4 border-b border-border-subtle">
        <p className="text-body-sm text-fg-secondary">Welcome Back,</p>
        <p className="text-body font-medium truncate">{userProfile?.display_name || 'User'}</p>
      </div>

      <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-6">
        {links.map((section, idx) => (
          <div key={idx}>
            <p className="text-label text-fg-tertiary mb-3 px-2 uppercase tracking-[0.08em]">{section.label}</p>
            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 h-[44px] px-3 rounded-lg transition-colors group ${
                      active 
                        ? 'bg-surface-raised text-fg-primary shadow-[inset_2px_0_0_var(--tw-colors-accent-glow)]' 
                        : 'text-fg-secondary hover:bg-surface'
                    }`}
                  >
                    <Icon className="w-5 h-5 stroke-[1.75px]" />
                    <span className="text-body">{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-border-subtle space-y-1">
        <button className="w-full flex items-center gap-3 h-[44px] px-3 rounded-lg text-fg-secondary hover:bg-surface transition-colors">
          <Settings className="w-5 h-5 stroke-[1.75px]" />
          <span className="text-body">Settings</span>
        </button>
        <button 
          onClick={signOut}
          className="w-full flex items-center gap-3 h-[44px] px-3 rounded-lg text-fg-secondary hover:bg-surface hover:text-danger transition-colors"
        >
          <LogOut className="w-5 h-5 stroke-[1.75px]" />
          <span className="text-body">Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
