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
      { name: 'Upcoming Sessions', path: '/me/upcoming', icon: Clock },
      { name: 'Class Materials', path: '/me/materials', icon: FileText }
    ]}
  ];

  const links = role === 'mentor' ? mentorLinks : studentLinks;

  const isActive = (path) => location.pathname === path;

  return (
    <aside className="w-[280px] flex-shrink-0 border-r border-white/5 bg-[#08080C] hidden md:flex flex-col h-screen sticky top-0">
      {/* Logo Section */}
      <div className="h-24 flex items-center px-8 border-b border-white/5">
        <Link to="/" className="flex items-center gap-4 group">
          <div className="w-10 h-10 bg-accent-glow rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.4)] group-hover:scale-105 transition-transform">
            <span className="text-white font-black text-xl">F</span>
          </div>
          <h1 className="text-[22px] font-black text-fg-primary tracking-tighter group-hover:text-accent-glow transition-colors">ForgeTrack</h1>
        </Link>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-8 px-4 space-y-12 scrollbar-hide">
        {links.map((section, idx) => (
          <div key={idx}>
            <p className="text-[10px] font-black text-fg-tertiary mb-6 px-4 uppercase tracking-[0.3em] opacity-60">{section.label}</p>
            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    className={`flex items-center gap-4 h-[52px] px-4 rounded-2xl transition-all group ${
                      active 
                        ? 'bg-white/[0.05] text-white border border-white/10 shadow-xl' 
                        : 'text-fg-tertiary hover:text-fg-secondary hover:bg-white/[0.02]'
                    }`}
                  >
                    <Icon className={`w-5 h-5 transition-colors ${active ? 'text-accent-glow' : 'group-hover:text-fg-primary'}`} />
                    <span className={`text-[15px] font-bold tracking-tight transition-colors ${active ? 'text-white' : 'group-hover:text-fg-primary'}`}>
                      {item.name}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Logout Footer */}
      <div className="p-4 border-t border-white/5 mt-auto">
        <button 
          onClick={signOut}
          className="w-full flex items-center gap-4 h-[52px] px-4 rounded-2xl text-fg-tertiary hover:bg-danger/10 hover:text-danger hover:border-danger/20 border border-transparent transition-all duration-300 group"
        >
          <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-danger/20 transition-colors">
            <LogOut className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </div>
          <span className="text-[14px] font-semibold tracking-tight">Logout Session</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
