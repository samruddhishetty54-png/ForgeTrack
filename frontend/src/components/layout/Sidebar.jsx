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
  LogOut,
  Clock,
  FileText 
} from 'lucide-react';

const Sidebar = () => {
  const { userProfile, signOut } = useAuth();
  const location = useLocation();
  const role = userProfile?.role;

  const mentorLinks = [
    { label: 'OVERVIEW', items: [
      { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard }
    ]},
    { label: 'ACTIVITY', items: [
      { name: 'Schedule Manager', path: '/dashboard', icon: Calendar },
      { name: 'Mark Attendance', path: '/attendance', icon: CheckSquare },
      { name: 'Student History', path: '/history', icon: Clock },
      { name: 'Materials', path: '/materials', icon: FileText }
    ]},
    { label: 'DATA', items: [
      { name: 'Upload CSV', path: '/upload', icon: Upload }
    ]}
  ];

  const studentLinks = [
    { label: 'OVERVIEW', items: [
      { name: 'Dashboard', path: '/me/attendance', icon: LayoutDashboard },
      { name: 'My Attendance', path: '/me/attendance', icon: UserCheck },
      { name: 'Upcoming', path: '/me/upcoming', icon: Calendar },
      { name: 'Materials', path: '/me/materials', icon: BookOpen }
    ]}
  ];

  const links = role === 'mentor' ? mentorLinks : studentLinks;

  const isActive = (path) => location.pathname === path;

  return (
    <aside className="w-[280px] flex-shrink-0 border-r border-white/5 bg-[#0B0B11] hidden md:flex flex-col h-screen">
      <div className="h-20 flex items-center px-8">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-accent-glow rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.4)]">
            <span className="text-white font-bold text-xl">F</span>
          </div>
          <h1 className="text-[22px] font-bold text-fg-primary tracking-tight">ForgeTrack</h1>
        </div>
      </div>
      
      <nav className="flex-1 overflow-y-auto py-8 px-4 space-y-10">
        {links.map((section, idx) => (
          <div key={idx}>
            <p className="text-[11px] font-bold text-fg-tertiary mb-6 px-4 uppercase tracking-[0.2em]">{section.label}</p>
            <div className="space-y-2">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    className={`flex items-center gap-4 h-[52px] px-4 rounded-2xl transition-all group ${
                      active 
                        ? 'bg-surface-raised text-fg-primary border border-white/5 shadow-lg' 
                        : 'text-fg-tertiary hover:text-fg-secondary hover:bg-surface'
                    }`}
                  >
                    <Icon className={`w-5 h-5 transition-colors ${active ? 'text-accent-glow' : 'group-hover:text-fg-primary'}`} />
                    <span className={`text-[15px] font-medium transition-colors ${active ? 'text-fg-primary' : 'group-hover:text-fg-primary'}`}>
                      {item.name}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-6 border-t border-white/5 bg-void/20">
        <button 
          onClick={signOut}
          className="w-full flex items-center gap-4 h-14 px-5 rounded-[20px] text-fg-tertiary hover:bg-danger/10 hover:text-danger transition-all group"
        >
          <LogOut className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          <span className="text-[15px] font-bold tracking-tight">Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
